"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getSessionEmail } from "@/lib/account";
import { isAdminEmail } from "@/lib/admin";
import { logAudit } from "@/lib/audit";
import type { ServiceScope } from "@/lib/service-lines";

// Aksi admin pada detail pengguna: beri / cabut hak akses (entitlement) manual lintas lini.
// Ini aksi TULIS pertama di panel admin -> semuanya di-gate email admin + dicatat audit.
// Nilai enum mengikuti maubisa_core: scope thesis/app/kelas/book/global; source 'manual';
// status terminal saat dicabut = 'cancelled' (BUKAN 'revoked' yang tak ada di enum).

const SCOPES: ServiceScope[] = ["thesis", "app", "kelas", "book"];

async function assertAdmin(): Promise<{ email: string } | { error: string }> {
  const email = await getSessionEmail();
  if (!isAdminEmail(email)) return { error: "Akses ditolak." };
  return { email: email! };
}

export async function grantEntitlement(input: {
  userUuid: string;
  scope: string;
  note?: string;
}): Promise<{ ok: true } | { error: string }> {
  const gate = await assertAdmin();
  if ("error" in gate) return gate;

  if (!SCOPES.includes(input.scope as ServiceScope)) return { error: "Lini layanan tidak valid." };
  const user = await prisma.user.findFirst({ where: { uuid: input.userUuid }, select: { id: true, email: true } });
  if (!user) return { error: "Pengguna tidak ditemukan." };

  // Cegah duplikat akses manual aktif untuk lini yang sama.
  const existing = await prisma.entitlement.findFirst({
    where: { userId: user.id, scope: input.scope, source: "manual", status: "active" },
    select: { id: true },
  });
  if (existing) return { error: "Pengguna sudah punya akses manual aktif untuk lini ini." };

  const now = new Date();
  await prisma.entitlement.create({
    data: {
      userId: user.id,
      scope: input.scope,
      status: "active",
      source: "manual",
      startsAt: now,
      createdAt: now,
      updatedAt: now,
    },
  });

  await logAudit({
    action: "grant_manual",
    target: `user:${input.userUuid}`,
    metadata: { scope: input.scope, note: input.note ?? null, userEmail: user.email },
    actorEmail: gate.email,
  });

  revalidatePath(`/admin/pengguna/${input.userUuid}`);
  return { ok: true };
}

export async function revokeEntitlement(input: {
  userUuid: string;
  entitlementId: number;
}): Promise<{ ok: true } | { error: string }> {
  const gate = await assertAdmin();
  if ("error" in gate) return gate;

  const ent = await prisma.entitlement.findFirst({
    where: { id: input.entitlementId },
    select: { id: true, userId: true, scope: true, source: true, status: true },
  });
  if (!ent) return { error: "Hak akses tidak ditemukan." };
  const owner = await prisma.user.findFirst({ where: { uuid: input.userUuid }, select: { id: true, email: true } });
  if (!owner || owner.id !== ent.userId) return { error: "Hak akses bukan milik pengguna ini." };
  if (ent.status === "cancelled") return { error: "Hak akses sudah dicabut." };

  await prisma.entitlement.update({
    where: { id: ent.id },
    data: { status: "cancelled", updatedAt: new Date() },
  });

  await logAudit({
    action: "revoke_entitlement",
    target: `entitlement:${ent.id}`,
    metadata: { scope: ent.scope, source: ent.source, userEmail: owner.email },
    actorEmail: gate.email,
  });

  revalidatePath(`/admin/pengguna/${input.userUuid}`);
  return { ok: true };
}
