"use server";

import { getSessionEmail } from "@/lib/account";
import { isAdminEmail } from "@/lib/admin";
import { createPaymentLinkOrder } from "@/lib/payment-link-order";

// Server action untuk /admin. Gerbang: sesi login (layout app) + email admin (allowlist).
// Rahasia (PROVISION_SECRET/kunci Midtrans) tetap di server; klien hanya kirim form.
export async function generateLink(
  input: { email: string; name?: string; phone?: string; productCode?: string; itemName?: string; amount?: string },
): Promise<{ ok: true; orderId: string; paymentUrl: string } | { error: string }> {
  const email = await getSessionEmail();
  if (!isAdminEmail(email)) return { error: "Akses ditolak." };

  const res = await createPaymentLinkOrder({
    email: input.email,
    name: input.name,
    phone: input.phone,
    productCode: input.productCode || undefined,
    itemName: input.itemName || undefined,
    amount: input.amount || undefined,
  });
  if (!res.ok) return { error: res.error };
  return { ok: true, orderId: res.orderId, paymentUrl: res.paymentUrl };
}
