import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

// Harness uji Vitest. env diterapkan SEBELUM modul uji diimpor — penting karena
// src/lib/midtrans/config.ts menangkap MIDTRANS_SERVER_KEY saat module load.
export default defineConfig({
  plugins: [tsconfigPaths()], // resolve alias "@/..." dari tsconfig
  test: {
    environment: "node",
    include: ["test/**/*.test.ts"],
    globals: true,
    env: {
      TZ: "Asia/Jakarta",
      MIDTRANS_SERVER_KEY: "TEST-SERVER-KEY",
    },
  },
});
