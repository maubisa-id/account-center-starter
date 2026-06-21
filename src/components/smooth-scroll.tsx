"use client";

import { useEffect } from "react";
import Lenis from "lenis";

// Smooth-scroll global (Lenis) yang sengaja dibuat RINGAN & aman lintas perangkat:
// - Perangkat sentuh (pointer kasar: HP/tablet) -> pakai scroll native (sudah mulus, tanpa
//   overhead RAF). Ini menjaga perangkat lama tetap responsif.
// - Pengguna dengan preferensi "reduce motion" -> tidak diaktifkan sama sekali.
// - Selain itu (mouse/trackpad desktop) -> haluskan roda scroll dengan lerp lembut.
// Tidak merender apa pun; hanya efek samping siklus hidup.
export function SmoothScroll() {
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const coarse = window.matchMedia("(pointer: coarse)").matches;
    if (reduced || coarse) return;

    const lenis = new Lenis({ lerp: 0.12, smoothWheel: true });
    let frame = 0;
    const loop = (time: number) => {
      lenis.raf(time);
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(frame);
      lenis.destroy();
    };
  }, []);

  return null;
}
