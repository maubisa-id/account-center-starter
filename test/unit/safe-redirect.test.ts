import { describe, it, expect } from "vitest";
import { safeInternalPath } from "@/lib/safe-redirect";

const FB = "/dash";

describe("safeInternalPath (open-redirect guard)", () => {
  it("mengizinkan path internal biasa", () => {
    expect(safeInternalPath("/akun/tagihan", FB)).toBe("/akun/tagihan");
  });

  it("mengizinkan path + query berisi ':'", () => {
    expect(safeInternalPath("/bayar/selesai?order_id=x:y", FB)).toBe("/bayar/selesai?order_id=x:y");
  });

  it("mengizinkan fragment", () => {
    expect(safeInternalPath("/pengaturan#atas", FB)).toBe("/pengaturan#atas");
  });

  it.each([
    ["null", null],
    ["undefined", undefined],
    ["kosong", ""],
    ["spasi", "   "],
    ["URL absolut", "https://evil.com"],
    ["protocol-relative", "//evil.com"],
    ["backslash trick", "/\\evil.com"],
    ["javascript scheme", "javascript:alert(1)"],
    ["scheme di segmen path", "/x:y"],
    ["tanpa leading slash", "akun"],
    ["control char newline", "/foo\nbar"],
    ["control char null", "/foo\u0000"],
    ["control char DEL", "/foo\u007f"],
  ])("menolak %s -> fallback", (_label, input) => {
    expect(safeInternalPath(input as string | null | undefined, FB)).toBe(FB);
  });
});
