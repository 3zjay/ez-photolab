
import { SL, Empty } from "../ui/common";
import { FONTS, FONT_MAP } from "../../constants";

export function OverlayPanel({ image, texts, selText, setSelText, addText, deleteText, updateText, dm, cardBg, cardBdr, inputSt }) {
    const selectedText = texts.find(t => t.id === selText);

    return (
        <>
            {!image && <Empty>Upload a photo first</Empty>}
            {image && (
                <>
                    <div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                            <SL>Text Overlays</SL>
                            <button onClick={addText} style={{ padding: "6px 12px", background: "linear-gradient(135deg,#6c63ff,#a78bfa)", color: "#fff", border: "none", borderRadius: "8px", fontSize: "12px", fontWeight: 700, cursor: "pointer" }}>+ Add Text</button>
                        </div>
                        {texts.length === 0 && <Empty>Tap "+ Add Text" to add text to your photo</Empty>}
                        {texts.map(t => (
                            <div key={t.id} onClick={() => setSelText(t.id)}
                                style={{ padding: "10px 12px", border: `1.5px solid ${selText === t.id ? "#6c63ff" : cardBdr}`, background: selText === t.id ? cardBg : dm ? '#1e1e1e' : '#fff', borderRadius: "10px", marginBottom: "7px", cursor: "pointer" }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                    <span style={{ fontSize: "13px", fontWeight: 500, color: dm ? '#ccc' : '#444', maxWidth: "160px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.content}</span>
                                    <button onClick={e => { e.stopPropagation(); deleteText(t.id); }} style={{ background: "#fee2e2", border: "none", borderRadius: "6px", padding: "3px 7px", fontSize: "11px", color: "#ef4444", cursor: "pointer", fontWeight: 600 }}>✕</button>
                                </div>
                            </div>
                        ))}
                        {selectedText && (
                            <div style={{ padding: "14px", background: cardBg, border: `1.5px solid ${cardBdr}`, borderRadius: "10px", animation: "fadein .2s", marginTop: "4px" }}>
                                <div style={{ marginBottom: "10px" }}>
                                    <span style={{ fontSize: "11px", fontWeight: 600, color: "#aaa", textTransform: "uppercase", letterSpacing: ".06em", display: "block", marginBottom: "5px" }}>Text</span>
                                    <input value={selectedText.content} onChange={e => updateText(selText, "content", e.target.value)} style={inputSt} />
                                </div>
                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "10px" }}>
                                    <div>
                                        <span style={{ fontSize: "11px", fontWeight: 600, color: "#aaa", textTransform: "uppercase", letterSpacing: ".06em", display: "block", marginBottom: "5px" }}>Font</span>
                                        <select value={selectedText.font} onChange={e => updateText(selText, "font", e.target.value)} style={{ ...inputSt }}>
                                            {FONTS.map(f => <option key={f}>{f}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <span style={{ fontSize: "11px", fontWeight: 600, color: "#aaa", textTransform: "uppercase", letterSpacing: ".06em", display: "block", marginBottom: "5px" }}>Color</span>
                                        <input type="color" value={selectedText.color} onChange={e => updateText(selText, "color", e.target.value)} style={{ width: "100%", height: "34px", border: `1.5px solid ${cardBdr}`, borderRadius: "8px", cursor: "pointer" }} />
                                    </div>
                                </div>
                                <div style={{ marginBottom: "10px" }}>
                                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "5px" }}>
                                        <span style={{ fontSize: "11px", fontWeight: 600, color: "#aaa", textTransform: "uppercase", letterSpacing: ".06em" }}>Size</span>
                                        <span style={{ fontSize: "12px", color: "#6c63ff", fontWeight: 600 }}>{selectedText.fontSize}px</span>
                                    </div>
                                    <input type="range" className="sl" min={12} max={200} step={2} value={selectedText.fontSize} style={{ "--v": `${((selectedText.fontSize - 12) / 188) * 100}%` }} onChange={e => updateText(selText, "fontSize", +e.target.value)} />
                                </div>
                                <div style={{ marginBottom: "10px" }}>
                                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "5px" }}>
                                        <span style={{ fontSize: "11px", fontWeight: 600, color: "#aaa", textTransform: "uppercase", letterSpacing: ".06em" }}>Position Y</span>
                                        <span style={{ fontSize: "12px", color: "#6c63ff", fontWeight: 600 }}>{selectedText.y}%</span>
                                    </div>
                                    <input type="range" className="sl" min={5} max={95} step={1} value={selectedText.y} style={{ "--v": `${((selectedText.y - 5) / 90) * 100}%` }} onChange={e => updateText(selText, "y", +e.target.value)} />
                                </div>
                                <div style={{ display: "flex", gap: "8px" }}>
                                    {[{ k: "bold", l: "Bold" }, { k: "italic", l: "Italic" }, { k: "stroke", l: "Outline" }].map(o => (
                                        <button key={o.k} onClick={() => updateText(selText, o.k, !selectedText[o.k])}
                                            style={{ flex: 1, padding: "7px", border: `1.5px solid ${selectedText[o.k] ? "#6c63ff" : cardBdr}`, background: selectedText[o.k] ? cardBg : dm ? '#1e1e1e' : '#fff', borderRadius: "8px", fontSize: "12px", fontWeight: 700, cursor: "pointer", color: selectedText[o.k] ? "#6c63ff" : dm ? '#ccc' : '#777', fontFamily: "inherit" }}>
                                            {o.l}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </>
            )}
        </>
    )
}
