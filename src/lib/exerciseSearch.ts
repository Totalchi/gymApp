// Zoeksynoniemen: koppel veelgebruikte (NL + EN) zoektermen aan de namen uit
// de open oefeningen-dataset (die Engelse, soms afwijkende namen gebruikt).
// Bv. "pec deck" -> "Butterfly", "opdrukken" -> "Push-Up", "borst" -> chest-oefeningen.

const SYNONYMS: Record<string, string[]> = {
  // ---- Borst / chest ----
  "pec deck": ["butterfly", "pec deck"],
  pecdeck: ["butterfly"],
  vlinder: ["butterfly"],
  butterfly: ["butterfly"],
  fly: ["fly", "flye", "butterfly"],
  flyes: ["fly", "flye"],
  vliegbeweging: ["fly", "flye"],
  borst: ["bench press", "chest", "fly", "push-up", "butterfly", "dip"],
  bankdrukken: ["bench press"],
  bankdruk: ["bench press"],
  bench: ["bench press"],
  incline: ["incline"],
  schuin: ["incline"],
  decline: ["decline"],
  kabelkruis: ["cable crossover", "crossover"],
  "cable crossover": ["cable crossover", "crossover"],
  crossover: ["crossover"],
  "push up": ["push-up", "pushup"],
  "push ups": ["push-up", "pushup"],
  pushup: ["push-up", "pushup"],
  pushups: ["push-up", "pushup"],
  opdrukken: ["push-up", "pushup"],
  dip: ["dip"],
  dips: ["dip"],

  // ---- Rug / back ----
  rug: ["row", "pulldown", "pull-up", "deadlift", "back"],
  "pull up": ["pull-up", "pullup", "chin-up"],
  pullup: ["pull-up", "pullup", "chin-up"],
  pullups: ["pull-up", "pullup", "chin-up"],
  optrekken: ["pull-up", "pullup", "chin-up"],
  chinup: ["chin-up", "pull-up"],
  "lat pulldown": ["pulldown", "lat"],
  latpulldown: ["pulldown", "lat"],
  pulldown: ["pulldown", "lat"],
  lattrekken: ["pulldown", "lat"],
  roeien: ["row"],
  row: ["row"],
  "seated row": ["seated cable row", "row"],
  "zittend roeien": ["seated cable row", "row"],
  "barbell row": ["bent over barbell row", "row"],
  "t bar": ["t-bar row"],
  facepull: ["face pull"],
  "face pull": ["face pull"],
  rugstrekken: ["hyperextension", "extension"],
  hyperextension: ["hyperextension"],

  // ---- Schouders / shoulders ----
  schouders: ["shoulder press", "overhead press", "lateral raise", "shrug", "military"],
  schouderdrukken: ["shoulder press", "overhead press", "military"],
  "shoulder press": ["shoulder press", "overhead press", "military"],
  "overhead press": ["overhead press", "military"],
  militarypress: ["military"],
  "lateral raise": ["lateral raise", "side lateral"],
  zijwaarts: ["lateral raise", "side lateral"],
  zijwaartsheffen: ["lateral raise", "side lateral"],
  "front raise": ["front raise", "front dumbbell"],
  voorwaartsheffen: ["front raise"],
  "rear delt": ["reverse fly", "rear", "reverse flye"],
  arnold: ["arnold press"],
  shrug: ["shrug"],
  shrugs: ["shrug"],
  nekheffen: ["shrug"],
  "upright row": ["upright row"],

  // ---- Biceps ----
  biceps: ["curl"],
  curl: ["curl"],
  bicepscurl: ["curl"],
  "biceps curl": ["curl"],
  hamercurl: ["hammer curl"],
  "hammer curl": ["hammer curl"],
  preacher: ["preacher curl"],
  "concentration curl": ["concentration curl"],

  // ---- Triceps ----
  triceps: ["triceps", "tricep", "pushdown"],
  tricep: ["triceps", "tricep", "pushdown"],
  pushdown: ["pushdown", "triceps"],
  skullcrusher: ["lying triceps", "skull"],
  kickback: ["kickback"],
  "overhead extension": ["overhead triceps", "triceps extension"],

  // ---- Benen / legs ----
  benen: ["squat", "leg press", "lunge", "leg extension", "leg curl", "deadlift", "calf"],
  been: ["leg"],
  bovenbeen: ["squat", "leg extension", "leg press"],
  kniebuiging: ["squat"],
  squat: ["squat"],
  "front squat": ["front squat"],
  hacksquat: ["hack squat"],
  bulgarian: ["split squat", "bulgarian"],
  splitsquat: ["split squat"],
  "leg press": ["leg press"],
  beenpers: ["leg press"],
  "leg extension": ["leg extension"],
  beenextensie: ["leg extension"],
  "leg curl": ["leg curl", "lying leg curl"],
  hamstringcurl: ["leg curl"],
  hamstring: ["leg curl", "deadlift", "good morning"],
  hamstrings: ["leg curl", "deadlift"],
  lunge: ["lunge"],
  lunges: ["lunge"],
  uitval: ["lunge"],
  uitvalspas: ["lunge"],
  deadlift: ["deadlift"],
  "romanian deadlift": ["romanian deadlift", "stiff-legged"],
  rdl: ["romanian deadlift", "stiff-legged"],
  kuit: ["calf"],
  kuiten: ["calf"],
  kuitheffen: ["calf"],
  calf: ["calf"],
  bil: ["glute", "hip thrust", "bridge", "kickback"],
  billen: ["glute", "hip thrust", "bridge"],
  glutes: ["glute", "hip thrust", "bridge"],
  "hip thrust": ["hip thrust", "bridge", "glute"],
  bilbrug: ["bridge", "hip thrust", "glute"],

  // ---- Buik / abs ----
  buik: ["crunch", "sit-up", "abdominal", "plank", "leg raise"],
  buikspieren: ["crunch", "sit-up", "abdominal", "plank"],
  abs: ["crunch", "sit-up", "abdominal", "plank"],
  crunch: ["crunch"],
  situp: ["sit-up"],
  "sit up": ["sit-up"],
  plank: ["plank"],
  beenheffen: ["leg raise", "leg-up"],
  "leg raise": ["leg raise"],
  "russian twist": ["russian twist"],
  "hanging leg raise": ["hanging leg", "hanging knee"],
};

/**
 * Zet een zoekterm om in een lijst termen om op te zoeken (origineel +
 * eventuele synoniemen). De aanroeper bouwt hier een OR van ilike-condities mee.
 */
export function expandSearchTerms(query: string): string[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  // Maak de ruwe term veilig voor PostgREST-filters (komma's/haakjes/wildcards).
  const safe = query.replace(/[,()%*:\\]/g, " ").replace(/\s+/g, " ").trim();
  const terms = new Set<string>(safe ? [safe] : []);
  for (const [key, vals] of Object.entries(SYNONYMS)) {
    // Exacte match altijd; "bevat"-match pas vanaf 3 tekens (voorkomt ruis).
    const fuzzy = q.length >= 3 && (q.includes(key) || key.includes(q));
    if (q === key || fuzzy) {
      for (const v of vals) terms.add(v);
    }
  }
  return [...terms];
}
