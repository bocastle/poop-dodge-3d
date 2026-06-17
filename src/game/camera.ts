import type { Position } from "./types";

export const CAMERA_FOV = 48;
export const CAMERA_TARGET: Position = { x: 0, y: 0, z: 0 };
export const CAMERA_BASE_POSITION: Position = { x: 0, y: 8.5, z: 9 };
export const MIN_FRAMED_CAMERA_ASPECT = 0.78;

export function getResponsiveCameraPosition(aspectRatio: number): Position {
  const safeAspectRatio =
    Number.isFinite(aspectRatio) && aspectRatio > 0 ? aspectRatio : 16 / 9;
  const frameScale = Math.max(1, MIN_FRAMED_CAMERA_ASPECT / safeAspectRatio);

  return {
    x: CAMERA_BASE_POSITION.x,
    y: CAMERA_BASE_POSITION.y * frameScale,
    z: CAMERA_BASE_POSITION.z * frameScale,
  };
}
