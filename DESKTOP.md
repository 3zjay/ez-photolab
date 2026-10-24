# PHOTOlab Desktop v2.9.0

This is a separate Windows x64 preview built from the existing React editor. Desktop development is maintained on `codex/windows-desktop`. See [DESKTOP_MOVE_TO_ANOTHER_PC.md](DESKTOP_MOVE_TO_ANOTHER_PC.md) to clone this branch and set up another computer. No production Firebase or Stripe configuration has been changed as part of this desktop work.

## Use the preview

Build an installer with `npm run desktop:dist`. The current configuration creates `release/PHOTOlab-Desktop-Preview-2.9.0-x64-Setup.exe`. Alternatively, run `release/win-unpacked/PHOTOlab Desktop Preview.exe` with the rest of that folder beside it. Generated installers are local build outputs and are not stored in Git. The installer is unsigned and intended for internal testing.

Use **Open photo** to import a picture, then **Save project** to save an editable `.photolab` file. Export creates a rendered JPEG, PNG, or WebP. Opening an existing project restores its embedded images and editing settings. Projects embed a developed image for RAW imports; they are not a RAW processing recipe that re-develops the camera file.

| Shortcut | Action |
| --- | --- |
| Ctrl+O | Open photo |
| Ctrl+Shift+O | Open project |
| Ctrl+S / Ctrl+Shift+S | Save project through a Save As dialog |
| Ctrl+E | Export photo |
| Ctrl+Z / Ctrl+Shift+Z | Undo / redo photo edits |

Undo retains up to 30 recent document states in memory. After editing pauses, an autosave is stored in `%APPDATA%\PHOTOlab Desktop Preview\recovery.photolab`; the preceding successful save is retained as `.previous`. **Recover session** restores the previous editing session on startup. Check the status message for recovery failures. Save a named project for work you intend to keep; recovery is a rotating safety copy, not a project library.

## Included in this preview

- Sandboxed Electron window, isolated preload bridge, native menus, file and folder dialogs, and a per-user NSIS installer.
- Separate desktop storage and a request allowlist. Production Firebase, the live Vercel application, Stripe, and cloud photo-upload endpoints are blocked. Local editing tools are unlocked only within the preview.
- Native file access through handles issued by the main process for user-selected locations. Read-only source folders, filename validation, and protection for opened originals.
- Existing export files are retained. Name collisions receive a numbered suffix; the OS dialog's replacement choice does not overwrite an image. Output operations can fail when a protected original is explicitly selected.
- Versioned project files with embedded image assets and editing parameters; credentials and account state are excluded.
- Crop ratios based on actual image dimensions, draggable crop handles, full-resolution cropping, and preserved rotation bounds during export.
- HSL and curve adjustments in exports, correct zero-saturation handling, sky-opacity compositing, and aligned masks for rotated exports.
- Manual culling decisions retained during regrouping, duplicate filenames kept distinct, and failed analyses left for review.
- XMP ratings merged into existing metadata, including clearing a rating. Existing sidecars receive a backup before replacement. Conflicting RAW/JPEG ratings for the same sidecar are reported instead of silently overwriting one another.

## Build and checks

Use the committed Bun lockfile for dependency installation. Desktop development adds Electron and electron-builder; the web and desktop build outputs remain separate.

```powershell
npx --yes bun install --frozen-lockfile --ignore-scripts
node node_modules/electron/install.js
npm run test:desktop
npm run test:desktop:smoke
npm run desktop:start
npm run desktop:dist
```

`npm run build` creates the web bundle in `dist`. `npm run desktop:build` creates the desktop bundle in `dist-desktop`. Neither command deploys anything. `desktop:dist` packages the desktop with publishing explicitly disabled. Close a preview launched from the output directory before rebuilding that same directory.

The Electron smoke test builds into `.desktop-test/build` and uses its own `.desktop-test/user-data` profile, leaving the interactive preview's recovery files alone. In the Codex workspace sandbox, Electron required an approved run outside that sandbox to start its renderer; the application's own Chromium sandbox remains enabled.

The installer builder encountered a Windows cache access error. A fresh cache resolved it:

```powershell
$env:ELECTRON_BUILDER_CACHE = 'C:\ez-photolab\.desktop-test\builder-cache'
npx electron-builder --win nsis --x64 --publish never
```

Validation: 15 Node tests cover file capabilities, collision handling, backups, project parsing, crop geometry, and request restrictions. Seven Electron renderer tests cover actual canvas exports, HSL/curves, sky opacity, XMP preservation, sidecar conflicts, and culling decisions. The Electron smoke test also checks application mounting, preload access, cross-origin isolation, renderer sandboxing, and blocked production requests. The packaged window was opened and its editor observed with a photo loaded. Interactive installer installation/uninstallation and all native-dialog paths have not been comprehensively exercised.

## Before a customer release

1. Connect separate test accounts, billing, and cloud services using [DESKTOP_TEST_SETUP.md](DESKTOP_TEST_SETUP.md). The current account and payment screens in the web code are simulations and must be replaced with authenticated server-controlled flows. These backend endpoints were not changed or deployed in this phase.
2. Complete large-file and camera-RAW testing, model-download/retry checks, processing cancellation, and worker-based background jobs. Heavy processing still runs in the renderer. Models are downloaded on demand; advanced AI features and HEIC support are not validated in this preview. Single-image export is limited to 64 megapixels and 16,384 pixels per side; this is a guard, not a guarantee of low memory usage.
3. Persist culling catalogs and batch queues. Current project recovery covers the single-photo editor, not entire shoots, batch tasks, or all intermediate AI results.
4. Verify rendering consistency across all combinations of effects. Random grain/FX can differ between renders. Add photographic color-management and metadata-preservation requirements before claiming professional archival fidelity.
5. Finish application icons, Windows metadata, code signing, installer testing, and authenticated updates with rollback. This preview uses the default Electron icon and has no automatic updater.
6. Review dependency/model licensing and include complete notices before distribution. In particular, the installed `@imgly/background-removal/LICENSE.md` identifies AGPL-3.0; the README's MIT badge does not describe all bundled dependencies.

The original findings and broader release plan remain in [WINDOWS_DESKTOP_REVIEW.md](WINDOWS_DESKTOP_REVIEW.md). That report describes the pre-conversion review; this file records the subsequent implementation.
