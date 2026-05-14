
import {SL, Empty, AB} from "../ui/common";

export function AdjustPanel({ image, setRotation, setFlipH, setFlipV, rotation, flipH, flipV, cropMode, setCropMode, setCropBox, cropAspect, setCropAspect, applyCrop, dm, cardBg, cardBdr }) {
    const setCropAspectRatio = ratio => {
        setCropAspect(ratio);
        if (ratio === "free") return;
        const [aw, ah] = ratio.split(":").map(Number);
        const imgW = image?.naturalWidth || 1, imgH = image?.naturalHeight || 1;
        const imgAspect = imgW / imgH, cropAspect = aw / ah;
        let w, h;
        if (imgAspect > cropAspect) { h = 100; w = h * (cropAspect / (imgW / imgH)) * (imgW / imgH); }
        else { w = 100; h = w * (imgW / imgH) / cropAspect; }
        w = Math.min(100, w); h = Math.min(100, h);
        setCropBox({ x: (100 - w) / 2, y: (100 - h) / 2, w, h });
    };

    return (
        <>
            {!image && <Empty>Upload a photo first</Empty>}
            {image && (
                <>
                    <div>
                        <SL>Rotate & Flip</SL>
                        <div style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
                            {[{ l: "↺ -90°", a: () => setRotation(r => (r - 90 + 360) % 360) }, { l: "↻ +90°", a: () => setRotation(r => (r + 90) % 360) }, { l: "↔ Flip H", a: () => setFlipH(v => !v), active: flipH }, { l: "↕ Flip V", a: () => setFlipV(v => !v), active: flipV }].map(b => (
                                <button key={b.l} onClick={b.a}
                                    style={{ flex: 1, padding: "9px 4px", border: `1.5px solid ${b.active ? "#6c63ff" : cardBdr}`, background: b.active ? cardBg : dm ? '#1e1e1e' : '#fff', borderRadius: "9px", fontSize: "11px", fontWeight: 600, cursor: "pointer", color: b.active ? "#6c63ff" : dm ? '#ccc' : '#555', fontFamily: "inherit" }}>
                                    {b.l}
                                </button>
                            ))}
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                            <span style={{ fontSize: "13px", fontWeight: 500, color: rotation !== 0 ? "#6c63ff" : dm ? '#ccc' : '#666' }}>Fine Rotate</span>
                            <span style={{ fontSize: "12px", color: "#bbb" }}>{rotation}°</span>
                        </div>
                        <input type="range" className="sl" min={-180} max={180} step={1} value={rotation} style={{ "--v": `${((rotation + 180) / 360) * 100}%` }} onChange={e => setRotation(+e.target.value)} />
                        {rotation !== 0 && <button onClick={() => setRotation(0)} style={{ marginTop: "6px", fontSize: "11px", color: "#6c63ff", background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}>Reset rotation</button>}
                    </div>
                    <div>
                        <SL>Crop</SL>
                        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "10px" }}>
                            {["free", "1:1", "4:3", "16:9", "9:16", "3:4"].map(r => (
                                <button key={r} onClick={() => { setCropAspectRatio(r); setCropMode(true); }}
                                    style={{ padding: "7px 10px", border: `1.5px solid ${cropAspect === r && cropMode ? "#6c63ff" : cardBdr}`, background: cropAspect === r && cropMode ? cardBg : dm ? '#1e1e1e' : '#fff', borderRadius: "8px", fontSize: "11px", fontWeight: 600, cursor: "pointer", color: cropAspect === r && cropMode ? "#6c63ff" : dm ? '#ccc' : '#555', fontFamily: "inherit" }}>
                                    {r === "free" ? "✦ Free" : r}
                                </button>
                            ))}
                        </div>
                        {cropMode && (
                            <div style={{ display: "flex", gap: "8px" }}>
                                <AB onClick={applyCrop} color="purple" textColor="#fff" style={{ flex: 1, padding: "10px" }}>✓ Apply Crop</AB>
                                <AB onClick={() => { setCropMode(false); setCropBox({ x: 0, y: 0, w: 100, h: 100 }); setCropAspect("free"); }} color={dm ? '#333' : '#f2f2f8'} textColor={dm ? '#ccc' : '#666'} style={{ flex: 1, padding: "10px" }}>Cancel</AB>
                            </div>
                        )}
                        {!cropMode && <p style={{ fontSize: "11px", color: "#bbb", lineHeight: 1.5 }}>Select a ratio to enter crop mode.</p>}
                    </div>
                </>
            )}
        </>
    )
}
