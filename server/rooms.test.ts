import { describe, expect, it, vi } from "vitest";
import {
  createRoom,
  createRoomStore,
  cleanupIdleRooms,
  eliminatePlayer,
  getRoomBySocket,
  joinRoom,
  leaveRoom,
  PLAYER_COLORS,
  ROOM_IDLE_TTL_MS,
  startCountdown,
  startMatchIfReady,
  updatePlayerPosition,
  updatePlayerStats,
  type RoomStoreResult,
} from "./rooms";
import { COUNTDOWN_SECONDS, MAX_ROOM_PLAYERS } from "../src/multiplayer/types";
import type { MultiplayerPlayer, MultiplayerRoom } from "../src/multiplayer/types";

function expectOk(result: RoomStoreResult): {
  room: MultiplayerRoom;
  player: MultiplayerPlayer;
} {
  expect(result.ok).toBe(true);
  if (!result.ok) {
    throw new Error(result.error.message);
  }

  return result;
}

function expectError(result: RoomStoreResult, code: string): void {
  expect(result.ok).toBe(false);
  if (result.ok) {
    throw new Error(`Expected ${code}, got ok result`);
  }
  expect(result.error.code).toBe(code);
}

function createHost(now = 1_000) {
  const store = createRoomStore();
  const created = expectOk(
    createRoom(store, "socket-host", { nickname: "Host Player" }, now)
  );

  return { store, room: created.room, host: created.player };
}

function joinPlayer(
  store: ReturnType<typeof createRoomStore>,
  roomCode: string,
  socketId: string,
  nickname: string,
  now: number
) {
  return expectOk(joinRoom(store, socketId, { roomCode, nickname }, now));
}

function startPlayingRoom(now = 1_000) {
  const created = createHost(now);
  const second = joinPlayer(
    created.store,
    created.room.roomCode,
    "socket-second",
    "Second",
    now + 1
  );

  expectOk(
    startCountdown(
      created.store,
      created.room.roomCode,
      created.host.id,
      now + 2,
      42
    )
  );
  const matchAt = now + 2 + COUNTDOWN_SECONDS * 1_000;
  const room = startMatchIfReady(created.store, created.room.roomCode, matchAt);

  expect(room?.status).toBe("playing");

  return { ...created, second: second.player, matchAt };
}

describe("server room store", () => {
  it("creates a room with a 4-digit code and host player", () => {
    vi.spyOn(Math, "random").mockReturnValueOnce(0.1234);
    const store = createRoomStore();

    const result = expectOk(
      createRoom(store, "socket-host", { nickname: "  Long Host Nickname  " }, 100)
    );

    expect(result.room.roomCode).toBe("1234");
    expect(result.room.hostId).toBe(result.player.id);
    expect(result.player.id).toBe("socket-host");
    expect(result.player.nickname).toBe("Long Host Ni");
    expect(result.player.state).toBe("lobby");
    expect(result.player.position).toEqual({ x: 0, y: 0.34, z: 0 });
    expect(store.rooms.get("1234")).toBe(result.room);
    expect(store.socketToRoom.get("socket-host")).toBe("1234");
  });

  it("rejects empty nickname", () => {
    const store = createRoomStore();

    expectError(
      createRoom(store, "socket-host", { nickname: "     " }, 100),
      "invalid_nickname"
    );
    expect(store.rooms.size).toBe(0);
    expect(store.socketToRoom.size).toBe(0);
  });

  it("rejects creating a room when the socket is already mapped without mutating the current room", () => {
    vi.spyOn(Math, "random").mockReturnValueOnce(0.1111);
    const { store, room, host } = createHost();
    const previousPlayers = [...room.players];

    const result = createRoom(
      store,
      host.id,
      { nickname: "Duplicate Host" },
      1_100
    );

    expectError(result, "server_error");
    expect(store.rooms.get(room.roomCode)).toBe(room);
    expect(room.players).toEqual(previousPlayers);
    expect(store.socketToRoom.get(host.id)).toBe(room.roomCode);
    expect(store.rooms.size).toBe(1);
  });

  it("rejects invalid room code", () => {
    const store = createRoomStore();

    expectError(
      joinRoom(store, "socket-joiner", { roomCode: "12a4", nickname: "Joiner" }, 100),
      "invalid_room_code"
    );
  });

  it("rejects joining a room when the socket is already mapped without mutating either room", () => {
    vi.spyOn(Math, "random")
      .mockReturnValueOnce(0.1111)
      .mockReturnValueOnce(0.2222);
    const store = createRoomStore();
    const first = expectOk(
      createRoom(store, "socket-first", { nickname: "First" }, 1_000)
    );
    const second = expectOk(
      createRoom(store, "socket-second", { nickname: "Second" }, 1_001)
    );
    const firstPlayers = [...first.room.players];
    const secondPlayers = [...second.room.players];

    const result = joinRoom(
      store,
      first.player.id,
      { roomCode: second.room.roomCode, nickname: "Moved" },
      1_100
    );

    expectError(result, "server_error");
    expect(first.room.players).toEqual(firstPlayers);
    expect(second.room.players).toEqual(secondPlayers);
    expect(store.socketToRoom.get(first.player.id)).toBe(first.room.roomCode);
    expect(store.socketToRoom.get(second.player.id)).toBe(second.room.roomCode);
  });

  it("allows players to join lobby until 10 players", () => {
    const { store, room } = createHost();

    for (let index = 2; index <= MAX_ROOM_PLAYERS; index += 1) {
      const joined = joinPlayer(
        store,
        room.roomCode,
        `socket-${index}`,
        `Player ${index}`,
        1_000 + index
      );

      expect(joined.player.state).toBe("lobby");
    }

    expect(store.rooms.get(room.roomCode)?.players).toHaveLength(MAX_ROOM_PLAYERS);
  });

  it("assigns the first unused color after lobby players leave", () => {
    const { store, room, host } = createHost();
    const second = joinPlayer(
      store,
      room.roomCode,
      "socket-second",
      "Second",
      1_001
    );

    expect(host.color).toBe(PLAYER_COLORS[0]);
    expect(second.player.color).toBe(PLAYER_COLORS[1]);

    leaveRoom(store, host.id, 1_100);
    const third = joinPlayer(
      store,
      room.roomCode,
      "socket-third",
      "Third",
      1_200
    );

    expect(third.player.color).toBe(PLAYER_COLORS[0]);
    expect(third.player.color).not.toBe(second.player.color);
  });

  it("rejects the 11th player with room_full", () => {
    const { store, room } = createHost();

    for (let index = 2; index <= MAX_ROOM_PLAYERS; index += 1) {
      joinPlayer(store, room.roomCode, `socket-${index}`, `Player ${index}`, 1_000 + index);
    }

    expectError(
      joinRoom(store, "socket-11", { roomCode: room.roomCode, nickname: "Player 11" }, 2_000),
      "room_full"
    );
  });

  it("assigns waitingNextRound for countdown joins", () => {
    const { store, room, host } = createHost();

    expectOk(startCountdown(store, room.roomCode, host.id, 1_100, 42));
    const joined = joinPlayer(
      store,
      room.roomCode,
      "socket-late",
      "Late",
      1_200
    );

    expect(joined.player.state).toBe("waitingNextRound");
  });

  it("assigns waitingNextRound for playing joins", () => {
    const { store, room, matchAt } = startPlayingRoom();

    const joined = joinPlayer(
      store,
      room.roomCode,
      "socket-late",
      "Late",
      matchAt + 1
    );

    expect(joined.player.state).toBe("waitingNextRound");
  });

  it("keeps countdown room restartable when host leaves before match start and a late player is connected", () => {
    const { store, room, host } = createHost();

    expectOk(startCountdown(store, room.roomCode, host.id, 1_100, 42));
    const late = joinPlayer(
      store,
      room.roomCode,
      "socket-late",
      "Late",
      1_200
    );

    leaveRoom(store, host.id, 1_300);
    const currentRoom = store.rooms.get(room.roomCode);

    expect(currentRoom?.status).toBe("lobby");
    expect(currentRoom?.seed).toBeNull();
    expect(currentRoom?.countdownStartedAt).toBeNull();
    expect(currentRoom?.matchStartedAt).toBeNull();
    expect(currentRoom?.winnerId).toBeNull();
    expect(currentRoom?.hostId).toBe(late.player.id);
    expect(currentRoom?.players).toEqual([
      expect.objectContaining({ id: late.player.id, state: "lobby" }),
    ]);
    expect(store.socketToRoom.has(host.id)).toBe(false);

    startMatchIfReady(store, room.roomCode, 1_100 + COUNTDOWN_SECONDS * 1_000);

    expect(store.rooms.get(room.roomCode)?.status).toBe("lobby");
    expect(store.rooms.get(room.roomCode)?.players[0]?.state).toBe("lobby");
  });

  it("transfers host to earliest remaining player on host leave", () => {
    const { store, room, host } = createHost();
    const second = joinPlayer(store, room.roomCode, "socket-second", "Second", 1_001);
    joinPlayer(store, room.roomCode, "socket-third", "Third", 1_002);

    leaveRoom(store, host.id, 1_100);

    expect(store.rooms.get(room.roomCode)?.hostId).toBe(second.player.id);
    expect(store.socketToRoom.has(host.id)).toBe(false);
  });

  it("deletes room when the last player leaves", () => {
    const { store, room, host } = createHost();

    leaveRoom(store, host.id, 1_100);

    expect(store.rooms.has(room.roomCode)).toBe(false);
    expect(store.socketToRoom.has(host.id)).toBe(false);
  });

  it("marks playing disconnect as eliminated", () => {
    const { store, room, host, second, matchAt } = startPlayingRoom();

    leaveRoom(store, host.id, matchAt + 1);

    const currentRoom = store.rooms.get(room.roomCode);
    expect(currentRoom?.players.find((player) => player.id === host.id)?.state).toBe(
      "eliminated"
    );
    expect(currentRoom?.hostId).toBe(second.id);
    expect(currentRoom?.status).toBe("results");
    expect(currentRoom?.winnerId).toBe(second.id);
    expect(store.socketToRoom.has(host.id)).toBe(false);
  });

  it("deletes one-player room when only playing socket disconnects", () => {
    const { store, room, host } = createHost();

    expectOk(startCountdown(store, room.roomCode, host.id, 1_100, 42));
    startMatchIfReady(store, room.roomCode, 1_100 + COUNTDOWN_SECONDS * 1_000);

    leaveRoom(store, host.id, 4_200);

    expect(store.rooms.has(room.roomCode)).toBe(false);
    expect(store.socketToRoom.has(host.id)).toBe(false);
  });

  it("does not restore eliminated disconnected players as host when results players join", () => {
    const { store, room, host, second, matchAt } = startPlayingRoom();

    leaveRoom(store, host.id, matchAt + 1);
    const joined = joinPlayer(
      store,
      room.roomCode,
      "socket-third",
      "Third",
      matchAt + 2
    );

    const currentRoom = store.rooms.get(room.roomCode);
    expect(joined.player.state).toBe("waitingNextRound");
    expect(currentRoom?.status).toBe("results");
    expect(currentRoom?.hostId).toBe(second.id);
    expect(store.socketToRoom.has(host.id)).toBe(false);
  });

  it("counts connected players rather than retained eliminated rows for room capacity", () => {
    const { store, room, host, matchAt } = startPlayingRoom();

    leaveRoom(store, host.id, matchAt + 1);

    for (let index = 3; index <= MAX_ROOM_PLAYERS + 1; index += 1) {
      const joined = joinPlayer(
        store,
        room.roomCode,
        `socket-${index}`,
        `Player ${index}`,
        matchAt + index
      );

      expect(joined.player.state).toBe("waitingNextRound");
    }

    expectError(
      joinRoom(
        store,
        "socket-overflow",
        { roomCode: room.roomCode, nickname: "Overflow" },
        matchAt + 100
      ),
      "room_full"
    );
    expect(store.rooms.get(room.roomCode)?.players).toHaveLength(
      MAX_ROOM_PLAYERS + 1
    );
  });

  it("starts countdown only for host", () => {
    const { store, room, host } = createHost();
    const second = joinPlayer(store, room.roomCode, "socket-second", "Second", 1_001);

    expectError(
      startCountdown(store, room.roomCode, second.player.id, 1_100, 42),
      "not_host"
    );

    const started = expectOk(startCountdown(store, room.roomCode, host.id, 1_200, 99));
    expect(started.room.status).toBe("countdown");
    expect(started.room.seed).toBe(99);
    expect(started.room.countdownStartedAt).toBe(1_200);
    expect(started.room.matchStartedAt).toBe(1_200 + COUNTDOWN_SECONDS * 1_000);
    expect(started.room.roundId).toBe(1);
    expect(started.room.winnerId).toBeNull();
  });

  it("moves countdown players to alive at match start time", () => {
    const { store, room, host } = createHost();
    joinPlayer(store, room.roomCode, "socket-second", "Second", 1_001);

    expectOk(startCountdown(store, room.roomCode, host.id, 1_100, 42));
    const currentRoom = store.rooms.get(room.roomCode);
    expect(currentRoom?.players.map((player) => player.state)).toEqual([
      "countdown",
      "countdown",
    ]);

    const started = startMatchIfReady(
      store,
      room.roomCode,
      1_100 + COUNTDOWN_SECONDS * 1_000
    );

    expect(started?.status).toBe("playing");
    expect(started?.players.map((player) => player.state)).toEqual(["alive", "alive"]);
  });

  it("prunes disconnected eliminated rows and moves connected players into the next countdown", () => {
    const { store, room, host, second, matchAt } = startPlayingRoom();

    leaveRoom(store, host.id, matchAt + 1);
    const late = joinPlayer(
      store,
      room.roomCode,
      "socket-late",
      "Late",
      matchAt + 2
    );

    const started = expectOk(
      startCountdown(store, room.roomCode, second.id, matchAt + 100, 99)
    );

    expect(started.room.status).toBe("countdown");
    expect(started.room.players.map((player) => player.id)).toEqual([
      second.id,
      late.player.id,
    ]);
    expect(started.room.players.map((player) => player.state)).toEqual([
      "countdown",
      "countdown",
    ]);
    expect(started.room.hostId).toBe(second.id);
    expect(started.room.seed).toBe(99);
    expect(started.room.roundId).toBe(2);
  });

  it("does not mutate results room when connected non-host tries to start next countdown", () => {
    const { store, room, host, second, matchAt } = startPlayingRoom();

    leaveRoom(store, host.id, matchAt + 1);
    const late = joinPlayer(
      store,
      room.roomCode,
      "socket-late",
      "Late",
      matchAt + 2
    );
    const beforePlayers = [...room.players];
    const beforeUpdatedAt = room.updatedAt;

    expectError(
      startCountdown(store, room.roomCode, late.player.id, matchAt + 100, 99),
      "not_host"
    );

    expect(room.status).toBe("results");
    expect(room.hostId).toBe(second.id);
    expect(room.players).toEqual(beforePlayers);
    expect(room.players.map((player) => player.id)).toContain(host.id);
    expect(room.updatedAt).toBe(beforeUpdatedAt);
  });

  it("prunes disconnected eliminated rows after connected host is authorized for next countdown", () => {
    const { store, room, host, second, matchAt } = startPlayingRoom();

    leaveRoom(store, host.id, matchAt + 1);
    const late = joinPlayer(
      store,
      room.roomCode,
      "socket-late",
      "Late",
      matchAt + 2
    );

    const started = expectOk(
      startCountdown(store, room.roomCode, second.id, matchAt + 100, 99)
    );

    expect(started.room.status).toBe("countdown");
    expect(started.room.players.map((player) => player.id)).toEqual([
      second.id,
      late.player.id,
    ]);
    expect(started.room.players.map((player) => player.state)).toEqual([
      "countdown",
      "countdown",
    ]);
    expect(started.room.updatedAt).toBe(matchAt + 100);
  });

  it("assigns an unused color after retained rows are pruned for a next countdown", () => {
    const { store, room, host, second, matchAt } = startPlayingRoom();

    leaveRoom(store, host.id, matchAt + 1);
    const late = joinPlayer(
      store,
      room.roomCode,
      "socket-late",
      "Late",
      matchAt + 2
    );
    expectOk(startCountdown(store, room.roomCode, second.id, matchAt + 100, 99));

    const nextWaiter = joinPlayer(
      store,
      room.roomCode,
      "socket-next",
      "Next",
      matchAt + 101
    );

    expect(second.color).toBe(PLAYER_COLORS[1]);
    expect(late.player.color).toBe(PLAYER_COLORS[2]);
    expect(nextWaiter.player.color).toBe(PLAYER_COLORS[0]);
    expect(new Set(room.players.map((player) => player.color)).size).toBe(
      room.players.length
    );
  });

  it("gets rooms by socket mapping", () => {
    const { store, room, host } = createHost();

    expect(getRoomBySocket(store, host.id)).toBe(room);
    expect(getRoomBySocket(store, "missing-socket")).toBeNull();
  });

  it("updates player position only for matching room payloads and touches updatedAt", () => {
    const { store, room, host } = createHost();

    expect(
      updatePlayerPosition(
        store,
        host.id,
        { roomCode: "9999", position: { x: 9, y: 9, z: 9 } },
        1_100
      )
    ).toBeNull();
    expect(host.position).toEqual({ x: 0, y: 0.34, z: 0 });
    expect(room.updatedAt).toBe(1_000);

    const updated = updatePlayerPosition(
      store,
      host.id,
      { roomCode: room.roomCode, position: { x: 1, y: 0.5, z: -2 } },
      1_200
    );

    expect(updated).toBe(room);
    expect(host.position).toEqual({ x: 1, y: 0.5, z: -2 });
    expect(room.updatedAt).toBe(1_200);
  });

  it("updates player stats only for matching room payloads and touches updatedAt", () => {
    const { store, room, host } = createHost();

    expect(
      updatePlayerStats(
        store,
        host.id,
        {
          roomCode: "9999",
          score: 99,
          elapsedSeconds: 9,
          closeCalls: 9,
          shieldSaves: 9,
        },
        1_100
      )
    ).toBeNull();
    expect(host).toMatchObject({
      score: 0,
      elapsedSeconds: 0,
      closeCalls: 0,
      shieldSaves: 0,
    });
    expect(room.updatedAt).toBe(1_000);

    const updated = updatePlayerStats(
      store,
      host.id,
      {
        roomCode: room.roomCode,
        score: 12,
        elapsedSeconds: 3.5,
        closeCalls: 2,
        shieldSaves: 1,
      },
      1_200
    );

    expect(updated).toBe(room);
    expect(host).toMatchObject({
      score: 12,
      elapsedSeconds: 3.5,
      closeCalls: 2,
      shieldSaves: 1,
    });
    expect(room.updatedAt).toBe(1_200);
  });

  it("announces winner when one alive player remains", () => {
    const { store, room, host, second, matchAt } = startPlayingRoom();

    eliminatePlayer(
      store,
      host.id,
      {
        roomCode: room.roomCode,
        score: 12,
        elapsedSeconds: 4.5,
        closeCalls: 2,
        shieldSaves: 1,
      },
      matchAt + 100
    );

    const currentRoom = store.rooms.get(room.roomCode);
    const eliminated = currentRoom?.players.find((player) => player.id === host.id);
    expect(currentRoom?.status).toBe("results");
    expect(currentRoom?.winnerId).toBe(second.id);
    expect(eliminated).toMatchObject({
      state: "eliminated",
      score: 12,
      elapsedSeconds: 4.5,
      closeCalls: 2,
      shieldSaves: 1,
    });
  });

  it("announces no winner when every alive player is eliminated", () => {
    const { store, room, host } = createHost();
    expectOk(startCountdown(store, room.roomCode, host.id, 1_100, 42));
    startMatchIfReady(store, room.roomCode, 1_100 + COUNTDOWN_SECONDS * 1_000);

    eliminatePlayer(
      store,
      host.id,
      {
        roomCode: room.roomCode,
        score: 7,
        elapsedSeconds: 3,
        closeCalls: 1,
        shieldSaves: 0,
      },
      4_200
    );

    const currentRoom = store.rooms.get(room.roomCode);
    expect(currentRoom?.status).toBe("results");
    expect(currentRoom?.winnerId).toBeNull();
  });

  it("cleans idle rooms", () => {
    vi.spyOn(Math, "random")
      .mockReturnValueOnce(0.1111)
      .mockReturnValueOnce(0.2222);
    const store = createRoomStore();
    const oldRoom = expectOk(
      createRoom(store, "socket-old", { nickname: "Old" }, 1_000)
    ).room;
    const activeRoom = expectOk(
      createRoom(store, "socket-active", { nickname: "Active" }, 2_000)
    ).room;

    cleanupIdleRooms(store, 1_000 + ROOM_IDLE_TTL_MS + 1);

    expect(store.rooms.has(oldRoom.roomCode)).toBe(false);
    expect(store.rooms.has(activeRoom.roomCode)).toBe(true);
    expect(store.socketToRoom.has("socket-old")).toBe(false);
    expect(store.socketToRoom.get("socket-active")).toBe(activeRoom.roomCode);
  });
});
