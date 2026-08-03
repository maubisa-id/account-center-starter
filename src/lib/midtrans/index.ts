// Titik masuk publik modul Midtrans (Core API). Konsumen SERVER (route handler,
// webhook) mengimpor dari sini. Komponen KLIEN cukup mengimpor submodul aman-klien
// `@/lib/midtrans/methods` dan `@/lib/midtrans/types` (tanpa kode server/crypto).

export {
  MIDTRANS_IS_PRODUCTION,
  MIDTRANS_CLIENT_KEY,
  API_BASE,
  isConfigured,
  finishRedirectUrl,
} from "./config";

export { verifySignature } from "./signature";
export { resolveStatus, fetchTransactionStatus, cancelTransaction, type InvoiceStatus } from "./status";
export { lookupBin, type BinInfo } from "./bin";
export { charge, type ChargeParams, type ChargeResult } from "./charge";
export {
  createSubscription,
  disableSubscription,
  enableSubscription,
  cancelSubscription,
  getSubscription,
  type CreateSubscriptionParams,
  type SubscriptionResult,
} from "./subscription";
export { createPaymentLink, type CreatePaymentLinkParams, type PaymentLinkResult } from "./payment-link";
export {
  PAY_METHODS,
  getMethod,
  isValidMethod,
  methodLabel,
  type PayMethodMeta,
} from "./methods";
export type { PayMethodId, PayCategory, PaymentDisplay, PaymentInstruction } from "./types";
