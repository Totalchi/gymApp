import { describe, it, expect } from "vitest";
import { sanitizeFilter, isUuid } from "./text";
import { expandSearchTerms } from "./exerciseSearch";

describe("sanitizeFilter", () => {
  it("verwijdert PostgREST-gevaarlijke tekens", () => {
    expect(sanitizeFilter("a,id.gt.0")).toBe("a id.gt.0");
    expect(sanitizeFilter("x)(y")).toBe("x y");
    expect(sanitizeFilter("100%")).toBe("100");
  });
  it("trimt en normaliseert witruimte", () => {
    expect(sanitizeFilter("  bench   press ")).toBe("bench press");
  });
});

describe("isUuid", () => {
  it("accepteert geldige UUID's", () => {
    expect(isUuid("3f9a1b2c-4d5e-6f70-8a9b-0c1d2e3f4a5b")).toBe(true);
  });
  it("weigert ongeldige invoer", () => {
    expect(isUuid("not-a-uuid")).toBe(false);
    expect(isUuid("123")).toBe(false);
    expect(isUuid("")).toBe(false);
  });
});

describe("expandSearchTerms", () => {
  it("mapt synoniemen (NL/EN) naar datasetnamen", () => {
    expect(expandSearchTerms("pec deck")).toContain("butterfly");
    expect(expandSearchTerms("opdrukken")).toContain("push-up");
    expect(expandSearchTerms("bankdrukken")).toContain("bench press");
  });
  it("saniteert de ruwe term", () => {
    expect(expandSearchTerms("a,b").every((t) => !t.includes(","))).toBe(true);
  });
  it("geeft lege lijst bij lege invoer", () => {
    expect(expandSearchTerms("")).toEqual([]);
  });
});
