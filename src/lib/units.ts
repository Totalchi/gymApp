export type WeightUnit = "kg" | "lb";

/**
 * Eenvoudige units-helper. Gewichten worden opgeslagen in de eenheid die de
 * gebruiker invoert; deze helper zorgt alleen voor de juiste labels.
 */
export function unitLabel(unit: WeightUnit | null | undefined): string {
  return unit === "lb" ? "lb" : "kg";
}
