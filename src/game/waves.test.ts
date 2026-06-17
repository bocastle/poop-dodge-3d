import { describe, expect, it } from "vitest";
import type { Difficulty, Obstacle } from "./types";
import {
  applyDangerWaveToDifficulty,
  getDangerWave,
  getDramaTimeScale,
  tuneObstacleForDangerWave,
} from "./waves";

const baseDifficulty: Difficulty = {
  fallSpeed: 4,
  maxObstacles: 16,
  spawnInterval: 0.64,
};

const baseObstacle: Obstacle = {
  id: "drop-1",
  x: 1,
  y: 7,
  z: -1,
  radius: 0.42,
  rotation: 0,
  spin: 1,
};

describe("danger waves", () => {
  it("starts short deterministic waves after the opening warmup", () => {
    expect(getDangerWave(9.9, 1)).toBeNull();

    expect(getDangerWave(10.1, 1)).toMatchObject({
      id: "wideDrop",
      title: "Wide Drop",
      tone: "wide",
    });

    expect(getDangerWave(14.2, 1)).toBeNull();
    expect(getDangerWave(23.1, 1)).toMatchObject({
      id: "tinyGap",
      title: "Tiny Gap",
    });
  });

  it("turns active waves into clear gameplay pressure", () => {
    const rushDifficulty = applyDangerWaveToDifficulty(baseDifficulty, {
      id: "rush",
      title: "Rush",
      detail: "Fast drops.",
      tone: "rush",
      endsAtSeconds: 14,
    });

    expect(rushDifficulty.fallSpeed).toBeGreaterThan(baseDifficulty.fallSpeed);
    expect(rushDifficulty.spawnInterval).toBeLessThan(baseDifficulty.spawnInterval);
    expect(rushDifficulty.maxObstacles).toBeGreaterThan(baseDifficulty.maxObstacles);
  });

  it("makes wide drops visibly wider without mutating the original obstacle", () => {
    const tuned = tuneObstacleForDangerWave(baseObstacle, {
      id: "wideDrop",
      title: "Wide Drop",
      detail: "Bigger drops.",
      tone: "wide",
      endsAtSeconds: 14,
    });

    expect(tuned.radius).toBeGreaterThan(baseObstacle.radius);
    expect(baseObstacle.radius).toBe(0.42);
  });

  it("uses very short drama slow motion only for panic and shield moments", () => {
    expect(getDramaTimeScale(0)).toBe(1);
    expect(getDramaTimeScale(0.12)).toBe(0.48);
    expect(getDramaTimeScale(0.24)).toBe(1);
  });
});
