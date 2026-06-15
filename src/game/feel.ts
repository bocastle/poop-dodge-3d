import { GAME_TUNING } from "./tuning";
import type { CalloutTone, CloseCallTier, Position, RunSummary } from "./types";

type RunSummaryInput = {
  closeCalls: number;
  bestComboMultiplier: number;
  bestComboStreak: number;
  shieldSaves: number;
  dodged: number;
};

type FlatPosition = Pick<Position, "x" | "z">;

export function getShieldPullProgress(distance: number) {
  const attractRadius = GAME_TUNING.feel.shieldAttractRadius;
  const collectRadius = GAME_TUNING.feel.shieldCollectRadius;

  if (distance >= attractRadius) {
    return 0;
  }
  if (distance <= collectRadius) {
    return 1;
  }

  return round((attractRadius - distance) / (attractRadius - collectRadius));
}

export function getCalloutTone(
  tier: CloseCallTier | null,
  multiplier: number,
  shieldEvent: boolean
): CalloutTone {
  if (shieldEvent) {
    return "shield";
  }
  if (tier === "panic") {
    return "panic";
  }
  if (tier === "close" || multiplier > 1) {
    return "hot";
  }
  return "neutral";
}

export function isInsideShieldSaveClearRadius(origin: FlatPosition, target: FlatPosition) {
  return Math.hypot(origin.x - target.x, origin.z - target.z) <= GAME_TUNING.feel.shieldSaveClearRadius;
}

export function getRunSummary(input: RunSummaryInput): RunSummary {
  if (input.shieldSaves > 0) {
    return {
      title: "Shield clutch",
      detail: `${input.shieldSaves} shield save${input.shieldSaves === 1 ? "" : "s"} kept the page alive.`,
    };
  }

  if (input.bestComboMultiplier >= 2) {
    return {
      title: "Risky doodler",
      detail: `${input.closeCalls} close calls and a x${input.bestComboMultiplier} combo.`,
    };
  }

  if (input.closeCalls >= GAME_TUNING.feel.panicComboSummaryMinimum) {
    return {
      title: "Risky doodler",
      detail: `${input.closeCalls} close calls without blinking.`,
    };
  }

  return {
    title: "Clean paper",
    detail: `${input.dodged} drops dodged.`,
  };
}

function round(value: number) {
  return Math.round(value * 1000) / 1000;
}
