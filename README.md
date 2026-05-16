# Secure Text Compare

A private local two-pane text comparison app built with Electron. Secure Text Compare compares text entirely on your machine and is designed for quick side-by-side review of plain text, PDFs, source snippets, logs, JSON, Markdown, and similar files.

## Requirements

- Node.js 20 or newer
- npm

## Run

```sh
npm install
npm run dev
```

## Scripts

- `npm run dev` starts the Electron app for local development.
- `npm start` starts the Electron app.
- `npm run pack` creates an unpacked desktop build.
- `npm run dist` creates distributable desktop packages.
- `npm run dist:mac` creates macOS packages.
- `npm run dist:win` creates Windows packages.
- `npm run dist:linux` creates Linux packages.

## Build Desktop App

```sh
npm run dist
```

The Electron build targets macOS, Windows, and Linux packages through `electron-builder`.

## CI/CD

GitHub Actions builds installable packages for macOS, Windows, and Linux on pushes, pull requests, and manual runs. Build artifacts are uploaded from each platform job.

Tag a release as `v1.2.3` to publish platform packages to GitHub Releases:

```sh
git tag v1.2.3
git push origin v1.2.3
```

The release workflow uses `electron-builder` GitHub publishing metadata so packaged apps can discover updates from GitHub Releases.

The default package metadata points to `bvnkame/Secure-Text-Compare`. If you publish the repository under a different GitHub owner or name, update the `repository`, `homepage`, and `bugs` fields in `package.json` before creating releases.

## Updates

Packaged builds include a toolbar **Update** button. It checks GitHub Releases, downloads a newer version when one is available, and changes to **Install** after the update is ready.

Update checks are disabled during `npm run dev` because Electron update metadata only exists in packaged release builds.

## Features

- Paste text directly into the left and right editors.
- Load local text or PDF files into either side.
- Extract and compare selectable PDF text locally.
- Convert both sides to one line by trimming and collapsing whitespace.
- Render two-page one-line word diff output.
- Switch diff display between one-line output and original source formatting.
- Switch the app font between system, rounded, serif, and mono styles.
- Use grouped diff mode to collapse equal runs and changed runs into aligned blocks.
- Use the minimap on the right side of the result panel to jump between changed blocks.
- Toggle word wrap for long text.
- Scroll both rendered pages in sync.
- Compare by word while trimming surrounding whitespace and ignoring spacing/newline differences.
- Highlight added, removed, and changed words.
- Show changed-block details on hover.
- Toggle inline word highlights.
- Autosave text, settings, filenames, and zoom locally.
- Save and reopen sessions as JSON files.
- Export HTML reports to a selected folder with completion prompts and local export logs.
- Resize editor/diff panels and zoom text size.
- Drag the horizontal divider between editors and results to resize the top and bottom areas.
- Expand the left editor, right editor, or result diff panel to fullscreen.
- Dark developer-tool theme.

## iOS Note

Electron does not build native iOS apps. To ship this UI on iPhone or iPad, reuse the renderer as a web app and wrap it with an iOS-capable tool such as Capacitor, or rebuild the shell in Swift/SwiftUI.

## Contributing

Issues and pull requests are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md) for the local workflow.

## License

Secure Text Compare is released under the [MIT License](LICENSE).
