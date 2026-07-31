# Berkontribusi ke Acme Pusat Akun

Terima kasih sudah berkontribusi. Dokumen ini menjelaskan cara menyiapkan lingkungan,
standar kode, dan alur pull request agar perubahan mudah ditinjau dan aman untuk sistem
pembayaran.

> [!IMPORTANT]
> Ini adalah layanan pembayaran. Setiap perubahan pada alur uang, webhook, atau skema
> database wajib diverifikasi ekstra (lihat [Checklist pembayaran](#checklist-pembayaran)).

## Menyiapkan lingkungan

Prasyarat: **Node.js 22** (lihat `.nvmrc`) dan npm.

```bash
nvm use                        # pakai Node 22
npm install
cp .env.example .env           # minimal isi BETTER_AUTH_SECRET (openssl rand -base64 32)
npx prisma db push             # buat dev.db + tabel
npm run seed                   # data contoh + akun demo
npm run dev                    # http://localhost:3000
```

(Opsional) pulihkan skill agen AI yang dipakai saat pengembangan:

```bash
npx skills add    # membaca skills-lock.json
```

## Alur kerja

1. Buat branch dari `main`: `feat/<ringkas>`, `fix/<ringkas>`, atau `docs/<ringkas>`.
2. Buat perubahan kecil dan fokus. Satu PR = satu tujuan.
3. Jalankan gerbang kualitas di bawah sampai **hijau** sebelum push.
4. Buka PR memakai template; isi checklist.

## Gerbang kualitas (wajib hijau)

```bash
npx tsc --noEmit     # typecheck (0 error)
npm run lint         # ESLint (0 error)
npm run build        # build produksi berhasil
```

CI menjalankan hal yang sama di setiap PR (lihat `.github/workflows/ci.yml`).

## Standar kode

- **TypeScript strict.** Jangan `any` tanpa alasan; ketik boundary API dengan jelas.
- **Server-authoritative.** Harga TIDAK pernah dipercaya dari klien/URL; selalu di-resolve
  ulang di server. Akses hanya diaktifkan oleh webhook Midtrans terverifikasi.
- **Rahasia.** Jangan pernah commit `.env` atau kunci. Server key & signature tetap di server.
- **Gaya UI.** Ikuti `DESIGN.md` (tanpa em-dash pada teks tampil, token warna/tipografi).
- **Commit.** Pakai [Conventional Commits](https://www.conventionalcommits.org/):
  `feat:`, `fix:`, `docs:`, `refactor:`, `chore:`, `test:`.

## Checklist pembayaran

Wajib bila menyentuh `src/lib/midtrans/**`, `src/app/api/pay/**`, `src/app/api/webhook/**`,
atau `prisma/schema.prisma`:

- [ ] Signature webhook diverifikasi SEBELUM mutasi database.
- [ ] Idempotensi terjaga (event ganda tidak menggandakan akses/periode).
- [ ] Transisi status monotonik (paid/refunded terminal; late pending/cancel tidak menimpa).
- [ ] Nominal di-cross-check terhadap invoice sebelum aktivasi.
- [ ] Rahasia (server key, saved_token) tidak bocor ke klien/log.
- [ ] Diuji di Midtrans Sandbox (charge + webhook) bila relevan.
- [ ] Perubahan skema diselaraskan dengan `directus-acme/docs/arsitektur/acme-core-schema.sql`.

## Melaporkan kerentanan keamanan

Jangan buka issue publik untuk kerentanan. Ikuti [SECURITY.md](./SECURITY.md).
