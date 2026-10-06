/* eslint-disable @typescript-eslint/no-explicit-any -- untyped Supabase client */
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { AdminShell } from "@/components/admin/AdminShell";

export const dynamic = "force-dynamic";

/** Identity + the two nav badges. Failure-tolerant: a hiccup here must never take the whole admin down. */
async function loadShellData() {
  try {
    const session = await createClient();
    const { data: { user } } = await session.auth.getUser();
    const db: any = createAdminClient();
    const count = (q: any) => q.then((r: any) => r.count ?? 0);
    const [profile, bookings, applications] = await Promise.all([
      user ? db.from("admin_users").select("full_name").eq("supabase_user_id", user.id).maybeSingle() : Promise.resolve({ data: null }),
      count(db.from("bookings").select("id", { count: "exact", head: true }).eq("status", "inquiry")),
      count(db.from("cleaner_applications").select("id", { count: "exact", head: true }).eq("status", "new")),
    ]);
    const email = user?.email ?? "";
    return { user: { name: profile.data?.full_name || email.split("@")[0] || "Admin", email }, badges: { bookings, applications } };
  } catch {
    return { user: { name: "Admin", email: "" }, badges: { bookings: 0, applications: 0 } };
  }
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, badges } = await loadShellData();
  return <AdminShell user={user} badges={badges}>{children}</AdminShell>;
}
