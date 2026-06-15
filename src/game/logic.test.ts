import { describe, expect, it } from "vitest";
import {
  createSeededObstacle,
  getDifficulty,
  getHighScore,
  getScore,
  isCollision,
  movePlayer,
  normalizeInput,
} from "./logic";
import { GAME_TUNING } from "./tuning";

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

  it("uses shared tuning for arena movement", () => {
    const next = movePlayer(
      { x: GAME_TUNING.arena.width / 2 - 0.05, y: 0.42, z: 0 },
      { x: 1, z: 0 },
      1,
      GAME_TUNING.player.speed,
      GAME_TUNING.arena
    );

    expect(next.x).toBe(GAME_TUNING.arena.width / 2);
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

  it("starts rounds with quicker pressure for first-run fun", () => {
    const start = getDifficulty(0);
    const fiveSeconds = getDifficulty(5);

    expect(start.fallSpeed).toBeGreaterThanOrEqual(3.7);
    expect(start.spawnInterval).toBeLessThanOrEqual(0.68);
    expect(fiveSeconds.maxObstacles).toBeGreaterThanOrEqual(16);
  });

  it("keeps difficulty within tuned limits", () => {
    const start = getDifficulty(0);
    const late = getDifficulty(90);

    expect(start.fallSpeed).toBe(GAME_TUNING.difficulty.startFallSpeed);
    expect(late.fallSpeed).toBe(GAME_TUNING.difficulty.maxFallSpeed);
    expect(late.spawnInterval).toBe(GAME_TUNING.difficulty.minSpawnInterval);
    expect(late.maxObstacles).toBe(GAME_TUNING.difficulty.maxObstacles);
  });

  it("calculates score from elapsed time, dodges, and fun bonus", () => {
    expect(getScore(10, 3)).toBe(225);
    expect(getScore(10, 3, 90)).toBe(315);
  });

  it("keeps the larger high score", () => {
    expect(getHighScore(120, 90)).toBe(120);
    expect(getHighScore(120, 220)).toBe(220);
  });

  it("creates identical obstacles for the same match seed and spawn index", () => {
    const difficulty = getDifficulty(12);

    expect(createSeededObstacle(42.5, 7, difficulty)).toEqual(
      createSeededObstacle(42.5, 7, difficulty)
    );
  });

  it("changes the obstacle id or position when the spawn index changes", () => {
    const difficulty = getDifficulty(12);
    const first = createSeededObstacle(42.5, 7, difficulty);
    const next = createSeededObstacle(42.5, 8, difficulty);

    expect([next.id, next.x, next.z]).not.toEqual([first.id, first.x, first.z]);
  });

  it("changes the obstacle id or position when the match seed changes", () => {
    const difficulty = getDifficulty(12);
    const first = createSeededObstacle(42.5, 7, difficulty);
    const next = createSeededObstacle(43.5, 7, difficulty);

    expect([next.id, next.x, next.z]).not.toEqual([first.id, first.x, first.z]);
  });

  it("keeps obstacle ids unique for large multiplayer seeds", () => {
    const difficulty = getDifficulty(12);
    const matchSeed = 4_946_015_098_311_530;
    const obstacles = Array.from({ length: 12 }, (_, spawnIndex) =>
      createSeededObstacle(matchSeed, spawnIndex, difficulty)
    );

    expect(new Set(obstacles.map((obstacle) => obstacle.id)).size).toBe(
      obstacles.length
    );
  });
});
