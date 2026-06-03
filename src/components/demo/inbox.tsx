"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Item = { id: string; to: string; subject: string; at: number };

function jam(at: number): string {
  return new Date(at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
}

export function DemoInbox() {
  const [items, setItems] = useState<Item[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [reloadTick, setReloadTick] = useState(0);

  // Tarik daftar email saat mount + tiap 4 detik (realtime ringan). Fetch didefinisikan DI
  // DALAM effect; setState hanya terjadi setelah await (tak pernah sinkron) sehingga tak memicu
  // cascading render. `reloadTick` dipakai tombol untuk memaksa muat ulang segera.
  useEffect(() => {
    let active = true;
    async function run() {
      try {
        const r = await fetch("/api/demo/mailbox", { cache: "no-store" });
        if (!active || !r.ok) return;
        const data = (await r.json()) as { emails: Item[] };
        if (!active) return;
        const list = data.emails ?? [];
        setItems(list);
        setSelected((cur) => (cur && list.some((e) => e.id === cur) ? cur : list[0]?.id ?? null));
      } catch {
        /* biarkan; polling berikutnya coba lagi */
      } finally {
        if (active) setLoaded(true);
      }
    }
    run();
    const t = setInterval(run, 4000);
    return () => {
      active = false;
      clearInterval(t);
    };
  }, [reloadTick]);

  async function seed() {
    setBusy(true);
    await fetch("/api/demo/mailbox", { method: "POST" });
    setReloadTick((n) => n + 1);
    setBusy(false);
  }

  async function clear() {
    setBusy(true);
    await fetch("/api/demo/mailbox", { method: "DELETE" });
    setSelected(null);
    setReloadTick((n) => n + 1);
    setBusy(false);
  }

  const btn =
    "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium ring-1 ring-black/[0.06] transition-colors disabled:opacity-50";

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:py-10">
      <header className="mb-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl font-extrabold tracking-tight text-ink">Kotak Email Demo</h1>
            <p className="mt-1 max-w-2xl text-sm text-zinc-500">
              Semua email yang dikirim aplikasi (kode OTP, selamat datang, tagihan) muncul di sini{" "}
              <span className="font-medium text-zinc-700">secara langsung</span> — tanpa email sungguhan. Coba{" "}
              <Link href="/daftar" className="font-medium text-brand-600 hover:underline">
                daftar akun baru
              </Link>
              , lalu kembali ke sini untuk melihat kodenya masuk.
            </p>
          </div>
          <div className="flex shrink-0 gap-2">
            <button onClick={seed} disabled={busy} className={`${btn} bg-brand-600 text-white ring-brand-700 hover:bg-brand-700`}>
              Kirim contoh
            </button>
            <button onClick={clear} disabled={busy} className={`${btn} bg-white text-zinc-600 hover:bg-zinc-50`}>
              Kosongkan
            </button>
          </div>
        </div>
        <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-[13px] leading-snug text-amber-900 ring-1 ring-amber-200">
          Kotak ini <strong>bersama</strong> dan bisa dilihat pengunjung lain, serta direset saat aplikasi restart.
          Jangan pakai data pribadi asli — gunakan email contoh saja.
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-[minmax(0,340px)_1fr]">
        {/* Daftar email */}
        <section className="overflow-hidden rounded-2xl bg-white ring-1 ring-black/[0.06]">
          <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-2.5">
            <span className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Masuk</span>
            <span className="text-xs text-zinc-400">{items.length} email</span>
          </div>
          {items.length === 0 ? (
            <div className="px-4 py-14 text-center text-sm text-zinc-400">
              {loaded ? (
                <>
                  Belum ada email.
                  <br />
                  Klik <span className="font-medium text-zinc-600">Kirim contoh</span> atau daftar akun baru.
                </>
              ) : (
                "Memuat..."
              )}
            </div>
          ) : (
            <ul className="max-h-[60vh] divide-y divide-zinc-100 overflow-y-auto">
              {items.map((e) => {
                const active = e.id === selected;
                return (
                  <li key={e.id}>
                    <button
                      onClick={() => setSelected(e.id)}
                      className={`flex w-full flex-col gap-0.5 px-4 py-3 text-left transition-colors ${
                        active ? "bg-brand-50" : "hover:bg-zinc-50"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className={`truncate text-sm font-semibold ${active ? "text-brand-700" : "text-ink"}`}>
                          {e.subject}
                        </span>
                        <span className="shrink-0 text-[11px] text-zinc-400">{jam(e.at)}</span>
                      </div>
                      <span className="truncate text-xs text-zinc-400">ke {e.to}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* Pratinjau email terpilih (iframe sandbox: tanpa skrip, terisolasi dari app) */}
        <section className="overflow-hidden rounded-2xl bg-zinc-50 ring-1 ring-black/[0.06]">
          {selected ? (
            <iframe
              key={selected}
              src={`/api/demo/mailbox/${selected}`}
              title="Pratinjau email"
              sandbox=""
              className="h-[70vh] w-full bg-white"
            />
          ) : (
            <div className="flex h-[70vh] items-center justify-center px-6 text-center text-sm text-zinc-400">
              Pilih email di kiri untuk melihat isinya.
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
