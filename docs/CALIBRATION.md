# Calibration Protocol

## Principles

Calibration is subjective and experimental. The application should help the user reproduce a perceived alignment; it must not claim to measure or diagnose an ocular condition.

Start with simple high-contrast targets. Natural images are useful only after basic geometry is stable.

## Session metadata

Record when practical:

- date/time
- display resolution
- browser zoom (must preferably be 100%)
- fullscreen state
- approximate viewing distance
- glasses/correction state
- free-form notes about fatigue or viewing conditions

## Stage 0: neutral baseline

1. Reset all transforms.
2. Present identical simple targets in both panels.
3. Confirm the panel separation and image size are comfortable enough to continue.
4. Save the untouched state as a reference.

## Stage 1: horizontal alignment

Use a simple vertical line, cross or small fixation target.

Adjust horizontal separation/translation only. Fine adjustment should be possible with keyboard increments smaller than the slider step.

Record the resulting left/right values and derived relative offset.

## Stage 2: vertical alignment

Freeze horizontal alignment and adjust `offsetY` using horizontal lines, crosshairs or vernier-like targets.

## Stage 3: rotation

Use long lines, crosses, rectangular frames or radial spokes. Adjust `rotationDeg` only after translation is approximately stable.

## Stage 4: scale

Use nested rectangles, circles or corner markers. Begin with uniform scale by linking `scaleX` and `scaleY`; allow independent axes only if needed.

## Stage 5: combined refinement

Enable all current parameters and iteratively refine them. Provide a one-click path back to the previous stage result.

## Stage 6: validation targets

Validate the candidate profile against several target classes:

- central cross
- peripheral corner markers
- grid/checkerboard
- text
- natural image
- known stereopair

A profile that only works for one calibration target should be treated as provisional.

## Repeated measurements

The application should make repeated calibration easy. Prefer saving independent runs rather than overwriting a single profile.

Useful comparisons include:

- same session repeated three times
- different viewing distances
- different times of day
- with/without prescribed correction, when the user independently chooses to experiment in a safe stationary setting

## Future local-warp calibration

When global affine calibration is stable, present targets at a grid of positions. At each position, collect the local adjustment required for perceived correspondence.

Interpolate those samples into a displacement field. Keep raw samples as part of the experiment record so the generated warp can be recomputed later.

## Future adaptive optimization

Manual sliders are not always the best way to estimate a multidimensional optimum. A later experiment mode may present candidate A and B and ask for a simple preference:

- A better
- B better
- no meaningful difference

An optimizer can use those responses to propose subsequent parameter sets. The optimizer should always expose and save the tested parameter vectors and responses.

## Comfort safeguards

- Always provide an immediate reset/stop action.
- Avoid flashing or rapid alternation by default.
- Do not force long trials.
- If the user experiences discomfort, the experiment should be stopped rather than optimized through it.
- The software is for stationary controlled experimentation, not navigation or safety-critical activity.
