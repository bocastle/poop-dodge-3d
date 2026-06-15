import { afterEach, describe, expect, it, vi } from "vitest";
import { io } from "socket.io-client";
import {
  createMultiplayerSocket,
  getMultiplayerServerUrl,
} from "./socketClient";

vi.mock("socket.io-client", () => ({
  io: vi.fn(() => ({ id: "fake-socket" })),
}));

const mockedIo = vi.mocked(io);

afterEach(() => {
  mockedIo.mockClear();
  vi.unstubAllEnvs();
});

describe("socket client", () => {
  it("reads the multiplayer server url from Vite env", () => {
    vi.stubEnv("VITE_MULTIPLAYER_SERVER_URL", "  ws://localhost:3001  ");

    expect(getMultiplayerServerUrl()).toBe("ws://localhost:3001");
  });

  it("returns undefined when the multiplayer server url is blank", () => {
    vi.stubEnv("VITE_MULTIPLAYER_SERVER_URL", "   ");

    expect(getMultiplayerServerUrl()).toBeUndefined();
  });

  it("creates a websocket socket without auto-connecting", () => {
    const socket = createMultiplayerSocket("ws://localhost:3001");

    expect(mockedIo).toHaveBeenCalledWith("ws://localhost:3001", {
      autoConnect: false,
      transports: ["websocket"],
    });
    expect(socket).toEqual({ id: "fake-socket" });
  });
});
