"use client";

import { useState } from "react";
import { CustomExerciseForm } from "@/components/CustomExerciseForm";
import { ExerciseBrowser } from "@/components/ExerciseBrowser";

export function ExercisesView() {
  const [refreshKey, setRefreshKey] = useState(0);
  return (
    <div>
      <CustomExerciseForm onCreated={() => setRefreshKey((k) => k + 1)} />
      <ExerciseBrowser refreshKey={refreshKey} />
    </div>
  );
}
