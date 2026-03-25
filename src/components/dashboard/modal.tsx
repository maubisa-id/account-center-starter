"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { IconClose, IconChevron } from "@/components/icons";

export function Modal({
  open,
  onClose,
  title,
  desc,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  desc?: string;
  children: ReactNode;
}) {
  const [mounted, setMounted] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const restoreRef = useRef<HTMLElement | null>(null);
  const titleId = useId();
  const descId = useId();
  // Mount-guard untuk createPortal (hindari hydration mismatch SSR). setState-on-mount memang
  // disengaja di sini; bukan cascading render yang merugikan.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    function onEsc(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (open) {
      document.addEventListener("keydown", onEsc);
      document.body.style.overflow = "hidden";
      // Simpan elemen yang tadinya fokus, pindahkan fokus ke panel (biar screen reader
      // membacakan judul dialog), lalu kembalikan fokus saat modal ditutup.
      restoreRef.current = document.activeElement as HTMLElement | null;
      panelRef.current?.focus();
    }
    return () => {
      document.removeEventListener("keydown", onEsc);
      document.body.style.overflow = "";
      if (open) restoreRef.current?.focus?.();
    };
  }, [open, onClose]);

  // Focus trap: Tab tidak boleh keluar dari modal.
  function trapFocus(e: React.KeyboardEvent) {
    if (e.key !== "Tab") return;
    const panel = panelRef.current;
    if (!panel) return;
    const nodes = Array.from(
      panel.querySelectorAll<HTMLElement>(
        'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])',
      ),
    ).filter((el) => el.offsetParent !== null);
    if (nodes.length === 0) return;
    const first = nodes[0];
    const last = nodes[nodes.length - 1];
    const active = document.activeElement;
    if (e.shiftKey && (active === first || active === panel)) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && active === last) {
      e.preventDefault();
      first.focus();
    }
  }

  if (!open || !mounted) return null;

  // Portal ke <body> supaya position:fixed lepas dari containing-block transform
  // (mis. wrapper .animate-rise) yang bikin modal terjebak & kepotong.
  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="animate-fade absolute inset-0 bg-ink/40 backdrop-blur-sm" onClick={onClose} />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={desc ? descId : undefined}
        tabIndex={-1}
        onKeyDown={trapFocus}
        className="animate-rise relative max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto rounded-3xl bg-white p-6 shadow-lift ring-1 ring-black/[0.05] outline-none sm:p-7"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id={titleId} className="text-lg font-bold text-ink">{title}</h2>
            {desc ? <p id={descId} className="mt-1 text-sm text-zinc-500">{desc}</p> : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-zinc-500 transition-colors hover:bg-zinc-50 hover:text-ink"
          >
            <IconClose className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-5">{children}</div>
      </div>
    </div>,
    document.body,
  );
}

export function Field({
  label,
  name,
  type = "text",
  defaultValue,
  placeholder,
  required,
  autoComplete,
  max,
  min,
  onChange,
}: {
  label: string;
  name: string;
  type?: string;
  defaultValue?: string;
  placeholder?: string;
  required?: boolean;
  autoComplete?: string;
  max?: string;
  min?: string;
  onChange?: React.ChangeEventHandler<HTMLInputElement>;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-zinc-500">{label}</span>
      <input
        name={name}
        type={type}
        defaultValue={defaultValue}
        placeholder={placeholder}
        required={required}
        autoComplete={autoComplete}
        max={max}
        min={min}
        onChange={onChange}
        className="mt-1.5 w-full rounded-2xl border border-black/10 bg-white p-3.5 text-sm text-ink placeholder:text-zinc-400 transition-colors focus:border-brand-400 focus:bg-brand-50/40 focus:outline-none"
      />
    </label>
  );
}

// Select field yang senada dengan Field. options = [{value,label}].
export function SelectField({
  label,
  name,
  defaultValue,
  options,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  options: readonly { value: string; label: string }[];
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-zinc-500">{label}</span>
      <div className="relative mt-1.5">
        <select
          name={name}
          defaultValue={defaultValue}
          className="w-full appearance-none rounded-2xl border border-black/10 bg-white p-3.5 pr-11 text-sm text-ink transition-colors focus:border-brand-400 focus:bg-brand-50/40 focus:outline-none"
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <IconChevron
          className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 rotate-90 text-zinc-500"
        />
      </div>
    </label>
  );
}

export function SubmitRow({
  loading,
  onCancel,
  submitLabel = "Simpan",
  tone = "brand",
}: {
  loading?: boolean;
  onCancel: () => void;
  submitLabel?: string;
  tone?: "brand" | "rose";
}) {
  const submitClass =
    tone === "rose" ? "bg-rose-accent hover:brightness-95" : "bg-brand-500 hover:bg-brand-600";
  return (
    <div className="mt-6 flex items-center justify-end gap-3">
      <button
        type="button"
        onClick={onCancel}
        className="rounded-full px-4 py-2.5 text-sm font-semibold text-zinc-500 transition-colors hover:text-ink"
      >
        Batal
      </button>
      <button
        type="submit"
        disabled={loading}
        className={`rounded-full px-6 py-2.5 text-sm font-semibold text-white shadow-soft transition-[transform,background-color,filter] duration-300 active:scale-[0.98] disabled:opacity-60 ${submitClass}`}
      >
        {loading ? "Memproses..." : submitLabel}
      </button>
    </div>
  );
}
