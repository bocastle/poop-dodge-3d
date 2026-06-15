import { describe, expect, it } from "vitest";
import {
  initialMultiplayerClientState,
  multiplayerRoomReducer,
} from "./roomReducer";
import type { MultiplayerRoom, RoomStatus } from "./types";

function createRoom(status: RoomStatus): MultiplayerRoom {
  return {
    roomCode: "1234",
    hostId: "host-1",
    players: [],
    status,
    seed: status === "lobby" ? null : 42,
    countdownStartedAt: status === "countdown" ? 1_000 : null,
    matchStartedAt: status === "playing" ? 4_000 : null,
    roundId: 1,
    winnerId: status === "results" ? "player-1" : null,
    createdAt: 100,
    updatedAt: 200,
  };
}

describe("multiplayer room reducer", () => {
  it("connect failure stores a visible error", () => {
    const connectingState = multiplayerRoomReducer(initialMultiplayerClientState, {
      type: "connectStart",
    });
    const error = {
      code: "server_error" as const,
      message: "Multiplayer is unavailable.",
    };

    const nextState = multiplayerRoomReducer(connectingState, {
      type: "connectFailed",
      error,
    });

    expect(nextState.error).toEqual(error);
    expect(nextState.connecting).toBe(false);
    expect(nextState.connected).toBe(false);
    expect(nextState.room).toBeNull();
  });

  it("connect failure from a room view returns to create or join", () => {
    const playingState = multiplayerRoomReducer(initialMultiplayerClientState, {
      type: "roomState",
      room: createRoom("playing"),
    });

    const nextState = multiplayerRoomReducer(playingState, {
      type: "connectFailed",
      error: {
        code: "server_error",
        message: "Connection dropped.",
      },
    });

    expect(nextState.room).toBeNull();
    expect(nextState.view).toBe("createOrJoin");
  });

  it("room lobby selects lobby view", () => {
    const room = createRoom("lobby");

    const nextState = multiplayerRoomReducer(initialMultiplayerClientState, {
      type: "roomState",
      room,
    });

    expect(nextState.view).toBe("lobby");
    expect(nextState.room).toBe(room);
  });

  it("room countdown selects countdown view", () => {
    const nextState = multiplayerRoomReducer(initialMultiplayerClientState, {
      type: "roomState",
      room: createRoom("countdown"),
    });

    expect(nextState.view).toBe("countdown");
  });

  it("room playing selects playing view", () => {
    const nextState = multiplayerRoomReducer(initialMultiplayerClientState, {
      type: "roomState",
      room: createRoom("playing"),
    });

    expect(nextState.view).toBe("playing");
  });

  it("room results selects results view", () => {
    const nextState = multiplayerRoomReducer(initialMultiplayerClientState, {
      type: "roomState",
      room: createRoom("results"),
    });

    expect(nextState.view).toBe("results");
  });

  it("survivor list toggle is independent from room state", () => {
    const room = createRoom("playing");
    const playingState = multiplayerRoomReducer(initialMultiplayerClientState, {
      type: "roomState",
      room,
    });

    const nextState = multiplayerRoomReducer(playingState, {
      type: "toggleSurvivorList",
    });

    expect(nextState).toEqual({
      ...playingState,
      survivorListOpen: true,
    });
  });

  it("reset returns to entry state", () => {
    const playingState = multiplayerRoomReducer(initialMultiplayerClientState, {
      type: "roomState",
      room: createRoom("playing"),
    });
    const toggledState = multiplayerRoomReducer(playingState, {
      type: "toggleSurvivorList",
    });

    expect(multiplayerRoomReducer(toggledState, { type: "reset" })).toEqual(
      initialMultiplayerClientState
    );
  });
});
