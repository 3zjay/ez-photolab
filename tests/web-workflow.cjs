const assert = require('node:assert/strict');
exports.run = async window => {
  const evaluate = code => window.webContents.executeJavaScript(code);
  const wait = async condition => {
    for (let i = 0; i < 200; i++) { assert.ok(!(await evaluate('document.body.innerText')).includes('Something went wrong')); if (await evaluate(condition)) return; await new Promise(resolve => setTimeout(resolve, 100)); }
    throw new Error(`Web workflow timed out: ${await evaluate('document.body.innerText')}`);
  };
  const click = async text => { await wait(`!![...document.querySelectorAll('button')].find(button => !button.disabled && button.textContent.trim() === ${JSON.stringify(text)})`); await evaluate(`[...document.querySelectorAll('button')].find(button => !button.disabled && button.textContent.trim() === ${JSON.stringify(text)}).click()`); };
  const installFilePickers = async () => evaluate(`(() => {
    const nativeClick = HTMLInputElement.prototype.click;
    HTMLInputElement.prototype.click = async function () {
      if (this.type !== 'file') return nativeClick.call(this);
      const project = this.accept === '.photolab';
      const blob = project ? new Blob([sessionStorage.getItem('test-project')], { type: 'application/json' }) : await (await fetch('/ai_testing_portrait.jpg')).blob();
      const transfer = new DataTransfer(); transfer.items.add(new File([blob], project ? 'Web.photolab' : 'web-photo.jpg', { type: blob.type }));
      this.files = transfer.files; this.dispatchEvent(new Event('change', { bubbles: true }));
    };
    window.showSaveFilePicker = async ({ suggestedName }) => ({ createWritable: async () => ({
      write: async blob => {
        if (suggestedName.endsWith('.photolab')) sessionStorage.setItem('test-project', await blob.text());
        else window.webExport = await new Promise(resolve => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.readAsDataURL(blob); });
      }, close: async () => {},
    }) });
  })()`);
  await wait(`document.body.innerText.includes('Open project')`);
  assert.equal(await evaluate('typeof window.photoLab'), 'undefined', 'Web build unexpectedly requires native privileges');
  await installFilePickers(); await click('Open photo');
  await wait(`document.querySelector('img[alt=photo]')?.naturalWidth === 1264`);
  await evaluate(`(() => { const label = [...document.querySelectorAll('span')].find(span => span.textContent === 'Brightness'); const input = label.parentElement.parentElement.querySelector('input'); input.value = '125'; input.dispatchEvent(new PointerEvent('pointerup', { bubbles: true })); })()`);
  await click('Save project');
  await wait(`Boolean(sessionStorage.getItem('test-project'))`);
  assert.equal(await evaluate(`JSON.parse(sessionStorage.getItem('test-project')).document.filters.brightness`), 125);
  await window.reload(); await wait(`document.body.innerText.includes('Open project') && !document.querySelector('img[alt=photo]')`);
  await installFilePickers(); await click('Open project');
  await wait(`document.body.innerText.includes('Opened Web.photolab') && document.querySelector('img[alt=photo]')?.naturalWidth === 1264`);
  await click('↓ Export'); await click('PNGLossless'); await click('1×Original'); await click('↓ Download PNG · 1×');
  await wait(`Boolean(window.webExport)`);
  const size = await evaluate(`(async () => { const image = new Image(); image.src = window.webExport; await image.decode(); return { width: image.naturalWidth, height: image.naturalHeight }; })()`);
  assert.deepEqual(size, { width: 1264, height: 848 });
  return { nativeBridgeAbsent: true, loaded: true, edited: true, projectSaved: true, reopened: true, exported: size };
};
