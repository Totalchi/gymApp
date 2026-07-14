import Link from "next/link";
import { getT } from "@/lib/serverLang";

export default async function NotFound() {
  const { t } = await getT();
  return (
    <main className="flex min-h-[70vh] flex-col items-center justify-center px-4 text-center">
      <div className="text-4xl">🔍</div>
      <h1 className="mt-3 text-xl font-bold">{t("nf.title")}</h1>
      <p className="mt-1 max-w-sm text-sm text-muted">{t("nf.sub")}</p>
      <Link
        href="/dashboard"
        className="mt-5 btn-primary"
      >
        {t("nf.home")}
      </Link>
    </main>
  );
}
