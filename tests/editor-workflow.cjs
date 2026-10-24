const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { dialog, nativeImage } = require('electron');

// Exercise the real React app, preload, IPC handlers and disk services. Only OS
// dialog selection is substituted; no test hooks are exposed to the renderer.
exports.run = async window => {
  const root = await fs.mkdtemp(path.resolve('.desktop-test', 'editor-workflow-'));
  const fixture = path.resolve('public/ai_testing_portrait.jpg');
  const projectPath = path.join(root, 'workflow.photolab');
  const exportPath = path.join(root, 'edited.png');
  const originalHash = createHash('sha256').update(await fs.readFile(fixture)).digest('hex');
  const openDialog = dialog.showOpenDialog;
  const saveDialog = dialog.showSaveDialog;
  const evaluate = code => window.webContents.executeJavaScript(code);
  const waitFor = async (code, label) => {
    for (let attempt = 0; attempt < 150; attempt++) {
      const text = await evaluate('document.body.innerText');
      assert.ok(!text.includes('Something went wrong in the Studio'), `${label}: ${text}`);
      if (await evaluate(code)) return;
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    throw new Error(`Timed out: ${label}\n${await evaluate('document.body.innerText')}`);
  };
  const command = id => window.webContents.send('menu:command', id);
  const clickButton = async text => {
    assert.equal(await evaluate(`(() => {
      const button = [...document.querySelectorAll('button')].find(item => item.textContent.trim() === ${JSON.stringify(text)});
      if (!button || button.disabled) return false;
      button.click(); return true;
    })()`), true, `Missing enabled button: ${text}`);
  };
  const brightness = `(() => {
    const label = [...document.querySelectorAll('span')].find(item => item.textContent === 'Brightness');
    return label?.parentElement.parentElement.querySelector('input[type=range]');
  })()`;
  const assertBrightness = value => waitFor(`Number(${brightness}?.value) === ${value}`, `Brightness ${value}`);
  const passed = [];
  let projectSelections = 0;
  let imageSelections = 0;
  try {
    dialog.showOpenDialog = async (_owner, options) => ({ canceled: false, filePaths: [options.title === 'Open photo' ? fixture : projectPath] });
    dialog.showSaveDialog = async (_owner, options) => {
      if (options.title === 'Save PHOTOlab project') { projectSelections++; return { canceled: false, filePath: projectPath }; }
      imageSelections++; return { canceled: false, filePath: exportPath };
    };

    command('open-photo');
    await waitFor(`document.querySelector('img[alt=photo]')?.naturalWidth > 0 && document.body.innerText.includes('Original Image')`, 'Photo import and EditPanel mount');
    const dimensions = await evaluate(`({ width: document.querySelector('img[alt=photo]').naturalWidth, height: document.querySelector('img[alt=photo]').naturalHeight })`);
    passed.push('load fixture through native Open photo and mount the populated editor');

    await assertBrightness(100);
    await evaluate(`(() => {
      const input = ${brightness};
      input.value = '125';
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
    })()`);
    const editedPreview = `Number(document.querySelector('img[alt=photo]')?.style.filter.match(/brightness\\(([\\d.]+)\\)/)?.[1]) === 1.25`;
    await waitFor(editedPreview, 'Edited preview');
    passed.push('edit brightness and verify the live preview changes');

    command('save-project');
    await waitFor(`document.body.innerText.includes('Saved workflow.photolab')`, 'Save project to disk');
    const savedProject = JSON.parse(await fs.readFile(projectPath, 'utf8'));
    assert.equal(savedProject.document.filters.brightness, 125);
    assert.ok(savedProject.document.image.startsWith('data:image/jpeg;base64,'));
    assert.equal(projectSelections, 1);
    passed.push('save a named project and verify its persisted image and adjustment');

    command('undo'); await assertBrightness(100);
    command('redo'); await assertBrightness(125);
    passed.push('undo and redo the photo adjustment');

    await window.reload();
    await waitFor(`document.body.innerText.includes('Open project') && !document.querySelector('img[alt=photo]')`, 'Fresh renderer');
    command('open-project');
    await waitFor(`document.body.innerText.includes('Opened workflow.photolab') && document.querySelector('img[alt=photo]')?.naturalWidth > 0`, 'Reopen saved project');
    await assertBrightness(125);
    await waitFor(editedPreview, 'Restored preview');
    passed.push('reopen the project after renderer reload and restore the edited preview');

    command('export');
    await waitFor(`document.body.innerText.includes('Export Photo') && document.body.innerText.includes('PNG')`, 'Export controls');
    // Exact button text includes its short description in the existing export UI.
    await clickButton('PNGLossless');
    await clickButton('1×Original');
    await clickButton('↓ Download PNG · 1×');
    await waitFor(`document.body.innerText.includes('✓ Saved!')`, 'Export saved');
    assert.equal(imageSelections, 1);
    const exported = await fs.readFile(exportPath);
    assert.deepEqual([...exported.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
    const decoded = nativeImage.createFromPath(exportPath);
    assert.equal(decoded.isEmpty(), false);
    assert.deepEqual(decoded.getSize(), dimensions);
    const pixels = await evaluate(`(async () => {
      const source = new Image(), output = new Image();
      source.src = ${JSON.stringify(savedProject.document.image)};
      output.src = ${JSON.stringify('data:image/png;base64,')} + ${JSON.stringify(exported.toString('base64'))};
      await Promise.all([source.decode(), output.decode()]);
      const render = (image, filter) => {
        const canvas = document.createElement('canvas'); canvas.width = source.naturalWidth; canvas.height = source.naturalHeight;
        const context = canvas.getContext('2d', { willReadFrequently: true });
        context.filter = filter; context.drawImage(image, 0, 0);
        return context.getImageData(0, 0, canvas.width, canvas.height).data;
      };
      const original = render(source, 'none'), expected = render(source, 'brightness(1.25) contrast(1) saturate(1)'), actual = render(output, 'none');
      let changedPixels = 0, incorrectPixels = 0, maxChannelError = 0, totalChannelError = 0;
      for (let i = 0; i < actual.length; i += 4) {
        if ([0, 1, 2].some(c => Math.abs(actual[i + c] - original[i + c]) > 2)) changedPixels++;
        // Allow two 8-bit levels for Canvas/GPU filter and PNG decode rounding.
        if ([0, 1, 2, 3].some(c => Math.abs(actual[i + c] - expected[i + c]) > 2)) incorrectPixels++;
        for (let c = 0; c < 4; c++) {
          const error = Math.abs(actual[i + c] - expected[i + c]);
          maxChannelError = Math.max(maxChannelError, error); totalChannelError += error;
        }
      }
      return { changedPixels, incorrectPixels, maxChannelError, meanChannelError: totalChannelError / actual.length };
    })()`);
    assert.ok(pixels.changedPixels > dimensions.width * dimensions.height * .1, 'Export did not contain the brightness edit');
    assert.equal(pixels.incorrectPixels, 0, `Exported pixels do not match the saved brightness adjustment: ${JSON.stringify(pixels)}`);
    assert.equal(createHash('sha256').update(await fs.readFile(fixture)).digest('hex'), originalHash);
    passed.push('export a decodable PNG with original dimensions, edited pixels and unchanged source');
    return { passed, dimensions, ...pixels, projectPath, exportPath };
  } finally {
    dialog.showOpenDialog = openDialog;
    dialog.showSaveDialog = saveDialog;
  }
};
