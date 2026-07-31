# Logo Metode Pembayaran

Berkas logo di folder ini di-raster ke **PNG transparan** dari pustaka SVG
**idn-finlogos** (<https://github.com/hafidznoor/idn-finlogos>, v2.5.0) — koleksi logo
fintech & lembaga keuangan Indonesia yang teroptimasi (SVGO).

## Kenapa PNG (bukan SVG langsung)?

SVG idn-finlogos dioptimasi untuk pemakaian **inline / komponen React** (tanpa `xmlns`
dan tanpa width/height), sehingga tidak selalu ter-render andal saat dimuat sebagai
gambar biasa lintas browser. Karena `brand-logo.tsx` memakai gambar biasa, tiap SVG
di-raster ke PNG 96px transparan (via `sharp`) supaya tampil konsisten di mana pun.

## Lisensi & merek

- **idn-finlogos**: MIT (kode) + **CC BY-NC 4.0** (aset logo). Atribusi: Hafidz Noor,
  `idn-finlogos`. Penggunaan di sini bersifat **nominatif** (menandai "metode pembayaran
  yang diterima" di halaman checkout), bukan klaim afiliasi/endorsement.
- Hak merek tetap milik masing-masing pemilik (BCA, BNI, BRI, CIMB Niaga, PermataBank,
  Bank Mandiri, GoPay, ShopeePay, QRIS/BI, Visa, Mastercard, JCB, American Express,
  UnionPay, Discover).
- Catatan CC BY-NC: bila kelak butuh kepastian komersial penuh, pertimbangkan mengambil
  logo langsung dari brand-guideline resmi tiap bank. Untuk penanda metode pembayaran,
  penggunaan nominatif ini lazim di halaman checkout.

## Pemetaan berkas (varian dipilih)

| Berkas             | Slug idn-finlogos          | Catatan pemilihan                   |
|--------------------|----------------------------|-------------------------------------|
| `qris.png`         | `qris`                     | monokrom (sesuai QR Payment library) |
| `gopay.png`        | `gopay`                    | minimalis (terbaru)                 |
| `shopeepay.png`    | `shopeepay`                | minimalis                           |
| `bca.png`          | `bca`                      | minimalis                           |
| `bni.png`          | `bni`                      | minimalis                           |
| `bri.png`          | `bri-new`                  | **redesain terbaru (2020)**         |
| `cimb.png`         | `cimb-niaga`               | minimalis                           |
| `permata.png`      | `permata-bank-new`         | **varian terbaru**                  |
| `mandiri.png`      | `mandiri`                  | minimalis                           |
| `visa.png`         | `visa`                     | jaringan kartu (standar)            |
| `mastercard.png`   | `mastercard`               | jaringan kartu (standar)            |
| `jcb.png`          | `jcb`                      | jaringan kartu                      |
| `amex.png`         | `american-express`         | jaringan kartu (deteksi in-field)   |
| `unionpay.png`     | `unionpay`                 | jaringan kartu (deteksi in-field)   |
| `discover.png`     | `discover`                 | jaringan kartu (deteksi in-field)   |
| `midtrans.png`     | `midtrans`                 | logo gateway (strip jaminan + 3DS)  |
| `visa-secure.png`  | `verified-by-visa-new`     | merek 3DS di modal verifikasi       |
| `mc-securecode.png`| `mastercard-securecode-new`| merek 3DS di modal verifikasi       |

Logo bank/e-wallet dirender oleh `src/components/pay/brand-logo.tsx`. Jaringan kartu
(Visa/Mastercard/JCB standar) di `card-form.tsx`. Merek 3DS (Verified by Visa +
Mastercard SecureCode) + logo Midtrans di `three-ds-modal.tsx` & `secure-strip.tsx`.
Untuk memperbarui: ambil SVG dari
`https://cdn.jsdelivr.net/npm/idn-finlogos@2/dist/icons/<slug>.svg`, lalu raster ke PNG
transparan (`sharp`, tinggi ~96px; Midtrans ~64px).
