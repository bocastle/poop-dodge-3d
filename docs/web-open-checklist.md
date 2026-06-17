# Web Open Checklist

## Scope

Use this checklist before opening the web MVP publicly. Deployment itself is out of scope until explicitly approved.

## Local Commands

- [ ] Install dependencies: `npm install`
- [ ] Start web app: `npm run dev`
- [ ] Start multiplayer server: `npm run server:start`
- [ ] Optional preview build: `npm run build` then `npm run preview`

## Environment

- [ ] `VITE_MULTIPLAYER_SERVER_URL` points to the multiplayer server when multiplayer is being tested.
- [ ] `PORT` is set for the multiplayer server when the default `5174` is not used.
- [ ] `CLIENT_ORIGIN` matches the web app origin for Socket.IO CORS.

## Browser QA

- [ ] Desktop Chrome: ready screen, single-player start, retry, sound toggle.
- [ ] Desktop Safari: ready screen, single-player start, retry, sound toggle.
- [ ] Mobile portrait `390x844`: no horizontal or vertical page overflow on ready and game-over screens.
- [ ] Mobile landscape `667x375`: controls and retry actions remain visible.
- [ ] Reduced motion enabled: UI animation is reduced and the game remains usable.

## Multiplayer QA

- [ ] Server not configured: multiplayer shows a clear message and single player still starts.
- [ ] Server stopped: multiplayer shows a clear message and single player still starts.
- [ ] Create room: host sees a 4-digit room code.
- [ ] Join room: guest can join with the 4-digit room code.
- [ ] Countdown: all active players see `3 -> 2 -> 1 -> START`.
- [ ] Max room size: the server rejects the 11th player.
- [ ] Leave room: user returns to the single/multiplayer choice screen.

## Release Blockers

- [ ] No console errors in the checked browser path.
- [ ] `npm run lint` passes.
- [ ] `npm run test` passes.
- [ ] `npm run build` passes.
- [ ] `npm run server:check` passes.

## Known Deferred Risks

- No login or durable identity.
- Multiplayer rooms are in memory and vanish on server restart.
- No reconnect grace or anti-cheat.
- Real-device mobile testing is still required before a wider public launch.
