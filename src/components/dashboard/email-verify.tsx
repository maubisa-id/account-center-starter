"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { useToast } from "@/components/toast";
import { IconCheck } from "@/components/icons";

// Tampil di halaman Profil bila email belum terverifikasi. Kirim OTP -> input kode -> verifikasi.
export function EmailVerify({ email, verified }: { email: string; verified: boolean }) {
  const [step, setStep] = useState<"idle" | "code">("idle");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const router = useRouter();
  const toast = useToast();

  if (verified) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-lime-600">
        <IconCheck className="h-3.5 w-3.5" /> Terverifikasi
      </span>
    );
  }

  async function sendCode() {
    setLoading(true);
    setMsg(null);
    const { error } = await authClient.emailOtp.sendVerificationOtp({ email, type: "email-verification" });
    setLoading(false);
    if (error) {
      setMsg(error.message ?? "Gagal mengirim kode.");
      return;
    }
    setStep("code");
    toast.show("Kode verifikasi dikirim ke email kamu.", "info");
  }

  async function verify() {
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
    toast.show("Email berhasil diverifikasi.");
    router.refresh();
  }

  if (step === "code") {
    return (
      <div className="mt-1 flex flex-wrap items-center gap-2">
        <input
          value={otp}
          onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
          inputMode="numeric"
          placeholder="Kode 6 digit"
          aria-label="Kode verifikasi"
          className="w-32 rounded-lg border border-black/10 bg-white px-3 py-1.5 text-sm text-ink placeholder:text-zinc-400 focus:border-brand-400 focus:outline-none"
        />
        <button
          type="button"
          onClick={verify}
          disabled={loading}
          className="rounded-full bg-brand-500 px-4 py-1.5 text-xs font-semibold text-white hover:bg-brand-600 disabled:opacity-60"
        >
          {loading ? "..." : "Verifikasi"}
        </button>
        <button type="button" onClick={sendCode} disabled={loading} className="text-xs font-medium text-zinc-500 hover:text-ink">
          Kirim ulang
        </button>
        {msg ? <span className="w-full text-xs text-rose-600">{msg}</span> : null}
      </div>
    );
  }

  return (
    <div className="mt-1 flex items-center gap-2">
      <span className="text-xs text-amber-600">Belum terverifikasi</span>
      <button
        type="button"
        onClick={sendCode}
        disabled={loading}
        className="rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700 ring-1 ring-inset ring-brand-600/20 transition-colors hover:bg-brand-100 disabled:opacity-60"
      >
        {loading ? "Mengirim..." : "Verifikasi sekarang"}
      </button>
      {msg ? <span className="text-xs text-rose-600">{msg}</span> : null}
    </div>
  );
}
