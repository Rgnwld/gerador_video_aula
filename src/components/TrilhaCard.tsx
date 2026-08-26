import Link from "next/link";
import type { ReactNode } from "react";

export function TrilhaCard({
  href,
  title,
  description,
  badge,
  footer,
}: {
  href: string;
  title: string;
  description?: string;
  badge?: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <Link
      href={href}
      className="block rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-brand-300 hover:shadow-md"
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <h3 className="font-semibold text-slate-900">{title}</h3>
        {badge}
      </div>
      {description && <p className="mb-3 line-clamp-2 text-sm text-slate-500">{description}</p>}
      {footer}
    </Link>
  );
}
