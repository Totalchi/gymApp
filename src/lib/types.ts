/** Soorten trainingsdagen die je aan een schema kunt toevoegen. */
export const DAY_TYPES = [
  "push",
  "pull",
  "legs",
  "upper",
  "lower",
  "full_body",
  "cardio",
  "rest",
  "custom",
] as const;

export type DayType = (typeof DAY_TYPES)[number];

export const DAY_TYPE_LABELS: Record<DayType, string> = {
  push: "Push",
  pull: "Pull",
  legs: "Legs",
  upper: "Upper",
  lower: "Lower",
  full_body: "Full body",
  cardio: "Cardio",
  rest: "Rustdag",
  custom: "Eigen",
};

/** Kleur (Tailwind classes) per dagtype voor een herkenbare UI. */
export const DAY_TYPE_COLORS: Record<DayType, string> = {
  push: "bg-rose-500/15 text-rose-300 ring-rose-500/30",
  pull: "bg-sky-500/15 text-sky-300 ring-sky-500/30",
  legs: "bg-amber-500/15 text-amber-300 ring-amber-500/30",
  upper: "bg-violet-500/15 text-violet-300 ring-violet-500/30",
  lower: "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30",
  full_body: "bg-fuchsia-500/15 text-fuchsia-300 ring-fuchsia-500/30",
  cardio: "bg-orange-500/15 text-orange-300 ring-orange-500/30",
  rest: "bg-slate-500/15 text-slate-300 ring-slate-500/30",
  custom: "bg-teal-500/15 text-teal-300 ring-teal-500/30",
};

export interface Exercise {
  id: string;
  name: string;
  category: string | null;
  level: string | null;
  mechanic: string | null;
  force: string | null;
  equipment: string | null;
  primary_muscles: string[];
  secondary_muscles: string[];
  instructions: string[];
  image_urls: string[];
  owner_id?: string | null;
}

export interface WorkoutSession {
  id: string;
  user_id: string;
  routine_id: string | null;
  day_id: string | null;
  day_name: string | null;
  performed_at: string;
  notes: string | null;
  duration_seconds: number | null;
}

export interface WorkoutSet {
  id: string;
  session_id: string;
  exercise_id: string;
  exercise_name: string | null;
  set_number: number;
  reps: number | null;
  weight: number | null;
  one_rep_max: number | null;
  rir: number | null;
  set_type: SetType;
  completed: boolean;
}

export interface Routine {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  created_at: string;
}

export interface RoutineDay {
  id: string;
  routine_id: string;
  name: string;
  day_type: DayType;
  day_order: number;
}

export interface RoutineExercise {
  id: string;
  day_id: string;
  exercise_id: string;
  position: number;
  sets: number;
  reps: number;
  reps_max: number | null;
  weight: number | null;
  one_rep_max: number | null;
  rir: number | null;
  rir_max: number | null;
  notes: string | null;
  rest: string | null;
  rest_seconds: number | null;
  superset_group: number | null;
}

/** Set-types zoals in Hevy. */
export const SET_TYPES = ["warmup", "normal", "drop", "failure"] as const;
export type SetType = (typeof SET_TYPES)[number];

export const SET_TYPE_LABELS: Record<SetType, string> = {
  warmup: "W",
  normal: "",
  drop: "D",
  failure: "F",
};

export const SET_TYPE_COLORS: Record<SetType, string> = {
  warmup: "text-amber-400",
  normal: "text-slate-400",
  drop: "text-sky-400",
  failure: "text-rose-400",
};

export interface RoutineFolder {
  id: string;
  user_id: string;
  name: string;
  position: number;
}

export interface BodyMetric {
  id: string;
  user_id: string;
  measured_at: string;
  weight: number | null;
  body_fat: number | null;
  chest: number | null;
  waist: number | null;
  arms: number | null;
  thighs: number | null;
  notes: string | null;
}

/** RoutineExercise samengevoegd met de oefeningdata (voor weergave). */
export interface RoutineExerciseWithExercise extends RoutineExercise {
  exercise: Exercise;
}

export interface RoutineDayWithExercises extends RoutineDay {
  exercises: RoutineExerciseWithExercise[];
}

/** Volledige spiergroepenlijst uit de dataset, voor filters. */
export const MUSCLE_GROUPS = [
  "abdominals",
  "abductors",
  "adductors",
  "biceps",
  "calves",
  "chest",
  "forearms",
  "glutes",
  "hamstrings",
  "lats",
  "lower back",
  "middle back",
  "neck",
  "quadriceps",
  "shoulders",
  "traps",
  "triceps",
] as const;
