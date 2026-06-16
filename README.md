# poop-dodge-3d

A browser-first Three.js dodge game. The first target is a local, web-optimized MVP before any public deployment.

## Current Scope

- Desktop keyboard controls
- Mobile touch drag controls
- Responsive full-viewport 3D scene
- Falling obstacle loop
- Collision, score, high score, game over, and restart
- Local high-score persistence
- Sound feedback with a persisted on/off toggle
- Socket.IO room-based multiplayer for up to 10 players
- Server-synchronized countdown and shared round start
- Local build and preview verification
- Web optimization before deployment

No deployment is planned until explicitly approved.

## Tech Stack

- Vite
- React
- TypeScript
- Three.js
- React Three Fiber
- Vitest
- ESLint

## Commands

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

For local multiplayer:

```bash
VITE_MULTIPLAYER_SERVER_URL=http://localhost:5174 npm run dev -- --host localhost --port 5173
npm run server:start
```

## Controls

- Desktop: `WASD` or arrow keys
- Mobile: drag on the game area
- Footer toggle: sound on/off
