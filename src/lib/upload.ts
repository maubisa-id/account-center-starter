import { createHash, createHmac, randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";

// Upload berkas avatar. Urutan strategi (yang pertama terkonfigurasi dipakai):
//   1) UTAMA — Penyimpanan objek S3-compatible (satu kode, dua backend):
//        • PRODUKSI  -> Google Cloud Storage (bucket cdn.maubisa.id, prefix akun/avatars/)
//        • DEMO      -> Cloudflare R2 (bucket demo-akun-maubisa, prefix avatars/)
//      Keduanya bicara protokol S3 + tanda tangan SigV4, jadi cukup SATU implementasi;
//      pembeda hanya env (endpoint/bucket/kunci/public URL). Tanpa SDK berat (aws-sdk ~20MB) —
//      SigV4 ditandatangani manual dgn crypto Node (hemat & tanpa dependensi).
//   2) Directus Files (bila S3 tak diset & DIRECTUS_URL/TOKEN ada) — kompat lama.
//   3) FALLBACK dev — tulis ke public/uploads/avatars (hanya node-server dgn volume tulis).
// Berkas ditaruh di subfolder <prefix>/{user|admin}/ dengan nama "<slug-nama>-avatar-<id>".
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

// Identitas pengunggah -> menentukan subfolder & nama berkas avatar.
// Subfolder: admin -> "admin/", selain itu "user/". Nama: "<slug-nama>-avatar-<id>".
// Nama STABIL per pengguna (id tetap), jadi unggah ulang MENIMPA berkas lama
// (tak menumpuk yatim). Cache-buster ?v= ditambahkan ke URL agar tampilan segar.
export type AvatarIdentity = { name?: string | null; id?: string | null; isAdmin?: boolean };

function slugifyName(name?: string | null): string {
  const s = (name ?? "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return s || "pengguna";
}

// Nama objek avatar relatif terhadap prefix (mis. "user/budi-avatar-abc123.png").
function avatarObjectName(identity: AvatarIdentity | undefined, ext: string): string {
  const role = identity?.isAdmin ? "admin" : "user";
  const id = (identity?.id ?? "").replace(/[^a-zA-Z0-9]/g, "").slice(0, 32) || randomUUID().replace(/-/g, "").slice(0, 12);
  return `${role}/${slugifyName(identity?.name)}-avatar-${id}.${ext}`;
}

const withVersion = (url: string) => `${url}?v=${Date.now().toString(36)}`;

export function validateImage(file: { type: string; size: number }): { ok: true } | { error: string } {
  if (!AVATAR_TYPES[file.type]) return { error: "Format harus JPG, PNG, atau WEBP." };
  if (file.size <= 0) return { error: "Berkas kosong." };
  if (file.size > AVATAR_MAX_BYTES) return { error: "Ukuran maksimal 2 MB." };
  return { ok: true };
}

// ── Penyimpanan objek S3-compatible (R2 demo / GCS produksi) ─────────────────
type S3Config = {
  endpoint: string; // R2: https://<acct>.r2.cloudflarestorage.com | GCS: https://storage.googleapis.com
  region: string; // R2: "auto" | GCS: region bucket (mis. "asia-southeast2") atau "auto"
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  publicBase: string; // R2: https://pub-xxx.r2.dev | GCS: https://cdn.maubisa.id
  keyPrefix: string; // mis. "akun/avatars/"
};

function s3Config(): S3Config | null {
  const endpoint = process.env.S3_ENDPOINT?.replace(/\/+$/, "");
  const bucket = process.env.S3_BUCKET;
  const accessKeyId = process.env.S3_ACCESS_KEY_ID;
  const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;
  const publicBase = process.env.S3_PUBLIC_BASE_URL?.replace(/\/+$/, "");
  if (!endpoint || !bucket || !accessKeyId || !secretAccessKey || !publicBase) return null;
  return {
    endpoint,
    bucket,
    accessKeyId,
    secretAccessKey,
    publicBase,
    region: process.env.S3_REGION || "auto",
    keyPrefix: (process.env.S3_KEY_PREFIX ?? "akun/avatars/").replace(/^\/+/, ""),
  };
}

const sha256hex = (data: string | Buffer) => createHash("sha256").update(data).digest("hex");
const hmac = (key: Buffer | string, data: string) => createHmac("sha256", key).update(data, "utf8").digest();

// Unggah ke penyimpanan S3-compatible (PUT object bertanda tangan SigV4, path-style).
async function uploadToS3(file: File, identity?: AvatarIdentity): Promise<UploadResult> {
  const cfg = s3Config();
  if (!cfg) return { error: "s3-unset", status: 0 };
  try {
    const ext = AVATAR_TYPES[file.type] ?? "bin";
    const key = `${cfg.keyPrefix}${avatarObjectName(identity, ext)}`; // hanya [a-z0-9-/.] -> tak perlu URI-encode
    const body = Buffer.from(await file.arrayBuffer());
    const host = new URL(cfg.endpoint).host;
    const amzDate = new Date().toISOString().replace(/[:-]|\.\d{3}/g, ""); // YYYYMMDDTHHMMSSZ
    const dateStamp = amzDate.slice(0, 8);
    const payloadHash = sha256hex(body);
    const canonicalUri = `/${cfg.bucket}/${key}`;
    const canonicalHeaders =
      `content-type:${file.type}\nhost:${host}\nx-amz-content-sha256:${payloadHash}\nx-amz-date:${amzDate}\n`;
    const signedHeaders = "content-type;host;x-amz-content-sha256;x-amz-date";
    const canonicalRequest = ["PUT", canonicalUri, "", canonicalHeaders, signedHeaders, payloadHash].join("\n");
    const scope = `${dateStamp}/${cfg.region}/s3/aws4_request`;
    const stringToSign = ["AWS4-HMAC-SHA256", amzDate, scope, sha256hex(canonicalRequest)].join("\n");
    const signingKey = hmac(hmac(hmac(hmac(`AWS4${cfg.secretAccessKey}`, dateStamp), cfg.region), "s3"), "aws4_request");
    const signature = createHmac("sha256", signingKey).update(stringToSign, "utf8").digest("hex");
    const authorization =
      `AWS4-HMAC-SHA256 Credential=${cfg.accessKeyId}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

    const res = await fetch(`${cfg.endpoint}${canonicalUri}`, {
      method: "PUT",
      headers: {
        "Content-Type": file.type,
        "x-amz-content-sha256": payloadHash,
        "x-amz-date": amzDate,
        Authorization: authorization,
      },
      body,
    });
    if (!res.ok) {
      console.error(`[avatar] S3 PUT ${res.status}`);
      return { error: "Gagal mengunggah ke penyimpanan.", status: 502 };
    }
    return { url: withVersion(`${cfg.publicBase}/${key}`) };
  } catch (e) {
    console.error("[avatar] S3 upload gagal:", e instanceof Error ? e.message : "unknown");
    return { error: "Gagal mengunggah. Coba lagi.", status: 502 };
  }
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

// Fallback dev: simpan ke public/uploads/avatars/<role>. URL relatif publik.
async function saveLocally(file: File, identity?: AvatarIdentity): Promise<UploadResult> {
  try {
    const ext = AVATAR_TYPES[file.type] ?? "bin";
    const name = avatarObjectName(identity, ext); // "user/budi-avatar-abc.png"
    const full = path.join(process.cwd(), "public", "uploads", "avatars", ...name.split("/"));
    await mkdir(path.dirname(full), { recursive: true });
    const buf = Buffer.from(await file.arrayBuffer());
    await writeFile(full, buf);
    return { url: withVersion(`/uploads/avatars/${name}`) };
  } catch (e) {
    console.error("[avatar] simpan lokal gagal:", e instanceof Error ? e.message : "unknown");
    return { error: "Gagal menyimpan berkas.", status: 500 };
  }
}

export async function uploadAvatar(file: File, identity?: AvatarIdentity): Promise<UploadResult> {
  const check = validateImage(file);
  if ("error" in check) return { error: check.error, status: 400 };

  // Rantai backend — yang pertama BERHASIL dipakai. Avatar non-kritis: kalau satu backend
  // gagal (mis. token S3/R2 masih read-only -> 403, atau Directus mati), JANGAN keraskan
  // error; turun ke backend berikutnya sampai disk lokal supaya fitur tetap jalan. Tiap
  // backend sudah console.error detail kegagalannya untuk diagnosis (mis. token R2 perlu
  // izin "Object Read & Write"). Begitu token diperbaiki, unggahan otomatis pakai S3 lagi.
  const viaS3 = await uploadToS3(file, identity);
  if ("url" in viaS3) return viaS3;

  const viaDirectus = await uploadToDirectus(file);
  if ("url" in viaDirectus) return viaDirectus;

  return saveLocally(file, identity);
}
