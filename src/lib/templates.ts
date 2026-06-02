import type { DayType } from "@/lib/types";

export interface TemplateExercise {
  exerciseId: string;
  sets: number;
  reps: number;
}
export interface TemplateDay {
  name: string;
  dayType: DayType;
  exercises: TemplateExercise[];
}
export interface RoutineTemplate {
  id: string;
  name: string;
  description: string;
  level: string;
  days: TemplateDay[];
}

const e = (exerciseId: string, sets = 3, reps = 10): TemplateExercise => ({
  exerciseId,
  sets,
  reps,
});

/** Kant-en-klare programma's. Oefening-id's komen uit de free-exercise-db dataset. */
export const ROUTINE_TEMPLATES: RoutineTemplate[] = [
  {
    id: "ppl",
    name: "Push / Pull / Legs",
    description: "Klassiek 6-daags schema, gericht op spiergroei.",
    level: "Gemiddeld",
    days: [
      {
        name: "Push",
        dayType: "push",
        exercises: [
          e("Barbell_Bench_Press_-_Medium_Grip", 4, 8),
          e("Incline_Dumbbell_Press", 3, 10),
          e("Standing_Dumbbell_Press", 3, 10),
          e("Side_Lateral_Raise", 3, 15),
          e("Cable_Crossover", 3, 12),
          e("Triceps_Pushdown", 3, 12),
        ],
      },
      {
        name: "Pull",
        dayType: "pull",
        exercises: [
          e("Bent_Over_Barbell_Row", 4, 8),
          e("Wide-Grip_Lat_Pulldown", 3, 10),
          e("Seated_Cable_Rows", 3, 10),
          e("Face_Pull", 3, 15),
          e("Barbell_Curl", 3, 10),
          e("Hammer_Curls", 3, 12),
        ],
      },
      {
        name: "Legs",
        dayType: "legs",
        exercises: [
          e("Barbell_Full_Squat", 4, 8),
          e("Romanian_Deadlift", 3, 10),
          e("Leg_Press", 3, 12),
          e("Lying_Leg_Curls", 3, 12),
          e("Standing_Calf_Raises", 4, 15),
          e("Hanging_Leg_Raise", 3, 12),
        ],
      },
    ],
  },
  {
    id: "upper-lower",
    name: "Upper / Lower",
    description: "4-daags schema, balans tussen kracht en groei.",
    level: "Gemiddeld",
    days: [
      {
        name: "Upper",
        dayType: "upper",
        exercises: [
          e("Barbell_Bench_Press_-_Medium_Grip", 4, 8),
          e("Bent_Over_Barbell_Row", 4, 8),
          e("Barbell_Shoulder_Press", 3, 10),
          e("Wide-Grip_Lat_Pulldown", 3, 10),
          e("Barbell_Curl", 3, 12),
          e("Triceps_Pushdown", 3, 12),
        ],
      },
      {
        name: "Lower",
        dayType: "lower",
        exercises: [
          e("Barbell_Full_Squat", 4, 8),
          e("Romanian_Deadlift", 3, 10),
          e("Leg_Press", 3, 12),
          e("Seated_Leg_Curl", 3, 12),
          e("Standing_Calf_Raises", 4, 15),
          e("Plank", 3, 1),
        ],
      },
    ],
  },
  {
    id: "fullbody",
    name: "Full Body (3×/week)",
    description: "Ideaal voor beginners: 3 keer per week het hele lichaam.",
    level: "Beginner",
    days: [
      {
        name: "Full body A",
        dayType: "full_body",
        exercises: [
          e("Barbell_Full_Squat", 3, 8),
          e("Barbell_Bench_Press_-_Medium_Grip", 3, 8),
          e("Bent_Over_Barbell_Row", 3, 8),
          e("Standing_Dumbbell_Press", 3, 10),
          e("Plank", 3, 1),
        ],
      },
      {
        name: "Full body B",
        dayType: "full_body",
        exercises: [
          e("Romanian_Deadlift", 3, 8),
          e("Incline_Dumbbell_Press", 3, 10),
          e("Wide-Grip_Lat_Pulldown", 3, 10),
          e("Leg_Press", 3, 12),
          e("Hammer_Curls", 3, 12),
        ],
      },
    ],
  },
];
