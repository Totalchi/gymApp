/**
 * Zet een vrije-tekst rusttijd om naar seconden.
 * Voorbeelden: "2-3 min" -> 180, "60-90 sec" -> 90, "90 sec" -> 90,
 * "2 min" -> 120, "90" -> 90, "2" -> 120.
 *
 * Bij een bereik wordt de bovengrens gebruikt (zo weet je wanneer je
 * uiterlijk weer moet starten). Zonder eenheid: <= 10 telt als minuten,
 * anders als seconden.
 */
export function parseRestToSeconds(text: string | null | undefined): number | null {
  if (!text) return null;
  const nums = text
    .match(/\d+(?:[.,]\d+)?/g)
    ?.map((n) => parseFloat(n.replace(",", ".")));
  if (!nums || nums.length === 0) return null;

  const value = Math.max(...nums); // bovengrens van het bereik
  const lower = text.toLowerCase();

  let minutes: boolean;
  if (/\bmin/.test(lower)) minutes = true;
  else if (/\bsec|\bs\b/.test(lower)) minutes = false;
  else minutes = value <= 10; // gok: kleine getallen = minuten

  const seconds = Math.round(minutes ? value * 60 : value);
  return seconds > 0 ? seconds : null;
}
