import { prisma } from "@/lib/prisma";

// Data pengguna untuk /admin/pengguna. Read-only, dibungkus try/catch supaya halaman
// admin tetap tampil (dengan pesan) walau DB sedang tak terjangkau. Tidak ada mutasi:
// admin di sini hanya menelusuri pelanggan + tagihan/langganan/akses mereka.

const PAID = ["paid", "settlement"];

export type AdminUserRow = {
  uuid: string;
  name: string;
  email: string;
  status: string;
  createdAt: Date | null;
  subsCount: number;
  invoiceCount: number;
};

export async function listUsers(q?: string, scope?: string): Promise<{ data?: AdminUserRow[]; error?: string }> {
  try {
    const term = q?.trim();
    // SQLite (dev) & MySQL (prod) sama-sama LIKE case-insensitive untuk ASCII -> `contains` cukup.
    const search = term
      ? [{ OR: [{ name: { contains: term } }, { email: { contains: term } }] }]
      : [];
    // Filter lini: user "punya" lini bila ada invoice/entitlement pada scope tsb.
    const scoped = scope
      ? [{ OR: [{ invoices: { some: { scope } } }, { entitlements: { some: { scope } } }] }]
      : [];
    const and = [...search, ...scoped];
    const where = and.length ? { AND: and } : {};
    const users = await prisma.user.findMany({
      where,
      orderBy: { id: "desc" },
      take: 50,
      select: {
        uuid: true,
        name: true,
        email: true,
        status: true,
        createdAt: true,
        _count: { select: { subscriptions: true, invoices: true } },
      },
    });
    return {
      data: users.map((u) => ({
        uuid: u.uuid,
        name: u.name,
        email: u.email,
        status: u.status,
        createdAt: u.createdAt,
        subsCount: u._count.subscriptions,
        invoiceCount: u._count.invoices,
      })),
    };
  } catch (e) {
    return { error: String(e) };
  }
}

export type AdminUserDetail = Awaited<ReturnType<typeof fetchUserDetail>>;

async function fetchUserDetail(uuid: string) {
  const user = await prisma.user.findFirst({
    where: { uuid },
    include: {
      subscriptions: { orderBy: { id: "desc" }, take: 100 },
      invoices: { orderBy: { id: "desc" }, take: 200 },
      entitlements: { orderBy: { id: "desc" }, take: 200 },
    },
  });
  if (!user) return null;
  const totalPaid = user.invoices
    .filter((i) => PAID.includes(i.status))
    .reduce((s, i) => s + Number(i.grossAmount), 0);
  return { user, totalPaid };
}

export async function getUserDetail(
  uuid: string,
): Promise<{ data?: NonNullable<Awaited<ReturnType<typeof fetchUserDetail>>>; error?: string; notFound?: boolean }> {
  try {
    const detail = await fetchUserDetail(uuid);
    if (!detail) return { notFound: true };
    return { data: detail };
  } catch (e) {
    return { error: String(e) };
  }
}
