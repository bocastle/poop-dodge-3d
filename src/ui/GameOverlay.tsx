import type { GamePhase, GameStats } from "../game/types";

type GameOverlayProps = {
  phase: GamePhase;
  stats: GameStats;
  touchActive: boolean;
  onStart: () => void;
};

export function GameOverlay({ phase, stats, touchActive, onStart }: GameOverlayProps) {
  return (
    <section className="hud">
      <header className="scorebar" aria-live="off">
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

      <div className="hud-panel-region">
        {phase !== "playing" && (
          <div className="panel" data-panel={phase}>
            <div className="panel-status" role="status" aria-atomic="true">
              <p className="eyebrow">{phase === "ready" ? "3D dodge arcade" : "run ended"}</p>
              <h1>{phase === "ready" ? "Poop Dodge 3D" : "Game Over"}</h1>
              {phase === "game-over" && (
                <div className="final-score">
                  <span>Final score</span>
                  <strong>{stats.score.toLocaleString()}</strong>
                </div>
              )}
              <p className="summary">
                {phase === "ready"
                  ? "Dash through the danger zone, read the shadows, and survive the drop."
                  : `You dodged ${stats.dodged.toLocaleString()} drops in ${Math.floor(
                      stats.elapsedSeconds
                    )} seconds.`}
              </p>
            </div>
            <button type="button" onClick={onStart}>
              {phase === "ready" ? "Start" : "Restart"}
            </button>
          </div>
        )}
      </div>

      <footer className="controls">
        <span>WASD / Arrow keys</span>
        <span>{touchActive ? "Touch active" : "Drag on mobile"}</span>
      </footer>
    </section>
  );
}
