import { LanguageToggle } from "@/components/LanguageToggle";
import { ThemeToggle } from "@/components/ThemeToggle";

/** Taal- en themaknop rechtsboven op de auth-schermen (login/registratie/herstel). */
export function AuthTopBar() {
  return (
    <div
      className="absolute right-4 flex items-center gap-2"
      style={{ top: "calc(env(safe-area-inset-top) + 1rem)" }}
    >
      <LanguageToggle />
      <ThemeToggle />
    </div>
  );
}
