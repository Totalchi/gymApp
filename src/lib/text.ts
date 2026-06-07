/**
 * Maakt gebruikersinvoer veilig voor gebruik in een PostgREST-filterstring
 * (zoals supabase `.or("col.ilike.%x%")`). Verwijdert tekens die de filter-
 * syntax kunnen kapen: komma's, haakjes, dubbele punt, wildcards en backslash.
 */
export function sanitizeFilter(s: string): string {
  return s
    .replace(/[,()%*:\\]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Valideert dat een string een geldige UUID is (voor veilige route-params). */
export function isUuid(s: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
}
