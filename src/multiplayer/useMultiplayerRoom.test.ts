/// <reference lib="dom" />

import React, { act } from "react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { createRoot, type Root } from "react-dom/client";
import type { Socket } from "socket.io-client";
import type { Position } from "../game/types";
import {
  type MultiplayerPlayer,
  type MultiplayerRoom,
} from "./types";
import {
  useMultiplayerRoom,
  type UseMultiplayerRoomResult,
} from "./useMultiplayerRoom";
import {
  createMultiplayerSocket,
  getMultiplayerServerUrl,
} from "./socketClient";

const socketClientMocks = vi.hoisted(() => ({
  createMultiplayerSocket: vi.fn(),
  getMultiplayerServerUrl: vi.fn(),
}));

vi.mock("./socketClient", () => socketClientMocks);

type SocketEventHandler = (payload?: unknown) => void;

type EmittedSocketEvent = {
  event: string;
  payload: unknown;
};

class FakeSocket {
  id: string;
  connected = false;
  readonly emitted: EmittedSocketEvent[] = [];
  disconnectCalls = 0;

  private readonly handlers = new Map<string, Set<SocketEventHandler>>();

  constructor(id = "socket-local") {
    this.id = id;
  }

  on(event: string, handler: SocketEventHandler): this {
    const handlers = this.handlers.get(event) ?? new Set<SocketEventHandler>();
    handlers.add(handler);
    this.handlers.set(event, handlers);
    return this;
  }

  removeAllListeners(): this {
    this.handlers.clear();
    return this;
  }

  connect(): this {
    return this;
  }

  disconnect(): this {
    if (!this.connected) {
      return this;
    }

    this.disconnectCalls += 1;
    this.trigger("disconnect");
    return this;
  }

  emit(event: string, payload?: unknown): boolean {
    this.emitted.push({ event, payload });
    return true;
  }

  trigger(event: string, payload?: unknown): void {
    if (event === "connect") {
      this.connected = true;
    }

    if (event === "disconnect") {
      this.connected = false;
    }

    for (const handler of this.handlers.get(event) ?? []) {
      handler(payload);
    }
  }
}

function setupFakeDom(): void {
  function HTMLElement() {}
  function HTMLIFrameElement() {}

  const fakeWindow = {
    Event: function Event() {},
    HTMLElement,
    HTMLIFrameElement,
    Node: function Node() {},
  };
  const fakeDocument = {
    activeElement: null,
    defaultView: fakeWindow,
    nodeType: 9,
    addEventListener() {},
    removeEventListener() {},
    createElement(tagName: string) {
      return createFakeElement(tagName, fakeDocument);
    },
  };

  Object.assign(globalThis, {
    document: fakeDocument,
    HTMLElement,
    HTMLIFrameElement,
    IS_REACT_ACT_ENVIRONMENT: true,
    window: fakeWindow,
  });
}

function createFakeElement(
  tagName = "div",
  ownerDocument: unknown = globalThis.document
): Element {
  const childNodes: Node[] = [];

  return {
    childNodes,
    namespaceURI: "http://www.w3.org/1999/xhtml",
    nodeName: tagName.toUpperCase(),
    nodeType: 1,
    ownerDocument,
    tagName: tagName.toUpperCase(),
    addEventListener() {},
    appendChild(child: Node): Node {
      childNodes.push(child);
      return child;
    },
    insertBefore(child: Node): Node {
      childNodes.push(child);
      return child;
    },
    removeAttribute() {},
    removeChild(child: Node): Node {
      const childIndex = childNodes.indexOf(child);
      if (childIndex >= 0) {
        childNodes.splice(childIndex, 1);
      }

      return child;
    },
    removeEventListener() {},
    setAttribute() {},
  } as unknown as Element;
}

function mountMultiplayerHook(): {
  getCurrent: () => UseMultiplayerRoomResult;
  unmount: () => void;
} {
  let current: UseMultiplayerRoomResult | null = null;
  const root: Root = createRoot(createFakeElement());

  function TestComponent(): null {
    current = useMultiplayerRoom();
    return null;
  }

  act(() => {
    root.render(React.createElement(TestComponent));
  });

  return {
    getCurrent: () => {
      if (current === null) {
        throw new Error("Hook was not rendered.");
      }

      return current;
    },
    unmount: () => {
      act(() => {
        root.unmount();
      });
    },
  };
}

function setupHookWithSocket(socket = new FakeSocket()): {
  hook: ReturnType<typeof mountMultiplayerHook>;
  socket: FakeSocket;
} {
  vi.mocked(getMultiplayerServerUrl).mockReturnValue("ws://localhost:3001");
  vi.mocked(createMultiplayerSocket).mockReturnValue(
    socket as unknown as Socket
  );

  return {
    hook: mountMultiplayerHook(),
    socket,
  };
}

function createPosition(x: number, z: number): Position {
  return { x, y: 0.34, z };
}

function createPlayer(
  id: string,
  nickname: string,
  position = createPosition(0, 0)
): MultiplayerPlayer {
  return {
    id,
    nickname,
    color: "#38bdf8",
    joinedAt: 1_000,
    state: "lobby",
    position,
    score: 0,
    elapsedSeconds: 0,
    closeCalls: 0,
    shieldSaves: 0,
  };
}

function createRoom(players: MultiplayerPlayer[]): MultiplayerRoom {
  return {
    roomCode: "1234",
    hostId: players[0]?.id ?? "socket-local",
    players,
    status: "lobby",
    seed: null,
    countdownStartedAt: null,
    matchStartedAt: null,
    roundId: 0,
    winnerId: null,
    createdAt: 1_000,
    updatedAt: 1_000,
  };
}

beforeAll(() => {
  setupFakeDom();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("useMultiplayerRoom", () => {
  it("queues create room until the socket connects and flushes it once", () => {
    const { hook, socket } = setupHookWithSocket();

    act(() => {
      hook.getCurrent().setNickname("Ada");
      hook.getCurrent().createRoom();
    });

    expect(socket.emitted).toEqual([]);

    act(() => {
      socket.trigger("connect");
    });

    expect(socket.emitted).toEqual([
      { event: "room:create", payload: { nickname: "Ada" } },
    ]);

    act(() => {
      socket.trigger("connect");
    });

    expect(socket.emitted).toHaveLength(1);
    hook.unmount();
  });

  it("keeps only the latest pending create or join action before connect", () => {
    const { hook, socket } = setupHookWithSocket();

    act(() => {
      hook.getCurrent().setNickname("Lin");
      hook.getCurrent().createRoom();
      hook.getCurrent().joinRoom(" 98-76 ");
    });

    expect(socket.emitted).toEqual([]);

    act(() => {
      socket.trigger("connect");
    });

    expect(socket.emitted).toEqual([
      {
        event: "room:join",
        payload: { roomCode: "9876", nickname: "Lin" },
      },
    ]);
    hook.unmount();
  });

  it("resets after room left and suppresses only the intentional disconnect", () => {
    const { hook, socket } = setupHookWithSocket();
    const room = createRoom([
      createPlayer("socket-local", "Ada"),
      createPlayer("socket-remote", "Lin"),
    ]);

    act(() => {
      hook.getCurrent().connect();
      socket.trigger("connect");
      socket.trigger("room:state", room);
    });

    act(() => {
      socket.trigger("room:left", { roomCode: room.roomCode });
    });

    expect(socket.disconnectCalls).toBe(1);
    expect(hook.getCurrent().state.room).toBeNull();
    expect(hook.getCurrent().state.error).toBeNull();
    hook.unmount();
  });

  it("applies remote player position updates without a full room state", () => {
    const { hook, socket } = setupHookWithSocket();
    const room = createRoom([
      createPlayer("socket-local", "Ada"),
      createPlayer("socket-remote", "Lin", createPosition(0, 0)),
    ]);

    act(() => {
      hook.getCurrent().connect();
      socket.trigger("connect");
      socket.trigger("room:state", room);
      socket.trigger("player:position", {
        playerId: "socket-remote",
        position: createPosition(3, -2),
      });
    });

    expect(hook.getCurrent().remotePlayers).toEqual([
      expect.objectContaining({
        id: "socket-remote",
        position: createPosition(3, -2),
      }),
    ]);
    hook.unmount();
  });

  it("exposes server clock offset from the latest room timestamp", () => {
    const dateNow = vi.spyOn(Date, "now").mockReturnValue(1_500);
    const { hook, socket } = setupHookWithSocket();
    const room: MultiplayerRoom = {
      ...createRoom([
        createPlayer("socket-local", "Ada"),
        createPlayer("socket-remote", "Lin"),
      ]),
      updatedAt: 2_250,
    };

    try {
      act(() => {
        hook.getCurrent().connect();
        socket.trigger("connect");
        socket.trigger("room:state", room);
      });

      expect(hook.getCurrent().serverNowOffsetMs).toBe(750);
    } finally {
      hook.unmount();
      dateNow.mockRestore();
    }
  });

  it("ignores invalid room payloads", () => {
    const { hook, socket } = setupHookWithSocket();

    act(() => {
      hook.getCurrent().connect();
      socket.trigger("connect");
      socket.trigger("room:state", {
        roomCode: "1234",
        hostId: "socket-local",
        players: [createPlayer("socket-local", "Ada")],
        status: "lobby",
        roundId: 0,
      });
    });

    expect(hook.getCurrent().state.room).toBeNull();
    hook.unmount();
  });

  it("explains that single player works when the multiplayer server is not configured", () => {
    vi.mocked(getMultiplayerServerUrl).mockReturnValue(undefined);
    const hook = mountMultiplayerHook();

    act(() => {
      hook.getCurrent().createRoom();
    });

    expect(hook.getCurrent().state.error?.message).toBe(
      "Multiplayer server is not configured. Single player is ready."
    );
    hook.unmount();
  });

  it("explains that single player works when multiplayer connection fails", () => {
    const { hook, socket } = setupHookWithSocket();

    act(() => {
      hook.getCurrent().createRoom();
      socket.trigger("connect_error");
    });

    expect(hook.getCurrent().state.error?.message).toBe(
      "Could not reach the multiplayer server. Single player still works."
    );
    hook.unmount();
  });

  it("explains recovery options when an active room connection is lost", () => {
    const { hook, socket } = setupHookWithSocket();
    const room = createRoom([
      createPlayer("socket-local", "Ada"),
      createPlayer("socket-remote", "Lin"),
    ]);

    act(() => {
      hook.getCurrent().connect();
      socket.trigger("connect");
      socket.trigger("room:state", room);
      socket.trigger("disconnect");
    });

    expect(hook.getCurrent().state.error?.message).toBe(
      "Connection lost. Start a single run or try multiplayer again."
    );
    hook.unmount();
  });
});
