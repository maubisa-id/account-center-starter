"use client";

import { useState } from "react";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";
import { BrandWordmark, TextField, PasswordField, PrimaryButton, OtpInput } from "./auth-ui";

function Shell({ title, desc, children }: { title: string; desc: string; children: React.ReactNode }) {
  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <BrandWordmark />
        </div>
        <div className="rounded-3xl border border-black/[0.06] bg-white/80 p-6 shadow-soft backdrop-blur sm:p-8">
          <h1 className="text-2xl font-bold tracking-tight text-ink">{title}</h1>
          <p className="mt-1.5 text-sm leading-relaxed text-zinc-500">{desc}</p>
          <div className="mt-6">{children}</div>
        </div>
      </div>
    </div>
  );
}

export function ForgotPasswordForm() {
  const [step, setStep] = useState<"email" | "reset">("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function sendCode(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const mail = String(new FormData(e.currentTarget).get("email") ?? "");
    setLoading(true);
    setMsg(null);
    // Kirim OTP reset kata sandi (type: forget-password) ke email.
    const { error } = await authClient.forgetPassword.emailOtp({ email: mail });
    setLoading(false);
    if (error) {
      setMsg(error.message ?? "Gagal mengirim kode.");
      return;
    }
    setEmail(mail);
    setOtp("");
    setStep("reset");
  }

  async function resetWithOtp(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const password = String(fd.get("password") ?? "");
    if (otp.length < 6) {
      setMsg("Masukkan 6 digit kode.");
      return;
    }
    if (password !== fd.get("confirm")) {
      setMsg("Konfirmasi kata sandi tidak cocok.");
      return;
    }
    if (password.length < 8) {
      setMsg("Kata sandi minimal 8 karakter.");
      return;
    }
    setLoading(true);
    setMsg(null);
    const { error } = await authClient.emailOtp.resetPassword({ email, otp, password });
    setLoading(false);
    if (error) {
      setMsg(error.message ?? "Kode salah atau kedaluwarsa.");
      return;
    }
    setDone(true);
  }

  async function resend() {
    setMsg(null);
    await authClient.forgetPassword.emailOtp({ email });
    setMsg("Kode baru sudah dikirim.");
  }

  if (done) {
    return (
      <Shell title="Kata sandi diperbarui" desc="Kamu bisa masuk dengan kata sandi baru sekarang.">
        <Link
          href="/masuk"
          className="block rounded-2xl bg-brand-500 py-3.5 text-center text-sm font-semibold text-white hover:bg-brand-600"
        >
          Masuk sekarang
        </Link>
      </Shell>
    );
  }

  if (step === "reset") {
    return (
      <Shell title="Masukkan kode" desc={`Kami kirim 6 digit kode ke ${email}. Masukkan kode lalu buat kata sandi baru.`}>
        <form onSubmit={resetWithOtp} className="space-y-5">
          <OtpInput value={otp} onChange={setOtp} />
          <PasswordField label="Kata sandi baru" name="password" placeholder="Buat kata sandi" required autoComplete="new-password" />
          <PasswordField label="Konfirmasi kata sandi" name="confirm" placeholder="Ulangi kata sandi" required autoComplete="new-password" />
          {msg ? <p className="text-sm text-rose-600">{msg}</p> : null}
          <PrimaryButton disabled={loading}>{loading ? "Menyimpan..." : "Atur ulang kata sandi"}</PrimaryButton>
          <div className="flex items-center justify-between text-sm">
            <button type="button" onClick={() => setStep("email")} className="font-medium text-zinc-500 hover:text-ink">
              &larr; Ganti email
            </button>
            <button type="button" onClick={resend} className="font-medium text-brand-600 hover:text-brand-700 hover:underline">
              Kirim ulang kode
            </button>
          </div>
        </form>
      </Shell>
    );
  }

  return (
    <Shell title="Lupa kata sandi" desc="Masukkan email kamu, kami kirim kode OTP untuk atur ulang kata sandi.">
      <form onSubmit={sendCode} className="space-y-5">
        <TextField label="Alamat email" name="email" type="email" placeholder="nama@email.com" required autoComplete="email" />
        {msg ? <p className="text-sm text-rose-600">{msg}</p> : null}
        <PrimaryButton disabled={loading}>{loading ? "Mengirim..." : "Kirim kode"}</PrimaryButton>
        <Link href="/masuk" className="block text-center text-sm font-medium text-zinc-500 hover:text-ink">
          Kembali ke masuk
        </Link>
      </form>
    </Shell>
  );
}

export function ResetPasswordForm({ token }: { token: string | null }) {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const newPassword = String(fd.get("password") ?? "");
    if (newPassword !== fd.get("confirm")) {
      setMsg("Konfirmasi kata sandi tidak cocok.");
      return;
    }
    if (newPassword.length < 8) {
      setMsg("Kata sandi minimal 8 karakter.");
      return;
    }
    if (!token) {
      setMsg("Token tidak valid. Minta tautan baru.");
      return;
    }
    setLoading(true);
    setMsg(null);
    const { error } = await authClient.resetPassword({ newPassword, token });
    setLoading(false);
    if (error) {
      setMsg(error.message ?? "Gagal mengatur ulang kata sandi.");
      return;
    }
    setDone(true);
  }

  return (
    <Shell title="Atur ulang kata sandi" desc="Buat kata sandi baru untuk akunmu.">
      {done ? (
        <div className="space-y-4">
          <div className="rounded-2xl bg-lime-50 p-4 text-sm text-lime-800 ring-1 ring-inset ring-lime-600/20">
            Kata sandi berhasil diatur ulang.
          </div>
          <Link
            href="/masuk"
            className="block rounded-2xl bg-brand-500 py-3.5 text-center text-sm font-semibold text-white hover:bg-brand-600"
          >
            Masuk sekarang
          </Link>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-5">
          <PasswordField label="Kata sandi baru" name="password" placeholder="Buat kata sandi" required autoComplete="new-password" />
          <PasswordField label="Konfirmasi kata sandi" name="confirm" placeholder="Ulangi kata sandi" required autoComplete="new-password" />
          {msg ? <p className="text-sm text-rose-600">{msg}</p> : null}
          <PrimaryButton disabled={loading}>{loading ? "Menyimpan..." : "Atur ulang"}</PrimaryButton>
        </form>
      )}
    </Shell>
  );
}

export function TwoFactorChallengeForm() {
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const code = String(new FormData(e.currentTarget).get("code") ?? "");
    setLoading(true);
    setMsg(null);
    const { error } = await authClient.twoFactor.verifyTotp({ code });
    setLoading(false);
    if (error) {
      setMsg(error.message ?? "Kode salah.");
      return;
    }
    window.location.href = "/";
  }

  return (
    <Shell title="Verifikasi dua faktor" desc="Masukkan kode dari aplikasi autentikator kamu.">
      <form onSubmit={onSubmit} className="space-y-5">
        <TextField label="Kode 6 digit" name="code" placeholder="123456" required inputMode="numeric" />
        {msg ? <p className="text-sm text-rose-600">{msg}</p> : null}
        <PrimaryButton disabled={loading}>{loading ? "Memverifikasi..." : "Verifikasi"}</PrimaryButton>
        <Link href="/masuk" className="block text-center text-sm font-medium text-zinc-500 hover:text-ink">
          Kembali ke masuk
        </Link>
      </form>
    </Shell>
  );
}
