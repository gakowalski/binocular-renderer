import type { BinocularTransforms, TranslationLinkMode } from '../renderer/transform';

export const PROFILE_SCHEMA_VERSION = 1 as const;
export type ProfileTargetType = 'cross' | 'grid' | 'frame' | 'radial';

export interface ProfileDisplayMetadata {
  screenWidthPx: number;
  screenHeightPx: number;
  viewportWidthPx: number;
  viewportHeightPx: number;
  devicePixelRatio: number;
  fullscreen: boolean;
  viewingDistanceMm?: number;
}

export interface ProfileUiState {
  translationLinkMode: TranslationLinkMode;
  targetType: ProfileTargetType;
  uniformScale: {
    left: boolean;
    right: boolean;
  };
}

export interface CalibrationProfile {
  schemaVersion: typeof PROFILE_SCHEMA_VERSION;
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  appVersion: string;
  transforms: BinocularTransforms;
  ui: ProfileUiState;
  display: ProfileDisplayMetadata;
  notes: string;
}

export interface CreateProfileInput {
  id: string;
  name: string;
  appVersion: string;
  transforms: BinocularTransforms;
  ui: ProfileUiState;
  display: ProfileDisplayMetadata;
  notes?: string;
  nowIso: string;
}

export function createCalibrationProfile(input: CreateProfileInput): CalibrationProfile {
  return {
    schemaVersion: PROFILE_SCHEMA_VERSION,
    id: requireNonEmptyString(input.id, 'id'),
    name: normalizeName(input.name),
    createdAt: input.nowIso,
    updatedAt: input.nowIso,
    appVersion: requireNonEmptyString(input.appVersion, 'appVersion'),
    transforms: cloneTransforms(input.transforms),
    ui: cloneUiState(input.ui),
    display: cloneDisplayMetadata(input.display),
    notes: input.notes?.trim() ?? '',
  };
}

export function updateCalibrationProfile(
  profile: CalibrationProfile,
  updates: Omit<CreateProfileInput, 'id' | 'nowIso'> & { nowIso: string },
): CalibrationProfile {
  return {
    ...createCalibrationProfile({
      ...updates,
      id: profile.id,
      nowIso: updates.nowIso,
    }),
    createdAt: profile.createdAt,
  };
}

export function duplicateCalibrationProfile(
  profile: CalibrationProfile,
  newId: string,
  nowIso: string,
  name = `${profile.name} copy`,
): CalibrationProfile {
  return {
    ...structuredProfileCopy(profile),
    id: requireNonEmptyString(newId, 'id'),
    name: normalizeName(name),
    createdAt: nowIso,
    updatedAt: nowIso,
  };
}

export function serializeCalibrationProfile(profile: CalibrationProfile): string {
  return `${JSON.stringify(profile, null, 2)}\n`;
}

export function parseCalibrationProfile(json: string): CalibrationProfile {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new Error('Profile JSON is not valid JSON.');
  }
  return validateCalibrationProfile(parsed);
}

export function validateCalibrationProfile(value: unknown): CalibrationProfile {
  if (!isRecord(value)) {
    throw new Error('Profile must be a JSON object.');
  }
  if (value.schemaVersion !== PROFILE_SCHEMA_VERSION) {
    throw new Error(`Unsupported profile schema version: ${String(value.schemaVersion)}.`);
  }

  const transforms = validateTransforms(value.transforms);
  const ui = validateUiState(value.ui);
  const display = validateDisplayMetadata(value.display);

  return {
    schemaVersion: PROFILE_SCHEMA_VERSION,
    id: requireNonEmptyString(value.id, 'id'),
    name: normalizeName(requireNonEmptyString(value.name, 'name')),
    createdAt: requireIsoString(value.createdAt, 'createdAt'),
    updatedAt: requireIsoString(value.updatedAt, 'updatedAt'),
    appVersion: requireNonEmptyString(value.appVersion, 'appVersion'),
    transforms,
    ui,
    display,
    notes: typeof value.notes === 'string' ? value.notes : '',
  };
}

export function encodeProfileCollection(profiles: CalibrationProfile[]): string {
  return JSON.stringify(profiles);
}

export function decodeProfileCollection(raw: string | null): CalibrationProfile[] {
  if (!raw) {
    return [];
  }

  try {
    const value: unknown = JSON.parse(raw);
    if (!Array.isArray(value)) {
      return [];
    }
    return value.flatMap((item) => {
      try {
        return [validateCalibrationProfile(item)];
      } catch {
        return [];
      }
    });
  } catch {
    return [];
  }
}

export function upsertProfile(
  profiles: CalibrationProfile[],
  profile: CalibrationProfile,
): CalibrationProfile[] {
  const withoutCurrent = profiles.filter((candidate) => candidate.id !== profile.id);
  return [profile, ...withoutCurrent].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function removeProfile(profiles: CalibrationProfile[], id: string): CalibrationProfile[] {
  return profiles.filter((profile) => profile.id !== id);
}

function validateTransforms(value: unknown): BinocularTransforms {
  if (!isRecord(value)) {
    throw new Error('transforms must be an object.');
  }
  return {
    left: validateViewTransform(value.left, 'transforms.left'),
    right: validateViewTransform(value.right, 'transforms.right'),
  };
}

function validateViewTransform(value: unknown, path: string) {
  if (!isRecord(value)) {
    throw new Error(`${path} must be an object.`);
  }
  const scaleX = requireFiniteNumber(value.scaleX, `${path}.scaleX`);
  const scaleY = requireFiniteNumber(value.scaleY, `${path}.scaleY`);
  if (scaleX <= 0 || scaleY <= 0) {
    throw new Error(`${path} scale values must be greater than zero.`);
  }
  return {
    offsetX: requireFiniteNumber(value.offsetX, `${path}.offsetX`),
    offsetY: requireFiniteNumber(value.offsetY, `${path}.offsetY`),
    rotationDeg: requireFiniteNumber(value.rotationDeg, `${path}.rotationDeg`),
    scaleX,
    scaleY,
  };
}

function validateUiState(value: unknown): ProfileUiState {
  if (!isRecord(value) || !isRecord(value.uniformScale)) {
    throw new Error('ui must contain uniformScale state.');
  }
  const mode = value.translationLinkMode;
  const target = value.targetType;
  if (mode !== 'independent' && mode !== 'symmetric') {
    throw new Error('ui.translationLinkMode is invalid.');
  }
  if (target !== 'cross' && target !== 'grid' && target !== 'frame' && target !== 'radial') {
    throw new Error('ui.targetType is invalid.');
  }
  if (typeof value.uniformScale.left !== 'boolean' || typeof value.uniformScale.right !== 'boolean') {
    throw new Error('ui.uniformScale values must be booleans.');
  }
  return {
    translationLinkMode: mode,
    targetType: target,
    uniformScale: {
      left: value.uniformScale.left,
      right: value.uniformScale.right,
    },
  };
}

function validateDisplayMetadata(value: unknown): ProfileDisplayMetadata {
  if (!isRecord(value)) {
    throw new Error('display must be an object.');
  }
  const display: ProfileDisplayMetadata = {
    screenWidthPx: requirePositiveNumber(value.screenWidthPx, 'display.screenWidthPx'),
    screenHeightPx: requirePositiveNumber(value.screenHeightPx, 'display.screenHeightPx'),
    viewportWidthPx: requirePositiveNumber(value.viewportWidthPx, 'display.viewportWidthPx'),
    viewportHeightPx: requirePositiveNumber(value.viewportHeightPx, 'display.viewportHeightPx'),
    devicePixelRatio: requirePositiveNumber(value.devicePixelRatio, 'display.devicePixelRatio'),
    fullscreen: typeof value.fullscreen === 'boolean' ? value.fullscreen : false,
  };
  if (value.viewingDistanceMm !== undefined) {
    display.viewingDistanceMm = requirePositiveNumber(value.viewingDistanceMm, 'display.viewingDistanceMm');
  }
  return display;
}

function structuredProfileCopy(profile: CalibrationProfile): CalibrationProfile {
  return {
    ...profile,
    transforms: cloneTransforms(profile.transforms),
    ui: cloneUiState(profile.ui),
    display: cloneDisplayMetadata(profile.display),
  };
}

function cloneTransforms(transforms: BinocularTransforms): BinocularTransforms {
  return {
    left: { ...transforms.left },
    right: { ...transforms.right },
  };
}

function cloneUiState(ui: ProfileUiState): ProfileUiState {
  return {
    translationLinkMode: ui.translationLinkMode,
    targetType: ui.targetType,
    uniformScale: { ...ui.uniformScale },
  };
}

function cloneDisplayMetadata(display: ProfileDisplayMetadata): ProfileDisplayMetadata {
  return { ...display };
}

function normalizeName(name: string): string {
  const trimmed = name.trim();
  return trimmed || 'Untitled calibration';
}

function requireNonEmptyString(value: unknown, path: string): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`${path} must be a non-empty string.`);
  }
  return value.trim();
}

function requireIsoString(value: unknown, path: string): string {
  const text = requireNonEmptyString(value, path);
  if (!Number.isFinite(Date.parse(text))) {
    throw new Error(`${path} must be an ISO-compatible date string.`);
  }
  return text;
}

function requireFiniteNumber(value: unknown, path: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`${path} must be a finite number.`);
  }
  return value;
}

function requirePositiveNumber(value: unknown, path: string): number {
  const number = requireFiniteNumber(value, path);
  if (number <= 0) {
    throw new Error(`${path} must be greater than zero.`);
  }
  return number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
