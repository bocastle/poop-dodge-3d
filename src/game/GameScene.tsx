import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import type { InstancedMesh, Mesh } from "three";
import { Object3D } from "three";
import {
  ARENA_BOUNDS,
  PLAYER_RADIUS,
  PLAYER_SPEED,
  createObstacle,
  getDifficulty,
  getScore,
  isCollision,
  movePlayer,
} from "./logic";
import type { GamePhase, GameStats, InputVector, Obstacle, Position } from "./types";

const startPosition: Position = { x: 0, y: 0.42, z: 0 };
const maxRenderedObstacles = 32;

type GameSceneProps = {
  input: InputVector;
  phase: GamePhase;
  runId: number;
  onGameOver: (stats: GameStats) => void;
  onStatsChange: (stats: GameStats) => void;
};

export function GameScene({
  input,
  phase,
  runId,
  onGameOver,
  onStatsChange,
}: GameSceneProps) {
  const playerRef = useRef<Mesh>(null);
  const obstacleMeshRef = useRef<InstancedMesh>(null);
  const playerPosition = useRef<Position>(startPosition);
  const obstacles = useRef<Obstacle[]>([]);
  const elapsed = useRef(0);
  const spawnTimer = useRef(0);
  const dodged = useRef(0);
  const lastStatsSecond = useRef(-1);
  const gameOverSent = useRef(false);
  const matrixObject = useMemo(() => new Object3D(), []);

  useEffect(() => {
    playerPosition.current = startPosition;
    obstacles.current = [];
    elapsed.current = 0;
    spawnTimer.current = 0;
    dodged.current = 0;
    lastStatsSecond.current = -1;
    gameOverSent.current = false;
    if (playerRef.current) {
      playerRef.current.position.set(startPosition.x, startPosition.y, startPosition.z);
    }
    syncObstacleMesh(obstacleMeshRef.current, matrixObject, obstacles.current);
  }, [matrixObject, runId]);

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05);
    const player = playerRef.current;

    if (!player) {
      return;
    }

    if (phase !== "playing") {
      player.rotation.y += dt * 0.45;
      return;
    }

    elapsed.current += dt;
    const difficulty = getDifficulty(elapsed.current);
    playerPosition.current = movePlayer(
      playerPosition.current,
      input,
      dt,
      PLAYER_SPEED,
      ARENA_BOUNDS
    );
    player.position.set(
      playerPosition.current.x,
      playerPosition.current.y,
      playerPosition.current.z
    );
    player.rotation.y = input.x * -0.28;
    player.rotation.x = input.z * 0.12;

    spawnTimer.current -= dt;

    if (spawnTimer.current <= 0) {
      obstacles.current.push(
        createObstacle(state.clock.elapsedTime + obstacles.current.length, difficulty)
      );
      spawnTimer.current = difficulty.spawnInterval;
    }

    let avoided = 0;
    const activeObstacles: Obstacle[] = [];
    for (const obstacle of obstacles.current) {
      obstacle.y -= difficulty.fallSpeed * dt;
      obstacle.rotation += obstacle.spin * dt;

      if (obstacle.y > -1.2) {
        activeObstacles.push(obstacle);
      } else {
        avoided += 1;
      }
    }
    obstacles.current = activeObstacles.slice(-Math.min(difficulty.maxObstacles, maxRenderedObstacles));

    if (avoided > 0) {
      dodged.current += avoided;
    }

    const hit = obstacles.current.some((obstacle) =>
      isCollision(
        playerPosition.current,
        { x: obstacle.x, y: obstacle.y, z: obstacle.z },
        PLAYER_RADIUS,
        obstacle.radius
      )
    );

    syncObstacleMesh(obstacleMeshRef.current, matrixObject, obstacles.current);

    const nextStats: GameStats = {
      score: getScore(elapsed.current, dodged.current),
      highScore: 0,
      dodged: dodged.current,
      elapsedSeconds: elapsed.current,
    };

    if (hit && !gameOverSent.current) {
      gameOverSent.current = true;
      onGameOver(nextStats);
      return;
    }

    const currentSecond = Math.floor(elapsed.current * 4);
    if (currentSecond !== lastStatsSecond.current || avoided > 0) {
      lastStatsSecond.current = currentSecond;
      onStatsChange(nextStats);
    }
  });

  return (
    <>
      <ambientLight intensity={1.1} color="#f6f1df" />
      <directionalLight intensity={2.4} color="#fff1c7" position={[4, 7, 2]} />
      <directionalLight intensity={1.2} color="#7bdff2" position={[-5, 5, -4]} />

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow>
        <planeGeometry args={[ARENA_BOUNDS.width + 1.6, ARENA_BOUNDS.depth + 1.6, 1, 1]} />
        <meshStandardMaterial color="#18232d" roughness={0.92} metalness={0.05} />
      </mesh>

      <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[3.95, 4.04, 64]} />
        <meshBasicMaterial color="#3dd6d0" transparent opacity={0.38} />
      </mesh>

      <mesh ref={playerRef} position={[startPosition.x, startPosition.y, startPosition.z]}>
        <capsuleGeometry args={[0.32, 0.42, 6, 12]} />
        <meshStandardMaterial color="#ffe66d" roughness={0.5} metalness={0.08} />
      </mesh>

      <instancedMesh ref={obstacleMeshRef} args={[undefined, undefined, maxRenderedObstacles]}>
        <dodecahedronGeometry args={[1, 1]} />
        <meshStandardMaterial color="#7b4b2a" roughness={0.86} metalness={0.02} />
      </instancedMesh>
    </>
  );
}

function syncObstacleMesh(
  mesh: InstancedMesh | null,
  matrixObject: Object3D,
  obstacles: Obstacle[]
) {
  if (!mesh) {
    return;
  }

  mesh.count = obstacles.length;
  obstacles.forEach((obstacle, index) => {
    matrixObject.position.set(obstacle.x, obstacle.y, obstacle.z);
    matrixObject.rotation.set(
      obstacle.rotation,
      obstacle.rotation * 0.35,
      obstacle.rotation * 0.22
    );
    matrixObject.scale.setScalar(obstacle.radius);
    matrixObject.updateMatrix();
    mesh.setMatrixAt(index, matrixObject.matrix);
  });
  mesh.instanceMatrix.needsUpdate = true;
}
