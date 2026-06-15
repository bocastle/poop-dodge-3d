# Handoff

## Current State

- Repository: `poop-dodge-3d`
- Current branch: `feature/pure-doodle-redesign`
- Integration branch: `develop`
- Remote: `https://github.com/bocastle/poop-dodge-3d.git`
- Project status: local web MVP implemented. The C1 Pure Doodle redesign, Close Call Combo/Shield pass, Game Feel Shield Impact pass, Multiplayer Room MVP, and Fun Feedback pass are implemented locally on `feature/pure-doodle-redesign` and are pending final user review, commit, push, and integration.
- Stacked-work note: multiplayer work is currently stacked on top of the existing Pure Doodle/game-feel branch rather than isolated in a separate feature branch.
- Deployment status: no deployment. The current goal is web optimization before public release.

## Product Direction

Build a browser-first Three.js dodge game. The player avoids falling objects in a 3D scene. The first delivery target is a local web build that works well on desktop and mobile browsers.

The MVP now includes:

- Vite, React, TypeScript, and React Three Fiber foundation
- Full-viewport 3D scene with camera, lights, floor, player, and instanced falling obstacles
- Desktop keyboard controls with `WASD` and arrow keys
- Mobile-oriented pointer drag controls
- Score, best score, dodge count, elapsed time, game-over, and restart state
- Local high-score persistence through `localStorage`
- Responsive HUD and safe-area-aware layout
- Game polish pass with extracted tuning constants, warning floor cues, improved player lean, restrained camera shake, low arena walls, stronger game-over presentation, and short-viewport panel handling
- C1 Pure Doodle redesign with a paper arena, thick doodle outlines, a small yellow mascot player, procedural poop hazards, dashed red landing rings, and a matching paper-label HUD
- Close-call detection for near misses, combo bonus scoring, floating doodle callouts, and one-use shield pickups
- More forgiving shield collection, magnetic shield pickup visuals, shield-save freeze/burst/nearby hazard clear, distinct callout tone classes, and game-over run recap
- HUD status chips for combo multiplier, shield state, and close-call count
- Login-free Socket.IO multiplayer rooms with 4-digit room codes
- Temporary nickname entry, create/join room flow, host-only start, and host transfer
- Max 10 connected players per room
- Server-synchronized `3 -> 2 -> 1 -> START` countdown
- Shared `matchSeed` and `matchStartedAt` for active players in each round
- Late joiners during countdown/playing/results enter `waitingNextRound` until the next round
- Remote players render as smaller secondary doodle figures
- Desktop survivor list and mobile collapsed survivor list
- Multiplayer results screen with winner and player metrics
- Short Web Audio sound cues for round start, countdown, close calls, panic, shield pickup, shield save, game over, and winner feedback
- Faster first-run round tempo with more immediate falling hazard pressure
- Multiplayer result headlines and per-player performance badges
- Mascot mood states for idle, running, panic, shield, and defeated play moments
- Multiplayer server unavailable state while preserving single-player play
- Unit tests for movement, collision, difficulty, score, and high-score logic
- Unit tests for doodle visual helper states and clamped player feedback
- Unit tests for mascot mood/face mapping and game audio recipes
- Unit tests for close-call tiering, combo timing, bonus scoring, shield spawning, shield placement, shield collection helpers, shield pull progress, shield-save clear radius, callout tone, and run-summary copy
- Unit tests for room code helpers, client room reducer, in-memory room state machine, Socket.IO handlers, multiplayer hook behavior, app room transitions, multiplayer panels, multiplayer result copy/badges, survivor list, and deterministic obstacle ids

## Working Agreement

- Keep documentation in English.
- Use `main -> develop -> feature/<feature-name>`.
- Use subagents only for independent work.
- Commit and push after each major feature.
- Write commit messages in Korean.
- Do not commit or push unless the user explicitly asks for that action in the current conversation.
- Update this handoff document whenever the next developer needs fresh context.
- Add a retrospective under `docs/retrospectives/` after each major feature.

## Next Steps

1. Have the user review the latest C1 Pure Doodle, Game Feel Shield Impact, Multiplayer Room MVP, and Fun Feedback pass build locally.
2. If approved, commit with a Korean commit message, push `feature/pure-doodle-redesign`, then merge through `develop` according to the branch workflow.
3. For stronger mobile confidence, test touch controls on a real iOS Safari or Android Chrome device.
4. Decide whether the next feature should focus on multiplayer UX polish, authored assets, model replacement, real-device mobile tuning, result/restart polish, or performance/code splitting.
5. Decide later whether `main` should receive the MVP after user review.

## Useful Commands

```bash
npm install
npm run dev
npm run server:dev
npm run server:start
npm run server:check
npm run lint
npm run test
npm run build
npm run preview
```

For local multiplayer browser checks:

```bash
VITE_MULTIPLAYER_SERVER_URL=http://localhost:5174 npm run dev -- --host localhost --port 5173
npm run server:start
```

## Notes

- Do not deploy until the user explicitly approves deployment.
- Do not start implementation work before the current feature design is approved.
- The production build currently emits a large chunk warning because Three.js is bundled in the game entry. The gzipped JS is about 320.62 kB in the latest verified build.
- Browser verification was performed in Chrome against `npm run preview`.
- The latest mobile layout pass constrains the HUD and start/game-over panel to fit narrow browser widths without horizontal clipping.
- The game-polish pass was browser-checked at desktop `1280x720`, mobile portrait `390x844`, and mobile landscape `667x375`; the landscape game-over panel kept the final score and restart button in view.
- The Pure Doodle redesign was browser-checked against `npm run dev -- --host 127.0.0.1` at desktop `1280x720`, mobile portrait `390x844`, and mobile landscape `667x375`. Ready and playing states had no horizontal or vertical overflow in those checks.
- Desktop game-over was reached during browser verification after 24 seconds of passive play. The `Retry` button restarted the run and removed the game-over state.
- Pure Doodle screenshots were captured during verification under `/private/tmp/poop-doodle-*.png`.
- The Close Call Combo and Shield pass adds near-miss rewards, combo bonus scoring, floating doodle callouts, and one-use shield pickups.
- Browser verification for the Close Call Combo and Shield pass was performed against `npm run dev -- --host 127.0.0.1` at desktop `1280x720`, mobile portrait `390x844`, and mobile landscape `667x375`.
- Close-call count, combo chips, and floating callouts were observed during browser checks. Shield pickup visibility was tuned after the first browser pass so it reads as a camera-facing blue shield badge instead of a small floor token.
- The Game Feel Shield Impact pass improves shield pickup forgiveness, shield-save impact, close-call callout tone, and game-over run recap.
- Browser verification for the Game Feel Shield Impact pass was performed against `npm run dev -- --host 127.0.0.1` at desktop `1280x720`, mobile portrait `390x844`, and mobile landscape `667x375`.
- Desktop browser verification confirmed ready/play/game-over layout, normal keyboard shield pickup collection, `SHIELD!` pickup callout, `SHIELD SAVE!` continuation after collision, game-over recap with `Shield saves 1`, and no runtime console errors.
- Mobile portrait verification confirmed score cards, status chips, controls, and game-over recap fit without horizontal or vertical page overflow.
- Mobile landscape verification found the game-over recap crowding the controls, so the small-height media query now hides recap labels, keeps `run-summary` hidden, tightens recap padding, and keeps the retry button visible.
- Shield collection radius was tuned from `1.02` to `1.12` after browser play showed the pickup still felt hard to collect with normal keyboard input.
- Browser callout observation confirmed `NICE` uses `is-neutral`, `CLOSE` uses `is-hot`, shield events use `is-shield`, and combo callouts promote to hot. The `panic` tone branch is covered by unit tests but was not captured in the browser run.
- Browser console verification for the Game Feel Shield Impact pass found no runtime errors.
- Browser console verification for the Close Call Combo and Shield pass found no runtime errors. Known non-blocking messages remain Vite debug logs, the React DevTools suggestion, and Three's `Clock` deprecation warning.
- Mobile touch logic is implemented, but real-device mobile testing is still recommended before public release, especially for shield pickup collection and high-pressure dodging.
- Some large hazards can visually pass close to the top HUD at the far arena edge. This did not block play in verification, but it is a good camera/spawn-framing tuning candidate for the next polish pass.
- The Fun Feedback pass adds lightweight generated Web Audio cues, faster initial difficulty, result flavor copy, result badges, and reactive mascot mood colors/faces.
- The game still uses procedural primitives only. The current redesign intentionally keeps authored models, image assets, login, ranking, and deployment out of scope.
- Multiplayer uses `socket.io`, `socket.io-client`, and `tsx`.
- Multiplayer server code lives in `server/` and uses in-memory state only. Room data is lost when the server restarts.
- Frontend multiplayer requires `VITE_MULTIPLAYER_SERVER_URL`; `.env.example` documents `VITE_MULTIPLAYER_SERVER_URL`, `PORT`, and `CLIENT_ORIGIN`.
- Single-player works without the multiplayer server. Browser verification confirmed single-player can start while Socket.IO is stopped.
- Local multiplayer browser verification used a real browser host client plus Socket.IO test clients because the in-app browser keeps a single tab. It covered room create/join, lobby sync, synchronized countdown, active match start, late join as `waitingNextRound`, playing disconnect as elimination, winner/results display, host transfer, and guest start after host transfer.
- Mobile multiplayer browser verification covered portrait `390x844` and landscape `667x375`. Portrait confirmed countdown layout and collapsed survivor list; landscape confirmed result buttons stayed within the viewport.
- Browser verification found and fixed a `Leave room` routing issue so leaving a room now returns to the first `Single / Multiplayer` screen after the server acknowledges room leave.
- Browser verification found and fixed duplicate React keys for obstacles created from very large multiplayer seeds. `createSeededObstacle()` now gives obstacles stable `${matchSeed}:${spawnIndex}` ids.
- Browser console verification after the duplicate-key fix found no new runtime errors in a fresh multiplayer round.
- Known multiplayer risks before public release: no persistence, no reconnect grace, no matchmaking, no login, no anti-cheat, no inbound position rate limiting, no idle cleanup scheduler wired in the running server, and no real-device mobile multiplayer test yet.
