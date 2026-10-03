import React, { useState } from "react";
import { HSL_CHANNELS, DEFAULT_HSL_MIXER } from "../../constants";
import { SL, SmoothSlider } from "../ui/common";

export function HslMixerPanel({ hslMixer, setHslMixer, dm, cardBg, cardBdr }) {
  const [activeChannel, setActiveChannel] = useState("red");

  const currentCh = HSL_CHANNELS.find(c => c.id === activeChannel) || HSL_CHANNELS[0];
  const values = hslMixer[activeChannel] || { hue: 0, sat: 0, lum: 0 };

  const updateChannelVal = (key, val) => {
    setHslMixer(prev => ({
      ...prev,
      [activeChannel]: {
        ...(prev[activeChannel] || { hue: 0, sat: 0, lum: 0 }),
        [key]: val
      }
    }));
  };

  const resetCurrentChannel = () => {
    setHslMixer(prev => ({
      ...prev,
      [activeChannel]: { hue: 0, sat: 0, lum: 0 }
    }));
  };

  const resetAllHsl = () => {
    setHslMixer(DEFAULT_HSL_MIXER);
  };

  const isCurrentModified = values.hue !== 0 || values.sat !== 0 || values.lum !== 0;
  const isAnyModified = Object.values(hslMixer).some(v => v.hue !== 0 || v.sat !== 0 || v.lum !== 0);

  return (
    <div style={{ padding: "14px", background: cardBg, border: `1.5px solid ${cardBdr}`, borderRadius: "12px", display: "flex", flexDirection: "column", gap: "12px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <SL style={{ margin: 0 }}>🎨 8-Channel Selective HSL Mixer</SL>
          <span style={{ fontSize: "9px", fontWeight: 800, padding: "2px 6px", background: "linear-gradient(135deg,#06b6d4,#6c63ff)", color: "#fff", borderRadius: "6px" }}>PRO COLOR</span>
        </div>
        {isAnyModified && (
          <button onClick={resetAllHsl}
            style={{ fontSize: "10.5px", fontWeight: 700, color: "#ef4444", background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.25)", padding: "3px 8px", borderRadius: "6px", cursor: "pointer" }}>
            Reset All HSL
          </button>
        )}
      </div>

      <p style={{ fontSize: "11px", color: dm ? "#aaa" : "#666", margin: 0, lineHeight: 1.4 }}>
        Target and fine-tune specific color tones in your photo independently (e.g., skin warmth, foliage green, or sky blue).
      </p>

      {/* 8 Color Selector Nodes */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(8, 1fr)", gap: "4px" }}>
        {HSL_CHANNELS.map(ch => {
          const isActive = activeChannel === ch.id;
          const chVals = hslMixer[ch.id] || { hue: 0, sat: 0, lum: 0 };
          const isChModified = chVals.hue !== 0 || chVals.sat !== 0 || chVals.lum !== 0;

          return (
            <button key={ch.id} onClick={() => setActiveChannel(ch.id)}
              style={{
                padding: "8px 2px",
                borderRadius: "8px",
                border: `2px solid ${isActive ? ch.color : isChModified ? "rgba(108,99,255,0.4)" : cardBdr}`,
                background: isActive ? (dm ? "rgba(255,255,255,0.08)" : "#ffffff") : "transparent",
                cursor: "pointer",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "2px",
                position: "relative",
                transition: "all .15s ease",
                boxShadow: isActive ? `0 2px 8px ${ch.color}40` : "none"
              }}
              title={ch.name}>
              <div style={{ width: "12px", height: "12px", borderRadius: "50%", background: ch.color, border: "1px solid rgba(255,255,255,0.8)" }} />
              <span style={{ fontSize: "9px", fontWeight: isActive ? 800 : 600, color: isActive ? (dm ? "#fff" : "#111") : (dm ? "#aaa" : "#666") }}>
                {ch.name.slice(0, 3)}
              </span>
              {isChModified && (
                <div style={{ position: "absolute", top: "2px", right: "2px", width: "5px", height: "5px", borderRadius: "50%", background: "#6c63ff" }} />
              )}
            </button>
          );
        })}
      </div>

      {/* Active Channel Editing Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: "6px", borderTop: `1px solid ${cardBdr}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span style={{ fontSize: "14px" }}>{currentCh.icon}</span>
          <span style={{ fontSize: "12.5px", fontWeight: 800, color: currentCh.color }}>
            {currentCh.name} Channel Adjustments
          </span>
        </div>
        {isCurrentModified && (
          <button onClick={resetCurrentChannel} style={{ fontSize: "10.5px", color: "#6c63ff", background: "none", border: "none", cursor: "pointer", fontWeight: 700 }}>
            Reset {currentCh.name}
          </button>
        )}
      </div>

      {/* Sliders for Active Color */}
      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
            <span style={{ fontSize: "11.5px", fontWeight: 600, color: values.hue !== 0 ? currentCh.color : (dm ? "#ccc" : "#555") }}>
              Hue Shift
            </span>
            <span style={{ fontSize: "11px", fontWeight: 700, color: currentCh.color, fontVariantNumeric: "tabular-nums" }}>
              {values.hue > 0 ? "+" : ""}{values.hue}°
            </span>
          </div>
          <SmoothSlider min={-100} max={100} step={1} value={values.hue} defaultValue={0} onChange={v => updateChannelVal("hue", v)} />
        </div>

        <div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
            <span style={{ fontSize: "11.5px", fontWeight: 600, color: values.sat !== 0 ? currentCh.color : (dm ? "#ccc" : "#555") }}>
              Saturation
            </span>
            <span style={{ fontSize: "11px", fontWeight: 700, color: currentCh.color, fontVariantNumeric: "tabular-nums" }}>
              {values.sat > 0 ? "+" : ""}{values.sat}%
            </span>
          </div>
          <SmoothSlider min={-100} max={100} step={1} value={values.sat} defaultValue={0} onChange={v => updateChannelVal("sat", v)} />
        </div>

        <div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
            <span style={{ fontSize: "11.5px", fontWeight: 600, color: values.lum !== 0 ? currentCh.color : (dm ? "#ccc" : "#555") }}>
              Luminance (Lightness)
            </span>
            <span style={{ fontSize: "11px", fontWeight: 700, color: currentCh.color, fontVariantNumeric: "tabular-nums" }}>
              {values.lum > 0 ? "+" : ""}{values.lum}%
            </span>
          </div>
          <SmoothSlider min={-100} max={100} step={1} value={values.lum} defaultValue={0} onChange={v => updateChannelVal("lum", v)} />
        </div>
      </div>
    </div>
  );
}
