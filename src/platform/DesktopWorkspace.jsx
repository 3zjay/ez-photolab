import { useEffect, useRef, useState } from 'react';
import { unwrap, openDesktopPhoto } from './desktop';
import { parseProject, serializeProject } from './project';
import { loadImageFromSrc } from '../utils';

const same = (a, b) => a && b && Object.keys(a).every(key => a[key] === b[key]);
const buttonStyle = { padding: '6px 10px', border: '1px solid #73738e', borderRadius: 6, background: 'transparent', color: 'inherit', cursor: 'pointer', fontSize: 12 };

export function DesktopHome({ onEdit, onCull, onBatch }) {
  return <main style={{ maxWidth: 760, margin: '70px auto', padding: 32 }}>
    <p style={{ color: '#a49dff', fontSize: 13, letterSpacing: 2, fontWeight: 700 }}>WINDOWS DESKTOP v2.9.0 · FULL AI STUDIO</p>
    <h1 style={{ fontSize: 40, margin: '18px 0' }}>Professional AI Photo Studio for Windows</h1>
    <p style={{ lineHeight: 1.7, opacity: .85 }}>Fully updated with 100% on-device AI Magic Retouch, smart cutouts, tone curves, multi-layer compositing, and native folder access for fast culling and batch exports.</p>
    <div style={{ display: 'flex', gap: 12, margin: '28px 0' }}>
      <button style={{ ...buttonStyle, background: 'linear-gradient(135deg, #6c63ff, #8b5cf6)', color: '#fff', border: 'none', fontWeight: 600, padding: '8px 16px' }} onClick={onEdit}>🎨 Open Edit Studio</button><button style={{ ...buttonStyle, padding: '8px 16px' }} onClick={onCull}>⚡ Cull a shoot</button><button style={{ ...buttonStyle, padding: '8px 16px' }} onClick={onBatch}>📦 Batch process</button>
    </div>
    <DesktopAccount />
  </main>;
}
export function DesktopAccount() {
  return <div style={{ padding: 24, border: '1px solid #666680', borderRadius: 12, lineHeight: 1.7 }}>
    <strong>PHOTOlab Desktop v2.9.0 Status</strong>
    <p>This desktop installation runs locally with full hardware acceleration. All Edit Studio features, 100% on-device AI Magic Retouch, smart cutout, tone curves, and multi-layer editing are fully active.</p>
    <p style={{ opacity: .7, marginTop: 8 }}>Local editing tools are available for preview. AI tools may need an internet connection to download models. Batch queues and culling sessions are not included in project recovery yet.</p>
  </div>;
}

export function DesktopWorkspace({ document: current, restore, loadPhoto, exportPhoto }) {
  const [status, setStatus] = useState('PHOTOlab Desktop v2.9.0 · Local workspace');
  const [recovery, setRecovery] = useState(null);
  const [historyState, setHistoryState] = useState({ back: 0, forward: 0 });
  const [busy, setBusy] = useState(false);
  const history = useRef({ entries: [], index: -1, applying: null });
  const latest = useRef({ current, restore, loadPhoto, exportPhoto });
  latest.current = { current, restore, loadPhoto, exportPhoto };
  const revision = useRef(0);
  const saved = useRef(null);

  useEffect(() => { unwrap(window.photoLab.recovery()).then(setRecovery).catch(e => setStatus(e.message)); }, []);
  useEffect(() => {
    const version = ++revision.current;
    window.photoLab.setDirty(Boolean(current.image) && !same(saved.current, current));
    if (!current.image) return;
    const h = history.current;
    if (same(h.applying, current)) h.applying = null;
    else if (!same(h.entries[h.index], current)) {
      h.entries = h.entries.slice(0, h.index + 1).concat(current).slice(-30);
      h.index = h.entries.length - 1;
    }
    setHistoryState({ back: h.index, forward: h.entries.length - h.index - 1 });
    const timer = setTimeout(async () => {
      try {
        const data = await serializeProject(current);
        if (version !== revision.current) return;
        await unwrap(window.photoLab.autosave(data));
        if (version === revision.current) setStatus('Recovery saved locally');
      } catch (e) { if (version === revision.current) setStatus(`Recovery failed: ${e.message}`); }
    }, 1200);
    return () => clearTimeout(timer);
  }, [current]);

  const run = async fn => {
    if (busy) return;
    setBusy(true);
    try { await fn(); } catch (e) { setStatus(e.message); } finally { setBusy(false); }
  };
  const mayReplace = () => !latest.current.current.image || same(saved.current, latest.current.current) || window.confirm('Replace the current photo? Save a project first to keep this version.');
  const restoreProject = async data => {
    const value = parseProject(data);
    // Decode all sources before changing state, so a damaged file cannot partly replace a document.
    await Promise.all([value.image, value.originalImage, value.customSkyUrl, value.bgResult].filter(Boolean).map(loadImageFromSrc));
    if (value.logo) value.logo = await loadImageFromSrc(value.logo);
    history.current = { entries: [value], index: 0, applying: value };
    saved.current = value;
    latest.current.restore(value);
    await unwrap(window.photoLab.setDirty(false));
  };
  const openPhoto = () => run(async () => {
    if (!mayReplace()) return;
    const file = await openDesktopPhoto();
    if (file) latest.current.loadPhoto(file);
  });
  const openProject = () => run(async () => {
    if (!mayReplace()) return;
    const project = await unwrap(window.photoLab.openProject());
    if (project) { await restoreProject(project.data); setStatus(`Opened ${project.name}`); }
  });
  const saveProject = () => run(async () => {
    const snapshot = latest.current.current;
    if (!snapshot.image) { setStatus('Open a photo before saving a project.'); return; }
    const data = await serializeProject(snapshot);
    const name = await unwrap(window.photoLab.saveProject(data));
    if (name) { saved.current = snapshot; await unwrap(window.photoLab.setDirty(!same(snapshot, latest.current.current))); setStatus(`Saved ${name}`); }
  });
  const travel = delta => {
    const h = history.current; const index = h.index + delta;
    if (busy || index < 0 || index >= h.entries.length) return;
    h.index = index; h.applying = h.entries[index]; latest.current.restore(h.applying);
  };
  const actions = useRef({});
  actions.current = { 'open-photo': openPhoto, 'open-project': openProject, 'save-project': saveProject, export: () => latest.current.exportPhoto(), undo: () => travel(-1), redo: () => travel(1) };
  useEffect(() => window.photoLab.onMenu(command => actions.current[command]?.()), []);
  return <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', padding: '10px 16px', borderBottom: '1px solid #666680' }}>
    <button style={buttonStyle} disabled={busy} onClick={openPhoto}>Open photo</button>
    <button style={buttonStyle} disabled={busy} onClick={openProject}>Open project</button>
    <button style={buttonStyle} disabled={busy || !current.image} onClick={saveProject}>Save project</button>
    <button style={buttonStyle} disabled={busy || historyState.back < 1} onClick={() => travel(-1)}>Undo</button>
    <button style={buttonStyle} disabled={busy || historyState.forward < 1} onClick={() => travel(1)}>Redo</button>
    {recovery && <button style={buttonStyle} disabled={busy} onClick={() => run(async () => { if (mayReplace()) { await restoreProject(recovery); setRecovery(null); setStatus('Recovered previous editing session'); } })}>Recover session</button>}
    <span role="status" style={{ marginLeft: 'auto', fontSize: 12, opacity: .7, maxWidth: 430 }}>{busy ? 'Working…' : status}</span>
  </div>;
}
