# PHOTOlab: updated desktop analysis

> Follow-up implementation: desktop preview 2.9.1 restores the three missing editor handlers described below. The automated Electron smoke test now covers native photo loading, editing, project save/reopen, undo/redo and export. The findings below record the reviewed 61eb0d8 baseline; the other limitations remain separate follow-up work. See [DESKTOP.md](../DESKTOP.md) for current release notes.

Reviewed October 24, 2026. Desktop source: `origin/codex/windows-desktop`, commit `61eb0d896f8df5052f6454caef99e166dd6c7697`. Compared with `main` at `5340296177146774abd409a78ab63d2ef0b7ee8c`.

## Revised assessment

PHOTOlab already has a dedicated Windows Electron implementation. The previous analysis only examined the checked-out `main` branch; its statement that no native desktop host existed does not describe the fetched desktop branch. Your working checkout remains on `main`. Fetching made the desktop branch available without switching to it.

The desktop branch is a meaningful implementation, not just an application window: it adds native file capabilities, safe export writes, `.photolab` project files, autosave/recovery, undo/redo, native menus, network restrictions, Electron packaging, and targeted tests. Several earlier findings have already been addressed there.

My current recommendation is to continue this Electron implementation. The next work is repairing and completing its integration with the newer editor. Reconsidering the desktop framework or starting a rewrite would lose useful work without solving the immediate defects.

The product remains a local photography workflow: ingest a shoot, cull similar frames, edit selected photos, and batch export branded deliverables. The desktop edition is currently a local preview with editing tools unlocked; production sign-in and payments are intentionally disabled. It is not yet a complete persistent shoot-management application or a customer-ready paid release.

## What I verified on this PC

I inspected all newly added desktop services, platform adapters, project code, tests and setup documents, plus the changes to the shared editor, culling, XMP and rendering code. The branch changes 39 files relative to main, with approximately 2,314 added and 440 removed lines.

Validation used an isolated archive of the desktop commit at:

`C:\Users\ezjay\AppData\Local\Temp\photolab-desktop-review-61eb0d8\source`

The working checkout was not switched, merged or modified for implementation tests. Only these analysis documents were changed in the repository. No production service was configured, deployed or authenticated.

| Check | Result |
|---|---|
| Clean frozen Bun dependency installation | Passed |
| Node runtime | v24.22.1 |
| Native/unit tests | 18 passed, 0 failed |
| Desktop production build | Passed, approximately 11 seconds |
| Web production build from desktop branch | Passed, approximately 10 seconds |
| Existing Electron smoke test | Passed |
| Renderer function checks within smoke test | All 7 passed |
| Windows x64 unpacked packaging | Passed with publishing disabled |
| Additional real-app photo import probe | **Failed: `applyCanvasPreset is not defined`** |

The existing smoke test verified the empty application mounts, the preload bridge is present, cross-origin isolation is active, sandboxing/context isolation are enabled, renderer Node access is absent, and a production-site request is blocked. Its separate renderer page verified rotation, zero saturation, HSL/curves, zero sky opacity, XMP preservation/conflicts and manual culling choices.

To examine the test gap, I extended only the disposable copy of `tests/electron-smoke.cjs`. The added probe loads the repository's bundled portrait fixture into the actual application's file input. This reproduces the photo-load crash described below. No real user photograph was used and the application source was not repaired to make the tests pass.

Packaging produced approximately 443 MB of unpacked files, including a roughly 58.6 MB application ASAR, before optional remote model caches. These are uncompressed folder sizes, not installer size or runtime RAM measurements. Builds still warn about ONNX eval and large chunks. I did not execute an interactive NSIS installation/uninstallation, benchmark large shoots, or validate camera RAW/model inference comprehensively.

## What the desktop architecture actually contains

```text
Windows Electron host
  electron/main.cjs
    - local photolab://app asset protocol
    - sandboxed BrowserWindow
    - request restrictions and permission denial
    - native menus/dialogs and close protection
    - IPC dispatch to file/project services
             |
  electron/preload.cjs: narrow window.photoLab bridge
             |
Shared React application
  src/platform/desktop.js: browser-handle compatibility adapter
  src/platform/DesktopWorkspace.jsx: save/open/recovery/history UI
  src/platform/project.js: project serialization and validation
             |
Existing Edit / Cull / Batch engines
```

### Native host and security

The host uses Electron 44.5.1 from the lockfile, context isolation, renderer sandboxing, disabled Node integration and enabled web security. It serves packaged content from a custom secure origin rather than opening arbitrary files through `file://`. New windows are denied, external navigation is restricted, and IPC checks the sender frame.

The renderer receives specific file/project operations through `window.photoLab`; it does not receive raw `ipcRenderer`, unrestricted Node imports, or a general-purpose filesystem API. This is a good baseline consistent with [Electron's security guidance](https://www.electronjs.org/docs/latest/tutorial/security). It is not a complete security certification.

The network layer permits selected HTTPS model/font download hosts using GET/HEAD and blocks production Firebase/Stripe/site traffic. Firebase initialization is disabled in desktop mode. `previewUser` provides an unlocked Team-like local preview identity, rather than granting a real paid account.

Do not confuse “production integrations disabled” with “no network use.” Neural models can still download. Their correctness under the combination of custom protocol, CSP, cross-origin isolation and individual host restrictions needs dedicated testing.

### Native files

`electron/file-service.cjs` owns opaque handles issued after native dialogs. It validates Windows names, distinguishes read-only/writable grants, rejects symbolic links and escaping junction paths, protects opened originals, and limits individual reads/writes to 512 MB.

Writes use temporary files, synchronization, and exclusive publication. Ordinary export collisions produce numbered filenames rather than replacing an existing image. XMP replacement requires a prior read, compares the read hash, and retains a backup. This is a substantial improvement over main's direct browser writes.

`src/platform/desktop.js` adapts these capabilities to the browser File System Access-shaped methods the existing application expects. This is an effective migration technique, but it currently inherits some browser API assumptions that become expensive on native imports.

### Projects and recovery

The `.photolab` v1 format stores a single photo document with embedded raster sources and editor values. It excludes account credentials by selecting known document fields. The renderer validates supported image data URLs, basic numeric/curve/LUT data and text-layer structure; the main service separately enforces envelope/size rules.

Desktop history retains up to 30 document snapshots in memory. After 1.2 seconds without a document change, a recovery file is written under `%APPDATA%\PHOTOlab Desktop Preview\recovery.photolab`. The preceding successful file is retained as `.previous`. Saving a named project currently uses Save As for both Ctrl+S and Ctrl+Shift+S.

The format embeds the developed image for a RAW source. It does not preserve a sensor-development recipe that can later re-develop the original camera file. It is also not a persistent culling catalog or batch job database.

### Packaging and migration

`electron-builder.yml` supplies a separate Windows x64, per-user NSIS preview configuration. Publishing is disabled, app data is retained on uninstall, and signing/executable resource editing are disabled. There is no automatic updater.

The migration documentation correctly separates tracked source from generated `node_modules`, build outputs, installers, personal photos/projects and model caches. The essential local fact is that this PC currently has the desktop source as a remote-tracking branch, not as its active working branch.

## Which earlier conclusions change

| Earlier main-only finding | Desktop branch status |
|---|---|
| No desktop host or installer configuration | **Superseded:** Electron host and Windows packaging exist and package successfully |
| No saved projects or general edit history | **Partly resolved:** single-photo projects, autosave and 30-state history exist |
| New image inherits HSL/curves/creative effects | **Addressed in code:** both import paths now call `resetAll`; logo is cleared too |
| Regrouping overwrites manual culling decisions | **Addressed:** `manualSelection` is preserved; renderer test passes |
| Duplicate names overwrite clustering identity | **Partly addressed:** clustering maps copies to original objects; downstream filename matching remains |
| Failed culling becomes a low-quality rejection | **Addressed:** analysis failures remain unrated alternates for review |
| Existing image exports may be overwritten | **Resolved for ordinary native writes:** collision-safe publication and original protection |
| XMP is replaced with a minimal new file | **Addressed:** XML merge, cleared ratings, backup, conflict detection and stale-read checks |
| Rotated masks do not follow source geometry | **Addressed in export:** masks now use the image's rotation/flip transform |
| Excessive nominal export allocation | **Improved:** 64 MP / 16,384 px bounds, after calculating rotation; other allocations still need guards |
| Rejected sky/depth singleton cannot retry | **Improved:** rejection clears cached initialization promise |
| Production billing vulnerability is immediately exposed in desktop | **Different scope:** desktop blocks those integrations; unchanged web endpoints still require correction |
| No automated tests | **Superseded:** 18 Node tests and 7 renderer checks currently pass |

These improvements mostly live only on the desktop branch. They do not automatically change the current main checkout or deployed website. The branch also includes a later editor merge with integration regressions, so it should not be merged wholesale based solely on green build results.

## Findings requiring attention

### P0: importing a photo crashes the editor

**Confirmed in the running Electron application.** `src/App.jsx:2696` references `applyCanvasPreset`, `handleRotateStep` and `handleFlipStep` while building EditPanel props. This branch contains no definitions for those names. Comparing with main shows the function definitions were removed, while the newer panel callsite remained.

The application initially starts because the desktop sidebar calls `renderPanel()` only when an image exists. Once the file input loads a photograph, React evaluates the missing identifier and the ErrorBoundary displays:

```text
Something went wrong in the Studio
applyCanvasPreset is not defined
```

This is a runtime failure that Vite successfully bundles. Restoring only the first missing name would expose the next two unless all callsites are reconciled. The same shared App source would fail when editing a photo in a web build made from this desktop branch. The active main branch retains those functions and is not changed by this review.

The existing smoke test moves from an empty application to a separate test renderer without exercising photo loading. Add an actual app journey: import fixture, edit, save, reopen, export. Also add undefined-identifier linting to catch this class of merge error before runtime.

### P1: restored cutout/composition state is inconsistent

**Source-backed finding, with serializer behavior separately reproduced.** The project format saves `bgResult` but excludes `bgStatus`, `bgSubUrl`, scene/custom-background configuration, subject placement, shadow configuration and outline settings.

`restoreDesktopDocument` (`App.jsx:2771`) restores `bgResult` and then explicitly sets `bgStatus` to `idle` and clears the subject cutout. `activeBaseImage` (`App.jsx:620`) uses `bgResult` only when status is `done`, so the restored preview chooses the base image. Export (`App.jsx:1316`) uses `bgResult || image`, so it can select the saved composite instead.

Consequently a saved cutout composition does not have a complete editable round-trip contract and can produce different preview/export source selection after reopening. Scene settings and the reusable subject mask are unavailable for continuing the composition. Undo/redo uses the same restore routine, so this is also relevant to history, not just disk loading.

Decide what v1 promises: either persist the complete composition model and all required assets, or explicitly bake a composite into a consistent base image and identify the operations that are no longer editable. Add saved-project fixtures for cutouts, custom skies, layers, masks and transformed compositions.

### P1: folder import eagerly copies every file into renderer memory

**Confirmed implementation path; large-shoot memory impact not benchmarked.** The browser adapter's native `getFile()` (`src/platform/desktop.js:20`) calls the main process to read the complete file and constructs a new in-memory `File` from the returned bytes.

Standard, RAW and Cull folder scanners await this for every matching file before making the queue available. Thus the native version does not simply retain lazy disk-backed browser File references. It transfers the whole shoot through IPC and retains its file contents in renderer objects, before decoded canvases and RAW previews are counted.

For scale, 500 RAW files at 30 MB each represent about 15 GB of source payload alone. This arithmetic is not a measured memory trace, but it explains why the import design is unsuitable for high-volume shoots even if per-file processing is sequential.

Queue descriptors and stable asset IDs instead of File byte copies. Read only the active file or a bounded prefetch window. Generate low-resolution thumbnails separately and evict full-resolution buffers after each task. Keep pixel processing in workers or a dedicated processing service with a measured concurrency limit.

### P1: shoot recovery and close protection remain incomplete

Projects serialize only the editor document. Culling results, manual decisions, file grants, source/output paths, batch recipes, queues, progress and retry state are absent. File grants exist only in the main process's memory and expire when it restarts.

The dirty flag is set only when `current.image` exists. A user can spend time reviewing a shoot with no editor photo loaded and close without a dirty-project prompt for those culling changes. This should be explicit in the preview, then replaced with a persistent shoot record and job journal.

Also, the close handler waits for autosaves already submitted to the main-process queue. It does not flush the renderer's pending 1.2-second debounce or serialization. The last edit before closing can be newer than the last recoverable state. The dialog correctly says “last successful autosave,” so this is a recovery boundary to improve, rather than a claim that no recovery exists.

### P1: duplicate asset identity is only partially repaired

Native listing now uses numeric filename sorting, and the scanner includes two nested directory levels. Clustering uses object identity rather than a filename map, which fixes a real class of collisions.

However, folder queue items still retain `name` without a relative source path, batch filtering/sorting still finds cull records by basename (`App.jsx:1816`, `2079` and related sites), and the final cull ordering still uses a name lookup (`cullEngine.js:725`). XMP groups output by basename in one destination folder.

Two subfolders containing `DSC_0001.JPG` can therefore remain distinct during clustering but receive the wrong cull decision downstream or collapse into one sidecar group. Native `photoLabId` exists on imported File objects but is not the cross-workflow identity contract. Re-reading also creates fresh handles, so identity needs to remain stable beyond a particular handle.

Use a project asset ID with relative path/source identity, an explicit RAW+JPEG pairing, and a recorded output mapping. Sidecar conflicts between genuine paired RAW/JPEG files should remain a separate concept from unrelated equal filenames.

### P2: native output naming is safer than its UI reporting

The file service can save `photo (1).jpg` when `photo.jpg` exists and returns the actual result. The compatibility writable returns this from `close()`, but most batch/cull callers ignore the result and log the requested name. The Save As dialog can also offer replacement while the service intentionally creates a new numbered file.

Preserving bytes is the correct default. Make the final path visible and record it in the job result so users can locate deliverables and associate them with the correct source. The native service rejects explicitly protected originals rather than always renaming them; communicate that distinction.

### P2: project size and history still use raster snapshots

Project serialization embeds image, original image, background result, custom sky and logo as base64 data. The same image may occupy multiple fields. History retains up to 30 states; although many scalar changes share references, raster-generating operations introduce large new sources.

The 192 MB project limit protects storage operations, but serialization and parsing can allocate large strings and buffers before or during validation. A 64 MP canvas is about 256 MB for just one RGBA pixel buffer. Neither limit alone is a memory budget.

Move toward immutable assets stored once plus lightweight versioned recipes. Keep recovery incremental or deduplicated where possible, with explicit disk and memory limits.

### P2: crop tests do not exercise the current crop component

`src/components/CropOverlay.jsx` and `src/imageGeometry.js` contain a new geometry path, but the current Preview does not import that component. Preview and AdjustPanel still implement their own crop math. The Node geometry tests passing therefore does not demonstrate that the visible crop widget uses those tested functions.

The newer UI has its own aspect handling and may behave correctly in ordinary cases. Consolidate or remove the unused implementation, then test the actual UI against landscape/portrait images, rotations and edge drags. Avoid documenting helper coverage as complete user-flow coverage.

## Shared processing limits that remain

The desktop host adds native capabilities; it does not replace the existing image engines. Most CPU processing remains in the renderer, with partial RAW decoding in a worker. CSS/Canvas grading, CPU LUT interpolation, local inpainting, heuristic fallbacks and image-data copies remain relevant performance/quality limits.

Preview and export still evaluate some operations in different order: the AI preview applies structure/sky/relight before downstream grading, while export applies grading before those operations. Batch has separate processing/preview paths. Creative grain/effects can use different random results. The mask-transform fix is valuable but does not establish general preview/export equivalence.

The RAW path still favors embedded JPEG extraction, then falls back to LibRaw with additional percentile/gamma processing and JPEG encoding. Projects preserve the resulting raster, not the original RAW development state. There is no newly added 16-bit working pipeline, TIFF export, explicit ICC profile conversion/preservation or soft-proofing. Show source quality and avoid presenting preview-based editing as full sensor RAW recovery.

AI downloads still occur on demand. Sky/depth initialization retries after rejection are improved, but cold loading still races a 2.5-second timeout and can return a heuristic mask while the neural download continues. Face detection, background cutout and ONNX inference require their own cold/warm/offline tests under the desktop restrictions. “All tools active” and “full hardware acceleration” in DesktopHome/Account are broader than the validation establishes.

A model manager should identify required downloads, bytes, version/hash, ready/offline status, retries, fallback mode and cache location. Preserve local pixel processing as a product benefit without implying that every algorithm is neural or that all work is GPU-accelerated.

## Accounts, billing and release scope

The desktop branch deliberately avoids production authentication and payments. Keep that boundary while stabilizing editing and persistence. Its preview user is an internal feature-unlock mechanism, not a billing implementation.

The web API handlers and Firestore rules are unchanged from main. My earlier finding about the unauthenticated billing portal endpoint still applies to that source: it accepts a submitted customer ID/email without verifying ownership. Checkout identity/price/redirect validation, mock offline licensing, client lease renewal and webhook reconciliation still need a server-controlled design before connected desktop billing is enabled.

The older `WINDOWS_DESKTOP_REVIEW.md` and parts of `DESKTOP_TEST_SETUP.md` refer to simulated checkout behavior from an earlier baseline. The current shared checkout component calls API endpoints. Treat those documents as historical findings/setup intent; do not assume every old line describes the merged source. The lack of server authentication is still a present issue, but “checkout is only a simulation” is no longer an accurate description of the frontend callsite.

Future desktop sign-in/checkout should use the system browser, validated return handling, authenticated backend requests, known plan mappings and signed bounded entitlements. This is a subsequent integration stage, not a reason to connect the unfinished preview to live production now.

Windows release work remains: application icon/metadata, signing, install/uninstall testing, file associations if desired, update verification/rollback and support diagnostics. The builder explicitly reports that `signAndEditExecutable: false` skips both signing and resource edits; follow [electron-builder's Windows options](https://www.electron.build/win/) when preparing release branding. Dependency/model notices, including the IMG.LY AGPL dependency, still need a distribution decision.

## Updated implementation priorities

### 1. Repair the editor integration and strengthen the release gate

Reconcile the missing canvas/rotation/flip handlers with the newer EditPanel. Add undefined-variable checking. Make one real-app test import a bundled fixture, change a visible adjustment, save/reopen a project and export. Keep the existing 18 Node and 7 renderer tests.

Acceptance: a photo loads in the desktop and in a web build of the branch, editor controls render, transforms/canvas templates work, and no ErrorBoundary is reached. A package build alone is not the acceptance gate.

### 2. Make saved documents represent the actual editing model

Define and version composition assets, background state, layer data and operation ordering. Reconcile `bgResult` source selection on restore. Make undo/redo restore the same model as project open, including regenerated caches and masks where necessary. Flush a final recovery snapshot on close.

Acceptance: reopen representative graded, cropped, cutout, layered and retouched projects with the same preview and editable controls; compare exports within defined image tolerances.

### 3. Replace eager shoot import with descriptor-based jobs

Separate source descriptors from decoded images. Persist stable asset IDs, relative paths, cull decisions, shared recipes and queued outputs. Add bounded reads, thumbnail caching, background processing, cancellation and resume/retry. Preserve manual overrides during all reanalysis.

Acceptance: a representative large shoot imports without retaining every RAW file's bytes, survives restart, keeps identically named files distinct and reports exact output paths.

### 4. Consolidate improvements for web without merging regressions

Candidate shared improvements include culling overrides, XMP merge/backup, mask transforms, retry handling, reset logic and export geometry guards. Native file guarantees stay behind the desktop adapter. Test web capabilities separately; native collision behavior does not automatically protect browser writes.

Acceptance: main's editor remains usable, representative web exports match the intended rendering contract, and desktop changes do not introduce native bridge calls into ordinary web paths.

### 5. Validate photography quality, model behavior and distribution

Use camera RAW fixtures, all orientations, multiple-face arena shots, low-key scenes, mixed RAW+JPEG and large exports. Measure import memory, time to first thumbnail, cull accuracy, export speed and recovery. Then complete signed Windows distribution and separately staged account/billing integration.

The next desktop milestone is no longer “create an Electron app.” That is built. It is “make the existing Electron app reliably load, edit, save and reopen a real photo, then carry those guarantees across an entire shoot.”
