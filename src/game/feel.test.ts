import { describe, expect, it } from "vitest";
import {
  getCalloutTone,
  getFeverState,
  getMatchResultHeadline,
  getPlayerResultBadge,
  getRunHighlight,
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

  it("adds sharper multiplayer winner copy", () => {
    expect(getMatchResultHeadline({ nickname: "Guest" })).toEqual({
      title: "Guest owns the page",
      detail: "Everyone else got folded.",
    });

    expect(getMatchResultHeadline(null)).toEqual({
      title: "No clean winner",
      detail: "The page got everybody.",
    });
  });

  it("tags result rows with playful performance badges", () => {
    expect(
      getPlayerResultBadge({
        rank: 1,
        totalPlayers: 4,
        closeCalls: 2,
        shieldSaves: 0,
      })
    ).toBe("Crown dodger");
    expect(
      getPlayerResultBadge({
        rank: 2,
        totalPlayers: 4,
        closeCalls: 5,
        shieldSaves: 0,
      })
    ).toBe("Danger magnet");
    expect(
      getPlayerResultBadge({
        rank: 3,
        totalPlayers: 4,
        closeCalls: 1,
        shieldSaves: 2,
      })
    ).toBe("Shield clutch");
    expect(
      getPlayerResultBadge({
        rank: 4,
        totalPlayers: 4,
        closeCalls: 0,
        shieldSaves: 0,
      })
    ).toBe("First splat");
  });

  it("turns high close-call combo into a visible fever state", () => {
    expect(getFeverState({ comboMultiplier: 2, bestComboStreak: 2 })).toEqual({
      active: false,
      label: "Combo x2",
    });

    expect(getFeverState({ comboMultiplier: 3, bestComboStreak: 4 })).toEqual({
      active: true,
      label: "FEVER x3",
    });
  });

  it("selects one memorable run highlight for the retry screen", () => {
    expect(
      getRunHighlight({
        closeCalls: 2,
        bestComboMultiplier: 4,
        bestComboStreak: 5,
        shieldSaves: 0,
        dodged: 16,
        elapsedSeconds: 18,
      })
    ).toEqual({
      title: "Fever run",
      detail: "Held a x4 close-call chain.",
      tone: "fever",
    });

    expect(
      getRunHighlight({
        closeCalls: 1,
        bestComboMultiplier: 1,
        bestComboStreak: 1,
        shieldSaves: 2,
        dodged: 10,
        elapsedSeconds: 16,
      })
    ).toEqual({
      title: "Shield clutch",
      detail: "2 saves kept the run alive.",
      tone: "shield",
    });
  });
});
