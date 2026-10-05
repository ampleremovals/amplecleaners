import Link from "next/link";
import Image from "next/image";
import { LayoutDashboard, Calendar, Users, Receipt, BarChart3, UserPlus, Settings, Activity } from "lucide-react";

const NAV = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/bookings", label: "Bookings", icon: Calendar },
  { href: "/admin/cleaners", label: "Cleaners", icon: Users },
  { href: "/admin/applications", label: "Applications", icon: UserPlus },
  { href: "/admin/customers", label: "Customers", icon: Users },
  { href: "/admin/invoices", label: "Invoices", icon: Receipt },
  { href: "/admin/reports", label: "Reports", icon: BarChart3 },
  { href: "/admin/settings", label: "Settings", icon: Settings },
  { href: "/admin/logs", label: "System log", icon: Activity },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-slate-50">
      <aside className="hidden w-64 shrink-0 border-r border-slate-200 bg-white sm:flex sm:flex-col">
        <div className="flex h-16 items-center gap-2 border-b border-slate-200 px-5 font-display text-lg font-extrabold text-brand-green-800">
          <Image src="/logo-icon.png" alt="" width={64} height={64} priority className="h-8 w-8 rounded-lg" />
          Ample Cleaners
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-brand-green-50 hover:text-brand-green-800"
            >
              <item.icon className="h-4 w-4" /> {item.label}
            </Link>
          ))}
        </nav>
      </aside>
      <div className="flex-1">{children}</div>
    </div>
  );
}
