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

## Branch Model

- `main` is the release branch. Tags on `main` (e.g. `v1.2.3`) trigger the release workflow that publishes platform packages to GitHub Releases.
- `dev` is the integration branch. All feature and fix work targets `dev`.
- Cut feature branches from `dev` (e.g. `feature/word-wrap-toggle`, `fix/pdf-empty-text`) and open pull requests back into `dev`.
- A maintainer periodically opens a `dev` → `main` pull request to cut a release; tagging on `main` follows.
- Urgent hotfixes may branch directly from `main` and PR into `main`, but must also be merged into `dev` to keep branches in sync.

## Pull Requests

- Target `dev` by default. Only target `main` for release merges or hotfixes (see above).
- Keep changes focused and describe the user-visible behavior they affect.
- Run the relevant npm script before opening a pull request.
- Do not commit generated output such as `node_modules/`, `dist/`, logs, or local environment files.
- Include screenshots or short screen recordings for UI changes when helpful.
