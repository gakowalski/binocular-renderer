# Calibration Profile Schema

## Purpose

Calibration profiles preserve a reproducible binocular rendering state without storing source images. They are designed for repeated personal experiments, comparison between sessions, and portable JSON export/import.

The profile is an experiment record, not a medical record or prescription.

## Schema version

Current schema:

```text
schemaVersion = 1
```

Import rejects unsupported schema versions instead of silently reinterpreting fields. Future semantic changes must add explicit migration logic or a new schema version.

## Top-level structure

```ts
interface CalibrationProfile {
  schemaVersion: 1;
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
```

`createdAt` and `updatedAt` are ISO-compatible timestamps. Updating an existing profile preserves `createdAt`; duplication creates a new identity and new timestamps.

## Transform state

Both views are stored in full rather than only as relative values:

```ts
interface BinocularTransforms {
  left: ViewTransform;
  right: ViewTransform;
}

interface ViewTransform {
  offsetX: number;       // CSS/display px
  offsetY: number;       // CSS/display px
  rotationDeg: number;   // degrees, clockwise in CSS convention
  scaleX: number;        // multiplier, neutral 1
  scaleY: number;        // multiplier, neutral 1
}
```

Scale values must be finite and greater than zero. Profile parsing rejects invalid numeric values.

## UI state

Profiles also store interaction state that affects how calibration is reproduced:

```ts
interface ProfileUiState {
  translationLinkMode: 'independent' | 'symmetric';
  targetType: 'cross' | 'grid' | 'frame' | 'radial';
  uniformScale: {
    left: boolean;
    right: boolean;
  };
}
```

These values do not change the mathematical meaning of transform parameters. They restore the calibration workflow around the stored transform.

## Display/session metadata

Schema v1 records browser-observable display context:

```ts
interface ProfileDisplayMetadata {
  screenWidthPx: number;
  screenHeightPx: number;
  viewportWidthPx: number;
  viewportHeightPx: number;
  devicePixelRatio: number;
  fullscreen: boolean;
  viewingDistanceMm?: number;
}
```

`viewingDistanceMm` is optional and manually entered. The browser application does not claim to infer physical monitor DPI, physical screen dimensions, browser zoom, or viewing distance automatically.

Display pixel fields reflect browser-reported screen/viewport geometry and are primarily comparison metadata. Physical geometry conversion belongs to M6.

## Notes

`notes` is free-form session context, for example:

- correction/glasses state
- fatigue or time-of-day observations
- posture/head position
- target used
- subjective comfort or stability

No interpretation of these notes is performed by the application.

## Local persistence

Profiles are stored as a JSON array under a versioned localStorage key:

```text
binocular-renderer.profiles.v1
```

Corrupt collection entries are ignored when local storage is loaded so one damaged entry does not prevent the application from opening.

## Import/export

Export produces one human-readable JSON profile. Import validates:

- schema version
- required strings and timestamps
- finite transform values
- positive scales
- valid UI enum values
- positive display geometry values

If an imported profile ID already exists locally, the imported copy receives a new local ID rather than overwriting the existing profile silently.

## Privacy boundary

Profiles never embed:

- source image bytes
- object URLs
- file paths
- server identifiers
- telemetry

Loaded images remain local browser resources and are independent of profile persistence.
