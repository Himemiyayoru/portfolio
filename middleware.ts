import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

function isHimeAsset(pathname: string) {
  return pathname.startsWith("/hime/live2d/") || pathname.startsWith("/hime/lines/");
}

export function middleware(request: NextRequest) {
  if (!isHimeAsset(request.nextUrl.pathname)) return NextResponse.next();

  const site = request.headers.get("sec-fetch-site");
  const mode = request.headers.get("sec-fetch-mode");
  const dest = request.headers.get("sec-fetch-dest");
  const embedded = site === "same-origin" && mode !== "navigate" && dest !== "document";
  if (!embedded) return new NextResponse(null, { status: 404 });

  const response = NextResponse.next();
  response.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
  response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("Content-Disposition", "inline");
  return response;
}

export const config = {
  matcher: ["/hime/live2d/:path*", "/hime/lines/:path*"],
};
