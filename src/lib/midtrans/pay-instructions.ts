import type { PayMethodId } from "./types";

// Petunjuk transfer per bank (Virtual Account) & Mandiri Bill, dikelompokkan per kanal
// (mBanking / iBanking / ATM) seperti halaman pembayaran e-commerce. Framework-agnostic:
// dipakai komponen accordion di halaman instruksi bayar. `{va}` diganti nomor VA saat render.

export type Guide = { channel: string; steps: string[] };

// CATATAN AGREGATOR: pembayaran diproses lewat Midtrans (payment gateway). Nomor
// Virtual Account bukan rekening pribadi/perusahaan Maubisa — VA diterbitkan bank
// atas nama sistem Midtrans. Karena itu petunjuk TIDAK menyuruh mencocokkan "penerima
// = Maubisa" (nama yang tampil mengikuti sistem gateway, bisa berbeda per bank); yang
// wajib dicek pembeli adalah NOMINAL/total tagihan dan nomor VA yang dimasukkan.

// Langkah generik VA (dipakai bank yang polanya mirip), tinggal sesuaikan nama menu.
function vaGeneric(opts: {
  bankName: string;
  mbankingMenu: string; // mis. "m-Transfer > BCA Virtual Account"
  ibankingMenu: string;
  atmMenu: string; // mis. "Transaksi Lainnya > Transfer > ke Rek BCA Virtual Account"
}): Guide[] {
  return [
    {
      channel: `Mobile Banking ${opts.bankName}`,
      steps: [
        `Buka aplikasi mobile banking ${opts.bankName}, lalu login.`,
        `Pilih menu ${opts.mbankingMenu}.`,
        "Masukkan nomor Virtual Account {va}.",
        "Periksa total tagihan sudah sesuai, lalu lanjutkan.",
        "Masukkan PIN/kata sandi untuk konfirmasi. Simpan bukti transaksi.",
      ],
    },
    {
      channel: `Internet Banking ${opts.bankName}`,
      steps: [
        `Login internet banking ${opts.bankName}.`,
        `Pilih ${opts.ibankingMenu}.`,
        "Masukkan nomor Virtual Account {va} sebagai nomor tujuan.",
        "Pastikan nominal tagihan benar, lalu konfirmasi dengan token/OTP.",
      ],
    },
    {
      channel: `ATM ${opts.bankName}`,
      steps: [
        `Masukkan kartu ATM & PIN di mesin ATM ${opts.bankName}.`,
        `Pilih ${opts.atmMenu}.`,
        "Masukkan nomor Virtual Account {va}.",
        "Periksa nominal pada layar, lalu konfirmasi. Ambil struk sebagai bukti.",
      ],
    },
  ];
}

const GUIDES: Partial<Record<PayMethodId, Guide[]>> = {
  bca: vaGeneric({
    bankName: "BCA",
    mbankingMenu: "m-Transfer > BCA Virtual Account",
    ibankingMenu: "Transfer > BCA Virtual Account",
    atmMenu: "Transaksi Lainnya > Transfer > ke Rekening BCA Virtual Account",
  }),
  bni: vaGeneric({
    bankName: "BNI",
    mbankingMenu: "Transfer > Virtual Account Billing",
    ibankingMenu: "Transfer > Virtual Account Billing",
    atmMenu: "Menu Lainnya > Transfer > Rekening Tabungan > ke Virtual Account",
  }),
  bri: vaGeneric({
    bankName: "BRI",
    mbankingMenu: "Pembayaran > BRIVA",
    ibankingMenu: "Pembayaran > BRIVA",
    atmMenu: "Transaksi Lain > Pembayaran > Lainnya > BRIVA",
  }),
  cimb: vaGeneric({
    bankName: "CIMB Niaga",
    mbankingMenu: "Transfer > Virtual Account (OCTO Mobile)",
    ibankingMenu: "Bayar Tagihan > Virtual Account",
    atmMenu: "Pembayaran > Virtual Account",
  }),
  permata: vaGeneric({
    bankName: "Permata",
    mbankingMenu: "Pembayaran > Virtual Account (PermataMobile X)",
    ibankingMenu: "Pembayaran Tagihan > Virtual Account",
    atmMenu: "Transaksi Lainnya > Pembayaran > Pembayaran Lainnya > Virtual Account",
  }),
  // Mandiri Bill Payment memakai kode perusahaan (biller) + kode bayar (bill key),
  // bukan nomor VA. {biller} & {billkey} diganti saat render.
  mandiri: [
    {
      channel: "Livin' by Mandiri",
      steps: [
        "Buka aplikasi Livin' by Mandiri, lalu login.",
        "Pilih menu Bayar, lalu cari kategori Multipayment / e-Commerce.",
        "Masukkan kode perusahaan (biller) {biller}.",
        "Masukkan kode bayar (bill key) {billkey} sebagai nomor pembayaran.",
        "Periksa total tagihan sudah sesuai, lalu konfirmasi dengan PIN.",
      ],
    },
    {
      channel: "ATM Mandiri",
      steps: [
        "Masukkan kartu ATM & PIN Mandiri.",
        "Pilih Bayar/Beli > Multipayment.",
        "Masukkan kode perusahaan (biller) {biller}.",
        "Masukkan kode bayar (bill key) {billkey}, lalu pilih benar.",
        "Periksa nominal pada layar, konfirmasi, dan ambil struk sebagai bukti.",
      ],
    },
    {
      channel: "Internet Banking Mandiri",
      steps: [
        "Login ke internet banking Mandiri.",
        "Pilih Pembayaran > Multipayment.",
        "Pilih penyedia jasa dengan kode perusahaan {biller}.",
        "Masukkan kode bayar (bill key) {billkey}, lalu konfirmasi dengan token/MToken.",
      ],
    },
  ],
};

// Ambil petunjuk untuk metode + isi placeholder nomor VA / biller / bill key.
export function getPaymentGuides(
  method: PayMethodId,
  vals: { va?: string; biller?: string; billkey?: string },
): Guide[] {
  const guides = GUIDES[method];
  if (!guides) return [];
  const fill = (s: string) =>
    s
      .replace(/\{va}/g, vals.va ?? "-")
      .replace(/\{biller}/g, vals.biller ?? "-")
      .replace(/\{billkey}/g, vals.billkey ?? "-");
  return guides.map((g) => ({ channel: g.channel, steps: g.steps.map(fill) }));
}
