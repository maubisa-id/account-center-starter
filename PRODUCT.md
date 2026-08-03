# PRODUCT.md - Maubisa Pusat Akun (Account Center)

> Konteks produk yang stabil untuk kerja desain. Init hanya mencatat kebenaran produk;
> DESIGN.md mengatur semua keputusan visual. Jaga dokumen ini tetap singkat dan stabil,
> bukan peta jalan.

> [!NOTE]
> **Template starter?** Dokumen ini adalah konteks produk **Maubisa**, dipakai sebagai
> contoh nyata. Saat melakukan fork, ganti bagian "Apa ini", audiens/persona, dan
> kepribadian brand dengan milik Anda. Ini bukan spesifikasi wajib; dokumen ini memberi konteks
> agar keputusan desain (DESIGN.md) konsisten.

## Apa ini

**Maubisa Pusat Akun** (`akun.maubisa.id`) adalah pusat akun self-service untuk pengguna
yang sudah login di **Maubisa** (PT Litera Edu Solusi / MBG - Maubisa Beyond Growth), sebuah
EdTech Indonesia. Layanan ini juga menjadi **layanan checkout tunggal** untuk seluruh
ekosistem Maubisa (web utama Astro, app, kelas): guest `/beli`, logged-in `/checkout`,
resume `/bayar/[orderId]`. Hanya webhook Midtrans yang mengaktifkan akses (idempotent +
signature-verified).

Pelanggan mengelola: langganan (MBG+), pembelian satu kali, webinar/acara berbayar (MBG
Forge), acara gratis (MBG Space), pembayaran & invoice, access/entitlements, notifikasi
(email + saluran), keamanan (2FA/TOTP + sessions), metode pembayaran tersimpan, dan profil.

## Siapa yang dilayani (audiens)

- **Rina** - mahasiswa tingkat akhir yang butuh **bimbingan skripsi/tesis**. Cemas soal
  deadline, sensitif harga, sering mengakses lewat HP (mobile-4G). Butuh langkah yang jelas
  dan rasa tenang.
- **Damar** - fresh-grad / profesional muda untuk **pengembangan diri & karier**. Returning
  user, buru-buru, mobile-first, menghargai proses yang cepat dan jelas.
- **Bu Sari** - profesional yang ingin **sertifikasi keahlian**. Skeptis, sudah melihat
  banyak SaaS rapi; menilai kredibilitas sebelum membayar.

## Kepribadian brand

Hangat, kredibel, tidak terburu-buru, seperti mentor. Menggunakan **Bahasa Indonesia** yang
santai dan hangat. Kepercayaan dan rasa aman pada titik pembayaran dan keamanan adalah janji
inti brand yang menjadi batasan bagi sistem visual (lihat DESIGN.md North Star "Ruang Belajar
yang Tenang").

## Mode

**Operate** (task-completion). Kemudahan dipindai, konsistensi, pola native yang diharapkan,
dan rasa yakin pada momen penting lebih utama daripada ekspresi visual. Checkout adalah satu
tempat yang juga memiliki tugas **Persuade** ringan: guest dapat masuk ke `/beli` dari iklan
tanpa pernah melihat situs utama, jadi halaman itu harus membangun kepercayaan sendiri.

## Platform & stack

Web (Next.js 16 App Router, React 19, Tailwind v4, Prisma 6, Better Auth). Hanya light theme.
Pembayaran melalui **Midtrans Core API** (UI dengan brand sendiri): QRIS, GoPay, ShopeePay,
Virtual Account (BCA/BNI/BRI/Permata/CIMB), Mandiri Bill, Card 3DS; Subscription API +
Payment Link.

## Hal yang tidak bisa ditawar

- **Money is server-authoritative.** Harga tidak pernah dipercaya dari client/URL; harga
  selalu dihitung ulang server-side. Akses hanya diberikan oleh webhook yang terverifikasi.
- **Accessibility:** WCAG AA (contrast ≥4.5:1 untuk body text, fokus keyboard terlihat,
  controls berlabel, reduced-motion dihormati).
- **Mobile-first:** persona utama memakai ponsel; tidak ada tindakan utama yang boleh
  tersembunyi di balik horizontal scroll.
