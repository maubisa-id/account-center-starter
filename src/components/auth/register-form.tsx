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
  OtpInput,
  Divider,
} from "./auth-ui";
import { Turnstile, captchaEnabled } from "./turnstile";
import { pickTestimonials } from "@/lib/testimonials";

const HERO =
  "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=1600&q=80";

const TESTIMONIALS = pickTestimonials(21);
const GOOGLE_ENABLED = process.env.NEXT_PUBLIC_GOOGLE_ENABLED === "true";

export function RegisterForm() {
  const [step, setStep] = useState<"form" | "otp">("form");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [captchaReset, setCaptchaReset] = useState(0);
  const router = useRouter();

  async function onRegister(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const name = String(form.get("name") ?? "");
    const mail = String(form.get("email") ?? "");
    const password = String(form.get("password") ?? "");
    if (password !== form.get("confirm")) {
      setMsg("Konfirmasi kata sandi tidak cocok.");
      return;
    }
    if (password.length < 8) {
      setMsg("Kata sandi minimal 8 karakter.");
      return;
    }
    if (captchaEnabled && !captchaToken) {
      setMsg("Selesaikan verifikasi keamanan dulu.");
      return;
    }
    setLoading(true);
    setMsg(null);
    const { error } = await authClient.signUp.email({
      name,
      email: mail,
      password,
      ...(captchaToken
        ? { fetchOptions: { headers: { "x-captcha-response": captchaToken } } }
        : {}),
    });
    if (error) {
      setLoading(false);
      if (captchaEnabled) setCaptchaReset((n) => n + 1);
      setMsg(error.message ?? "Gagal membuat akun.");
      return;
    }
    // Kirim OTP verifikasi email lalu pindah ke langkah kode.
    await authClient.emailOtp.sendVerificationOtp({ email: mail, type: "email-verification" });
    setLoading(false);
    setEmail(mail);
    setOtp("");
    setStep("otp");
  }

  async function onVerify(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (otp.length < 6) {
      setMsg("Masukkan 6 digit kode.");
      return;
    }
    setLoading(true);
    setMsg(null);
    const { error } = await authClient.emailOtp.verifyEmail({ email, otp });
    setLoading(false);
    if (error) {
      setMsg(error.message ?? "Kode salah atau kedaluwarsa.");
      return;
    }
    router.push("/");
    router.refresh();
  }

  async function resend() {
    setMsg(null);
    await authClient.emailOtp.sendVerificationOtp({ email, type: "email-verification" });
    setMsg("Kode baru sudah dikirim.");
  }

  if (step === "otp") {
    return (
      <AuthShell
        title="Verifikasi email"
        description={`Kami kirim 6 digit kode ke ${email}. Masukkan untuk mengaktifkan akun.`}
        heroImageSrc={HERO}
        testimonials={TESTIMONIALS}
      >
        <form className="space-y-6" onSubmit={onVerify}>
          <div className="animate-element animate-delay-300">
            <OtpInput value={otp} onChange={setOtp} />
          </div>
          <div className="animate-element animate-delay-400">
            <PrimaryButton disabled={loading}>{loading ? "Memverifikasi..." : "Verifikasi & masuk"}</PrimaryButton>
          </div>
          {msg ? <p className="text-center text-xs text-zinc-500">{msg}</p> : null}
          <div className="animate-element animate-delay-500 flex items-center justify-between text-sm">
            <button type="button" onClick={() => setStep("form")} className="font-medium text-zinc-500 hover:text-ink">
              &larr; Ubah data
            </button>
            <button type="button" onClick={resend} className="font-medium text-brand-600 hover:text-brand-700 hover:underline">
              Kirim ulang kode
            </button>
          </div>
        </form>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Buat akun"
      description="Daftar untuk mulai memakai layanan Maubisa dalam satu akun."
      heroImageSrc={HERO}
      testimonials={TESTIMONIALS}
    >
      <form className="space-y-5" onSubmit={onRegister}>
        <div className="animate-element animate-delay-300">
          <TextField label="Nama lengkap" name="name" type="text" placeholder="Nama kamu" autoComplete="name" required />
        </div>
        <div className="animate-element animate-delay-400">
          <TextField label="Alamat email" name="email" type="email" placeholder="nama@email.com" autoComplete="email" required />
        </div>
        <div className="animate-element animate-delay-500">
          <PasswordField label="Kata sandi" name="password" placeholder="Buat kata sandi" autoComplete="new-password" required />
        </div>
        <div className="animate-element animate-delay-600">
          <PasswordField label="Konfirmasi kata sandi" name="confirm" placeholder="Ulangi kata sandi" autoComplete="new-password" required />
        </div>

        {captchaEnabled ? (
          <div className="animate-element animate-delay-600">
            <Turnstile onToken={setCaptchaToken} resetSignal={captchaReset} />
          </div>
        ) : null}

        <div className="animate-element animate-delay-700">
          <PrimaryButton disabled={loading}>{loading ? "Memproses..." : "Buat akun"}</PrimaryButton>
        </div>
        {msg ? <p className="text-center text-xs text-zinc-500">{msg}</p> : null}
      </form>

      <div className="animate-element animate-delay-800">
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

      <p className="animate-element animate-delay-1000 text-center text-sm text-zinc-500">
        Sudah punya akun?{" "}
        <Link href="/masuk" className="font-medium text-brand-600 transition-colors hover:text-brand-700 hover:underline">
          Masuk
        </Link>
      </p>
    </AuthShell>
  );
}
