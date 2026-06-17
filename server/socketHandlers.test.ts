import type { Server } from "socket.io";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createRoomStore, type RoomStore } from "./rooms";
import { registerSocketHandlers } from "./socketHandlers";
import {
  COUNTDOWN_SECONDS,
  type MultiplayerRoom,
  type RoomErrorPayload,
} from "../src/multiplayer/types";

type EventRecord = {
  event: string;
  payload: unknown;
};

type SocketHandler = (payload?: unknown) => void;

class FakeIo {
  emittedToRooms: Array<{ roomCode: string; event: string; payload: unknown }> = [];

  private connectionHandler: ((socket: FakeSocket) => void) | null = null;
  private readonly roomSockets = new Map<string, Set<FakeSocket>>();

  on(event: string, handler: (socket: FakeSocket) => void): this {
    if (event !== "connection") {
      throw new Error(`Unexpected io event: ${event}`);
    }

    this.connectionHandler = handler;
    return this;
  }

  to(roomCode: string): { emit: (event: string, payload: unknown) => void } {
    return {
      emit: (event: string, payload: unknown) => {
        this.emitToRoom(roomCode, event, payload);
      },
    };
  }

  connect(socketId: string): FakeSocket {
    if (this.connectionHandler === null) {
      throw new Error("No connection handler registered");
    }

    const socket = new FakeSocket(socketId, this);
    this.connectionHandler(socket);
    return socket;
  }

  joinRoom(socket: FakeSocket, roomCode: string): void {
    const sockets = this.roomSockets.get(roomCode) ?? new Set<FakeSocket>();
    sockets.add(socket);
    this.roomSockets.set(roomCode, sockets);
  }

  leaveRoom(socket: FakeSocket, roomCode: string): void {
    this.roomSockets.get(roomCode)?.delete(socket);
  }

  emitToRoom(
    roomCode: string,
    event: string,
    payload: unknown,
    excludedSocketId?: string
  ): void {
    this.emittedToRooms.push({ roomCode, event, payload });
    for (const socket of this.roomSockets.get(roomCode) ?? []) {
      if (socket.id !== excludedSocketId) {
        socket.emit(event, payload);
      }
    }
  }
}

class FakeSocket {
  readonly emitted: EventRecord[] = [];

  private readonly handlers = new Map<string, SocketHandler>();

  constructor(
    readonly id: string,
    private readonly io: FakeIo
  ) {}

  on(event: string, handler: SocketHandler): this {
    this.handlers.set(event, handler);
    return this;
  }

  emit(event: string, payload: unknown): boolean {
    this.emitted.push({ event, payload });
    return true;
  }

  join(roomCode: string): void {
    this.io.joinRoom(this, roomCode);
  }

  leave(roomCode: string): void {
    this.io.leaveRoom(this, roomCode);
  }

  to(roomCode: string): { emit: (event: string, payload: unknown) => void } {
    return {
      emit: (event: string, payload: unknown) => {
        this.io.emitToRoom(roomCode, event, payload, this.id);
      },
    };
  }

  trigger(event: string, payload?: unknown): void {
    const handler = this.handlers.get(event);
    if (handler === undefined) {
      throw new Error(`No socket handler registered for ${event}`);
    }

    handler(payload);
  }
}

function setupHandlers(): { io: FakeIo; store: RoomStore } {
  const io = new FakeIo();
  const store = createRoomStore();

  registerSocketHandlers(io as unknown as Server, store);

  return { io, store };
}

function emittedPayloads<T>(socket: FakeSocket, event: string): T[] {
  return socket.emitted
    .filter((record) => record.event === event)
    .map((record) => record.payload as T);
}

function lastEmittedPayload<T>(socket: FakeSocket, event: string): T {
  const payloads = emittedPayloads<T>(socket, event);
  const payload = payloads.at(-1);

  if (payload === undefined) {
    throw new Error(`No ${event} payload emitted`);
  }

  return payload;
}

function roomEvents<T>(io: FakeIo, roomCode: string, event: string): T[] {
  return io.emittedToRooms
    .filter((record) => record.roomCode === roomCode && record.event === event)
    .map((record) => record.payload as T);
}

function createJoinedRoom(): {
  io: FakeIo;
  store: RoomStore;
  host: FakeSocket;
  joiner: FakeSocket;
  room: MultiplayerRoom;
} {
  const { io, store } = setupHandlers();
  const host = io.connect("socket-host");
  const joiner = io.connect("socket-joiner");

  host.trigger("room:create", { nickname: "Host" });
  const room = lastEmittedPayload<MultiplayerRoom>(host, "room:created");
  joiner.trigger("room:join", { roomCode: room.roomCode, nickname: "Joiner" });

  return { io, store, host, joiner, room };
}

function validStatsPayload(roomCode: string) {
  return {
    roomCode,
    score: 1,
    elapsedSeconds: 2,
    closeCalls: 3,
    shieldSaves: 4,
  };
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-06-15T00:00:01.000Z"));
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("socket handlers", () => {
  it("leaves the current room before creating a new room with the same socket", () => {
    vi.spyOn(Math, "random")
      .mockReturnValueOnce(0.1111)
      .mockReturnValueOnce(0.2222);
    const { store, io } = setupHandlers();
    const socket = io.connect("socket-host");

    socket.trigger("room:create", { nickname: "First" });
    const firstRoom = lastEmittedPayload<MultiplayerRoom>(socket, "room:created");
    socket.trigger("room:create", { nickname: "Second" });

    const secondRoom = lastEmittedPayload<MultiplayerRoom>(socket, "room:created");
    expect(firstRoom.roomCode).toBe("1111");
    expect(secondRoom.roomCode).toBe("2222");
    expect(emittedPayloads(socket, "room:error")).toHaveLength(0);
    expect(store.rooms.has(firstRoom.roomCode)).toBe(false);
    expect(store.socketToRoom.get(socket.id)).toBe(secondRoom.roomCode);
  });

  it("leaves the current room and broadcasts the old state before joining another room", () => {
    vi.spyOn(Math, "random")
      .mockReturnValueOnce(0.1111)
      .mockReturnValueOnce(0.2222);
    const { io, store } = setupHandlers();
    const oldHost = io.connect("socket-old-host");
    const newHost = io.connect("socket-new-host");
    const mover = io.connect("socket-mover");

    oldHost.trigger("room:create", { nickname: "Old Host" });
    const oldRoom = lastEmittedPayload<MultiplayerRoom>(oldHost, "room:created");
    mover.trigger("room:join", { roomCode: oldRoom.roomCode, nickname: "Mover" });
    newHost.trigger("room:create", { nickname: "New Host" });
    const newRoom = lastEmittedPayload<MultiplayerRoom>(newHost, "room:created");

    mover.trigger("room:join", { roomCode: newRoom.roomCode, nickname: "Mover" });

    const joinedRoom = lastEmittedPayload<MultiplayerRoom>(mover, "room:joined");
    const oldRoomStates = roomEvents<MultiplayerRoom>(
      io,
      oldRoom.roomCode,
      "room:state"
    );
    expect(joinedRoom.roomCode).toBe(newRoom.roomCode);
    expect(emittedPayloads(mover, "room:error")).toHaveLength(0);
    expect(oldRoomStates.at(-1)?.players.map((player) => player.id)).toEqual([
      oldHost.id,
    ]);
    expect(store.socketToRoom.get(mover.id)).toBe(newRoom.roomCode);
  });

  it("rejects malformed room action payloads with room errors without throwing", () => {
    vi.spyOn(Math, "random").mockReturnValueOnce(0.1234);
    const { io } = setupHandlers();
    const socket = io.connect("socket-room-actions");

    expect(() => socket.trigger("room:create", null)).not.toThrow();
    expect(() =>
      socket.trigger("room:join", { roomCode: "1234" })
    ).not.toThrow();
    expect(() =>
      socket.trigger("room:start", { roomCode: 1234 })
    ).not.toThrow();

    expect(
      emittedPayloads<RoomErrorPayload>(socket, "room:error").map(
        (error) => error.code
      )
    ).toEqual(["server_error", "server_error", "server_error"]);
    expect(emittedPayloads(socket, "room:created")).toHaveLength(0);
    expect(emittedPayloads(socket, "room:joined")).toHaveLength(0);
  });

  it("rejects malformed player update payloads with room errors without throwing", () => {
    vi.spyOn(Math, "random").mockReturnValueOnce(0.2345);
    const { host, room } = createJoinedRoom();

    expect(() =>
      host.trigger("player:position", {
        roomCode: room.roomCode,
        position: { x: 1, y: Number.NaN, z: 2 },
      })
    ).not.toThrow();
    expect(() =>
      host.trigger("player:stats", {
        ...validStatsPayload(room.roomCode),
        score: Number.POSITIVE_INFINITY,
      })
    ).not.toThrow();
    expect(() =>
      host.trigger("player:eliminated", {
        ...validStatsPayload(room.roomCode),
        elapsedSeconds: "2",
      })
    ).not.toThrow();

    expect(
      emittedPayloads<RoomErrorPayload>(host, "room:error").map(
        (error) => error.code
      )
    ).toEqual(["server_error", "server_error", "server_error"]);
  });

  it("emits countdown and starts the match when the countdown timer reaches matchStartedAt", () => {
    vi.spyOn(Math, "random")
      .mockReturnValueOnce(0.3333)
      .mockReturnValueOnce(0.4444);
    const { io, host, room } = createJoinedRoom();

    host.trigger("room:start", { roomCode: room.roomCode });

    expect(roomEvents<MultiplayerRoom>(io, room.roomCode, "match:countdown")).toEqual([
      expect.objectContaining({ status: "countdown" }),
    ]);
    expect(roomEvents(io, room.roomCode, "match:start")).toHaveLength(0);

    vi.advanceTimersByTime(COUNTDOWN_SECONDS * 1_000);

    expect(roomEvents<MultiplayerRoom>(io, room.roomCode, "match:start")).toEqual([
      expect.objectContaining({ status: "playing" }),
    ]);
    expect(roomEvents<MultiplayerRoom>(io, room.roomCode, "room:state").at(-1)).toEqual(
      expect.objectContaining({ status: "playing" })
    );
  });

  it("starts the current room when room start has no payload", () => {
    vi.spyOn(Math, "random")
      .mockReturnValueOnce(0.3344)
      .mockReturnValueOnce(0.4455);
    const { io, host, room } = createJoinedRoom();
    io.emittedToRooms = [];

    host.trigger("room:start");

    expect(roomEvents<MultiplayerRoom>(io, room.roomCode, "match:countdown")).toEqual([
      expect.objectContaining({ roomCode: room.roomCode, status: "countdown" }),
    ]);
    expect(emittedPayloads(host, "room:error")).toHaveLength(0);
  });

  it("starts the current room when room start has an empty payload", () => {
    vi.spyOn(Math, "random")
      .mockReturnValueOnce(0.3355)
      .mockReturnValueOnce(0.4466);
    const { io, host, room } = createJoinedRoom();
    io.emittedToRooms = [];

    host.trigger("room:start", {});

    expect(roomEvents<MultiplayerRoom>(io, room.roomCode, "match:countdown")).toEqual([
      expect.objectContaining({ roomCode: room.roomCode, status: "countdown" }),
    ]);
    expect(emittedPayloads(host, "room:error")).toHaveLength(0);
  });

  it("rejects wrong-shaped room start payload without emitting countdown", () => {
    vi.spyOn(Math, "random").mockReturnValueOnce(0.3366);
    const { io, host, room } = createJoinedRoom();
    io.emittedToRooms = [];

    host.trigger("room:start", { roomCode: 1234 });

    expect(emittedPayloads<RoomErrorPayload>(host, "room:error")).toEqual([
      expect.objectContaining({ code: "server_error" }),
    ]);
    expect(roomEvents(io, room.roomCode, "match:countdown")).toHaveLength(0);
  });

  it("rejects non-host room start without emitting countdown", () => {
    vi.spyOn(Math, "random").mockReturnValueOnce(0.4567);
    const { io, joiner, room } = createJoinedRoom();
    io.emittedToRooms = [];

    joiner.trigger("room:start", { roomCode: room.roomCode });

    expect(emittedPayloads<RoomErrorPayload>(joiner, "room:error")).toEqual([
      expect.objectContaining({ code: "not_host" }),
    ]);
    expect(roomEvents(io, room.roomCode, "match:countdown")).toHaveLength(0);
  });

  it("does not emit match start after a countdown room is deleted before the timer fires", () => {
    vi.spyOn(Math, "random")
      .mockReturnValueOnce(0.5678)
      .mockReturnValueOnce(0.6789);
    const { io, store } = setupHandlers();
    const host = io.connect("socket-countdown-host");

    host.trigger("room:create", { nickname: "Host" });
    const room = lastEmittedPayload<MultiplayerRoom>(host, "room:created");
    host.trigger("room:start", { roomCode: room.roomCode });
    io.emittedToRooms = [];

    host.trigger("room:leave");
    vi.advanceTimersByTime(COUNTDOWN_SECONDS * 1_000);

    expect(store.rooms.has(room.roomCode)).toBe(false);
    expect(roomEvents(io, room.roomCode, "match:start")).toHaveLength(0);
  });

  it("broadcasts position updates only to other sockets in the room", () => {
    vi.spyOn(Math, "random").mockReturnValueOnce(0.5555);
    const { host, joiner, room } = createJoinedRoom();
    const position = { x: 1, y: 0.34, z: -2 };

    joiner.trigger("player:position", { roomCode: room.roomCode, position });

    expect(emittedPayloads(host, "player:position")).toEqual([
      { playerId: joiner.id, position },
    ]);
    expect(emittedPayloads(joiner, "player:position")).toHaveLength(0);
  });

  it("throttles room state emissions for player stats to five times per second", () => {
    vi.spyOn(Math, "random").mockReturnValueOnce(0.6666);
    const { io, joiner, room } = createJoinedRoom();
    io.emittedToRooms = [];

    joiner.trigger("player:stats", {
      roomCode: room.roomCode,
      score: 1,
      elapsedSeconds: 1,
      closeCalls: 0,
      shieldSaves: 0,
    });
    joiner.trigger("player:stats", {
      roomCode: room.roomCode,
      score: 2,
      elapsedSeconds: 2,
      closeCalls: 1,
      shieldSaves: 0,
    });

    expect(roomEvents(io, room.roomCode, "room:state")).toHaveLength(1);

    vi.advanceTimersByTime(199);
    expect(roomEvents(io, room.roomCode, "room:state")).toHaveLength(1);

    vi.advanceTimersByTime(1);
    const statePayloads = roomEvents<MultiplayerRoom>(
      io,
      room.roomCode,
      "room:state"
    );
    expect(statePayloads).toHaveLength(2);
    expect(
      statePayloads.at(-1)?.players.find((player) => player.id === joiner.id)?.score
    ).toBe(2);
  });

  it("does not emit a pending throttled stats state after the room is deleted", () => {
    vi.spyOn(Math, "random").mockReturnValueOnce(0.7654);
    const { io, store, host, joiner, room } = createJoinedRoom();
    io.emittedToRooms = [];

    joiner.trigger("player:stats", validStatsPayload(room.roomCode));
    joiner.trigger("player:stats", {
      ...validStatsPayload(room.roomCode),
      score: 2,
    });
    expect(roomEvents(io, room.roomCode, "room:state")).toHaveLength(1);

    host.trigger("room:leave");
    joiner.trigger("room:leave");
    io.emittedToRooms = [];
    vi.advanceTimersByTime(200);

    expect(store.rooms.has(room.roomCode)).toBe(false);
    expect(roomEvents(io, room.roomCode, "room:state")).toHaveLength(0);
  });

  it("emits match end and room state when elimination settles the room", () => {
    vi.spyOn(Math, "random")
      .mockReturnValueOnce(0.7777)
      .mockReturnValueOnce(0.8888);
    const { io, host, joiner, room } = createJoinedRoom();

    host.trigger("room:start", { roomCode: room.roomCode });
    vi.advanceTimersByTime(COUNTDOWN_SECONDS * 1_000);
    io.emittedToRooms = [];

    host.trigger("player:eliminated", {
      roomCode: room.roomCode,
      score: 10,
      elapsedSeconds: 12,
      closeCalls: 1,
      shieldSaves: 0,
    });

    expect(roomEvents<MultiplayerRoom>(io, room.roomCode, "match:end")).toEqual([
      expect.objectContaining({ status: "results", winnerId: joiner.id }),
    ]);
    expect(roomEvents<MultiplayerRoom>(io, room.roomCode, "room:state").at(-1)).toEqual(
      expect.objectContaining({ status: "results", winnerId: joiner.id })
    );
  });

  it("emits match end for a new room that reuses a deleted room code", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.1111);
    const { io, store } = setupHandlers();
    const firstHost = io.connect("socket-first-host");
    const firstJoiner = io.connect("socket-first-joiner");

    firstHost.trigger("room:create", { nickname: "First Host" });
    const firstRoom = lastEmittedPayload<MultiplayerRoom>(
      firstHost,
      "room:created"
    );
    firstJoiner.trigger("room:join", {
      roomCode: firstRoom.roomCode,
      nickname: "First Joiner",
    });
    firstHost.trigger("room:start", { roomCode: firstRoom.roomCode });
    vi.advanceTimersByTime(COUNTDOWN_SECONDS * 1_000);
    firstHost.trigger("player:eliminated", {
      roomCode: firstRoom.roomCode,
      score: 3,
      elapsedSeconds: 4,
      closeCalls: 0,
      shieldSaves: 0,
    });

    expect(roomEvents(io, firstRoom.roomCode, "match:end")).toHaveLength(1);

    firstHost.trigger("disconnect");
    firstJoiner.trigger("disconnect");

    expect(store.rooms.has(firstRoom.roomCode)).toBe(false);

    const secondHost = io.connect("socket-second-host");
    const secondJoiner = io.connect("socket-second-joiner");

    secondHost.trigger("room:create", { nickname: "Second Host" });
    const secondRoom = lastEmittedPayload<MultiplayerRoom>(
      secondHost,
      "room:created"
    );
    secondJoiner.trigger("room:join", {
      roomCode: secondRoom.roomCode,
      nickname: "Second Joiner",
    });
    secondHost.trigger("room:start", { roomCode: secondRoom.roomCode });
    vi.advanceTimersByTime(COUNTDOWN_SECONDS * 1_000);
    secondHost.trigger("player:eliminated", {
      roomCode: secondRoom.roomCode,
      score: 7,
      elapsedSeconds: 8,
      closeCalls: 1,
      shieldSaves: 0,
    });

    expect(secondRoom.roomCode).toBe(firstRoom.roomCode);
    expect(roomEvents(io, "1111", "match:end")).toHaveLength(2);
  });

  it("emits room left to the leaving socket after leaving the room", () => {
    vi.spyOn(Math, "random").mockReturnValueOnce(0.9999);
    const { host, room } = createJoinedRoom();

    host.trigger("room:leave");

    expect(emittedPayloads(host, "room:left")).toEqual([
      { roomCode: room.roomCode },
    ]);
  });
});
