import { prisma } from "@/lib/prisma";
import { getSessionEmail } from "@/lib/account";

// Jejak audit aksi admin (tabel audit_logs). Append-only, best-effort: kegagalan mencatat TIDAK
// boleh menggagalkan aksi utama (dibungkus try/catch di pemanggil bila perlu). metadata disimpan
// sebagai string JSON supaya kompatibel SQLite (dev) & MySQL (prod).

export async function logAudit(input: {
  action: string;
  target?: string | null;
  metadata?: Record<string, unknown> | null;
  actorEmail?: string | null; // bila sudah diketahui; jika tidak, diambil dari sesi
}): Promise<void> {
  try {
    const email = input.actorEmail ?? (await getSessionEmail());
    const actor = email ? await prisma.user.findFirst({ where: { email }, select: { id: true } }) : null;
    await prisma.auditLog.create({
      data: {
        actorId: actor?.id ?? null,
        action: input.action,
        target: input.target ?? null,
        metadata: input.metadata ? JSON.stringify(input.metadata) : null,
      },
    });
  } catch {
    // Sengaja diabaikan: audit gagal tak boleh menjatuhkan aksi bisnis.
  }
}

export type AuditRow = {
  id: number;
  action: string;
  target: string | null;
  metadata: Record<string, unknown> | null;
  actorName: string | null;
  actorEmail: string | null;
  createdAt: Date;
};

export async function listAudit(limit = 100): Promise<{ data?: AuditRow[]; error?: string }> {
  try {
    const logs = await prisma.auditLog.findMany({ orderBy: { id: "desc" }, take: limit });
    // actorId -> user (nama/email) dalam satu query, lalu petakan di memori.
    const ids = [...new Set(logs.map((l) => l.actorId).filter((v): v is number => v != null))];
    const users = ids.length
      ? await prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true, name: true, email: true } })
      : [];
    const byId = new Map(users.map((u) => [u.id, u]));
    return {
      data: logs.map((l) => {
        const u = l.actorId != null ? byId.get(l.actorId) : undefined;
        let metadata: Record<string, unknown> | null = null;
        if (l.metadata) {
          try {
            metadata = JSON.parse(l.metadata) as Record<string, unknown>;
          } catch {
            metadata = null;
          }
        }
        return {
          id: l.id,
          action: l.action,
          target: l.target,
          metadata,
          actorName: u?.name ?? null,
          actorEmail: u?.email ?? null,
          createdAt: l.createdAt,
        };
      }),
    };
  } catch (e) {
    return { error: String(e) };
  }
}
