export type Side = 'left' | 'right';
export type TranslationAxis = 'offsetX' | 'offsetY';
export type ScaleAxis = 'scaleX' | 'scaleY';
export type TranslationLinkMode = 'independent' | 'symmetric';

export interface ViewTransform {
  offsetX: number;
  offsetY: number;
  rotationDeg: number;
  scaleX: number;
  scaleY: number;
}

export interface BinocularTransforms {
  left: ViewTransform;
  right: ViewTransform;
}

export interface RelativeTranslation {
  offsetX: number;
  offsetY: number;
}

export interface RelativeAffine {
  rotationDeg: number;
  scaleXRatio: number;
  scaleYRatio: number;
}

export const NEUTRAL_VIEW_TRANSFORM: Readonly<ViewTransform> = Object.freeze({
  offsetX: 0,
  offsetY: 0,
  rotationDeg: 0,
  scaleX: 1,
  scaleY: 1,
});

export function createNeutralViewTransform(): ViewTransform {
  return { ...NEUTRAL_VIEW_TRANSFORM };
}

export function createNeutralBinocularTransforms(): BinocularTransforms {
  return {
    left: createNeutralViewTransform(),
    right: createNeutralViewTransform(),
  };
}

export function getRelativeTranslation(transforms: BinocularTransforms): RelativeTranslation {
  return {
    offsetX: transforms.right.offsetX - transforms.left.offsetX,
    offsetY: transforms.right.offsetY - transforms.left.offsetY,
  };
}

export function getRelativeAffine(transforms: BinocularTransforms): RelativeAffine {
  return {
    rotationDeg: transforms.right.rotationDeg - transforms.left.rotationDeg,
    scaleXRatio: safeScaleRatio(transforms.right.scaleX, transforms.left.scaleX),
    scaleYRatio: safeScaleRatio(transforms.right.scaleY, transforms.left.scaleY),
  };
}

export function setTranslationValue(
  transforms: BinocularTransforms,
  side: Side,
  axis: TranslationAxis,
  nextValue: number,
  linkMode: TranslationLinkMode,
): BinocularTransforms {
  const next = cloneTransforms(transforms);
  const previousValue = transforms[side][axis];
  const delta = nextValue - previousValue;

  next[side][axis] = nextValue;

  if (linkMode === 'symmetric') {
    const otherSide: Side = side === 'left' ? 'right' : 'left';
    next[otherSide][axis] = transforms[otherSide][axis] - delta;
  }

  return next;
}

export function nudgeTranslation(
  transforms: BinocularTransforms,
  side: Side,
  axis: TranslationAxis,
  delta: number,
  linkMode: TranslationLinkMode,
): BinocularTransforms {
  return setTranslationValue(
    transforms,
    side,
    axis,
    transforms[side][axis] + delta,
    linkMode,
  );
}

export function setRotationValue(
  transforms: BinocularTransforms,
  side: Side,
  rotationDeg: number,
): BinocularTransforms {
  const next = cloneTransforms(transforms);
  next[side].rotationDeg = rotationDeg;
  return next;
}

export function setScaleValue(
  transforms: BinocularTransforms,
  side: Side,
  axis: ScaleAxis,
  value: number,
  uniform: boolean,
): BinocularTransforms {
  const next = cloneTransforms(transforms);
  next[side][axis] = value;

  if (uniform) {
    const otherAxis: ScaleAxis = axis === 'scaleX' ? 'scaleY' : 'scaleX';
    next[side][otherAxis] = value;
  }

  return next;
}

export function viewTransformToCss(transform: ViewTransform): string {
  return [
    `translate3d(${formatNumber(transform.offsetX)}px, ${formatNumber(transform.offsetY)}px, 0)`,
    `rotate(${formatNumber(transform.rotationDeg)}deg)`,
    `scale(${formatNumber(transform.scaleX)}, ${formatNumber(transform.scaleY)})`,
  ].join(' ');
}

function cloneTransforms(transforms: BinocularTransforms): BinocularTransforms {
  return {
    left: { ...transforms.left },
    right: { ...transforms.right },
  };
}

function safeScaleRatio(numerator: number, denominator: number): number {
  return denominator === 0 ? Number.NaN : numerator / denominator;
}

function formatNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(4)));
}
