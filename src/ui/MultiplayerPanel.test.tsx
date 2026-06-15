import { renderToStaticMarkup } from "react-dom/server";
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { MultiplayerPlayer, MultiplayerRoom } from "../multiplayer/types";
import type { UseMultiplayerRoomResult } from "../multiplayer/useMultiplayerRoom";
import { MultiplayerPanel } from "./MultiplayerPanel";

const noop = () => undefined;

function createPlayer(
  id: string,
  nickname: string,
  state: MultiplayerPlayer["state"],
  score: number
): MultiplayerPlayer {
  return {
    id,
    nickname,
    color: "#f97316",
    joinedAt: score,
    state,
    position: { x: 0, y: 0.34, z: 0 },
    score,
    elapsedSeconds: score / 10,
    closeCalls: score + 1,
    shieldSaves: score + 2,
  };
}

function createRoom(
  status: MultiplayerRoom["status"],
  players = [
    createPlayer("host", "Host", "lobby", 12),
    createPlayer("guest", "Guest", "lobby", 9),
  ]
): MultiplayerRoom {
  return {
    roomCode: "4821",
    hostId: "host",
    players,
    status,
    seed: status === "lobby" ? null : 4,
    countdownStartedAt: status === "countdown" ? 10_000 : null,
    matchStartedAt: status === "countdown" ? 13_000 : 20_000,
    roundId: 2,
    winnerId: status === "results" ? "guest" : null,
    createdAt: 1_000,
    updatedAt: 2_000,
  };
}

function createMultiplayer(
  room: MultiplayerRoom | null,
  overrides: Partial<UseMultiplayerRoomResult> = {}
): UseMultiplayerRoomResult {
  return {
    state: {
      view: room?.status ?? "entry",
      nickname: "Ada",
      room,
      connected: room !== null,
      connecting: false,
      error: null,
      survivorListOpen: false,
    },
    room,
    localPlayerId: "host",
    remotePlayers: [],
    serverNowOffsetMs: 0,
    connect: vi.fn(),
    setNickname: vi.fn(),
    createRoom: vi.fn(),
    joinRoom: vi.fn(),
    leaveRoom: vi.fn(),
    startRoom: vi.fn(),
    sendPosition: vi.fn(),
    sendStats: vi.fn(),
    sendEliminated: vi.fn(),
    reset: vi.fn(),
    ...overrides,
  };
}

type FakeEventListener = (event: Event) => void;

class FakeDomEvent {
  readonly type: string;
  bubbles: boolean;
  defaultPrevented = false;
  target: FakeNode | null = null;
  currentTarget: FakeNode | null = null;

  constructor(type: string, init: EventInit = {}) {
    this.type = type;
    this.bubbles = init.bubbles ?? false;
  }

  preventDefault(): void {
    this.defaultPrevented = true;
  }

  stopPropagation(): void {
    this.bubbles = false;
  }
}

class FakeNode {
  readonly childNodes: FakeNode[] = [];
  readonly listeners = new Map<string, Set<FakeEventListener>>();
  parentNode: FakeNode | null = null;
  textContent = "";

  constructor(
    readonly nodeType: number,
    readonly nodeName: string,
    readonly ownerDocument: FakeDocument | null
  ) {}

  addEventListener(event: string, listener: FakeEventListener): void {
    const listeners = this.listeners.get(event) ?? new Set<FakeEventListener>();
    listeners.add(listener);
    this.listeners.set(event, listeners);
  }

  removeEventListener(event: string, listener: FakeEventListener): void {
    this.listeners.get(event)?.delete(listener);
  }

  appendChild<TNode extends FakeNode>(child: TNode): TNode {
    child.parentNode = this;
    this.childNodes.push(child);
    return child;
  }

  insertBefore<TNode extends FakeNode>(child: TNode, before: FakeNode | null = null): TNode {
    child.parentNode = this;

    if (before === null) {
      this.childNodes.push(child);
      return child;
    }

    const beforeIndex = this.childNodes.indexOf(before);
    if (beforeIndex >= 0) {
      this.childNodes.splice(beforeIndex, 0, child);
    } else {
      this.childNodes.push(child);
    }

    return child;
  }

  removeChild<TNode extends FakeNode>(child: TNode): TNode {
    const childIndex = this.childNodes.indexOf(child);
    if (childIndex >= 0) {
      this.childNodes.splice(childIndex, 1);
    }

    child.parentNode = null;
    return child;
  }

  dispatchEvent(event: Event): boolean {
    const fakeEvent = event as Event & {
      bubbles?: boolean;
      currentTarget?: FakeNode | null;
      target?: FakeNode | null;
    };

    fakeEvent.target = fakeEvent.target ?? this;

    this.dispatchEventAtNode(event, fakeEvent, this);

    return !event.defaultPrevented;
  }

  private dispatchEventAtNode(
    event: Event,
    fakeEvent: Event & {
      bubbles?: boolean;
      currentTarget?: FakeNode | null;
      target?: FakeNode | null;
    },
    currentNode: FakeNode
  ): void {
    fakeEvent.currentTarget = currentNode;
    for (const listener of currentNode.listeners.get(event.type) ?? []) {
      listener(event);
    }

    if (fakeEvent.bubbles === true && currentNode.parentNode !== null) {
      this.dispatchEventAtNode(event, fakeEvent, currentNode.parentNode);
    }
  }
}

class FakeElement extends FakeNode {
  readonly attributes = new Map<string, string>();
  readonly namespaceURI = "http://www.w3.org/1999/xhtml";
  readonly style: Record<string, string> = {};
  disabled = false;
  id = "";
  type = "";
  value = "";

  constructor(tagName: string, ownerDocument: FakeDocument) {
    super(1, tagName.toUpperCase(), ownerDocument);
    this.tagName = tagName.toUpperCase();
  }

  readonly tagName: string;

  setAttribute(name: string, value: string): void {
    this.attributes.set(name, value);
    if (name === "id") {
      this.id = value;
    }
    if (name === "type") {
      this.type = value;
    }
    if (name === "disabled") {
      this.disabled = true;
    }
  }

  getAttribute(name: string): string | null {
    return this.attributes.get(name) ?? null;
  }

  removeAttribute(name: string): void {
    this.attributes.delete(name);
    if (name === "disabled") {
      this.disabled = false;
    }
  }
}

class FakeTextNode extends FakeNode {
  constructor(text: string, ownerDocument: FakeDocument) {
    super(3, "#text", ownerDocument);
    this.textContent = text;
  }
}

class FakeDocument extends FakeNode {
  activeElement: FakeElement | null = null;
  defaultView: Record<string, unknown> | null = null;

  constructor() {
    super(9, "#document", null);
  }

  createElement(tagName: string): FakeElement {
    return new FakeElement(tagName, this);
  }

  createTextNode(text: string): FakeTextNode {
    return new FakeTextNode(text, this);
  }
}

const previousGlobals = {
  document: globalThis.document,
  Element: globalThis.Element,
  Event: globalThis.Event,
  HTMLElement: globalThis.HTMLElement,
  HTMLIFrameElement: globalThis.HTMLIFrameElement,
  HTMLInputElement: globalThis.HTMLInputElement,
  HTMLSelectElement: globalThis.HTMLSelectElement,
  HTMLTextAreaElement: globalThis.HTMLTextAreaElement,
  Node: globalThis.Node,
  window: globalThis.window,
};

function setupFakeDom(): void {
  const fakeDocument = new FakeDocument();
  const fakeWindow = {
    Event: FakeDomEvent,
    Element: FakeElement,
    HTMLElement: FakeElement,
    HTMLIFrameElement: class HTMLIFrameElement extends FakeElement {},
    HTMLInputElement: FakeElement,
    HTMLSelectElement: FakeElement,
    HTMLTextAreaElement: FakeElement,
    Node: FakeNode,
    document: fakeDocument,
  };
  fakeDocument.defaultView = fakeWindow;

  Object.assign(globalThis, {
    document: fakeDocument,
    Element: FakeElement,
    Event: FakeDomEvent,
    HTMLElement: FakeElement,
    HTMLIFrameElement: fakeWindow.HTMLIFrameElement,
    HTMLInputElement: FakeElement,
    HTMLSelectElement: FakeElement,
    HTMLTextAreaElement: FakeElement,
    IS_REACT_ACT_ENVIRONMENT: true,
    Node: FakeNode,
    window: fakeWindow,
  });
}

function restoreDom(): void {
  Object.assign(globalThis, previousGlobals);
}

function getTextContent(node: FakeNode): string {
  return `${node.textContent}${node.childNodes.map(getTextContent).join("")}`;
}

function findElements(
  root: FakeNode,
  predicate: (element: FakeElement) => boolean
): FakeElement[] {
  const matches: FakeElement[] = [];

  for (const child of root.childNodes) {
    if (child instanceof FakeElement && predicate(child)) {
      matches.push(child);
    }

    matches.push(...findElements(child, predicate));
  }

  return matches;
}

function findButtonByText(root: FakeElement, text: string): FakeElement {
  const button = findElements(
    root,
    (element) => element.tagName === "BUTTON" && getTextContent(element).includes(text)
  )[0];

  if (button === undefined) {
    throw new Error(`Button not found: ${text}`);
  }

  return button;
}

function findInputById(root: FakeElement, id: string): FakeElement {
  const input = findElements(
    root,
    (element) => element.tagName === "INPUT" && element.id === id
  )[0];

  if (input === undefined) {
    throw new Error(`Input not found: ${id}`);
  }

  return input;
}

function mountPanel(
  multiplayer: UseMultiplayerRoomResult,
  onLeaveRoom = () => undefined
): {
  rootElement: FakeElement;
  unmount: () => void;
} {
  const fakeDocument = globalThis.document as unknown as FakeDocument;
  const rootElement = fakeDocument.createElement("div");
  const root: Root = createRoot(rootElement as unknown as Element);

  act(() => {
    root.render(
      <MultiplayerPanel
        multiplayer={multiplayer}
        localPlayerId={multiplayer.localPlayerId}
        onBackToSingle={noop}
        onLeaveRoom={onLeaveRoom}
      />
    );
  });

  return {
    rootElement,
    unmount: () => {
      act(() => {
        root.unmount();
      });
    },
  };
}

function click(element: FakeElement): void {
  act(() => {
    element.dispatchEvent(new window.Event("click", { bubbles: true }));
  });
}

function getReactProps(element: FakeElement): Record<string, unknown> {
  const elementRecord = element as unknown as Record<string, unknown>;
  const propsKey = Object.keys(elementRecord).find((key) =>
    key.startsWith("__reactProps$")
  );

  if (propsKey === undefined) {
    return {};
  }

  return elementRecord[propsKey] as Record<string, unknown>;
}

function inputValue(element: FakeElement, value: string): void {
  element.value = value;
  act(() => {
    const onChange = getReactProps(element).onChange;

    if (typeof onChange === "function") {
      onChange({ currentTarget: element, target: element });
      return;
    }

    element.dispatchEvent(new window.Event("input", { bubbles: true }));
    element.dispatchEvent(new window.Event("change", { bubbles: true }));
  });
}

beforeAll(() => {
  setupFakeDom();
});

afterAll(() => {
  restoreDom();
});

describe("MultiplayerPanel", () => {
  it("renders the room code, player list, and host start action in lobby", () => {
    const html = renderToStaticMarkup(
      <MultiplayerPanel
        multiplayer={createMultiplayer(createRoom("lobby"))}
        localPlayerId="host"
        onBackToSingle={noop}
        onLeaveRoom={noop}
      />
    );

    expect(html).toContain("4821");
    expect(html).toContain("Host");
    expect(html).toContain("Guest");
    expect(html).toContain("Start");
  });

  it("renders synchronized countdown text from server-adjusted match start time", () => {
    const dateNow = vi.spyOn(Date, "now").mockReturnValue(10_250);

    try {
      const html = renderToStaticMarkup(
        <MultiplayerPanel
          multiplayer={createMultiplayer(createRoom("countdown"), {
            serverNowOffsetMs: 1_000,
          })}
          localPlayerId="host"
          onBackToSingle={noop}
          onLeaveRoom={noop}
        />
      );

      expect(html).toMatch(/countdown-card[^>]*>2</);
      expect(html).toContain("You");
    } finally {
      dateNow.mockRestore();
    }
  });

  it("renders waiting copy instead of countdown timer for late joiners", () => {
    const html = renderToStaticMarkup(
      <MultiplayerPanel
        multiplayer={createMultiplayer(
          createRoom("countdown", [
            createPlayer("host", "Host", "waitingNextRound", 12),
            createPlayer("guest", "Guest", "countdown", 9),
          ])
        )}
        localPlayerId="host"
        onBackToSingle={noop}
        onLeaveRoom={noop}
      />
    );

    expect(html).toContain("Waiting for next round");
    expect(html).toContain("Leave room");
    expect(html).not.toContain("Get ready");
    expect(html).not.toContain('role="timer"');
  });

  it("renders winner and per-player metrics in results", () => {
    const html = renderToStaticMarkup(
      <MultiplayerPanel
        multiplayer={createMultiplayer(
          createRoom("results", [
            createPlayer("host", "Host", "eliminated", 12),
            createPlayer("guest", "Guest", "alive", 30),
          ])
        )}
        localPlayerId="host"
        onBackToSingle={noop}
        onLeaveRoom={noop}
      />
    );

    expect(html).toContain("Winner");
    expect(html).toContain("Guest");
    expect(html).toContain("Close calls");
    expect(html).toContain("Shield saves");
    expect(html).toContain("Start next round");
  });

  it("renders neutral copy for a playing room panel", () => {
    const html = renderToStaticMarkup(
      <MultiplayerPanel
        multiplayer={createMultiplayer(createRoom("playing"))}
        localPlayerId="host"
        onBackToSingle={noop}
        onLeaveRoom={noop}
      />
    );

    expect(html).toContain("Round in progress");
    expect(html).not.toContain("next task");
    expect(html).not.toContain("integration");
  });

  it("renders room errors inside an existing room panel", () => {
    const html = renderToStaticMarkup(
      <MultiplayerPanel
        multiplayer={createMultiplayer(createRoom("lobby"), {
          state: {
            view: "lobby",
            nickname: "Ada",
            room: createRoom("lobby"),
            connected: true,
            connecting: false,
            error: {
              code: "room_not_ready",
              message: "Need at least two players to start.",
            },
            survivorListOpen: false,
          },
        })}
        localPlayerId="host"
        onBackToSingle={noop}
        onLeaveRoom={noop}
      />
    );

    expect(html).toContain('role="alert"');
    expect(html).toContain("Need at least two players to start.");
  });

  it("disables create while nickname is missing or connection is busy", () => {
    const missingNicknameHtml = renderToStaticMarkup(
      <MultiplayerPanel
        multiplayer={createMultiplayer(null, {
          state: {
            view: "entry",
            nickname: "",
            room: null,
            connected: false,
            connecting: false,
            error: null,
            survivorListOpen: false,
          },
        })}
        localPlayerId={null}
        onBackToSingle={noop}
        onLeaveRoom={noop}
      />
    );
    const connectingHtml = renderToStaticMarkup(
      <MultiplayerPanel
        multiplayer={createMultiplayer(null, {
          state: {
            view: "entry",
            nickname: "Ada",
            room: null,
            connected: false,
            connecting: true,
            error: null,
            survivorListOpen: false,
          },
        })}
        localPlayerId={null}
        onBackToSingle={noop}
        onLeaveRoom={noop}
      />
    );

    expect(missingNicknameHtml).toContain("disabled");
    expect(connectingHtml).toContain("Creating...");
    expect(connectingHtml).toContain("disabled");
  });

  it("calls create room only when enabled", () => {
    const createRoomSpy = vi.fn();
    const { rootElement, unmount } = mountPanel(
      createMultiplayer(null, {
        createRoom: createRoomSpy,
      })
    );

    click(findButtonByText(rootElement, "Create room"));

    expect(createRoomSpy).toHaveBeenCalledTimes(1);
    unmount();
  });

  it("sanitizes room code input before enabling and submitting join", () => {
    const joinRoomSpy = vi.fn();
    const { rootElement, unmount } = mountPanel(
      createMultiplayer(null, {
        joinRoom: joinRoomSpy,
      })
    );

    click(findButtonByText(rootElement, "Join"));
    inputValue(findInputById(rootElement, "room-code"), "a4b8c2d1");
    click(findButtonByText(rootElement, "Join room"));

    expect(findInputById(rootElement, "room-code").value).toBe("4821");
    expect(joinRoomSpy).toHaveBeenCalledWith("4821");
    unmount();
  });

  it("calls host start and leave from the lobby", () => {
    const startRoomSpy = vi.fn();
    const leaveRoomSpy = vi.fn();
    const onLeaveRoomSpy = vi.fn();
    const { rootElement, unmount } = mountPanel(
      createMultiplayer(createRoom("lobby"), {
        leaveRoom: leaveRoomSpy,
        startRoom: startRoomSpy,
      }),
      onLeaveRoomSpy
    );

    click(findButtonByText(rootElement, "Start"));
    click(findButtonByText(rootElement, "Leave room"));

    expect(startRoomSpy).toHaveBeenCalledTimes(1);
    expect(onLeaveRoomSpy).toHaveBeenCalledTimes(1);
    expect(leaveRoomSpy).not.toHaveBeenCalled();
    unmount();
  });
});
