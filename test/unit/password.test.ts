import { describe, it, expect } from "vitest";
import { scorePassword, PASSWORD_MIN } from "../../src/lib/password";
import { suggestEmail } from "../../src/lib/email-hint";

describe("scorePassword", () => {
  it("menolak kata sandi umum/lemah walau panjang cukup", () => {
    for (const weak of ["password123", "12345678", "qwerty123", "abcd1234"]) {
      expect(scorePassword(weak).ok, weak).toBe(false);
    }
  });

  it("menolak yang lebih pendek dari minimum", () => {
    const r = scorePassword("Ab1!x");
    expect(r.ok).toBe(false);
    expect(r.hint).toMatch(new RegExp(String(PASSWORD_MIN)));
  });

  it("menolak satu jenis karakter saja (huruf kecil semua)", () => {
    expect(scorePassword("rahasiaku").ok).toBe(false);
  });

  it("menolak pengulangan dan urutan sederhana", () => {
    expect(scorePassword("aaaaaaaa").ok).toBe(false);
    expect(scorePassword("abcdefgh").ok).toBe(false);
  });

  it("menolak sandi yang memuat nama/email pengguna", () => {
    expect(scorePassword("Budi#2026aman", ["budi", "santoso"]).ok).toBe(false);
  });

  it("menerima campuran tiga jenis karakter dengan panjang cukup", () => {
    expect(scorePassword("Rumah123").ok).toBe(true);
  });

  it("menerima frasa-sandi yang panjang", () => {
    const r = scorePassword("kucing makan ikan");
    expect(r.ok).toBe(true);
    expect(r.score).toBeGreaterThanOrEqual(3);
  });

  it("mengembalikan skor 0 untuk string kosong tanpa hint", () => {
    const r = scorePassword("");
    expect(r.score).toBe(0);
    expect(r.hint).toBeNull();
  });
});

describe("suggestEmail", () => {
  it("menyarankan koreksi typo domain populer", () => {
    expect(suggestEmail("budi@gmial.com")).toBe("budi@gmail.com");
    expect(suggestEmail("a@yaho.com")).toBe("a@yahoo.com");
    expect(suggestEmail("y@hotmial.com")).toBe("y@hotmail.com");
  });

  it("tidak menyarankan apa pun untuk domain yang sudah benar / tak dikenal", () => {
    expect(suggestEmail("x@gmail.com")).toBeNull();
    expect(suggestEmail("z@company.co.id")).toBeNull();
    expect(suggestEmail("tanpa-at")).toBeNull();
  });
});
