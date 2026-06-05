// Dubbele progressie met RIR-autoregulatie.
// Bepaalt of je op een oefening zwaarder mag t.o.v. je vorige sessie.

export interface PrevWorkingSet {
  weight: number | null;
  reps: number | null;
  rir: number | null;
}

export interface ProgressionTarget {
  repLow: number | null;
  repHigh: number | null;
  rir: number | null; // doel-RIR (kracht over aan het eind)
}

export interface ProgressionSuggestion {
  kind: "up" | "hold";
  /** Voorgesteld werkgewicht voor de volgende sessie. */
  weight: number;
  /** Toename t.o.v. vorige keer (0 bij 'hold'). */
  delta: number;
}

function roundToHalf(n: number): number {
  return Math.round(n * 2) / 2;
}

/**
 * Suggereert het volgende werkgewicht op basis van je vorige werksets en het
 * doel-rep-bereik + doel-RIR uit het schema.
 *
 * Regel: haalde je op je zwaarste werkgewicht de BOVENKANT van het rep-bereik
 * én had je nog kracht over (RIR ≥ doel, of RIR niet gelogd), dan +één stap.
 * Anders: zelfde gewicht aanhouden (eerst reps opbouwen).
 */
export function suggestProgression(
  prev: PrevWorkingSet[],
  target: ProgressionTarget,
  step = 2.5,
): ProgressionSuggestion | null {
  const working = prev.filter(
    (s): s is { weight: number; reps: number; rir: number | null } =>
      s.weight != null && s.weight > 0 && s.reps != null,
  );
  if (working.length === 0) return null;

  const topWeight = Math.max(...working.map((s) => s.weight));
  const setsAtTop = working.filter((s) => Math.abs(s.weight - topWeight) < 0.01);
  const minReps = Math.min(...setsAtTop.map((s) => s.reps));
  // Onbekende RIR (null) → geen bezwaar tegen verhogen.
  const knownRirs = setsAtTop.map((s) => s.rir).filter((r): r is number => r != null);
  const minRir = knownRirs.length ? Math.min(...knownRirs) : null;

  const repHigh = target.repHigh ?? target.repLow;
  const targetRir = target.rir ?? 2;

  const hitTop = repHigh != null && minReps >= repHigh;
  const hadReserve = minRir == null || minRir >= targetRir;

  if (hitTop && hadReserve) {
    const weight = roundToHalf(topWeight + step);
    return { kind: "up", weight, delta: roundToHalf(weight - topWeight) };
  }
  return { kind: "hold", weight: topWeight, delta: 0 };
}
