import { describe, expect, it } from "vitest";
import {
  getDoodleOutlineScale,
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
