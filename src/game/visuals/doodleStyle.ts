import type { InputVector } from "../types";
import { GAME_TUNING } from "../tuning";

export type DoodlePlayerMotion = {
  bobY: number;
  legPhase: -1 | 0 | 1;
  moving: boolean;
  rotationX: number;
  rotationZ: number;
  scaleY: number;
};

export type HazardVisualState = {
  shadowOpacity: number;
  shadowScale: number;
  squash: number;
};

export type DoodleWarningState = {
  dashCount: number;
  opacity: number;
  scale: number;
};

export function getDoodleOutlineScale(baseScale: number) {
  return round(baseScale * GAME_TUNING.visuals.doodleOutlineScale);
}

export function getDoodlePlayerMotion(
  input: InputVector,
  elapsedSeconds: number
): DoodlePlayerMotion {
  const moving = input.x !== 0 || input.z !== 0;
  const visualInput = clampInputMagnitude(input);
  const legWave = Math.sin(elapsedSeconds * 16);
  return {
    bobY: round(
      moving
        ? GAME_TUNING.visuals.doodlePlayerRunBob
        : GAME_TUNING.visuals.doodlePlayerBob
    ),
    legPhase: moving ? (legWave >= 0 ? -1 : 1) : 0,
    moving,
    rotationX: round(visualInput.z * 0.2),
    rotationZ: round(visualInput.x * -0.28),
    scaleY: moving ? 1.06 : 1,
  };
}

export function getHazardVisualState(
  obstacleY: number,
  obstacleRadius: number
): HazardVisualState {
  const progress = getWarningProgress(obstacleY);
  return {
    shadowOpacity: round(progress * 0.34),
    shadowScale: round(obstacleRadius * (1.2 + progress * 0.9)),
    squash: round(1 + progress * 0.04),
  };
}

export function getDoodleWarningState(
  obstacleY: number,
  obstacleRadius: number
): DoodleWarningState {
  const progress = getWarningProgress(obstacleY);
  return {
    dashCount: GAME_TUNING.visuals.doodleWarningDashCount,
    opacity: round(progress * 0.72),
    scale: round(obstacleRadius * (1.4 + progress * 0.9)),
  };
}

function getWarningProgress(obstacleY: number) {
  const range =
    GAME_TUNING.visuals.warningStartY - GAME_TUNING.visuals.warningFullY;
  const raw = (GAME_TUNING.visuals.warningStartY - obstacleY) / range;
  return Math.min(1, Math.max(0, raw));
}

function clampInputMagnitude(input: InputVector): InputVector {
  return {
    x: clamp(input.x, -1, 1),
    z: clamp(input.z, -1, 1),
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function round(value: number) {
  const rounded = Math.round(value * 1000) / 1000;
  return rounded === 0 ? 0 : rounded;
}
