import Link from "next/link";
import { LoginCard } from "@/components/LoginCard";

export const metadata = { title: "Iniciar sesión — PlaticApp" };

export default function LoginPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-4 sm:p-6">
      <Link href="/" className="self-start text-[13px] text-[var(--color-accent)] hover:underline">
        ← Volver a la página principal
      </Link>
      <LoginCard />
    </main>
  );
}
