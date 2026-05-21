import { useState, useRef, useEffect } from "react";

export function ApertureLogo({ size = 26, className = "" }) {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg" 
      className={`aperture-logo ${className}`} 
      style={{ display: 'inline-block', verticalAlign: 'middle' }}
    >
      <defs>
        <linearGradient id="landingLogoGlow" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#06b6d4" />
          <stop offset="50%" stopColor="#6c63ff" />
          <stop offset="100%" stopColor="#ec4899" />
        </linearGradient>
      </defs>
      <circle cx="12" cy="12" r="10" stroke="url(#landingLogoGlow)" strokeWidth="2.2" strokeLinecap="round" style={{ opacity: 0.95 }} />
      <g stroke="url(#landingLogoGlow)" strokeWidth="1.6" strokeLinecap="round" opacity="0.95">
        <path d="m14.31 8 5.74 9.94" />
        <path d="M9.69 8h11.48" />
        <path d="m7.38 12 5.74-9.94" />
        <path d="M9.69 16 3.95 6.06" />
        <path d="M14.31 16H2.83" />
        <path d="m16.62 12-5.74 9.94" />
      </g>
    </svg>
  );
}

// Custom SVG icons for technology pipeline nodes
function getPipelineNodeIcon(id, color) {
  const size = 18;
  const strokeWidth = 2;
  switch (id) {
    case "ingestion":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
      );
    case "fast_scan":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
        </svg>
      );
    case "wasm_decoder":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
          <rect x="4" y="4" width="16" height="16" rx="2" />
          <line x1="9" y1="9" x2="9" y2="15" />
          <line x1="9" y1="15" x2="15" y2="15" />
          <line x1="15" y1="15" x2="15" y2="9" />
          <line x1="15" y1="9" x2="9" y2="9" />
          <line x1="9" y1="1" x2="9" y2="4" />
          <line x1="15" y1="1" x2="15" y2="4" />
          <line x1="9" y1="20" x2="9" y2="23" />
          <line x1="15" y1="20" x2="15" y2="23" />
          <line x1="20" y1="9" x2="23" y2="9" />
          <line x1="20" y1="15" x2="23" y2="15" />
          <line x1="1" y1="9" x2="4" y2="9" />
          <line x1="1" y1="15" x2="4" y2="15" />
        </svg>
      );
    case "cull_engine":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
          <line x1="11" y1="7" x2="11" y2="15" />
          <line x1="7" y1="11" x2="15" y2="11" />
        </svg>
      );
    case "mediapipe":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          <circle cx="12" cy="10" r="1" />
        </svg>
      );
    case "canvas_render":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
          <path d="M12 6v12" />
          <path d="M12 12H6" />
        </svg>
      );
    case "export":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
          <polyline points="17 21 17 13 7 13 7 21" />
          <polyline points="7 3 7 8 15 8" />
        </svg>
      );
    default:
      return null;
  }
}

export function SparklesIcon({ size = 16, className = "" }) {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg" 
      className={`sparkles-shimmer ${className}`} 
      style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: "6px" }}
    >
      <defs>
        <linearGradient id="sparkleGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#06b6d4" />
          <stop offset="50%" stopColor="#6c63ff" />
          <stop offset="100%" stopColor="#ec4899" />
        </linearGradient>
      </defs>
      <path d="M10 3C10 7.5 7.5 10 3 10C7.5 10 10 12.5 10 17C10 12.5 12.5 10 17 10C12.5 10 10 7.5 10 3Z" fill="url(#sparkleGradient)" />
      <path d="M18 12C18 14.5 16.5 16 14 16C16.5 16 18 17.5 18 20C18 17.5 19.5 16 22 16C19.5 16 18 14.5 18 12Z" fill="url(#sparkleGradient)" />
    </svg>
  );
}

export function RocketIcon({ size = 16, className = "" }) {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg" 
      className={`rocket-icon ${className}`}
      style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: "8px", transition: 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)' }}
    >
      <defs>
        <linearGradient id="rocketGlow" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#8b5cf6" />
          <stop offset="50%" stopColor="#6c63ff" />
          <stop offset="100%" stopColor="#06b6d4" />
        </linearGradient>
        <linearGradient id="rocketFlame" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#ec4899" />
          <stop offset="100%" stopColor="#f59e0b" />
        </linearGradient>
      </defs>
      <path 
        d="M4.5 19.5C5.5 16.5 7.5 14.5 9 14M4.5 19.5C6.5 20.5 8.5 20 10 18.5M4.5 19.5L2 22L4.5 19.5Z" 
        stroke="url(#rocketFlame)" 
        strokeWidth="2" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
      />
      <path 
        d="M12 12L19 5C20.5 3.5 22.5 3.5 22.5 3.5S22.5 5.5 21 7L14 14L12 12Z" 
        fill="url(#rocketGlow)" 
        stroke="url(#rocketGlow)" 
        strokeWidth="1.5" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
      />
      <path 
        d="M9 14.5L6.5 18C5.5 19 5.5 20.5 5.5 20.5S7 20.5 8 19.5L11.5 17" 
        stroke="url(#rocketGlow)" 
        strokeWidth="2" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
      />
      <path 
        d="M14.5 9L18 6.5C19 5.5 20.5 5.5 20.5 5.5S20.5 7 19.5 8L17 11.5" 
        stroke="url(#rocketGlow)" 
        strokeWidth="2" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
      />
      <circle cx="16.5" cy="7.5" r="1.5" fill="#ffffff" />
    </svg>
  );
}

export function CameraIcon({ size = 16, className = "" }) {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg" 
      className={`camera-icon ${className}`}
      style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: "8px", transition: 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)' }}
    >
      <defs>
        <linearGradient id="cameraGlow" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#06b6d4" />
          <stop offset="50%" stopColor="#6c63ff" />
          <stop offset="100%" stopColor="#ec4899" />
        </linearGradient>
      </defs>
      <path 
        d="M23 19C23 20.1046 22.1046 21 21 21H3C1.89543 21 1 20.1046 1 19V8C1 6.89543 1.89543 6 3 6H7L8.5 3.5C8.8 3 9.5 3 10 3H14C14.5 3 15.2 3 15.5 3.5L17 6H21C22.1046 6 23 6.89543 23 8V19Z" 
        stroke="currentColor" 
        strokeWidth="2" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
      />
      <path d="M7 6H10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="12" cy="13.5" r="4.5" stroke="url(#cameraGlow)" strokeWidth="2" />
      <path d="M10.5 12C11 11.5 12 11.5 12.5 12" stroke="url(#cameraGlow)" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="19" cy="9" r="1" fill="#ec4899" />
    </svg>
  );
}

export function LandingPage({ dm, loadImage, setActiveTab, handleInstallClick, deferredPrompt, isIOS, isInstalled, onSelectPlan }) {
  const [sliderPos, setSliderPos] = useState(50);
  const [isDraggingSlider, setIsDraggingSlider] = useState(false);
  const [activeNode, setActiveNode] = useState(null);
  const [isDropOver, setIsDropOver] = useState(false);
  const [pricingPeriod, setPricingPeriod] = useState("monthly");

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
      iconId: "ingestion"
    },
    {
      id: "fast_scan",
      title: "Fast JPEG Scanner",
      tech: "Pure JavaScript Metadata Parser",
      description: "Scans raw binary buffers to extract embedded full-resolution preview JPEGs in 10-20ms. Completely avoids starting the heavy WASM decoder unless actual sensor edits are initiated.",
      x: 37, y: 30,
      iconId: "fast_scan"
    },
    {
      id: "wasm_decoder",
      title: "WASM RAW Decoder",
      tech: "WebAssembly libraw-wasm Web Worker",
      description: "A multithreaded C++ compiler target running inside a worker thread using SharedArrayBuffer. Decodes raw sensor data to a linear RGB float32 grid for professional demosaicing.",
      x: 62, y: 30,
      iconId: "wasm_decoder"
    },
    {
      id: "cull_engine",
      title: "EZ-Cull AI Engine",
      tech: "Perceptual dHash & Laplacian Variance",
      description: "Performs real-time duplicate grouping via perceptual hashing (64-bit grayscale) and instant blur evaluation using Laplacian focus calculations. Finds the sharpest picture in a burst.",
      x: 87, y: 30,
      iconId: "cull_engine"
    },
    {
      id: "mediapipe",
      title: "MediaPipe Vision",
      tech: "WebAssembly Face Landmarker",
      description: "Extracts high-fidelity 3D facial geometry to run local face touch-ups, skin smoothing, red-eye removal, and blink detection. Everything runs offline in your web browser.",
      x: 37, y: 70,
      iconId: "mediapipe"
    },
    {
      id: "canvas_render",
      title: "WebGL Canvas Engine",
      tech: "2D Canvas & WebGL Shaders",
      description: "Applies high-speed color grading presets, text overlays, crops, noise-reduction, and sharpness filters directly on the GPU, outputting pristine results in real-time.",
      x: 62, y: 70,
      iconId: "canvas_render"
    },
    {
      id: "export",
      title: "Direct Exporter",
      tech: "W3C FileSaver / XMP Compilation",
      description: "Generates lossless non-destructive XMP metadata files alongside graded JPEGs/PNGs. All processed images save directly to your drive instantly with zero cloud upload overhead.",
      x: 87, y: 70,
      iconId: "export"
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
        transition: "background 0.3s ease",
        fontFamily: "'Plus Jakarta Sans', sans-serif"
      }}
      className={isDropOver ? "bg-opacity-20 bg-indigo-500" : ""}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;800;900&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        
        .floating-logo {
          animation: logo-float 6s ease-in-out infinite;
        }
        
        @keyframes logo-float {
          0% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-6px) rotate(3deg); }
          100% { transform: translateY(0px) rotate(0deg); }
        }
        
        .glow-hover-card {
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
        
        .glow-hover-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 12px 30px rgba(108, 99, 255, 0.15) !important;
          border-color: rgba(108, 99, 255, 0.35) !important;
        }

        .svg-grid-bg {
          background-size: 24px 24px;
          background-image: radial-gradient(circle, rgba(108, 99, 255, 0.08) 1px, transparent 1px);
        }

        .tech-node-active {
          filter: drop-shadow(0 0 8px rgba(108, 99, 255, 0.3));
        }
        
        .sparkles-shimmer {
          animation: sparkles-shimmer 3s ease-in-out infinite;
        }
        
        @keyframes sparkles-shimmer {
          0%, 100% {
            transform: scale(1) rotate(0deg);
            filter: drop-shadow(0 0 2px rgba(6, 182, 212, 0.4));
          }
          50% {
            transform: scale(1.15) rotate(15deg);
            filter: drop-shadow(0 0 6px rgba(108, 99, 255, 0.8));
          }
        }

        .active-workspace-btn:hover .rocket-icon {
          transform: translateY(-2px) translateX(2px) scale(1.1);
        }

        .active-upload-box:hover .camera-icon {
          transform: scale(1.15) rotate(8deg);
        }
      `}</style>

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
        
        {/* Brand Showcase matching the Header Menus (Aperture + Custom Gradient Typo) */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "10px", marginBottom: "30px" }}>
          <div style={{ position: "relative", display: "inline-flex" }}>
            <div style={{ 
              position: "absolute", 
              top: "50%", 
              left: "50%", 
              transform: "translate(-50%, -50%)", 
              width: "110px", 
              height: "110px", 
              background: "radial-gradient(circle, rgba(6,182,212,0.15) 0%, rgba(108,99,255,0.15) 50%, transparent 100%)", 
              filter: "blur(25px)",
              zIndex: 0
            }} />
            <ApertureLogo size={80} className="floating-logo" />
          </div>
          <div style={{ fontSize: "38px", fontWeight: 900, color: dm ? '#ffffff' : '#0f172a', letterSpacing: "-1.5px", display: "flex", alignItems: "center", gap: "4px", fontFamily: "'Outfit', sans-serif" }}>
            <span>PHOTO</span>
            <span style={{ fontStyle: "italic", background: "linear-gradient(135deg, #06b6d4, #6c63ff, #ec4899)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", fontWeight: 900, paddingRight: "6px" }}>LAB</span>
          </div>
        </div>

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
          <SparklesIcon size={16} /> Ultra-Fast Offline Web Processor
        </div>
        <h1 style={{
          fontSize: "clamp(32px, 5vw, 56px)",
          fontWeight: 900,
          lineHeight: 1.1,
          letterSpacing: "-2px",
          color: dm ? "#ffffff" : "#111827",
          marginBottom: "20px",
          fontFamily: "'Outfit', sans-serif"
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
          margin: "0 auto 35px auto"
        }}>
          PHOTO LAB leverages WebAssembly, MediaPipe AI, and local GPU acceleration to provide a zero-install photo editing studio. Your photos never touch the cloud. Instant previews, fast batch conversion, and intelligent image culling.
        </p>
        <div style={{ display: "flex", gap: "14px", justifyContent: "center", flexWrap: "wrap" }}>
          <button
            onClick={() => setActiveTab("edit")}
            className="active-workspace-btn"
            style={{
              padding: "13px 30px",
              background: "linear-gradient(135deg, #6c63ff, #8b5cf6)",
              color: "#ffffff",
              border: "none",
              borderRadius: "12px",
              fontSize: "14px",
              fontWeight: 700,
              cursor: "pointer",
              boxShadow: "0 4px 18px rgba(108, 99, 255, 0.4)",
              transition: "transform 0.2s, box-shadow 0.2s",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center"
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-2px)";
              e.currentTarget.style.boxShadow = "0 6px 22px rgba(108, 99, 255, 0.5)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "none";
              e.currentTarget.style.boxShadow = "0 4px 18px rgba(108, 99, 255, 0.4)";
            }}
          >
            <RocketIcon size={18} /> Open Studio Workspace
          </button>
          <div
            className="active-upload-box"
            style={{
              padding: "13px 30px",
              background: dm ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)",
              border: `1.5px dashed ${dm ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.15)"}`,
              borderRadius: "12px",
              fontSize: "14px",
              fontWeight: 600,
              color: dm ? "#d1d5db" : "#374151",
              cursor: "pointer",
              transition: "all 0.2s",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center"
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "#6c63ff";
              e.currentTarget.style.background = dm ? "rgba(108,99,255,0.05)" : "rgba(108,99,255,0.03)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = dm ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.15)";
              e.currentTarget.style.background = dm ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)";
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
            <CameraIcon size={18} /> Drop Photo here or Click to load
          </div>
        </div>
      </div>

      {/* Before / After Slider Section */}
      <div style={{ maxWidth: "800px", width: "100%", marginBottom: "70px", animation: "slideup 0.8s ease" }}>
        <h2 style={{
          fontSize: "24px",
          fontWeight: 800,
          color: dm ? "#ffffff" : "#111827",
          marginBottom: "20px",
          textAlign: "center",
          fontFamily: "'Outfit', sans-serif"
        }}>
          High-Fidelity Studio Restoration
        </h2>
        <div 
          ref={sliderRef}
          style={{
            position: "relative",
            width: "100%",
            aspectRatio: "16/10",
            borderRadius: "18px",
            overflow: "hidden",
            boxShadow: "0 15px 45px rgba(0,0,0,0.25)",
            cursor: isDraggingSlider ? "grabbing" : "ew-resize",
            userSelect: "none",
            border: `1px solid ${dm ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"}`
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
            padding: "6px 14px",
            background: "rgba(108, 99, 255, 0.9)",
            backdropFilter: "blur(4px)",
            borderRadius: "20px",
            fontSize: "11px",
            fontWeight: 700,
            color: "#ffffff",
            pointerEvents: "none",
            letterSpacing: "0.5px"
          }}>
            STUDIO GRADE (AFTER)
          </div>
          <div style={{
            position: "absolute",
            bottom: "16px",
            right: "16px",
            padding: "6px 14px",
            background: "rgba(0,0,0,0.65)",
            backdropFilter: "blur(4px)",
            borderRadius: "20px",
            fontSize: "11px",
            fontWeight: 700,
            color: "#ffffff",
            pointerEvents: "none",
            letterSpacing: "0.5px"
          }}>
            RAW ORIGINAL (BEFORE)
          </div>
        </div>
      </div>

      {/* Interactive System Flow Diagram Section */}
      <div style={{ maxWidth: "1000px", width: "100%", marginBottom: "70px", animation: "slideup 0.9s ease" }}>
        <div style={{ textAlign: "center", marginBottom: "30px" }}>
          <h2 style={{
            fontSize: "26px",
            fontWeight: 800,
            color: dm ? "#ffffff" : "#111827",
            marginBottom: "8px",
            fontFamily: "'Outfit', sans-serif"
          }}>
            Client-Side Technology Pipeline
          </h2>
          <p style={{ fontSize: "14px", color: dm ? "#9ca3af" : "#4b5563" }}>
            Click on any processing stage to inspect the browser-native APIs and details.
          </p>
        </div>

        <div style={{ position: "relative", width: "100%" }}>
          <div className="glass-panel svg-grid-bg" style={{
            width: "100%",
            borderRadius: "24px",
            padding: "28px",
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
                
                {/* Glow filter definition */}
                <filter id="nodeGlow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="6" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>

              {/* Upper row connections (Centered at Y=70) */}
              <line x1="180" y1="70" x2="310" y2="70" stroke={dm ? "#374151" : "#e5e7eb"} strokeWidth="3" markerEnd="url(#arrow)" />
              <line x1="430" y1="70" x2="560" y2="70" stroke={dm ? "#374151" : "#e5e7eb"} strokeWidth="3" markerEnd="url(#arrow)" />
              <line x1="680" y1="70" x2="810" y2="70" stroke={dm ? "#374151" : "#e5e7eb"} strokeWidth="3" markerEnd="url(#arrow)" />

              {/* Lower row connections (Centered at Y=170) */}
              <line x1="430" y1="170" x2="560" y2="170" stroke={dm ? "#374151" : "#e5e7eb"} strokeWidth="3" markerEnd="url(#arrow)" />
              <line x1="680" y1="170" x2="810" y2="170" stroke={dm ? "#374151" : "#e5e7eb"} strokeWidth="3" markerEnd="url(#arrow)" />

              {/* Inter-row vertical connectors (Corrected alignment) */}
              <path d="M 870 100 L 870 140" stroke={dm ? "#374151" : "#e5e7eb"} strokeWidth="3" markerEnd="url(#arrow)" />
              <path d="M 370 100 L 370 140" stroke={dm ? "#374151" : "#e5e7eb"} strokeWidth="3" markerEnd="url(#arrow)" />

              {/* Render Nodes as SVG elements */}
              {pipelineNodes.map((n) => {
                const isActive = activeNode?.id === n.id;
                // Scale calculations
                const nx = (n.x * 10) - 60;
                const ny = n.y === 30 ? 40 : 140;
                
                // Color theme based on node active states
                const activeColor = "url(#landingLogoGlow)";
                const defaultColor = dm ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)";
                const iconColor = isActive ? "#6c63ff" : (dm ? "#a1a1aa" : "#666677");

                return (
                  <g key={n.id} onClick={() => setActiveNode(n)} style={{ cursor: "pointer" }}>
                    {/* Shadow Outer Glow */}
                    <rect
                      x={nx - 4}
                      y={ny - 4}
                      width={128}
                      height={68}
                      rx={14}
                      fill={isActive ? "rgba(108, 99, 255, 0.1)" : "transparent"}
                      stroke={isActive ? "#6c63ff" : "transparent"}
                      strokeWidth="2"
                      style={{ transition: "all 0.25s" }}
                      filter={isActive ? "url(#nodeGlow)" : "none"}
                    />
                    {/* Node Box */}
                    <rect
                      x={nx}
                      y={ny}
                      width={120}
                      height={60}
                      rx={12}
                      fill={dm ? (isActive ? "#1d1b32" : "#121214") : (isActive ? "#f5f3ff" : "#ffffff")}
                      stroke={isActive ? "url(#landingLogoGlow)" : defaultColor}
                      strokeWidth={isActive ? "2" : "1"}
                      style={{ transition: "all 0.25s", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}
                    />
                    
                    {/* Node Icon rendering via nested translate group */}
                    <g transform={`translate(${nx + 12}, ${ny + 10})`}>
                      {getPipelineNodeIcon(n.iconId, iconColor)}
                    </g>

                    {/* Node Title */}
                    <text
                      x={nx + 12}
                      y={ny + 42}
                      fontSize="10.5"
                      fontWeight="700"
                      fontFamily="'Outfit', sans-serif"
                      fill={dm ? "#ffffff" : "#111827"}
                    >
                      {n.title}
                    </text>
                    {/* Node Tech */}
                    <text
                      x={nx + 12}
                      y={ny + 52}
                      fontSize="7"
                      fontWeight="600"
                      fontFamily="system-ui"
                      fill={dm ? "#71717a" : "#9ca3af"}
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
                  borderRadius: "18px",
                  padding: "18px 24px",
                  border: "1px solid rgba(108, 99, 255, 0.2)",
                  background: dm ? "rgba(18, 18, 30, 0.6)" : "rgba(255, 255, 255, 0.9)",
                  boxShadow: "0 8px 30px rgba(108, 99, 255, 0.08)",
                  animation: "fadein 0.2s ease"
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <span style={{ display: "inline-flex", color: "#6c63ff" }}>
                      {getPipelineNodeIcon(activeNode.iconId, "#6c63ff")}
                    </span>
                    <h3 style={{ fontSize: "16px", fontWeight: 800, color: dm ? "#ffffff" : "#111827", fontFamily: "'Outfit', sans-serif" }}>
                      {activeNode.title}
                    </h3>
                    <span style={{
                      padding: "3px 9px",
                      background: dm ? "rgba(255, 255, 255, 0.06)" : "rgba(0, 0, 0, 0.03)",
                      borderRadius: "6px",
                      fontSize: "9px",
                      fontWeight: 700,
                      color: "#6c63ff",
                      letterSpacing: "0.2px"
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
                <p style={{ fontSize: "13px", color: dm ? "#d1d5db" : "#374151", lineHeight: 1.5 }}>
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
                borderRadius: "18px",
                color: dm ? "#6b7280" : "#9ca3af",
                fontSize: "13px"
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
          fontSize: "24px",
          fontWeight: 800,
          color: dm ? "#ffffff" : "#111827",
          marginBottom: "30px",
          textAlign: "center",
          fontFamily: "'Outfit', sans-serif"
        }}>
          How it Works
        </h2>
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
          gap: "24px"
        }}>
          {/* Card 1 */}
          <div className="glass-panel glow-hover-card" style={{
            padding: "26px",
            borderRadius: "18px",
            transition: "all 0.25s ease",
            display: "flex",
            flexDirection: "column",
            gap: "14px",
            border: `1px solid ${dm ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)"}`
          }}>
            <div style={{
              width: "42px",
              height: "42px",
              borderRadius: "10px",
              background: "rgba(6, 182, 212, 0.15)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#06b6d4"
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 5v14M5 12h14" />
              </svg>
            </div>
            <h3 style={{ fontSize: "17px", fontWeight: 800, color: dm ? "#ffffff" : "#111827", fontFamily: "'Outfit', sans-serif" }}>
              Import Images
            </h3>
            <p style={{ fontSize: "12.5px", color: dm ? "#9ca3af" : "#4b5563", lineHeight: 1.55 }}>
              Drag files directly onto the app workspace. We read the binary structures instantly, decoding in seconds completely locally.
            </p>
          </div>

          {/* Card 2 */}
          <div className="glass-panel glow-hover-card" style={{
            padding: "26px",
            borderRadius: "18px",
            transition: "all 0.25s ease",
            display: "flex",
            flexDirection: "column",
            gap: "14px",
            border: `1px solid ${dm ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)"}`
          }}>
            <div style={{
              width: "42px",
              height: "42px",
              borderRadius: "10px",
              background: "rgba(108, 99, 255, 0.15)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#6c63ff"
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <path d="m10 15 5-3-5-3v6Z" fill="currentColor" />
              </svg>
            </div>
            <h3 style={{ fontSize: "17px", fontWeight: 800, color: dm ? "#ffffff" : "#111827", fontFamily: "'Outfit', sans-serif" }}>
              Automated Culling
            </h3>
            <p style={{ fontSize: "12.5px", color: dm ? "#9ca3af" : "#4b5563", lineHeight: 1.55 }}>
              Use the Cull AI dashboard to automatically rate sharpness, find similar shots, isolate blinking/emotion scores, and extract the key frames.
            </p>
          </div>

          {/* Card 3 */}
          <div className="glass-panel glow-hover-card" style={{
            padding: "26px",
            borderRadius: "18px",
            transition: "all 0.25s ease",
            display: "flex",
            flexDirection: "column",
            gap: "14px",
            border: `1px solid ${dm ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)"}`
          }}>
            <div style={{
              width: "42px",
              height: "42px",
              borderRadius: "10px",
              background: "rgba(236, 72, 153, 0.15)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#ec4899"
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2-2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
            </div>
            <h3 style={{ fontSize: "17px", fontWeight: 800, color: dm ? "#ffffff" : "#111827", fontFamily: "'Outfit', sans-serif" }}>
              Develop & Export
            </h3>
            <p style={{ fontSize: "12.5px", color: dm ? "#9ca3af" : "#4b5563", lineHeight: 1.55 }}>
              Fine-tune exposure, apply studio LUT presets, restore faces, overlay watermark graphics, and download lossless JPEGs with non-destructive XMP.
            </p>
          </div>
        </div>
      </div>
      {/* Premium Interactive Pricing Section */}
      <div 
        style={{ 
          maxWidth: "1080px", 
          width: "100%", 
          marginTop: "80px", 
          display: "flex", 
          flexDirection: "column", 
          alignItems: "center", 
          gap: "36px",
          textAlign: "center"
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "10px", maxWidth: "680px" }}>
          <div style={{
            background: "linear-gradient(135deg, rgba(249, 115, 22, 0.15) 0%, rgba(250, 204, 21, 0.1) 100%)",
            border: `1px solid ${dm ? "rgba(249, 115, 22, 0.3)" : "rgba(249, 115, 22, 0.2)"}`,
            borderRadius: "30px",
            padding: "6px 16px",
            fontSize: "11px",
            fontWeight: 800,
            color: "#f97316",
            letterSpacing: "1.5px",
            fontFamily: "'Outfit', sans-serif",
            textTransform: "uppercase"
          }}>
            💳 Transparent Subscription Plans
          </div>
          <h2 style={{
            fontSize: "clamp(24px, 5vw, 32px)",
            fontWeight: 900,
            color: dm ? "#ffffff" : "#111827",
            fontFamily: "'Outfit', sans-serif",
            letterSpacing: "-0.8px"
          }}>
            Simple, Zero-Marginal-Cost SaaS Plans
          </h2>
          <p style={{ 
            fontSize: "14px", 
            color: dm ? "#9ca3af" : "#4b5563", 
            lineHeight: 1.6,
            marginTop: "4px"
          }}>
            Because PHOTOlab processes RAW files and AI models <strong>100% locally on your device</strong> using secure WebAssembly, we avoid costly cloud databases and server nodes. We pass these architectural savings directly to you with low pricing.
          </p>
        </div>

        {/* Pricing Switcher Switch */}
        <div style={{
          background: dm ? "rgba(255, 255, 255, 0.03)" : "rgba(0, 0, 0, 0.02)",
          border: `1px solid ${dm ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.06)"}`,
          borderRadius: "50px",
          padding: "6px",
          display: "inline-flex",
          position: "relative",
          gap: "4px"
        }}>
          <button
            onClick={() => setPricingPeriod("monthly")}
            style={{
              background: pricingPeriod === "monthly" ? 'linear-gradient(135deg, #f97316 0%, #facc15 100%)' : "transparent",
              color: pricingPeriod === "monthly" ? "#ffffff" : (dm ? "#cbd5e1" : "#4b5563"),
              border: "none",
              borderRadius: "40px",
              padding: "10px 24px",
              fontSize: "13px",
              fontWeight: 800,
              cursor: "pointer",
              transition: "all 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
              fontFamily: "'Outfit', sans-serif",
              display: "flex",
              alignItems: "center",
              gap: "6px"
            }}
          >
            <span>💳</span> Bill Monthly
          </button>
          <button
            onClick={() => setPricingPeriod("annual")}
            style={{
              background: pricingPeriod === "annual" ? 'linear-gradient(135deg, #f97316 0%, #facc15 100%)' : "transparent",
              color: pricingPeriod === "annual" ? "#ffffff" : (dm ? "#cbd5e1" : "#4b5563"),
              border: "none",
              borderRadius: "40px",
              padding: "10px 24px",
              fontSize: "13px",
              fontWeight: 800,
              cursor: "pointer",
              transition: "all 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
              fontFamily: "'Outfit', sans-serif",
              display: "flex",
              alignItems: "center",
              gap: "6px"
            }}
          >
            <span>🎁</span> Bill Annually
            {pricingPeriod === "annual" && (
              <span style={{
                background: "rgba(255,255,255,0.25)",
                borderRadius: "20px",
                padding: "2px 8px",
                fontSize: "11px",
                fontWeight: 900,
                letterSpacing: "0.5px",
                animation: "pulse-soft 1.8s ease-in-out infinite"
              }}>27% OFF</span>
            )}
          </button>
        </div>

        {/* Pricing Cards Grid */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
          gap: "28px",
          width: "100%",
          alignItems: "stretch"
        }}>
          {/* Card 1: Hobbyist (Free) */}
          <div style={{
            background: dm ? "rgba(255, 255, 255, 0.02)" : "rgba(255, 255, 255, 0.8)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            border: `1px solid ${dm ? "rgba(255, 255, 255, 0.06)" : "rgba(0, 0, 0, 0.05)"}`,
            borderRadius: "24px",
            padding: "32px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
            justifyContent: "space-between",
            gap: "24px",
            transition: "all 0.3s ease"
          }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px", width: "100%" }}>
              <span style={{ fontSize: "12px", fontWeight: 700, color: dm ? "#9ca3af" : "#6b7280", letterSpacing: "1px", textTransform: "uppercase" }}>
                Hobbyist
              </span>
              <h3 style={{ fontSize: "22px", fontWeight: 900, color: dm ? "#ffffff" : "#111827", fontFamily: "'Outfit', sans-serif" }}>
                Free Sandbox
              </h3>
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "center", margin: "8px 0" }}>
                <span style={{ fontSize: "36px", fontWeight: 900, color: dm ? "#ffffff" : "#111827", fontFamily: "'Outfit', sans-serif" }}>$0</span>
                <span style={{ fontSize: "13px", color: dm ? "#9ca3af" : "#6b7280", marginLeft: "4px" }}>/ forever</span>
              </div>
              <p style={{ fontSize: "13px", color: dm ? "#9ca3af" : "#4b5563", lineHeight: 1.5 }}>
                Standard web-based basic editing. Casual browser editing on standard camera formats.
              </p>
              
              {/* Divider */}
              <div style={{ height: "1px", background: dm ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.06)", margin: "12px 0" }} />
              
              {/* Features */}
              <ul style={{ 
                listStyle: "none", 
                padding: 0, 
                margin: 0, 
                display: "flex", 
                flexDirection: "column", 
                gap: "12px", 
                textAlign: "left",
                fontSize: "13px",
                color: dm ? "#cbd5e1" : "#374151"
              }}>
                <li style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ color: "#10b981", fontWeight: "bold" }}>✓</span> Standard JPEG, PNG, WebP Edits
                </li>
                <li style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ color: "#10b981", fontWeight: "bold" }}>✓</span> Basic focus culling (up to 10 photos/batch)
                </li>
                <li style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ color: "#10b981", fontWeight: "bold" }}>✓</span> Online browser-only application shell
                </li>
                <li style={{ display: "flex", alignItems: "center", gap: "8px", opacity: 0.4 }}>
                  <span style={{ color: "#ef4444" }}>✗</span> No C++ RAW file developer engine
                </li>
                <li style={{ display: "flex", alignItems: "center", gap: "8px", opacity: 0.4 }}>
                  <span style={{ color: "#ef4444" }}>✗</span> No offline standalone PWA installation
                </li>
              </ul>
            </div>

            <button
              onClick={() => setActiveTab("edit")}
              style={{
                width: "100%",
                background: dm ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.05)",
                border: "none",
                borderRadius: "14px",
                padding: "12px 24px",
                fontSize: "14px",
                fontWeight: 700,
                color: dm ? "#ffffff" : "#111827",
                cursor: "pointer",
                transition: "all 0.2s ease"
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = dm ? "rgba(255, 255, 255, 0.12)" : "rgba(0, 0, 0, 0.08)"}
              onMouseLeave={(e) => e.currentTarget.style.background = dm ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.05)"}
            >
              Launch Editor Free
            </button>
          </div>

          {/* Card 2: Creator Pro (Most Popular) */}
          <div style={{
            background: dm 
              ? "radial-gradient(circle at top right, rgba(249, 115, 22, 0.08), rgba(17, 24, 39, 0.95))" 
              : "radial-gradient(circle at top right, rgba(249, 115, 22, 0.04), rgba(255, 255, 255, 0.98))",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            border: `1.5px solid rgba(249, 115, 22, ${dm ? "0.35" : "0.25"})`,
            borderRadius: "24px",
            padding: "32px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
            justifyContent: "space-between",
            gap: "24px",
            position: "relative",
            boxShadow: "0 10px 30px rgba(249, 115, 22, 0.06)",
            transition: "all 0.3s ease"
          }}>
            {/* Pulsing Badge */}
            <div style={{
              position: "absolute",
              top: "-12px",
              background: 'linear-gradient(135deg, #f97316 0%, #facc15 100%)',
              color: "#ffffff",
              padding: "4px 14px",
              borderRadius: "20px",
              fontSize: "10px",
              fontWeight: 800,
              letterSpacing: "1px",
              textTransform: "uppercase",
              boxShadow: "0 4px 12px rgba(249, 115, 22, 0.3)"
            }}>
              ⭐ Most Popular
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "12px", width: "100%" }}>
              <span style={{ fontSize: "12px", fontWeight: 700, color: "#f97316", letterSpacing: "1px", textTransform: "uppercase" }}>
                Creator Pro
              </span>
              <h3 style={{ fontSize: "22px", fontWeight: 900, color: dm ? "#ffffff" : "#111827", fontFamily: "'Outfit', sans-serif" }}>
                Professional Studio
              </h3>
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "center", margin: "8px 0" }}>
                <span style={{ fontSize: "36px", fontWeight: 900, color: dm ? "#ffffff" : "#111827", fontFamily: "'Outfit', sans-serif" }}>
                  {pricingPeriod === "annual" ? "$6.58" : "$9"}
                </span>
                <span style={{ fontSize: "13px", color: dm ? "#9ca3af" : "#6b7280", marginLeft: "4px" }}>
                  / month
                </span>
              </div>
              <p style={{ fontSize: "12.5px", color: dm ? "#cbd5e1" : "#4b5563", lineHeight: 1.5 }}>
                {pricingPeriod === "annual" 
                  ? "Billed annually ($79/yr). Complete local desktop-class engine offline." 
                  : "Billed monthly ($9/mo). Complete local desktop-class engine offline."}
              </p>
              
              {/* Divider */}
              <div style={{ height: "1px", background: "rgba(249, 115, 22, 0.15)", margin: "12px 0" }} />
              
              {/* Features */}
              <ul style={{ 
                listStyle: "none", 
                padding: 0, 
                margin: 0, 
                display: "flex", 
                flexDirection: "column", 
                gap: "12px", 
                textAlign: "left",
                fontSize: "13px",
                color: dm ? "#cbd5e1" : "#374151"
              }}>
                <li style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ color: "#f97316", fontWeight: "bold" }}>★</span> <strong>C++ WebAssembly RAW Developer</strong>
                </li>
                <li style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ color: "#f97316", fontWeight: "bold" }}>★</span> <strong>Unlimited Focus Culling Batching</strong>
                </li>
                <li style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ color: "#f97316", fontWeight: "bold" }}>★</span> <strong>Offline PWA Standalone App Install</strong>
                </li>
                <li style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ color: "#f97316", fontWeight: "bold" }}>★</span> MediaPipe Local Facial Retouch Presets
                </li>
                <li style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ color: "#f97316", fontWeight: "bold" }}>★</span> Priority local feature upgrades
                </li>
              </ul>
            </div>

            <button
              onClick={() => {
                onSelectPlan && onSelectPlan({
                  name: `Creator Pro (${pricingPeriod === "annual" ? "Annual" : "Monthly"})`,
                  price: pricingPeriod === "annual" ? "$79" : "$9",
                  tier: "pro",
                  period: pricingPeriod,
                  savingBadge: pricingPeriod === "annual" ? "Save 27%" : ""
                });
              }}
              style={{
                width: "100%",
                background: 'linear-gradient(135deg, #f97316 0%, #facc15 100%)',
                border: "none",
                borderRadius: "14px",
                padding: "12px 24px",
                fontSize: "14px",
                fontWeight: 800,
                color: "#ffffff",
                cursor: "pointer",
                boxShadow: "0 4px 14px rgba(249, 115, 22, 0.25)",
                transition: "all 0.2s ease"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.boxShadow = '0 6px 18px rgba(249, 115, 22, 0.35)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'none';
                e.currentTarget.style.boxShadow = '0 4px 14px rgba(249, 115, 22, 0.25)';
              }}
            >
              Start Pro Trial
            </button>
          </div>

          {/* Card 3: Studio Team (Scale) */}
          <div style={{
            background: dm ? "rgba(255, 255, 255, 0.02)" : "rgba(255, 255, 255, 0.8)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            border: `1px solid ${dm ? "rgba(255, 255, 255, 0.06)" : "rgba(0, 0, 0, 0.05)"}`,
            borderRadius: "24px",
            padding: "32px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
            justifyContent: "space-between",
            gap: "24px",
            transition: "all 0.3s ease"
          }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px", width: "100%" }}>
              <span style={{ fontSize: "12px", fontWeight: 700, color: dm ? "#9ca3af" : "#6b7280", letterSpacing: "1px", textTransform: "uppercase" }}>
                Studio Team
              </span>
              <h3 style={{ fontSize: "22px", fontWeight: 900, color: dm ? "#ffffff" : "#111827", fontFamily: "'Outfit', sans-serif" }}>
                Agency Scale
              </h3>
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "center", margin: "8px 0" }}>
                <span style={{ fontSize: "36px", fontWeight: 900, color: dm ? "#ffffff" : "#111827", fontFamily: "'Outfit', sans-serif" }}>
                  {pricingPeriod === "annual" ? "$20.75" : "$29"}
                </span>
                <span style={{ fontSize: "13px", color: dm ? "#9ca3af" : "#6b7280", marginLeft: "4px" }}>
                  / month
                </span>
              </div>
              <p style={{ fontSize: "12.5px", color: dm ? "#9ca3af" : "#4b5563", lineHeight: 1.5 }}>
                {pricingPeriod === "annual" 
                  ? "Billed annually ($249/yr). Multi-device local syncing & sidecars." 
                  : "Billed monthly ($29/mo). Multi-device local syncing & sidecars."}
              </p>
              
              {/* Divider */}
              <div style={{ height: "1px", background: dm ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.06)", margin: "12px 0" }} />
              
              {/* Features */}
              <ul style={{ 
                listStyle: "none", 
                padding: 0, 
                margin: 0, 
                display: "flex", 
                flexDirection: "column", 
                gap: "12px", 
                textAlign: "left",
                fontSize: "13px",
                color: dm ? "#cbd5e1" : "#374151"
              }}>
                <li style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ color: "#10b981", fontWeight: "bold" }}>✓</span> <strong>Everything in Creator Pro</strong>
                </li>
                <li style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ color: "#10b981", fontWeight: "bold" }}>✓</span> <strong>Local Multi-Tablet Sync</strong>
                </li>
                <li style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ color: "#10b981", fontWeight: "bold" }}>✓</span> <strong>Custom Watermark Designer</strong>
                </li>
                <li style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ color: "#10b981", fontWeight: "bold" }}>✓</span> Non-destructive XMP sidecar export
                </li>
                <li style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ color: "#10b981", fontWeight: "bold" }}>✓</span> Priority local support & custom SLA
                </li>
              </ul>
            </div>

            <button
              onClick={() => {
                onSelectPlan && onSelectPlan({
                  name: `Studio Team (${pricingPeriod === "annual" ? "Annual" : "Monthly"})`,
                  price: pricingPeriod === "annual" ? "$249" : "$29",
                  tier: "team",
                  period: pricingPeriod,
                  savingBadge: pricingPeriod === "annual" ? "Save 28%" : ""
                });
              }}
              style={{
                width: "100%",
                background: dm ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.05)",
                border: "none",
                borderRadius: "14px",
                padding: "12px 24px",
                fontSize: "14px",
                fontWeight: 700,
                color: dm ? "#ffffff" : "#111827",
                cursor: "pointer",
                transition: "all 0.2s ease"
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = dm ? "rgba(255, 255, 255, 0.12)" : "rgba(0, 0, 0, 0.08)"}
              onMouseLeave={(e) => e.currentTarget.style.background = dm ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.05)"}
            >
              Start Team Trial
            </button>
          </div>
        </div>

        {/* Competitor Comparison Table */}
        <div style={{
          width: "100%",
          maxWidth: "1080px",
          marginTop: "48px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "20px"
        }}>
          <div style={{
            fontSize: "11px",
            fontWeight: 800,
            color: dm ? "#9ca3af" : "#6b7280",
            letterSpacing: "1.5px",
            textTransform: "uppercase",
            fontFamily: "'Outfit', sans-serif"
          }}>
            PHOTOlab vs. the competition
          </div>
          <div style={{
            width: "100%",
            overflowX: "auto",
            borderRadius: "20px",
            border: `1px solid ${dm ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)"}`,
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)"
          }}>
            <table style={{
              width: "100%",
              borderCollapse: "collapse",
              fontFamily: "'Outfit', sans-serif",
              fontSize: "13px",
              color: dm ? "#cbd5e1" : "#374151"
            }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${dm ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)"}` }}>
                  {["Feature", "PHOTOlab Pro", "Adobe Lightroom", "Capture One", "Aftershoot"].map((h, i) => (
                    <th key={h} style={{
                      padding: "14px 18px",
                      fontWeight: 900,
                      fontSize: "12px",
                      letterSpacing: i === 0 ? "0px" : "0.5px",
                      textAlign: "center",
                      background: i === 1
                        ? dm ? "rgba(249,115,22,0.08)" : "rgba(249,115,22,0.05)"
                        : dm ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.01)",
                      color: i === 1 ? "#f97316" : (dm ? "#e2e8f0" : "#111827")
                    }}>
                      {i === 1 ? "⭐ " + h : h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  ["Monthly Price", "$9 / mo", "$22.99 / mo", "$24 / mo", "$15 / mo"],
                  ["Annual Price", "$79 / yr", "$263 / yr", "$192 / yr", "$132 / yr"],
                  ["Local RAW Processing", "✅ Yes (WASM)", "⚠️ Cloud Sync Required", "✅ Yes", "✅ Yes"],
                  ["100% Offline Mode", "✅ Full PWA", "❌ No", "⚠️ Partial", "❌ No"],
                  ["Privacy (No Uploads)", "✅ Zero uploads", "❌ Cloud sync", "⚠️ Optional", "❌ Cloud AI"],
                  ["AI Culling", "✅ Local MediaPipe", "✅ Sensei AI", "❌ No", "✅ Cloud AI"],
                  ["Browser / PWA", "✅ Yes", "❌ Desktop Only", "❌ Desktop Only", "❌ Desktop Only"],
                  ["Free Tier", "✅ Always Free", "❌ No", "❌ Trial Only", "✅ Limited"],
                ].map((row, ri) => (
                  <tr key={ri} style={{
                    borderBottom: ri < 7 ? `1px solid ${dm ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)"}` : "none",
                    background: ri % 2 === 0
                      ? (dm ? "rgba(255,255,255,0.01)" : "rgba(0,0,0,0.005)")
                      : "transparent"
                  }}>
                    {row.map((cell, ci) => (
                      <td key={ci} style={{
                        padding: "12px 18px",
                        textAlign: ci === 0 ? "left" : "center",
                        fontWeight: ci === 0 ? 700 : 500,
                        fontSize: ci === 0 ? "13px" : "13px",
                        background: ci === 1
                          ? dm ? "rgba(249,115,22,0.05)" : "rgba(249,115,22,0.03)"
                          : "transparent",
                        color: ci === 1
                          ? (cell.startsWith("✅") ? "#f97316" : (dm ? "#cbd5e1" : "#374151"))
                          : (cell.startsWith("✅") ? (dm ? "#10b981" : "#059669")
                            : cell.startsWith("❌") ? (dm ? "#6b7280" : "#9ca3af")
                            : (dm ? "#cbd5e1" : "#374151"))
                      }}>
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p style={{ fontSize: "11.5px", color: dm ? "#6b7280" : "#9ca3af" }}>
            Pricing comparisons based on publicly listed rates as of 2025–2026.
          </p>
        </div>

        {/* FAQ Section */}
        <div style={{
          width: "100%",
          maxWidth: "720px",
          marginTop: "48px",
          display: "flex",
          flexDirection: "column",
          gap: "12px"
        }}>
          <div style={{
            fontSize: "11px",
            fontWeight: 800,
            color: dm ? "#9ca3af" : "#6b7280",
            letterSpacing: "1.5px",
            textTransform: "uppercase",
            fontFamily: "'Outfit', sans-serif",
            textAlign: "center",
            marginBottom: "8px"
          }}>
            Common Questions
          </div>
          {[
            {
              q: "Does it really work 100% offline?",
              a: "Yes. PHOTOlab uses a 30-day cryptographic offline lease stored on your device. Once verified, the full RAW engine and AI culling works on-site with zero internet connection."
            },
            {
              q: "Can I cancel at any time?",
              a: "Absolutely. Monthly plans can be cancelled in one click. Annual plans are refundable within 14 days if you're not satisfied."
            },
            {
              q: "What RAW camera formats are supported?",
              a: "Over 750 RAW formats via the C++ libraw engine — Canon CR2/CR3, Nikon NEF, Sony ARW, Fuji RAF, Hasselblad 3FR, DNG, and more."
            },
            {
              q: "Is my photo data ever uploaded?",
              a: "Never. Every pixel is decoded and processed entirely within your browser memory using WebAssembly. We have no access to your images."
            }
          ].map((item, idx) => (
            <div key={idx} style={{
              background: dm ? "rgba(255,255,255,0.02)" : "rgba(255,255,255,0.8)",
              backdropFilter: "blur(8px)",
              WebkitBackdropFilter: "blur(8px)",
              border: `1px solid ${dm ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)"}`,
              borderRadius: "16px",
              padding: "20px 24px",
              textAlign: "left"
            }}>
              <p style={{
                fontSize: "14px",
                fontWeight: 800,
                color: dm ? "#ffffff" : "#111827",
                fontFamily: "'Outfit', sans-serif",
                marginBottom: "8px"
              }}>
                {item.q}
              </p>
              <p style={{
                fontSize: "13px",
                color: dm ? "#9ca3af" : "#4b5563",
                lineHeight: 1.6
              }}>
                {item.a}
              </p>
            </div>
          ))}
        </div>

      </div>

      {/* Premium PWA Installation Card (Section 7) */}
      <div 
        className="glass-panel"
        style={{ 
          maxWidth: "900px", 
          width: "100%", 
          marginTop: "60px", 
          padding: "36px", 
          borderRadius: "24px",
          border: `1.5px solid ${dm ? "rgba(249, 115, 22, 0.25)" : "rgba(249, 115, 22, 0.2)"}`,
          background: dm 
            ? "radial-gradient(circle at top right, rgba(249, 115, 22, 0.05), rgba(11, 15, 25, 0.8))" 
            : "radial-gradient(circle at top right, rgba(249, 115, 22, 0.03), rgba(255, 255, 255, 0.95))",
          boxShadow: dm ? "0 10px 40px rgba(0, 0, 0, 0.3)" : "0 10px 40px rgba(108, 99, 255, 0.05)",
          position: "relative",
          overflow: "hidden",
          animation: "slideup 1.0s ease"
        }}
      >
        {/* Glow Effect */}
        <div style={{
          position: "absolute",
          top: "-50px",
          right: "-50px",
          width: "150px",
          height: "150px",
          background: "radial-gradient(circle, rgba(249, 115, 22, 0.2) 0%, transparent 70%)",
          filter: "blur(20px)",
          pointerEvents: "none"
        }} />

        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          
          {/* Header */}
          <div style={{ borderBottom: `1px solid ${dm ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.06)"}`, paddingBottom: "16px" }}>
            <h2 style={{
              fontSize: "clamp(20px, 4vw, 24px)",
              fontWeight: 900,
              color: dm ? "#ffffff" : "#111827",
              fontFamily: "'Outfit', sans-serif",
              letterSpacing: "-0.5px",
              display: "flex",
              alignItems: "center",
              gap: "10px"
            }}>
              <span>📱 7. Install the App on Your Tablet</span>
            </h2>
            <p style={{ fontSize: "14px", color: dm ? "#9ca3af" : "#4b5563", marginTop: "6px", lineHeight: 1.5 }}>
              Install PHOTOlab to access a standalone, fullscreen workspace with complete offline functionality. Decodes raw data and runs AI models with zero network usage.
            </p>
          </div>

          {/* Platforms Grid */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: "24px"
          }}>
            {/* Android / Chrome */}
            <div style={{
              background: dm ? "rgba(255, 255, 255, 0.02)" : "rgba(0, 0, 0, 0.01)",
              border: `1px solid ${dm ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.04)"}`,
              borderRadius: "16px",
              padding: "20px",
              display: "flex",
              flexDirection: "column",
              gap: "12px"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "20px" }}>🤖</span>
                <h3 style={{ fontSize: "16px", fontWeight: 800, color: dm ? "#ffffff" : "#111827", fontFamily: "'Outfit', sans-serif" }}>
                  Android / Chrome OS
                </h3>
              </div>
              <ul style={{ 
                fontSize: "13px", 
                color: dm ? "#cbd5e1" : "#374151", 
                paddingLeft: "18px", 
                lineHeight: "1.7",
                display: "flex",
                flexDirection: "column",
                gap: "8px"
              }}>
                <li>
                  Tap <strong style={{ 
                    background: "linear-gradient(135deg, #f97316, #facc15)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    fontWeight: 900
                  }}>📱 Install App</strong> in the top header.
                </li>
                <li>
                  Confirm the installation prompt in the browser pop-up.
                </li>
                <li>
                  Launch PHOTOlab directly from your tablet app drawer or desktop.
                </li>
              </ul>
            </div>

            {/* iOS / Safari */}
            <div style={{
              background: dm ? "rgba(255, 255, 255, 0.02)" : "rgba(0, 0, 0, 0.01)",
              border: `1px solid ${dm ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.04)"}`,
              borderRadius: "16px",
              padding: "20px",
              display: "flex",
              flexDirection: "column",
              gap: "12px"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "20px" }}>🍎</span>
                <h3 style={{ fontSize: "16px", fontWeight: 800, color: dm ? "#ffffff" : "#111827", fontFamily: "'Outfit', sans-serif" }}>
                  Apple iPad / iPhone (Safari)
                </h3>
              </div>
              <ul style={{ 
                fontSize: "13px", 
                color: dm ? "#cbd5e1" : "#374151", 
                paddingLeft: "18px", 
                lineHeight: "1.7",
                display: "flex",
                flexDirection: "column",
                gap: "8px"
              }}>
                <li>
                  Tap <strong style={{ 
                    background: "linear-gradient(135deg, #f97316, #facc15)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    fontWeight: 900
                  }}>📱 Install App</strong> or the Safari Share button <strong style={{ color: dm ? "#ffffff" : "#111827" }}>📤</strong>.
                </li>
                <li>
                  Scroll down the share sheet and select <strong style={{ color: dm ? "#ffffff" : "#111827" }}>Add to Home Screen ➕</strong>.
                </li>
                <li>
                  Access PHOTOlab directly from your home screen in stunning standalone mode.
                </li>
              </ul>
            </div>
          </div>

          {/* Action Call-to-Action Bar */}
          <div style={{ 
            display: "flex", 
            justifyContent: "center", 
            alignItems: "center", 
            paddingTop: "8px"
          }}>
            {isInstalled ? (
              <div style={{
                background: "rgba(22, 163, 74, 0.1)",
                border: "1.5px solid rgba(22, 163, 74, 0.3)",
                color: "#16a34a",
                padding: "10px 24px",
                borderRadius: "12px",
                fontSize: "14px",
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                gap: "8px"
              }}>
                <span>✓</span> App Installed &amp; 100% Offline Ready
              </div>
            ) : (
              <button 
                onClick={handleInstallClick}
                style={{
                  background: 'linear-gradient(135deg, #f97316 0%, #facc15 100%)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '12px 32px',
                  fontSize: '14px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  boxShadow: '0 4px 18px rgba(249, 115, 22, 0.35)',
                  transition: 'all 0.2s ease',
                  fontFamily: "'Outfit', sans-serif",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 6px 22px rgba(249, 115, 22, 0.45)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'none';
                  e.currentTarget.style.boxShadow = '0 4px 18px rgba(249, 115, 22, 0.35)';
                }}
              >
                <span>📱</span> Install PHOTOlab on Tablet
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
