/** Plate calculator: welke schijven leg je per kant op de stang. */

export const DEFAULT_PLATES = [25, 20, 15, 10, 5, 2.5, 1.25];

export interface PlateResult {
  perSide: { plate: number; count: number }[];
  leftover: number; // gewicht dat niet exact te maken is (per kant)
  achievable: number; // totaalgewicht dat je echt haalt
}

/**
 * Bereken de schijven per kant voor een doelgewicht.
 * @param total doelgewicht (incl. stang)
 * @param bar gewicht van de stang
 * @param plates beschikbare schijven (per stuk), aflopend gesorteerd
 */
export function calcPlates(
  total: number,
  bar = 20,
  plates: number[] = DEFAULT_PLATES,
): PlateResult {
  const perSideTarget = (total - bar) / 2;
  if (perSideTarget <= 0) {
    return { perSide: [], leftover: Math.max(0, perSideTarget), achievable: bar };
  }

  const sorted = [...plates].sort((a, b) => b - a);
  let remaining = perSideTarget;
  const perSide: { plate: number; count: number }[] = [];

  for (const p of sorted) {
    const count = Math.floor(remaining / p + 1e-9);
    if (count > 0) {
      perSide.push({ plate: p, count });
      remaining -= count * p;
    }
  }

  const loadedPerSide = perSideTarget - remaining;
  return {
    perSide,
    leftover: remaining,
    achievable: bar + loadedPerSide * 2,
  };
}
