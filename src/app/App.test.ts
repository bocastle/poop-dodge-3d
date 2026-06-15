import { describe, expect, it } from "vitest";
import type { MultiplayerPlayer, MultiplayerRoom } from "../multiplayer/types";
import type { GamePhase } from "../game/types";
import { shouldCollapseSurvivorListForViewport } from "./survivorListViewport";
import {
  getMultiplayerRoomTransition,
  getRoomClearedTransition,
  shouldWriteSinglePlayerHighScore,
  type LastStartedMultiplayerRound,
} from "./multiplayerRoomTransition";

function createPlayer(
  id: string,
  state: MultiplayerPlayer["state"]
): MultiplayerPlayer {
  return {
    id,
    nickname: id,
    color: "#38bdf8",
    joinedAt: 1_000,
    state,
    position: { x: 0, y: 0.34, z: 0 },
    score: 0,
    elapsedSeconds: 0,
    closeCalls: 0,
    shieldSaves: 0,
  };
}

function createRoom(
  status: MultiplayerRoom["status"],
  localState: MultiplayerPlayer["state"],
  roundId = 4,
  roomCode = "4821"
): MultiplayerRoom {
  return {
    roomCode,
    hostId: "local",
    players: [
      createPlayer("local", localState),
      createPlayer("remote", status === "playing" ? "alive" : "lobby"),
    ],
    status,
    seed: status === "lobby" ? null : 77,
    countdownStartedAt: status === "countdown" ? 1_000 : null,
    matchStartedAt: status === "lobby" ? null : 4_000,
    roundId,
    winnerId: status === "results" ? "local" : null,
    createdAt: 1_000,
    updatedAt: 2_000,
  };
}

describe("App survivor list viewport helpers", () => {
  it("collapses survivor list at the mobile breakpoint", () => {
    expect(shouldCollapseSurvivorListForViewport(699)).toBe(true);
    expect(shouldCollapseSurvivorListForViewport(700)).toBe(true);
    expect(shouldCollapseSurvivorListForViewport(701)).toBe(false);
  });
});

describe("App multiplayer room transitions", () => {
  const startedRound = (
    roomCode: string,
    roundId: number
  ): LastStartedMultiplayerRound => ({ roomCode, roundId });

  it("starts active local players only once per server round", () => {
    expect(
      getMultiplayerRoomTransition(
        createRoom("playing", "alive", 2),
        "local",
        startedRound("4821", 1),
        "ready"
      )
    ).toEqual({ phase: "playing", shouldStartRound: true });

    expect(
      getMultiplayerRoomTransition(
        createRoom("playing", "alive", 2),
        "local",
        startedRound("4821", 2),
        "playing"
      )
    ).toEqual({ phase: "playing", shouldStartRound: false });
  });

  it("starts a same-numbered round when it belongs to a different room", () => {
    expect(
      getMultiplayerRoomTransition(
        createRoom("playing", "alive", 1, "9137"),
        "local",
        startedRound("4821", 1),
        "ready"
      )
    ).toEqual({ phase: "playing", shouldStartRound: true });
  });

  it("does not resume the same round after local multiplayer game over", () => {
    expect(
      getMultiplayerRoomTransition(
        createRoom("playing", "alive", 2),
        "local",
        startedRound("4821", 2),
        "game-over"
      )
    ).toEqual({ phase: "game-over", shouldStartRound: false });
  });

  it.each([
    ["lobby", "lobby", "ready"],
    ["countdown", "countdown", "ready"],
    ["playing", "waitingNextRound", "ready"],
    ["playing", "eliminated", "game-over"],
    ["results", "eliminated", "game-over"],
  ] satisfies Array<
    [MultiplayerRoom["status"], MultiplayerPlayer["state"], GamePhase]
  >)(
    "maps %s room with local %s player to %s",
    (status, localState, expectedPhase) => {
      expect(
        getMultiplayerRoomTransition(
          createRoom(status, localState),
          "local",
          startedRound("4821", 3),
          "playing"
        )
      ).toEqual({ phase: expectedPhase, shouldStartRound: false });
    }
  );

  it("stops active multiplayer gameplay when the room clears", () => {
    expect(getRoomClearedTransition("multiplayer", "playing")).toEqual({
      phase: "ready",
    });
    expect(getRoomClearedTransition("multiplayer", "game-over")).toEqual({
      phase: "ready",
    });
    expect(getRoomClearedTransition("single", "playing")).toEqual({
      phase: "playing",
    });
  });

  it("writes local high score only for single-player mode", () => {
    expect(shouldWriteSinglePlayerHighScore("single")).toBe(true);
    expect(shouldWriteSinglePlayerHighScore("multiplayer")).toBe(false);
  });
});
