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
        className="mb-5 rounded-xl border border-slate-700 px-4 py-2.5 text-sm font-medium text-slate-200 transition hover:border-rose-500 hover:text-rose-400"
      >
        + Eigen oefening maken
      </button>
    );
  }

  return (
    <form
      ref={formRef}
      action={formAction}
      className="mb-6 space-y-3 rounded-2xl border border-slate-800 bg-slate-900/50 p-5"
    >
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Eigen oefening</h2>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-sm text-slate-400 hover:text-white"
        >
          Annuleren
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-sm text-slate-300">Naam *</span>
          <input
            name="name"
            required
            placeholder="Bijv. Kabel-crossover"
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 focus:border-rose-500 focus:outline-none"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm text-slate-300">Spiergroep</span>
          <select
            name="primary_muscle"
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 capitalize focus:border-rose-500 focus:outline-none"
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
        <span className="mb-1 block text-sm text-slate-300">Materiaal</span>
        <input
          name="equipment"
          placeholder="Bijv. kabel, dumbbell, machine"
          className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 focus:border-rose-500 focus:outline-none"
        />
      </label>

      <label className="block">
        <span className="mb-1 block text-sm text-slate-300">
          Uitleg (één stap per regel)
        </span>
        <textarea
          name="instructions"
          rows={3}
          placeholder={"Ga rechtop staan...\nTrek de kabels naar elkaar toe..."}
          className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 focus:border-rose-500 focus:outline-none"
        />
      </label>

      <label className="block">
        <span className="mb-1 block text-sm text-slate-300">
          Foto (optioneel, max 5 MB)
        </span>
        <input
          name="image"
          type="file"
          accept="image/*"
          className="block w-full text-sm text-slate-400 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-800 file:px-3 file:py-2 file:text-sm file:text-slate-200 hover:file:bg-slate-700"
        />
      </label>

      {state.error && (
        <p className="rounded-lg bg-rose-500/10 px-3 py-2 text-sm text-rose-300 ring-1 ring-rose-500/30">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="rounded-xl bg-gradient-to-r from-rose-500 to-orange-500 px-5 py-2.5 font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
      >
        {pending ? "Opslaan..." : "Oefening opslaan"}
      </button>
    </form>
  );
}
