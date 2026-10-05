"use client";

import { useState } from "react";
import Link from "next/link";
import { Users } from "lucide-react";
import { useAdminFetch } from "@/hooks/useAdminFetch";
import { TableSkeleton, ErrorState, EmptyState } from "@/components/admin/DataState";
import { formatDate } from "@/lib/utils";

interface Customer { id: string; full_name: string; email: string; phone: string; created_at: string; booking_count: number; }
interface CustomersResponse { success: boolean; error?: string; customers: Customer[] }

export default function CustomersPage() {
  const { data, loading, error, reload } = useAdminFetch<CustomersResponse>("/api/admin/customers");
  const [search, setSearch] = useState("");

  const customers = data?.customers ?? [];
  const term = search.trim().toLowerCase();
  const filtered = customers.filter((c) => [c.full_name, c.email, c.phone].some((v) => v.toLowerCase().includes(term)));

  return (
    <div className="p-4 sm:p-8">
      <h1 className="font-display text-2xl font-extrabold text-slate-900">Customers</h1>
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search by name, email or phone…"
        aria-label="Search customers"
        className="mt-4 h-10 w-full max-w-sm rounded-xl border border-slate-200 px-3.5 text-sm outline-none focus:border-brand-green-600"
      />

      <div className="mt-6">
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
          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Phone</th>
                  <th className="px-4 py-3">Bookings</th>
                  <th className="px-4 py-3">Customer since</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <tr key={c.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                    <td className="px-4 py-3 font-semibold"><Link href={`/admin/customers/${c.id}`} className="text-brand-green-700 hover:underline">{c.full_name}</Link></td>
                    <td className="px-4 py-3 text-slate-500">{c.email}</td>
                    <td className="px-4 py-3 text-slate-500">{c.phone}</td>
                    <td className="px-4 py-3 text-slate-500">{c.booking_count}</td>
                    <td className="px-4 py-3 text-slate-500">{formatDate(c.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
