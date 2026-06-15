import { useFrame } from "@react-three/fiber";
import { useEffect, useRef, useState } from "react";
import type { Group } from "three";
import { getCameraShake } from "./feedback";
import { getCalloutTone, getRunSummary, isInsideShieldSaveClearRadius } from "./feel";
import {
  createInitialCombo,
  getCloseCallBonus,
  getCloseCallTier,
  getNextCombo,
  getShieldPickupPosition,
  isInCloseCallWindow,
  isShieldCollected,
  shouldSpawnShield,
} from "./fun";
import {
  ARENA_BOUNDS,
  PLAYER_RADIUS,
  PLAYER_SPEED,
  createSeededObstacle,
  getDifficulty,
  getScore,
  isCollision,
  movePlayer,
} from "./logic";
import { GAME_TUNING } from "./tuning";
import type {
  ComboState,
  GamePhase,
  GameStats,
  InputVector,
  MultiplayerMatchConfig,
  Obstacle,
  Position,
  ShieldBurst as ShieldBurstData,
  ShieldPickup as ShieldPickupData,
} from "./types";
import { DangerRing } from "./visuals/DangerRing";
import { DoodleHazard } from "./visuals/DoodleHazard";
import { DoodlePlayer } from "./visuals/DoodlePlayer";
import { PaperArena } from "./visuals/PaperArena";
import { RemoteDoodlePlayer } from "./visuals/RemoteDoodlePlayer";
import { ShieldBurst } from "./visuals/ShieldBurst";
import { ShieldPickup } from "./visuals/ShieldPickup";

const startPosition: Position = { x: 0, y: GAME_TUNING.player.startY, z: 0 };
const maxRenderedObstacles = GAME_TUNING.visuals.maxRenderedObstacles;
const cameraBasePosition = { x: 0, y: 8.5, z: 9 };

type GameSceneProps = {
  input: InputVector;
  phase: GamePhase;
  runId: number;
  multiplayerMatch?: MultiplayerMatchConfig;
  onLocalSnapshot?: (position: Position, stats: GameStats) => void;
  onMultiplayerEliminated?: (stats: GameStats) => void;
  onGameOver: (stats: GameStats) => void;
  onStatsChange: (stats: GameStats) => void;
};

export function GameScene({
  input,
  phase,
  runId,
  multiplayerMatch,
  onLocalSnapshot,
  onMultiplayerEliminated,
  onGameOver,
  onStatsChange,
}: GameSceneProps) {
  const playerRef = useRef<Group>(null);
  const playerPosition = useRef<Position>(startPosition);
  const obstacles = useRef<Obstacle[]>([]);
  const [renderObstacles, setRenderObstacles] = useState<Obstacle[]>([]);
  const elapsed = useRef(0);
  const spawnTimer = useRef(0);
  const spawnIndex = useRef(0);
  const dodged = useRef(0);
  const lastStatsSecond = useRef(-1);
  const lastLocalSnapshotAt = useRef(0);
  const gameOverSent = useRef(false);
  const impactTimer = useRef(0);
  const freezeTimer = useRef(0);
  const bestComboMultiplier = useRef(1);
  const bestComboStreak = useRef(0);
  const calloutTone = useRef<GameStats["calloutTone"]>("neutral");
  const bonusScore = useRef(0);
  const closeCalls = useRef(0);
  const combo = useRef<ComboState>(createInitialCombo());
  const shieldActive = useRef(false);
  const shieldSaves = useRef(0);
  const shieldPickup = useRef<ShieldPickupData | null>(null);
  const [renderShieldPickup, setRenderShieldPickup] = useState<ShieldPickupData | null>(null);
  const [renderShieldBurst, setRenderShieldBurst] = useState<ShieldBurstData | null>(null);
  const lastShieldSpawnedAt = useRef(0);
  const callout = useRef<string | null>(null);
  const calloutId = useRef(0);
  const matchStartLockedRef = useRef(false);
  const [matchStartLocked, setMatchStartLocked] = useState(false);

  const updateMatchStartLocked = (isLocked: boolean) => {
    if (matchStartLockedRef.current === isLocked) {
      return;
    }

    matchStartLockedRef.current = isLocked;
    setMatchStartLocked(isLocked);
  };

  useEffect(() => {
    playerPosition.current = startPosition;
    obstacles.current = [];
    setRenderObstacles([]);
    elapsed.current = 0;
    spawnTimer.current = 0;
    spawnIndex.current = 0;
    dodged.current = 0;
    lastStatsSecond.current = -1;
    lastLocalSnapshotAt.current = 0;
    gameOverSent.current = false;
    impactTimer.current = 0;
    freezeTimer.current = 0;
    bestComboMultiplier.current = 1;
    bestComboStreak.current = 0;
    calloutTone.current = "neutral";
    bonusScore.current = 0;
    closeCalls.current = 0;
    combo.current = createInitialCombo();
    shieldActive.current = false;
    shieldSaves.current = 0;
    shieldPickup.current = null;
    setRenderShieldPickup(null);
    setRenderShieldBurst(null);
    lastShieldSpawnedAt.current = 0;
    callout.current = null;
    calloutId.current = 0;
    matchStartLockedRef.current = false;
    setMatchStartLocked(false);
    if (playerRef.current) {
      playerRef.current.position.set(startPosition.x, startPosition.y, startPosition.z);
      playerRef.current.rotation.set(0, 0, 0);
      playerRef.current.scale.set(1, 1, 1);
    }
  }, [runId]);

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05);
    const player = playerRef.current;

    if (!player) {
      return;
    }

    state.camera.position.set(cameraBasePosition.x, cameraBasePosition.y, cameraBasePosition.z);
    if (impactTimer.current > 0) {
      const secondsSinceImpact =
        GAME_TUNING.visuals.cameraShakeSeconds - impactTimer.current;
      const shake = getCameraShake(secondsSinceImpact);
      state.camera.position.x += Math.sin(state.clock.elapsedTime * 82) * shake;
      state.camera.position.y += Math.cos(state.clock.elapsedTime * 71) * shake;
      impactTimer.current = Math.max(0, impactTimer.current - dt);
    }
    state.camera.lookAt(0, 0, 0);

    if (freezeTimer.current > 0) {
      freezeTimer.current = Math.max(0, freezeTimer.current - dt);
      state.camera.lookAt(0, 0, 0);
      return;
    }

    if (phase !== "playing") {
      updateMatchStartLocked(false);
      player.rotation.x = 0;
      player.rotation.z = 0;
      player.scale.set(1, 1, 1);
      player.rotation.y += dt * 0.45;
      return;
    }

    const gameplayLocked = isMultiplayerGameplayLocked(multiplayerMatch);
    updateMatchStartLocked(gameplayLocked);
    if (gameplayLocked) {
      player.rotation.x = 0;
      player.rotation.z = 0;
      player.scale.set(1, 1, 1);
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
    player.rotation.set(0, 0, 0);
    player.scale.set(1, 1, 1);

    const activePickup = shieldPickup.current;
    if (activePickup && elapsed.current >= activePickup.expiresAtSeconds) {
      shieldPickup.current = null;
      setRenderShieldPickup(null);
    }

    if (renderShieldBurst && elapsed.current >= renderShieldBurst.expiresAtSeconds) {
      setRenderShieldBurst(null);
    }

    if (shieldPickup.current && isShieldCollected(playerPosition.current, shieldPickup.current)) {
      shieldActive.current = true;
      callout.current = "SHIELD!";
      calloutId.current += 1;
      calloutTone.current = "shield";
      shieldPickup.current = null;
      setRenderShieldPickup(null);
      const comboAlive =
        combo.current.streak > 0 && elapsed.current <= combo.current.expiresAtSeconds;
      onStatsChange({
        score: getScore(elapsed.current, dodged.current, bonusScore.current),
        highScore: 0,
        dodged: dodged.current,
        elapsedSeconds: elapsed.current,
        closeCalls: closeCalls.current,
        comboMultiplier: comboAlive ? combo.current.multiplier : 1,
        bestComboMultiplier: bestComboMultiplier.current,
        bestComboStreak: bestComboStreak.current,
        shieldActive: shieldActive.current,
        shieldSaves: shieldSaves.current,
        callout: callout.current,
        calloutId: calloutId.current,
        calloutTone: calloutTone.current,
        runSummary: getRunSummary({
          closeCalls: closeCalls.current,
          bestComboMultiplier: bestComboMultiplier.current,
          bestComboStreak: bestComboStreak.current,
          shieldSaves: shieldSaves.current,
          dodged: dodged.current,
        }),
      });
    }

    if (
      shouldSpawnShield(
        elapsed.current,
        lastShieldSpawnedAt.current,
        shieldActive.current,
        shieldPickup.current
      )
    ) {
      const position = getShieldPickupPosition(state.clock.elapsedTime + runId);
      const pickup: ShieldPickupData = {
        id: `shield-${runId}-${Math.round(elapsed.current * 1000)}`,
        x: position.x,
        z: position.z,
        expiresAtSeconds: elapsed.current + GAME_TUNING.fun.shieldPickupExpiresSeconds,
      };
      shieldPickup.current = pickup;
      setRenderShieldPickup(pickup);
      lastShieldSpawnedAt.current = elapsed.current;
    }

    spawnTimer.current -= dt;
    let renderListChanged = false;

    if (spawnTimer.current <= 0) {
      const obstacleSeed =
        multiplayerMatch?.enabled === true && multiplayerMatch.matchSeed !== null
          ? multiplayerMatch.matchSeed
          : runId + 1;
      obstacles.current.push(createSeededObstacle(obstacleSeed, spawnIndex.current, difficulty));
      spawnIndex.current += 1;
      spawnTimer.current = difficulty.spawnInterval;
      renderListChanged = true;
    }

    let avoided = 0;
    const activeObstacles: Obstacle[] = [];
    for (const obstacle of obstacles.current) {
      obstacle.y -= difficulty.fallSpeed * dt;
      obstacle.rotation += obstacle.spin * dt;

      if (isInCloseCallWindow(obstacle.y)) {
        const horizontalDistance = Math.hypot(
          playerPosition.current.x - obstacle.x,
          playerPosition.current.z - obstacle.z
        );
        obstacle.closestSafeDistance = Math.min(
          obstacle.closestSafeDistance ?? Number.POSITIVE_INFINITY,
          horizontalDistance
        );
      }

      if (obstacle.y > -1.2) {
        activeObstacles.push(obstacle);
      } else {
        avoided += 1;
        const tier = getCloseCallTier(obstacle.closestSafeDistance ?? Number.POSITIVE_INFINITY);
        if (tier) {
          combo.current = getNextCombo(combo.current, elapsed.current);
          bestComboMultiplier.current = Math.max(
            bestComboMultiplier.current,
            combo.current.multiplier
          );
          bestComboStreak.current = Math.max(bestComboStreak.current, combo.current.streak);
          const bonus = getCloseCallBonus(tier, combo.current.multiplier);
          bonusScore.current += bonus;
          closeCalls.current += 1;
          callout.current =
            combo.current.multiplier > 1
              ? `${tier.toUpperCase()} x${combo.current.multiplier}`
              : tier.toUpperCase();
          calloutId.current += 1;
          calloutTone.current = getCalloutTone(tier, combo.current.multiplier, false);
        }
      }
    }
    const nextObstacles = activeObstacles.slice(
      -Math.min(difficulty.maxObstacles, maxRenderedObstacles)
    );
    if (nextObstacles.length !== obstacles.current.length) {
      renderListChanged = true;
    }
    obstacles.current = nextObstacles;

    if (avoided > 0) {
      dodged.current += avoided;
    }

    if (renderListChanged) {
      setRenderObstacles([...obstacles.current]);
    }

    const hit = obstacles.current.some((obstacle) =>
      isCollision(
        playerPosition.current,
        { x: obstacle.x, y: obstacle.y, z: obstacle.z },
        PLAYER_RADIUS,
        obstacle.radius
      )
    );

    const comboAlive =
      combo.current.streak > 0 && elapsed.current <= combo.current.expiresAtSeconds;
    const visibleComboMultiplier = comboAlive ? combo.current.multiplier : 1;

    const nextStats: GameStats = {
      score: getScore(elapsed.current, dodged.current, bonusScore.current),
      highScore: 0,
      dodged: dodged.current,
      elapsedSeconds: elapsed.current,
      closeCalls: closeCalls.current,
      comboMultiplier: visibleComboMultiplier,
      bestComboMultiplier: bestComboMultiplier.current,
      bestComboStreak: bestComboStreak.current,
      shieldActive: shieldActive.current,
      shieldSaves: shieldSaves.current,
      callout: callout.current,
      calloutId: calloutId.current,
      calloutTone: calloutTone.current,
      runSummary: getRunSummary({
        closeCalls: closeCalls.current,
        bestComboMultiplier: bestComboMultiplier.current,
        bestComboStreak: bestComboStreak.current,
        shieldSaves: shieldSaves.current,
        dodged: dodged.current,
      }),
    };

    if (hit && !gameOverSent.current) {
      impactTimer.current = GAME_TUNING.visuals.cameraShakeSeconds;

      if (shieldActive.current) {
        shieldActive.current = false;
        shieldSaves.current += 1;
        callout.current = "SHIELD SAVE!";
        calloutId.current += 1;
        calloutTone.current = "shield";
        const burst: ShieldBurstData = {
          id: calloutId.current,
          x: playerPosition.current.x,
          z: playerPosition.current.z,
          startedAtSeconds: elapsed.current,
          expiresAtSeconds: elapsed.current + GAME_TUNING.feel.shieldSaveBurstSeconds,
        };
        freezeTimer.current = GAME_TUNING.feel.shieldSaveFreezeSeconds;
        setRenderShieldBurst(burst);
        obstacles.current = obstacles.current.filter(
          (obstacle) =>
            !isInsideShieldSaveClearRadius(playerPosition.current, {
              x: obstacle.x,
              z: obstacle.z,
            })
        );
        setRenderObstacles([...obstacles.current]);
        onStatsChange({
          ...nextStats,
          shieldActive: shieldActive.current,
          shieldSaves: shieldSaves.current,
          callout: callout.current,
          calloutId: calloutId.current,
          calloutTone: calloutTone.current,
          runSummary: getRunSummary({
            closeCalls: closeCalls.current,
            bestComboMultiplier: bestComboMultiplier.current,
            bestComboStreak: bestComboStreak.current,
            shieldSaves: shieldSaves.current,
            dodged: dodged.current,
          }),
        });
        return;
      }

      gameOverSent.current = true;
      if (multiplayerMatch?.enabled === true) {
        onMultiplayerEliminated?.(nextStats);
      }
      onGameOver(nextStats);
      return;
    }

    if (multiplayerMatch?.enabled === true && onLocalSnapshot) {
      const now = Date.now();
      if (now - lastLocalSnapshotAt.current >= 100) {
        lastLocalSnapshotAt.current = now;
        onLocalSnapshot({ ...playerPosition.current }, nextStats);
      }
    }

    const currentSecond = Math.floor(elapsed.current * 4);
    if (currentSecond !== lastStatsSecond.current || avoided > 0) {
      lastStatsSecond.current = currentSecond;
      onStatsChange(nextStats);
    }
  });

  return (
    <>
      <ambientLight intensity={1.8} color="#fff7ed" />
      <directionalLight intensity={2.2} color="#ffffff" position={[4, 8, 5]} />
      <directionalLight intensity={0.7} color="#bfdbfe" position={[-4, 5, -3]} />

      <PaperArena bounds={ARENA_BOUNDS} />

      <DoodlePlayer
        ref={playerRef}
        input={input}
        phase={matchStartLocked ? "ready" : phase}
      />

      {multiplayerMatch?.enabled === true &&
        multiplayerMatch.remotePlayers.map((player) => (
          <RemoteDoodlePlayer
            key={player.id}
            color={player.color}
            position={player.position}
            eliminated={player.state !== "alive"}
          />
        ))}

      {renderShieldPickup && (
        <ShieldPickup
          pickup={renderShieldPickup}
          playerPositionRef={playerPosition}
        />
      )}

      {renderShieldBurst && (
        <ShieldBurst
          burst={renderShieldBurst}
          elapsedSecondsRef={elapsed}
        />
      )}

      {renderObstacles.map((obstacle) => (
        <DoodleHazard
          key={obstacle.id}
          obstacle={obstacle}
        />
      ))}

      {phase === "playing" && !matchStartLocked &&
        renderObstacles.map((obstacle) => (
          <DangerRing
            key={`${obstacle.id}-warning`}
            obstacle={obstacle}
          />
        ))}
    </>
  );
}

function isMultiplayerGameplayLocked(multiplayerMatch?: MultiplayerMatchConfig): boolean {
  if (multiplayerMatch?.enabled !== true) {
    return false;
  }

  if (multiplayerMatch.matchStartedAt === null) {
    return true;
  }

  return Date.now() + multiplayerMatch.serverNowOffsetMs < multiplayerMatch.matchStartedAt;
}
