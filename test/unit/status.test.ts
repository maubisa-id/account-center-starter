import { describe, it, expect } from "vitest";
import { resolveStatus } from "@/lib/midtrans/status";

// Pemetaan status Midtrans -> status invoice internal (kritis: salah = uang/akses salah).
describe("resolveStatus (money-critical mapping)", () => {
  const cases: [string, string | null | undefined, string][] = [
    ["capture", "accept", "paid"],
    ["capture", undefined, "paid"],
    ["capture", "challenge", "pending"],
    ["capture", "deny", "failed"],
    ["settlement", null, "paid"],
    ["settlement", "challenge", "paid"], // settlement mengabaikan fraud_status
    ["authorize", null, "pending"],
    ["pending", null, "pending"],
    ["deny", null, "failed"],
    ["failure", null, "failed"],
    ["expire", null, "expired"],
    ["cancel", null, "cancelled"],
    ["refund", null, "refunded"],
    ["partial_refund", null, "refunded"],
    ["", null, "pending"], // fail-safe default
    ["weird", null, "pending"],
  ];
  it.each(cases)("%s / %s -> %s", (tx, fraud, expected) => {
    expect(resolveStatus(tx, fraud)).toBe(expected);
  });
});
