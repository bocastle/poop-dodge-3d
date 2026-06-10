export type GamePhase = "ready" | "playing" | "game-over";

export type Position = {
  x: number;
  y: number;
  z: number;
};

export type InputVector = {
  x: number;
  z: number;
};

export type ArenaBounds = {
  width: number;
  depth: number;
};

export type Difficulty = {
  fallSpeed: number;
  spawnInterval: number;
  maxObstacles: number;
};

export type Obstacle = {
  id: string;
  x: number;
  y: number;
  z: number;
  radius: number;
  rotation: number;
  spin: number;
};

export type GameStats = {
  score: number;
  highScore: number;
  dodged: number;
  elapsedSeconds: number;
};
