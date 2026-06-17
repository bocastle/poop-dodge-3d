import { GAME_TUNING } from "./tuning";
import type { CloseCallTier, ComboState, Position, ShieldPickup } from "./types";

export function getCloseCallTier(distance: number): CloseCallTier | null {
  if (distance <= GAME_TUNING.fun.closeCallPanicDistance) {
    return "panic";
  }
  if (distance <= GAME_TUNING.fun.closeCallCloseDistance) {
    return "close";
  }
  if (distance <= GAME_TUNING.fun.closeCallNiceDistance) {
    return "nice";
  }
  return null;
}

export function isInCloseCallWindow(obstacleY: number) {
  return (
    obstacleY >= GAME_TUNING.fun.closeCallVerticalWindowMinY &&
    obstacleY <= GAME_TUNING.fun.closeCallVerticalWindowMaxY
  );
}

export function createInitialCombo(): ComboState {
  return {
    multiplier: 1,
    streak: 0,
    expiresAtSeconds: 0,
  };
}

export function getNextCombo(current: ComboState, elapsedSeconds: number): ComboState {
  const alive = current.streak > 0 && elapsedSeconds <= current.expiresAtSeconds;
  const nextStreak = alive ? current.streak + 1 : 1;
  return {
    multiplier: Math.min(nextStreak, GAME_TUNING.fun.comboMultiplierCap),
    streak: nextStreak,
    expiresAtSeconds: round(elapsedSeconds + GAME_TUNING.fun.comboTimeoutSeconds),
  };
}

export function getCloseCallBonus(tier: CloseCallTier, multiplier: number) {
  return GAME_TUNING.fun.closeCallBonus[tier] * multiplier;
}

export function shouldSpawnShield(
  elapsedSeconds: number,
  lastSpawnedAtSeconds: number,
  shieldActive: boolean,
  activePickup: ShieldPickup | null
) {
  if (shieldActive || activePickup) {
    return false;
  }
  if (lastSpawnedAtSeconds === 0) {
    return elapsedSeconds >= GAME_TUNING.fun.shieldSpawnFirstSeconds;
  }
  return elapsedSeconds - lastSpawnedAtSeconds >= GAME_TUNING.fun.shieldSpawnIntervalSeconds;
}

export function getShieldPickupPosition(seed: number): Pick<ShieldPickup, "x" | "z"> {
  const pickupInset = 1.1;
  const xLimit = GAME_TUNING.arena.width / 2 - pickupInset;
  const zLimit = GAME_TUNING.arena.depth / 2 - pickupInset;

  return {
    x: round(seededRange(seed * 17.17, -xLimit, xLimit)),
    z: round(seededRange(seed * 71.41, -zLimit, zLimit)),
  };
}

export function isShieldCollected(player: Position, pickup: ShieldPickup) {
  const distance = Math.hypot(player.x - pickup.x, player.z - pickup.z);
  return distance <= GAME_TUNING.feel.shieldCollectRadius;
}

function seededRange(seed: number, min: number, max: number) {
  const raw = Math.sin(seed) * 10000;
  const ratio = raw - Math.floor(raw);
  return min + ratio * (max - min);
}

function round(value: number) {
  const rounded = Math.round(value * 100) / 100;
  return rounded === 0 ? 0 : rounded;
}
