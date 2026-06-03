"use client";

import Image from "next/image";
import Link from "next/link";
import { useT } from "@/components/LangProvider";
import type { Exercise } from "@/lib/types";

/** Popup die de foto('s), tags en uitleg van een oefening groot toont. */
export function ExerciseDetailModal({
  exercise,
  onClose,
}: {
  exercise: Exercise;
  onClose: () => void;
}) {
  const t = useT();
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[88vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-line bg-surface"
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
              type="button"
              onClick={onClose}
              className="shrink-0 rounded-lg px-3 py-1 text-sm text-muted hover:bg-surface2"
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

          {exercise.instructions.length > 0 ? (
            <ol className="list-decimal space-y-2 pl-5 text-sm text-muted">
              {exercise.instructions.map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ol>
          ) : (
            <p className="text-sm text-faint">{t("ex.noExplanation")}</p>
          )}

          <Link
            href={`/exercises/${exercise.id}`}
            className="mt-5 inline-flex w-full items-center justify-center rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-fg transition hover:brightness-110"
          >
            {t("ex.viewHistory")}
          </Link>
        </div>
      </div>
    </div>
  );
}
