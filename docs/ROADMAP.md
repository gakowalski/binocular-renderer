# Roadmap

## M0 — Repository bootstrap

Status: complete

Deliverables:

- repository instructions for agents
- project specification
- transform model
- calibration protocol
- milestone roadmap

Exit criterion: Codex/Copilot can implement the project without inventing core parameter semantics.

## M1 — Two-panel viewer

Status: complete

Deliverables:

- Vite + TypeScript application
- desktop-first fullscreen layout
- left and right viewports
- generated central cross target
- independent image loading for each side
- reset action

Exit criterion: two images/targets can be presented reliably side by side in fullscreen.

## M2 — Translation calibration

Status: complete

Deliverables:

- `offsetX` and `offsetY` for each view
- slider + numeric input + keyboard fine adjustment
- linked/independent modes
- derived relative offsets
- tests for transform calculations

Exit criterion: a translation-only calibration can be reproduced exactly.

## M3 — Rotation and scale

Status: complete

Deliverables:

- `rotationDeg`
- `scaleX`, `scaleY`
- linked uniform scale mode
- grid/frame/radial calibration targets
- stable transform composition order

Exit criterion: affine alignment can be calibrated and reset without drift.

## M4 — Calibration profiles

Status: complete

Deliverables:

- versioned profile schema
- local persistence
- JSON export/import
- profile duplication
- experiment/session notes
- display metadata

Exit criterion: multiple calibration runs can be saved, reloaded and compared.

## M5 — Stereopair workflow

Status: implemented in `codex/m5-stereopair-workflow`, pending review

Deliverables:

- convenient two-file stereopair loader
- source-only swap of left/right images
- common `contain` / `cover` / `fill` presentation
- common crop-position controls
- built-in generated stereopairs for zero disparity, horizontal disparity, vertical mismatch and scale mismatch
- relative `./src/...` browser entry paths for subdirectory-friendly deployment

Exit criterion: arbitrary stereopairs can be evaluated using a saved personalized alignment without reassigning the per-eye calibration state.

## M6 — Physical geometry and stereo analysis

Deliverables:

- monitor physical dimensions
- viewing distance
- px/mm conversion
- derived angular values
- initial `stereoGain` experiment where technically meaningful

Exit criterion: experiment records contain enough geometry to compare results between display setups.

## M7 — Extended affine/projective transforms

Candidate features:

- shear
- perspective/homography

Add only if experiments demonstrate that translation/rotation/scale are insufficient.

## M8 — Nonlinear local warp

Deliverables:

- configurable control grid
- per-view displacement field
- GPU interpolation
- grid-position calibration protocol
- raw calibration sample storage

Exit criterion: spatially varying correspondence can be modeled separately from global affine alignment.

## M9 — Psychophysical optimizer

Deliverables:

- A/B candidate presentation
- response recording
- deterministic experiment replay
- optimizer interface
- initial coordinate search or Bayesian strategy

Exit criterion: the application can search parameter space without requiring the user to reason directly about every numeric parameter.

## M10 — Advanced platforms

Research candidates:

- eye tracking
- VR/head-mounted displays
- independent-eye presentation hardware
- camera-assisted measurement

These are intentionally deferred until monitor-based experiments establish what transforms are useful.
