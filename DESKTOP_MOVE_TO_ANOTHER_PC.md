# Move PHOTOlab Desktop development to another Windows PC

## Get the desktop branch

Install Git and Node.js 24 on the other PC. Node 24 is the major version used for this project's checks. Open PowerShell in the folder where you want the project and run:

```powershell
git clone --branch codex/windows-desktop --single-branch https://github.com/3zjay/ez-photolab.git
cd ez-photolab
git branch --show-current
git log -1 --oneline
```

The branch should be `codex/windows-desktop`. Cloning only the default `main` branch does not select the desktop development work. For an existing checkout, first preserve any local edits, then fetch and switch to `codex/windows-desktop`.

## Install and run

```powershell
npx --yes bun install --frozen-lockfile --ignore-scripts
node node_modules/electron/install.js
npm run test:desktop
npm run desktop:start
```

The first two commands install the dependencies from `bun.lock` and download Electron's Windows runtime. They need internet access. The file-safety tests include a temporary Windows directory junction; a restricted workspace may need permission for that test. No Windows security setting needs to be changed.

To create the Windows installer:

```powershell
npm run desktop:dist
```

The expected output is `release/PHOTOlab-Desktop-Preview-2.10.0-x64-Setup.exe`. Installer tools are downloaded on the first packaging run. `npm run test:desktop:smoke` runs the Electron renderer checks. `npm run build` only builds the web version locally; these commands do not publish a website.

## What is in GitHub

The branch includes the React editor, the native Electron services and preload bridge, project save/recovery implementation, native file handling, build configuration, package manifest and dependency lockfile, tests, bundled public assets/LibRaw files, and the desktop review and setup documentation.

The following are regenerated locally and intentionally excluded from Git:

- `node_modules/`: installed dependencies and the downloaded Electron runtime.
- `dist-desktop/` and `dist/`: built application assets.
- `release/`: installers and unpacked executables.
- `.desktop-test/`: temporary test builds, test profiles, and packaging cache.
- `transfer/`: local migration archives and the offline Git bundle.

## Copy your editing work separately

Save any open editing work as a named `.photolab` project before moving. Copy those project files, original photos, exported images, custom LUT files, and any batch/culling source folders you need. They are personal work files, not application source in Git.

If you need the previous session recovery, close PHOTOlab on both PCs, then copy the contents of `%APPDATA%\PHOTOlab Desktop Preview` to that same location on the other PC. Back up any existing destination profile first. That folder is optional for continuing development; saved `.photolab` files are the better way to transfer individual edits. Batch queues and culling sessions are not persisted in single-photo projects.

Downloaded model caches may need to download again. Production/server secrets are not part of this transfer. Web and desktop use the same Google account and subscription; see [DESKTOP.md](DESKTOP.md) for deployment requirements and current recovery behavior.

## Offline source backup

The local `transfer/` folder contains a source ZIP and Git bundle created from the committed desktop branch. Copy that folder to a USB drive or another private transfer location if you want a second route to the source.

To restore the branch with Git history from the bundle, run this from beside the copied bundle:

```powershell
git clone --branch codex/windows-desktop PHOTOlab-Desktop.bundle ez-photolab
cd ez-photolab
git remote set-url origin https://github.com/3zjay/ez-photolab.git
```

Then follow the dependency installation steps above. The source ZIP contains the same tracked files without Git history. Neither source backup includes personal images, saved sessions, generated installers, or installed dependencies.

Keep desktop development on its branch. This handoff does not merge desktop changes into `main` or deploy the live website.
