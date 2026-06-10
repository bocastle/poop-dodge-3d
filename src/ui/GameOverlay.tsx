import type { GamePhase, GameStats } from "../game/types";

type GameOverlayProps = {
  phase: GamePhase;
  stats: GameStats;
  touchActive: boolean;
  onStart: () => void;
};

export function GameOverlay({ phase, stats, touchActive, onStart }: GameOverlayProps) {
  return (
    <section className="hud" aria-live="polite">
      <header className="scorebar">
        <div>
          <span className="label">Score</span>
          <strong>{stats.score.toLocaleString()}</strong>
        </div>
        <div>
          <span className="label">Best</span>
          <strong>{stats.highScore.toLocaleString()}</strong>
        </div>
        <div>
          <span className="label">Dodged</span>
          <strong>{stats.dodged}</strong>
        </div>
        <div>
          <span className="label">Time</span>
          <strong>{Math.floor(stats.elapsedSeconds)}s</strong>
        </div>
      </header>

      {phase !== "playing" && (
        <div className="panel">
          <p className="eyebrow">3D dodge arcade</p>
          <h1>{phase === "ready" ? "Poop Dodge 3D" : "Game Over"}</h1>
          <p className="summary">
            Move fast, read the falling pattern, and survive as long as possible.
          </p>
          <button type="button" onClick={onStart}>
            {phase === "ready" ? "Start" : "Restart"}
          </button>
        </div>
      )}

      <footer className="controls">
        <span>WASD / Arrow keys</span>
        <span>{touchActive ? "Touch active" : "Drag on mobile"}</span>
      </footer>
    </section>
  );
}
