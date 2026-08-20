# AGENTS.md

## Project purpose

Binocular Renderer is an experimental application for personalized binocular image rendering and calibration.

It should let a viewer display paired images side by side and independently transform the left and right views to explore a comfortable and useful binocular alignment.

This project is an experimental visualization/research tool. It must not present itself as a diagnostic or therapeutic medical device.

## MVP technology

- TypeScript
- Vite
- Browser application
- WebGL2 for rendering once GPU transforms are needed
- No backend for the MVP
- Calibration profiles stored locally as JSON

Prefer the smallest implementation that preserves a clean path toward shader-based rendering.

## Architectural boundaries

Keep these concerns separate:

- `calibration`: parameter definitions, presets, persistence and calibration procedures
- `renderer`: image rendering and geometric/photometric transforms
- `stereo`: stereopair source assignment, source presentation and later depth/disparity manipulation
- `ui`: controls and experiment screens

Rendering mathematics must not be embedded directly in UI components.

Source-image assignment and per-eye calibration are separate state. Swapping a stereopair must not silently swap or reinterpret the left/right calibration transforms.

## Parameter semantics

Every transform parameter must:

- have one stable documented meaning
- use an explicit unit
- be independently adjustable where practical
- be serializable
- have a documented neutral/default value

Do not silently reinterpret existing parameters. If semantics change, update the documentation and migration logic.

Initial geometry parameters:

- `offsetX`: horizontal translation in CSS/display pixels
- `offsetY`: vertical translation in CSS/display pixels
- `rotationDeg`: clockwise rotation in degrees
- `scaleX`: horizontal scale multiplier, neutral `1`
- `scaleY`: vertical scale multiplier, neutral `1`

Later parameters may include shear, perspective, local warp, stereo depth gain and photometric transforms.

## Calibration design

Calibration must be reproducible. Prefer simple visual targets before natural images.

The application should eventually support:

1. horizontal alignment
2. vertical alignment
3. rotation
4. scale
5. combined alignment
6. local/nonlinear warp
7. stereoscopic depth tuning
8. A/B or adaptive psychophysical optimization

Do not couple calibration procedures to a single monitor geometry.

## Safety and UX

- Make it easy to reset all transforms.
- Avoid flashing stimuli by default.
- Do not encourage use while driving, walking, or performing safety-critical activities.
- Keep a visible statement that the software is experimental and not medical advice.
- Prefer short calibration sessions and allow the user to stop immediately.

## Engineering rules

- Keep dependencies minimal.
- Prefer pure functions for transform calculations and stereopair semantics.
- Add tests for parameter conversion and transform math.
- Avoid hidden magic constants.
- Store version information in serialized calibration profiles.
- Reject unsupported profile schema versions rather than silently reinterpreting them.
- Never serialize local source images, object URLs or local file paths into calibration profiles.
- Keep sample/default profiles separate from user profiles.
- Use relative browser entry paths when source references must work below the web-server root.
- Do not add a server, database or authentication without a concrete requirement.

## Verification before completing work

For implementation changes, run as applicable:

- dependency install
- TypeScript type check
- tests
- production build

Document any command that cannot be run in the current environment.

## Source of truth

Read these before implementing substantial changes:

- `docs/PROJECT_SPEC.md`
- `docs/VISION_MODEL.md`
- `docs/CALIBRATION.md`
- `docs/PROFILE_SCHEMA.md`
- `docs/STEREO_WORKFLOW.md`
- `docs/ROADMAP.md`

Update documentation in the same change whenever parameter semantics or architecture changes.
