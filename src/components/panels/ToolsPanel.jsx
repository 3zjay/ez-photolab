import { SL, Empty, Row, Spin, PBar, AB, SmoothSlider } from "../ui/common";

export function ToolsPanel({
    image,
    cardBdr,
    cardBg,
    dm,
    saveFile,
    aiRemoveBrush,
    setAiRemoveBrush,
    toCSSFilter,
    filters,
    initMaskCanvas,
    maskCanvasRef,
    maskDrawingRef,
    drawMask,
    aiMaskReady,
    handleAiRemove,
    aiRemoveStatus,
    aiRemoveLog,
    aiRemoveResult,
    applyAiResult,
    eraseMode,
    setEraseMode,
    canUndoErase,
    handleUndoErase
}) {
    if (!image) return <Empty>Upload a photo first</Empty>;

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            {/* ── PHOTOROOM MAGIC RETOUCH / OBJECT ERASER ── */}
            <div style={{ padding: "14px", background: cardBg, border: `1.5px solid ${cardBdr}`, borderRadius: "12px", display: "flex", flexDirection: "column", gap: "12px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "6px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <span style={{ fontSize: "13.5px", fontWeight: 800, color: dm ? "#f3f4f6" : "#1f2937" }}>🧹 Magic Retouch & Eraser</span>
                    </div>
                    <span style={{ fontSize: "9.5px", fontWeight: 800, padding: "2px 8px", background: "#f0fff4", color: "#16a34a", borderRadius: "20px", border: "1px solid #86efac" }}>
                        FREE • INSTANT ON-DEVICE
                    </span>
                </div>

                <p style={{ fontSize: "11px", color: dm ? "#aaa" : "#666", lineHeight: 1.5, margin: 0 }}>
                    Brush over unwanted objects, blemishes, text, photobombers, or dust spots. Context-aware harmonic inpainting seamlessly reconstructs the background.
                </p>

                {/* Paint on Main Canvas Toggle */}
                <button
                    onClick={() => setEraseMode && setEraseMode(!eraseMode)}
                    style={{
                        width: "100%",
                        padding: "10px 12px",
                        borderRadius: "10px",
                        border: `1.5px solid ${eraseMode ? "#f59e0b" : cardBdr}`,
                        background: eraseMode ? (dm ? "rgba(245, 158, 11, 0.16)" : "#fffbeb") : (dm ? "#1e1e1e" : "#fff"),
                        color: eraseMode ? "#f59e0b" : (dm ? "#e4e4e7" : "#333"),
                        fontSize: "12px",
                        fontWeight: 700,
                        cursor: "pointer",
                        fontFamily: "inherit",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        transition: "all .15s"
                    }}
                >
                    <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span>🖌️</span>
                        <span>{eraseMode ? "Painting on Main Canvas (Active)" : "Paint Directly on Main Canvas"}</span>
                    </span>
                    <span style={{
                        fontSize: "10px",
                        padding: "2px 7px",
                        borderRadius: "10px",
                        background: eraseMode ? "#f59e0b" : (dm ? "#333" : "#eee"),
                        color: eraseMode ? "#fff" : (dm ? "#aaa" : "#666"),
                        fontWeight: 800
                    }}>
                        {eraseMode ? "ON" : "OFF"}
                    </span>
                </button>

                {/* Brush Size Slider */}
                <div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "5px" }}>
                        <span style={{ fontSize: "12px", fontWeight: 600, color: dm ? "#ccc" : "#555" }}>Retouch Brush Size</span>
                        <span style={{ fontSize: "12px", fontWeight: 700, color: "#6c63ff" }}>{aiRemoveBrush}px</span>
                    </div>
                    <SmoothSlider min={8} max={120} step={2} value={aiRemoveBrush} defaultValue={36} onChange={setAiRemoveBrush} />
                </div>

                {/* Mini Interactive Mask Canvas */}
                <div
                    style={{
                        position: "relative",
                        borderRadius: "10px",
                        overflow: "hidden",
                        border: `1.5px solid ${aiMaskReady ? "#f59e0b" : cardBdr}`,
                        cursor: "crosshair",
                        lineHeight: 0,
                        userSelect: "none",
                        touchAction: "none"
                    }}
                    onMouseDown={e => { maskDrawingRef.current = true; drawMask(e, e.currentTarget); }}
                    onMouseMove={e => drawMask(e, e.currentTarget)}
                    onMouseUp={() => { maskDrawingRef.current = false; }}
                    onMouseLeave={() => { maskDrawingRef.current = false; }}
                    onTouchStart={e => { e.preventDefault(); maskDrawingRef.current = true; drawMask(e, e.currentTarget); }}
                    onTouchMove={e => { e.preventDefault(); drawMask(e, e.currentTarget); }}
                    onTouchEnd={() => { maskDrawingRef.current = false; }}
                >
                    <img src={image} alt="source" style={{ width: "100%", display: "block", filter: toCSSFilter(filters) }} onLoad={() => initMaskCanvas(false)} />
                    <canvas
                        ref={maskCanvasRef}
                        style={{
                            position: "absolute",
                            inset: 0,
                            width: "100%",
                            height: "100%",
                            pointerEvents: "none"
                        }}
                    />
                    {aiMaskReady ? (
                        <div style={{ position: "absolute", top: "8px", left: "8px", padding: "3px 9px", background: "rgba(245,158,11,.92)", borderRadius: "12px", fontSize: "10px", fontWeight: 800, color: "#fff" }}>
                            ✏ Area Masked — Ready to Erase
                        </div>
                    ) : (
                        <div style={{ position: "absolute", bottom: "8px", left: "50%", transform: "translateX(-50%)", padding: "4px 10px", background: "rgba(0,0,0,0.65)", backdropFilter: "blur(6px)", borderRadius: "12px", fontSize: "10px", fontWeight: 600, color: "#fff", whiteSpace: "nowrap", pointerEvents: "none" }}>
                            👆 Paint here or on the main photo
                        </div>
                    )}
                </div>

                {/* Action Bar: Clear, Undo, Magic Erase */}
                <div style={{ display: "flex", gap: "7px" }}>
                    <button
                        onClick={() => initMaskCanvas(true)}
                        style={{
                            padding: "10px 12px",
                            border: `1px solid ${cardBdr}`,
                            background: dm ? "#252525" : "#f2f2f8",
                            borderRadius: "9px",
                            fontSize: "12px",
                            fontWeight: 700,
                            color: dm ? "#ccc" : "#666",
                            cursor: "pointer",
                            fontFamily: "inherit"
                        }}
                        title="Clear painted brush mask"
                    >
                        🗑 Clear
                    </button>
                    {canUndoErase && (
                        <button
                            onClick={handleUndoErase}
                            style={{
                                padding: "10px 12px",
                                border: `1px solid ${cardBdr}`,
                                background: dm ? "#252525" : "#f2f2f8",
                                borderRadius: "9px",
                                fontSize: "12px",
                                fontWeight: 700,
                                color: "#6c63ff",
                                cursor: "pointer",
                                fontFamily: "inherit"
                            }}
                            title="Undo last Magic Erase"
                        >
                            ↩ Undo
                        </button>
                    )}
                    <AB
                        onClick={handleAiRemove}
                        disabled={aiRemoveStatus === "loading" || !aiMaskReady}
                        color={aiRemoveStatus === "done" ? "#f0fff4" : "purple"}
                        textColor={aiRemoveStatus === "done" ? "#16a34a" : "#fff"}
                        style={{ flex: 1, padding: "10px", fontSize: "12.5px" }}
                    >
                        {aiRemoveStatus === "loading" ? (
                            <Row><Spin />Inpainting…</Row>
                        ) : (
                            "✨ Magic Erase Object"
                        )}
                    </AB>
                </div>

                {aiRemoveLog && (
                    <p style={{ fontSize: "11px", color: aiRemoveStatus === "error" ? "#ef4444" : "#a78bfa", lineHeight: 1.4, margin: 0 }}>
                        {aiRemoveLog}
                    </p>
                )}
                {aiRemoveStatus === "loading" && <PBar value={65} />}

                {aiRemoveResult && (
                    <div style={{ display: "flex", gap: "7px" }}>
                        <AB onClick={() => applyAiResult(aiRemoveResult)} color={dm ? "#252525" : "#f2f2f8"} textColor={dm ? "#ccc" : "#555"} style={{ flex: 1, padding: "9px", fontSize: "12px" }}>
                            ← Apply Result
                        </AB>
                        <AB onClick={async () => saveFile(await (await fetch(aiRemoveResult)).blob(), "retouched.jpg")} color="purple" textColor="#fff" style={{ flex: 1, padding: "9px", fontSize: "12px" }}>
                            ↓ Download
                        </AB>
                    </div>
                )}
            </div>
        </div>
    );
}
