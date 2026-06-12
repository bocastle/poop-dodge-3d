export const GAME_TUNING = {
  player: {
    speed: 6.15,
    radius: 0.5,
    startY: 0.42,
  },
  arena: {
    width: 7.6,
    depth: 7.6,
  },
  difficulty: {
    rampSeconds: 55,
    startFallSpeed: 3.25,
    maxFallSpeed: 5.65,
    startSpawnInterval: 0.76,
    minSpawnInterval: 0.42,
    startMaxObstacles: 14,
    maxObstacles: 28,
  },
  score: {
    pointsPerSecond: 12,
    pointsPerDodge: 35,
  },
  visuals: {
    maxRenderedObstacles: 36,
    warningStartY: 5.8,
    warningFullY: 1.1,
    cameraShakeSeconds: 0.22,
  },
} as const;
