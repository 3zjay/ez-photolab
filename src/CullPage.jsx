import React, { useState, useEffect, useRef, useCallback } from "react";
import { cullBatch } from "./cullEngine";
import { exportXmpSidecars } from "./xmpExporter";

function StarRating({ rating, onChange, size = 18 }) {
  return (
    <div style={{ display: "flex", gap: "4px" }}>
      {[1, 2, 3, 4, 5].map((s) => (
        <svg
          key={s}
          onClick={() => onChange && onChange(s)}
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill={s <= rating ? "#fbbf24" : "none"}
          stroke={s <= rating ? "#d97706" : "#9ca3af"}
          strokeWidth="2"
          style={{ cursor: "pointer", transition: "transform 0.15s ease" }}
          onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.25)")}
          onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
        >
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      ))}
    </div>
  );
}

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
  setBatchSection,
  isMobile = false,
  user,
  setActiveTab
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
  const [showFaceBoxes, setShowFaceBoxes] = useState(true);
  const [showShortcutsHelp, setShowShortcutsHelp] = useState(true);

  // Grouped references
  const [groups, setGroups] = useState([]);

  // Physical Export & Layout Configuration States
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState({ current: 0, total: 0, currentFile: "" });
  const [exportMethod, setExportMethod] = useState("folders"); // "folders" or "xmp"
  const [layoutMode, setLayoutMode] = useState("full_sort"); // "full_sort", "keepers_rejects", "keepers_only", "clusters"

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
      alert("Please select a Destination Output Folder first!");
      return;
    }

    setIsExporting(true);
    setExportProgress({ current: 0, total: 1, currentFile: "Writing sidecars..." });
    addBatchLog?.("📝 Exporting Adobe-compliant XMP sidecars...", "info");

    try {
      const allImages = groups.flat();
      const count = await exportXmpSidecars(outputHandle, allImages, addBatchLog);
      showToast(`Exported ${count} rating sidecars successfully!`);
    } catch (e) {
      addBatchLog?.(`❌ XMP Sidecars Export Failed: ${e.message}`, "error");
      alert(`Export failed: ${e.message}`);
    } finally {
      setIsExporting(false);
    }
  };

  // 5b. Exporter to physically copy and group files into subfolders
  const handlePhysicalExport = async (mode = layoutMode) => {
    if (!outputHandle) {
      alert("Please select a Destination Output Folder first!");
      return;
    }

    setIsExporting(true);
    setExportProgress({ current: 0, total: 0, currentFile: "Initializing folders..." });
    addBatchLog?.(`📁 Starting physical file sort using mode: "${mode}"`, "info");

    try {
      const allImages = groups.flat();

      // Determine what files will actually be copied
      const filesToCopy = mode === "keepers_only"
        ? allImages.filter(item => item.isKeyPhoto || item.category === "keeper")
        : allImages;

      if (filesToCopy.length === 0) {
        throw new Error("No files matched the current export criteria.");
      }

      // Pre-create directories as needed
      let keepersDir = null;
      let alternatesDir = null;
      let blurryDir = null;
      let rejectedDir = null;

      if (mode === "full_sort") {
        keepersDir   = await outputHandle.getDirectoryHandle("📗 Keepers",   { create: true });
        alternatesDir = await outputHandle.getDirectoryHandle("📘 Alternates", { create: true });
        blurryDir    = await outputHandle.getDirectoryHandle("📙 Blurry",     { create: true });
        rejectedDir  = await outputHandle.getDirectoryHandle("📕 Rejected",   { create: true });
      } else if (mode === "keepers_rejects") {
        keepersDir   = await outputHandle.getDirectoryHandle("Keepers",            { create: true });
        alternatesDir = await outputHandle.getDirectoryHandle("Rejected & Alternates", { create: true });
      } else if (mode === "keepers_only") {
        keepersDir = await outputHandle.getDirectoryHandle("Keepers", { create: true });
      }

      let copiedCount = 0;
      const total = filesToCopy.length;

      for (let i = 0; i < total; i++) {
        const item = filesToCopy[i];

        setExportProgress({ current: i + 1, total, currentFile: item.name });

        if (item.file) {
          let targetDir = outputHandle;
          let destName = item.name;

          if (mode === "full_sort") {
            // Route by category (set by cullEngine 4-tier logic)
            const cat = item.category || (item.isKeyPhoto ? "keeper" : "alternate");
            if (cat === "keeper")    targetDir = keepersDir;
            else if (cat === "alternate") targetDir = alternatesDir;
            else if (cat === "blurry")    targetDir = blurryDir;
            else                          targetDir = rejectedDir; // rejected
          } else if (mode === "keepers_rejects") {
            targetDir = item.isKeyPhoto ? keepersDir : alternatesDir;
          } else if (mode === "keepers_only") {
            targetDir = keepersDir;
          } else if (mode === "clusters") {
            const clusterFolder = `Group_${item.cullGroup + 1}`;
            targetDir = await outputHandle.getDirectoryHandle(clusterFolder, { create: true });
            if (item.isKeyPhoto) destName = `KEEPER_${item.name}`;
          }

          // Write file
          const arrayBuffer = await item.file.arrayBuffer();
          const fileRef = await targetDir.getFileHandle(destName, { create: true });
          const writable = await fileRef.createWritable();
          await writable.write(new Uint8Array(arrayBuffer));
          await writable.close();
          copiedCount++;
        }
      }

      addBatchLog?.(`✅ Successfully organized and saved ${copiedCount} files into subdirectories.`, "success");
      showToast(`Saved ${copiedCount} files to folders successfully!`);
    } catch (e) {
      addBatchLog?.(`❌ Folder Export Failed: ${e.message}`, "error");
      console.error(e);
      alert(`Sort export failed: ${e.message}`);
    } finally {
      setIsExporting(false);
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
        fontFamily: "'Outfit', 'Inter', sans-serif",
        color: dm ? "#f3f4f6" : "#1f2937",
        height: isMobile ? "auto" : "calc(100vh - 52px)",
        overflowY: "auto",
        display: "flex",
        flexDirection: "column",
        gap: "20px",
        padding: isMobile ? "0px" : "20px 28px 32px",
        boxSizing: "border-box"
      }}
    >
      <style>{`
        @keyframes pulse-glow {
          0%, 100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(249, 115, 22, 0.4); }
          50% { transform: scale(1.05); box-shadow: 0 0 20px 8px rgba(249, 115, 22, 0.2); }
        }
      `}</style>

      {/* SaaS Feature Gating Overlay for Free Tier > 10 images */}
      {user && user.tier === "free" && activeInputFiles && activeInputFiles.length > 10 && (
        <div style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(10, 14, 23, 0.7)",
          backdropFilter: "blur(18px)",
          WebkitBackdropFilter: "blur(18px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 999,
          padding: "24px",
          textAlign: "center",
          borderRadius: "20px",
          animation: "fadein 0.4s ease forwards"
        }}>
          <div style={{
            maxWidth: "500px",
            background: dm ? "rgba(18, 24, 38, 0.95)" : "#ffffff",
            border: `1.5px solid ${dm ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.08)"}`,
            boxShadow: "0 24px 70px rgba(0, 0, 0, 0.4)",
            borderRadius: "28px",
            padding: "40px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "20px"
          }}>
            <div style={{
              width: "64px",
              height: "64px",
              borderRadius: "50%",
              background: "rgba(249, 115, 22, 0.15)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "32px",
              color: "#f97316",
              animation: "pulse-glow 2s infinite"
            }}>
              ⚡
            </div>
            <h2 style={{
              fontSize: "24px",
              fontWeight: 900,
              fontFamily: "'Outfit', sans-serif",
              color: dm ? "#ffffff" : "#111827",
              letterSpacing: "-0.5px"
            }}>
              Creator Pro Upgrade Required
            </h2>
            <p style={{
              fontSize: "14px",
              color: dm ? "#cbd5e1" : "#4b5563",
              lineHeight: 1.6
            }}>
              Batch AI focus culling is capped at a maximum of <strong>10 photos</strong> on the Hobbyist Free sandbox. Unlock unlimited batching, advanced C++ local WASM processing, and active device lease synchronization.
            </p>

            <div style={{
              display: "flex",
              flexDirection: "column",
              gap: "12px",
              width: "100%",
              marginTop: "8px"
            }}>
              <button
                onClick={() => {
                  setActiveTab("home");
                  setTimeout(() => {
                    const el = document.getElementById("pricing-container");
                    if (el) el.scrollIntoView({ behavior: "smooth" });
                  }, 100);
                }}
                style={{
                  background: 'linear-gradient(135deg, #f97316 0%, #facc15 100%)',
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "14px",
                  padding: "14px 24px",
                  fontSize: "14.5px",
                  fontWeight: 800,
                  cursor: "pointer",
                  boxShadow: "0 6px 20px rgba(249, 115, 22, 0.35)",
                  transition: "transform 0.2s",
                  fontFamily: "'Outfit', sans-serif",
                  width: "100%"
                }}
              >
                ⭐ Upgrade to Creator Pro
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dynamic Toast Alert */}
      {toastMessage && (
        <div
          style={{
            position: "fixed",
            bottom: "24px",
            right: "24px",
            background: dm ? "rgba(18, 18, 24, 0.9)" : "rgba(255, 255, 255, 0.95)",
            border: `1px solid ${dm ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)"}`,
            boxShadow: "0 10px 40px rgba(0, 0, 0, 0.2)",
            padding: "12px 24px",
            borderRadius: "14px",
            color: dm ? "#fff" : "#1f2937",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            gap: "10px",
            fontSize: "13px",
            fontWeight: 600,
            backdropFilter: "blur(12px)"
          }}
        >
          <span style={{ color: labelColors[toastMessage.type] || accent, fontSize: "16px" }}>●</span>
          {toastMessage.msg}
        </div>
      )}

      {/* Top Header Section */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "20px" }}>🔍</span>
            <h1 style={{ margin: 0, fontSize: "24px", fontWeight: 800, background: "linear-gradient(135deg, #06b6d4, #6c63ff)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              Cull AI Lab
            </h1>
          </div>
          <p style={{ margin: "4px 0 0 0", fontSize: "13px", color: dm ? "#a1a1aa" : "#71717a" }}>
            Group duplicate clusters, detect blinks, check focus points, and synchronize Adobe ratings natively.
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
              border: `1px solid ${dm ? "rgba(255, 255, 255, 0.15)" : "rgba(0, 0, 0, 0.1)"}`,
              color: dm ? "#d1d5db" : "#4b5563",
              borderRadius: "8px",
              cursor: "pointer",
              fontSize: "13px",
              fontWeight: 600,
              transition: "all 0.2s"
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = accent;
              e.currentTarget.style.color = accent;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = dm ? "rgba(255, 255, 255, 0.15)" : "rgba(0, 0, 0, 0.1)";
              e.currentTarget.style.color = dm ? "#d1d5db" : "#4b5563";
            }}
          >
            ← Ingest New Folder
          </button>
        )}
      </div>

      {/* CONFIG / INGESTION INTERFACE */}
      {groups.length === 0 && (
        <div
          className="glass-panel"
          style={{
            borderRadius: "20px",
            padding: "36px",
            display: "flex",
            flexDirection: "column",
            gap: "28px",
            boxShadow: dm ? "0 10px 40px rgba(0,0,0,0.3)" : "0 10px 30px rgba(0,0,0,0.03)"
          }}
        >
          {/* Files Selector Row */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "24px" }}>
            
            {/* Step 1: Input directory */}
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <label style={{ fontSize: "14px", fontWeight: 700, display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "20px", height: "20px", background: accent, color: "#fff", borderRadius: "50%", fontSize: "11px" }}>1</span>
                Choose Target Source Folder
              </label>
              
              <button
                onClick={selectSourceFolder}
                style={{
                  padding: "16px",
                  background: sourceHandle ? "rgba(34, 197, 94, 0.05)" : (dm ? "rgba(255, 255, 255, 0.01)" : "#f9fafb"),
                  border: `2px dashed ${sourceHandle ? "#22c55e" : (dm ? "rgba(255, 255, 255, 0.1)" : "#d1d5db")}`,
                  borderRadius: "12px",
                  cursor: "pointer",
                  fontSize: "14px",
                  fontWeight: 600,
                  color: sourceHandle ? "#22c55e" : (dm ? "#d1d5db" : "#4b5563"),
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "10px",
                  transition: "all 0.25s"
                }}
                onMouseEnter={(e) => {
                  if (!sourceHandle) {
                    e.currentTarget.style.borderColor = accent;
                    e.currentTarget.style.background = dm ? "rgba(108, 99, 255, 0.03)" : "rgba(108, 99, 255, 0.02)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!sourceHandle) {
                    e.currentTarget.style.borderColor = dm ? "rgba(255, 255, 255, 0.1)" : "#d1d5db";
                    e.currentTarget.style.background = dm ? "rgba(255, 255, 255, 0.01)" : "#f9fafb";
                  }
                }}
              >
                <span style={{ fontSize: "18px" }}>📂</span>
                {sourceHandle ? `Folder: ${sourceHandle.name}` : `Select Directory with Images`}
              </button>
              
              <span style={{ fontSize: "12px", color: dm ? "#a1a1aa" : "#71717a" }}>
                {activeInputFiles.length > 0 ? (
                  <strong style={{ color: "#22c55e" }}>✓ Loaded {activeInputFiles.length} photos ready for scan.</strong>
                ) : (
                  "Select the directory containing JPEG/PNG raw outputs."
                )}
              </span>
            </div>

            {/* Step 2: Output directory */}
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <label style={{ fontSize: "14px", fontWeight: 700, display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "20px", height: "20px", background: accent, color: "#fff", borderRadius: "50%", fontSize: "11px" }}>2</span>
                Set Sidecar Export Destination
              </label>
              
              <button
                onClick={selectOutputFolder}
                style={{
                  padding: "16px",
                  background: outputHandle ? "rgba(34, 197, 94, 0.05)" : (dm ? "rgba(255, 255, 255, 0.01)" : "#f9fafb"),
                  border: `2px dashed ${outputHandle ? "#22c55e" : (dm ? "rgba(255, 255, 255, 0.1)" : "#d1d5db")}`,
                  borderRadius: "12px",
                  cursor: "pointer",
                  fontSize: "14px",
                  fontWeight: 600,
                  color: outputHandle ? "#22c55e" : (dm ? "#d1d5db" : "#4b5563"),
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "10px",
                  transition: "all 0.25s"
                }}
                onMouseEnter={(e) => {
                  if (!outputHandle) {
                    e.currentTarget.style.borderColor = accent;
                    e.currentTarget.style.background = dm ? "rgba(108, 99, 255, 0.03)" : "rgba(108, 99, 255, 0.02)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!outputHandle) {
                    e.currentTarget.style.borderColor = dm ? "rgba(255, 255, 255, 0.1)" : "#d1d5db";
                    e.currentTarget.style.background = dm ? "rgba(255, 255, 255, 0.01)" : "#f9fafb";
                  }
                }}
              >
                <span style={{ fontSize: "18px" }}>💾</span>
                {outputHandle ? `Folder: ${outputHandle.name}` : `Select Rating Output Folder`}
              </button>
              
              <span style={{ fontSize: "12px", color: dm ? "#a1a1aa" : "#71717a" }}>
                {outputHandle ? (
                  <strong style={{ color: "#22c55e" }}>✓ Outputs synced directly. Ready to save ratings.</strong>
                ) : (
                  "Used to write non-destructive XMP metadata for Adobe Lightroom/Bridge."
                )}
              </span>
            </div>
          </div>

          {activeInputFiles.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <span style={{ fontSize: "12px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", color: dm ? "#888" : "#999" }}>Ingestion Files Preview</span>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(80px, 1fr))", gap: "10px", maxHeight: "150px", overflowY: "auto", padding: "8px", background: dm ? "rgba(0,0,0,0.2)" : "rgba(0,0,0,0.02)", borderRadius: "10px", border: `1px solid ${dm ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.05)"}` }}>
                {activeInputFiles.map((fileObj, idx) => (
                  <div key={idx} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px", padding: "6px", background: dm ? "#222" : "#f3f4f6", borderRadius: "8px", border: `1px solid ${dm ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"}` }}>
                    <div style={{ fontSize: "20px" }}>🖼️</div>
                    <span style={{ fontSize: "10px", fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", width: "65px", textAlign: "center" }}>{fileObj.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <hr style={{ border: "none", height: "1px", background: dm ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.08)" }} />

          {/* Parameters Controls */}
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "16px" }}>⚙️</span>
              <h3 style={{ margin: 0, fontSize: "15px", fontWeight: 700 }}>AI Parameters & Sensitivity Settings</h3>
            </div>
            
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "28px" }}>
              
              {/* Grouping Sensitivity */}
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <label style={{ fontSize: "13px", fontWeight: 700 }}>Duplicate Grouping Sensitivity</label>
                  <span style={{ fontSize: "13px", color: accent, fontWeight: 800 }}>Hamming: {sensitivity}</span>
                </div>
                <input
                  type="range"
                  min="4"
                  max="24"
                  value={sensitivity}
                  onChange={(e) => setSensitivity(parseInt(e.target.value))}
                  style={{ accentColor: accent, cursor: "pointer", width: "100%" }}
                />
                <span style={{ fontSize: "11px", color: dm ? "#a1a1aa" : "#71717a", lineHeight: "1.4" }}>
                  Smaller values group tighter (only exact matches). Larger values group broader clusters (catches continuous bursts).
                </span>
              </div>

              {/* Sharpness Cutoff */}
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <label style={{ fontSize: "13px", fontWeight: 700 }}>Focus Sharpness Strictness</label>
                  <span style={{ fontSize: "13px", color: accent, fontWeight: 800 }}>Min Score: {blurCutoff}%</span>
                </div>
                <input
                  type="range"
                  min="20"
                  max="80"
                  value={blurCutoff}
                  onChange={(e) => setBlurCutoff(parseInt(e.target.value))}
                  style={{ accentColor: accent, cursor: "pointer", width: "100%" }}
                />
                <span style={{ fontSize: "11px", color: dm ? "#a1a1aa" : "#71717a", lineHeight: "1.4" }}>
                  Threshold for out-of-focus warning flags. Alternates below this setting get flagged as blurry candidates.
                </span>
              </div>
            </div>

            {/* MediaPipe blink selection */}
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "10px" }}>
              <input
                type="checkbox"
                id="cull_landmarks"
                checked={useFaceLandmarks}
                onChange={(e) => setUseFaceLandmarks(e.target.checked)}
                style={{ accentColor: accent, width: "17px", height: "17px", cursor: "pointer" }}
              />
              <label htmlFor="cull_landmarks" style={{ fontSize: "13px", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: "6px" }}>
                Enable MediaPipe Face Landmarker (Auto-detects closed eyes, blinks, and smiles)
              </label>
            </div>
          </div>

          {/* Trigger Button / Progress */}
          <div style={{ display: "flex", flexDirection: "column", gap: "16px", alignItems: "center", marginTop: "8px" }}>
            {isProcessing ? (
              <div style={{ width: "100%", display: "flex", flexDirection: "column", alignItems: "center", gap: "12px", padding: "10px 0" }}>
                <div style={{ width: "100%", height: "8px", background: dm ? "#222" : "#e5e7eb", borderRadius: "10px", overflow: "hidden", border: `1px solid ${dm ? "rgba(255,255,255,0.05)" : "transparent"}` }}>
                  <div
                    style={{
                      height: "100%",
                      width: `${(progress.current / progress.total) * 100}%`,
                      background: "linear-gradient(90deg, #06b6d4, #6c63ff, #ec4899)",
                      transition: "width 0.2s cubic-bezier(0.4, 0, 0.2, 1)"
                    }}
                  />
                </div>
                
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
                  <span style={{ fontSize: "14px", fontWeight: 800, letterSpacing: "-0.2px" }}>
                    Analyzing photo clusters... {progress.current} / {progress.total} ({Math.round((progress.current / progress.total) * 100)}%)
                  </span>
                  <span style={{ fontSize: "12px", color: accent, fontWeight: 600 }}>
                    Scanning: {progress.currentFile}
                  </span>
                </div>
              </div>
            ) : (
              <button
                onClick={handleStartCulling}
                disabled={activeInputFiles.length === 0}
                style={{
                  width: "100%",
                  padding: "16px",
                  background: activeInputFiles.length === 0 ? (dm ? "#222" : "#eee") : "linear-gradient(135deg, #06b6d4, #6c63ff)",
                  color: activeInputFiles.length === 0 ? (dm ? "#555" : "#aaa") : "#fff",
                  border: "none",
                  borderRadius: "14px",
                  cursor: activeInputFiles.length === 0 ? "not-allowed" : "pointer",
                  fontSize: "15px",
                  fontWeight: 700,
                  boxShadow: activeInputFiles.length === 0 ? "none" : "0 8px 30px rgba(108, 99, 255, 0.25)",
                  transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)"
                }}
                onMouseEnter={(e) => {
                  if (activeInputFiles.length > 0) {
                    e.currentTarget.style.transform = "translateY(-1px)";
                    e.currentTarget.style.boxShadow = "0 12px 35px rgba(108, 99, 255, 0.35)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (activeInputFiles.length > 0) {
                    e.currentTarget.style.transform = "none";
                    e.currentTarget.style.boxShadow = "0 8px 30px rgba(108, 99, 255, 0.25)";
                  }
                }}
              >
                ⚡ Start AI Culling Sequence ({activeInputFiles.length} Photos)
              </button>
            )}

            {/* Micro logs view inside ingestion card */}
            {batchLogs && batchLogs.length > 0 && (
              <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: "6px" }}>
                <span style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", color: dm ? "#777" : "#aaa" }}>Console logs</span>
                <div style={{ width: "100%", maxHeight: "100px", overflowY: "auto", background: dm ? "#000" : "#222", color: "#22c55e", padding: "10px", borderRadius: "10px", fontFamily: "monospace", fontSize: "11px", display: "flex", flexDirection: "column", gap: "4px" }}>
                  {batchLogs.slice(-4).map((log, lidx) => (
                    <div key={lidx}>{log.text}</div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* RESULTS SUMMARY BAR — appears after culling */}
      {groups.length > 0 && (() => {
        const all = groups.flat();
        const keepers   = all.filter(x => x.category === "keeper"   || (x.isKeyPhoto && !x.category)).length;
        const alternates = all.filter(x => x.category === "alternate" || (!x.isKeyPhoto && !x.category && x.rating === 3)).length;
        const blurry    = all.filter(x => x.category === "blurry").length;
        const rejected  = all.filter(x => x.category === "rejected"  || (x.rating === 1 && !x.category)).length;
        return (
          <div className="glass-panel" style={{
            borderRadius: "18px",
            padding: "18px 24px",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            flexWrap: "wrap",
            boxShadow: dm ? "0 8px 32px rgba(0,0,0,0.3)" : "0 8px 24px rgba(0,0,0,0.04)"
          }}>
            <span style={{ fontSize: "12px", fontWeight: 800, color: dm ? "#a1a1aa" : "#71717a", textTransform: "uppercase", letterSpacing: "0.5px", marginRight: "4px" }}>AI Results:</span>
            {[
              { label: "Keepers",   count: keepers,   color: "#22c55e", icon: "★",   desc: "5★ Green" },
              { label: "Alternates",count: alternates, color: "#3b82f6", icon: "●",   desc: "3★ Blue" },
              { label: "Blurry",    count: blurry,    color: "#eab308", icon: "◐",   desc: "2★ Yellow" },
              { label: "Rejected",  count: rejected,  color: "#ef4444", icon: "✕",   desc: "1★ Red" },
            ].map(tier => (
              <div key={tier.label} style={{
                display: "flex", alignItems: "center", gap: "6px",
                background: `${tier.color}18`,
                border: `1px solid ${tier.color}44`,
                borderRadius: "10px",
                padding: "6px 12px"
              }}>
                <span style={{ color: tier.color, fontSize: "14px", fontWeight: 800 }}>{tier.icon}</span>
                <span style={{ fontSize: "12px", fontWeight: 800, color: tier.color }}>{tier.count}</span>
                <span style={{ fontSize: "11px", fontWeight: 600, color: dm ? "#ccc" : "#555" }}>{tier.label}</span>
                <span style={{ fontSize: "10px", color: dm ? "#666" : "#999" }}>({tier.desc})</span>
              </div>
            ))}
            <div style={{ marginLeft: "auto", fontSize: "11px", color: dm ? "#555" : "#bbb", fontWeight: 600 }}>
              {all.length} total · {groups.length} clusters
            </div>
          </div>
        );
      })()}

      {/* ACTIVE CULLING REVIEW WORKSPACE */}
      {groups.length > 0 && activePhoto && (
        <div style={{ display: "grid", gridTemplateColumns: "2.2fr 1fr", gap: "20px", flexShrink: 0 }}>
          
          {/* Left Column: Darkroom Viewport & Group Details */}
          <div
            className="glass-panel"
            style={{
              borderRadius: "20px",
              padding: "20px",
              display: "flex",
              flexDirection: "column",
              boxShadow: dm ? "0 10px 40px rgba(0,0,0,0.3)" : "0 10px 30px rgba(0,0,0,0.03)",
              position: "relative"
            }}
          >
            {/* Header info */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: `1px solid ${dm ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"}`, paddingBottom: "12px", marginBottom: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <span style={{ background: "linear-gradient(135deg, #06b6d4, #6c63ff)", color: "#fff", padding: "4px 10px", borderRadius: "8px", fontSize: "11px", fontWeight: 800 }}>
                  CLUSTER {activeGroupIndex + 1} / {groups.length}
                </span>
                <span style={{ fontSize: "13px", fontWeight: 600, color: dm ? "#9ca3af" : "#4b5563" }}>
                  {activeGroup.length} duplicate alternates
                </span>
              </div>
              
              <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                <button
                  onClick={() => setShowFaceBoxes(!showFaceBoxes)}
                  style={{
                    background: showFaceBoxes ? "rgba(108, 99, 255, 0.1)" : "transparent",
                    color: showFaceBoxes ? accent : (dm ? "#a1a1aa" : "#666"),
                    border: `1px solid ${showFaceBoxes ? accent : (dm ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)")}`,
                    padding: "5px 10px",
                    borderRadius: "8px",
                    fontSize: "11px",
                    fontWeight: 700,
                    cursor: "pointer"
                  }}
                >
                  {showFaceBoxes ? "Hide Face Bounding Boxes" : "Show Face Boxes"}
                </button>

                {activePhoto.isKeyPhoto ? (
                  <span style={{ background: "rgba(34, 197, 94, 0.15)", color: "#22c55e", padding: "5px 12px", borderRadius: "8px", fontSize: "11px", fontWeight: 800, border: "1px solid rgba(34, 197, 94, 0.3)" }}>
                    ★ Auto-Selected Key Photo
                  </span>
                ) : (
                  <button
                    onClick={() => handlePromoteToKeyPhoto(activePhoto)}
                    style={{
                      background: "linear-gradient(135deg, #6c63ff, #a78bfa)",
                      color: "#fff",
                      border: "none",
                      padding: "6px 14px",
                      borderRadius: "8px",
                      fontSize: "11px",
                      fontWeight: 700,
                      cursor: "pointer",
                      boxShadow: "0 4px 10px rgba(108, 99, 255, 0.25)"
                    }}
                  >
                    Set as Key Photo (S)
                  </button>
                )}
              </div>
            </div>

            {/* Darkroom Viewport Panel */}
            <div
              style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: dm ? "#0a0a0f" : "#f1f2f6",
                borderRadius: "14px",
                position: "relative",
                overflow: "hidden",
                border: `1px solid ${dm ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.05)"}`,
                minHeight: "45vh",
                maxHeight: "48vh"
              }}
            >
              <div style={{ position: "relative", display: "inline-block", maxWidth: "100%", maxHeight: "100%" }}>
                <img
                  src={activePhoto.previewUrl}
                  alt={activePhoto.name}
                  style={{
                    maxWidth: "100%",
                    maxHeight: "46vh",
                    objectFit: "contain",
                    borderRadius: "8px",
                    display: "block"
                  }}
                />

                {/* SVG/Div Bounding Boxes for Faces */}
                {showFaceBoxes && activePhoto.faces?.map((face, index) => (
                  <div
                    key={index}
                    style={{
                      position: "absolute",
                      left: `${face.rect.x * 100}%`,
                      top: `${face.rect.y * 100}%`,
                      width: `${face.rect.w * 100}%`,
                      height: `${face.rect.h * 100}%`,
                      border: `2px solid ${face.metrics?.blinkDetected ? "#ef4444" : "#22c55e"}`,
                      boxShadow: `0 0 8px ${face.metrics?.blinkDetected ? "rgba(239, 68, 68, 0.5)" : "rgba(34, 197, 94, 0.5)"}`,
                      borderRadius: "6px",
                      pointerEvents: "auto",
                      cursor: "help",
                      transition: "all 0.15s"
                    }}
                    title={`Face #${index + 1} | Eyes: ${face.metrics?.blinkDetected ? "Blinking / Closed" : "Open"} | Smile: ${face.metrics?.smileScore}%`}
                  >
                    {/* Tiny Face HUD Label */}
                    <div style={{
                      position: "absolute",
                      top: "-22px",
                      left: "-1px",
                      background: face.metrics?.blinkDetected ? "#ef4444" : "#22c55e",
                      color: "#fff",
                      fontSize: "9px",
                      fontWeight: 800,
                      padding: "2px 6px",
                      borderRadius: "4px",
                      whiteSpace: "nowrap"
                    }}>
                      👤 Face {index + 1} ({face.metrics?.blinkDetected ? "Blink" : "OK"})
                    </div>
                  </div>
                ))}
              </div>

              {/* Viewport Floating Information HUD */}
              <div
                style={{
                  position: "absolute",
                  bottom: "16px",
                  left: "16px",
                  background: "rgba(10, 10, 15, 0.85)",
                  backdropFilter: "blur(12px)",
                  padding: "8px 16px",
                  borderRadius: "10px",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  display: "flex",
                  gap: "16px",
                  fontSize: "12px",
                  color: "#fff",
                  boxShadow: "0 8px 32px rgba(0, 0, 0, 0.3)"
                }}
              >
                <div>
                  <span style={{ color: "#aaa" }}>Sharpness Value:</span>{" "}
                  <strong style={{ color: activePhoto.sharpness >= blurCutoff ? "#22c55e" : "#ef4444" }}>
                    {activePhoto.sharpness}%
                  </strong>
                </div>

                {activePhoto.faces?.length > 0 && (
                  <>
                    <div style={{ width: "1px", background: "rgba(255, 255, 255, 0.15)" }} />
                    <div>
                      <span style={{ color: "#aaa" }}>Detected Faces:</span> <strong>{activePhoto.faces.length}</strong>
                    </div>
                  </>
                )}

                {activePhoto.warnings?.length > 0 && (
                  <>
                    <div style={{ width: "1px", background: "rgba(255, 255, 255, 0.15)" }} />
                    <div style={{ color: "#ef4444", fontWeight: 700, display: "flex", alignItems: "center", gap: "4px" }}>
                      <span>⚠️</span> Quality Flags
                    </div>
                  </>
                )}
              </div>

              {/* Floating Star/Label Badges inside Viewer */}
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
                      background: "rgba(251, 191, 36, 0.95)",
                      color: "#1e1b4b",
                      fontWeight: 800,
                      padding: "4px 10px",
                      borderRadius: "6px",
                      fontSize: "11px",
                      boxShadow: "0 4px 12px rgba(251, 191, 36, 0.2)",
                      display: "flex",
                      alignItems: "center",
                      gap: "2px"
                    }}
                  >
                    <span>★</span> {activePhoto.rating}
                  </div>
                )}
                {activePhoto.label && (
                  <div
                    style={{
                      background: labelColors[activePhoto.label],
                      color: "#fff",
                      fontWeight: 800,
                      padding: "4px 10px",
                      borderRadius: "6px",
                      fontSize: "10px",
                      textTransform: "uppercase",
                      boxShadow: `0 4px 12px ${labelColors[activePhoto.label]}40`,
                      letterSpacing: "0.5px"
                    }}
                  >
                    {activePhoto.label}
                  </div>
                )}
              </div>
            </div>

            {/* Bottom details metadata line */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "14px" }}>
              <span style={{ fontSize: "13px", fontWeight: 600, color: dm ? "#aaa" : "#555" }}>
                📄 {activePhoto.name}
              </span>
              <span style={{ fontSize: "12px", color: dm ? "#888" : "#999" }}>
                Quality Metric Score: <strong style={{ color: activePhoto.cullScore >= 70 ? "#22c55e" : "#eab308" }}>{activePhoto.cullScore} pts</strong>
              </span>
            </div>
          </div>

          {/* Right Column: AI Insights, Star Ratings, Alternate Items */}
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            
            {/* 1. Ratings Dashboard Panel */}
            <div
              className="glass-panel"
              style={{
                borderRadius: "20px",
                padding: "20px",
                display: "flex",
                flexDirection: "column",
                gap: "18px",
                boxShadow: dm ? "0 10px 40px rgba(0,0,0,0.3)" : "0 10px 30px rgba(0,0,0,0.03)"
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ fontSize: "16px" }}>🏷️</span>
                <h3 style={{ margin: 0, fontSize: "14px", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.5px", color: dm ? "#a1a1aa" : "#4b5563" }}>
                  Rating Controls
                </h3>
              </div>

              {/* Stars */}
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <span style={{ fontSize: "12px", color: dm ? "#a1a1aa" : "#71717a", fontWeight: 600 }}>Star Rating (Keys 1-5):</span>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <StarRating rating={activePhoto.rating} onChange={updateActivePhotoRating} size={22} />
                  <span style={{ fontSize: "12px", fontWeight: 700, color: "#fbbf24" }}>
                    {activePhoto.rating ? `${activePhoto.rating} Stars` : "Unrated"}
                  </span>
                </div>
              </div>

              {/* Color Labels */}
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <span style={{ fontSize: "12px", color: dm ? "#a1a1aa" : "#71717a", fontWeight: 600 }}>Color Label tags (Keys 6-9):</span>
                <div style={{ display: "flex", gap: "6px" }}>
                  {["green", "blue", "yellow", "red"].map((colorName) => (
                    <button
                      key={colorName}
                      onClick={() => updateActivePhotoRating(undefined, colorName)}
                      style={{
                        flex: 1,
                        height: "26px",
                        background: labelColors[colorName],
                        border: activePhoto.label === colorName ? `2px solid ${dm ? "#fff" : "#000"}` : "none",
                        boxShadow: activePhoto.label === colorName ? `0 0 10px ${labelColors[colorName]}` : "none",
                        borderRadius: "6px",
                        cursor: "pointer",
                        transform: activePhoto.label === colorName ? "scale(1.08)" : "none",
                        transition: "all 0.15s ease"
                      }}
                      title={`Set label to ${colorName}`}
                    />
                  ))}
                  <button
                    onClick={() => updateActivePhotoRating(0, "")}
                    style={{
                      flex: 1.2,
                      height: "26px",
                      background: "transparent",
                      border: `1px solid ${dm ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.15)"}`,
                      color: dm ? "#d1d5db" : "#4b5563",
                      fontSize: "11px",
                      fontWeight: 700,
                      borderRadius: "6px",
                      cursor: "pointer",
                      transition: "all 0.15s"
                    }}
                  >
                    Clear [0]
                  </button>
                </div>
              </div>

              <hr style={{ border: "none", height: "1px", background: dm ? "rgba(255, 255, 255, 0.06)" : "rgba(0, 0, 0, 0.06)" }} />

              {/* AI Details / Warnings HUD */}
              <div>
                <span style={{ fontSize: "12px", color: dm ? "#a1a1aa" : "#71717a", fontWeight: 700 }}>AI Quality Details:</span>
                
                <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "8px" }}>
                  {/* General flags */}
                  {activePhoto.warnings?.length > 0 ? (
                    activePhoto.warnings.map((w, idx) => (
                      <div
                        key={idx}
                        style={{
                          background: "rgba(239, 68, 68, 0.06)",
                          border: "1px solid rgba(239, 68, 68, 0.15)",
                          color: "#ef4444",
                          padding: "8px 12px",
                          borderRadius: "10px",
                          fontSize: "11px",
                          fontWeight: 700,
                          display: "flex",
                          alignItems: "center",
                          gap: "6px"
                        }}
                      >
                        <span>⚠️</span> {w}
                      </div>
                    ))
                  ) : (
                    <div style={{ color: "#22c55e", fontSize: "11px", fontWeight: 700, display: "flex", alignItems: "center", gap: "6px", background: "rgba(34, 197, 94, 0.05)", padding: "8px 12px", borderRadius: "10px", border: "1px solid rgba(34, 197, 94, 0.15)" }}>
                      <span>✓</span> Perfect focus. No issues detected!
                    </div>
                  )}

                  {/* Face Analysis List */}
                  {activePhoto.faces?.map((face, index) => {
                    const leftOpen = Math.min(100, Math.round((face.metrics?.leftEor / 0.22) * 100));
                    const rightOpen = Math.min(100, Math.round((face.metrics?.rightEor / 0.22) * 100));
                    const smileVal = face.metrics?.smileScore || 0;
                    return (
                      <div
                        key={index}
                        style={{
                          background: dm ? "rgba(255,255,255,0.01)" : "rgba(0,0,0,0.01)",
                          border: `1px solid ${dm ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)"}`,
                          padding: "10px",
                          borderRadius: "10px",
                          display: "flex",
                          flexDirection: "column",
                          gap: "6px"
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", fontWeight: 800 }}>
                          <span>👤 Face #{index + 1} Details</span>
                          {face.metrics?.blinkDetected ? (
                            <span style={{ color: "#ef4444" }}>⚠️ Blinking</span>
                          ) : (
                            <span style={{ color: "#22c55e" }}>✓ Eyes Open</span>
                          )}
                        </div>

                        <div style={{ display: "flex", flexDirection: "column", gap: "4px", fontSize: "10px", color: dm ? "#aaa" : "#555" }}>
                          <div style={{ display: "flex", justifyContent: "space-between" }}>
                            <span>Left Eye openness:</span>
                            <span>{leftOpen}%</span>
                          </div>
                          <div style={{ width: "100%", height: "3px", background: dm ? "#222" : "#ddd", borderRadius: "2px", overflow: "hidden" }}>
                            <div style={{ height: "100%", width: `${leftOpen}%`, background: leftOpen < 65 ? "#ef4444" : "#22c55e" }} />
                          </div>

                          <div style={{ display: "flex", justifyContent: "space-between", marginTop: "2px" }}>
                            <span>Right Eye openness:</span>
                            <span>{rightOpen}%</span>
                          </div>
                          <div style={{ width: "100%", height: "3px", background: dm ? "#222" : "#ddd", borderRadius: "2px", overflow: "hidden" }}>
                            <div style={{ height: "100%", width: `${rightOpen}%`, background: rightOpen < 65 ? "#ef4444" : "#22c55e" }} />
                          </div>

                          <div style={{ display: "flex", justifyContent: "space-between", marginTop: "2px" }}>
                            <span>Smile score:</span>
                            <span>{smileVal}% {smileVal > 60 ? "😊" : "😐"}</span>
                          </div>
                          <div style={{ width: "100%", height: "3px", background: dm ? "#222" : "#ddd", borderRadius: "2px", overflow: "hidden" }}>
                            <div style={{ height: "100%", width: `${smileVal}%`, background: "linear-gradient(90deg, #6c63ff, #06b6d4)" }} />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* 2. Alternates Selection Deck */}
            <div
              className="glass-panel"
              style={{
                flex: 1,
                borderRadius: "20px",
                padding: "20px",
                display: "flex",
                flexDirection: "column",
                gap: "12px",
                maxHeight: "28vh",
                overflowY: "auto",
                boxShadow: dm ? "0 10px 40px rgba(0,0,0,0.3)" : "0 10px 30px rgba(0,0,0,0.03)"
              }}
            >
              <span style={{ fontSize: "12px", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.5px", color: dm ? "#a1a1aa" : "#4b5563" }}>
                Alternates in Cluster
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
                        background: isCurrent ? (dm ? "rgba(255,255,255,0.05)" : "#f3f4f6") : "transparent",
                        border: `1px solid ${isCurrent ? accent : "transparent"}`,
                        borderRadius: "10px",
                        cursor: "pointer",
                        transition: "all 0.15s ease"
                      }}
                    >
                      {/* Alternate thumbnail */}
                      <div
                        style={{
                          width: "64px",
                          height: "48px",
                          background: "#000",
                          borderRadius: "6px",
                          overflow: "hidden",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          border: `1px solid ${dm ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"}`
                        }}
                      >
                        <img
                          src={item.previewUrl}
                          alt=""
                          style={{ width: "100%", height: "100%", objectFit: "cover" }}
                        />
                      </div>

                      {/* Alternate details */}
                      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", gap: "3px" }}>
                        <span style={{ fontSize: "11px", fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "160px" }}>
                          {item.name}
                        </span>
                        <div style={{ display: "flex", gap: "10px", fontSize: "10px", color: dm ? "#a1a1aa" : "#71717a" }}>
                          <span>Focus: {item.sharpness}%</span>
                          {item.isKeyPhoto ? (
                            <span style={{ color: "#22c55e", fontWeight: 800 }}>★ Key Photo</span>
                          ) : (
                            item.warnings?.length > 0 && <span style={{ color: "#ef4444" }}>⚠️ Warning</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Smart Save & Organize Panel */}
            <div
              className="glass-panel"
              style={{
                borderRadius: "20px",
                padding: "20px",
                display: "flex",
                flexDirection: "column",
                gap: "16px",
                boxShadow: dm ? "0 10px 40px rgba(0,0,0,0.3)" : "0 10px 30px rgba(0,0,0,0.03)"
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ fontSize: "16px" }}>💾</span>
                <h3 style={{ margin: 0, fontSize: "14px", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.5px", color: dm ? "#a1a1aa" : "#4b5563" }}>
                  Save & Organize Results
                </h3>
              </div>

              {/* Export Mode Tabs */}
              <div style={{ display: "flex", gap: "4px", background: dm ? "rgba(0,0,0,0.2)" : "rgba(0,0,0,0.05)", padding: "4px", borderRadius: "10px" }}>
                <button
                  onClick={() => setExportMethod("folders")}
                  style={{
                    flex: 1,
                    padding: "8px",
                    background: exportMethod === "folders" ? (dm ? "#1e1b4b" : "#fff") : "transparent",
                    color: exportMethod === "folders" ? accent : (dm ? "#9ca3af" : "#4b5563"),
                    border: "none",
                    borderRadius: "8px",
                    fontSize: "12px",
                    fontWeight: 700,
                    cursor: "pointer",
                    boxShadow: exportMethod === "folders" && !dm ? "0 2px 6px rgba(0,0,0,0.05)" : "none",
                    transition: "all 0.15s ease"
                  }}
                >
                  📁 Smart Folders
                </button>
                <button
                  onClick={() => setExportMethod("xmp")}
                  style={{
                    flex: 1,
                    padding: "8px",
                    background: exportMethod === "xmp" ? (dm ? "#1e1b4b" : "#fff") : "transparent",
                    color: exportMethod === "xmp" ? accent : (dm ? "#9ca3af" : "#4b5563"),
                    border: "none",
                    borderRadius: "8px",
                    fontSize: "12px",
                    fontWeight: 700,
                    cursor: "pointer",
                    boxShadow: exportMethod === "xmp" && !dm ? "0 2px 6px rgba(0,0,0,0.05)" : "none",
                    transition: "all 0.15s ease"
                  }}
                >
                  📝 XMP Sidecars
                </button>
              </div>

              {/* Dynamic Tab Contents */}
              {exportMethod === "folders" ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  <span style={{ fontSize: "11px", color: dm ? "#a1a1aa" : "#71717a", lineHeight: "1.4" }}>
                    Physically sort photos by copying them into organized subdirectories inside your output destination.
                  </span>

                  {/* Folder Layout Options */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {[
                      { id: "full_sort",       title: "★ Full 4-Folder Sort (Recommended)", desc: "Separates into 📗 Keepers · 📘 Alternates · 📙 Blurry · 📕 Rejected based on AI ratings." },
                      { id: "keepers_rejects", title: "Keepers vs Rejected",                desc: "Creates /Keepers and /Rejected & Alternates folders." },
                      { id: "keepers_only",    title: "Keepers Only",                       desc: "Only saves the best 5-star photos to a /Keepers folder." },
                      { id: "clusters",        title: "AI Duplicate Groups",                desc: "Puts each duplicate burst into /Group_1, /Group_2, etc. folders." }
                    ].map((opt) => (
                      <label
                        key={opt.id}
                        style={{
                          display: "flex",
                          alignItems: "flex-start",
                          gap: "10px",
                          padding: "10px",
                          borderRadius: "10px",
                          background: layoutMode === opt.id ? (dm ? "rgba(108, 99, 255, 0.05)" : "rgba(108, 99, 255, 0.02)") : "transparent",
                          border: `1px solid ${layoutMode === opt.id ? accent : (dm ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)")}`,
                          cursor: "pointer",
                          transition: "all 0.15s ease"
                        }}
                      >
                        <input
                          type="radio"
                          name="layout_mode"
                          checked={layoutMode === opt.id}
                          onChange={() => setLayoutMode(opt.id)}
                          style={{ accentColor: accent, marginTop: "2px" }}
                        />
                        <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                          <span style={{ fontSize: "12px", fontWeight: 700 }}>{opt.title}</span>
                          <span style={{ fontSize: "10px", color: dm ? "#888" : "#666" }}>{opt.desc}</span>
                        </div>
                      </label>
                    ))}
                  </div>

                  {/* Execute Button */}
                  {isExporting ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px", padding: "10px 0" }}>
                      <div style={{ width: "100%", height: "6px", background: dm ? "#222" : "#e5e7eb", borderRadius: "10px", overflow: "hidden" }}>
                        <div
                          style={{
                            height: "100%",
                            width: `${(exportProgress.current / exportProgress.total) * 100}%`,
                            background: `linear-gradient(90deg, ${accent}, #06b6d4)`,
                            transition: "width 0.1s ease"
                          }}
                        />
                      </div>
                      <span style={{ fontSize: "11px", fontWeight: 700, textAlign: "center" }}>
                        Saving: {exportProgress.current} / {exportProgress.total} ({exportProgress.currentFile})
                      </span>
                    </div>
                  ) : (
                    <button
                      onClick={() => handlePhysicalExport()}
                      disabled={!outputHandle}
                      style={{
                        padding: "14px",
                        background: outputHandle ? `linear-gradient(135deg, ${accent}, #5b54d6)` : (dm ? "#222" : "#eee"),
                        color: outputHandle ? "#fff" : (dm ? "#555" : "#aaa"),
                        border: "none",
                        borderRadius: "12px",
                        cursor: outputHandle ? "pointer" : "not-allowed",
                        fontSize: "13px",
                        fontWeight: 700,
                        boxShadow: outputHandle ? "0 4px 14px rgba(108, 99, 255, 0.25)" : "none",
                        transition: "all 0.2s ease"
                      }}
                    >
                      📁 Execute Smart Folder Export
                    </button>
                  )}
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                  <span style={{ fontSize: "11px", color: dm ? "#a1a1aa" : "#71717a", lineHeight: "1.4" }}>
                    Export non-destructive star ratings and color labels directly into standard Adobe XMP sidecar metadata files. Ideal for Lightroom or Bridge workflows.
                  </span>

                  {isExporting ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px", padding: "10px 0" }}>
                      <span style={{ fontSize: "11px", fontWeight: 700, textAlign: "center", color: accent }}>
                        Generating XMP metadata...
                      </span>
                    </div>
                  ) : (
                    <button
                      onClick={handleExportXmp}
                      disabled={!outputHandle}
                      style={{
                        padding: "14px",
                        background: outputHandle ? `linear-gradient(135deg, ${accent}, #5b54d6)` : (dm ? "#222" : "#eee"),
                        color: outputHandle ? "#fff" : (dm ? "#555" : "#aaa"),
                        border: "none",
                        borderRadius: "12px",
                        cursor: outputHandle ? "pointer" : "not-allowed",
                        fontSize: "13px",
                        fontWeight: 700,
                        boxShadow: outputHandle ? "0 4px 14px rgba(108, 99, 255, 0.25)" : "none",
                        transition: "all 0.2s ease"
                      }}
                    >
                      📝 Save XMP Sidecars to Output Folder
                    </button>
                  )}
                </div>
              )}
            </div>

          </div>
        </div>
      )}

      {/* BOTTOM FILMSTRIP TIMELINE */}
      {groups.length > 0 && (
        <div
          className="glass-panel"
          style={{
            borderRadius: "20px",
            padding: "14px 16px",
            display: "flex",
            flexDirection: "column",
            gap: "10px",
            flexShrink: 0,
            boxShadow: dm ? "0 10px 40px rgba(0,0,0,0.3)" : "0 10px 30px rgba(0,0,0,0.03)"
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "11px", fontWeight: 800, color: dm ? "#a1a1aa" : "#71717a", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              Duplicate Clusters Timeline
            </span>
            <span style={{ fontSize: "11px", color: accent, fontWeight: 800 }}>
              Cluster {activeGroupIndex + 1} of {groups.length}
            </span>
          </div>

          <div
            style={{
              display: "flex",
              gap: "12px",
              overflowX: "auto",
              paddingBottom: "8px",
              scrollBehavior: "smooth"
            }}
          >
            {groups.map((grp, idx) => {
              const isCurrent = idx === activeGroupIndex;
              const rep = grp[0]; // Representative / key photo

              // Color-code strip border by the key photo's tier
              const catColorMap = { keeper: "#22c55e", alternate: "#3b82f6", blurry: "#eab308", rejected: "#ef4444" };
              const repCat = rep.category || (rep.isKeyPhoto ? "keeper" : "alternate");
              const tierColor = catColorMap[repCat] || accent;

              // Count each tier inside this group
              const gKeepers   = grp.filter(x => (x.category || "alternate") === "keeper").length;
              const gBlurry    = grp.filter(x => x.category === "blurry").length;
              const gRejected  = grp.filter(x => x.category === "rejected").length;

              return (
                <div
                  key={idx}
                  onClick={() => {
                    setActiveGroupIndex(idx);
                    setActiveAlternateIndex(0);
                  }}
                  style={{
                    flexShrink: 0,
                    width: "90px",
                    borderRadius: "10px",
                    border: `2px solid ${isCurrent ? tierColor : "transparent"}`,
                    overflow: "hidden",
                    cursor: "pointer",
                    position: "relative",
                    background: "#000",
                    transition: "all 0.15s ease",
                    boxShadow: isCurrent ? `0 4px 12px ${tierColor}44` : "none"
                  }}
                  onMouseEnter={(e) => {
                    if (!isCurrent) e.currentTarget.style.borderColor = `${tierColor}88`;
                  }}
                  onMouseLeave={(e) => {
                    if (!isCurrent) e.currentTarget.style.borderColor = "transparent";
                  }}
                >
                  <img
                    src={rep.previewUrl}
                    alt=""
                    style={{ width: "100%", height: "64px", objectFit: "cover", opacity: isCurrent ? 1.0 : 0.6, display: "block" }}
                  />

                  {/* Tier color dot top-left */}
                  <div style={{
                    position: "absolute", top: "4px", left: "4px",
                    width: "8px", height: "8px", borderRadius: "50%",
                    background: tierColor,
                    boxShadow: `0 0 5px ${tierColor}`
                  }} />

                  {/* Group Count Badge */}
                  <div style={{
                    position: "absolute", bottom: "4px", right: "4px",
                    background: "rgba(10,10,15,0.92)", color: "#fff",
                    fontSize: "9px", fontWeight: 800,
                    padding: "2px 5px", borderRadius: "5px",
                    border: "1px solid rgba(255,255,255,0.05)"
                  }}>
                    x{grp.length}
                  </div>

                  {/* Warn badges */}
                  {(gBlurry > 0 || gRejected > 0) && (
                    <div style={{
                      position: "absolute", bottom: "4px", left: "4px",
                      display: "flex", gap: "2px"
                    }}>
                      {gBlurry > 0 && <span style={{ fontSize: "8px", background: "#eab30888", color: "#fff", padding: "1px 3px", borderRadius: "3px", fontWeight: 800 }}>◐{gBlurry}</span>}
                      {gRejected > 0 && <span style={{ fontSize: "8px", background: "#ef444488", color: "#fff", padding: "1px 3px", borderRadius: "3px", fontWeight: 800 }}>✕{gRejected}</span>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* KEYBOARD SHORTCUTS INSTRUCTIONS */}
      {groups.length > 0 && showShortcutsHelp && (
        <div
          className="glass-panel"
          style={{
            borderRadius: "16px",
            padding: "14px 20px",
            display: "flex",
            flexDirection: "column",
            gap: "10px",
            flexShrink: 0,
            boxShadow: dm ? "0 10px 40px rgba(0,0,0,0.3)" : "0 10px 30px rgba(0,0,0,0.03)"
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "12px", fontWeight: 800, display: "flex", alignItems: "center", gap: "6px" }}>
              <span>⌨️</span> Keyboard Shortcuts Guide
            </span>
            <button
              onClick={() => setShowShortcutsHelp(false)}
              style={{
                background: "transparent",
                border: "none",
                color: dm ? "#a1a1aa" : "#71717a",
                cursor: "pointer",
                fontSize: "11px",
                fontWeight: 700
              }}
            >
              Hide Guide
            </button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "11px" }}>
              <kbd style={{ background: dm ? "#333" : "#e5e7eb", padding: "2px 6px", borderRadius: "4px", fontWeight: 700, fontFamily: "monospace" }}>←</kbd>
              <kbd style={{ background: dm ? "#333" : "#e5e7eb", padding: "2px 6px", borderRadius: "4px", fontWeight: 700, fontFamily: "monospace" }}>→</kbd>
              <span>Cycle Duplicate Groups</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "11px" }}>
              <kbd style={{ background: dm ? "#333" : "#e5e7eb", padding: "2px 6px", borderRadius: "4px", fontWeight: 700, fontFamily: "monospace" }}>↑</kbd>
              <kbd style={{ background: dm ? "#333" : "#e5e7eb", padding: "2px 6px", borderRadius: "4px", fontWeight: 700, fontFamily: "monospace" }}>↓</kbd>
              <span>Select Alternate inside Group</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "11px" }}>
              <kbd style={{ background: dm ? "#333" : "#e5e7eb", padding: "2px 6px", borderRadius: "4px", fontWeight: 700, fontFamily: "monospace" }}>Space</kbd>
              <span>Keeper (5★, Green)</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "11px" }}>
              <kbd style={{ background: dm ? "#333" : "#e5e7eb", padding: "2px 6px", borderRadius: "4px", fontWeight: 700, fontFamily: "monospace" }}>1</kbd>
              <span>-</span>
              <kbd style={{ background: dm ? "#333" : "#e5e7eb", padding: "2px 6px", borderRadius: "4px", fontWeight: 700, fontFamily: "monospace" }}>5</kbd>
              <span>Set Stars</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "11px" }}>
              <kbd style={{ background: dm ? "#333" : "#e5e7eb", padding: "2px 6px", borderRadius: "4px", fontWeight: 700, fontFamily: "monospace" }}>6</kbd>
              <span>-</span>
              <kbd style={{ background: dm ? "#333" : "#e5e7eb", padding: "2px 6px", borderRadius: "4px", fontWeight: 700, fontFamily: "monospace" }}>9</kbd>
              <span>Set Colors (G/B/Y/R)</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "11px" }}>
              <kbd style={{ background: dm ? "#333" : "#e5e7eb", padding: "2px 6px", borderRadius: "4px", fontWeight: 700, fontFamily: "monospace" }}>S</kbd>
              <span>Promote to Key Photo</span>
            </div>
          </div>
        </div>
      )}
      
      {groups.length > 0 && !showShortcutsHelp && (
        <button
          onClick={() => setShowShortcutsHelp(true)}
          style={{
            alignSelf: "flex-start",
            background: "transparent",
            border: "none",
            color: dm ? "#a1a1aa" : "#71717a",
            cursor: "pointer",
            fontSize: "12px",
            fontWeight: 700,
            display: "flex",
            alignItems: "center",
            gap: "4px",
            marginTop: "-10px"
          }}
        >
          <span>⌨️</span> Show Keyboard Shortcuts Guide
        </button>
      )}
    </div>
  );
}
