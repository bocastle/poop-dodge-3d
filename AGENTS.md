# Agent Guide

## Project Goal

Build `poop-dodge-3d` as a web-optimized Three.js dodge game before any public deployment. The first milestone is a polished local web build that runs smoothly on desktop and mobile browsers.

Do not deploy to Vercel, GitHub Pages, app stores, or any public target until the user explicitly approves deployment work.

## Required Brainstorming Gate

Before starting creative or behavioral work, review the `superpowers:brainstorming` workflow and confirm that the current feature has an approved design.

Use this rule for:

- New gameplay features
- UI or visual direction changes
- Control scheme changes
- Scoring, difficulty, or game-loop changes
- Build, deployment, or app-packaging direction changes

Do not scaffold, implement, or refactor feature code until the design has been approved.

## Branching Model

Use this branch flow:

```text
main
  -> develop
      -> feature/<feature-name>
```

Rules:

- `main` is the stable base branch.
- `develop` is the integration branch for completed features.
- Each major feature starts from `develop` on a dedicated `feature/<feature-name>` branch.
- After a feature is completed and verified, merge it back into `develop`.
- Push after each major feature is completed.

Suggested early feature branches:

```text
feature/project-foundation
feature/three-scene
feature/player-controls
feature/obstacles-collision
feature/game-ui
feature/mobile-controls
feature/web-optimization
```

## Parallel Work With Subagents

Use subagents and parallel work only for independent tasks with clear boundaries.

Good parallel tasks:

- Researching Three.js performance patterns
- Drafting UI/gameplay copy
- Reviewing collision or difficulty logic
- Inspecting build/test configuration
- Preparing documentation updates

Avoid parallel edits to the same files or tightly coupled gameplay systems. The main agent owns final integration, verification, merge decisions, and push.

## Commit And Push Rules

Commit and push at the end of each major feature.

Each feature completion must include:

- Verified implementation
- Passing relevant checks
- Updated `docs/handoff.md`
- A retrospective in `docs/retrospectives/`
- Commit on the feature branch
- Push of the feature branch
- Merge into `develop`
- Push of `develop`

Use short, clear commit messages, for example:

```text
Add project foundation
Implement player controls
Add obstacle collision loop
Optimize mobile rendering
```

## Documentation Rules

Keep documentation in English.

Required documentation:

- `docs/handoff.md`: current project state, completed work, next steps, risks, and useful commands
- `docs/retrospectives/YYYY-MM-DD-<feature-name>.md`: short feature retrospective after each major feature

`docs/handoff.md` must be updated whenever a new developer should be able to continue the work without reading the full conversation history.

## Verification Before Completion

Before claiming a feature is complete, run the relevant checks and report the result.

Expected checks once the project is scaffolded:

```text
npm run lint
npm run test
npm run build
npm run preview
```

When visual gameplay exists, verify it in a browser across desktop and mobile-sized viewports before marking the feature complete.

## Web Optimization Target

Optimize for the web first:

- Smooth desktop browser gameplay
- Mobile browser support
- Responsive canvas sizing
- Stable frame pacing
- Lightweight assets
- No unnecessary server dependency
- No deployment until explicitly approved

Keep the game architecture ready for later PWA or mobile app packaging, but do not implement app-store packaging in the initial phase.
