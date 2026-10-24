import { useEffect, useRef, useState } from 'react';
import * as projectIO from './projectIO';
import { readRecovery, saveRecovery, sessionHasWork } from './recovery';
import { APP_VERSION } from '../version';
import { isDesktop } from './desktop';
import { parseProject, serializeProject } from './project';
import { loadImageFromSrc } from '../utils';

const same = (a, b) => a && b && Object.keys(a).every(key => a[key] === b[key]);
const buttonStyle = { padding: '6px 10px', border: '1px solid #73738e', borderRadius: 6, background: 'transparent', color: 'inherit', cursor: 'pointer', fontSize: 12 };

export function DesktopWorkspace({ document: current, restore, loadPhoto, exportPhoto, session, restoreSession }) {
  const [status, setStatus] = useState(`PHOTOlab ${APP_VERSION} · Local workspace`);
  const [recovery, setRecovery] = useState(null);
  const [historyState, setHistoryState] = useState({ back: 0, forward: 0 });
  const [busy, setBusy] = useState(false);
  const history = useRef({ entries: [], index: -1, applying: null });
  const latest = useRef({ current, restore, loadPhoto, exportPhoto, session, restoreSession });
  latest.current = { current, restore, loadPhoto, exportPhoto, session, restoreSession };
  const revision = useRef(0);
  const saved = useRef(null);

  useEffect(() => { readRecovery().then(setRecovery).catch(e => setStatus(e.message)); }, []);
  useEffect(() => {
    const version = ++revision.current;
    const hasWork = Boolean(current.image) || sessionHasWork(session);
    projectIO.setDirty(sessionHasWork(session) || (hasWork && !same(saved.current, current))).catch(e => setStatus(e.message));
    if (!hasWork) return;
    const h = history.current;
    if (same(h.applying, current)) h.applying = null;
    else if (!same(h.entries[h.index], current)) {
      h.entries = h.entries.slice(0, h.index + 1).concat(current).slice(-30);
      h.index = h.entries.length - 1;
    }
    setHistoryState({ back: h.index, forward: h.entries.length - h.index - 1 });
    const timer = setTimeout(async () => {
      try {
        const data = current.image ? await serializeProject(current) : null;
        if (version !== revision.current) return;
        await saveRecovery(data, session);
        if (version === revision.current) setStatus('Recovery saved locally');
      } catch (e) { if (version === revision.current) setStatus(`Recovery failed: ${e.message}`); }
    }, 1200);
    return () => clearTimeout(timer);
  }, [current, session]);

  useEffect(() => {
    if (isDesktop) return;
    const warn = event => { if ((latest.current.current.image && !same(saved.current, latest.current.current)) || sessionHasWork(latest.current.session)) { event.preventDefault(); event.returnValue = ''; } };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, []);

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
    await projectIO.setDirty(false);
  };
  const openPhoto = () => run(async () => {
    if (!mayReplace()) return;
    const file = await projectIO.openPhoto();
    if (file) latest.current.loadPhoto(file);
  });
  const openProject = () => run(async () => {
    if (!mayReplace()) return;
    const project = await projectIO.openProject();
    if (project) { await restoreProject(project.data); setStatus(`Opened ${project.name}`); }
  });
  const saveProject = () => run(async () => {
    const snapshot = latest.current.current;
    if (!snapshot.image) { setStatus('Open a photo before saving a project.'); return; }
    const data = await serializeProject(snapshot);
    const name = await projectIO.saveProject(data);
    if (name) { saved.current = snapshot; await projectIO.setDirty(sessionHasWork(latest.current.session) || !same(snapshot, latest.current.current)); setStatus(`Saved ${name}`); }
  });
  const travel = delta => {
    const h = history.current; const index = h.index + delta;
    if (busy || index < 0 || index >= h.entries.length) return;
    h.index = index; h.applying = h.entries[index]; latest.current.restore(h.applying);
  };
  const actions = useRef({});
  actions.current = { 'open-photo': openPhoto, 'open-project': openProject, 'save-project': saveProject, export: () => latest.current.exportPhoto(), undo: () => travel(-1), redo: () => travel(1) };
  useEffect(() => projectIO.onMenu(command => actions.current[command]?.()), []);
  useEffect(() => {
    if (!isDesktop) return;
    return window.photoLab.onFlush(async () => {
      const snapshot = latest.current;
      if (snapshot.current.image || sessionHasWork(snapshot.session)) {
        await saveRecovery(snapshot.current.image ? await serializeProject(snapshot.current) : null, snapshot.session);
      }
    });
  }, []);
  return <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', padding: '10px 16px', borderBottom: '1px solid #666680' }}>
    <button style={buttonStyle} disabled={busy} onClick={openPhoto}>Open photo</button>
    <button style={buttonStyle} disabled={busy} onClick={openProject}>Open project</button>
    <button style={buttonStyle} disabled={busy || !current.image} onClick={saveProject}>Save project</button>
    <button style={buttonStyle} disabled={busy || historyState.back < 1} onClick={() => travel(-1)}>Undo</button>
    <button style={buttonStyle} disabled={busy || historyState.forward < 1} onClick={() => travel(1)}>Redo</button>
    {recovery && <button style={buttonStyle} disabled={busy} onClick={() => run(async () => { if (mayReplace()) { if (recovery.document) await restoreProject(recovery.document); if (recovery.session) await latest.current.restoreSession(recovery.session); setRecovery(null); setStatus('Recovered editor, culling and batch workspace. Queued work is paused until you start it.'); } })}>Recover session</button>}
    <span role="status" style={{ marginLeft: 'auto', fontSize: 12, opacity: .7, maxWidth: 430 }}>{busy ? 'Working…' : status}</span>
  </div>;
}
