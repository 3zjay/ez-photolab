import { isDesktop, unwrap, openDesktopPhoto } from './desktop';
import { saveFile } from '../utils';

async function chooseFile(accept) {
  return new Promise(resolve => {
    const input = document.createElement('input'); input.type = 'file'; input.accept = accept; input.hidden = true;
    const finish = file => { input.remove(); resolve(file || null); };
    input.onchange = () => finish(input.files[0]); input.oncancel = () => finish(null);
    document.body.appendChild(input); input.click();
  });
}
export const openPhoto = () => isDesktop ? openDesktopPhoto() : chooseFile('image/*,.nef,.cr2,.cr3,.arw,.dng,.raf,.orf,.rw2');
export async function openProject() {
  if (isDesktop) return unwrap(window.photoLab.openProject());
  const file = await chooseFile('.photolab');
  return file ? { name: file.name, data: await file.text() } : null;
}
export async function saveProject(data) {
  if (isDesktop) return unwrap(window.photoLab.saveProject(data));
  return await saveFile(new Blob([data], { type: 'application/json' }), 'Untitled.photolab') === false ? null : 'Untitled.photolab';
}
export function setDirty(value) { if (isDesktop) return unwrap(window.photoLab.setDirty(value)); return Promise.resolve(); }
export function onMenu(callback) { return isDesktop ? window.photoLab.onMenu(callback) : () => {}; }
