"use client";

export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex items-center gap-2 rounded-full bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white shadow-brand transition-colors hover:bg-brand-600"
    >
      Cetak / Simpan PDF
    </button>
  );
}
