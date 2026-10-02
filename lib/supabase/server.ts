import { createServerClient } from "@supabase/ssr";
import { cookies, headers } from "next/headers";

/**
 * Supabase client for Server Components, Route Handlers and Server Actions.
 *
 * Web clients carry the auth session in cookies. The mobile admin app instead
 * sends an `Authorization: Bearer <access_token>` header. We support both: when
 * a bearer token is present it is injected as the global Authorization header,
 * so `auth.getUser()` validates that token and PostgREST requests run as that
 * user. Server Components (no auth header) fall back to cookies as before.
 */
export async function createClient() {
  const cookieStore = await cookies();

  let bearer: string | null = null;
  try {
    const authHeader = (await headers()).get("authorization");
    if (authHeader?.startsWith("Bearer ")) bearer = authHeader.slice(7);
  } catch {
    // headers() unavailable in some contexts — ignore and use cookies.
  }

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      ...(bearer
        ? { global: { headers: { Authorization: `Bearer ${bearer}` } } }
        : {}),
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // `setAll` was called from a Server Component — safe to ignore
            // when middleware is refreshing sessions.
          }
        },
      },
    }
  );
}

/**
 * Privileged Supabase client using the service-role key. Bypasses RLS — use
 * ONLY in trusted server code (Route Handlers / Server Actions), never in the
 * browser. Does not persist sessions.
 */
export function createServiceClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: { getAll: () => [], setAll: () => {} },
      auth: { persistSession: false, autoRefreshToken: false },
    }
  );
}

/**
 * Alias for createServiceClient — used in API routes and notification/logging
 * utilities that need to bypass RLS.
 */
export const createAdminClient = createServiceClient;
