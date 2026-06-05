import { describe, it, expect } from "vitest";
import { suggestProgression } from "./progression";

const target = { repLow: 8, repHigh: 10, rir: 2 };

describe("suggestProgression", () => {
  it("stelt zwaarder voor bij top van bereik + kracht over", () => {
    const s = suggestProgression(
      [
        { weight: 60, reps: 10, rir: 2 },
        { weight: 60, reps: 10, rir: 2 },
      ],
      target,
    );
    expect(s).toEqual({ kind: "up", weight: 62.5, delta: 2.5 });
  });

  it("houdt gewicht aan als de top niet gehaald is", () => {
    const s = suggestProgression([{ weight: 60, reps: 8, rir: 2 }], target);
    expect(s?.kind).toBe("hold");
    expect(s?.weight).toBe(60);
  });

  it("houdt gewicht aan bij te lage RIR (tot falen)", () => {
    const s = suggestProgression([{ weight: 60, reps: 10, rir: 0 }], target);
    expect(s?.kind).toBe("hold");
  });

  it("verhoogt bij onbekende RIR als de reps gehaald zijn", () => {
    const s = suggestProgression([{ weight: 60, reps: 10, rir: null }], target);
    expect(s?.kind).toBe("up");
  });

  it("gebruikt het zwaarste werkgewicht als basis", () => {
    const s = suggestProgression(
      [
        { weight: 50, reps: 10, rir: 3 },
        { weight: 60, reps: 10, rir: 2 },
      ],
      target,
    );
    expect(s).toEqual({ kind: "up", weight: 62.5, delta: 2.5 });
  });

  it("geeft null zonder vorige werksets", () => {
    expect(suggestProgression([], target)).toBeNull();
  });
});
