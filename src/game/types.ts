export type GamePhase = "ready" | "playing" | "game-over";

export type CloseCallTier = "nice" | "close" | "panic";

export type CalloutTone = "neutral" | "hot" | "panic" | "shield";

export type RunSummary = {
  title: string;
  detail: string;
};

export type ComboState = {
  multiplier: number;
  streak: number;
  expiresAtSeconds: number;
};

export type ShieldPickup = {
  id: string;
  x: number;
  z: number;
  expiresAtSeconds: number;
};

export type ShieldBurst = {
  id: number;
  x: number;
  z: number;
  startedAtSeconds: number;
  expiresAtSeconds: number;
};

export type Position = {
  x: number;
  y: number;
  z: number;
};

export type RemotePlayerSnapshot = {
  id: string;
  nickname: string;
  color: string;
  position: Position;
  state: "alive" | "eliminated" | "waitingNextRound" | "disconnected";
};

export type MultiplayerMatchConfig = {
  enabled: boolean;
  matchSeed: number | null;
  matchStartedAt: number | null;
  serverNowOffsetMs: number;
  localPlayerId: string | null;
  remotePlayers: RemotePlayerSnapshot[];
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
  closestSafeDistance?: number;
};

export type GameStats = {
  score: number;
  highScore: number;
  dodged: number;
  elapsedSeconds: number;
  closeCalls: number;
  comboMultiplier: number;
  bestComboMultiplier: number;
  bestComboStreak: number;
  shieldActive: boolean;
  shieldSaves: number;
  callout: string | null;
  calloutId: number;
  calloutTone: CalloutTone;
  runSummary: RunSummary;
};
