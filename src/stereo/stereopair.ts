export type ImageFitMode = 'contain' | 'cover' | 'fill';
export type StereoTestPairId = 'zero' | 'horizontal' | 'vertical' | 'scale';

export interface StereoPair<T> {
  left: T;
  right: T;
}

export function swapPair<T>(pair: StereoPair<T>): StereoPair<T> {
  return { left: pair.right, right: pair.left };
}

export function clampPercent(value: number): number {
  if (!Number.isFinite(value)) {
    return 50;
  }
  return Math.min(100, Math.max(0, value));
}

export function isImageFitMode(value: string): value is ImageFitMode {
  return value === 'contain' || value === 'cover' || value === 'fill';
}

export function createStereoTestPairSvg(id: StereoTestPairId): StereoPair<string> {
  switch (id) {
    case 'zero':
      return {
        left: createEyeSvg({ foregroundDx: 0, foregroundDy: 0, foregroundScale: 1 }),
        right: createEyeSvg({ foregroundDx: 0, foregroundDy: 0, foregroundScale: 1 }),
      };
    case 'horizontal':
      return {
        left: createEyeSvg({ foregroundDx: 9, foregroundDy: 0, foregroundScale: 1 }),
        right: createEyeSvg({ foregroundDx: -9, foregroundDy: 0, foregroundScale: 1 }),
      };
    case 'vertical':
      return {
        left: createEyeSvg({ foregroundDx: 0, foregroundDy: 5, foregroundScale: 1 }),
        right: createEyeSvg({ foregroundDx: 0, foregroundDy: -5, foregroundScale: 1 }),
      };
    case 'scale':
      return {
        left: createEyeSvg({ foregroundDx: 0, foregroundDy: 0, foregroundScale: 0.96 }),
        right: createEyeSvg({ foregroundDx: 0, foregroundDy: 0, foregroundScale: 1.04 }),
      };
  }
}

interface EyeSvgOptions {
  foregroundDx: number;
  foregroundDy: number;
  foregroundScale: number;
}

function createEyeSvg(options: EyeSvgOptions): string {
  const { foregroundDx, foregroundDy, foregroundScale } = options;
  const transform = `translate(${foregroundDx} ${foregroundDy}) translate(320 240) scale(${foregroundScale}) translate(-320 -240)`;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="640" height="480" viewBox="0 0 640 480">
  <rect width="640" height="480" fill="#050505"/>
  <g stroke="#303030" stroke-width="1">
    <path d="M80 0V480M160 0V480M240 0V480M320 0V480M400 0V480M480 0V480M560 0V480"/>
    <path d="M0 80H640M0 160H640M0 240H640M0 320H640M0 400H640"/>
  </g>
  <g stroke="#777" fill="none" stroke-width="2">
    <rect x="80" y="60" width="480" height="360"/>
    <circle cx="320" cy="240" r="120"/>
  </g>
  <g transform="${transform}">
    <circle cx="320" cy="240" r="54" fill="none" stroke="#fff" stroke-width="3"/>
    <circle cx="320" cy="240" r="9" fill="#fff"/>
    <path d="M250 240H390M320 170V310" stroke="#fff" stroke-width="2"/>
    <rect x="286" y="206" width="68" height="68" fill="none" stroke="#aaa" stroke-width="2"/>
  </g>
</svg>`;
}
