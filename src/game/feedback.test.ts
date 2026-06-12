import { describe, expect, it } from "vitest";
import {
  getCameraShake,
  getPlayerLean,
  getWarningOpacity,
  getWarningScale,
  isScoreMilestone,
} from "./feedback";

describe("game feedback helpers", () => {
  it("leans the player based on normalized input", () => {
    expect(getPlayerLean({ x: 1, z: -1 })).toEqual({
      rotationX: -0.16,
      rotationY: -0.42,
      scaleY: 1.04,
    });
  });

  it("increases warning opacity as an obstacle approaches the floor", () => {
    expect(getWarningOpacity(5.8)).toBeCloseTo(0);
    expect(getWarningOpacity(1.1)).toBeCloseTo(0.62);
  });

  it("expands warning scale as an obstacle gets dangerous", () => {
    expect(getWarningScale(5.8, 0.4)).toBeCloseTo(0.48);
    expect(getWarningScale(1.1, 0.4)).toBeCloseTo(0.88);
  });

  it("hides warning cues after an obstacle has passed the player", () => {
    expect(getWarningOpacity(-1.3)).toBe(0);
    expect(getWarningScale(-1.3, 0.4)).toBe(0);
  });

  it("fades camera shake over its duration", () => {
    expect(getCameraShake(0)).toBe(0);
    expect(getCameraShake(0.11)).toBeGreaterThan(0);
    expect(getCameraShake(0.3)).toBe(0);
  });

  it("detects score milestones once per 250 points", () => {
    expect(isScoreMilestone(249, 251)).toBe(true);
    expect(isScoreMilestone(251, 260)).toBe(false);
  });
});
