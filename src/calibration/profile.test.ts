import { describe, expect, it } from 'vitest';
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
} from './profile';
import { createNeutralBinocularTransforms } from '../renderer/transform';

function fixtureProfile() {
  const transforms = createNeutralBinocularTransforms();
  transforms.left.offsetX = -12.5;
  transforms.right.offsetY = 3.25;
  transforms.right.rotationDeg = 1.75;
  transforms.left.scaleX = 1.02;
  transforms.left.scaleY = 0.98;

  return createCalibrationProfile({
    id: 'profile-1',
    name: 'Evening calibration',
    appVersion: '0.4.0',
    transforms,
    ui: {
      translationLinkMode: 'symmetric',
      targetType: 'grid',
      uniformScale: { left: false, right: true },
    },
    display: {
      screenWidthPx: 2560,
      screenHeightPx: 1440,
      viewportWidthPx: 1920,
      viewportHeightPx: 1080,
      devicePixelRatio: 1.25,
      fullscreen: true,
      viewingDistanceMm: 700,
    },
    notes: 'No glasses; short session.',
    nowIso: '2026-08-20T16:55:00.000Z',
  });
}

describe('calibration profiles', () => {
  it('round-trips the versioned profile JSON without changing transforms', () => {
    const profile = fixtureProfile();
    const parsed = parseCalibrationProfile(serializeCalibrationProfile(profile));

    expect(parsed).toEqual(profile);
    expect(parsed.transforms).not.toBe(profile.transforms);
  });

  it('rejects unsupported schema versions', () => {
    const json = serializeCalibrationProfile(fixtureProfile()).replace('"schemaVersion": 1', '"schemaVersion": 2');
    expect(() => parseCalibrationProfile(json)).toThrow(/Unsupported profile schema version/);
  });

  it('rejects non-positive scale values', () => {
    const profile = fixtureProfile();
    profile.transforms.left.scaleX = 0;
    expect(() => parseCalibrationProfile(JSON.stringify(profile))).toThrow(/greater than zero/);
  });

  it('updates a profile while retaining id and original creation time', () => {
    const profile = fixtureProfile();
    const updatedTransforms = createNeutralBinocularTransforms();
    updatedTransforms.right.offsetX = 30;

    const updated = updateCalibrationProfile(profile, {
      name: 'Updated calibration',
      appVersion: '0.4.0',
      transforms: updatedTransforms,
      ui: profile.ui,
      display: profile.display,
      notes: 'Second pass',
      nowIso: '2026-08-20T17:00:00.000Z',
    });

    expect(updated.id).toBe(profile.id);
    expect(updated.createdAt).toBe(profile.createdAt);
    expect(updated.updatedAt).toBe('2026-08-20T17:00:00.000Z');
    expect(updated.transforms.right.offsetX).toBe(30);
  });

  it('duplicates with a new identity and timestamps', () => {
    const duplicate = duplicateCalibrationProfile(
      fixtureProfile(),
      'profile-2',
      '2026-08-20T17:05:00.000Z',
    );

    expect(duplicate.id).toBe('profile-2');
    expect(duplicate.name).toContain('copy');
    expect(duplicate.createdAt).toBe('2026-08-20T17:05:00.000Z');
    expect(duplicate.transforms).toEqual(fixtureProfile().transforms);
  });

  it('persists profile collections and ignores corrupt entries', () => {
    const profile = fixtureProfile();
    expect(decodeProfileCollection(encodeProfileCollection([profile]))).toEqual([profile]);

    const mixed = JSON.stringify([profile, { schemaVersion: 999 }, null]);
    expect(decodeProfileCollection(mixed)).toEqual([profile]);
    expect(decodeProfileCollection('not-json')).toEqual([]);
  });

  it('upserts newest profiles first and removes by id', () => {
    const first = fixtureProfile();
    const second = duplicateCalibrationProfile(first, 'profile-2', '2026-08-20T17:05:00.000Z');
    const profiles = upsertProfile(upsertProfile([], first), second);

    expect(profiles.map((profile) => profile.id)).toEqual(['profile-2', 'profile-1']);
    expect(removeProfile(profiles, 'profile-2').map((profile) => profile.id)).toEqual(['profile-1']);
  });
});
