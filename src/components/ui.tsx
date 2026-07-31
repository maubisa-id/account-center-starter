import Link from "next/link";
import type { ReactNode } from "react";
import { IconArrow } from "./icons";

/* ---------- Status tokens (Indonesia) ---------- */

const STATUS_TONE: Record<string, string> = {
  active: "bg-lime-50 text-lime-700 ring-lime-600/20",
  paid: "bg-lime-50 text-lime-700 ring-lime-600/20",
  settlement: "bg-lime-50 text-lime-700 ring-lime-600/20",
  gratis: "bg-lime-50 text-lime-700 ring-lime-600/20",
  berbayar: "bg-brand-50 text-brand-700 ring-brand-600/20",
  pending: "bg-amber-50 text-amber-700 ring-amber-600/20",
  past_due: "bg-amber-50 text-amber-700 ring-amber-600/20",
  expired: "bg-zinc-100 text-zinc-500 ring-zinc-500/20",
  cancelled: "bg-zinc-100 text-zinc-500 ring-zinc-500/20",
  failed: "bg-rose-50 text-rose-700 ring-rose-600/20",
  refunded: "bg-zinc-100 text-zinc-500 ring-zinc-500/20",
};

const STATUS_DOT: Record<string, string> = {
  active: "bg-lime-500",
  paid: "bg-lime-500",
  settlement: "bg-lime-500",
  gratis: "bg-lime-500",
  berbayar: "bg-brand-500",
  pending: "bg-amber-500",
  past_due: "bg-amber-500",
  expired: "bg-zinc-400",
  cancelled: "bg-zinc-400",
  failed: "bg-rose-500",
  refunded: "bg-zinc-400",
};

export const STATUS_LABEL: Record<string, string> = {
  active: "Aktif",
  paid: "Lunas",
  settlement: "Lunas",
  gratis: "Gratis",
  berbayar: "Berbayar",
  pending: "Menunggu",
  past_due: "Tertunggak",
  expired: "Kedaluwarsa",
  cancelled: "Dibatalkan",
  failed: "Gagal",
  refunded: "Dikembalikan",
};

export function Badge({ value }: { value: string }) {
  const tone = STATUS_TONE[value] ?? "bg-zinc-100 text-zinc-600 ring-zinc-500/20";
  const dot = STATUS_DOT[value] ?? "bg-zinc-400";
  const label = STATUS_LABEL[value] ?? value;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${tone}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
      {label}
    </span>
  );
}

/* ---------- Surfaces ---------- */

// Double-bezel "machined hardware" surface: outer tray + inner plate.
export function Panel({
  children,
  className = "",
  innerClassName = "",
}: {
  children: ReactNode;
  className?: string;
  innerClassName?: string;
}) {
  return (
    <div
      className={`rounded-bezel bg-white/50 p-1.5 shadow-soft ring-1 ring-black/[0.05] ${className}`}
    >
      <div className={`rounded-[1.375rem] bg-white ring-1 ring-black/[0.04] ${innerClassName}`}>
        {children}
      </div>
    </div>
  );
}

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-3xl bg-white ring-1 ring-black/[0.05] shadow-soft ${className}`}>
      {children}
    </div>
  );
}

/* ---------- Typography helpers ---------- */

export function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full bg-white/70 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-zinc-500 ring-1 ring-black/[0.05] backdrop-blur">
      {children}
    </span>
  );
}

export function SectionTitle({
  eyebrow,
  title,
  desc,
  action,
}: {
  eyebrow?: string;
  title: string;
  desc?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="space-y-3">
        {eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}
        <h2 className="text-xl font-bold tracking-tight text-ink sm:text-2xl">{title}</h2>
        {desc ? <p className="max-w-xl text-sm leading-relaxed text-zinc-500">{desc}</p> : null}
      </div>
      {action ? <div>{action}</div> : null}
    </div>
  );
}

/* ---------- Data bits ---------- */

export function InfoRow({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-400">
        {label}
      </div>
      <div className="text-[15px] font-medium text-ink">{children}</div>
    </div>
  );
}

export function StatCard({
  icon,
  label,
  value,
  hint,
  accent = "text-brand-600",
}: {
  icon: ReactNode;
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  accent?: string;
}) {
  return (
    <Card className="group p-5 transition-[transform,box-shadow] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-0.5 hover:shadow-lift">
      <div className="flex items-center justify-between">
        <span
          className={`flex h-10 w-10 items-center justify-center rounded-2xl bg-zinc-50 ring-1 ring-black/[0.04] ${accent}`}
        >
          {icon}
        </span>
      </div>
      <div className="mt-4 text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-400">
        {label}
      </div>
      <div className="mt-1 text-2xl font-bold tracking-tight text-ink">{value}</div>
      {hint ? <div className="mt-1 text-xs text-zinc-400">{hint}</div> : null}
    </Card>
  );
}

/* ---------- Actions (island buttons) ---------- */

const BTN_BASE =
  "group inline-flex items-center gap-3 rounded-full py-2.5 text-sm font-semibold transition-[transform,background-color,box-shadow] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2";

function variantClass(variant: "primary" | "ghost") {
  return variant === "primary"
    ? "bg-brand-500 text-white shadow-brand hover:bg-brand-600 hover:-translate-y-[1px]"
    : "bg-white text-ink shadow-soft ring-1 ring-black/[0.08] hover:bg-zinc-50";
}

function TrailingIcon({ variant }: { variant: "primary" | "ghost" }) {
  return (
    <span
      className={`flex h-8 w-8 items-center justify-center rounded-full transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-x-0.5 group-hover:-translate-y-[1px] group-hover:scale-105 ${
        variant === "primary" ? "bg-white/20" : "bg-ink/[0.06]"
      }`}
    >
      <IconArrow className="h-4 w-4" />
    </span>
  );
}

export function ButtonLink({
  href,
  children,
  variant = "primary",
  icon = true,
  external = false,
}: {
  href: string;
  children: ReactNode;
  variant?: "primary" | "ghost";
  icon?: boolean;
  external?: boolean;
}) {
  const className = `${BTN_BASE} ${variantClass(variant)} ${icon ? "pl-5 pr-2" : "px-5"}`;
  const inner = (
    <>
      <span>{children}</span>
      {icon ? <TrailingIcon variant={variant} /> : null}
    </>
  );
  if (external) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
        {inner}
      </a>
    );
  }
  return (
    <Link href={href} className={className}>
      {inner}
    </Link>
  );
}

export function Button({
  children,
  variant = "primary",
  icon = false,
}: {
  children: ReactNode;
  variant?: "primary" | "ghost";
  icon?: boolean;
}) {
  return (
    <button
      type="button"
      className={`${BTN_BASE} ${variantClass(variant)} ${icon ? "pl-5 pr-2" : "px-5"}`}
    >
      <span>{children}</span>
      {icon ? <TrailingIcon variant={variant} /> : null}
    </button>
  );
}

/* ---------- Misc ---------- */

export function Reveal({
  children,
  delay = 0,
  className = "",
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <div className={`animate-rise ${className}`} style={{ animationDelay: `${delay}ms` }}>
      {children}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  desc,
}: {
  icon: ReactNode;
  title: string;
  desc?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-zinc-300 bg-white/50 px-6 py-14 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-50 text-zinc-400 ring-1 ring-black/[0.04]">
        {icon}
      </span>
      <p className="mt-4 text-sm font-semibold text-ink">{title}</p>
      {desc ? <p className="mt-1 max-w-sm text-xs text-zinc-400">{desc}</p> : null}
    </div>
  );
}
