import { redirect } from "next/navigation";

// Kanonik: /masuk (sesuai kontrak web account.ts). /login dijaga sebagai alias.
export default function LoginPage() {
  redirect("/masuk");
}
