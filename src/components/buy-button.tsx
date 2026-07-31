import Link from "next/link";
import { ArrowRight } from "lucide-react";

// Tombol beli/berlangganan di dashboard. Mengarah ke checkout terpusat (/checkout)
// yang memakai UI Core API custom (pilih metode -> QR/VA/tagihan). Satu alur bayar
// dipakai bersama web utama, dashboard, dan produk lain (ADR-002) supaya linear.
export function BuyButton({ itemKey, label }: { itemKey: string; label: string }) {
  return (
    <Link
      href={`/checkout?product=${encodeURIComponent(itemKey)}`}
      className="group inline-flex items-center gap-3 rounded-full bg-brand-500 py-2.5 pl-5 pr-2 text-sm font-semibold text-white shadow-brand transition-[transform,background-color,box-shadow] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-brand-600 hover:-translate-y-[1px] active:scale-[0.98]"
    >
      <span>{label}</span>
      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-x-0.5">
        <ArrowRight className="h-4 w-4" />
      </span>
    </Link>
  );
}
