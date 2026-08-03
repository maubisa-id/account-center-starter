// Kebijakan gerbang MFA operator, dipakai BERSAMA oleh admin layout dan halaman yang
// admin-reachable di luar layout (mis. cetak invoice pelanggan). Dipusatkan supaya tak ada
// permukaan admin yang lolos dari kontrol MFA (PCI Req8, SOC2 CC6.6, ISO A.8.5).
//
// Default FAIL-CLOSED di produksi: MFA wajib kecuali di-nonaktifkan eksplisit (ADMIN_REQUIRE_MFA=0)
// atau lingkungan DEMO (NEXT_PUBLIC_DEMO_MODE=1, supaya akun demo tanpa 2FA tetap bisa memperagakan
// /admin). ADMIN_REQUIRE_MFA=1 memaksa wajib bahkan di demo.
export function adminMfaRequired(): boolean {
  const flag = process.env.ADMIN_REQUIRE_MFA;
  if (flag === "1") return true;
  if (flag === "0") return false;
  const isDemo = process.env.NEXT_PUBLIC_DEMO_MODE === "1";
  return !isDemo;
}
