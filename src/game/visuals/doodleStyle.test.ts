import { describe, expect, it } from "vitest";
import {
  getDoodleOutlineScale,
  getDoodlePlayerFace,
  getDoodlePlayerMood,
  getDoodlePlayerMotion,
  getDoodleWarningState,
  getHazardVisualState,
} from "./doodleStyle";

describe("doodle visual style helpers", () => {
  it("keeps outlines slightly larger than the visible mesh", () => {
    expect(getDoodleOutlineScale(1)).toBeCloseTo(1.08);
    expect(getDoodleOutlineScale(0.5)).toBeCloseTo(0.54);
  });

  it("adds visible lean and running state from input", () => {
    expect(getDoodlePlayerMotion({ x: 1, z: -1 }, 2)).toEqual({
      bobY: 0.036,
      legPhase: -1,
      rotationX: -0.2,
      rotationZ: -0.28,
      scaleY: 1.06,
      moving: true,
    });
  });

  it("clamps visual lean for over-unit combined input", () => {
    expect(getDoodlePlayerMotion({ x: 2, z: -2 }, 2)).toEqual({
      bobY: 0.036,
      legPhase: -1,
      rotationX: -0.2,
      rotationZ: -0.28,
      scaleY: 1.06,
      moving: true,
    });
  });

  it("keeps idle player motion subtle", () => {
    expect(getDoodlePlayerMotion({ x: 0, z: 0 }, 1)).toEqual({
      bobY: 0.014,
      legPhase: 0,
      rotationX: 0,
      rotationZ: 0,
      scaleY: 1,
      moving: false,
    });
  });

  it("switches player mood for shield, panic, and defeat states", () => {
    expect(
      getDoodlePlayerMood({
        phase: "playing",
        moving: true,
        shieldActive: true,
        calloutTone: "neutral",
      })
    ).toBe("shield");
    expect(
      getDoodlePlayerMood({
        phase: "playing",
        moving: true,
        shieldActive: false,
        calloutTone: "panic",
      })
    ).toBe("panic");
    expect(
      getDoodlePlayerMood({
        phase: "game-over",
        moving: false,
        shieldActive: false,
        calloutTone: "neutral",
      })
    ).toBe("defeated");
  });

  it("maps player mood to readable face styling", () => {
    expect(getDoodlePlayerFace("panic")).toMatchObject({
      bodyColor: "#fed7aa",
      eyeScaleY: 1.55,
      mouth: "open",
    });
    expect(getDoodlePlayerFace("shield")).toMatchObject({
      bodyColor: "#bbf7d0",
      mouth: "smile",
    });
  });

  it("maps hazard height to shadow and highlight strength", () => {
    expect(getHazardVisualState(5.8, 0.4)).toEqual({
      shadowOpacity: 0,
      shadowScale: 0.48,
      squash: 1,
    });

    expect(getHazardVisualState(1.1, 0.4)).toEqual({
      shadowOpacity: 0.34,
      shadowScale: 0.84,
      squash: 1.04,
    });
  });

  it("returns dashed red warning ring state near the floor", () => {
    expect(getDoodleWarningState(5.8, 0.4)).toEqual({
      opacity: 0,
      scale: 0.56,
      dashCount: 12,
    });

    expect(getDoodleWarningState(1.1, 0.4)).toEqual({
      opacity: 0.72,
      scale: 0.92,
      dashCount: 12,
    });
  });
});
