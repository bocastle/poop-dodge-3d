import { Canvas } from "@react-three/fiber";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { GameScene } from "../game/GameScene";
import { useKeyboardControls } from "../game/input/useKeyboardControls";
import { useTouchControls } from "../game/input/useTouchControls";
import { GameOverlay } from "../ui/GameOverlay";
import { readHighScore, writeHighScore } from "../game/storage/highScore";
import { useMultiplayerRoom } from "../multiplayer/useMultiplayerRoom";
import type {
  GamePhase,
  GameStats,
  MultiplayerMatchConfig,
  Position,
  RemotePlayerSnapshot,
} from "../game/types";
import type { MultiplayerPlayer } from "../multiplayer/types";
import type { AppMode } from "../ui/GameOverlay";
import {
  getRoomClearedTransition,
  getMultiplayerRoomTransition,
  shouldWriteSinglePlayerHighScore,
  type LastStartedMultiplayerRound,
} from "./multiplayerRoomTransition";
import {
  shouldCollapseSurvivorListForViewport,
  survivorListMobileQuery,
} from "./survivorListViewport";

const initialStats: GameStats = {
  score: 0,
  highScore: 0,
  dodged: 0,
  elapsedSeconds: 0,
  closeCalls: 0,
  comboMultiplier: 1,
  bestComboMultiplier: 1,
  bestComboStreak: 0,
  shieldActive: false,
  shieldSaves: 0,
  callout: null,
  calloutId: 0,
  calloutTone: "neutral",
  runSummary: {
    title: "Blank page",
    detail: "Start a run.",
  },
};

function getInitialSurvivorListOpen(): boolean {
  if (typeof window === "undefined") {
    return true;
  }

  if (typeof window.innerWidth === "number") {
    return !shouldCollapseSurvivorListForViewport(window.innerWidth);
  }

  if (typeof window.matchMedia === "function") {
    return !window.matchMedia(survivorListMobileQuery).matches;
  }

  return true;
}

export function App() {
  const multiplayer = useMultiplayerRoom();
  const {
    leaveRoom,
    reset,
    sendEliminated,
    sendPosition,
    sendStats,
  } = multiplayer;
  const [mode, setMode] = useState<AppMode>("single");
  const [phase, setPhase] = useState<GamePhase>("ready");
  const [runId, setRunId] = useState(0);
  const [stats, setStats] = useState<GameStats>(initialStats);
  const [survivorListOpen, setSurvivorListOpen] = useState(getInitialSurvivorListOpen);
  const lastStartedRound = useRef<LastStartedMultiplayerRound | null>(null);
  const returnToSingleAfterLeave = useRef(false);
  const keyboardInput = useKeyboardControls(phase === "playing");
  const touchControls = useTouchControls(phase === "playing");

  useEffect(() => {
    setStats((current) => ({
      ...current,
      highScore: readHighScore(),
    }));
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return;
    }

    const mediaQuery = window.matchMedia(survivorListMobileQuery);
    const syncSurvivorListToViewport = (matches: boolean): void => {
      setSurvivorListOpen(!matches);
    };
    const handleChange = (event: MediaQueryListEvent): void => {
      syncSurvivorListToViewport(event.matches);
    };

    syncSurvivorListToViewport(mediaQuery.matches);
    mediaQuery.addEventListener("change", handleChange);

    return () => {
      mediaQuery.removeEventListener("change", handleChange);
    };
  }, []);

  const input = useMemo(
    () => ({
      x: keyboardInput.x + touchControls.input.x,
      z: keyboardInput.z + touchControls.input.z,
    }),
    [keyboardInput.x, keyboardInput.z, touchControls.input.x, touchControls.input.z]
  );

  const startGame = useCallback(() => {
    setMode("single");
    lastStartedRound.current = null;
    returnToSingleAfterLeave.current = false;
    setStats((current) => ({
      ...initialStats,
      highScore: Math.max(current.highScore, readHighScore()),
    }));
    setRunId((current) => current + 1);
    setPhase("playing");
  }, []);

  const selectMultiplayer = useCallback(() => {
    setMode("multiplayer");
    setPhase("ready");
  }, []);

  const backToSingle = useCallback(() => {
    reset();
    lastStartedRound.current = null;
    returnToSingleAfterLeave.current = false;
    setMode("single");
    setStats((current) => ({
      ...initialStats,
      highScore: Math.max(current.highScore, readHighScore()),
    }));
    setPhase("ready");
  }, [reset]);

  const leaveMultiplayerRoom = useCallback(() => {
    returnToSingleAfterLeave.current = true;
    leaveRoom();
  }, [leaveRoom]);

  const toggleSurvivorList = useCallback(() => {
    setSurvivorListOpen((current) => !current);
  }, []);

  const handleStatsChange = useCallback((nextStats: GameStats) => {
    setStats((current) => ({
      ...nextStats,
      highScore: current.highScore,
    }));
  }, []);

  const handleLocalSnapshot = useCallback(
    (position: Position, nextStats: GameStats) => {
      sendPosition(position);
      sendStats(nextStats);
    },
    [sendPosition, sendStats]
  );

  const handleMultiplayerEliminated = useCallback(
    (finalStats: GameStats) => {
      sendEliminated(finalStats);
    },
    [sendEliminated]
  );

  const handleGameOver = useCallback(
    (finalStats: GameStats) => {
      if (!shouldWriteSinglePlayerHighScore(mode)) {
        setStats((current) => ({
          ...finalStats,
          highScore: current.highScore,
        }));
        setPhase("game-over");
        return;
      }

      setStats((current) => {
        const highScore = Math.max(current.highScore, readHighScore(), finalStats.score);
        writeHighScore(highScore);
        return { ...finalStats, highScore };
      });
      setPhase("game-over");
    },
    [mode]
  );

  useEffect(() => {
    const room = multiplayer.room;

    if (room === null) {
      lastStartedRound.current = null;
      if (returnToSingleAfterLeave.current) {
        returnToSingleAfterLeave.current = false;
        setMode("single");
        setStats((current) => ({
          ...initialStats,
          highScore: Math.max(current.highScore, readHighScore()),
        }));
        setPhase("ready");
        return;
      }
      const transition = getRoomClearedTransition(mode, phase);
      setPhase(transition.phase);
      return;
    }

    setMode("multiplayer");

    const transition = getMultiplayerRoomTransition(
      room,
      multiplayer.localPlayerId,
      lastStartedRound.current,
      phase
    );

    if (transition.shouldStartRound) {
      lastStartedRound.current = {
        roomCode: room.roomCode,
        roundId: room.roundId,
      };
      setStats((current) => ({
        ...initialStats,
        highScore: Math.max(current.highScore, readHighScore()),
      }));
      setRunId((current) => current + 1);
    }

    setPhase(transition.phase);
  }, [mode, multiplayer.localPlayerId, multiplayer.room, phase]);

  const multiplayerMatch = useMemo<MultiplayerMatchConfig>(
    () => ({
      enabled: mode === "multiplayer" && multiplayer.room !== null,
      matchSeed: multiplayer.room?.seed ?? null,
      matchStartedAt: multiplayer.room?.matchStartedAt ?? null,
      serverNowOffsetMs: multiplayer.serverNowOffsetMs,
      localPlayerId: multiplayer.localPlayerId,
      remotePlayers: multiplayer.remotePlayers.map(toRemotePlayerSnapshot),
    }),
    [
      mode,
      multiplayer.localPlayerId,
      multiplayer.remotePlayers,
      multiplayer.room,
      multiplayer.serverNowOffsetMs,
    ]
  );

  return (
    <main className="game-shell" data-phase={phase} {...touchControls.handlers}>
      <Canvas
        camera={{ position: [0, 8.5, 9], fov: 48 }}
        dpr={[1, 1.5]}
        gl={{
          antialias: true,
          alpha: false,
          powerPreference: "high-performance",
        }}
      >
        <color attach="background" args={["#fbfbf9"]} />
        <Suspense fallback={null}>
          <GameScene
            input={input}
            phase={phase}
            runId={runId}
            multiplayerMatch={multiplayerMatch}
            onLocalSnapshot={handleLocalSnapshot}
            onMultiplayerEliminated={handleMultiplayerEliminated}
            onGameOver={handleGameOver}
            onStatsChange={handleStatsChange}
          />
        </Suspense>
      </Canvas>
      <GameOverlay
        mode={mode}
        phase={phase}
        stats={stats}
        touchActive={touchControls.active}
        multiplayer={multiplayer}
        survivorListCollapsed={!survivorListOpen}
        onToggleSurvivorList={toggleSurvivorList}
        onStartSingle={startGame}
        onSelectMultiplayer={selectMultiplayer}
        onBackToSingle={backToSingle}
        onLeaveMultiplayerRoom={leaveMultiplayerRoom}
      />
    </main>
  );
}

function toRemotePlayerSnapshot(player: MultiplayerPlayer): RemotePlayerSnapshot {
  return {
    id: player.id,
    nickname: player.nickname,
    color: player.color,
    position: player.position,
    state: toRemotePlayerState(player.state),
  };
}

function toRemotePlayerState(
  state: MultiplayerPlayer["state"]
): RemotePlayerSnapshot["state"] {
  if (
    state === "alive" ||
    state === "eliminated" ||
    state === "waitingNextRound" ||
    state === "disconnected"
  ) {
    return state;
  }

  return "waitingNextRound";
}
