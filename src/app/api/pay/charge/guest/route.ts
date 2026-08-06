import { NextResponse } from "next/server";
import { charge, isConfigured, isValidMethod } from "@/lib/midtrans";
import { packGuestField3 } from "@/lib/guest-order";
import { resolveCheckout, isCheckoutError } from "@/lib/checkout";
import { rateLimit } from "@/lib/rate-limit";
import { newOrderId } from "@/lib/order-id";
import { isValidEmail } from "@/lib/is-email";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GUEST CHECKOUT (ADR-002 §1 "Beli langsung"): orang isi data diri lalu bayar TANPA
// harus punya akun. PENTING (ADR-002 §1/§2): route ini TIDAK menulis ke database dan
// TIDAK membuat akun. Identitas pembeli dibawa lewat Midtrans custom_field1..3, lalu
// akun (core user) + invoice + entitlement dibuat DI WEBHOOK saat pembayaran sukses.
// Kalau orang tidak jadi bayar, tidak ada user/invoice hantu yang tertinggal.
//
// Core API: alih-alih token Snap, mengembalikan PaymentInstruction (QR/VA/tagihan)
// yang dirender langsung di halaman /beli dengan UI layanan ini.

type Body = {
  name?: string;
  email?: string;
  phone?: string;
  product?: string;
  event?: string;
  method?: string;
  cardToken?: string;
};

const clean = (v: unknown, max: number) =>
  (typeof v === "string" ? v : v == null ? "" : String(v)).trim().slice(0, max);

export async function POST(req: Request) {
  // Rate limit: guest charge tak butuh login & membuat transaksi Midtrans → rawan spam.
  const limited = rateLimit(req, "pay-charge-guest", { max: 10, windowMs: 60_000 });
  if (limited) return limited;

  if (!isConfigured()) {
    return NextResponse.json(
      { error: "Pembayaran belum tersedia saat ini. Silakan coba lagi nanti." },
      { status: 503 },
    );
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Data tidak valid." }, { status: 400 });
  }

  if (!isValidMethod(body.method)) {
    return NextResponse.json({ error: "Metode pembayaran tidak dikenali." }, { status: 400 });
  }
  const method = body.method;
  if (method === "card" && !body.cardToken) {
    return NextResponse.json({ error: "Token kartu tidak ada. Muat ulang lalu coba lagi." }, { status: 400 });
  }

  const name = clean(body.name, 120);
  const email = clean(body.email, 160).toLowerCase();
  const phone = clean(body.phone, 40) || null;
  if (!name) return NextResponse.json({ error: "Nama wajib diisi." }, { status: 400 });
  if (!isValidEmail(email)) {
    return NextResponse.json({ error: "Email belum valid." }, { status: 400 });
  }

  // Resolusi item + harga otoritatif (resolver bersama; sama dgn checkout login & webhook).
  const resolved = await resolveCheckout({
    product: clean(body.product, 80) || undefined,
    event: body.event ? clean(body.event, 80) : undefined,
  });
  if (isCheckoutError(resolved)) {
    return NextResponse.json({ error: resolved.error }, { status: resolved.status });
  }
  const { itemRef, itemName, price, isSub } = resolved;
  const orderId = newOrderId(itemRef);

  try {
    const { instruction } = await charge({
      orderId,
      grossAmount: price,
      method,
      itemId: itemRef,
      itemName,
      customer: { name, email, phone },
      cardTokenId: body.cardToken,
      // Langganan dibayar kartu: minta Midtrans simpan token supaya recurring bisa
      // didaftarkan di webhook (token di-echo lewat notifikasi -> disimpan ke subscription).
      saveCardToken: isSub && method === "card",
      // Identitas + item dibawa ke webhook lewat custom_field (di-echo Midtrans).
      customFields: { field1: email, field2: itemRef, field3: packGuestField3(name, phone) },
    });
    return NextResponse.json({ orderId, instruction });
  } catch (e) {
    // Detail di-log server-side; jangan echo internal ke klien (redaksi).
    console.error("[pay/charge/guest] gagal:", e instanceof Error ? e.message : "unknown");
    return NextResponse.json({ error: "Gagal memulai pembayaran. Coba lagi." }, { status: 502 });
  }
}
