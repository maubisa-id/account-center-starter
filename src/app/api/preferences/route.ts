import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getUserPreferences } from "@/lib/preferences";

export const dynamic = "force-dynamic";

// Preferensi user (minat/tujuan) untuk PERSONALISASI. Dipakai app.example.com & kelas.example.com
// yang berbagi sesi SSO (cookie .example.com) — cukup panggil endpoint ini untuk user aktif.
// Read-only; identitas dari sesi (bukan parameter) supaya aman.
export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  const email = session?.user?.email;
  if (!email) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const user = await prisma.user.findFirst({ where: { email }, select: { uuid: true } });
  if (!user) return NextResponse.json({ error: "not found" }, { status: 404 });

  const prefs = await getUserPreferences(user.uuid);
  return NextResponse.json({ coreUserId: user.uuid, ...prefs });
}
