"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

// Transisi antar-halaman: fade + naik tipis yang dipicu ulang tiap ganti rute (key = pathname).
// Hanya opacity + transform (dikomposisi GPU) -> murah dan mulus bahkan di perangkat lama.
// Otomatis nonaktif saat pengguna memilih "reduce motion" (lihat globals.css).
export function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return (
    <div key={pathname} className="animate-page">
      {children}
    </div>
  );
}
