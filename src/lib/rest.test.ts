import { describe, it, expect } from "vitest";
import { parseRestToSeconds } from "./rest";

describe("parseRestToSeconds", () => {
  it("parseert minuten", () => {
    expect(parseRestToSeconds("2 min")).toBe(120);
  });
  it("parseert seconden", () => {
    expect(parseRestToSeconds("90 sec")).toBe(90);
  });
  it("neemt de bovengrens van een bereik", () => {
    expect(parseRestToSeconds("2-3 min")).toBe(180);
    expect(parseRestToSeconds("60-90 sec")).toBe(90);
  });
  it("gokt minuten bij kleine getallen zonder eenheid", () => {
    expect(parseRestToSeconds("2")).toBe(120);
  });
  it("gokt seconden bij grote getallen zonder eenheid", () => {
    expect(parseRestToSeconds("90")).toBe(90);
  });
  it("geeft null bij lege/ongeldige invoer", () => {
    expect(parseRestToSeconds("")).toBeNull();
    expect(parseRestToSeconds(null)).toBeNull();
    expect(parseRestToSeconds("rust")).toBeNull();
  });
});
