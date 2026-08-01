import { describe, it, expect } from "vitest";
import { packGuestField3, parseGuestFields } from "@/lib/guest-order";

// Round-trip identitas tamu lewat Midtrans custom_field (di-echo di webhook). Salah = akses
// bisa ke-bind ke email yang salah; separator "::" harus dinetralkan.
describe("guest custom_field pack/parse", () => {
  it("normal: name + phone", () => {
    const packed = packGuestField3("Budi", "0812");
    expect(packed).toBe("Budi::0812");
    expect(parseGuestFields({ custom_field1: "budi@x.com", custom_field2: "mbg-forge", custom_field3: packed }))
      .toEqual({ email: "budi@x.com", itemRef: "mbg-forge", name: "Budi", phone: "0812" });
  });

  it("tanpa phone -> phone null", () => {
    const packed = packGuestField3("Budi", null);
    expect(packed).toBe("Budi::");
    const r = parseGuestFields({ custom_field1: "b@x.com", custom_field2: "ref", custom_field3: packed });
    expect(r?.phone).toBeNull();
    expect(r?.name).toBe("Budi");
  });

  it("separator '::' di nama dinetralkan jadi ':'", () => {
    const packed = packGuestField3("A::B", "0812");
    expect(packed).toBe("A:B::0812");
    const r = parseGuestFields({ custom_field1: "a@x.com", custom_field2: "ref", custom_field3: packed });
    expect(r).toEqual({ email: "a@x.com", itemRef: "ref", name: "A:B", phone: "0812" });
  });

  it("email di-lowercase + trim", () => {
    const r = parseGuestFields({ custom_field1: "  JOE@X.COM ", custom_field2: "ref", custom_field3: "Joe::0812" });
    expect(r?.email).toBe("joe@x.com");
  });

  it("nama kosong -> pakai bagian lokal email", () => {
    const r = parseGuestFields({ custom_field1: "joe@x.com", custom_field2: "ref", custom_field3: "::0812" });
    expect(r?.name).toBe("joe");
    expect(r?.phone).toBe("0812");
  });

  it("email tak ada -> null (tak boleh proses)", () => {
    expect(parseGuestFields({ custom_field1: "", custom_field2: "ref", custom_field3: "Budi::0812" })).toBeNull();
  });

  it("itemRef tak ada -> null", () => {
    expect(parseGuestFields({ custom_field1: "joe@x.com", custom_field2: "", custom_field3: "Budi" })).toBeNull();
  });

  it("cf3 tanpa separator -> name saja, phone null", () => {
    const r = parseGuestFields({ custom_field1: "joe@x.com", custom_field2: "ref", custom_field3: "Budi" });
    expect(r).toEqual({ email: "joe@x.com", itemRef: "ref", name: "Budi", phone: null });
  });
});
