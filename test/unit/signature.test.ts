import { describe, it, expect } from "vitest";
import { createHash } from "crypto";
import { verifySignature } from "@/lib/midtrans/signature";

// Kunci HARUS sama dengan vitest.config.ts (env.MIDTRANS_SERVER_KEY), ditangkap config.ts
// saat module load. Signature = SHA512(orderId + statusCode + grossAmount + serverKey).
const KEY = "TEST-SERVER-KEY";
const sign = (o: string, s: string, g: string) =>
  createHash("sha512").update(o + s + g + KEY).digest("hex");

describe("verifySignature (webhook forgery guard)", () => {
  it("menerima signature yang benar", () => {
    expect(
      verifySignature({ orderId: "MB-x-1", statusCode: "200", grossAmount: "29000", signatureKey: sign("MB-x-1", "200", "29000") }),
    ).toBe(true);
  });

  it("menolak nominal yang diubah (tanda tangan lama)", () => {
    expect(
      verifySignature({ orderId: "MB-x-1", statusCode: "200", grossAmount: "1000", signatureKey: sign("MB-x-1", "200", "29000") }),
    ).toBe(false);
  });

  it("menolak orderId yang diubah", () => {
    expect(
      verifySignature({ orderId: "MB-evil", statusCode: "200", grossAmount: "29000", signatureKey: sign("MB-x-1", "200", "29000") }),
    ).toBe(false);
  });

  it("menolak signature kosong tanpa throw", () => {
    expect(
      verifySignature({ orderId: "MB-x-1", statusCode: "200", grossAmount: "29000", signatureKey: "" }),
    ).toBe(false);
  });

  it("menolak signature pendek (beda panjang) tanpa throw", () => {
    expect(
      verifySignature({ orderId: "MB-x-1", statusCode: "200", grossAmount: "29000", signatureKey: "short" }),
    ).toBe(false);
  });

  it("case-sensitive (hex huruf besar ditolak)", () => {
    expect(
      verifySignature({ orderId: "MB-x-1", statusCode: "200", grossAmount: "29000", signatureKey: sign("MB-x-1", "200", "29000").toUpperCase() }),
    ).toBe(false);
  });
});
