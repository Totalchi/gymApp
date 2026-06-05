// Dubbele progressie op basis van reps (geen RIR vereist).
// Bepaalt of je op een oefening zwaarder mag t.o.v. je vorige sessie:
// haalde je de bovenkant van je rep-bereik op al je werksets, dan +één stap.

export interface PrevWorkingSet {
  weight: number | null;
  reps: number | null;
}

export interface ProgressionTarget {
  repLow: number | null;
  repHigh: number | null;
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
 * doel-rep-bereik uit het schema.
 *
 * Regel: haalde je op je zwaarste werkgewicht de BOVENKANT van het rep-bereik
 * op al je werksets, dan +één stap. Anders: zelfde gewicht aanhouden (eerst
 * reps opbouwen). Geen RIR nodig — werkt op reps + gewicht die je toch logt.
 */
export function suggestProgression(
  prev: PrevWorkingSet[],
  target: ProgressionTarget,
  step = 2.5,
): ProgressionSuggestion | null {
  const working = prev.filter(
    (s): s is { weight: number; reps: number } =>
      s.weight != null && s.weight > 0 && s.reps != null,
  );
  if (working.length === 0) return null;

  const topWeight = Math.max(...working.map((s) => s.weight));
  const setsAtTop = working.filter((s) => Math.abs(s.weight - topWeight) < 0.01);
  const minReps = Math.min(...setsAtTop.map((s) => s.reps));

  const repHigh = target.repHigh ?? target.repLow;

  if (repHigh != null && minReps >= repHigh) {
    const weight = roundToHalf(topWeight + step);
    return { kind: "up", weight, delta: roundToHalf(weight - topWeight) };
  }
  return { kind: "hold", weight: topWeight, delta: 0 };
}
