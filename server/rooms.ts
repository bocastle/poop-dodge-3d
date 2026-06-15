import {
  COUNTDOWN_SECONDS,
  MAX_ROOM_PLAYERS,
  type CreateRoomRequest,
  type JoinRoomRequest,
  type MultiplayerPlayer,
  type MultiplayerRoom,
  type PlayerEliminatedPayload,
  type PlayerPositionPayload,
  type PlayerStatsPayload,
  type RoomErrorPayload,
} from "../src/multiplayer/types";
import { createRoomCode, isValidRoomCode } from "../src/multiplayer/roomCode";

export type RoomStore = {
  rooms: Map<string, MultiplayerRoom>;
  socketToRoom: Map<string, string>;
};

export type RoomStoreResult =
  | { ok: true; room: MultiplayerRoom; player: MultiplayerPlayer }
  | { ok: false; error: RoomErrorPayload };

export const ROOM_IDLE_TTL_MS = 30 * 60 * 1000;

export const PLAYER_COLORS = [
  "#38bdf8",
  "#fb7185",
  "#facc15",
  "#4ade80",
  "#c084fc",
  "#fb923c",
  "#2dd4bf",
  "#f472b6",
  "#a3e635",
  "#818cf8",
] as const;

const INITIAL_POSITION = { x: 0, y: 0.34, z: 0 } as const;

const errorMessages: Record<RoomErrorPayload["code"], string> = {
  invalid_nickname: "Enter a nickname to play.",
  invalid_room_code: "Room codes must be exactly four digits.",
  room_not_found: "Room not found.",
  room_full: "That room is already full.",
  not_host: "Only the host can start the match.",
  room_not_ready: "That room is not ready for this action.",
  server_error: "The room server could not complete that action.",
};

export function createRoomStore(): RoomStore {
  return {
    rooms: new Map(),
    socketToRoom: new Map(),
  };
}

export function createRoom(
  store: RoomStore,
  socketId: string,
  request: CreateRoomRequest,
  now: number
): RoomStoreResult {
  if (store.socketToRoom.has(socketId)) {
    return roomError("server_error");
  }

  const nickname = normalizeNickname(request.nickname);
  if (nickname.length === 0) {
    return roomError("invalid_nickname");
  }

  const roomCode = createRoomCode(new Set(store.rooms.keys()));
  if (roomCode === null) {
    return roomError("server_error");
  }

  const player = createPlayer(socketId, nickname, now, PLAYER_COLORS[0], "lobby");
  const room: MultiplayerRoom = {
    roomCode,
    hostId: player.id,
    players: [player],
    status: "lobby",
    seed: null,
    countdownStartedAt: null,
    matchStartedAt: null,
    roundId: 0,
    winnerId: null,
    createdAt: now,
    updatedAt: now,
  };

  store.rooms.set(roomCode, room);
  store.socketToRoom.set(socketId, roomCode);

  return roomOk(room, player);
}

export function joinRoom(
  store: RoomStore,
  socketId: string,
  request: JoinRoomRequest,
  now: number
): RoomStoreResult {
  if (store.socketToRoom.has(socketId)) {
    return roomError("server_error");
  }

  const nickname = normalizeNickname(request.nickname);
  if (nickname.length === 0) {
    return roomError("invalid_nickname");
  }

  if (!isValidRoomCode(request.roomCode)) {
    return roomError("invalid_room_code");
  }

  const room = store.rooms.get(request.roomCode);
  if (room === undefined) {
    return roomError("room_not_found");
  }

  if (getConnectedPlayers(store, room).length >= MAX_ROOM_PLAYERS) {
    return roomError("room_full");
  }

  const player = createPlayer(
    socketId,
    nickname,
    now,
    choosePlayerColor(room),
    room.status === "lobby" ? "lobby" : "waitingNextRound"
  );
  room.players.push(player);
  store.socketToRoom.set(socketId, room.roomCode);
  refreshHost(store, room);
  touch(room, now);

  return roomOk(room, player);
}

export function leaveRoom(
  store: RoomStore,
  socketId: string,
  now: number
): MultiplayerRoom | null {
  const roomCode = store.socketToRoom.get(socketId);
  if (roomCode === undefined) {
    return null;
  }

  const room = store.rooms.get(roomCode);
  store.socketToRoom.delete(socketId);
  if (room === undefined) {
    return null;
  }

  const playerIndex = room.players.findIndex((player) => player.id === socketId);
  if (playerIndex === -1) {
    return null;
  }

  const player = room.players[playerIndex];
  if (room.status === "playing" && player.state === "alive") {
    player.state = "eliminated";
    refreshHost(store, room);
    settlePlayingRoom(room);
  } else if (room.status === "playing" && player.state === "eliminated") {
    refreshHost(store, room);
  } else {
    room.players.splice(playerIndex, 1);
    refreshHost(store, room);
  }

  if (!hasConnectedPlayers(store, room)) {
    deleteRoom(store, room.roomCode);
    return null;
  }

  if (room.status === "countdown") {
    cancelCountdownIfEmpty(store, room);
  }

  touch(room, now);
  return room;
}

export function startCountdown(
  store: RoomStore,
  roomCode: string,
  socketId: string,
  now: number,
  seed: number
): RoomStoreResult {
  if (!isValidRoomCode(roomCode)) {
    return roomError("invalid_room_code");
  }

  const room = store.rooms.get(roomCode);
  if (room === undefined) {
    return roomError("room_not_found");
  }

  if (room.status !== "lobby" && room.status !== "results") {
    return roomError("room_not_ready");
  }

  const player = room.players.find((currentPlayer) => currentPlayer.id === socketId);
  const effectiveHost = getEffectiveHost(store, room);
  if (
    player === undefined ||
    effectiveHost?.id !== socketId ||
    !isConnectedRoomPlayer(store, room, player)
  ) {
    return roomError("not_host");
  }

  if (room.status === "results") {
    pruneDisconnectedPlayers(store, room);
  }
  refreshHost(store, room);

  room.status = "countdown";
  room.seed = seed;
  room.countdownStartedAt = now;
  room.matchStartedAt = now + COUNTDOWN_SECONDS * 1000;
  room.winnerId = null;
  room.roundId += 1;
  for (const currentPlayer of room.players) {
    if (
      currentPlayer.state !== "disconnected" &&
      store.socketToRoom.get(currentPlayer.id) === room.roomCode
    ) {
      currentPlayer.state = "countdown";
    }
  }
  touch(room, now);

  return roomOk(room, player);
}

export function startMatchIfReady(
  store: RoomStore,
  roomCode: string,
  now: number
): MultiplayerRoom | null {
  const room = store.rooms.get(roomCode);
  if (
    room === undefined ||
    room.status !== "countdown" ||
    room.matchStartedAt === null ||
    now < room.matchStartedAt
  ) {
    return room ?? null;
  }

  for (const player of room.players) {
    if (player.state === "countdown") {
      player.state = "alive";
    }
  }
  room.status = "playing";
  touch(room, now);

  return room;
}

export function updatePlayerPosition(
  store: RoomStore,
  socketId: string,
  payload: PlayerPositionPayload,
  now: number
): MultiplayerRoom | null {
  const room = getRoomBySocket(store, socketId);
  if (room === null || room.roomCode !== payload.roomCode) {
    return null;
  }

  const player = room.players.find((currentPlayer) => currentPlayer.id === socketId);
  if (player === undefined) {
    return null;
  }

  player.position = { ...payload.position };
  touch(room, now);

  return room;
}

export function updatePlayerStats(
  store: RoomStore,
  socketId: string,
  payload: PlayerStatsPayload,
  now: number
): MultiplayerRoom | null {
  const room = getRoomBySocket(store, socketId);
  if (room === null || room.roomCode !== payload.roomCode) {
    return null;
  }

  const player = room.players.find((currentPlayer) => currentPlayer.id === socketId);
  if (player === undefined) {
    return null;
  }

  applyStats(player, payload);
  touch(room, now);

  return room;
}

export function eliminatePlayer(
  store: RoomStore,
  socketId: string,
  payload: PlayerEliminatedPayload,
  now: number
): MultiplayerRoom | null {
  const room = getRoomBySocket(store, socketId);
  if (room === null || room.roomCode !== payload.roomCode) {
    return null;
  }

  const player = room.players.find((currentPlayer) => currentPlayer.id === socketId);
  if (player === undefined) {
    return null;
  }

  applyStats(player, payload);
  if (room.status === "playing" && player.state === "alive") {
    player.state = "eliminated";
    settlePlayingRoom(room);
  }
  touch(room, now);

  return room;
}

export function cleanupIdleRooms(store: RoomStore, now: number): number {
  let deletedCount = 0;

  for (const room of store.rooms.values()) {
    if (now - room.updatedAt > ROOM_IDLE_TTL_MS) {
      deleteRoom(store, room.roomCode);
      deletedCount += 1;
    }
  }

  return deletedCount;
}

export function getRoomBySocket(
  store: RoomStore,
  socketId: string
): MultiplayerRoom | null {
  const roomCode = store.socketToRoom.get(socketId);
  if (roomCode === undefined) {
    return null;
  }

  return store.rooms.get(roomCode) ?? null;
}

function createPlayer(
  id: string,
  nickname: string,
  joinedAt: number,
  color: string,
  state: MultiplayerPlayer["state"]
): MultiplayerPlayer {
  return {
    id,
    nickname,
    color,
    joinedAt,
    state,
    position: { ...INITIAL_POSITION },
    score: 0,
    elapsedSeconds: 0,
    closeCalls: 0,
    shieldSaves: 0,
  };
}

function choosePlayerColor(room: MultiplayerRoom): string {
  const usedColors = new Set(room.players.map((player) => player.color));
  const unusedColor = PLAYER_COLORS.find((color) => !usedColors.has(color));

  return unusedColor ?? PLAYER_COLORS[room.players.length % PLAYER_COLORS.length];
}

function normalizeNickname(nickname: string): string {
  return Array.from(nickname.trim()).slice(0, 12).join("");
}

function applyStats(player: MultiplayerPlayer, payload: PlayerStatsPayload): void {
  player.score = payload.score;
  player.elapsedSeconds = payload.elapsedSeconds;
  player.closeCalls = payload.closeCalls;
  player.shieldSaves = payload.shieldSaves;
}

function refreshHost(store: RoomStore, room: MultiplayerRoom): void {
  const host = getEffectiveHost(store, room);

  room.hostId = host?.id ?? "";
}

function getEffectiveHost(
  store: RoomStore,
  room: MultiplayerRoom
): MultiplayerPlayer | undefined {
  return getConnectedPlayers(store, room).sort(
    (first, second) => first.joinedAt - second.joinedAt
  )[0];
}

function getConnectedPlayers(
  store: RoomStore,
  room: MultiplayerRoom
): MultiplayerPlayer[] {
  return room.players.filter((player) => isConnectedRoomPlayer(store, room, player));
}

function hasConnectedPlayers(store: RoomStore, room: MultiplayerRoom): boolean {
  return getConnectedPlayers(store, room).length > 0;
}

function isConnectedRoomPlayer(
  store: RoomStore,
  room: MultiplayerRoom,
  player: MultiplayerPlayer
): boolean {
  return (
    player.state !== "disconnected" &&
    store.socketToRoom.get(player.id) === room.roomCode
  );
}

function settlePlayingRoom(room: MultiplayerRoom): void {
  const alivePlayers = room.players.filter((player) => player.state === "alive");
  if (alivePlayers.length <= 1) {
    room.status = "results";
    room.winnerId = alivePlayers[0]?.id ?? null;
  }
}

function pruneDisconnectedPlayers(store: RoomStore, room: MultiplayerRoom): void {
  room.players = room.players.filter((player) =>
    isConnectedRoomPlayer(store, room, player)
  );
}

function cancelCountdownIfEmpty(store: RoomStore, room: MultiplayerRoom): void {
  const connectedPlayers = getConnectedPlayers(store, room);
  if (connectedPlayers.some((player) => player.state === "countdown")) {
    return;
  }

  resetCountdown(room);
  for (const player of connectedPlayers) {
    player.state = "lobby";
  }
}

function resetCountdown(room: MultiplayerRoom): void {
  room.status = "lobby";
  room.seed = null;
  room.countdownStartedAt = null;
  room.matchStartedAt = null;
  room.winnerId = null;
}

function deleteRoom(store: RoomStore, roomCode: string): void {
  store.rooms.delete(roomCode);
  for (const [socketId, mappedRoomCode] of store.socketToRoom) {
    if (mappedRoomCode === roomCode) {
      store.socketToRoom.delete(socketId);
    }
  }
}

function touch(room: MultiplayerRoom, now: number): void {
  room.updatedAt = now;
}

function roomOk(
  room: MultiplayerRoom,
  player: MultiplayerPlayer
): RoomStoreResult {
  return { ok: true, room, player };
}

function roomError(code: RoomErrorPayload["code"]): RoomStoreResult {
  return {
    ok: false,
    error: {
      code,
      message: errorMessages[code],
    },
  };
}
