import Link from "next/link";
import type { LucideIcon } from "lucide-react";

export function ServiceCard({
  icon: Icon, title, description, href,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="group flex flex-col rounded-2xl border-2 border-slate-200 bg-white p-6 shadow-sm transition-all hover:-translate-y-1 hover:border-brand-teal-300 hover:shadow-xl"
    >
      <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-teal-50 text-brand-teal-700 group-hover:bg-brand-teal-100">
        <Icon className="h-6 w-6" />
      </span>
      <h3 className="font-display text-lg font-bold text-slate-900">{title}</h3>
      <p className="mt-2 text-sm text-slate-500">{description}</p>
      <span className="mt-4 text-sm font-semibold text-brand-teal-700">Get a quote →</span>
    </Link>
  );
}
