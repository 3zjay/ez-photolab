
import { useState, useRef, useEffect } from "react";
import { FONT_MAP } from "./constants";

export function Preview({ image, dragging, setDragging, loadImage, fileInputRef, imgRef, splitRef, activeTab, bgResult, bgMode, showBefore, setShowBefore, showSplit, splitPos, isDragSplit, setIsDragSplit, cssFilter, transformCSS, filters, texts, selText, setSelText, updateText, cropMode, cropBox, setCropBox, cropAspect, isEdited, setImage, setBgStatus, setBgSubUrl, setBgResult, isMobile, rotation, flipH, flipV }) {
  const maxH = isMobile ? "40vh" : "calc(100vh - 120px)";
  const [dragTxt, setDragTxt] = useState(null);
  const containerRef = useRef(null);

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

  if (!image) return (
    <div className={`drop ${dragging ? "on" : ""}`}
      style={{ width: "100%", maxWidth: "480px", aspectRatio: "4/3", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#fff", boxShadow: "0 2px 16px rgba(0,0,0,.06)", cursor: "pointer" }}
      onDragOver={e => { e.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)}
      onDrop={e => { e.preventDefault(); setDragging(false); loadImage(e.dataTransfer.files[0]); }}
      onClick={() => fileInputRef.current?.click()}>
      <input ref={fileInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={e => loadImage(e.target.files[0])} />
      <div style={{ fontSize: "44px", marginBottom: "14px", animation: "pulse 2.5s infinite" }}>🖼</div>
      <div style={{ fontSize: "16px", fontWeight: 600, color: "#555", marginBottom: "6px" }}>{isMobile ? "Tap to upload photo" : "Drop photo here"}</div>
      {!isMobile && <div style={{ fontSize: "13px", color: "#bbb", marginBottom: "20px" }}>or click to browse</div>}
      <div style={{ display: "flex", gap: "8px" }}>
        {["JPG", "PNG", "WEBP", "HEIC"].map(x => <span key={x} style={{ padding: "3px 10px", background: "#f2f2f8", borderRadius: "20px", fontSize: "11px", fontWeight: 500, color: "#999" }}>{x}</span>)}
      </div>
    </div>
  );

  const tempAlpha = Math.abs(filters.temperature) / 300;
  const tempColor = filters.temperature > 0 ? `rgba(255,140,0,${tempAlpha})` : `rgba(100,149,237,${tempAlpha})`;

  return (
    <>
      {activeTab === "edit" && !showSplit && !cropMode && (
        <div style={{ position: "absolute", top: "12px", right: "12px", display: "flex", background: "#fff", border: "1.5px solid #eee", zIndex: 10, borderRadius: "10px", padding: "3px", gap: "2px", boxShadow: "0 2px 8px rgba(0,0,0,.08)" }}>
          {["After", "Before"].map(l => (
            <button key={l} onClick={() => setShowBefore(l === "Before")}
              style={{ padding: "5px 14px", fontSize: "12px", fontWeight: 600, border: "none", cursor: "pointer", background: (l === "Before") === showBefore ? "linear-gradient(135deg,#6c63ff,#a78bfa)" : "transparent", color: (l === "Before") === showBefore ? "#fff" : "#999", borderRadius: "7px", transition: "all .18s" }}>{l}</button>
          ))}
        </div>
      )}
      {showSplit && <div style={{ position: "absolute", top: "12px", right: "12px", zIndex: 10, padding: "5px 12px", background: "rgba(108,99,255,.9)", borderRadius: "20px", fontSize: "11px", fontWeight: 600, color: "#fff" }}>← Drag to compare →</div>}
      {activeTab === "tools" && bgResult && <div style={{ position: "absolute", top: "12px", right: "12px", padding: "4px 12px", background: "#f0fff4", border: "1.5px solid #86efac", borderRadius: "20px", fontSize: "11px", fontWeight: 600, color: "#16a34a", zIndex: 10 }}>✓ BG Removed</div>}
      {cropMode && <div style={{ position: "absolute", top: "12px", right: "12px", padding: "5px 12px", background: "rgba(234,179,8,.9)", borderRadius: "20px", fontSize: "11px", fontWeight: 600, color: "#fff", zIndex: 10 }}>✂ Crop Mode</div>}

      <div ref={splitRef}
        style={{ position: "relative", maxWidth: "100%", maxHeight: maxH, lineHeight: 0, borderRadius: "14px", overflow: "hidden", boxShadow: "0 8px 40px rgba(0,0,0,.12)", cursor: showSplit ? (isDragSplit ? "grabbing" : "ew-resize") : "default", userSelect: "none" }}>
        {activeTab === "tools" && bgResult ? (
          <>
            {bgMode === "transparent" && <div className="checker" style={{ position: "absolute", inset: 0 }} />}
            <img src={bgResult} alt="result" style={{ maxWidth: "100%", maxHeight: maxH, objectFit: "contain", display: "block", position: "relative" }} />
          </>
        ) : showSplit ? (
          <>
            <img ref={imgRef} src={image} alt="after" style={{ maxWidth: "100%", maxHeight: maxH, objectFit: "contain", display: "block", filter: cssFilter, transform: transformCSS }} />
            {filters.temperature !== 0 && <div style={{ position: "absolute", inset: 0, background: tempColor, mixBlendMode: "overlay", pointerEvents: "none", clipPath: `inset(0 ${100 - splitPos}% 0 0)` }} />}
            {filters.vignette > 0 && <div style={{ position: "absolute", inset: 0, background: `radial-gradient(ellipse at center,transparent 38%,rgba(0,0,0,${filters.vignette / 100}) 100%)`, pointerEvents: "none", clipPath: `inset(0 ${100 - splitPos}% 0 0)` }} />}
            <div style={{ position: "absolute", inset: 0, clipPath: `inset(0 0 0 ${splitPos}%)` }}>
              <img src={image} alt="before" style={{ maxWidth: "100%", maxHeight: maxH, objectFit: "contain", display: "block", filter: "none" }} />
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
              <img ref={imgRef} src={image} alt="photo"
                style={{ maxWidth: "100%", maxHeight: maxH, objectFit: "contain", display: "block", filter: showBefore || activeTab === "tools" ? "none" : cssFilter, transition: "filter .08s ease", transform: showBefore ? "none" : transformCSS }} />
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
      <div style={{ position: "absolute", bottom: "12px", left: "50%", transform: "translateX(-50%)" }}>
        <button onClick={() => { setImage(null); setBgStatus("idle"); setBgSubUrl(null); setBgResult(null); }}
          style={{ background: "#fff", color: "#999", padding: "6px 14px", border: "1.5px solid #eee", borderRadius: "8px", fontSize: "12px", fontWeight: 500, cursor: "pointer", boxShadow: "0 1px 4px rgba(0,0,0,.06)" }}>
          ← New Photo
        </button>
      </div>
    </>
  );
}
