import { PrismaClient } from "@prisma/client";
import { assertDbUrlMatchesProvider } from "@/lib/db-config";

// Guard fail-fast: pastikan DATABASE_URL cocok dengan DB_PROVIDER sebelum konek
// (menutup AUDIT P2 — cegah drift sqlite<->mysql yang senyap saat pindah produksi).
assertDbUrlMatchesProvider();

// Singleton Prisma client. Di dev, Next.js hot-reload bisa bikin banyak koneksi;
// simpan di globalThis supaya cuma satu instance.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
