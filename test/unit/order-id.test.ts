import { describe, it, expect } from "vitest";
import { newOrderId } from "@/lib/order-id";

describe("newOrderId (unguessable order id)", () => {
  it("format standar: MB-<hint>-<ts36>-<rand10hex>", () => {
    expect(newOrderId("mbg-forge")).toMatch(/^MB-mbg-forge-[0-9a-z]+-[0-9a-f]{10}$/);
  });

  it("mensanitasi hint (lowercase, non-alnum -> '-', potong 12)", () => {
    expect(newOrderId("MBG Forge!! 2025")).toMatch(/^MB-mbg-forge-20-[0-9a-z]+-[0-9a-f]{10}$/);
  });

  it("hint kosong -> tanpa segmen hint kosong (tak ada 'MB--')", () => {
    const id = newOrderId("!!!");
    expect(id).toMatch(/^MB-[0-9a-z]+-[0-9a-f]{10}$/);
    expect(id).not.toContain("MB--");
  });

  it("selalu <= 50 karакter (batas Midtrans)", () => {
    const id = newOrderId("a".repeat(40));
    expect(id.length).toBeLessThanOrEqual(50);
  });

  it("hanya karakter yang diizinkan Midtrans", () => {
    expect(newOrderId("event-x")).toMatch(/^[A-Za-z0-9\-_.:]+$/);
  });

  it("tak-tertebak: 1000 id semuanya unik", () => {
    const set = new Set(Array.from({ length: 1000 }, () => newOrderId("x")));
    expect(set.size).toBe(1000);
  });
});
