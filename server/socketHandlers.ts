import type { Server, Socket } from "socket.io";
import {
  createRoom,
  getRoomBySocket,
  joinRoom,
  leaveRoom,
  startCountdown,
  startMatchIfReady,
  updatePlayerPosition,
  updatePlayerStats,
  eliminatePlayer,
  type RoomStore,
} from "./rooms";
import type {
  CreateRoomRequest,
  JoinRoomRequest,
  MultiplayerRoom,
  PlayerPositionPayload,
  PlayerStatsPayload,
  RoomErrorPayload,
} from "../src/multiplayer/types";

const STATS_ROOM_STATE_INTERVAL_MS = 200;

type StartRoomPayload = {
  roomCode?: string;
};

export function registerSocketHandlers(io: Server, store: RoomStore): void {
  const countdownTimers = new Map<string, ReturnType<typeof setTimeout>>();
  const statsTimers = new Map<string, ReturnType<typeof setTimeout>>();
  const lastStatsEmitAt = new Map<string, number>();
  const endedRounds = new Set<string>();

  io.on("connection", (socket) => {
    socket.on("room:create", (payload: unknown) => {
      if (!isCreateRoomRequest(payload)) {
        emitRoomError(socket, invalidPayloadError());
        return;
      }

      const now = Date.now();
      leaveCurrentRoom(socket, io, store, now, {
        countdownTimers,
        statsTimers,
        lastStatsEmitAt,
        endedRounds,
      });

      const result = createRoom(store, socket.id, payload, now);
      if (!result.ok) {
        emitRoomError(socket, result.error);
        return;
      }

      socket.join(result.room.roomCode);
      socket.emit("room:created", result.room);
      emitRoomState(io, result.room);
    });

    socket.on("room:join", (payload: unknown) => {
      if (!isJoinRoomRequest(payload)) {
        emitRoomError(socket, invalidPayloadError());
        return;
      }

      const now = Date.now();
      leaveCurrentRoom(socket, io, store, now, {
        countdownTimers,
        statsTimers,
        lastStatsEmitAt,
        endedRounds,
      });

      const result = joinRoom(store, socket.id, payload, now);
      if (!result.ok) {
        emitRoomError(socket, result.error);
        return;
      }

      socket.join(result.room.roomCode);
      socket.emit("room:joined", result.room);
      emitRoomState(io, result.room);
    });

    socket.on("room:leave", () => {
      const previousRoomCode = leaveCurrentRoom(socket, io, store, Date.now(), {
        countdownTimers,
        statsTimers,
        lastStatsEmitAt,
        endedRounds,
      });
      if (previousRoomCode !== null) {
        socket.emit("room:left", { roomCode: previousRoomCode });
      }
    });

    socket.on("room:start", (payload: unknown) => {
      if (!isStartRoomPayload(payload)) {
        emitRoomError(socket, invalidPayloadError());
        return;
      }

      const roomCode = getStartRoomCode(store, socket.id, payload);
      const now = Date.now();
      const result = startCountdown(
        store,
        roomCode,
        socket.id,
        now,
        createMatchSeed()
      );
      if (!result.ok) {
        emitRoomError(socket, result.error);
        return;
      }

      io.to(result.room.roomCode).emit("match:countdown", result.room);
      emitRoomState(io, result.room);
      scheduleMatchStart(io, store, result.room, countdownTimers);
    });

    socket.on("player:position", (payload: unknown) => {
      if (!isPlayerPositionPayload(payload)) {
        emitRoomError(socket, invalidPayloadError());
        return;
      }

      const room = updatePlayerPosition(store, socket.id, payload, Date.now());
      if (room === null) {
        return;
      }

      socket.to(room.roomCode).emit("player:position", {
        playerId: socket.id,
        position: payload.position,
      });
    });

    socket.on("player:stats", (payload: unknown) => {
      if (!isPlayerStatsPayload(payload)) {
        emitRoomError(socket, invalidPayloadError());
        return;
      }

      const room = updatePlayerStats(store, socket.id, payload, Date.now());
      if (room !== null) {
        emitThrottledRoomState(io, store, room, statsTimers, lastStatsEmitAt);
      }
    });

    socket.on("player:eliminated", (payload: unknown) => {
      if (!isPlayerStatsPayload(payload)) {
        emitRoomError(socket, invalidPayloadError());
        return;
      }

      const room = eliminatePlayer(store, socket.id, payload, Date.now());
      if (room !== null) {
        emitMatchEndIfNeeded(io, room, endedRounds);
        emitRoomState(io, room);
      }
    });

    socket.on("disconnect", () => {
      leaveCurrentRoom(socket, io, store, Date.now(), {
        countdownTimers,
        statsTimers,
        lastStatsEmitAt,
        endedRounds,
      });
    });
  });
}

function leaveCurrentRoom(
  socket: Socket,
  io: Server,
  store: RoomStore,
  now: number,
  timers: {
    countdownTimers: Map<string, ReturnType<typeof setTimeout>>;
    statsTimers: Map<string, ReturnType<typeof setTimeout>>;
    lastStatsEmitAt: Map<string, number>;
    endedRounds: Set<string>;
  }
): string | null {
  const previousRoomCode = store.socketToRoom.get(socket.id);
  if (previousRoomCode === undefined) {
    return null;
  }

  const room = leaveRoom(store, socket.id, now);
  socket.leave(previousRoomCode);
  if (room === null) {
    clearRoomTimers(
      previousRoomCode,
      timers.countdownTimers,
      timers.statsTimers,
      timers.lastStatsEmitAt,
      timers.endedRounds
    );
    return previousRoomCode;
  }

  if (room.status !== "countdown") {
    clearCountdownTimer(room.roomCode, timers.countdownTimers);
  }

  emitMatchEndIfNeeded(io, room, timers.endedRounds);
  emitRoomState(io, room);
  return previousRoomCode;
}

function scheduleMatchStart(
  io: Server,
  store: RoomStore,
  room: MultiplayerRoom,
  countdownTimers: Map<string, ReturnType<typeof setTimeout>>
): void {
  if (room.matchStartedAt === null) {
    return;
  }

  clearCountdownTimer(room.roomCode, countdownTimers);
  const delayMs = Math.max(0, room.matchStartedAt - Date.now());
  const timer = setTimeout(() => {
    countdownTimers.delete(room.roomCode);
    const startedRoom = startMatchIfReady(store, room.roomCode, Date.now());
    if (startedRoom?.status !== "playing") {
      return;
    }

    io.to(startedRoom.roomCode).emit("match:start", startedRoom);
    emitRoomState(io, startedRoom);
  }, delayMs);

  countdownTimers.set(room.roomCode, timer);
}

function emitThrottledRoomState(
  io: Server,
  store: RoomStore,
  room: MultiplayerRoom,
  statsTimers: Map<string, ReturnType<typeof setTimeout>>,
  lastStatsEmitAt: Map<string, number>
): void {
  const now = Date.now();
  const lastEmitAt = lastStatsEmitAt.get(room.roomCode) ?? 0;
  const elapsedMs = now - lastEmitAt;
  if (elapsedMs >= STATS_ROOM_STATE_INTERVAL_MS) {
    lastStatsEmitAt.set(room.roomCode, now);
    emitRoomState(io, room);
    return;
  }

  if (statsTimers.has(room.roomCode)) {
    return;
  }

  const timer = setTimeout(() => {
    statsTimers.delete(room.roomCode);
    const latestRoom = store.rooms.get(room.roomCode);
    if (latestRoom === undefined) {
      return;
    }

    lastStatsEmitAt.set(room.roomCode, Date.now());
    emitRoomState(io, latestRoom);
  }, STATS_ROOM_STATE_INTERVAL_MS - elapsedMs);

  statsTimers.set(room.roomCode, timer);
}

function emitRoomState(io: Server, room: MultiplayerRoom): void {
  io.to(room.roomCode).emit("room:state", room);
}

function emitMatchEndIfNeeded(
  io: Server,
  room: MultiplayerRoom,
  endedRounds: Set<string>
): void {
  if (room.status !== "results") {
    return;
  }

  const endedRoundKey = `${room.roomCode}:${room.roundId}`;
  if (endedRounds.has(endedRoundKey)) {
    return;
  }

  endedRounds.add(endedRoundKey);
  io.to(room.roomCode).emit("match:end", room);
}

function emitRoomError(socket: Socket, error: RoomErrorPayload): void {
  socket.emit("room:error", error);
}

function invalidPayloadError(): RoomErrorPayload {
  return {
    code: "server_error",
    message: "Invalid socket event payload.",
  };
}

function getStartRoomCode(
  store: RoomStore,
  socketId: string,
  payload: StartRoomPayload | undefined
): string {
  if (typeof payload?.roomCode === "string") {
    return payload.roomCode;
  }

  return getRoomBySocket(store, socketId)?.roomCode ?? "";
}

function createMatchSeed(): number {
  return Math.floor(Math.random() * Number.MAX_SAFE_INTEGER);
}

function isCreateRoomRequest(payload: unknown): payload is CreateRoomRequest {
  return isRecord(payload) && typeof payload.nickname === "string";
}

function isJoinRoomRequest(payload: unknown): payload is JoinRoomRequest {
  return (
    isRecord(payload) &&
    typeof payload.roomCode === "string" &&
    typeof payload.nickname === "string"
  );
}

function isStartRoomPayload(payload: unknown): payload is StartRoomPayload | undefined {
  return (
    payload === undefined ||
    (isRecord(payload) &&
      (payload.roomCode === undefined || typeof payload.roomCode === "string"))
  );
}

function isPlayerPositionPayload(
  payload: unknown
): payload is PlayerPositionPayload {
  return (
    isRecord(payload) &&
    typeof payload.roomCode === "string" &&
    isRecord(payload.position) &&
    isFiniteNumber(payload.position.x) &&
    isFiniteNumber(payload.position.y) &&
    isFiniteNumber(payload.position.z)
  );
}

function isPlayerStatsPayload(payload: unknown): payload is PlayerStatsPayload {
  return (
    isRecord(payload) &&
    typeof payload.roomCode === "string" &&
    isFiniteNumber(payload.score) &&
    isFiniteNumber(payload.elapsedSeconds) &&
    isFiniteNumber(payload.closeCalls) &&
    isFiniteNumber(payload.shieldSaves)
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function clearRoomTimers(
  roomCode: string,
  countdownTimers: Map<string, ReturnType<typeof setTimeout>>,
  statsTimers: Map<string, ReturnType<typeof setTimeout>>,
  lastStatsEmitAt: Map<string, number>,
  endedRounds: Set<string>
): void {
  clearCountdownTimer(roomCode, countdownTimers);
  lastStatsEmitAt.delete(roomCode);
  clearEndedRoundsForRoom(roomCode, endedRounds);
  const statsTimer = statsTimers.get(roomCode);
  if (statsTimer !== undefined) {
    clearTimeout(statsTimer);
    statsTimers.delete(roomCode);
  }
}

function clearEndedRoundsForRoom(roomCode: string, endedRounds: Set<string>): void {
  const roomRoundPrefix = `${roomCode}:`;
  for (const endedRound of endedRounds) {
    if (endedRound.startsWith(roomRoundPrefix)) {
      endedRounds.delete(endedRound);
    }
  }
}

function clearCountdownTimer(
  roomCode: string,
  countdownTimers: Map<string, ReturnType<typeof setTimeout>>
): void {
  const countdownTimer = countdownTimers.get(roomCode);
  if (countdownTimer !== undefined) {
    clearTimeout(countdownTimer);
    countdownTimers.delete(roomCode);
  }
}
