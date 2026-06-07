import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * Wisselt de code uit een e-maillink (wachtwoordherstel of e-mailbevestiging)
 * om voor een sessie en stuurt door naar `next` (of het dashboard).
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") ?? "/dashboard";

  const forwardedHost = request.headers.get("x-forwarded-host");
  const proto = request.headers.get("x-forwarded-proto") ?? "https";
  const origin = forwardedHost ? `${proto}://${forwardedHost}` : url.origin;

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next.startsWith("/") ? next : "/dashboard"}`);
    }
  }
  return NextResponse.redirect(`${origin}/login?error=auth`);
}
