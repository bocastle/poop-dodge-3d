# Responsive Game Shell Design

## Goal

Make the game feel intentionally responsive across small mobile phones, standard mobile phones, tablets, and desktop browsers. The current small-mobile multiplayer entry fix prevents one known overflow, but the next pass should replace panel-specific compression with a consistent responsive layout system for the full game shell.

Success means every primary screen fits and remains playable from `320x568` upward, without horizontal page overflow, hidden critical buttons, or cramped controls.

## Approved Direction

Use a full responsive game shell rework.

This approach treats the canvas, HUD, panels, controls, and survivor list as one layout system instead of repeatedly patching individual overflowing panels. The responsive rules should be broad enough to cover existing screens and future game overlays.

Rejected alternatives:

- Extending the current narrow panel patch would be faster, but it would keep creating one-off rules for each new overflow.
- Building a separate mobile UI would give maximum control, but it is too large for the current web-open milestone.

## Scope

In scope:

- Normalize viewport sizing around modern mobile browser units and safe areas.
- Replace fixed panel and score widths with fluid constraints.
- Keep touch targets usable on small phones.
- Make HUD rows, status chips, controls, and panels adapt together.
- Keep the survivor list collapsed by default on mobile and ensure the collapsed/expanded states do not cover critical controls.
- Verify single-player and multiplayer entry, lobby, countdown, playing, results, and game-over states across target viewports.

Out of scope:

- New gameplay mechanics.
- New visual art direction.
- Separate native app layouts.
- Deployment changes.
- Multiplayer backend changes.

## Target Viewports

The implementation should verify at least these browser sizes:

- `320x568`: smallest supported phone baseline.
- `360x640`: common compact Android baseline.
- `375x667`: small iPhone baseline.
- `390x844`: modern iPhone portrait baseline.
- `667x375`: mobile landscape baseline.
- `768x1024`: tablet portrait baseline.
- `1280x720`: desktop baseline.

## Layout Architecture

### Game Shell

`game-shell` remains the full-screen application root. It should use dynamic viewport units with safe-area padding and avoid requiring a fixed minimum height that exceeds small mobile screens.

The shell should expose responsive sizing through CSS custom properties, for example:

- `--shell-pad-x`
- `--shell-pad-y`
- `--panel-max-width`
- `--control-min-height`
- `--hud-gap`

These variables should change at viewport breakpoints instead of scattering unrelated magic numbers through the stylesheet.

### Canvas

The canvas should continue filling the shell. The responsive pass should not change gameplay coordinates unless browser checks show that the arena framing blocks play on a target viewport.

Canvas checks should focus on:

- No blank first paint.
- Player visible at ready and playing states.
- Hazards not visually hiding critical HUD controls.
- Touch drag still moves the player on mobile-sized viewports.

### HUD

The HUD should stay readable without becoming the dominant screen element. Score cards may move from four columns to two columns or compact rows depending on width and height.

On short landscape screens, non-critical labels can shrink or hide before critical values and action buttons are affected.

### Panels

Panels should use fluid width:

```css
width: min(100%, var(--panel-max-width));
```

Panel padding, gaps, headings, summaries, inputs, and buttons should scale through shared variables. Existing one-off rules for `.multiplayer-panel[data-panel="multiplayer-entry"]` should be replaced or reduced once the general system handles the same viewport.

### Controls

Controls and buttons must remain tappable. The minimum touch target should not be reduced below practical mobile size just to make a layout fit. If vertical space is tight, copy and decorative spacing should compress before primary actions do.

### Survivor List

The survivor list should keep the current mobile collapsed behavior. The responsive pass should ensure:

- Collapsed toggle stays reachable.
- Expanded panel does not push the page or cover required action buttons.
- Up to 10 players remain readable through internal scrolling where needed.

## Component Impact

Expected files:

- `src/styles.css`: primary responsive layout work.
- `src/app/survivorListViewport.ts`: only if the mobile collapse breakpoint changes.
- `src/app/App.test.ts`: update only if survivor list breakpoint logic changes.
- `src/ui/*` tests: update only if semantic markup changes.

The preferred implementation is CSS-first. React component changes should be limited to cases where markup structure blocks a robust responsive layout.

## Data Flow

No game state or multiplayer data flow should change.

The responsive pass is presentational. It should preserve:

- Single-player start, game over, and restart behavior.
- Multiplayer create/join/start flow.
- Countdown and result flow.
- Survivor list collapsed/open state handling.
- Sound toggle behavior.

## Error Handling

The pass should not introduce new runtime error states. Browser verification should watch for:

- React key or hydration warnings.
- Canvas rendering errors.
- Layout measurements that create page scroll or horizontal overflow.
- Buttons rendered outside the visual viewport.

Known non-blocking warnings, such as the existing Three `Clock` deprecation warning, should not block this work unless a new warning is introduced.

## Testing And Verification

Automated checks:

- `npm run lint`
- `npm run test`
- `npm run build`
- `npm run server:check`

Browser checks:

- Run the app locally.
- Verify the target viewports listed above.
- Inspect single-player ready, playing, and game-over screens.
- Inspect multiplayer entry, lobby, countdown, playing, and results screens where practical.
- Confirm there is no horizontal overflow.
- Confirm critical buttons are visible and clickable/tappable.
- Confirm mobile survivor list collapsed and expanded states remain usable.

Public deployment should not be claimed fixed until Vercel redeploys and the deployed URL is checked after the main branch is updated.

## Acceptance Criteria

- No target viewport has horizontal overflow.
- No target viewport hides primary actions below the visible area.
- `320x568` and `360x640` work without panel-specific emergency compression.
- Mobile landscape keeps game-over/retry and multiplayer actions reachable.
- Survivor list remains usable for up to 10 players.
- Existing tests pass.
- The implementation updates `docs/handoff.md` and adds a retrospective when the feature is completed.
