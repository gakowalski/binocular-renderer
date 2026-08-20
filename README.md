# Binocular Renderer

Experimental application for personalized binocular rendering and calibration.

The project explores displaying and transforming paired images so that binocular geometry can be calibrated to an individual viewer. It is an experimental visualization tool and is not intended for diagnosis or treatment.

## Current milestone

M4 provides a desktop-first affine calibration viewer with persistent local profiles:

- left and right viewports
- independent local image loading for each side
- horizontal and vertical translation
- per-view rotation
- per-view `scaleX` and `scaleY`
- optional uniform scale linking (`X = Y`) per view
- independent and symmetric translation editing
- derived relative translation, rotation and scale values
- generated cross, grid, frame and radial calibration targets
- keyboard translation nudging
- browser fullscreen mode
- versioned calibration profiles in localStorage
- profile save, update, load, duplicate and delete actions
- JSON profile export/import
- session notes and optional viewing-distance metadata
- no backend and no image upload

Profile JSON stores calibration parameters and session/display metadata only. Loaded source images are never embedded in saved profiles.

## Development

Requirements: a current Node.js LTS release and npm.

```bash
npm install
npm run dev
```

Verification:

```bash
npm run typecheck
npm test
npm run build
```

The application is intentionally desktop-first. Browser zoom should preferably remain at 100% during controlled experiments.

## Documentation

Project semantics and agent instructions live in:

- `AGENTS.md`
- `docs/PROJECT_SPEC.md`
- `docs/VISION_MODEL.md`
- `docs/CALIBRATION.md`
- `docs/PROFILE_SCHEMA.md`
- `docs/ROADMAP.md`
