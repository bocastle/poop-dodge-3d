import { describe, expect, it } from "vitest";
import { PerspectiveCamera, Vector3 } from "three";
import {
  CAMERA_FOV,
  CAMERA_TARGET,
  getResponsiveCameraPosition,
} from "./camera";
import { PLAYER_RADIUS } from "./logic";
import { GAME_TUNING } from "./tuning";

function projectArenaEdge(width: number, height: number, x: number): number {
  const camera = new PerspectiveCamera(CAMERA_FOV, width / height, 0.1, 1000);
  const position = getResponsiveCameraPosition(width / height);
  camera.position.set(position.x, position.y, position.z);
  camera.lookAt(CAMERA_TARGET.x, CAMERA_TARGET.y, CAMERA_TARGET.z);
  camera.updateMatrixWorld();
  camera.updateProjectionMatrix();

  return new Vector3(x, GAME_TUNING.player.startY, 0).project(camera).x;
}

describe("responsive camera framing", () => {
  it("keeps the player visible at arena edges on portrait mobile screens", () => {
    const arenaEdgeWithPlayer = GAME_TUNING.arena.width / 2 + PLAYER_RADIUS * 0.7;

    expect(projectArenaEdge(390, 844, -arenaEdgeWithPlayer)).toBeGreaterThanOrEqual(-1);
    expect(projectArenaEdge(390, 844, arenaEdgeWithPlayer)).toBeLessThanOrEqual(1);
  });

  it("does not zoom desktop and landscape screens away from the base framing", () => {
    expect(getResponsiveCameraPosition(1280 / 720)).toEqual({ x: 0, y: 8.5, z: 9 });
    expect(getResponsiveCameraPosition(667 / 375)).toEqual({ x: 0, y: 8.5, z: 9 });
  });
});
