/* eslint-disable @typescript-eslint/no-explicit-any -- untyped Supabase client */
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/server";
import { SERVICE_LABELS, type ServiceType } from "@/types";

export const dynamic = "force-dynamic";

const LIMIT = 5;
const oneOf = <T,>(v: T | T[] | null | undefined): T | null => (Array.isArray(v) ? (v[0] ?? null) : (v ?? null));

/**
 * Global admin search (the ⌘K palette): bookings, customers and cleaners.
 * Input is stripped of LIKE wildcards and filter-syntax characters and every column is searched with its own
 * query, so user text is never spliced into a PostgREST filter expression.
 */
export async function GET(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const raw = new URL(request.url).searchParams.get("q") ?? "";
  const q = raw.replace(/[%_\\,()*"']/g, " ").replace(/\s+/g, " ").trim().slice(0, 60);
  if (q.length < 2) return NextResponse.json({ success: true, bookings: [], customers: [], cleaners: [] });
  const like = `%${q}%`;
  const db: any = createAdminClient();

  try {
    const [cByName, cByEmail, cByPhone, kByName, kByEmail, bByRef] = await Promise.all([
      db.from("customers").select("id, full_name, email").ilike("full_name", like).limit(LIMIT),
      db.from("customers").select("id, full_name, email").ilike("email", like).limit(LIMIT),
      db.from("customers").select("id, full_name, email").ilike("phone", like).limit(LIMIT),
      db.from("cleaners").select("id, full_name, email").ilike("full_name", like).limit(LIMIT),
      db.from("cleaners").select("id, full_name, email").ilike("email", like).limit(LIMIT),
      db.from("bookings").select("id, reference, status, service_type, customer:customers(full_name)").ilike("reference", like).limit(LIMIT),
    ]);

    const uniq = <T extends { id: string }>(...lists: T[][]) => [...new Map(lists.flat().map((x) => [x.id, x])).values()].slice(0, LIMIT);
    const customers = uniq<any>(cByName.data ?? [], cByEmail.data ?? [], cByPhone.data ?? []);
    const cleaners = uniq<any>(kByName.data ?? [], kByEmail.data ?? []);

    // Bookings: by reference, plus bookings belonging to the customers that matched.
    const byCustomer = customers.length
      ? await db.from("bookings").select("id, reference, status, service_type, customer:customers(full_name)").in("customer_id", customers.map((c: any) => c.id)).order("created_at", { ascending: false }).limit(LIMIT)
      : { data: [] };
    const bookings = uniq<any>(bByRef.data ?? [], byCustomer.data ?? []).map((b: any) => ({
      id: b.id as string,
      title: b.reference as string,
      sub: `${oneOf<{ full_name: string }>(b.customer)?.full_name ?? "Customer"} · ${SERVICE_LABELS[b.service_type as ServiceType] ?? b.service_type}`,
      status: b.status as string,
    }));

    return NextResponse.json({
      success: true,
      bookings,
      customers: customers.map((c: any) => ({ id: c.id as string, title: c.full_name as string, sub: (c.email as string) ?? "" })),
      cleaners: cleaners.map((c: any) => ({ id: c.id as string, title: c.full_name as string, sub: (c.email as string) ?? "" })),
    });
  } catch {
    return NextResponse.json({ success: false, error: "Search failed" }, { status: 500 });
  }
}
