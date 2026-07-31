import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

// Unduh data pribadi (hak akses/portabilitas UU PDP). Hanya untuk pemilik sesi.
export async function GET(req: Request) {
  const limited = rateLimit(req, "account-export", { max: 5, windowMs: 5 * 60_000 });
  if (limited) return limited;

  const session = await auth.api.getSession({ headers: await headers() });
  const email = session?.user?.email;
  if (!email) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const user = await prisma.user.findFirst({
    where: { email },
    include: {
      subscriptions: true,
      invoices: { orderBy: { createdAt: "desc" } },
      entitlements: true,
      preferences: true,
      eventRegistrations: true,
      // Metadata kartu tersimpan saja (brand/last4/exp) — TOKEN sengaja TIDAK diekspor.
      paymentMethods: {
        select: {
          id: true, brand: true, bankCode: true, last4: true,
          expMonth: true, expYear: true, isPrimary: true, createdAt: true,
        },
      },
    },
  });
  if (!user) return NextResponse.json({ error: "not found" }, { status: 404 });

  const data = {
    exportedAt: new Date().toISOString(),
    account: {
      id: user.uuid,
      name: user.name,
      displayName: user.displayName,
      email: user.email,
      phone: user.phone,
      headline: user.headline,
      avatarUrl: user.avatarUrl,
      birthDate: user.birthDate,
      gender: user.gender,
      city: user.city,
      country: user.country,
      language: user.language,
      timezone: user.timezone,
      status: user.status,
      createdAt: user.createdAt,
    },
    subscriptions: user.subscriptions,
    invoices: user.invoices,
    entitlements: user.entitlements,
    paymentMethods: user.paymentMethods,
    eventRegistrations: user.eventRegistrations,
    preferences: user.preferences,
  };

  return new NextResponse(JSON.stringify(data, null, 2), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": `attachment; filename="maubisa-data-${user.uuid.slice(0, 8)}.json"`,
    },
  });
}
