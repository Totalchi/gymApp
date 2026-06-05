// Wordt direct getoond bij navigatie terwijl de server-pagina laadt.
// Geeft meteen visuele feedback zodat tabwissels snel aanvoelen.
export default function Loading() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-6 h-8 w-44 animate-pulse rounded-lg bg-surface2" />
      <div className="space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="h-20 animate-pulse rounded-2xl border border-line bg-surface"
            style={{ animationDelay: `${i * 60}ms` }}
          />
        ))}
      </div>
    </div>
  );
}
