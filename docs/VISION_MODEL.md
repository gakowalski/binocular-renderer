# Vision and Transform Model

## Purpose

This document defines the rendering parameters used by Binocular Renderer. It is a software model for experimentation, not a clinical model of the visual system.

## Two independent render states

Let `L` and `R` denote the left and right source images. Each view has an independent transform state:

```ts
interface ViewTransform {
  offsetX: number;
  offsetY: number;
  rotationDeg: number;
  scaleX: number;
  scaleY: number;
}
```

Neutral values are:

```text
offsetX = 0 px
offsetY = 0 px
rotationDeg = 0 deg
scaleX = 1
scaleY = 1
```

## Initial geometric transform

For a source-space point `p = (x, y)` measured relative to the image centre, the affine transform is conceptually:

```text
p' = T(offsetX, offsetY) * R(rotationDeg) * S(scaleX, scaleY) * p
```

The transform order is stable:

1. centre source coordinates
2. scale
3. rotate
4. translate in display pixels
5. map to viewport coordinates

Translation therefore remains intuitive and does not rotate or scale with the image.

The browser implementation emits CSS transform functions in this order:

```text
translate3d(...) rotate(...) scale(...)
```

CSS applies the rightmost transform first, so the effective geometric order remains scale → rotate → translate. Automated tests protect this ordering from accidental changes.

## Translation adjustment modes

M2 defines two explicit interaction modes. These modes affect editing behavior only; they do not change the meaning of stored `offsetX` or `offsetY` values.

### Independent

Changing a value for one view changes only that view.

### Linked (symmetric)

Changing a translation value for one view by `Δ` changes the opposite view by `−Δ` on the same axis.

For example, starting from neutral values:

```text
left.offsetX  = 0
right.offsetX = 0
```

setting the left value to `+10 px` in symmetric mode produces:

```text
left.offsetX  = +10 px
right.offsetX = -10 px
```

This preserves the pair's translation midpoint while changing binocular separation. If the pair is already off-centre, symmetric edits preserve the existing midpoint rather than forcing it back to zero.

## Rotation semantics

`rotationDeg` is a per-view clockwise rotation around the centre of the rendered viewport content. Its neutral value is `0 deg`.

Rotation remains independent between left and right views in M3. Relative rotation is defined as:

```text
relativeRotationDeg = right.rotationDeg - left.rotationDeg
```

Positive relative rotation therefore means the right view is rotated farther clockwise than the left view.

## Scale semantics

`scaleX` and `scaleY` are dimensionless per-view multipliers around the centre of the rendered viewport content. Their neutral value is `1`.

M3 exposes two editing modes inside each view:

### Uniform scale

When enabled, changing either `scaleX` or `scaleY` sets both axes to the same value. This keeps the aspect ratio unchanged.

### Independent-axis scale

When uniform scale is disabled, `scaleX` and `scaleY` can differ. This allows experimental anisotropic scaling without changing the parameter definitions.

Relative scale is displayed multiplicatively:

```text
relativeScaleX = right.scaleX / left.scaleX
relativeScaleY = right.scaleY / left.scaleY
```

A ratio of `1` means equal scale between the two views; `1.02` means the right view is scaled 2% larger on that axis than the left view.

## Relative binocular alignment

The application exposes both absolute per-view transforms and derived relative values.

For translation:

```text
relativeOffsetX = right.offsetX - left.offsetX
relativeOffsetY = right.offsetY - left.offsetY
```

For rotation and scale:

```text
relativeRotationDeg = right.rotationDeg - left.rotationDeg
relativeScaleX = right.scaleX / left.scaleX
relativeScaleY = right.scaleY / left.scaleY
```

Derived values are for display/analysis; saved profiles should retain the complete left and right states.

## Keyboard translation semantics

M2 supports an explicitly selected active view for keyboard adjustment.

When focus is not inside a form control:

```text
Arrow key       = 1 px
Alt + Arrow     = 0.1 px
Shift + Arrow   = 10 px
```

Left/right arrows change `offsetX`; up/down arrows change `offsetY`. Keyboard edits obey the current independent/symmetric adjustment mode exactly like slider and numeric edits.

## Calibration target classes

M3 provides four generated targets:

- `cross` — central cross, ring and fixation dot for translation
- `grid` — regular grid with central axes for scale and gross rotation
- `frame` — rectangular nested frame for scale/aspect comparison
- `radial` — radial spokes for detecting small rotational mismatch

Target choice does not alter transform state.

## Future affine extensions

Later versions may add:

- `shearX`
- `shearY`
- perspective/homography terms

These should be introduced only after translation/rotation/scale experiments show a need.

## Nonlinear warp

A later local warp can be represented by a displacement field:

```text
D(x, y) = (dx(x, y), dy(x, y))
```

A practical representation is a sparse control grid (for example 5x5 or 9x9) interpolated on the GPU. Each view should have its own field.

The nonlinear stage should remain separate from the global affine transform so experiments can compare:

- affine only
- warp only
- affine + warp

## Stereo disparity layer

Personal alignment and intended stereoscopic depth should be modeled separately.

Conceptually:

```text
rendered disparity = baseline alignment + stereoGain * source stereo disparity
```

`stereoGain = 0` removes intentional stereo depth while retaining the personalized baseline alignment. `stereoGain = 1` preserves source disparity. Values between or beyond these can be explored experimentally.

The implementation of disparity manipulation depends on source type and is intentionally postponed until the basic alignment renderer is stable.

## Physical display metadata

A later profile may include:

```ts
interface DisplayGeometry {
  widthMm?: number;
  heightMm?: number;
  resolutionX: number;
  resolutionY: number;
  viewingDistanceMm?: number;
}
```

From physical pixel pitch and viewing distance, the application can derive visual angle for analysis. These derived values must not replace the original pixel values in stored transform state.

## Photometric model

Later per-view parameters may include:

- brightness/exposure
- contrast
- gamma
- saturation
- blur
- sharpening/edge enhancement

Photometric transforms must be optional and neutral by default. They should be modeled separately from geometry.

## Invariants

- Parameter units must never be implicit.
- Neutral values must produce the unmodified source geometry.
- Left and right transforms must be independently representable.
- Reset must exactly restore neutral values.
- Serialization must round-trip without changing transform values.
