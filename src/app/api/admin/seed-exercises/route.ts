import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const DATA_URL =
  "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json";
const IMAGE_BASE =
  "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/";

type Ex = {
  id: string;
  name: string;
  category?: string | null;
  level?: string | null;
  mechanic?: string | null;
  force?: string | null;
  equipment?: string | null;
  primaryMuscles?: string[];
  secondaryMuscles?: string[];
  instructions?: string[];
  images?: string[];
};

/**
 * Eenmalig de volledige open oefeningen-catalogus (free-exercise-db, ~873
 * oefeningen met foto's + uitleg) in de database zetten. Beveiligd met
 * CRON_SECRET. Bezoek: /api/admin/seed-exercises?secret=JOUW_CRON_SECRET
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const url = new URL(request.url);
  const provided =
    url.searchParams.get("secret") ??
    request.headers.get("authorization")?.replace("Bearer ", "");
  if (!secret || provided !== secret) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const supabase = createAdminClient();
  if (!supabase) {
    return NextResponse.json(
      { ok: false, error: "SUPABASE_SERVICE_ROLE_KEY ontbreekt" },
      { status: 500 },
    );
  }

  const res = await fetch(DATA_URL, { cache: "no-store" });
  if (!res.ok) {
    return NextResponse.json(
      { ok: false, error: `Download mislukt: ${res.status}` },
      { status: 502 },
    );
  }
  const exercises = (await res.json()) as Ex[];

  const rows = exercises.map((e) => ({
    id: e.id,
    name: e.name,
    category: e.category ?? null,
    level: e.level ?? null,
    mechanic: e.mechanic ?? null,
    force: e.force ?? null,
    equipment: e.equipment ?? null,
    primary_muscles: e.primaryMuscles ?? [],
    secondary_muscles: e.secondaryMuscles ?? [],
    instructions: e.instructions ?? [],
    image_urls: (e.images ?? []).map((img) => IMAGE_BASE + img),
  }));

  let done = 0;
  const BATCH = 200;
  for (let i = 0; i < rows.length; i += BATCH) {
    const { error } = await supabase
      .from("exercises")
      .upsert(rows.slice(i, i + BATCH), { onConflict: "id" });
    if (error) {
      return NextResponse.json({ ok: false, error: error.message, done }, { status: 500 });
    }
    done += Math.min(BATCH, rows.length - i);
  }

  return NextResponse.json({ ok: true, seeded: done });
}
