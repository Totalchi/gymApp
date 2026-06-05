// Zoeksynoniemen: koppel veelgebruikte (NL + EN) zoektermen aan de namen uit
// de open oefeningen-dataset (die Engelse, soms afwijkende namen gebruikt).
// Bv. "pec deck" -> "Butterfly", "opdrukken" -> "Push-Up".

const SYNONYMS: Record<string, string[]> = {
  "pec deck": ["butterfly", "pec deck"],
  pecdeck: ["butterfly"],
  vlinder: ["butterfly"],
  fly: ["fly", "flye", "butterfly"],
  flyes: ["fly", "flye"],
  "push up": ["push-up", "pushup"],
  "push ups": ["push-up", "pushup"],
  pushup: ["push-up", "pushup"],
  pushups: ["push-up", "pushup"],
  opdrukken: ["push-up", "pushup"],
  "pull up": ["pull-up", "pullup", "chin-up"],
  pullup: ["pull-up", "pullup", "chin-up"],
  optrekken: ["pull-up", "pullup", "chin-up"],
  bankdrukken: ["bench press"],
  bench: ["bench press"],
  kniebuiging: ["squat"],
  squat: ["squat"],
  deadlift: ["deadlift"],
  "lat pulldown": ["pulldown", "lat pull"],
  latpull: ["pulldown", "lat pull"],
  pulldown: ["pulldown"],
  schouderdrukken: ["shoulder press", "overhead press"],
  "shoulder press": ["shoulder press", "overhead press"],
  curl: ["curl"],
  bicepscurl: ["curl"],
  "biceps curl": ["curl"],
  triceps: ["triceps", "tricep", "pushdown"],
  tricep: ["triceps", "tricep", "pushdown"],
  "leg press": ["leg press"],
  beenpers: ["leg press"],
  "leg curl": ["leg curl", "lying leg curl"],
  "leg extension": ["leg extension"],
  lunge: ["lunge"],
  uitval: ["lunge"],
  roeien: ["row"],
  row: ["row"],
  kuit: ["calf"],
  calf: ["calf"],
  plank: ["plank"],
  dip: ["dip"],
  dips: ["dip"],
  crunch: ["crunch"],
  "buik": ["crunch", "sit-up", "abdominal"],
};

/**
 * Zet een zoekterm om in een lijst termen om op te zoeken (origineel +
 * eventuele synoniemen). De aanroeper bouwt hier een OR van ilike-condities mee.
 */
export function expandSearchTerms(query: string): string[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const terms = new Set<string>([query.trim()]);
  for (const [key, vals] of Object.entries(SYNONYMS)) {
    if (q === key || q.includes(key) || key.includes(q)) {
      for (const v of vals) terms.add(v);
    }
  }
  return [...terms];
}
