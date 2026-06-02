"use client";

import { createContext, useContext } from "react";
import type { WeightUnit } from "@/lib/units";

const UnitContext = createContext<WeightUnit>("kg");

export function UnitProvider({
  unit,
  children,
}: {
  unit: WeightUnit;
  children: React.ReactNode;
}) {
  return <UnitContext.Provider value={unit}>{children}</UnitContext.Provider>;
}

/** Geeft het gekozen gewichts-label ("kg" of "lb"). */
export function useUnit(): WeightUnit {
  return useContext(UnitContext);
}
