
import { useState, useRef, useEffect, useCallback } from "react";
import { FONT_MAP, PRESETS, LUT_PRESETS } from "./constants";
import { apply3DLut, applyCurves, applyHslMixer } from "./utils";
import { RAW_EXTENSIONS } from "./rawProcessor";
import { ModernImageUploadIcon } from "./components/ui/common";

export function Preview({ image, originalImage, dragging, setDragging, loadImage, fileInputRef, imgRef, splitRef, activeTab, bgResult, bgMode, showBefore, setShowBefore, showSplit, splitPos, isDragSplit, setIsDragSplit, cssFilter, transformCSS, filters, texts, selText, setSelText, updateText, cropMode, cropBox, setCropBox, cropAspect, isEdited, resetAll, setImage, setBgStatus, setBgSubUrl, setBgResult, isMobile, rotation, flipH, flipV, activeLutData, lutIntensity, lutId, dm, rawLoading, rawProgressMsg, logo, logoScale, logoScalePortrait, logoOpacity, logoPos, logoMargin, logoX, setLogoX, logoY, setLogoY, setLogoPos, filterGroup, highResImage, chromatic, prism, halation, filmDust, glitter, vhs, lightLeak, heatmap, vibeAudio, hslMixer, curves }) {
  const maxH = isMobile ? "40vh" : "calc(100vh - 120px)";
  const activeLut = (lutId && lutId !== 'none') ? (lutId === 'custom'
      ? { name: 'Custom LUT', description: 'User-uploaded custom 3D LUT curve configuration.', bestFor: 'Custom grading workflows', tier: 'premium', icon: '📂' }
      : LUT_PRESETS.find(p => p.id === lutId)) : null;

  const activePreset = PRESETS.find(p => 
      filters && Object.keys(p.values).every(k => filters[k] === p.values[k])
  );

  const [dragTxt, setDragTxt] = useState(null);
  const [draggingLogo, setDraggingLogo] = useState(false);
  const [viewMode, setViewMode] = useState("auto"); // "auto" | "after" | "before" | "split"
  const [isHoldingBefore, setIsHoldingBefore] = useState(false);

  const containerRef = useRef(null);
  const lutCanvasRef = useRef(null);

  const [dimensions, setDimensions] = useState({ w: 0, h: 0 });
  const [origDimensions, setOrigDimensions] = useState({ w: 0, h: 0 });

  const isHslModified = hslMixer && Object.values(hslMixer).some(v => v.hue !== 0 || v.sat !== 0 || v.lum !== 0);
  const isCurvesModified = curves && Object.values(curves).some(pts => pts.some(p => (p.x === 0 && p.y !== 0) || (p.x === 255 && p.y !== 255) || (p.x !== 0 && p.x !== 255)));
  const isLutActive = activeLutData && lutId !== 'none';

  const effectiveShowBefore = showBefore || viewMode === "before" || isHoldingBefore;
  const effectiveShowSplit = !cropMode && activeTab === "edit" && (viewMode === "split" || (viewMode === "auto" && showSplit && !effectiveShowBefore));

  useEffect(() => {
    const src = highResImage || image;
    if (!src) return;
    const img = new Image();
    img.src = src;
    img.onload = () => setDimensions({ w: img.naturalWidth, h: img.naturalHeight });
  }, [highResImage, image]);

  useEffect(() => {
    if (!originalImage) {
      setOrigDimensions({ w: 0, h: 0 });
      return;
    }
    const img = new Image();
    img.src = originalImage;
    img.onload = () => setOrigDimensions({ w: img.naturalWidth, h: img.naturalHeight });
  }, [originalImage]);

  // Render LUT, HSL, and Curves preview onto a canvas overlay
  const isCanvasNeeded = (isLutActive || isHslModified || isCurvesModified) && image && !effectiveShowBefore && activeTab === 'edit';

  useEffect(() => {
    if (!isCanvasNeeded) {
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

      const maxPrev = 1600;
      const scale = Math.min(1, maxPrev / Math.max(natW, natH));
      const pW = Math.round(natW * scale);
      const pH = Math.round(natH * scale);

      canvas.width = pW;
      canvas.height = pH;
      const ctx = canvas.getContext('2d');

      ctx.filter = cssFilter;
      ctx.drawImage(imgEl, 0, 0, pW, pH);
      ctx.filter = 'none';

      const imgData = ctx.getImageData(0, 0, pW, pH);
      if (isCurvesModified) applyCurves(imgData, curves);
      if (isHslModified) applyHslMixer(imgData, hslMixer);
      if (isLutActive) apply3DLut(imgData, activeLutData.data, activeLutData.size, lutIntensity);
      ctx.putImageData(imgData, 0, 0);
    }, 50);
    return () => clearTimeout(timer);
  }, [isCanvasNeeded, isLutActive, isHslModified, isCurvesModified, activeLutData, lutIntensity, lutId, image, cssFilter, effectiveShowBefore, activeTab, hslMixer, curves]);

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

  const startDragLogo = (e) => {
    e.stopPropagation();
    e.preventDefault();
    setDraggingLogo(true);
  };
  useEffect(() => {
    if (!draggingLogo) return;
    const mm = e => {
      if (!splitRef.current) return;
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      const r = splitRef.current.getBoundingClientRect();
      const nx = Math.min(98, Math.max(2, ((clientX - r.left) / r.width) * 100));
      const ny = Math.min(98, Math.max(2, ((clientY - r.top) / r.height) * 100));
      setLogoX(nx);
      setLogoY(ny);
      setLogoPos("custom");
    };
    const up = () => setDraggingLogo(false);
    window.addEventListener("mousemove", mm);
    window.addEventListener("mouseup", up);
    window.addEventListener("touchmove", mm, { passive: true });
    window.addEventListener("touchend", up);
    return () => {
      window.removeEventListener("mousemove", mm);
      window.removeEventListener("mouseup", up);
      window.removeEventListener("touchmove", mm);
      window.removeEventListener("touchend", up);
    };
  }, [draggingLogo, setLogoX, setLogoY, setLogoPos]);

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
      <div style={{ marginBottom: "14px", animation: "pulse 2.5s infinite" }}><ModernImageUploadIcon size={46} dm={dm} /></div>
      <div style={{ fontSize: "16px", fontWeight: 600, color: dm ? "#fff" : "#555", marginBottom: "6px" }}>{isMobile ? "Tap to upload photo" : "Drop photo here"}</div>
      {!isMobile && <div style={{ fontSize: "13px", color: dm ? "#a1a1aa" : "#bbb", marginBottom: "20px" }}>or click to browse</div>}
      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", justifyContent: "center", padding: "0 10px" }}>
        {["JPG", "PNG", "WEBP", "HEIC", "RAW"].map(x => <span key={x} style={{ padding: "3px 10px", background: dm ? "#2d3247" : "#f2f2f8", borderRadius: "20px", fontSize: "11px", fontWeight: 500, color: dm ? "#cbd5e1" : "#999" }}>{x}</span>)}
      </div>
    </div>
  );

  const tempAlpha = Math.abs(filters.temperature) / 300;
  const tempColor = filters.temperature > 0 ? `rgba(255,140,0,${tempAlpha})` : `rgba(100,149,237,${tempAlpha})`;



  const isPortrait = dimensions.h > dimensions.w;
  const mPctX = dimensions.w ? (logoMargin / dimensions.w) * 100 : 2;
  const mPctY = dimensions.h ? (logoMargin / dimensions.h) * 100 : 2;
  const logoWidthPct = (isPortrait ? logoScalePortrait : logoScale) * 100;

  const logoStyles = {
    position: "absolute",
    width: `${logoWidthPct}%`,
    opacity: logoOpacity,
    pointerEvents: (activeTab === 'edit' && filterGroup === 'watermark') ? 'auto' : 'none',
    cursor: (activeTab === 'edit' && filterGroup === 'watermark') ? (draggingLogo ? 'grabbing' : 'grab') : 'default',
    zIndex: 15,
  };

  if (logoX !== null && logoY !== null) {
    logoStyles.left = `${logoX}%`;
    logoStyles.top = `${logoY}%`;
    logoStyles.transform = "translate(-50%, -50%)";
  } else if (logoPos === "top-left") {
    logoStyles.top = `${mPctY}%`;
    logoStyles.left = `${mPctX}%`;
  } else if (logoPos === "top-center") {
    logoStyles.top = `${mPctY}%`;
    logoStyles.left = "50%";
    logoStyles.transform = "translateX(-50%)";
  } else if (logoPos === "top-right") {
    logoStyles.top = `${mPctY}%`;
    logoStyles.right = `${mPctX}%`;
  } else if (logoPos === "center-left") {
    logoStyles.top = "50%";
    logoStyles.left = `${mPctX}%`;
    logoStyles.transform = "translateY(-50%)";
  } else if (logoPos === "center") {
    logoStyles.top = "50%";
    logoStyles.left = "50%";
    logoStyles.transform = "translate(-50%, -50%)";
  } else if (logoPos === "center-right") {
    logoStyles.top = "50%";
    logoStyles.right = `${mPctX}%`;
    logoStyles.transform = "translateY(-50%)";
  } else if (logoPos === "bottom-left") {
    logoStyles.bottom = `${mPctY}%`;
    logoStyles.left = `${mPctX}%`;
  } else if (logoPos === "bottom-center") {
    logoStyles.bottom = `${mPctY}%`;
    logoStyles.left = "50%";
    logoStyles.transform = "translateX(-50%)";
  } else { // bottom-right
    logoStyles.bottom = `${mPctY}%`;
    logoStyles.right = `${mPctX}%`;
  }

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

      {!cropMode && image && activeTab === "edit" && (
        <div style={{
          position: "absolute",
          top: "12px",
          right: "12px",
          display: "flex",
          background: dm ? "rgba(20, 24, 35, 0.88)" : "rgba(255, 255, 255, 0.92)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          border: `1.5px solid ${dm ? "rgba(255,255,255,0.12)" : "#e2e8f0"}`,
          zIndex: 30,
          borderRadius: "12px",
          padding: "3px",
          gap: "2px",
          boxShadow: "0 8px 24px rgba(0,0,0,0.2)"
        }}>
          {[
            { id: "after", label: "✨ After" },
            { id: "before", label: "📷 Before" },
            { id: "split", label: "↔️ Split" }
          ].map(btn => {
            const isActive = (btn.id === "before" && effectiveShowBefore) ||
                             (btn.id === "split" && effectiveShowSplit) ||
                             (btn.id === "after" && !effectiveShowBefore && !effectiveShowSplit);
            return (
              <button
                key={btn.id}
                onClick={() => {
                  if (btn.id === "before") {
                    setViewMode("before");
                    setShowBefore(true);
                  } else if (btn.id === "split") {
                    setViewMode("split");
                    setShowBefore(false);
                  } else {
                    setViewMode("after");
                    setShowBefore(false);
                  }
                }}
                style={{
                  padding: "5px 11px",
                  fontSize: "11px",
                  fontWeight: isActive ? 700 : 500,
                  border: "none",
                  cursor: "pointer",
                  background: isActive
                    ? "linear-gradient(135deg, #6c63ff, #a78bfa)"
                    : "transparent",
                  color: isActive ? "#ffffff" : (dm ? "#9ca3af" : "#64748b"),
                  borderRadius: "8px",
                  transition: "all .18s ease",
                  boxShadow: isActive ? "0 2px 8px rgba(108,99,255,0.35)" : "none"
                }}
              >
                {btn.label}
              </button>
            );
          })}
        </div>
      )}

      {effectiveShowBefore && (
        <div style={{ position: "absolute", top: "12px", left: "12px", zIndex: 30, padding: "5px 12px", background: "rgba(239, 68, 68, 0.9)", backdropFilter: "blur(8px)", borderRadius: "20px", fontSize: "11px", fontWeight: 800, color: "#fff", letterSpacing: "0.5px", boxShadow: "0 4px 14px rgba(239,68,68,0.35)" }}>
          📷 ORIGINAL UNTOUCHED
        </div>
      )}

      {activeTab === "tools" && bgResult && <div style={{ position: "absolute", top: "12px", right: "12px", padding: "4px 12px", background: "#f0fff4", border: "1.5px solid #86efac", borderRadius: "20px", fontSize: "11px", fontWeight: 600, color: "#16a34a", zIndex: 10 }}>✓ BG Removed</div>}
      {cropMode && <div style={{ position: "absolute", top: "12px", right: "12px", padding: "5px 12px", background: "rgba(234,179,8,.9)", borderRadius: "20px", fontSize: "11px", fontWeight: 600, color: "#fff", zIndex: 10 }}>✂ Crop Mode</div>}

      <div ref={splitRef}
        onMouseDown={(e) => { if (e.target.tagName !== 'BUTTON' && !cropMode) setIsHoldingBefore(true); }}
        onMouseUp={() => setIsHoldingBefore(false)}
        onMouseLeave={() => setIsHoldingBefore(false)}
        onTouchStart={(e) => { if (e.target.tagName !== 'BUTTON' && !cropMode) setIsHoldingBefore(true); }}
        onTouchEnd={() => setIsHoldingBefore(false)}
        style={{
          position: "relative",
          maxWidth: "100%",
          maxHeight: maxH,
          lineHeight: 0,
          borderRadius: "14px",
          overflow: "hidden",
          boxShadow: "0 8px 40px rgba(0,0,0,.12)",
          cursor: effectiveShowSplit ? (isDragSplit ? "grabbing" : "ew-resize") : "pointer",
          userSelect: "none"
        }}
      >
        {activeTab === "tools" && bgResult ? (
          <>
            {bgMode === "transparent" && <div className="checker" style={{ position: "absolute", inset: 0 }} />}
            <img src={bgResult} alt="result" style={{ maxWidth: "100%", maxHeight: maxH, width: "auto", height: "auto", display: "block", position: "relative" }} />
          </>
        ) : effectiveShowSplit ? (
          <>
            <div style={{ position: "relative", lineHeight: 0 }}>
              <img ref={imgRef} src={image} alt="after"
                style={{ maxWidth: "100%", maxHeight: maxH, width: "auto", height: "auto", display: "block", filter: isCanvasNeeded ? 'none' : cssFilter, transform: transformCSS, visibility: isCanvasNeeded ? 'hidden' : 'visible' }} />
              <canvas ref={lutCanvasRef} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none", display: isCanvasNeeded ? 'block' : 'none', transform: transformCSS }} />
            </div>
            {filters.temperature !== 0 && <div style={{ position: "absolute", inset: 0, background: tempColor, mixBlendMode: "overlay", pointerEvents: "none", clipPath: `inset(0 ${100 - splitPos}% 0 0)` }} />}
            {filters.vignette > 0 && <div style={{ position: "absolute", inset: 0, background: `radial-gradient(ellipse at center,transparent 38%,rgba(0,0,0,${filters.vignette / 100}) 100%)`, pointerEvents: "none", clipPath: `inset(0 ${100 - splitPos}% 0 0)` }} />}
            <div style={{ position: "absolute", inset: 0, clipPath: `inset(0 0 0 ${splitPos}%)` }}>
              <img src={originalImage || image} alt="before" style={{ maxWidth: "100%", maxHeight: maxH, width: "auto", height: "auto", display: "block", filter: "none", transform: "none" }} />
            </div>
            <div onMouseDown={e => { e.preventDefault(); e.stopPropagation(); setIsDragSplit(true); }} onTouchStart={e => { e.preventDefault(); e.stopPropagation(); setIsDragSplit(true); }}
              style={{ position: "absolute", top: 0, bottom: 0, left: `${splitPos}%`, transform: "translateX(-50%)", width: "44px", zIndex: 20, display: "flex", alignItems: "center", justifyContent: "center", cursor: isDragSplit ? "grabbing" : "ew-resize" }}>
              <div style={{ width: "2px", height: "100%", background: "#fff", boxShadow: "0 0 6px rgba(0,0,0,.5)" }} />
              <div style={{ position: "absolute", width: "36px", height: "36px", borderRadius: "50%", background: "#fff", boxShadow: "0 2px 12px rgba(0,0,0,.25)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px", color: "#6c63ff", fontWeight: 700 }}>⇄</div>
            </div>
            <div style={{ position: "absolute", bottom: "12px", left: "12px", padding: "3px 10px", background: "rgba(108,99,255,.85)", borderRadius: "20px", fontSize: "11px", fontWeight: 700, color: "#fff" }}>AFTER</div>
            <div style={{ position: "absolute", bottom: "12px", right: "12px", padding: "3px 10px", background: "rgba(0,0,0,.5)", borderRadius: "20px", fontSize: "11px", fontWeight: 700, color: "#fff" }}>BEFORE</div>
            {logo && (
              <img src={logo.src} style={logoStyles} alt="logo-watermark"
                onMouseDown={startDragLogo} onTouchStart={startDragLogo} />
            )}
          </>
        ) : (
          <>
            <div ref={containerRef} style={{ position: "relative", lineHeight: 0 }}>
              <img ref={imgRef} src={effectiveShowBefore ? (originalImage || image) : image} alt="photo"
                style={{ maxWidth: "100%", maxHeight: maxH, width: "auto", height: "auto", display: "block", filter: effectiveShowBefore || activeTab === "tools" ? "none" : (isCanvasNeeded ? 'none' : cssFilter), transition: "filter .08s ease", transform: effectiveShowBefore ? "none" : transformCSS, visibility: isCanvasNeeded && !effectiveShowBefore ? 'hidden' : 'visible' }} />
              {/* LUT, HSL, and Curves Preview Canvas */}
              <canvas ref={lutCanvasRef} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none", display: isCanvasNeeded && !effectiveShowBefore ? 'block' : 'none', transform: effectiveShowBefore ? "none" : transformCSS }} />
              {!effectiveShowBefore && activeTab === "edit" && filters.temperature !== 0 && <div style={{ position: "absolute", inset: 0, background: tempColor, mixBlendMode: "overlay", pointerEvents: "none" }} />}
              {!effectiveShowBefore && activeTab === "edit" && filters.fade > 0 && <div style={{ position: "absolute", inset: 0, background: `rgba(255,255,255,${filters.fade / 180})`, mixBlendMode: "screen", pointerEvents: "none" }} />}
              {!effectiveShowBefore && activeTab === "edit" && filters.vignette > 0 && <div style={{ position: "absolute", inset: 0, background: `radial-gradient(ellipse at center,transparent 38%,rgba(0,0,0,${filters.vignette / 100}) 100%)`, pointerEvents: "none" }} />}
              {!effectiveShowBefore && activeTab === "edit" && filters.grain > 0 && (
                <div style={{ position: "absolute", inset: 0, pointerEvents: "none", mixBlendMode: "overlay", opacity: 0.4, backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E")` }} />
              )}
              {/* Prequel Live FX Overlays */}
              {!showBefore && activeTab === "edit" && halation > 0 && (
                <div style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 4, mixBlendMode: "screen", opacity: halation / 100, background: "radial-gradient(circle at center, rgba(255,180,180,0.5) 0%, rgba(255,120,120,0.2) 60%, transparent 100%)" }} />
              )}
              {!showBefore && activeTab === "edit" && heatmap > 0 && (
                <div style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 4, mixBlendMode: "color", opacity: heatmap / 100, filter: `invert(${Math.round(heatmap * 0.8)}%) hue-rotate(${Math.round(heatmap * 2.4)}deg)` }} />
              )}
              {!showBefore && activeTab === "edit" && lightLeak !== 'none' && (
                <div style={{
                  position: "absolute", inset: 0, pointerEvents: "none", zIndex: 5, mixBlendMode: "screen", opacity: 0.8,
                  background: lightLeak === 'gold' ? 'radial-gradient(circle at 10% 20%, rgba(255, 170, 50, 0.75) 0%, rgba(255, 90, 0, 0.4) 40%, transparent 70%)'
                            : lightLeak === 'prism' ? 'linear-gradient(135deg, rgba(255,0,128,0.5) 0%, rgba(0,255,200,0.5) 50%, rgba(255,255,0,0.5) 100%)'
                            : lightLeak === 'red' ? 'radial-gradient(circle at 90% 80%, rgba(255, 30, 60, 0.8) 0%, rgba(200, 0, 0, 0.4) 45%, transparent 70%)'
                            : 'radial-gradient(circle at 50% 10%, rgba(0, 230, 255, 0.7) 0%, rgba(180, 0, 255, 0.4) 50%, transparent 75%)'
                }} />
              )}
              {!showBefore && activeTab === "edit" && vhs && (
                <div style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 6, display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "16px", color: "#00ff66", fontFamily: "monospace", textShadow: "0 0 6px rgba(0,255,102,0.8)", fontSize: "13px", fontWeight: "bold", background: "repeating-linear-gradient(0deg, rgba(0,0,0,0.12) 0px, rgba(0,0,0,0.12) 1px, transparent 1px, transparent 3px)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>PLAY ▶</span>
                    <span>SP</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>{new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }).toUpperCase()}</span>
                    <span>VHS HI-FI</span>
                  </div>
                </div>
              )}
              {!showBefore && activeTab === "edit" && vibeAudio !== 'none' && (
                <div style={{ position: "absolute", bottom: "12px", left: "12px", zIndex: 25, background: "rgba(10,10,20,0.85)", backdropFilter: "blur(12px)", padding: "6px 12px", borderRadius: "20px", border: "1px solid rgba(255,255,255,0.15)", display: "flex", alignItems: "center", gap: "8px", boxShadow: "0 4px 16px rgba(0,0,0,0.4)", pointerEvents: "none" }}>
                  <span style={{ fontSize: "14px" }}>🎵</span>
                  <span style={{ fontSize: "11px", fontWeight: 700, color: "#a78bfa" }}>Vibe: {vibeAudio.toUpperCase()}</span>
                  <div style={{ display: "flex", alignItems: "flex-end", gap: "2px", height: "12px" }}>
                    {[1, 2, 3, 4].map(i => (
                      <div key={i} style={{ width: "3px", height: `${6 + (i * 2)}px`, background: "#06b6d4", borderRadius: "2px" }} />
                    ))}
                  </div>
                </div>
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
              {logo && !showBefore && (
                <img src={logo.src} style={logoStyles} alt="logo-watermark"
                  onMouseDown={startDragLogo} onTouchStart={startDragLogo} />
              )}
            </div>
          </>
        )}
      </div>
      {image && dimensions.w > 0 && !showSplit && !cropMode && (
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

      <div style={{ position: "absolute", bottom: "12px", left: "50%", transform: "translateX(-50%)", display: "flex", gap: "8px", zIndex: 30 }}>
        <button onClick={() => { setImage(null); setBgStatus("idle"); setBgSubUrl(null); setBgResult(null); }}
          style={{ background: dm ? "#1e2230" : "#fff", color: dm ? "#cbd5e1" : "#555", padding: "6px 14px", border: dm ? "1.5px solid #3f445a" : "1.5px solid #e2e8f0", borderRadius: "8px", fontSize: "12px", fontWeight: 600, cursor: "pointer", boxShadow: "0 2px 8px rgba(0,0,0,.12)" }}>
          ← New Photo
        </button>
        {isEdited && resetAll && (
          <button onClick={resetAll}
            style={{ background: "rgba(239, 68, 68, 0.95)", color: "#ffffff", padding: "6px 14px", border: "none", borderRadius: "8px", fontSize: "12px", fontWeight: 700, cursor: "pointer", boxShadow: "0 2px 10px rgba(239, 68, 68, 0.35)", display: "flex", alignItems: "center", gap: "5px" }}>
            <span>🔄</span> Reset Edits
          </button>
        )}
      </div>
    </>
  );
}
