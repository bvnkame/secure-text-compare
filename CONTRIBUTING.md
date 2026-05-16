# Contributing

Thanks for helping improve Secure Text Compare.

## Development

```sh
npm install
npm run dev
```

## Build

```sh
npm run pack
npm run dist
```

`npm run pack` creates an unpacked local build. `npm run dist` creates distributable desktop packages through `electron-builder`.

## Pull Requests

- Keep changes focused and describe the user-visible behavior they affect.
- Run the relevant npm script before opening a pull request.
- Do not commit generated output such as `node_modules/`, `dist/`, logs, or local environment files.
- Include screenshots or short screen recordings for UI changes when helpful.
