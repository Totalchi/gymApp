import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** Geeft de huidige build-versie terug zodat de client updates kan detecteren. */
export async function GET() {
  return NextResponse.json(
    { v: process.env.VERCEL_GIT_COMMIT_SHA ?? "dev" },
    { headers: { "cache-control": "no-store, max-age=0" } },
  );
}
