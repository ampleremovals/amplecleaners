"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard, CalendarDays, Users, UserPlus, UserRound, Receipt, BarChart3, Settings, Activity, Menu, X, LogOut, Plus,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Avatar } from "@/components/admin/ui";
import { cn } from "@/lib/utils";

interface NavItem { href: string; label: string; icon: typeof Users; badgeKey?: "bookings" | "applications" }
const GROUPS: { label: string; items: NavItem[] }[] = [
  { label: "Overview", items: [{ href: "/admin", label: "Dashboard", icon: LayoutDashboard }] },
  {
    label: "Operations",
    items: [
      { href: "/admin/bookings", label: "Bookings", icon: CalendarDays, badgeKey: "bookings" },
      { href: "/admin/cleaners", label: "Cleaners", icon: Users },
      { href: "/admin/applications", label: "Applications", icon: UserPlus, badgeKey: "applications" },
      { href: "/admin/customers", label: "Customers", icon: UserRound },
    ],
  },
  { label: "Finance", items: [{ href: "/admin/invoices", label: "Invoices", icon: Receipt }, { href: "/admin/reports", label: "Reports", icon: BarChart3 }] },
  { label: "System", items: [{ href: "/admin/settings", label: "Settings", icon: Settings }, { href: "/admin/logs", label: "System log", icon: Activity }] },
];
const ALL_ITEMS = GROUPS.flatMap((g) => g.items);

const isActive = (pathname: string, href: string) => (href === "/admin" ? pathname === "/admin" : pathname === href || pathname.startsWith(`${href}/`));

export interface AdminShellProps {
  user: { name: string; email: string };
  /** Counts shown as small badges: new enquiries, new cleaner applications. */
  badges: { bookings: number; applications: number };
  children: React.ReactNode;
}

function NavLinks({ pathname, badges, onNavigate }: { pathname: string; badges: AdminShellProps["badges"]; onNavigate?: () => void }) {
  return (
    <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="Admin">
      {GROUPS.map((g) => (
        <div key={g.label} className="mb-5 last:mb-0">
          <p className="px-2.5 pb-1.5 text-[11px] font-medium tracking-wide text-slate-400">{g.label}</p>
          <ul className="space-y-0.5">
            {g.items.map((item) => {
              const active = isActive(pathname, item.href);
              const badge = item.badgeKey ? badges[item.badgeKey] : 0;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "group flex h-9 items-center gap-2.5 rounded-lg px-2.5 text-[13.5px] font-medium transition-colors",
                      active ? "bg-slate-100 text-slate-900" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900",
                    )}
                  >
                    <item.icon className={cn("h-[17px] w-[17px] shrink-0", active ? "text-brand-green-700" : "text-slate-400 group-hover:text-slate-600")} />
                    <span className="flex-1 truncate">{item.label}</span>
                    {badge > 0 && (
                      <span className="rounded-full bg-brand-green-700 px-1.5 py-px text-[11px] font-semibold leading-4 text-white" aria-label={`${badge} new`}>{badge}</span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

function Brand() {
  return (
    <Link href="/admin" className="flex items-center gap-2.5">
      <Image src="/logo-icon.png" alt="" width={64} height={64} priority className="h-8 w-8 rounded-lg" />
      <span className="text-[15px] font-semibold tracking-tight text-slate-900">Ample Cleaners</span>
    </Link>
  );
}

export function AdminShell({ user, badges, children }: AdminShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  // Close the drawer on navigation and on Escape; lock page scroll while it is open.
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
  }, [open]);

  const signOut = async () => {
    setSigningOut(true);
    await createClient().auth.signOut();
    router.replace("/admin/login");
    router.refresh();
  };

  const current = ALL_ITEMS.find((i) => isActive(pathname, i.href));
  const segments = pathname.split("/").filter(Boolean).slice(2);
  const crumb = segments[0] ? (segments[0] === "new" ? "New" : "Details") : null;

  const userBlock = (
    <div className="flex items-center gap-2.5 border-t border-slate-200 p-3">
      <Avatar name={user.name} size={32} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-medium text-slate-900">{user.name}</p>
        <p className="truncate text-xs text-slate-500">{user.email}</p>
      </div>
      <button
        type="button"
        onClick={signOut}
        disabled={signingOut}
        aria-label="Sign out"
        title="Sign out"
        className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 disabled:opacity-50"
      >
        <LogOut className="h-4 w-4" />
      </button>
    </div>
  );

  return (
    <div className="admin-shell min-h-screen lg:flex">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-[248px] shrink-0 flex-col border-r border-slate-200 bg-white lg:flex">
        <div className="flex h-14 items-center border-b border-slate-200 px-5"><Brand /></div>
        <NavLinks pathname={pathname} badges={badges} />
        {userBlock}
      </aside>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Navigation">
          <button type="button" aria-label="Close menu" className="absolute inset-0 bg-slate-900/40" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 flex w-[280px] max-w-[85vw] flex-col bg-white shadow-xl">
            <div className="flex h-14 items-center justify-between border-b border-slate-200 px-5">
              <Brand />
              <button type="button" aria-label="Close menu" onClick={() => setOpen(false)} className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100">
                <X className="h-5 w-5" />
              </button>
            </div>
            <NavLinks pathname={pathname} badges={badges} onNavigate={() => setOpen(false)} />
            {userBlock}
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar */}
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-slate-200 bg-white/85 px-4 backdrop-blur sm:px-8">
          <button type="button" aria-label="Open menu" onClick={() => setOpen(true)} className="-ml-2 flex h-10 w-10 items-center justify-center rounded-lg text-slate-700 hover:bg-slate-100 lg:hidden">
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex min-w-0 items-center gap-2 text-sm">
            <span className="truncate font-semibold text-slate-900">{current?.label ?? "Admin"}</span>
            {crumb && <><span className="text-slate-300" aria-hidden>/</span><span className="truncate text-slate-500">{crumb}</span></>}
          </div>
          <div className="ml-auto flex items-center gap-3">
            {/* These two pages already lead with their own "New booking" action. */}
            {pathname !== "/admin/bookings" && pathname !== "/admin/bookings/new" && (
              <Link
                href="/admin/bookings/new"
                className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-brand-green-700 px-3.5 text-[13px] font-semibold text-white shadow-sm transition-colors hover:bg-brand-green-800"
              >
                <Plus className="h-4 w-4" /> <span className="hidden sm:inline">New booking</span><span className="sm:hidden">New</span>
              </Link>
            )}
          </div>
        </header>
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
