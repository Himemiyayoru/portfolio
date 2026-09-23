"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import type { Emotion } from "@/content/lines";
import type { HimeFrame, HimeHandle, HimePose } from "@/components/HimeFigure";
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
  destroy: () => void;
  internalModel: {
    width: number;
    height: number;
    pixelsPerUnit: number;
    coreModel: CoreModel;
    update: (dt: number, now: number) => void;
    updateFocus: () => void;
    updateNaturalMovements: (dt: number, now: number) => void;
    renderer: { _clippingManager: ClippingManager };
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
  core.setParameterValueById("ParamEyeLSmile", emotion === "happy" ? 0.8 : 0);
  core.setParameterValueById("ParamEyeRSmile", emotion === "happy" ? 0.8 : 0);
  core.setParameterValueById("ParamCheek", emotion === "happy" ? 0.45 : 0);
  core.setParameterValueById("ParamBreath", (Math.sin(performance.now() / 700) + 1) / 2);
}

const HimeLive2D = forwardRef<
  HimeHandle,
  { url: string; emotion: Emotion; onReady: () => void; followCursor?: boolean }
>(function HimeLive2D({ url, emotion, onReady, followCursor = true }, ref) {
    const hostRef = useRef<HTMLDivElement>(null);
    const poseRef = useRef<HimePose>({ x: 0, y: 0, z: 0, blink: false, mouth: 0 });
    const frameRef = useRef<HimeFrame>("bust");
    const fitRef = useRef<() => void>(() => {});
    const emotionRef = useRef(emotion);
    const onReadyRef = useRef(onReady);
    emotionRef.current = emotion;
    onReadyRef.current = onReady;

    useImperativeHandle(ref, () => ({
      setPose(pose) {
        poseRef.current = pose;
      },
      setFrame(frame) {
        if (frameRef.current === frame) return;
        frameRef.current = frame;
        fitRef.current();
      },
    }));

    useEffect(() => {
      const host = hostRef.current;
      if (!host) return;
      let cancelled = false;
      let observer: ResizeObserver | null = null;
      let app: { destroy: (removeView?: boolean) => void; renderer: { resize: (width: number, height: number) => void }; stage: { addChild: (child: LiveModel) => void }; screen: { width: number; height: number }; view: HTMLCanvasElement } | null = null;
      let model: LiveModel | null = null;

      void (async () => {
        try {
          await loadCubismCore();
          if (cancelled) return;
          const PIXI = await import("pixi.js");
          const { Live2DModel } = await import("pixi-live2d-display/cubism4");
          if (cancelled) return;
          window.PIXI = PIXI;
          Live2DModel.registerTicker(PIXI.Ticker);
          const view = new PIXI.Application({
            width: host.clientWidth || 184,
            height: host.clientHeight || 246,
            backgroundAlpha: 0,
            antialias: true,
            autoDensity: true,
            resolution: followCursor ? Math.min(2, window.devicePixelRatio) : 1,
          });
          if (cancelled) {
            view.destroy(true);
            return;
          }
          app = view as unknown as NonNullable<typeof app>;
          host.appendChild(view.view as HTMLCanvasElement);
          const loaded = (await Live2DModel.from(url, { autoInteract: followCursor })) as unknown as LiveModel;
          if (cancelled) {
            loaded.destroy();
            return;
          }
          model = loaded;
          model.interactive = false;
          if (!followCursor) model.autoInteract = false;
          supportLargeMaskCounts(model.internalModel.renderer._clippingManager);
          const bust = bustFrame(
            model.internalModel.coreModel,
            model.internalModel.pixelsPerUnit,
            model.internalModel.height,
          );
          const fitModel = () => {
            const width = host.clientWidth || view.screen.width;
            const height = host.clientHeight || view.screen.height;
            if (!width || !height) return;
            view.renderer.resize(width, height);
            const stand = frameRef.current === "stand";
            const baseW = model!.internalModel.width;
            const baseH = model!.internalModel.height;
            if (stand) {
              const fit = Math.min(width / baseW, height / baseH);
              model!.scale.set(fit * 1.02);
              model!.anchor.set(0.5, 0.5);
              model!.position.set(width / 2, height * 0.52);
              return;
            }
            model!.scale.set(height / (bust.fraction * baseH));
            model!.anchor.set(0.5, bust.anchorY);
            model!.position.set(width / 2, height * 0.5);
          };
          fitRef.current = fitModel;
          fitModel();
          observer = new ResizeObserver(() => fitModel());
          observer.observe(host);
          const internal = model.internalModel;
          if (!followCursor) {
            // The player already writes the pose. Cursor focus and the built-in
            // breath add a second sway on top and the body starts to jerk.
            internal.updateFocus = () => {};
            internal.updateNaturalMovements = () => {};
          }
          const update = internal.update.bind(internal);
          internal.update = (dt, now) => {
            // Angles have to be in place before physics. On this model, left-right
            // is a physics output; updating the mesh again afterwards clears it.
            applyPose(internal.coreModel, poseRef.current, emotionRef.current);
            update(dt, now);
          };
          view.stage.addChild(model as never);
          onReadyRef.current();
        } catch (error) {
          console.error(error);
        }
      })();

      return () => {
        cancelled = true;
        fitRef.current = () => {};
        observer?.disconnect();
        model?.destroy();
        app?.destroy(true);
      };
    }, [url, followCursor]);

    return <div ref={hostRef} className="hime-live" />;
  },
);

export const HimePortrait = forwardRef<HimeHandle, { emotion: Emotion; followCursor?: boolean }>(
  function HimePortrait({ emotion, followCursor = true }, ref) {
  const svgRef = useRef<HimeHandle>(null);
  const liveRef = useRef<HimeHandle>(null);
  const [liveReady, setLiveReady] = useState(false);

  useImperativeHandle(
    ref,
    () => ({
      setPose(pose) {
        (liveReady ? liveRef.current : svgRef.current)?.setPose(pose);
      },
      setFrame(frame) {
        liveRef.current?.setFrame?.(frame);
      },
    }),
    [liveReady],
  );

  return (
    <div className={liveReady ? "hime-portrait is-live" : "hime-portrait"}>
      <HimeFigure ref={svgRef} emotion={emotion} />
      {site.live2dModel ? (
        <HimeLive2D
          ref={liveRef}
          emotion={emotion}
          url={site.live2dModel}
          followCursor={followCursor}
          onReady={() => setLiveReady(true)}
        />
      ) : null}
    </div>
  );
});
