import type { MultiplayerRoom, RoomErrorPayload, RoomStatus } from "./types";

export type MultiplayerView =
  | "entry"
  | "nickname"
  | "createOrJoin"
  | "lobby"
  | "countdown"
  | "playing"
  | "results";

export type MultiplayerClientState = {
  view: MultiplayerView;
  nickname: string;
  room: MultiplayerRoom | null;
  connected: boolean;
  connecting: boolean;
  error: RoomErrorPayload | null;
  survivorListOpen: boolean;
};

export type MultiplayerClientAction =
  | { type: "setNickname"; nickname: string }
  | { type: "connectStart" }
  | { type: "connectSuccess" }
  | { type: "connectFailed"; error: RoomErrorPayload }
  | { type: "roomState"; room: MultiplayerRoom }
  | { type: "setError"; error: RoomErrorPayload | null }
  | { type: "setView"; view: MultiplayerView }
  | { type: "toggleSurvivorList" }
  | { type: "reset" };

export const initialMultiplayerClientState: MultiplayerClientState = {
  view: "entry",
  nickname: "",
  room: null,
  connected: false,
  connecting: false,
  error: null,
  survivorListOpen: false,
};

const roomStatusView: Record<RoomStatus, MultiplayerView> = {
  lobby: "lobby",
  countdown: "countdown",
  playing: "playing",
  results: "results",
};

export function multiplayerRoomReducer(
  state: MultiplayerClientState,
  action: MultiplayerClientAction
): MultiplayerClientState {
  switch (action.type) {
    case "setNickname":
      return {
        ...state,
        nickname: action.nickname,
      };
    case "connectStart":
      return {
        ...state,
        connecting: true,
        error: null,
      };
    case "connectSuccess":
      return {
        ...state,
        connected: true,
        connecting: false,
        error: null,
      };
    case "connectFailed":
      return {
        ...state,
        view: "createOrJoin",
        room: null,
        connected: false,
        connecting: false,
        error: action.error,
      };
    case "roomState":
      return {
        ...state,
        view: roomStatusView[action.room.status],
        room: action.room,
        connected: true,
        connecting: false,
        error: null,
      };
    case "setError":
      return {
        ...state,
        error: action.error,
      };
    case "setView":
      return {
        ...state,
        view: action.view,
      };
    case "toggleSurvivorList":
      return {
        ...state,
        survivorListOpen: !state.survivorListOpen,
      };
    case "reset":
      return initialMultiplayerClientState;
  }
}
