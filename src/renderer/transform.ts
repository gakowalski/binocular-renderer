export type Side = 'left' | 'right';
export type TranslationAxis = 'offsetX' | 'offsetY';
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

function formatNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(4)));
}
