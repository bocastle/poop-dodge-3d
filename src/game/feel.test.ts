import { describe, expect, it } from "vitest";
import {
  getCalloutTone,
  getRunSummary,
  getShieldPullProgress,
  isInsideShieldSaveClearRadius,
} from "./feel";

describe("feel helpers", () => {
  it("ramps shield pull only near the pickup", () => {
    expect(getShieldPullProgress(2)).toBe(0);
    expect(getShieldPullProgress(1.55)).toBe(0);
    expect(getShieldPullProgress(1.02)).toBe(1);
    expect(getShieldPullProgress(0.4)).toBe(1);
    expect(getShieldPullProgress(1.335)).toBeCloseTo(0.5, 2);
  });

  it("classifies callout tone by event", () => {
    expect(getCalloutTone("nice", 1, false)).toBe("neutral");
    expect(getCalloutTone("close", 2, false)).toBe("hot");
    expect(getCalloutTone("panic", 1, false)).toBe("panic");
    expect(getCalloutTone(null, 1, true)).toBe("shield");
  });

  it("detects hazards cleared by shield save radius", () => {
    expect(isInsideShieldSaveClearRadius({ x: 0, z: 0 }, { x: 1.2, z: 0.8 })).toBe(true);
    expect(isInsideShieldSaveClearRadius({ x: 0, z: 0 }, { x: 2.2, z: 0 })).toBe(false);
  });

  it("keeps clear radius strict at the edge", () => {
    expect(isInsideShieldSaveClearRadius({ x: 0, z: 0 }, { x: 1.75, z: 0 })).toBe(true);
    expect(isInsideShieldSaveClearRadius({ x: 0, z: 0 }, { x: 1.76, z: 0 })).toBe(false);
  });

  it("summarizes runs by their strongest hook", () => {
    expect(
      getRunSummary({
        closeCalls: 0,
        bestComboMultiplier: 1,
        bestComboStreak: 0,
        shieldSaves: 0,
        dodged: 4,
      })
    ).toEqual({
      title: "Clean paper",
      detail: "4 drops dodged.",
    });

    expect(
      getRunSummary({
        closeCalls: 5,
        bestComboMultiplier: 3,
        bestComboStreak: 3,
        shieldSaves: 0,
        dodged: 18,
      })
    ).toEqual({
      title: "Risky doodler",
      detail: "5 close calls and a x3 combo.",
    });

    expect(
      getRunSummary({
        closeCalls: 2,
        bestComboMultiplier: 2,
        bestComboStreak: 2,
        shieldSaves: 1,
        dodged: 12,
      })
    ).toEqual({
      title: "Shield clutch",
      detail: "1 shield save kept the page alive.",
    });
  });

  it("summarizes repeated close calls without inventing a combo", () => {
    expect(
      getRunSummary({
        closeCalls: 4,
        bestComboMultiplier: 1,
        bestComboStreak: 1,
        shieldSaves: 0,
        dodged: 10,
      })
    ).toEqual({
      title: "Risky doodler",
      detail: "4 close calls without blinking.",
    });
  });
});
