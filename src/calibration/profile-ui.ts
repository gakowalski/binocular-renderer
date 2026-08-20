import type { BinocularTransforms, TranslationLinkMode } from '../renderer/transform';
import {
  createCalibrationProfile,
  decodeProfileCollection,
  duplicateCalibrationProfile,
  encodeProfileCollection,
  parseCalibrationProfile,
  removeProfile,
  serializeCalibrationProfile,
  updateCalibrationProfile,
  upsertProfile,
  type CalibrationProfile,
  type ProfileTargetType,
} from './profile';

const STORAGE_KEY = 'binocular-renderer.profiles.v1';

export interface LiveCalibrationState {
  transforms: BinocularTransforms;
  translationLinkMode: TranslationLinkMode;
  targetType: ProfileTargetType;
  uniformScale: {
    left: boolean;
    right: boolean;
  };
}

export interface ProfileUiOptions {
  appVersion: string;
  getState: () => LiveCalibrationState;
  applyProfile: (profile: CalibrationProfile) => void;
}

export function setupProfileUi(options: ProfileUiOptions): void {
  const toolbarActions = requiredElement<HTMLElement>('.toolbar__actions');
  toolbarActions.insertAdjacentHTML(
    'afterbegin',
    '<button id="profiles-toggle" type="button" aria-expanded="false">Profiles</button>',
  );

  const appShell = requiredElement<HTMLElement>('.app-shell');
  appShell.insertAdjacentHTML('beforeend', profilePanelMarkup());

  let profiles = loadProfiles();
  let selectedId = '';

  const panel = requiredElement<HTMLElement>('#profile-panel');
  const toggle = requiredElement<HTMLButtonElement>('#profiles-toggle');
  const select = requiredElement<HTMLSelectElement>('#profile-select');
  const importInput = requiredElement<HTMLInputElement>('#profile-import-file');

  toggle.addEventListener('click', () => {
    const nextHidden = !panel.hidden;
    panel.hidden = nextHidden;
    toggle.setAttribute('aria-expanded', String(!nextHidden));
  });

  requiredElement<HTMLButtonElement>('#profiles-close').addEventListener('click', () => {
    panel.hidden = true;
    toggle.setAttribute('aria-expanded', 'false');
  });

  select.addEventListener('change', () => {
    selectedId = select.value;
    renderSelectedProfile();
  });

  requiredElement<HTMLButtonElement>('#profile-save-new').addEventListener('click', () => {
    try {
      const profile = createCalibrationProfile({
        id: createId(),
        name: profileName(),
        appVersion: options.appVersion,
        transforms: options.getState().transforms,
        ui: currentUiState(options),
        display: currentDisplayMetadata(),
        notes: profileNotes(),
        nowIso: new Date().toISOString(),
      });
      profiles = upsertProfile(profiles, profile);
      selectedId = profile.id;
      persistAndRender('Saved new calibration profile.');
    } catch (error) {
      showStatus(errorMessage(error), true);
    }
  });

  requiredElement<HTMLButtonElement>('#profile-update').addEventListener('click', () => {
    const current = selectedProfile();
    if (!current) {
      showStatus('Select a profile to update.', true);
      return;
    }
    try {
      const updated = updateCalibrationProfile(current, {
        name: profileName(),
        appVersion: options.appVersion,
        transforms: options.getState().transforms,
        ui: currentUiState(options),
        display: currentDisplayMetadata(),
        notes: profileNotes(),
        nowIso: new Date().toISOString(),
      });
      profiles = upsertProfile(profiles, updated);
      persistAndRender('Updated selected profile.');
    } catch (error) {
      showStatus(errorMessage(error), true);
    }
  });

  requiredElement<HTMLButtonElement>('#profile-load').addEventListener('click', () => {
    const current = selectedProfile();
    if (!current) {
      showStatus('Select a profile to load.', true);
      return;
    }
    options.applyProfile(current);
    renderSelectedProfile();
    showStatus(`Loaded “${current.name}”.`);
  });

  requiredElement<HTMLButtonElement>('#profile-duplicate').addEventListener('click', () => {
    const current = selectedProfile();
    if (!current) {
      showStatus('Select a profile to duplicate.', true);
      return;
    }
    const duplicate = duplicateCalibrationProfile(current, createId(), new Date().toISOString());
    profiles = upsertProfile(profiles, duplicate);
    selectedId = duplicate.id;
    persistAndRender('Duplicated selected profile.');
  });

  requiredElement<HTMLButtonElement>('#profile-delete').addEventListener('click', () => {
    const current = selectedProfile();
    if (!current) {
      showStatus('Select a profile to delete.', true);
      return;
    }
    profiles = removeProfile(profiles, current.id);
    selectedId = profiles[0]?.id ?? '';
    persistAndRender('Deleted selected profile.');
  });

  requiredElement<HTMLButtonElement>('#profile-export').addEventListener('click', () => {
    const current = selectedProfile();
    if (!current) {
      showStatus('Select a profile to export.', true);
      return;
    }
    const blob = new Blob([serializeCalibrationProfile(current)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${safeFilename(current.name)}.binocular-profile.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    showStatus('Exported selected profile as JSON.');
  });

  requiredElement<HTMLButtonElement>('#profile-import').addEventListener('click', () => importInput.click());
  importInput.addEventListener('change', async () => {
    const file = importInput.files?.[0];
    importInput.value = '';
    if (!file) {
      return;
    }
    try {
      const imported = parseCalibrationProfile(await file.text());
      const profile = {
        ...imported,
        id: profiles.some((candidate) => candidate.id === imported.id) ? createId() : imported.id,
        updatedAt: new Date().toISOString(),
      };
      profiles = upsertProfile(profiles, profile);
      selectedId = profile.id;
      persistAndRender('Imported profile JSON.');
    } catch (error) {
      showStatus(errorMessage(error), true);
    }
  });

  renderProfileList();

  function renderProfileList(): void {
    if (!selectedId || !profiles.some((profile) => profile.id === selectedId)) {
      selectedId = profiles[0]?.id ?? '';
    }

    select.replaceChildren();
    const placeholder = new Option(profiles.length ? 'Select profile…' : 'No saved profiles', '');
    select.add(placeholder);
    for (const profile of profiles) {
      select.add(new Option(`${profile.name} · ${formatDate(profile.updatedAt)}`, profile.id));
    }
    select.value = selectedId;
    renderSelectedProfile();
  }

  function renderSelectedProfile(): void {
    const profile = selectedProfile();
    requiredElement<HTMLInputElement>('#profile-name').value = profile?.name ?? '';
    requiredElement<HTMLTextAreaElement>('#profile-notes').value = profile?.notes ?? '';
    requiredElement<HTMLInputElement>('#profile-distance').value = profile?.display.viewingDistanceMm
      ? String(profile.display.viewingDistanceMm)
      : '';

    const details = requiredElement<HTMLElement>('#profile-details');
    if (!profile) {
      details.textContent = 'Create a profile to preserve the current affine calibration and session metadata.';
      return;
    }

    details.textContent = [
      `Schema v${profile.schemaVersion}`,
      `app ${profile.appVersion}`,
      `${profile.display.screenWidthPx}×${profile.display.screenHeightPx} screen`,
      `${profile.display.viewportWidthPx}×${profile.display.viewportHeightPx} viewport`,
      `DPR ${profile.display.devicePixelRatio}`,
      profile.display.fullscreen ? 'fullscreen' : 'windowed',
    ].join(' · ');
  }

  function selectedProfile(): CalibrationProfile | undefined {
    return profiles.find((profile) => profile.id === selectedId);
  }

  function persistAndRender(message: string): void {
    localStorage.setItem(STORAGE_KEY, encodeProfileCollection(profiles));
    renderProfileList();
    showStatus(message);
  }
}

function currentUiState(options: ProfileUiOptions) {
  const state = options.getState();
  return {
    translationLinkMode: state.translationLinkMode,
    targetType: state.targetType,
    uniformScale: { ...state.uniformScale },
  };
}

function currentDisplayMetadata() {
  const distance = requiredElement<HTMLInputElement>('#profile-distance').valueAsNumber;
  return {
    screenWidthPx: Math.max(1, window.screen.width),
    screenHeightPx: Math.max(1, window.screen.height),
    viewportWidthPx: Math.max(1, window.innerWidth),
    viewportHeightPx: Math.max(1, window.innerHeight),
    devicePixelRatio: Math.max(0.01, window.devicePixelRatio || 1),
    fullscreen: Boolean(document.fullscreenElement),
    ...(Number.isFinite(distance) && distance > 0 ? { viewingDistanceMm: distance } : {}),
  };
}

function loadProfiles(): CalibrationProfile[] {
  return decodeProfileCollection(localStorage.getItem(STORAGE_KEY));
}

function profileName(): string {
  return requiredElement<HTMLInputElement>('#profile-name').value;
}

function profileNotes(): string {
  return requiredElement<HTMLTextAreaElement>('#profile-notes').value;
}

function showStatus(message: string, error = false): void {
  const status = requiredElement<HTMLOutputElement>('#profile-status');
  status.value = message;
  status.classList.toggle('profile-status--error', error);
}

function createId(): string {
  if (typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `profile-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function safeFilename(value: string): string {
  const safe = value.trim().toLowerCase().replace(/[^a-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '');
  return safe || 'calibration';
}

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unexpected profile error.';
}

function requiredElement<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) {
    throw new Error(`Required element not found: ${selector}`);
  }
  return element;
}

function profilePanelMarkup(): string {
  return `
    <aside id="profile-panel" class="profile-panel" aria-label="Calibration profiles" hidden>
      <div class="profile-panel__header">
        <div>
          <strong>Calibration profiles</strong>
          <span>Local browser storage + portable JSON</span>
        </div>
        <button id="profiles-close" type="button" aria-label="Close profiles">×</button>
      </div>

      <label class="profile-field">
        <span>Saved profile</span>
        <select id="profile-select"></select>
      </label>

      <label class="profile-field">
        <span>Name</span>
        <input id="profile-name" type="text" maxlength="120" placeholder="e.g. Evening, 70 cm, no glasses" />
      </label>

      <label class="profile-field">
        <span>Viewing distance (optional)</span>
        <div class="profile-distance">
          <input id="profile-distance" type="number" min="1" step="1" placeholder="700" />
          <span>mm</span>
        </div>
      </label>

      <label class="profile-field">
        <span>Session notes</span>
        <textarea id="profile-notes" rows="4" placeholder="Conditions, fatigue, correction used, observations…"></textarea>
      </label>

      <div class="profile-actions profile-actions--primary">
        <button id="profile-save-new" type="button">Save new</button>
        <button id="profile-update" type="button">Update</button>
        <button id="profile-load" type="button">Load</button>
      </div>

      <div class="profile-actions">
        <button id="profile-duplicate" type="button">Duplicate</button>
        <button id="profile-export" type="button">Export JSON</button>
        <button id="profile-import" type="button">Import JSON</button>
        <button id="profile-delete" type="button">Delete</button>
        <input id="profile-import-file" class="visually-hidden" type="file" accept="application/json,.json" />
      </div>

      <p id="profile-details" class="profile-details"></p>
      <output id="profile-status" class="profile-status" aria-live="polite"></output>
      <p class="profile-privacy">Profiles contain calibration values and metadata only. Local source images are never embedded in profile JSON.</p>
    </aside>
  `;
}
