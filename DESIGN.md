---
# DESIGN.md - machine-readable design tokens (normative).
# Prose below provides context for how to apply them.
colors:
  canvas: "#faf8f5"
  cream-100: "#f5f1ea"
  cream-200: "#ece5d9"
  white: "#ffffff"
  ink: "#141414"
  ink-soft: "#3f3f46"
  muted: "#6b6b6b"
  scrim: "rgba(15, 23, 42, 0.14)"
  scrim-strong: "rgba(15, 23, 42, 0.26)"
  brand-50: "#eef4fe"
  brand-100: "#dbe6fb"
  brand-200: "#b6ccf6"
  brand-300: "#7f9ff0"
  brand-400: "#3f6be0"
  brand-500: "#0a48b7"
  brand-600: "#083a95"
  brand-700: "#062c70"
  brand-900: "#05204f"
  sky: "#419fe8"
  teal: "#5099bb"
  lime: "#9acc25"
  rose-accent: "#e61e38"
  lime-accent: "#6f9e12"
  lime-bright: "#84b81a"
typography:
  display-xl:
    fontFamily: "Cabinet Grotesk, ui-sans-serif, system-ui, sans-serif"
    fontSize: "64px"
    fontWeight: 700
    letterSpacing: "-0.02em"
  display:
    fontFamily: "Cabinet Grotesk, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(1.75rem, 4vw, 2.25rem)"
    fontWeight: 700
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "Cabinet Grotesk, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 700
    letterSpacing: "-0.02em"
  title:
    fontFamily: "Satoshi, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 700
  body-lg:
    fontFamily: "Satoshi, ui-sans-serif, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 600
  body:
    fontFamily: "Satoshi, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "Satoshi, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.6875rem"
    fontWeight: 600
    letterSpacing: "0.16em"
  label-sm:
    fontFamily: "Satoshi, ui-sans-serif, system-ui, sans-serif"
    fontSize: "10px"
    fontWeight: 700
    letterSpacing: "0.06em"
  mono:
    fontFamily: "Geist Mono, ui-monospace, SFMono-Regular, monospace"
    fontSize: "0.75rem"
rounded:
  xs: "4px"
  lg: "1rem"
  xl: "1.25rem"
  "2xl": "1.5rem"
  "3xl": "1.75rem"
  bezel: "1.75rem"
  full: "9999px"
spacing:
  page-stack: "2rem"
  card: "1.5rem"
  card-lg: "2rem"
components:
  button-primary:
    backgroundColor: "{colors.brand-500}"
    textColor: "#ffffff"
    rounded: "{rounded.full}"
  button-primary-hover:
    backgroundColor: "{colors.brand-600}"
    textColor: "#ffffff"
  button-ghost:
    backgroundColor: "#ffffff"
    textColor: "{colors.ink}"
    rounded: "{rounded.full}"
  card:
    backgroundColor: "#ffffff"
    rounded: "{rounded.3xl}"
    padding: "{spacing.card}"
  chip-selected:
    backgroundColor: "{colors.brand-50}"
    textColor: "{colors.brand-700}"
    rounded: "{rounded.full}"
---

# Design System: Maubisa Pusat Akun

## Ringkasan

**Creative North Star: "Ruang Belajar yang Tenang" (The Calm Study).** Ruang kerja yang hangat dan
tertata untuk orang yang sedang mengambil keputusan penting soal pendidikan dan kariernya:
mahasiswa tingkat akhir yang mencari bimbingan skripsi, lulusan baru yang menambah keahlian, dan
profesional yang mengejar sertifikasi. Sistem ini memadukan kanvas kertas krem dengan navy akademik
yang pekat, supaya urusan uang dan akun terasa tenang dan tepercaya, bukan kaku atau bikin cemas.

Nuansa: **hangat, kredibel, percaya diri yang kalem, tidak terburu-buru.** Rasa aman lebih penting
daripada ekspresi. Ini permukaan Operate (dashboard plus checkout), tempat kemudahan membaca,
konsistensi, dan rasa percaya di momen uang atau keamanan lebih penting daripada hiasan. Merek hidup
di detail yang presisi (kanvas kertas, sidebar navy, tipografi yang disiplin), bukan di gestur yang
ramai.

**Anti-referensi:** dashboard billing SaaS gradasi ungu yang generik, merah fintech yang agresif,
dan apa pun yang membuat mahasiswa cemas merasa diburu atau pembeli sertifikasi tidak percaya pada
halaman.

> [!NOTE]
> DESIGN.md ini diekstrak otomatis dari kode (Tailwind v4 `@theme` di `src/app/globals.css`), dan
> North Star serta karakter suaranya disimpulkan dari audiens di PRODUCT.md saat pemilik belum
> sempat mengonfirmasi penamaan kualitatifnya. Segarkan dengan `/impeccable document` untuk
> memastikan bahasa deskriptifnya.

## Warna

### Utama
- **Maubisa Blue** (`#0a48b7`, `brand-500`): satu-satunya aksen merek. Dipakai untuk tombol utama,
  tautan, state terpilih, focus ring (`brand-400`), dan **sidebar kiri** (gradasi vertikal
  `brand-500` ke `brand-700` untuk kedalaman; teks putih di level AAA, teks seksi/label minimal AA).
  Langkah terpekat `brand-900` (`#05204f`) hanya untuk heading paling dalam, bukan lagi untuk sidebar.
- Ramp penuh `brand-50` sampai `brand-900` untuk tint (latar chip terpilih `brand-50`, border hover
  `brand-300`, isian hover `brand-600`).

### Perluasan palet (keluarga merek, pakai dengan sengaja)
- **Sky** (`#419fe8`, `sky`): biru lebih terang untuk **aksen nav aktif** (ikon plus titik indikator)
  di sidebar biru, tempat biru sedang kurang menonjol.
- **Teal** (`#5099bb`, `teal`) dan **Lime** (`#9acc25`, `lime`): aksen cadangan dari palet merek
  untuk pemakaian data atau status di masa depan. Jangan disebar. Halaman tetap punya satu warna
  utama (Maubisa Blue).

### Netral
- **Paper Canvas** (`#faf8f5`, `canvas`): latar aplikasi, dilembutkan dua glow radial navy tipis yang
  terpasang di sudut atas.
- **Cream** (`#f5f1ea` dan `#ece5d9`, `cream-100/200`): field inset untuk kode atau VA, permukaan
  sekunder.
- **Ink** (`#141414`), **Ink Soft** (`#3f3f46`), dan **Muted** (`#6b6b6b`): teks primer, sekunder,
  lalu tersier. Teks isi atau pendukung di atas putih memakai `zinc-500` ke atas (minimal 4.5:1);
  simpan `zinc-400` untuk metadata dan ikon yang tidak penting saja.

### Aksen status (semantik, dipakai secukupnya)
- **Success Lime** (`#6f9e12` dan `#84b81a`): konfirmasi lunas atau aktif, "Terpopuler".
- **Danger Rose** (`#e61e38`, `rose-accent`): konfirmasi tindakan merusak (batal) dan error. Bukan
  warna dekoratif.
- Amber (`amber-50/200/600/700` dari Tailwind): nudge "menunggu pembayaran".

### Aturan Bernama
- **Satu aksen saja.** Navy adalah merek; lime, rose, dan amber adalah *status semantik*, bukan
  perluasan palet. Jangan pernah menambah warna merek kedua.
- **Jangan pernah abu-abu di atas permukaan berwarna.** Di permukaan bertint, ambil warna teks
  sekunder dari hue yang sama atau dari foreground.

## Tipografi

Tiga tipe huruf yang di-host sendiri: **Cabinet Grotesk** (display atau heading, `-0.02em`),
**Satoshi** (UI atau body), dan **Geist Mono** (order ID, nomor VA, dan angka sebagai data saja).

### Hierarki
- **Display** (Cabinet, 700, `clamp(1.75rem,4vw,2.25rem)`, rapat): hero halaman ("Halo, {nama}.").
- **Headline** (Cabinet, 700, sekitar 1.25rem): judul panel.
- **Title** (Satoshi, 700, 0.875rem): judul kartu atau seksi, nama item tabel.
- **Body** (Satoshi, 400, 0.875rem, 1.6): deskripsi, teks bantuan. Jaga lebar baris tetap nyaman
  dibaca.
- **Label** (Satoshi, 600, 0.6875rem, `0.16em`, huruf kapital): eyebrow seksi ("Ringkasan pesanan",
  "Metode pembayaran"), label statistik. Pakai `zinc-500` untuk kontras.

### Aturan Bernama
- Mono **untuk data saja** (order ID, nomor VA atau tagihan), bukan sebagai kostum "biar terlihat
  teknis".

## Tata Letak

- **Shell:** sidebar navy tetap (desktop) plus top bar berisi breadcrumb, pencarian cepat (`/`),
  notifikasi, dan profil; sebuah drawer geser menggantikan sidebar di bawah `md`.
- **Ritme konten:** seksi halaman ditumpuk `space-y-8` (`2rem`); hero ringkasan memakai `space-y-10`.
  Kartu: padding dalam `p-6` (`1.5rem`), panel besar `p-6 sm:p-8`.
- **Perilaku breakpoint:** tabel data (pembayaran, tagihan langganan) tampil sebagai tabel penuh di
  `md+` dan sebagai **InvoiceRowCard** bertumpuk di bawah `md`, jadi aksi utama tidak pernah
  tersembunyi di balik scroll horizontal.
- **Lebar maksimum:** konten dashboard sekitar `max-w-6xl`; kolom checkout `max-w-md`.

## Elevasi dan Kedalaman

Datar dengan sedikit angkatan lembut, tidak berat. Bayangan bersifat ambient (memisahkan), bukan
offset yang keras.

### Kosakata Bayangan
- **soft** (`0 1px 2px rgba(11,15,23,.05), 0 20px 45px -28px rgba(11,15,23,.28)`): kartu diam.
- **lift** (`… 0 34px 60px -30px rgba(11,15,23,.4)`): toast, popover, drawer.
- **brand** (`… 0 18px 40px -12px rgba(10,72,183,.45)`): hanya untuk CTA utama.

### Aturan Bernama
- Setiap bayangan punya offset plus blur lembut. Tidak ada bayangan blok tanpa blur, tidak ada halo
  berwarna.

## Bentuk

Sudut membulat royal, ramah tapi tidak kekanak-kanakan. Skala radius: input atau pill `rounded-2xl`
(1.5rem), kartu `rounded-3xl` (1.75rem, `bezel`), chip atau tombol `rounded-full`. Border setipis
rambut (`border-black/[0.06-0.08]`); jangan pernah border berwarna lebih dari 1px.

## Komponen

### Tombol
- **Bentuk:** `rounded-full`. Base membawa `focus-visible:ring-2 ring-brand-400 ring-offset-2`.
- **Primary:** `bg-brand-500 text-white shadow-brand`, hover `bg-brand-600 -translate-y-[1px]`,
  `active:scale-[0.98]`. Padding `py-2.5 px-5` (varian ikon `pl-5 pr-2`).
- **Ghost:** `bg-white text-ink ring-1 ring-black/[0.08] shadow-soft`, hover `bg-zinc-50`.
- **Destructive:** `bg-red-600` hover `bg-red-700`, hanya untuk pembatalan yang sudah dikonfirmasi.

### Chip
- **Chip filter atau tujuan:** `rounded-full border border-black/10 bg-white`; terpilih menjadi
  `border-brand-400 bg-brand-50 text-brand-700`. Fokus keyboard lewat `peer`/`has-[:focus-visible]`.

### Kartu dan Kontainer
- **Sudut:** `rounded-3xl`. **Latar:** putih di atas paper canvas. **Bayangan:** `soft`.
- **Border:** setipis rambut `border-black/[0.06]`. **Padding:** `p-6` (besar `p-6 sm:p-8`).

### Status Badge
- Pill dengan latar bertint plus teks bertint dari hue status yang *sama* (lime=lunas, amber=menunggu,
  rose=gagal atau batal, zinc=netral). Label dipusatkan dalam Bahasa Indonesia.

### Pola kepercayaan dan rasa aman (permukaan uang atau keamanan)
North Star-nya adalah rasa percaya yang tenang di momen penting; pola berikut yang mewujudkannya:
- **Kepercayaan mendahului keputusan.** Di checkout tamu, satu baris kepercayaan yang ringkas (ikon
  gembok, badan hukum, KOMDIGI, Midtrans 3D Secure) berada tepat di bawah ringkasan pesanan,
  *sebelum* formulir dan CTA Bayar. Tamu dari iklan harus percaya dulu sebelum berkomitmen. Blok
  lengkap "Aman & tepercaya" (poin kepercayaan plus WhatsApp) tetap di bawah untuk detail. Jangan
  pernah menaruh semua sinyal kepercayaan setelah CTA.
- **Banner status menenangkan lebih dulu.** Banner menunggu pembayaran memimpin dengan hasilnya
  ("aksesmu aktif otomatis begitu dikonfirmasi"), bukan dengan urgensi. Kontainernya membawa tint
  *status* amber; CTA-nya tetap kalem (putih plus teks amber-800), bukan tombol amber solid yang
  memancing kecemasan utang pada mahasiswa yang sudah cemas.
- **Permukaan merusak tetap diam sampai ada niat.** Baris sesi atau keamanan menjaga perangkat saat
  ini tetap primer (lime "Aktif sekarang"); aksi sekunder netral saat diam ("Akhiri sesi" dalam zinc,
  rose hanya saat hover atau konfirmasi). Rose disimpan untuk langkah konfirmasi, bukan untuk daftar
  yang diam. Dinding merah membuat perlindungan terasa seperti bahaya.
- **Konfirmasi merusak berupa modal fokus, bukan kartu inline.** Membatalkan pembayaran (layar tunggu
  checkout dan tabel pembayaran atau langganan) dikonfirmasi di `Modal` terpusat (backdrop redup,
  focus-trap, esc, scroll-lock), bukan blok merah inline yang mendorong konten. Tindakan merusak yang
  disengaja pantas mendapat fokus, dan modal tidak pernah menggeser tata letak. Konfirmasi inline
  disimpan untuk toggle kontekstual yang risikonya rendah. Satu `CancelPaymentDialog` bersama menjaga
  checkout dan tabel tetap konsisten.
- **Setiap overlay dirender lewat portal ke `document.body`.** Overlay `position:fixed` yang
  ditaruh di dalam elemen leluhur ber-`transform` (`Reveal`/`animate-rise` kami menjaga transform
  lewat fill-mode `both`) diposisikan relatif terhadap leluhur itu, bukan terhadap viewport, sehingga
  terjebak dan terpotong di dalam kartu. Semua modal atau dialog (`Modal` bersama, `AddCardDialog`,
  `ThreeDsModal`) memakai `createPortal` dengan mount guard. Jangan pernah membuat overlay
  `fixed inset-0` secara inline di dalam konten halaman; portal-kan, atau wrapper `Reveal` berikutnya
  diam-diam merusaknya.
- **Sukses pembayaran adalah konfirmasi layar penuh, bukan baris status.** Saat pembayaran menjadi
  lunas, kartu instruksi diganti oleh centang lime terpusat plus "Pembayaran berhasil" plus spinner
  pengalihan, ditahan sekitar 2 detik sebelum menuju dashboard (`/akses` untuk yang login,
  `/terima-kasih` untuk tamu). Momen uang yang berakhir baik pantas mendapat puncak yang jelas, bukan
  pergantian status yang senyap.
- **Metode kartu memakai ikon kartu netral, bukan logo satu jaringan.** Tile metode kartu (picker dan
  header instruksi) menampilkan glif kartu generik. Semua penerbit atau jaringan diterima, jadi
  menonjolkan Visa saja akan menyesatkan. Tanda Visa, Mastercard, dan JCB muncul hanya di dalam
  formulir kartu sebagai indikator deteksi BIN langsung (jaringan kartu yang diketik menyala; yang
  lain meredup).
- **Sebaris logo dengan rasio berbeda duduk di kotak tetap yang identik, bukan tinggi yang sama.**
  `height` sama plus `w-auto` membuat wordmark lebar (Visa sekitar 3:1) mengerdilkan tanda yang lebih
  kotak (Mastercard, JCB). Beri tiap tanda kotak tetap yang sama (`h-5 w-9`, `object-contain`) supaya
  semuanya menempati satu ruang dan wordmark mengecil agar pas. Ini aturan di mana pun tanda jaringan
  atau merek berjajar (header formulir kartu, dan strip logo mana pun di masa depan), berbeda dari
  satu wordmark lebar di satu chip (bank, di bawah).
- **Pengalihan pakai allowlist.** Navigasi pasca-aksi yang targetnya bisa datang dari query param
  (`?redirect=` di checkout, login) melewati `safeInternalPath()`, hanya path internal, menolak URL
  absolut, `//` yang protocol-relative, dan skema. Tidak ada open redirect dari permukaan uang atau
  auth.
- **Checkout dua kolom di desktop, satu di mobile.** Fase pilih memakai split
  `lg:grid-cols-[0.9fr_1fr]`: kiri = ringkasan pesanan plus kepercayaan (sticky), kanan = formulir
  pembeli plus picker metode plus tombol bayar. Ini menjaga setiap metode (termasuk Kartu di bawah)
  tetap terjangkau tanpa scroll panjang melewati seluruh daftar. Di bawah `lg` ia menyusut jadi satu
  kolom (ringkasan lalu formulir). Fase instruksi atau sukses tetap satu kolom sempit `max-w-md`
  (tugas yang fokus).
- **Logo merek pembayaran adalah wordmark lebar di chip lebar yang tetap.** Tanda bank atau e-wallet
  (dari idn-finlogos, varian terbaru saat sebuah bank berganti merek) berupa wordmark, jadi chip
  logonya adalah slot tetap 56x36 dengan `object-contain`, bukan kotak kecil yang mengecilkan
  wordmark. Logo diraster ke PNG transparan (andal lintas-browser sebagai gambar biasa); metode kartu
  tetap ikon kartu netral.
- **Kartu kredit adalah objek hidup yang on-brand, bukan template ungu.**
  `shared-assets/credit-card` mengikuti API Untitled UI (`type`, `company`, `cardNumber`,
  `cardHolder`, `cardExpiration`, `width`) tapi ditema dengan gradasi nav (`brand-500` ke
  `brand-700`), wordmark Maubisa, chip emas, dan glif contactless. Ia berubah saat pembeli mengetik
  dan mendeteksi otomatis logo jaringan dari BIN. Dipakai ulang di checkout (pratinjau langsung di
  atas field) dan di kartu metode tersimpan (masker `•••• •••• •••• 1234`). Satu objek kartu di semua
  produk berarti momen uang yang konsisten dan tepercaya.
- **Metode pembayaran tersimpan dibaca sebagai pengelola, bukan log.** `/metode-pembayaran`
  menampilkan kartu tersimpan asli dengan satu **primary** (berbintang, bercincin) dan yang lain
  sekunder, masing-masing dengan set-primary plus hapus, ditambah dialog **Tambah kartu** (Midtrans
  Card Registration, tanpa penagihan). Yang disimpan adalah token Midtrans plus merek, last4, dan
  masa berlaku, bukan PAN. Daftar "pernah dipakai" adalah model yang salah di sini; pengguna
  mengharapkan bisa menambah, menetapkan default, dan menghapus, seperti aplikasi langganan mana pun.
- **Jaminan 3DS bersifat per-kartu.** Modal verifikasi menampilkan tanda program dari jaringan yang
  *diketik* (Visa ke Verified by Visa, Mastercard ke SecureCode), atau logo kartu itu sendiri plus
  badge netral "3-D Secure" untuk yang lain, di sebelah tanda gateway Midtrans. Menampilkan semua
  merek tanpa peduli kartu yang dipegang hanya jadi kebisingan; cocokkan dengan instrumen yang benar-
  benar dipakai pembeli.

## Motion

Satu momen bergerak per permukaan, ease-out eksponensial dari default yang sudah terlihat.
- Token: `--ease-out-quint` (`cubic-bezier(0.16,1,0.3,1)`), `--ease-fluid`.
- Masuk: `animate-rise` dan `animate-fade` (dashboard), entrance auth yang berjenjang.
- Interaksi: transisi warna atau transform 200-500ms; `active:scale-[0.98]` pada tombol.
- **Reduced motion:** `@media (prefers-reduced-motion: reduce)` menetralkan entrance (state tetap
  terjaga). Hormati ini; jangan pernah mematikan semua feedback berguna dengan `0.01ms` global.

### Aturan Bernama
- Motion menyampaikan **state**, bukan dekorasi. Tidak ada easing bounce atau elastic (kurva
  ease-out-nya bernama `--ease-out-quint`, bukan "spring", supaya niatnya jujur).
