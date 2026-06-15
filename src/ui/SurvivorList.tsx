import type {
  MultiplayerPlayerState,
  MultiplayerRoom,
} from "../multiplayer/types";

export type SurvivorListProps = {
  room: MultiplayerRoom;
  localPlayerId: string | null;
  collapsed: boolean;
  onToggle: () => void;
};

const activeStateRank: Record<MultiplayerPlayerState, number> = {
  alive: 0,
  countdown: 0,
  lobby: 0,
  waitingNextRound: 0,
  eliminated: 1,
  disconnected: 2,
};

const stateLabels: Record<MultiplayerPlayerState, string> = {
  alive: "Alive",
  countdown: "Ready",
  lobby: "Lobby",
  eliminated: "Out",
  waitingNextRound: "Waiting",
  disconnected: "Away",
};

export function SurvivorList({
  room,
  localPlayerId,
  collapsed,
  onToggle,
}: SurvivorListProps) {
  const sortedPlayers = [...room.players]
    .sort((firstPlayer, secondPlayer) => {
      const stateDelta =
        activeStateRank[firstPlayer.state] - activeStateRank[secondPlayer.state];

      if (stateDelta !== 0) {
        return stateDelta;
      }

      if (secondPlayer.score !== firstPlayer.score) {
        return secondPlayer.score - firstPlayer.score;
      }

      return firstPlayer.joinedAt - secondPlayer.joinedAt;
    })
    .slice(0, 10);

  const liveCount = room.players.filter(
    (player) =>
      player.state === "alive" ||
      player.state === "countdown" ||
      player.state === "lobby"
  ).length;

  return (
    <aside
      className={collapsed ? "survivor-list is-collapsed" : "survivor-list"}
      aria-label="Survivors"
    >
      <button
        className="survivor-list-toggle"
        type="button"
        onClick={onToggle}
        aria-expanded={!collapsed}
      >
        <span>Players</span>
        <strong>
          {liveCount}/{room.players.length}
        </strong>
      </button>
      <div className="survivor-list-panel">
        <div className="survivor-list-heading">
          <span>Room {room.roomCode}</span>
          <strong>{room.status}</strong>
        </div>
        <ol className="survivor-list-rows">
          {sortedPlayers.map((player) => (
            <li className="survivor-list-row" key={player.id}>
              <span
                className="player-dot"
                style={{ backgroundColor: player.color }}
                aria-hidden="true"
              />
              <span className="survivor-name" title={player.nickname}>
                {player.nickname}
              </span>
              {player.id === localPlayerId && <span className="you-chip">You</span>}
              {player.id === room.hostId && <span className="host-chip">Host</span>}
              <span className={`survivor-state is-${player.state}`}>
                {stateLabels[player.state]}
              </span>
              <strong>{player.score.toLocaleString()}</strong>
            </li>
          ))}
        </ol>
      </div>
    </aside>
  );
}
