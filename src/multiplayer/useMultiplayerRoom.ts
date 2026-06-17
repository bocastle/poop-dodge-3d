import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";
import type { Socket } from "socket.io-client";
import type { GameStats, Position } from "../game/types";
import {
  initialMultiplayerClientState,
  multiplayerRoomReducer,
  type MultiplayerClientAction,
  type MultiplayerClientState,
} from "./roomReducer";
import { normalizeRoomCode } from "./roomCode";
import {
  type CreateRoomRequest,
  type JoinRoomRequest,
  type MultiplayerPlayer,
  type MultiplayerRoom,
  type PlayerEliminatedPayload,
  type PlayerPositionPayload,
  type PlayerStatsPayload,
  type RoomErrorPayload,
} from "./types";
import {
  createMultiplayerSocket,
  getMultiplayerServerUrl,
} from "./socketClient";

type MultiplayerStatsUpdate = Pick<
  GameStats,
  "score" | "elapsedSeconds" | "closeCalls" | "shieldSaves"
>;

type PlayerPositionUpdate = {
  playerId: string;
  position: Position;
};

type PositionCacheAction =
  | { type: "clear" }
  | { type: "syncRoom"; room: MultiplayerRoom }
  | { type: "update"; playerId: string; position: Position };

type PendingRoomAction =
  | { event: "room:create"; payload: CreateRoomRequest }
  | { event: "room:join"; payload: JoinRoomRequest };

export type UseMultiplayerRoomResult = {
  state: MultiplayerClientState;
  room: MultiplayerRoom | null;
  localPlayerId: string | null;
  remotePlayers: MultiplayerPlayer[];
  serverNowOffsetMs: number;
  connect: () => boolean;
  setNickname: (nickname: string) => void;
  createRoom: () => void;
  joinRoom: (roomCode: string) => void;
  leaveRoom: () => void;
  startRoom: () => void;
  sendPosition: (position: Position) => void;
  sendStats: (stats: MultiplayerStatsUpdate) => void;
  sendEliminated: (stats: MultiplayerStatsUpdate) => void;
  reset: () => void;
};

const serverUnavailableError: RoomErrorPayload = {
  code: "server_error",
  message: "Multiplayer server is not configured. Single player is ready.",
};

const connectionFailedError: RoomErrorPayload = {
  code: "server_error",
  message: "Could not reach the multiplayer server. Single player still works.",
};

const connectionLostError: RoomErrorPayload = {
  code: "server_error",
  message: "Connection lost. Start a single run or try multiplayer again.",
};

const roomStatuses = new Set<string>([
  "lobby",
  "countdown",
  "playing",
  "results",
]);

const roomErrorCodes = new Set<string>([
  "invalid_nickname",
  "invalid_room_code",
  "room_not_found",
  "room_full",
  "not_host",
  "room_not_ready",
  "server_error",
]);

const playerStates = new Set<string>([
  "lobby",
  "countdown",
  "alive",
  "eliminated",
  "waitingNextRound",
  "disconnected",
]);

export function useMultiplayerRoom(): UseMultiplayerRoomResult {
  const [state, dispatchBase] = useReducer(
    multiplayerRoomReducer,
    initialMultiplayerClientState
  );
  const stateRef = useRef<MultiplayerClientState>(
    initialMultiplayerClientState
  );
  const socketRef = useRef<Socket | null>(null);
  const intentionalDisconnectRef = useRef(false);
  const pendingRoomActionRef = useRef<PendingRoomAction | null>(null);
  const positionCacheRef = useRef<Map<string, Position>>(new Map());
  const [positionCache, dispatchPositionCacheBase] = useReducer(
    positionCacheReducer,
    new Map<string, Position>()
  );
  const [localPlayerId, setLocalPlayerId] = useState<string | null>(null);
  const [serverNowOffsetMs, setServerNowOffsetMs] = useState(0);

  const dispatch = useCallback((action: MultiplayerClientAction): void => {
    stateRef.current = multiplayerRoomReducer(stateRef.current, action);
    dispatchBase(action);
  }, []);

  const clearPendingRoomAction = useCallback((): void => {
    pendingRoomActionRef.current = null;
  }, []);

  const emitPendingRoomAction = useCallback((socket: Socket): void => {
    const action = pendingRoomActionRef.current;
    if (action === null) {
      return;
    }

    pendingRoomActionRef.current = null;
    socket.emit(action.event, action.payload);
  }, []);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    positionCacheRef.current = positionCache;
  }, [positionCache]);

  const dispatchPositionCache = useCallback((action: PositionCacheAction): void => {
    positionCacheRef.current = positionCacheReducer(
      positionCacheRef.current,
      action
    );
    dispatchPositionCacheBase(action);
  }, []);

  const clearPositionCache = useCallback((): void => {
    dispatchPositionCache({ type: "clear" });
  }, [dispatchPositionCache]);

  const resetClientState = useCallback((): void => {
    clearPendingRoomAction();
    clearPositionCache();
    setLocalPlayerId(null);
    setServerNowOffsetMs(0);
    dispatch({ type: "reset" });
  }, [clearPendingRoomAction, clearPositionCache, dispatch]);

  const applyRoomState = useCallback(
    (payload: unknown): void => {
      if (!isMultiplayerRoom(payload)) {
        return;
      }

      intentionalDisconnectRef.current = false;
      dispatchPositionCache({ type: "syncRoom", room: payload });
      setLocalPlayerId(socketRef.current?.id ?? null);
      setServerNowOffsetMs(payload.updatedAt - Date.now());
      dispatch({ type: "roomState", room: payload });
    },
    [dispatch, dispatchPositionCache]
  );

  const handleRoomError = useCallback(
    (payload: unknown): void => {
      clearPendingRoomAction();
      dispatch({
        type: "setError",
        error: isRoomErrorPayload(payload) ? payload : connectionFailedError,
      });
    },
    [clearPendingRoomAction, dispatch]
  );

  const handlePlayerPosition = useCallback(
    (payload: unknown): void => {
      if (
        !isPlayerPositionUpdate(payload) ||
        stateRef.current.room?.players.some(
          (player) => player.id === payload.playerId
        ) !== true
      ) {
        return;
      }

      dispatchPositionCache({
        type: "update",
        playerId: payload.playerId,
        position: payload.position,
      });
    },
    [dispatchPositionCache]
  );

  const disposeSocket = useCallback((socket: Socket): void => {
    socket.removeAllListeners();
    socket.disconnect();
  }, []);

  const disconnectIntentionally = useCallback(
    (socket: Socket | null): void => {
      intentionalDisconnectRef.current = true;
      socketRef.current = null;
      resetClientState();

      if (socket !== null) {
        disposeSocket(socket);
      }

      intentionalDisconnectRef.current = false;
    },
    [disposeSocket, resetClientState]
  );

  const createSocket = useCallback((): Socket | null => {
    const existingSocket = socketRef.current;
    if (existingSocket !== null) {
      return existingSocket;
    }

    const serverUrl = getMultiplayerServerUrl();
    if (serverUrl === undefined) {
      dispatch({ type: "connectFailed", error: serverUnavailableError });
      return null;
    }

    const socket = createMultiplayerSocket(serverUrl);
    socketRef.current = socket;

    socket.on("connect", () => {
      intentionalDisconnectRef.current = false;
      setLocalPlayerId(socket.id ?? null);
      dispatch({ type: "connectSuccess" });
      emitPendingRoomAction(socket);
    });
    socket.on("connect_error", () => {
      socketRef.current = null;
      clearPendingRoomAction();
      disposeSocket(socket);
      setLocalPlayerId(null);
      dispatch({ type: "connectFailed", error: connectionFailedError });
    });
    socket.on("disconnect", () => {
      const hadActiveRoom = stateRef.current.room !== null;
      const wasIntentional = intentionalDisconnectRef.current;
      const shouldShowError =
        hadActiveRoom && !wasIntentional;

      socketRef.current = null;
      clearPendingRoomAction();
      clearPositionCache();
      disposeSocket(socket);
      intentionalDisconnectRef.current = false;
      setLocalPlayerId(null);

      if (shouldShowError) {
        dispatch({ type: "connectFailed", error: connectionLostError });
      } else {
        dispatch({ type: "reset" });
      }
    });
    socket.on("room:state", applyRoomState);
    socket.on("room:created", (payload: unknown) => {
      clearPendingRoomAction();
      applyRoomState(payload);
    });
    socket.on("room:joined", (payload: unknown) => {
      clearPendingRoomAction();
      applyRoomState(payload);
    });
    socket.on("room:error", handleRoomError);
    socket.on("room:left", () => {
      disconnectIntentionally(socket);
    });
    socket.on("match:countdown", applyRoomState);
    socket.on("match:start", applyRoomState);
    socket.on("match:end", applyRoomState);
    socket.on("player:position", handlePlayerPosition);

    return socket;
  }, [
    applyRoomState,
    clearPositionCache,
    clearPendingRoomAction,
    dispatch,
    disconnectIntentionally,
    disposeSocket,
    emitPendingRoomAction,
    handlePlayerPosition,
    handleRoomError,
  ]);

  const connect = useCallback((): boolean => {
    const socket = createSocket();
    if (socket === null) {
      return false;
    }

    if (socket.connected) {
      setLocalPlayerId(socket.id ?? null);
      dispatch({ type: "connectSuccess" });
    } else {
      dispatch({ type: "connectStart" });
      socket.connect();
    }

    return true;
  }, [createSocket, dispatch]);

  const setNickname = useCallback(
    (nickname: string): void => {
      dispatch({ type: "setNickname", nickname });
    },
    [dispatch]
  );

  const createRoom = useCallback((): void => {
    const socket = createSocket();
    if (socket === null) {
      return;
    }

    const action: PendingRoomAction = {
      event: "room:create",
      payload: {
        nickname: stateRef.current.nickname,
      },
    };

    if (socket.connected) {
      socket.emit(action.event, action.payload);
      return;
    }

    pendingRoomActionRef.current = action;
    connect();
  }, [connect, createSocket]);

  const joinRoom = useCallback(
    (roomCode: string): void => {
      const socket = createSocket();
      if (socket === null) {
        return;
      }

      const action: PendingRoomAction = {
        event: "room:join",
        payload: {
          roomCode: normalizeRoomCode(roomCode),
          nickname: stateRef.current.nickname,
        },
      };

      if (socket.connected) {
        socket.emit(action.event, action.payload);
        return;
      }

      pendingRoomActionRef.current = action;
      connect();
    },
    [connect, createSocket]
  );

  const leaveRoom = useCallback((): void => {
    clearPendingRoomAction();

    const socket = socketRef.current;
    if (socket === null || stateRef.current.room === null) {
      disconnectIntentionally(socket);
      return;
    }

    socket.emit("room:leave");
  }, [clearPendingRoomAction, disconnectIntentionally]);

  const startRoom = useCallback((): void => {
    const socket = socketRef.current;
    if (socket === null || stateRef.current.room === null) {
      return;
    }

    socket.emit("room:start");
  }, []);

  const sendPosition = useCallback((position: Position): void => {
    const socket = socketRef.current;
    const room = stateRef.current.room;
    if (socket === null || room === null) {
      return;
    }

    const payload: PlayerPositionPayload = {
      roomCode: room.roomCode,
      position,
    };
    socket.emit("player:position", payload);
  }, []);

  const sendStats = useCallback((stats: MultiplayerStatsUpdate): void => {
    const socket = socketRef.current;
    const room = stateRef.current.room;
    if (socket === null || room === null) {
      return;
    }

    socket.emit("player:stats", createStatsPayload(room, stats));
  }, []);

  const sendEliminated = useCallback((stats: MultiplayerStatsUpdate): void => {
    const socket = socketRef.current;
    const room = stateRef.current.room;
    if (socket === null || room === null) {
      return;
    }

    const payload: PlayerEliminatedPayload = createStatsPayload(room, stats);
    socket.emit("player:eliminated", payload);
  }, []);

  const reset = useCallback((): void => {
    const socket = socketRef.current;
    disconnectIntentionally(socket);
  }, [disconnectIntentionally]);

  useEffect(() => {
    return () => {
      const socket = socketRef.current;
      socketRef.current = null;
      intentionalDisconnectRef.current = true;
      clearPendingRoomAction();

      if (socket !== null) {
        disposeSocket(socket);
      }

      intentionalDisconnectRef.current = false;
    };
  }, [clearPendingRoomAction, disposeSocket]);

  const remotePlayers = useMemo<MultiplayerPlayer[]>(() => {
    if (state.room === null) {
      return [];
    }

    return state.room.players
      .filter((player) => player.id !== localPlayerId)
      .map((player) => {
        const cachedPosition = positionCache.get(player.id);
        if (cachedPosition === undefined) {
          return player;
        }

        return {
          ...player,
          position: cachedPosition,
        };
      });
  }, [localPlayerId, positionCache, state.room]);

  return {
    state,
    room: state.room,
    localPlayerId,
    remotePlayers,
    serverNowOffsetMs,
    connect,
    setNickname,
    createRoom,
    joinRoom,
    leaveRoom,
    startRoom,
    sendPosition,
    sendStats,
    sendEliminated,
    reset,
  };
}

function createStatsPayload(
  room: MultiplayerRoom,
  stats: MultiplayerStatsUpdate
): PlayerStatsPayload {
  return {
    roomCode: room.roomCode,
    score: stats.score,
    elapsedSeconds: stats.elapsedSeconds,
    closeCalls: stats.closeCalls,
    shieldSaves: stats.shieldSaves,
  };
}

function positionCacheReducer(
  state: Map<string, Position>,
  action: PositionCacheAction
): Map<string, Position> {
  switch (action.type) {
    case "clear":
      return new Map();
    case "syncRoom":
      return new Map(
        action.room.players.map((player) => [player.id, player.position])
      );
    case "update":
      return new Map(state).set(action.playerId, action.position);
  }
}

function isMultiplayerRoom(payload: unknown): payload is MultiplayerRoom {
  return (
    isRecord(payload) &&
    typeof payload.roomCode === "string" &&
    typeof payload.hostId === "string" &&
    Array.isArray(payload.players) &&
    payload.players.every(isMultiplayerPlayer) &&
    typeof payload.status === "string" &&
    roomStatuses.has(payload.status) &&
    isNullableFiniteNumber(payload.seed) &&
    isNullableFiniteNumber(payload.countdownStartedAt) &&
    isNullableFiniteNumber(payload.matchStartedAt) &&
    isFiniteNumber(payload.roundId) &&
    (payload.winnerId === null || typeof payload.winnerId === "string") &&
    isFiniteNumber(payload.createdAt) &&
    isFiniteNumber(payload.updatedAt)
  );
}

function isMultiplayerPlayer(payload: unknown): payload is MultiplayerPlayer {
  return (
    isRecord(payload) &&
    typeof payload.id === "string" &&
    typeof payload.nickname === "string" &&
    typeof payload.color === "string" &&
    isFiniteNumber(payload.joinedAt) &&
    typeof payload.state === "string" &&
    playerStates.has(payload.state) &&
    isPosition(payload.position) &&
    isFiniteNumber(payload.score) &&
    isFiniteNumber(payload.elapsedSeconds) &&
    isFiniteNumber(payload.closeCalls) &&
    isFiniteNumber(payload.shieldSaves)
  );
}

function isPlayerPositionUpdate(
  payload: unknown
): payload is PlayerPositionUpdate {
  return (
    isRecord(payload) &&
    typeof payload.playerId === "string" &&
    isPosition(payload.position)
  );
}

function isRoomErrorPayload(payload: unknown): payload is RoomErrorPayload {
  return (
    isRecord(payload) &&
    typeof payload.code === "string" &&
    roomErrorCodes.has(payload.code) &&
    typeof payload.message === "string"
  );
}

function isPosition(payload: unknown): payload is Position {
  return (
    isRecord(payload) &&
    isFiniteNumber(payload.x) &&
    isFiniteNumber(payload.y) &&
    isFiniteNumber(payload.z)
  );
}

function isNullableFiniteNumber(payload: unknown): payload is number | null {
  return payload === null || isFiniteNumber(payload);
}

function isFiniteNumber(payload: unknown): payload is number {
  return typeof payload === "number" && Number.isFinite(payload);
}

function isRecord(payload: unknown): payload is Record<string, unknown> {
  return typeof payload === "object" && payload !== null;
}
