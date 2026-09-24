"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import type { Emotion } from "@/content/lines";
import type { HimeHandle, HimePose } from "@/components/HimeFigure";
import { HimeFigure } from "@/components/HimeFigure";
import { site } from "@/content/site";

let cubismCore: Promise<void> | null = null;

declare global {
  interface Window {
    Live2DCubismCore?: unknown;
    PIXI?: unknown;
  }
}

function loadCubismCore() {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.Live2DCubismCore) return Promise.resolve();
  if (!cubismCore) {
    cubismCore = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "/hime/live2dcubismcore.min.js";
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("Cubism core failed to load"));
      document.head.appendChild(script);
    });
  }
  return cubismCore;
}

type CoreModel = {
  setParameterValueById: (id: string, value: number) => void;
  update: () => void;
  getDrawableCount: () => number;
  getDrawableId: (index: number) => string;
  getDrawableOpacity: (index: number) => number;
  getDrawableVertices: (index: number) => ArrayLike<number>;
};

type LiveModel = {
  width: number;
  height: number;
  scale: { set: (value: number) => void };
  anchor: { set: (x: number, y: number) => void };
  position: { set: (x: number, y: number) => void };
  interactive: boolean;
  autoInteract?: boolean;
  visible: boolean;
  focus: (x: number, y: number) => void;
  destroy: () => void;
  internalModel: {
    width: number;
    height: number;
    pixelsPerUnit: number;
    coreModel: CoreModel;
    update: (dt: number, now: number) => void;
    updateFocus: () => void;
    updateNaturalMovements: (dt: number, now: number) => void;
    draw: (gl: WebGLRenderingContext) => void;
    renderer: CubismRenderer;
  };
};

type MaskContext = {
  _layoutChannelNo: number;
  _layoutBounds: { x: number; y: number; width: number; height: number };
};

type ClippingManager = {
  _clippingContextListForMask: MaskContext[];
  _maskTexture: { texture: WebGLFramebuffer } | null;
  _colorBuffer: WebGLTexture | null;
  gl: WebGLRenderingContext | null;
  setClippingMaskBufferSize: (size: number) => void;
  setupLayoutBounds: (usingClipCount: number) => void;
  setupClippingContext: (model: unknown, renderer: unknown) => void;
};

type CubismRenderer = {
  gl: WebGLRenderingContext | null;
  preDraw: () => void;
  _clippingManager: ClippingManager;
};

/** Cubism packs at most 64 masks. 碳酸 uses 88, so the rest never get a channel and the draw throws. */
function supportLargeMaskCounts(manager: ClippingManager) {
  manager.setClippingMaskBufferSize(1024);
  if (manager._maskTexture && manager.gl) {
    manager.gl.deleteFramebuffer(manager._maskTexture.texture);
    if (manager._colorBuffer) manager.gl.deleteTexture(manager._colorBuffer);
    manager._maskTexture = null;
    manager._colorBuffer = null;
  }
  manager.setupLayoutBounds = (usingClipCount: number) => {
    const channelCount = 4;
    const masks = manager._clippingContextListForMask;
    const div = Math.floor(usingClipCount / channelCount);
    const mod = usingClipCount % channelCount;
    let index = 0;
    for (let channel = 0; channel < channelCount; channel++) {
      const layoutCount = div + (channel < mod ? 1 : 0);
      if (!layoutCount) continue;
      const grid = Math.ceil(Math.sqrt(layoutCount));
      for (let i = 0; i < layoutCount; i++) {
        const mask = masks[index++];
        if (!mask) continue;
        mask._layoutChannelNo = channel;
        mask._layoutBounds.x = (i % grid) / grid;
        mask._layoutBounds.y = Math.floor(i / grid) / grid;
        mask._layoutBounds.width = 1 / grid;
        mask._layoutBounds.height = 1 / grid;
      }
    }
  };
}

/** Bust crop: full head, bottom edge at the upper chest. */
function bustFrame(core: CoreModel, pixelsPerUnit: number, canvasHeight: number) {
  const span = canvasHeight / pixelsPerUnit;
  const origin = span / 2;
  const toFrac = (cubismY: number) => (origin - cubismY) / span;
  let headTopY = 0.9;
  let faceTopY = 0.8;
  let faceBottomY = 0.6;
  const count = core.getDrawableCount();
  for (let i = 0; i < count; i++) {
    const verts = core.getDrawableVertices(i);
    if (!verts || verts.length < 2) continue;
    if (String(core.getDrawableId(i)) === "face") {
      for (let k = 1; k < verts.length; k += 2) {
        const y = verts[k];
        if (y > faceTopY) faceTopY = y;
        if (y < faceBottomY) faceBottomY = y;
      }
    }
    if (core.getDrawableOpacity(i) < 0.2) continue;
    for (let k = 1; k < verts.length; k += 2) {
      if (verts[k] > headTopY) headTopY = verts[k];
    }
  }
  const headTop = toFrac(headTopY);
  const faceTop = toFrac(faceTopY);
  const faceBottom = toFrac(faceBottomY);
  const faceSpan = Math.max(0.08, faceBottom - faceTop);
  const top = Math.max(0, headTop - 0.01);
  const bottom = faceBottom + faceSpan * 0.9;
  return { anchorY: (top + bottom) / 2, fraction: Math.max(0.22, bottom - top) };
}

function mapRange(
  value: number,
  inLo: number,
  inHi: number,
  outLo: number,
  outHi: number,
  clampIn: boolean,
  clampOut: boolean,
) {
  let input = value;
  if (clampIn) input = Math.min(inHi, Math.max(inLo, input));
  const t = (input - inLo) / (inHi - inLo);
  let output = outLo + (outHi - outLo) * t;
  if (clampOut) {
    const lo = Math.min(outLo, outHi);
    const hi = Math.max(outLo, outHi);
    output = Math.min(hi, Math.max(lo, output));
  }
  return output;
}

function applyPose(core: CoreModel, pose: HimePose, emotion: Emotion) {
  // Same input ranges as 碳酸's VTube Studio bindings: FaceAngle drives the head and the body.
  core.setParameterValueById("ParamAngleX", mapRange(pose.x, -30, 30, -30, 30, false, false));
  core.setParameterValueById("ParamAngleY", mapRange(pose.y, -20, 20, -30, 30, true, false));
  core.setParameterValueById("ParamAngleZ", mapRange(pose.z, -20, 20, -30, 30, false, true));
  core.setParameterValueById("ParamBodyAngleX", mapRange(pose.x, -25, 25, -10, 10, false, true));
  core.setParameterValueById("ParamBodyAngleY", mapRange(pose.y, -25, 25, -10, 10, false, false));
  core.setParameterValueById("ParamBodyAngleY2", mapRange(pose.y, -25, 25, -10, 10, false, false));
  core.setParameterValueById("ParamBodyAngleZ", mapRange(pose.z, -30, 30, -10, 10, false, false));
  core.setParameterValueById("ParamEyeBallX", mapRange(pose.x, -30, 30, 0.35, -0.35, false, true));
  core.setParameterValueById("ParamEyeBallY", mapRange(pose.y, -20, 20, -0.45, 0.45, true, true));

  const eyes = pose.blink ? 0 : emotion === "shock" ? 1.7 : 1.15;
  core.setParameterValueById("ParamEyeLOpen", eyes);
  core.setParameterValueById("ParamEyeROpen", eyes);

  const smile =
    emotion === "happy" ? 0.7 : emotion === "sad" ? -0.55 : emotion === "angry" ? -0.35 : 0;
  core.setParameterValueById("ParamMouthForm", smile);
  core.setParameterValueById("ParamMouthOpenY", pose.mouth);
  const vowel = pose.vowel;
  const open = pose.mouth;
  core.setParameterValueById("ParamA", vowel === "a" ? open : 0);
  core.setParameterValueById("ParamE", vowel === "e" ? open : 0);
  core.setParameterValueById("ParamI", vowel === "i" ? open : 0);
  core.setParameterValueById("ParamO", vowel === "o" ? open : 0);
  core.setParameterValueById("ParamU", vowel === "u" ? open : 0);
  core.setParameterValueById("ParamSilence", Math.min(1, Math.max(0, 1 - open)));
  core.setParameterValueById("ParamEyeLSmile", emotion === "happy" ? 0.8 : 0);
  core.setParameterValueById("ParamEyeRSmile", emotion === "happy" ? 0.8 : 0);
  core.setParameterValueById("ParamCheek", emotion === "happy" ? 0.45 : 0);
  core.setParameterValueById("ParamBreath", (Math.sin(performance.now() / 700) + 1) / 2);
}

type Seat = {
  host: HTMLElement;
  url: string;
  followCursor: boolean;
  alive: boolean;
  model: LiveModel | null;
  bust: { anchorY: number; fraction: number } | null;
  getPose: () => HimePose;
  getEmotion: () => Emotion;
  onReady: () => void;
};

type StageApp = {
  stage: { addChild: (child: LiveModel) => void };
  screen: { width: number; height: number };
  renderer: { resize: (width: number, height: number) => void };
  ticker: { add: (fn: () => void) => void; remove: (fn: () => void) => void };
  destroy: (removeView?: boolean) => void;
};

const seats: Seat[] = [];
let stageApp: StageApp | null = null;
let stageCanvas: HTMLCanvasElement | null = null;
let stageStart: Promise<void> | null = null;
let stageLoop: (() => void) | null = null;
let stageToken = 0;

function scissorToHost(seat: Seat, gl: WebGLRenderingContext) {
  const rect = seat.host.getBoundingClientRect();
  const canvas = gl.canvas as HTMLCanvasElement;
  const scaleX = canvas.clientWidth ? gl.drawingBufferWidth / canvas.clientWidth : 1;
  const scaleY = canvas.clientHeight ? gl.drawingBufferHeight / canvas.clientHeight : 1;
  let x = Math.floor(rect.left * scaleX);
  let y = Math.floor((canvas.clientHeight - rect.bottom) * scaleY);
  let width = Math.ceil(rect.width * scaleX);
  let height = Math.ceil(rect.height * scaleY);
  if (x < 0) {
    width += x;
    x = 0;
  }
  if (y < 0) {
    height += y;
    y = 0;
  }
  if (x + width > gl.drawingBufferWidth) width = gl.drawingBufferWidth - x;
  if (y + height > gl.drawingBufferHeight) height = gl.drawingBufferHeight - y;
  gl.enable(gl.SCISSOR_TEST);
  gl.scissor(x, y, Math.max(0, width), Math.max(0, height));
}

function clipModelToSeat(seat: Seat, cubism: CubismRenderer) {
  let masking = false;
  const preDraw = cubism.preDraw.bind(cubism);
  cubism.preDraw = () => {
    preDraw();
    if (!masking && cubism.gl) scissorToHost(seat, cubism.gl);
  };
  const setup = cubism._clippingManager.setupClippingContext.bind(cubism._clippingManager);
  cubism._clippingManager.setupClippingContext = (model, renderer) => {
    masking = true;
    try {
      setup(model, renderer);
    } finally {
      masking = false;
      if (cubism.gl) scissorToHost(seat, cubism.gl);
    }
  };
}

function placeSeat(seat: Seat) {
  const model = seat.model;
  const bust = seat.bust;
  if (!model || !bust) return;
  const rect = seat.host.getBoundingClientRect();
  const visible = rect.width > 8 && rect.height > 8 && rect.bottom > 0 && rect.top < window.innerHeight;
  model.visible = visible;
  if (!visible) return;
  model.scale.set(rect.height / (bust.fraction * model.internalModel.height));
  model.anchor.set(0.5, bust.anchorY);
  model.position.set(rect.left + rect.width / 2, rect.top + rect.height * 0.5);
}

function onStagePointer(event: PointerEvent) {
  for (const seat of seats) {
    if (!seat.alive || !seat.followCursor || !seat.model?.visible) continue;
    seat.model.focus(event.clientX, event.clientY);
  }
}

function syncStageSize() {
  if (!stageApp) return;
  const width = document.documentElement.clientWidth;
  const height = document.documentElement.clientHeight;
  if (stageApp.screen.width !== width || stageApp.screen.height !== height) {
    stageApp.renderer.resize(width, height);
  }
}

async function ensureStage() {
  if (stageApp) return;
  if (stageStart) return stageStart;
  const token = ++stageToken;
  stageStart = (async () => {
    await loadCubismCore();
    if (token !== stageToken) return;
    const PIXI = await import("pixi.js");
    if (token !== stageToken) return;
    const { Live2DModel } = await import("pixi-live2d-display/cubism4");
    if (token !== stageToken) return;
    window.PIXI = PIXI;
    Live2DModel.registerTicker(PIXI.Ticker);
    const canvas = document.createElement("canvas");
    canvas.className = "hime-stage";
    document.body.appendChild(canvas);
    const view = new PIXI.Application({
      view: canvas,
      width: document.documentElement.clientWidth,
      height: document.documentElement.clientHeight,
      backgroundAlpha: 0,
      antialias: true,
      autoDensity: true,
      resolution: Math.min(2, window.devicePixelRatio || 1),
    });
    if (token !== stageToken) {
      view.destroy(true);
      canvas.remove();
      return;
    }
    stageCanvas = canvas;
    stageApp = view as unknown as StageApp;
    stageLoop = () => {
      syncStageSize();
      for (const seat of seats) placeSeat(seat);
    };
    stageApp.ticker.add(stageLoop);
    window.addEventListener("pointermove", onStagePointer);
  })();
  return stageStart;
}

function releaseStage() {
  if (seats.some((seat) => seat.alive)) return;
  stageToken += 1;
  window.removeEventListener("pointermove", onStagePointer);
  if (stageApp && stageLoop) stageApp.ticker.remove(stageLoop);
  stageApp?.destroy(true);
  stageCanvas?.remove();
  stageApp = null;
  stageCanvas = null;
  stageLoop = null;
  stageStart = null;
}

function registerSeat(seat: Seat) {
  seats.push(seat);
  void (async () => {
    try {
      await ensureStage();
      if (!seat.alive || !stageApp) return;
      const { Live2DModel } = await import("pixi-live2d-display/cubism4");
      const loaded = (await Live2DModel.from(seat.url, { autoInteract: false })) as unknown as LiveModel;
      if (!seat.alive) {
        loaded.destroy();
        return;
      }
      loaded.interactive = false;
      loaded.autoInteract = false;
      supportLargeMaskCounts(loaded.internalModel.renderer._clippingManager);
      clipModelToSeat(seat, loaded.internalModel.renderer);
      if (!seat.followCursor) {
        loaded.internalModel.updateFocus = () => {};
        loaded.internalModel.updateNaturalMovements = () => {};
      }
      const draw = loaded.internalModel.draw.bind(loaded.internalModel);
      loaded.internalModel.draw = (gl) => {
        draw(gl);
        gl.disable(gl.SCISSOR_TEST);
      };
      // Only the primary Angle/BodyAngle parameters are written here (in applyPose). The
      // model's own physics.evaluate() turns those into the secondary sway (X2, Y2, Z2, XX,
      // BodyAngleX1...). Writing those secondary outputs a second time fought the physics
      // simulation every frame and looked like a twitch instead of a sway.
      const update = loaded.internalModel.update.bind(loaded.internalModel);
      loaded.internalModel.update = (dt, now) => {
        applyPose(loaded.internalModel.coreModel, seat.getPose(), seat.getEmotion());
        update(dt, now);
      };
      seat.bust = bustFrame(
        loaded.internalModel.coreModel,
        loaded.internalModel.pixelsPerUnit,
        loaded.internalModel.height,
      );
      seat.model = loaded;
      stageApp.stage.addChild(loaded);
      placeSeat(seat);
      seat.onReady();
    } catch (error) {
      console.error(error);
    }
  })();
  return () => {
    seat.alive = false;
    seat.model?.destroy();
    seat.model = null;
    const index = seats.indexOf(seat);
    if (index >= 0) seats.splice(index, 1);
    releaseStage();
  };
}

const HimeLive2D = forwardRef<
  HimeHandle,
  { url: string; emotion: Emotion; onReady: () => void; followCursor?: boolean }
>(function HimeLive2D({ url, emotion, onReady, followCursor = true }, ref) {
    const hostRef = useRef<HTMLDivElement>(null);
    const poseRef = useRef<HimePose>({ x: 0, y: 0, z: 0, blink: false, mouth: 0 });
    const emotionRef = useRef(emotion);
    const onReadyRef = useRef(onReady);
    emotionRef.current = emotion;
    onReadyRef.current = onReady;

    useImperativeHandle(ref, () => ({
      setPose(pose) {
        poseRef.current = pose;
      },
    }));

    useEffect(() => {
      const host = hostRef.current;
      if (!host) return;
      return registerSeat({
        host,
        url,
        followCursor,
        alive: true,
        model: null,
        bust: null,
        getPose: () => poseRef.current,
        getEmotion: () => emotionRef.current,
        onReady: () => onReadyRef.current(),
      });
    }, [url, followCursor]);

    return <div ref={hostRef} className="hime-live" />;
  },
);

export const HimePortrait = forwardRef<HimeHandle, { emotion: Emotion; followCursor?: boolean }>(
  function HimePortrait({ emotion, followCursor = true }, ref) {
  const svgRef = useRef<HimeHandle>(null);
  const liveRef = useRef<HimeHandle>(null);
  const hasModel = Boolean(site.live2dModel);

  useImperativeHandle(ref, () => ({
    setPose(pose) {
      liveRef.current?.setPose(pose);
      svgRef.current?.setPose(pose);
    },
    setFrame(frame) {
      liveRef.current?.setFrame?.(frame);
    },
  }));

  return (
    <div className="hime-portrait">
      {hasModel ? (
        <HimeLive2D
          ref={liveRef}
          emotion={emotion}
          url={site.live2dModel}
          followCursor={followCursor}
          onReady={() => {}}
        />
      ) : (
        <HimeFigure ref={svgRef} emotion={emotion} />
      )}
    </div>
  );
});
