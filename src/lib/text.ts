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
