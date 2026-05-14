import { SL, Row, Spin, PBar, AB } from "../ui/common";
import { PRESETS, FILTER_GROUPS, COLOR_FILTERS, DEFAULT_FILTERS } from "../../constants";

export function EditPanel({
    filters, setFilters, filterGroup, setFilterGroup, isEdited, resetAll, dm, cardBdr, cardBg,
    image, runBrowserUpscale, aiUpscaleStatus, aiUpscaleLog, aiUpscaleProgress, aiUpscaleResult, aiUpscaleResultSize, applyAiResult,
    runBrowserBeauty, aiBeautyStatus, aiBeautyLog, aiBeautyResult, saveFile,
    aiScale, setAiScale, aiBeautySmooth, setAiBeautySmooth, aiBeautyClarity, setAiBeautyClarity, aiBeautyGlow, setAiBeautyGlow
}) {
    return (
        <>
            <div>
                <SL>Presets</SL>
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", paddingBottom: "4px" }}>
                    {PRESETS.map(p => (
                        <button key={p.name} onClick={() => setFilters({ ...DEFAULT_FILTERS, ...p.values })}
                            style={{ flexShrink: 0, padding: "8px 12px", border: `1.5px solid ${cardBdr}`, background: dm ? '#2a2a2a' : '#fff', borderRadius: "10px", textAlign: "center", cursor: "pointer", transition: "all .18s", fontFamily: "inherit", minWidth: "70px" }}>
                            <div style={{ fontSize: "18px", marginBottom: "2px" }}>{p.icon}</div>
                            <div style={{ fontSize: "10px", fontWeight: 600, color: dm ? '#aaa' : '#666' }}>{p.name}</div>
                        </button>
                    ))}
                </div>
            </div>
            <div>
                <div style={{ display: "flex", gap: "2px", marginBottom: "14px", background: dm ? '#2a2a2a' : '#f2f2f8', padding: "3px", borderRadius: "10px", overflowX: "auto" }}>
                    {FILTER_GROUPS.map(g => (
                        <button key={g.key} onClick={() => setFilterGroup(g.key)}
                            style={{ flex: "1 0 auto", padding: "6px 8px", fontSize: "11px", fontWeight: 500, border: "none", cursor: "pointer", fontFamily: "inherit", background: filterGroup === g.key ? (dm ? '#444' : '#fff') : 'transparent', color: filterGroup === g.key ? "#6c63ff" : "#999", borderRadius: "8px", boxShadow: filterGroup === g.key ? "0 1px 4px rgba(0,0,0,.08)" : "none", transition: "all .18s", whiteSpace: "nowrap" }}>
                            {g.label}
                        </button>
                    ))}
                </div>
                {COLOR_FILTERS.filter(f => f.group === filterGroup).map(f => {
                    const val = filters[f.key]; const pct = ((val - f.min) / (f.max - f.min)) * 100; const changed = val !== f.default;
                    return (
                        <div key={f.key} style={{ marginBottom: "16px" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "5px" }}>
                                <span style={{ fontSize: "13px", fontWeight: 500, color: changed ? "#6c63ff" : dm ? '#ccc' : '#666' }}>{f.label}</span>
                                <span style={{ fontSize: "12px", color: "#bbb", fontVariantNumeric: "tabular-nums" }}>{val > 0 && f.default === 0 ? "+" : ""}{Number.isInteger(val) ? val : val.toFixed(1)}{f.unit}</span>
                            </div>
                            <input type="range" className="sl" min={f.min} max={f.max} step={f.max <= 20 ? .5 : 1} value={val}
                                style={{ "--v": `${pct}%` }} onChange={e => setFilters(p => ({ ...p, [f.key]: parseFloat(e.target.value) }))} />
                        </div>
                    );
                })}

                {/* AI Tools Group */}
                {filterGroup === 'ai' && image && (
                    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                        {/* ── SMART UPSCALE (free, in-browser) ── */}
                        <div style={{ padding: "14px", background: cardBg, border: `1.5px solid ${cardBdr}`, borderRadius: "12px", display: "flex", flexDirection: "column", gap: "10px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                <SL>Smart Upscale</SL>
                                <span style={{ fontSize: "10px", fontWeight: 700, padding: "2px 8px", background: "#f0fff4", color: "#16a34a", borderRadius: "20px", border: "1px solid #86efac", marginBottom: "8px" }}>FREE • In-Browser</span>
                            </div>
                            <p style={{ fontSize: "11px", color: "#aaa", lineHeight: 1.5 }}>Multi-pass bicubic upscaling with unsharp mask sharpening between each pass. Produces far sharper results than a single resize — runs entirely in your browser.</p>
                            <div>
                                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "5px" }}>
                                    <span style={{ fontSize: "12px", color: dm ? '#ccc' : '#555' }}>Scale factor</span>
                                    <span style={{ fontSize: "12px", fontWeight: 700, color: "#6c63ff" }}>{aiScale}×</span>
                                </div>
                                <div style={{ display: "flex", gap: "6px" }}>
                                    {[2, 3, 4].map(s => (
                                        <button key={s} onClick={() => setAiScale(s)}
                                            style={{ flex: 1, padding: "8px", border: `1.5px solid ${aiScale === s ? '#6c63ff' : cardBdr}`,
                                                background: aiScale === s ? (dm ? '#1e1a3a' : '#faf9ff') : dm ? '#252525' : '#fff',
                                                borderRadius: "8px", fontSize: "13px", fontWeight: 700, cursor: "pointer",
                                                color: aiScale === s ? '#6c63ff' : dm ? '#ccc' : '#555', fontFamily: "inherit" }}>
                                            {s}×
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <AB onClick={runBrowserUpscale}
                                disabled={aiUpscaleStatus === 'loading'}
                                color={aiUpscaleStatus === 'done' ? '#f0fff4' : 'purple'}
                                textColor={aiUpscaleStatus === 'done' ? '#16a34a' : '#fff'}
                                style={{ width: "100%", padding: "11px" }}>
                                {aiUpscaleStatus === 'loading' ? <Row><Spin />Upscaling…</Row>
                                    : aiUpscaleStatus === 'done' ? '✓ Done — Run Again'
                                        : '⬆️ Upscale Image'}
                            </AB>
                            {aiUpscaleLog && <p style={{ fontSize: "11px", color: aiUpscaleStatus === 'error' ? '#ef4444' : '#a78bfa', lineHeight: 1.4 }}>{aiUpscaleLog}</p>}
                            {aiUpscaleStatus === 'loading' && <PBar value={aiUpscaleProgress} />}
                            {aiUpscaleResult && (
                                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                                    <div style={{ borderRadius: "8px", overflow: "hidden", border: `1px solid ${cardBdr}`, position: "relative" }}>
                                        <img src={aiUpscaleResult} alt="upscaled" style={{ width: "100%", display: "block" }} />
                                        <div style={{ position: "absolute", bottom: "6px", right: "6px", padding: "3px 8px", background: "rgba(0,0,0,.6)", borderRadius: "12px", fontSize: "10px", fontWeight: 600, color: "#fff" }}>{aiUpscaleResultSize}</div>
                                    </div>
                                    <div style={{ display: "flex", gap: "7px" }}>
                                        <AB onClick={() => applyAiResult(aiUpscaleResult)} color={dm ? '#252525' : '#f2f2f8'} textColor={dm ? '#ccc' : '#555'} style={{ flex: 1, padding: "9px", fontSize: "12px" }}>← Apply to Editor</AB>
                                        <AB onClick={async () => saveFile(await (await fetch(aiUpscaleResult)).blob(), 'upscaled.jpg')} color="purple" textColor="#fff" style={{ flex: 1, padding: "9px", fontSize: "12px" }}>↓ Download</AB>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* ── BEAUTY FILTER (free, in-browser) ── */}
                        <div style={{ padding: "14px", background: cardBg, border: `1.5px solid ${cardBdr}`, borderRadius: "12px", display: "flex", flexDirection: "column", gap: "10px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                <SL>Beauty Filter</SL>
                                <span style={{ fontSize: "10px", fontWeight: 700, padding: "2px 8px", background: "#f0fff4", color: "#16a34a", borderRadius: "20px", border: "1px solid #86efac", marginBottom: "8px" }}>FREE • In-Browser</span>
                            </div>
                            <p style={{ fontSize: "11px", color: "#aaa", lineHeight: 1.5 }}>Portrait retouching pipeline: adaptive skin smoothing, edge sharpening, auto white balance, subtle warmth + clarity boost. All runs locally.</p>
                            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                                <div>
                                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                                        <span style={{ fontSize: "12px", color: dm ? '#ccc' : '#555' }}>Smooth</span>
                                        <span style={{ fontSize: "12px", fontWeight: 700, color: "#6c63ff" }}>{aiBeautySmooth}</span>
                                    </div>
                                    <input type="range" className="sl" min={0} max={10} step={1} value={aiBeautySmooth}
                                        style={{ "--v": `${(aiBeautySmooth / 10) * 100}%` }} onChange={e => setAiBeautySmooth(+e.target.value)} />
                                </div>
                                <div>
                                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                                        <span style={{ fontSize: "12px", color: dm ? '#ccc' : '#555' }}>Clarity</span>
                                        <span style={{ fontSize: "12px", fontWeight: 700, color: "#6c63ff" }}>{aiBeautyClarity}</span>
                                    </div>
                                    <input type="range" className="sl" min={0} max={10} step={1} value={aiBeautyClarity}
                                        style={{ "--v": `${(aiBeautyClarity / 10) * 100}%` }} onChange={e => setAiBeautyClarity(+e.target.value)} />
                                </div>
                                <div>
                                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                                        <span style={{ fontSize: "12px", color: dm ? '#ccc' : '#555' }}>Glow</span>
                                        <span style={{ fontSize: "12px", fontWeight: 700, color: "#6c63ff" }}>{aiBeautyGlow}</span>
                                    </div>
                                    <input type="range" className="sl" min={0} max={10} step={1} value={aiBeautyGlow}
                                        style={{ "--v": `${(aiBeautyGlow / 10) * 100}%` }} onChange={e => setAiBeautyGlow(+e.target.value)} />
                                </div>
                            </div>
                            <AB onClick={runBrowserBeauty}
                                disabled={aiBeautyStatus === 'loading'}
                                color={aiBeautyStatus === 'done' ? '#f0fff4' : 'purple'}
                                textColor={aiBeautyStatus === 'done' ? '#16a34a' : '#fff'}
                                style={{ width: "100%", padding: "11px" }}>
                                {aiBeautyStatus === 'loading' ? <Row><Spin />Processing…</Row>
                                    : aiBeautyStatus === 'done' ? '✓ Done — Run Again'
                                        : '✨ Apply Beauty Filter'}
                            </AB>
                            {aiBeautyLog && <p style={{ fontSize: "11px", color: aiBeautyStatus === 'error' ? '#ef4444' : '#a78bfa', lineHeight: 1.4 }}>{aiBeautyLog}</p>}
                            {aiBeautyResult && (
                                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                                    <div style={{ borderRadius: "8px", overflow: "hidden", border: `1px solid ${cardBdr}` }}>
                                        <img src={aiBeautyResult} alt="beauty" style={{ width: "100%", display: "block" }} />
                                    </div>
                                    <div style={{ display: "flex", gap: "7px" }}>
                                        <AB onClick={() => applyAiResult(aiBeautyResult)} color={dm ? '#252525' : '#f2f2f8'} textColor={dm ? '#ccc' : '#555'} style={{ flex: 1, padding: "9px", fontSize: "12px" }}>← Apply to Editor</AB>
                                        <AB onClick={async () => saveFile(await (await fetch(aiBeautyResult)).blob(), 'beauty.jpg')} color="purple" textColor="#fff" style={{ flex: 1, padding: "9px", fontSize: "12px" }}>↓ Download</AB>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
                {filterGroup === 'ai' && !image && (
                    <div style={{ padding: "14px", background: cardBg, border: `1.5px solid ${cardBdr}`, borderRadius: "12px", textAlign: "center" }}>
                        <span style={{ fontSize: "13px", color: dm ? '#ccc' : '#666' }}>Upload a photo to use AI Tools.</span>
                    </div>
                )}
            </div>
            {isEdited && (
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "4px", borderTop: `1px solid ${cardBdr}` }}>
                    <span style={{ fontSize: "11px", color: "#bbb" }}>{Object.entries(filters).filter(([k, v]) => v !== DEFAULT_FILTERS[k]).length} adjustments</span>
                    <button onClick={resetAll} style={{ fontSize: "11px", color: "#6c63ff", background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}>Reset all</button>
                </div>
            )}
        </>
    )
}
