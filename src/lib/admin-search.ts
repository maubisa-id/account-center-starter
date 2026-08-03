import { prisma } from "@/lib/prisma";

// Pencarian admin lintas-entitas: pengguna (nama/email) + invoice (order ID). Read-only,
// dibungkus try/catch. Dipakai /admin/cari untuk "satu kotak" menuju detail yang tepat.

export type UserHit = { uuid: string; name: string; email: string; status: string };
export type InvoiceHit = {
  orderId: string;
  itemName: string | null;
  amount: number;
  status: string;
  who: string | null;
};

export type AdminSearchResult = { users: UserHit[]; invoices: InvoiceHit[] };

export async function searchAdmin(
  q: string,
): Promise<{ data?: AdminSearchResult; error?: string }> {
  const term = q.trim();
  if (!term) return { data: { users: [], invoices: [] } };
  try {
    const [users, invoices] = await Promise.all([
      prisma.user.findMany({
        where: { OR: [{ name: { contains: term } }, { email: { contains: term } }] },
        orderBy: { id: "desc" },
        take: 25,
        select: { uuid: true, name: true, email: true, status: true },
      }),
      prisma.invoice.findMany({
        // Order ID unik & tak-tertebak; cocokkan sebagian supaya admin bisa tempel potongan ID.
        where: { orderId: { contains: term } },
        orderBy: { id: "desc" },
        take: 25,
        select: {
          orderId: true,
          itemName: true,
          grossAmount: true,
          status: true,
          user: { select: { name: true, email: true } },
        },
      }),
    ]);
    return {
      data: {
        users: users.map((u) => ({ uuid: u.uuid, name: u.name, email: u.email, status: u.status })),
        invoices: invoices.map((i) => ({
          orderId: i.orderId,
          itemName: i.itemName,
          amount: Number(i.grossAmount),
          status: i.status,
          who: i.user?.name || i.user?.email || null,
        })),
      },
    };
  } catch (e) {
    return { error: String(e) };
  }
}
