import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";

// Upload berkas avatar. Strategi (sesuai ADR-004 privasi onshore):
//   1) UTAMA — Directus Files (CMS milik sendiri): file disimpan di storage Directus,
//      URL asset dipakai sebagai avatar. Konsisten dgn sumber media lain (acara, dll).
//   2) FALLBACK dev — tulis ke public/uploads/avatars (hanya saat Directus belum diset).
//      Cocok untuk node-server (mis. Coolify) dgn volume tulis; TIDAK untuk serverless.
// Validasi ketat: hanya gambar (jpeg/png/webp) & maksimal 2 MB.

export const AVATAR_MAX_BYTES = 2 * 1024 * 1024;
export const AVATAR_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

const DIRECTUS_URL = process.env.DIRECTUS_URL?.replace(/\/+$/, "");
const DIRECTUS_TOKEN = process.env.DIRECTUS_TOKEN;
const AVATAR_FOLDER = process.env.DIRECTUS_AVATAR_FOLDER; // opsional: id folder Directus

export type UploadResult = { url: string } | { error: string; status: number };

export function validateImage(file: { type: string; size: number }): { ok: true } | { error: string } {
  if (!AVATAR_TYPES[file.type]) return { error: "Format harus JPG, PNG, atau WEBP." };
  if (file.size <= 0) return { error: "Berkas kosong." };
  if (file.size > AVATAR_MAX_BYTES) return { error: "Ukuran maksimal 2 MB." };
  return { ok: true };
}

// Upload ke Directus Files. Mengembalikan URL asset publik bila sukses.
async function uploadToDirectus(file: File): Promise<UploadResult> {
  if (!DIRECTUS_URL || !DIRECTUS_TOKEN) return { error: "directus-unset", status: 0 };
  try {
    const form = new FormData();
    if (AVATAR_FOLDER) form.append("folder", AVATAR_FOLDER);
    // Field file HARUS terakhir di multipart Directus.
    form.append("file", file, file.name);
    const res = await fetch(`${DIRECTUS_URL}/files`, {
      method: "POST",
      headers: { Authorization: `Bearer ${DIRECTUS_TOKEN}` },
      body: form,
    });
    if (!res.ok) {
      console.error(`[avatar] Directus files ${res.status}`);
      return { error: "Gagal mengunggah ke server media.", status: 502 };
    }
    const j = (await res.json()) as { data?: { id?: string } };
    const id = j.data?.id;
    if (!id) return { error: "Respons unggah tidak valid.", status: 502 };
    return { url: `${DIRECTUS_URL}/assets/${id}` };
  } catch (e) {
    console.error("[avatar] Directus upload gagal:", e instanceof Error ? e.message : "unknown");
    return { error: "Gagal mengunggah. Coba lagi.", status: 502 };
  }
}

// Fallback dev: simpan ke public/uploads/avatars. URL relatif publik.
async function saveLocally(file: File): Promise<UploadResult> {
  try {
    const ext = AVATAR_TYPES[file.type] ?? "bin";
    const name = `${randomUUID()}.${ext}`;
    const dir = path.join(process.cwd(), "public", "uploads", "avatars");
    await mkdir(dir, { recursive: true });
    const buf = Buffer.from(await file.arrayBuffer());
    await writeFile(path.join(dir, name), buf);
    return { url: `/uploads/avatars/${name}` };
  } catch (e) {
    console.error("[avatar] simpan lokal gagal:", e instanceof Error ? e.message : "unknown");
    return { error: "Gagal menyimpan berkas.", status: 500 };
  }
}

export async function uploadAvatar(file: File): Promise<UploadResult> {
  const check = validateImage(file);
  if ("error" in check) return { error: check.error, status: 400 };

  // Directus dulu (produksi). Kalau belum diset, fallback lokal (dev).
  const viaDirectus = await uploadToDirectus(file);
  if ("url" in viaDirectus) return viaDirectus;
  if (viaDirectus.status !== 0) return viaDirectus; // error nyata dari Directus
  return saveLocally(file);
}
