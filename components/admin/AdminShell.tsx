"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard, CalendarDays, Users, UserPlus, UserRound, Receipt, BarChart3, Settings, Activity, Menu, X, LogOut, Plus, Search,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Avatar } from "@/components/admin/ui";
import { CommandPalette } from "@/components/admin/CommandPalette";
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
          <p className="px-3 pb-1.5 text-[11px] font-medium tracking-wide text-white/35">{g.label}</p>
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
                      "group relative flex h-9 items-center gap-2.5 rounded-lg px-3 text-[13.5px] font-medium transition-colors",
                      active
                        ? "bg-white/[0.1] text-white before:absolute before:bottom-2 before:left-0 before:top-2 before:w-[3px] before:rounded-r-full before:bg-brand-green-400 before:shadow-[0_0_12px_2px_rgba(74,222,128,0.55)]"
                        : "text-white/65 hover:bg-white/[0.06] hover:text-white",
                    )}
                  >
                    <item.icon className={cn("h-[17px] w-[17px] shrink-0 transition-colors", active ? "text-brand-green-300" : "text-white/40 group-hover:text-white/80")} />
                    <span className="flex-1 truncate">{item.label}</span>
                    {badge > 0 && (
                      <span className="rounded-full bg-brand-green-400 px-1.5 py-px text-[11px] font-bold leading-4 text-brand-green-950" aria-label={`${badge} new`}>{badge}</span>
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
      <Image src="/logo-icon.png" alt="" width={64} height={64} priority className="h-8 w-8 rounded-lg ring-1 ring-white/20" />
      <span className="text-[15px] font-semibold tracking-tight text-white">Ample Cleaners</span>
    </Link>
  );
}

/** The dark brand rail, shared by the desktop sidebar and the phone drawer. */
function Rail({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex h-full flex-col overflow-hidden bg-[linear-gradient(180deg,#052e16_0%,#03200f_55%,#021a0c_100%)]">
      <div className="pointer-events-none absolute -left-24 -top-24 h-64 w-64 rounded-full bg-brand-green-500/20 blur-[80px]" aria-hidden />
      <div className="pointer-events-none absolute -bottom-32 -right-24 h-64 w-64 rounded-full bg-brand-violet-500/15 blur-[90px]" aria-hidden />
      <div className="relative flex h-full flex-col">{children}</div>
    </div>
  );
}

export function AdminShell({ user, badges, children }: AdminShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [mod, setMod] = useState("Ctrl");

  useEffect(() => { if (/Mac|iPhone|iPad/.test(navigator.platform)) setMod("⌘"); }, []);

  // ⌘K / Ctrl+K opens search from anywhere.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setPaletteOpen((o) => !o); }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

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
    <div className="flex items-center gap-2.5 border-t border-white/10 p-3">
      <Avatar name={user.name} size={34} tone="dark" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-medium text-white">{user.name}</p>
        <p className="truncate text-xs text-white/50">{user.email}</p>
      </div>
      <button
        type="button"
        onClick={signOut}
        disabled={signingOut}
        aria-label="Sign out"
        title="Sign out"
        className="flex h-8 w-8 items-center justify-center rounded-lg text-white/50 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-50"
      >
        <LogOut className="h-4 w-4" />
      </button>
    </div>
  );

  return (
    <div className="admin-shell min-h-screen lg:flex">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-[248px] shrink-0 lg:block">
        <Rail>
          <div className="flex h-14 items-center border-b border-white/10 px-5"><Brand /></div>
          <NavLinks pathname={pathname} badges={badges} />
          {userBlock}
        </Rail>
      </aside>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Navigation">
          <button type="button" aria-label="Close menu" className="absolute inset-0 bg-slate-950/50" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-[280px] max-w-[85vw] shadow-2xl">
            <Rail>
              <div className="flex h-14 items-center justify-between border-b border-white/10 px-5">
                <Brand />
                <button type="button" aria-label="Close menu" onClick={() => setOpen(false)} className="flex h-9 w-9 items-center justify-center rounded-lg text-white/60 hover:bg-white/10 hover:text-white">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <NavLinks pathname={pathname} badges={badges} onNavigate={() => setOpen(false)} />
              {userBlock}
            </Rail>
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar */}
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-slate-200 bg-white/80 px-4 backdrop-blur-md sm:px-8">
          <button type="button" aria-label="Open menu" onClick={() => setOpen(true)} className="-ml-2 flex h-10 w-10 items-center justify-center rounded-lg text-slate-700 hover:bg-slate-100 lg:hidden">
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex min-w-0 items-center gap-2 text-sm">
            <span className="truncate font-semibold text-slate-900">{current?.label ?? "Admin"}</span>
            {crumb && <><span className="text-slate-300" aria-hidden>/</span><span className="truncate text-slate-500">{crumb}</span></>}
          </div>
          <div className="ml-auto flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => setPaletteOpen(true)}
              aria-label="Search"
              className="hidden h-9 w-64 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-[13px] text-slate-500 shadow-sm transition-colors hover:border-slate-300 hover:text-slate-700 md:flex lg:w-72"
            >
              <Search className="h-4 w-4" />
              <span className="flex-1 text-left">Search or jump to…</span>
              <kbd className="rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500">{mod} K</kbd>
            </button>
            <button type="button" onClick={() => setPaletteOpen(true)} aria-label="Search" className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-sm md:hidden">
              <Search className="h-4 w-4" />
            </button>
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

      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
    </div>
  );
}
