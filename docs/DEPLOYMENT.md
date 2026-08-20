# Deployment

Binocular Renderer is a Vite + TypeScript application. The repository root is source code, not a production web root.

## Development

Run the Vite development server:

```bash
npm install
npm run dev
```

Vite transpiles TypeScript and serves browser-compatible JavaScript during development.

Do not point Apache, Nginx, IIS or another plain static server at the repository root and open the source `index.html`. A normal static server will return the `.ts` files unchanged. Browsers do not execute TypeScript source files.

Changing the MIME type for `.ts` to `application/javascript` is not a valid fix because the files still contain TypeScript syntax and type-only constructs.

## Production build

Create a deployable static site with:

```bash
npm install
npm run build
```

The deployable output is written to:

```text
dist/
```

Only the contents of `dist/` should be exposed by the production web server.

The Vite configuration uses `base: './'`, so the generated HTML and assets use relative URLs and can be hosted at the domain root or inside a subdirectory.

## Apache example

Point the virtual host or alias at the built directory, not the repository root. Conceptually:

```apache
DocumentRoot /path/to/binocular-renderer/dist

<Directory /path/to/binocular-renderer/dist>
    Require all granted
</Directory>
```

Alternatively, copy the contents of `dist/` into an existing static web root after every build.

## Nginx example

Conceptually:

```nginx
root /path/to/binocular-renderer/dist;
index index.html;
```

No special MIME mapping for `.ts` is needed because a valid production deployment contains no TypeScript files.

## GitHub Actions artifact

CI builds the application and uploads the resulting `dist/` directory as an artifact named:

```text
binocular-renderer-dist
```

This artifact is the same production output that passed type checking, tests, build verification and deployment-path checks.

## Deployment invariant

A production response must never request files such as:

```text
src/main.ts
src/calibration/profile-bootstrap.ts
src/stereo/stereo-bootstrap.ts
```

If DevTools shows requests for `.ts`, the source tree is being served instead of the production build.
