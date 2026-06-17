import { GAME_TUNING } from "./tuning";
import type { DangerWave, DangerWaveId, DangerWaveTone, Difficulty, Obstacle } from "./types";

const waveOrder: Array<{
  id: DangerWaveId;
  title: string;
  detail: string;
  tone: DangerWaveTone;
}> = [
  {
    id: "rush",
    title: "Rush",
    detail: "Fast drops for a few seconds.",
    tone: "rush",
  },
  {
    id: "wideDrop",
    title: "Wide Drop",
    detail: "Bigger drops take over the page.",
    tone: "wide",
  },
  {
    id: "tinyGap",
    title: "Tiny Gap",
    detail: "Small safe lanes. Move clean.",
    tone: "tiny",
  },
  {
    id: "messyRain",
    title: "Messy Rain",
    detail: "More drops for a few seconds.",
    tone: "messy",
  },
];

export function getDangerWave(elapsedSeconds: number, runSeed: number): DangerWave | null {
  const firstStart = GAME_TUNING.waves.firstStartSeconds;
  if (elapsedSeconds < firstStart) {
    return null;
  }

  const elapsedAfterWarmup = elapsedSeconds - firstStart;
  const waveIndex = Math.floor(elapsedAfterWarmup / GAME_TUNING.waves.intervalSeconds);
  const secondsIntoWave = elapsedAfterWarmup - waveIndex * GAME_TUNING.waves.intervalSeconds;

  if (secondsIntoWave >= GAME_TUNING.waves.durationSeconds) {
    return null;
  }

  const definition = waveOrder[Math.abs(runSeed + waveIndex) % waveOrder.length];
  return {
    ...definition,
    endsAtSeconds: round(firstStart + waveIndex * GAME_TUNING.waves.intervalSeconds + GAME_TUNING.waves.durationSeconds),
  };
}

export function applyDangerWaveToDifficulty(
  difficulty: Difficulty,
  wave: DangerWave | null
): Difficulty {
  if (wave === null) {
    return difficulty;
  }

  switch (wave.id) {
    case "rush":
      return {
        fallSpeed: round(difficulty.fallSpeed * 1.18),
        maxObstacles: difficulty.maxObstacles + 4,
        spawnInterval: round(difficulty.spawnInterval * 0.84),
      };
    case "wideDrop":
      return {
        fallSpeed: round(difficulty.fallSpeed * 1.08),
        maxObstacles: difficulty.maxObstacles + 2,
        spawnInterval: round(difficulty.spawnInterval * 0.92),
      };
    case "tinyGap":
      return {
        fallSpeed: round(difficulty.fallSpeed * 1.05),
        maxObstacles: difficulty.maxObstacles + 3,
        spawnInterval: round(difficulty.spawnInterval * 0.88),
      };
    case "messyRain":
      return {
        fallSpeed: round(difficulty.fallSpeed * 1.04),
        maxObstacles: difficulty.maxObstacles + 6,
        spawnInterval: round(difficulty.spawnInterval * 0.78),
      };
  }
}

export function tuneObstacleForDangerWave(obstacle: Obstacle, wave: DangerWave | null): Obstacle {
  if (wave === null) {
    return obstacle;
  }

  if (wave.id === "wideDrop") {
    return {
      ...obstacle,
      radius: round(obstacle.radius * 1.28),
    };
  }

  if (wave.id === "tinyGap") {
    return {
      ...obstacle,
      radius: round(obstacle.radius * 0.86),
      spin: round(obstacle.spin * 1.2),
    };
  }

  if (wave.id === "messyRain") {
    return {
      ...obstacle,
      radius: round(obstacle.radius * 0.92),
    };
  }

  return obstacle;
}

export function getDramaTimeScale(remainingSeconds: number): number {
  if (remainingSeconds <= 0 || remainingSeconds >= GAME_TUNING.waves.dramaSlowSeconds) {
    return 1;
  }

  return GAME_TUNING.waves.dramaTimeScale;
}

function round(value: number): number {
  return Math.round(value * 1000) / 1000;
}
