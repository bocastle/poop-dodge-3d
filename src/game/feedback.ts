import type { InputVector } from "./types";
import { GAME_TUNING } from "./tuning";

export function getPlayerLean(input: InputVector) {
  const moving = input.x !== 0 || input.z !== 0;
  const visualInput = clampInput(input);
  return {
    rotationX: round(visualInput.z * 0.2),
    rotationY: round(visualInput.x * -0.42),
    scaleY: moving ? 1.06 : 1,
  };
}

export function getWarningOpacity(obstacleY: number) {
  if (obstacleY < -1.2) {
    return 0;
  }

  const progress = getWarningProgress(obstacleY);
  return round(progress * 0.62);
}

export function getWarningScale(obstacleY: number, obstacleRadius: number) {
  if (obstacleY < -1.2) {
    return 0;
  }

  const progress = getWarningProgress(obstacleY);
  return round(obstacleRadius * (1.2 + progress));
}

export function getCameraShake(secondsSinceImpact: number) {
  if (secondsSinceImpact <= 0 || secondsSinceImpact >= GAME_TUNING.visuals.cameraShakeSeconds) {
    return 0;
  }

  const remaining = 1 - secondsSinceImpact / GAME_TUNING.visuals.cameraShakeSeconds;
  return round(remaining * 0.12);
}

export function isScoreMilestone(previousScore: number, nextScore: number) {
  return Math.floor(previousScore / 250) !== Math.floor(nextScore / 250);
}

function getWarningProgress(obstacleY: number) {
  const range = GAME_TUNING.visuals.warningStartY - GAME_TUNING.visuals.warningFullY;
  const raw = (GAME_TUNING.visuals.warningStartY - obstacleY) / range;
  return Math.min(1, Math.max(0, raw));
}

function clampInput(input: InputVector): InputVector {
  return {
    x: clamp(input.x, -1, 1),
    z: clamp(input.z, -1, 1),
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function round(value: number) {
  return Math.round(value * 1000) / 1000;
}
