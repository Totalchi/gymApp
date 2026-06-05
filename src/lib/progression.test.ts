import { describe, it, expect } from "vitest";
import { suggestProgression } from "./progression";

const target = { repLow: 8, repHigh: 10 };

describe("suggestProgression", () => {
  it("stelt zwaarder voor bij de bovenkant van het bereik op alle werksets", () => {
    const s = suggestProgression(
      [
        { weight: 60, reps: 10 },
        { weight: 60, reps: 10 },
      ],
      target,
    );
    expect(s).toEqual({ kind: "up", weight: 62.5, delta: 2.5 });
  });

  it("houdt gewicht aan als de top niet op elke set gehaald is", () => {
    const s = suggestProgression(
      [
        { weight: 60, reps: 10 },
        { weight: 60, reps: 8 },
      ],
      target,
    );
    expect(s?.kind).toBe("hold");
    expect(s?.weight).toBe(60);
  });

  it("werkt met één rep-doel (geen bereik)", () => {
    const s = suggestProgression([{ weight: 40, reps: 12 }], {
      repLow: 12,
      repHigh: null,
    });
    expect(s?.kind).toBe("up");
    expect(s?.weight).toBe(42.5);
  });

  it("gebruikt het zwaarste werkgewicht als basis", () => {
    const s = suggestProgression(
      [
        { weight: 50, reps: 10 },
        { weight: 60, reps: 10 },
      ],
      target,
    );
    expect(s).toEqual({ kind: "up", weight: 62.5, delta: 2.5 });
  });

  it("geeft null zonder vorige werksets", () => {
    expect(suggestProgression([], target)).toBeNull();
  });
});
