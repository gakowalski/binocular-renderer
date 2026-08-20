# Project Specification

## Goal

Build a browser-based experimental tool for displaying paired visual stimuli and independently transforming the left and right images so a user can explore a personalized binocular alignment without relying on a fixed stereoscopic geometry.

The application is intended for controlled experiments at a stationary display. It is not a diagnostic or therapeutic medical device.

## Core hypotheses

1. A useful binocular presentation may be achievable by matching the rendered geometry to the viewer rather than forcing the viewer to match a standard stereopair.
2. The useful mapping may require more than horizontal translation; vertical offset, rotation, scale and eventually nonlinear deformation may matter.
3. Subjective calibration can be captured as reproducible parameters and compared across sessions.
4. Stereo disparity can be added on top of a personalized neutral alignment.

## MVP user flow

1. Open the application in a desktop browser.
2. Enter fullscreen mode.
3. Select a simple calibration target or load a paired image.
4. Adjust left/right presentation parameters.
5. Reset individual parameters or all parameters instantly.
6. Save the current configuration as a local calibration profile.
7. Reload a saved profile and reproduce the presentation.

## MVP scope

The first useful release should support:

- two adjacent viewports
- independent left/right image sources
- generated calibration targets
- `offsetX`, `offsetY`, `rotationDeg`, `scaleX`, `scaleY`
- linked and independent adjustment modes
- keyboard fine adjustment in addition to sliders/inputs
- fullscreen presentation
- reset controls
- local JSON profile save/load/export/import
- clear display of current values and units

## Out of scope for the first release

- diagnosis or treatment recommendations
- automatic eye tracking
- VR headset support
- camera-based gaze estimation
- server accounts or cloud profile storage
- nonlinear local warp
- automatic optimization
- prescription conversion

These can be explored after the basic geometry is validated experimentally.

## Functional principles

### Independent views

Each viewport has a source image and transform state. The renderer must not assume that one eye is the fixed reference forever.

### Stable coordinate system

Geometry parameters should be expressed in display-space terms with explicit units. The initial renderer uses pixels and degrees. Physical monitor calibration can later add millimetres and visual-angle conversions without changing parameter meaning.

### Reproducibility

Every saved profile contains:

- schema version
- application version when available
- left transform
- right transform
- display metadata when known
- optional notes
- timestamp

### Experiment-first UX

The UI should optimize for fast repeated adjustment rather than decorative presentation. Values must be easy to change precisely and easy to reset.

## Non-functional requirements

- desktop-first
- works offline after loading
- deterministic transform math
- minimal dependencies
- no telemetry by default
- no image upload to a server in the MVP
- responsive enough for continuous slider manipulation

## Success criterion for the initial phase

The project reaches its first meaningful milestone when a user can reproducibly find, save, reload and compare an alignment using translation, rotation and scale on simple calibration targets and arbitrary stereopairs.
