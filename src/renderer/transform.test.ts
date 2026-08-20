import { describe, expect, it } from 'vitest';
import {
  createNeutralBinocularTransforms,
  getRelativeAffine,
  getRelativeTranslation,
  nudgeTranslation,
  setRotationValue,
  setScaleValue,
  setTranslationValue,
  viewTransformToCss,
} from './transform';

describe('binocular affine transform model', () => {
  it('starts with neutral left and right transforms', () => {
    const transforms = createNeutralBinocularTransforms();

    expect(transforms.left).toEqual({
      offsetX: 0,
      offsetY: 0,
      rotationDeg: 0,
      scaleX: 1,
      scaleY: 1,
    });
    expect(transforms.right).toEqual(transforms.left);
  });

  it('changes only the selected view in independent translation mode', () => {
    const transforms = setTranslationValue(
      createNeutralBinocularTransforms(),
      'left',
      'offsetX',
      12.5,
      'independent',
    );

    expect(transforms.left.offsetX).toBe(12.5);
    expect(transforms.right.offsetX).toBe(0);
  });

  it('moves the opposite view by the inverse delta in symmetric translation mode', () => {
    const initial = createNeutralBinocularTransforms();
    initial.left.offsetX = 4;
    initial.right.offsetX = 8;

    const transforms = setTranslationValue(initial, 'left', 'offsetX', 7, 'symmetric');

    expect(transforms.left.offsetX).toBe(7);
    expect(transforms.right.offsetX).toBe(5);
    expect(transforms.left.offsetX + transforms.right.offsetX).toBe(12);
  });

  it('computes relative translation as right minus left', () => {
    const transforms = createNeutralBinocularTransforms();
    transforms.left.offsetX = -8;
    transforms.right.offsetX = 11;
    transforms.left.offsetY = 2.5;
    transforms.right.offsetY = -1;

    expect(getRelativeTranslation(transforms)).toEqual({ offsetX: 19, offsetY: -3.5 });
  });

  it('supports fractional fine translation nudges', () => {
    const transforms = nudgeTranslation(
      createNeutralBinocularTransforms(),
      'right',
      'offsetY',
      0.1,
      'independent',
    );

    expect(transforms.right.offsetY).toBeCloseTo(0.1);
  });

  it('sets rotation independently for each view', () => {
    const transforms = setRotationValue(createNeutralBinocularTransforms(), 'right', 1.25);

    expect(transforms.right.rotationDeg).toBe(1.25);
    expect(transforms.left.rotationDeg).toBe(0);
  });

  it('links X and Y scale inside one view when uniform scaling is enabled', () => {
    const transforms = setScaleValue(
      createNeutralBinocularTransforms(),
      'left',
      'scaleX',
      1.08,
      true,
    );

    expect(transforms.left.scaleX).toBe(1.08);
    expect(transforms.left.scaleY).toBe(1.08);
    expect(transforms.right.scaleX).toBe(1);
  });

  it('allows anisotropic scale when uniform scaling is disabled', () => {
    let transforms = createNeutralBinocularTransforms();
    transforms = setScaleValue(transforms, 'left', 'scaleX', 1.05, false);
    transforms = setScaleValue(transforms, 'left', 'scaleY', 0.97, false);

    expect(transforms.left.scaleX).toBe(1.05);
    expect(transforms.left.scaleY).toBe(0.97);
  });

  it('computes relative rotation and multiplicative scale ratios', () => {
    const transforms = createNeutralBinocularTransforms();
    transforms.left.rotationDeg = -0.5;
    transforms.right.rotationDeg = 0.75;
    transforms.left.scaleX = 0.8;
    transforms.right.scaleX = 1.2;
    transforms.left.scaleY = 1;
    transforms.right.scaleY = 0.95;

    const relative = getRelativeAffine(transforms);
    expect(relative.rotationDeg).toBeCloseTo(1.25);
    expect(relative.scaleXRatio).toBeCloseTo(1.5);
    expect(relative.scaleYRatio).toBeCloseTo(0.95);
  });

  it('emits stable CSS order: scale then rotate then translate geometrically', () => {
    const transforms = createNeutralBinocularTransforms();
    transforms.left.offsetX = 3.25;
    transforms.left.offsetY = -2;
    transforms.left.rotationDeg = 1.5;
    transforms.left.scaleX = 1.02;
    transforms.left.scaleY = 0.98;

    expect(viewTransformToCss(transforms.left)).toBe(
      'translate3d(3.25px, -2px, 0) rotate(1.5deg) scale(1.02, 0.98)',
    );
  });
});
