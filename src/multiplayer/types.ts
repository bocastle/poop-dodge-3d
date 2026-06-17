import type { Position } from "../game/types";

export const MAX_ROOM_PLAYERS = 10;
export const ROOM_CODE_LENGTH = 4;
export const COUNTDOWN_SECONDS = 3;

export type RoomStatus = "lobby" | "countdown" | "playing" | "results";

export type MultiplayerPlayerState =
  | "lobby"
  | "countdown"
  | "alive"
  | "eliminated"
  | "waitingNextRound"
  | "disconnected";

export type MultiplayerPlayer = {
  id: string;
  nickname: string;
  color: string;
  joinedAt: number;
  state: MultiplayerPlayerState;
  position: Position;
  score: number;
  elapsedSeconds: number;
  closeCalls: number;
  shieldSaves: number;
};

export type MultiplayerRoom = {
  roomCode: string;
  hostId: string;
  players: MultiplayerPlayer[];
  status: RoomStatus;
  seed: number | null;
  countdownStartedAt: number | null;
  matchStartedAt: number | null;
  roundId: number;
  winnerId: string | null;
  createdAt: number;
  updatedAt: number;
};

export type CreateRoomRequest = {
  nickname: string;
};

export type JoinRoomRequest = {
  roomCode: string;
  nickname: string;
};

export type PlayerPositionPayload = {
  roomCode: string;
  position: Position;
};

export type PlayerStatsPayload = {
  roomCode: string;
  score: number;
  elapsedSeconds: number;
  closeCalls: number;
  shieldSaves: number;
};

export type PlayerEliminatedPayload = PlayerStatsPayload;

export type RoomErrorCode =
  | "invalid_nickname"
  | "invalid_room_code"
  | "room_not_found"
  | "room_full"
  | "not_host"
  | "room_not_ready"
  | "server_error";

export type RoomErrorPayload = {
  code: RoomErrorCode;
  message: string;
};
