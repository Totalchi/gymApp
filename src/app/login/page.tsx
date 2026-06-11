import { AuthForm } from "@/components/AuthForm";
import { AuthTopBar } from "@/components/AuthTopBar";

export default function LoginPage() {
  return (
    <main className="relative flex min-h-screen items-center justify-center px-4">
      <AuthTopBar />
      <AuthForm mode="login" />
    </main>
  );
}
