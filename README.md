# LocalDiff

A local two-pane text diff checker built with Electron. LocalDiff compares text entirely on your machine and is designed for quick side-by-side review of plain text, source snippets, logs, JSON, Markdown, and similar files.

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

## Build Desktop App

```sh
npm run dist
```

The current Electron build targets macOS desktop packages through `electron-builder`.

## Features

- Paste text directly into the left and right editors.
- Load local text files into either side.
- Convert both sides to one line by trimming and collapsing whitespace.
- Render two-page one-line word diff output.
- Switch diff display between one-line output and original source formatting.
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
- Resize editor/diff panels and zoom text size.
- Drag the horizontal divider between editors and results to resize the top and bottom areas.
- Expand the left editor, right editor, or result diff panel to fullscreen.
- Dark developer-tool theme.

## iOS Note

Electron does not build native iOS apps. To ship this UI on iPhone or iPad, reuse the renderer as a web app and wrap it with an iOS-capable tool such as Capacitor, or rebuild the shell in Swift/SwiftUI.

## Contributing

Issues and pull requests are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md) for the local workflow.

## License

LocalDiff is released under the [MIT License](LICENSE).
