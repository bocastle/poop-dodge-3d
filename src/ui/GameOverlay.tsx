import type { GamePhase, GameStats } from "../game/types";
import type { UseMultiplayerRoomResult } from "../multiplayer/useMultiplayerRoom";
import { MultiplayerPanel } from "./MultiplayerPanel";
import { SurvivorList } from "./SurvivorList";

export type AppMode = "single" | "multiplayer";

type GameOverlayProps = {
  mode: AppMode;
  phase: GamePhase;
  stats: GameStats;
  touchActive: boolean;
  multiplayer: UseMultiplayerRoomResult;
  survivorListCollapsed: boolean;
  onToggleSurvivorList: () => void;
  onStartSingle: () => void;
  onSelectMultiplayer: () => void;
  onBackToSingle: () => void;
  onLeaveMultiplayerRoom: () => void;
};

export function GameOverlay({
  mode,
  phase,
  stats,
  touchActive,
  multiplayer,
  survivorListCollapsed,
  onToggleSurvivorList,
  onStartSingle,
  onSelectMultiplayer,
  onBackToSingle,
  onLeaveMultiplayerRoom,
}: GameOverlayProps) {
  const localPlayer = multiplayer.room?.players.find(
    (player) => player.id === multiplayer.localPlayerId
  );
  const localPlayerWaitingNextRound = localPlayer?.state === "waitingNextRound";
  const showMultiplayerPanel =
    mode === "multiplayer" &&
    (phase !== "playing" || multiplayer.room?.status === "results");
  const showSurvivorList =
    multiplayer.room !== null &&
    (phase === "playing" ||
      (mode === "multiplayer" &&
        (multiplayer.room.status === "playing" ||
          (multiplayer.room.status === "countdown" && localPlayerWaitingNextRound))));

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

      {phase === "playing" && (
        <div className="status-strip">
          <span
            className={stats.comboMultiplier > 1 ? "status-chip is-hot" : "status-chip"}
            key={`combo-${stats.closeCalls}-${stats.comboMultiplier}`}
          >
            Combo x{stats.comboMultiplier}
          </span>
          <span
            className={stats.shieldActive ? "status-chip is-shielded" : "status-chip"}
            key={`shield-${stats.shieldActive}-${stats.shieldSaves}`}
          >
            {stats.shieldActive ? "Shield ready" : "No shield"}
          </span>
          <span className="status-chip" key={`close-calls-${stats.closeCalls}`}>
            {stats.closeCalls.toLocaleString()} close calls
          </span>
        </div>
      )}

      {showSurvivorList && multiplayer.room !== null && (
        <SurvivorList
          room={multiplayer.room}
          localPlayerId={multiplayer.localPlayerId}
          collapsed={survivorListCollapsed}
          onToggle={onToggleSurvivorList}
        />
      )}

      <div className="hud-panel-region">
        {phase === "playing" && stats.callout && (
          <div
            className={`doodle-callout is-${stats.calloutTone}`}
            key={stats.calloutId}
            role="status"
            aria-live="polite"
          >
            {stats.callout}
          </div>
        )}
        {showMultiplayerPanel && (
          <MultiplayerPanel
            multiplayer={multiplayer}
            localPlayerId={multiplayer.localPlayerId}
            onBackToSingle={onBackToSingle}
            onLeaveRoom={onLeaveMultiplayerRoom}
          />
        )}
        {phase !== "playing" && !showMultiplayerPanel && (
          <div className="panel" data-panel={phase}>
            <div className="panel-status" role="status" aria-atomic="true">
              <p className="eyebrow">{phase === "ready" ? "paper panic arcade" : "page ruined"}</p>
              <h1>{phase === "ready" ? "Poop Dodge 3D" : "Game Over"}</h1>
              {phase === "game-over" && (
                <>
                  <div className="final-score">
                    <span>Final score</span>
                    <strong>{stats.score.toLocaleString()}</strong>
                  </div>
                  <div className="run-recap" aria-label="Run recap">
                    <div>
                      <span>Close calls</span>
                      <strong>{stats.closeCalls.toLocaleString()}</strong>
                    </div>
                    <div>
                      <span>Best combo</span>
                      <strong>x{stats.bestComboMultiplier}</strong>
                    </div>
                    <div>
                      <span>Shield saves</span>
                      <strong>{stats.shieldSaves}</strong>
                    </div>
                  </div>
                  <p className="run-summary">
                    <strong>{stats.runSummary.title}</strong>
                    <span>{stats.runSummary.detail}</span>
                  </p>
                </>
              )}
              <p className="summary">
                {phase === "ready"
                  ? "Little runner. Big drops. Blank page."
                  : `${stats.dodged.toLocaleString()} drops missed you in ${Math.floor(
                      stats.elapsedSeconds
                    )} seconds.`}
              </p>
            </div>
            {phase === "ready" ? (
              <div className="mode-actions">
                <button
                  className="primary-action paper-action"
                  type="button"
                  onClick={onStartSingle}
                >
                  Single
                </button>
                <button className="paper-action" type="button" onClick={onSelectMultiplayer}>
                  Multiplayer
                </button>
              </div>
            ) : (
              <button className="primary-action paper-action" type="button" onClick={onStartSingle}>
                Retry
              </button>
            )}
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
