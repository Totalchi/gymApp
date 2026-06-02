/**
 * Krachtniveau-inschatting voor de grote basisoefeningen, op basis van
 * geschat 1RM ten opzichte van lichaamsgewicht (benadering, mannelijke
 * standaarden). Levels: Beginner / Gevorderd / Sterk / Elite.
 */

export type StrengthStandard = {
  beginner: number;
  intermediate: number;
  advanced: number;
  elite: number;
};

// Vermenigvuldigers van het lichaamsgewicht (1RM / bodyweight).
const STANDARDS: Record<string, StrengthStandard> = {
  bench: { beginner: 0.5, intermediate: 0.75, advanced: 1.25, elite: 1.75 },
  squat: { beginner: 0.75, intermediate: 1.25, advanced: 1.75, elite: 2.25 },
  deadlift: { beginner: 1.0, intermediate: 1.5, advanced: 2.0, elite: 2.5 },
};

/** Welke standaard hoort bij deze oefening-id (of null). */
export function liftKey(exerciseId: string): keyof typeof STANDARDS | null {
  const id = exerciseId.toLowerCase();
  if (id.includes("bench_press")) return "bench";
  if (id.includes("deadlift") && !id.includes("stiff") && !id.includes("romanian"))
    return "deadlift";
  if (id.includes("squat")) return "squat";
  return null;
}

export interface StrengthLevel {
  label: "Beginner" | "Gevorderd" | "Sterk" | "Elite";
  ratio: number;
  /** Voortgang (0..1) richting elite, voor een balkje. */
  progress: number;
}

export function strengthLevel(
  exerciseId: string,
  oneRepMax: number,
  bodyweight: number,
): StrengthLevel | null {
  const key = liftKey(exerciseId);
  if (!key || !bodyweight || !oneRepMax) return null;
  const std = STANDARDS[key];
  const ratio = oneRepMax / bodyweight;

  let label: StrengthLevel["label"] = "Beginner";
  if (ratio >= std.elite) label = "Elite";
  else if (ratio >= std.advanced) label = "Sterk";
  else if (ratio >= std.intermediate) label = "Gevorderd";

  const progress = Math.max(0, Math.min(1, ratio / std.elite));
  return { label, ratio, progress };
}
