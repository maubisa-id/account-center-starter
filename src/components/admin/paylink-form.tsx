"use client";

import { useState } from "react";
import { generateLink } from "@/app/(app)/admin/actions";
import { Panel } from "@/components/ui";
import { useToast } from "@/components/toast";
import { Field } from "@/components/dashboard/modal";
import { IconChevron } from "@/components/icons";

// Opsi produk datang dari DB (server hanya kirim produk aktif non-langganan; harga
// otoritatif dari DB). "custom" = nominal manual (mis. paket khusus hasil nego).
type ProductOption = { code: string; label: string };
const CUSTOM: ProductOption = { code: "custom", label: "Nominal custom…" };

export function PaymentLinkForm({ products }: { products: ProductOption[] }) {
  const options = [...products, CUSTOM];
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [productCode, setProductCode] = useState(products[0]?.code ?? "custom");
  const [result, setResult] = useState<{ orderId: string; paymentUrl: string } | null>(null);

  const isCustom = productCode === "custom";

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setLoading(true);
    setResult(null);
    const res = await generateLink({
      email: String(fd.get("email") ?? ""),
      name: String(fd.get("name") ?? ""),
      phone: String(fd.get("phone") ?? ""),
      productCode: isCustom ? "" : productCode,
      itemName: isCustom ? String(fd.get("itemName") ?? "") : "",
      amount: isCustom ? String(fd.get("amount") ?? "") : "",
    });
    setLoading(false);
    if ("error" in res) {
      toast.show(res.error, "error");
      return;
    }
    setResult({ orderId: res.orderId, paymentUrl: res.paymentUrl });
    toast.show("Payment link dibuat.");
  }

  const waHref = result
    ? `https://wa.me/?text=${encodeURIComponent(`Halo, ini link pembayaran kamu ya: ${result.paymentUrl}`)}`
    : "#";

  return (
    <Panel innerClassName="p-6 sm:p-8">
      <form onSubmit={onSubmit} className="space-y-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Email pelanggan" name="email" type="email" placeholder="nama@email.com" required autoComplete="off" />
          <Field label="Nama" name="name" placeholder="Nama pelanggan" autoComplete="off" />
          <Field label="No. WhatsApp" name="phone" placeholder="0812xxxxxxxx" autoComplete="off" />
          <label className="block">
            <span className="text-sm font-medium text-zinc-500">Paket</span>
            <div className="relative mt-1.5">
              <select
                value={productCode}
                onChange={(e) => setProductCode(e.target.value)}
                className="w-full appearance-none rounded-2xl border border-black/10 bg-white p-3.5 pr-11 text-sm text-ink transition-colors focus:border-brand-400 focus:bg-brand-50/40 focus:outline-none"
              >
                {options.map((o) => (
                  <option key={o.code} value={o.code}>
                    {o.label}
                  </option>
                ))}
              </select>
              <IconChevron className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 rotate-90 text-zinc-500" />
            </div>
          </label>
        </div>

        {isCustom ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Nama item" name="itemName" placeholder="mis. Konsultasi — Paket Khusus" required />
            <Field label="Nominal (Rp)" name="amount" type="number" placeholder="850000" min="1000" required />
          </div>
        ) : null}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className="rounded-full bg-brand-500 px-6 py-2.5 text-sm font-semibold text-white shadow-brand transition-[transform,background-color] duration-300 hover:-translate-y-[1px] hover:bg-brand-600 disabled:opacity-60"
          >
            {loading ? "Membuat…" : "Buat Payment Link"}
          </button>
        </div>
      </form>

      {result ? (
        <div className="mt-6 space-y-3 rounded-2xl bg-brand-50 p-4 ring-1 ring-inset ring-brand-600/15">
          <div className="text-xs font-semibold uppercase tracking-wide text-brand-700">Link siap dikirim</div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <input
              readOnly
              value={result.paymentUrl}
              onFocus={(e) => e.currentTarget.select()}
              className="min-w-0 flex-1 rounded-xl border border-brand-600/20 bg-white px-3 py-2.5 text-sm text-ink"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard?.writeText(result.paymentUrl);
                  toast.show("Link disalin.", "info");
                }}
                className="rounded-full bg-white px-4 py-2.5 text-sm font-semibold text-brand-700 ring-1 ring-inset ring-brand-600/20 transition-colors hover:bg-brand-100"
              >
                Salin
              </button>
              <a
                href={waHref}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-600"
              >
                Kirim via WA
              </a>
            </div>
          </div>
          <div className="text-xs text-zinc-500">Order: {result.orderId}</div>
        </div>
      ) : null}
    </Panel>
  );
}
