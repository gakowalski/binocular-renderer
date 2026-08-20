# Stereopair Workflow

## Purpose

M5 adds source-image workflow on top of the per-eye calibration renderer.

The central invariant is:

> source assignment and per-eye calibration are separate state.

A left-eye transform remains the left-eye transform even when the source images are swapped.

## Loading a pair

`Load two files` accepts multiple image files and uses the first two:

1. first file → left source
2. second file → right source

The workflow routes those files through the existing left/right file inputs. The core viewer therefore remains the owner of image `ObjectURL` creation and cleanup.

Files stay local to the browser.

## Swap semantics

`Swap L/R` swaps the two source `File` objects.

It does **not** swap:

- left/right affine transforms
- calibration profile state
- translation link mode
- per-eye scale-link settings

This makes it possible to test whether a perceived effect follows the source stereopair or the calibrated eye geometry.

## Common presentation

M5 introduces source-presentation controls that are applied identically to both source images:

- `contain` — preserve the full image without cropping
- `cover` — fill each viewport and crop overflow
- `fill` — stretch to the viewport
- common horizontal object position, 0–100%
- common vertical object position, 0–100%

These controls affect source layout only. They are not substitutes for the per-eye affine calibration parameters.

M5 does not yet serialize common presentation settings into calibration profiles. If later experiments show that these settings are part of a reproducible experiment, the profile schema should be versioned and extended explicitly.

## Built-in test pairs

The built-in library uses locally generated SVG images; no network resources are required.

### Zero disparity

Left and right images are identical. Useful as a control condition.

### Horizontal disparity

A central foreground target is shifted horizontally in opposite directions in the two eye images while the background stays fixed.

### Vertical mismatch

A central target is shifted vertically in opposite directions. This is a mismatch/control stimulus rather than an intended natural stereo pair.

### Scale mismatch

The central target differs slightly in scale between the two images. This is useful for exercising the M3 scale controls.

## Deployment paths

Browser entry references in `index.html` use relative paths such as:

```html
<script type="module" src="./src/main.ts"></script>
```

This avoids assuming that the application is always hosted at the web-server root.
