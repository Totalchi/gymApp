"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import {
  createCustomExercise,
  type CustomExerciseState,
} from "@/app/exercises/actions";
import { MUSCLE_GROUPS } from "@/lib/types";

export function CustomExerciseForm({
  onCreated,
}: {
  onCreated?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState<
    CustomExerciseState,
    FormData
  >(createCustomExercise, {});

  // Reset het formulier na een geslaagde aanmaak.
  useEffect(() => {
    if (state.createdId) {
      formRef.current?.reset();
      setOpen(false);
      onCreated?.();
    }
  }, [state.createdId, onCreated]);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="mb-5 rounded-xl border border-line px-4 py-2.5 text-sm font-medium text-fg transition hover:border-primary hover:text-primary"
      >
        + Eigen oefening maken
      </button>
    );
  }

  return (
    <form
      ref={formRef}
      action={formAction}
      className="mb-6 space-y-3 rounded-2xl border border-line bg-surface p-5"
    >
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Eigen oefening</h2>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-sm text-muted hover:text-fg"
        >
          Annuleren
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-sm text-muted">Naam *</span>
          <input
            name="name"
            required
            placeholder="Bijv. Kabel-crossover"
            className="w-full rounded-xl border border-line bg-canvas px-3.5 py-2.5 focus:border-primary focus:outline-none"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm text-muted">Spiergroep</span>
          <select
            name="primary_muscle"
            className="w-full rounded-xl border border-line bg-canvas px-3.5 py-2.5 capitalize focus:border-primary focus:outline-none"
          >
            <option value="">—</option>
            {MUSCLE_GROUPS.map((m) => (
              <option key={m} value={m} className="capitalize">
                {m}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="block">
        <span className="mb-1 block text-sm text-muted">Materiaal</span>
        <input
          name="equipment"
          placeholder="Bijv. kabel, dumbbell, machine"
          className="w-full rounded-xl border border-line bg-canvas px-3.5 py-2.5 focus:border-primary focus:outline-none"
        />
      </label>

      <label className="block">
        <span className="mb-1 block text-sm text-muted">
          Uitleg (één stap per regel)
        </span>
        <textarea
          name="instructions"
          rows={3}
          placeholder={"Ga rechtop staan...\nTrek de kabels naar elkaar toe..."}
          className="w-full rounded-xl border border-line bg-canvas px-3.5 py-2.5 focus:border-primary focus:outline-none"
        />
      </label>

      <label className="block">
        <span className="mb-1 block text-sm text-muted">
          Foto (optioneel, max 5 MB)
        </span>
        <input
          name="image"
          type="file"
          accept="image/*"
          className="block w-full text-sm text-muted file:mr-3 file:rounded-lg file:border-0 file:bg-surface2 file:px-3 file:py-2 file:text-sm file:text-fg hover:file:bg-surface2"
        />
      </label>

      {state.error && (
        <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger ring-1 ring-danger/30">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="rounded-xl bg-primary px-5 py-2.5 font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
      >
        {pending ? "Opslaan..." : "Oefening opslaan"}
      </button>
    </form>
  );
}
