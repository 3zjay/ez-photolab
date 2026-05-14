import { SL, Empty, Row, Spin, PBar, AB } from "../ui/common";
import { BG_COLORS } from "../../constants";

export function ToolsPanel({ image, handleRemoveBg, bgStatus, bgProgress, bgSubUrl, bgMode, setBgMode, cardBdr, cardBg, dm, bgColor, setBgColor, bgBlur, setBgBlur, bgResult, saveFile, falApiKey, saveFalKey, claidApiKey, saveClaidKey, aiRemoveBrush, setAiRemoveBrush, toCSSFilter, filters, initMaskCanvas, maskCanvasRef, maskDrawingRef, drawMask, aiMaskReady, handleAiRemove, aiRemoveStatus, aiRemoveLog, aiRemoveResult, applyAiResult }) {
    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            <div>
                <SL>Background Removal</SL>
                <p style={{ fontSize: "12px", color: "#aaa", lineHeight: 1.6, marginBottom: "10px" }}>Runs in your browser — private &amp; free.</p>
                <AB onClick={handleRemoveBg} disabled={!image || bgStatus === "loading"}
                    color={bgStatus === "done" ? "#f0fff4" : image ? "purple" : "#f0f0f0"} textColor={bgStatus === "done" ? "#16a34a" : image ? "#fff" : "#bbb"}
                    style={{ width: "100%", padding: "11px", marginBottom: "6px" }}>
                    {bgStatus === "loading" ? <Row><Spin />Processing... {bgProgress}%</Row> : bgStatus === "done" ? "✓ Done — Remove Again" : "✂ Remove Background"}
                </AB>
                {bgStatus === "loading" && <PBar value={bgProgress} />}
                {bgStatus === "error" && <p style={{ fontSize: "12px", color: "#ef4444", marginTop: "4px" }}>⚠ Failed — try JPG or PNG</p>}
                {!image && <Empty>Upload a photo first</Empty>}
            </div>
            {bgStatus === "done" && bgSubUrl && (
                <div style={{ animation: "fadein .3s" }}>
                    <SL>Background Style</SL>
                    {[{ id: "transparent", l: "Transparent", i: "◻" }, { id: "color", l: "Solid Color", i: "🎨" }, { id: "blur", l: "Blur Original", i: "✦" }].map(o => (
                        <button key={o.id} onClick={() => setBgMode(o.id)}
                            style={{ width: "100%", padding: "10px 12px", marginBottom: "6px", border: `1.5px solid ${bgMode === o.id ? "#6c63ff" : cardBdr}`, background: bgMode === o.id ? cardBg : dm ? '#1e1e1e' : '#fff', borderRadius: "10px", textAlign: "left", cursor: "pointer", display: "flex", alignItems: "center", gap: "10px", transition: "all .18s", fontFamily: "inherit" }}>
                            <span style={{ fontSize: "15px" }}>{o.i}</span>
                            <span style={{ fontSize: "13px", fontWeight: 600, color: bgMode === o.id ? "#6c63ff" : dm ? '#ccc' : '#444' }}>{o.l}</span>
                            {bgMode === o.id && <span style={{ marginLeft: "auto", color: "#6c63ff" }}>✓</span>}
                        </button>
                    ))}
                    {bgMode === "color" && (
                        <div style={{ padding: "12px", background: cardBg, border: `1.5px solid ${cardBdr}`, borderRadius: "10px", marginBottom: "8px" }}>
                            <div style={{ display: "flex", gap: "7px", flexWrap: "wrap", marginBottom: "10px" }}>
                                {BG_COLORS.map(c => <div key={c} onClick={() => setBgColor(c)} style={{ width: "26px", height: "26px", borderRadius: "6px", background: c, border: `2.5px solid ${bgColor === c ? "#6c63ff" : "#ddd"}`, cursor: "pointer", flexShrink: 0 }} />)}
                            </div>
                            <input type="color" value={bgColor} onChange={e => setBgColor(e.target.value)} style={{ width: "100%", height: "32px", border: `1.5px solid ${cardBdr}`, borderRadius: "8px", cursor: "pointer" }} />
                        </div>
                    )}
                    {bgMode === "blur" && (
                        <div style={{ padding: "12px", background: cardBg, border: `1.5px solid ${cardBdr}`, borderRadius: "10px", marginBottom: "8px" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                                <span style={{ fontSize: "11px", fontWeight: 600, color: "#aaa", textTransform: "uppercase", letterSpacing: ".06em" }}>Blur</span>
                                <span style={{ fontSize: "12px", color: "#6c63ff", fontWeight: 600 }}>{bgBlur}px</span>
                            </div>
                            <input type="range" className="sl" min={2} max={40} step={1} value={bgBlur} style={{ "--v": `${((bgBlur - 2) / 38) * 100}%` }} onChange={e => setBgBlur(+e.target.value)} />
                        </div>
                    )}
                    {bgResult && (<>
                        <div style={{ position: "relative", borderRadius: "10px", overflow: "hidden", margin: "8px 0", border: "1.5px solid #eee" }}>
                            {bgMode === "transparent" && <div className="checker" style={{ position: "absolute", inset: 0 }} />}
                            <img src={bgResult} alt="result" style={{ width: "100%", display: "block", position: "relative" }} />
                        </div>
                        <AB onClick={async () => await saveFile(await (await fetch(bgResult)).blob(), "photolab_nobg.png")} color="purple" textColor="#fff" style={{ width: "100%", padding: "11px" }}>↓ Download PNG</AB>
                    </>)}
                </div>
            )}

            {/* ── OBJECT REMOVAL (Claid.ai — 50 free credits) ── */}
            {image && (
                <div style={{ padding: "14px", background: cardBg, border: `1.5px solid ${cardBdr}`, borderRadius: "12px", display: "flex", flexDirection: "column", gap: "10px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <SL>Object Removal — LaMa Inpainting</SL>
                        <span style={{ fontSize: "10px", fontWeight: 700, padding: "2px 8px", background: "#fff8e7", color: "#b45309", borderRadius: "20px", border: "1px solid #fcd34d", marginBottom: "8px" }}>50 FREE CREDITS</span>
                    </div>
                    <div style={{ padding: "10px 12px", background: dm ? '#1e2a10' : '#f0fdf4', border: "1px solid #86efac", borderRadius: "8px", fontSize: "11px", color: dm ? '#86efac' : '#166534', lineHeight: 1.6 }}>
                        🎁 Sign up free at <strong>claid.ai</strong> → you get <strong>50 free credits</strong> (50 removals). No credit card needed. Get your API key from Settings → API.
                    </div>
                    {/* API Keys Configuration */}
                    <div style={{ padding: "12px", background: dm ? '#1a1a2e' : '#f0f4ff', border: `1px solid ${dm ? '#333' : '#d0d8ff'}`, borderRadius: "10px", display: "flex", flexDirection: "column", gap: "10px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            <span style={{ fontSize: "11px", fontWeight: 700, color: "#6c63ff" }}>⚙ API CONFIGURATION</span>
                        </div>
                        
                        {/* fal.ai API Key */}
                        <div>
                            <div style={{ fontSize: "11px", fontWeight: 600, color: "#aaa", textTransform: "uppercase", letterSpacing: ".05em", marginBottom: "5px" }}>fal.ai API Key (Face Restore)</div>
                            <input type="password" value={falApiKey} onChange={e => saveFalKey(e.target.value)}
                                placeholder="your-fal-api-key"
                                style={{ width: "100%", padding: "8px 10px", border: `1px solid ${falApiKey ? '#6c63ff' : cardBdr}`, borderRadius: "8px", fontSize: "12px", fontFamily: "monospace", outline: "none", background: dm ? '#0e0e1a' : '#fff', color: dm ? '#ddd' : '#333' }} />
                        </div>

                        {/* Claid API Key */}
                        <div>
                            <div style={{ fontSize: "11px", fontWeight: 600, color: "#aaa", textTransform: "uppercase", letterSpacing: ".05em", marginBottom: "5px" }}>Claid.ai API Key (Object Removal)</div>
                            <input type="password" value={claidApiKey} onChange={e => saveClaidKey(e.target.value)}
                                placeholder="your-claid-api-key"
                                style={{ width: "100%", padding: "8px 10px", border: `1px solid ${claidApiKey ? '#6c63ff' : cardBdr}`, borderRadius: "8px", fontSize: "12px", fontFamily: "monospace", outline: "none", background: dm ? '#0e0e1a' : '#fff', color: dm ? '#ddd' : '#333' }} />
                        </div>
                    </div>
                    <p style={{ fontSize: "11px", color: "#aaa", lineHeight: 1.5 }}>Paint over the object you want removed. LaMa fills it with context-aware inpainting.</p>
                    <div>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "5px" }}>
                            <span style={{ fontSize: "12px", color: dm ? '#ccc' : '#555' }}>Brush size</span>
                            <span style={{ fontSize: "12px", fontWeight: 700, color: "#6c63ff" }}>{aiRemoveBrush}px</span>
                        </div>
                        <input type="range" className="sl" min={10} max={120} step={5} value={aiRemoveBrush}
                            style={{ "--v": `${((aiRemoveBrush - 10) / 110) * 100}%` }}
                            onChange={e => setAiRemoveBrush(+e.target.value)} />
                    </div>
                    <div style={{ position: "relative", borderRadius: "8px", overflow: "hidden", border: `1.5px solid ${aiMaskReady ? '#f59e0b' : cardBdr}`, cursor: "crosshair", lineHeight: 0, userSelect: "none", touchAction: "none" }}
                        onMouseDown={e => { maskDrawingRef.current = true; drawMask(e, e.currentTarget); }}
                        onMouseMove={e => drawMask(e, e.currentTarget)}
                        onMouseUp={() => { maskDrawingRef.current = false; }}
                        onMouseLeave={() => { maskDrawingRef.current = false; }}
                        onTouchStart={e => { e.preventDefault(); maskDrawingRef.current = true; drawMask(e, e.currentTarget); }}
                        onTouchMove={e => { e.preventDefault(); drawMask(e, e.currentTarget); }}
                        onTouchEnd={() => { maskDrawingRef.current = false; }}>
                        <img src={image} alt="source" style={{ width: "100%", display: "block", filter: toCSSFilter(filters) }} onLoad={initMaskCanvas} />
                        <canvas ref={maskCanvasRef} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0.5, mixBlendMode: "screen", pointerEvents: "none" }} />
                        {aiMaskReady && <div style={{ position: "absolute", top: "6px", left: "6px", padding: "3px 8px", background: "rgba(245,158,11,.9)", borderRadius: "12px", fontSize: "10px", fontWeight: 700, color: "#fff" }}>✏ Mask painted</div>}
                    </div>
                    <div style={{ display: "flex", gap: "7px" }}>
                        <button onClick={() => { initMaskCanvas(); setAiRemoveResult(null); setAiRemoveStatus('idle'); }}
                            style={{ flex: 1, padding: "9px", border: `1px solid ${cardBdr}`, background: dm ? '#252525' : '#f2f2f8', borderRadius: "9px", fontSize: "12px", fontWeight: 600, color: dm ? '#ccc' : '#666', cursor: "pointer", fontFamily: "inherit" }}>
                            🗑 Clear
                        </button>
                        <AB onClick={handleAiRemove}
                            disabled={aiRemoveStatus === 'loading' || !aiMaskReady || !falApiKey}
                            color={aiRemoveStatus === 'done' ? '#f0fff4' : 'purple'}
                            textColor={aiRemoveStatus === 'done' ? '#16a34a' : '#fff'}
                            style={{ flex: 2, padding: "9px", fontSize: "12px" }}>
                            {aiRemoveStatus === 'loading' ? <Row><Spin />Removing…</Row>
                                : aiRemoveStatus === 'done' ? '✓ Done — Paint Again'
                                    : !falApiKey ? 'Enter API key above'
                                        : '🧹 Remove Object'}
                        </AB>
                    </div>
                    {aiRemoveLog && <p style={{ fontSize: "11px", color: aiRemoveStatus === 'error' ? '#ef4444' : '#a78bfa', lineHeight: 1.4 }}>{aiRemoveLog}</p>}
                    {aiRemoveStatus === 'loading' && <PBar value={50} />}
                    {aiRemoveResult && (
                        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                            <div style={{ borderRadius: "8px", overflow: "hidden", border: `1px solid ${cardBdr}` }}>
                                <img src={aiRemoveResult} alt="result" style={{ width: "100%", display: "block" }} />
                            </div>
                            <div style={{ display: "flex", gap: "7px" }}>
                                <AB onClick={() => applyAiResult(aiRemoveResult)} color={dm ? '#252525' : '#f2f2f8'} textColor={dm ? '#ccc' : '#555'} style={{ flex: 1, padding: "9px", fontSize: "12px" }}>← Apply to Editor</AB>
                                <AB onClick={async () => saveFile(await (await fetch(aiRemoveResult)).blob(), 'removed.jpg')} color="purple" textColor="#fff" style={{ flex: 1, padding: "9px", fontSize: "12px" }}>↓ Download</AB>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
