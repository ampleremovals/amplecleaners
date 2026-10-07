"use client";

import { useState } from "react";
import { Search, Users } from "lucide-react";
import { useAdminFetch } from "@/hooks/useAdminFetch";
import { TableSkeleton, ErrorState, EmptyState } from "@/components/admin/DataState";
import { AdminHero, AdminPage, PersonCell, TABLE, TableCard } from "@/components/admin/kit";
import { Pill } from "@/components/admin/ui";
import { formatDate } from "@/lib/utils";

interface Customer { id: string; full_name: string; email: string; phone: string; created_at: string; booking_count: number; }
interface CustomersResponse { success: boolean; error?: string; customers: Customer[] }

export default function CustomersPage() {
  const { data, loading, error, reload } = useAdminFetch<CustomersResponse>("/api/admin/customers");
  const [search, setSearch] = useState("");

  const customers = data?.customers ?? [];
  const term = search.trim().toLowerCase();
  const filtered = customers.filter((c) => [c.full_name, c.email, c.phone].some((v) => v.toLowerCase().includes(term)));
  const repeat = customers.filter((c) => c.booking_count > 1).length;
  const bookings = customers.reduce((s, c) => s + c.booking_count, 0);

  return (
    <AdminPage>
      <AdminHero
        eyebrow="Operations"
        title="Customers"
        description="Everyone who has booked with you. Customers appear here automatically when someone books."
        stats={data ? [
          { label: "Customers", value: customers.length },
          { label: "Repeat customers", value: repeat, hint: customers.length ? `${Math.round((repeat / customers.length) * 100)}% have booked more than once` : undefined },
          { label: "Bookings in total", value: bookings, hint: customers.length ? `${(bookings / customers.length).toFixed(1)} per customer` : undefined },
        ] : undefined}
      />

      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, email or phone…"
          aria-label="Search customers"
          className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3.5 text-sm shadow-sm outline-none transition placeholder:text-slate-400 focus:border-brand-green-600 focus:ring-4 focus:ring-brand-green-100"
        />
      </div>

      {loading && !data ? (
        <TableSkeleton cols={5} />
      ) : error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Users className="h-8 w-8" />}
          title={customers.length === 0 ? "No customers yet" : "No customers match"}
          hint={customers.length === 0 ? "Customers appear here automatically when someone books." : "Try a different search."}
        />
      ) : (
        <TableCard minWidth={680}>
          <table className={TABLE.table}>
            <thead className={TABLE.head}>
              <tr>
                <th className={TABLE.th}>Customer</th>
                <th className={TABLE.th}>Phone</th>
                <th className={TABLE.th}>Bookings</th>
                <th className={TABLE.th}>Customer since</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id} className={TABLE.row}>
                  <td className={TABLE.td}><PersonCell name={c.full_name} sub={c.email} href={`/admin/customers/${c.id}`} /></td>
                  <td className={`${TABLE.td} tabular-nums text-slate-600`}>{c.phone}</td>
                  <td className={TABLE.td}>{c.booking_count > 1 ? <Pill tone="positive">{c.booking_count} bookings</Pill> : <span className="text-slate-600">{c.booking_count}</span>}</td>
                  <td className={`${TABLE.td} text-slate-600`}>{formatDate(c.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableCard>
      )}
    </AdminPage>
  );
}
