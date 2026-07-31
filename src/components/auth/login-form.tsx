"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import {
  AuthShell,
  TextField,
  PasswordField,
  GoogleButton,
  PrimaryButton,
  Divider,
} from "./auth-ui";
import { Turnstile, captchaEnabled } from "./turnstile";
import { safeInternalPath } from "@/lib/safe-redirect";
import { pickTestimonials } from "@/lib/testimonials";

const HERO =
  "https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=1600&q=80";

const TESTIMONIALS = pickTestimonials(7);
const GOOGLE_ENABLED = process.env.NEXT_PUBLIC_GOOGLE_ENABLED === "true";

export function LoginForm() {
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [captchaReset, setCaptchaReset] = useState(0);
  const router = useRouter();

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const email = String(fd.get("email") ?? "");
    const password = String(fd.get("password") ?? "");
    if (captchaEnabled && !captchaToken) {
      setMsg("Selesaikan verifikasi keamanan dulu.");
      return;
    }
    setLoading(true);
    setMsg(null);
    const { data, error } = await authClient.signIn.email({
      email,
      password,
      ...(captchaToken
        ? { fetchOptions: { headers: { "x-captcha-response": captchaToken } } }
        : {}),
    });
    setLoading(false);
    if (error) {
      // Token Turnstile sekali-pakai — minta yang baru untuk percobaan berikutnya.
      if (captchaEnabled) setCaptchaReset((n) => n + 1);
      setMsg(error.message ?? "Email atau kata sandi salah.");
      return;
    }
    if (data && "twoFactorRedirect" in data && (data as { twoFactorRedirect?: boolean }).twoFactorRedirect) {
      router.push("/2fa");
      return;
    }
    const redirectTo =
      typeof window !== "undefined"
        ? new URLSearchParams(window.location.search).get("redirect")
        : null;
    // Anti open-redirect: hanya izinkan path internal.
    router.push(safeInternalPath(redirectTo, "/"));
    router.refresh();
  }

  return (
    <AuthShell
      title="Selamat datang"
      description="Masuk ke akun Acme untuk kelola langganan, akses, dan riwayat pembayaran."
      heroImageSrc={HERO}
      testimonials={TESTIMONIALS}
    >
      <form className="space-y-5" onSubmit={onSubmit}>
        <div className="animate-element animate-delay-300">
          <TextField label="Alamat email" name="email" type="email" placeholder="nama@email.com" autoComplete="email" required />
        </div>
        <div className="animate-element animate-delay-400">
          <PasswordField label="Kata sandi" name="password" placeholder="Masukkan kata sandi" autoComplete="current-password" required />
        </div>

        <div className="animate-element animate-delay-500 flex items-center justify-between text-sm">
          <label className="flex cursor-pointer items-center gap-2.5">
            <input type="checkbox" name="rememberMe" className="h-4 w-4 rounded accent-brand-500" />
            <span className="text-ink/90">Tetap masuk</span>
          </label>
          <Link href="/lupa-password" className="font-medium text-brand-600 transition-colors hover:text-brand-700 hover:underline">
            Lupa kata sandi
          </Link>
        </div>

        {captchaEnabled ? (
          <div className="animate-element animate-delay-500">
            <Turnstile onToken={setCaptchaToken} resetSignal={captchaReset} />
          </div>
        ) : null}

        <div className="animate-element animate-delay-600">
          <PrimaryButton disabled={loading}>{loading ? "Memproses..." : "Masuk"}</PrimaryButton>
        </div>
        {msg ? <p className="text-center text-xs text-zinc-500">{msg}</p> : null}
      </form>

      <div className="animate-element animate-delay-700">
        {GOOGLE_ENABLED ? (
          <>
            <Divider>Atau lanjut dengan</Divider>
            <div className="mt-5">
              <GoogleButton onClick={() => authClient.signIn.social({ provider: "google", callbackURL: "/" })}>
                Lanjut dengan Google
              </GoogleButton>
            </div>
          </>
        ) : null}
      </div>

      <p className="animate-element animate-delay-900 text-center text-sm text-zinc-500">
        Belum punya akun?{" "}
        <Link href="/daftar" className="font-medium text-brand-600 transition-colors hover:text-brand-700 hover:underline">
          Buat akun
        </Link>
      </p>
    </AuthShell>
  );
}
