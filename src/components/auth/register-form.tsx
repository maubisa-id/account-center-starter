"use client";

import { useState } from "react";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";
import {
  AuthShell,
  TextField,
  PasswordField,
  GoogleButton,
  PrimaryButton,
  OtpInput,
  FormError,
  Divider,
} from "./auth-ui";
import { Turnstile, captchaEnabled } from "./turnstile";
import { Modal } from "@/components/dashboard/modal";
import { VerifyStatusCard } from "./verify-status";
import { PasswordStrength } from "./password-strength";
import { scorePassword } from "@/lib/password";
import { suggestEmail } from "@/lib/email-hint";
import { pickTestimonials } from "@/lib/testimonials";

const HERO =
  "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=1600&q=80";

const TESTIMONIALS = pickTestimonials(21);
const GOOGLE_ENABLED = process.env.NEXT_PUBLIC_GOOGLE_ENABLED === "true";
const DEMO = process.env.NEXT_PUBLIC_DEMO_MODE === "1";

export function RegisterForm() {
  const [step, setStep] = useState<"form" | "otp">("form");
  const [email, setEmail] = useState("");
  const [nameInput, setNameInput] = useState("");
  const [emailInput, setEmailInput] = useState("");
  const [pw, setPw] = useState("");
  const [otp, setOtp] = useState("");
  const [verified, setVerified] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [errors, setErrors] = useState<{ name?: string; email?: string; password?: string; confirm?: string }>({});
  const [loading, setLoading] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [captchaReset, setCaptchaReset] = useState(0);

  async function onRegister(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const name = String(form.get("name") ?? "");
    const mail = String(form.get("email") ?? "");
    const password = String(form.get("password") ?? "");
    const confirm = String(form.get("confirm") ?? "");

    // Validasi per-field: sebut MASALAH-nya tepat di field terkait, bukan satu pesan samar.
    const next: { name?: string; email?: string; password?: string; confirm?: string } = {};
    if (!name.trim()) next.name = "Nama tidak boleh kosong.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail)) next.email = "Format email belum benar. Contoh: nama@email.com.";
    const pwCheck = scorePassword(password, [name, mail.split("@")[0] ?? ""]);
    if (!pwCheck.ok) next.password = pwCheck.hint ?? "Kata sandi belum cukup kuat.";
    if (confirm !== password) next.confirm = "Konfirmasi tidak sama dengan kata sandi di atas.";
    setErrors(next);
    setMsg(null);
    if (Object.keys(next).length > 0) return;

    if (captchaEnabled && !captchaToken) {
      setMsg("Selesaikan verifikasi keamanan dulu sebelum lanjut.");
      return;
    }
    setLoading(true);
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
      const m = (error.message ?? "").toLowerCase();
      if (m.includes("exist") || m.includes("already") || m.includes("terdaftar")) {
        setErrors({ email: "Email ini sudah terdaftar. Coba masuk, atau pakai email lain." });
      } else {
        setMsg("Gagal membuat akun. Coba lagi sebentar, atau hubungi kami kalau masih gagal.");
      }
      return;
    }
    // Kirim OTP verifikasi email lalu pindah ke langkah kode. Bungkus try/finally supaya
    // kegagalan jaringan TIDAK meninggalkan tombol "loading" selamanya. Akun sudah dibuat
    // (autoSignIn), jadi tetap pindah ke langkah OTP; bila kode gagal terkirim, tawarkan
    // "Kirim ulang kode".
    try {
      const sent = await authClient.emailOtp.sendVerificationOtp({ email: mail, type: "email-verification" });
      setEmail(mail);
      setOtp("");
      setStep("otp");
      if (sent?.error) setMsg("Akun dibuat, tapi kode verifikasi gagal terkirim. Tekan \u201cKirim ulang kode\u201d.");
    } catch {
      setEmail(mail);
      setOtp("");
      setStep("otp");
      setMsg("Akun dibuat, tapi kode gagal terkirim (masalah jaringan). Tekan \u201cKirim ulang kode\u201d.");
    } finally {
      setLoading(false);
    }
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
    if (error) {
      setLoading(false);
      setMsg(error.message ?? "Kode salah atau kedaluwarsa.");
      return;
    }
    // Sukses: tampilkan status berhasil (centang) lalu navigasi KERAS ke dashboard. Hard-nav
    // (bukan router.push) supaya cookie sesi dari autoSignIn terbawa ke render server pertama
    // dan tidak memantul balik ke /masuk.
    setLoading(false);
    setVerified(true);
    setTimeout(() => {
      window.location.href = "/api/after-login";
    }, 1100);
  }

  async function resend() {
    setMsg(null);
    await authClient.emailOtp.sendVerificationOtp({ email, type: "email-verification" });
    setMsg("Kode baru sudah dikirim.");
  }

  const emailHint = suggestEmail(emailInput);

  return (
    <AuthShell
      title="Buat akun"
      description="Daftar untuk mulai memakai layanan Maubisa dalam satu akun."
      heroImageSrc={HERO}
      testimonials={TESTIMONIALS}
    >
      <form className="space-y-5" onSubmit={onRegister}>
        <div className="animate-element animate-delay-300">
          <TextField
            label="Nama lengkap"
            name="name"
            type="text"
            placeholder="Nama kamu"
            autoComplete="name"
            required
            error={errors.name}
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
          />
        </div>
        <div className="animate-element animate-delay-400">
          <TextField
            label="Alamat email"
            name="email"
            type="email"
            placeholder="nama@email.com"
            autoComplete="email"
            required
            error={errors.email}
            value={emailInput}
            onChange={(e) => setEmailInput(e.target.value)}
          />
          {emailHint ? (
            <button
              type="button"
              onClick={() => setEmailInput(emailHint)}
              className="mt-1.5 text-xs font-medium text-brand-600 transition-colors hover:text-brand-700 hover:underline"
            >
              Maksud kamu {emailHint}?
            </button>
          ) : null}
        </div>
        <div className="animate-element animate-delay-500">
          <PasswordField
            label="Kata sandi"
            name="password"
            placeholder="Buat kata sandi"
            autoComplete="new-password"
            required
            error={errors.password}
            value={pw}
            onChange={(e) => setPw(e.target.value)}
          />
          <PasswordStrength value={pw} terms={[nameInput, emailInput.split("@")[0] ?? ""]} />
        </div>
        <div className="animate-element animate-delay-600">
          <PasswordField label="Konfirmasi kata sandi" name="confirm" placeholder="Ulangi kata sandi" autoComplete="new-password" required error={errors.confirm} />
        </div>

        {captchaEnabled ? (
          <div className="animate-element animate-delay-600">
            <Turnstile onToken={setCaptchaToken} resetSignal={captchaReset} />
          </div>
        ) : null}

        <div className="animate-element animate-delay-700">
          <PrimaryButton disabled={loading}>{loading ? "Memproses..." : "Buat akun"}</PrimaryButton>
        </div>
        <p className="animate-element animate-delay-700 text-center text-xs leading-relaxed text-zinc-400">
          Dengan membuat akun, kamu setuju dengan{" "}
          <a
            href="https://maubisa.id/pusat-kepercayaan/hukum/syarat-ketentuan"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-zinc-500 underline underline-offset-2 transition-colors hover:text-ink"
          >
            Syarat &amp; Ketentuan
          </a>{" "}
          dan{" "}
          <a
            href="https://maubisa.id/pusat-kepercayaan/hukum/kebijakan-privasi"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-zinc-500 underline underline-offset-2 transition-colors hover:text-ink"
          >
            Kebijakan Privasi
          </a>
          .
        </p>
        <FormError message={msg} />
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

      {/* Verifikasi OTP sebagai MODAL: form daftar tetap terlihat di belakang (konteks terjaga),
          bukan pindah halaman. Kartu 3DS juga pakai pola modal yang sama. */}
      <Modal
        open={step === "otp"}
        onClose={() => {
          if (verified) return;
          setStep("form");
          setMsg(null);
        }}
        title="Verifikasi email"
        desc={`Kami kirim 6 digit kode ke ${email}. Masukkan untuk mengaktifkan akun.`}
      >
        {verified ? (
          <VerifyStatusCard
            state="success"
            title="Email terverifikasi!"
            desc={"Akun kamu aktif. Mengalihkan ke dashboard\u2026"}
          />
        ) : (
          <form className="space-y-5" onSubmit={onVerify}>
            {DEMO ? (
              <div className="rounded-xl bg-amber-50 px-3 py-2.5 text-center text-[13px] leading-snug text-amber-900 ring-1 ring-amber-200">
                Mode demo: kode verifikasi juga muncul di{" "}
                <a
                  href="/demo/kotak"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold underline underline-offset-2"
                >
                  Kotak Email Demo
                </a>{" "}
                — buka untuk menyalinnya.
              </div>
            ) : null}
            <OtpInput value={otp} onChange={setOtp} />
            <PrimaryButton disabled={loading}>{loading ? "Memverifikasi\u2026" : "Verifikasi & masuk"}</PrimaryButton>
            {msg ? <p className="text-center text-xs text-zinc-500">{msg}</p> : null}
            <div className="flex items-center justify-between text-sm">
              <button
                type="button"
                onClick={() => {
                  setStep("form");
                  setMsg(null);
                }}
                className="font-medium text-zinc-500 transition-colors hover:text-ink"
              >
                &larr; Ubah data
              </button>
              <button
                type="button"
                onClick={resend}
                className="font-medium text-brand-600 transition-colors hover:text-brand-700 hover:underline"
              >
                Kirim ulang kode
              </button>
            </div>
          </form>
        )}
      </Modal>
    </AuthShell>
  );
}
