import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { GameStats } from "../game/types";
import type { MultiplayerPlayer, MultiplayerRoom } from "../multiplayer/types";
import type { UseMultiplayerRoomResult } from "../multiplayer/useMultiplayerRoom";
import { GameOverlay } from "./GameOverlay";

const noop = () => undefined;

const stats: GameStats = {
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
  activeWave: null,
  feverActive: false,
  dramaTimeScale: 1,
  runHighlight: {
    title: "First page",
    detail: "Try another run.",
    tone: "neutral",
  },
  runSummary: {
    title: "Blank page",
    detail: "Start a run.",
  },
};

function createPlayer(
  id: string,
  nickname: string,
  state: MultiplayerPlayer["state"]
): MultiplayerPlayer {
  return {
    id,
    nickname,
    color: "#38bdf8",
    joinedAt: 1_000,
    state,
    position: { x: 0, y: 0.34, z: 0 },
    score: 10,
    elapsedSeconds: 5,
    closeCalls: 1,
    shieldSaves: 0,
  };
}

function createRoom(
  status: MultiplayerRoom["status"],
  players = [
    createPlayer("host", "Host", "alive"),
    createPlayer("guest", "Guest", "alive"),
  ]
): MultiplayerRoom {
  return {
    roomCode: "4821",
    hostId: "host",
    players,
    status,
    seed: 7,
    countdownStartedAt: status === "countdown" ? 500 : null,
    matchStartedAt: 1_000,
    roundId: 1,
    winnerId: null,
    createdAt: 1_000,
    updatedAt: 2_000,
  };
}

function createMultiplayer(room: MultiplayerRoom): UseMultiplayerRoomResult {
  return {
    state: {
      view: room.status,
      nickname: "Ada",
      room,
      connected: true,
      connecting: false,
      error: null,
      survivorListOpen: false,
    },
    room,
    localPlayerId: "host",
    remotePlayers: [],
    serverNowOffsetMs: 0,
    connect: vi.fn(),
    setNickname: vi.fn(),
    createRoom: vi.fn(),
    joinRoom: vi.fn(),
    leaveRoom: vi.fn(),
    startRoom: vi.fn(),
    sendPosition: vi.fn(),
    sendStats: vi.fn(),
    sendEliminated: vi.fn(),
    reset: vi.fn(),
  };
}

describe("GameOverlay", () => {
  it("shows survivor list when multiplayer room is playing while app phase stays ready", () => {
    const html = renderToStaticMarkup(
      <GameOverlay
        mode="multiplayer"
        phase="ready"
        stats={stats}
        touchActive={false}
        multiplayer={createMultiplayer(createRoom("playing"))}
        survivorListCollapsed={false}
        onToggleSurvivorList={() => undefined}
        onStartSingle={() => undefined}
        onSelectMultiplayer={() => undefined}
        onBackToSingle={noop}
        onLeaveMultiplayerRoom={noop}
      />
    );

    expect(html).toContain("survivor-list");
    expect(html).toContain("Round in progress");
    expect(html).toContain("Host");
    expect(html).toContain("Guest");
  });

  it("passes collapsed survivor list state through to markup", () => {
    const html = renderToStaticMarkup(
      <GameOverlay
        mode="multiplayer"
        phase="ready"
        stats={stats}
        touchActive={false}
        multiplayer={createMultiplayer(createRoom("playing"))}
        survivorListCollapsed
        onToggleSurvivorList={() => undefined}
        onStartSingle={() => undefined}
        onSelectMultiplayer={() => undefined}
        onBackToSingle={noop}
        onLeaveMultiplayerRoom={noop}
      />
    );

    expect(html).toContain("survivor-list is-collapsed");
  });

  it("shows survivor list and waiting panel for countdown late joiners", () => {
    const html = renderToStaticMarkup(
      <GameOverlay
        mode="multiplayer"
        phase="ready"
        stats={stats}
        touchActive={false}
        multiplayer={createMultiplayer(
          createRoom("countdown", [
            createPlayer("host", "Host", "waitingNextRound"),
            createPlayer("guest", "Guest", "countdown"),
          ])
        )}
        survivorListCollapsed={false}
        onToggleSurvivorList={() => undefined}
        onStartSingle={() => undefined}
        onSelectMultiplayer={() => undefined}
        onBackToSingle={noop}
        onLeaveMultiplayerRoom={noop}
      />
    );

    expect(html).toContain("survivor-list");
    expect(html).toContain("Waiting for next round");
    expect(html).toContain("Leave room");
    expect(html).not.toContain("Get ready");
    expect(html).not.toContain('role="timer"');
  });

  it("shows multiplayer results instead of single-player game over for room results", () => {
    const html = renderToStaticMarkup(
      <GameOverlay
        mode="multiplayer"
        phase="game-over"
        stats={stats}
        touchActive={false}
        multiplayer={createMultiplayer(createRoom("results"))}
        survivorListCollapsed={false}
        onToggleSurvivorList={() => undefined}
        onStartSingle={() => undefined}
        onSelectMultiplayer={() => undefined}
        onBackToSingle={noop}
        onLeaveMultiplayerRoom={noop}
      />
    );

    expect(html).toContain("multiplayer-panel");
    expect(html).toContain("Match results");
    expect(html).not.toContain("Final score");
    expect(html).not.toContain("Game Over");
  });

  it("shows wave and fever feedback while playing", () => {
    const html = renderToStaticMarkup(
      <GameOverlay
        mode="single"
        phase="playing"
        stats={{
          ...stats,
          activeWave: {
            id: "messyRain",
            title: "Messy Rain",
            detail: "More drops for a few seconds.",
            tone: "messy",
            endsAtSeconds: 18,
          },
          comboMultiplier: 3,
          feverActive: true,
        }}
        touchActive={false}
        multiplayer={createMultiplayer(createRoom("lobby"))}
        survivorListCollapsed={false}
        onToggleSurvivorList={() => undefined}
        onStartSingle={() => undefined}
        onSelectMultiplayer={() => undefined}
        onBackToSingle={noop}
        onLeaveMultiplayerRoom={noop}
      />
    );

    expect(html).toContain("Messy Rain");
    expect(html).toContain("More drops for a few seconds.");
    expect(html).toContain("FEVER x3");
  });

  it("shows the memorable run highlight on single-player game over", () => {
    const html = renderToStaticMarkup(
      <GameOverlay
        mode="single"
        phase="game-over"
        stats={{
          ...stats,
          score: 840,
          runHighlight: {
            title: "Fever run",
            detail: "Held a x4 close-call chain.",
            tone: "fever",
          },
        }}
        touchActive={false}
        multiplayer={createMultiplayer(createRoom("lobby"))}
        survivorListCollapsed={false}
        onToggleSurvivorList={() => undefined}
        onStartSingle={() => undefined}
        onSelectMultiplayer={() => undefined}
        onBackToSingle={noop}
        onLeaveMultiplayerRoom={noop}
      />
    );

    expect(html).toContain("Run highlight");
    expect(html).toContain("Fever run");
    expect(html).toContain("Held a x4 close-call chain.");
  });
});
