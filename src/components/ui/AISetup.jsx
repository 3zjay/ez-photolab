import { useState, useEffect } from 'react';
import { loadModel, modelStates, subscribeModels } from '../../aiModels';
import { getLandmarker } from '../../faceRestore';
import { getSegmenter } from '../../skySegmenter';
import { getDepthPipeline } from '../../depthEstimator';
import { prepareCutout } from '../../cutout';

const models = [
  { id: 'faces', name: 'Faces, skin masks and culling', prepare: getLandmarker },
  { id: 'cutout', name: 'Background cutout', prepare: () => loadModel('cutout', prepareCutout) },
  { id: 'sky', name: 'Sky detection', prepare: getSegmenter },
  { id: 'depth', name: 'Depth relighting', prepare: getDepthPipeline },
];
export function AISetup() {
  const [open, setOpen] = useState(false), [states, setStates] = useState(modelStates);
  useEffect(() => subscribeModels(setStates), []);
  return <div style={{ padding: '8px 16px', borderBottom: '1px solid #666680', color: 'inherit' }}>
    <button onClick={() => setOpen(value => !value)} style={{ padding: '6px 10px', borderRadius: 6 }}>AI setup</button>
    {open && <section aria-label="AI models" style={{ padding: '12px 0', maxWidth: 720 }}>
      <strong>Local AI models</strong>
      <p style={{ fontSize: 13, margin: '8px 0' }}>Prepare these models before a shoot. Initial downloads can be large. The same models power web and desktop; photo processing stays on your device. A failed download can be retried.</p>
      {models.map(model => <div key={model.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0' }}>
        <span style={{ flex: 1 }}>{model.name}</span>
        <span role="status" style={{ fontSize: 12 }}>{states[model.id]?.detail || 'Not loaded in this session'}</span>
        <button disabled={['loading', 'ready'].includes(states[model.id]?.status)} onClick={() => model.prepare().catch(() => {})}>{states[model.id]?.status === 'error' ? 'Retry' : 'Prepare'}</button>
      </div>)}
      <p style={{ fontSize: 12 }}>“Ready” confirms the model loaded in this session. Offline availability depends on retained model files; browser storage can be cleared by the browser or user.</p>
    </section>}
  </div>;
}
