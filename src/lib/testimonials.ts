import type { Testimonial } from "@/components/auth/auth-ui";

// Testimoni asli dari website utama Maubisa (directus-maubisa berandaData.ts).
export const MAUBISA_TESTIMONIALS: Testimonial[] = [
  {
    name: "Aidah",
    handle: "Ilmu Komunikasi · Untirta",
    text: "Next aku bakal konsul tugas ke sini lagi. Penjelasannya jelas dan bikin aku benar-benar paham. Maubisa mantap banget!",
  },
  {
    name: "Kinan",
    handle: "Psikologi · UBP Karawang",
    text: "Pelayanannya cepat, hasilnya rapi, bahasanya sesuai request. Membantu banget pas mepet deadline. Worth it!",
  },
  {
    name: "Anin",
    handle: "Ilmu Komunikasi · Untirta",
    text: "Pelayanannya mantap! Respon cepat, enak diajak diskusi, dan semua kebingungan dijelaskan dengan jelas.",
  },
];

// Ambil n testimoni acak (deterministik per-seed agar SSR/CSR konsisten).
export function pickTestimonials(seed: number, n = 3): Testimonial[] {
  const arr = [...MAUBISA_TESTIMONIALS];
  // Fisher-Yates dengan PRNG sederhana berbasis seed (stabil).
  let s = seed || 1;
  const rand = () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.slice(0, n);
}
