import { prisma } from "@/lib/prisma";

// Statistik ringkas untuk dashboard /admin. Read-only, dibungkus try/catch supaya
// halaman admin tetap tampil (dengan pesan) walau DB sedang tak terjangkau.
const PAID = ["paid", "settlement"];

export type AdminInvoiceRow = {
  orderId: string;
  itemName: string | null;
  amount: number;
  status: string;
  who: string | null; // nama/email pemilik invoice
  createdAt: Date | null;
};

export type AdminOverview = {
  revenueMonth: number;
  paidCountMonth: number;
  pendingCount: number;
  pendingSum: number;
  totalUsers: number;
  newUsersMonth: number;
  activeSubs: number;
  recent: AdminInvoiceRow[];
  pending: AdminInvoiceRow[];
};

const rowSelect = {
  orderId: true,
  itemName: true,
  grossAmount: true,
  status: true,
  createdAt: true,
  user: { select: { name: true, email: true } },
} as const;

type SelectedRow = {
  orderId: string;
  itemName: string | null;
  grossAmount: unknown;
  status: string;
  createdAt: Date | null;
  user: { name: string | null; email: string | null } | null;
};

function toRow(r: SelectedRow): AdminInvoiceRow {
  return {
    orderId: r.orderId,
    itemName: r.itemName,
    amount: Number(r.grossAmount ?? 0),
    status: r.status,
    who: r.user?.name || r.user?.email || null,
    createdAt: r.createdAt,
  };
}

export async function getAdminOverview(): Promise<{ data?: AdminOverview; error?: string }> {
  try {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [revAgg, pendAgg, totalUsers, newUsersMonth, activeSubs, recent, pending] = await Promise.all([
      prisma.invoice.aggregate({
        _sum: { grossAmount: true },
        _count: true,
        where: { status: { in: PAID }, paidAt: { gte: monthStart } },
      }),
      prisma.invoice.aggregate({
        _sum: { grossAmount: true },
        _count: true,
        where: { status: "pending" },
      }),
      prisma.user.count(),
      prisma.user.count({ where: { createdAt: { gte: monthStart } } }),
      prisma.subscription.count({ where: { status: "active" } }),
      prisma.invoice.findMany({ orderBy: { createdAt: "desc" }, take: 10, select: rowSelect }),
      prisma.invoice.findMany({ where: { status: "pending" }, orderBy: { createdAt: "desc" }, take: 8, select: rowSelect }),
    ]);

    return {
      data: {
        revenueMonth: Number(revAgg._sum.grossAmount ?? 0),
        paidCountMonth: revAgg._count,
        pendingCount: pendAgg._count,
        pendingSum: Number(pendAgg._sum.grossAmount ?? 0),
        totalUsers,
        newUsersMonth,
        activeSubs,
        recent: recent.map(toRow),
        pending: pending.map(toRow),
      },
    };
  } catch (e) {
    return { error: String(e) };
  }
}
