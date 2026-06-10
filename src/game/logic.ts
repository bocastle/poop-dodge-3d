import type { ArenaBounds, Difficulty, InputVector, Obstacle, Position } from "./types";

export const PLAYER_SPEED = 5.5;
export const PLAYER_RADIUS = 0.52;
export const ARENA_BOUNDS: ArenaBounds = {
  width: 7.2,
  depth: 7.2,
};

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
  const level = Math.min(elapsedSeconds / 35, 1);
  return {
    fallSpeed: 3.1 + level * 2.4,
    spawnInterval: 0.82 - level * 0.34,
    maxObstacles: Math.round(14 + level * 12),
  };
}

export function getScore(elapsedSeconds: number, dodged: number) {
  return Math.floor(elapsedSeconds * 12 + dodged * 35);
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
