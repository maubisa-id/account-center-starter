import { CATALOG, type CatalogItem } from "@/lib/catalog";
import { getProductPrice } from "@/lib/products";
import { getEventPricing, isDirectusConfigured } from "@/lib/events";

// Resolver checkout BERSAMA — satu sumber kebenaran untuk /api/pay/charge (login),
// /api/pay/charge/guest (tamu), dan lib/guest-order (fulfillment webhook). Menghindari
// drift aturan produk/harga di kode yang menyentuh uang. Aturan:
//  - input { event } -> acara berbayar (MBG Forge), eventCode di-snapshot.
//  - input { product } / { key } -> item katalog by key atau productCode.
//  - hanya item live + cta subscribe|buy yang boleh dibeli.
//  - HARGA otoritatif dari DB products (fallback katalog). JANGAN percaya klien.

export type CheckoutInput = { key?: string; product?: string; event?: string };

export type ResolvedCheckout = {
  item: CatalogItem;
  eventCode?: string;
  itemRef: string; // eventCode bila acara, else item.key
  itemName: string; // "<nama>" atau "<nama> (<eventCode>)"
  price: number; // integer IDR (otoritatif)
  isSub: boolean;
};

export type CheckoutError = { error: string; status: number };

export function isCheckoutError(r: ResolvedCheckout | CheckoutError): r is CheckoutError {
  return (r as CheckoutError).error !== undefined;
}

export async function resolveCheckout(input: CheckoutInput): Promise<ResolvedCheckout | CheckoutError> {
  // ── ACARA BERBAYAR (MBG Forge & sejenis) ────────────────────────────────
  // Harga & judul OTORITATIF diambil dari baris acara di Directus (bukan harga
  // produk mbg-forge yang tetap), sesuai katalog-produk.md: "ambil judul + harga
  // dari baris acara ... snapshot ke invoice". Ini mencegah bug nominal (mis. acara
  // Rp199.000 tertagih Rp29.000). Konsisten lintas login/guest/webhook karena
  // resolver ini dipakai bersama.
  if (input.event) {
    const item = CATALOG.find((c) => c.key === "mbg-forge"); // template scope/itemType 'event'
    if (!item) return { error: "Produk tidak ditemukan.", status: 404 };
    const eventCode = input.event;
    const pricing = await getEventPricing(eventCode);

    if (!pricing) {
      // Directus aktif tapi acara tak ada -> TOLAK (jangan tebak harga = jangan salah tagih).
      if (isDirectusConfigured()) return { error: "Acara tidak ditemukan.", status: 404 };
      // Dev tanpa Directus: pakai contoh katalog mbg-forge.
      const raw = item.priceIdr;
      if (!raw || raw <= 0) return { error: "Harga produk tidak valid.", status: 400 };
      return {
        item,
        eventCode,
        itemRef: eventCode,
        itemName: `${item.name} (${eventCode})`,
        price: Math.round(raw),
        isSub: false,
      };
    }
    if (pricing.isFree || !pricing.priceIdr || pricing.priceIdr <= 0) {
      return { error: "Acara ini gratis, silakan daftar tanpa pembayaran.", status: 400 };
    }
    return {
      item,
      eventCode,
      itemRef: eventCode,
      itemName: pricing.title, // snapshot judul acara asli
      price: Math.round(pricing.priceIdr),
      isSub: false,
    };
  }

  // ── PRODUK KATALOG (MBG+, dst) ──────────────────────────────────────────
  const code = input.key ?? input.product;
  const item = CATALOG.find((c) => c.key === code || c.productCode === code);
  if (!item) return { error: "Produk tidak ditemukan.", status: 404 };

  // Validasi bisa dibeli.
  if (item.status !== "live" || !(item.cta === "subscribe" || item.cta === "buy")) {
    return { error: "Produk ini tidak bisa dibeli.", status: 400 };
  }

  // Harga otoritatif dari DB (fallback katalog). Cek active.
  const dbPrice = item.productCode ? await getProductPrice(item.productCode) : null;
  if (dbPrice && !dbPrice.active) {
    return { error: "Produk sedang tidak tersedia.", status: 400 };
  }
  const raw = dbPrice?.price ?? item.priceIdr;
  if (!raw || raw <= 0) return { error: "Harga produk tidak valid.", status: 400 };
  const price = Math.round(raw);

  return { item, itemRef: item.key, itemName: item.name, price, isSub: item.itemType === "subscription" };
}
