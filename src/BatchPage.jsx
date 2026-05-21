import { useMemo, useRef, useEffect, useCallback, memo } from "react";
import { Spin, SmoothSlider } from "./components/ui/common";
import { BATCH_RESIZE_PRESETS, DEFAULT_FILTERS, COLOR_FILTERS, FILTER_GROUPS, PRESETS } from "./constants";
import { toCSSFilter } from "./utils";
import { RawBatchPanel } from "./components/panels/RawBatchPanel";

// Isolated slider — zero React re-renders during drag, commits on pointerUp
const BatchFilterSlider = memo(function BatchFilterSlider({ f, value, setFilters, dm, accent }) {
  const inputRef = useRef(null);
  const labelRef = useRef(null);

  // Keep input in sync when value changes from outside (e.g. preset apply, reset)
  useEffect(() => {
    if (inputRef.current) inputRef.current.value = value;
    if (labelRef.current) {
      const v = value;
      labelRef.current.textContent =
        (v > 0 && f.default === 0 ? '+' : '') +
        (Number.isInteger(v) ? v : v.toFixed(1)) +
        (f.unit || '');
    }
  }, [value, f]);

  const changed = value !== f.default;
  const pct = ((value - f.min) / (f.max - f.min)) * 100;

  const onInput = useCallback(e => {
    const v = parseFloat(e.target.value);
    const p = ((v - f.min) / (f.max - f.min)) * 100;
    // Update track fill imperatively (same as global onSliderInput handler)
    e.target.style.setProperty('--v', `${p.toFixed(2)}%`);
    // Update value label imperatively — no React re-render
    if (labelRef.current) {
      labelRef.current.textContent =
        (v > 0 && f.default === 0 ? '+' : '') +
        (Number.isInteger(v) ? v : v.toFixed(1)) +
        (f.unit || '');
    }
  }, [f]);

  const onPointerUp = useCallback(e => {
    const v = parseFloat(e.target.value);
    setFilters(p => ({ ...p, [f.key]: v }));
  }, [f, setFilters]);

  const onKeyUp = useCallback(e => {
    const navKeys = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End'];
    if (navKeys.includes(e.key)) {
      const v = parseFloat(e.target.value);
      setFilters(p => ({ ...p, [f.key]: v }));
    }
  }, [f, setFilters]);

  const onDoubleClick = useCallback(() => {
    if (inputRef.current) inputRef.current.value = f.default;
    const p = ((f.default - f.min) / (f.max - f.min)) * 100;
    if (inputRef.current) inputRef.current.style.setProperty('--v', `${p.toFixed(2)}%`);
    if (labelRef.current) {
      const v = f.default;
      labelRef.current.textContent =
        (v > 0 && f.default === 0 ? '+' : '') +
        (Number.isInteger(v) ? v : v.toFixed(1)) +
        (f.unit || '');
    }
    setFilters(p => ({ ...p, [f.key]: f.default }));
  }, [f, setFilters]);

  return (
    <div style={{ marginBottom: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
        <span style={{ fontSize: '13px', fontWeight: 500, color: changed ? accent : dm ? '#ccc' : '#666' }}>{f.label}</span>
        <span ref={labelRef} style={{ fontSize: '12px', color: '#bbb', fontVariantNumeric: 'tabular-nums' }}>
          {(value > 0 && f.default === 0 ? '+' : '') + (Number.isInteger(value) ? value : value.toFixed(1)) + (f.unit || '')}
        </span>
      </div>
      <input
        ref={inputRef}
        type="range" className="sl"
        min={f.min} max={f.max} step={f.max <= 20 ? 0.5 : 1}
        defaultValue={value}
        style={{ '--v': `${pct}%` }}
        onInput={onInput}
        onPointerUp={onPointerUp}
        onKeyUp={onKeyUp}
        onDoubleClick={onDoubleClick}
      />
    </div>
  );
});


export function BatchPage({ dm, cardBg, cardBdr, inputSt, isMobile = false,
  sourceHandle, outputHandle, batchImages, selectSourceFolder, selectRawSourceFolder, selectOutputFolder,
  user, setActiveTab,
  batchResizeMode, setBatchResizeMode, batchResizePreset, setBatchResizePreset,
  batchCustomW, setBatchCustomW, batchCustomH, setBatchCustomH,
  batchKeepAspect, setBatchKeepAspect, batchLongEdgePx, setBatchLongEdgePx,
  batchAutoLevels, setBatchAutoLevels, batchAutoContrast, setBatchAutoContrast,
  batchSharpen, setBatchSharpen, batchSharpenAmt, setBatchSharpenAmt, batchSharpenRad, setBatchSharpenRad,
  batchDenoise, setBatchDenoise, batchDenoiseAmt, setBatchDenoiseAmt,
  batchLogo, setBatchLogo, batchLogoFile, setBatchLogoFile, handleBatchLogoUpload,
  batchLogoScale, setBatchLogoScale, batchLogoScalePortrait, setBatchLogoScalePortrait, batchLogoOpacity, setBatchLogoOpacity,
  batchLogoPos, setBatchLogoPos, batchLogoMargin, setBatchLogoMargin,
  batchOutputFmt, setBatchOutputFmt, batchOutputQ, setBatchOutputQ,
  batchPrefix, setBatchPrefix, batchSuffix, setBatchSuffix,
  batchProcessing, batchProgress, batchDone, handleBatchProcess,
  batchPreviewIdx, batchPreviewOrigUrl, batchPreviewAfterUrl,
  batchPreviewLoading, batchPreviewSplit, setBatchPreviewSplit,
  batchPreviewDragging, setBatchPreviewDragging,
  batchPreviewOpen, setBatchPreviewOpen, generateBatchPreview,
  filters, setFilters, resetAll, calcBatchDims, batchFilterGroup, setBatchFilterGroup,
  batchAiUpscale, setBatchAiUpscale, batchAiBeauty, setBatchAiBeauty,
  batchAiScale, setBatchAiScale, batchAiBeautySmooth, setBatchAiBeautySmooth,
  batchAiBeautyClarity, setBatchAiBeautyClarity, batchAiBeautyGlow, setBatchAiBeautyGlow,
  batchAiFaceRestore, setBatchAiFaceRestore, batchAiBeautyUseMask, setBatchAiBeautyUseMask,
  batchSection, setBatchSection, batchRawFiles, setBatchRawFiles, handleRawBatchProcess, batchLogs, addBatchLog
}) {

  const bg = dm ? '#121212' : '#f0f1f5';
  const panelBg = dm ? '#1e1e1e' : '#ffffff';
  const accent = '#6c63ff';

  const Card = ({ children, style = {} }) => (
    <div style={{ background: panelBg, border: `1px solid ${cardBdr}`, borderRadius: "14px", padding: "18px", display: "flex", flexDirection: "column", gap: "12px", ...style }}>
      {children}
    </div>
  );

  const SecLabel = ({ icon, children }) => (
    <div style={{ display: "flex", alignItems: "center", gap: "7px", marginBottom: "2px" }}>
      <span style={{ fontSize: "15px" }}>{icon}</span>
      <span style={{ fontSize: "12px", fontWeight: 700, color: "#aaa", letterSpacing: ".07em", textTransform: "uppercase" }}>{children}</span>
    </div>
  );

  const Toggle = ({ checked, onChange, label, sub }) => (
    <label style={{ display: "flex", alignItems: "flex-start", gap: "10px", cursor: "pointer", padding: "10px 12px", border: `1.5px solid ${checked ? accent : cardBdr}`, borderRadius: "10px", background: checked ? (dm ? '#1e1a3a' : '#faf9ff') : dm ? '#252525' : '#fafafa', transition: "all .18s" }}>
      <input type="checkbox" checked={checked} onChange={onChange} style={{ width: "18px", height: "18px", marginTop: "1px", accentColor: accent, flexShrink: 0 }} />
      <div>
        <div style={{ fontSize: "13px", fontWeight: 600, color: checked ? accent : dm ? '#ddd' : '#333' }}>{label}</div>
        {sub && <div style={{ fontSize: "11px", color: "#999", marginTop: "2px", lineHeight: 1.4 }}>{sub}</div>}
      </div>
    </label>
  );

  const isRaw = batchSection === "raw";
  const currentFiles = isRaw ? batchRawFiles : batchImages;

  // Live CSS filter string — applied directly to the preview <img> at 60fps, no JPEG re-encode needed
  const batchCssFilter = toCSSFilter(filters);
  const batchTempAlpha = Math.abs(filters.temperature) / 300;
  const batchTempColor = filters.temperature > 0 ? `rgba(255,140,0,${batchTempAlpha})` : `rgba(100,149,237,${batchTempAlpha})`;

  const previewCallbackRef = useRef(generateBatchPreview);
  useEffect(() => {
    previewCallbackRef.current = generateBatchPreview;
  }, [generateBatchPreview]);

  const memoizedPreviewBar = useMemo(() => {
    return currentFiles.slice(0, 200).map((img, i) => (
      <button key={i} onClick={() => previewCallbackRef.current(i, isRaw)}
        style={{ flexShrink: 0, padding: "5px 12px", border: `1.5px solid ${batchPreviewIdx === i ? '#6c63ff' : cardBdr}`,
          background: batchPreviewIdx === i ? (dm ? '#1e1a3a' : '#faf9ff') : dm ? '#252525' : '#fff',
          borderRadius: "8px", fontSize: "11px", fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
          color: batchPreviewIdx === i ? '#6c63ff' : dm ? '#ccc' : '#555',
          maxWidth: "160px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          transition: "all .15s" }}>
        {img.name}
      </button>
    ));
  }, [isRaw, currentFiles, batchPreviewIdx, dm, cardBdr]);
  const canProcess = !batchProcessing && sourceHandle && outputHandle && currentFiles.length > 0;

  const activeEnhancements = [
    batchResizeMode !== "none" && "📐 Resize",
    batchAutoContrast && "⚡ Auto Contrast",
    batchAutoLevels && "🎨 Auto Levels",
    batchDenoise && "🌊 Denoise",
    batchSharpen && "🔍 Sharpen",
    batchAiBeauty && "✨ AI Beauty",
    batchAiUpscale && "⬆️ AI Upscale",
    batchLogo && "🏷 Watermark",
  ].filter(Boolean);

  return (
    <div style={{ height: "calc(100vh - 52px)", overflowY: "auto", background: bg }}>
      <div style={{ background: panelBg, borderBottom: `1px solid ${cardBdr}`, padding: "14px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "16px", flexWrap: "wrap", position: "sticky", top: 0, zIndex: 20 }}>
        <div>
          <div style={{ fontSize: "16px", fontWeight: 700, color: dm ? '#f0f0f0' : '#1a1a2e', marginBottom: "2px" }}>📦 {isRaw ? "RAW Batch Processor" : "Standard Batch Processor"}</div>
          <div style={{ fontSize: "12px", color: "#999" }}>
            {currentFiles.length > 0 ? `${currentFiles.length} images queued` : "No source folder selected"}
            {Object.entries(filters).filter(([k, v]) => v !== DEFAULT_FILTERS[k]).length > 0 && ` · ✏️ ${Object.entries(filters).filter(([k, v]) => v !== DEFAULT_FILTERS[k]).length} adjustments`}
            {activeEnhancements.length > 0 && " · " + activeEnhancements.join(" · ")}
          </div>
        </div>
        <div style={{ display: "flex", gap: "8px", alignItems: "center", flexShrink: 0 }}>
          {((!isRaw && batchImages.length > 0) || (isRaw && batchRawFiles.length > 0)) && (
            <button
              onClick={() => {
                if (!batchPreviewOpen) {
                  setBatchPreviewOpen(true);
                  if (batchPreviewIdx === null) generateBatchPreview(0, isRaw);
                } else {
                  setBatchPreviewOpen(false);
                }
              }}
              style={{ padding: "10px 16px", border: `1.5px solid ${batchPreviewOpen ? '#6c63ff' : cardBdr}`,
                borderRadius: "10px", fontFamily: "inherit", fontWeight: 700, fontSize: "13px", cursor: "pointer",
                background: batchPreviewOpen ? (dm ? '#1e1a3a' : '#faf9ff') : dm ? '#252525' : '#fff',
                color: batchPreviewOpen ? '#6c63ff' : dm ? '#aaa' : '#666',
                transition: "all .2s", display: "flex", alignItems: "center", gap: "6px" }}>
              👁 {batchPreviewOpen ? "Hide Preview" : "Preview"}
            </button>
          )}
          <button
            onClick={isRaw ? handleRawBatchProcess : handleBatchProcess}
            disabled={!canProcess}
            style={{ padding: "10px 24px", border: "none", borderRadius: "10px", fontFamily: "inherit", fontWeight: 700, fontSize: "14px", cursor: canProcess ? "pointer" : "not-allowed",
              background: canProcess ? "linear-gradient(135deg,#6c63ff,#a78bfa)" : (dm ? '#333' : '#ddd'),
              color: canProcess ? "#fff" : (dm ? '#555' : '#aaa'),
              boxShadow: canProcess ? "0 2px 12px rgba(108,99,255,.35)" : "none",
              transition: "all .2s", display: "flex", alignItems: "center", gap: "8px" }}>
            {batchProcessing
              ? <><Spin />Processing {batchProgress.current}/{batchProgress.total}…</>
              : batchDone ? "✅ Done — Run Again"
                : canProcess ? `⚡ Process ${currentFiles.length} Image${currentFiles.length !== 1 ? "s" : ""}`
                  : !sourceHandle ? "Select source folder →"
                    : !outputHandle ? "Select output folder →"
                      : "Add images to source folder"}
          </button>
        </div>
      </div>

      <div style={{ background: panelBg, borderBottom: `1px solid ${cardBdr}`, padding: "0 24px", display: "flex", gap: "24px" }}>
        {[
          { id: "folders", label: "Standard Batch", icon: "📦" },
          { id: "raw", label: "RAW Processor", icon: "📸" },
        ].map(t => (
          <button key={t.id} onClick={() => setBatchSection(t.id)}
            style={{ 
              padding: "14px 4px", 
              fontSize: "13px", 
              fontWeight: 700, 
              color: batchSection === t.id ? accent : "#999", 
              background: "none", 
              border: "none", 
              borderBottom: `3px solid ${batchSection === t.id ? accent : "transparent"}`,
              cursor: "pointer", 
              fontFamily: "inherit",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              transition: "all .2s"
            }}>
            <span>{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      {batchProcessing && (
        <div style={{ height: "3px", background: dm ? '#333' : '#eee' }}>
          <div style={{ height: "100%", width: `${(batchProgress.current / batchProgress.total) * 100}%`, background: "linear-gradient(90deg,#6c63ff,#a78bfa)", transition: "width .3s" }} />
        </div>
      )}
      {batchDone && !batchProcessing && (
        <div style={{ background: "#f0fff4", borderBottom: "1px solid #86efac", padding: "10px 24px", fontSize: "13px", fontWeight: 600, color: "#16a34a", textAlign: "center" }}>
          ✅ Done! {batchSection === 'raw' ? batchRawFiles.length : batchImages.length} images saved to output folder.
        </div>
      )}

      {batchPreviewOpen && ((!isRaw && batchImages.length > 0) || (isRaw && batchRawFiles.length > 0)) && (
        <div style={{ borderBottom: `1px solid ${cardBdr}`, background: dm ? '#161616' : '#f8f8fd' }}>

          <div style={{ padding: "10px 24px 0", display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
            <span style={{ fontSize: "12px", fontWeight: 700, color: dm ? '#aaa' : '#888', textTransform: "uppercase", letterSpacing: ".06em", whiteSpace: "nowrap" }}>
              👁 Preview image:
            </span>
            <div style={{ display: "flex", gap: "6px", overflowX: "auto", paddingBottom: "4px", flex: 1 }}>
              {memoizedPreviewBar}
            </div>
            <button onClick={() => setBatchPreviewOpen(false)}
              style={{ background: dm ? '#333' : '#f2f2f8', border: "none", borderRadius: "8px", padding: "5px 10px", fontSize: "12px", color: dm ? '#aaa' : '#888', cursor: "pointer", fontWeight: 600, flexShrink: 0 }}>
              ✕ Close
            </button>
          </div>

          {batchPreviewLoading && (
            <div style={{ height: "300px", display: "flex", alignItems: "center", justifyContent: "center", gap: "10px", color: "#6c63ff", fontWeight: 600, fontSize: "13px" }}>
              <span style={{ display: "inline-block", width: "18px", height: "18px", border: "2px solid #6c63ff44", borderTopColor: "#6c63ff", borderRadius: "50%", animation: "spin .8s linear infinite" }} />
              Generating preview…
            </div>
          )}

          {!batchPreviewLoading && batchPreviewOrigUrl && batchPreviewAfterUrl && (
            <div style={{ padding: "12px 24px 16px" }}>
              <div
                style={{ position: "relative", userSelect: "none", cursor: batchPreviewDragging ? "grabbing" : "ew-resize", borderRadius: "10px", overflow: "hidden",
                  boxShadow: "0 4px 24px rgba(0,0,0,.18)", maxHeight: "60vh", lineHeight: 0,
                  background: dm ? '#111' : '#000' }}
                onMouseDown={() => setBatchPreviewDragging(true)}
                onMouseMove={e => {
                  if (!batchPreviewDragging) return;
                  const r = e.currentTarget.getBoundingClientRect();
                  setBatchPreviewSplit(Math.min(95, Math.max(5, ((e.clientX - r.left) / r.width) * 100)));
                }}
                onMouseUp={() => setBatchPreviewDragging(false)}
                onMouseLeave={() => setBatchPreviewDragging(false)}
                onTouchMove={e => {
                  e.preventDefault();
                  const r = e.currentTarget.getBoundingClientRect();
                  setBatchPreviewSplit(Math.min(95, Math.max(5, ((e.touches[0].clientX - r.left) / r.width) * 100)));
                }}>

                {/* After image — CSS filters applied live at 60fps, exactly like the Edit tab */}
                <div style={{ position: "relative", lineHeight: 0 }}>
                  <img src={batchPreviewAfterUrl} alt="after"
                    style={{ width: "100%", maxHeight: "60vh", objectFit: "contain", display: "block",
                      filter: batchCssFilter, transition: "filter .08s ease" }} />
                  {filters.temperature !== 0 && (
                    <div style={{ position: "absolute", inset: 0, background: batchTempColor,
                      mixBlendMode: "overlay", pointerEvents: "none",
                      clipPath: `inset(0 ${100 - batchPreviewSplit}% 0 0)` }} />
                  )}
                  {filters.fade > 0 && (
                    <div style={{ position: "absolute", inset: 0,
                      background: `rgba(255,255,255,${filters.fade / 180})`,
                      mixBlendMode: "screen", pointerEvents: "none",
                      clipPath: `inset(0 ${100 - batchPreviewSplit}% 0 0)` }} />
                  )}
                  {filters.vignette > 0 && (
                    <div style={{ position: "absolute", inset: 0,
                      background: `radial-gradient(ellipse at center,transparent 38%,rgba(0,0,0,${filters.vignette / 100}) 100%)`,
                      pointerEvents: "none",
                      clipPath: `inset(0 ${100 - batchPreviewSplit}% 0 0)` }} />
                  )}
                </div>

                <div style={{ position: "absolute", inset: 0, clipPath: `inset(0 0 0 ${batchPreviewSplit}%)`, pointerEvents: "none" }}>
                  <img src={batchPreviewOrigUrl} alt="before"
                    style={{ width: "100%", maxHeight: "60vh", objectFit: "contain", display: "block" }} />
                </div>

                <div
                  onMouseDown={e => { e.preventDefault(); setBatchPreviewDragging(true); }}
                  onTouchStart={() => setBatchPreviewDragging(true)}
                  style={{ position: "absolute", top: 0, bottom: 0, left: `${batchPreviewSplit}%`, transform: "translateX(-50%)",
                    width: "44px", zIndex: 10, display: "flex", alignItems: "center", justifyContent: "center", cursor: "ew-resize" }}>
                  <div style={{ width: "2px", height: "100%", background: "rgba(255,255,255,.9)", boxShadow: "0 0 8px rgba(0,0,0,.5)" }} />
                  <div style={{ position: "absolute", width: "38px", height: "38px", borderRadius: "50%",
                    background: "#fff", boxShadow: "0 2px 14px rgba(0,0,0,.3)",
                    display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px", color: "#6c63ff", fontWeight: 700 }}>
                    ⇄
                  </div>
                </div>

                <div style={{ position: "absolute", bottom: "10px", left: "10px", padding: "3px 10px",
                  background: "rgba(108,99,255,.85)", borderRadius: "20px", fontSize: "11px", fontWeight: 700, color: "#fff",
                  clipPath: `inset(0 ${100 - batchPreviewSplit}% 0 0)` }}>AFTER</div>
                <div style={{ position: "absolute", bottom: "10px", right: "10px", padding: "3px 10px",
                  background: "rgba(0,0,0,.55)", borderRadius: "20px", fontSize: "11px", fontWeight: 700, color: "#fff",
                  clipPath: `inset(0 0 0 ${batchPreviewSplit}%)` }}>BEFORE</div>
              </div>

              <div style={{ display: "flex", gap: "16px", marginTop: "10px", flexWrap: "wrap", alignItems: "center" }}>
                <span style={{ fontSize: "11px", color: "#bbb" }}>
                  ← Drag to compare · {batchSection === 'raw' ? batchRawFiles[batchPreviewIdx]?.name : batchImages[batchPreviewIdx]?.name}
                </span>
                <div style={{ display: "flex", gap: "6px", marginLeft: "auto", flexWrap: "wrap" }}>
                  {[
                    batchResizeMode !== "none" && "📐 Resize",
                    batchAutoContrast && "⚡ Contrast",
                    batchAutoLevels && "🎨 Levels",
                    batchDenoise && "🌊 Denoise",
                    batchSharpen && "🔍 Sharpen",
                    batchAiBeauty && "✨ Beauty",
                    batchAiUpscale && "⬆️ Upscale",
                    batchLogo && "🏷 Logo"
                  ].filter(Boolean).map(t => (
                    <span key={t} style={{ padding: "2px 8px", background: dm ? '#2a2a3a' : '#f0eeff', borderRadius: "12px", fontSize: "10px", fontWeight: 600, color: "#7c3aed" }}>{t}</span>
                  ))}
                </div>
              </div>

              <div style={{ marginTop: "12px", paddingTop: "12px", borderTop: `1px solid ${cardBdr}` }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
                  <span style={{ fontSize: "11px", fontWeight: 700, color: dm ? '#aaa' : '#888', textTransform: "uppercase", letterSpacing: ".06em", whiteSpace: "nowrap" }}>
                    🎨 Presets
                  </span>
                  {Object.entries(filters).some(([k, v]) => v !== DEFAULT_FILTERS[k]) && (
                    <button onClick={resetAll}
                      style={{ fontSize: "11px", color: '#6c63ff', background: "none", border: "none", cursor: "pointer", fontWeight: 700, padding: "2px 6px", fontFamily: "inherit" }}>
                      Reset ↺
                    </button>
                  )}
                </div>
                <div style={{ display: "flex", gap: "8px", overflowX: "auto", paddingBottom: "4px" }}>
                  {PRESETS.map(p => (
                    <button key={p.name}
                      onClick={() => { setFilters({ ...DEFAULT_FILTERS, ...p.values }); }}
                      style={{ flexShrink: 0, padding: "8px 12px",
                        border: `1.5px solid ${JSON.stringify(filters) === JSON.stringify({ ...DEFAULT_FILTERS, ...p.values }) ? '#6c63ff' : cardBdr}`,
                        background: JSON.stringify(filters) === JSON.stringify({ ...DEFAULT_FILTERS, ...p.values }) ? (dm ? '#1e1a3a' : '#faf9ff') : dm ? '#252525' : '#fff',
                        borderRadius: "10px", textAlign: "center", cursor: "pointer", fontFamily: "inherit", minWidth: "68px",
                        transition: "all .15s" }}>
                      <div style={{ fontSize: "18px", marginBottom: "3px" }}>{p.icon}</div>
                      <div style={{ fontSize: "10px", fontWeight: 700, color: dm ? '#ccc' : '#555' }}>{p.name}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {!batchPreviewLoading && !batchPreviewOrigUrl && (
            <div style={{ height: "120px", display: "flex", alignItems: "center", justifyContent: "center", color: "#bbb", fontSize: "13px" }}>
              Select an image above to preview ↑
            </div>
          )}
        </div>
      )}

      {!batchPreviewOpen && (
        <div style={{ borderBottom: `1px solid ${cardBdr}`, background: dm ? '#1a1a1a' : '#fff', padding: "10px 24px", display: "flex", alignItems: "center", gap: "12px" }}>
          <span style={{ fontSize: "11px", fontWeight: 700, color: dm ? '#aaa' : '#888', textTransform: "uppercase", letterSpacing: ".06em", whiteSpace: "nowrap" }}>
            🎨 Presets
          </span>
          <div style={{ display: "flex", gap: "7px", overflowX: "auto", paddingBottom: "2px", flex: 1 }}>
            {PRESETS.map(p => (
              <button key={p.name}
                onClick={() => setFilters({ ...DEFAULT_FILTERS, ...p.values })}
                style={{ flexShrink: 0, padding: "6px 12px",
                  border: `1.5px solid ${cardBdr}`,
                  background: dm ? '#252525' : '#f8f8fd',
                  borderRadius: "9px", display: "flex", alignItems: "center", gap: "6px",
                  cursor: "pointer", fontFamily: "inherit", transition: "all .15s",
                  whiteSpace: "nowrap" }}>
                <span style={{ fontSize: "15px" }}>{p.icon}</span>
                <span style={{ fontSize: "11px", fontWeight: 600, color: dm ? '#ccc' : '#555' }}>{p.name}</span>
              </button>
            ))}
          </div>
          {Object.entries(filters).some(([k, v]) => v !== DEFAULT_FILTERS[k]) && (
            <button onClick={resetAll}
              style={{ flexShrink: 0, fontSize: "12px", color: '#6c63ff', background: "none", border: "none", cursor: "pointer", fontWeight: 700, fontFamily: "inherit" }}>
              Reset ↺
            </button>
          )}
        </div>
      )}

      <div style={{
        display: "grid",
        gridTemplateColumns: isMobile ? "1fr" : "280px 260px 1fr 260px",
        gap: "16px",
        padding: "20px 24px 40px",
        maxWidth: "1400px",
        margin: "0 auto"
      }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <Card>
            <SecLabel icon="📁">Source Folder</SecLabel>
            <button onClick={isRaw ? selectRawSourceFolder : selectSourceFolder}
              style={{ width: "100%", padding: "11px", background: "linear-gradient(135deg,#6c63ff,#a78bfa)", color: "#fff", border: "none", borderRadius: "9px", fontSize: "13px", fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
              {sourceHandle ? "📁 Change Folder" : `📁 Select ${isRaw ? "RAW" : "Source"} Folder`}
            </button>
            {currentFiles.length > 0
              ? <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "8px 12px", background: dm ? '#1a3a1a' : '#f0fff4', border: "1.5px solid #86efac", borderRadius: "8px" }}>
                <span style={{ fontSize: "20px" }}>{isRaw ? "📸" : "🖼"}</span>
                <div>
                  <div style={{ fontSize: "13px", fontWeight: 700, color: "#16a34a" }}>{currentFiles.length} {isRaw ? "RAW files" : "images"} found</div>
                  <div style={{ fontSize: "11px", color: "#aaa" }}>{isRaw ? "NEF · CR2 · ARW" : "JPG · PNG · WebP"}</div>
                </div>
              </div>
              : <div style={{ fontSize: "11px", color: "#bbb", textAlign: "center", padding: "6px 0" }}>{isRaw ? "Professional RAW formats" : "JPG, PNG, WebP accepted"}</div>}
          </Card>

          {isRaw && (
            <RawBatchPanel {...{ user, setActiveTab, dm, cardBg, cardBdr, inputSt, accent, batchRawFiles, setBatchRawFiles, batchProcessing, batchProgress, handleRawBatchProcess, batchDone, inline: true, batchLogs, addBatchLog }} />
          )}

          <Card>
            <SecLabel icon="💾">Output Folder</SecLabel>
            <button onClick={selectOutputFolder}
              style={{ width: "100%", padding: "11px", background: outputHandle ? "linear-gradient(135deg,#059669,#34d399)" : "linear-gradient(135deg,#374151,#6b7280)", color: "#fff", border: "none", borderRadius: "9px", fontSize: "13px", fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
              {outputHandle ? "✓ Output Set — Change" : "💾 Select Output Folder"}
            </button>
            <div style={{ fontSize: "11px", color: "#bbb" }}>Processed files are saved here</div>
          </Card>

          <Card>
            <SecLabel icon="💾">Output Format</SecLabel>
            <div style={{ display: "flex", gap: "6px" }}>
              {[{ id: "jpeg", l: "JPEG" }, { id: "png", l: "PNG" }, { id: "webp", l: "WebP" }].map(f => (
                <button key={f.id} onClick={() => setBatchOutputFmt(f.id)}
                  style={{ flex: 1, padding: "8px 4px", border: `1.5px solid ${batchOutputFmt === f.id ? accent : cardBdr}`, background: batchOutputFmt === f.id ? (dm ? '#1e1a3a' : '#faf9ff') : dm ? '#252525' : '#f8f8fd', borderRadius: "8px", fontSize: "12px", fontWeight: 700, cursor: "pointer", color: batchOutputFmt === f.id ? accent : dm ? '#ccc' : '#555', fontFamily: "inherit", transition: "all .18s" }}>
                  {f.l}
                </button>
              ))}
            </div>
            {batchOutputFmt !== "png" && (
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "5px" }}>
                  <span style={{ fontSize: "11px", color: "#aaa", fontWeight: 600, textTransform: "uppercase", letterSpacing: ".05em" }}>Quality</span>
                  <span style={{ fontSize: "12px", color: accent, fontWeight: 700 }}>{batchOutputQ}%</span>
                </div>
                <SmoothSlider min={60} max={100} step={1} value={batchOutputQ} defaultValue={90} onChange={setBatchOutputQ} />
                <div style={{ display: "flex", gap: "5px", marginTop: "8px" }}>
                  {[75, 85, 90, 95].map(q => (
                    <button key={q} onClick={() => setBatchOutputQ(q)}
                      style={{ flex: 1, padding: "5px", border: `1px solid ${batchOutputQ === q ? accent : cardBdr}`, background: batchOutputQ === q ? (dm ? '#1e1a3a' : '#faf9ff') : dm ? '#252525' : '#f8f8fd', borderRadius: "6px", fontSize: "10px", fontWeight: 600, cursor: "pointer", color: batchOutputQ === q ? accent : dm ? '#bbb' : '#777', fontFamily: "inherit" }}>
                      {q}%
                    </button>
                  ))}
                </div>
              </div>
            )}
          </Card>

          <Card>
            <SecLabel icon="🏷">Filename Template</SecLabel>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
              <div>
                <div style={{ fontSize: "10px", fontWeight: 600, color: "#aaa", textTransform: "uppercase", letterSpacing: ".05em", marginBottom: "4px" }}>Prefix</div>
                <input type="text" value={batchPrefix} onChange={e => setBatchPrefix(e.target.value)} placeholder="shop_" style={inputSt} />
              </div>
              <div>
                <div style={{ fontSize: "10px", fontWeight: 600, color: "#aaa", textTransform: "uppercase", letterSpacing: ".05em", marginBottom: "4px" }}>Suffix</div>
                <input type="text" value={batchSuffix} onChange={e => setBatchSuffix(e.target.value)} placeholder="_v2" style={inputSt} />
              </div>
            </div>
            <div style={{ padding: "8px 10px", background: dm ? '#252525' : '#f2f2f8', borderRadius: "7px", fontSize: "11px", color: dm ? '#bbb' : '#888', fontFamily: "monospace" }}>
              {batchPrefix || ""}photo001{batchSuffix || "_edited"}.{batchOutputFmt === "jpeg" ? "jpg" : batchOutputFmt}
            </div>
          </Card>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <Card style={{ flex: 1 }}>
            <SecLabel icon="🎛">Adjustments</SecLabel>
            <div style={{ display: "flex", gap: "2px", background: dm ? '#252525' : '#f2f2f8', padding: "3px", borderRadius: "9px" }}>
              {FILTER_GROUPS.map(g => (
                <button key={g.key} onClick={() => setBatchFilterGroup(g.key)}
                  style={{ flex: 1, padding: "5px 4px", fontSize: "11px", fontWeight: 600, border: "none", cursor: "pointer",
                    fontFamily: "inherit", background: batchFilterGroup === g.key ? (dm ? '#444' : '#fff') : 'transparent',
                    color: batchFilterGroup === g.key ? accent : '#999', borderRadius: "7px",
                    boxShadow: batchFilterGroup === g.key ? "0 1px 3px rgba(0,0,0,.1)" : "none", transition: "all .15s",
                    whiteSpace: "nowrap" }}>
                  {g.label}
                </button>
              ))}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "14px", marginTop: "4px" }}>
              {batchFilterGroup === 'ai' ? (
                <>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "12px", background: dm ? '#222' : '#f8f8fd', borderRadius: "10px", border: `1px solid ${cardBdr}` }}>
                    <input type="checkbox" id="baib" checked={batchAiBeauty} onChange={e => setBatchAiBeauty(e.target.checked)} style={{ accentColor: accent, width: "16px", height: "16px" }} />
                    <label htmlFor="baib" style={{ fontSize: "13px", fontWeight: 700, cursor: "pointer", color: dm ? '#eee' : '#333' }}>AI Beauty (Skin Smoothing)</label>
                  </div>
                  {batchAiBeauty && (
                    <div style={{ paddingLeft: "10px", borderLeft: `2px solid ${accent}`, display: "flex", flexDirection: "column", gap: "12px", marginLeft: "8px" }}>
                      <div>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "5px" }}>
                          <span style={{ fontSize: "12px", color: dm ? '#ccc' : '#555' }}>Smooth</span>
                          <span style={{ fontSize: "11px", color: accent, fontWeight: 700 }}>{batchAiBeautySmooth}</span>
                        </div>
                        <SmoothSlider min={1} max={10} step={1} value={batchAiBeautySmooth} defaultValue={5} onChange={setBatchAiBeautySmooth} />
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                         <input type="checkbox" id="baibm" checked={batchAiBeautyUseMask} onChange={e => setBatchAiBeautyUseMask(e.target.checked)} style={{ accentColor: accent }} />
                         <label htmlFor="baibm" style={{ fontSize: "12px", color: dm ? '#ccc' : '#555' }}>Use Face Masking (Recommended)</label>
                      </div>
                    </div>
                  )}

                  <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "12px", background: dm ? '#222' : '#f8f8fd', borderRadius: "10px", border: `1px solid ${cardBdr}` }}>
                    <input type="checkbox" id="baifr" checked={batchAiFaceRestore} onChange={e => setBatchAiFaceRestore(e.target.checked)} style={{ accentColor: accent, width: "16px", height: "16px" }} />
                    <label htmlFor="baifr" style={{ fontSize: "13px", fontWeight: 700, cursor: "pointer", color: dm ? '#eee' : '#333' }}>AI Face Restore (fal.ai)</label>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "12px", background: dm ? '#222' : '#f8f8fd', borderRadius: "10px", border: `1px solid ${cardBdr}` }}>
                    <input type="checkbox" id="baiu" checked={batchAiUpscale} onChange={e => setBatchAiUpscale(e.target.checked)} style={{ accentColor: accent, width: "16px", height: "16px" }} />
                    <label htmlFor="baiu" style={{ fontSize: "13px", fontWeight: 700, cursor: "pointer", color: dm ? '#eee' : '#333' }}>AI Upscale (2x / 4x)</label>
                  </div>
                  {batchAiUpscale && (
                    <div style={{ paddingLeft: "10px", borderLeft: `2px solid ${accent}`, display: "flex", flexDirection: "column", gap: "12px", marginLeft: "8px" }}>
                       <div style={{ display: "flex", gap: "6px" }}>
                         {[2, 4].map(s => (
                           <button key={s} onClick={() => setBatchAiScale(s)} style={{ flex: 1, padding: "6px", background: batchAiScale === s ? accent : 'transparent', color: batchAiScale === s ? '#fff' : (dm ? '#ccc' : '#555'), border: `1px solid ${batchAiScale === s ? accent : cardBdr}`, borderRadius: "6px", fontSize: "12px", cursor: "pointer" }}>{s}x Scale</button>
                         ))}
                       </div>
                    </div>
                  )}
                  <div style={{ padding: "10px", background: dm ? "rgba(255, 193, 7, 0.1)" : "#fff3cd", color: dm ? "#ffc107" : "#856404", borderRadius: "8px", fontSize: "11px", lineHeight: 1.4, marginTop: "8px" }}>
                    <strong>Note:</strong> AI operations run locally or via cloud APIs and will significantly increase processing time per image.
                  </div>
                </>
              ) : (
                COLOR_FILTERS.filter(f => f.group === batchFilterGroup).map(f => (
                  <BatchFilterSlider key={f.key} f={f} value={filters[f.key]} setFilters={setFilters} dm={dm} accent={accent} />
                ))
              )}
            </div>
            {Object.entries(filters).some(([k, v]) => v !== DEFAULT_FILTERS[k]) && (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "8px", borderTop: `1px solid ${cardBdr}`, marginTop: "4px" }}>
                <span style={{ fontSize: "11px", color: "#bbb" }}>
                  {Object.entries(filters).filter(([k, v]) => v !== DEFAULT_FILTERS[k]).length} active
                </span>
                <button onClick={resetAll}
                  style={{ fontSize: "11px", color: accent, background: "none", border: "none", cursor: "pointer", fontWeight: 700, fontFamily: "inherit" }}>
                  Reset all
                </button>
              </div>
            )}
          </Card>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

          <Card>
            <SecLabel icon="📐">Resize</SecLabel>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px" }}>
              {[
                { id: "none", l: "No Resize", i: "🚫" },
                { id: "preset", l: "Social Preset", i: "📱" },
                { id: "longEdge", l: "Long Edge", i: "📏" },
                { id: "custom", l: "Custom Size", i: "🎛" },
              ].map(o => (
                <button key={o.id} onClick={() => setBatchResizeMode(o.id)}
                  style={{ padding: "10px 8px", border: `1.5px solid ${batchResizeMode === o.id ? accent : cardBdr}`, background: batchResizeMode === o.id ? (dm ? '#1e1a3a' : '#faf9ff') : dm ? '#252525' : '#f8f8fd', borderRadius: "9px", cursor: "pointer", textAlign: "left", fontFamily: "inherit", transition: "all .18s", display: "flex", alignItems: "center", gap: "7px" }}>
                  <span style={{ fontSize: "16px" }}>{o.i}</span>
                  <span style={{ fontSize: "12px", fontWeight: 600, color: batchResizeMode === o.id ? accent : dm ? '#ccc' : '#444' }}>{o.l}</span>
                </button>
              ))}
            </div>

            {batchResizeMode === "preset" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px", paddingTop: "4px", borderTop: `1px solid ${cardBdr}` }}>
                <select value={batchResizePreset} onChange={e => setBatchResizePreset(e.target.value)} style={inputSt}>
                  {BATCH_RESIZE_PRESETS.map(p => <option key={p.id} value={p.id}>{p.label} — {p.w}×{p.h || 'auto'}</option>)}
                </select>
                <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "12px", color: dm ? '#ccc' : '#555' }}>
                  <input type="checkbox" checked={batchKeepAspect} onChange={e => setBatchKeepAspect(e.target.checked)} style={{ accentColor: accent, width: "15px", height: "15px" }} />
                  Maintain aspect ratio
                </label>
              </div>
            )}

            {batchResizeMode === "longEdge" && (
              <div style={{ paddingTop: "4px", borderTop: `1px solid ${cardBdr}`, display: "flex", flexDirection: "column", gap: "8px" }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontSize: "12px", color: dm ? '#ccc' : '#555' }}>Long edge target</span>
                  <span style={{ fontSize: "13px", fontWeight: 700, color: accent }}>{batchLongEdgePx.toLocaleString()}px</span>
                </div>
                <SmoothSlider min={400} max={8000} step={100} value={batchLongEdgePx} defaultValue={2400} onChange={setBatchLongEdgePx} />
                <div style={{ display: "flex", gap: "5px", flexWrap: "wrap" }}>
                  {[800, 1200, 1920, 2560, 3840].map(v => (
                    <button key={v} onClick={() => setBatchLongEdgePx(v)}
                      style={{ padding: "4px 10px", border: `1px solid ${batchLongEdgePx === v ? accent : cardBdr}`, background: batchLongEdgePx === v ? (dm ? '#1e1a3a' : '#faf9ff') : dm ? '#252525' : '#f8f8fd', borderRadius: "6px", fontSize: "11px", fontWeight: 600, cursor: "pointer", color: batchLongEdgePx === v ? accent : dm ? '#bbb' : '#666', fontFamily: "inherit" }}>
                      {v >= 1000 ? `${v / 1000}K` : v}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {batchResizeMode === "custom" && (
              <div style={{ paddingTop: "4px", borderTop: `1px solid ${cardBdr}`, display: "flex", flexDirection: "column", gap: "8px" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: "8px", alignItems: "center" }}>
                  <div>
                    <div style={{ fontSize: "10px", fontWeight: 600, color: "#aaa", textTransform: "uppercase", letterSpacing: ".05em", marginBottom: "4px" }}>Width px</div>
                    <input type="number" value={batchCustomW} min={100} max={16000} onChange={e => setBatchCustomW(+e.target.value)} style={inputSt} />
                  </div>
                  <span style={{ color: "#aaa", fontSize: "14px", marginTop: "18px" }}>×</span>
                  <div>
                    <div style={{ fontSize: "10px", fontWeight: 600, color: "#aaa", textTransform: "uppercase", letterSpacing: ".05em", marginBottom: "4px" }}>Height px</div>
                    <input type="number" value={batchCustomH} min={100} max={16000} onChange={e => setBatchCustomH(+e.target.value)} style={inputSt} />
                  </div>
                </div>
                <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "12px", color: dm ? '#ccc' : '#555' }}>
                  <input type="checkbox" checked={batchKeepAspect} onChange={e => setBatchKeepAspect(e.target.checked)} style={{ accentColor: accent, width: "15px", height: "15px" }} />
                  Maintain aspect ratio
                </label>
              </div>
            )}
          </Card>

          <Card>
            <SecLabel icon="✨">Enhancements</SecLabel>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
              <Toggle checked={batchAutoContrast} onChange={e => setBatchAutoContrast(e.target.checked)} label="Auto Contrast" sub="Punchy histogram stretch" />
              <Toggle checked={batchAutoLevels} onChange={e => setBatchAutoLevels(e.target.checked)} label="Auto Levels" sub="Fix colour casts per-channel" />
              <Toggle checked={batchDenoise} onChange={e => setBatchDenoise(e.target.checked)} label="Noise Reduction" sub="Smooth high-ISO grain" />
              <Toggle checked={batchSharpen} onChange={e => setBatchSharpen(e.target.checked)} label="Unsharp Mask" sub="Crisp edge definition" />
            </div>

            {batchDenoise && (
              <div style={{ padding: "12px", background: dm ? '#252525' : '#f8f8fd', border: `1px solid ${cardBdr}`, borderRadius: "9px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "5px" }}>
                  <span style={{ fontSize: "11px", color: "#aaa", fontWeight: 600, textTransform: "uppercase", letterSpacing: ".05em" }}>Denoise Strength</span>
                  <span style={{ fontSize: "12px", color: accent, fontWeight: 700 }}>{batchDenoiseAmt.toFixed(1)}</span>
                </div>
                <SmoothSlider min={0.5} max={5} step={0.5} value={batchDenoiseAmt} defaultValue={2} onChange={setBatchDenoiseAmt} />
              </div>
            )}

            {batchSharpen && (
              <div style={{ padding: "12px", background: dm ? '#252525' : '#f8f8fd', border: `1px solid ${cardBdr}`, borderRadius: "9px", display: "flex", flexDirection: "column", gap: "10px" }}>
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "5px" }}>
                    <span style={{ fontSize: "11px", color: "#aaa", fontWeight: 600, textTransform: "uppercase", letterSpacing: ".05em" }}>Amount</span>
                    <span style={{ fontSize: "12px", color: accent, fontWeight: 700 }}>{batchSharpenAmt.toFixed(1)}×</span>
                  </div>
                  <SmoothSlider min={0.2} max={3} step={0.1} value={batchSharpenAmt} defaultValue={1} onChange={setBatchSharpenAmt} />
                </div>
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "5px" }}>
                    <span style={{ fontSize: "11px", color: "#aaa", fontWeight: 600, textTransform: "uppercase", letterSpacing: ".05em" }}>Radius</span>
                    <span style={{ fontSize: "12px", color: accent, fontWeight: 700 }}>{batchSharpenRad.toFixed(1)}px</span>
                  </div>
                  <SmoothSlider min={0.5} max={4} step={0.5} value={batchSharpenRad} defaultValue={1.5} onChange={setBatchSharpenRad} />
                </div>
              </div>
            )}

            <div style={{ paddingTop: "6px", borderTop: `1px solid ${cardBdr}` }}>
              <div style={{ fontSize: "11px", color: "#aaa", fontWeight: 600, textTransform: "uppercase", letterSpacing: ".05em", marginBottom: "8px" }}>Quick Combos</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px" }}>
                {[
                  { l: "📸 Product", fn: () => { setBatchAutoContrast(true); setBatchAutoLevels(false); setBatchSharpen(true); setBatchSharpenAmt(1.2); setBatchSharpenRad(1.5); setBatchDenoise(false); } },
                  { l: "🤳 Portrait", fn: () => { setBatchAutoContrast(false); setBatchAutoLevels(true); setBatchSharpen(true); setBatchSharpenAmt(0.6); setBatchSharpenRad(1.0); setBatchDenoise(true); setBatchDenoiseAmt(2); } },
                  { l: "🌆 Landscape", fn: () => { setBatchAutoContrast(false); setBatchAutoLevels(true); setBatchSharpen(true); setBatchSharpenAmt(1.8); setBatchSharpenRad(2.0); setBatchDenoise(false); } },
                  { l: "🌙 Low-Light", fn: () => { setBatchAutoContrast(true); setBatchAutoLevels(false); setBatchSharpen(true); setBatchSharpenAmt(0.8); setBatchSharpenRad(1.5); setBatchDenoise(true); setBatchDenoiseAmt(3); } },
                ].map(p => (
                  <button key={p.l} onClick={p.fn}
                    style={{ padding: "8px", border: `1px solid ${cardBdr}`, background: dm ? '#252525' : '#f8f8fd', borderRadius: "8px", fontSize: "12px", fontWeight: 600, cursor: "pointer", color: dm ? '#ccc' : '#444', fontFamily: "inherit", textAlign: "left", transition: "all .15s" }}>
                    {p.l}
                  </button>
                ))}
              </div>
            </div>
          </Card>

          <Card>
            <SecLabel icon="✏️">Active Adjustments</SecLabel>
            <div style={{ display: "flex", gap: "5px", flexWrap: "wrap" }}>
              {Object.entries(filters).filter(([k, v]) => v !== DEFAULT_FILTERS[k]).map(([k]) => (
                <span key={k} style={{ padding: "3px 8px", background: dm ? '#2a2a3a' : '#f0eeff', borderRadius: "20px", fontSize: "11px", fontWeight: 600, color: "#7c3aed" }}>{k}</span>
              ))}
              {Object.entries(filters).every(([k, v]) => v === DEFAULT_FILTERS[k]) && (
                <span style={{ fontSize: "11px", color: "#bbb" }}>No adjustments — use the Edit column ←</span>
              )}
            </div>
          </Card>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {(!user || user.tier !== "team") ? (
            <Card style={{
              position: "relative",
              overflow: "hidden",
              border: `1.5px dashed rgba(108, 99, 255, ${dm ? "0.2" : "0.15"})`,
              background: dm ? "rgba(108, 99, 255, 0.02)" : "rgba(108, 99, 255, 0.015)"
            }}>
              <SecLabel icon="🏷">Logo / Watermark</SecLabel>
              <div style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                textAlign: "center",
                gap: "12px",
                padding: "20px 10px"
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
                    if (setActiveTab) {
                      setActiveTab("home");
                      setTimeout(() => {
                        const el = document.getElementById("pricing-container");
                        if (el) el.scrollIntoView({ behavior: "smooth" });
                      }, 100);
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
            </Card>
          ) : (
            <Card>
              <SecLabel icon="🏷">Logo / Watermark</SecLabel>
              <label style={{ display: "block", padding: "16px 12px", border: `2px dashed ${batchLogo ? accent : cardBdr}`, borderRadius: "10px", cursor: "pointer", textAlign: "center", transition: "all .2s", background: batchLogo ? (dm ? '#1e1a3a' : '#faf9ff') : dm ? '#252525' : '#fafafa' }}>
                <input type="file" accept="image/*" onChange={handleBatchLogoUpload} style={{ display: "none" }} />
                {batchLogo
                  ? <><div style={{ fontSize: "26px", marginBottom: "5px" }}>✅</div><div style={{ fontSize: "12px", fontWeight: 600, color: accent, marginBottom: "2px" }}>{batchLogoFile?.name}</div><div style={{ fontSize: "11px", color: "#bbb" }}>Click to replace</div></>
                  : <><div style={{ fontSize: "26px", marginBottom: "5px" }}>🖼</div><div style={{ fontSize: "12px", fontWeight: 600, color: dm ? '#ccc' : '#555', marginBottom: "2px" }}>Click to upload logo</div><div style={{ fontSize: "11px", color: "#bbb" }}>PNG with transparency works best</div></>}
              </label>
              {batchLogo && (
                <button onClick={() => { setBatchLogo(null); setBatchLogoFile(null); }} style={{ padding: "7px", background: "#fee2e2", border: "none", borderRadius: "7px", fontSize: "12px", color: "#ef4444", fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                  ✕ Remove Logo
                </button>
              )}
            </Card>
          )}

          {batchLogo && (<>
            <Card>
              <SecLabel icon="📐">Logo Size & Opacity</SecLabel>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px" }}>
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "5px" }}>
                    <span style={{ fontSize: "12px", color: dm ? '#ccc' : '#555' }}>Size (Landscape)</span>
                    <span style={{ fontSize: "12px", color: accent, fontWeight: 700 }}>{(batchLogoScale * 100).toFixed(0)}%</span>
                  </div>
                  <SmoothSlider min={0.03} max={1.0} step={0.01} value={batchLogoScale} defaultValue={0.2} onChange={setBatchLogoScale} />
                </div>
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "5px" }}>
                    <span style={{ fontSize: "12px", color: dm ? '#ccc' : '#555' }}>Size (Portrait)</span>
                    <span style={{ fontSize: "12px", color: accent, fontWeight: 700 }}>{(batchLogoScalePortrait * 100).toFixed(0)}%</span>
                  </div>
                  <SmoothSlider min={0.03} max={1.0} step={0.01} value={batchLogoScalePortrait} defaultValue={0.25} onChange={setBatchLogoScalePortrait} />
                </div>
              </div>
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "5px" }}>
                  <span style={{ fontSize: "12px", color: dm ? '#ccc' : '#555' }}>Opacity</span>
                  <span style={{ fontSize: "12px", color: accent, fontWeight: 700 }}>{Math.round(batchLogoOpacity * 100)}%</span>
                </div>
                <SmoothSlider min={0.1} max={1} step={0.05} value={batchLogoOpacity} defaultValue={1} onChange={setBatchLogoOpacity} />
              </div>
              <div>
                <div style={{ fontSize: "12px", color: dm ? '#ccc' : '#555', marginBottom: "6px", fontWeight: 500 }}>Margin from edge</div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "5px" }}>
                  <span style={{ fontSize: "11px", color: "#aaa" }}>{batchLogoMargin}px</span>
                </div>
                <SmoothSlider min={0} max={100} step={5} value={batchLogoMargin} defaultValue={20} onChange={setBatchLogoMargin} />
              </div>
            </Card>

            <Card>
              <SecLabel icon="📍">Logo Position</SecLabel>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "5px" }}>
                {[
                  { id: "top-left", l: "↖" }, { id: "top-center", l: "↑" }, { id: "top-right", l: "↗" },
                  { id: "center-left", l: "←" }, { id: "center", l: "⊕" }, { id: "center-right", l: "→" },
                  { id: "bottom-left", l: "↙" }, { id: "bottom-center", l: "↓" }, { id: "bottom-right", l: "↘" },
                ].map(p => {
                  const posId = p.id;
                  return (
                    <button key={posId} onClick={() => setBatchLogoPos(posId)}
                      style={{ padding: "12px 6px", border: `1.5px solid ${batchLogoPos === posId ? accent : cardBdr}`, background: batchLogoPos === posId ? accent : dm ? '#252525' : '#f8f8fd', borderRadius: "8px", fontSize: "16px", cursor: "pointer", color: batchLogoPos === posId ? "#fff" : dm ? '#ccc' : '#555', transition: "all .15s", fontFamily: "inherit" }}>
                      {p.l}
                    </button>
                  );
                })}
              </div>
            </Card>
          </>)}

          <Card style={{ background: dm ? '#1a1a2e' : '#f5f3ff', border: `1px solid ${dm ? '#333' : '#e0d9ff'}` }}>
            <SecLabel icon="🪄">AI Enhancements</SecLabel>
            <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "10px" }}>
              <Toggle checked={batchAiUpscale} onChange={e => setBatchAiUpscale(e.target.checked)} label="Smart Upscale" sub="Multi-pass AI resizing" />
              {batchAiUpscale && (
                <div style={{ padding: "10px", background: dm ? '#252525' : '#fff', border: `1px solid ${cardBdr}`, borderRadius: "9px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                    <span style={{ fontSize: "11px", color: dm ? '#ccc' : '#555', fontWeight: 600 }}>Scale Multiplier</span>
                    <span style={{ fontSize: "12px", color: accent, fontWeight: 700 }}>{batchAiScale}×</span>
                  </div>
                  <div style={{ display: "flex", gap: "6px" }}>
                    {[2, 3, 4].map(s => (
                      <button key={s} onClick={() => setBatchAiScale(s)}
                        style={{ flex: 1, padding: "6px", border: `1px solid ${batchAiScale === s ? accent : cardBdr}`, background: batchAiScale === s ? (dm ? '#1e1a3a' : '#faf9ff') : dm ? '#333' : '#f8f8fd', borderRadius: "6px", fontSize: "12px", fontWeight: 600, cursor: "pointer", color: batchAiScale === s ? accent : dm ? '#ccc' : '#555' }}>
                        {s}×
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <Toggle checked={batchAiBeauty} onChange={e => setBatchAiBeauty(e.target.checked)} label="Beauty Filter" sub="Skin smoothing, clarity & glow" />
              {batchAiBeauty && (
                <div style={{ padding: "10px", background: dm ? '#252525' : '#fff', border: `1px solid ${cardBdr}`, borderRadius: "9px", display: "flex", flexDirection: "column", gap: "8px" }}>
                  <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", marginBottom: "4px" }}>
                    <input type="checkbox" checked={batchAiBeautyUseMask} onChange={e => setBatchAiBeautyUseMask(e.target.checked)} 
                      style={{ width: "16px", height: "16px", accentColor: "#6c63ff" }} />
                    <span style={{ fontSize: "12px", color: dm ? '#ccc' : '#555', fontWeight: 600 }}>Target Face Skin Only</span>
                  </label>
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                      <span style={{ fontSize: "11px", color: dm ? '#ccc' : '#555' }}>Smooth</span>
                      <span style={{ fontSize: "11px", fontWeight: 700, color: accent }}>{batchAiBeautySmooth}</span>
                    </div>
                    <SmoothSlider min={0} max={10} step={1} value={batchAiBeautySmooth} defaultValue={5} onChange={setBatchAiBeautySmooth} />
                  </div>
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                      <span style={{ fontSize: "11px", color: dm ? '#ccc' : '#555' }}>Clarity</span>
                      <span style={{ fontSize: "11px", fontWeight: 700, color: accent }}>{batchAiBeautyClarity}</span>
                    </div>
                    <SmoothSlider min={0} max={10} step={1} value={batchAiBeautyClarity} defaultValue={5} onChange={setBatchAiBeautyClarity} />
                  </div>
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                      <span style={{ fontSize: "11px", color: dm ? '#ccc' : '#555' }}>Glow</span>
                      <span style={{ fontSize: "11px", fontWeight: 700, color: accent }}>{batchAiBeautyGlow}</span>
                    </div>
                    <SmoothSlider min={0} max={10} step={1} value={batchAiBeautyGlow} defaultValue={3} onChange={setBatchAiBeautyGlow} />
                  </div>
                </div>
              )}

              <Toggle checked={batchAiFaceRestore} onChange={e => setBatchAiFaceRestore(e.target.checked)} label="AI Face Restore" sub="GenAI face restoration (Cloud)" />
            </div>
          </Card>
        </div>

        {/* PRODUCTION ACTIVITY LOG */}
        {(batchLogs.length > 0 || batchProcessing) && (
          <Card style={{ gridColumn: isMobile ? "auto" : "1 / -1", background: dm ? '#0f172a' : '#fafafa', border: `1px solid ${dm ? '#1e293b' : '#e2e8f0'}`, padding: "16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: batchProcessing ? "#10b981" : "#6c63ff", animation: batchProcessing ? "pulse 1.5s infinite" : "none" }} />
                <SecLabel icon="📋" style={{ marginBottom: 0 }}>Production Activity Log</SecLabel>
              </div>
              <div style={{ display: "flex", gap: "10px" }}>
                <button onClick={() => {
                  const text = batchLogs.map(l => `[${l.time}] ${l.msg}`).join('\n');
                  navigator.clipboard.writeText(text);
                  addBatchLog("📋 Copied to clipboard!");
                }} style={{ background: "none", border: "none", color: "#6c63ff", fontSize: "11px", fontWeight: 700, cursor: "pointer" }}>Copy Full Log</button>
                <button onClick={() => addBatchLog("__CLEAR__")} style={{ background: "none", border: "none", color: "#94a3b8", fontSize: "11px", fontWeight: 700, cursor: "pointer" }}>Clear</button>
              </div>
            </div>

            {batchProcessing && batchProgress.total > 0 && (
              <div style={{ marginBottom: "16px", padding: "12px", background: dm ? "#1e293b" : "#fff", borderRadius: "10px", border: `1px solid ${dm ? "#334155" : "#e2e8f0"}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", marginBottom: "6px", fontWeight: 700 }}>
                  <span style={{ color: dm ? "#94a3b8" : "#64748b" }}>Batch Progress</span>
                  <span style={{ color: accent }}>{Math.round((batchProgress.current / batchProgress.total) * 100)}%</span>
                </div>
                <div style={{ height: "6px", background: dm ? "#0f172a" : "#f1f5f9", borderRadius: "3px", overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${(batchProgress.current / batchProgress.total) * 100}%`, background: "linear-gradient(90deg, #6c63ff, #a78bfa)", transition: "width 0.3s ease" }} />
                </div>
                <div style={{ marginTop: "6px", fontSize: "11px", color: "#94a3b8" }}>
                  Currently processing: <span style={{ fontWeight: 600, color: dm ? "#cbd5e1" : "#334155" }}>{batchProgress.currentFile}</span>
                </div>
              </div>
            )}

            <div style={{ 
              maxHeight: "250px", overflowY: "auto", background: dm ? '#020617' : '#fff', 
              borderRadius: "8px", border: `1px solid ${dm ? '#1e293b' : '#e2e8f0'}`, padding: "10px",
              display: "flex", flexDirection: "column", gap: "6px", fontFamily: "monospace"
            }}>
              {batchLogs.slice().reverse().map((log, i) => (
                <div key={i} style={{ 
                  fontSize: "11px", lineHeight: "1.5",
                  color: log.type === 'error' ? '#ef4444' : log.type === 'success' ? '#10b981' : (dm ? '#94a3b8' : '#64748b'),
                  borderLeft: `3px solid ${log.type === 'error' ? '#ef4444' : log.type === 'success' ? '#10b981' : 'transparent'}`,
                  paddingLeft: "10px"
                }}>
                  <span style={{ opacity: 0.5, marginRight: "8px" }}>[{log.time}]</span>
                  {log.msg}
                </div>
              ))}
              {batchLogs.length === 0 && (
                <div style={{ textAlign: "center", padding: "20px", color: "#64748b", fontStyle: "italic" }}>No production logs yet. Start processing to see activity.</div>
              )}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
