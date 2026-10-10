"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import {
  Activity, BarChart3, CalendarDays, CalendarPlus, CornerDownLeft, Inbox, LayoutDashboard, Loader2, Mailbox, Receipt, Search, Settings, UserPlus, UserRound, Users,
} from "lucide-react";
import { BOOKING_STATUS_LABELS, type BookingStatus } from "@/types";

interface Hit { id: string; title: string; sub: string; status?: string }
interface Results { bookings: Hit[]; customers: Hit[]; cleaners: Hit[] }
const EMPTY: Results = { bookings: [], customers: [], cleaners: [] };

const PAGES = [
  { label: "Dashboard", href: "/admin", icon: LayoutDashboard, keywords: "overview home" },
  { label: "Bookings", href: "/admin/bookings", icon: CalendarDays, keywords: "pipeline board jobs" },
  { label: "Cleaners", href: "/admin/cleaners", icon: Users, keywords: "roster staff team" },
  { label: "Applications", href: "/admin/applications", icon: UserPlus, keywords: "recruit new cleaners" },
  { label: "Customers", href: "/admin/customers", icon: UserRound, keywords: "clients" },
  { label: "Inbox", href: "/admin/inbox", icon: Inbox, keywords: "messages replies email conversations customers wrote" },
  { label: "Automations", href: "/admin/automations", icon: Mailbox, keywords: "email templates campaigns follow up journeys send log unsubscribe" },
  { label: "Invoices", href: "/admin/invoices", icon: Receipt, keywords: "payments billing money" },
  { label: "Reports", href: "/admin/reports", icon: BarChart3, keywords: "analytics marketing revenue" },
  { label: "Settings", href: "/admin/settings", icon: Settings, keywords: "prices deposit messaging" },
  { label: "System log", href: "/admin/logs", icon: Activity, keywords: "errors" },
  { label: "New booking", href: "/admin/bookings/new", icon: CalendarPlus, keywords: "create add phone" },
];

const ITEM = "group flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-700 aria-selected:bg-slate-100 aria-selected:text-slate-900";
const GROUP = "px-1 pb-1 pt-2 [&_[cmdk-group-heading]]:px-2.5 [&_[cmdk-group-heading]]:pb-1.5 [&_[cmdk-group-heading]]:pt-1 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-slate-400";

export function CommandPalette({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Results>(EMPTY);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState("");
  const q = query.trim();

  // Reset when closed, so it always opens fresh.
  useEffect(() => {
    if (!open) { setQuery(""); setResults(EMPTY); setLoading(false); }
  }, [open]);

  // Debounced remote search with cancellation of stale requests.
  useEffect(() => {
    if (q.length < 2) { setResults(EMPTY); setLoading(false); return undefined; }
    setLoading(true);
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/admin/search?q=${encodeURIComponent(q)}`, { signal: ctrl.signal });
        const json = await res.json();
        if (json.success) setResults({ bookings: json.bookings, customers: json.customers, cleaners: json.cleaners });
      } catch {
        /* aborted or offline: keep the previous results */
      } finally {
        if (!ctrl.signal.aborted) setLoading(false);
      }
    }, 180);
    return () => { clearTimeout(t); ctrl.abort(); };
  }, [q]);

  const go = (href: string) => { onOpenChange(false); router.push(href); };
  const lower = q.toLowerCase();
  const pages = PAGES.filter((p) => !lower || `${p.label} ${p.keywords}`.toLowerCase().includes(lower));
  const total = results.bookings.length + results.customers.length + results.cleaners.length + pages.length;

  // Enter must always open the TOP result. cmdk keeps the previous highlight when new results arrive, so point the
  // selection back at the first item whenever the list changes (typing, results landing, opening).
  const firstValue = results.bookings[0] ? `booking-${results.bookings[0].id}` : results.customers[0] ? `customer-${results.customers[0].id}` : results.cleaners[0] ? `cleaner-${results.cleaners[0].id}` : pages[0] ? `page-${pages[0].href}` : "";
  useEffect(() => { setSelected(firstValue); }, [firstValue, q, open]);

  return (
    <Command.Dialog
      open={open}
      onOpenChange={onOpenChange}
      label="Search and jump"
      shouldFilter={false}
      value={selected}
      onValueChange={setSelected}
      loop
      overlayClassName="fixed inset-0 z-[60] bg-slate-950/50 backdrop-blur-sm data-[state=open]:animate-in data-[state=open]:fade-in-0"
      contentClassName="fixed left-1/2 top-[12vh] z-[61] w-[calc(100vw-2rem)] max-w-xl -translate-x-1/2 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_40px_100px_-20px_rgba(2,6,23,0.55)] data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95"
    >
      <div className="flex items-center gap-3 border-b border-slate-100 px-4">
        {loading ? <Loader2 className="h-[18px] w-[18px] shrink-0 animate-spin text-slate-400" /> : <Search className="h-[18px] w-[18px] shrink-0 text-slate-400" />}
        <Command.Input
          value={query}
          onValueChange={setQuery}
          placeholder="Search bookings, customers, cleaners — or jump to a page"
          className="h-14 w-full bg-transparent text-[15px] text-slate-900 outline-none placeholder:text-slate-400"
        />
        <kbd className="hidden rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500 sm:block">ESC</kbd>
      </div>

      <Command.List className="max-h-[min(60vh,26rem)] overflow-y-auto p-2">
        <Command.Empty className="px-4 py-10 text-center text-sm text-slate-500">
          {q.length < 2 ? "Start typing to search." : loading ? "Searching…" : <>No matches for <span className="font-medium text-slate-700">“{q}”</span>.</>}
        </Command.Empty>

        {results.bookings.length > 0 && (
          <Command.Group heading="Bookings" className={GROUP}>
            {results.bookings.map((b) => (
              <Command.Item key={b.id} value={`booking-${b.id}`} onSelect={() => go(`/admin/bookings/${b.id}`)} className={ITEM}>
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700"><CalendarDays className="h-4 w-4" /></span>
                <span className="min-w-0 flex-1"><span className="block truncate font-medium">{b.title}</span><span className="block truncate text-xs text-slate-500">{b.sub}</span></span>
                {b.status && <span className="hidden shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600 sm:block">{BOOKING_STATUS_LABELS[b.status as BookingStatus] ?? b.status}</span>}
              </Command.Item>
            ))}
          </Command.Group>
        )}
        {results.customers.length > 0 && (
          <Command.Group heading="Customers" className={GROUP}>
            {results.customers.map((c) => (
              <Command.Item key={c.id} value={`customer-${c.id}`} onSelect={() => go(`/admin/customers/${c.id}`)} className={ITEM}>
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sky-50 text-sky-700"><UserRound className="h-4 w-4" /></span>
                <span className="min-w-0 flex-1"><span className="block truncate font-medium">{c.title}</span><span className="block truncate text-xs text-slate-500">{c.sub}</span></span>
              </Command.Item>
            ))}
          </Command.Group>
        )}
        {results.cleaners.length > 0 && (
          <Command.Group heading="Cleaners" className={GROUP}>
            {results.cleaners.map((c) => (
              <Command.Item key={c.id} value={`cleaner-${c.id}`} onSelect={() => go(`/admin/cleaners/${c.id}`)} className={ITEM}>
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-50 text-violet-700"><Users className="h-4 w-4" /></span>
                <span className="min-w-0 flex-1"><span className="block truncate font-medium">{c.title}</span><span className="block truncate text-xs text-slate-500">{c.sub}</span></span>
              </Command.Item>
            ))}
          </Command.Group>
        )}
        {pages.length > 0 && (
          <Command.Group heading={q ? "Pages" : "Jump to"} className={GROUP}>
            {pages.map((p) => (
              <Command.Item key={p.href} value={`page-${p.href}`} onSelect={() => go(p.href)} className={ITEM}>
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600"><p.icon className="h-4 w-4" /></span>
                <span className="flex-1 font-medium">{p.label}</span>
              </Command.Item>
            ))}
          </Command.Group>
        )}
      </Command.List>

      <div className="flex items-center justify-between gap-3 border-t border-slate-100 bg-slate-50 px-4 py-2.5 text-[11px] text-slate-500">
        <span className="flex items-center gap-3"><span><kbd className="font-sans font-semibold">↑↓</kbd> move</span><span className="inline-flex items-center gap-1"><CornerDownLeft className="h-3 w-3" /> open</span></span>
        <span>{total} result{total === 1 ? "" : "s"}</span>
      </div>
    </Command.Dialog>
  );
}
