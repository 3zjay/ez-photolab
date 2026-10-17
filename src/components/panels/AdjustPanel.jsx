import { useState } from "react";
import { SL, Empty, AB, SmoothSlider } from "../ui/common";
import { PHOTOROOM_CANVAS_PRESETS, BG_COLORS } from "../../constants";

const ASPECT_OPTIONS = [
    { id: "free", label: "✦ Free", desc: "Custom" },
    { id: "1:1", label: "1:1", desc: "Square" },
    { id: "4:5", label: "4:5", desc: "IG Feed" },
    { id: "9:16", label: "9:16", desc: "Story" },
    { id: "16:9", label: "16:9", desc: "Wide" },
    { id: "4:3", label: "4:3", desc: "Photo" },
    { id: "3:4", label: "3:4", desc: "Portrait" },
    { id: "2:3", label: "2:3", desc: "Classic" }
];

export function AdjustPanel({
    image,
    imgRef,
    setRotation,
    setFlipH,
    setFlipV,
    rotation,
    flipH,
    flipV,
    cropMode,
    setCropMode,
    cropBox,
    setCropBox,
    cropAspect,
    setCropAspect,
    applyCrop,
    applyCanvasPreset,
    dm,
    cardBg,
    cardBdr
}) {
    const [mode, setMode] = useState("crop"); // "crop" | "canvas"
    const [selectedPreset, setSelectedPreset] = useState("shopify_sq");
    const [canvasPadding, setCanvasPadding] = useState(8);
    const [canvasFillMode, setCanvasFillMode] = useState("color"); // "color" | "transparent" | "blur"
    const [canvasFillColor, setCanvasFillColor] = useState("#ffffff");

    const imgEl = imgRef?.current;
    const natW = imgEl?.naturalWidth || 0;
    const natH = imgEl?.naturalHeight || 0;
    const cropPxW = natW ? Math.max(1, Math.round((natW * (cropBox?.w || 100)) / 100)) : 0;
    const cropPxH = natH ? Math.max(1, Math.round((natH * (cropBox?.h || 100)) / 100)) : 0;

    const setCropAspectRatio = (ratio) => {
        setCropAspect(ratio);
        setCropMode(true);
        if (ratio === "free") return;
        const [aw, ah] = ratio.split(":").map(Number);
        const imgW = imgEl?.naturalWidth || 1;
        const imgH = imgEl?.naturalHeight || 1;
        const imgAspect = imgW / imgH;
        const targetAspect = aw / ah;
        let w, h;
        if (imgAspect > targetAspect) {
            h = 90;
            w = (targetAspect / imgAspect) * 90;
        } else {
            w = 90;
            h = (imgAspect / targetAspect) * 90;
        }
        w = Math.min(100, Math.max(10, w));
        h = Math.min(100, Math.max(10, h));
        setCropBox({ x: (100 - w) / 2, y: (100 - h) / 2, w, h });
    };

    if (!image) return <Empty>Upload a photo first</Empty>;

    const activePresetObj = PHOTOROOM_CANVAS_PRESETS.find(p => p.id === selectedPreset) || PHOTOROOM_CANVAS_PRESETS[0];

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            {/* Mode Switcher: Interactive Crop vs Photoroom Smart Resize */}
            <div style={{ display: "flex", gap: "4px", background: dm ? "#252525" : "#f2f2f8", padding: "4px", borderRadius: "10px" }}>
                <button
                    onClick={() => { setMode("crop"); setCropMode(true); }}
                    style={{
                        flex: 1, padding: "8px 6px", fontSize: "11.5px", fontWeight: 700, border: "none", cursor: "pointer",
                        fontFamily: "inherit", borderRadius: "8px",
                        background: mode === "crop" ? (dm ? "#3a3a3a" : "#fff") : "transparent",
                        color: mode === "crop" ? "#6c63ff" : (dm ? "#aaa" : "#666"),
                        boxShadow: mode === "crop" ? "0 1px 4px rgba(0,0,0,.1)" : "none",
                        transition: "all .15s"
                    }}
                >
                    ✂ Interactive Crop
                </button>
                <button
                    onClick={() => { setMode("canvas"); setCropMode(false); }}
                    style={{
                        flex: 1, padding: "8px 6px", fontSize: "11.5px", fontWeight: 700, border: "none", cursor: "pointer",
                        fontFamily: "inherit", borderRadius: "8px",
                        background: mode === "canvas" ? (dm ? "#3a3a3a" : "#fff") : "transparent",
                        color: mode === "canvas" ? "#6c63ff" : (dm ? "#aaa" : "#666"),
                        boxShadow: mode === "canvas" ? "0 1px 4px rgba(0,0,0,.1)" : "none",
                        transition: "all .15s"
                    }}
                >
                    🛍️ Smart Canvas Size
                </button>
            </div>

            {mode === "crop" && (
                <>
                    {/* Interactive Crop Card */}
                    <div style={{ padding: "14px", background: cardBg, border: `1.5px solid ${cardBdr}`, borderRadius: "12px", display: "flex", flexDirection: "column", gap: "12px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <SL style={{ margin: 0 }}>Aspect Ratio</SL>
                            {cropPxW > 0 && (
                                <span style={{ fontSize: "11px", fontWeight: 700, color: "#6c63ff", background: dm ? "rgba(108,99,255,0.14)" : "#f0eeff", padding: "3px 8px", borderRadius: "12px" }}>
                                    {cropPxW} × {cropPxH} px
                                </span>
                            )}
                        </div>

                        <p style={{ fontSize: "11px", color: dm ? "#aaa" : "#666", margin: 0, lineHeight: 1.45 }}>
                            Drag inside the crop box to pan, or drag any of the <strong>8 corner/edge handles</strong> on the photo to resize.
                        </p>

                        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: "6px" }}>
                            {ASPECT_OPTIONS.map(r => {
                                const active = cropAspect === r.id && cropMode;
                                return (
                                    <button
                                        key={r.id}
                                        onClick={() => setCropAspectRatio(r.id)}
                                        style={{
                                            padding: "8px 4px",
                                            border: `1.5px solid ${active ? "#6c63ff" : cardBdr}`,
                                            background: active ? (dm ? "#1e1a3a" : "#faf9ff") : (dm ? "#1e1e1e" : "#fff"),
                                            borderRadius: "8px",
                                            cursor: "pointer",
                                            fontFamily: "inherit",
                                            display: "flex",
                                            flexDirection: "column",
                                            alignItems: "center",
                                            gap: "2px",
                                            transition: "all .15s"
                                        }}
                                    >
                                        <span style={{ fontSize: "11.5px", fontWeight: 800, color: active ? "#6c63ff" : (dm ? "#e4e4e7" : "#333") }}>{r.label}</span>
                                        <span style={{ fontSize: "9.5px", color: active ? "#a78bfa" : "#999" }}>{r.desc}</span>
                                    </button>
                                );
                            })}
                        </div>

                        {!cropMode ? (
                            <AB onClick={() => setCropMode(true)} color="purple" textColor="#fff" style={{ width: "100%", padding: "11px" }}>
                                ✂ Activate Crop Frame
                            </AB>
                        ) : (
                            <div style={{ display: "flex", gap: "8px" }}>
                                <AB onClick={applyCrop} color="purple" textColor="#fff" style={{ flex: 2, padding: "11px" }}>
                                    ✓ Apply Crop ({cropPxW}×{cropPxH})
                                </AB>
                                <AB
                                    onClick={() => {
                                        setCropBox({ x: 0, y: 0, w: 100, h: 100 });
                                        setCropAspect("free");
                                    }}
                                    color={dm ? "#333" : "#f2f2f8"}
                                    textColor={dm ? "#ccc" : "#666"}
                                    style={{ flex: 1, padding: "11px" }}
                                >
                                    ↺ Full
                                </AB>
                            </div>
                        )}
                    </div>

                    {/* Rotate & Flip Card */}
                    <div style={{ padding: "14px", background: cardBg, border: `1.5px solid ${cardBdr}`, borderRadius: "12px", display: "flex", flexDirection: "column", gap: "12px" }}>
                        <SL style={{ margin: 0 }}>Rotate, Straighten & Flip</SL>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: "6px" }}>
                            {[
                                { l: "↺ -90°", a: () => setRotation(r => (r - 90 + 360) % 360) },
                                { l: "↻ +90°", a: () => setRotation(r => (r + 90) % 360) },
                                { l: "↔ Flip H", a: () => setFlipH(v => !v), active: flipH },
                                { l: "↕ Flip V", a: () => setFlipV(v => !v), active: flipV }
                            ].map(b => (
                                <button
                                    key={b.l}
                                    onClick={b.a}
                                    style={{
                                        padding: "9px 4px",
                                        border: `1.5px solid ${b.active ? "#6c63ff" : cardBdr}`,
                                        background: b.active ? (dm ? "#1e1a3a" : "#faf9ff") : (dm ? "#1e1e1e" : "#fff"),
                                        borderRadius: "8px",
                                        fontSize: "11px",
                                        fontWeight: 700,
                                        cursor: "pointer",
                                        color: b.active ? "#6c63ff" : (dm ? "#ccc" : "#555"),
                                        fontFamily: "inherit"
                                    }}
                                >
                                    {b.l}
                                </button>
                            ))}
                        </div>
                        <div>
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "5px" }}>
                                <span style={{ fontSize: "12px", fontWeight: 600, color: rotation !== 0 ? "#6c63ff" : (dm ? "#ccc" : "#666") }}>Fine Straighten Angle</span>
                                <span style={{ fontSize: "12px", fontWeight: 700, color: "#6c63ff", fontVariantNumeric: "tabular-nums" }}>{rotation}°</span>
                            </div>
                            <SmoothSlider min={-180} max={180} step={1} value={rotation} defaultValue={0} onChange={setRotation} />
                            {rotation !== 0 && (
                                <button
                                    onClick={() => setRotation(0)}
                                    style={{ marginTop: "6px", fontSize: "11px", color: "#6c63ff", background: "none", border: "none", cursor: "pointer", fontWeight: 700 }}
                                >
                                    ↺ Reset angle to 0°
                                </button>
                            )}
                        </div>
                    </div>
                </>
            )}

            {mode === "canvas" && (
                <div style={{ padding: "14px", background: cardBg, border: `1.5px solid ${cardBdr}`, borderRadius: "12px", display: "flex", flexDirection: "column", gap: "12px" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <SL style={{ margin: 0 }}>Photoroom Marketplace Templates</SL>
                        <span style={{ fontSize: "10px", fontWeight: 700, padding: "2px 7px", background: "rgba(108,99,255,0.12)", color: "#6c63ff", borderRadius: "10px" }}>SMART FIT</span>
                    </div>
                    <p style={{ fontSize: "11px", color: dm ? "#aaa" : "#666", margin: 0, lineHeight: 1.45 }}>
                        Automatically fits and centers your product or portrait onto exact e-commerce and social media canvas dimensions without stretching.
                    </p>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                        {PHOTOROOM_CANVAS_PRESETS.filter(p => p.id !== "original").map(p => {
                            const active = selectedPreset === p.id;
                            return (
                                <button
                                    key={p.id}
                                    onClick={() => setSelectedPreset(p.id)}
                                    style={{
                                        padding: "10px",
                                        borderRadius: "10px",
                                        border: `1.5px solid ${active ? "#6c63ff" : cardBdr}`,
                                        background: active ? (dm ? "#1e1a3a" : "#faf9ff") : (dm ? "#1e1e1e" : "#fff"),
                                        textAlign: "left",
                                        cursor: "pointer",
                                        fontFamily: "inherit",
                                        display: "flex",
                                        flexDirection: "column",
                                        gap: "3px",
                                        transition: "all .15s"
                                    }}
                                >
                                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                        <span style={{ fontSize: "12px", fontWeight: 800, color: active ? "#6c63ff" : (dm ? "#f3f4f6" : "#1f2937") }}>
                                            {p.icon} {p.name}
                                        </span>
                                        <span style={{ fontSize: "9.5px", fontWeight: 700, color: "#a78bfa" }}>{p.ratio}</span>
                                    </div>
                                    <span style={{ fontSize: "10px", color: dm ? "#9ca3af" : "#666" }}>{p.desc}</span>
                                </button>
                            );
                        })}
                    </div>

                    {/* Subject Margin / Padding */}
                    <div>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "5px" }}>
                            <span style={{ fontSize: "12px", fontWeight: 600, color: dm ? "#ccc" : "#555" }}>Subject Margin / Breathing Room</span>
                            <span style={{ fontSize: "12px", fontWeight: 700, color: "#6c63ff" }}>{canvasPadding}%</span>
                        </div>
                        <SmoothSlider min={0} max={35} step={1} value={canvasPadding} defaultValue={8} onChange={setCanvasPadding} />
                    </div>

                    {/* Canvas Fill Background */}
                    <div>
                        <span style={{ fontSize: "11px", fontWeight: 700, color: "#aaa", textTransform: "uppercase", letterSpacing: ".05em", display: "block", marginBottom: "6px" }}>
                            Canvas Fill Style
                        </span>
                        <div style={{ display: "flex", gap: "6px", marginBottom: "8px" }}>
                            {[
                                { id: "color", label: "🎨 Solid Color" },
                                { id: "transparent", label: "◻ Transparent" },
                                { id: "blur", label: "✦ Blur Fill" }
                            ].map(f => (
                                <button
                                    key={f.id}
                                    onClick={() => setCanvasFillMode(f.id)}
                                    style={{
                                        flex: 1,
                                        padding: "7px 4px",
                                        borderRadius: "8px",
                                        border: `1.5px solid ${canvasFillMode === f.id ? "#6c63ff" : cardBdr}`,
                                        background: canvasFillMode === f.id ? (dm ? "#1e1a3a" : "#faf9ff") : (dm ? "#1e1e1e" : "#fff"),
                                        color: canvasFillMode === f.id ? "#6c63ff" : (dm ? "#ccc" : "#555"),
                                        fontSize: "11px",
                                        fontWeight: 700,
                                        cursor: "pointer",
                                        fontFamily: "inherit"
                                    }}
                                >
                                    {f.label}
                                </button>
                            ))}
                        </div>

                        {canvasFillMode === "color" && (
                            <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                                {BG_COLORS.slice(0, 10).map(c => (
                                    <div
                                        key={c}
                                        onClick={() => setCanvasFillColor(c)}
                                        style={{
                                            width: "24px",
                                            height: "24px",
                                            borderRadius: "6px",
                                            background: c,
                                            border: `2px solid ${canvasFillColor === c ? "#6c63ff" : "#ccc"}`,
                                            cursor: "pointer"
                                        }}
                                    />
                                ))}
                                <input
                                    type="color"
                                    value={canvasFillColor}
                                    onChange={e => setCanvasFillColor(e.target.value)}
                                    style={{ width: "32px", height: "26px", border: `1px solid ${cardBdr}`, borderRadius: "6px", cursor: "pointer", marginLeft: "auto" }}
                                />
                            </div>
                        )}
                    </div>

                    <AB
                        onClick={() => applyCanvasPreset && applyCanvasPreset(activePresetObj, canvasPadding, canvasFillMode, canvasFillColor)}
                        color="purple"
                        textColor="#fff"
                        style={{ width: "100%", padding: "11px", fontSize: "12.5px" }}
                    >
                        ✓ Resize Canvas to {activePresetObj.w} × {activePresetObj.h} px
                    </AB>
                </div>
            )}
        </div>
    );
}
