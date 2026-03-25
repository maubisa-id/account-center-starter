"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { requestEmailChange, confirmEmailChange } from "@/app/(app)/actions";
import { useToast } from "@/components/toast";
import { Modal, SubmitRow } from "@/components/dashboard/modal";
import { IconMail } from "@/components/icons";

// Ganti alamat email lewat MODAL, dengan verifikasi OTP ke email BARU (kode 6 digit).
// Setelah kode benar, email baru langsung terverifikasi. Email saat ini diambil server-side
// dari sesi (tak dikirim dari klien). Dua langkah: (1) isi email baru, (2) masukkan kode.
export function EmailChange() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"email" | "code">("email");
  const [newEmail, setNewEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const router = useRouter();
  const toast = useToast();

  const cleanEmail = newEmail.trim().toLowerCase();

  function close() {
    setOpen(false);
    setStep("email");
    setNewEmail("");
    setOtp("");
    setMsg(null);
    setLoading(false);
  }

  async function sendCode(e?: React.FormEvent) {
    e?.preventDefault();
    setLoading(true);
    setMsg(null);
    const res = await requestEmailChange(newEmail);
    setLoading(false);
    if (res.error) {
      setMsg(res.error);
      return;
    }
    setStep("code");
    setOtp("");
    toast.show(`Kode dikirim ke ${cleanEmail}.`, "info");
  }

  async function confirm(e?: React.FormEvent) {
    e?.preventDefault();
    if (otp.length < 6) {
      setMsg("Masukkan 6 digit kode.");
      return;
    }
    setLoading(true);
    setMsg(null);
    const res = await confirmEmailChange(otp);
    setLoading(false);
    if (res.error) {
      setMsg(res.error);
      return;
    }
    toast.show("Email berhasil diganti dan diverifikasi.");
    close();
    router.refresh();
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-full bg-white px-3.5 py-1.5 text-xs font-semibold text-brand-700 ring-1 ring-inset ring-brand-600/20 transition-colors hover:bg-brand-50"
      >
        <IconMail className="h-3.5 w-3.5" />
        Ganti email
      </button>

      <Modal
        open={open}
        onClose={close}
        title="Ganti alamat email"
        desc={
          step === "email"
            ? "Masukkan email baru. Kami kirim kode 6 digit untuk memastikan itu milikmu."
            : "Satu langkah lagi. Masukkan kode yang kami kirim ke email baru."
        }
      >
        {step === "email" ? (
          <form onSubmit={sendCode} className="space-y-4">
            <label className="block">
              <span className="text-sm font-medium text-zinc-500">Email baru</span>
              <input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="email-baru@contoh.com"
                autoComplete="email"
                required
                autoFocus
                aria-invalid={msg ? true : undefined}
                className={`mt-1.5 w-full rounded-2xl border bg-white p-3.5 text-sm text-ink placeholder:text-zinc-400 transition-colors focus:outline-none ${
                  msg
                    ? "border-rose-accent/50 bg-rose-50/50 focus:border-rose-accent"
                    : "border-black/10 focus:border-brand-400 focus:bg-brand-50/40"
                }`}
              />
            </label>
            {msg ? <p className="text-xs font-medium text-rose-accent">{msg}</p> : null}
            <SubmitRow loading={loading} onCancel={close} submitLabel="Kirim kode" />
          </form>
        ) : (
          <form onSubmit={confirm} className="space-y-4">
            <p className="text-sm text-zinc-500">
              Kami kirim kode ke <span className="font-semibold text-ink">{cleanEmail}</span>.
            </p>
            <label className="block">
              <span className="text-sm font-medium text-zinc-500">Kode verifikasi</span>
              <input
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="Kode 6 digit"
                aria-label="Kode verifikasi email baru"
                autoFocus
                className="mt-1.5 w-full rounded-2xl border border-black/10 bg-white p-3.5 text-sm tracking-[0.3em] text-ink placeholder:tracking-normal placeholder:text-zinc-400 transition-colors focus:border-brand-400 focus:bg-brand-50/40 focus:outline-none"
              />
            </label>
            {msg ? <p className="text-xs font-medium text-rose-accent">{msg}</p> : null}
            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => sendCode()}
                disabled={loading}
                className="text-xs font-medium text-zinc-500 transition-colors hover:text-ink disabled:opacity-60"
              >
                Kirim ulang kode
              </button>
              <SubmitRow loading={loading} onCancel={close} submitLabel="Ganti & verifikasi" />
            </div>
          </form>
        )}
      </Modal>
    </>
  );
}
