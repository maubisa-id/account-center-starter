import { describe, it, expect, beforeEach } from "vitest";
import {
  captureDemoEmail,
  listDemoEmails,
  getDemoEmail,
  clearDemoEmails,
  maskEmail,
} from "@/lib/demo/mailbox";

describe("demo mailbox (in-memory)", () => {
  beforeEach(() => clearDemoEmails());

  it("menyimpan email, terbaru di atas", () => {
    captureDemoEmail({ to: "a@contoh.id", subject: "Satu", html: "<p>1</p>" });
    captureDemoEmail({ to: "b@contoh.id", subject: "Dua", html: "<p>2</p>" });
    const list = listDemoEmails();
    expect(list).toHaveLength(2);
    expect(list[0].subject).toBe("Dua"); // unshift -> terbaru pertama
  });

  it("bisa diambil per id lalu dikosongkan", () => {
    const item = captureDemoEmail({ to: "c@contoh.id", subject: "Halo", html: "<b>hi</b>" });
    expect(getDemoEmail(item.id)?.html).toBe("<b>hi</b>");
    clearDemoEmails();
    expect(listDemoEmails()).toHaveLength(0);
    expect(getDemoEmail(item.id)).toBeUndefined();
  });

  it("membatasi kapasitas (ring buffer) di 50", () => {
    for (let i = 0; i < 60; i++) captureDemoEmail({ to: "x@contoh.id", subject: `#${i}`, html: "x" });
    expect(listDemoEmails()).toHaveLength(50);
    expect(listDemoEmails()[0].subject).toBe("#59"); // yang terbaru tetap ada
  });

  it("maskEmail menyamarkan bagian lokal", () => {
    expect(maskEmail("budi@contoh.id")).toBe("b***@contoh.id");
    expect(maskEmail("a@b.co")).toBe("a*@b.co");
    expect(maskEmail("tanpa-at")).toBe("tanpa-at");
  });
});
