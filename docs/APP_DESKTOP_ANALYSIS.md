# PHOTOlab: application and desktop analysis

> Desktop update: this report reviewed `main` only. The fetched `origin/codex/windows-desktop` branch includes an Electron implementation and several fixes absent from that baseline. See [UPDATED_DESKTOP_ANALYSIS.md](UPDATED_DESKTOP_ANALYSIS.md) for the corrected desktop assessment and current verification results.

Reviewed October 24, 2026. Source baseline: `5340296177146774abd409a78ab63d2ef0b7ee8c`.

## Assessment

PHOTOlab is a local photography workflow application spanning selection, editing, and delivery. Its strongest coherent use case is sports and event photography: ingest a camera folder, review bursts, choose keepers, apply a consistent look, add orientation-aware branding, and export deliverables. It also contains a growing single-image composition studio for portraits, products, and social graphics.

There is substantial implemented functionality. The next investment should make that functionality dependable across long sessions and large shoots. More tools will deliver less value than persistence, consistent rendering, predictable RAW handling, and safe exports.

This checkout contains a React/Vite web application with a PWA manifest and service worker. It does not contain an Electron or Tauri host, native project, desktop installer, signing/update configuration, or native filesystem bridge. “Desktop” currently means the desktop browser layout or an installed PWA. A native desktop edition would be a new host around a largely reusable application core.

## Scope and evidence

I inspected the application source, processing modules, panels, serverless API handlers, Firestore rules, deployment configuration, manifest/service worker, package manifest, lockfile, and recent history. I opened the local application and inspected Home, the empty editor, Cull AI setup, and the Batch workspace, including its visual layout.

The production build passes in a clean copy of the committed source using `bun install --frozen-lockfile --ignore-scripts` and `bun run build`. The clean build took approximately 11 seconds. It warns about ONNX runtime eval and large chunks. Approximate emitted sizes include 1.98 MB for the AI JS chunk, 827 KB Firebase, 210 KB MediaPipe, and two ONNX WASM assets of 24.3 and 26.8 MB. Emitted assets are not equivalent to the initial download; inspect actual loading before setting performance targets.

A separate install resolving package.json ranges with pnpm failed in `vite-plugin-top-level-await` / SWC with `missing field type`. Running Bun over that mixed installation retained pnpm-linked transitive packages and reproduced the failure; a clean Bun installation passed. Preserve the committed lockfile and standardize the build environment. This is evidence of dependency drift sensitivity, not proof that the deployed web build is broken.

This is a source-backed architectural review and limited UI inspection, not a complete runtime certification. I did not sign in, make payments, call production billing endpoints, change cloud configuration, or run a representative RAW-camera and large-shoot benchmark. Findings below distinguish code behavior from quality/performance hypotheses. No application implementation was changed for this review.

## What has been built

| Area | Implemented behavior | Main source |
|---|---|---|
| Application shell | Home, Edit Studio, Cull AI, Batch, Account; responsive layouts; theme; PWA installation | `src/App.jsx`, `src/main.jsx` |
| Editor | Tone/color controls, curves, eight-channel HSL, presets, custom/built-in CUBE LUTs, crop/rotation/flips, comparison, overlays, watermark and export | `src/Preview.jsx`, `src/components/panels/`, `src/utils.js` |
| Composition studio | Background cutout; generated studio scenes; custom backgrounds; shadows/outlines; subject placement; canvas templates; text, badge and graphic layers; local erasing with limited erase undo | `App.jsx`, `utils.js`, `OverlayPanel.jsx`, `ToolsPanel.jsx` |
| Creative effects | Chromatic aberration, prism, halation, dust, glitter, VHS, light leaks and thermal effects | `constants.js`, `utils.js`, `Preview.jsx` |
| Cull AI | Perceptual similarity, focus/exposure scoring, face landmarks, blink/smile metrics, automatic classifications, manual review, ratings/colors, physical sorting and XMP output | `src/CullPage.jsx`, `src/cullEngine.js`, `src/xmpExporter.js` |
| Standard batch | Folder input/output, resize, color/LUT settings, enhancement, branding, naming, quality, progress, first-result confirmation and cancellation between files | `src/BatchPage.jsx`, `src/App.jsx` |
| RAW ingest/batch | Embedded JPEG extraction, orientation parsing and transforms; LibRaw WASM development fallback; shared downstream export operations | `src/rawProcessor.js`, `public/libraw/`, `RawBatchPanel.jsx`, `App.jsx` |
| Account/billing | Google Firebase sign-in, Firestore user profile listener, Stripe checkout/portal, signed webhook verification and subscription updates | `src/firebase.js`, `AccountDashboard.jsx`, `StripeCheckout.jsx`, `api/`, `firestore.rules` |

### The processing architecture

The browser reads source files into File/ArrayBuffer/data URL/blob representations. Standard image paths use browser decoders; RAW first searches for embedded JPEG previews and otherwise calls a worker wrapping LibRaw. Most image manipulation uses Canvas 2D, CSS filters, and JavaScript pixel loops. MediaPipe can use a GPU delegate for face detection. LUT processing itself is a CPU trilinear interpolation loop, rather than the custom WebGL shader engine described in the landing page.

The editor has a fast preview path, a separate AI/beauty preview path, and a full export renderer. Batch has another preview generator and distinct standard/RAW export loops. This gives the app useful responsiveness but creates multiple definitions of what the same edit means.

State is concentrated in `App.jsx`: approximately 3,278 lines and 183 useState declarations. Other large files include CullPage (2,251 lines), LandingPage (2,144), BatchPage (1,899), utils (1,785), and EditPanel (1,365). These sizes are not defects by themselves; their importance is that UI state, file ownership, jobs, billing, and image processing are coupled through very large prop interfaces.

### What “AI” means here

| Feature | Actual implementation | Practical interpretation |
|---|---|---|
| Accent | Histogram/statistical analysis blended into existing adjustments | Useful automatic enhancement; not a learned enhancement model |
| Structure | Local detail enhancement with optional detected-face protection | Portrait-aware detail tool |
| Sky | SegFormer attempt, then color/spatial upper-frame sky detection | Semantic mode and heuristic mode have different quality limits |
| Relight | Depth model attempt, then geometric vertical/central depth gradient | Fallback approximates composition, not measured scene depth |
| Background cutout | IMG.LY model, with local salience fallback | Neural cutout and approximate fallback should be distinguished |
| Face restore | MediaPipe locates regions; smoothing, sharpening, contrast and color processing enhance them | Face enhancement, not a generative reconstruction model |
| Upscale | Canvas high-quality resampling in multiple passes plus unsharp mask | Enlarges/sharpens; does not infer missing detail with super-resolution |
| Magic eraser | Local harmonic/boundary fill with texture residual synthesis; large regions reduced to a 360 px proxy | Useful for smaller repairs; not a generative LaMa service |
| Culling | dHash/Laplacian/exposure rules plus neural face landmarks | Explainable assistant whose recommendations need human review |

The current active code is much more local than the README suggests. The README still describes Claid object removal and optional fal face restoration; the active editor uses local inpainting and local face enhancement. The batch UI still calls face restore “GenAI face restoration (Cloud).” Align descriptions with the actual engines.

## What is working in the design

1. Culling, editing, and batch export address successive steps of the same job. Keep this workflow as the organizing principle.
2. Local pixel processing avoids a per-image cloud inference requirement in the active paths. Account and billing services remain online dependencies, but source photos need not be uploaded for these tools.
3. Embedded RAW previews are a pragmatic fast path for event turnaround, provided users can see whether they are editing a preview or developed sensor data.
4. Orientation-aware watermark scale is a concrete workflow benefit for mixed portrait/landscape shoots.
5. First-result batch confirmation, per-file logging, cooperative cancellation, lazy page loading, reusable canvases, bitmap closing and several URL cleanup paths are useful foundations.
6. The culling engine exposes focus, blink and exposure information rather than only returning a hidden selection.
7. Firestore rules protect tier and billing identifiers from ordinary client writes. The webhook verifies Stripe signatures before applying updates. Preserve these protections while addressing the gaps below.

## Highest-priority findings

### 1. Billing portal ownership is not authenticated — critical if deployed as written

`api/create-portal-session.js:29` accepts a customer ID or email from the request, optionally finds the customer by email, and creates a billing portal session. No Firebase ID token verification or authenticated ownership check precedes this. An unauthenticated caller supplying another customer's identifying data could obtain that customer's portal link if the endpoint is deployed with working credentials. Portal capabilities depend on the Stripe portal configuration; this is not evidence of an observed production compromise.

`api/create-checkout-session.js:31` similarly trusts a client user ID, price ID, email and return URLs. That weakens identity binding and price selection. Both endpoints reflect arbitrary Origin headers.

Require a verified Firebase identity, resolve customer and plan identifiers server-side, restrict return URLs, and apply narrow CORS rules. Firebase documents server-side ID token verification in its [Admin Auth documentation](https://firebase.google.com/docs/auth/admin).

### 2. Offline licensing is a prototype — high priority

`AccountDashboard.jsx:156` explicitly generates a dummy JWT with a fixed signature string and mock device identifier. There is no cryptographic verification or device registration subsystem in this source. `App.jsx:359` includes a query-triggered local admin shortcut and trusts cached user JSON; it also grants an admin tier to a hardcoded email in client code. The query shortcut removes the query before a later effect checks for it, so its persistence is not even reliable. None of these client checks should authorize privileged server operations.

`App.jsx:501` renews the lease by writing a client-calculated future date. The Firestore update rule validates the shape of that date but does not bound its duration against server time. Feature gates largely inspect tier; expiry is displayed but is not a central enforced entitlement policy.

Use a server-issued, signed entitlement with expiry, allowed features and an explicit offline policy. Verify it locally with a public key. Keep administrative authority server-side. A shipped local application cannot make client-side premium enforcement tamper-proof; the goal is a coherent licensing policy with authenticated issuance.

The webhook also calculates expiry as processing time plus 30/365 days rather than deriving a bounded lease from authoritative subscription state. Unknown prices default to Pro. Event replay/order handling is not recorded. Make unknown prices fail closed and reconcile billing state deterministically. The UI advertises trials but checkout does not configure a trial in the session parameters.

### 3. Work is not durably saved — high priority for desktop

Photo edits, culling decisions, source/output handles, queues and progress are React memory state. The persistent application state I found is theme and cached account data. There is no project format, IndexedDB project store, SQLite catalog, autosave, job journal, or general edit undo/redo. Erase undo is a limited exception.

A desktop photographer must be able to close the app or recover from a crash without losing a shoot review. Model assets, edit recipes, user decisions, thumbnails, and processing jobs separately. Store references to originals plus operations and generated assets. Add autosave and schema migration before native packaging becomes the main workstream.

### 4. Rendering paths disagree structurally — high priority

The editor AI preview (`App.jsx:649`) applies beauty/structure/sky/relight before the CSS grading applied in Preview. Export (`utils.js:420`) applies beauty, then grading and spatial transforms, then structure/sky/relight. Operations such as sharpening, relighting and color filters do not generally commute.

Export rotates/flips pixels and then scales precomputed face/sky/depth masks into the resulting bounds without applying those same transforms to the masks (`utils.js:490–526`). Fine rotation or a retained transform can therefore misalign effects. The dedicated 90-degree step handlers bake changes into the base image, so not every rotation interaction uses this faulty path.

Creative preview effects also use separate DOM overlays and effect ordering from export. Batch preview omits actual face restoration despite including its flag in dependencies; export does run restoration. Batch color filtering occurs as a CSS layer over an already processed preview, whereas batch export filters before several enhancements.

Adopt one operation graph and one coordinate system. Preview should evaluate the same graph at a smaller resolution; export should evaluate it at output resolution. Introduce deterministic randomness for dust/grain and explicit scaling rules for pixel-radius effects.

### 5. New images can inherit old editor adjustments — confirmed code behavior

Both `loadImage` branches (`App.jsx:905`) reset filters and several tools, but do not reset HSL mixer, tone curves, or the creative-effects state. A new photograph can therefore start with a previous photograph's curve, HSL or aesthetic settings. The editor and batch also receive the same base `filters` state, so adjustments made in one workspace influence the other.

Define a complete document initializer and separate editor document state from a batch recipe. Intentional “apply previous edit” should be an explicit action.

### 6. Culling recommendations and user choices are conflated — high priority

`clusterPhotos` (`cullEngine.js:376`) recalculates category, rating, label and key-photo status. Live regrouping from exposure/separation controls calls it again over current results. That can replace a manual rating or keeper choice with a new recommendation.

Preserve independent fields for computed recommendation and manual overrides. Group from a stable capture ordering. Folder enumeration is not explicitly sorted, while clustering breaks on consecutive dissimilar images; this can make burst grouping depend on the returned folder order. For RAW+JPEG pairs, use a stable asset ID and pair relationship rather than filename/base-name matching alone.

The current scoring can penalize a whole group for one subject blinking and favors smiles. Those are useful portrait signals but need sport-specific calibration: a serious expression, motion blur, or dark arena photograph can be intentional. No accuracy benchmark or labeled evaluation set is included.

### 7. Output collision and metadata policy need explicit design

Batch and physical sorting use `getFileHandle(name, { create: true })` followed by `createWritable()`. Existing output names can be replaced. The default batch suffix helps but can be changed or removed. Native desktop should provide skip, rename, replace and per-job collision reporting, plus protection against accidentally exporting over a source.

`xmpExporter.js:38` writes a minimal new sidecar without reading or merging an existing one. Existing unrelated metadata can be lost when a filename collides. Unrated/unlabeled records are skipped, so clearing an earlier rating does not necessarily update a previously written sidecar. XMP currently represents ratings and color labels, not the editor's crop, curves, LUT or retouch operations. RAW+JPEG files sharing a stem also share the sidecar filename.

### 8. Offline execution needs an asset lifecycle

The service worker precaches the shell and vendored LibRaw assets, then caches local assets as used. It does not precache every lazy page chunk or manage the remote models. MediaPipe downloads WASM/model assets from external URLs; Transformers sets `allowLocalModels = false`; IMG.LY defaults to externally hosted assets. Previously downloaded browser/model caches may allow some offline use, but first-run complete offline functionality is not established.

Sky/depth model initialization races a 2.5-second timeout, then returns a heuristic result. A cold model download can exceed that easily; the abandoned promise is not cancelled, and its eventual completion does not itself replace the cached heuristic mask. Rejected singleton promises are not reset for retry. Show model download/readiness state and distinguish neural from approximate results.

The service worker's `caches.match('/index.html') || new Response(...)` fallback tests a Promise rather than its resolved value. With no cached shell the last fallback may not be reached as intended. It also eagerly activates new workers and deletes old caches, with no job-aware update coordination.

For desktop, bundle required models or provide a verified model installer with download size, checksum, version, disk budget and offline-ready status. For web, make offline readiness explicit and do not interrupt a job for an application update.

## RAW and professional image-quality limits

The fast RAW path accepts the largest scanned embedded JPEG above 500 KB, with an 8 MB search bound. It does not compare preview dimensions to sensor dimensions. Therefore “full resolution RAW editing” is not guaranteed by a successful import. It returns generic embedded metadata and strips the preview EXIF before correcting orientation.

The fallback uses LibRaw and then applies additional sampled percentile normalization and gamma before encoding a JPEG at quality 0.9. The correctness of this extra development step depends on the exact pixel contract of the vendored wrapper; compare it against reference decodes before treating it as a calibrated RAW pipeline. Sampling uses randomness, so development is not completely deterministic.

The application works on 8-bit Canvas image data and JPEG/PNG/WebP outputs. I did not find a 16-bit image working pipeline, TIFF export, RAW parametric white balance/recovery pipeline, explicit ICC profile conversion/preservation, or soft-proofing. Exposure is a brightness-factor approximation; highlights/shadows/whites/blacks modify a global brightness factor rather than targeting luminance ranges; vibrance multiplies saturation; the basic sharpness/clarity controls largely modify contrast.

These can be useful creative controls, but they have different behavior from a professional RAW developer. Keep a fast “camera preview” path and build a distinct high-quality development path with visible source information. Do not promise lossless JPEG export or sensor highlight recovery from an embedded JPEG.

HEIC is displayed as accepted but there is no dedicated HEIC decoder dependency/path. Treat support as browser-dependent until tested on the target desktop runtime.

## Performance and maintainability

Most CPU pixel loops run on the UI thread. The active LibRaw worker only isolates part of RAW processing; embedded preview scanning, additional development, rendering, inpainting and cull analysis are not a unified background service. An async function or a short yield between files does not make the work inside each file nonblocking.

A 45-megapixel RGBA buffer alone is about 180 MB. Several canvases and image-data copies multiply that. The nominal 268-megapixel export cap permits roughly 1.07 GB for a single RGBA buffer, before any copies; 4x enlargement multiplies pixel count by 16. Use measured memory budgets, maximum edge sizes, tiling and bounded concurrency rather than a nominal canvas-area allowance. That allowance is checked before rotated output bounds and is not consistently applied to every upscale allocation.

Some blob cleanup is implemented, but large data URLs, retained RAW previews, effect results and undo snapshots still merit a memory ownership audit. Use file references, managed blobs, thumbnail caches and ImageBitmap lifetimes rather than many base64 snapshots. Culling currently retains full RAW preview URLs; a large shoot should have an eviction policy.

There are no configured test/lint/typecheck scripts or checked-in automated tests/CI workflows in this tree. Add focused tests around image semantics, file safety, project migrations and billing authorization. Avoid spending initial effort testing every presentation component.

Extract in manageable stages: document state/reducer, platform files, processing engine, jobs, culling decisions, model management and billing. `src/rawWorker.js` appears unused by the active RAW entry point; remove or reconcile parallel legacy paths after confirming usage. Deduplicate vendored/package RAW provenance and document runtime/model versions.

## Recommended desktop direction

Preserve React and the useful existing tools. Build a shared document/processing core with separate platform adapters. A practical target layout is:

```text
Web host / Desktop host
          |
Shared React workspaces: Library -> Cull -> Edit -> Export
          |
Document recipes + user decisions + command history
          |
Processing graph + model manager + resumable job scheduler
          |
Platform adapters: files, persistence, authentication, updates
```

Use IndexedDB/OPFS or browser handles where supported on web; use a native filesystem service and SQLite-backed catalog/job state on desktop. Persist serializable records, not DOM nodes, React setter functions, file handles inside processing logic, or live canvas objects. Keep large pixel buffers out of JSON IPC.

My provisional recommendation is to prototype Electron first if the goal is the shortest path to a desktop product while keeping the current browser-heavy rendering behavior predictable. It ships a controlled Chromium runtime and fits the current JavaScript codebase. That recommendation is an implementation judgment, not a benchmark result. Enable sandboxing and context isolation, disable renderer Node integration, and expose narrow validated file/job APIs; see [Electron's security guidance](https://www.electronjs.org/docs/latest/tutorial/security).

Tauri is a credible alternative, particularly for a Windows-first product and a team comfortable with Rust. It uses WebView2 on Windows and WebKit on macOS/Linux, so rendering, Canvas filters, inference backends and file integration must be tested per target; see [Tauri's webview documentation](https://v2.tauri.app/reference/webview-versions/). Choose after a small test covering RAW ingest, Canvas grading, MediaPipe, ONNX, native file output and model loading. Do not choose solely on installer size or assume either wrapper accelerates the existing pixel loops.

Native requirements beyond a window include system-browser authentication with a secure return flow, external Stripe checkout, stable API origins, filesystem permissions, source/output recovery, single-instance/file-open handling, signed installers, update recovery, diagnostics and disk/cache management. Relative `/api/...` calls and root-relative worker paths need an explicit host/protocol strategy.

## Desktop experience to prioritize

The visual identity is established: dark workspaces, violet/cyan accents, compact controls and comparative previews. At the inspected 1280x720 viewport, the batch setup presents four dense columns, small text and adjustment tabs crowded into a narrow card. Simplify the hierarchy before adding more controls.

For desktop, open into recent projects and continue-work actions. Use a shared shoot/library filmstrip with clear transitions into Cull, Edit and Export. Keep queue status, current source quality, output destination and unsaved/saved status visible. Move account marketing and subscription comparisons away from the main production surface. Use resizable panels, collapsible advanced settings, keyboard actions and accessible labels/focus handling.

The current workflow shares cull results with batch filtering, but I found no direct selected-cull-photo-to-editor handoff. Add “Edit selected,” “Apply recipe to keepers,” and “Export keepers” using the same asset IDs and decisions. User choices should survive changing pages, changing grouping thresholds, closing a project and restarting the app.

## What to improve on both web and desktop

1. One renderer and serializable recipe shared across preview, editor export and batch.
2. Complete per-image initialization and explicit recipe transfer between workspaces.
3. Saved projects, autosave, command history, and preserved manual culling decisions.
4. Clear RAW preview/developed-source badges and truthful feature descriptions.
5. Collision-safe exports, merged XMP updates and file identity beyond names.
6. Authenticated billing APIs and a central entitlement policy.
7. Model status/download management, retries and visible degraded modes.
8. Capability detection and usable fallbacks. `showDirectoryPicker` is not broadly available across all major browsers; see [MDN](https://developer.mozilla.org/en-US/docs/Web/API/Window/showDirectoryPicker).

The README's “no accounts/no backend” claims conflict with the Firebase/Stripe implementation. Marketing also claims cryptographic leases, device sync, GPU LUT shaders and cloud generative face restore beyond the implemented behavior. Device/account state synchronization is not project synchronization. Reconcile this copy and revalidate competitor comparisons before publishing them; this review does not verify those competitor claims.

The bundled IMG.LY dependency contains an AGPL license, while the README broadly describes this project as MIT. Record dependency and model licenses and confirm the intended distribution approach. Upstream describes its licensing in the [background-removal repository](https://github.com/imgly/background-removal-js). This is a concrete dependency inventory item; a top-level project license does not describe every bundled component.

## Suggested implementation sequence and acceptance criteria

### Stage 1: shared reliability

Fix billing authentication, remove production admin shortcuts, correct feature claims, implement complete document initialization, preserve user culling overrides, and define collision/XMP behavior. Standardize clean locked builds.

Acceptance: a second image starts from a defined recipe; manual choices survive regrouping; another user's billing session cannot be requested; no output is replaced without the selected collision policy.

### Stage 2: shared document and rendering foundations

Extract typed/versioned recipes, source references and one processing graph. Add project persistence, autosave and undo/redo. Move expensive operations behind a job interface with cancellation and progress. Keep web functional throughout.

Acceptance: reopen a project with equivalent edits/ratings; compare downscaled export to preview within defined tolerances; transforms keep masks/layers aligned; cancelled work leaves valid outputs and resumable job state.

### Stage 3: desktop host vertical slice

Validate Electron and, if desired, Tauri against representative images. Implement native folder input/output, project storage, external authentication/billing, model installation and a signed development distribution path.

Acceptance: install, import a shoot, cull/edit/export, close/reopen, disconnect the network after model setup, resume work, and update without losing project state. Required OS targets still need to be selected; Windows-first is a reasonable initial assumption from this workspace, not a confirmed product requirement.

### Stage 4: measured production throughput and quality

Create a representative dataset: camera RAW families, all EXIF orientations, mixed RAW+JPEG, high ISO arenas, groups with multiple faces, intentional low-key images, transparent cutouts and large exports. Measure startup, time to first thumbnail, cull throughput, peak memory, export throughput and failure recovery. Profile before committing to native LibRaw, GPU processing or new learned models.

Acceptance: define hardware-specific throughput/memory budgets and culling accuracy targets; preserve originals and unrelated metadata; validate output color and rendering parity; test missing drives, full disks, expired permissions and interrupted jobs.

The most useful first desktop milestone is a persistent shoot that can move from Cull to Edit to Batch and reopen exactly where the photographer left it. That gives the existing features a dependable foundation and improves both editions.
