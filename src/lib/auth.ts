import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

/**
 * Haalt de ingelogde gebruiker op, gecachet per request (React cache). Roep je
 * dit meerdere keren tijdens dezelfde render aan, dan gebeurt de auth-call maar
 * één keer.
 */
export const getCachedUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});
