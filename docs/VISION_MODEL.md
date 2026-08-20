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

For a source-space point `p = (x, y)` measured relative to the image centre, the initial affine transform is conceptually:

```text
p' = T(offsetX, offsetY) * R(rotationDeg) * S(scaleX, scaleY) * p
```

The implementation must document the exact matrix multiplication order and keep it stable.

Recommended order for the MVP:

1. centre source coordinates
2. scale
3. rotate
4. translate in display pixels
5. map to viewport coordinates

Translation therefore remains intuitive and does not rotate with the image.

## Relative binocular alignment

The application should expose both absolute per-view transforms and derived relative values.

For translation:

```text
relativeOffsetX = right.offsetX - left.offsetX
relativeOffsetY = right.offsetY - left.offsetY
```

Likewise:

```text
relativeRotationDeg = right.rotationDeg - left.rotationDeg
```

Derived values are for display/analysis; saved profiles should retain the complete left and right states.

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
