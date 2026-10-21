import { useRef } from "react";
import { SL, Empty, SmoothSlider } from "../ui/common";
import { FONTS, PHOTOROOM_BADGE_PRESETS, PHOTOROOM_TEXT_PRESETS } from "../../constants";

export function OverlayPanel({
    image,
    texts,
    setTexts,
    selText,
    setSelText,
    addText,
    deleteText,
    updateText,
    bgStatus,
    bgMode,
    onJumpToAiStudio,
    dm,
    cardBg,
    cardBdr,
    inputSt
}) {
    const graphicInputRef = useRef(null);
    const selectedLayer = texts.find(t => t.id === selText);

    if (!image) return <Empty>Upload a photo first</Empty>;

    const addPresetLayer = (preset, isBadge = false) => {
        const id = Date.now() + Math.floor(Math.random() * 1000);
        const newLayer = {
            id,
            type: isBadge ? "badge" : "text",
            content: preset.content,
            x: isBadge ? 24 : 50,
            y: isBadge ? 16 : 50,
            fontSize: preset.fontSize || 42,
            color: preset.color || "#ffffff",
            font: preset.font || "Montserrat",
            bold: preset.bold !== undefined ? preset.bold : true,
            italic: !!preset.italic,
            stroke: !!preset.stroke,
            shadow: preset.shadow !== undefined ? preset.shadow : true,
            bgEnabled: !!preset.bgEnabled,
            bgColor: preset.bgColor || "#ef4444",
            bgRadius: preset.bgRadius !== undefined ? preset.bgRadius : 12,
            opacity: 1,
            rotation: 0,
            visible: true
        };
        if (setTexts) {
            setTexts(prev => [...prev, newLayer]);
        }
        setSelText(id);
    };

    const handleGraphicUpload = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            const id = Date.now() + Math.floor(Math.random() * 1000);
            const newLayer = {
                id,
                type: "graphic",
                content: file.name.replace(/\.[^.]+$/, "") || "Graphic Layer",
                imageSrc: ev.target.result,
                x: 50,
                y: 50,
                fontSize: 90,
                color: "#ffffff",
                font: "System",
                bold: false,
                italic: false,
                stroke: false,
                shadow: true,
                bgEnabled: false,
                bgColor: "#000000",
                bgRadius: 12,
                opacity: 1,
                rotation: 0,
                visible: true
            };
            if (setTexts) {
                setTexts(prev => [...prev, newLayer]);
            }
            setSelText(id);
        };
        reader.readAsDataURL(file);
        e.target.value = "";
    };

    const duplicateLayer = (layer) => {
        if (!setTexts) return;
        const id = Date.now() + Math.floor(Math.random() * 1000);
        const copy = {
            ...layer,
            id,
            x: Math.min(90, (layer.x || 50) + 5),
            y: Math.min(90, (layer.y || 50) + 5)
        };
        setTexts(prev => [...prev, copy]);
        setSelText(id);
    };

    const moveLayerOrder = (id, dir) => {
        if (!setTexts) return;
        setTexts(prev => {
            const idx = prev.findIndex(t => t.id === id);
            if (idx === -1) return prev;
            const targetIdx = idx + dir;
            if (targetIdx < 0 || targetIdx >= prev.length) return prev;
            const next = [...prev];
            const [item] = next.splice(idx, 1);
            next.splice(targetIdx, 0, item);
            return next;
        });
    };

    // Visual stack shows top-most layer first (end of `texts` array)
    const visualLayers = [...texts].reverse();

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            {/* ── 1. QUICK ADD LAYER BAR ── */}
            <div style={{ padding: "14px", background: cardBg, border: `1.5px solid ${cardBdr}`, borderRadius: "12px", display: "flex", flexDirection: "column", gap: "12px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <SL style={{ margin: 0 }}>Add Composition Layer</SL>
                    <span style={{ fontSize: "10px", fontWeight: 700, color: "#6c63ff" }}>{texts.length + (bgStatus === "done" ? 2 : 1)} Layers</span>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                    <button
                        onClick={addText}
                        style={{
                            padding: "10px",
                            background: "linear-gradient(135deg, #6c63ff, #8b5cf6)",
                            color: "#fff",
                            border: "none",
                            borderRadius: "10px",
                            fontSize: "12px",
                            fontWeight: 800,
                            cursor: "pointer",
                            fontFamily: "inherit",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: "6px",
                            boxShadow: "0 3px 10px rgba(108,99,255,0.25)"
                        }}
                    >
                        <span>✍️</span>
                        <span>+ Add Text</span>
                    </button>
                    <button
                        onClick={() => graphicInputRef.current?.click()}
                        style={{
                            padding: "10px",
                            background: dm ? "#1e1e1e" : "#fff",
                            color: dm ? "#e4e4e7" : "#1f2937",
                            border: `1.5px solid ${cardBdr}`,
                            borderRadius: "10px",
                            fontSize: "12px",
                            fontWeight: 800,
                            cursor: "pointer",
                            fontFamily: "inherit",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: "6px"
                        }}
                    >
                        <span>🖼️</span>
                        <span>+ Graphic / Logo</span>
                    </button>
                    <input ref={graphicInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleGraphicUpload} />
                </div>

                {/* 1-Click Photoroom Promo Badges */}
                <div>
                    <div style={{ fontSize: "10.5px", fontWeight: 700, color: "#aaa", textTransform: "uppercase", letterSpacing: ".05em", marginBottom: "6px" }}>
                        🏷️ 1-Click Promo & Sale Badges
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px" }}>
                        {PHOTOROOM_BADGE_PRESETS.map(b => (
                            <button
                                key={b.id}
                                onClick={() => addPresetLayer(b, true)}
                                style={{
                                    padding: "7px 8px",
                                    borderRadius: "8px",
                                    border: `1px solid ${cardBdr}`,
                                    background: dm ? "#1e1e1e" : "#fff",
                                    cursor: "pointer",
                                    fontFamily: "inherit",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                    gap: "6px",
                                    textAlign: "left"
                                }}
                            >
                                <span style={{ fontSize: "11px", fontWeight: 700, color: dm ? "#e4e4e7" : "#333", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                    {b.label}
                                </span>
                                <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: b.bgColor, border: "1px solid rgba(0,0,0,0.15)", flexShrink: 0 }} />
                            </button>
                        ))}
                    </div>
                </div>

                {/* Typography Templates */}
                <div>
                    <div style={{ fontSize: "10.5px", fontWeight: 700, color: "#aaa", textTransform: "uppercase", letterSpacing: ".05em", marginBottom: "6px" }}>
                        ✨ Typography Combos
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px" }}>
                        {PHOTOROOM_TEXT_PRESETS.map(tp => (
                            <button
                                key={tp.id}
                                onClick={() => addPresetLayer(tp, false)}
                                style={{
                                    padding: "7px 8px",
                                    borderRadius: "8px",
                                    border: `1px solid ${cardBdr}`,
                                    background: dm ? "#1e1e1e" : "#fff",
                                    cursor: "pointer",
                                    fontFamily: "inherit",
                                    fontSize: "11px",
                                    fontWeight: 700,
                                    color: dm ? "#ccc" : "#444",
                                    textAlign: "left"
                                }}
                            >
                                {tp.name}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* ── 2. VISUAL PHOTOROOM LAYER STACK ── */}
            <div style={{ padding: "14px", background: cardBg, border: `1.5px solid ${cardBdr}`, borderRadius: "12px", display: "flex", flexDirection: "column", gap: "8px" }}>
                <SL style={{ margin: 0 }}>Layer Stack (Top → Bottom)</SL>

                {visualLayers.map((layer) => {
                    const isSelected = selText === layer.id;
                    const isVisible = layer.visible !== false;
                    const icon = layer.type === "graphic" ? "🖼️" : layer.bgEnabled ? "🏷️" : "✍️";
                    return (
                        <div
                            key={layer.id}
                            onClick={() => setSelText(layer.id)}
                            style={{
                                padding: "8px 10px",
                                border: `1.5px solid ${isSelected ? "#6c63ff" : cardBdr}`,
                                background: isSelected ? (dm ? "#1e1a3a" : "#faf9ff") : (dm ? "#1e1e1e" : "#fff"),
                                borderRadius: "10px",
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                gap: "8px",
                                opacity: isVisible ? 1 : 0.5,
                                transition: "all .15s"
                            }}
                        >
                            <button
                                onClick={e => { e.stopPropagation(); updateText(layer.id, "visible", !isVisible); }}
                                style={{ background: "none", border: "none", cursor: "pointer", fontSize: "13px", padding: "2px" }}
                                title={isVisible ? "Hide Layer" : "Show Layer"}
                            >
                                {isVisible ? "👁️" : "🚫"}
                            </button>
                            <span style={{ fontSize: "13px" }}>{icon}</span>
                            <span style={{ flex: 1, fontSize: "12px", fontWeight: 700, color: dm ? "#e4e4e7" : "#1f2937", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                {layer.content || "Layer"}
                            </span>
                            <div style={{ display: "flex", alignItems: "center", gap: "3px" }} onClick={e => e.stopPropagation()}>
                                <button
                                    onClick={() => moveLayerOrder(layer.id, 1)}
                                    style={{ background: dm ? "#2a2a2a" : "#f2f2f8", border: "none", borderRadius: "5px", padding: "3px 6px", fontSize: "10px", cursor: "pointer", color: dm ? "#ccc" : "#555", fontWeight: 800 }}
                                    title="Bring Forward"
                                >
                                    ↑
                                </button>
                                <button
                                    onClick={() => moveLayerOrder(layer.id, -1)}
                                    style={{ background: dm ? "#2a2a2a" : "#f2f2f8", border: "none", borderRadius: "5px", padding: "3px 6px", fontSize: "10px", cursor: "pointer", color: dm ? "#ccc" : "#555", fontWeight: 800 }}
                                    title="Send Backward"
                                >
                                    ↓
                                </button>
                                <button
                                    onClick={() => duplicateLayer(layer)}
                                    style={{ background: dm ? "#2a2a2a" : "#f2f2f8", border: "none", borderRadius: "5px", padding: "3px 6px", fontSize: "10px", cursor: "pointer", color: "#6c63ff", fontWeight: 800 }}
                                    title="Duplicate Layer"
                                >
                                    ⧉
                                </button>
                                <button
                                    onClick={() => deleteText(layer.id)}
                                    style={{ background: "#fee2e2", border: "none", borderRadius: "5px", padding: "3px 6px", fontSize: "10px", color: "#ef4444", cursor: "pointer", fontWeight: 800 }}
                                    title="Delete Layer"
                                >
                                    ✕
                                </button>
                            </div>
                        </div>
                    );
                })}

                {/* Base Subject & Background Layers */}
                {bgStatus === "done" && (
                    <div
                        onClick={onJumpToAiStudio}
                        style={{
                            padding: "8px 10px",
                            border: `1.5px dashed ${cardBdr}`,
                            background: dm ? "rgba(108,99,255,0.06)" : "#f9f8ff",
                            borderRadius: "10px",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: "8px"
                        }}
                    >
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <span style={{ fontSize: "13px" }}>🧍</span>
                            <span style={{ fontSize: "12px", fontWeight: 700, color: dm ? "#ddd" : "#333" }}>Subject Cutout (AI Isolated)</span>
                        </div>
                        <span style={{ fontSize: "10px", fontWeight: 700, color: "#6c63ff" }}>Edit in AI Studio →</span>
                    </div>
                )}

                <div
                    onClick={onJumpToAiStudio}
                    style={{
                        padding: "8px 10px",
                        border: `1px solid ${cardBdr}`,
                        background: dm ? "#1a1a1a" : "#f4f4f8",
                        borderRadius: "10px",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: "8px"
                    }}
                >
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span style={{ fontSize: "13px" }}>🏞️</span>
                        <span style={{ fontSize: "12px", fontWeight: 600, color: dm ? "#aaa" : "#555" }}>
                            {bgStatus === "done" ? `Studio Backdrop (${bgMode})` : "Original Photo Layer"}
                        </span>
                    </div>
                    <span style={{ fontSize: "10px", fontWeight: 700, color: "#6c63ff" }}>Change BG →</span>
                </div>
            </div>

            {/* ── 3. SELECTED LAYER INSPECTOR ── */}
            {selectedLayer && (
                <div style={{ padding: "14px", background: cardBg, border: `1.5px solid #6c63ff`, borderRadius: "12px", display: "flex", flexDirection: "column", gap: "12px", animation: "fadein .2s" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <SL style={{ margin: 0 }}>
                            {selectedLayer.type === "graphic" ? "🖼️ Graphic Layer Properties" : "✍️ Text & Badge Properties"}
                        </SL>
                        <span style={{ fontSize: "10px", color: "#6c63ff", fontWeight: 700 }}>Drag on canvas to move</span>
                    </div>

                    {/* Smart 6-Way Canvas Alignment Bar */}
                    <div>
                        <span style={{ fontSize: "10.5px", fontWeight: 700, color: "#aaa", textTransform: "uppercase", letterSpacing: ".05em", display: "block", marginBottom: "5px" }}>
                            Quick Canvas Align
                        </span>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: "4px" }}>
                            {[
                                { l: "⇤", title: "Align Left", fn: () => updateText(selText, "x", 18) },
                                { l: "↔", title: "Center Horizontally", fn: () => updateText(selText, "x", 50) },
                                { l: "⇥", title: "Align Right", fn: () => updateText(selText, "x", 82) },
                                { l: "⇡", title: "Align Top", fn: () => updateText(selText, "y", 14) },
                                { l: "↕", title: "Center Vertically", fn: () => updateText(selText, "y", 50) },
                                { l: "⇣", title: "Align Bottom", fn: () => updateText(selText, "y", 86) }
                            ].map((a, idx) => (
                                <button
                                    key={idx}
                                    onClick={a.fn}
                                    title={a.title}
                                    style={{
                                        padding: "7px 0",
                                        border: `1px solid ${cardBdr}`,
                                        background: dm ? "#1e1e1e" : "#fff",
                                        borderRadius: "7px",
                                        fontSize: "13px",
                                        fontWeight: 700,
                                        cursor: "pointer",
                                        color: dm ? "#ddd" : "#444"
                                    }}
                                >
                                    {a.l}
                                </button>
                            ))}
                        </div>
                    </div>

                    {selectedLayer.type !== "graphic" && (
                        <>
                            <div>
                                <span style={{ fontSize: "10.5px", fontWeight: 700, color: "#aaa", textTransform: "uppercase", letterSpacing: ".05em", display: "block", marginBottom: "5px" }}>
                                    Text Content
                                </span>
                                <input value={selectedLayer.content} onChange={e => updateText(selText, "content", e.target.value)} style={inputSt} />
                            </div>

                            <div style={{ display: "grid", gridTemplateColumns: "1fr 80px", gap: "10px" }}>
                                <div>
                                    <span style={{ fontSize: "10.5px", fontWeight: 700, color: "#aaa", textTransform: "uppercase", letterSpacing: ".05em", display: "block", marginBottom: "5px" }}>
                                        Font Family
                                    </span>
                                    <select value={selectedLayer.font} onChange={e => updateText(selText, "font", e.target.value)} style={inputSt}>
                                        {FONTS.map(f => <option key={f}>{f}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <span style={{ fontSize: "10.5px", fontWeight: 700, color: "#aaa", textTransform: "uppercase", letterSpacing: ".05em", display: "block", marginBottom: "5px" }}>
                                        Text Color
                                    </span>
                                    <input
                                        type="color"
                                        value={selectedLayer.color}
                                        onChange={e => updateText(selText, "color", e.target.value)}
                                        style={{ width: "100%", height: "35px", border: `1.5px solid ${cardBdr}`, borderRadius: "8px", cursor: "pointer" }}
                                    />
                                </div>
                            </div>

                            {/* Background Pill / Badge Box Controls */}
                            <div style={{ padding: "10px", background: dm ? "#1e1e1e" : "#fff", border: `1px solid ${cardBdr}`, borderRadius: "10px", display: "flex", flexDirection: "column", gap: "8px" }}>
                                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                    <span style={{ fontSize: "12px", fontWeight: 700, color: dm ? "#e4e4e7" : "#333" }}>🏷️ Background Pill / Badge Box</span>
                                    <input
                                        type="checkbox"
                                        checked={!!selectedLayer.bgEnabled}
                                        onChange={e => updateText(selText, "bgEnabled", e.target.checked)}
                                        style={{ width: "17px", height: "17px", accentColor: "#6c63ff", cursor: "pointer" }}
                                    />
                                </div>
                                {selectedLayer.bgEnabled && (
                                    <div style={{ display: "grid", gridTemplateColumns: "80px 1fr", gap: "10px", alignItems: "center" }}>
                                        <div>
                                            <span style={{ fontSize: "10px", color: "#aaa", fontWeight: 700, display: "block", marginBottom: "3px" }}>Fill Color</span>
                                            <input
                                                type="color"
                                                value={selectedLayer.bgColor || "#ef4444"}
                                                onChange={e => updateText(selText, "bgColor", e.target.value)}
                                                style={{ width: "100%", height: "30px", border: `1px solid ${cardBdr}`, borderRadius: "6px", cursor: "pointer" }}
                                            />
                                        </div>
                                        <div>
                                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "3px" }}>
                                                <span style={{ fontSize: "10px", color: "#aaa", fontWeight: 700 }}>Corner Shape</span>
                                                <span style={{ fontSize: "10px", color: "#6c63ff", fontWeight: 700 }}>{selectedLayer.bgRadius ?? 12}px</span>
                                            </div>
                                            <SmoothSlider min={0} max={60} step={2} value={selectedLayer.bgRadius ?? 12} defaultValue={12} onChange={v => updateText(selText, "bgRadius", v)} />
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Typography Style Buttons */}
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "6px" }}>
                                {[
                                    { k: "bold", l: "B Bold" },
                                    { k: "italic", l: "I Italic" },
                                    { k: "stroke", l: "Outline" },
                                    { k: "shadow", l: "Shadow" }
                                ].map(o => (
                                    <button
                                        key={o.k}
                                        onClick={() => updateText(selText, o.k, !selectedLayer[o.k])}
                                        style={{
                                            padding: "7px 4px",
                                            border: `1.5px solid ${selectedLayer[o.k] ? "#6c63ff" : cardBdr}`,
                                            background: selectedLayer[o.k] ? (dm ? "#1e1a3a" : "#faf9ff") : (dm ? "#1e1e1e" : "#fff"),
                                            borderRadius: "8px",
                                            fontSize: "11px",
                                            fontWeight: 700,
                                            cursor: "pointer",
                                            color: selectedLayer[o.k] ? "#6c63ff" : (dm ? "#ccc" : "#666"),
                                            fontFamily: "inherit"
                                        }}
                                    >
                                        {o.l}
                                    </button>
                                ))}
                            </div>
                        </>
                    )}

                    {/* Size, Rotation & Opacity */}
                    <div>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                            <span style={{ fontSize: "11.5px", fontWeight: 600, color: dm ? "#ccc" : "#555" }}>
                                {selectedLayer.type === "graphic" ? "Graphic Scale" : "Font Size"}
                            </span>
                            <span style={{ fontSize: "11.5px", color: "#6c63ff", fontWeight: 700 }}>{selectedLayer.fontSize}px</span>
                        </div>
                        <SmoothSlider min={14} max={220} step={2} value={selectedLayer.fontSize} defaultValue={48} onChange={v => updateText(selText, "fontSize", v)} />
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                        <div>
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                                <span style={{ fontSize: "11.5px", fontWeight: 600, color: dm ? "#ccc" : "#555" }}>Rotation</span>
                                <span style={{ fontSize: "11.5px", color: "#6c63ff", fontWeight: 700 }}>{selectedLayer.rotation || 0}°</span>
                            </div>
                            <SmoothSlider min={-180} max={180} step={1} value={selectedLayer.rotation || 0} defaultValue={0} onChange={v => updateText(selText, "rotation", v)} />
                        </div>
                        <div>
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                                <span style={{ fontSize: "11.5px", fontWeight: 600, color: dm ? "#ccc" : "#555" }}>Opacity</span>
                                <span style={{ fontSize: "11.5px", color: "#6c63ff", fontWeight: 700 }}>{Math.round((selectedLayer.opacity ?? 1) * 100)}%</span>
                            </div>
                            <SmoothSlider min={10} max={100} step={5} value={Math.round((selectedLayer.opacity ?? 1) * 100)} defaultValue={100} onChange={v => updateText(selText, "opacity", v / 100)} />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
