import { describe, it, expect } from "vitest";
import { isValidEmail } from "@/lib/is-email";

describe("isValidEmail (linear, ReDoS-safe)", () => {
  it("menerima email wajar", () => {
    for (const e of ["a@b.co", "budi@example.com", "user.name+tag@sub.domain.id"]) {
      expect(isValidEmail(e)).toBe(true);
    }
  });

  it("menolak bentuk tak valid", () => {
    for (const e of [
      "",
      "  ",
      "plainaddress",
      "@no-local.com",
      "no-at.com",
      "two@@at.com",
      "a@b",
      "a@.com",
      "a@b.",
      "spa ce@b.com",
      "with\tcontrol@b.com",
    ]) {
      expect(isValidEmail(e)).toBe(false);
    }
  });

  it("memangkas spasi tepi sebelum validasi", () => {
    expect(isValidEmail("  budi@example.com  ")).toBe(true);
  });

  it("menolak email > 254 karakter", () => {
    expect(isValidEmail("a".repeat(250) + "@b.com")).toBe(false);
  });

  it("tetap cepat pada input patologis (bukti aman-ReDoS)", () => {
    const evil = "a".repeat(50000); // tanpa '@' — dulu memicu backtracking polinomial
    const start = performance.now();
    expect(isValidEmail(evil)).toBe(false);
    expect(performance.now() - start).toBeLessThan(50);
  });
});
