import type { Testimonial } from "@/components/auth/auth-ui";

// Testimoni asli dari website utama Acme (directus-acme berandaData.ts).
export const ACME_TESTIMONIALS: Testimonial[] = [
  {
    avatarSrc: "https://picsum.photos/seed/acme-testi-aidah/160/160",
    name: "Aidah",
    handle: "Ilmu Komunikasi · Contoh University",
    text: "Next aku bakal konsul tugas ke sini lagi. Penjelasannya jelas dan bikin aku benar-benar paham. Acme mantap banget!",
  },
  {
    avatarSrc: "https://picsum.photos/seed/acme-testi-kinan/160/160",
    name: "Kinan",
    handle: "Psikologi · Contoh University",
    text: "Pelayanannya cepat, hasilnya rapi, bahasanya sesuai request. Membantu banget pas mepet deadline. Worth it!",
  },
  {
    avatarSrc: "https://picsum.photos/seed/acme-testi-anin/160/160",
    name: "Anin",
    handle: "Ilmu Komunikasi · Contoh University",
    text: "Pelayanannya mantap! Respon cepat, enak diajak diskusi, dan semua kebingungan dijelaskan dengan jelas.",
  },
];

// Ambil n testimoni acak (deterministik per-seed agar SSR/CSR konsisten).
export function pickTestimonials(seed: number, n = 3): Testimonial[] {
  const arr = [...ACME_TESTIMONIALS];
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
