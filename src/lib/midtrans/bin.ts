import { API_BASE, authHeader, isConfigured } from "./config";

// BIN API Midtrans: metadata kartu dari 6-8 digit awal (BIN/IIN) — jaringan (brand), tipe
// (credit/debit), dan BANK PENERBIT. Sumber data dari principal kartu; per docs Midtrans nilai
// bisa berubah/kosong, jadi HANYA untuk tampilan/advisory, bukan validasi. Rate limit Midtrans
// 100 req/menit. Dipanggil SERVER (proxy) supaya kunci tak bocor ke browser.
// Ref: https://docs.midtrans.com/reference/bin-api

export type BinInfo = {
  bank: string | null; // nama bank penerbit (mis. "Bank Central Asia")
  bankCode: string | null; // slug bank kanonik utk logo (mis. "bca"), atau null bila tak dikenal
  brand: string | null; // jaringan (visa/mastercard/…)
  binType: string | null; // credit | debit
  countryCode: string | null;
};

// Slug bank yang punya aset logo (idn-finlogos). HANYA bank ini yang menampilkan logo di kartu.
const KNOWN_BANK_SLUGS = ["bca", "bni", "bri", "cimb", "mandiri", "permata"] as const;

// Petakan bank_code + nama bank dari BIN API ke slug logo kanonik. bank_code Midtrans tak selalu
// sama dgn slug aset kita (mis. Mandiri bisa "bmri"), dan nilainya advisory/bisa berubah — jadi
// cocokkan dari KEDUA sumber (kode & nama) supaya logo tetap tepat. Tak cocok -> null (tanpa logo).
function canonicalBankSlug(rawCode: string | null | undefined, rawName: string | null | undefined): string | null {
  const code = (rawCode ?? "").toLowerCase().trim();
  const name = (rawName ?? "").toLowerCase().trim();
  const hay = `${code} ${name}`;
  if (code && (KNOWN_BANK_SLUGS as readonly string[]).includes(code)) return code;
  if (/\bcimb\b|niaga/.test(hay)) return "cimb";
  if (/permata|\bbnp\b/.test(hay)) return "permata";
  if (/mandiri|\bbmri\b/.test(hay)) return "mandiri";
  if (/central asia|\bbca\b/.test(hay)) return "bca";
  if (/rakyat indonesia|\bbri\b/.test(hay)) return "bri";
  if (/negara indonesia|\bbni\b/.test(hay)) return "bni";
  return null;
}

// Rapikan nama bank dari BIN API (kadang lowercase, mis. "bank central asia") -> Title Case,
// dengan akronim umum dipertahankan huruf besar.
const ACRONYMS = new Set(["bca", "bni", "bri", "cimb", "uob", "ocbc", "dbs", "hsbc", "btn", "bsi"]);
function titleizeBank(raw: string): string {
  return raw
    .trim()
    .split(/\s+/)
    .map((w) => {
      const lower = w.toLowerCase();
      if (ACRONYMS.has(lower)) return w.toUpperCase();
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join(" ");
}

export async function lookupBin(bin: string): Promise<BinInfo | null> {
  const digits = bin.replace(/\D/g, "");
  if (!isConfigured() || digits.length < 6) return null;
  try {
    const res = await fetch(`${API_BASE}/v1/bins/${encodeURIComponent(digits.slice(0, 8))}`, {
      method: "GET",
      headers: { Accept: "application/json", Authorization: authHeader() },
      // Advisory-only + dipanggil di jalur panas webhook: jangan biarkan BIN API yang
      // menggantung menahan ACK webhook. Timeout -> AbortError -> catch -> null (aman).
      signal: AbortSignal.timeout(2500),
    });
    if (!res.ok) return null;
    const j = (await res.json()) as {
      data?: {
        bank?: string;
        bank_code?: string;
        brand?: string;
        bin_type?: string;
        country_code?: string;
      };
    };
    const d = j.data;
    if (!d) return null;
    return {
      bank: d.bank ? titleizeBank(d.bank) : null,
      bankCode: canonicalBankSlug(d.bank_code, d.bank),
      brand: d.brand ? d.brand.toLowerCase() : null,
      binType: d.bin_type ? d.bin_type.toLowerCase() : null,
      countryCode: d.country_code ?? null,
    };
  } catch {
    return null;
  }
}
