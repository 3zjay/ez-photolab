const { app, BrowserWindow, protocol, session, ipcMain, dialog, Menu, shell, powerSaveBlocker } = require('electron');
const fs = require('node:fs/promises');
const { createReadStream } = require('node:fs');
const { Readable } = require('node:stream');
const path = require('node:path');
const { FileService, validName } = require('./file-service.cjs');
const { validateProject, readProject, saveProjectAt } = require('./project-service.cjs');
const { APP_ORIGIN, bundlePath, allowPreviewRequest, trustedSender } = require('./security.cjs');
const { signIn, validExternalUrl } = require('./auth-service.cjs');
const { saveWorkspace, recoverWorkspace } = require('./workspace-service.cjs');

app.setName('PHOTOlab Desktop Preview');
const webSmoke = !app.isPackaged && process.argv.includes('--web-smoke');
const smokeTest = !app.isPackaged && (process.argv.includes('--smoke-test') || webSmoke);
app.setPath('userData', smokeTest ? path.join(app.getAppPath(), webSmoke ? '.web-test' : '.desktop-test', 'user-data') : path.join(app.getPath('appData'), 'PHOTOlab Desktop Preview'));
protocol.registerSchemesAsPrivileged([{ scheme: 'photolab', privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true, stream: true } }]);
const files = new FileService();
let mainWindow;
let powerBlockerId = null;
function setPowerBlocker(enable) {
  if (enable) {
    if (powerBlockerId === null || !powerSaveBlocker.isStarted(powerBlockerId)) {
      powerBlockerId = powerSaveBlocker.start('prevent-app-suspension');
    }
  } else {
    if (powerBlockerId !== null && powerSaveBlocker.isStarted(powerBlockerId)) {
      powerSaveBlocker.stop(powerBlockerId);
      powerBlockerId = null;
    }
  }
  return powerBlockerId !== null && powerSaveBlocker.isStarted(powerBlockerId);
}

let dirty = false;
let closing = false;
let autosaveQueue = Promise.resolve();
let pendingFlush;
function flushWorkspace() {
  return new Promise((resolve, reject) => {
    const id = require('node:crypto').randomUUID();
    const timer = setTimeout(() => { pendingFlush = null; reject(new Error('The workspace could not be saved before closing.')); }, 15000);
    pendingFlush = { id, finish(ok) { clearTimeout(timer); pendingFlush = null; ok ? resolve() : reject(new Error('Workspace recovery could not be saved.')); } };
    mainWindow.webContents.send('workspace:flush', id);
  });
}
const photoFilters = [{ name: 'Photos', extensions: ['jpg', 'jpeg', 'png', 'webp', 'nef', 'cr2', 'cr3', 'arw', 'dng', 'raf', 'orf', 'rw2'] }];
const projectFilters = [{ name: 'PHOTOlab project', extensions: ['photolab'] }];
const recoveryPath = () => path.join(app.getPath('userData'), 'recovery.photolab');
const errorText = error => error instanceof Error ? error.message : String(error);

function handle(channel, handler) {
  ipcMain.handle(channel, async (event, ...args) => {
    if (!trustedSender(event)) throw new Error('Untrusted application window.');
    try { return { ok: true, value: await handler(...args) }; }
    catch (error) { return { ok: false, error: errorText(error), code: error.code }; }
  });
}
function registerHandlers() {
  handle('workspace:flushed', (id, ok) => { if (pendingFlush?.id === id) pendingFlush.finish(ok === true); });
  handle('auth:sign-in', () => signIn(url => shell.openExternal(url)));
  handle('billing:open', url => {
    if (!validExternalUrl(url)) throw new Error('Invalid billing address.');
    return shell.openExternal(url);
  });
  handle('files:folder', async (options = {}) => {
    const result = await dialog.showOpenDialog(mainWindow, { title: options.writable ? 'Choose output folder' : 'Choose photo folder', properties: ['openDirectory', ...(options.writable ? ['createDirectory'] : [])] });
    return result.canceled ? null : files.grantDirectory(result.filePaths[0], Boolean(options.writable));
  });
  handle('files:open', async () => {
    const result = await dialog.showOpenDialog(mainWindow, { title: 'Open photo', filters: photoFilters, properties: ['openFile'] });
    return result.canceled ? null : files.grantFile(result.filePaths[0]);
  });
  handle('files:list', id => files.list(id));
  handle('files:child', (...args) => files.child(...args));
  handle('files:read', id => files.read(id));
  handle('files:write', (...args) => files.write(...args));
  handle('files:save', async (name, bytes) => {
    validName(name);
    if (!(bytes instanceof Uint8Array) || bytes.byteLength > 512 * 1024 * 1024) throw new Error('Invalid image data.');
    const result = await dialog.showSaveDialog(mainWindow, { title: 'Export photo', defaultPath: name, filters: [{ name: 'Exported image', extensions: [path.extname(name).slice(1)] }] });
    if (result.canceled) return null;
    const directory = await files.grantDirectory(path.dirname(result.filePath), true);
    const file = await files.child(directory.id, path.basename(result.filePath), 'file', true);
    // Preserve existing files even if the OS save dialog offered replacement.
    return files.write(file.id, bytes);
  });
  handle('project:save', async data => {
    validateProject(data);
    const result = await dialog.showSaveDialog(mainWindow, { title: 'Save PHOTOlab project', defaultPath: 'Untitled.photolab', filters: projectFilters });
    if (result.canceled) return null;
    await saveProjectAt(result.filePath, data);
    return path.basename(result.filePath);
  });
  handle('project:open', async () => {
    const result = await dialog.showOpenDialog(mainWindow, { title: 'Open PHOTOlab project', filters: projectFilters, properties: ['openFile'] });
    if (result.canceled) return null;
    const data = await readProject(result.filePaths[0]);
    return { name: path.basename(result.filePaths[0]), data };
  });
  handle('project:autosave', data => {
    validateProject(data);
    const operation = autosaveQueue.catch(() => {}).then(() => saveProjectAt(recoveryPath(), data));
    autosaveQueue = operation;
    return operation.then(() => true);
  });
  handle('project:recovery', async () => {
    for (const filename of [recoveryPath(), `${recoveryPath()}.previous`]) {
      try { return await readProject(filename); }
      catch (error) { if (error.code !== 'ENOENT') console.warn('Recovery unavailable:', errorText(error)); }
    }
    return null;
  });
  handle('window:dirty', value => { dirty = Boolean(value); });
  handle('workspace:save', data => {
    const operation = autosaveQueue.catch(() => {}).then(() => saveWorkspace(path.join(app.getPath('userData'), 'workspace-recovery.photolab'), data, files));
    autosaveQueue = operation;
    return operation.then(() => true);
  });
  handle('workspace:recover', () => recoverWorkspace(path.join(app.getPath('userData'), 'workspace-recovery.photolab'), files));
  handle('power:prevent-sleep', enable => setPowerBlocker(Boolean(enable)));
  handle('window:progress', ratio => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      if (typeof ratio === 'number' && ratio >= 0 && ratio <= 1) {
        mainWindow.setProgressBar(ratio);
      } else {
        mainWindow.setProgressBar(-1);
      }
    }
    return true;
  });
}

async function createWindow() {
  const assetRoot = path.join(app.getAppPath(), webSmoke ? '.web-test/build' : smokeTest ? '.desktop-test/build' : 'dist-desktop');
  const ses = session.defaultSession;
  if (smokeTest) ses.webRequest.onErrorOccurred(details => console.warn('[Network]', details.method, new URL(details.url).origin + new URL(details.url).pathname, details.error));
  ses.webRequest.onBeforeRequest((details, callback) => callback({ cancel: !allowPreviewRequest(details.url, details.method) || (smokeTest && process.env.PHOTOLAB_TEST_OFFLINE === '1' && details.url.startsWith('https:')) }));
  ses.setPermissionRequestHandler((_contents, _permission, callback) => callback(false));
  ses.setPermissionCheckHandler(() => false);
  protocol.handle('photolab', async request => {
    try {
      const filename = bundlePath(assetRoot, request.url);
      const stat = await fs.stat(filename);
      if (!stat.isFile()) return new Response('Asset not found', { status: 404 });
      const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.wasm': 'application/wasm', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.woff2': 'font/woff2' };
      const headers = new Headers({ 'Content-Type': types[path.extname(filename)] || 'application/octet-stream', 'Content-Length': String(stat.size) });
      headers.set('Cross-Origin-Opener-Policy', 'same-origin');
      headers.set('Cross-Origin-Embedder-Policy', 'require-corp');
      if (/^cutout-worker-[\w-]+\.js$/.test(path.basename(filename))) {
        // IMG.LY's ndarray generates typed-array accessors. Keep string compilation
        // inside this worker, which has no DOM, account storage or native bridge.
        headers.set('Content-Security-Policy', "default-src 'none'; script-src 'self' blob: 'unsafe-eval'; worker-src 'self' blob:; connect-src 'self' blob: data:; img-src 'self' blob: data:");
        return new Response(Readable.toWeb(createReadStream(filename)), { status: 200, headers });
      }
      headers.set('Content-Security-Policy', "default-src 'self'; script-src 'self' blob: 'wasm-unsafe-eval'; worker-src 'self' blob:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob:; media-src 'self' blob:; connect-src 'self' data: blob: https://huggingface.co https://*.hf.co https://*.huggingface.co https://cdn.jsdelivr.net https://storage.googleapis.com https://staticimgly.com https://ez-photolab.vercel.app https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://firestore.googleapis.com; object-src 'none'; base-uri 'none'; frame-src 'none'");
      return new Response(Readable.toWeb(createReadStream(filename)), { status: 200, headers });
    } catch { return new Response('Asset not found', { status: 404 }); }
  });
  mainWindow = new BrowserWindow({ width: 1440, height: 940, minWidth: 1050, minHeight: 720, show: false, backgroundColor: '#10121a', title: `PHOTOlab ${app.getVersion()}`, webPreferences: { ...(webSmoke ? {} : { preload: path.join(__dirname, 'preload.cjs') }), contextIsolation: true, nodeIntegration: false, sandbox: true, webSecurity: true, backgroundThrottling: false } });
  mainWindow.webContents.on('console-message', (_event, level, message, line, sourceId) => {
    console.log(`[Renderer] ${message}`);
  });
  mainWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL) => {
    console.error(`[Load Failed] ${errorCode}: ${errorDescription} (${validatedURL})`);
  });
  mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  mainWindow.webContents.on('will-navigate', (event, url) => { if (!url.startsWith(`${APP_ORIGIN}/`)) event.preventDefault(); });
  mainWindow.on('close', async event => {
    if (closing) return;
    if (powerBlockerId !== null && powerSaveBlocker.isStarted(powerBlockerId)) {
      event.preventDefault();
      const result = await dialog.showMessageBox(mainWindow, {
        type: 'question',
        buttons: ['Keep running in background', 'Cancel & Exit'],
        defaultId: 0,
        cancelId: 0,
        message: 'A batch or culling operation is currently in progress.',
        detail: 'Do you want PHOTOlab to keep processing in the background, or cancel the operation and exit?'
      });
      if (result.response === 0) {
        mainWindow.minimize();
        return;
      }
      setPowerBlocker(false);
    }
    if (!dirty) return;
    event.preventDefault();
    const result = await dialog.showMessageBox(mainWindow, { type: 'question', buttons: ['Keep editing', 'Close'], defaultId: 0, cancelId: 0, message: 'Close this project?', detail: 'Save a project file to keep your edits. The last successful autosave is available under Recover session.' });
    if (result.response === 1) {
      try { await flushWorkspace(); await autosaveQueue; closing = true; mainWindow.close(); }
      catch (error) { await dialog.showMessageBox(mainWindow, { type: 'error', message: 'Your workspace is still open', detail: errorText(error) + ' Save a project and try again.' }); }
    }
  });
  const command = id => mainWindow.webContents.send('menu:command', id);
  Menu.setApplicationMenu(Menu.buildFromTemplate([
    { label: 'File', submenu: [{ label: 'Open Photo…', accelerator: 'CmdOrCtrl+O', click: () => command('open-photo') }, { label: 'Open Project…', accelerator: 'CmdOrCtrl+Shift+O', click: () => command('open-project') }, { label: 'Save Project As…', accelerator: 'CmdOrCtrl+Shift+S', click: () => command('save-project') }, { label: 'Save Project…', accelerator: 'CmdOrCtrl+S', click: () => command('save-project') }, { label: 'Export Photo…', accelerator: 'CmdOrCtrl+E', click: () => command('export') }, { type: 'separator' }, { role: 'quit' }] },
    { label: 'Edit', submenu: [{ label: 'Undo photo edit', accelerator: 'CmdOrCtrl+Z', click: () => command('undo') }, { label: 'Redo photo edit', accelerator: 'CmdOrCtrl+Shift+Z', click: () => command('redo') }, { type: 'separator' }, { role: 'cut' }, { role: 'copy' }, { role: 'paste' }, { role: 'selectAll' }] },
    { label: 'View', submenu: [{ role: 'resetZoom' }, { role: 'zoomIn' }, { role: 'zoomOut' }, { role: 'togglefullscreen' }, ...(!app.isPackaged ? [{ role: 'toggleDevTools' }] : [])] },
    { label: 'Help', submenu: [{ label: 'About PHOTOlab', click: () => dialog.showMessageBox(mainWindow, { message: 'PHOTOlab', detail: `Version ${app.getVersion()}\nShared web and desktop tools, Google account and subscription.\nLocal photo processing, native folders and workspace recovery.\nExisting files are preserved by saving exports under a new name.` }) }] },
  ]));
  if (!smokeTest) mainWindow.once('ready-to-show', () => mainWindow.show());
  await mainWindow.loadURL(`${APP_ORIGIN}/`);
  if (!smokeTest) mainWindow.show();
  if (smokeTest) {
    try {
      if (webSmoke) {
        const report = await require('../tests/web-workflow.cjs').run(mainWindow);
        await fs.writeFile('.web-test/results.json', JSON.stringify(report, null, 2)); console.log(JSON.stringify(report, null, 2));
      } else await require('../tests/electron-smoke.cjs').run(mainWindow, flushWorkspace);
      dirty = false; closing = true; app.exit(0);
    } catch (error) { console.error(error); dirty = false; closing = true; app.exit(1); }
  }
}

if (!app.requestSingleInstanceLock()) app.quit();
else {
  app.on('second-instance', () => { if (mainWindow) { if (mainWindow.isMinimized()) mainWindow.restore(); mainWindow.show(); mainWindow.focus(); } });
  app.whenReady().then(async () => { await fs.mkdir(app.getPath('userData'), { recursive: true }); registerHandlers(); await createWindow(); }).catch(error => { dialog.showErrorBox('PHOTOlab could not start', errorText(error)); app.quit(); });
  app.on('window-all-closed', () => app.quit());
}
