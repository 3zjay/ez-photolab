# PHOTOlab Windows desktop review

Reviewed October 6, 2026. Repository: `C:\ez-photolab`, branch `main`, commit `68295c0`, app version `2.9.0`.

## Recommendation

Build the first Windows release with **Electron and the existing React interface**. Keep Firebase accounts, Stripe subscriptions, and the cloud features, as requested. Add a native file service, persistent projects, background processing, and a signed installer/update system. The interface and many editing tools are reusable; the file handling, processing contracts, and subscription implementation need work before release.

Electron is my recommendation for this codebase because its Chromium renderer closely matches the browser APIs the app already uses, and its main process provides native dialogs, menus, and Windows integration. This is an engineering judgment based on the current code, not a measured Electron-versus-Tauri benchmark. [Electron process model](https://www.electronjs.org/docs/latest/tutorial/process-model)

| Approach | Fit for this app | Tradeoff |
| --- | --- | --- |
| Electron + React | Recommended first release; preserves the current UI and JavaScript/WASM processing while adding native services | Bundles a browser runtime; memory-heavy image processing still needs optimization |
| Tauri 2 + React | Viable if a smaller runtime distribution and a Rust backend are priorities | Uses WebView2 on Windows; requires validating the current AI/WASM/worker behavior and implementing native services in Rust |
| C# / WinUI / WPF rewrite | Consider only if a fully native Windows UI is a firm product requirement | Substantial UI and processing rewrite; does not automatically improve photographic fidelity |

Tauri can produce Windows installers and has configurable WebView2 installation options. Its installer-size advantage depends on runtime and AI model distribution, so do not promise a tiny full application. [Tauri Windows installers](https://v2.tauri.app/distribute/windows-installer/)

## Scope and validation

Reviewed the authored application across 33 files in `src/` and `api/` (17,883 lines), plus build/deployment configuration, package metadata, lockfile declarations, README, manifest, service worker, and the LibRaw integration. Generated LibRaw glue was inspected for loading/shared-memory requirements; generated source maps and the compiled WASM binary were not independently audited.

Validation performed:

- Installed the existing Bun lockfile with frozen-lockfile mode and lifecycle scripts disabled; the tracked dependency files remained unchanged.
- `npm run build` passed using Node 24.15.0 and locked Vite 5.4.21.
- The output totals 59,274,283 bytes, including approximately 51 MB of ONNX WASM assets and a 3.84 MB main JavaScript chunk. Vite reports a large-chunk warning, an ONNX `eval` warning, and ineffective dynamic splitting of the already statically imported RAW module.
- Launched the app locally, inspected the landing page/editor, loaded the bundled 1264 x 848 test image, and exercised crop controls. Selecting and applying 1:1 left the image at **1264 x 848**, confirming the crop-ratio defect.
- Read-only executions of existing functions confirmed zero-valued filter defaults, lost manual culling decisions, filename identity collisions, and order-dependent similarity grouping.
- A synthetic 6000 x 4000 image benchmark in Node took about 2.69 seconds for an HSL adjustment and 0.60 seconds for a 33-cubed LUT. Browser timing will differ; this demonstrates the cost of the synchronous algorithms rather than an end-user performance guarantee.

No source fixes or desktop conversion were made during this review. No real payments, cloud photo uploads, authenticated production access, camera RAW fixtures, or packaged Windows tests were performed. Deployed Firebase rules and Stripe configuration are not present in this repository and remain unverified. A passing frontend build does not validate those services.

## Fix before distributing the application

### 1. Replace simulated billing with real server-controlled subscriptions

**Critical for a paid release.** The checkout UI waits and calls a success callback rather than creating a Stripe Checkout session. The callback then writes subscription fields from the client. The account portal is also simulated.

Evidence: [StripeCheckout.jsx](C:/ez-photolab/src/components/ui/StripeCheckout.jsx:52), [App.jsx](C:/ez-photolab/src/App.jsx:475), [AccountDashboard.jsx](C:/ez-photolab/src/components/panels/AccountDashboard.jsx:505).

The checkout API exists but has no frontend callsite. It accepts user identity, price, and redirect URLs from the request without verifying a Firebase token or restricting allowed plans/redirect destinations. The webhook defaults unknown prices to Pro.

Evidence: [create-checkout-session.js](C:/ez-photolab/api/create-checkout-session.js:27), [stripe-webhook.js](C:/ez-photolab/api/stripe-webhook.js:80).

Required updates:

- Use hosted Stripe Checkout and the real Stripe Customer Portal. Replace the demonstration card form.
- Verify the Firebase ID token on the backend; derive the user ID from that token.
- Map supported plan and billing-period choices to server-owned Stripe price IDs. Reject unknown prices and restrict redirects to configured destinations.
- Grant/revoke entitlements from verified webhook events and subscription state, with event deduplication and recovery from delayed/repeated events.
- Prevent clients from writing tier, subscription IDs, billing status, or license expiry through Firestore rules. Commit and test those rules.
- Keep all Stripe secrets and Firebase Admin credentials on the hosted backend, outside the desktop bundle.

If deployed rules currently permit the client writes, billing can be bypassed. If rules correctly forbid them, the present simulation cannot complete the advertised upgrade. The deployment must be checked to resolve which applies. [Firebase token verification](https://firebase.google.com/docs/auth/admin/verify-id-tokens), [Stripe subscriptions with Checkout](https://docs.stripe.com/payments/checkout/build-subscriptions)

### 2. Correct account and license handling

The application contains a URL-triggered admin initializer, trusts cached account state, assigns admin using a hardcoded email in client code, and lets the client change tiers and renew its lease. The displayed offline JWT is explicitly a dummy token; a cryptographic lease is advertised but no signature/expiry enforcement is implemented.

Evidence: [App.jsx](C:/ez-photolab/src/App.jsx:363), [App.jsx](C:/ez-photolab/src/App.jsx:511), [AccountDashboard.jsx](C:/ez-photolab/src/components/panels/AccountDashboard.jsx:155).

Remove production debug/admin overrides. Obtain admin authority and paid entitlements from server-controlled records or claims. If retaining the advertised 30-day offline lease, have the backend issue a signed, expiring entitlement and verify it locally using a public key. Keep the signing key on the server. Define expiry, grace, renewal, and revocation behavior explicitly.

Normalize the plan model: billing uses **`pro`**, while Accent, Structure, Sky, and Relight gates check **`premium`**. A paid Pro account is consequently locked out of these tools. Use one entitlement function throughout the app. [EditPanel.jsx](C:/ez-photolab/src/components/panels/EditPanel.jsx:766)

### 3. Make exported photos match the editor

The editor preview applies HSL and curves, but both export callsites omit those arguments. The exporter defaults them to null, so the saved photo loses those edits.

Evidence: [Preview.jsx](C:/ez-photolab/src/Preview.jsx:87), [App.jsx](C:/ez-photolab/src/App.jsx:1107), [App.jsx](C:/ez-photolab/src/App.jsx:1141), [utils.js](C:/ez-photolab/src/utils.js:422).

Other confirmed problems:

- Non-square 90-degree export rotates inside the original rectangular canvas, clipping the image. AI masks are scaled without corresponding rotation/flip. [utils.js](C:/ez-photolab/src/utils.js:451)
- Crop controls receive an image URL string but try to read `naturalWidth/naturalHeight`; their aspect calculation is also incorrect. The browser test confirmed the 1:1 failure. [AdjustPanel.jsx](C:/ez-photolab/src/components/panels/AdjustPanel.jsx:9)
- Brightness, contrast, saturation, and vibrance values of zero are replaced with 100 by falsy defaults. Use nullish defaults and test minimum values. [utils.js](C:/ez-photolab/src/utils.js:104)
- Sky compositing clears the original canvas and then draws that same cleared canvas; partial opacity cannot blend back with the original sky. [utils.js](C:/ez-photolab/src/utils.js:803)
- Aesthetic preview/export implementations differ; some effects have no preview, and VHS preview/export use different dates and colors. [Preview.jsx](C:/ez-photolab/src/Preview.jsx:484), [utils.js](C:/ez-photolab/src/utils.js:975)
- Photo import resets basic filters but does not reset HSL/curves, so those changes can carry into the next photo. [App.jsx](C:/ez-photolab/src/App.jsx:922)

Replace the long positional `renderFinal` interface with a named, versioned edit recipe. Use the same ordered processing pipeline at preview and export resolutions. Represent crop, rotation, flips, masks, overlays, and AI operations in that recipe. Test pixel output, not only whether an export finishes.

### 4. Protect originals, sidecars, and manual selections

XMP export opens the destination and writes a new document containing rating/label only. Existing Lightroom/other editing metadata can be overwritten. Cleared ratings are skipped, so previously exported ratings cannot reliably be cleared. [xmpExporter.js](C:/ez-photolab/src/xmpExporter.js:47)

Photo copy/export and batch output also open same-named files for writing without a conflict policy. The first batch sample is already written before its confirmation dialog appears. [CullPage.jsx](C:/ez-photolab/src/CullPage.jsx:491), [standard batch writes](C:/ez-photolab/src/App.jsx:1702), [standard batch confirmation](C:/ez-photolab/src/App.jsx:1709), [RAW batch writes](C:/ez-photolab/src/App.jsx:2036).

Update existing XMP while preserving unknown properties/namespaces; back up existing files and use a safe temporary-write/replace operation. Add export preflight with skip/rename/explicit replacement choices. Guard against writing over source photos. Return saved/skipped/failed/cancelled results accurately.

Reclustering also recalculates ratings, categories, labels, and keeper status, discarding manual choices. Keep AI suggestions separate from user overrides. Use one consistent selection model for ratings, key photos, categories, and every export path. [cullEngine.js](C:/ez-photolab/src/cullEngine.js:431), [CullPage.jsx](C:/ez-photolab/src/CullPage.jsx:342)

Use stable project/file IDs rather than filenames or basenames. Current identity matching can confuse different shoots or RAW/JPEG pairs. Establish capture-time ordering or a defined search window before similarity grouping. An unreadable or failed analysis should become “needs review,” rather than being assigned a low score and rejected.

### 5. Separate fast RAW previews from actual RAW development

RAW import returns an embedded JPEG when a sufficiently large preview is found. That is a useful browsing/culling optimization, but the editing workflow then works on the JPEG rather than original sensor data. It also reports generic/fabricated camera metadata on that path. [rawProcessor.js](C:/ez-photolab/src/rawProcessor.js:336)

The fallback performs randomized percentile sampling, extra tone/gamma processing, reduction to 8-bit RGBA, and JPEG encoding at quality 0.9. This limits edit latitude and deterministic output. [rawProcessor.js](C:/ez-photolab/src/rawProcessor.js:407), [rawProcessor.js](C:/ez-photolab/src/rawProcessor.js:518)

Retain embedded previews for the library/culler, and develop sensor data for full editing/export. For professional photographic work, add 16-bit/float intermediates, explicit input/output color spaces, ICC profile handling, metadata preservation, and suitable output codecs such as 16-bit TIFF where required. Use JPEG only as a final format or disposable preview.

Validate the shipped WASM settings contract, gamma, and orientation against real Canon/Nikon/Sony/Fuji samples. Extra gamma and double rotation are risks requiring camera fixtures; they were not established through runtime RAW testing in this review.

### 6. Make processing responsive and memory bounded

RAW decoding has a worker, but much of scanning, culling, HSL, LUT application, beauty, and export still runs on the UI thread. Yielding between images does not prevent one long synchronous operation from freezing the interface.

One 24 MP RGBA buffer is 96 MB. The pipeline creates multiple canvases/arrays, and its desktop export ceiling permits approximately 1 GiB for a single RGBA buffer before temporary resources. Beauty processing can allocate at natural resolution before the output cap. [utils.js](C:/ez-photolab/src/utils.js:433)

Introduce a job manager with immutable input/settings snapshots, bounded concurrency, cancellation, per-file errors, retry, and persisted progress. Start by moving browser-compatible work to workers; move large-file decoding/encoding and copying to a separate native/utility process as needed. Add tiling/buffer reuse for large images. Keep the Electron main process responsive and avoid parsing arbitrary image files there.

Virtualize photo grids and queues, maintain a bounded thumbnail cache, and make every queued photo accessible. The current batch preview limits its list to 200 files; other views render all entries. [BatchPage.jsx](C:/ez-photolab/src/BatchPage.jsx:213), [CullPage.jsx](C:/ez-photolab/src/CullPage.jsx:2140)

### 7. Fix the RAW panel crash on account changes

RawBatchPanel returns early for free accounts before calling `useCallback`. A transition between free and paid account state while the component is mounted changes its hook count and can crash the view. Move all hooks ahead of conditional returns, or split the gate and paid panel into separate components. Include this in Stage 1 regression work. [RawBatchPanel.jsx](C:/ez-photolab/src/components/panels/RawBatchPanel.jsx:13)

## Windows-specific implementation

### Native platform services

Create a small platform adapter so React calls application services rather than browser file handles directly. Implement native open/save/folder dialogs, directory scans, streaming copy, safe writes, thumbnail access, recent projects, and opening the selected file in Explorer. Keep the web adapter if continuing to maintain the browser version.

Add native menus and standard keyboard shortcuts, file-open associations, drag/drop from Explorer, single-instance file-open behavior, saved window placement, high-DPI layout, and accessible focus/labels. Replace PWA install and tablet instructions in the desktop build with desktop settings, updates, and About information. The existing fixed-width sidebar needs readable tabs and a useful minimum window size.

### Projects, history, and recovery

Current editing state is primarily React memory; there is no project database, full undo/redo history, or crash recovery. Crop and AI operations replace the current image rather than recording a replayable operation.

Use SQLite in the user's application-data directory for projects, source references, edit recipes, culling overrides, export jobs, and migrations. Keep original files intact. Store regenerable thumbnails/models separately with cache limits. Add autosave, recent projects, missing-file relinking, undo/redo, and recovery after a processing crash or unexpected exit. Close/reload warnings should distinguish unsaved work from already committed project state.

### Packaged assets and local AI

The current `/libraw/worker.js` web-root URL and absolute asset references need an application origin/protocol that resolves packaged resources correctly. Shared LibRaw WASM memory requires validating isolation and worker/pthread loading; a plain `file://` wrapper is insufficient. Consolidate the unused alternate `rawWorker.js` implementation.

Sky/depth explicitly disable local model lookup. MediaPipe loads models/WASM from external hosts, and fonts are also remote. Keep internet services as requested, but provide a model manager with versioned downloads, integrity checks, retries, cache status, and clear unavailable states. Bundle essential resources or download them on demand. Rejected model initialization promises currently need resetting to allow retries. [depthEstimator.js](C:/ez-photolab/src/depthEstimator.js:4), [skySegmenter.js](C:/ez-photolab/src/skySegmenter.js:4), [faceRestore.js](C:/ez-photolab/src/faceRestore.js:12)

Disable web service-worker registration in the desktop bundle and let the installer/updater manage application assets. For the continuing website, fix offline caching separately: the worker uses cache version 2.8.0, does not precache the production JS/CSS, and ignores remote AI model assets. [sw.js](C:/ez-photolab/public/sw.js:1)

### Retain online features safely

The Vercel-style `api/` functions remain hosted services. Packaging static Vite output does not create those endpoints inside Windows. Give the desktop client a configured HTTPS backend base URL and test authentication, errors, and version compatibility against it.

Use the system browser for account sign-in and hosted checkout/portal, returning to the app through a validated callback/deep link or one-time code. Bind the flow to the requesting app session and validate state; use the OAuth flow appropriate to the chosen identity provider. Do not assume the current Firebase popup implementation works unchanged inside a desktop window. [Google desktop OAuth guidance](https://developers.google.com/identity/protocols/oauth2/native-app)

Claid object removal actively uploads photos/masks. The fal.ai request helpers exist but currently have no active model-call wiring; the button named `runFalFaceRestore` actually invokes the local restoration implementation. Decide whether to connect a real cloud restore option or remove the unused key field/helper.

Fix the object-removal button: it checks the fal key, while its request requires the Claid key. [ToolsPanel.jsx](C:/ez-photolab/src/components/panels/ToolsPanel.jsx:117), [App.jsx](C:/ez-photolab/src/App.jsx:2245)

If retaining user-supplied API keys, move them from plaintext `localStorage` into OS-backed encrypted storage accessed through the native service. If cloud features are paid through your service, keep your provider keys on the backend with authenticated usage controls. Firebase web configuration is public client configuration; it is not a replacement for Firestore authorization rules. [Electron safeStorage](https://www.electronjs.org/docs/latest/api/safe-storage), [Firebase security checklist](https://firebase.google.com/support/guides/security-checklist)

The desktop renderer should have context isolation, sandboxing, no Node integration, a restrictive content policy, narrow validated IPC methods, and controlled navigation/external links. Package trusted local UI assets. [Electron security guidance](https://www.electronjs.org/docs/latest/tutorial/security)

### Installer and updates

Use Electron Forge or an equivalent maintained packaging pipeline to create the installer, shortcuts, app icon, uninstall entry, and update artifacts. Start with Windows 11 x64; add other Windows versions/ARM64 only after validating the actual processing libraries and hardware. Choose one installer/update path together rather than treating updating as an afterthought.

Prepare code signing, a timestamped release process, release channels, update hosting, integrity verification, staged rollout, and compatibility checks for database migrations. Keep updates away from active export jobs. Test clean installation, upgrade, interrupted update, and uninstall/data-retention behavior. Code signing improves publisher identification; it is not a guarantee that Windows will never show a warning. [Electron code signing](https://www.electronjs.org/docs/latest/tutorial/code-signing), [Electron updates](https://www.electronjs.org/docs/latest/tutorial/updates)

## Dependencies, licensing, and documentation

- Move Vite 5 to a supported release with staged compatibility testing; Vite's current support policy excludes it. Do not update every AI dependency indiscriminately. [Vite supported versions](https://vite.dev/releases)
- Standardize on one package manager and a frozen lockfile. README describes npm installation but only a Bun lockfile is committed. Declare the development runtime/package-manager version and use it in CI.
- Resolve the ONNX combination deliberately: the lockfile includes root ONNX Runtime Web 1.27.0, a Xenova nested 1.14.0 runtime, and an IMG.LY peer declaration for 1.21.0. The successful build does not establish model/runtime compatibility.
- Add lint/type checking, targeted regression tests, backend tests, and Windows build/release CI. Split the 2,912-line App component into document state, processing jobs, platform services, account/billing state, and layout. Consolidate duplicated beauty/batch processing implementations.
- Add `.env`/`.env.*` protection while retaining `.env.example`; remove stale configuration entries and document which variables belong to the hosted backend. No actual populated secret file was detected during the review.
- Inventory and ship third-party notices and model licenses. IMG.LY background removal is published under AGPL-3.0, with other licensing available from the vendor. Resolve its distribution terms for the intended product or choose a suitable alternative. The README's MIT statement does not cover third-party dependencies, and the repository has no root LICENSE file. [IMG.LY licensing](https://github.com/imgly/background-removal-js#license), [LibRaw licensing](https://github.com/LibRaw/LibRaw#licensing)
- Correct README/landing promises about no accounts, no backend, no uploads, cryptographic offline licensing, lossless JPEGs, and full offline AI. Describe actual supported behavior and identify cloud actions. Replace illustrative filtered before/after examples with validated product output.
- “Smart Upscale” currently resamples and sharpens; face restoration uses local image-processing heuristics around detected faces. Either label those accurately or introduce and validate learned enhancement models.

## Suggested implementation order

| Stage | Work | Exit condition |
| --- | --- | --- |
| 1. Correctness and data safety | Export/crop/rotation parity, safe XMP/output writes, persistent manual selections, account-transition crash fix, consistent Pro gates, real authenticated billing | Regression fixtures pass; subscriptions cannot be self-granted; original photos/metadata are preserved |
| 2. Desktop foundation | Electron shell, narrow platform adapter, native dialogs/files, packaged worker/assets, system-browser auth/checkout | Installed app opens and exports a photo and runs RAW/AI asset smoke tests without a dev server |
| 3. Desktop product | SQLite projects, undo/redo, autosave/recovery, job queue/cancellation, model manager, cache/large-folder work | Projects and interrupted jobs recover after restart; UI remains responsive on target hardware |
| 4. Release preparation | Supported dependencies, licenses/notices, CI, signed installer, updater, privacy/support documentation | Clean install/upgrade/uninstall and release tests pass on supported Windows/hardware |
| 5. Professional processing | Native sensor-data development, high-bit-depth pipeline, color management, metadata/codecs, optional native inference | Camera fixtures and color/output reference comparisons pass |

A desktop prototype can begin alongside Stage 1, but it should not be treated as a ready paid release. The amount of interface reuse is substantial; the largest engineering work is reliable photographic output, state recovery, and safe/native processing.

## Minimum release regression checks

1. Preview/export parity for HSL, curves, LUTs, every aesthetic effect, transparency, text, and watermarks.
2. Crop ratios and every EXIF orientation/rotation/flip, including AI masks and portrait RAW images.
3. Existing XMP editing metadata survives rating changes; zero ratings can be written; RAW/JPEG pairing is deliberate.
4. Manual keeper/reject decisions survive regrouping, restarts, imports, and exports; repeated filenames from different shoots stay distinct.
5. Output conflicts, input=output folder, invalid filenames, unwritable/read-only folders, low disk space, partial failures, and cancellation have accurate outcomes.
6. Several real camera RAW formats, damaged files, 24-61 MP images, 2x/4x upscale, large folders, memory limits, and GPU/CPU fallback.
7. Sign-in/out, invalid/replayed callbacks, allowed prices, webhook retries, subscription changes, cancellation, payment failures, and enforced entitlements.
8. First launch and model downloads, download failures/retries, cached operation during network loss, and packaged WASM/shared-memory loading.
9. Project recovery, source-file relinking, application update/database migration, clean install, upgrade, and uninstall.

## Code areas to update

| Area | Main existing files |
| --- | --- |
| Document state, export, folder adapters, cloud actions | `src/App.jsx` |
| Shared editing/encoding engine | `src/utils.js`, `src/Preview.jsx`, `src/lutParser.js` |
| RAW previews and development | `src/rawProcessor.js`, `src/rawWorker.js`, `public/libraw/` |
| Culling state, identity, scoring and safe sidecars | `src/CullPage.jsx`, `src/cullEngine.js`, `src/xmpExporter.js` |
| Batch queue/preview/controls | `src/BatchPage.jsx`, `src/components/panels/RawBatchPanel.jsx`, batch functions currently in `src/App.jsx` |
| Account, billing, feature gates | `src/firebase.js`, `src/components/ui/StripeCheckout.jsx`, `src/components/panels/AccountDashboard.jsx`, `src/components/panels/EditPanel.jsx`, `api/` |
| AI assets and initialization | `src/depthEstimator.js`, `src/skySegmenter.js`, `src/faceRestore.js`, `src/faceMasking.js` |
| Desktop UI/docs/config | `src/LandingPage.jsx`, panels/shared UI, `index.html`, `public/sw.js`, `package.json`, `vite.config.js`, `README.md` |

Additional workflow fixes found: reset old cull groups when importing batch outputs and scan category subfolders (App line 1204); fix the progress `name` versus `currentFile` mismatch (cullEngine line 550); and route upgrade actions to the actual pricing/account view rather than setting an inactive hash (EditPanel line 1000).
