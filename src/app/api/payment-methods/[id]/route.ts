import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { setPrimaryMethod, removeMethod } from "@/lib/payment-methods";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function sessionUserId(): Promise<number | null> {
  const session = await auth.api.getSession({ headers: await headers() });
  const email = session?.user?.email;
  if (!email) return null;
  const user = await prisma.user.findFirst({ where: { email }, select: { id: true } });
  return user?.id ?? null;
}

function parseId(raw: string): number | null {
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : null;
}

// Jadikan metode utama. body: { primary: true }. Verifikasi kepemilikan di lib.
export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const limited = rateLimit(req, "payment-methods-edit", { max: 30, windowMs: 60_000 });
  if (limited) return limited;

  const userId = await sessionUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const id = parseId((await ctx.params).id);
  if (!id) return NextResponse.json({ error: "id tidak valid" }, { status: 400 });

  const ok = await setPrimaryMethod(userId, id);
  if (!ok) return NextResponse.json({ error: "Metode tidak ditemukan." }, { status: 404 });
  return NextResponse.json({ ok: true });
}

// Hapus metode. Promosikan metode lain jadi utama bila yang dihapus adalah utama.
export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const limited = rateLimit(req, "payment-methods-edit", { max: 30, windowMs: 60_000 });
  if (limited) return limited;

  const userId = await sessionUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const id = parseId((await ctx.params).id);
  if (!id) return NextResponse.json({ error: "id tidak valid" }, { status: 400 });

  const ok = await removeMethod(userId, id);
  if (!ok) return NextResponse.json({ error: "Metode tidak ditemukan." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
