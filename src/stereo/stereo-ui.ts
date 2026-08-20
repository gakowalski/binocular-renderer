import {
  clampPercent,
  createStereoTestPairSvg,
  isImageFitMode,
  swapPair,
  type ImageFitMode,
  type StereoPair,
  type StereoTestPairId,
} from './stereopair';

interface StereoPresentationState {
  fit: ImageFitMode;
  positionX: number;
  positionY: number;
}

const DEFAULT_PRESENTATION: StereoPresentationState = {
  fit: 'contain',
  positionX: 50,
  positionY: 50,
};

export function setupStereoUi(): void {
  const toolbarActions = requiredElement<HTMLElement>('.toolbar__actions');
  const appShell = requiredElement<HTMLElement>('.app-shell');

  const toggleButton = document.createElement('button');
  toggleButton.id = 'stereo-tools-toggle';
  toggleButton.type = 'button';
  toggleButton.textContent = 'Stereo tools';
  toggleButton.setAttribute('aria-expanded', 'false');
  toolbarActions.prepend(toggleButton);

  const panel = document.createElement('aside');
  panel.id = 'stereo-panel';
  panel.className = 'stereo-panel';
  panel.hidden = true;
  panel.innerHTML = stereoPanelMarkup();
  appShell.append(panel);

  const pairInput = requiredElement<HTMLInputElement>('#stereo-pair-files');
  const fitSelect = requiredElement<HTMLSelectElement>('#stereo-fit');
  const positionX = requiredElement<HTMLInputElement>('#stereo-position-x');
  const positionY = requiredElement<HTMLInputElement>('#stereo-position-y');
  let presentation = { ...DEFAULT_PRESENTATION };

  toggleButton.addEventListener('click', () => {
    panel.hidden = !panel.hidden;
    toggleButton.setAttribute('aria-expanded', String(!panel.hidden));
  });

  requiredElement<HTMLButtonElement>('#stereo-close').addEventListener('click', () => {
    panel.hidden = true;
    toggleButton.setAttribute('aria-expanded', 'false');
  });

  pairInput.addEventListener('change', () => {
    const files = Array.from(pairInput.files ?? []);
    if (files.length < 2) {
      setStatus('Choose two image files: first = left, second = right.', 'error');
      return;
    }

    assignPair({ left: files[0], right: files[1] });
    setStatus(`Loaded pair: ${files[0].name} / ${files[1].name}.`, 'ok');
  });

  requiredElement<HTMLButtonElement>('#stereo-swap').addEventListener('click', () => {
    const current = readCurrentPair();
    if (!current) {
      setStatus('Load both left and right source images before swapping.', 'error');
      return;
    }

    assignPair(swapPair(current));
    setStatus('Swapped source images. Per-eye calibration transforms were not changed.', 'ok');
  });

  requiredElement<HTMLSelectElement>('#stereo-test-pair').addEventListener('change', (event) => {
    const id = (event.currentTarget as HTMLSelectElement).value;
    if (!isStereoTestPairId(id)) {
      return;
    }

    const svgPair = createStereoTestPairSvg(id);
    assignPair({
      left: svgToFile(svgPair.left, `test-${id}-left.svg`),
      right: svgToFile(svgPair.right, `test-${id}-right.svg`),
    });
    setStatus(`Loaded built-in ${testPairLabel(id)} pair.`, 'ok');
  });

  fitSelect.addEventListener('change', () => {
    if (isImageFitMode(fitSelect.value)) {
      presentation.fit = fitSelect.value;
      applyPresentation(presentation);
    }
  });

  positionX.addEventListener('input', () => {
    presentation.positionX = clampPercent(positionX.valueAsNumber);
    applyPresentation(presentation);
  });

  positionY.addEventListener('input', () => {
    presentation.positionY = clampPercent(positionY.valueAsNumber);
    applyPresentation(presentation);
  });

  requiredElement<HTMLButtonElement>('#stereo-presentation-reset').addEventListener('click', () => {
    presentation = { ...DEFAULT_PRESENTATION };
    syncPresentationControls(presentation);
    applyPresentation(presentation);
    setStatus('Image fit and crop position reset.', 'ok');
  });

  requiredElement<HTMLButtonElement>('#reset').addEventListener('click', () => {
    presentation = { ...DEFAULT_PRESENTATION };
    pairInput.value = '';
    requiredElement<HTMLSelectElement>('#stereo-test-pair').value = '';
    syncPresentationControls(presentation);
    applyPresentation(presentation);
    setStatus('Stereo workflow reset.', 'ok');
  });

  const milestone = document.querySelector<HTMLElement>('.toolbar__identity span');
  if (milestone) {
    milestone.textContent = 'M5 · stereopair workflow';
  }

  syncPresentationControls(presentation);
  applyPresentation(presentation);
}

function stereoPanelMarkup(): string {
  return `
    <div class="stereo-panel__header">
      <div>
        <strong>Stereopair workflow</strong>
        <small>Sources change independently from per-eye calibration.</small>
      </div>
      <button id="stereo-close" type="button" aria-label="Close stereo tools">×</button>
    </div>

    <section class="stereo-panel__section">
      <h2>Sources</h2>
      <div class="stereo-row stereo-row--buttons">
        <label class="file-button" for="stereo-pair-files">Load two files</label>
        <input id="stereo-pair-files" class="visually-hidden" type="file" accept="image/*" multiple />
        <button id="stereo-swap" type="button">Swap L/R</button>
      </div>
      <p class="stereo-help">File order: first is left, second is right. Swap changes source images only; calibration stays assigned to each eye.</p>
    </section>

    <section class="stereo-panel__section">
      <h2>Built-in test pairs</h2>
      <select id="stereo-test-pair">
        <option value="">Choose a test pair…</option>
        <option value="zero">Zero disparity</option>
        <option value="horizontal">Horizontal disparity</option>
        <option value="vertical">Vertical mismatch</option>
        <option value="scale">Scale mismatch</option>
      </select>
    </section>

    <section class="stereo-panel__section">
      <h2>Common image presentation</h2>
      <label class="stereo-field">
        <span>Fit</span>
        <select id="stereo-fit">
          <option value="contain">Contain</option>
          <option value="cover">Cover / crop</option>
          <option value="fill">Fill</option>
        </select>
      </label>
      <label class="stereo-field">
        <span>Crop position X <output id="stereo-position-x-output">50</output>%</span>
        <input id="stereo-position-x" type="range" min="0" max="100" step="1" value="50" />
      </label>
      <label class="stereo-field">
        <span>Crop position Y <output id="stereo-position-y-output">50</output>%</span>
        <input id="stereo-position-y" type="range" min="0" max="100" step="1" value="50" />
      </label>
      <button id="stereo-presentation-reset" type="button">Reset presentation</button>
    </section>

    <output id="stereo-status" class="stereo-status" aria-live="polite">Ready.</output>
  `;
}

function readCurrentPair(): StereoPair<File> | null {
  const left = requiredElement<HTMLInputElement>('#left-file').files?.[0];
  const right = requiredElement<HTMLInputElement>('#right-file').files?.[0];
  return left && right ? { left, right } : null;
}

function assignPair(pair: StereoPair<File>): void {
  assignFile('left', pair.left);
  assignFile('right', pair.right);
}

function assignFile(side: 'left' | 'right', file: File): void {
  const input = requiredElement<HTMLInputElement>(`#${side}-file`);
  const transfer = new DataTransfer();
  transfer.items.add(file);
  input.files = transfer.files;
  input.dispatchEvent(new Event('change', { bubbles: true }));
}

function applyPresentation(state: StereoPresentationState): void {
  const x = clampPercent(state.positionX);
  const y = clampPercent(state.positionY);

  for (const side of ['left', 'right'] as const) {
    const image = requiredElement<HTMLImageElement>(`#${side}-image`);
    image.style.objectFit = state.fit;
    image.style.objectPosition = `${x}% ${y}%`;
  }

  requiredElement<HTMLOutputElement>('#stereo-position-x-output').value = String(x);
  requiredElement<HTMLOutputElement>('#stereo-position-y-output').value = String(y);
}

function syncPresentationControls(state: StereoPresentationState): void {
  requiredElement<HTMLSelectElement>('#stereo-fit').value = state.fit;
  requiredElement<HTMLInputElement>('#stereo-position-x').value = String(state.positionX);
  requiredElement<HTMLInputElement>('#stereo-position-y').value = String(state.positionY);
}

function svgToFile(svg: string, filename: string): File {
  return new File([svg], filename, { type: 'image/svg+xml' });
}

function isStereoTestPairId(value: string): value is StereoTestPairId {
  return value === 'zero' || value === 'horizontal' || value === 'vertical' || value === 'scale';
}

function testPairLabel(id: StereoTestPairId): string {
  switch (id) {
    case 'zero': return 'zero-disparity';
    case 'horizontal': return 'horizontal-disparity';
    case 'vertical': return 'vertical-mismatch';
    case 'scale': return 'scale-mismatch';
  }
}

function setStatus(message: string, kind: 'ok' | 'error'): void {
  const output = requiredElement<HTMLOutputElement>('#stereo-status');
  output.value = message;
  output.dataset.kind = kind;
}

function requiredElement<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) {
    throw new Error(`Required element not found: ${selector}`);
  }
  return element;
}
