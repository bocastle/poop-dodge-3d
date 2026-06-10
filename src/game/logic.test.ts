import { describe, expect, it } from "vitest";
import {
  getDifficulty,
  getHighScore,
  getScore,
  isCollision,
  movePlayer,
  normalizeInput,
} from "./logic";

describe("game logic", () => {
  it("normalizes diagonal input", () => {
    const input = normalizeInput({ x: 1, z: 1 });
    expect(Math.hypot(input.x, input.z)).toBeCloseTo(1);
  });

  it("clamps player movement within arena bounds", () => {
    const next = movePlayer(
      { x: 3.5, y: 0.42, z: 0 },
      { x: 1, z: 0 },
      1,
      5,
      { width: 7.2, depth: 7.2 }
    );
    expect(next.x).toBe(3.6);
  });

  it("detects collision near the player", () => {
    expect(
      isCollision(
        { x: 0, y: 0.42, z: 0 },
        { x: 0.25, y: 0.55, z: 0.2 },
        0.52,
        0.35
      )
    ).toBe(true);
  });

  it("does not detect collision for far obstacles", () => {
    expect(
      isCollision(
        { x: 0, y: 0.42, z: 0 },
        { x: 2.5, y: 0.55, z: 2.5 },
        0.52,
        0.35
      )
    ).toBe(false);
  });

  it("raises difficulty over time", () => {
    const start = getDifficulty(0);
    const late = getDifficulty(60);
    expect(late.fallSpeed).toBeGreaterThan(start.fallSpeed);
    expect(late.spawnInterval).toBeLessThan(start.spawnInterval);
    expect(late.maxObstacles).toBeGreaterThan(start.maxObstacles);
  });

  it("calculates score from elapsed time and dodges", () => {
    expect(getScore(10, 3)).toBe(225);
  });

  it("keeps the larger high score", () => {
    expect(getHighScore(120, 90)).toBe(120);
    expect(getHighScore(120, 220)).toBe(220);
  });
});
