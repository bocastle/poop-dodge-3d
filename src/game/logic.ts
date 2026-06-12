import type { ArenaBounds, Difficulty, InputVector, Obstacle, Position } from "./types";
import { GAME_TUNING } from "./tuning";

export const PLAYER_SPEED = GAME_TUNING.player.speed;
export const PLAYER_RADIUS = GAME_TUNING.player.radius;
export const ARENA_BOUNDS: ArenaBounds = GAME_TUNING.arena;

export function normalizeInput(input: InputVector): InputVector {
  const length = Math.hypot(input.x, input.z);
  if (length <= 1) {
    return input;
  }
  return {
    x: input.x / length,
    z: input.z / length,
  };
}

export function movePlayer(
  position: Position,
  input: InputVector,
  deltaSeconds: number,
  speed: number,
  bounds: ArenaBounds
): Position {
  const normalized = normalizeInput(input);
  return {
    x: clamp(position.x + normalized.x * speed * deltaSeconds, -bounds.width / 2, bounds.width / 2),
    y: position.y,
    z: clamp(position.z + normalized.z * speed * deltaSeconds, -bounds.depth / 2, bounds.depth / 2),
  };
}

export function isCollision(
  player: Position,
  obstacle: Position,
  playerRadius: number,
  obstacleRadius: number
) {
  const horizontalDistance = Math.hypot(player.x - obstacle.x, player.z - obstacle.z);
  const verticalDistance = Math.abs(player.y - obstacle.y);
  return horizontalDistance <= playerRadius + obstacleRadius * 0.72 &&
    verticalDistance <= playerRadius + obstacleRadius;
}

export function getDifficulty(elapsedSeconds: number): Difficulty {
  const level = Math.min(elapsedSeconds / GAME_TUNING.difficulty.rampSeconds, 1);

  if (level === 1) {
    return {
      fallSpeed: GAME_TUNING.difficulty.maxFallSpeed,
      spawnInterval: GAME_TUNING.difficulty.minSpawnInterval,
      maxObstacles: GAME_TUNING.difficulty.maxObstacles,
    };
  }

  return {
    fallSpeed:
      GAME_TUNING.difficulty.startFallSpeed +
      level *
        (GAME_TUNING.difficulty.maxFallSpeed - GAME_TUNING.difficulty.startFallSpeed),
    spawnInterval:
      GAME_TUNING.difficulty.startSpawnInterval -
      level *
        (GAME_TUNING.difficulty.startSpawnInterval -
          GAME_TUNING.difficulty.minSpawnInterval),
    maxObstacles: Math.round(
      GAME_TUNING.difficulty.startMaxObstacles +
        level *
          (GAME_TUNING.difficulty.maxObstacles - GAME_TUNING.difficulty.startMaxObstacles)
    ),
  };
}

export function getScore(elapsedSeconds: number, dodged: number) {
  return Math.floor(
    elapsedSeconds * GAME_TUNING.score.pointsPerSecond +
      dodged * GAME_TUNING.score.pointsPerDodge
  );
}

export function getHighScore(previousHighScore: number, score: number) {
  return Math.max(previousHighScore, score);
}

export function createObstacle(seed: number, difficulty: Difficulty): Obstacle {
  const x = seededRange(seed * 12.9898, -ARENA_BOUNDS.width / 2, ARENA_BOUNDS.width / 2);
  const z = seededRange(seed * 78.233, -ARENA_BOUNDS.depth / 2, ARENA_BOUNDS.depth / 2);
  const radius = seededRange(seed * 37.719, 0.26, 0.48);

  return {
    id: `${Math.round(seed * 1000)}`,
    x,
    y: 7.6 + difficulty.fallSpeed * 0.12,
    z,
    radius,
    rotation: seededRange(seed * 91.7, 0, Math.PI * 2),
    spin: seededRange(seed * 13.4, 1.2, 3.4),
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function seededRange(seed: number, min: number, max: number) {
  const raw = Math.sin(seed) * 10000;
  const ratio = raw - Math.floor(raw);
  return min + ratio * (max - min);
}
