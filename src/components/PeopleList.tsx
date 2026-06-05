import Link from "next/link";

type P = { id: string; display_name: string | null; username: string | null };

function nameOf(p: P) {
  return p.display_name || (p.username ? `@${p.username}` : "Atleet");
}

export function PeopleList({ people, empty }: { people: P[]; empty: string }) {
  if (people.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-line py-10 text-center text-sm text-faint">
        {empty}
      </p>
    );
  }
  return (
    <div className="space-y-2">
      {people.map((p) => (
        <Link
          key={p.id}
          href={`/u/${p.id}`}
          className="flex items-center gap-3 rounded-xl border border-line bg-surface px-4 py-3 transition hover:border-primary/40"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-fg">
            {nameOf(p).replace("@", "").charAt(0).toUpperCase()}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium">{nameOf(p)}</p>
            {p.username && <p className="truncate text-xs text-faint">@{p.username}</p>}
          </div>
          <span className="text-faint">›</span>
        </Link>
      ))}
    </div>
  );
}
