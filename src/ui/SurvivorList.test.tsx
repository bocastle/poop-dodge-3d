import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { MultiplayerPlayer, MultiplayerRoom } from "../multiplayer/types";
import { SurvivorList } from "./SurvivorList";

function createPlayer(
  id: string,
  nickname: string,
  state: MultiplayerPlayer["state"],
  score: number
): MultiplayerPlayer {
  return {
    id,
    nickname,
    color: "#38bdf8",
    joinedAt: score,
    state,
    position: { x: 0, y: 0.34, z: 0 },
    score,
    elapsedSeconds: score / 10,
    closeCalls: 0,
    shieldSaves: 0,
  };
}

function createRoom(players: MultiplayerPlayer[]): MultiplayerRoom {
  return {
    roomCode: "4821",
    hostId: "host",
    players,
    status: "playing",
    seed: 7,
    countdownStartedAt: null,
    matchStartedAt: 1_000,
    roundId: 1,
    winnerId: null,
    createdAt: 1_000,
    updatedAt: 2_000,
  };
}

describe("SurvivorList", () => {
  it("sorts active players first and marks the local player", () => {
    const room = createRoom([
      createPlayer("out", "Eliminated Player", "eliminated", 8),
      createPlayer("local", "Ada Longnickname", "alive", 20),
      createPlayer("waiting", "Waiting Friend", "waitingNextRound", 11),
      createPlayer("gone", "Disconnected Friend", "disconnected", 5),
    ]);

    const html = renderToStaticMarkup(
      <SurvivorList
        room={room}
        localPlayerId="local"
        collapsed={false}
        onToggle={() => undefined}
      />
    );

    expect(html).toContain("survivor-list");
    expect(html).toContain("You");
    expect(html.indexOf("Ada Longnickname")).toBeLessThan(
      html.indexOf("Eliminated Player")
    );
    expect(html.indexOf("Waiting Friend")).toBeLessThan(
      html.indexOf("Disconnected Friend")
    );
  });

  it("keeps ten long player names bounded and applies the collapsed class", () => {
    const players = Array.from({ length: 12 }, (_, index) =>
      createPlayer(
        `player-${index}`,
        `Player ${index} With A Very Long Nickname`,
        "alive",
        100 - index
      )
    );
    const html = renderToStaticMarkup(
      <SurvivorList
        room={createRoom(players)}
        localPlayerId="player-0"
        collapsed
        onToggle={() => undefined}
      />
    );

    expect(html).toContain("survivor-list is-collapsed");
    expect(html).toContain('title="Player 0 With A Very Long Nickname"');
    expect(html.match(/class="survivor-list-row"/g)).toHaveLength(10);
    expect(html).not.toContain("Player 10 With A Very Long Nickname");
  });
});
