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

export async function getAdminOverview(scope?: string): Promise<{ data?: AdminOverview; error?: string }> {
  try {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // Filter lini layanan (opsional). Invoice punya kolom scope langsung. Subscription TIDAK
    // punya scope -> disaring via productCode yang produknya ber-scope tsb. User bersifat
    // lintas-lini -> "punya" sebuah lini bila ada invoice/entitlement pada scope itu.
    const invScope = scope ? { scope } : {};
    const subCodes = scope
      ? (await prisma.product.findMany({ where: { scope }, select: { code: true } })).map((p) => p.code)
      : null;
    const subWhere = subCodes ? { status: "active", productCode: { in: subCodes } } : { status: "active" };
    const userWhere = scope
      ? { OR: [{ invoices: { some: { scope } } }, { entitlements: { some: { scope } } }] }
      : {};
    const userMonthWhere = scope
      ? { AND: [{ createdAt: { gte: monthStart } }, userWhere] }
      : { createdAt: { gte: monthStart } };

    const [revAgg, pendAgg, totalUsers, newUsersMonth, activeSubs, recent, pending] = await Promise.all([
      prisma.invoice.aggregate({
        _sum: { grossAmount: true },
        _count: true,
        where: { status: { in: PAID }, paidAt: { gte: monthStart }, ...invScope },
      }),
      prisma.invoice.aggregate({
        _sum: { grossAmount: true },
        _count: true,
        where: { status: "pending", ...invScope },
      }),
      prisma.user.count({ where: userWhere }),
      prisma.user.count({ where: userMonthWhere }),
      prisma.subscription.count({ where: subWhere }),
      prisma.invoice.findMany({ where: invScope, orderBy: { createdAt: "desc" }, take: 10, select: rowSelect }),
      prisma.invoice.findMany({ where: { status: "pending", ...invScope }, orderBy: { createdAt: "desc" }, take: 8, select: rowSelect }),
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
