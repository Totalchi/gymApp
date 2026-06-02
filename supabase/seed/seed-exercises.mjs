/**
 * Seed-script: laadt de open free-exercise-db dataset in de `exercises` tabel.
 *
 * Gebruik:
 *   1. Vul .env.local met NEXT_PUBLIC_SUPABASE_URL en SUPABASE_SERVICE_ROLE_KEY
 *   2. npm run seed
 *
 * Het script gebruikt de service-role key (server-side) zodat RLS niet in de
 * weg zit bij het schrijven van de gedeelde catalogus.
 */
import { createClient } from "@supabase/supabase-js";

const DATA_URL =
  "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json";
const IMAGE_BASE =
  "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error(
    "Ontbrekende env vars. Zet NEXT_PUBLIC_SUPABASE_URL en SUPABASE_SERVICE_ROLE_KEY in .env.local",
  );
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false },
});

async function main() {
  console.log("Dataset ophalen...");
  const res = await fetch(DATA_URL);
  if (!res.ok) throw new Error(`Download mislukt: ${res.status}`);
  const exercises = await res.json();
  console.log(`${exercises.length} oefeningen gevonden.`);

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

  const BATCH = 200;
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);
    const { error } = await supabase.from("exercises").upsert(batch, {
      onConflict: "id",
    });
    if (error) {
      console.error("Upsert-fout:", error);
      process.exit(1);
    }
    console.log(`Geüpload: ${Math.min(i + BATCH, rows.length)}/${rows.length}`);
  }

  console.log("Klaar! Oefeningen staan in de database.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
