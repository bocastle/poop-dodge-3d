import { Canvas } from "@react-three/fiber";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { GameScene } from "../game/GameScene";
import { useKeyboardControls } from "../game/input/useKeyboardControls";
import { useTouchControls } from "../game/input/useTouchControls";
import { GameOverlay } from "../ui/GameOverlay";
import { readHighScore, writeHighScore } from "../game/storage/highScore";
import type { GamePhase, GameStats } from "../game/types";

const initialStats: GameStats = {
  score: 0,
  highScore: 0,
  dodged: 0,
  elapsedSeconds: 0,
};

export function App() {
  const [phase, setPhase] = useState<GamePhase>("ready");
  const [runId, setRunId] = useState(0);
  const [stats, setStats] = useState<GameStats>(initialStats);
  const keyboardInput = useKeyboardControls(phase === "playing");
  const touchControls = useTouchControls(phase === "playing");

  useEffect(() => {
    setStats((current) => ({
      ...current,
      highScore: readHighScore(),
    }));
  }, []);

  const input = useMemo(
    () => ({
      x: keyboardInput.x + touchControls.input.x,
      z: keyboardInput.z + touchControls.input.z,
    }),
    [keyboardInput.x, keyboardInput.z, touchControls.input.x, touchControls.input.z]
  );

  const startGame = useCallback(() => {
    setStats((current) => ({
      ...initialStats,
      highScore: Math.max(current.highScore, readHighScore()),
    }));
    setRunId((current) => current + 1);
    setPhase("playing");
  }, []);

  const handleStatsChange = useCallback((nextStats: GameStats) => {
    setStats((current) => ({
      ...nextStats,
      highScore: current.highScore,
    }));
  }, []);

  const handleGameOver = useCallback((finalStats: GameStats) => {
    setStats((current) => {
      const highScore = Math.max(current.highScore, readHighScore(), finalStats.score);
      writeHighScore(highScore);
      return { ...finalStats, highScore };
    });
    setPhase("game-over");
  }, []);

  return (
    <main className="game-shell" {...touchControls.handlers}>
      <Canvas
        camera={{ position: [0, 8.5, 9], fov: 48 }}
        dpr={[1, 1.5]}
        gl={{
          antialias: true,
          alpha: false,
          powerPreference: "high-performance",
        }}
      >
        <color attach="background" args={["#101820"]} />
        <Suspense fallback={null}>
          <GameScene
            input={input}
            phase={phase}
            runId={runId}
            onGameOver={handleGameOver}
            onStatsChange={handleStatsChange}
          />
        </Suspense>
      </Canvas>
      <GameOverlay
        phase={phase}
        stats={stats}
        touchActive={touchControls.active}
        onStart={startGame}
      />
    </main>
  );
}
