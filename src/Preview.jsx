import { useState, useRef, useEffect } from "react";
import { FONT_MAP, PRESETS, LUT_PRESETS } from "./constants";
import {
  apply3DLut,
  applyCurves,
  applyHslMixer,
  applyChromaticAberration,
  applyPrismRefraction,
  applyFilmDust,
  applyGlitterSparkles,
  applyThermalHeatmap
} from "./utils";
import { RAW_EXTENSIONS } from "./rawProcessor";
import { ModernImageUploadIcon } from "./components/ui/common";

export function Preview({
  image, originalImage, dragging, setDragging, loadImage, fileInputRef, imgRef, splitRef,
  activeTab, bgResult, bgMode, bgStatus, showBefore, setShowBefore, showSplit, splitPos,
  isDragSplit, setIsDragSplit, cssFilter, transformCSS, filters, texts, selText, setSelText,
  updateText, cropMode, cropBox, setCropBox, cropAspect, applyCrop, isEdited, resetAll,
  setImage, setBgStatus, setBgSubUrl, setBgResult, isMobile, rotation, flipH, flipV,
  activeLutData, lutIntensity, lutId, dm, rawLoading, rawProgressMsg,
  logo, logoScale, logoScalePortrait, logoOpacity, logoPos, logoMargin, logoX, setLogoX, logoY, setLogoY, setLogoPos,
  filterGroup, highResImage, chromatic, prism, halation, filmDust, glitter, vhs, lightLeak, heatmap, vibeAudio,
  hslMixer, curves,
  eraseMode, aiRemoveBrush, maskCanvasRef, maskDrawingRef, drawMask, aiMaskReady, handleAiRemove, aiRemoveStatus,
  maskVersion
}) {
  const maxH = isMobile ? "calc(42dvh - 56px)" : "calc(100dvh - 140px)";
  const activeLut = (lutId && lutId !== 'none') ? (lutId === 'custom'
      ? { name: 'Custom LUT', description: 'User-uploaded custom 3D LUT curve configuration.', bestFor: 'Custom grading workflows', tier: 'premium', icon: '📂' }
      : LUT_PRESETS.find(p => p.id === lutId)) : null;

  const activePreset = PRESETS.find(p => 
      filters && Object.keys(p.values).every(k => filters[k] === p.values[k])
  );

  const [dragTxt, setDragTxt] = useState(null);
  const [draggingLogo, setDraggingLogo] = useState(false);
  const [cropDrag, setCropDrag] = useState(null);
  const [viewMode, setViewMode] = useState("after"); // "after" | "before" | "split"
  const [imgLoadTick, setImgLoadTick] = useState(0);

  const containerRef = useRef(null);
  const lutCanvasRef = useRef(null);
  const previewMaskRef = useRef(null);

  const [dimensions, setDimensions] = useState({ w: 0, h: 0 });
  const [origDimensions, setOrigDimensions] = useState({ w: 0, h: 0 });

  const isHslModified = hslMixer && Object.values(hslMixer).some(v => v.hue !== 0 || v.sat !== 0 || v.lum !== 0);
  const isCurvesModified = curves && Object.values(curves).some(pts => pts.some(p => (p.x === 0 && p.y !== 0) || (p.x === 255 && p.y !== 255) || (p.x !== 0 && p.x !== 255)));
  const isLutActive = Boolean(activeLutData && lutId !== 'none');
  const isAestheticsCanvasFx = (chromatic > 0 || prism > 0 || filmDust > 0 || glitter > 0 || heatmap > 0);

  const effectiveShowBefore = showBefore || viewMode === "before";
  const effectiveShowSplit = !cropMode && !eraseMode && activeTab === "edit" && viewMode === "split" && !effectiveShowBefore;

  // App.jsx passes (aiPreviewUrl || beautyPreviewUrl || activeBaseImage) as `image`
  const displaySrc = image;

  useEffect(() => {
    const src = highResImage || displaySrc;
    if (!src) return;
    const img = new Image();
    img.src = src;
    img.onload = () => setDimensions({ w: img.naturalWidth, h: img.naturalHeight });
  }, [highResImage, displaySrc]);

  useEffect(() => {
    if (!originalImage) {
      setOrigDimensions({ w: 0, h: 0 });
      return;
    }
    const img = new Image();
    img.src = originalImage;
    img.onload = () => setOrigDimensions({ w: img.naturalWidth, h: img.naturalHeight });
  }, [originalImage]);

  // Render LUT, HSL, Curves, and Prequel Aesthetics pixel FX onto canvas overlay
  const isCanvasNeeded = Boolean((isLutActive || isHslModified || isCurvesModified || isAestheticsCanvasFx) && displaySrc && !effectiveShowBefore && activeTab === 'edit');

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

      const maxPrev = 1400;
      const scale = Math.min(1, maxPrev / Math.max(natW, natH));
      const pW = Math.max(1, Math.round(natW * scale));
      const pH = Math.max(1, Math.round(natH * scale));

      canvas.width = pW;
      canvas.height = pH;
      const ctx = canvas.getContext('2d');

      ctx.filter = cssFilter;
      ctx.drawImage(imgEl, 0, 0, pW, pH);
      ctx.filter = 'none';

      if (isCurvesModified || isHslModified || isLutActive) {
        const imgData = ctx.getImageData(0, 0, pW, pH);
        if (isCurvesModified) applyCurves(imgData, curves);
        if (isHslModified) applyHslMixer(imgData, hslMixer);
        if (isLutActive) apply3DLut(imgData, activeLutData.data, activeLutData.size, lutIntensity);
        ctx.putImageData(imgData, 0, 0);
      }

      if (chromatic > 0) applyChromaticAberration(canvas, ctx, pW, pH, chromatic);
      if (prism > 0) applyPrismRefraction(canvas, ctx, pW, pH, prism);
      if (heatmap > 0) applyThermalHeatmap(canvas, ctx, pW, pH, heatmap);
      if (filmDust > 0) applyFilmDust(canvas, ctx, pW, pH, filmDust);
      if (glitter > 0) applyGlitterSparkles(canvas, ctx, pW, pH, glitter);
    }, 35);
    return () => clearTimeout(timer);
  }, [
    isCanvasNeeded, isLutActive, isHslModified, isCurvesModified, isAestheticsCanvasFx,
    activeLutData, lutIntensity, lutId, displaySrc, cssFilter, effectiveShowBefore,
    activeTab, hslMixer, curves, chromatic, prism, filmDust, glitter, heatmap, imgLoadTick
  ]);

  // Sync on-canvas Magic Eraser mask preview with maskCanvasRef
  const syncPreviewMask = () => {
    const srcMc = maskCanvasRef?.current;
    const dstMc = previewMaskRef.current;
    if (!srcMc || !dstMc || !srcMc.width || !srcMc.height) return;
    if (dstMc.width !== srcMc.width || dstMc.height !== srcMc.height) {
      dstMc.width = srcMc.width;
      dstMc.height = srcMc.height;
    }
    const ctx = dstMc.getContext("2d");
    ctx.clearRect(0, 0, dstMc.width, dstMc.height);
    ctx.drawImage(srcMc, 0, 0);
  };

  useEffect(() => {
    if (eraseMode) {
      syncPreviewMask();
    }
  }, [eraseMode, aiMaskReady, maskVersion, displaySrc]);

  // Interactive Text / Badge / Graphic Layer Dragging (Mouse + Touch)
  const startDragText = (e, id) => {
    e.stopPropagation();
    setSelText(id);
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    setDragTxt({ id, startX: clientX, startY: clientY });
  };
  useEffect(() => {
    if (!dragTxt) return;
    const mm = e => {
      if (!containerRef.current) return;
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      const r = containerRef.current.getBoundingClientRect();
      const nx = Math.min(96, Math.max(4, ((clientX - r.left) / r.width) * 100));
      const ny = Math.min(96, Math.max(4, ((clientY - r.top) / r.height) * 100));
      updateText(dragTxt.id, { x: nx, y: ny });
    };
    const up = () => setDragTxt(null);
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
  }, [dragTxt, updateText]);

  // Interactive Crop Box Dragging & 8-Handle Resizing (Mouse + Touch)
  const startCropDrag = (e, type) => {
    e.stopPropagation();
    if (e.cancelable) e.preventDefault();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    setCropDrag({
      type,
      startX: clientX,
      startY: clientY,
      startBox: { ...cropBox }
    });
  };

  useEffect(() => {
    if (!cropDrag) return;
    const onMove = (e) => {
      if (!containerRef.current) return;
      if (e.cancelable) e.preventDefault();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      const rect = containerRef.current.getBoundingClientRect();
      if (!rect.width || !rect.height) return;

      const dx = ((clientX - cropDrag.startX) / rect.width) * 100;
      const dy = ((clientY - cropDrag.startY) / rect.height) * 100;
      const b = cropDrag.startBox;
      const minSize = 8;

      if (cropDrag.type === "move") {
        const nx = Math.max(0, Math.min(100 - b.w, b.x + dx));
        const ny = Math.max(0, Math.min(100 - b.h, b.y + dy));
        setCropBox({ x: nx, y: ny, w: b.w, h: b.h });
        return;
      }

      let { x, y, w, h } = b;
      const t = cropDrag.type;
      const rightEdge = b.x + b.w;
      const bottomEdge = b.y + b.h;

      if (t.includes("e")) {
        w = Math.max(minSize, Math.min(100 - b.x, b.w + dx));
      }
      if (t.includes("s")) {
        h = Math.max(minSize, Math.min(100 - b.y, b.h + dy));
      }
      if (t.includes("w")) {
        const maxDx = b.w - minSize;
        const clampedDx = Math.max(-b.x, Math.min(maxDx, dx));
        x = b.x + clampedDx;
        w = b.w - clampedDx;
      }
      if (t.includes("n")) {
        const maxDy = b.h - minSize;
        const clampedDy = Math.max(-b.y, Math.min(maxDy, dy));
        y = b.y + clampedDy;
        h = b.h - clampedDy;
      }

      // Enforce aspect ratio lock if cropAspect !== "free"
      if (cropAspect && cropAspect !== "free") {
        const [aw, ah] = cropAspect.split(":").map(Number);
        const imgW = imgRef.current?.naturalWidth || rect.width || 1;
        const imgH = imgRef.current?.naturalHeight || rect.height || 1;
        const imgAspect = imgW / imgH;
        const targetAspect = aw / ah;
        const pctRatio = targetAspect / imgAspect; // w / h = pctRatio

        if (t === "n" || t === "s") {
          w = h * pctRatio;
          if (x + w > 100) {
            w = 100 - x;
            h = w / pctRatio;
            if (t === "n") y = bottomEdge - h;
          }
        } else {
          h = w / pctRatio;
          if (t.includes("n")) {
            y = bottomEdge - h;
            if (y < 0) {
              y = 0;
              h = bottomEdge;
              w = h * pctRatio;
              if (t.includes("w")) x = rightEdge - w;
            }
          } else if (y + h > 100) {
            h = 100 - y;
            w = h * pctRatio;
            if (t.includes("w")) x = rightEdge - w;
          }
        }
      }

      const clampedX = Math.max(0, Math.min(100 - minSize, x));
      const clampedY = Math.max(0, Math.min(100 - minSize, y));
      setCropBox({
        x: clampedX,
        y: clampedY,
        w: Math.max(minSize, Math.min(100 - clampedX, w)),
        h: Math.max(minSize, Math.min(100 - clampedY, h))
      });
    };

    const onUp = () => setCropDrag(null);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    window.addEventListener("touchmove", onMove, { passive: false });
    window.addEventListener("touchend", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onUp);
    };
  }, [cropDrag, cropAspect, setCropBox, imgRef]);

  const startDragLogo = (e) => {
    e.stopPropagation();
    e.preventDefault();
    setDraggingLogo(true);
  };
  useEffect(() => {
    if (!draggingLogo) return;
    const mm = e => {
      const targetEl = containerRef.current || splitRef.current;
      if (!targetEl) return;
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      const r = targetEl.getBoundingClientRect();
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
          <div style={{
            position: "absolute",
            inset: 0,
            borderRadius: "50%",
            border: "3px solid transparent",
            borderTopColor: "#6c63ff",
            borderBottomColor: "#06b6d4",
            animation: "spin 1.2s cubic-bezier(0.5, 0, 0.5, 1) infinite"
          }} />
          <div style={{
            position: "absolute",
            inset: "8px",
            borderRadius: "50%",
            background: "linear-gradient(135deg, #06b6d4, #6c63ff, #ec4899)",
            opacity: 0.15,
            animation: "pulse 2s ease-in-out infinite"
          }} />
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
    pointerEvents: activeTab === 'edit' ? 'auto' : 'none',
    cursor: activeTab === 'edit' ? (draggingLogo ? 'grabbing' : 'grab') : 'default',
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
  } else {
    logoStyles.bottom = `${mPctY}%`;
    logoStyles.right = `${mPctX}%`;
  }

  const cropPxW = dimensions.w ? Math.max(1, Math.round((dimensions.w * cropBox.w) / 100)) : 0;
  const cropPxH = dimensions.h ? Math.max(1, Math.round((dimensions.h * cropBox.h) / 100)) : 0;

  return (
    <>
      {activeTab === "edit" && !effectiveShowBefore && (activeLut || activePreset) && (
        <div className="glass-panel" style={{
          position: "absolute",
          top: "12px",
          left: "12px",
          zIndex: 30,
          maxWidth: isMobile ? "155px" : "240px",
          background: dm ? "rgba(20, 24, 35, 0.85)" : "rgba(255, 255, 255, 0.9)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          border: `1px solid ${dm ? "rgba(255, 255, 255, 0.1)" : "rgba(108, 99, 255, 0.2)"}`,
          borderRadius: "20px",
          padding: "5px 11px",
          boxShadow: "0 4px 16px rgba(0, 0, 0, 0.2)",
          display: "flex",
          alignItems: "center",
          gap: "6px",
          pointerEvents: "none",
          animation: "fadeIn 0.2s ease"
        }}>
          <span style={{ fontSize: "13px", lineHeight: 1 }}>{activeLut ? activeLut.icon : (activePreset?.icon || "🎨")}</span>
          <span style={{ fontSize: "11px", fontWeight: 700, color: dm ? "#f3f4f6" : "#1f2937", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {activeLut ? activeLut.name : activePreset?.name}
          </span>
          {activeLut && (
            <span style={{ fontSize: "10px", fontWeight: 800, color: "#a78bfa", flexShrink: 0 }}>
              {Math.round(lutIntensity * 100)}%
            </span>
          )}
        </div>
      )}

      {!cropMode && !eraseMode && image && activeTab === "edit" && (
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
            { id: "after", label: isMobile ? "✨" : "✨ After", title: "After (Live Edited View)" },
            { id: "before", label: isMobile ? "📷" : "📷 Before", title: "Before (Original Photo)" },
            { id: "split", label: isMobile ? "↔️" : "↔️ Split", title: "Split Before/After Comparison" }
          ].map(btn => {
            const isActive = (btn.id === "before" && effectiveShowBefore) ||
                             (btn.id === "split" && effectiveShowSplit) ||
                             (btn.id === "after" && !effectiveShowBefore && !effectiveShowSplit);
            return (
              <button
                key={btn.id}
                title={btn.title}
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
                  padding: isMobile ? "5px 9px" : "5px 11px",
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
          {isMobile ? "📷 ORIGINAL" : "📷 ORIGINAL UNTOUCHED"}
        </div>
      )}

      {/* Floating On-Canvas Magic Retouch HUD */}
      {eraseMode && (
        <div style={{ position: "absolute", top: "12px", right: "12px", zIndex: 35, display: "flex", alignItems: "center", gap: "8px", padding: "6px 12px", background: "rgba(245, 158, 11, 0.95)", backdropFilter: "blur(10px)", borderRadius: "20px", fontSize: "11.5px", fontWeight: 800, color: "#fff", boxShadow: "0 4px 16px rgba(245,158,11,0.35)" }}>
          <span>🖌️ Retouch Brush ({aiRemoveBrush}px)</span>
          {aiMaskReady && handleAiRemove && (
            <button
              onClick={handleAiRemove}
              disabled={aiRemoveStatus === "loading"}
              style={{ padding: "3px 10px", background: "#fff", color: "#d97706", border: "none", borderRadius: "12px", fontSize: "11px", fontWeight: 800, cursor: "pointer" }}
            >
              {aiRemoveStatus === "loading" ? "Erasing…" : "✨ Erase Now"}
            </button>
          )}
        </div>
      )}

      {/* Floating Crop HUD */}
      {cropMode && (
        <div style={{ position: "absolute", top: "12px", right: "12px", zIndex: 35, display: "flex", alignItems: "center", gap: "8px", padding: "6px 12px", background: "rgba(108, 99, 255, 0.95)", backdropFilter: "blur(10px)", borderRadius: "20px", fontSize: "11.5px", fontWeight: 800, color: "#fff", boxShadow: "0 4px 16px rgba(108,99,255,0.35)" }}>
          <span>✂ {cropPxW} × {cropPxH} px</span>
          {applyCrop && (
            <button
              onClick={applyCrop}
              style={{ padding: "3px 10px", background: "#fff", color: "#6c63ff", border: "none", borderRadius: "12px", fontSize: "11px", fontWeight: 800, cursor: "pointer" }}
            >
              ✓ Apply
            </button>
          )}
        </div>
      )}

      <div ref={splitRef}
        style={{
          position: "relative",
          maxWidth: "100%",
          maxHeight: maxH,
          minWidth: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          lineHeight: 0,
          borderRadius: "14px",
          overflow: "hidden",
          boxShadow: "0 8px 40px rgba(0,0,0,.12)",
          cursor: effectiveShowSplit ? (isDragSplit ? "grabbing" : "ew-resize") : "default",
          userSelect: "none"
        }}
      >
        <div ref={containerRef} style={{ position: "relative", lineHeight: 0, maxWidth: "100%", maxHeight: maxH }}>
          {/* Transparency checkerboard when cutout is in transparent mode */}
          {!effectiveShowBefore && bgStatus === "done" && bgMode === "transparent" && (
            <div className="checker" style={{ position: "absolute", inset: 0 }} />
          )}

          <img
            ref={imgRef}
            src={effectiveShowBefore ? (originalImage || displaySrc) : displaySrc}
            alt="photo"
            onLoad={() => setImgLoadTick(t => t + 1)}
            style={{
              maxWidth: "100%",
              maxHeight: maxH,
              width: "auto",
              height: "auto",
              objectFit: "contain",
              display: "block",
              position: "relative",
              filter: effectiveShowBefore ? "none" : (isCanvasNeeded ? "none" : cssFilter),
              transition: "filter .08s ease",
              transform: effectiveShowBefore ? "none" : transformCSS,
              visibility: isCanvasNeeded && !effectiveShowBefore ? "hidden" : "visible"
            }}
          />

          {/* LUT, HSL, Curves, and Aesthetics Pixel FX Preview Canvas */}
          <canvas
            ref={lutCanvasRef}
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              pointerEvents: "none",
              display: isCanvasNeeded && !effectiveShowBefore ? "block" : "none",
              transform: effectiveShowBefore ? "none" : transformCSS
            }}
          />

          {!effectiveShowBefore && activeTab === "edit" && filters.temperature !== 0 && (
            <div style={{ position: "absolute", inset: 0, background: tempColor, mixBlendMode: "overlay", pointerEvents: "none" }} />
          )}
          {!effectiveShowBefore && activeTab === "edit" && filters.fade > 0 && (
            <div style={{ position: "absolute", inset: 0, background: `rgba(255,255,255,${filters.fade / 180})`, mixBlendMode: "screen", pointerEvents: "none" }} />
          )}
          {!effectiveShowBefore && activeTab === "edit" && filters.vignette > 0 && (
            <div style={{ position: "absolute", inset: 0, background: `radial-gradient(ellipse at center,transparent 38%,rgba(0,0,0,${filters.vignette / 100}) 100%)`, pointerEvents: "none" }} />
          )}
          {!effectiveShowBefore && activeTab === "edit" && filters.grain > 0 && (
            <div style={{ position: "absolute", inset: 0, pointerEvents: "none", mixBlendMode: "overlay", opacity: Math.min(0.85, (filters.grain / 100) * 0.75), backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E")` }} />
          )}

          {/* Prequel Live FX Overlays */}
          {!effectiveShowBefore && activeTab === "edit" && halation > 0 && (
            <div style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 4, mixBlendMode: "screen", opacity: halation / 100, background: "radial-gradient(circle at center, rgba(255,180,180,0.5) 0%, rgba(255,120,120,0.2) 60%, transparent 100%)" }} />
          )}
          {!effectiveShowBefore && activeTab === "edit" && lightLeak !== 'none' && (
            <div style={{
              position: "absolute", inset: 0, pointerEvents: "none", zIndex: 5, mixBlendMode: "screen", opacity: 0.8,
              background: lightLeak === 'gold' ? 'radial-gradient(circle at 10% 20%, rgba(255, 170, 50, 0.75) 0%, rgba(255, 90, 0, 0.4) 40%, transparent 70%)'
                        : lightLeak === 'prism' ? 'linear-gradient(135deg, rgba(255,0,128,0.5) 0%, rgba(0,255,200,0.5) 50%, rgba(255,255,0,0.5) 100%)'
                        : lightLeak === 'red' ? 'radial-gradient(circle at 90% 80%, rgba(255, 30, 60, 0.8) 0%, rgba(200, 0, 0, 0.4) 45%, transparent 70%)'
                        : 'radial-gradient(circle at 50% 10%, rgba(0, 230, 255, 0.7) 0%, rgba(180, 0, 255, 0.4) 50%, transparent 75%)'
            }} />
          )}
          {!effectiveShowBefore && activeTab === "edit" && vhs && (
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
          {!effectiveShowBefore && activeTab === "edit" && vibeAudio !== 'none' && (
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

          {/* Photoroom Composition Layers (Text, Promo Badges, Graphic/Sticker Uploads) */}
          {!effectiveShowBefore && texts.filter(t => t.visible !== false).map(t => (
            <div
              key={t.id}
              onMouseDown={e => startDragText(e, t.id)}
              onTouchStart={e => startDragText(e, t.id)}
              onClick={e => { e.stopPropagation(); setSelText(t.id); }}
              style={{
                position: "absolute",
                left: `${t.x}%`,
                top: `${t.y}%`,
                transform: `translate(-50%, -50%) rotate(${t.rotation || 0}deg)`,
                opacity: t.opacity !== undefined ? t.opacity : 1,
                cursor: dragTxt && dragTxt.id === t.id ? "grabbing" : "grab",
                userSelect: "none",
                touchAction: "none",
                fontFamily: FONT_MAP[t.font] || FONT_MAP.System,
                fontSize: `clamp(11px, ${t.fontSize / 16}vw, ${Math.round(t.fontSize * 0.55)}px)`,
                fontWeight: t.bold ? "800" : "500",
                fontStyle: t.italic ? "italic" : "normal",
                color: t.color,
                background: t.bgEnabled ? (t.bgColor || "#ef4444") : "transparent",
                borderRadius: t.bgEnabled ? `${t.bgRadius !== undefined ? t.bgRadius : 12}px` : "4px",
                padding: t.bgEnabled ? "5px 12px" : "4px 6px",
                textShadow: t.stroke ? "0 0 8px rgba(0,0,0,.85), 1px 1px 2px rgba(0,0,0,.7)" : (t.shadow !== false && !t.bgEnabled ? "0 2px 8px rgba(0,0,0,0.45)" : "none"),
                boxShadow: t.bgEnabled && t.shadow !== false ? "0 6px 18px rgba(0,0,0,0.28)" : "none",
                outline: selText === t.id ? "2px dashed #6c63ff" : "none",
                outlineOffset: "3px",
                whiteSpace: "nowrap",
                zIndex: selText === t.id ? 20 : 8
              }}
            >
              {t.type === "graphic" && t.imageSrc ? (
                <img
                  src={t.imageSrc}
                  alt={t.content || "graphic"}
                  draggable={false}
                  style={{
                    width: `clamp(36px, ${t.fontSize / 7}vw, ${t.fontSize * 1.4}px)`,
                    height: "auto",
                    display: "block",
                    pointerEvents: "none",
                    filter: t.shadow !== false ? "drop-shadow(0 4px 12px rgba(0,0,0,0.3))" : "none"
                  }}
                />
              ) : (
                t.content
              )}
            </div>
          ))}

          {/* Logo / Corner Watermark */}
          {logo && !effectiveShowBefore && (
            <img src={logo.src} style={logoStyles} alt="logo-watermark"
              onMouseDown={startDragLogo} onTouchStart={startDragLogo} />
          )}

          {/* Split Comparison Overlay (Only when user selects ↔️ Split) */}
          {effectiveShowSplit && (
            <>
              <div style={{ position: "absolute", inset: 0, clipPath: `inset(0 0 0 ${splitPos}%)`, zIndex: 16, pointerEvents: "none" }}>
                <img src={originalImage || displaySrc} alt="before" style={{ width: "100%", height: "100%", objectFit: "contain", display: "block", filter: "none", transform: effectiveShowBefore ? "none" : transformCSS }} />
              </div>
              <div
                onMouseDown={e => { e.preventDefault(); e.stopPropagation(); setIsDragSplit(true); }}
                onTouchStart={e => { e.preventDefault(); e.stopPropagation(); setIsDragSplit(true); }}
                style={{ position: "absolute", top: 0, bottom: 0, left: `${splitPos}%`, transform: "translateX(-50%)", width: "44px", zIndex: 20, display: "flex", alignItems: "center", justifyContent: "center", cursor: isDragSplit ? "grabbing" : "ew-resize" }}
              >
                <div style={{ width: "2px", height: "100%", background: "#fff", boxShadow: "0 0 6px rgba(0,0,0,.5)" }} />
                <div style={{ position: "absolute", width: "36px", height: "36px", borderRadius: "50%", background: "#fff", boxShadow: "0 2px 12px rgba(0,0,0,.25)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px", color: "#6c63ff", fontWeight: 700 }}>⇄</div>
              </div>
              <div style={{ position: "absolute", bottom: "12px", left: "12px", zIndex: 19, padding: "3px 10px", background: "rgba(108,99,255,.85)", borderRadius: "20px", fontSize: "11px", fontWeight: 700, color: "#fff", pointerEvents: "none" }}>AFTER</div>
              <div style={{ position: "absolute", bottom: "12px", right: "12px", zIndex: 19, padding: "3px 10px", background: "rgba(0,0,0,.55)", borderRadius: "20px", fontSize: "11px", fontWeight: 700, color: "#fff", pointerEvents: "none" }}>BEFORE</div>
            </>
          )}

          {/* On-Canvas Magic Retouch Brush Overlay */}
          {eraseMode && !cropMode && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                zIndex: 18,
                cursor: "crosshair",
                touchAction: "none"
              }}
              onMouseDown={e => {
                e.stopPropagation();
                if (maskDrawingRef) maskDrawingRef.current = true;
                if (drawMask) drawMask(e, e.currentTarget);
                syncPreviewMask();
              }}
              onMouseMove={e => {
                if (!maskDrawingRef?.current) return;
                e.stopPropagation();
                if (drawMask) drawMask(e, e.currentTarget);
                syncPreviewMask();
              }}
              onMouseUp={() => { if (maskDrawingRef) maskDrawingRef.current = false; }}
              onMouseLeave={() => { if (maskDrawingRef) maskDrawingRef.current = false; }}
              onTouchStart={e => {
                e.stopPropagation();
                if (e.cancelable) e.preventDefault();
                if (maskDrawingRef) maskDrawingRef.current = true;
                if (drawMask) drawMask(e, e.currentTarget);
                syncPreviewMask();
              }}
              onTouchMove={e => {
                e.stopPropagation();
                if (e.cancelable) e.preventDefault();
                if (drawMask) drawMask(e, e.currentTarget);
                syncPreviewMask();
              }}
              onTouchEnd={() => { if (maskDrawingRef) maskDrawingRef.current = false; }}
            >
              <canvas
                ref={previewMaskRef}
                style={{
                  position: "absolute",
                  inset: 0,
                  width: "100%",
                  height: "100%",
                  pointerEvents: "none"
                }}
              />
            </div>
          )}

          {/* Interactive 8-Handle Crop Box Overlay */}
          {cropMode && (
            <div style={{ position: "absolute", inset: 0, zIndex: 22, touchAction: "none" }}>
              <div
                onMouseDown={e => startCropDrag(e, "move")}
                onTouchStart={e => startCropDrag(e, "move")}
                style={{
                  position: "absolute",
                  left: `${cropBox.x}%`,
                  top: `${cropBox.y}%`,
                  width: `${cropBox.w}%`,
                  height: `${cropBox.h}%`,
                  border: "2px solid #ffffff",
                  boxShadow: "0 0 0 9999px rgba(0, 0, 0, 0.58)",
                  cursor: cropDrag?.type === "move" ? "grabbing" : "move",
                  touchAction: "none"
                }}
              >
                {/* Rule of Thirds Grid */}
                <div style={{ position: "absolute", inset: 0, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gridTemplateRows: "1fr 1fr 1fr", pointerEvents: "none" }}>
                  {Array(9).fill(0).map((_, i) => <div key={i} style={{ border: "0.5px solid rgba(255,255,255,.35)" }} />)}
                </div>

                {/* 8 Interactive Resize Handles (Larger hit targets for touch & mouse) */}
                {[
                  { top: "-8px", left: "-8px", c: "nw" },
                  { top: "-8px", left: "calc(50% - 8px)", c: "n" },
                  { top: "-8px", right: "-8px", c: "ne" },
                  { top: "calc(50% - 8px)", left: "-8px", c: "w" },
                  { top: "calc(50% - 8px)", right: "-8px", c: "e" },
                  { bottom: "-8px", left: "-8px", c: "sw" },
                  { bottom: "-8px", left: "calc(50% - 8px)", c: "s" },
                  { bottom: "-8px", right: "-8px", c: "se" }
                ].map(h => {
                  const { c, ...pos } = h;
                  return (
                    <div
                      key={c}
                      onMouseDown={e => startCropDrag(e, c)}
                      onTouchStart={e => startCropDrag(e, c)}
                      style={{
                        position: "absolute",
                        ...pos,
                        width: "16px",
                        height: "16px",
                        background: "#6c63ff",
                        border: "2.5px solid #ffffff",
                        borderRadius: "4px",
                        cursor: `${c}-resize`,
                        boxShadow: "0 2px 6px rgba(0,0,0,0.4)",
                        touchAction: "none",
                        zIndex: 25
                      }}
                    />
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {!isMobile && image && dimensions.w > 0 && !effectiveShowSplit && !cropMode && (
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

      <div style={{ position: "absolute", bottom: isMobile ? "8px" : "12px", left: "50%", transform: "translateX(-50%)", display: "flex", gap: "8px", zIndex: 30, whiteSpace: "nowrap" }}>
        <button onClick={() => { setImage(null); setBgStatus("idle"); setBgSubUrl(null); setBgResult(null); }}
          style={{ background: dm ? "#1e2230" : "#fff", color: dm ? "#cbd5e1" : "#555", padding: isMobile ? "5px 11px" : "6px 14px", border: dm ? "1.5px solid #3f445a" : "1.5px solid #e2e8f0", borderRadius: "8px", fontSize: isMobile ? "11px" : "12px", fontWeight: 600, cursor: "pointer", boxShadow: "0 2px 8px rgba(0,0,0,.12)" }}>
          ← New Photo
        </button>
        {isEdited && resetAll && (
          <button onClick={resetAll}
            style={{ background: "rgba(239, 68, 68, 0.95)", color: "#ffffff", padding: isMobile ? "5px 11px" : "6px 14px", border: "none", borderRadius: "8px", fontSize: isMobile ? "11px" : "12px", fontWeight: 700, cursor: "pointer", boxShadow: "0 2px 10px rgba(239, 68, 68, 0.35)", display: "flex", alignItems: "center", gap: "5px" }}>
            <span>🔄</span> Reset Edits
          </button>
        )}
      </div>
    </>
  );
}
