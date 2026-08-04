# AMO source build instructions

## Requirements

- Node.js 20 or later
- npm 10 or later

## Reproduce the submitted extension

Run the following commands from the extracted source archive root:

```sh
npm ci
npm run build
```

The unpacked extension is generated in `dist/`. The build runs TypeScript without bundling,
minification, obfuscation, or remote code generation. Files under `src/dev/` are compiled by
TypeScript and then removed from the production `dist/` by `scripts/build.mjs`.

The ZIP submitted as the extension package contains the contents of this production `dist/`
directory at its archive root.
