import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/lib/rate-limit";
import { secureEqual } from "@/lib/secure-compare";
import { createPaymentLinkOrder, type PaymentLinkInput } from "@/lib/payment-link-order";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// PAYMENT LINK (Motion C — bimbingan skripsi, ADR-001 §2.4 / ADR-002).
// Dipanggil server-to-server oleh admin/web-utama SETELAH konsultasi WhatsApp.
// Gerbang shared secret; alur inti dibagi dgn /admin lewat createPaymentLinkOrder.
export async function POST(req: NextRequest) {
  const limited = rateLimit(req, "pay-link", { max: 20, windowMs: 60_000 });
  if (limited) return limited;

  const secret = process.env.PROVISION_SECRET;
  const provided = req.headers.get("x-provision-secret") ?? "";
  if (!secret || !secureEqual(provided, secret)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: PaymentLinkInput;
  try {
    body = (await req.json()) as PaymentLinkInput;
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const result = await createPaymentLinkOrder(body);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  // payment_url dikirim admin ke pelanggan lewat WhatsApp (Motion C).
  return NextResponse.json({ ok: true, orderId: result.orderId, paymentUrl: result.paymentUrl });
}
