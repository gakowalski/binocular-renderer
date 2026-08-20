import './styles.css';
import {
  createNeutralBinocularTransforms,
  getRelativeTranslation,
  nudgeTranslation,
  setTranslationValue,
  viewTransformToCss,
  type BinocularTransforms,
  type Side,
  type TranslationAxis,
  type TranslationLinkMode,
} from './renderer/transform';

interface ViewState {
  objectUrl: string | null;
}

const TRANSLATION_RANGE_PX = 500;
const TRANSLATION_SLIDER_STEP_PX = 0.5;
const TRANSLATION_NUMBER_STEP_PX = 0.1;

const app = document.querySelector<HTMLDivElement>('#app');

if (!app) {
  throw new Error('Application root #app was not found.');
}

app.innerHTML = `
  <main class="app-shell">
    <header class="toolbar">
      <div class="toolbar__identity">
        <strong>Binocular Renderer</strong>
        <span>M2 · translation calibration</span>
      </div>
      <div class="toolbar__actions">
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

    <section class="calibration-panel" aria-label="Translation calibration controls">
      ${translationPanelMarkup('left', 'Left')}

      <div class="calibration-summary">
        <div class="calibration-summary__mode">
          <label for="link-mode">Adjustment mode</label>
          <select id="link-mode">
            <option value="independent">Independent</option>
            <option value="symmetric">Linked (symmetric)</option>
          </select>
        </div>

        <div class="relative-values" aria-live="polite">
          <span>Relative (R − L)</span>
          <strong>ΔX <output id="relative-x">0.0</output> px</strong>
          <strong>ΔY <output id="relative-y">0.0</output> px</strong>
        </div>

        <div class="active-side" aria-label="Keyboard adjustment target">
          <span>Keyboard target</span>
          <div class="active-side__buttons">
            <button type="button" data-select-side="left" aria-pressed="true">Left</button>
            <button type="button" data-select-side="right" aria-pressed="false">Right</button>
          </div>
          <small>Arrows: 1 px · Alt: 0.1 px · Shift: 10 px</small>
        </div>
      </div>

      ${translationPanelMarkup('right', 'Right')}
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

getElement<HTMLButtonElement>('#show-targets').addEventListener('click', showTargets);
getElement<HTMLButtonElement>('#reset-alignment').addEventListener('click', resetTranslations);
getElement<HTMLButtonElement>('#reset').addEventListener('click', resetAll);
getElement<HTMLButtonElement>('#fullscreen').addEventListener('click', toggleFullscreen);
document.addEventListener('fullscreenchange', syncFullscreenButton);
document.addEventListener('keydown', handleKeyboardNudge);
window.addEventListener('beforeunload', releaseObjectUrls);

renderTransforms();

function viewMarkup(side: Side, label: string): string {
  return `
    <article class="view" data-side="${side}">
      <div class="view__heading">
        <span>${label}</span>
        <label class="file-button" for="${side}-file">Load image</label>
        <input id="${side}-file" class="visually-hidden" type="file" accept="image/*" />
      </div>

      <div class="view__stage" id="${side}-stage" title="Click to select this view for keyboard nudging">
        <div class="view__content" id="${side}-content">
          <div class="calibration-target" id="${side}-target" aria-label="Central cross calibration target">
            <div class="calibration-target__ring" aria-hidden="true"></div>
            <div class="calibration-target__horizontal" aria-hidden="true"></div>
            <div class="calibration-target__vertical" aria-hidden="true"></div>
            <div class="calibration-target__dot" aria-hidden="true"></div>
          </div>
          <img id="${side}-image" class="view__image" alt="${label} loaded by user" hidden />
        </div>
      </div>
    </article>
  `;
}

function translationPanelMarkup(side: Side, label: string): string {
  return `
    <fieldset class="translation-controls">
      <legend>${label} translation</legend>
      ${axisControlMarkup(side, 'offsetX', 'X')}
      ${axisControlMarkup(side, 'offsetY', 'Y')}
    </fieldset>
  `;
}

function axisControlMarkup(side: Side, axis: TranslationAxis, shortLabel: string): string {
  return `
    <div class="axis-control">
      <label for="${side}-${axis}-range">${shortLabel}</label>
      <input
        id="${side}-${axis}-range"
        type="range"
        min="-${TRANSLATION_RANGE_PX}"
        max="${TRANSLATION_RANGE_PX}"
        step="${TRANSLATION_SLIDER_STEP_PX}"
        value="0"
      />
      <div class="number-with-unit">
        <input
          id="${side}-${axis}-number"
          type="number"
          step="${TRANSLATION_NUMBER_STEP_PX}"
          value="0"
          aria-label="${labelForAxis(side, axis)} in pixels"
        />
        <span>px</span>
      </div>
    </div>
  `;
}

function labelForAxis(side: Side, axis: TranslationAxis): string {
  const sideLabel = side === 'left' ? 'Left' : 'Right';
  const axisLabel = axis === 'offsetX' ? 'horizontal offset' : 'vertical offset';
  return `${sideLabel} ${axisLabel}`;
}

function setTranslationFromControl(side: Side, axis: TranslationAxis, value: number): void {
  transforms = setTranslationValue(transforms, side, axis, value, linkMode);
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
      const value = transform[axis];
      getElement<HTMLInputElement>(`#${side}-${axis}-range`).value = String(value);
      getElement<HTMLInputElement>(`#${side}-${axis}-number`).value = formatDisplayNumber(value);
    }

    const view = getElement<HTMLElement>(`.view[data-side="${side}"]`);
    view.classList.toggle('view--active', side === activeSide);
  }

  const relative = getRelativeTranslation(transforms);
  getElement<HTMLOutputElement>('#relative-x').value = formatDisplayNumber(relative.offsetX);
  getElement<HTMLOutputElement>('#relative-y').value = formatDisplayNumber(relative.offsetY);

  for (const button of document.querySelectorAll<HTMLButtonElement>('[data-select-side]')) {
    button.setAttribute('aria-pressed', String(button.dataset.selectSide === activeSide));
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

function resetTranslations(): void {
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
  }

  linkMode = 'independent';
  getElement<HTMLSelectElement>('#link-mode').value = linkMode;
  activeSide = 'left';
  resetTranslations();
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

function formatDisplayNumber(value: number): string {
  return Number(value.toFixed(2)).toString();
}

function getElement<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) {
    throw new Error(`Required element not found: ${selector}`);
  }
  return element;
}
