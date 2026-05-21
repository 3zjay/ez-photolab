import React, { useState, useCallback } from 'react';
import { Spin, Row, SL, AB } from '../ui/common';
import { RAW_EXTENSIONS, decodeRaw } from '../../rawProcessor';

export function RawBatchPanel({ dm, cardBg, cardBdr, inputSt, accent = '#6c63ff', 
  batchRawFiles, setBatchRawFiles, batchProcessing, batchProgress, 
  handleRawBatchProcess, batchDone, inline = false, batchLogs = [], addBatchLog,
  user, setActiveTab }) {
  
  const [isOver, setIsOver] = useState(false);
  const [decoding, setDecoding] = useState(false);

  if (user && user.tier === "free") {
    return (
      <div style={{
        border: `1.5px dashed rgba(249, 115, 22, ${dm ? "0.2" : "0.15"})`,
        borderRadius: "16px",
        padding: "32px 20px",
        textAlign: "center",
        background: dm ? "rgba(249, 115, 22, 0.02)" : "rgba(249, 115, 22, 0.01)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "12px",
        fontFamily: "'Outfit', sans-serif"
      }}>
        <span style={{ fontSize: "32px" }}>📸</span>
        <div style={{ fontSize: "14px", fontWeight: 800, color: dm ? '#ffffff' : '#1a1a2e' }}>
          Creator Pro Required for RAW Engine
        </div>
        <p style={{ fontSize: "12px", color: dm ? "#cbd5e1" : "#4b5563", lineHeight: 1.5, margin: 0, maxWidth: "320px" }}>
          High-fidelity RAW decoding (NEF, CR2, ARW) and WebGPU C++ JIT compilation require the Creator Pro plan.
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
            background: "linear-gradient(135deg, #f97316 0%, #facc15 100%)",
            color: "#ffffff",
            border: "none",
            borderRadius: "8px",
            padding: "8px 16px",
            fontSize: "12px",
            fontWeight: 800,
            cursor: "pointer",
            boxShadow: "0 4px 12px rgba(249, 115, 22, 0.2)",
            fontFamily: "inherit",
            transition: "transform 0.2s"
          }}
        >
          ⭐ Upgrade to Creator Pro
        </button>
      </div>
    );
  }

  const handleFiles = useCallback(async (files) => {
    setDecoding(true);
    addBatchLog(`Starting decoding for ${files.length} files...`, 'info');
    const newFiles = [];
    try {
      for (const file of files) {
        addBatchLog(`Processing ${file.name}...`, 'info');
        try {
          const buffer = await file.arrayBuffer();
          const result = await decodeRaw(buffer, (msg) => addBatchLog(`[${file.name}] ${msg}`, 'info'));
          
          newFiles.push({
            file,
            name: file.name,
            previewUrl: result.url,
            metadata: {
              model: result.model,
              iso: result.iso,
              width: result.width,
              height: result.height,
              orientation: result.orientation
            }
          });
          addBatchLog(`✅ Successfully decoded ${file.name} (${result.model})`, 'success');
        } catch (e) {
          addBatchLog(`❌ Error: ${file.name} - ${e.message}`, 'error');
          console.error(`RAW UI Error:`, e);
        }
      }
    } finally {
      setBatchRawFiles(prev => [...prev, ...newFiles]);
      setDecoding(false);
      addBatchLog(`Finished processing.`, 'info');
    }
  }, [setBatchRawFiles, addBatchLog]);

  const onDrop = (e) => {
    e.preventDefault();
    setIsOver(false);
    if (e.dataTransfer.files) handleFiles(Array.from(e.dataTransfer.files));
  };

  const onSelect = (e) => {
    if (e.target.files) handleFiles(Array.from(e.target.files));
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      {/* Compact Drop Zone / Picker if inline */}
      {!inline && (
        <div 
          onDragOver={(e) => { e.preventDefault(); setIsOver(true); }}
          onDragLeave={() => setIsOver(false)}
          onDrop={onDrop}
          style={{
            border: `2px dashed ${isOver ? accent : cardBdr}`,
            borderRadius: "16px",
            padding: "40px 20px",
            textAlign: "center",
            background: isOver ? (dm ? '#1e1a3a' : '#faf9ff') : (dm ? '#1a1a1a' : '#fff'),
            transition: "all .2s",
            cursor: "pointer",
            position: "relative"
          }}
          onClick={() => document.getElementById('raw-input').click()}
        >
          <input 
            id="raw-input" 
            type="file" 
            multiple 
            accept={RAW_EXTENSIONS} 
            style={{ display: "none" }} 
            onChange={onSelect}
          />
          <div style={{ fontSize: "40px", marginBottom: "12px" }}>📸</div>
          <div style={{ fontSize: "16px", fontWeight: 700, color: dm ? '#f0f0f0' : '#1a1a2e' }}>
            Drop RAW Files Here
          </div>
          <div style={{ fontSize: "12px", color: "#999", marginTop: "8px" }}>
            Canon (.CR2, .CR3), Nikon (.NEF), Sony (.ARW), Adobe (.DNG) & more
          </div>
          {decoding && (
            <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)", borderRadius: "16px", display: "flex", alignItems: "center", justifyContent: "center", gap: "10px", color: "#fff", zIndex: 5 }}>
              <Spin color="#fff" /> Decoding RAW files...
            </div>
          )}
        </div>
      )}

      {/* File List */}
      {batchRawFiles.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <SL>Queue ({batchRawFiles.length})</SL>
            <button 
              onClick={() => setBatchRawFiles([])}
              style={{ background: "none", border: "none", color: "#ef4444", fontSize: "11px", fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}
            >
              Clear All
            </button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxHeight: inline ? "300px" : "none", overflowY: "auto", paddingRight: "4px" }}>
            {batchRawFiles.map((item, idx) => (
              <div key={idx} style={{ 
                background: dm ? '#252525' : '#fff', 
                border: `1px solid ${cardBdr}`, 
                borderRadius: "10px", 
                overflow: "hidden", 
                position: "relative",
                display: "flex",
                alignItems: "center"
              }}>
                {item.previewUrl ? (
                  <img src={item.previewUrl} alt="preview" style={{ width: "60px", height: "60px", objectFit: "cover" }} />
                ) : (
                  <div style={{ width: "60px", height: "60px", background: dm ? '#333' : '#eee', display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px" }}>📸</div>
                )}
                <div style={{ padding: "0 10px", flex: 1, overflow: "hidden" }}>
                  <div style={{ fontSize: "11px", fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", color: dm ? '#ddd' : '#333' }}>
                    {item.name}
                  </div>
                  <div style={{ fontSize: "10px", color: "#999", marginTop: "2px" }}>
                    {item.metadata.model}
                  </div>
                </div>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setBatchRawFiles(prev => prev.filter((_, i) => i !== idx));
                  }}
                  style={{ marginRight: "10px", width: "20px", height: "20px", borderRadius: "50%", background: dm ? '#333' : '#f2f2f8', border: "none", color: "#999", cursor: "pointer", fontSize: "11px", display: "flex", alignItems: "center", justifyContent: "center" }}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Activity Log */}
      <div style={{ marginTop: "4px" }}>
        <div style={{ fontSize: "10px", fontWeight: 700, color: dm ? '#aaa' : '#888', textTransform: "uppercase", marginBottom: "6px", display: "flex", justifyContent: "space-between" }}>
          <span>Activity Log</span>
          {batchLogs.length > 0 && (
            <div style={{ display: "flex", gap: "10px" }}>
              <button 
                onClick={() => {
                  const text = batchLogs.map(l => `[${l.time}] ${l.msg}`).join('\n');
                  navigator.clipboard.writeText(text);
                  addBatchLog("📋 Log copied to clipboard!", "success");
                }}
                style={{ background: "none", border: "none", color: accent, fontSize: "10px", cursor: "pointer", fontWeight: 600 }}
              >
                Copy
              </button>
              <button 
                onClick={() => addBatchLog("__CLEAR__")} 
                style={{ background: "none", border: "none", color: accent, fontSize: "10px", cursor: "pointer", fontWeight: 600 }}
              >
                Clear
              </button>
            </div>
          )}
        </div>
        <div style={{ 
          background: dm ? '#111' : '#f8f8fd', 
          border: `1px solid ${cardBdr}`, 
          borderRadius: "8px", 
          height: "100px", 
          overflowY: "auto", 
          padding: "8px", 
          fontFamily: "monospace", 
          fontSize: "10px" 
        }}>
          {batchLogs.length === 0 ? (
            <div style={{ color: "#999", textAlign: "center", paddingTop: "35px" }}>No activity...</div>
          ) : batchLogs.map((log, i) => (
            <div key={i} style={{ marginBottom: "3px", color: log.type === 'error' ? '#ef4444' : log.type === 'success' ? '#16a34a' : dm ? '#ccc' : '#555' }}>
              <span style={{ color: "#999", marginRight: "6px" }}>[{log.time}]</span> {log.msg}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
