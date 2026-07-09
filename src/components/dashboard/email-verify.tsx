"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { Modal } from "./modal";
import { OtpInput } from "@/components/auth/auth-ui";
import { VerifyStatusCard } from "@/components/auth/verify-status";
import { IconCheck } from "@/components/icons";

const DEMO = process.env.NEXT_PUBLIC_DEMO_MODE === "1";

// Verifikasi email di halaman Profil. Bila belum terverifikasi: tombol membuka MODAL bergaya
// sama dengan hasil pembayaran (finish-status) — kirim OTP -> input 6 digit -> spinner
// "memverifikasi" -> centang sukses -> tutup + toast + refresh (badge jadi "Terverifikasi").
export function EmailVerify({ email, verified }: { email: string; verified: boolean }) {
  const [open, setOpen] = useState(false);
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  if (verified) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-lime-600">
        <IconCheck className="h-3.5 w-3.5" /> Terverifikasi
      </span>
    );
  }

  async function sendCode() {
    setSending(true);
    setMsg(null);
    try {
      const { error } = await authClient.emailOtp.sendVerificationOtp({ email, type: "email-verification" });
      if (error) setMsg(error.message ?? "Gagal mengirim kode.");
    } catch {
      setMsg("Gagal mengirim kode (masalah jaringan).");
    } finally {
      setSending(false);
    }
  }

  async function openModal() {
    setOtp("");
    setMsg(null);
    setDone(false);
    setLoading(false);
    setOpen(true);
    // Kirim kode otomatis begitu modal dibuka supaya pengguna langsung menerima OTP.
    await sendCode();
  }

  async function verify(e: React.FormEvent<HTMLFormElement>) {
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
    // Sukses: centang sebentar, lalu MUAT ULANG halaman (refresh browser sungguhan) supaya
    // status server terbaru terbaca — badge berubah jadi "Terverifikasi". Cocok dengan teks
    // "Menyegarkan halaman…". Pakai reload, bukan router.refresh(), agar pasti tersegarkan.
    setLoading(false);
    setDone(true);
    setTimeout(() => {
      window.location.reload();
    }, 1200);
  }

  return (
    <>
      <div className="mt-1 flex items-center gap-2">
        <span className="text-xs text-amber-600">Belum terverifikasi</span>
        <button
          type="button"
          onClick={openModal}
          className="rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700 ring-1 ring-inset ring-brand-600/20 transition-colors hover:bg-brand-100"
        >
          Verifikasi sekarang
        </button>
      </div>

      <Modal
        open={open}
        onClose={() => {
          if (done) return;
          setOpen(false);
        }}
        title="Verifikasi email"
        desc={`Kami kirim 6 digit kode ke ${email}. Masukkan untuk memverifikasi.`}
      >
        {done ? (
          <VerifyStatusCard state="success" title="Email terverifikasi!" desc={"Terima kasih. Menyegarkan halaman\u2026"} />
        ) : loading ? (
          <VerifyStatusCard state="verifying" title={"Memverifikasi\u2026"} desc="Sebentar ya, kami sedang memeriksa kodenya." />
        ) : (
          <form className="space-y-5" onSubmit={verify}>
            {DEMO ? (
              <div className="rounded-xl bg-amber-50 px-3 py-2.5 text-center text-[13px] leading-snug text-amber-900 ring-1 ring-amber-200">
                Mode demo: kode juga muncul di{" "}
                <a
                  href="/demo/kotak"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold underline underline-offset-2"
                >
                  Kotak Email Demo
                </a>
                .
              </div>
            ) : null}
            <OtpInput value={otp} onChange={setOtp} />
            <button
              type="submit"
              disabled={sending}
              className="w-full rounded-2xl bg-brand-500 py-3.5 text-sm font-semibold text-white shadow-soft transition-[transform,background-color] duration-300 hover:bg-brand-600 active:scale-[0.99] disabled:opacity-60"
            >
              Verifikasi
            </button>
            {msg ? <p className="text-center text-xs text-rose-600">{msg}</p> : null}
            <div className="flex items-center justify-center text-sm">
              <button
                type="button"
                onClick={sendCode}
                disabled={sending}
                className="font-medium text-brand-600 transition-colors hover:text-brand-700 hover:underline disabled:opacity-60"
              >
                {sending ? "Mengirim\u2026" : "Kirim ulang kode"}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </>
  );
}
