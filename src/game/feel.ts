import { GAME_TUNING } from "./tuning";
import type { CalloutTone, CloseCallTier, Position, RunHighlight, RunSummary } from "./types";

type RunSummaryInput = {
  closeCalls: number;
  bestComboMultiplier: number;
  bestComboStreak: number;
  shieldSaves: number;
  dodged: number;
};

type MatchHeadlinePlayer = {
  nickname: string;
};

type PlayerResultBadgeInput = {
  rank: number;
  totalPlayers: number;
  closeCalls: number;
  shieldSaves: number;
};

type FeverStateInput = {
  comboMultiplier: number;
  bestComboStreak: number;
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

export function getMatchResultHeadline(winner: MatchHeadlinePlayer | null): RunSummary {
  if (winner === null) {
    return {
      title: "No clean winner",
      detail: "The page got everybody.",
    };
  }

  return {
    title: `${winner.nickname} owns the page`,
    detail: "Everyone else got folded.",
  };
}

export function getPlayerResultBadge(input: PlayerResultBadgeInput): string {
  if (input.rank === 1) {
    return "Crown dodger";
  }

  if (input.closeCalls >= 4) {
    return "Danger magnet";
  }

  if (input.shieldSaves > 0) {
    return "Shield clutch";
  }

  if (input.rank === input.totalPlayers && input.totalPlayers > 1) {
    return "First splat";
  }

  return "Still breathing";
}

export function getFeverState(input: FeverStateInput): { active: boolean; label: string } {
  const active =
    input.comboMultiplier >= GAME_TUNING.waves.feverMinimumMultiplier ||
    input.bestComboStreak >= GAME_TUNING.waves.feverMinimumMultiplier;

  return {
    active,
    label: active ? `FEVER x${input.comboMultiplier}` : `Combo x${input.comboMultiplier}`,
  };
}

export function getRunHighlight(input: RunSummaryInput & { elapsedSeconds: number }): RunHighlight {
  if (input.bestComboMultiplier >= GAME_TUNING.waves.feverMinimumMultiplier) {
    return {
      title: "Fever run",
      detail: `Held a x${input.bestComboMultiplier} close-call chain.`,
      tone: "fever",
    };
  }

  if (input.shieldSaves > 0) {
    return {
      title: "Shield clutch",
      detail: `${input.shieldSaves} save${input.shieldSaves === 1 ? "" : "s"} kept the run alive.`,
      tone: "shield",
    };
  }

  if (input.closeCalls >= GAME_TUNING.feel.panicComboSummaryMinimum) {
    return {
      title: "Panic dancer",
      detail: `${input.closeCalls} close calls without folding.`,
      tone: "panic",
    };
  }

  if (input.dodged >= 20 || input.elapsedSeconds >= 20) {
    return {
      title: "Still standing",
      detail: `${input.dodged} drops dodged before the page gave up.`,
      tone: "survival",
    };
  }

  return {
    title: "First page",
    detail: "Try another run.",
    tone: "neutral",
  };
}

function round(value: number) {
  return Math.round(value * 1000) / 1000;
}
