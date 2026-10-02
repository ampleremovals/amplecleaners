import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getUserType } from "@/lib/user-type";

/**
 * Refreshes the Supabase auth session on every request and enforces auth on
 * protected routes. Returns the (possibly redirected) response.
 *
 * - All `/admin/*` routes require an admin session EXCEPT `/admin/login`
 * - All `/cleaners/*` routes require a cleaner session EXCEPT `/cleaners/login`
 * - Cleaners hitting `/admin` are redirected to `/cleaners/dashboard`
 * - Admins hitting `/cleaners` are redirected to `/admin`
 * - Public routes pass straight through
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => supabaseResponse.cookies.set(name, value, options));
        },
      },
    }
  );

  // IMPORTANT: do not run code between createServerClient and getUser().
  const { data: { user } } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isAdminRoute = pathname.startsWith("/admin");
  const isCleanerRoute = pathname.startsWith("/cleaners");
  const isAdminLoginRoute = pathname === "/admin/login";
  const isCleanerLoginRoute = pathname === "/cleaners/login";
  const isCleanerRegisterRoute = pathname === "/cleaners/register";
  const isCleanerResetRoute = pathname.startsWith("/cleaners/reset-password");
  const isCleanerPublicRoute = isCleanerLoginRoute || isCleanerRegisterRoute || isCleanerResetRoute;

  // ── Admin routes ──────────────────────────────────────────
  if (isAdminRoute && !isAdminLoginRoute && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin/login";
    url.searchParams.set("redirectedFrom", pathname);
    return NextResponse.redirect(url);
  }
  if (isAdminRoute && !isAdminLoginRoute && user) {
    const userType = await getUserType(user.id);
    if (userType === "cleaner") {
      const url = request.nextUrl.clone();
      url.pathname = "/cleaners/dashboard";
      url.search = "";
      return NextResponse.redirect(url);
    }
  }
  if (isAdminLoginRoute && user) {
    const userType = await getUserType(user.id);
    if (userType === "admin") {
      const url = request.nextUrl.clone();
      url.pathname = "/admin";
      url.search = "";
      return NextResponse.redirect(url);
    }
  }

  // ── Cleaner routes ────────────────────────────────────────
  if (isCleanerRoute && !isCleanerPublicRoute && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/cleaners/login";
    url.searchParams.set("redirectedFrom", pathname);
    return NextResponse.redirect(url);
  }
  if (isCleanerRoute && !isCleanerPublicRoute && user) {
    const userType = await getUserType(user.id);
    if (userType === "admin") {
      const url = request.nextUrl.clone();
      url.pathname = "/admin";
      url.search = "";
      return NextResponse.redirect(url);
    }
  }
  if (isCleanerLoginRoute && user) {
    const userType = await getUserType(user.id);
    if (userType === "cleaner") {
      const url = request.nextUrl.clone();
      url.pathname = "/cleaners/dashboard";
      url.search = "";
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}
