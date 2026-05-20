import React, { useState, useEffect, useRef, useCallback } from "react";
import { cullBatch } from "./cullEngine";
import { exportXmpSidecars } from "./xmpExporter";

export default function CullPage({
  dm,
  cardBg,
  cardBdr,
  inputSt,
  sourceHandle,
  outputHandle,
  batchImages,
  selectSourceFolder,
  selectRawSourceFolder,
  selectOutputFolder,
  batchLogs,
  addBatchLog,
  batchSection,
  setBatchSection
}) {
  // Option Parameters
  const [sensitivity, setSensitivity] = useState(12);
  const [blurCutoff, setBlurCutoff] = useState(50);
  const [useFaceLandmarks, setUseFaceLandmarks] = useState(true);

  // Runtime State
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0, currentFile: "" });
  const [cullResults, setCullResults] = useState([]);
  const [activeGroupIndex, setActiveGroupIndex] = useState(0);
  const [activeAlternateIndex, setActiveAlternateIndex] = useState(0);

  // Grouped references
  const [groups, setGroups] = useState([]);

  // Toast / Status state
  const [toastMessage, setToastMessage] = useState(null);

  const showToast = (msg, type = "success") => {
    setToastMessage({ msg, type });
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Keyboard navigation refs to prevent focus loss
  const containerRef = useRef(null);

  // Active files are loaded based on whether standard folders or RAW folders are selected
  const activeInputFiles = batchImages; // Falls back to batchImages standard loaded files

  // 1. Organizes results into matching duplicate groups
  const rebuildGroups = useCallback((results) => {
    const map = {};
    results.forEach((item) => {
      if (!map[item.cullGroup]) map[item.cullGroup] = [];
      map[item.cullGroup].push(item);
    });

    const groupedList = Object.values(map);
    // Sort each group so the designated Key Photo is at index 0
    groupedList.forEach((group) => {
      group.sort((a, b) => (b.isKeyPhoto ? 1 : 0) - (a.isKeyPhoto ? 1 : 0));
    });

    setGroups(groupedList);
    setActiveGroupIndex(0);
    setActiveAlternateIndex(0);
  }, []);

  // 2. Main Culling AI Execution Loop
  const handleStartCulling = async () => {
    if (!activeInputFiles || activeInputFiles.length === 0) {
      alert("Please select a folder with photos first!");
      return;
    }

    addBatchLog?.("🚀 Commencing local AI Culling sequence...", "info");
    setIsProcessing(true);
    setProgress({ current: 0, total: activeInputFiles.length, currentFile: "" });

    try {
      // Setup temporary URL previews for the culling engine
      const prepImages = activeInputFiles.map(img => {
        return {
          ...img,
          previewUrl: img.previewUrl || (img.file ? URL.createObjectURL(img.file) : null)
        };
      });

      const results = await cullBatch(
        prepImages,
        {
          groupingSensitivity: sensitivity,
          blurStrictness: blurCutoff,
          enableFaceLandmarks: useFaceLandmarks
        },
        (prog) => setProgress(prog)
      );

      setCullResults(results);
      rebuildGroups(results);
      addBatchLog?.(`✅ Completed local culling for ${results.length} files.`, "success");
      showToast("AI Culling completed successfully!");
    } catch (e) {
      addBatchLog?.(`❌ AI Culling Failed: ${e.message}`, "error");
      console.error(e);
    } finally {
      setIsProcessing(false);
    }
  };

  // 3. Promote a selected duplicate to become the new "Key Photo"
  const handlePromoteToKeyPhoto = (item) => {
    const groupItems = groups[activeGroupIndex];
    if (!groupItems) return;

    // Reset old key photo, assign new one
    groupItems.forEach((x) => {
      if (x.name === item.name) {
        x.isKeyPhoto = true;
        x.rating = 5;
        x.label = "green";
      } else if (x.isKeyPhoto) {
        x.isKeyPhoto = false;
        x.rating = 3;
        x.label = "blue";
      }
    });

    // Re-sort the group so key photo is index 0
    groupItems.sort((a, b) => (b.isKeyPhoto ? 1 : 0) - (a.isKeyPhoto ? 1 : 0));

    const updatedGroups = [...groups];
    updatedGroups[activeGroupIndex] = groupItems;
    setGroups(updatedGroups);
    setActiveAlternateIndex(0); // Reset selected alternate preview

    showToast(`Promoted ${item.name} to Key Photo!`);
  };

  // 4. Update rating / label manually
  const updateActivePhotoRating = (ratingValue, labelValue) => {
    const activeGroup = groups[activeGroupIndex];
    if (!activeGroup) return;

    const activePhoto = activeGroup[activeAlternateIndex];
    if (!activePhoto) return;

    activePhoto.rating = ratingValue !== undefined ? ratingValue : activePhoto.rating;
    activePhoto.label = labelValue !== undefined ? labelValue : activePhoto.label;

    const updatedGroups = [...groups];
    setGroups(updatedGroups);
  };

  // 5. Exporter to write XMP Sidecar files
  const handleExportXmp = async () => {
    if (!outputHandle) {
      alert("Please select an Output Folder first to store ratings sidecars!");
      return;
    }

    try {
      // Flatten all images from groups
      const allImages = groups.flat();
      const count = await exportXmpSidecars(outputHandle, allImages, addBatchLog);
      showToast(`Exported ${count} rating sidecars successfully!`);
    } catch (e) {
      alert(`Export failed: ${e.message}`);
    }
  };

  // 6. High-speed Keyboard Listeners
  const handleKeyDown = useCallback((e) => {
    if (isProcessing || groups.length === 0) return;

    const activeGroup = groups[activeGroupIndex];
    if (!activeGroup) return;

    const activePhoto = activeGroup[activeAlternateIndex];

    switch (e.key) {
      // Cycle Duplicate Groups (Left / Right)
      case "ArrowRight":
        e.preventDefault();
        if (activeGroupIndex < groups.length - 1) {
          setActiveGroupIndex(prev => prev + 1);
          setActiveAlternateIndex(0);
        }
        break;
      case "ArrowLeft":
        e.preventDefault();
        if (activeGroupIndex > 0) {
          setActiveGroupIndex(prev => prev - 1);
          setActiveAlternateIndex(0);
        }
        break;

      // Cycle Alternates inside current Group (Up / Down)
      case "ArrowDown":
        e.preventDefault();
        if (activeAlternateIndex < activeGroup.length - 1) {
          setActiveAlternateIndex(prev => prev + 1);
        }
        break;
      case "ArrowUp":
        e.preventDefault();
        if (activeAlternateIndex > 0) {
          setActiveAlternateIndex(prev => prev - 1);
        }
        break;

      // Mark as Selected / Keeper (Space bar)
      case " ":
        e.preventDefault();
        updateActivePhotoRating(5, "green");
        showToast("Marked as Keeper (5-Stars, Green Label)");
        break;

      // Set Star ratings
      case "1": updateActivePhotoRating(1); break;
      case "2": updateActivePhotoRating(2); break;
      case "3": updateActivePhotoRating(3); break;
      case "4": updateActivePhotoRating(4); break;
      case "5": updateActivePhotoRating(5); break;

      // Color labels
      case "6": updateActivePhotoRating(undefined, "green"); break;
      case "7": updateActivePhotoRating(undefined, "blue"); break;
      case "8": updateActivePhotoRating(undefined, "yellow"); break;
      case "9": updateActivePhotoRating(undefined, "red"); break;
      case "0": updateActivePhotoRating(0, ""); break;

      // Promote Alternate to Key Photo (S key)
      case "s":
      case "S":
        e.preventDefault();
        if (activePhoto && !activePhoto.isKeyPhoto) {
          handlePromoteToKeyPhoto(activePhoto);
        }
        break;

      default:
        break;
    }
  }, [groups, activeGroupIndex, activeAlternateIndex, isProcessing]);

  // Set keyboard focus on mount or selection
  useEffect(() => {
    if (groups.length > 0 && containerRef.current) {
      containerRef.current.focus();
    }
  }, [groups]);

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  // Styles Palette
  const accent = "#6c63ff";
  const labelColors = {
    green: "#22c55e",
    blue: "#3b82f6",
    yellow: "#eab308",
    red: "#ef4444"
  };

  const activeGroup = groups[activeGroupIndex] || [];
  const activePhoto = activeGroup[activeAlternateIndex] || null;
  const keyPhoto = activeGroup[0] || null;

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      style={{
        outline: "none",
        fontFamily: "'Inter', sans-serif",
        color: dm ? "#f3f4f6" : "#1f2937",
        minHeight: "82vh",
        display: "flex",
        flexDirection: "column",
        gap: "20px"
      }}
    >
      {/* Dynamic Toast Alert */}
      {toastMessage && (
        <div
          style={{
            position: "fixed",
            bottom: "24px",
            right: "24px",
            background: "rgba(18, 18, 24, 0.9)",
            border: `1px solid ${accent}`,
            padding: "12px 24px",
            borderRadius: "12px",
            boxShadow: "0 8px 32px rgba(0, 0, 0, 0.4)",
            color: "#fff",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            gap: "10px",
            fontSize: "14px",
            animation: "slideIn 0.25s ease-out",
            backdropFilter: "blur(8px)"
          }}
        >
          <span style={{ color: labelColors[toastMessage.type] || accent }}>●</span>
          {toastMessage.msg}
        </div>
      )}

      {/* Top Header Section */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: "24px", fontWeight: 800, background: `linear-gradient(135deg, ${accent}, #a78bfa)`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            EZ-Cull AI Lab
          </h1>
          <p style={{ margin: "4px 0 0 0", fontSize: "13px", color: dm ? "#9ca3af" : "#4b5563" }}>
            Identify duplicate series, remove blur & blinks, and export non-destructive Lightroom ratings in-browser.
          </p>
        </div>

        {groups.length > 0 && (
          <button
            onClick={() => {
              setCullResults([]);
              setGroups([]);
            }}
            style={{
              padding: "8px 16px",
              background: "transparent",
              border: `1px solid ${dm ? "#374151" : "#e5e7eb"}`,
              color: dm ? "#9ca3af" : "#4b5563",
              borderRadius: "8px",
              cursor: "pointer",
              fontSize: "13px",
              fontWeight: 600,
              transition: "all 0.2s"
            }}
          >
            ← Reset Setup
          </button>
        )}
      </div>

      {/* CONFIG / INGESTION INTERFACE */}
      {groups.length === 0 && (
        <div
          style={{
            background: cardBg,
            border: `1px solid ${cardBdr}`,
            borderRadius: "16px",
            padding: "30px",
            display: "flex",
            flexDirection: "column",
            gap: "24px",
            boxShadow: "0 4px 20px rgba(0,0,0,0.05)"
          }}
        >
          {/* Files Selector Row */}
          <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: "250px", display: "flex", flexDirection: "column", gap: "8px" }}>
              <label style={{ fontSize: "13px", fontWeight: 700 }}>1. Choose Target Source</label>
              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  onClick={selectSourceFolder}
                  style={{
                    flex: 1,
                    padding: "12px",
                    background: sourceHandle ? "rgba(34, 197, 94, 0.1)" : (dm ? "#1f2937" : "#f9fafb"),
                    border: `1px dashed ${sourceHandle ? "#22c55e" : (dm ? "#374151" : "#d1d5db")}`,
                    borderRadius: "10px",
                    cursor: "pointer",
                    fontSize: "13px",
                    fontWeight: 600,
                    color: sourceHandle ? "#22c55e" : (dm ? "#d1d5db" : "#4b5563")
                  }}
                >
                  {sourceHandle ? `✓ Folder Selected` : `📂 Pick Folder`}
                </button>
              </div>
              <span style={{ fontSize: "11px", color: "#9ca3af" }}>
                {activeInputFiles.length > 0 ? `Detected ${activeInputFiles.length} photos ready for culling.` : "Select directory containing JPG/PNG camera files."}
              </span>
            </div>

            <div style={{ flex: 1, minWidth: "250px", display: "flex", flexDirection: "column", gap: "8px" }}>
              <label style={{ fontSize: "13px", fontWeight: 700 }}>2. Pick Output Destination (Ratings)</label>
              <button
                onClick={selectOutputFolder}
                style={{
                  padding: "12px",
                  background: outputHandle ? "rgba(34, 197, 94, 0.1)" : (dm ? "#1f2937" : "#f9fafb"),
                  border: `1px dashed ${outputHandle ? "#22c55e" : (dm ? "#374151" : "#d1d5db")}`,
                  borderRadius: "10px",
                  cursor: "pointer",
                  fontSize: "13px",
                  fontWeight: 600,
                  color: outputHandle ? "#22c55e" : (dm ? "#d1d5db" : "#4b5563")
                }}
              >
                {outputHandle ? `✓ Destination Set` : `💾 Pick Output Folder`}
              </button>
              <span style={{ fontSize: "11px", color: "#9ca3af" }}>
                Used to write XMP sidecars containing star ratings & colors.
              </span>
            </div>
          </div>

          <hr style={{ border: "none", height: "1px", background: dm ? "#374151" : "#e5e7eb" }} />

          {/* Parameters Controls */}
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <h3 style={{ margin: 0, fontSize: "15px", fontWeight: 700 }}>AI Parameters & Sensitivity Settings</h3>
            
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "24px" }}>
              {/* Grouping Sensitivity */}
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <label style={{ fontSize: "13px", fontWeight: 600 }}>Duplicate Grouping Sensitivity</label>
                  <span style={{ fontSize: "13px", color: accent, fontWeight: 700 }}>Hamming: {sensitivity} (Alternate Range)</span>
                </div>
                <input
                  type="range"
                  min="4"
                  max="24"
                  value={sensitivity}
                  onChange={(e) => setSensitivity(parseInt(e.target.value))}
                  style={{ accentColor: accent, cursor: "pointer" }}
                />
                <span style={{ fontSize: "11px", color: "#9ca3af" }}>
                  Smaller value = tighter groupings (requires near identity). Higher value = matches broader motion bursts.
                </span>
              </div>

              {/* Sharpness Cutoff */}
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <label style={{ fontSize: "13px", fontWeight: 600 }}>Focus Sharpness Strictness</label>
                  <span style={{ fontSize: "13px", color: accent, fontWeight: 700 }}>Score Limit: {blurCutoff}%</span>
                </div>
                <input
                  type="range"
                  min="20"
                  max="80"
                  value={blurCutoff}
                  onChange={(e) => setBlurCutoff(parseInt(e.target.value))}
                  style={{ accentColor: accent, cursor: "pointer" }}
                />
                <span style={{ fontSize: "11px", color: "#9ca3af" }}>
                  Cutoff threshold for out-of-focus warning flags.
                </span>
              </div>
            </div>

            {/* MediaPipe blink selection */}
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "8px" }}>
              <input
                type="checkbox"
                id="cull_landmarks"
                checked={useFaceLandmarks}
                onChange={(e) => setUseFaceLandmarks(e.target.checked)}
                style={{ accentColor: accent, width: "16px", height: "16px", cursor: "pointer" }}
              />
              <label htmlFor="cull_landmarks" style={{ fontSize: "13px", fontWeight: 600, cursor: "pointer" }}>
                Run MediaPipe Vision landmarker (detects closed-eye blinks and smile parameters)
              </label>
            </div>
          </div>

          {/* Trigger Button / Progress */}
          <div style={{ display: "flex", flexDirection: "column", gap: "12px", alignItems: "center", marginTop: "12px" }}>
            {isProcessing ? (
              <div style={{ width: "100%", display: "flex", flexDirection: "column", alignItems: "center", gap: "10px" }}>
                <div style={{ width: "100%", height: "6px", background: dm ? "#374151" : "#e5e7eb", borderRadius: "10px", overflow: "hidden" }}>
                  <div
                    style={{
                      height: "100%",
                      width: `${(progress.current / progress.total) * 100}%`,
                      background: `linear-gradient(90deg, ${accent}, #a78bfa)`,
                      transition: "width 0.15s ease-out"
                    }}
                  />
                </div>
                <span style={{ fontSize: "13px", fontWeight: 700 }}>
                  Analyzing images with EZ-Cull local AI... {progress.current} / {progress.total}
                </span>
                <span style={{ fontSize: "11px", color: "#9ca3af" }}>
                  Current processing target: {progress.currentFile}
                </span>
              </div>
            ) : (
              <button
                onClick={handleStartCulling}
                disabled={activeInputFiles.length === 0}
                style={{
                  width: "100%",
                  padding: "16px",
                  background: `linear-gradient(135deg, ${accent}, #5b54d6)`,
                  color: "#fff",
                  border: "none",
                  borderRadius: "12px",
                  cursor: activeInputFiles.length === 0 ? "not-allowed" : "pointer",
                  fontSize: "15px",
                  fontWeight: 700,
                  boxShadow: "0 4px 14px rgba(108, 99, 255, 0.4)",
                  transition: "all 0.2s"
                }}
              >
                🚀 Run AI-Assisted Cull ({activeInputFiles.length} Photos)
              </button>
            )}
          </div>
        </div>
      )}

      {/* ACTIVE CULLING REVIEW WORKSPACE */}
      {groups.length > 0 && activePhoto && (
        <div style={{ display: "flex", gap: "20px", flexWrap: "wrap", height: "calc(100vh - 280px)" }}>
          {/* Left Panel: Primary Review & Comparison Viewer */}
          <div
            style={{
              flex: 2,
              minWidth: "400px",
              background: cardBg,
              border: `1px solid ${cardBdr}`,
              borderRadius: "16px",
              padding: "16px",
              display: "flex",
              flexDirection: "column",
              position: "relative",
              overflow: "hidden"
            }}
          >
            {/* Group Status Header */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                paddingBottom: "12px",
                borderBottom: `1px solid ${dm ? "#374151" : "#e5e7eb"}`,
                marginBottom: "12px"
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <span
                  style={{
                    background: "rgba(108, 99, 255, 0.1)",
                    color: accent,
                    padding: "4px 8px",
                    borderRadius: "6px",
                    fontSize: "12px",
                    fontWeight: 700
                  }}
                >
                  Group {activeGroupIndex + 1} of {groups.length}
                </span>
                <span style={{ fontSize: "12px", color: "#9ca3af" }}>
                  Contains {activeGroup.length} duplicate alternates
                </span>
              </div>

              {/* Status Flag */}
              <div style={{ display: "flex", gap: "8px" }}>
                {activePhoto.isKeyPhoto ? (
                  <span style={{ background: "rgba(34, 197, 94, 0.15)", color: "#22c55e", padding: "4px 8px", borderRadius: "6px", fontSize: "11px", fontWeight: 700 }}>
                    ★ AI Keeper (Key Photo)
                  </span>
                ) : (
                  <button
                    onClick={() => handlePromoteToKeyPhoto(activePhoto)}
                    style={{
                      background: "rgba(108, 99, 255, 0.1)",
                      color: accent,
                      border: `1px solid ${accent}`,
                      padding: "4px 10px",
                      borderRadius: "6px",
                      fontSize: "11px",
                      fontWeight: 700,
                      cursor: "pointer"
                    }}
                  >
                    Promote to Key Photo (S)
                  </button>
                )}
              </div>
            </div>

            {/* Main Picture Frame */}
            <div
              style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: dm ? "#111827" : "#f3f4f6",
                borderRadius: "12px",
                position: "relative",
                overflow: "hidden",
                maxHeight: "60vh"
              }}
            >
              <img
                src={activePhoto.previewUrl}
                alt={activePhoto.name}
                style={{
                  maxWidth: "100%",
                  maxHeight: "100%",
                  objectFit: "contain",
                  borderRadius: "8px"
                }}
              />

              {/* Quality overlay badge HUD */}
              <div
                style={{
                  position: "absolute",
                  bottom: "16px",
                  left: "16px",
                  background: "rgba(18, 18, 24, 0.8)",
                  backdropFilter: "blur(6px)",
                  padding: "8px 16px",
                  borderRadius: "10px",
                  border: "1px solid rgba(255,255,255,0.15)",
                  display: "flex",
                  gap: "14px",
                  fontSize: "12px",
                  color: "#fff",
                  boxShadow: "0 4px 20px rgba(0,0,0,0.3)"
                }}
              >
                <div>
                  <span style={{ color: "#aaa" }}>Sharpness:</span>{" "}
                  <strong style={{ color: activePhoto.sharpness >= blurCutoff ? "#22c55e" : "#ef4444" }}>
                    {activePhoto.sharpness}%
                  </strong>
                </div>

                {activePhoto.faces?.length > 0 && (
                  <>
                    <div style={{ width: "1px", background: "rgba(255,255,255,0.2)" }} />
                    <div>
                      <span style={{ color: "#aaa" }}>Faces:</span> <strong>{activePhoto.faces.length}</strong>
                    </div>
                  </>
                )}

                {activePhoto.faces?.some(f => f.metrics?.blinkDetected) && (
                  <>
                    <div style={{ width: "1px", background: "rgba(255,255,255,0.2)" }} />
                    <div style={{ color: "#ef4444", fontWeight: 700 }}>⚠️ Blink Flagged</div>
                  </>
                )}
              </div>

              {/* Active Ratings Overlay Tag */}
              <div
                style={{
                  position: "absolute",
                  top: "16px",
                  right: "16px",
                  display: "flex",
                  gap: "8px"
                }}
              >
                {activePhoto.rating > 0 && (
                  <div
                    style={{
                      background: "rgba(234, 179, 8, 0.9)",
                      color: "#000",
                      fontWeight: 800,
                      padding: "4px 10px",
                      borderRadius: "6px",
                      fontSize: "12px"
                    }}
                  >
                    {"★".repeat(activePhoto.rating)}
                  </div>
                )}
                {activePhoto.label && (
                  <div
                    style={{
                      background: labelColors[activePhoto.label],
                      color: "#fff",
                      fontWeight: 700,
                      padding: "4px 10px",
                      borderRadius: "6px",
                      fontSize: "11px",
                      textTransform: "uppercase"
                    }}
                  >
                    {activePhoto.label}
                  </div>
                )}
              </div>
            </div>

            {/* Active Filename bottom row */}
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: "12px", fontSize: "12px", color: "#9ca3af" }}>
              <span>File: {activePhoto.name}</span>
              <span>Quality Score: {activePhoto.cullScore}%</span>
            </div>
          </div>

          {/* Right Panel: Alternates Grid & Rating Dashboard */}
          <div style={{ flex: 1, minWidth: "300px", display: "flex", flexDirection: "column", gap: "20px" }}>
            {/* Quick Ratings Dashboard Card */}
            <div
              style={{
                background: cardBg,
                border: `1px solid ${cardBdr}`,
                borderRadius: "16px",
                padding: "20px",
                display: "flex",
                flexDirection: "column",
                gap: "16px"
              }}
            >
              <h3 style={{ margin: 0, fontSize: "14px", fontWeight: 700 }}>Ratings & Labels Dashboard</h3>
              
              {/* Star Rating Row */}
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <span style={{ fontSize: "12px", color: "#9ca3af" }}>Set Rating (Keys 1-5):</span>
                <div style={{ display: "flex", gap: "8px" }}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => updateActivePhotoRating(star)}
                      style={{
                        flex: 1,
                        padding: "8px",
                        background: activePhoto.rating >= star ? "rgba(234, 179, 8, 0.15)" : "transparent",
                        border: `1px solid ${activePhoto.rating >= star ? "#eab308" : (dm ? "#374151" : "#e5e7eb")}`,
                        color: activePhoto.rating >= star ? "#eab308" : (dm ? "#9ca3af" : "#4b5563"),
                        borderRadius: "8px",
                        fontSize: "14px",
                        cursor: "pointer",
                        transition: "all 0.15s"
                      }}
                    >
                      ★
                    </button>
                  ))}
                </div>
              </div>

              {/* Color Label Row */}
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <span style={{ fontSize: "12px", color: "#9ca3af" }}>Color Tags (Keys 6-9):</span>
                <div style={{ display: "flex", gap: "8px" }}>
                  {["green", "blue", "yellow", "red"].map((c) => (
                    <button
                      key={c}
                      onClick={() => updateActivePhotoRating(undefined, c)}
                      style={{
                        flex: 1,
                        height: "28px",
                        background: labelColors[c],
                        border: activePhoto.label === c ? "2px solid #fff" : "none",
                        boxShadow: activePhoto.label === c ? `0 0 8px ${labelColors[c]}` : "none",
                        borderRadius: "8px",
                        cursor: "pointer",
                        transition: "all 0.15s"
                      }}
                      title={c}
                    />
                  ))}
                  <button
                    onClick={() => updateActivePhotoRating(0, "")}
                    style={{
                      flex: 1,
                      height: "28px",
                      background: "transparent",
                      border: `1px solid ${dm ? "#374151" : "#e5e7eb"}`,
                      color: dm ? "#9ca3af" : "#4b5563",
                      fontSize: "11px",
                      borderRadius: "8px",
                      cursor: "pointer"
                    }}
                  >
                    Clear
                  </button>
                </div>
              </div>

              <hr style={{ border: "none", height: "1px", background: dm ? "#374151" : "#e5e7eb", margin: "4px 0" }} />

              {/* Metadata Warnings Info */}
              <div>
                <span style={{ fontSize: "12px", color: "#9ca3af" }}>Warnings / Flags:</span>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginTop: "6px" }}>
                  {activePhoto.warnings?.length > 0 ? (
                    activePhoto.warnings.map((w, idx) => (
                      <div
                        key={idx}
                        style={{
                          background: "rgba(239, 68, 68, 0.1)",
                          border: "1px solid rgba(239, 68, 68, 0.2)",
                          color: "#ef4444",
                          padding: "8px 12px",
                          borderRadius: "8px",
                          fontSize: "11px",
                          fontWeight: 600
                        }}
                      >
                        ⚠️ {w}
                      </div>
                    ))
                  ) : (
                    <div style={{ color: "#22c55e", fontSize: "11px", fontWeight: 600 }}>
                      ✓ No issues flagged. Perfect keeper candidate!
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Alternates Deck Grid */}
            <div
              style={{
                flex: 1,
                background: cardBg,
                border: `1px solid ${cardBdr}`,
                borderRadius: "16px",
                padding: "16px",
                display: "flex",
                flexDirection: "column",
                gap: "12px",
                overflowY: "auto"
              }}
            >
              <span style={{ fontSize: "12px", fontWeight: 700, color: "#9ca3af" }}>
                Alternates in current cluster (Group {activeGroupIndex + 1})
              </span>

              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {activeGroup.map((item, idx) => {
                  const isCurrent = idx === activeAlternateIndex;
                  return (
                    <div
                      key={item.name}
                      onClick={() => setActiveAlternateIndex(idx)}
                      style={{
                        display: "flex",
                        gap: "10px",
                        padding: "8px",
                        background: isCurrent ? (dm ? "#1f2937" : "#f3f4f6") : "transparent",
                        border: `1px solid ${isCurrent ? accent : "transparent"}`,
                        borderRadius: "10px",
                        cursor: "pointer",
                        transition: "all 0.15s"
                      }}
                    >
                      {/* Alternate thumbnail */}
                      <div
                        style={{
                          width: "60px",
                          height: "45px",
                          background: "#000",
                          borderRadius: "6px",
                          overflow: "hidden",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center"
                        }}
                      >
                        <img
                          src={item.previewUrl}
                          alt=""
                          style={{ width: "100%", height: "100%", objectFit: "cover" }}
                        />
                      </div>

                      {/* Alternate metadata text */}
                      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", gap: "2px" }}>
                        <span style={{ fontSize: "11px", fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "160px" }}>
                          {item.name}
                        </span>
                        <div style={{ display: "flex", gap: "8px", fontSize: "10px", color: "#9ca3af" }}>
                          <span>Focus: {item.sharpness}%</span>
                          {item.isKeyPhoto && <span style={{ color: "#22c55e", fontWeight: 700 }}>Key Photo</span>}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Direct XMP Sync Ratings Trigger */}
            <button
              onClick={handleExportXmp}
              style={{
                padding: "16px",
                background: outputHandle ? `linear-gradient(135deg, ${accent}, #5b54d6)` : (dm ? "#374151" : "#e5e7eb"),
                color: outputHandle ? "#fff" : (dm ? "#9ca3af" : "#4b5563"),
                border: "none",
                borderRadius: "12px",
                cursor: outputHandle ? "pointer" : "not-allowed",
                fontSize: "14px",
                fontWeight: 700,
                boxShadow: outputHandle ? "0 4px 14px rgba(108, 99, 255, 0.3)" : "none",
                transition: "all 0.2s"
              }}
            >
              💾 Save XMP Sidecars to Output Folder
            </button>
          </div>
        </div>
      )}

      {/* BOTTOM FILMSTRIP TIMELINE */}
      {groups.length > 0 && (
        <div
          style={{
            background: cardBg,
            border: `1px solid ${cardBdr}`,
            borderRadius: "16px",
            padding: "12px",
            display: "flex",
            flexDirection: "column",
            gap: "8px"
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "11px", fontWeight: 700, color: "#9ca3af", textTransform: "uppercase" }}>
              Duplicate Timeline (Use Left / Right Arrows)
            </span>
            <span style={{ fontSize: "11px", color: accent, fontWeight: 700 }}>
              Group {activeGroupIndex + 1} of {groups.length}
            </span>
          </div>

          <div
            style={{
              display: "flex",
              gap: "10px",
              overflowX: "auto",
              paddingBottom: "4px"
            }}
          >
            {groups.map((grp, idx) => {
              const isCurrent = idx === activeGroupIndex;
              const rep = grp[0]; // Representative key photo
              return (
                <div
                  key={idx}
                  onClick={() => {
                    setActiveGroupIndex(idx);
                    setActiveAlternateIndex(0);
                  }}
                  style={{
                    flexShrink: 0,
                    width: "80px",
                    height: "60px",
                    borderRadius: "8px",
                    border: `2px solid ${isCurrent ? accent : "transparent"}`,
                    overflow: "hidden",
                    cursor: "pointer",
                    position: "relative",
                    background: "#000",
                    transition: "all 0.15s"
                  }}
                >
                  <img
                    src={rep.previewUrl}
                    alt=""
                    style={{ width: "100%", height: "100%", objectFit: "cover", opacity: isCurrent ? 1.0 : 0.6 }}
                  />

                  {/* Group Count Badge */}
                  <div
                    style={{
                      position: "absolute",
                      bottom: "2px",
                      right: "2px",
                      background: "rgba(0,0,0,0.8)",
                      color: "#fff",
                      fontSize: "9px",
                      fontWeight: 800,
                      padding: "2px 4px",
                      borderRadius: "4px"
                    }}
                  >
                    x{grp.length}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
