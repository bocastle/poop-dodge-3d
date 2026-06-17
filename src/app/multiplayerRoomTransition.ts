import type { GamePhase } from "../game/types";
import type { MultiplayerRoom } from "../multiplayer/types";

export type MultiplayerAppMode = "single" | "multiplayer";

export type MultiplayerRoomTransition = {
  phase: GamePhase;
  shouldStartRound: boolean;
};

export type LastStartedMultiplayerRound = {
  roomCode: string;
  roundId: number;
};

export function getMultiplayerRoomTransition(
  room: MultiplayerRoom,
  localPlayerId: string | null,
  lastStartedRound: LastStartedMultiplayerRound | null,
  currentPhase: GamePhase
): MultiplayerRoomTransition {
  const localPlayer = room.players.find((player) => player.id === localPlayerId);

  if (room.status === "lobby" || room.status === "countdown") {
    return { phase: "ready", shouldStartRound: false };
  }

  if (room.status === "results") {
    return { phase: "game-over", shouldStartRound: false };
  }

  if (localPlayer?.state === "alive") {
    const shouldStartRound =
      lastStartedRound?.roomCode !== room.roomCode ||
      lastStartedRound.roundId !== room.roundId;

    if (!shouldStartRound && currentPhase === "game-over") {
      return { phase: "game-over", shouldStartRound: false };
    }

    return { phase: "playing", shouldStartRound };
  }

  if (localPlayer?.state === "eliminated") {
    return { phase: "game-over", shouldStartRound: false };
  }

  if (localPlayer?.state === "waitingNextRound" && currentPhase === "game-over") {
    return { phase: "game-over", shouldStartRound: false };
  }

  return { phase: "ready", shouldStartRound: false };
}

export function getRoomClearedTransition(
  mode: MultiplayerAppMode,
  currentPhase: GamePhase
): Pick<MultiplayerRoomTransition, "phase"> {
  if (mode === "multiplayer") {
    return { phase: "ready" };
  }

  return { phase: currentPhase };
}

export function shouldWriteSinglePlayerHighScore(mode: MultiplayerAppMode): boolean {
  return mode === "single";
}
