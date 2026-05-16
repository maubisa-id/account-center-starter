import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { uploadAvatar } from "@/lib/upload";
import { isAdminEmail } from "@/lib/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Unggah foto profil (avatar). Wajib login. File divalidasi (jpeg/png/webp, ≤2MB) lalu
// disimpan ke penyimpanan objek (GCS/R2) di subfolder {user|admin}/ dgn nama
// "<slug-nama>-avatar-<id>"; fallback Directus/lokal. URL dikembalikan untuk dipasang
// ke field profil; penyimpanan ke users.avatar_url terjadi saat simpan profil.
export async function POST(req: Request) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Silakan masuk dulu." }, { status: 401 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Form tidak valid." }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Tidak ada berkas." }, { status: 400 });
  }

  const result = await uploadAvatar(file, {
    name: session.user.name,
    id: session.user.id,
    isAdmin: isAdminEmail(session.user.email),
  });
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json({ url: result.url });
}
