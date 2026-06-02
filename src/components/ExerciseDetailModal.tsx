"use client";

import Image from "next/image";
import Link from "next/link";
import type { Exercise } from "@/lib/types";

/** Popup die de foto('s), tags en uitleg van een oefening groot toont. */
export function ExerciseDetailModal({
  exercise,
  onClose,
}: {
  exercise: Exercise;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[88vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-slate-700 bg-slate-900"
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
          <div className="flex h-32 items-center justify-center bg-slate-800 text-4xl">
            🏋️
          </div>
        )}

        <div className="p-5">
          <div className="mb-3 flex items-start justify-between gap-3">
            <h2 className="text-xl font-bold">{exercise.name}</h2>
            <button
              type="button"
              onClick={onClose}
              className="shrink-0 rounded-lg px-3 py-1 text-sm text-slate-400 hover:bg-slate-800"
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

          {exercise.instructions.length > 0 ? (
            <ol className="list-decimal space-y-2 pl-5 text-sm text-slate-300">
              {exercise.instructions.map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ol>
          ) : (
            <p className="text-sm text-slate-500">
              Geen uitleg beschikbaar voor deze oefening.
            </p>
          )}

          <Link
            href={`/exercises/${exercise.id}`}
            className="mt-5 inline-flex w-full items-center justify-center rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-900 transition hover:bg-white"
          >
            📈 Historie & records bekijken
          </Link>
        </div>
      </div>
    </div>
  );
}
