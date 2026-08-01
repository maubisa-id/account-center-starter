# PRODUCT.md — Maubisa Pusat Akun (Account Center)

> Durable product context for design work. Init captures product truth only; DESIGN.md owns
> every visual decision. Keep this short and stable — not a roadmap.

> [!NOTE]
> **Template starter?** Dokumen ini adalah konteks produk **Maubisa** — dipakai sebagai
> contoh nyata. Saat mem-fork, ganti bagian "What it is", audiens/persona, dan brand
> personality dengan milik Anda. Ini bukan spesifikasi wajib; ia memberi konteks agar
> keputusan desain (DESIGN.md) konsisten.

## What it is

**Maubisa Pusat Akun** (`akun.maubisa.id`) is the logged-in self-service account center for
**Maubisa** (PT Litera Edu Solusi / MBG — Maubisa Beyond Growth), an Indonesian EdTech. It is
also the **single checkout service** for the whole Maubisa ecosystem (web utama Astro, app,
kelas): guest `/beli`, logged-in `/checkout`, resume `/bayar/[orderId]`. Only the Midtrans
webhook activates access (idempotent + signature-verified).

Customers manage: subscription (MBG+), one-time purchases, paid webinars/events (MBG Forge),
free events (MBG Space), payments & invoices, access/entitlements, notifications (email +
saluran), security (2FA/TOTP + sessions), saved payment methods, and profile.

## Who it serves (audience)

- **Rina** — mahasiswa tingkat akhir yang butuh **bimbingan skripsi/tesis**. Cemas soal deadline,
  sensitif harga, sering mengakses lewat HP (mobile-4G). Butuh kejelasan langkah & ketenangan.
- **Damar** — fresh-grad / profesional muda untuk **pengembangan diri & karier**. Returning user,
  buru-buru, mobile-first, menghargai efisiensi.
- **Bu Sari** — profesional yang ingin **sertifikasi keahlian**. Skeptis, sudah melihat banyak
  SaaS rapi; menilai kredibilitas sebelum membayar.

## Brand personality

Warm, credible, unhurried, mentor-like. Speaks informal-warm **Bahasa Indonesia**. Trust and
reassurance at money/security moments are core brand promises that constrain the visual system
(see DESIGN.md North Star "Ruang Belajar yang Tenang").

## Mode

**Operate** (task-completion). Scanability, consistency, native expectations, and confidence at
high-stakes moments outrank visual expression. Checkout is the one place that also carries a
light **Persuade** duty: a guest may land on `/beli` from an ad without ever seeing the main
site, so it must earn trust on its own.

## Platform & stack

Web (Next.js 16 App Router, React 19, Tailwind v4, Prisma 6, Better Auth). Light theme only.
Payments via **Midtrans Core API** (custom-branded UI): QRIS, GoPay, ShopeePay, Virtual Account
(BCA/BNI/BRI/Permata/CIMB), Mandiri Bill, Card 3DS; Subscription API + Payment Link.

## Non-negotiables

- **Money is server-authoritative.** Prices are never trusted from the client/URL; always
  re-resolved server-side. Access is granted only by the verified webhook.
- **Accessibility:** WCAG AA (contrast ≥4.5:1 body text, visible keyboard focus, labelled
  controls, reduced-motion honored).
- **Mobile-first:** core personas are on phones; no primary action may hide behind horizontal
  scroll.
