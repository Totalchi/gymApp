"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { addExerciseToDay } from "@/app/routines/actions";
import { expandSearchTerms } from "@/lib/exerciseSearch";
import { useT } from "@/components/LangProvider";
import { MUSCLE_GROUPS, type Exercise } from "@/lib/types";

export function ExercisePicker({
  dayId,
  routineId,
  onClose,
  onPick,
}: {
  dayId?: string;
  routineId?: string;
  onClose: () => void;
  /** Indien gegeven: kies een oefening (i.p.v. direct aan een dag toevoegen). */
  onPick?: (exercise: Exercise) => void;
}) {
  const [query, setQuery] = useState("");
  const [muscle, setMuscle] = useState<string>("");
  const [results, setResults] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(false);
  const [added, setAdded] = useState<Set<string>>(new Set());
  const t = useT();

  useEffect(() => {
    const supabase = createClient();
    let active = true;
    setLoading(true);

    const timer = setTimeout(async () => {
      let q = supabase
        .from("exercises")
        .select("*")
        .order("name")
        .limit(60);

      if (query.trim()) {
        // Zoek op de term + synoniemen (bv. "pec deck" -> "Butterfly").
        const terms = expandSearchTerms(query);
        if (terms.length > 1) {
          q = q.or(terms.map((t) => `name.ilike.%${t}%`).join(","));
        } else {
          q = q.ilike("name", `%${terms[0]}%`);
        }
      }
      if (muscle) q = q.contains("primary_muscles", [muscle]);

      const { data } = await q;
      if (active) {
        setResults((data as Exercise[]) ?? []);
        setLoading(false);
      }
    }, 250);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [query, muscle]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-line bg-surface"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header + filters */}
        <div className="border-b border-line p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-lg font-semibold">{t("ex.chooseExercise")}</h3>
            <button
              onClick={onClose}
              className="rounded-lg px-3 py-1.5 text-sm text-muted hover:bg-surface2"
            >
              {t("common.done")}
            </button>
          </div>
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("ex.search")}
            className="mb-3 w-full rounded-xl border border-line bg-canvas px-3.5 py-2.5 placeholder:text-faint focus:border-primary focus:outline-none"
          />
          <div className="flex flex-wrap gap-1.5">
            <FilterChip active={muscle === ""} onClick={() => setMuscle("")}>
              {t("ex.all")}
            </FilterChip>
            {MUSCLE_GROUPS.map((m) => (
              <FilterChip
                key={m}
                active={muscle === m}
                onClick={() => setMuscle(m)}
              >
                {m}
              </FilterChip>
            ))}
          </div>
        </div>

        {/* Resultaten */}
        <div className="scrollbar-thin flex-1 overflow-y-auto p-3">
          {loading ? (
            <p className="py-10 text-center text-sm text-faint">{t("common.loading")}</p>
          ) : results.length === 0 ? (
            <p className="py-10 text-center text-sm text-faint">{t("ex.none")}</p>
          ) : (
            <ul className="space-y-1.5">
              {results.map((ex) => {
                const meta = (
                  <>
                    <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-white ring-1 ring-line">
                      {ex.image_urls?.[0] ? (
                        <Image
                          src={ex.image_urls[0]}
                          alt={ex.name}
                          fill
                          sizes="48px"
                          className="object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          🏋️
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{ex.name}</p>
                      <p className="truncate text-xs text-faint">
                        {ex.primary_muscles.join(", ")}
                        {ex.equipment ? ` · ${ex.equipment}` : ""}
                      </p>
                    </div>
                  </>
                );
                const label = added.has(ex.id) ? t("ex.addAnother") : t("ex.add");
                return (
                  <li key={ex.id}>
                    {onPick ? (
                      <button
                        type="button"
                        onClick={() => {
                          onPick(ex);
                          setAdded((prev) => new Set(prev).add(ex.id));
                        }}
                        className="flex w-full items-center gap-3 rounded-xl p-2 text-left transition hover:bg-surface2/70"
                      >
                        {meta}
                        <span className="shrink-0 rounded-lg bg-primary px-3 py-1.5 text-sm font-semibold text-white">
                          {label}
                        </span>
                      </button>
                    ) : (
                      <form
                        action={addExerciseToDay}
                        onSubmit={() => setAdded((prev) => new Set(prev).add(ex.id))}
                        className="flex items-center gap-3 rounded-xl p-2 transition hover:bg-surface2/70"
                      >
                        <input type="hidden" name="day_id" value={dayId} />
                        <input type="hidden" name="routine_id" value={routineId} />
                        <input type="hidden" name="exercise_id" value={ex.id} />
                        {meta}
                        <button
                          type="submit"
                          className="shrink-0 rounded-lg bg-primary px-3 py-1.5 text-sm font-semibold text-white transition hover:brightness-110"
                        >
                          {label}
                        </button>
                      </form>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-2.5 py-1 text-xs capitalize ring-1 transition ${
        active
          ? "bg-primary text-white ring-primary"
          : "bg-canvas text-muted ring-line hover:ring-muted"
      }`}
    >
      {children}
    </button>
  );
}
