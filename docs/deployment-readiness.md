# Deployment Readiness

## Scope

This document prepares the first web opening for `poop-dodge-3d`. It does not approve or perform deployment. A separate user approval is required before creating a staging or production URL.

## Current Release Candidate

- Release branch: `main`
- Readiness pass: 2026-06-17 Web Open Release Readiness
- App type: browser-first Vite/React/React Three Fiber game
- Multiplayer type: Socket.IO server with in-memory rooms
- Public opening target: web first

## Frontend Hosting Candidates

| Candidate | Fit | Notes |
| --- | --- | --- |
| Vercel | Strong fit | Good Vite support, simple environment variables, preview URLs. |
| Netlify | Strong fit | Good static hosting flow, simple preview deploys. |

## Multiplayer Server Hosting Candidates

| Candidate | Fit | Notes |
| --- | --- | --- |
| Render | Good first choice | Simple Node service deploys. Check cold start and WebSocket behavior on the selected plan. |
| Fly.io | Good technical fit | Strong region control and long-running services. More operational setup than Render. |
| Railway | Good prototype fit | Fast setup. Confirm plan limits before public traffic. |

## Required Environment Variables

### Frontend

| Variable | Example | Purpose |
| --- | --- | --- |
| `VITE_MULTIPLAYER_SERVER_URL` | `https://poop-dodge-3d-server.example.com` | Socket.IO server URL used by the browser client. |

### Multiplayer Server

| Variable | Example | Purpose |
| --- | --- | --- |
| `PORT` | `5174` | HTTP and Socket.IO listen port. The hosting provider may inject this automatically. |
| `CLIENT_ORIGIN` | `https://poop-dodge-3d.example.com` | Allowed browser origin for Socket.IO CORS. |

## Environment Separation

Use separate values for local, staging, and production.

| Environment | Frontend Origin | Server Origin | Notes |
| --- | --- | --- | --- |
| Local | `http://localhost:5173` | `http://localhost:5174` | Matches `.env.example`; used for local dev and QA. |
| Staging | provider preview URL | staging server URL | Used before public opening. |
| Production | final public URL | production server URL | Used only after user approval. |

## CORS Rules

- `CLIENT_ORIGIN` must match the exact frontend origin.
- `localhost` and `127.0.0.1` are different origins. Use the same host form in `CLIENT_ORIGIN` as the frontend URL being tested.
- If testing the frontend at `http://127.0.0.1:5173`, set `CLIENT_ORIGIN=http://127.0.0.1:5173` for that server run.
- Staging and production must not share the same server environment unless that is explicitly approved.
- If the frontend origin changes, update `CLIENT_ORIGIN` before testing multiplayer.
- Single-player must remain playable when the multiplayer server is unavailable.

## Socket.IO Release Checks

- Create room returns a 4-digit room code.
- Join room accepts a valid 4-digit room code.
- The host can start a synchronized `3 -> 2 -> 1 -> START` countdown.
- Late joiners during an active round wait for the next round.
- Disconnecting an alive player during an active round marks that player eliminated and emits the updated room or results state.
- If the host leaves or disconnects while other players remain, host status transfers to the earliest remaining connected player.
- After host transfer, the remaining host can start the next synchronized countdown.
- If only one active player remains after disconnects, the round settles into results with the remaining player as winner.
- Leaving a room returns to the single/multiplayer choice screen.
- Stopping the server produces a clear multiplayer error while preserving single-player.
- The 11th player is rejected because rooms are capped at 10 players.

## Deployment Go/No-Go Criteria

### Go

- Automated verification passes.
- Browser QA has no release-blocking console errors.
- Single-player works without the multiplayer server.
- Multiplayer room create/join/countdown path works in staging.

### Go With Notes

- Safari desktop or real-device mobile verification is not run, but Chrome desktop and responsive QA pass.
- Known limitations are documented and do not block first public feedback.

### No-Go

- Build, lint, tests, or server typecheck fails.
- The app loads to a blank screen.
- Single-player cannot start.
- Multiplayer failure blocks single-player.
- Staging Socket.IO cannot connect because of environment or CORS configuration.

## Deferred Production Risks

- Rooms are in memory and disappear on server restart.
- Idle-room cleanup is implemented in `cleanupIdleRooms` in `server/rooms.ts`, but the running server in `server/index.ts` does not wire a scheduler for it yet.
- There is no login or durable identity.
- There is no reconnect grace.
- There is no anti-cheat or inbound position rate limiting.
- Real-device mobile QA is still required before broader promotion.
