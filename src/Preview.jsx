
import { useState, useRef, useEffect, useCallback } from "react";
import { FONT_MAP, PRESETS, LUT_PRESETS } from "./constants";
import { apply3DLut } from "./utils";
import { RAW_EXTENSIONS } from "./rawProcessor";

export function Preview({ image, originalImage, dragging, setDragging, loadImage, fileInputRef, imgRef, splitRef, activeTab, bgResult, bgMode, showBefore, setShowBefore, showSplit, splitPos, isDragSplit, setIsDragSplit, cssFilter, transformCSS, filters, texts, selText, setSelText, updateText, cropMode, cropBox, setCropBox, cropAspect, isEdited, setImage, setBgStatus, setBgSubUrl, setBgResult, isMobile, rotation, flipH, flipV, activeLutData, lutIntensity, lutId, dm, rawLoading, rawProgressMsg }) {
  const maxH = isMobile ? "40vh" : "calc(100vh - 120px)";
  const activeLut = (lutId && lutId !== 'none') ? (lutId === 'custom'
      ? { name: 'Custom LUT', description: 'User-uploaded custom 3D LUT curve configuration.', bestFor: 'Custom grading workflows', tier: 'premium', icon: '📂' }
      : LUT_PRESETS.find(p => p.id === lutId)) : null;

  const activePreset = PRESETS.find(p => 
      filters && Object.keys(p.values).every(k => filters[k] === p.values[k])
  );

  const [dragTxt, setDragTxt] = useState(null);
  const containerRef = useRef(null);
  const lutCanvasRef = useRef(null);

  const [zoom100, setZoom100] = useState(false);
  const [dimensions, setDimensions] = useState({ w: 0, h: 0 });
  const [origDimensions, setOrigDimensions] = useState({ w: 0, h: 0 });
  const activeShowSplit = showSplit && !zoom100;

  useEffect(() => {
    setZoom100(false);
  }, [image]);

  useEffect(() => {
    if (!image) return;
    const img = new Image();
    img.src = image;
    img.onload = () => setDimensions({ w: img.naturalWidth, h: img.naturalHeight });
  }, [image]);

  useEffect(() => {
    if (!originalImage) {
      setOrigDimensions({ w: 0, h: 0 });
      return;
    }
    const img = new Image();
    img.src = originalImage;
    img.onload = () => setOrigDimensions({ w: img.naturalWidth, h: img.naturalHeight });
  }, [originalImage]);

  useEffect(() => {
    if (cropMode) {
      setZoom100(false);
    }
  }, [cropMode]);

  // Render LUT preview onto a canvas overlay
  useEffect(() => {
    if (!activeLutData || !image || showBefore || activeTab !== 'edit' || lutId === 'none') {
      // Clear the canvas if LUT is off
      const c = lutCanvasRef.current;
      if (c) {
        const ctx = c.getContext('2d');
        ctx.clearRect(0, 0, c.width, c.height);
      }
      return;
    }
    const timer = setTimeout(() => {
      const imgEl = imgRef.current;
      const canvas = lutCanvasRef.current;
      if (!imgEl || !canvas) return;
      const natW = imgEl.naturalWidth;
      const natH = imgEl.naturalHeight;
      if (!natW || !natH) return;

      // Use a scaled-down preview for performance but high enough for sharpness (max 1600px wide)
      const maxPrev = 1600;
      const scale = Math.min(1, maxPrev / Math.max(natW, natH));
      const pW = Math.round(natW * scale);
      const pH = Math.round(natH * scale);

      canvas.width = pW;
      canvas.height = pH;
      const ctx = canvas.getContext('2d');

      // Draw the image with CSS filters baked in
      ctx.filter = cssFilter;
      ctx.drawImage(imgEl, 0, 0, pW, pH);
      ctx.filter = 'none';

      // Apply the LUT
      const imgData = ctx.getImageData(0, 0, pW, pH);
      apply3DLut(imgData, activeLutData.data, activeLutData.size, lutIntensity);
      ctx.putImageData(imgData, 0, 0);
    }, 50);
    return () => clearTimeout(timer);
  }, [activeLutData, lutIntensity, lutId, image, cssFilter, showBefore, activeTab, showSplit]);

  const startDragText = (e, id) => {
    e.stopPropagation(); setSelText(id); setDragTxt({ id, startX: e.clientX, startY: e.clientY });
  };
  useEffect(() => {
    if (!dragTxt) return;
    const mm = e => {
      if (!containerRef.current) return;
      const r = containerRef.current.getBoundingClientRect();
      const nx = Math.min(95, Math.max(5, ((e.clientX - r.left) / r.width) * 100));
      const ny = Math.min(95, Math.max(5, ((e.clientY - r.top) / r.height) * 100));
      updateText(dragTxt.id, "x", nx); updateText(dragTxt.id, "y", ny);
    };
    const up = () => setDragTxt(null);
    window.addEventListener("mousemove", mm); window.addEventListener("mouseup", up);
    return () => { window.removeEventListener("mousemove", mm); window.removeEventListener("mouseup", up); };
  }, [dragTxt]);

  // Render glassmorphic loading screen during RAW decoding
  if (rawLoading) {
    return (
      <div className="glass-panel" style={{
        width: "100%",
        maxWidth: "480px",
        aspectRatio: "4/3",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: dm ? "rgba(20, 24, 33, 0.75)" : "rgba(255, 255, 255, 0.75)",
        backdropFilter: "blur(20px)",
        boxShadow: "0 20px 40px rgba(0,0,0,0.15)",
        borderRadius: "24px",
        border: `1px solid ${dm ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"}`,
        padding: "32px",
        textAlign: "center"
      }}>
        <div style={{ position: "relative", width: "70px", height: "70px", marginBottom: "24px" }}>
          {/* Outer glowing ring */}
          <div style={{
            position: "absolute",
            inset: 0,
            borderRadius: "50%",
            border: "3px solid transparent",
            borderTopColor: "#6c63ff",
            borderBottomColor: "#06b6d4",
            animation: "spin 1.2s cubic-bezier(0.5, 0, 0.5, 1) infinite"
          }} />
          {/* Inner pulsing circle */}
          <div style={{
            position: "absolute",
            inset: "8px",
            borderRadius: "50%",
            background: "linear-gradient(135deg, #06b6d4, #6c63ff, #ec4899)",
            opacity: 0.15,
            animation: "pulse 2s ease-in-out infinite"
          }} />
          {/* Center camera iris graphic */}
          <div style={{
            position: "absolute",
            inset: "18px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={dm ? "#fff" : "#1a1a2e"} strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <path d="M14.31 8l5.74 9.94M9.69 8h11.48M7.38 12l5.74-9.94M9.69 16L3.95 6.06M14.31 16H2.83M16.62 12l-5.74 9.94" strokeWidth="1.5" />
            </svg>
          </div>
        </div>
        <h3 style={{ fontSize: "18px", fontWeight: 700, color: dm ? "#ffffff" : "#1a1a2e", marginBottom: "10px", fontFamily: "'Outfit', sans-serif" }}>
          Developing RAW Photo...
        </h3>
        <p style={{ fontSize: "13px", color: dm ? "#9ca3af" : "#555566", maxWidth: "340px", lineHeight: "1.6", whiteSpace: "pre-wrap", wordBreak: "break-word", margin: 0 }}>
          {rawProgressMsg || "Developing raw sensor data completely offline..."}
        </p>
      </div>
    );
  }

  if (!image) return (
    <div className={`drop ${dragging ? "on" : ""}`}
      style={{ width: "100%", maxWidth: "480px", aspectRatio: "4/3", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: dm ? "#1e2230" : "#fff", boxShadow: "0 2px 16px rgba(0,0,0,.06)", cursor: "pointer", border: dm ? "2px dashed #3f445a" : "2px dashed #eee", borderRadius: "16px" }}
      onDragOver={e => { e.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)}
      onDrop={e => { e.preventDefault(); setDragging(false); loadImage(e.dataTransfer.files[0]); }}
      onClick={() => fileInputRef.current?.click()}>
      <input ref={fileInputRef} type="file" accept={"image/*," + RAW_EXTENSIONS} style={{ display: "none" }} onChange={e => loadImage(e.target.files[0])} />
      <div style={{ fontSize: "44px", marginBottom: "14px", animation: "pulse 2.5s infinite" }}>🖼</div>
      <div style={{ fontSize: "16px", fontWeight: 600, color: dm ? "#fff" : "#555", marginBottom: "6px" }}>{isMobile ? "Tap to upload photo" : "Drop photo here"}</div>
      {!isMobile && <div style={{ fontSize: "13px", color: dm ? "#a1a1aa" : "#bbb", marginBottom: "20px" }}>or click to browse</div>}
      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", justifyContent: "center", padding: "0 10px" }}>
        {["JPG", "PNG", "WEBP", "HEIC", "RAW"].map(x => <span key={x} style={{ padding: "3px 10px", background: dm ? "#2d3247" : "#f2f2f8", borderRadius: "20px", fontSize: "11px", fontWeight: 500, color: dm ? "#cbd5e1" : "#999" }}>{x}</span>)}
      </div>
    </div>
  );

  const tempAlpha = Math.abs(filters.temperature) / 300;
  const tempColor = filters.temperature > 0 ? `rgba(255,140,0,${tempAlpha})` : `rgba(100,149,237,${tempAlpha})`;

  const imgStyle = zoom100 ? {
    width: `${dimensions.w}px`,
    height: `${dimensions.h}px`,
    maxWidth: "none",
    maxHeight: "none",
    objectFit: "fill",
    display: "block",
    filter: showBefore || activeTab === "tools" ? "none" : (activeLutData && lutId !== 'none' && !showBefore && activeTab === 'edit' ? 'none' : cssFilter),
    transition: "filter .08s ease",
    transform: showBefore ? "none" : transformCSS,
    visibility: (activeLutData && lutId !== 'none' && !showBefore && activeTab === 'edit') ? 'hidden' : 'visible'
  } : {
    maxWidth: "100%",
    maxHeight: maxH,
    objectFit: "contain",
    display: "block",
    filter: showBefore || activeTab === "tools" ? "none" : (activeLutData && lutId !== 'none' && !showBefore && activeTab === 'edit' ? 'none' : cssFilter),
    transition: "filter .08s ease",
    transform: showBefore ? "none" : transformCSS,
    visibility: (activeLutData && lutId !== 'none' && !showBefore && activeTab === 'edit') ? 'hidden' : 'visible'
  };

  const canvasStyle = zoom100 ? {
    position: "absolute",
    inset: 0,
    width: `${dimensions.w}px`,
    height: `${dimensions.h}px`,
    maxWidth: "none",
    maxHeight: "none",
    objectFit: "fill",
    pointerEvents: "none",
    display: (activeLutData && lutId !== 'none' && !showBefore && activeTab === 'edit') ? 'block' : 'none',
    transform: showBefore ? "none" : transformCSS
  } : {
    position: "absolute",
    inset: 0,
    width: "100%",
    height: "100%",
    objectFit: "contain",
    pointerEvents: "none",
    display: (activeLutData && lutId !== 'none' && !showBefore && activeTab === 'edit') ? 'block' : 'none',
    transform: showBefore ? "none" : transformCSS
  };

  return (
    <>
      {activeTab === "edit" && (activeLut || activePreset) && (
        <div className="glass-panel" style={{
          position: "absolute",
          top: "12px",
          left: "12px",
          zIndex: 30,
          maxWidth: isMobile ? "180px" : "280px",
          background: dm ? "rgba(30, 30, 40, 0.75)" : "rgba(255, 255, 255, 0.85)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          border: `1px solid ${dm ? "rgba(255, 255, 255, 0.08)" : "rgba(108, 99, 255, 0.15)"}`,
          borderRadius: "12px",
          padding: "10px 12px",
          boxShadow: "0 8px 32px rgba(0, 0, 0, 0.25)",
          display: "flex",
          flexDirection: "column",
          gap: "4px",
          pointerEvents: "none",
          animation: "fadeIn 0.2s ease"
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
            <span style={{ fontSize: "12px", fontWeight: 800, color: dm ? "#f3f4f6" : "#1f2937", display: "flex", alignItems: "center", gap: "6px" }}>
              <span>{activeLut ? activeLut.icon : (activePreset?.icon || "🎨")}</span>
              <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "90px" }}>
                {activeLut ? activeLut.name : activePreset?.name}
              </span>
            </span>
            {activeLut?.tier === 'premium' && (
              <span style={{
                fontSize: "8px",
                fontWeight: 800,
                padding: "2px 5px",
                background: "linear-gradient(135deg, #06b6d4 0%, #6c63ff 100%)",
                color: "#fff",
                borderRadius: "5px",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                boxShadow: "0 2px 5px rgba(108,99,255,0.25)",
                whiteSpace: "nowrap"
              }}>
                💎 Premium Look
              </span>
            )}
            {!activeLut && activePreset && (
              <span style={{
                fontSize: "8px",
                fontWeight: 800,
                padding: "2px 5px",
                background: dm ? "#3b3b4f" : "#e8e8f8",
                color: dm ? "#a78bfa" : "#6c63ff",
                borderRadius: "5px",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                whiteSpace: "nowrap"
              }}>
                Preset
              </span>
            )}
          </div>
          <p style={{ fontSize: "10px", color: dm ? "#ccc" : "#4b5563", margin: 0, lineHeight: 1.3, display: isMobile ? "none" : "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
            {activeLut ? activeLut.description : `Preset color values applied: ${Object.keys(activePreset.values).join(', ')}`}
          </p>
          <div style={{ display: isMobile ? "none" : "flex", alignItems: "center", gap: "4px", marginTop: "2px" }}>
            <span style={{ fontSize: "9px", fontWeight: 700, color: "#6c63ff" }}>Best for:</span>
            <span style={{ fontSize: "9px", color: dm ? "#aaa" : "#666", fontWeight: 600 }}>
              {activeLut ? activeLut.bestFor : "Unified tone styles"}
            </span>
          </div>
        </div>
      )}

      {!cropMode && (
        <div style={{
          position: "absolute",
          top: "12px",
          right: "12px",
          display: "flex",
          background: dm ? "rgba(30, 30, 40, 0.85)" : "rgba(255, 255, 255, 0.9)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          border: `1.5px solid ${dm ? "rgba(255,255,255,0.08)" : "#eee"}`,
          zIndex: 10,
          borderRadius: "10px",
          padding: "3px",
          gap: "2px",
          boxShadow: "0 4px 20px rgba(0,0,0,.15)"
        }}>
          {!activeShowSplit && ["After", "Before"].map(l => (
            <button
              key={l}
              onClick={() => setShowBefore(l === "Before")}
              style={{
                padding: "5px 12px",
                fontSize: "12px",
                fontWeight: 600,
                border: "none",
                cursor: "pointer",
                background: (l === "Before") === showBefore
                  ? "linear-gradient(135deg,#6c63ff,#a78bfa)"
                  : "transparent",
                color: (l === "Before") === showBefore
                  ? "#fff"
                  : (dm ? "#9ca3af" : "#888"),
                borderRadius: "7px",
                transition: "all .18s"
              }}
            >
              {l}
            </button>
          ))}
          {!activeShowSplit && <div style={{ width: "1px", background: dm ? "rgba(255,255,255,0.1)" : "#eee", margin: "2px 4px" }} />}
          <button
            onClick={() => setZoom100(!zoom100)}
            style={{
              padding: "5px 12px",
              fontSize: "12px",
              fontWeight: 600,
              border: "none",
              cursor: "pointer",
              background: zoom100
                ? "linear-gradient(135deg,#06b6d4,#6c63ff)"
                : "transparent",
              color: zoom100
                ? "#fff"
                : (dm ? "#9ca3af" : "#888"),
              borderRadius: "7px",
              transition: "all .18s",
              display: "flex",
              alignItems: "center",
              gap: "4px"
            }}
          >
            🔍 {zoom100 ? "1:1 Zoomed" : "1:1 Zoom"}
          </button>
        </div>
      )}
      {activeShowSplit && <div style={{ position: "absolute", top: "12px", right: "12px", zIndex: 10, padding: "5px 12px", background: "rgba(108,99,255,.9)", borderRadius: "20px", fontSize: "11px", fontWeight: 600, color: "#fff" }}>← Drag to compare →</div>}
      {activeTab === "tools" && bgResult && <div style={{ position: "absolute", top: "12px", right: "12px", padding: "4px 12px", background: "#f0fff4", border: "1.5px solid #86efac", borderRadius: "20px", fontSize: "11px", fontWeight: 600, color: "#16a34a", zIndex: 10 }}>✓ BG Removed</div>}
      {cropMode && <div style={{ position: "absolute", top: "12px", right: "12px", padding: "5px 12px", background: "rgba(234,179,8,.9)", borderRadius: "20px", fontSize: "11px", fontWeight: 600, color: "#fff", zIndex: 10 }}>✂ Crop Mode</div>}

      <div ref={splitRef}
        style={{
          position: "relative",
          maxWidth: "100%",
          maxHeight: maxH,
          lineHeight: 0,
          borderRadius: "14px",
          overflow: zoom100 ? "auto" : "hidden",
          boxShadow: "0 8px 40px rgba(0,0,0,.12)",
          cursor: activeShowSplit ? (isDragSplit ? "grabbing" : "ew-resize") : "default",
          userSelect: "none"
        }}
      >
        {activeTab === "tools" && bgResult ? (
          <>
            {bgMode === "transparent" && <div className="checker" style={{ position: "absolute", inset: 0 }} />}
            <img src={bgResult} alt="result" style={{ maxWidth: "100%", maxHeight: maxH, objectFit: "contain", display: "block", position: "relative" }} />
          </>
        ) : activeShowSplit ? (
          <>
            <div style={{ position: "relative", lineHeight: 0 }}>
              <img ref={imgRef} src={image} alt="after"
                style={{ maxWidth: "100%", maxHeight: maxH, objectFit: "contain", display: "block", filter: (activeLutData && lutId !== 'none' && !showBefore && activeTab === 'edit') ? 'none' : cssFilter, transform: transformCSS, visibility: (activeLutData && lutId !== 'none' && !showBefore && activeTab === 'edit') ? 'hidden' : 'visible' }} />
              <canvas ref={lutCanvasRef} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "contain", pointerEvents: "none", display: (activeLutData && lutId !== 'none' && !showBefore && activeTab === 'edit') ? 'block' : 'none', transform: transformCSS }} />
            </div>
            {filters.temperature !== 0 && <div style={{ position: "absolute", inset: 0, background: tempColor, mixBlendMode: "overlay", pointerEvents: "none", clipPath: `inset(0 ${100 - splitPos}% 0 0)` }} />}
            {filters.vignette > 0 && <div style={{ position: "absolute", inset: 0, background: `radial-gradient(ellipse at center,transparent 38%,rgba(0,0,0,${filters.vignette / 100}) 100%)`, pointerEvents: "none", clipPath: `inset(0 ${100 - splitPos}% 0 0)` }} />}
            <div style={{ position: "absolute", inset: 0, clipPath: `inset(0 0 0 ${splitPos}%)` }}>
              <img src={originalImage || image} alt="before" style={{ maxWidth: "100%", maxHeight: maxH, objectFit: "contain", display: "block", filter: "none", transform: transformCSS }} />
            </div>
            <div onMouseDown={e => { e.preventDefault(); setIsDragSplit(true); }} onTouchStart={e => { e.preventDefault(); setIsDragSplit(true); }}
              style={{ position: "absolute", top: 0, bottom: 0, left: `${splitPos}%`, transform: "translateX(-50%)", width: "44px", zIndex: 20, display: "flex", alignItems: "center", justifyContent: "center", cursor: isDragSplit ? "grabbing" : "ew-resize" }}>
              <div style={{ width: "2px", height: "100%", background: "#fff", boxShadow: "0 0 6px rgba(0,0,0,.5)" }} />
              <div style={{ position: "absolute", width: "36px", height: "36px", borderRadius: "50%", background: "#fff", boxShadow: "0 2px 12px rgba(0,0,0,.25)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px", color: "#6c63ff", fontWeight: 700 }}>⇄</div>
            </div>
            <div style={{ position: "absolute", bottom: "12px", left: "12px", padding: "3px 10px", background: "rgba(108,99,255,.85)", borderRadius: "20px", fontSize: "11px", fontWeight: 700, color: "#fff" }}>AFTER</div>
            <div style={{ position: "absolute", bottom: "12px", right: "12px", padding: "3px 10px", background: "rgba(0,0,0,.5)", borderRadius: "20px", fontSize: "11px", fontWeight: 700, color: "#fff" }}>BEFORE</div>
          </>
        ) : (
          <>
            <div ref={containerRef} style={{ position: "relative", lineHeight: 0 }}>
              <img ref={imgRef} src={showBefore ? (originalImage || image) : image} alt="photo"
                style={imgStyle} />
              {/* LUT Preview Canvas */}
              <canvas ref={lutCanvasRef} style={canvasStyle} />
              {!showBefore && activeTab === "edit" && filters.temperature !== 0 && <div style={{ position: "absolute", inset: 0, background: tempColor, mixBlendMode: "overlay", pointerEvents: "none" }} />}
              {!showBefore && activeTab === "edit" && filters.fade > 0 && <div style={{ position: "absolute", inset: 0, background: `rgba(255,255,255,${filters.fade / 180})`, mixBlendMode: "screen", pointerEvents: "none" }} />}
              {!showBefore && activeTab === "edit" && filters.vignette > 0 && <div style={{ position: "absolute", inset: 0, background: `radial-gradient(ellipse at center,transparent 38%,rgba(0,0,0,${filters.vignette / 100}) 100%)`, pointerEvents: "none" }} />}
              {!showBefore && activeTab === "edit" && filters.grain > 0 && (
                <div style={{ position: "absolute", inset: 0, pointerEvents: "none", mixBlendMode: "overlay", opacity: 0.4, backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E")` }} />
              )}
              {!showBefore && texts.map(t => (
                <div key={t.id} onMouseDown={e => startDragText(e, t.id)} onClick={() => setSelText(t.id)}
                  style={{ position: "absolute", left: `${t.x}%`, top: `${t.y}%`, transform: "translate(-50%,-50%)", cursor: dragTxt && dragTxt.id === t.id ? "grabbing" : "grab", userSelect: "none",
                    fontFamily: FONT_MAP[t.font] || FONT_MAP.System, fontSize: `clamp(12px,${t.fontSize / 8}vw,${t.fontSize}px)`,
                    fontWeight: t.bold ? "700" : "400", fontStyle: t.italic ? "italic" : "normal", color: t.color,
                    textShadow: t.stroke ? "0 0 8px rgba(0,0,0,.8), 1px 1px 2px rgba(0,0,0,.6)" : "none",
                    border: selText === t.id ? "2px dashed rgba(108,99,255,.6)" : "2px dashed transparent",
                    padding: "4px 6px", borderRadius: "4px", whiteSpace: "nowrap", zIndex: 5 }}>
                  {t.content}
                </div>
              ))}
              {cropMode && (
                <div style={{ position: "absolute", inset: 0, zIndex: 10 }}>
                  <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,.5)" }} />
                  <div style={{ position: "absolute", left: `${cropBox.x}%`, top: `${cropBox.y}%`, width: `${cropBox.w}%`, height: `${cropBox.h}%`,
                    border: "2px solid #fff", boxShadow: "0 0 0 9999px rgba(0,0,0,.5)", cursor: "move" }}>
                    <div style={{ position: "absolute", inset: 0, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gridTemplateRows: "1fr 1fr 1fr", pointerEvents: "none" }}>
                      {Array(9).fill(0).map((_, i) => <div key={i} style={{ border: "0.5px solid rgba(255,255,255,.3)" }} />)}
                    </div>
                    {[{ t: "-4px", l: "-4px", c: "nw" }, { t: "-4px", l: "calc(50% - 4px)", c: "n" }, { t: "-4px", r: "-4px", c: "ne" },
                    { t: "calc(50% - 4px)", l: "-4px", c: "w" }, { t: "calc(50% - 4px)", r: "-4px", c: "e" },
                    { b: "-4px", l: "-4px", c: "sw" }, { b: "-4px", l: "calc(50% - 4px)", c: "s" }, { b: "-4px", r: "-4px", c: "se" }].map(h => (
                      <div key={h.c} style={{ position: "absolute", ...h, width: "8px", height: "8px", background: "#fff", borderRadius: "1px", cursor: `${h.c}-resize` }} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
      {image && dimensions.w > 0 && !activeShowSplit && !cropMode && (
        <div style={{
          position: "absolute",
          bottom: "12px",
          right: "12px",
          zIndex: 10,
          padding: "6px 12px",
          background: dm ? "rgba(30, 30, 40, 0.85)" : "rgba(255, 255, 255, 0.9)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          border: `1px solid ${dm ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.08)"}`,
          borderRadius: "20px",
          fontSize: "11px",
          fontWeight: 600,
          color: dm ? "#cbd5e1" : "#4b5563",
          boxShadow: "0 4px 12px rgba(0,0,0,.1)",
          display: "flex",
          alignItems: "center",
          gap: "6px",
          pointerEvents: "none"
        }}>
          <span>📐</span>
          <span>{dimensions.w} × {dimensions.h} px</span>
          {origDimensions.w > 0 && dimensions.w > origDimensions.w && (
            <>
              <span style={{ color: dm ? "rgba(255,255,255,0.15)" : "#eee" }}>|</span>
              <span style={{
                background: "linear-gradient(135deg, #06b6d4 0%, #6c63ff 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                fontWeight: 800
              }}>
                {Math.round(dimensions.w / origDimensions.w)}x AI Upscaled
              </span>
            </>
          )}
        </div>
      )}

      <div style={{ position: "absolute", bottom: "12px", left: "50%", transform: "translateX(-50%)" }}>
        <button onClick={() => { setImage(null); setBgStatus("idle"); setBgSubUrl(null); setBgResult(null); }}
          style={{ background: dm ? "#1e2230" : "#fff", color: dm ? "#9ca3af" : "#999", padding: "6px 14px", border: dm ? "1.5px solid #3f445a" : "1.5px solid #eee", borderRadius: "8px", fontSize: "12px", fontWeight: 500, cursor: "pointer", boxShadow: "0 1px 4px rgba(0,0,0,.06)" }}>
          ← New Photo
        </button>
      </div>
    </>
  );
}
