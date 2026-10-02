"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { formatDate } from "@/lib/utils";

interface Customer { id: string; full_name: string; email: string; phone: string; created_at: string; booking_count: number; }

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch("/api/admin/customers").then((r) => r.json()).then((d) => { if (d.success) setCustomers(d.customers); }).finally(() => setLoading(false));
  }, []);

  const filtered = customers.filter((c) =>
    [c.full_name, c.email, c.phone].some((v) => v.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="p-6 sm:p-8">
      <h1 className="font-display text-2xl font-extrabold text-slate-900">Customers</h1>
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search by name, email or phone…"
        className="mt-4 h-10 w-full max-w-sm rounded-xl border border-slate-200 px-3.5 text-sm outline-none focus:border-brand-teal-600"
      />

      {loading ? (
        <div className="mt-10 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-brand-teal-600" /></div>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-2xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
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
                  <td className="px-4 py-3 font-semibold text-slate-900">{c.full_name}</td>
                  <td className="px-4 py-3 text-slate-500">{c.email}</td>
                  <td className="px-4 py-3 text-slate-500">{c.phone}</td>
                  <td className="px-4 py-3 text-slate-500">{c.booking_count}</td>
                  <td className="px-4 py-3 text-slate-500">{formatDate(c.created_at)}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-10 text-center text-slate-400">No customers yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
