import { useRef } from 'react';
import { changeCrop } from '../imageGeometry';

export function CropOverlay({ box, setBox, aspect }) {
  const root = useRef(null), dragging = useRef(null);
  const start = (event, edge) => {
    event.preventDefault(); event.stopPropagation();
    const rect = root.current.getBoundingClientRect();
    const [aw, ah] = (aspect || 'free').split(':').map(Number);
    dragging.current = { edge, box, x: event.clientX, y: event.clientY, rect, ratio: aw && ah ? (aw / ah) / (rect.width / rect.height) : null };
    root.current.setPointerCapture(event.pointerId);
  };
  const move = event => {
    const drag = dragging.current; if (!drag) return;
    setBox(changeCrop(drag.box, drag.edge, (event.clientX - drag.x) / drag.rect.width * 100, (event.clientY - drag.y) / drag.rect.height * 100, drag.ratio));
  };
  return <div ref={root} onPointerMove={move} onPointerUp={() => { dragging.current = null; }} onPointerCancel={() => { dragging.current = null; }} style={{ position: 'absolute', inset: 0, zIndex: 10, touchAction: 'none', overflow: 'hidden' }}>
    <div onPointerDown={e => start(e, 'move')} style={{ position: 'absolute', left: `${box.x}%`, top: `${box.y}%`, width: `${box.w}%`, height: `${box.h}%`, border: '2px solid white', boxShadow: '0 0 0 9999px rgba(0,0,0,.5)', cursor: 'move' }}>
      <div style={{ position: 'absolute', inset: 0, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gridTemplateRows: '1fr 1fr 1fr', pointerEvents: 'none' }}>{Array.from({ length: 9 }, (_, i) => <div key={i} style={{ border: '0.5px solid #ffffff60' }} />)}</div>
      {[['nw',0,0],['n',50,0],['ne',100,0],['w',0,50],['e',100,50],['sw',0,100],['s',50,100],['se',100,100]].map(([edge,x,y]) => <div key={edge} onPointerDown={e => start(e, edge)} style={{ position: 'absolute', left: `${x}%`, top: `${y}%`, transform: 'translate(-50%, -50%)', width: 14, height: 14, background: 'white', border: '1px solid #6c63ff', cursor: `${edge}-resize` }} />)}
    </div>
  </div>;
}
