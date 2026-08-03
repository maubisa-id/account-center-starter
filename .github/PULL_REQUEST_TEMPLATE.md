<!-- Terima kasih atas kontribusinya. Isi bagian yang relevan; hapus yang tidak. -->

## Ringkasan

<!-- Apa yang berubah dan kenapa? Tautkan issue: Closes #123 -->

## Jenis perubahan

- [ ] Perbaikan bug (non-breaking)
- [ ] Fitur baru (non-breaking)
- [ ] Breaking change (mengubah perilaku yang ada)
- [ ] Dokumentasi / chore

## Gerbang kualitas

- [ ] `npx tsc --noEmit` hijau (0 error)
- [ ] `npm run lint` hijau (0 error)
- [ ] `npm run build` berhasil
- [ ] Sudah diuji manual di lokal

## Checklist pembayaran (isi bila menyentuh pembayaran/webhook/skema)

- [ ] Signature webhook diverifikasi sebelum mutasi DB
- [ ] Idempotensi & transisi status monotonik terjaga
- [ ] Nominal di-cross-check terhadap invoice
- [ ] Rahasia tidak bocor ke klien/log
- [ ] Diuji di Midtrans Sandbox (charge + webhook)
- [ ] Skema selaras dengan `maubisa-core-schema.sql`
- [ ] N/A - PR ini tidak menyentuh pembayaran

## Catatan untuk reviewer

<!-- Hal spesifik yang perlu diperhatikan, screenshot, atau langkah uji. -->
