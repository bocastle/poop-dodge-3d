# Web MVP Design

## Goal

Create a local, web-optimized MVP of `poop-dodge-3d` before any deployment work. The game must run in desktop and mobile browsers, support keyboard and touch input, and provide a complete arcade loop: start, play, score, collision, game over, and restart.

## Scope

The MVP includes:

- Vite, React, TypeScript, and React Three Fiber project foundation
- Full-viewport 3D scene with camera, lighting, floor, player, and falling obstacles
- Keyboard controls for desktop
- Touch drag controls for mobile
- Score, high score, elapsed time, dodge count, and game-over state
- Responsive UI overlay
- Basic tests for game math and collision behavior
- Local production build and preview verification

The MVP excludes:

- Public deployment
- App-store packaging
- Online ranking
- Login or server integration
- Ads, payments, or analytics

## Architecture

The app is split into small browser-first units:

- `src/app`: top-level app shell and layout
- `src/game`: Three.js scene, game loop, input handling, entities, and pure game logic
- `src/ui`: screen overlays and controls
- `src/styles.css`: global responsive styling

The render loop lives in the React Three Fiber scene. Collision and movement helpers are pure TypeScript functions so they can be tested without rendering a canvas.

## Gameplay Loop

1. The player starts from a title overlay.
2. During play, obstacles spawn above the floor and fall toward the player.
3. The player moves within a bounded arena.
4. Avoided obstacles increase score and dodge count.
5. Collision triggers game over.
6. Restart resets score, elapsed time, player position, and obstacles.

Difficulty increases over time by raising obstacle speed and spawn pressure.

## Input

Desktop input uses `WASD` and arrow keys. Mobile input uses drag gestures across the game area. Both input paths write into the same normalized movement vector so the player system does not depend on a device-specific control path.

## Web Optimization

The MVP targets stable browser performance:

- Reuse simple mesh geometry and materials
- Keep obstacle count bounded
- Avoid large image or model assets
- Use CSS overlays for UI instead of expensive 3D text
- Resize the canvas with the viewport
- Support reduced-motion users with lighter visual effects

## Error Handling

The app avoids server dependencies. Local high score storage uses `localStorage`; storage failures are ignored so gameplay continues. Unsupported browsers still show the React shell, but gameplay requires WebGL.

## Testing

Tests cover:

- Player movement clamping
- Collision radius behavior
- Difficulty scaling
- Score calculation
- High score comparison

Manual verification covers desktop and mobile-sized browser viewports, start/play/game-over/restart flow, keyboard input, touch input, production build, and local preview.
