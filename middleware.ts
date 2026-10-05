import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { variantFor } from "@/lib/experiments";

export async function middleware(request: NextRequest) {
  // A/B test: the home page is the only experiment. Visitors in variant B are served /lp/b
  // by a REWRITE (their URL stays "/"), chosen from a stable hash of IP + User-Agent — nothing is
  // stored on their device. Public page: no auth session to refresh, so skip that work.
  if (request.nextUrl.pathname === "/" && request.method === "GET") {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? request.headers.get("x-real-ip");
    if (variantFor(ip, request.headers.get("user-agent")) === "b") {
      const url = request.nextUrl.clone();
      url.pathname = "/lp/b";
      return NextResponse.rewrite(url);
    }
    return NextResponse.next();
  }
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Run on all routes except static assets and image optimisation files.
     * Admin/cleaner protection is enforced inside updateSession().
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
