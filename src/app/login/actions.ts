"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";

async function siteOrigin(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "";
  const proto = h.get("x-forwarded-proto") ?? "https";
  return `${proto}://${host}`;
}

export interface AuthState {
  error?: string;
  message?: string;
}

export async function login(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Vul je e-mailadres en wachtwoord in." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: "Inloggen mislukt: controleer je gegevens." };
  }

  revalidatePath("/", "layout");
  redirect("/dashboard");
}

export async function signup(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const displayName = String(formData.get("display_name") ?? "").trim();
  const role = String(formData.get("role") ?? "athlete") === "coach" ? "coach" : "athlete";

  if (!email || !password) {
    return { error: "Vul je e-mailadres en wachtwoord in." };
  }
  if (password.length < 6) {
    return { error: "Wachtwoord moet minstens 6 tekens zijn." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { display_name: displayName || undefined, role } },
  });

  if (error) {
    return { error: `Registreren mislukt: ${error.message}` };
  }

  // Als e-mailbevestiging aanstaat is er nog geen sessie.
  if (data.session) {
    revalidatePath("/", "layout");
    redirect("/dashboard");
  }

  return {
    message:
      "Account aangemaakt! Bevestig je e-mailadres via de mail die we stuurden en log daarna in.",
  };
}

export async function signout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}

/** Stuur een wachtwoord-herstel mail. */
export async function requestPasswordReset(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim();
  if (!email) return { error: "Vul je e-mailadres in." };

  const supabase = await createClient();
  const origin = await siteOrigin();
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?next=/reset`,
  });

  // Altijd dezelfde melding (lekt niet of een e-mail bestaat).
  return {
    message:
      "Als er een account bestaat met dit e-mailadres, sturen we een herstel-link. Check je inbox.",
  };
}

/** Stel een nieuw wachtwoord in (na het volgen van de herstel-link). */
export async function updatePassword(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const password = String(formData.get("password") ?? "");
  if (password.length < 6) {
    return { error: "Wachtwoord moet minstens 6 tekens zijn." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Herstel-link verlopen of ongeldig. Vraag een nieuwe aan." };
  }

  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: `Bijwerken mislukt: ${error.message}` };

  revalidatePath("/", "layout");
  redirect("/dashboard");
}
