const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { dialog, app } = require('electron');
exports.run = async (window, flushWorkspace) => {
  const root = await fs.mkdtemp(path.resolve('.desktop-test', 'shoot-workflow-'));
  await fs.copyFile(path.resolve('public/ai_testing_portrait.jpg'), path.join(root, 'shoot.jpg'));
  const previous = dialog.showOpenDialog;
  const evaluate = code => window.webContents.executeJavaScript(code);
  const wait = async (condition, label) => {
    for (let i = 0; i < 150; i++) {
      const text = await evaluate('document.body.innerText'); assert.ok(!text.includes('Something went wrong'), text);
      if (await evaluate(condition)) return;
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    throw new Error(`${label}: ${await evaluate('document.body.innerText')}`);
  };
  const click = async (text, contains = false) => {
    await wait(`!![...document.querySelectorAll('button')].find(button => !button.disabled && ${contains ? `button.textContent.includes(${JSON.stringify(text)})` : `button.textContent.trim() === ${JSON.stringify(text)}`})`, text);
    await evaluate(`[...document.querySelectorAll('button')].find(button => !button.disabled && ${contains ? `button.textContent.includes(${JSON.stringify(text)})` : `button.textContent.trim() === ${JSON.stringify(text)}`}).click()`);
  };
  try {
    dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [root] });
    // The preceding editor test leaves its export dialog open.
    await click('✕'); await click('Cull AI');
    await click('Select Directory with Images', true);
    await wait(`document.body.innerText.includes('1 Photos')`, 'Folder scan');
    await evaluate(`(() => { const label = [...document.querySelectorAll('label')].find(item => item.textContent.includes('Enable MediaPipe')); const input = label?.parentElement.querySelector('input'); if (!input) throw new Error('Missing face toggle'); if (input.checked) input.click(); })()`);
    await click('Start AI Culling Sequence', true);
    await wait(`document.body.innerText.includes('AI Culling completed successfully!')`, 'Culling result');
    await evaluate(`window.dispatchEvent(new KeyboardEvent('keydown', { key: '1', bubbles: true }))`);
    await click('Batch');
    await wait(`!!document.querySelector('input[placeholder="shop_"]')`, 'Batch workspace');
    await evaluate(`document.querySelector('input[placeholder="shop_"]').focus()`);
    await window.webContents.insertText('recovered_');
    await wait(`document.querySelector('input[placeholder="shop_"]')?.value === 'recovered_'`, 'Batch prefix input');
    await flushWorkspace();
    const filename = path.join(app.getPath('userData'), 'workspace-recovery.photolab');
    let persisted;
    for (let i = 0; i < 100; i++) {
      try { persisted = JSON.parse(await fs.readFile(filename, 'utf8')).document.recovery.session; } catch {}
      if (persisted?.batchPrefix === 'recovered_' && persisted.cullResults?.[0]?.manualSelection) break;
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    assert.equal(persisted.batchPrefix, 'recovered_', await evaluate('document.body.innerText')); assert.equal(persisted.cullResults[0].rating, 1); assert.equal(persisted.cullResults[0].manualSelection, true);
    assert.equal(persisted.cullImages.length, 1); assert.equal(persisted.batchImages.length, 1);
    assert.equal(persisted.cullOptions.useFaceLandmarks, false);
    await window.reload();
    await click('Recover session');
    await wait(`document.body.innerText.includes('Recovered editor, culling and batch workspace')`, 'Workspace recovery');
    await click('Batch');
    await wait(`document.querySelector('input[placeholder="shop_"]')?.value === 'recovered_'`, 'Recovered batch settings');
    return { manualRating: persisted.cullResults[0].rating, cullFiles: persisted.cullImages.length, batchFiles: persisted.batchImages.length, batchPrefix: 'recovered_', pausedAfterRecovery: true };
  } finally { dialog.showOpenDialog = previous; }
};
