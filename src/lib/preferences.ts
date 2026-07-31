import { prisma } from "@/lib/prisma";

// Baca preferensi user berdasarkan core_user_id (uuid). INI POLA yang dipakai app.example.com
// & kelas.example.com untuk personalisasi: mereka punya core_user_id tiap user, lalu membaca
// preferensi dari core (idealnya di-cache di Redis, TTL pendek — lihat skalabilitas.md §5).
//
// Preferensi disimpan sebagai flag boolean di user_preferences dgn key ber-namespace:
//   "interest:<slug>"  -> minat topik (personalisasi konten)
//   "goal:<slug>"      -> tujuan (opsional)
// Fungsi ini mengembalikan daftar slug yang aktif per namespace.

export async function getUserPreferences(coreUuid: string): Promise<{
  interests: string[];
  goals: string[];
  all: Record<string, boolean>;
}> {
  const user = await prisma.user.findFirst({ where: { uuid: coreUuid }, select: { id: true } });
  if (!user) return { interests: [], goals: [], all: {} };

  const rows = await prisma.userPreference.findMany({
    where: { userId: user.id, value: true },
    select: { key: true, value: true },
  });

  const all: Record<string, boolean> = {};
  const interests: string[] = [];
  const goals: string[] = [];
  for (const r of rows) {
    all[r.key] = r.value;
    if (r.key.startsWith("interest:")) interests.push(r.key.slice("interest:".length));
    else if (r.key.startsWith("goal:")) goals.push(r.key.slice("goal:".length));
  }
  return { interests, goals, all };
}
