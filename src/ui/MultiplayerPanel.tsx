import { useEffect, useMemo, useState } from "react";
import type { UseMultiplayerRoomResult } from "../multiplayer/useMultiplayerRoom";
import type {
  MultiplayerPlayer,
  MultiplayerPlayerState,
  MultiplayerRoom,
} from "../multiplayer/types";

export type MultiplayerPanelProps = {
  multiplayer: UseMultiplayerRoomResult;
  localPlayerId: string | null;
  onBackToSingle: () => void;
  onLeaveRoom: () => void;
};

type RoomAction = "create" | "join";

const playerStateLabels: Record<MultiplayerPlayerState, string> = {
  alive: "Alive",
  countdown: "Ready",
  lobby: "Lobby",
  eliminated: "Out",
  waitingNextRound: "Waiting",
  disconnected: "Away",
};

export function MultiplayerPanel({
  multiplayer,
  localPlayerId,
  onBackToSingle,
  onLeaveRoom,
}: MultiplayerPanelProps) {
  const [roomAction, setRoomAction] = useState<RoomAction>("create");
  const [roomCode, setRoomCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const room = multiplayer.room;

  useEffect(() => {
    setIsSubmitting(false);
  }, [multiplayer.state.error, room]);

  useEffect(() => {
    if (
      room?.status !== "countdown" ||
      room.countdownStartedAt === null ||
      room.matchStartedAt === null
    ) {
      return;
    }

    const timer = window.setInterval(() => {
      setNow(Date.now());
    }, 250);

    return () => {
      window.clearInterval(timer);
    };
  }, [room?.countdownStartedAt, room?.matchStartedAt, room?.status]);

  const isBusy = multiplayer.state.connecting || isSubmitting;
  const nickname = multiplayer.state.nickname;
  const canCreate = nickname.trim().length > 0 && !isBusy;
  const canJoin = canCreate && roomCode.length === 4;
  const localPlayer = room?.players.find((player) => player.id === localPlayerId);
  const localPlayerWaitingNextRound = localPlayer?.state === "waitingNextRound";

  function handleCreateRoom(): void {
    if (!canCreate) {
      return;
    }

    setIsSubmitting(true);
    multiplayer.createRoom();
  }

  function handleJoinRoom(): void {
    if (!canJoin) {
      return;
    }

    setIsSubmitting(true);
    multiplayer.joinRoom(roomCode);
  }

  if (room !== null) {
    return (
      <div className="panel multiplayer-panel" data-panel={room.status}>
        {room.status === "lobby" && (
          <LobbyPanel
            room={room}
            localPlayerId={localPlayerId}
            isBusy={isBusy}
            onLeave={onLeaveRoom}
            onStart={multiplayer.startRoom}
          />
        )}
        {room.status === "countdown" && localPlayerWaitingNextRound && (
          <WaitingNextRoundPanel
            room={room}
            localPlayerId={localPlayerId}
            onLeave={onLeaveRoom}
          />
        )}
        {room.status === "countdown" && !localPlayerWaitingNextRound && (
          <CountdownPanel
            room={room}
            localPlayerId={localPlayerId}
            now={now + multiplayer.serverNowOffsetMs}
            onLeave={onLeaveRoom}
          />
        )}
        {room.status === "playing" && localPlayerWaitingNextRound && (
          <WaitingNextRoundPanel
            room={room}
            localPlayerId={localPlayerId}
            onLeave={onLeaveRoom}
          />
        )}
        {room.status === "playing" && !localPlayerWaitingNextRound && (
          <PlayingPanel room={room} localPlayerId={localPlayerId} onLeave={onLeaveRoom} />
        )}
        {room.status === "results" && (
          <ResultsPanel
            room={room}
            localPlayerId={localPlayerId}
            isBusy={isBusy}
            onLeave={onLeaveRoom}
            onStart={multiplayer.startRoom}
          />
        )}
        <RoomError error={multiplayer.state.error} />
      </div>
    );
  }

  return (
    <div className="panel multiplayer-panel" data-panel="multiplayer-entry">
      <div className="panel-status" role="status" aria-atomic="true">
        <p className="eyebrow">multiplayer room</p>
        <h1>Poop Dodge 3D</h1>
        <p className="summary">Create a room or join with a 4-digit code.</p>
      </div>

      <label className="field-label" htmlFor="nickname">
        Nickname
      </label>
      <input
        id="nickname"
        className="paper-input"
        type="text"
        value={nickname}
        maxLength={18}
        placeholder="Ada"
        autoComplete="nickname"
        onChange={(event) => multiplayer.setNickname(event.currentTarget.value)}
      />

      <div className="mode-actions" aria-label="Room action">
        <button
          className={roomAction === "create" ? "paper-action is-selected" : "paper-action"}
          type="button"
          onClick={() => setRoomAction("create")}
        >
          Create
        </button>
        <button
          className={roomAction === "join" ? "paper-action is-selected" : "paper-action"}
          type="button"
          onClick={() => setRoomAction("join")}
        >
          Join
        </button>
      </div>

      {roomAction === "join" && (
        <>
          <label className="field-label" htmlFor="room-code">
            Room code
          </label>
          <input
            id="room-code"
            className="paper-input room-code-input"
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={roomCode}
            maxLength={4}
            placeholder="4821"
            onChange={(event) => {
              setRoomCode(event.currentTarget.value.replace(/\D/g, "").slice(0, 4));
            }}
          />
        </>
      )}

      <RoomError error={multiplayer.state.error} />

      <div className="mode-actions">
        {roomAction === "create" ? (
          <button
            className="primary-action paper-action"
            type="button"
            onClick={handleCreateRoom}
            disabled={!canCreate}
          >
            {isBusy ? "Creating..." : "Create room"}
          </button>
        ) : (
          <button
            className="primary-action paper-action"
            type="button"
            onClick={handleJoinRoom}
            disabled={!canJoin}
          >
            {isBusy ? "Joining..." : "Join room"}
          </button>
        )}
        <button className="paper-action secondary-action" type="button" onClick={onBackToSingle}>
          Back
        </button>
      </div>
    </div>
  );
}

type RoomPanelProps = {
  room: MultiplayerRoom;
  localPlayerId: string | null;
  isBusy: boolean;
  onLeave: () => void;
  onStart: () => void;
};

function LobbyPanel({
  room,
  localPlayerId,
  isBusy,
  onLeave,
  onStart,
}: RoomPanelProps) {
  const isHost = localPlayerId === room.hostId;

  return (
    <>
      <PanelHeader eyebrow="lobby" title="Room ready" roomCode={room.roomCode} />
      <PlayerList room={room} localPlayerId={localPlayerId} />
      <div className="mode-actions">
        {isHost ? (
          <button
            className="primary-action paper-action"
            type="button"
            onClick={onStart}
            disabled={isBusy}
          >
            Start
          </button>
        ) : (
          <p className="waiting-copy">Waiting for the host to start.</p>
        )}
        <button className="paper-action secondary-action" type="button" onClick={onLeave}>
          Leave room
        </button>
      </div>
    </>
  );
}

function WaitingNextRoundPanel({
  room,
  localPlayerId,
  onLeave,
}: {
  room: MultiplayerRoom;
  localPlayerId: string | null;
  onLeave: () => void;
}) {
  return (
    <>
      <PanelHeader
        eyebrow={room.status === "countdown" ? "round starting" : "round live"}
        title="Waiting for next round"
        roomCode={room.roomCode}
      />
      <p className="summary">
        This round is already in motion. Watch the room, track survivors, and jump in when the
        next round opens.
      </p>
      <PlayerList room={room} localPlayerId={localPlayerId} />
      <button className="paper-action secondary-action" type="button" onClick={onLeave}>
        Leave room
      </button>
    </>
  );
}

function CountdownPanel({
  room,
  localPlayerId,
  now,
  onLeave,
}: {
  room: MultiplayerRoom;
  localPlayerId: string | null;
  now: number;
  onLeave: () => void;
}) {
  const countdownText = getCountdownText(room, now);

  return (
    <>
      <PanelHeader eyebrow="countdown" title="Get ready" roomCode={room.roomCode} />
      <div className="countdown-card" role="timer" aria-live="polite">
        {countdownText}
      </div>
      <PlayerList room={room} localPlayerId={localPlayerId} />
      <button className="paper-action secondary-action" type="button" onClick={onLeave}>
        Leave room
      </button>
    </>
  );
}

function PlayingPanel({
  room,
  localPlayerId,
  onLeave,
}: {
  room: MultiplayerRoom;
  localPlayerId: string | null;
  onLeave: () => void;
}) {
  return (
    <>
      <PanelHeader eyebrow="round live" title="Round in progress" roomCode={room.roomCode} />
      <p className="summary">
        The round is live. Watch the room, track survivors, and stay ready for the results.
      </p>
      <PlayerList room={room} localPlayerId={localPlayerId} />
      <button className="paper-action secondary-action" type="button" onClick={onLeave}>
        Leave room
      </button>
    </>
  );
}

function RoomError({
  error,
}: {
  error: UseMultiplayerRoomResult["state"]["error"];
}) {
  if (error === null) {
    return null;
  }

  return (
    <p className="room-error" role="alert">
      {error.message}
    </p>
  );
}

function ResultsPanel({
  room,
  localPlayerId,
  isBusy,
  onLeave,
  onStart,
}: RoomPanelProps) {
  const winner = room.players.find((player) => player.id === room.winnerId);
  const isHost = localPlayerId === room.hostId;
  const rankedPlayers = useMemo(
    () =>
      [...room.players].sort((firstPlayer, secondPlayer) => {
        if (secondPlayer.score !== firstPlayer.score) {
          return secondPlayer.score - firstPlayer.score;
        }

        return secondPlayer.elapsedSeconds - firstPlayer.elapsedSeconds;
      }),
    [room.players]
  );

  return (
    <>
      <PanelHeader
        eyebrow="results"
        title={winner === undefined ? "No winner" : "Winner"}
        roomCode={room.roomCode}
      />
      <p className="winner-copy">{winner === undefined ? "No winner" : winner.nickname}</p>
      <ol className="match-result-list" aria-label="Match results">
        {rankedPlayers.map((player) => (
          <li key={player.id}>
            <span className="result-name" title={player.nickname}>
              {player.nickname}
              {player.id === localPlayerId ? " (You)" : ""}
            </span>
            <strong>{player.score.toLocaleString()}</strong>
            <span>{Math.floor(player.elapsedSeconds)}s</span>
            <span>{player.closeCalls.toLocaleString()} Close calls</span>
            <span>{player.shieldSaves.toLocaleString()} Shield saves</span>
          </li>
        ))}
      </ol>
      <div className="mode-actions">
        {isHost ? (
          <button
            className="primary-action paper-action"
            type="button"
            onClick={onStart}
            disabled={isBusy}
          >
            Start next round
          </button>
        ) : (
          <p className="waiting-copy">Waiting for the host to start the next round.</p>
        )}
        <button className="paper-action secondary-action" type="button" onClick={onLeave}>
          Leave room
        </button>
      </div>
    </>
  );
}

function PanelHeader({
  eyebrow,
  title,
  roomCode,
}: {
  eyebrow: string;
  title: string;
  roomCode: string;
}) {
  return (
    <div className="panel-status" role="status" aria-atomic="true">
      <p className="eyebrow">{eyebrow}</p>
      <h1>{title}</h1>
      <div className="room-code" aria-label={`Room code ${roomCode}`}>
        {roomCode}
      </div>
    </div>
  );
}

function PlayerList({
  room,
  localPlayerId,
}: {
  room: MultiplayerRoom;
  localPlayerId: string | null;
}) {
  return (
    <ol className="player-list" aria-label="Lobby players">
      {room.players.slice(0, 10).map((player) => (
        <PlayerRow
          key={player.id}
          player={player}
          isHost={player.id === room.hostId}
          isLocal={player.id === localPlayerId}
        />
      ))}
    </ol>
  );
}

function PlayerRow({
  player,
  isHost,
  isLocal,
}: {
  player: MultiplayerPlayer;
  isHost: boolean;
  isLocal: boolean;
}) {
  return (
    <li className="player-row">
      <span
        className="player-dot"
        style={{ backgroundColor: player.color }}
        aria-hidden="true"
      />
      <span className="player-name" title={player.nickname}>
        {player.nickname}
      </span>
      {isLocal && <span className="you-chip">You</span>}
      {isHost && <span className="host-chip">Host</span>}
      <span className={`player-state is-${player.state}`}>
        {playerStateLabels[player.state]}
      </span>
    </li>
  );
}

function getCountdownText(room: MultiplayerRoom, now: number): string {
  if (room.countdownStartedAt === null || room.matchStartedAt === null) {
    return "Ready";
  }

  const secondsUntilStart = Math.ceil((room.matchStartedAt - now) / 1_000);

  if (secondsUntilStart <= 0) {
    return "START";
  }

  return String(Math.min(3, secondsUntilStart));
}
