# 🏋️ GymApp

Bouw eenvoudig wekelijkse trainingsschema's met **push / pull / legs / full-body**
dagen, kies oefeningen uit een bibliotheek van ~870 oefeningen **met afbeeldingen**,
vul **sets, reps en kg** in, en laat de **RIR (Reps In Reserve)** automatisch
berekenen. Je login onthoudt al je schema's.

Gebouwd met **Next.js (App Router) + Supabase + Tailwind CSS**, klaar om live te
gaan op **Vercel**.

## Functies

- 🔐 **Login & registratie** (Supabase Auth) — je schema's worden per gebruiker bewaard
- 📅 **Schema-builder** — voeg dagen toe met type (push/pull/legs/upper/lower/full body/cardio/rust)
- 🔀 **Drag & drop** — sleep dagen en oefeningen in de gewenste volgorde (werkt ook op touch)
- 💪 **Oefeningen-bibliotheek** met foto's, spiergroepen, materiaal en uitleg
- ➕ **Eigen oefeningen** maken met foto-upload (Supabase Storage)
- 🔢 **Sets, reps & kg** per oefening
- 🧮 **Automatische RIR-berekening** op basis van geschat 1RM + de RPE/RIR-tabel
- ⏱️ **Workouts loggen** — start een training vanaf een dag en log je echte sets
- 📈 **Voortgang** — geschat 1RM per oefening over tijd in grafieken + workout-geschiedenis
- 🎨 Modern, donker, mobielvriendelijk design

## RIR-berekening

RIR wordt berekend met de gangbare, wetenschappelijk onderbouwde aanpak
(geschat 1RM + RPE/RIR-tabel). Zie [`src/lib/rir.ts`](src/lib/rir.ts):

1. Per oefening houden we een geschat **1RM** bij (handmatig of geschat uit een set;
   dubbelklik op het 1RM-veld om te schatten uit `kg × reps`).
2. De **intensiteit** = `gewicht / 1RM` (%1RM).
3. Via de **RPE/RIR-tabel** bepalen we hoeveel reps je in totaal tot falen zou kunnen
   (reps-to-failure, RTF).
4. **RIR = RTF − uitgevoerde reps** (afgerond op halve reps, nooit negatief).

De tabel is de RPE@10-curve van de bekende Reps-In-Reserve/RPE-tabel; de berekening
is daarmee consistent. Voor zeer hoge reps buiten de tabel valt de formule terug op
Epley. De logica is volledig getest (`npm test`).

## Lokaal opstarten

### 1. Supabase-project aanmaken

1. Maak een gratis project op [supabase.com](https://supabase.com).
2. Open de **SQL Editor** en voer de migraties op volgorde uit:
   - [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql) — tabellen + Row Level Security
   - [`supabase/migrations/0002_logging_and_custom.sql`](supabase/migrations/0002_logging_and_custom.sql) — eigen oefeningen, foto-upload (Storage bucket) en workout-logging
3. Ga naar **Project Settings → API** en kopieer je `Project URL`, `anon` key en
   `service_role` key.

### 2. Environment-variabelen

```bash
cp .env.example .env.local
```

Vul in `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...   # alleen voor de seed
```

### 3. Oefeningen inladen

```bash
npm install
npm run seed     # laadt ~870 oefeningen + afbeeldingen in de database
```

### 4. Starten

```bash
npm run dev      # http://localhost:3000
```

Registreer een account en bouw je eerste schema.

## Tests

```bash
npm test         # unit tests voor de RIR-berekening
```

## Live op Vercel

1. Push deze repo naar GitHub.
2. Importeer het project in [Vercel](https://vercel.com).
3. Zet bij **Environment Variables**: `NEXT_PUBLIC_SUPABASE_URL` en
   `NEXT_PUBLIC_SUPABASE_ANON_KEY` (de service-role key is **niet** nodig in productie).
4. Voeg in Supabase je Vercel-URL toe bij **Authentication → URL Configuration**
   (Site URL + redirect URLs).
5. Deploy 🚀

## Projectstructuur

```
src/
  app/
    login/ register/        Auth-pagina's + server actions
    dashboard/              Overzicht van je schema's
    routines/[id]/          Schema-builder (drag & drop)
    exercises/              Oefeningen-bibliotheek + eigen oefeningen
    workout/[id]/           Workout loggen
    history/                Workout-geschiedenis
    progress/               Voortgangsgrafieken
  components/               UI-componenten (builder, picker, logger, charts)
  lib/
    rir.ts                  RIR-berekening (+ tests)
    types.ts                Gedeelde types
    supabase/               Supabase-clients (browser/server/middleware)
supabase/
  migrations/               Database-schema, RLS, logging + Storage
  seed/seed-exercises.mjs   Oefeningen importeren
```

## Tech & data

- **Next.js 15**, **React 19**, **TypeScript**, **Tailwind CSS v4**
- **Supabase** (Postgres + Auth + Storage)
- Oefeningen + afbeeldingen: [free-exercise-db](https://github.com/yuhonas/free-exercise-db) (open data)
