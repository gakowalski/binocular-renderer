import { describe, expect, it } from 'vitest';
import {
  createNeutralBinocularTransforms,
  getRelativeTranslation,
  nudgeTranslation,
  setTranslationValue,
  viewTransformToCss,
} from './transform';

describe('translation calibration transform model', () => {
  it('starts with neutral left and right transforms', () => {
    const transforms = createNeutralBinocularTransforms();

    expect(transforms.left.offsetX).toBe(0);
    expect(transforms.left.offsetY).toBe(0);
    expect(transforms.right.offsetX).toBe(0);
    expect(transforms.right.offsetY).toBe(0);
  });

  it('changes only the selected view in independent mode', () => {
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

  it('moves the opposite view by the inverse delta in symmetric mode', () => {
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

  it('supports fractional fine nudges', () => {
    const transforms = nudgeTranslation(
      createNeutralBinocularTransforms(),
      'right',
      'offsetY',
      0.1,
      'independent',
    );

    expect(transforms.right.offsetY).toBeCloseTo(0.1);
  });

  it('emits a transform order that keeps translation outside rotation and scale', () => {
    const transforms = createNeutralBinocularTransforms();
    transforms.left.offsetX = 3.25;
    transforms.left.offsetY = -2;

    expect(viewTransformToCss(transforms.left)).toBe(
      'translate3d(3.25px, -2px, 0) rotate(0deg) scale(1, 1)',
    );
  });
});
