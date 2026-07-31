import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { CATALOG, type CatalogItem } from "@/lib/catalog";

// Harga & status aktif diambil dari acme_core.products (sumber kebenaran, server-side).
// Metadata presentasi (blurb, cta, status section) tetap dari catalog.ts.

export type ResolvedCatalogItem = CatalogItem & {
  /** true jika produk ada di DB dan active. Untuk item non-jual (included/register/consult) tetap true. */
  purchasableFromDb: boolean;
  /** harga final (dari DB bila ada, jika tidak fallback ke priceIdr katalog). */
  priceIdrResolved?: number;
};

type ProductRow = { code: string; price: number; active: boolean };

const loadProducts = cache(async (): Promise<Map<string, ProductRow>> => {
  try {
    const rows = await prisma.product.findMany({ select: { code: true, price: true, active: true } });
    return new Map(rows.map((r) => [r.code, { code: r.code, price: Number(r.price), active: r.active }]));
  } catch {
    return new Map();
  }
});

// Harga otoritatif untuk sebuah kode produk (server-side; dipakai checkout).
export async function getProductPrice(code: string): Promise<{ price: number; active: boolean } | null> {
  const products = await loadProducts();
  const row = products.get(code);
  return row ? { price: row.price, active: row.active } : null;
}

// Katalog gabungan: metadata katalog + harga/status dari DB.
export const getCatalog = cache(async (): Promise<ResolvedCatalogItem[]> => {
  const products = await loadProducts();
  return CATALOG.map((item) => {
    const isSellable = item.cta === "subscribe" || item.cta === "buy";
    if (!isSellable || !item.productCode) {
      return { ...item, purchasableFromDb: true, priceIdrResolved: item.priceIdr };
    }
    const row = products.get(item.productCode);
    const priceIdrResolved = row ? row.price : item.priceIdr;
    // Produk jual harus ada + active di DB untuk bisa dibeli (fallback ke katalog bila DB kosong).
    const purchasableFromDb = row ? row.active : item.priceIdr != null;
    return {
      ...item,
      priceIdrResolved,
      price: priceIdrResolved != null ? `Rp${priceIdrResolved.toLocaleString("id-ID")}` : item.price,
      purchasableFromDb,
    };
  });
});
