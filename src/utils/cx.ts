// Utilitas kelas kecil (pengganti ringan clsx + tailwind-merge) untuk komponen aset bersama
// gaya Untitled UI. cx menggabungkan kelas yang truthy; sortCx = identitas (bantu sorting editor).
export function cx(...args: Array<string | false | null | undefined>): string {
  return args.filter(Boolean).join(" ");
}

export function sortCx<T>(config: T): T {
  return config;
}
