"use client";

import { useId, useState, useRef } from "react";
import Link from "next/link";
import type { InputHTMLAttributes, ReactNode } from "react";
import { Eye, EyeOff, CircleAlert, User } from "lucide-react";
import { LOGO_URL, BRAND } from "@/lib/brand";

export interface Testimonial {
  name: string;
  handle: string;
  text: string;
}

// Posisi acak-terkontrol untuk kartu testimoni (scatter + rotate + stagger).
const SCATTER: { pos: string; rot: number; delay: string; hide?: string }[] = [
  { pos: "bottom-6 left-6", rot: -4, delay: "animate-delay-900" },
  { pos: "top-10 right-6", rot: 5, delay: "animate-delay-1200", hide: "hidden xl:block" },
  { pos: "bottom-28 right-16", rot: -2, delay: "animate-delay-1400", hide: "hidden 2xl:block" },
];

export function BrandWordmark() {
  return (
    <Link href="/" className="inline-flex items-center" aria-label={BRAND.name}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={LOGO_URL} alt={BRAND.name} width={150} height={40} className="h-9 w-auto" />
    </Link>
  );
}

export function GoogleIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-2.641-.21-5.236-.611-7.743z" />
      <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z" />
      <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z" />
      <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303c-.792 2.237-2.231 4.166-4.087 5.571l6.19 5.238C42.022 35.026 44 30.038 44 24c0-2.641-.21-5.236-.611-7.743z" />
    </svg>
  );
}

function GlassInputWrapper({ children, invalid }: { children: ReactNode; invalid?: boolean }) {
  return (
    <div
      className={`mt-1.5 rounded-2xl border backdrop-blur-sm transition-colors ${
        invalid
          ? "border-rose-accent/50 bg-rose-50/60 focus-within:border-rose-accent"
          : "border-black/10 bg-white/70 focus-within:border-brand-400 focus-within:bg-brand-50/60"
      }`}
    >
      {children}
    </div>
  );
}

// Pesan galat per-field: ikon + teks, warna aksen rose, diumumkan ke screen reader.
export function FieldError({ id, message }: { id?: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="mt-1.5 flex items-start gap-1.5 text-xs font-medium text-rose-accent">
      <CircleAlert className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <span>{message}</span>
    </p>
  );
}

// Banner galat tingkat-form: muncul saat masuk/daftar gagal. role=alert + aria-live supaya
// pembaca layar mengumumkannya; nada tenang tapi jelas (sebut masalah + cara pulih).
export function FormError({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <div
      role="alert"
      aria-live="assertive"
      className="animate-rise flex items-start gap-2.5 rounded-2xl border border-rose-accent/25 bg-rose-50 px-4 py-3 text-sm text-rose-700"
    >
      <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-rose-accent" aria-hidden="true" />
      <span className="leading-snug">{message}</span>
    </div>
  );
}

type FieldProps = InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string };

export function TextField({ label, error, id, ...props }: FieldProps) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  const errId = `${fieldId}-error`;
  return (
    <div>
      <label htmlFor={fieldId} className="text-sm font-medium text-zinc-500">
        {label}
      </label>
      <GlassInputWrapper invalid={Boolean(error)}>
        <input
          {...props}
          id={fieldId}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errId : undefined}
          className="w-full bg-transparent p-4 text-sm text-ink placeholder:text-zinc-400 focus:outline-none"
        />
      </GlassInputWrapper>
      <FieldError id={errId} message={error} />
    </div>
  );
}

export function PasswordField({ label, error, id, ...props }: FieldProps) {
  const [show, setShow] = useState(false);
  const [caps, setCaps] = useState(false);
  const autoId = useId();
  const fieldId = id ?? autoId;
  const errId = `${fieldId}-error`;
  return (
    <div>
      <label htmlFor={fieldId} className="text-sm font-medium text-zinc-500">
        {label}
      </label>
      <GlassInputWrapper invalid={Boolean(error)}>
        <div className="relative">
          <input
            {...props}
            id={fieldId}
            type={show ? "text" : "password"}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errId : undefined}
            onKeyUp={(e) => setCaps(e.getModifierState("CapsLock"))}
            onBlur={(e) => {
              setCaps(false);
              props.onBlur?.(e);
            }}
            className="w-full bg-transparent p-4 pr-12 text-sm text-ink placeholder:text-zinc-400 focus:outline-none"
          />
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            aria-label={show ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
            className="absolute inset-y-0 right-3 flex items-center text-zinc-400 transition-colors hover:text-ink"
          >
            {show ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
          </button>
        </div>
      </GlassInputWrapper>
      {caps ? (
        <p className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-amber-600">
          <CircleAlert className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>Caps Lock sedang aktif.</span>
        </p>
      ) : null}
      <FieldError id={errId} message={error} />
    </div>
  );
}

export function GoogleButton({ children, onClick }: { children: ReactNode; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center justify-center gap-3 rounded-2xl border border-black/10 bg-white py-4 text-sm font-medium text-ink transition-colors hover:bg-zinc-50"
    >
      <GoogleIcon />
      {children}
    </button>
  );
}

export function PrimaryButton({ children, disabled }: { children: ReactNode; disabled?: boolean }) {
  return (
    <button
      type="submit"
      disabled={disabled}
      className="w-full rounded-2xl bg-brand-500 py-4 text-sm font-semibold text-white shadow-soft transition-[transform,background-color] duration-300 hover:bg-brand-600 active:scale-[0.99] disabled:opacity-60"
    >
      {children}
    </button>
  );
}

// Input OTP 6 kotak: auto-advance, backspace mundur, dukung paste kode penuh.
export function OtpInput({
  value,
  onChange,
  length = 6,
}: {
  value: string;
  onChange: (v: string) => void;
  length?: number;
}) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  function setChar(i: number, ch: string) {
    const digit = ch.replace(/\D/g, "").slice(-1);
    const arr = value.padEnd(length, " ").split("");
    arr[i] = digit || " ";
    const next = arr.join("").replace(/ /g, "").slice(0, length);
    onChange(next);
    if (digit && i < length - 1) refs.current[i + 1]?.focus();
  }

  function onKeyDown(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !value[i] && i > 0) refs.current[i - 1]?.focus();
  }

  function onPaste(e: React.ClipboardEvent) {
    e.preventDefault();
    const digits = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, length);
    if (digits) {
      onChange(digits);
      refs.current[Math.min(digits.length, length - 1)]?.focus();
    }
  }

  return (
    <div className="flex justify-between gap-2 sm:gap-3" onPaste={onPaste}>
      {Array.from({ length }).map((_, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          value={value[i] ?? ""}
          onChange={(e) => setChar(i, e.target.value)}
          onKeyDown={(e) => onKeyDown(i, e)}
          inputMode="numeric"
          autoComplete={i === 0 ? "one-time-code" : "off"}
          maxLength={1}
          aria-label={`Digit ${i + 1}`}
          className="h-14 w-full rounded-2xl border border-black/10 bg-white/70 text-center text-lg font-semibold text-ink shadow-soft backdrop-blur-sm transition-colors focus:border-brand-400 focus:bg-brand-50/60 focus:outline-none"
        />
      ))}
    </div>
  );
}

export function Divider({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex items-center justify-center">
      <span className="w-full border-t border-black/10" />
      <span className="absolute bg-[#faf8f5] px-4 text-sm text-zinc-400">{children}</span>
    </div>
  );
}

function TestimonialCard({ testimonial, className = "" }: { testimonial: Testimonial; className?: string }) {
  return (
    <div
      className={`flex w-64 items-start gap-3 rounded-3xl border border-white/15 bg-gradient-to-br from-brand-500 to-brand-700 p-5 text-white shadow-brand ring-1 ring-inset ring-white/10 ${className}`}
    >
      {/* Ikon orang standar (bukan foto) — tak ada gambar yang perlu di-load, ringan & privat. */}
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-inset ring-white/25">
        <User className="h-5 w-5" aria-hidden="true" />
      </span>
      <div className="text-sm leading-snug">
        <p className="font-semibold text-white">{testimonial.name}</p>
        <p className="text-white/70">{testimonial.handle}</p>
        <p className="mt-1 text-white/90">{testimonial.text}</p>
      </div>
    </div>
  );
}

export function AuthShell({
  title,
  description,
  heroImageSrc,
  testimonials = [],
  children,
}: {
  title: ReactNode;
  description: ReactNode;
  heroImageSrc?: string;
  testimonials?: Testimonial[];
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-[100dvh] w-full flex-col md:flex-row">
      <section className="flex flex-1 items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-md">
          <div className="mb-8">
            <BrandWordmark />
          </div>
          <div className="flex flex-col gap-6">
            <div className="space-y-3">
              <h1 className="animate-element animate-delay-100 text-fluid-hero font-bold tracking-tight text-ink">
                {title}
              </h1>
              <p className="animate-element animate-delay-200 text-sm leading-relaxed text-zinc-500">
                {description}
              </p>
            </div>
            {children}
          </div>
        </div>
      </section>

      {heroImageSrc ? (
        <section className="relative hidden flex-1 p-4 md:block">
          <div
            className="animate-slide-right animate-delay-300 absolute inset-4 rounded-3xl bg-brand-100 bg-cover bg-center shadow-lift"
            style={{ backgroundImage: `url(${heroImageSrc})` }}
          />
          <div className="animate-slide-right animate-delay-300 pointer-events-none absolute inset-4 rounded-3xl bg-gradient-to-t from-brand-900/60 via-brand-900/15 to-transparent" />
          {testimonials.length > 0 ? (
            <div className="absolute inset-4">
              {testimonials.slice(0, SCATTER.length).map((t, i) => (
                <div
                  key={t.name + i}
                  className={`animate-testimonial absolute ${SCATTER[i].pos} ${SCATTER[i].delay} ${SCATTER[i].hide ?? ""}`}
                  style={{ transform: `rotate(${SCATTER[i].rot}deg)` }}
                >
                  <TestimonialCard testimonial={t} />
                </div>
              ))}
            </div>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
