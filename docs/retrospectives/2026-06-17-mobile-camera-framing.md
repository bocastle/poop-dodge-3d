# Mobile Camera Framing Retrospective

## What Changed

- Added a responsive camera helper that scales the camera distance on narrow portrait aspect ratios.
- Updated `GameScene` to use the actual canvas aspect ratio each frame instead of a fixed camera position.
- Added regression coverage that projects the player at arena edges into camera space and verifies it remains visible on portrait mobile screens.

## Why

Real-phone testing showed that the game could continue while the local player disappeared off the side of the screen. The root cause was not the HUD or CSS panel layout. The gameplay bounds allowed the player to move to the arena edges, but the fixed perspective camera did not frame the arena width on narrow portrait screens.

## Verification Notes

- The regression test failed with the previous fixed camera because the projected player edge landed outside normalized device coordinates.
- The updated helper keeps the player edge visible for `320x568`, `360x640`, `375x667`, `390x844`, `667x375`, `768x1024`, and `1280x720` projection checks.
- Local browser verification at `390x844` confirmed the canvas fills the viewport without horizontal page overflow.

## Follow-Ups

- Re-check the deployed Vercel URL on the user's real phone after this branch is merged and deployed.
- Continue the broader responsive game shell work so HUD, panels, survivor list, and canvas framing share one responsive system.
