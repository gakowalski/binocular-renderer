import './styles.css';
import {
  createNeutralBinocularTransforms,
  getRelativeAffine,
  getRelativeTranslation,
  nudgeTranslation,
  setRotationValue,
  setScaleValue,
  setTranslationValue,
  viewTransformToCss,
  type BinocularTransforms,
  type ScaleAxis,
  type Side,
  type TranslationAxis,
  type TranslationLinkMode,
} from './renderer/transform';

interface ViewState {
  objectUrl: string | null;
}

type TargetType = 'cross' | 'grid' | 'frame' | 'radial';

const TRANSLATION_RANGE_PX = 500;
const TRANSLATION_SLIDER_STEP_PX = 0.5;
const TRANSLATION_NUMBER_STEP_PX = 0.1;
const ROTATION_RANGE_DEG = 15;
const ROTATION_SLIDER_STEP_DEG = 0.1;
const ROTATION_NUMBER_STEP_DEG = 0.01;
const SCALE_RANGE_MIN = 0.5;
const SCALE_RANGE_MAX = 1.5;
const SCALE_SLIDER_STEP = 0.005;
const SCALE_NUMBER_STEP = 0.001;

const app = document.querySelector<HTMLDivElement>('#app');

if (!app) {
  throw new Error('Application root #app was not found.');
}

app.innerHTML = `
  <main class="app-shell">
    <header class="toolbar">
      <div class="toolbar__identity">
        <strong>Binocular Renderer</strong>
        <span>M3 · affine calibration</span>
      </div>
      <div class="toolbar__actions">
        <label class="toolbar-select" for="target-type">
          <span>Target</span>
          <select id="target-type">
            <option value="cross">Cross</option>
            <option value="grid">Grid</option>
            <option value="frame">Frame</option>
            <option value="radial">Radial</option>
          </select>
        </label>
        <button id="show-targets" type="button">Show targets</button>
        <button id="reset-alignment" type="button">Reset alignment</button>
        <button id="reset" type="button">Reset all</button>
        <button id="fullscreen" type="button">Enter fullscreen</button>
      </div>
    </header>

    <section class="viewer" aria-label="Binocular image viewer">
      ${viewMarkup('left', 'Left view')}
      <div class="viewer__divider" aria-hidden="true"></div>
      ${viewMarkup('right', 'Right view')}
    </section>

    <section class="calibration-panel" aria-label="Affine calibration controls">
      ${affinePanelMarkup('left', 'Left')}

      <div class="calibration-summary">
        <div class="calibration-summary__mode">
          <label for="link-mode">Translation mode</label>
          <select id="link-mode">
            <option value="independent">Independent</option>
            <option value="symmetric">Linked (symmetric)</option>
          </select>
        </div>

        <div class="relative-values" aria-live="polite">
          <span>Relative (R − L / R ÷ L)</span>
          <strong>ΔX <output id="relative-x">0</output> px</strong>
          <strong>ΔY <output id="relative-y">0</output> px</strong>
          <strong>ΔRot <output id="relative-rotation">0</output>°</strong>
          <strong>Sx ratio <output id="relative-scale-x">1</output>×</strong>
          <strong>Sy ratio <output id="relative-scale-y">1</output>×</strong>
        </div>

        <div class="active-side" aria-label="Keyboard translation target">
          <span>Keyboard translation</span>
          <div class="active-side__buttons">
            <button type="button" data-select-side="left" aria-pressed="true">Left</button>
            <button type="button" data-select-side="right" aria-pressed="false">Right</button>
          </div>
          <small>Arrows: 1 px · Alt: 0.1 px · Shift: 10 px</small>
        </div>
      </div>

      ${affinePanelMarkup('right', 'Right')}
    </section>

    <footer class="statusbar">
      <span>Experimental visualization tool — not a diagnostic or therapeutic medical device.</span>
      <span>Use only in a stationary, controlled setting. Stop if viewing becomes uncomfortable.</span>
    </footer>
  </main>
`;

const viewStates: Record<Side, ViewState> = {
  left: { objectUrl: null },
  right: { objectUrl: null },
};

let transforms: BinocularTransforms = createNeutralBinocularTransforms();
let linkMode: TranslationLinkMode = 'independent';
let activeSide: Side = 'left';
let targetType: TargetType = 'cross';
const uniformScale: Record<Side, boolean> = { left: true, right: true };

for (const side of ['left', 'right'] as const) {
  const input = getElement<HTMLInputElement>(`#${side}-file`);
  input.addEventListener('change', () => {
    const file = input.files?.[0];
    if (file) {
      showImage(side, file);
    }
  });

  getElement<HTMLElement>(`#${side}-stage`).addEventListener('pointerdown', () => {
    setActiveSide(side);
  });

  for (const axis of ['offsetX', 'offsetY'] as const) {
    const range = getElement<HTMLInputElement>(`#${side}-${axis}-range`);
    const number = getElement<HTMLInputElement>(`#${side}-${axis}-number`);

    range.addEventListener('input', () => setTranslationFromControl(side, axis, range.valueAsNumber));
    number.addEventListener('input', () => {
      if (Number.isFinite(number.valueAsNumber)) {
        setTranslationFromControl(side, axis, number.valueAsNumber);
      }
    });
  }

  const rotationRange = getElement<HTMLInputElement>(`#${side}-rotation-range`);
  const rotationNumber = getElement<HTMLInputElement>(`#${side}-rotation-number`);
  rotationRange.addEventListener('input', () => setRotationFromControl(side, rotationRange.valueAsNumber));
  rotationNumber.addEventListener('input', () => {
    if (Number.isFinite(rotationNumber.valueAsNumber)) {
      setRotationFromControl(side, rotationNumber.valueAsNumber);
    }
  });

  for (const axis of ['scaleX', 'scaleY'] as const) {
    const range = getElement<HTMLInputElement>(`#${side}-${axis}-range`);
    const number = getElement<HTMLInputElement>(`#${side}-${axis}-number`);
    range.addEventListener('input', () => setScaleFromControl(side, axis, range.valueAsNumber));
    number.addEventListener('input', () => {
      if (Number.isFinite(number.valueAsNumber)) {
        setScaleFromControl(side, axis, number.valueAsNumber);
      }
    });
  }

  getElement<HTMLInputElement>(`#${side}-uniform-scale`).addEventListener('change', (event) => {
    const checked = (event.currentTarget as HTMLInputElement).checked;
    uniformScale[side] = checked;
    if (checked) {
      transforms = setScaleValue(transforms, side, 'scaleX', transforms[side].scaleX, true);
      renderTransforms();
    }
  });
}

for (const button of document.querySelectorAll<HTMLButtonElement>('[data-select-side]')) {
  button.addEventListener('click', () => {
    const side = button.dataset.selectSide;
    if (side === 'left' || side === 'right') {
      setActiveSide(side);
    }
  });
}

getElement<HTMLSelectElement>('#link-mode').addEventListener('change', (event) => {
  const value = (event.currentTarget as HTMLSelectElement).value;
  linkMode = value === 'symmetric' ? 'symmetric' : 'independent';
});

getElement<HTMLSelectElement>('#target-type').addEventListener('change', (event) => {
  const value = (event.currentTarget as HTMLSelectElement).value;
  if (isTargetType(value)) {
    targetType = value;
    renderTargets();
  }
});

getElement<HTMLButtonElement>('#show-targets').addEventListener('click', showTargets);
getElement<HTMLButtonElement>('#reset-alignment').addEventListener('click', resetAlignment);
getElement<HTMLButtonElement>('#reset').addEventListener('click', resetAll);
getElement<HTMLButtonElement>('#fullscreen').addEventListener('click', toggleFullscreen);
document.addEventListener('fullscreenchange', syncFullscreenButton);
document.addEventListener('keydown', handleKeyboardNudge);
window.addEventListener('beforeunload', releaseObjectUrls);

renderTransforms();
renderTargets();

function viewMarkup(side: Side, label: string): string {
  return `
    <article class="view" data-side="${side}">
      <div class="view__heading">
        <span>${label}</span>
        <label class="file-button" for="${side}-file">Load image</label>
        <input id="${side}-file" class="visually-hidden" type="file" accept="image/*" />
      </div>

      <div class="view__stage" id="${side}-stage" title="Click to select this view for keyboard translation">
        <div class="view__content" id="${side}-content">
          <div class="calibration-target calibration-target--cross" id="${side}-target" aria-label="Cross calibration target">
            <div class="calibration-target__ring" aria-hidden="true"></div>
            <div class="calibration-target__horizontal" aria-hidden="true"></div>
            <div class="calibration-target__vertical" aria-hidden="true"></div>
            <div class="calibration-target__dot" aria-hidden="true"></div>
            <div class="calibration-target__frame" aria-hidden="true"></div>
            <div class="calibration-target__radial" aria-hidden="true"></div>
          </div>
          <img id="${side}-image" class="view__image" alt="${label} loaded by user" hidden />
        </div>
      </div>
    </article>
  `;
}

function affinePanelMarkup(side: Side, label: string): string {
  return `
    <fieldset class="affine-controls">
      <legend>${label} transform</legend>
      ${translationControlMarkup(side, 'offsetX', 'X')}
      ${translationControlMarkup(side, 'offsetY', 'Y')}
      ${rotationControlMarkup(side)}
      ${scaleControlMarkup(side, 'scaleX', 'Scale X')}
      ${scaleControlMarkup(side, 'scaleY', 'Scale Y')}
      <label class="uniform-scale">
        <input id="${side}-uniform-scale" type="checkbox" checked />
        <span>Uniform scale (X = Y)</span>
      </label>
    </fieldset>
  `;
}

function translationControlMarkup(side: Side, axis: TranslationAxis, shortLabel: string): string {
  return controlMarkup({
    side,
    id: axis,
    label: shortLabel,
    min: -TRANSLATION_RANGE_PX,
    max: TRANSLATION_RANGE_PX,
    rangeStep: TRANSLATION_SLIDER_STEP_PX,
    numberStep: TRANSLATION_NUMBER_STEP_PX,
    value: 0,
    unit: 'px',
  });
}

function rotationControlMarkup(side: Side): string {
  return controlMarkup({
    side,
    id: 'rotation',
    label: 'Rot',
    min: -ROTATION_RANGE_DEG,
    max: ROTATION_RANGE_DEG,
    rangeStep: ROTATION_SLIDER_STEP_DEG,
    numberStep: ROTATION_NUMBER_STEP_DEG,
    value: 0,
    unit: '°',
  });
}

function scaleControlMarkup(side: Side, axis: ScaleAxis, label: string): string {
  return controlMarkup({
    side,
    id: axis,
    label,
    min: SCALE_RANGE_MIN,
    max: SCALE_RANGE_MAX,
    rangeStep: SCALE_SLIDER_STEP,
    numberStep: SCALE_NUMBER_STEP,
    value: 1,
    unit: '×',
  });
}

interface ControlMarkupOptions {
  side: Side;
  id: string;
  label: string;
  min: number;
  max: number;
  rangeStep: number;
  numberStep: number;
  value: number;
  unit: string;
}

function controlMarkup(options: ControlMarkupOptions): string {
  const { side, id, label, min, max, rangeStep, numberStep, value, unit } = options;
  return `
    <div class="axis-control">
      <label for="${side}-${id}-range">${label}</label>
      <input
        id="${side}-${id}-range"
        type="range"
        min="${min}"
        max="${max}"
        step="${rangeStep}"
        value="${value}"
      />
      <div class="number-with-unit">
        <input
          id="${side}-${id}-number"
          type="number"
          step="${numberStep}"
          value="${value}"
          aria-label="${label} for ${side} view"
        />
        <span>${unit}</span>
      </div>
    </div>
  `;
}

function setTranslationFromControl(side: Side, axis: TranslationAxis, value: number): void {
  transforms = setTranslationValue(transforms, side, axis, value, linkMode);
  setActiveSide(side);
  renderTransforms();
}

function setRotationFromControl(side: Side, value: number): void {
  transforms = setRotationValue(transforms, side, value);
  setActiveSide(side);
  renderTransforms();
}

function setScaleFromControl(side: Side, axis: ScaleAxis, value: number): void {
  transforms = setScaleValue(transforms, side, axis, value, uniformScale[side]);
  setActiveSide(side);
  renderTransforms();
}

function handleKeyboardNudge(event: KeyboardEvent): void {
  if (event.ctrlKey || event.metaKey || isEditableTarget(event.target)) {
    return;
  }

  let axis: TranslationAxis;
  let direction: number;

  switch (event.key) {
    case 'ArrowLeft':
      axis = 'offsetX';
      direction = -1;
      break;
    case 'ArrowRight':
      axis = 'offsetX';
      direction = 1;
      break;
    case 'ArrowUp':
      axis = 'offsetY';
      direction = -1;
      break;
    case 'ArrowDown':
      axis = 'offsetY';
      direction = 1;
      break;
    default:
      return;
  }

  event.preventDefault();
  const step = event.altKey ? 0.1 : event.shiftKey ? 10 : 1;
  transforms = nudgeTranslation(transforms, activeSide, axis, direction * step, linkMode);
  renderTransforms();
}

function isEditableTarget(target: EventTarget | null): boolean {
  return target instanceof HTMLInputElement
    || target instanceof HTMLSelectElement
    || target instanceof HTMLTextAreaElement
    || target instanceof HTMLButtonElement;
}

function renderTransforms(): void {
  for (const side of ['left', 'right'] as const) {
    const transform = transforms[side];
    getElement<HTMLElement>(`#${side}-content`).style.transform = viewTransformToCss(transform);

    for (const axis of ['offsetX', 'offsetY'] as const) {
      setControlValue(side, axis, transform[axis]);
    }

    setControlValue(side, 'rotation', transform.rotationDeg);
    setControlValue(side, 'scaleX', transform.scaleX);
    setControlValue(side, 'scaleY', transform.scaleY);

    getElement<HTMLInputElement>(`#${side}-uniform-scale`).checked = uniformScale[side];

    const view = getElement<HTMLElement>(`.view[data-side="${side}"]`);
    view.classList.toggle('view--active', side === activeSide);
  }

  const relativeTranslation = getRelativeTranslation(transforms);
  const relativeAffine = getRelativeAffine(transforms);
  getElement<HTMLOutputElement>('#relative-x').value = formatDisplayNumber(relativeTranslation.offsetX);
  getElement<HTMLOutputElement>('#relative-y').value = formatDisplayNumber(relativeTranslation.offsetY);
  getElement<HTMLOutputElement>('#relative-rotation').value = formatDisplayNumber(relativeAffine.rotationDeg);
  getElement<HTMLOutputElement>('#relative-scale-x').value = formatDisplayNumber(relativeAffine.scaleXRatio, 4);
  getElement<HTMLOutputElement>('#relative-scale-y').value = formatDisplayNumber(relativeAffine.scaleYRatio, 4);

  for (const button of document.querySelectorAll<HTMLButtonElement>('[data-select-side]')) {
    button.setAttribute('aria-pressed', String(button.dataset.selectSide === activeSide));
  }
}

function setControlValue(side: Side, id: string, value: number): void {
  getElement<HTMLInputElement>(`#${side}-${id}-range`).value = String(value);
  getElement<HTMLInputElement>(`#${side}-${id}-number`).value = formatDisplayNumber(value, 4);
}

function renderTargets(): void {
  const labels: Record<TargetType, string> = {
    cross: 'Cross calibration target',
    grid: 'Grid calibration target',
    frame: 'Frame calibration target',
    radial: 'Radial calibration target',
  };

  for (const side of ['left', 'right'] as const) {
    const target = getElement<HTMLDivElement>(`#${side}-target`);
    target.className = `calibration-target calibration-target--${targetType}`;
    target.setAttribute('aria-label', labels[targetType]);
  }
}

function setActiveSide(side: Side): void {
  activeSide = side;
  renderTransforms();
}

function showImage(side: Side, file: File): void {
  releaseObjectUrl(side);

  const objectUrl = URL.createObjectURL(file);
  viewStates[side].objectUrl = objectUrl;

  const image = getElement<HTMLImageElement>(`#${side}-image`);
  const target = getElement<HTMLDivElement>(`#${side}-target`);

  image.src = objectUrl;
  image.hidden = false;
  target.hidden = true;
}

function showTargets(): void {
  for (const side of ['left', 'right'] as const) {
    getElement<HTMLImageElement>(`#${side}-image`).hidden = true;
    getElement<HTMLDivElement>(`#${side}-target`).hidden = false;
  }
}

function resetAlignment(): void {
  transforms = createNeutralBinocularTransforms();
  renderTransforms();
}

function resetAll(): void {
  releaseObjectUrls();

  for (const side of ['left', 'right'] as const) {
    const input = getElement<HTMLInputElement>(`#${side}-file`);
    const image = getElement<HTMLImageElement>(`#${side}-image`);
    const target = getElement<HTMLDivElement>(`#${side}-target`);

    input.value = '';
    image.removeAttribute('src');
    image.hidden = true;
    target.hidden = false;
    uniformScale[side] = true;
  }

  linkMode = 'independent';
  getElement<HTMLSelectElement>('#link-mode').value = linkMode;
  targetType = 'cross';
  getElement<HTMLSelectElement>('#target-type').value = targetType;
  activeSide = 'left';
  resetAlignment();
  renderTargets();
}

async function toggleFullscreen(): Promise<void> {
  if (document.fullscreenElement) {
    await document.exitFullscreen();
    return;
  }

  await document.documentElement.requestFullscreen();
}

function syncFullscreenButton(): void {
  const button = getElement<HTMLButtonElement>('#fullscreen');
  button.textContent = document.fullscreenElement ? 'Exit fullscreen' : 'Enter fullscreen';
}

function releaseObjectUrls(): void {
  releaseObjectUrl('left');
  releaseObjectUrl('right');
}

function releaseObjectUrl(side: Side): void {
  const url = viewStates[side].objectUrl;
  if (!url) {
    return;
  }

  URL.revokeObjectURL(url);
  viewStates[side].objectUrl = null;
}

function isTargetType(value: string): value is TargetType {
  return value === 'cross' || value === 'grid' || value === 'frame' || value === 'radial';
}

function formatDisplayNumber(value: number, decimals = 2): string {
  if (!Number.isFinite(value)) {
    return '—';
  }
  return Number(value.toFixed(decimals)).toString();
}

function getElement<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) {
    throw new Error(`Required element not found: ${selector}`);
  }
  return element;
}
