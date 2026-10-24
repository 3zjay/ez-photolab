# PHOTOlab 2.10.0 — shared web and Windows release

Web and desktop now build the same React tools and use the version in package.json. The desktop retains the existing Preview installation identity to upgrade 2.9.1 in place without moving user data.

## Accounts and billing

Desktop uses the existing Firebase Google account, Firestore profile and Pro/Team subscription. Sign in opens the system browser; an expiring, single-use code with PKCE returns to a loopback listener. Firebase custom tokens travel over HTTPS and IPC, never in the browser URL. Checkout and billing portal open in the system browser. Both APIs verify the Firebase ID token and derive the user and billing customer on the server.

Deploy the web release and /api/desktop-auth before testing desktop sign-in. The existing deployment needs FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY and STRIPE_SECRET_KEY, plus configured STRIPE_PRICE_PRO / STRIPE_PRICE_TEAM. Annual plans require their separate _ANNUAL price IDs. NEXT_PUBLIC_APP_URL defaults to https://ez-photolab.vercel.app. If using a named database, set FIREBASE_DATABASE_ID consistently with VITE_FIREBASE_DATABASE_ID. Never put server secrets in VITE_ variables or the installer. Existing subscriptions are read from the same users/{uid} documents.

## Photos and recovery

Open photo, edit, Save project, Open project and Export are available in both builds. Editable .photolab files embed the developed photo and editor settings, including background composition. RAW projects store the developed image rather than a camera-file development recipe.

Recover session restores the editor, culling sources and manual decisions, culling analysis settings, batch queues, folder handles and batch settings. Desktop stores workspace-recovery.photolab in %APPDATA%/PHOTOlab Desktop Preview, with the preceding successful snapshot retained. Original-file protections and granted native handles survive restart. The renderer cannot grant arbitrary paths through a project file. A final recovery save is requested before closing a dirty desktop window.

Browser recovery uses IndexedDB; storage can be cleared or evicted, and folder access may need permission again. Recovery is local to each installation/browser, not cloud synchronization. Missing or moved source files must be restored to their original paths. Queued processing is recovered paused; starting a batch reruns the queue and preserves existing exports with numbered names. This is not automatic continuation from the exact interrupted file. Save named projects for work you intend to keep.

## Local AI

AI setup prepares face, sky and depth models on demand. These downloads run over HTTPS and are cached locally; after setup they can process photos offline. The background-removal model and matching ONNX runtime are bundled into both build outputs, along with MediaPipe and Transformers WASM runtimes. Browser users download those static assets from the site on first use. The build downloads pinned IMG.LY data into ignored .model-assets/; first build needs internet access. Cached build assets are reused.

The shared photo engine continues to run in the renderer using Canvas, WebAssembly and the acceleration available to those engines. Native filesystem access does not make every operation GPU accelerated. Large folder imports still read source files into memory; this release does not introduce a separate native RAW/GPU processing engine.

## Build and verify

- npm run test:desktop — Node tests for files, projects, recovery, authentication and API validation.
- npm run test:desktop:smoke — real Electron loading, editing, saving, reopening, pixel-verified export and shoot recovery.
- npm run test:web:smoke — browser workflow with no native preload bridge.
- PHOTOLAB_TEST_MODELS=1 adds actual model loading/inference to the desktop smoke test. PHOTOLAB_TEST_OFFLINE=1 blocks HTTPS to verify already-prepared models. PHOTOLAB_MODELS_ONLY=1 skips the editor/shoot workflows for this check.
- npm run build / npm run desktop:build — web / desktop bundles.
- npm run desktop:dist — Windows x64 NSIS installer under release/.

OS file choices are substituted in workflow tests; the real editor, renderer, preload, IPC, project and file services run. Google authentication and real Stripe billing require interactive account testing after deployment; the automated handoff test uses a fake authentication service and does not charge a subscription.

The installer is unsigned and intended for testing. Installer outputs and test fixtures are ignored by Git. Save and close an existing desktop session before upgrading.
