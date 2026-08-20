import './styles.css';

type Side = 'left' | 'right';

interface ViewState {
  side: Side;
  objectUrl: string | null;
}

const app = document.querySelector<HTMLDivElement>('#app');

if (!app) {
  throw new Error('Application root #app was not found.');
}

app.innerHTML = `
  <main class="app-shell">
    <header class="toolbar">
      <div class="toolbar__identity">
        <strong>Binocular Renderer</strong>
        <span>M1 · two-panel viewer</span>
      </div>
      <div class="toolbar__actions">
        <button id="show-targets" type="button">Show targets</button>
        <button id="reset" type="button">Reset</button>
        <button id="fullscreen" type="button">Enter fullscreen</button>
      </div>
    </header>

    <section class="viewer" aria-label="Binocular image viewer">
      ${viewMarkup('left', 'Left view')}
      <div class="viewer__divider" aria-hidden="true"></div>
      ${viewMarkup('right', 'Right view')}
    </section>

    <footer class="statusbar">
      <span>Experimental visualization tool — not a diagnostic or therapeutic medical device.</span>
      <span>Use only in a stationary, controlled setting. Stop if viewing becomes uncomfortable.</span>
    </footer>
  </main>
`;

const states: Record<Side, ViewState> = {
  left: { side: 'left', objectUrl: null },
  right: { side: 'right', objectUrl: null },
};

for (const side of ['left', 'right'] as const) {
  const input = getElement<HTMLInputElement>(`#${side}-file`);
  input.addEventListener('change', () => {
    const file = input.files?.[0];
    if (file) {
      showImage(side, file);
    }
  });
}

getElement<HTMLButtonElement>('#show-targets').addEventListener('click', showTargets);
getElement<HTMLButtonElement>('#reset').addEventListener('click', resetAll);
getElement<HTMLButtonElement>('#fullscreen').addEventListener('click', toggleFullscreen);
document.addEventListener('fullscreenchange', syncFullscreenButton);
window.addEventListener('beforeunload', releaseObjectUrls);

function viewMarkup(side: Side, label: string): string {
  return `
    <article class="view" data-side="${side}">
      <div class="view__heading">
        <span>${label}</span>
        <label class="file-button" for="${side}-file">Load image</label>
        <input id="${side}-file" class="visually-hidden" type="file" accept="image/*" />
      </div>

      <div class="view__stage" id="${side}-stage">
        <div class="calibration-target" id="${side}-target" aria-label="Central cross calibration target">
          <div class="calibration-target__ring" aria-hidden="true"></div>
          <div class="calibration-target__horizontal" aria-hidden="true"></div>
          <div class="calibration-target__vertical" aria-hidden="true"></div>
          <div class="calibration-target__dot" aria-hidden="true"></div>
        </div>
        <img id="${side}-image" class="view__image" alt="${label} loaded by user" hidden />
      </div>
    </article>
  `;
}

function showImage(side: Side, file: File): void {
  releaseObjectUrl(side);

  const objectUrl = URL.createObjectURL(file);
  states[side].objectUrl = objectUrl;

  const image = getElement<HTMLImageElement>(`#${side}-image`);
  const target = getElement<HTMLDivElement>(`#${side}-target`);

  image.src = objectUrl;
  image.hidden = false;
  target.hidden = true;
}

function showTargets(): void {
  for (const side of ['left', 'right'] as const) {
    const image = getElement<HTMLImageElement>(`#${side}-image`);
    const target = getElement<HTMLDivElement>(`#${side}-target`);

    image.hidden = true;
    target.hidden = false;
  }
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
  const url = states[side].objectUrl;
  if (!url) {
    return;
  }

  URL.revokeObjectURL(url);
  states[side].objectUrl = null;
}

function getElement<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) {
    throw new Error(`Required element not found: ${selector}`);
  }
  return element;
}
