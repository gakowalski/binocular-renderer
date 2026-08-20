# Binocular Renderer

Experimental application for personalized binocular rendering and calibration.

The project explores displaying and transforming paired images so that binocular geometry can be calibrated to an individual viewer. It is an experimental visualization tool and is not intended for diagnosis or treatment.

## Current milestone

M1 provides a desktop-first two-panel viewer with:

- left and right viewports
- identical generated central cross targets
- independent local image loading for each side
- one-click target restore and full reset
- browser fullscreen mode
- no backend and no image upload

Geometric calibration controls begin in M2.

## Development

Requirements: a current Node.js LTS release and npm.

```bash
npm install
npm run dev
```

Verification:

```bash
npm run typecheck
npm run build
```

The application is intentionally desktop-first. Browser zoom should preferably remain at 100% during controlled experiments.

## Documentation

Project semantics and agent instructions live in:

- `AGENTS.md`
- `docs/PROJECT_SPEC.md`
- `docs/VISION_MODEL.md`
- `docs/CALIBRATION.md`
- `docs/ROADMAP.md`
