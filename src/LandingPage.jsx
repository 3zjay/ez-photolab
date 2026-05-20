import { useState, useRef, useEffect } from "react";

export function LandingPage({ dm, loadImage, setActiveTab }) {
  const [sliderPos, setSliderPos] = useState(50);
  const [isDraggingSlider, setIsDraggingSlider] = useState(false);
  const [activeNode, setActiveNode] = useState(null);
  const [isDropOver, setIsDropOver] = useState(false);

  const sliderRef = useRef(null);

  // Before/After slider movement handlers
  const handleSliderMove = (clientX) => {
    if (!sliderRef.current) return;
    const rect = sliderRef.current.getBoundingClientRect();
    const pos = ((clientX - rect.left) / rect.width) * 100;
    setSliderPos(Math.min(98, Math.max(2, pos)));
  };

  useEffect(() => {
    if (!isDraggingSlider) return;
    const handleMouseMove = (e) => handleSliderMove(e.clientX);
    const handleTouchMove = (e) => handleSliderMove(e.touches[0].clientX);
    const handleMouseUp = () => setIsDraggingSlider(false);

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    window.addEventListener("touchmove", handleTouchMove);
    window.addEventListener("touchend", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleMouseUp);
    };
  }, [isDraggingSlider]);

  // Tech stack nodes data
  const pipelineNodes = [
    {
      id: "ingestion",
      title: "File Ingestion",
      tech: "HTML5 File System API & Drag/Drop",
      description: "Direct, high-speed access to directory hierarchies. Handles local folders containing raw digital negatives (.NEF, .CR2, .ARW, .DNG) without copying or uploading files, preserving storage speed.",
      x: 12, y: 30,
      icon: "📥"
    },
    {
      id: "fast_scan",
      title: "Fast JPEG Scanner",
      tech: "Pure JavaScript Metadata Parser",
      description: "Scans raw binary buffers to extract embedded full-resolution preview JPEGs in 10-20ms. Completely avoids starting the heavy WASM decoder unless actual sensor edits are initiated.",
      x: 37, y: 30,
      icon: "⚡"
    },
    {
      id: "wasm_decoder",
      title: "WASM RAW Decoder",
      tech: "WebAssembly libraw-wasm Web Worker",
      description: "A multithreaded C++ compiler target running inside a worker thread using SharedArrayBuffer. Decodes raw sensor data to a linear RGB float32 grid for professional demosaicing.",
      x: 62, y: 30,
      icon: "⚙️"
    },
    {
      id: "cull_engine",
      title: "EZ-Cull AI Engine",
      tech: "Perceptual dHash & Laplacian Variance",
      description: "Performs real-time duplicate grouping via perceptual hashing (64-bit grayscale) and instant blur evaluation using Laplacian focus calculations. Finds the sharpest picture in a burst.",
      x: 87, y: 30,
      icon: "🔍"
    },
    {
      id: "mediapipe",
      title: "MediaPipe Vision",
      tech: "WebAssembly Face Landmarker",
      description: "Extracts high-fidelity 3D facial geometry to run local face touch-ups, skin smoothing, red-eye removal, and blink detection. Everything runs offline in your web browser.",
      x: 37, y: 70,
      icon: "✨"
    },
    {
      id: "canvas_render",
      title: "WebGL Canvas Engine",
      tech: "2D Canvas & WebGL Shaders",
      description: "Applies high-speed color grading presets, text overlays, crops, noise-reduction, and sharpness filters directly on the GPU, outputting pristine results in real-time.",
      x: 62, y: 70,
      icon: "🎨"
    },
    {
      id: "export",
      title: "Direct Exporter",
      tech: "W3C FileSaver / XMP Compilation",
      description: "Generates lossless non-destructive XMP metadata files alongside graded JPEGs/PNGs. All processed images save directly to your drive instantly with zero cloud upload overhead.",
      x: 87, y: 70,
      icon: "💾"
    }
  ];

  // Drag and Drop workspace transitions
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDropOver(true);
  };

  const handleDragLeave = () => {
    setIsDropOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDropOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      loadImage(e.dataTransfer.files[0]);
      setActiveTab("edit");
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      style={{
        minHeight: "calc(100vh - 52px)",
        padding: "40px 20px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        position: "relative",
        overflowX: "hidden",
        transition: "background 0.3s ease"
      }}
      className={isDropOver ? "bg-opacity-20 bg-indigo-500" : ""}
    >
      {/* Page Ingestion Drop Overlay */}
      {isDropOver && (
        <div style={{
          position: "fixed",
          inset: 0,
          background: "rgba(108, 99, 255, 0.15)",
          backdropFilter: "blur(8px)",
          zIndex: 100,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          pointerEvents: "none"
        }}>
          <div style={{
            padding: "30px 50px",
            background: dm ? "rgba(20, 20, 30, 0.9)" : "rgba(255, 255, 255, 0.9)",
            border: "2px dashed #6c63ff",
            borderRadius: "20px",
            boxShadow: "0 10px 40px rgba(0,0,0,0.3)",
            textAlign: "center",
            transform: "scale(1.05)",
            transition: "transform 0.2s"
          }}>
            <div style={{ fontSize: "50px", marginBottom: "15px", animation: "pulse 1.5s infinite" }}>📥</div>
            <div style={{ fontSize: "20px", fontWeight: 700, color: dm ? "#f0f0f0" : "#1a1a2e" }}>Drop files to open in Studio</div>
          </div>
        </div>
      )}

      {/* Hero Header */}
      <div style={{ maxWidth: "900px", textAlign: "center", marginBottom: "50px", animation: "slideup 0.6s ease" }}>
        <div style={{ 
          display: "inline-flex", 
          alignItems: "center", 
          gap: "8px", 
          padding: "6px 16px", 
          background: dm ? "rgba(255, 255, 255, 0.05)" : "rgba(108, 99, 255, 0.08)",
          borderRadius: "20px",
          border: `1px solid ${dm ? "rgba(255, 255, 255, 0.08)" : "rgba(108, 99, 255, 0.15)"}`,
          fontSize: "12px",
          fontWeight: 700,
          color: "#6c63ff",
          textTransform: "uppercase",
          letterSpacing: "1px",
          marginBottom: "16px"
        }}>
          ✨ Ultra-Fast Offline Web Processor
        </div>
        <h1 style={{
          fontSize: "clamp(32px, 5vw, 56px)",
          fontWeight: 800,
          lineHeight: 1.1,
          letterSpacing: "-1.5px",
          color: dm ? "#ffffff" : "#111827",
          marginBottom: "20px"
        }}>
          Professional RAW Processing <br />
          <span style={{
            background: "linear-gradient(135deg, #06b6d4 0%, #6c63ff 50%, #ec4899 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent"
          }}>
            Entirely inside your Browser.
          </span>
        </h1>
        <p style={{
          fontSize: "clamp(15px, 2vw, 18px)",
          color: dm ? "#9ca3af" : "#4b5563",
          lineHeight: 1.6,
          maxWidth: "700px",
          margin: "0 auto 30px auto"
        }}>
          PHOTOlab leverages WebAssembly, MediaPipe AI, and local GPU acceleration to provide a zero-install photo editing studio. Your photos never touch the cloud. Instant previews, fast batch conversion, and intelligent image culling.
        </p>
        <div style={{ display: "flex", gap: "14px", justifyContent: "center", flexWrap: "wrap" }}>
          <button
            onClick={() => setActiveTab("edit")}
            style={{
              padding: "12px 28px",
              background: "linear-gradient(135deg, #6c63ff, #8b5cf6)",
              color: "#ffffff",
              border: "none",
              borderRadius: "10px",
              fontSize: "14px",
              fontWeight: 700,
              cursor: "pointer",
              boxShadow: "0 4px 15px rgba(108, 99, 255, 0.35)",
              transition: "transform 0.2s, box-shadow 0.2s"
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-2px)";
              e.currentTarget.style.boxShadow = "0 6px 20px rgba(108, 99, 255, 0.45)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "none";
              e.currentTarget.style.boxShadow = "0 4px 15px rgba(108, 99, 255, 0.35)";
            }}
          >
            🚀 Open Studio Workspace
          </button>
          <div
            style={{
              padding: "12px 28px",
              background: dm ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)",
              border: `1.5px dashed ${dm ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.15)"}`,
              borderRadius: "10px",
              fontSize: "14px",
              fontWeight: 600,
              color: dm ? "#d1d5db" : "#374151",
              cursor: "pointer"
            }}
            onClick={() => {
              const fileInput = document.createElement("input");
              fileInput.type = "file";
              fileInput.accept = "image/*";
              fileInput.onchange = (e) => {
                if (e.target.files && e.target.files[0]) {
                  loadImage(e.target.files[0]);
                  setActiveTab("edit");
                }
              };
              fileInput.click();
            }}
          >
            📸 Drop Photo here or Click to load
          </div>
        </div>
      </div>

      {/* Before / After Slider Section */}
      <div style={{ maxWidth: "800px", width: "100%", marginBottom: "70px", animation: "slideup 0.8s ease" }}>
        <h2 style={{
          fontSize: "22px",
          fontWeight: 700,
          color: dm ? "#ffffff" : "#111827",
          marginBottom: "16px",
          textAlign: "center"
        }}>
          High-Fidelity Studio Restoration
        </h2>
        <div 
          ref={sliderRef}
          style={{
            position: "relative",
            width: "100%",
            aspectRatio: "16/10",
            borderRadius: "16px",
            overflow: "hidden",
            boxShadow: "0 10px 40px rgba(0,0,0,0.2)",
            cursor: isDraggingSlider ? "grabbing" : "ew-resize",
            userSelect: "none"
          }}
          onMouseDown={(e) => {
            e.preventDefault();
            setIsDraggingSlider(true);
            handleSliderMove(e.clientX);
          }}
          onTouchStart={(e) => {
            e.preventDefault();
            setIsDraggingSlider(true);
            handleSliderMove(e.touches[0].clientX);
          }}
        >
          {/* AFTER Image (Color Corrected & Sharp) */}
          <div style={{
            position: "absolute",
            inset: 0,
            backgroundImage: "url('/portrait_mock.png')",
            backgroundSize: "cover",
            backgroundPosition: "center",
            filter: "contrast(1.08) brightness(1.02) saturate(1.04)",
          }} />

          {/* BEFORE Image (Dull / Raw Simulation) */}
          <div style={{
            position: "absolute",
            inset: 0,
            backgroundImage: "url('/portrait_mock.png')",
            backgroundSize: "cover",
            backgroundPosition: "center",
            filter: "contrast(0.72) saturate(0.65) brightness(0.9) sepia(0.08)",
            clipPath: `inset(0 0 0 ${sliderPos}%)`
          }} />

          {/* Slider Line Overlay */}
          <div style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            left: `${sliderPos}%`,
            width: "2px",
            background: "#ffffff",
            boxShadow: "0 0 8px rgba(0,0,0,0.5)",
            zIndex: 10,
            transform: "translateX(-50%)",
            pointerEvents: "none"
          }}>
            <div style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              width: "36px",
              height: "36px",
              borderRadius: "50%",
              background: "#ffffff",
              boxShadow: "0 2px 10px rgba(0,0,0,0.3)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "14px",
              color: "#6c63ff",
              fontWeight: 700
            }}>
              ⇄
            </div>
          </div>

          {/* Labels */}
          <div style={{
            position: "absolute",
            bottom: "16px",
            left: "16px",
            padding: "5px 12px",
            background: "rgba(108, 99, 255, 0.85)",
            borderRadius: "20px",
            fontSize: "11px",
            fontWeight: 700,
            color: "#ffffff",
            pointerEvents: "none"
          }}>
            STUDIO GRADE (AFTER)
          </div>
          <div style={{
            position: "absolute",
            bottom: "16px",
            right: "16px",
            padding: "5px 12px",
            background: "rgba(0,0,0,0.6)",
            borderRadius: "20px",
            fontSize: "11px",
            fontWeight: 700,
            color: "#ffffff",
            pointerEvents: "none"
          }}>
            RAW ORIGINAL (BEFORE)
          </div>
        </div>
      </div>

      {/* Interactive System Flow Diagram Section */}
      <div style={{ maxWidth: "1000px", width: "100%", marginBottom: "70px", animation: "slideup 0.9s ease" }}>
        <div style={{ textAlign: "center", marginBottom: "30px" }}>
          <h2 style={{
            fontSize: "24px",
            fontWeight: 700,
            color: dm ? "#ffffff" : "#111827",
            marginBottom: "8px"
          }}>
            Client-Side Technology Pipeline
          </h2>
          <p style={{ fontSize: "14px", color: dm ? "#9ca3af" : "#4b5563" }}>
            Click on any processing stage to inspect the browser-native APIs and details.
          </p>
        </div>

        <div style={{ position: "relative", width: "100%" }}>
          <div className="glass-panel" style={{
            width: "100%",
            borderRadius: "20px",
            padding: "24px",
            overflowX: "auto",
            display: "flex",
            flexDirection: "column",
            alignItems: "center"
          }}>
            {/* SVG Diagram Canvas */}
            <svg viewBox="0 0 1000 240" style={{ width: "100%", minWidth: "800px", height: "auto" }}>
              {/* Grid Connection Lines */}
              <defs>
                <marker id="arrow" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                  <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill={dm ? "#4b5563" : "#cbd5e1"} />
                </marker>
                <marker id="arrow-glow" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                  <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#6c63ff" />
                </marker>
              </defs>

              {/* Upper row connections */}
              <line x1="180" y1="80" x2="310" y2="80" stroke={dm ? "#374151" : "#e5e7eb"} strokeWidth="3" markerEnd="url(#arrow)" />
              <line x1="430" y1="80" x2="560" y2="80" stroke={dm ? "#374151" : "#e5e7eb"} strokeWidth="3" markerEnd="url(#arrow)" />
              <line x1="680" y1="80" x2="810" y2="80" stroke={dm ? "#374151" : "#e5e7eb"} strokeWidth="3" markerEnd="url(#arrow)" />

              {/* Lower row connections */}
              <line x1="430" y1="180" x2="560" y2="180" stroke={dm ? "#374151" : "#e5e7eb"} strokeWidth="3" markerEnd="url(#arrow)" />
              <line x1="680" y1="180" x2="810" y2="180" stroke={dm ? "#374151" : "#e5e7eb"} strokeWidth="3" markerEnd="url(#arrow)" />

              {/* Inter-row vertical connectors */}
              <path d="M 870 110 L 870 150" stroke={dm ? "#374151" : "#e5e7eb"} strokeWidth="3" markerEnd="url(#arrow)" />
              <path d="M 370 110 L 370 150" stroke={dm ? "#374151" : "#e5e7eb"} strokeWidth="3" markerEnd="url(#arrow)" />

              {/* Active Connection Glowing paths */}
              {activeNode && (
                <>
                  <circle cx="10" cy="10" r="8" fill="#6c63ff" style={{ opacity: 0.1 }} />
                </>
              )}

              {/* Render Nodes as SVG elements */}
              {pipelineNodes.map((n) => {
                const isActive = activeNode?.id === n.id;
                // Scale calculations
                const nx = (n.x * 10) - 60;
                const ny = n.y === 30 ? 40 : 140;
                return (
                  <g key={n.id} onClick={() => setActiveNode(n)} style={{ cursor: "pointer" }}>
                    {/* Shadow Outer Glow */}
                    <rect
                      x={nx - 4}
                      y={ny - 4}
                      width={128}
                      height={68}
                      rx={12}
                      fill={isActive ? "rgba(108, 99, 255, 0.1)" : "transparent"}
                      stroke={isActive ? "#6c63ff" : "transparent"}
                      strokeWidth="2"
                      style={{ transition: "all 0.25s" }}
                    />
                    {/* Node Box */}
                    <rect
                      x={nx}
                      y={ny}
                      width={120}
                      height={60}
                      rx={10}
                      fill={dm ? (isActive ? "#1f1f35" : "#18181b") : (isActive ? "#f3f4ff" : "#ffffff")}
                      stroke={isActive ? "#6c63ff" : (dm ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)")}
                      strokeWidth="1.5"
                      style={{ transition: "all 0.25s" }}
                    />
                    {/* Node Icon */}
                    <text x={nx + 12} y={ny + 28} fontSize="14">{n.icon}</text>
                    {/* Node Title */}
                    <text
                      x={nx + 12}
                      y={ny + 44}
                      fontSize="11"
                      fontWeight="700"
                      fill={dm ? "#ffffff" : "#1f2937"}
                    >
                      {n.title}
                    </text>
                    {/* Node Tech */}
                    <text
                      x={nx + 12}
                      y={ny + 54}
                      fontSize="7"
                      fontWeight="600"
                      fill={dm ? "#6b7280" : "#9ca3af"}
                    >
                      {n.tech.length > 25 ? n.tech.substring(0, 23) + "..." : n.tech}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Node detail display drawer/overlay */}
          <div style={{ height: "130px", marginTop: "16px" }}>
            {activeNode ? (
              <div 
                className="glass-panel" 
                style={{
                  borderRadius: "16px",
                  padding: "16px 20px",
                  border: "1px solid rgba(108, 99, 255, 0.2)",
                  background: dm ? "rgba(20, 20, 35, 0.6)" : "rgba(255, 255, 255, 0.9)",
                  boxShadow: "0 6px 24px rgba(108, 99, 255, 0.08)",
                  animation: "fadein 0.2s ease"
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ fontSize: "18px" }}>{activeNode.icon}</span>
                    <h3 style={{ fontSize: "15px", fontWeight: 700, color: dm ? "#ffffff" : "#111827" }}>
                      {activeNode.title}
                    </h3>
                    <span style={{
                      padding: "2px 8px",
                      background: dm ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.04)",
                      borderRadius: "6px",
                      fontSize: "9px",
                      fontWeight: 700,
                      color: "#6c63ff"
                    }}>
                      {activeNode.tech}
                    </span>
                  </div>
                  <button 
                    onClick={() => setActiveNode(null)}
                    style={{
                      border: "none",
                      background: "transparent",
                      fontSize: "14px",
                      cursor: "pointer",
                      color: dm ? "#9ca3af" : "#4b5563"
                    }}
                  >
                    ✕
                  </button>
                </div>
                <p style={{ fontSize: "12px", color: dm ? "#d1d5db" : "#374151", lineHeight: 1.5 }}>
                  {activeNode.description}
                </p>
              </div>
            ) : (
              <div style={{
                height: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                border: `1.5px dashed ${dm ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"}`,
                borderRadius: "16px",
                color: dm ? "#6b7280" : "#9ca3af",
                fontSize: "12px"
              }}>
                ℹ️ Select any node in the interactive architecture diagram above to inspect technical specifications.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Feature / Stepper Instructions Deck */}
      <div style={{ maxWidth: "900px", width: "100%" }}>
        <h2 style={{
          fontSize: "22px",
          fontWeight: 700,
          color: dm ? "#ffffff" : "#111827",
          marginBottom: "30px",
          textAlign: "center"
        }}>
          How it Works
        </h2>
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
          gap: "20px"
        }}>
          {/* Card 1 */}
          <div className="glass-panel animate-hover-card" style={{
            padding: "24px",
            borderRadius: "16px",
            transition: "all 0.25s ease",
            display: "flex",
            flexDirection: "column",
            gap: "12px"
          }}>
            <div style={{
              width: "40px",
              height: "40px",
              borderRadius: "10px",
              background: "rgba(108, 99, 255, 0.15)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "18px",
              color: "#6c63ff"
            }}>
              1️⃣
            </div>
            <h3 style={{ fontSize: "16px", fontWeight: 700, color: dm ? "#ffffff" : "#111827" }}>
              Import Images
            </h3>
            <p style={{ fontSize: "12px", color: dm ? "#9ca3af" : "#4b5563", lineHeight: 1.5 }}>
              Drag files directly onto the app workspace. We read the binary structures instantly, decoding in seconds completely locally.
            </p>
          </div>

          {/* Card 2 */}
          <div className="glass-panel animate-hover-card" style={{
            padding: "24px",
            borderRadius: "16px",
            transition: "all 0.25s ease",
            display: "flex",
            flexDirection: "column",
            gap: "12px"
          }}>
            <div style={{
              width: "40px",
              height: "40px",
              borderRadius: "10px",
              background: "rgba(6, 182, 212, 0.15)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "18px",
              color: "#06b6d4"
            }}>
              2️⃣
            </div>
            <h3 style={{ fontSize: "16px", fontWeight: 700, color: dm ? "#ffffff" : "#111827" }}>
              Automated Culling
            </h3>
            <p style={{ fontSize: "12px", color: dm ? "#9ca3af" : "#4b5563", lineHeight: 1.5 }}>
              Use the Cull AI dashboard to automatically rate sharpness, find similar shots, isolate blinking/emotion scores, and extract the key frames.
            </p>
          </div>

          {/* Card 3 */}
          <div className="glass-panel animate-hover-card" style={{
            padding: "24px",
            borderRadius: "16px",
            transition: "all 0.25s ease",
            display: "flex",
            flexDirection: "column",
            gap: "12px"
          }}>
            <div style={{
              width: "40px",
              height: "40px",
              borderRadius: "10px",
              background: "rgba(236, 72, 153, 0.15)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "18px",
              color: "#ec4899"
            }}>
              3️⃣
            </div>
            <h3 style={{ fontSize: "16px", fontWeight: 700, color: dm ? "#ffffff" : "#111827" }}>
              Develop & Export
            </h3>
            <p style={{ fontSize: "12px", color: dm ? "#9ca3af" : "#4b5563", lineHeight: 1.5 }}>
              Fine-tune exposure, apply studio LUT presets, restore faces, overlay watermark graphics, and download lossless JPEGs with non-destructive XMP.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
