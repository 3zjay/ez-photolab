import React, { useState, useRef, useEffect } from "react";
import { SL } from "../ui/common";

export function ToneCurvesPanel({ curves, setCurves, dm, cardBg, cardBdr }) {
  const [activeChannel, setActiveChannel] = useState("master");
  const canvasRef = useRef(null);

  const channelColors = {
    master: { name: "RGB Master", color: dm ? "#ffffff" : "#111827", stroke: dm ? "#ffffff" : "#111827" },
    red: { name: "Red Channel", color: "#ef4444", stroke: "#ef4444" },
    green: { name: "Green Channel", color: "#22c55e", stroke: "#22c55e" },
    blue: { name: "Blue Channel", color: "#3b82f6", stroke: "#3b82f6" }
  };

  const currentPoints = curves[activeChannel] || [
    { x: 0, y: 0 },
    { x: 255, y: 255 }
  ];

  // Draw curve graph canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);

    // Background grid
    ctx.fillStyle = dm ? "#18181b" : "#f8fafc";
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = dm ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)";
    ctx.lineWidth = 1;

    for (let i = 1; i < 4; i++) {
      const p = (height / 4) * i;
      ctx.beginPath();
      ctx.moveTo(0, p);
      ctx.lineTo(width, p);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(p, 0);
      ctx.lineTo(p, height);
      ctx.stroke();
    }

    // Diagonal reference line
    ctx.strokeStyle = dm ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.15)";
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(0, height);
    ctx.lineTo(width, 0);
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw active curve path
    const activeColor = channelColors[activeChannel].stroke;
    ctx.strokeStyle = activeColor;
    ctx.lineWidth = 2.5;
    ctx.beginPath();

    // Generate smooth curve points across 0..255 mapped to canvas coordinates
    for (let x = 0; x <= width; x++) {
      const inputVal = (x / width) * 255;
      // Simple piecewise linear interpolation for curve points
      let outputVal = inputVal;
      const pts = [...currentPoints].sort((a, b) => a.x - b.x);

      if (pts.length >= 2) {
        if (inputVal <= pts[0].x) {
          outputVal = pts[0].y;
        } else if (inputVal >= pts[pts.length - 1].x) {
          outputVal = pts[pts.length - 1].y;
        } else {
          for (let j = 0; j < pts.length - 1; j++) {
            if (inputVal >= pts[j].x && inputVal <= pts[j + 1].x) {
              const t = (inputVal - pts[j].x) / (pts[j + 1].x - pts[j].x);
              outputVal = pts[j].y + t * (pts[j + 1].y - pts[j].y);
              break;
            }
          }
        }
      }

      const canvasY = height - (outputVal / 255) * height;
      if (x === 0) ctx.moveTo(x, canvasY);
      else ctx.lineTo(x, canvasY);
    }
    ctx.stroke();

    // Draw control point handles
    currentPoints.forEach(pt => {
      const cx = (pt.x / 255) * width;
      const cy = height - (pt.y / 255) * height;

      ctx.beginPath();
      ctx.arc(cx, cy, 6, 0, Math.PI * 2);
      ctx.fillStyle = activeColor;
      ctx.fill();
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2;
      ctx.stroke();
    });
  }, [curves, activeChannel, dm]);

  const updatePoint = (index, newX, newY) => {
    setCurves(prev => {
      const channelPts = [...(prev[activeChannel] || [{ x: 0, y: 0 }, { x: 255, y: 255 }])];
      channelPts[index] = {
        x: Math.min(255, Math.max(0, newX)),
        y: Math.min(255, Math.max(0, newY))
      };
      return { ...prev, [activeChannel]: channelPts };
    });
  };

  const addMidpoint = () => {
    setCurves(prev => {
      const pts = [...(prev[activeChannel] || [{ x: 0, y: 0 }, { x: 255, y: 255 }])];
      if (pts.length < 5) {
        // Add midpoint at x=128, y=128
        pts.splice(1, 0, { x: 128, y: 128 });
      }
      return { ...prev, [activeChannel]: pts };
    });
  };

  const resetActiveCurve = () => {
    setCurves(prev => ({
      ...prev,
      [activeChannel]: [
        { x: 0, y: 0 },
        { x: 255, y: 255 }
      ]
    }));
  };

  const isCurveModified = currentPoints.some(p => (p.x === 0 && p.y !== 0) || (p.x === 255 && p.y !== 255) || (p.x !== 0 && p.x !== 255));

  return (
    <div style={{ padding: "14px", background: cardBg, border: `1.5px solid ${cardBdr}`, borderRadius: "12px", display: "flex", flexDirection: "column", gap: "12px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <SL style={{ margin: 0 }}>📈 RGB Tone Curves Graph</SL>
        {isCurveModified && (
          <button onClick={resetActiveCurve} style={{ fontSize: "10.5px", color: "#6c63ff", background: "none", border: "none", cursor: "pointer", fontWeight: 700 }}>
            Reset Curve
          </button>
        )}
      </div>

      <p style={{ fontSize: "11px", color: dm ? "#aaa" : "#666", margin: 0, lineHeight: 1.4 }}>
        Precision tonal adjustments for shadows, midtones, and highlights per RGB channel.
      </p>

      {/* Channel Switcher */}
      <div style={{ display: "flex", gap: "4px", background: dm ? "rgba(255,255,255,0.04)" : "#f1f5f9", padding: "3px", borderRadius: "8px" }}>
        {Object.entries(channelColors).map(([key, ch]) => (
          <button key={key} onClick={() => setActiveChannel(key)}
            style={{
              flex: 1,
              padding: "6px 4px",
              borderRadius: "6px",
              border: "none",
              background: activeChannel === key ? (dm ? "#27272a" : "#ffffff") : "transparent",
              color: activeChannel === key ? ch.color : (dm ? "#aaa" : "#666"),
              fontSize: "11px",
              fontWeight: activeChannel === key ? 800 : 600,
              cursor: "pointer",
              transition: "all .15s ease",
              boxShadow: activeChannel === key ? "0 1px 4px rgba(0,0,0,0.1)" : "none"
            }}>
            {ch.name.split(" ")[0]}
          </button>
        ))}
      </div>

      {/* Canvas Curve Graph */}
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center" }}>
        <canvas ref={canvasRef} width={220} height={220} style={{ borderRadius: "10px", border: `1px solid ${cardBdr}`, cursor: "crosshair" }} />
      </div>

      {/* Midtone Lift Control Sliders */}
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: "11.5px", fontWeight: 700, color: channelColors[activeChannel].color }}>
            Shadows Lift (x=0)
          </span>
          <span style={{ fontSize: "11px", fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
            {currentPoints[0]?.y || 0}
          </span>
        </div>
        <input type="range" min={0} max={128} value={currentPoints[0]?.y || 0} onChange={e => updatePoint(0, 0, Number(e.target.value))} style={{ width: "100%", accentColor: channelColors[activeChannel].color }} />

        {currentPoints.length > 2 && (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "11.5px", fontWeight: 700, color: channelColors[activeChannel].color }}>
                Midtones Curve (x=128)
              </span>
              <span style={{ fontSize: "11px", fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
                {currentPoints[1]?.y || 128}
              </span>
            </div>
            <input type="range" min={30} max={225} value={currentPoints[1]?.y || 128} onChange={e => updatePoint(1, 128, Number(e.target.value))} style={{ width: "100%", accentColor: channelColors[activeChannel].color }} />
          </>
        )}

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: "11.5px", fontWeight: 700, color: channelColors[activeChannel].color }}>
            Highlights Rolloff (x=255)
          </span>
          <span style={{ fontSize: "11px", fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
            {currentPoints[currentPoints.length - 1]?.y || 255}
          </span>
        </div>
        <input type="range" min={128} max={255} value={currentPoints[currentPoints.length - 1]?.y || 255} onChange={e => updatePoint(currentPoints.length - 1, 255, Number(e.target.value))} style={{ width: "100%", accentColor: channelColors[activeChannel].color }} />

        {currentPoints.length <= 2 && (
          <button onClick={addMidpoint}
            style={{
              padding: "7px 12px",
              borderRadius: "8px",
              border: `1px dashed ${cardBdr}`,
              background: "transparent",
              color: "#6c63ff",
              fontSize: "11px",
              fontWeight: 700,
              cursor: "pointer",
              marginTop: "4px"
            }}>
            + Add Midtone Curve Point
          </button>
        )}
      </div>
    </div>
  );
}
