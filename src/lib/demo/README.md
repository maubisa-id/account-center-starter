# Kode khusus MODE DEMO

Semua berkas di folder `demo/` ini **hanya aktif saat `NEXT_PUBLIC_DEMO_MODE="1"`**
(demo-akun.maubisa.id). Di produksi, env itu kosong sehingga:

- kotak email demo tidak menangkap apa pun,
- halaman `/demo/kotak` mengembalikan 404,
- endpoint `/api/demo/*` mengembalikan 404.

Dipisah ke folder sendiri supaya jelas mana yang khusus demo dan mana yang produksi.

## Peta berkas demo

| Berkas | Fungsi |
| --- | --- |
| `src/lib/demo/mailbox.ts` | Kotak masuk email in-memory (tangkap email saat SMTP kosong). |
| `src/components/demo/banner.tsx` | Bilah "Mode Demo" + tautan ke kotak email. |
| `src/components/demo/inbox.tsx` | UI kotak masuk (daftar + pratinjau iframe, polling 4 dtk). |
| `src/app/demo/kotak/page.tsx` | Halaman `/demo/kotak` (gerbang 404 di produksi). |
| `src/app/api/demo/mailbox/route.ts` | API daftar / kirim contoh / kosongkan. |
| `src/app/api/demo/mailbox/[id]/route.ts` | HTML satu email untuk iframe pratinjau. |

Menonaktifkan seluruh fitur ini = cukup jangan set `NEXT_PUBLIC_DEMO_MODE`.
