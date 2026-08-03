import Link from "next/link";
import { SERVICE_LINE, SERVICE_LINE_ORDER, type ServiceScope } from "@/lib/service-lines";

// Filter lini layanan untuk halaman admin. Server component murni: merender pill <Link>
// (tanpa JS klien) yang menyetel ?scope=. Query lain (mis. ?q=) dipertahankan supaya
// filter + pencarian bisa dipakai bersamaan. scope kosong = "Semua layanan".
export function ScopeFilter({
  basePath,
  current,
  params = {},
}: {
  basePath: string;
  current?: string | null;
  params?: Record<string, string | undefined>;
}) {
  function href(scope?: ServiceScope) {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v && k !== "scope") sp.set(k, v);
    }
    if (scope) sp.set("scope", scope);
    const qs = sp.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  }

  const options: Array<{ key: string; label: string; scope?: ServiceScope }> = [
    { key: "all", label: "Semua layanan" },
    ...SERVICE_LINE_ORDER.map((s) => ({ key: s, label: SERVICE_LINE[s].name, scope: s })),
  ];
  const active = current ?? "all";

  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => {
        const isActive = o.key === active;
        return (
          <Link
            key={o.key}
            href={href(o.scope)}
            className={`rounded-full px-3.5 py-1.5 text-xs font-semibold ring-1 ring-inset transition-colors ${
              isActive
                ? "bg-brand-500 text-white ring-brand-500"
                : "bg-white text-zinc-600 ring-black/[0.08] hover:bg-zinc-50 hover:text-ink"
            }`}
          >
            {o.label}
          </Link>
        );
      })}
    </div>
  );
}
