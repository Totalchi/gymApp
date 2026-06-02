"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { MUSCLE_GROUPS, type Exercise } from "@/lib/types";

export function ExerciseBrowser() {
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
      let q = supabase.from("exercises").select("*").order("name").limit(60);
      if (query.trim()) q = q.ilike("name", `%${query.trim()}%`);
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
    <div>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Zoek een oefening..."
        className="mb-3 w-full rounded-xl border border-slate-700 bg-slate-900 px-3.5 py-2.5 placeholder:text-slate-500 focus:border-rose-500 focus:outline-none"
      />
      <div className="mb-5 flex flex-wrap gap-1.5">
        <Chip active={muscle === ""} onClick={() => setMuscle("")}>
          Alle
        </Chip>
        {MUSCLE_GROUPS.map((m) => (
          <Chip key={m} active={muscle === m} onClick={() => setMuscle(m)}>
            {m}
          </Chip>
        ))}
      </div>

      {loading ? (
        <p className="py-10 text-center text-slate-500">Laden...</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {results.map((ex) => (
            <button
              key={ex.id}
              onClick={() => setSelected(ex)}
              className="group overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/50 text-left transition hover:border-slate-600"
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
              </div>
              <div className="p-3">
                <p className="truncate text-sm font-medium">{ex.name}</p>
                <p className="truncate text-xs capitalize text-slate-500">
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
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-slate-700 bg-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
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
        <div className="p-5">
          <div className="mb-3 flex items-start justify-between gap-3">
            <h2 className="text-xl font-bold">{exercise.name}</h2>
            <button
              onClick={onClose}
              className="rounded-lg px-3 py-1 text-sm text-slate-400 hover:bg-slate-800"
            >
              Sluiten
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
                  className="rounded-full bg-slate-800 px-2.5 py-1 capitalize text-slate-300"
                >
                  {tag}
                </span>
              ))}
          </div>
          {exercise.instructions.length > 0 && (
            <ol className="list-decimal space-y-2 pl-5 text-sm text-slate-300">
              {exercise.instructions.map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ol>
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
          ? "bg-rose-500 text-white ring-rose-500"
          : "bg-slate-900 text-slate-300 ring-slate-700 hover:ring-slate-500"
      }`}
    >
      {children}
    </button>
  );
}
