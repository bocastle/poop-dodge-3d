/// <reference types="vite/client" />

import { io, type Socket } from "socket.io-client";

export function getMultiplayerServerUrl(): string | undefined {
  const serverUrl = (
    import.meta.env.VITE_MULTIPLAYER_SERVER_URL as string | undefined
  )?.trim();

  return serverUrl === "" ? undefined : serverUrl;
}

export function createMultiplayerSocket(serverUrl: string): Socket {
  return io(serverUrl, {
    autoConnect: false,
    transports: ["websocket"],
  });
}
