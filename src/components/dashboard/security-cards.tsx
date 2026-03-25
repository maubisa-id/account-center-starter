"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import QRCode from "qrcode";
import { authClient } from "@/lib/auth-client";
import { useToast } from "@/components/toast";
import { Panel, Reveal } from "@/components/ui";
import { Modal, Field, SubmitRow } from "./modal";
import { IconLock, IconShieldCheck, IconMonitor } from "@/components/icons";
import { PasswordStrength } from "@/components/auth/password-strength";
import { scorePassword } from "@/lib/password";

/* ---------------- Ubah kata sandi ---------------- */
function ChangePassword() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ tone: "ok" | "err"; text: string } | null>(null);
  const [pw, setPw] = useState("");
  const toast = useToast();

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const currentPassword = String(fd.get("current") ?? "");
    const newPassword = String(fd.get("new") ?? "");
    const confirmPassword = String(fd.get("confirm") ?? "");
    if (newPassword.length < 8) {
      setMsg({ tone: "err", text: "Kata sandi baru minimal 8 karakter." });
      return;
    }
    const pwCheck = scorePassword(newPassword);
    if (!pwCheck.ok) {
      setMsg({ tone: "err", text: pwCheck.hint ?? "Kata sandi baru belum cukup kuat." });
      return;
    }
    if (newPassword !== confirmPassword) {
      setMsg({ tone: "err", text: "Konfirmasi kata sandi tidak cocok." });
      return;
    }
    setLoading(true);
    setMsg(null);
    const { error } = await authClient.changePassword({ currentPassword, newPassword, revokeOtherSessions: true });
    setLoading(false);
    if (error) {
      setMsg({ tone: "err", text: error.message ?? "Gagal mengubah kata sandi." });
      return;
    }
    setOpen(false);
    toast.show("Kata sandi berhasil diubah. Sesi lain telah dikeluarkan.");
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setPw("");
          setMsg(null);
          setOpen(true);
        }}
        className="inline-flex items-center gap-3 rounded-full bg-white px-5 py-2 text-sm font-semibold text-ink shadow-soft ring-1 ring-black/[0.08] transition-colors hover:bg-zinc-50"
      >
        Ubah kata sandi
      </button>
      {msg && !open ? (
        <p className={`mt-2 text-xs ${msg.tone === "ok" ? "text-lime-700" : "text-rose-600"}`}>{msg.text}</p>
      ) : null}
      <Modal open={open} onClose={() => setOpen(false)} title="Ubah kata sandi" desc="Masukkan kata sandi lama dan yang baru.">
        <form onSubmit={onSubmit}>
          <div className="space-y-4">
            <Field label="Kata sandi saat ini" name="current" type="password" required autoComplete="current-password" />
            <div>
              <Field label="Kata sandi baru" name="new" type="password" required autoComplete="new-password" onChange={(e) => setPw(e.target.value)} />
              <PasswordStrength value={pw} />
            </div>
            <Field label="Ulangi kata sandi baru" name="confirm" type="password" required autoComplete="new-password" />
          </div>
          {msg && open ? <p className="mt-3 text-sm text-rose-600">{msg.text}</p> : null}
          <SubmitRow loading={loading} onCancel={() => setOpen(false)} submitLabel="Simpan sandi" />
        </form>
      </Modal>
    </>
  );
}

/* ---------------- 2FA (TOTP) ---------------- */
function TwoFactor({ enabled }: { enabled: boolean }) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"password" | "verify">("password");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [totpURI, setTotpURI] = useState<string | null>(null);
  const [backup, setBackup] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);
  const router = useRouter();
  const toast = useToast();

  async function copyBackup() {
    try {
      await navigator.clipboard.writeText(backup.join("\n"));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard tak tersedia — abaikan */
    }
  }

  async function startEnable(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const password = String(new FormData(e.currentTarget).get("password") ?? "");
    setLoading(true);
    setMsg(null);
    const { data, error } = await authClient.twoFactor.enable({ password });
    setLoading(false);
    if (error || !data) {
      setMsg(error?.message ?? "Gagal memulai 2FA.");
      return;
    }
    setTotpURI(data.totpURI);
    setBackup(data.backupCodes ?? []);
    setStep("verify");
  }

  async function verify(e: React.FormEvent<HTMLFormElement>) {
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
    setOpen(false);
    toast.show("Autentikasi dua faktor aktif.");
    router.refresh();
  }

  async function disable(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const password = String(new FormData(e.currentTarget).get("password") ?? "");
    setLoading(true);
    setMsg(null);
    const { error } = await authClient.twoFactor.disable({ password });
    setLoading(false);
    if (error) {
      setMsg(error.message ?? "Gagal menonaktifkan 2FA.");
      return;
    }
    setOpen(false);
    toast.show("Autentikasi dua faktor dinonaktifkan.", "info");
    router.refresh();
  }

  // QR 2FA di-render LOKAL di browser (qrcode) — otpauth:// memuat rahasia TOTP, jadi
  // TIDAK boleh dikirim ke layanan QR pihak ketiga (dulu api.qrserver.com = kebocoran rahasia).
  const [qrSrc, setQrSrc] = useState<string | null>(null);
  useEffect(() => {
    if (!totpURI) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setQrSrc(null);
      return;
    }
    let alive = true;
    QRCode.toDataURL(totpURI, { width: 180, margin: 1 })
      .then((url) => {
        if (alive) setQrSrc(url);
      })
      .catch(() => {
        if (alive) setQrSrc(null);
      });
    return () => {
      alive = false;
    };
  }, [totpURI]);

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setStep("password");
          setMsg(null);
          setTotpURI(null);
          setOpen(true);
        }}
        className="inline-flex items-center gap-3 rounded-full bg-white px-5 py-2 text-sm font-semibold text-ink shadow-soft ring-1 ring-black/[0.08] transition-colors hover:bg-zinc-50"
      >
        {enabled ? "Nonaktifkan 2FA" : "Aktifkan 2FA"}
      </button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={enabled ? "Nonaktifkan 2FA" : "Aktifkan autentikasi dua faktor"}
        desc={
          enabled
            ? "Konfirmasi kata sandi untuk mematikan 2FA."
            : step === "password"
              ? "Konfirmasi kata sandi untuk memulai."
              : "Pindai QR dengan aplikasi autentikator, lalu masukkan kodenya."
        }
      >
        {enabled ? (
          <form onSubmit={disable}>
            <Field label="Kata sandi" name="password" type="password" required autoComplete="current-password" />
            {msg ? <p className="mt-3 text-sm text-rose-600">{msg}</p> : null}
            <SubmitRow loading={loading} onCancel={() => setOpen(false)} submitLabel="Nonaktifkan" tone="rose" />
          </form>
        ) : step === "password" ? (
          <form onSubmit={startEnable}>
            <Field label="Kata sandi" name="password" type="password" required autoComplete="current-password" />
            {msg ? <p className="mt-3 text-sm text-rose-600">{msg}</p> : null}
            <SubmitRow loading={loading} onCancel={() => setOpen(false)} submitLabel="Lanjut" />
          </form>
        ) : (
          <form onSubmit={verify}>
            <div className="flex flex-col items-center gap-4">
              {qrSrc ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={qrSrc} alt="QR 2FA" width={180} height={180} className="rounded-2xl ring-1 ring-black/[0.06]" />
              ) : null}
              {backup.length > 0 ? (
                <div className="w-full rounded-2xl bg-zinc-50 p-3 ring-1 ring-black/[0.04]">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Kode cadangan (simpan)</div>
                    <button
                      type="button"
                      onClick={copyBackup}
                      className="rounded-lg px-2 py-1 text-[11px] font-semibold text-brand-600 transition-colors hover:bg-brand-50"
                    >
                      {copied ? "Tersalin" : "Salin semua"}
                    </button>
                  </div>
                  <div className="mt-1.5 grid grid-cols-2 gap-1 text-center font-mono text-xs text-ink">
                    {backup.map((c) => (
                      <span key={c}>{c}</span>
                    ))}
                  </div>
                </div>
              ) : null}
              <Field label="Kode dari aplikasi" name="code" placeholder="123456" required />
            </div>
            {msg ? <p className="mt-3 text-sm text-rose-600">{msg}</p> : null}
            <SubmitRow loading={loading} onCancel={() => setOpen(false)} submitLabel="Verifikasi & aktifkan" />
          </form>
        )}
      </Modal>
    </>
  );
}

/* ---------------- Sesi aktif ---------------- */
type Sess = { id: string; token: string; userAgent?: string | null; createdAt: string; current?: boolean };

function Sessions() {
  const [items, setItems] = useState<Sess[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    setError(false);
    try {
      const { data: sessions } = await authClient.listSessions();
      const { data: current } = await authClient.getSession();
      const currentToken = current?.session?.token;
      const list = (sessions ?? []).map((s) => ({
        id: s.id,
        token: s.token,
        userAgent: s.userAgent,
        createdAt: s.createdAt as unknown as string,
        current: s.token === currentToken,
      }));
      list.sort((a, b) => (a.current ? -1 : b.current ? 1 : 0));
      setItems(list);
    } catch {
      // Bedakan GAGAL MEMUAT dari "tak ada sesi" — jangan tampilkan "Tidak ada sesi aktif"
      // padahal fetch error (menyesatkan; user bisa mengira sesinya sudah bersih).
      setError(true);
      setItems([]);
    }
  }, []);

  // Muat daftar sesi saat mount (fetch async; setState terjadi setelah await, bukan sinkron).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  async function revoke(token: string) {
    setBusy(token);
    setConfirming(null);
    await authClient.revokeSession({ token });
    setBusy(null);
    load();
  }

  function label(ua?: string | null) {
    if (!ua) return "Perangkat tidak dikenal";
    if (/edg/i.test(ua)) return "Microsoft Edge";
    if (/chrome/i.test(ua)) return "Google Chrome";
    if (/firefox/i.test(ua)) return "Firefox";
    if (/safari/i.test(ua)) return "Safari";
    if (/curl/i.test(ua)) return "Terminal (curl)";
    return "Peramban";
  }

  return (
    <div className="mt-5 space-y-3">
      {items === null ? (
        <>
          {[0, 1].map((i) => (
            <div
              key={i}
              className="flex items-center gap-4 rounded-2xl bg-zinc-50/70 p-4 ring-1 ring-black/[0.04]"
            >
              <span className="h-11 w-11 shrink-0 animate-pulse rounded-2xl bg-zinc-200/70" />
              <div className="flex-1 space-y-2">
                <span className="block h-3.5 w-32 animate-pulse rounded-full bg-zinc-200/70" />
                <span className="block h-3 w-44 animate-pulse rounded-full bg-zinc-200/50" />
              </div>
              <span className="h-6 w-16 shrink-0 animate-pulse rounded-full bg-zinc-200/60" />
            </div>
          ))}
        </>
      ) : error ? (
        <div className="rounded-2xl border border-rose-100 bg-rose-50/70 p-4">
          <p className="text-sm font-medium text-rose-800">Gagal memuat daftar sesi.</p>
          <button
            type="button"
            onClick={() => load()}
            className="mt-2 rounded-full bg-rose-600 px-4 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-rose-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 focus-visible:ring-offset-2"
          >
            Coba lagi
          </button>
        </div>
      ) : items.length === 0 ? (
        <p className="text-sm text-zinc-500">Tidak ada sesi aktif.</p>
      ) : (
        items.map((s) => (
          <div key={s.id} className="flex items-center gap-4 rounded-2xl bg-zinc-50/70 p-4 ring-1 ring-black/[0.04]">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-ink ring-1 ring-black/[0.05]">
              <IconMonitor className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold text-ink">{label(s.userAgent)}</div>
              <div className="text-xs text-zinc-500">
                {s.current ? "Perangkat ini" : "Sesi lain"} · mulai {new Date(s.createdAt).toLocaleDateString("id-ID")}
              </div>
            </div>
            {s.current ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-lime-50 px-2.5 py-1 text-xs font-semibold text-lime-700 ring-1 ring-inset ring-lime-600/20">
                <span className="h-1.5 w-1.5 rounded-full bg-lime-500" />
                Aktif sekarang
              </span>
            ) : confirming === s.token ? (
              <div className="flex shrink-0 items-center gap-1">
                <span className="mr-1 hidden text-xs text-zinc-500 sm:inline">Keluarkan?</span>
                <button
                  type="button"
                  onClick={() => revoke(s.token)}
                  disabled={busy === s.token}
                  className="rounded-full bg-rose-accent px-3 py-1.5 text-xs font-semibold text-white transition-[filter] hover:brightness-95 disabled:opacity-60"
                >
                  {busy === s.token ? "..." : "Ya, keluar"}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirming(null)}
                  className="rounded-full px-3 py-1.5 text-xs font-semibold text-zinc-500 transition-colors hover:text-ink"
                >
                  Batal
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirming(s.token)}
                className="rounded-full px-3 py-1.5 text-xs font-semibold text-zinc-500 transition-colors hover:text-rose-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300 focus-visible:ring-offset-2"
              >
                Akhiri sesi
              </button>
            )}
          </div>
        ))
      )}
    </div>
  );
}

/* ---------------- Wrapper ---------------- */
export function SecurityCards({ twoFactorEnabled }: { twoFactorEnabled: boolean }) {
  return (
    <>
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Reveal>
          <Panel className="h-full" innerClassName="p-6 sm:p-7 h-full">
            <div className="flex items-start gap-4">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-zinc-50 text-ink ring-1 ring-black/[0.04]">
                <IconLock className="h-5 w-5" />
              </span>
              <div className="flex-1">
                <h3 className="text-sm font-bold text-ink">Kata sandi</h3>
                <p className="mt-1 text-sm text-zinc-500">Ganti kata sandi untuk menjaga akun tetap aman.</p>
                <div className="mt-4">
                  <ChangePassword />
                </div>
              </div>
            </div>
          </Panel>
        </Reveal>

        <Reveal delay={80}>
          <Panel className="h-full" innerClassName="p-6 sm:p-7 h-full">
            <div className="flex items-start gap-4">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-zinc-50 text-ink ring-1 ring-black/[0.04]">
                <IconShieldCheck className="h-5 w-5" />
              </span>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-ink">Autentikasi dua faktor</h3>
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ring-1 ring-inset ${
                      twoFactorEnabled
                        ? "bg-lime-50 text-lime-700 ring-lime-600/20"
                        : "bg-zinc-100 text-zinc-500 ring-zinc-500/20"
                    }`}
                  >
                    {twoFactorEnabled ? "Aktif" : "Belum aktif"}
                  </span>
                </div>
                <p className="mt-1 text-sm text-zinc-500">Tambahkan lapisan keamanan ekstra lewat aplikasi autentikator.</p>
                <div className="mt-4">
                  <TwoFactor enabled={twoFactorEnabled} />
                </div>
              </div>
            </div>
          </Panel>
        </Reveal>
      </div>

      <Reveal delay={140}>
        <Panel innerClassName="p-6 sm:p-8">
          <h3 className="text-sm font-bold text-ink">Sesi aktif</h3>
          <p className="mt-1 text-sm text-zinc-500">Perangkat yang sedang masuk ke akunmu.</p>
          <Sessions />
        </Panel>
      </Reveal>
    </>
  );
}
