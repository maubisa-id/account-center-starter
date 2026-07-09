import { Badge } from "@/components/ui";
import { idr, tanggal } from "@/lib/format";
import type { EventRegistration } from "@/lib/event-registrations";

// Tabel pendaftar acara (read-only). Desktop: tabel; ponsel: kartu bertumpuk supaya
// tetap terbaca tanpa scroll horizontal. Presentational — tak ada state.

function waHref(phone: string) {
  const digits = phone.replace(/\D/g, "").replace(/^0/, "62");
  return `https://wa.me/${digits}`;
}

function JenisBadge({ source }: { source: EventRegistration["source"] }) {
  return <Badge value={source === "free" ? "gratis" : "berbayar"} />;
}

export function RegistrationsTable({ rows }: { rows: EventRegistration[] }) {
  if (rows.length === 0) return null;
  return (
    <>
      <div className="hidden overflow-hidden rounded-2xl ring-1 ring-inset ring-black/5 md:block">
        <table className="w-full text-left text-sm">
          <thead className="bg-black/[0.03] text-xs uppercase tracking-wide text-zinc-500">
            <tr>
              <th className="px-4 py-3 font-semibold">Tanggal</th>
              <th className="px-4 py-3 font-semibold">Pendaftar</th>
              <th className="px-4 py-3 font-semibold">Acara</th>
              <th className="px-4 py-3 font-semibold">Jenis</th>
              <th className="px-4 py-3 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black/5">
            {rows.map((r, i) => (
              <tr key={i} className="align-top">
                <td className="whitespace-nowrap px-4 py-3 text-zinc-500">{tanggal(r.date)}</td>
                <td className="px-4 py-3">
                  <div className="font-medium text-ink">{r.name || "—"}</div>
                  <div className="text-xs text-zinc-500">{r.email}</div>
                  {r.phone ? (
                    <a
                      href={waHref(r.phone)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-medium text-brand-600 hover:underline"
                    >
                      {r.phone}
                    </a>
                  ) : null}
                </td>
                <td className="px-4 py-3">
                  <div className="text-ink">{r.eventTitle}</div>
                  {r.org ? <div className="text-xs text-zinc-500">{r.org}</div> : null}
                </td>
                <td className="px-4 py-3">
                  <JenisBadge source={r.source} />
                </td>
                <td className="px-4 py-3">
                  {r.source === "paid" ? (
                    <div className="flex flex-col gap-1">
                      <Badge value={r.status} />
                      <span className="text-xs text-zinc-500">{idr(r.amount)}</span>
                    </div>
                  ) : (
                    <span className="text-xs text-zinc-500">Terdaftar</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="space-y-3 md:hidden">
        {rows.map((r, i) => (
          <li key={i} className="rounded-2xl p-4 ring-1 ring-inset ring-black/5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="truncate font-medium text-ink">{r.name || "—"}</div>
                <div className="truncate text-xs text-zinc-500">{r.email}</div>
              </div>
              <JenisBadge source={r.source} />
            </div>
            <div className="mt-2 text-sm text-ink">{r.eventTitle}</div>
            <div className="mt-3 flex items-center justify-between gap-2">
              <span className="text-xs text-zinc-500">{tanggal(r.date)}</span>
              {r.source === "paid" ? (
                <span className="flex items-center gap-2 text-xs text-zinc-500">
                  {idr(r.amount)}
                  <Badge value={r.status} />
                </span>
              ) : (
                <span className="text-xs text-zinc-500">Terdaftar</span>
              )}
            </div>
            {r.phone ? (
              <a
                href={waHref(r.phone)}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-block text-xs font-medium text-brand-600 hover:underline"
              >
                WhatsApp: {r.phone}
              </a>
            ) : null}
          </li>
        ))}
      </ul>
    </>
  );
}
