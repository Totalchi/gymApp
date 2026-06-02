import { createClient } from "@/lib/supabase/server";

/** Exporteer alle gelogde sets als CSV. */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { data } = await supabase
    .from("workout_sets")
    .select(
      "exercise_name, set_number, set_type, reps, weight, one_rep_max, rir, session:workout_sessions!inner(performed_at, day_name)",
    );

  type Row = {
    exercise_name: string | null;
    set_number: number;
    set_type: string;
    reps: number | null;
    weight: number | null;
    one_rep_max: number | null;
    rir: number | null;
    session: { performed_at: string; day_name: string | null } | null;
  };

  const rows = ((data ?? []) as unknown as Row[])
    .filter((r) => r.session)
    .sort((a, b) =>
      (a.session!.performed_at ?? "").localeCompare(b.session!.performed_at ?? ""),
    );

  const header = [
    "datum",
    "dag",
    "oefening",
    "set",
    "type",
    "reps",
    "gewicht",
    "1rm",
    "rir",
  ];
  const esc = (v: unknown) => {
    const s = v == null ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };

  const lines = [header.join(",")];
  for (const r of rows) {
    lines.push(
      [
        r.session!.performed_at?.slice(0, 10),
        r.session!.day_name ?? "",
        r.exercise_name ?? "",
        r.set_number,
        r.set_type,
        r.reps ?? "",
        r.weight ?? "",
        r.one_rep_max ?? "",
        r.rir ?? "",
      ]
        .map(esc)
        .join(","),
    );
  }

  return new Response(lines.join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="gymapp-workouts.csv"`,
    },
  });
}
