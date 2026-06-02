/**
 * RIR (Reps In Reserve) berekening.
 *
 * Aanpak (zoals gekozen): geschatte 1RM + RPE/RIR-tabel.
 *
 * 1. We bepalen een geschat 1RM (e1RM) per oefening.
 * 2. Voor een set met `gewicht` en `reps` berekenen we de intensiteit
 *    (= gewicht / e1RM, ofwel %1RM).
 * 3. Via de RPE/RIR-tabel zoeken we hoeveel reps je in totaal tot
 *    falen zou kunnen doen bij die intensiteit (reps-to-failure, RTF).
 * 4. RIR = RTF - uitgevoerde reps.
 *
 * De tabel hieronder is de gangbare RPE@10-rij van de bekende
 * Reps-In-Reserve/RPE-tabel (o.a. RTS / Mike Tuchscherer): het %1RM dat
 * je kunt tillen voor N reps tot falen. Dit is exact de curve die aan de
 * volledige RPE-tabel ten grondslag ligt, dus de berekening is consistent
 * met die tabel.
 *
 * Index 0 = 1 rep tot falen. Waarden zijn fracties van 1RM (0..1).
 */
export const PERCENT_BY_REPS_TO_FAILURE: readonly number[] = [
  1.0, // 1
  0.955, // 2
  0.922, // 3
  0.892, // 4
  0.863, // 5
  0.837, // 6
  0.811, // 7
  0.786, // 8
  0.762, // 9
  0.739, // 10
  0.707, // 11
  0.68, // 12
];

const MIN_TABLE_REPS = 1;
const MAX_TABLE_REPS = PERCENT_BY_REPS_TO_FAILURE.length; // 12

/**
 * Epley-formule voor geschat 1RM. Wordt gebruikt als val-terug buiten het
 * bereik van de tabel (zeer hoge reps / lage intensiteit).
 *   1RM = w * (1 + reps / 30)
 */
export function epleyOneRepMax(weight: number, reps: number): number {
  if (reps <= 1) return weight;
  return weight * (1 + reps / 30);
}

/** Inverse Epley: bij gegeven intensiteit (fractie 1RM) hoeveel reps tot falen. */
function epleyRepsToFailure(intensity: number): number {
  if (intensity >= 1) return 1;
  // intensity = 1 / (1 + N/30)  =>  N = 30 * (1/intensity - 1), met N = reps-1
  return 1 + 30 * (1 / intensity - 1);
}

/**
 * Geschat 1RM op basis van een referentieset, via de RPE/RIR-tabel.
 * Dit is nauwkeuriger en consistent met de RIR-berekening hieronder.
 *
 * @param weight gebruikt gewicht
 * @param reps uitgevoerde reps
 * @param rir reps in reserve van die set (0 = tot falen)
 */
export function estimateOneRepMax(
  weight: number,
  reps: number,
  rir = 0,
): number {
  if (weight <= 0 || reps <= 0) return 0;
  const rtf = reps + Math.max(0, rir);
  const pct = percentForRepsToFailure(rtf);
  return weight / pct;
}

/** %1RM voor een gegeven aantal reps-tot-falen (met interpolatie). */
export function percentForRepsToFailure(rtf: number): number {
  if (rtf <= MIN_TABLE_REPS) return PERCENT_BY_REPS_TO_FAILURE[0];
  if (rtf <= MAX_TABLE_REPS) {
    const lowerIdx = Math.floor(rtf) - 1;
    const upperIdx = Math.min(lowerIdx + 1, MAX_TABLE_REPS - 1);
    const frac = rtf - Math.floor(rtf);
    const lower = PERCENT_BY_REPS_TO_FAILURE[lowerIdx];
    const upper = PERCENT_BY_REPS_TO_FAILURE[upperIdx];
    return lower + (upper - lower) * frac;
  }
  // Buiten de tabel: val terug op Epley.
  return 1 / (1 + (rtf - 1) / 30);
}

/** Reps-tot-falen voor een gegeven intensiteit (fractie 1RM), met interpolatie. */
export function repsToFailureForIntensity(intensity: number): number {
  if (intensity >= PERCENT_BY_REPS_TO_FAILURE[0]) return 1;
  const last = PERCENT_BY_REPS_TO_FAILURE[MAX_TABLE_REPS - 1];
  if (intensity < last) {
    // Lichter dan de tabel dekt -> Epley-extrapolatie.
    return epleyRepsToFailure(intensity);
  }
  // Zoek het interval in de tabel waar de intensiteit in valt.
  for (let i = 0; i < MAX_TABLE_REPS - 1; i++) {
    const hi = PERCENT_BY_REPS_TO_FAILURE[i]; // hogere %1RM = minder reps
    const lo = PERCENT_BY_REPS_TO_FAILURE[i + 1];
    if (intensity <= hi && intensity >= lo) {
      const frac = (hi - intensity) / (hi - lo);
      return i + 1 + frac;
    }
  }
  return MAX_TABLE_REPS;
}

export interface RirInput {
  weight: number;
  reps: number;
  oneRepMax: number;
}

export interface RirResult {
  /** Reps in reserve, afgerond op 0.5, minimaal 0. */
  rir: number;
  /** RPE = 10 - RIR. */
  rpe: number;
  /** Intensiteit als %1RM (0..1). */
  intensity: number;
  /** Geschat totaal aantal reps tot falen bij dit gewicht. */
  repsToFailure: number;
}

/**
 * Bereken RIR voor een set, gegeven gewicht, reps en het (geschatte) 1RM
 * voor die oefening.
 */
export function computeRir({ weight, reps, oneRepMax }: RirInput): RirResult | null {
  if (oneRepMax <= 0 || weight <= 0 || reps <= 0) return null;

  const intensity = weight / oneRepMax;
  const repsToFailure = repsToFailureForIntensity(intensity);
  const rawRir = repsToFailure - reps;

  // Afronden op halve reps, niet negatief (je kunt niet "minder dan tot falen").
  const rir = Math.max(0, Math.round(rawRir * 2) / 2);
  const rpe = Math.min(10, Math.max(0, 10 - rir));

  return {
    rir,
    rpe,
    intensity,
    repsToFailure,
  };
}

/**
 * Handige helper: bereken RIR puur uit een set, waarbij het 1RM wordt
 * geschat uit een eerdere/zwaarste referentieset.
 */
export function computeRirFromReference(
  set: { weight: number; reps: number },
  reference: { weight: number; reps: number; rir?: number },
): RirResult | null {
  const oneRepMax = estimateOneRepMax(
    reference.weight,
    reference.reps,
    reference.rir ?? 0,
  );
  return computeRir({ weight: set.weight, reps: set.reps, oneRepMax });
}
