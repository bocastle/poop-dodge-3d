# Pure Doodle Redesign Design

## Goal

Rework `poop-dodge-3d` from a dark prototype arena into a modernized version of the old poop-dodge feeling: a white paper-like playfield, thick doodle outlines, a vulnerable mascot character, readable falling poop hazards, and compact web/mobile HUD polish.

## Design Direction

The selected direction is **C1: Pure Doodle**.

It keeps the old reference's core identity:

- Mostly white field
- Simple falling poop icons
- Small player character
- Immediate arcade readability
- Minimal rule explanation

It upgrades the execution with:

- Deliberate thick black outlines
- Paper/grid surface treatment
- Better character silhouette and expression
- Red dashed landing warnings
- Stronger shadow/contact cues
- Responsive HUD that still feels like game UI, not a landing page

Reference positioning:

- `Doodle Jump`: doodle character appeal and paper-like visual language
- `Crossy Road`: simple repeatable rules, strong mascot readability, fast high-score loop

## Scope

This redesign includes:

- A split scene architecture for doodle visual primitives
- A new doodle player component replacing the single yellow capsule
- A new poop hazard component replacing the plain dodecahedron obstacle
- A paper arena treatment replacing the dark sci-fi board
- Red dashed warning rings and stronger contact shadows
- HUD restyling to match the paper/doodle visual language
- Tests for pure visual/feedback helper functions
- Browser verification across desktop, mobile portrait, and mobile landscape
- Documentation updates and retrospective

This redesign excludes:

- Deployment
- App-store packaging
- Online ranking
- Login or server work
- Ads, payments, analytics, or unlock economy
- External 3D models or remote image assets
- Sound effects

## Architecture

Keep the existing React, Vite, TypeScript, Three.js, and React Three Fiber foundation. The current `GameScene.tsx` does too much visual work inline, so the redesign should split reusable render pieces into small files under `src/game/visuals/`.

The game loop remains in `GameScene.tsx`; pure gameplay logic remains in `logic.ts`. Visual helpers that can be unit tested live in `src/game/visuals/doodleStyle.ts`. Render components receive positions, rotations, and phase state from the scene, but they do not own gameplay rules.

## Visual Components

### Doodle Player

Replace the current capsule player with an egg-shaped mascot composed from Three.js primitives:

- Yellow doodle body
- Black outline shell behind the body
- White eye band or two black eyes
- Small mouth
- Tiny running legs
- Soft contact shadow
- Input-driven lean and squash

The player should read clearly from the current top-down perspective. The character must look intentional even when still.

### Poop Hazard

Replace the current dodecahedron with a poop icon silhouette:

- Stacked rounded brown blobs
- Small top curl or cap
- Black outline shell
- Warm highlight
- Contact shadow as it nears the floor

Render hazards as a capped list of grouped primitives instead of a single instanced mesh, because the poop silhouette needs stacked shapes, outline shells, highlights, and per-hazard shadows to remain readable.

### Paper Arena

Replace the dark arena with a paper field:

- White/off-white floor
- Subtle grid lines
- Thick black border
- Slight perspective depth
- Soft grey drop shadow

Avoid a plain blank white rectangle; the surface needs enough structure to look designed.

### Warning Cues

Warnings should be red dashed landing rings rather than translucent sci-fi circles. The ring size should scale with hazard radius and intensity should increase as the hazard nears the floor.

### HUD

Restyle the overlay to paper labels:

- White cards
- Thick black borders
- Short block shadows
- Compact score/best/dodged/time layout
- Start and restart buttons that match the doodle theme

The HUD must stay mobile-safe and must not hide the player more than necessary.

## Gameplay Feel

The rules do not change. The redesign should improve feel through visual feedback:

- Idle player subtly bobs or rotates enough to feel alive
- Moving player leans more visibly than the current capsule
- The legs should animate or alternate while moving
- Hit should keep the existing camera shake but the scene should visually read as impact
- Warning rings should make near-term danger clear without cluttering the field

## Testing

Automated tests should cover pure helper logic:

- Doodle outline scale values
- Warning ring dash/intensity state
- Player motion state derived from input
- Hazard visual state derived from height/radius

Manual/browser verification should cover:

- Desktop `1280x720`
- Mobile portrait around `390x844`
- Mobile landscape around `667x375`
- Ready, playing, game-over, and restart states
- No horizontal overflow
- Player is visible and recognizable
- Hazards are recognizable as poop icons
- Red warning rings do not obscure the player
- No console errors

## Acceptance Criteria

- The player no longer appears as a plain yellow capsule.
- The game immediately reads as a modernized doodle poop-dodge game.
- The old reference is recognizable in spirit without copying its raw Windows-era look.
- The scene remains performant with the current max obstacle pressure.
- `npm run lint`, `npm run test`, and `npm run build` pass.
- Browser verification screenshots are captured or summarized in the handoff.
