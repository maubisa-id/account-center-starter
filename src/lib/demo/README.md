# Kode khusus MODE DEMO

Semua berkas di folder `demo/` ini **hanya aktif saat `NEXT_PUBLIC_DEMO_MODE="1"`**
(demo-akun.maubisa.id). Di produksi, env itu kosong sehingga:

- kotak email demo tidak menangkap apa pun,
- halaman `/demo/kotak` mengembalikan 404,
- endpoint `/api/demo/*` mengembalikan 404.

Dipisah ke folder sendiri supaya jelas mana yang khusus demo dan mana yang produksi.

## Cara kerjanya

- `demoMailboxEnabled()` membaca `NEXT_PUBLIC_DEMO_MODE === "1"`. Nilai ini menjadi gerbang
  untuk penangkapan email, halaman `/demo/kotak`, dan endpoint `/api/demo/*`.
- `sendEmail(...)` tetap memakai jalur email biasa. Saat mode demo aktif, salinan email juga
  ditangkap ke kotak masuk in-memory agar pengunjung bisa melihat OTP, email selamat datang,
  tagihan, struk, dan email langganan dari browser.
- Kotak masuk menyimpan maksimum 50 email terbaru. Data hilang saat proses aplikasi restart,
  sesuai sifat demo satu-instance.
- Daftar email hanya mengembalikan metadata dan alamat penerima yang disamarkan. HTML penuh
  diambil per email melalui route detail untuk pratinjau iframe.


## Peta berkas demo

| Berkas | Fungsi |
| --- | --- |
| `src/lib/demo/mailbox.ts` | Kotak masuk email in-memory (tangkap email saat SMTP kosong). |
| `src/components/demo/banner.tsx` | Bilah "Mode Demo" + tautan ke kotak email. |
| `src/components/demo/inbox.tsx` | UI kotak masuk (daftar + pratinjau iframe, polling 4 dtk). |
| `src/app/demo/kotak/page.tsx` | Halaman `/demo/kotak` (gerbang 404 di produksi). |
| `src/app/api/demo/mailbox/route.ts` | API daftar / kirim contoh / kosongkan. |
| `src/app/api/demo/mailbox/[id]/route.ts` | HTML satu email untuk iframe pratinjau. |

## Batasan dan operasional

- Kotak masuk demo bersifat bersama untuk semua pengunjung demo, jadi jangan pakai alamat atau
  data pribadi sungguhan saat mencoba.
- Fitur ini bukan pengganti SMTP produksi. Untuk produksi, biarkan `NEXT_PUBLIC_DEMO_MODE` kosong
  dan isi `MAIL_*` agar email benar-benar dikirim.
- Untuk mematikan seluruh fitur demo, cukup jangan set `NEXT_PUBLIC_DEMO_MODE`.
