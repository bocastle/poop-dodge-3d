import { describe, expect, it } from "vitest";
import {
  createInitialCombo,
  getCloseCallBonus,
  getCloseCallTier,
  getNextCombo,
  getShieldPickupPosition,
  isInCloseCallWindow,
  isShieldCollected,
  shouldSpawnShield,
} from "./fun";

describe("fun helpers", () => {
  it("classifies close calls by distance", () => {
    expect(getCloseCallTier(0.7)).toBe("panic");
    expect(getCloseCallTier(0.95)).toBe("close");
    expect(getCloseCallTier(1.2)).toBe("nice");
    expect(getCloseCallTier(1.5)).toBe(null);
  });

  it("only tracks close calls near the player height window", () => {
    expect(isInCloseCallWindow(1.1)).toBe(true);
    expect(isInCloseCallWindow(-0.8)).toBe(true);
    expect(isInCloseCallWindow(1.3)).toBe(false);
    expect(isInCloseCallWindow(-1)).toBe(false);
  });

  it("builds combo while the timer is alive", () => {
    const first = getNextCombo(createInitialCombo(), 10);
    const second = getNextCombo(first, 12);

    expect(first).toEqual({
      multiplier: 1,
      streak: 1,
      expiresAtSeconds: 13.2,
    });
    expect(second).toEqual({
      multiplier: 2,
      streak: 2,
      expiresAtSeconds: 15.2,
    });
  });

  it("resets combo after timeout", () => {
    const first = getNextCombo(createInitialCombo(), 10);
    const expired = getNextCombo(first, 14);

    expect(expired).toEqual({
      multiplier: 1,
      streak: 1,
      expiresAtSeconds: 17.2,
    });
  });

  it("caps combo multiplier", () => {
    let combo = createInitialCombo();
    combo = getNextCombo(combo, 1);
    combo = getNextCombo(combo, 2);
    combo = getNextCombo(combo, 3);
    combo = getNextCombo(combo, 4);
    combo = getNextCombo(combo, 5);

    expect(combo.multiplier).toBe(4);
    expect(combo.streak).toBe(5);
  });

  it("applies close call bonus with combo multiplier", () => {
    expect(getCloseCallBonus("nice", 1)).toBe(20);
    expect(getCloseCallBonus("close", 2)).toBe(90);
    expect(getCloseCallBonus("panic", 4)).toBe(320);
  });

  it("spawns shield pickups on the first and repeated intervals", () => {
    expect(shouldSpawnShield(10.9, 0, false, null)).toBe(false);
    expect(shouldSpawnShield(11, 0, false, null)).toBe(true);
    expect(shouldSpawnShield(20, 11, false, null)).toBe(false);
    expect(shouldSpawnShield(27, 11, false, null)).toBe(true);
    expect(shouldSpawnShield(27, 11, true, null)).toBe(false);
    expect(
      shouldSpawnShield(27, 11, false, { id: "s", x: 0, z: 0, expiresAtSeconds: 30 })
    ).toBe(false);
  });

  it("places shield pickup inside arena bounds", () => {
    expect(getShieldPickupPosition(1)).toEqual({ x: -2.24, z: 0.14 });
    expect(getShieldPickupPosition(12)).toEqual({ x: 1.95, z: -0.83 });
  });

  it("detects shield collection with the forgiving feel radius", () => {
    expect(
      isShieldCollected({ x: 0, y: 0.42, z: 0 }, { id: "s", x: 0.72, z: 0.72, expiresAtSeconds: 9 })
    ).toBe(true);
    expect(
      isShieldCollected({ x: 0, y: 0.42, z: 0 }, { id: "s", x: 1.2, z: 0, expiresAtSeconds: 9 })
    ).toBe(false);
  });
});
