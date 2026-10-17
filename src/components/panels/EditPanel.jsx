import { useCallback, useState, useEffect } from "react";
import { SL, Row, Spin, PBar, AB, SmoothSlider, ModernImageUploadIcon } from "../ui/common";
import {
    PRESETS, COLOR_FILTERS, DEFAULT_FILTERS, LUT_PRESETS, PREQUEL_PRESETS,
    LIGHT_LEAK_OPTIONS, VIBE_AUDIO_OPTIONS, BG_COLORS, PHOTOROOM_SCENES, PHOTOROOM_SHADOWS
} from "../../constants";
import { parseCubeLut, exportLutToCube } from "../../lutParser";
import { AdjustPanel } from "./AdjustPanel";
import { OverlayPanel } from "./OverlayPanel";
import { ToolsPanel } from "./ToolsPanel";
import { HslMixerPanel } from "./HslMixerPanel";
import { ToneCurvesPanel } from "./ToneCurvesPanel";

export function EditPanel({
    // Grading props
    filters, setFilters, filterGroup, setFilterGroup, hslMixer, setHslMixer, curves, setCurves, isEdited, resetAll, revertAi, dm, cardBdr, cardBg,
    image, runBrowserUpscale, aiUpscaleStatus, aiUpscaleLog, aiUpscaleProgress, aiUpscaleResult, aiUpscaleResultSize, applyAiResult,
    saveFile,
    aiScale, setAiScale, aiBeautySmooth, setAiBeautySmooth, aiBeautyClarity, setAiBeautyClarity, aiBeautyGlow, setAiBeautyGlow,
    aiBeautyUseMask, setAiBeautyUseMask, runFalFaceRestore, aiFaceRestoreStatus, aiFaceRestoreLog, aiFaceRestoreResult,
    lutId, setLutId, lutIntensity, setLutIntensity, customLutData, setCustomLutData, customLutName, setCustomLutName,
    user, logo, setLogo, logoFile, setLogoFile, logoScale, setLogoScale, logoScalePortrait, setLogoScalePortrait,
    logoOpacity, setLogoOpacity, logoPos, setLogoPos, logoMargin, setLogoMargin, handleLogoUpload,
    logoX, setLogoX, logoY, setLogoY,
    
    // Adjust / Crop props
    imgRef, setRotation, setFlipH, setFlipV, rotation, flipH, flipV, cropMode, setCropMode, cropBox, setCropBox, cropAspect, setCropAspect, applyCrop, applyCanvasPreset,
    
    // Tools / Photoroom Studio props
    handleRemoveBg, clearBgCutout, bgStatus, bgProgress, bgSubUrl, bgMode, setBgMode, bgColor, setBgColor, bgBlur, setBgBlur, bgResult,
    bgScene, setBgScene, bgCustomUrl, setBgCustomUrl,
    bgShadowType, setBgShadowType, bgShadowOpacity, setBgShadowOpacity, bgShadowBlur, setBgShadowBlur, bgShadowX, setBgShadowX, bgShadowY, setBgShadowY,
    bgOutlineWidth, setBgOutlineWidth, bgOutlineColor, setBgOutlineColor,
    bgSubjectScale, setBgSubjectScale, bgSubjectX, setBgSubjectX, bgSubjectY, setBgSubjectY,
    aiRemoveBrush, setAiRemoveBrush, toCSSFilter, initMaskCanvas, maskCanvasRef, maskDrawingRef, drawMask, aiMaskReady, handleAiRemove, aiRemoveStatus, aiRemoveLog, aiRemoveResult,
    eraseMode, setEraseMode, canUndoErase, handleUndoErase,
    
    // Overlay / Layers props
    texts, setTexts, selText, setSelText, addText, deleteText, updateText, inputSt,

    // PhotoLab AI props
    accentAi, setAccentAi, accentOffsets,
    structureAi, setStructureAi,
    skyMode, setSkyMode, skyOpacity, setSkyOpacity, skyLightMatch, setSkyLightMatch, customSkyUrl, setCustomSkyUrl, skyMaskStatus, skyMaskLog,
    relightNear, setRelightNear, relightFar, setRelightFar, depthMapStatus, depthMapLog,

    // Prequel Aesthetic Studio props
    chromatic, setChromatic, prism, setPrism, halation, setHalation, filmDust, setFilmDust, glitter, setGlitter, vhs, setVhs, lightLeak, setLightLeak, heatmap, setHeatmap, vibeAudio, setVibeAudio,
    setActiveTab
}) {
    const [subTab, setSubTab] = useState("grade");
    const [styleType, setStyleType] = useState(lutId !== 'none' ? 'lut' : 'preset');
    const [lutTab, setLutTab] = useState("all");

    // Automatically sync cropMode and eraseMode with the active subTab
    useEffect(() => {
        if (subTab === "grade") {
            if (filterGroup === "ai" || filterGroup === "watermark") {
                setFilterGroup("basic");
            }
        }
        if (subTab === "crop" && image) {
            setCropMode(true);
        } else if (subTab !== "crop" && cropMode) {
            setCropMode(false);
        }
        if (subTab === "ai" && image && setEraseMode) {
            setEraseMode(true);
        } else if (subTab !== "ai" && setEraseMode) {
            setEraseMode(false);
        }
    }, [subTab, image]);

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
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {/* Top Reset Action Header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", background: dm ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)', borderRadius: "10px", border: `1px solid ${cardBdr}` }}>
                <span style={{ fontSize: "11.5px", fontWeight: 700, color: isEdited ? "#6c63ff" : (dm ? "#aaa" : "#666") }}>
                    {isEdited ? "✨ Photo Modified" : "📷 Original Image"}
                </span>
                <button onClick={resetAll}
                    style={{
                        padding: "5px 12px",
                        borderRadius: "8px",
                        border: "1px solid rgba(239, 68, 68, 0.35)",
                        background: "rgba(239, 68, 68, 0.12)",
                        color: "#ef4444",
                        fontSize: "11px",
                        fontWeight: 800,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                        transition: "all .18s ease"
                    }}
                    title="Reset all adjustments, filters, LUTs, crop, and FX back to original">
                    <span>🔄</span> Reset All
                </button>
            </div>

            {/* Top Sub-tab Switcher */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: "4px", background: dm ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.04)', border: `1px solid ${dm ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}`, padding: "4px", borderRadius: "10px" }}>
                {[
                    { id: "grade", label: "🎛️ Adjust" },
                    { id: "aesthetics", label: "⚡ Aesthetics" },
                    { id: "crop", label: "📐 Crop" },
                    { id: "luminar", label: "✨ AI Studio" },
                    { id: "ai", label: "🧠 AI Tools" },
                    { id: "overlay", label: "✍️ Layers" }
                ].map(tab => {
                    const active = subTab === tab.id;
                    return (
                        <button key={tab.id} onClick={() => setSubTab(tab.id)}
                            style={{
                                width: "100%", minWidth: 0, padding: "8px 4px", fontSize: "11px", fontWeight: 700, border: "none", cursor: "pointer", fontFamily: "inherit",
                                background: active ? (dm ? '#333' : '#fff') : 'transparent',
                                color: active ? "#6c63ff" : dm ? "#a1a1aa" : "#666677",
                                borderRadius: "8px",
                                boxShadow: active ? "0 2px 6px rgba(0,0,0,.08)" : "none",
                                transition: "all .18s",
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis"
                            }}>
                            {tab.label}
                        </button>
                    );
                })}
            </div>

            {/* Prequel Aesthetic Studio */}
            {subTab === "aesthetics" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                    {/* Style Packs */}
                    <div style={{ padding: "14px", background: cardBg, border: `1.5px solid ${cardBdr}`, borderRadius: "12px", display: "flex", flexDirection: "column", gap: "12px" }}>
                        <SL>One-Tap Prequel Style Packs</SL>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                            {PREQUEL_PRESETS.map(pack => (
                                <button key={pack.id}
                                    onClick={() => {
                                        setFilters(prev => ({ ...prev, ...pack.values }));
                                        setChromatic(pack.fx.chromatic || 0);
                                        setHalation(pack.fx.halation || 0);
                                        setVhs(!!pack.fx.vhs);
                                        setLightLeak(pack.fx.lightLeak || 'none');
                                        setGlitter(pack.fx.glitter || 0);
                                        setFilmDust(pack.fx.filmDust || 0);
                                        setPrism(pack.fx.prism || 0);
                                        setHeatmap(pack.fx.heatmap || 0);
                                    }}
                                    style={{
                                        padding: "10px",
                                        borderRadius: "10px",
                                        border: `1.5px solid ${cardBdr}`,
                                        background: dm ? "rgba(255,255,255,0.03)" : "#ffffff",
                                        color: dm ? "#ffffff" : "#1a1a1a",
                                        textAlign: "left",
                                        cursor: "pointer",
                                        transition: "all .18s ease",
                                        display: "flex",
                                        flexDirection: "column",
                                        gap: "4px"
                                    }}>
                                    <div style={{ fontSize: "15px", display: "flex", alignItems: "center", gap: "4px" }}>{pack.icon} <span style={{ fontWeight: 800, fontSize: "12px" }}>{pack.name}</span></div>
                                    <div style={{ fontSize: "10px", color: dm ? "#aaa" : "#666", lineHeight: "1.3" }}>{pack.desc}</div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* FX Sliders */}
                    <div style={{ padding: "14px", background: cardBg, border: `1.5px solid ${cardBdr}`, borderRadius: "12px", display: "flex", flexDirection: "column", gap: "14px" }}>
                        <SL>Retro FX & Refraction</SL>
                        <div>
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                                <span style={{ fontSize: "12px", fontWeight: 600, color: dm ? '#ccc' : '#555' }}>🌈 Chromatic Aberration</span>
                                <span style={{ fontSize: "12px", fontWeight: 700, color: "#6c63ff" }}>{chromatic}%</span>
                            </div>
                            <SmoothSlider min={0} max={100} step={1} value={chromatic} defaultValue={0} onChange={setChromatic} />
                        </div>

                        <div>
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                                <span style={{ fontSize: "12px", fontWeight: 600, color: dm ? '#ccc' : '#555' }}>💎 Prism Flare & Rays</span>
                                <span style={{ fontSize: "12px", fontWeight: 700, color: "#6c63ff" }}>{prism}%</span>
                            </div>
                            <SmoothSlider min={0} max={100} step={1} value={prism} defaultValue={0} onChange={setPrism} />
                        </div>

                        <div>
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                                <span style={{ fontSize: "12px", fontWeight: 600, color: dm ? '#ccc' : '#555' }}>🌫️ Halation & Bloom Glow</span>
                                <span style={{ fontSize: "12px", fontWeight: 700, color: "#6c63ff" }}>{halation}%</span>
                            </div>
                            <SmoothSlider min={0} max={100} step={1} value={halation} defaultValue={0} onChange={setHalation} />
                        </div>

                        <div>
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                                <span style={{ fontSize: "12px", fontWeight: 600, color: dm ? '#ccc' : '#555' }}>✨ Sparkles & Glitter Stars</span>
                                <span style={{ fontSize: "12px", fontWeight: 700, color: "#6c63ff" }}>{glitter}%</span>
                            </div>
                            <SmoothSlider min={0} max={100} step={1} value={glitter} defaultValue={0} onChange={setGlitter} />
                        </div>

                        <div>
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                                <span style={{ fontSize: "12px", fontWeight: 600, color: dm ? '#ccc' : '#555' }}>🎞️ Vintage Film Dust & Scratches</span>
                                <span style={{ fontSize: "12px", fontWeight: 700, color: "#6c63ff" }}>{filmDust}%</span>
                            </div>
                            <SmoothSlider min={0} max={100} step={1} value={filmDust} defaultValue={0} onChange={setFilmDust} />
                        </div>

                        <div>
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                                <span style={{ fontSize: "12px", fontWeight: 600, color: dm ? '#ccc' : '#555' }}>🔮 Infrared Thermal Vision</span>
                                <span style={{ fontSize: "12px", fontWeight: 700, color: "#6c63ff" }}>{heatmap}%</span>
                            </div>
                            <SmoothSlider min={0} max={100} step={1} value={heatmap} defaultValue={0} onChange={setHeatmap} />
                        </div>
                    </div>

                    {/* VHS Camcorder & Light Leaks */}
                    <div style={{ padding: "14px", background: cardBg, border: `1.5px solid ${cardBdr}`, borderRadius: "12px", display: "flex", flexDirection: "column", gap: "14px" }}>
                        <SL>VHS Camcorder & Light Leaks</SL>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                            <div>
                                <div style={{ fontSize: "12.5px", fontWeight: 700 }}>📹 90s VHS Camcorder HUD</div>
                                <div style={{ fontSize: "10.5px", color: dm ? "#aaa" : "#666" }}>Adds PLAY ▶, date stamp & retro scanlines</div>
                            </div>
                            <input type="checkbox" checked={vhs} onChange={e => setVhs(e.target.checked)} style={{ width: "18px", height: "18px", accentColor: "#6c63ff", cursor: "pointer" }} />
                        </div>

                        <div>
                            <div style={{ fontSize: "12px", fontWeight: 600, marginBottom: "8px" }}>🌅 Vintage Light Leaks</div>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px" }}>
                                {LIGHT_LEAK_OPTIONS.map(opt => (
                                    <button key={opt.id} onClick={() => setLightLeak(opt.id)}
                                        style={{
                                            padding: "8px",
                                            borderRadius: "8px",
                                            border: `1.5px solid ${lightLeak === opt.id ? "#6c63ff" : cardBdr}`,
                                            background: lightLeak === opt.id ? (dm ? "rgba(108,99,255,0.2)" : "rgba(108,99,255,0.08)") : "transparent",
                                            color: lightLeak === opt.id ? "#6c63ff" : (dm ? "#ddd" : "#333"),
                                            fontSize: "11px",
                                            fontWeight: 700,
                                            cursor: "pointer",
                                            display: "flex",
                                            alignItems: "center",
                                            gap: "6px"
                                        }}>
                                        <span>{opt.icon}</span>
                                        <span>{opt.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Aesthetic Audio Vibe */}
                    <div style={{ padding: "14px", background: cardBg, border: `1.5px solid ${cardBdr}`, borderRadius: "12px", display: "flex", flexDirection: "column", gap: "10px" }}>
                        <SL>🎵 Aesthetic Sound Vibe</SL>
                        <div style={{ fontSize: "11px", color: dm ? "#aaa" : "#666" }}>Select background music vibe for preview:</div>
                        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                            {VIBE_AUDIO_OPTIONS.map(opt => (
                                <button key={opt.id} onClick={() => setVibeAudio(opt.id)}
                                    style={{
                                        padding: "8px 10px",
                                        borderRadius: "8px",
                                        border: `1.5px solid ${vibeAudio === opt.id ? "#6c63ff" : cardBdr}`,
                                        background: vibeAudio === opt.id ? (dm ? "rgba(108,99,255,0.2)" : "rgba(108,99,255,0.08)") : "transparent",
                                        color: vibeAudio === opt.id ? "#6c63ff" : (dm ? "#ddd" : "#333"),
                                        fontSize: "11.5px",
                                        fontWeight: 700,
                                        cursor: "pointer",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "space-between"
                                    }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                        <span>{opt.icon}</span>
                                        <span>{opt.label}</span>
                                    </div>
                                    <span style={{ fontSize: "10px", opacity: 0.7 }}>{opt.desc}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* 1. Grade (Adjust Color / LUTs) */}
            {subTab === "grade" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                    <div>
                        {/* Style Selector Toggle */}
                        <div style={{ display: "flex", gap: "2px", marginBottom: "12px", background: dm ? '#2a2a2a' : '#f2f2f8', padding: "3px", borderRadius: "10px" }}>
                            <button onClick={() => setStyleType('preset')}
                                style={{ flex: 1, padding: "8px", fontSize: "12px", fontWeight: 600, border: "none", cursor: "pointer", fontFamily: "inherit", background: styleType === 'preset' ? (dm ? '#444' : '#fff') : 'transparent', color: styleType === 'preset' ? "#6c63ff" : "#999", borderRadius: "8px", boxShadow: styleType === 'preset' ? "0 1px 4px rgba(0,0,0,.08)" : "none", transition: "all .18s", display: "flex", alignItems: "center", justifyContent: "center", gap: "4px" }}>
                                🎨 Filter Presets
                            </button>
                            <button onClick={() => styleType !== 'lut' && setStyleType('lut')}
                                style={{ flex: 1, padding: "8px", fontSize: "12px", fontWeight: 600, border: "none", cursor: "pointer", fontFamily: "inherit", background: styleType === 'lut' ? (dm ? '#444' : '#fff') : 'transparent', color: styleType === 'lut' ? "#6c63ff" : "#999", borderRadius: "8px", boxShadow: styleType === 'lut' ? "0 1px 4px rgba(0,0,0,.08)" : "none", transition: "all .18s", display: "flex", alignItems: "center", justifyContent: "center", gap: "4px" }}>
                                <span>🎬 3D LUTs</span>
                                <span style={{ fontSize: "9px", fontWeight: 800, padding: "1px 5px", background: "linear-gradient(135deg, #06b6d4 0%, #6c63ff 100%)", color: "#fff", borderRadius: "5px", textTransform: "uppercase", letterSpacing: "0.03em" }}>PRO</span>
                            </button>
                        </div>

                        {/* Filter Presets Grid */}
                        {styleType === 'preset' && (
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: "8px", paddingBottom: "12px" }}>
                                {PRESETS.map(p => {
                                    const active = lutId === 'none' && Object.keys(p.values).every(k => filters[k] === p.values[k]);
                                    return (
                                        <button key={p.name} onClick={() => {
                                            setFilters({ ...DEFAULT_FILTERS, ...p.values });
                                            setLutId('none');
                                        }}
                                            style={{
                                                width: "100%", minWidth: 0, padding: "10px 6px",
                                                border: `1.5px solid ${active ? '#6c63ff' : cardBdr}`,
                                                background: active ? (dm ? '#1e1a3a' : '#faf9ff') : (dm ? '#2a2a2a' : '#fff'),
                                                borderRadius: "10px", textAlign: "center", cursor: "pointer",
                                                transition: "all .18s", fontFamily: "inherit",
                                                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "3px",
                                                boxShadow: active ? "0 0 12px rgba(108,99,255,.2)" : "none"
                                            }}>
                                            <div style={{ fontSize: "18px", lineHeight: 1.1 }}>{p.icon}</div>
                                            <div style={{ fontSize: "10px", fontWeight: 700, color: active ? '#6c63ff' : (dm ? '#aaa' : '#666'), lineHeight: 1.2, wordBreak: "break-word" }}>{p.name}</div>
                                        </button>
                                    );
                                })}
                            </div>
                        )}

                        {/* 3D LUTs Grid & Controls */}
                        {styleType === 'lut' && (
                            <div style={{ display: "flex", flexDirection: "column", gap: "12px", paddingBottom: "12px" }}>
                                <div style={{ padding: "14px", background: cardBg, border: `1.5px solid ${cardBdr}`, borderRadius: "12px", display: "flex", flexDirection: "column", gap: "12px" }}>
                                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px", flexWrap: "wrap" }}>
                                        <SL style={{ marginBottom: 0 }}>Color Lookup (LUT)</SL>
                                        <span style={{ fontSize: "10px", fontWeight: 700, padding: "2px 8px", background: "#f0fff4", color: "#16a34a", borderRadius: "20px", border: "1px solid #86efac" }}>FREE • In-Browser</span>
                                    </div>
                                    <p style={{ fontSize: "11px", color: "#aaa", lineHeight: 1.5, margin: 0 }}>Apply professional film simulations and cinematic color grades. Select a built-in look or upload your own .cube file.</p>

                                    {/* Tab/Pack Selector */}
                                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: "4px", background: dm ? '#2a2a2a' : '#f2f2f8', padding: "4px", borderRadius: "8px", width: "100%" }}>
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
                                                        width: "100%", minWidth: 0, padding: "6px 4px", fontSize: "11px", fontWeight: 600, border: "none", cursor: "pointer", fontFamily: "inherit",
                                                        background: active ? (dm ? '#444' : '#fff') : 'transparent',
                                                        color: active ? "#6c63ff" : dm ? "#ccc" : "#666",
                                                        borderRadius: "6px",
                                                        boxShadow: active ? "0 1px 3px rgba(0,0,0,.1)" : "none",
                                                        transition: "all .15s",
                                                        whiteSpace: "nowrap",
                                                        overflow: "hidden",
                                                        textOverflow: "ellipsis"
                                                    }}>
                                                    {tab.label}
                                                </button>
                                            );
                                        })}
                                    </div>

                                    {lutTab !== 'all' && (
                                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "2px", width: "100%", flexWrap: "wrap", gap: "6px" }}>
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

                                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: "8px" }}>
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
                                                        width: "100%", minWidth: 0, minHeight: "64px", padding: "8px 6px",
                                                        border: `1.5px solid ${active ? '#6c63ff' : cardBdr}`,
                                                        background: active ? (dm ? '#1e1a3a' : '#faf9ff') : dm ? '#252525' : '#fff',
                                                        borderRadius: "10px", textAlign: "center", cursor: "pointer",
                                                        transition: "all .18s", fontFamily: "inherit",
                                                        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "4px",
                                                        boxShadow: active ? "0 0 12px rgba(108,99,255,.2)" : "none"
                                                    }}>
                                                    <div style={{ fontSize: "18px", lineHeight: 1.1 }}>{p.icon}</div>
                                                    <div style={{ fontSize: "10px", fontWeight: 700, color: active ? '#6c63ff' : dm ? '#aaa' : '#666', lineHeight: 1.2, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", wordBreak: "break-word" }}>{p.name}</div>
                                                </button>
                                            );
                                        })}
                                        <button
                                            onClick={() => document.getElementById('cube-upload-input')?.click()}
                                            style={{
                                                width: "100%", minWidth: 0, minHeight: "64px", padding: "8px 6px",
                                                border: `1.5px dashed ${lutId === 'custom' ? '#6c63ff' : cardBdr}`,
                                                background: lutId === 'custom' ? (dm ? '#1e1a3a' : '#faf9ff') : dm ? '#252525' : '#fff',
                                                borderRadius: "10px", textAlign: "center", cursor: "pointer",
                                                transition: "all .18s", fontFamily: "inherit",
                                                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "4px",
                                                boxShadow: lutId === 'custom' ? "0 0 12px rgba(108,99,255,.2)" : "none"
                                            }}>
                                            <div style={{ fontSize: "18px", lineHeight: 1.1 }}>📂</div>
                                            <div style={{ fontSize: "10px", fontWeight: 700, color: lutId === 'custom' ? '#6c63ff' : dm ? '#aaa' : '#666', lineHeight: 1.2, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", wordBreak: "break-word" }}>
                                                {customLutName ? customLutName.slice(0, 12) : 'Upload .cube'}
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
                                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
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
                                                <div style={{ display: "flex", alignItems: "center", gap: "4px", marginTop: "2px", flexWrap: "wrap" }}>
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
                        {/* Sliders Group Switcher */}
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: "4px", marginBottom: "14px", background: dm ? '#2a2a2a' : '#f2f2f8', padding: "4px", borderRadius: "10px" }}>
                            {[
                                { key: "basic", label: "☀️ Light" },
                                { key: "hsl", label: "🎨 Color" },
                                { key: "selective", label: "🔴 HSL Mixer" },
                                { key: "curves", label: "📈 Curves" },
                                { key: "enhance", label: "✨ Details" },
                                { key: "style", label: "🌌 Vignette" }
                            ].map(g => (
                                <button key={g.key} onClick={() => setFilterGroup(g.key)}
                                    style={{ width: "100%", minWidth: 0, padding: "7px 4px", fontSize: "11px", fontWeight: filterGroup === g.key ? 700 : 500, border: "none", cursor: "pointer", fontFamily: "inherit", background: filterGroup === g.key ? (dm ? '#444' : '#fff') : 'transparent', color: filterGroup === g.key ? "#6c63ff" : (dm ? "#aaa" : "#666"), borderRadius: "8px", boxShadow: filterGroup === g.key ? "0 1px 4px rgba(0,0,0,.08)" : "none", transition: "all .18s", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                    {g.label}
                                </button>
                            ))}
                        </div>

                        {/* Render 8-Channel Selective HSL Mixer */}
                        {filterGroup === "selective" && (
                            <HslMixerPanel hslMixer={hslMixer} setHslMixer={setHslMixer} dm={dm} cardBg={cardBg} cardBdr={cardBdr} />
                        )}

                        {/* Render RGB Tone Curves Graph */}
                        {filterGroup === "curves" && (
                            <ToneCurvesPanel curves={curves} setCurves={setCurves} dm={dm} cardBg={cardBg} cardBdr={cardBdr} />
                        )}

                        {/* Render sliders */}
                        {filterGroup !== "selective" && filterGroup !== "curves" && COLOR_FILTERS.filter(f => f.group === filterGroup).map(f => {
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
                    </div>
                </div>
            )}

            {/* 2. Crop & Smart Canvas Resize */}
            {subTab === "crop" && (
                <AdjustPanel {...{
                    image, imgRef, setRotation, setFlipH, setFlipV, rotation, flipH, flipV,
                    cropMode, setCropMode, cropBox, setCropBox, cropAspect, setCropAspect,
                    applyCrop, applyCanvasPreset, dm, cardBg, cardBdr
                }} />
            )}

            {/* 3. AI Tools (Photoroom Magic Retouch + Beauty Retouch + Face Restore + Smart Upscale) */}
            {subTab === "ai" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                    <ToolsPanel {...{
                        image, cardBdr, cardBg, dm, saveFile,
                        aiRemoveBrush, setAiRemoveBrush, toCSSFilter, filters,
                        initMaskCanvas, maskCanvasRef, maskDrawingRef, drawMask,
                        aiMaskReady, handleAiRemove, aiRemoveStatus, aiRemoveLog, aiRemoveResult, applyAiResult,
                        eraseMode, setEraseMode, canUndoErase, handleUndoErase
                    }} />
                    
                    {image && (
                        <>
                            <div style={{ borderTop: `1px solid ${cardBdr}`, paddingTop: "14px", marginTop: "2px" }}>
                                <SL>AI Portrait & Super-Resolution</SL>
                            </div>

                            {/* ── BEAUTY RETOUCH ── */}
                            <div style={{ padding: "14px", background: cardBg, border: `1.5px solid ${cardBdr}`, borderRadius: "12px", display: "flex", flexDirection: "column", gap: "10px" }}>
                                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                    <span style={{ fontSize: "13px", fontWeight: 700, color: dm ? '#f3f4f6' : '#1f2937' }}>✨ AI Portrait Beauty Retouch</span>
                                    <span style={{ fontSize: "9px", fontWeight: 700, padding: "2px 6px", background: "#f0fff4", color: "#16a34a", borderRadius: "12px", border: "1px solid #86efac" }}>FREE</span>
                                </div>
                                <p style={{ fontSize: "11px", color: dm ? "#aaa" : "#666", lineHeight: 1.5, margin: 0 }}>Softens skin texture and balances portrait lighting with edge-preserving bilateral segmentation.</p>
                                
                                {/* 1-Click Portrait Presets */}
                                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "4px" }}>
                                    {[
                                        { label: "Natural", s: 3, c: 3, g: 1 },
                                        { label: "Glow", s: 5, c: 4, g: 5 },
                                        { label: "Crisp HD", s: 2, c: 8, g: 0 },
                                        { label: "Glamour", s: 7, c: 4, g: 6 }
                                    ].map(p => (
                                        <button
                                            key={p.label}
                                            onClick={() => {
                                                setAiBeautySmooth(p.s);
                                                setAiBeautyClarity(p.c);
                                                setAiBeautyGlow(p.g);
                                            }}
                                            style={{
                                                padding: "6px 2px",
                                                borderRadius: "7px",
                                                border: `1px solid ${cardBdr}`,
                                                background: dm ? "#222" : "#f4f4f8",
                                                color: dm ? "#ddd" : "#444",
                                                fontSize: "10.5px",
                                                fontWeight: 700,
                                                cursor: "pointer",
                                                fontFamily: "inherit"
                                            }}
                                        >
                                            {p.label}
                                        </button>
                                    ))}
                                </div>

                                <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", userSelect: "none", marginBottom: "4px" }}>
                                    <input type="checkbox" checked={aiBeautyUseMask} onChange={e => setAiBeautyUseMask(e.target.checked)} 
                                        style={{ width: "16px", height: "16px", accentColor: "#6c63ff" }} />
                                    <span style={{ fontSize: "12px", color: dm ? '#ccc' : '#555', fontWeight: 600 }}>Face Skin Mask Only</span>
                                </label>
                                
                                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                                    <div>
                                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                                            <span style={{ fontSize: "12px", color: dm ? '#ccc' : '#555' }}>Skin Smoothness</span>
                                            <span style={{ fontSize: "12px", fontWeight: 700, color: "#6c63ff" }}>{aiBeautySmooth}</span>
                                        </div>
                                        <SmoothSlider min={0} max={10} step={1} value={aiBeautySmooth} defaultValue={0} onChange={setAiBeautySmooth} />
                                    </div>
                                    <div>
                                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                                            <span style={{ fontSize: "12px", color: dm ? '#ccc' : '#555' }}>Eye & Detail Clarity</span>
                                            <span style={{ fontSize: "12px", fontWeight: 700, color: "#6c63ff" }}>{aiBeautyClarity}</span>
                                        </div>
                                        <SmoothSlider min={0} max={10} step={1} value={aiBeautyClarity} defaultValue={0} onChange={setAiBeautyClarity} />
                                    </div>
                                    <div>
                                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                                            <span style={{ fontSize: "12px", color: dm ? '#ccc' : '#555' }}>Studio Portrait Glow</span>
                                            <span style={{ fontSize: "12px", fontWeight: 700, color: "#6c63ff" }}>{aiBeautyGlow}</span>
                                        </div>
                                        <SmoothSlider min={0} max={10} step={1} value={aiBeautyGlow} defaultValue={0} onChange={setAiBeautyGlow} />
                                    </div>
                                </div>
                                {(aiBeautySmooth > 0 || aiBeautyClarity > 0 || aiBeautyGlow > 0) && (
                                    <div style={{ display: "flex", gap: "7px", marginTop: "4px" }}>
                                        <AB onClick={() => {
                                            setAiBeautySmooth(0);
                                            setAiBeautyClarity(0);
                                            setAiBeautyGlow(0);
                                        }} color={dm ? '#252525' : '#f2f2f8'} textColor={dm ? '#ccc' : '#555'} style={{ flex: 1, padding: "9px", fontSize: "12px" }}>
                                            ↺ Reset Beauty Sliders
                                        </AB>
                                    </div>
                                )}
                            </div>

                            {/* ── FACE RESTORE ── */}
                            <div style={{ padding: "14px", background: cardBg, border: `1.5px solid ${cardBdr}`, borderRadius: "12px", display: "flex", flexDirection: "column", gap: "10px" }}>
                                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                    <span style={{ fontSize: "13px", fontWeight: 700, color: dm ? '#f3f4f6' : '#1f2937' }}>👤 Neural Face Restore</span>
                                    <span style={{ fontSize: "9px", fontWeight: 700, padding: "2px 6px", background: "#f0fff4", color: "#16a34a", borderRadius: "12px", border: "1px solid #86efac" }}>FREE</span>
                                </div>
                                <p style={{ fontSize: "11px", color: dm ? "#aaa" : "#666", lineHeight: 1.5, margin: 0 }}>Synthesizes sharp eye, eyebrow, and lip details and reconstructs facial lighting locally on device.</p>
                                
                                <AB onClick={runFalFaceRestore}
                                    disabled={aiFaceRestoreStatus === 'loading'}
                                    color={aiFaceRestoreStatus === 'done' ? '#f0fff4' : 'purple'}
                                    textColor={aiFaceRestoreStatus === 'done' ? '#16a34a' : '#fff'}
                                    style={{ width: "100%", padding: "10px", fontSize: "12px" }}>
                                    {aiFaceRestoreStatus === 'loading' ? <Row><Spin />Restoring…</Row>
                                        : aiFaceRestoreStatus === 'done' ? '✓ Restored — Run Again'
                                            : '✨ Restore Face Details'}
                                </AB>
                                {aiFaceRestoreLog && <p style={{ fontSize: "11px", color: aiFaceRestoreStatus === 'error' ? '#ef4444' : '#a78bfa', lineHeight: 1.4, margin: 0 }}>{aiFaceRestoreLog}</p>}
                                {aiFaceRestoreResult && (
                                    <div style={{ display: "flex", gap: "7px" }}>
                                        <AB onClick={revertAi} color={dm ? '#252525' : '#f2f2f8'} textColor={dm ? '#ccc' : '#555'} style={{ flex: 1, padding: "9px", fontSize: "12px" }}>↺ Revert Face Restore</AB>
                                    </div>
                                )}
                            </div>

                            {/* ── SMART UPSCALE ── */}
                            <div style={{ padding: "14px", background: cardBg, border: `1.5px solid ${cardBdr}`, borderRadius: "12px", display: "flex", flexDirection: "column", gap: "10px" }}>
                                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                    <span style={{ fontSize: "13px", fontWeight: 700, color: dm ? '#f3f4f6' : '#1f2937' }}>⬆️ Smart HD Upscale</span>
                                    <span style={{ fontSize: "9px", fontWeight: 700, padding: "2px 6px", background: "#f0fff4", color: "#16a34a", borderRadius: "12px", border: "1px solid #86efac" }}>FREE</span>
                                </div>
                                <p style={{ fontSize: "11px", color: "#aaa", lineHeight: 1.5, margin: 0 }}>Multi-pass super-resolution with edge-preserving unsharp masking.</p>
                                <div>
                                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "5px" }}>
                                        <span style={{ fontSize: "11px", color: dm ? '#ccc' : '#555' }}>Scale factor</span>
                                        <span style={{ fontSize: "11px", fontWeight: 700, color: "#6c63ff" }}>{aiScale}×</span>
                                    </div>
                                    <div style={{ display: "flex", gap: "6px" }}>
                                        {[2, 3, 4].map(s => (
                                            <button key={s} onClick={() => setAiScale(s)}
                                                style={{ flex: 1, padding: "8px", border: `1.5px solid ${aiScale === s ? '#6c63ff' : cardBdr}`,
                                                    background: aiScale === s ? (dm ? '#1e1a3a' : '#faf9ff') : dm ? '#252525' : '#fff',
                                                    borderRadius: "8px", fontSize: "12px", fontWeight: 700, cursor: "pointer",
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
                                    style={{ width: "100%", padding: "10px", fontSize: "12px" }}>
                                    {aiUpscaleStatus === 'loading' ? <Row><Spin />Upscaling…</Row>
                                        : aiUpscaleStatus === 'done' ? '✓ Upscaled — Run Again'
                                            : `⬆️ Upscale Image (${aiScale}×)`}
                                </AB>
                                {aiUpscaleLog && <p style={{ fontSize: "11px", color: aiUpscaleStatus === 'error' ? '#ef4444' : '#a78bfa', lineHeight: 1.4, margin: 0 }}>{aiUpscaleLog}</p>}
                                {aiUpscaleStatus === 'loading' && <PBar value={aiUpscaleProgress} />}
                                {aiUpscaleResult && (
                                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px" }}>
                                        <span style={{ fontSize: "11px", fontWeight: 700, color: "#16a34a" }}>✓ {aiUpscaleResultSize}</span>
                                        <AB onClick={revertAi} color={dm ? '#252525' : '#f2f2f8'} textColor={dm ? '#ccc' : '#555'} style={{ padding: "7px 12px", fontSize: "11px" }}>↺ Revert</AB>
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>
            )}

            {/* 4. Photoroom AI Studio (Subject Cutout + Studio Scenes + AI Shadows + Relight & Sky) */}
            {subTab === "luminar" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                    <div style={{ padding: "14px", background: dm ? '#1e1b30' : '#f9f8ff', border: `1.5px solid ${dm ? '#4c1d95' : '#c084fc'}`, borderRadius: "12px", display: "flex", flexDirection: "column", gap: "6px" }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px" }}>
                            <span style={{ fontSize: "14px", fontWeight: 900, background: "linear-gradient(135deg, #06b6d4, #6c63ff, #ec4899)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", fontFamily: "'Outfit', sans-serif" }}>
                                ✨ PHOTOROOM AI STUDIO
                            </span>
                            <span style={{ fontSize: "9px", fontWeight: 800, padding: "2px 7px", background: "linear-gradient(135deg, #06b6d4 0%, #6c63ff 100%)", color: "#fff", borderRadius: "10px", textTransform: "uppercase" }}>
                                LIVE COMPOSITOR
                            </span>
                        </div>
                        <p style={{ fontSize: "11px", color: dm ? '#c084fc' : '#6b21a8', lineHeight: 1.45, margin: 0, opacity: 0.9 }}>
                            Isolate your subject in one click, stage it in realistic 3D studio backdrops, cast grounding AI shadows, and relight depth locally.
                        </p>
                    </div>

                    {!image ? (
                        <div style={{ padding: "16px", color: "#888", fontSize: "12px", textAlign: "center" }}>
                            Upload a photo first to launch AI Studio.
                        </div>
                    ) : (
                        <>
                            {/* ── STEP 1: INSTANT AI BACKGROUND CUTOUT ── */}
                            <div style={{ padding: "14px", background: cardBg, border: `1.5px solid ${bgStatus === "done" ? "#16a34a" : cardBdr}`, borderRadius: "12px", display: "flex", flexDirection: "column", gap: "10px" }}>
                                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                    <span style={{ fontSize: "13px", fontWeight: 800, color: dm ? "#f3f4f6" : "#1f2937" }}>
                                        1. AI Subject Cutout
                                    </span>
                                    <span style={{ fontSize: "9.5px", fontWeight: 700, padding: "2px 7px", background: "#f0fff4", color: "#16a34a", borderRadius: "10px", border: "1px solid #86efac" }}>
                                        IN-BROWSER AI
                                    </span>
                                </div>

                                <div style={{ display: "flex", gap: "8px" }}>
                                    <AB
                                        onClick={handleRemoveBg}
                                        disabled={bgStatus === "loading"}
                                        color={bgStatus === "done" ? "#f0fff4" : "purple"}
                                        textColor={bgStatus === "done" ? "#16a34a" : "#fff"}
                                        style={{ flex: 1, padding: "11px", fontSize: "12.5px" }}
                                    >
                                        {bgStatus === "loading" ? (
                                            <Row><Spin />Isolating Subject… {bgProgress}%</Row>
                                        ) : bgStatus === "done" ? (
                                            "✓ Subject Isolated — Re-run Cutout"
                                        ) : (
                                            "✂ Remove Background (1-Click Cutout)"
                                        )}
                                    </AB>
                                    {bgStatus === "done" && clearBgCutout && (
                                        <button
                                            onClick={clearBgCutout}
                                            style={{
                                                padding: "0 12px",
                                                borderRadius: "9px",
                                                border: `1px solid ${cardBdr}`,
                                                background: dm ? "#252525" : "#f2f2f8",
                                                color: dm ? "#ccc" : "#555",
                                                fontSize: "11.5px",
                                                fontWeight: 700,
                                                cursor: "pointer",
                                                fontFamily: "inherit"
                                            }}
                                            title="Restore original uncut background"
                                        >
                                            ↺ Original
                                        </button>
                                    )}
                                </div>
                                {bgStatus === "loading" && <PBar value={bgProgress} />}
                                {bgStatus === "error" && (
                                    <p style={{ fontSize: "11.5px", color: "#ef4444", margin: 0 }}>
                                        ⚠ Cutout failed — try a standard JPG, PNG, or WebP photo.
                                    </p>
                                )}
                            </div>

                            {/* ── STEP 2: PHOTOROOM STUDIO BACKDROPS & SCENES ── */}
                            <div style={{ padding: "14px", background: cardBg, border: `1.5px solid ${cardBdr}`, borderRadius: "12px", display: "flex", flexDirection: "column", gap: "12px" }}>
                                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                    <span style={{ fontSize: "13px", fontWeight: 800, color: dm ? "#f3f4f6" : "#1f2937" }}>
                                        2. Studio Backdrops & Scenes
                                    </span>
                                    {bgStatus !== "done" && (
                                        <span style={{ fontSize: "10px", color: "#a78bfa", fontWeight: 700 }}>Auto-isolates on click</span>
                                    )}
                                </div>

                                {/* Backdrop Mode Selector */}
                                <div style={{ display: "grid", gridTemplateColumns: "repeat(5, minmax(0, 1fr))", gap: "5px" }}>
                                    {[
                                        { id: "transparent", l: "Cutout", i: "◻" },
                                        { id: "color", l: "Color", i: "🎨" },
                                        { id: "scene", l: "Scenes", i: "🏛️" },
                                        { id: "blur", l: "Bokeh", i: "✦" },
                                        { id: "custom", l: "Photo", i: "🖼️" }
                                    ].map(m => {
                                        const active = bgMode === m.id && bgStatus === "done";
                                        return (
                                            <button
                                                key={m.id}
                                                onClick={() => {
                                                    setBgMode(m.id);
                                                    if (bgStatus !== "done" && bgStatus !== "loading") {
                                                        handleRemoveBg();
                                                    }
                                                }}
                                                style={{
                                                    padding: "8px 4px",
                                                    borderRadius: "8px",
                                                    border: `1.5px solid ${active ? "#6c63ff" : cardBdr}`,
                                                    background: active ? (dm ? "#1e1a3a" : "#faf9ff") : (dm ? "#1e1e1e" : "#fff"),
                                                    color: active ? "#6c63ff" : (dm ? "#ccc" : "#555"),
                                                    cursor: "pointer",
                                                    fontFamily: "inherit",
                                                    display: "flex",
                                                    flexDirection: "column",
                                                    alignItems: "center",
                                                    gap: "2px",
                                                    fontSize: "10.5px",
                                                    fontWeight: 700
                                                }}
                                            >
                                                <span style={{ fontSize: "14px" }}>{m.i}</span>
                                                <span>{m.l}</span>
                                            </button>
                                        );
                                    })}
                                </div>

                                {/* Solid Color Picker */}
                                {bgMode === "color" && (
                                    <div style={{ display: "flex", flexDirection: "column", gap: "8px", animation: "fadein .2s" }}>
                                        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                                            {BG_COLORS.map(c => (
                                                <div
                                                    key={c}
                                                    onClick={() => {
                                                        setBgColor(c);
                                                        if (bgStatus !== "done" && bgStatus !== "loading") handleRemoveBg();
                                                    }}
                                                    style={{
                                                        width: "26px",
                                                        height: "26px",
                                                        borderRadius: "7px",
                                                        background: c,
                                                        border: `2.5px solid ${bgColor === c ? "#6c63ff" : "rgba(150,150,150,0.35)"}`,
                                                        cursor: "pointer",
                                                        flexShrink: 0
                                                    }}
                                                />
                                            ))}
                                        </div>
                                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                            <span style={{ fontSize: "11px", color: dm ? "#aaa" : "#666", fontWeight: 600 }}>Custom Studio Color:</span>
                                            <input
                                                type="color"
                                                value={bgColor}
                                                onChange={e => setBgColor(e.target.value)}
                                                style={{ flex: 1, height: "30px", border: `1px solid ${cardBdr}`, borderRadius: "6px", cursor: "pointer" }}
                                            />
                                        </div>
                                    </div>
                                )}

                                {/* Photoroom Studio Scenes Grid */}
                                {bgMode === "scene" && (
                                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", animation: "fadein .2s" }}>
                                        {PHOTOROOM_SCENES.map(sc => {
                                            const active = bgScene === sc.id;
                                            return (
                                                <button
                                                    key={sc.id}
                                                    onClick={() => {
                                                        setBgScene(sc.id);
                                                        if (bgStatus !== "done" && bgStatus !== "loading") handleRemoveBg();
                                                    }}
                                                    style={{
                                                        padding: "8px",
                                                        borderRadius: "10px",
                                                        border: `1.5px solid ${active ? "#6c63ff" : cardBdr}`,
                                                        background: dm ? "#1e1e1e" : "#fff",
                                                        cursor: "pointer",
                                                        fontFamily: "inherit",
                                                        display: "flex",
                                                        alignItems: "center",
                                                        gap: "8px",
                                                        textAlign: "left"
                                                    }}
                                                >
                                                    <div style={{ width: "32px", height: "32px", borderRadius: "7px", background: sc.preview, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "15px", boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.1)" }}>
                                                        {sc.icon}
                                                    </div>
                                                    <div style={{ minWidth: 0 }}>
                                                        <div style={{ fontSize: "11px", fontWeight: 800, color: active ? "#6c63ff" : (dm ? "#f3f4f6" : "#1f2937"), whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                                            {sc.name}
                                                        </div>
                                                        <div style={{ fontSize: "9.5px", color: dm ? "#9ca3af" : "#666", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                                            {sc.desc}
                                                        </div>
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}

                                {/* Bokeh Blur Slider */}
                                {bgMode === "blur" && (
                                    <div style={{ animation: "fadein .2s" }}>
                                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "5px" }}>
                                            <span style={{ fontSize: "12px", fontWeight: 600, color: dm ? "#ccc" : "#555" }}>Background Bokeh Blur</span>
                                            <span style={{ fontSize: "12px", color: "#6c63ff", fontWeight: 700 }}>{bgBlur}px</span>
                                        </div>
                                        <SmoothSlider min={2} max={45} step={1} value={bgBlur} defaultValue={14} onChange={setBgBlur} />
                                    </div>
                                )}

                                {/* Custom Backdrop Upload */}
                                {bgMode === "custom" && (
                                    <div style={{ animation: "fadein .2s", display: "flex", flexDirection: "column", gap: "8px" }}>
                                        <label style={{ display: "block", padding: "12px", border: `1.5px dashed ${bgCustomUrl ? "#6c63ff" : cardBdr}`, borderRadius: "10px", textAlign: "center", cursor: "pointer", background: dm ? "#1e1e1e" : "#fafafa" }}>
                                            <input
                                                type="file"
                                                accept="image/*"
                                                style={{ display: "none" }}
                                                onChange={e => {
                                                    const file = e.target.files?.[0];
                                                    if (!file) return;
                                                    const r = new FileReader();
                                                    r.onload = ev => {
                                                        setBgCustomUrl(ev.target.result);
                                                        if (bgStatus !== "done" && bgStatus !== "loading") handleRemoveBg();
                                                    };
                                                    r.readAsDataURL(file);
                                                }}
                                            />
                                            <div style={{ fontSize: "12px", fontWeight: 700, color: "#6c63ff" }}>
                                                {bgCustomUrl ? "✓ Custom Backdrop Loaded (Click to change)" : "📂 Upload Custom Background Photo"}
                                            </div>
                                        </label>
                                    </div>
                                )}
                            </div>

                            {/* ── STEP 3: PHOTOROOM AI SHADOWS, OUTLINE & SUBJECT TRANSFORM ── */}
                            <div style={{ padding: "14px", background: cardBg, border: `1.5px solid ${cardBdr}`, borderRadius: "12px", display: "flex", flexDirection: "column", gap: "12px", animation: "fadein .25s" }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                    <SL style={{ margin: 0 }}>3. AI Shadows, Sticker Outline & Placement</SL>
                                    {bgStatus !== "done" && (
                                        <span style={{ fontSize: "10px", color: "#a78bfa", fontWeight: 700 }}>Auto-isolates on edit</span>
                                    )}
                                </div>

                                {/* AI Shadow Preset Selector */}
                                <div>
                                    <span style={{ fontSize: "10.5px", fontWeight: 700, color: "#aaa", textTransform: "uppercase", letterSpacing: ".05em", display: "block", marginBottom: "6px" }}>
                                        AI Studio Shadow
                                    </span>
                                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px" }}>
                                        {PHOTOROOM_SHADOWS.map(sh => {
                                            const active = bgShadowType === sh.id;
                                            return (
                                                <button
                                                    key={sh.id}
                                                    onClick={() => {
                                                        setBgShadowType(sh.id);
                                                        if (bgStatus !== "done" && bgStatus !== "loading") handleRemoveBg();
                                                    }}
                                                    style={{
                                                        padding: "8px",
                                                        borderRadius: "8px",
                                                        border: `1.5px solid ${active ? "#6c63ff" : cardBdr}`,
                                                        background: active ? (dm ? "#1e1a3a" : "#faf9ff") : (dm ? "#1e1e1e" : "#fff"),
                                                        color: active ? "#6c63ff" : (dm ? "#ddd" : "#333"),
                                                        cursor: "pointer",
                                                        fontFamily: "inherit",
                                                        textAlign: "left",
                                                        display: "flex",
                                                        flexDirection: "column",
                                                        gap: "2px"
                                                    }}
                                                >
                                                    <span style={{ fontSize: "11.5px", fontWeight: 800 }}>{sh.icon} {sh.name}</span>
                                                    <span style={{ fontSize: "9.5px", color: dm ? "#9ca3af" : "#666" }}>{sh.desc}</span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                {bgShadowType !== "none" && (
                                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", padding: "10px", background: dm ? "#1e1e1e" : "#fff", borderRadius: "10px", border: `1px solid ${cardBdr}` }}>
                                        <div>
                                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "3px" }}>
                                                <span style={{ fontSize: "11px", color: dm ? "#ccc" : "#555" }}>Intensity</span>
                                                <span style={{ fontSize: "11px", fontWeight: 700, color: "#6c63ff" }}>{bgShadowOpacity}%</span>
                                            </div>
                                            <SmoothSlider min={10} max={95} step={5} value={bgShadowOpacity} defaultValue={55} onChange={v => { setBgShadowOpacity(v); if (bgStatus !== "done" && bgStatus !== "loading") handleRemoveBg(); }} />
                                        </div>
                                        <div>
                                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "3px" }}>
                                                <span style={{ fontSize: "11px", color: dm ? "#ccc" : "#555" }}>Softness</span>
                                                <span style={{ fontSize: "11px", fontWeight: 700, color: "#6c63ff" }}>{bgShadowBlur}px</span>
                                            </div>
                                            <SmoothSlider min={2} max={60} step={2} value={bgShadowBlur} defaultValue={24} onChange={v => { setBgShadowBlur(v); if (bgStatus !== "done" && bgStatus !== "loading") handleRemoveBg(); }} />
                                        </div>
                                        <div>
                                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "3px" }}>
                                                <span style={{ fontSize: "11px", color: dm ? "#ccc" : "#555" }}>Light Angle X</span>
                                                <span style={{ fontSize: "11px", fontWeight: 700, color: "#6c63ff" }}>{bgShadowX}</span>
                                            </div>
                                            <SmoothSlider min={-40} max={40} step={2} value={bgShadowX} defaultValue={0} onChange={v => { setBgShadowX(v); if (bgStatus !== "done" && bgStatus !== "loading") handleRemoveBg(); }} />
                                        </div>
                                        <div>
                                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "3px" }}>
                                                <span style={{ fontSize: "11px", color: dm ? "#ccc" : "#555" }}>Shadow Drop Y</span>
                                                <span style={{ fontSize: "11px", fontWeight: 700, color: "#6c63ff" }}>{bgShadowY}</span>
                                            </div>
                                            <SmoothSlider min={-30} max={50} step={2} value={bgShadowY} defaultValue={12} onChange={v => { setBgShadowY(v); if (bgStatus !== "done" && bgStatus !== "loading") handleRemoveBg(); }} />
                                        </div>
                                    </div>
                                )}

                                {/* Cutout Sticker Outline */}
                                <div style={{ display: "grid", gridTemplateColumns: "1fr 72px", gap: "10px", alignItems: "end" }}>
                                    <div>
                                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                                            <span style={{ fontSize: "12px", fontWeight: 600, color: dm ? "#ccc" : "#555" }}>🏷️ Cutout Sticker Outline</span>
                                            <span style={{ fontSize: "12px", fontWeight: 700, color: "#6c63ff" }}>{bgOutlineWidth}px</span>
                                        </div>
                                        <SmoothSlider min={0} max={20} step={1} value={bgOutlineWidth} defaultValue={0} onChange={v => { setBgOutlineWidth(v); if (bgStatus !== "done" && bgStatus !== "loading") handleRemoveBg(); }} />
                                    </div>
                                    <input
                                        type="color"
                                        value={bgOutlineColor}
                                        onChange={e => { setBgOutlineColor(e.target.value); if (bgStatus !== "done" && bgStatus !== "loading") handleRemoveBg(); }}
                                        style={{ width: "100%", height: "32px", border: `1px solid ${cardBdr}`, borderRadius: "8px", cursor: "pointer" }}
                                        title="Sticker Outline Color"
                                    />
                                </div>

                                {/* Subject Scale & Offset */}
                                <div style={{ borderTop: `1px solid ${cardBdr}`, paddingTop: "10px", display: "flex", flexDirection: "column", gap: "8px" }}>
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                        <span style={{ fontSize: "11px", fontWeight: 700, color: "#aaa", textTransform: "uppercase", letterSpacing: ".05em" }}>Subject Scale & Position</span>
                                        {(bgSubjectScale !== 100 || bgSubjectX !== 0 || bgSubjectY !== 0) && (
                                            <button
                                                onClick={() => { setBgSubjectScale(100); setBgSubjectX(0); setBgSubjectY(0); }}
                                                style={{ background: "none", border: "none", color: "#6c63ff", fontSize: "10.5px", fontWeight: 700, cursor: "pointer" }}
                                            >
                                                ↺ Reset Position
                                            </button>
                                        )}
                                    </div>
                                    <div>
                                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "3px" }}>
                                            <span style={{ fontSize: "11.5px", color: dm ? "#ccc" : "#555" }}>Subject Scale</span>
                                            <span style={{ fontSize: "11.5px", fontWeight: 700, color: "#6c63ff" }}>{bgSubjectScale}%</span>
                                        </div>
                                        <SmoothSlider min={45} max={135} step={1} value={bgSubjectScale} defaultValue={100} onChange={v => { setBgSubjectScale(v); if (bgStatus !== "done" && bgStatus !== "loading") handleRemoveBg(); }} />
                                    </div>
                                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                                        <div>
                                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "3px" }}>
                                                <span style={{ fontSize: "11.5px", color: dm ? "#ccc" : "#555" }}>Move X</span>
                                                <span style={{ fontSize: "11.5px", fontWeight: 700, color: "#6c63ff" }}>{bgSubjectX > 0 ? `+${bgSubjectX}` : bgSubjectX}%</span>
                                            </div>
                                            <SmoothSlider min={-40} max={40} step={1} value={bgSubjectX} defaultValue={0} onChange={v => { setBgSubjectX(v); if (bgStatus !== "done" && bgStatus !== "loading") handleRemoveBg(); }} />
                                        </div>
                                        <div>
                                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "3px" }}>
                                                <span style={{ fontSize: "11.5px", color: dm ? "#ccc" : "#555" }}>Move Y</span>
                                                <span style={{ fontSize: "11.5px", fontWeight: 700, color: "#6c63ff" }}>{bgSubjectY > 0 ? `+${bgSubjectY}` : bgSubjectY}%</span>
                                            </div>
                                            <SmoothSlider min={-40} max={40} step={1} value={bgSubjectY} defaultValue={0} onChange={v => { setBgSubjectY(v); if (bgStatus !== "done" && bgStatus !== "loading") handleRemoveBg(); }} />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* ── STEP 4: NEURAL SCENE LIGHTING, STRUCTURE & SKY AI ── */}
                            <div style={{ padding: "14px", background: cardBg, border: `1.5px solid ${cardBdr}`, borderRadius: "12px", display: "flex", flexDirection: "column", gap: "14px" }}>
                                <SL style={{ margin: 0 }}>4. Neural Lighting, Structure & Sky AI</SL>

                                {/* Accent AI */}
                                <div>
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                                        <span style={{ fontSize: "12.5px", fontWeight: 700, color: accentAi > 0 ? "#6c63ff" : dm ? '#f3f4f6' : '#1f2937' }}>
                                            ✨ Accent AI Auto-Tone {image && !accentOffsets ? "(Analyzing…)" : ""}
                                        </span>
                                        <span style={{ fontSize: "12px", fontWeight: 700, color: "#6c63ff" }}>{accentAi}%</span>
                                    </div>
                                    <SmoothSlider min={0} max={100} step={1} value={accentAi} defaultValue={0} onChange={setAccentAi} />
                                </div>

                                {/* Structure AI */}
                                <div>
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                                        <span style={{ fontSize: "12.5px", fontWeight: 700, color: structureAi > 0 ? "#6c63ff" : dm ? '#f3f4f6' : '#1f2937' }}>
                                            📐 Structure & Micro-Contrast AI
                                        </span>
                                        <span style={{ fontSize: "12px", fontWeight: 700, color: "#6c63ff" }}>{structureAi}%</span>
                                    </div>
                                    <SmoothSlider min={0} max={100} step={1} value={structureAi} defaultValue={0} onChange={setStructureAi} />
                                </div>

                                {/* Relight Depth AI */}
                                <div style={{ borderTop: `1px solid ${cardBdr}`, paddingTop: "10px", display: "flex", flexDirection: "column", gap: "8px" }}>
                                    <div style={{ fontSize: "12.5px", fontWeight: 700, color: (relightNear !== 0 || relightFar !== 0) ? "#6c63ff" : dm ? '#f3f4f6' : '#1f2937' }}>
                                        💡 3D Depth Relight AI
                                    </div>
                                    {depthMapLog && (
                                        <div style={{ padding: "6px 10px", background: dm ? '#2a2215' : '#fff8eb', border: "1px solid #d97706", borderRadius: "8px", fontSize: "11px", color: dm ? '#fbbf24' : '#b45309', display: "flex", alignItems: "center", gap: "6px" }}>
                                            <Spin />
                                            <span>{depthMapLog}</span>
                                        </div>
                                    )}
                                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                                        <div>
                                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                                                <span style={{ fontSize: "11px", color: dm ? '#ccc' : '#555' }}>Foreground Light</span>
                                                <span style={{ fontSize: "11px", fontWeight: 700, color: "#6c63ff" }}>{relightNear > 0 ? "+" : ""}{relightNear}%</span>
                                            </div>
                                            <SmoothSlider min={-100} max={100} step={5} value={relightNear} defaultValue={0} onChange={setRelightNear} />
                                        </div>
                                        <div>
                                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                                                <span style={{ fontSize: "11px", color: dm ? '#ccc' : '#555' }}>Background Light</span>
                                                <span style={{ fontSize: "11px", fontWeight: 700, color: "#6c63ff" }}>{relightFar > 0 ? "+" : ""}{relightFar}%</span>
                                            </div>
                                            <SmoothSlider min={-100} max={100} step={5} value={relightFar} defaultValue={0} onChange={setRelightFar} />
                                        </div>
                                    </div>
                                </div>

                                {/* Outdoor Sky Replacement AI */}
                                <div style={{ borderTop: `1px solid ${cardBdr}`, paddingTop: "10px", display: "flex", flexDirection: "column", gap: "8px" }}>
                                    <div style={{ fontSize: "12.5px", fontWeight: 700, color: skyMode !== 'none' ? "#6c63ff" : dm ? '#f3f4f6' : '#1f2937' }}>
                                        🌌 Outdoor Sky Replacement AI
                                    </div>
                                    <select 
                                        value={skyMode} 
                                        onChange={e => setSkyMode(e.target.value)}
                                        style={{ width: "100%", padding: "8px 10px", border: `1.5px solid ${cardBdr}`, borderRadius: "8px", fontSize: "12px", background: dm ? '#1e1e1e' : '#fff', color: dm ? '#ccc' : '#333', outline: "none", fontFamily: "inherit" }}
                                    >
                                        <option value="none">⊘ Keep Original Sky</option>
                                        <option value="sunset">🌅 Dramatic Sunset</option>
                                        <option value="blue">☀️ Sunny Blue Sky</option>
                                        <option value="stormy">⛈️ Stormy Slate</option>
                                        <option value="galaxy">🌌 Starry Galaxy Night</option>
                                        <option value="custom">📂 Custom Sky Upload...</option>
                                    </select>
                                    {skyMode === 'custom' && (
                                        <input 
                                            type="file" 
                                            accept="image/*"
                                            onChange={e => {
                                                const file = e.target.files?.[0];
                                                if (file) {
                                                    const r = new FileReader();
                                                    r.onload = ev => setCustomSkyUrl(ev.target.result);
                                                    r.readAsDataURL(file);
                                                }
                                            }}
                                            style={{ width: "100%", fontSize: "11px", color: dm ? "#aaa" : "#555" }}
                                        />
                                    )}
                                    {skyMaskLog && (
                                        <div style={{ padding: "6px 10px", background: dm ? '#2a2215' : '#fff8eb', border: "1px solid #d97706", borderRadius: "8px", fontSize: "11px", color: dm ? '#fbbf24' : '#b45309', display: "flex", alignItems: "center", gap: "6px" }}>
                                            <Spin />
                                            <span>{skyMaskLog}</span>
                                        </div>
                                    )}
                                    {skyMode !== 'none' && (
                                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                                            <div>
                                                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                                                    <span style={{ fontSize: "11px", color: dm ? '#ccc' : '#555' }}>Sky Blend</span>
                                                    <span style={{ fontSize: "11px", fontWeight: 700, color: "#6c63ff" }}>{skyOpacity}%</span>
                                                </div>
                                                <SmoothSlider min={10} max={100} step={5} value={skyOpacity} defaultValue={100} onChange={setSkyOpacity} />
                                            </div>
                                            <div>
                                                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                                                    <span style={{ fontSize: "11px", color: dm ? '#ccc' : '#555' }}>Horizon Match</span>
                                                    <span style={{ fontSize: "11px", fontWeight: 700, color: "#6c63ff" }}>{skyLightMatch}%</span>
                                                </div>
                                                <SmoothSlider min={0} max={100} step={5} value={skyLightMatch} defaultValue={50} onChange={setSkyLightMatch} />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </>
                    )}
                </div>
            )}

            {/* 5. Photoroom Layers & Composition Studio */}
            {subTab === "overlay" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                    <OverlayPanel {...{
                        image, texts, setTexts, selText, setSelText, addText, deleteText, updateText,
                        bgStatus, bgMode, onJumpToAiStudio: () => setSubTab("luminar"),
                        dm, cardBg, cardBdr, inputSt
                    }} />
                    
                    {image && (
                        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                            <div style={{ padding: "14px", background: cardBg, border: `1.5px solid ${cardBdr}`, borderRadius: "12px", display: "flex", flexDirection: "column", gap: "12px" }}>
                                <SL style={{ margin: 0 }}>Corner Brand Watermark Pin</SL>
                                <label style={{ display: "block", padding: "14px 12px", border: `2px dashed ${logo ? '#6c63ff' : cardBdr}`, borderRadius: "10px", cursor: "pointer", textAlign: "center", transition: "all .2s", background: logo ? (dm ? '#1e1a3a' : '#faf9ff') : dm ? '#252525' : '#fafafa' }}>
                                    <input type="file" accept="image/*" onChange={handleLogoUpload} style={{ display: "none" }} />
                                    {logo
                                        ? <><div style={{ fontSize: "22px", marginBottom: "4px" }}>✅</div><div style={{ fontSize: "12px", fontWeight: 700, color: '#6c63ff', marginBottom: "2px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{logoFile?.name || "Watermark Active"}</div><div style={{ fontSize: "10.5px", color: "#bbb" }}>Click to replace watermark</div></>
                                        : <><div style={{ marginBottom: "4px" }}><ModernImageUploadIcon size={26} dm={dm} /></div><div style={{ fontSize: "12px", fontWeight: 700, color: dm ? '#ccc' : '#555', marginBottom: "2px" }}>Upload Corner Watermark</div><div style={{ fontSize: "10.5px", color: "#bbb" }}>PNG with transparency works best</div></>}
                                </label>
                                {logo && (
                                    <AB onClick={() => { setLogo(null); setLogoFile(null); }} color="red" textColor="#fff" style={{ width: "100%", padding: "8px", fontSize: "12px" }}>
                                        ✕ Remove Corner Watermark
                                    </AB>
                                )}

                                {logo && (
                                    <div style={{ display: "flex", flexDirection: "column", gap: "10px", paddingTop: "6px", borderTop: `1px solid ${cardBdr}` }}>
                                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                                            <div>
                                                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                                                    <span style={{ fontSize: "11px", color: dm ? '#ccc' : '#555' }}>Scale</span>
                                                    <span style={{ fontSize: "11px", fontWeight: 700, color: "#6c63ff" }}>{Math.round(logoScale * 100)}%</span>
                                                </div>
                                                <SmoothSlider min={0.05} max={0.50} step={0.01} value={logoScale} defaultValue={0.15} onChange={v => { setLogoScale(v); setLogoScalePortrait(Math.min(0.6, v * 1.4)); }} />
                                            </div>
                                            <div>
                                                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                                                    <span style={{ fontSize: "11px", color: dm ? '#ccc' : '#555' }}>Opacity</span>
                                                    <span style={{ fontSize: "11px", fontWeight: 700, color: "#6c63ff" }}>{Math.round(logoOpacity * 100)}%</span>
                                                </div>
                                                <SmoothSlider min={0.1} max={1.0} step={0.05} value={logoOpacity} defaultValue={0.7} onChange={setLogoOpacity} />
                                            </div>
                                        </div>
                                        <div>
                                            <span style={{ fontSize: "11px", color: dm ? '#ccc' : '#555', display: "block", marginBottom: "4px" }}>Corner Anchor</span>
                                            <select value={logoPos} onChange={e => { setLogoPos(e.target.value); setLogoX(null); setLogoY(null); }}
                                                style={{ width: "100%", padding: "7px 10px", border: `1.5px solid ${cardBdr}`, borderRadius: "8px", fontSize: "12px", outline: "none", background: dm ? '#1a1a1a' : '#fff', color: dm ? '#ddd' : '#1a1a1a', fontFamily: "inherit" }}>
                                                <option value="bottom-right">Bottom-Right</option>
                                                <option value="bottom-left">Bottom-Left</option>
                                                <option value="bottom-center">Bottom-Center</option>
                                                <option value="top-right">Top-Right</option>
                                                <option value="top-left">Top-Left</option>
                                                <option value="top-center">Top-Center</option>
                                                <option value="center">Center</option>
                                            </select>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
