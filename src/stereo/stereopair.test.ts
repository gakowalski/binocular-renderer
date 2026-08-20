import { describe, expect, it } from 'vitest';
import {
  clampPercent,
  createStereoTestPairSvg,
  isImageFitMode,
  swapPair,
} from './stereopair';

describe('stereopair helpers', () => {
  it('swaps left and right values without mutating the original pair', () => {
    const pair = { left: 'L', right: 'R' };
    const swapped = swapPair(pair);

    expect(swapped).toEqual({ left: 'R', right: 'L' });
    expect(pair).toEqual({ left: 'L', right: 'R' });
  });

  it('clamps crop position to percentages', () => {
    expect(clampPercent(-4)).toBe(0);
    expect(clampPercent(47.5)).toBe(47.5);
    expect(clampPercent(140)).toBe(100);
    expect(clampPercent(Number.NaN)).toBe(50);
  });

  it('accepts only supported image fit modes', () => {
    expect(isImageFitMode('contain')).toBe(true);
    expect(isImageFitMode('cover')).toBe(true);
    expect(isImageFitMode('fill')).toBe(true);
    expect(isImageFitMode('scale-down')).toBe(false);
  });

  it('generates identical zero-disparity images', () => {
    const pair = createStereoTestPairSvg('zero');
    expect(pair.left).toBe(pair.right);
  });

  it('generates distinct horizontal and vertical test images', () => {
    const horizontal = createStereoTestPairSvg('horizontal');
    const vertical = createStereoTestPairSvg('vertical');

    expect(horizontal.left).not.toBe(horizontal.right);
    expect(vertical.left).not.toBe(vertical.right);
    expect(horizontal.left).toContain('translate(9 0)');
    expect(horizontal.right).toContain('translate(-9 0)');
    expect(vertical.left).toContain('translate(0 5)');
    expect(vertical.right).toContain('translate(0 -5)');
  });
});
