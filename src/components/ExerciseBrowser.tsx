"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { deleteCustomExercise } from "@/app/exercises/actions";
import { ConfirmButton } from "@/components/ConfirmButton";
import { expandSearchTerms } from "@/lib/exerciseSearch";
import { useT } from "@/components/LangProvider";
import { MUSCLE_GROUPS, type Exercise } from "@/lib/types";

export function ExerciseBrowser({ refreshKey = 0 }: { refreshKey?: number }) {
  const t = useT();
  const [query, setQuery] = useState("");
  const [muscle, setMuscle] = useState("");
  const [results, setResults] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Exercise | null>(null);

  useEffect(() => {
    const supabase = createClient();
    let active = true;
    setLoading(true);
    const timer = setTimeout(async () => {
      // Eigen oefeningen eerst, daarna alfabetisch.
      let q = supabase
        .from("exercises")
        .select("*")
        .order("owner_id", { ascending: false, nullsFirst: false })
        .order("name")
        .limit(60);
      if (query.trim()) {
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
  }, [query, muscle, refreshKey]);

  return (
    <div>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={t("ex.search")}
        className="mb-3 w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 placeholder:text-faint focus:border-primary focus:outline-none"
      />
      <div className="mb-5 flex flex-wrap gap-1.5">
        <Chip active={muscle === ""} onClick={() => setMuscle("")}>
          {t("ex.all")}
        </Chip>
        {MUSCLE_GROUPS.map((m) => (
          <Chip key={m} active={muscle === m} onClick={() => setMuscle(m)}>
            {m}
          </Chip>
        ))}
      </div>

      {loading ? (
        <p className="py-10 text-center text-faint">{t("common.loading")}</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {results.map((ex) => (
            <button
              key={ex.id}
              onClick={() => setSelected(ex)}
              className="group overflow-hidden card text-left transition hover:-translate-y-0.5 hover:border-primary/40"
            >
              <div className="relative aspect-square w-full bg-white">
                {ex.image_urls?.[0] ? (
                  <Image
                    src={ex.image_urls[0]}
                    alt={ex.name}
                    fill
                    sizes="(max-width: 640px) 50vw, 25vw"
                    className="object-cover transition group-hover:scale-105"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-3xl">
                    🏋️
                  </div>
                )}
                {ex.owner_id && (
                  <span className="absolute left-2 top-2 rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold text-primary-fg">
                    {t("ex.own")}
                  </span>
                )}
              </div>
              <div className="p-3">
                <p className="truncate text-sm font-medium">{ex.name}</p>
                <p className="truncate text-xs capitalize text-faint">
                  {ex.primary_muscles.join(", ")}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}

      {selected && (
        <ExerciseModal exercise={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}

function ExerciseModal({
  exercise,
  onClose,
}: {
  exercise: Exercise;
  onClose: () => void;
}) {
  const t = useT();
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[85vh] w-full max-w-lg overflow-y-auto card-flat"
        onClick={(e) => e.stopPropagation()}
      >
        {exercise.image_urls.length > 0 ? (
          <div className="grid grid-cols-2 gap-1 bg-white">
            {exercise.image_urls.slice(0, 2).map((url) => (
              <div key={url} className="relative aspect-square">
                <Image
                  src={url}
                  alt={exercise.name}
                  fill
                  sizes="50vw"
                  className="object-cover"
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="flex h-32 items-center justify-center bg-surface2 text-4xl">
            🏋️
          </div>
        )}
        <div className="p-5">
          <div className="mb-3 flex items-start justify-between gap-3">
            <h2 className="text-xl font-bold">{exercise.name}</h2>
            <button
              onClick={onClose}
              className="rounded-lg px-3 py-1 text-sm text-muted hover:bg-surface2"
            >
              {t("common.close")}
            </button>
          </div>
          <div className="mb-4 flex flex-wrap gap-2 text-xs">
            {[
              exercise.equipment,
              exercise.level,
              exercise.mechanic,
              ...exercise.primary_muscles,
            ]
              .filter(Boolean)
              .map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-surface2 px-2.5 py-1 capitalize text-muted"
                >
                  {tag}
                </span>
              ))}
          </div>
          {exercise.instructions.length > 0 && (
            <ol className="list-decimal space-y-2 pl-5 text-sm text-muted">
              {exercise.instructions.map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ol>
          )}
          {exercise.owner_id && (
            <form action={deleteCustomExercise} className="mt-5">
              <input type="hidden" name="id" value={exercise.id} />
              <ConfirmButton
                message={t("confirm.exercise")}
                confirmLabel={t("common.delete")}
                cancelLabel={t("common.cancel")}
                className="text-sm text-faint transition hover:text-danger"
              >
                {t("ex.deleteCustom")}
              </ConfirmButton>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

function Chip({
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
          ? "bg-primary text-primary-fg ring-primary"
          : "bg-surface text-muted ring-line hover:ring-muted"
      }`}
    >
      {children}
    </button>
  );
}
