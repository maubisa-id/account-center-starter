"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { IconCheck, IconInfo, IconWarn, IconClose } from "@/components/icons";

type ToastTone = "success" | "error" | "info";
type ToastOptions = { actionLabel?: string; onAction?: () => void; duration?: number };
type Toast = {
  id: number;
  tone: ToastTone;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
};

const ToastCtx = createContext<{
  show: (message: string, tone?: ToastTone, options?: ToastOptions) => void;
} | null>(null);

export function useToast() {
  const ctx = useContext(ToastCtx);
  if (!ctx) throw new Error("useToast harus dipakai di dalam <ToastProvider>");
  return ctx;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const show = useCallback((message: string, tone: ToastTone = "success", options?: ToastOptions) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, tone, message, actionLabel: options?.actionLabel, onAction: options?.onAction }]);
    // Toast dengan aksi (mis. "Urungkan") diberi waktu lebih lama supaya sempat diklik.
    const ttl = options?.duration ?? (options?.actionLabel ? 7000 : 4000);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), ttl);
  }, []);

  const dismiss = (id: number) => setToasts((t) => t.filter((x) => x.id !== id));

  return (
    <ToastCtx.Provider value={{ show }}>
      {children}
      <div className="pointer-events-none fixed bottom-5 right-5 z-[200] flex w-full max-w-sm flex-col gap-2.5">
        {toasts.map((t) => {
          const tone =
            t.tone === "error"
              ? "border-rose-200 bg-white text-rose-700"
              : t.tone === "info"
                ? "border-brand-200 bg-white text-brand-700"
                : "border-lime-200 bg-white text-lime-700";
          const ToneIcon = t.tone === "error" ? IconWarn : t.tone === "info" ? IconInfo : IconCheck;
          return (
            <div
              key={t.id}
              role={t.tone === "error" ? "alert" : "status"}
              className={`animate-rise pointer-events-auto flex items-start gap-3 rounded-2xl border ${tone} p-4 shadow-lift ring-1 ring-black/[0.03]`}
            >
              <span
                className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
                  t.tone === "error" ? "bg-rose-100" : t.tone === "info" ? "bg-brand-100" : "bg-lime-100"
                }`}
              >
                <ToneIcon className="h-3.5 w-3.5" />
              </span>
              <p className="flex-1 text-sm font-medium leading-snug text-ink">{t.message}</p>
              {t.actionLabel && t.onAction ? (
                <button
                  type="button"
                  onClick={() => {
                    t.onAction?.();
                    dismiss(t.id);
                  }}
                  className="shrink-0 rounded-lg px-2.5 py-1 text-xs font-bold text-brand-600 transition-colors hover:bg-brand-50"
                >
                  {t.actionLabel}
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => dismiss(t.id)}
                aria-label="Tutup"
                className="shrink-0 text-zinc-400 transition-colors hover:text-ink"
              >
                <IconClose className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastCtx.Provider>
  );
}
