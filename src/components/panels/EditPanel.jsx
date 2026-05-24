import { useCallback, useState, useEffect } from "react";
import { SL, Row, Spin, PBar, AB, SmoothSlider } from "../ui/common";
import { PRESETS, FILTER_GROUPS, COLOR_FILTERS, DEFAULT_FILTERS, LUT_PRESETS } from "../../constants";
import { parseCubeLut, exportLutToCube } from "../../lutParser";

export function EditPanel({
    filters, setFilters, filterGroup, setFilterGroup, isEdited, resetAll, revertAi, dm, cardBdr, cardBg,
    image, runBrowserUpscale, aiUpscaleStatus, aiUpscaleLog, aiUpscaleProgress, aiUpscaleResult, aiUpscaleResultSize, applyAiResult,
    saveFile,
    aiScale, setAiScale, aiBeautySmooth, setAiBeautySmooth, aiBeautyClarity, setAiBeautyClarity, aiBeautyGlow, setAiBeautyGlow,
    aiBeautyUseMask, setAiBeautyUseMask, runFalFaceRestore, aiFaceRestoreStatus, aiFaceRestoreLog, aiFaceRestoreResult,
    lutId, setLutId, lutIntensity, setLutIntensity, customLutData, setCustomLutData, customLutName, setCustomLutName,
    user, logo, setLogo, logoFile, setLogoFile, logoScale, setLogoScale, logoScalePortrait, setLogoScalePortrait,
    logoOpacity, setLogoOpacity, logoPos, setLogoPos, logoMargin, setLogoMargin, handleLogoUpload
}) {
    const [styleType, setStyleType] = useState(lutId !== 'none' ? 'lut' : 'preset');
    const [lutTab, setLutTab] = useState("all");

    const downloadActivePack = useCallback(() => {
        const activeLuts = LUT_PRESETS.filter(p => p.id !== 'none' && (lutTab === 'all' || p.pack === lutTab));
        activeLuts.forEach((preset, idx) => {
            setTimeout(() => {
                const content = exportLutToCube(preset.id);
                if (content) {
                    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement("a");
                    link.href = url;
                    link.download = `${preset.id}.cube`;
                    link.click();
                    URL.revokeObjectURL(url);
                }
            }, idx * 250);
        });
    }, [lutTab]);


    useEffect(() => {
        if (lutId !== 'none') {
            setStyleType('lut');
        }
    }, [lutId]);

    const handleCubeUpload = useCallback(async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
            const text = await file.text();
            const parsed = parseCubeLut(text);
            setCustomLutData(parsed);
            setCustomLutName(file.name);
            setLutId('custom');
            setFilters(DEFAULT_FILTERS);
        } catch (err) {
            alert('Failed to parse .cube file: ' + err.message);
        }
    }, [setCustomLutData, setCustomLutName, setLutId, setFilters]);

    return (
        <>
            <div>
                {/* Style Selector Toggle */}
                <div style={{ display: "flex", gap: "2px", marginBottom: "12px", background: dm ? '#2a2a2a' : '#f2f2f8', padding: "3px", borderRadius: "10px" }}>
                    <button onClick={() => setStyleType('preset')}
                        style={{ flex: 1, padding: "8px", fontSize: "12px", fontWeight: 600, border: "none", cursor: "pointer", fontFamily: "inherit", background: styleType === 'preset' ? (dm ? '#444' : '#fff') : 'transparent', color: styleType === 'preset' ? "#6c63ff" : "#999", borderRadius: "8px", boxShadow: styleType === 'preset' ? "0 1px 4px rgba(0,0,0,.08)" : "none", transition: "all .18s", display: "flex", alignItems: "center", justifyContent: "center", gap: "4px" }}>
                        🎨 Filter Presets
                    </button>
                    <button onClick={() => setStyleType('lut')}
                        style={{ flex: 1, padding: "8px", fontSize: "12px", fontWeight: 600, border: "none", cursor: "pointer", fontFamily: "inherit", background: styleType === 'lut' ? (dm ? '#444' : '#fff') : 'transparent', color: styleType === 'lut' ? "#6c63ff" : "#999", borderRadius: "8px", boxShadow: styleType === 'lut' ? "0 1px 4px rgba(0,0,0,.08)" : "none", transition: "all .18s", display: "flex", alignItems: "center", justifyContent: "center", gap: "4px" }}>
                        <span>🎬 3D LUTs</span>
                        <span style={{ fontSize: "9px", fontWeight: 800, padding: "1px 5px", background: "linear-gradient(135deg, #06b6d4 0%, #6c63ff 100%)", color: "#fff", borderRadius: "5px", textTransform: "uppercase", letterSpacing: "0.03em" }}>PRO</span>
                    </button>
                </div>

                {/* Filter Presets Grid */}
                {styleType === 'preset' && (
                    <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", paddingBottom: "12px" }}>
                        {PRESETS.map(p => (
                            <button key={p.name} onClick={() => {
                                setFilters({ ...DEFAULT_FILTERS, ...p.values });
                                setLutId('none');
                            }}
                                style={{ flexShrink: 0, padding: "8px 12px", border: `1.5px solid ${cardBdr}`, background: dm ? '#2a2a2a' : '#fff', borderRadius: "10px", textAlign: "center", cursor: "pointer", transition: "all .18s", fontFamily: "inherit", minWidth: "70px" }}>
                                <div style={{ fontSize: "18px", marginBottom: "2px" }}>{p.icon}</div>
                                <div style={{ fontSize: "10px", fontWeight: 600, color: dm ? '#aaa' : '#666' }}>{p.name}</div>
                            </button>
                        ))}
                    </div>
                )}

                {/* 3D LUTs Grid & Controls */}
                {styleType === 'lut' && (
                    <div style={{ display: "flex", flexDirection: "column", gap: "12px", paddingBottom: "12px" }}>
                        <div style={{ padding: "14px", background: cardBg, border: `1.5px solid ${cardBdr}`, borderRadius: "12px", display: "flex", flexDirection: "column", gap: "12px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                <SL>Color Lookup (LUT)</SL>
                                <span style={{ fontSize: "10px", fontWeight: 700, padding: "2px 8px", background: "#f0fff4", color: "#16a34a", borderRadius: "20px", border: "1px solid #86efac", marginBottom: "8px" }}>FREE • In-Browser</span>
                            </div>
                            <p style={{ fontSize: "11px", color: "#aaa", lineHeight: 1.5, margin: 0 }}>Apply professional film simulations and cinematic color grades. Select a built-in look or upload your own .cube file.</p>

                            {/* Tab/Pack Selector */}
                            <div style={{ display: "flex", gap: "4px", background: dm ? '#2a2a2a' : '#f2f2f8', padding: "3px", borderRadius: "8px", alignSelf: "flex-start", flexWrap: "wrap" }}>
                                {[
                                    { id: "all", label: "⚡ All" },
                                    { id: "arena", label: "🏟️ Arena" },
                                    { id: "action", label: "🏈 Action" },
                                    { id: "cinematic", label: "🎬 Cinematic" },
                                    { id: "colors", label: "🎽 Colors" },
                                    { id: "vintage", label: "🎞️ Vintage" }
                                ].map(tab => {
                                    const active = lutTab === tab.id;
                                    return (
                                        <button key={tab.id} onClick={() => setLutTab(tab.id)}
                                            style={{
                                                padding: "5px 10px", fontSize: "11px", fontWeight: 600, border: "none", cursor: "pointer", fontFamily: "inherit",
                                                background: active ? (dm ? '#444' : '#fff') : 'transparent',
                                                color: active ? "#6c63ff" : dm ? "#ccc" : "#666",
                                                borderRadius: "6px",
                                                boxShadow: active ? "0 1px 3px rgba(0,0,0,.1)" : "none",
                                                transition: "all .15s"
                                            }}>
                                            {tab.label}
                                        </button>
                                    );
                                })}
                            </div>

                            {lutTab !== 'all' && (
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "2px", width: "100%" }}>
                                    <span style={{ fontSize: "11px", color: dm ? "#aaa" : "#555", fontWeight: 600 }}>
                                        {lutTab === 'arena' && "🏟️ Arena Pack (6 LUTs)"}
                                        {lutTab === 'action' && "🏈 Action Pack (6 LUTs)"}
                                        {lutTab === 'cinematic' && "🎬 Cinematic Pack (6 LUTs)"}
                                        {lutTab === 'colors' && "🎽 Colors Pack (6 LUTs)"}
                                        {lutTab === 'vintage' && "🎞️ Vintage Pack (6 LUTs)"}
                                    </span>
                                    <button onClick={downloadActivePack} 
                                        style={{ 
                                            background: "transparent", border: "none", color: "#6c63ff", fontSize: "11px", fontWeight: 700, cursor: "pointer", textDecoration: "underline", padding: 0,
                                            fontFamily: "inherit"
                                        }}>
                                        Download Pack (.cube)
                                    </button>
                                </div>
                            )}

                            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                                {LUT_PRESETS.filter(p => {
                                    if (p.id === 'none') return true;
                                    if (lutTab === 'all') return true;
                                    return p.pack === lutTab;
                                }).map(p => {
                                    const active = lutId === p.id;
                                    return (
                                        <button key={p.id} onClick={() => {
                                            setLutId(p.id);
                                            setFilters(DEFAULT_FILTERS);
                                        }}
                                            style={{
                                                flexShrink: 0, padding: "10px 12px", minWidth: "78px",
                                                border: `1.5px solid ${active ? '#6c63ff' : cardBdr}`,
                                                background: active ? (dm ? '#1e1a3a' : '#faf9ff') : dm ? '#252525' : '#fff',
                                                borderRadius: "10px", textAlign: "center", cursor: "pointer",
                                                transition: "all .18s", fontFamily: "inherit",
                                                boxShadow: active ? "0 0 12px rgba(108,99,255,.2)" : "none"
                                            }}>
                                            <div style={{ fontSize: "20px", marginBottom: "3px" }}>{p.icon}</div>
                                            <div style={{ fontSize: "10px", fontWeight: 700, color: active ? '#6c63ff' : dm ? '#aaa' : '#666' }}>{p.name}</div>
                                        </button>
                                    );
                                })}
                                <button
                                    onClick={() => document.getElementById('cube-upload-input')?.click()}
                                    style={{
                                        flexShrink: 0, padding: "10px 12px", minWidth: "78px",
                                        border: `1.5px dashed ${lutId === 'custom' ? '#6c63ff' : cardBdr}`,
                                        background: lutId === 'custom' ? (dm ? '#1e1a3a' : '#faf9ff') : dm ? '#252525' : '#fff',
                                        borderRadius: "10px", textAlign: "center", cursor: "pointer",
                                        transition: "all .18s", fontFamily: "inherit",
                                        boxShadow: lutId === 'custom' ? "0 0 12px rgba(108,99,255,.2)" : "none"
                                    }}>
                                    <div style={{ fontSize: "20px", marginBottom: "3px" }}>📂</div>
                                    <div style={{ fontSize: "10px", fontWeight: 700, color: lutId === 'custom' ? '#6c63ff' : dm ? '#aaa' : '#666' }}>
                                        {customLutName ? customLutName.slice(0, 10) : 'Upload .cube'}
                                    </div>
                                </button>
                                <input id="cube-upload-input" type="file" accept=".cube" style={{ display: "none" }} onChange={handleCubeUpload} />
                            </div>

                            {lutId !== 'none' && (
                                <div style={{ marginTop: "4px" }}>
                                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "5px" }}>
                                        <span style={{ fontSize: "13px", fontWeight: 500, color: lutIntensity !== 1.0 ? "#6c63ff" : dm ? '#ccc' : '#666' }}>Intensity</span>
                                        <span style={{ fontSize: "12px", color: "#bbb", fontVariantNumeric: "tabular-nums" }}>{Math.round(lutIntensity * 100)}%</span>
                                    </div>
                                    <SmoothSlider min={0} max={100} step={1} value={Math.round(lutIntensity * 100)} defaultValue={100}
                                        onChange={v => setLutIntensity(v / 100)} />
                                </div>
                            )}

                            {lutId !== 'none' && (() => {
                                const activePreset = lutId === 'custom'
                                    ? { name: customLutName || 'Custom LUT', description: 'User-uploaded custom 3D LUT curve configuration.', bestFor: 'Custom grading workflows', tier: 'premium', icon: '📂' }
                                    : LUT_PRESETS.find(p => p.id === lutId);
                                if (!activePreset) return null;
                                return (
                                    <div style={{
                                        padding: "12px",
                                        background: dm ? "rgba(108, 99, 255, 0.06)" : "rgba(108, 99, 255, 0.03)",
                                        border: `1px solid ${dm ? "rgba(108, 99, 255, 0.25)" : "rgba(108, 99, 255, 0.15)"}`,
                                        borderRadius: "10px",
                                        marginTop: "4px",
                                        display: "flex",
                                        flexDirection: "column",
                                        gap: "6px"
                                    }}>
                                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                            <span style={{ fontSize: "12px", fontWeight: 800, color: dm ? "#f3f4f6" : "#1f2937", display: "flex", alignItems: "center", gap: "6px" }}>
                                                <span>{activePreset.icon}</span>
                                                <span>{activePreset.name}</span>
                                            </span>
                                            {activePreset.tier === 'premium' && (
                                                <span style={{
                                                    fontSize: "9px",
                                                    fontWeight: 800,
                                                    padding: "2px 6px",
                                                    background: "linear-gradient(135deg, #06b6d4 0%, #6c63ff 100%)",
                                                    color: "#fff",
                                                    borderRadius: "6px",
                                                    textTransform: "uppercase",
                                                    letterSpacing: "0.05em",
                                                    boxShadow: "0 2px 5px rgba(108,99,255,0.25)"
                                                }}>
                                                    💎 Premium Look
                                                </span>
                                            )}
                                        </div>
                                        <p style={{ fontSize: "11px", color: dm ? "#bbb" : "#4b5563", margin: 0, lineHeight: 1.4 }}>
                                            {activePreset.description}
                                        </p>
                                        <div style={{ display: "flex", alignItems: "center", gap: "4px", marginTop: "2px" }}>
                                            <span style={{ fontSize: "10px", fontWeight: 700, color: "#6c63ff" }}>Best for:</span>
                                            <span style={{ fontSize: "10px", color: dm ? "#999" : "#666", fontWeight: 600 }}>{activePreset.bestFor}</span>
                                        </div>
                                        {lutId !== 'custom' && (
                                            <button
                                                onClick={() => {
                                                    const content = exportLutToCube(lutId);
                                                    if (content) {
                                                        const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
                                                        const url = URL.createObjectURL(blob);
                                                        const link = document.createElement("a");
                                                        link.href = url;
                                                        link.download = `${lutId}.cube`;
                                                        link.click();
                                                        URL.revokeObjectURL(url);
                                                    }
                                                }}
                                                style={{
                                                    marginTop: "6px",
                                                    padding: "8px 10px",
                                                    fontSize: "11px",
                                                    fontWeight: 700,
                                                    color: "#fff",
                                                    background: "linear-gradient(135deg, #6c63ff 0%, #3b82f6 100%)",
                                                    border: "none",
                                                    borderRadius: "8px",
                                                    cursor: "pointer",
                                                    display: "flex",
                                                    alignItems: "center",
                                                    justifyContent: "center",
                                                    gap: "6px",
                                                    transition: "all .15s",
                                                    fontFamily: "inherit",
                                                    boxShadow: "0 2px 6px rgba(108,99,255,0.2)"
                                                }}
                                                onMouseOver={e => e.currentTarget.style.transform = 'translateY(-1px)'}
                                                onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}
                                            >
                                                📥 Download .cube (for Lightroom / Photoshop)
                                            </button>
                                        )}
                                    </div>
                                );
                            })()}
                        </div>
                    </div>
                )}
            </div>
            <div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", marginBottom: "14px", background: dm ? '#2a2a2a' : '#f2f2f8', padding: "4px", borderRadius: "10px" }}>
                    {FILTER_GROUPS.filter(g => g.key !== 'lut').map(g => (
                        <button key={g.key} onClick={() => setFilterGroup(g.key)}
                            style={{ flex: "1 1 auto", padding: "6px 8px", fontSize: "11px", fontWeight: 500, border: "none", cursor: "pointer", fontFamily: "inherit", background: filterGroup === g.key ? (dm ? '#444' : '#fff') : 'transparent', color: filterGroup === g.key ? "#6c63ff" : "#999", borderRadius: "8px", boxShadow: filterGroup === g.key ? "0 1px 4px rgba(0,0,0,.08)" : "none", transition: "all .18s", whiteSpace: "nowrap" }}>
                            {g.label}
                        </button>
                    ))}
                </div>

                {COLOR_FILTERS.filter(f => f.group === filterGroup).map(f => {
                    const val = filters[f.key]; const changed = val !== f.default;
                    return (
                        <div key={f.key} style={{ marginBottom: "16px" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "5px" }}>
                                <span style={{ fontSize: "13px", fontWeight: 500, color: changed ? "#6c63ff" : dm ? '#ccc' : '#666' }}>{f.label}</span>
                                <span style={{ fontSize: "12px", color: "#bbb", fontVariantNumeric: "tabular-nums" }}>{val > 0 && f.default === 0 ? "+" : ""}{Number.isInteger(val) ? val : val.toFixed(1)}{f.unit}</span>
                            </div>
                            <SmoothSlider min={f.min} max={f.max} step={f.max <= 20 ? 0.5 : 1} value={val} defaultValue={f.default}
                                onChange={v => setFilters(p => ({ ...p, [f.key]: v }))} />
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
                                        <AB onClick={revertAi} color={dm ? '#252525' : '#f2f2f8'} textColor={dm ? '#ccc' : '#555'} style={{ flex: 1, padding: "9px", fontSize: "12px" }}>↺ Revert AI</AB>
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
                            
                            <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", userSelect: "none" }}>
                                <input type="checkbox" checked={aiBeautyUseMask} onChange={e => setAiBeautyUseMask(e.target.checked)} 
                                    style={{ width: "16px", height: "16px", accentColor: "#6c63ff" }} />
                                <span style={{ fontSize: "12px", color: dm ? '#ccc' : '#555', fontWeight: 600 }}>Apply to Face Skin Only (Beta)</span>
                            </label>
                            
                            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                                <div>
                                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                                        <span style={{ fontSize: "12px", color: dm ? '#ccc' : '#555' }}>Smooth</span>
                                        <span style={{ fontSize: "12px", fontWeight: 700, color: "#6c63ff" }}>{aiBeautySmooth}</span>
                                    </div>
                                    <SmoothSlider min={0} max={10} step={1} value={aiBeautySmooth} defaultValue={5} onChange={setAiBeautySmooth} />
                                </div>
                                <div>
                                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                                        <span style={{ fontSize: "12px", color: dm ? '#ccc' : '#555' }}>Clarity</span>
                                        <span style={{ fontSize: "12px", fontWeight: 700, color: "#6c63ff" }}>{aiBeautyClarity}</span>
                                    </div>
                                    <SmoothSlider min={0} max={10} step={1} value={aiBeautyClarity} defaultValue={5} onChange={setAiBeautyClarity} />
                                </div>
                                <div>
                                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                                        <span style={{ fontSize: "12px", color: dm ? '#ccc' : '#555' }}>Glow</span>
                                        <span style={{ fontSize: "12px", fontWeight: 700, color: "#6c63ff" }}>{aiBeautyGlow}</span>
                                    </div>
                                    <SmoothSlider min={0} max={10} step={1} value={aiBeautyGlow} defaultValue={3} onChange={setAiBeautyGlow} />
                                </div>
                            </div>
                            {(aiBeautySmooth > 0 || aiBeautyClarity > 0 || aiBeautyGlow > 0) && (
                                <div style={{ display: "flex", gap: "7px", marginTop: "4px" }}>
                                    <AB onClick={() => {
                                        setAiBeautySmooth(0);
                                        setAiBeautyClarity(0);
                                        setAiBeautyGlow(0);
                                        revertAi();
                                    }} color={dm ? '#252525' : '#f2f2f8'} textColor={dm ? '#ccc' : '#555'} style={{ flex: 1, padding: "9px", fontSize: "12px" }}>
                                        ↺ Revert AI
                                    </AB>
                                </div>
                            )}
                        </div>

                        {/* ── FACE RESTORE (Local, Free) ── */}
                        <div style={{ padding: "14px", background: cardBg, border: `1.5px solid ${cardBdr}`, borderRadius: "12px", display: "flex", flexDirection: "column", gap: "10px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                <SL>Face Restore</SL>
                                <span style={{ fontSize: "10px", fontWeight: 700, padding: "2px 8px", background: "#f0fff4", color: "#16a34a", borderRadius: "20px", border: "1px solid #86efac", marginBottom: "8px" }}>FREE • In-Browser</span>
                            </div>
                            <p style={{ fontSize: "11px", color: "#aaa", lineHeight: 1.5 }}>AI-powered face detection + multi-pass enhancement: noise reduction, detail sharpening, contrast boost & color correction. Runs entirely on your device — no API key needed.</p>
                            
                            <AB onClick={runFalFaceRestore}
                                disabled={aiFaceRestoreStatus === 'loading'}
                                color={aiFaceRestoreStatus === 'done' ? '#f0fff4' : 'purple'}
                                textColor={aiFaceRestoreStatus === 'done' ? '#16a34a' : '#fff'}
                                style={{ width: "100%", padding: "11px" }}>
                                {aiFaceRestoreStatus === 'loading' ? <Row><Spin />Restoring…</Row>
                                    : aiFaceRestoreStatus === 'done' ? '✓ Restored — Run Again'
                                        : '✨ Restore Face'}
                            </AB>
                            {aiFaceRestoreLog && <p style={{ fontSize: "11px", color: aiFaceRestoreStatus === 'error' ? '#ef4444' : '#a78bfa', lineHeight: 1.4 }}>{aiFaceRestoreLog}</p>}
                            {aiFaceRestoreResult && (
                                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                                    <div style={{ borderRadius: "8px", overflow: "hidden", border: `1px solid ${cardBdr}` }}>
                                        <img src={aiFaceRestoreResult} alt="restored" style={{ width: "100%", display: "block" }} />
                                    </div>
                                    <div style={{ display: "flex", gap: "7px" }}>
                                        <AB onClick={revertAi} color={dm ? '#252525' : '#f2f2f8'} textColor={dm ? '#ccc' : '#555'} style={{ flex: 1, padding: "9px", fontSize: "12px" }}>↺ Revert AI</AB>
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
                {filterGroup === 'watermark' && (() => {
                    const isStudioTeam = user && (user.tier === "team" || user.tier === "admin");
                    if (!isStudioTeam) {
                        return (
                            <div style={{
                                position: "relative",
                                overflow: "hidden",
                                border: `1.5px dashed rgba(108, 99, 255, ${dm ? "0.2" : "0.15"})`,
                                background: dm ? "rgba(108, 99, 255, 0.02)" : "rgba(108, 99, 255, 0.015)",
                                padding: "20px 14px",
                                borderRadius: "12px"
                            }}>
                                <SL>Logo / Watermark</SL>
                                <div style={{
                                    display: "flex",
                                    flexDirection: "column",
                                    alignItems: "center",
                                    textAlign: "center",
                                    gap: "12px",
                                    padding: "10px 0"
                                }}>
                                    <span style={{ fontSize: "24px" }}>💎</span>
                                    <div style={{ fontSize: "13px", fontWeight: 800, color: dm ? "#ffffff" : "#111827" }}>
                                        Studio Team Plan Required
                                    </div>
                                    <p style={{ fontSize: "11.5px", color: dm ? "#cbd5e1" : "#4b5563", lineHeight: 1.5, margin: 0 }}>
                                        Custom brand watermarking and asset layout design require the Studio Team Plan. Update your subscription to unlock.
                                    </p>
                                    <button
                                        onClick={() => {
                                            const el = document.getElementById("pricing-container");
                                            if (el) {
                                                el.scrollIntoView({ behavior: "smooth" });
                                            } else {
                                                window.location.hash = "#pricing-container";
                                            }
                                        }}
                                        style={{
                                            background: "linear-gradient(135deg, #06b6d4 0%, #6c63ff 100%)",
                                            color: "#ffffff",
                                            border: "none",
                                            borderRadius: "8px",
                                            padding: "8px 16px",
                                            fontSize: "12px",
                                            fontWeight: 800,
                                            cursor: "pointer",
                                            boxShadow: "0 4px 12px rgba(108, 99, 255, 0.2)",
                                            fontFamily: "inherit"
                                        }}
                                    >
                                        💎 Upgrade to Studio Team
                                    </button>
                                </div>
                            </div>
                        );
                    }
                    return (
                        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                            <div style={{ padding: "14px", background: cardBg, border: `1.5px solid ${cardBdr}`, borderRadius: "12px", display: "flex", flexDirection: "column", gap: "12px" }}>
                                <SL>Logo / Watermark</SL>
                                <label style={{ display: "block", padding: "16px 12px", border: `2px dashed ${logo ? '#6c63ff' : cardBdr}`, borderRadius: "10px", cursor: "pointer", textAlign: "center", transition: "all .2s", background: logo ? (dm ? '#1e1a3a' : '#faf9ff') : dm ? '#252525' : '#fafafa' }}>
                                    <input type="file" accept="image/*" onChange={handleLogoUpload} style={{ display: "none" }} />
                                    {logo
                                        ? <><div style={{ fontSize: "26px", marginBottom: "5px" }}>✅</div><div style={{ fontSize: "12px", fontWeight: 600, color: '#6c63ff', marginBottom: "2px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{logoFile?.name || "Logo Active"}</div><div style={{ fontSize: "11px", color: "#bbb" }}>Click to replace</div></>
                                        : <><div style={{ fontSize: "26px", marginBottom: "5px" }}>🖼</div><div style={{ fontSize: "12px", fontWeight: 600, color: dm ? '#ccc' : '#555', marginBottom: "2px" }}>Click to upload logo</div><div style={{ fontSize: "11px", color: "#bbb" }}>PNG with transparency works best</div></>}
                                </label>
                                {logo && (
                                    <AB onClick={() => { setLogo(null); setLogoFile(null); }} color="red" textColor="#fff" style={{ width: "100%", padding: "8px", fontSize: "12px" }}>
                                        ✕ Remove Logo
                                    </AB>
                                )}
                            </div>

                            {logo && (
                                <>
                                    <div style={{ padding: "14px", background: cardBg, border: `1.5px solid ${cardBdr}`, borderRadius: "12px", display: "flex", flexDirection: "column", gap: "12px" }}>
                                        <SL>Logo Size & Opacity</SL>
                                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                                            <div>
                                                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "5px" }}>
                                                    <span style={{ fontSize: "11px", color: dm ? '#ccc' : '#555' }}>Size (Landscape)</span>
                                                    <span style={{ fontSize: "11px", color: '#6c63ff', fontWeight: 700 }}>{(logoScale * 100).toFixed(0)}%</span>
                                                </div>
                                                <SmoothSlider min={0.03} max={1.0} step={0.01} value={logoScale} defaultValue={0.15} onChange={setLogoScale} />
                                            </div>
                                            <div>
                                                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "5px" }}>
                                                    <span style={{ fontSize: "11px", color: dm ? '#ccc' : '#555' }}>Size (Portrait)</span>
                                                    <span style={{ fontSize: "11px", color: '#6c63ff', fontWeight: 700 }}>{(logoScalePortrait * 100).toFixed(0)}%</span>
                                                </div>
                                                <SmoothSlider min={0.03} max={1.0} step={0.01} value={logoScalePortrait} defaultValue={0.30} onChange={setLogoScalePortrait} />
                                            </div>
                                        </div>
                                        <div>
                                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "5px" }}>
                                                <span style={{ fontSize: "12px", color: dm ? '#ccc' : '#555' }}>Opacity</span>
                                                <span style={{ fontSize: "12px", color: '#6c63ff', fontWeight: 700 }}>{Math.round(logoOpacity * 100)}%</span>
                                            </div>
                                            <SmoothSlider min={0.1} max={1.0} step={0.05} value={logoOpacity} defaultValue={0.7} onChange={setLogoOpacity} />
                                        </div>
                                        <div>
                                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "5px" }}>
                                                <span style={{ fontSize: "12px", color: dm ? '#ccc' : '#555' }}>Margin from edge</span>
                                                <span style={{ fontSize: "12px", color: '#6c63ff', fontWeight: 700 }}>{logoMargin}px</span>
                                            </div>
                                            <SmoothSlider min={0} max={100} step={5} value={logoMargin} defaultValue={20} onChange={setLogoMargin} />
                                        </div>
                                    </div>

                                    <div style={{ padding: "14px", background: cardBg, border: `1.5px solid ${cardBdr}`, borderRadius: "12px", display: "flex", flexDirection: "column", gap: "12px" }}>
                                        <SL>Logo Position</SL>
                                        {logoPos === "custom" && (
                                            <div style={{ fontSize: "11.5px", color: '#6c63ff', fontWeight: 600, padding: "6px 10px", background: dm ? 'rgba(108,99,255,0.08)' : 'rgba(108,99,255,0.04)', border: `1px solid ${dm ? 'rgba(108,99,255,0.15)' : 'rgba(108,99,255,0.08)'}`, borderRadius: "6px", lineHeight: 1.4 }}>
                                                📍 Custom Position (Drag logo on preview to move). Click any grid item to snap back.
                                            </div>
                                        )}
                                        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "5px" }}>
                                            {[
                                                { id: "top-left", l: "↖" }, { id: "top-center", l: "↑" }, { id: "top-right", l: "↗" },
                                                { id: "center-left", l: "←" }, { id: "center", l: "⊕" }, { id: "center-right", l: "→" },
                                                { id: "bottom-left", l: "↙" }, { id: "bottom-center", l: "↓" }, { id: "bottom-right", l: "↘" },
                                            ].map(p => {
                                                const posId = p.id;
                                                const active = logoPos === posId;
                                                return (
                                                    <button key={posId} onClick={() => { setLogoPos(posId); setLogoX(null); setLogoY(null); }}
                                                        style={{
                                                            padding: "10px 4px",
                                                            border: `1.5px solid ${active ? '#6c63ff' : cardBdr}`,
                                                            background: active ? '#6c63ff' : dm ? '#252525' : '#f8f8fd',
                                                            borderRadius: "8px",
                                                            fontSize: "14px",
                                                            cursor: "pointer",
                                                            color: active ? "#fff" : dm ? '#ccc' : '#555',
                                                            transition: "all .15s",
                                                            fontFamily: "inherit"
                                                        }}>
                                                        {p.l}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    );
                })()}
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
