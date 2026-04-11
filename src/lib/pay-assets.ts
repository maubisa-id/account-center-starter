// URL ikon pembayaran: metode (QRIS/GoPay/ShopeePay/VA), jaringan kartu (Visa/MC/…),
// dan logo bank penerbit di kartu. Aset statis yang SAMA dipakai lintas app.
//
// Default = lokal /pay (aset ikut di public/pay/). Untuk melayani dari CDN/bucket
// (mis. hindari optimizer atau berbagi antar app), set NEXT_PUBLIC_PAY_ICON_BASE ke
// base URL bucket kamu. Kosong -> pakai /pay lokal.
const PAY_BASE = (process.env.NEXT_PUBLIC_PAY_ICON_BASE || "/pay").replace(/\/+$/, "");

// payIcon("qris.png") atau payIcon("/pay/qris.png") -> "<base>/qris.png".
export function payIcon(file: string): string {
  const name = file.replace(/^\/?(pay\/)?/, "");
  return `${PAY_BASE}/${name}`;
}

// Logo bank PENERBIT kartu (dari BIN) — aset di subfolder "logo-bank/" (mis. bca.svg).
// Default = lokal /pay (taruh SVG bank di public/pay/ atau bucket). Override via
// NEXT_PUBLIC_BANK_LOGO_BASE untuk melayani dari CDN/bucket. Bank tanpa aset -> tak tampil.
const BANK_LOGO_BASE = (process.env.NEXT_PUBLIC_BANK_LOGO_BASE || "/pay").replace(/\/+$/, "");

export function bankLogo(slug: string): string {
  return `${BANK_LOGO_BASE}/${slug}.svg`;
}
