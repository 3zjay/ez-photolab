import { useRef, useEffect, useCallback, memo } from "react";

export const SL = ({ children }) => <div className="text-[11px] font-semibold text-gray-400 tracking-wider uppercase mb-2">{children}</div>;
export const Empty = ({ children }) => (
  <div className="text-xs text-gray-400 text-center p-8 rounded-2xl glass-panel border border-dashed border-gray-500/30 flex flex-col items-center justify-center gap-3 transition-all hover:bg-white/5 cursor-pointer">
    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center text-xl shadow-inner border border-white/10">
      <svg className="w-6 h-6 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
    </div>
    <div className="font-medium">{children}</div>
  </div>
);
export const Row = ({ children }) => <span className="flex items-center justify-center gap-2">{children}</span>;
export const Spin = ({ color = "#fff" }) => <span style={{ borderColor: `${color}44`, borderTopColor: color }} className="inline-block w-3.5 h-3.5 border-2 rounded-full animate-spin shrink-0" />;
export const PBar = ({ value }) => (
  <div className="h-1.5 bg-gray-200/10 rounded-full my-2 overflow-hidden backdrop-blur-sm border border-white/5">
    <div style={{ width: `${value}%` }} className="h-full bg-gradient-to-r from-indigo-500 to-purple-400 transition-all duration-300 rounded-full shadow-[0_0_10px_rgba(99,102,241,0.5)]" />
  </div>
);
export function AB({ children, onClick, disabled, color = "purple", textColor = "#fff", style = {}, className = "" }) {
  const isPurple = color === "purple";
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`relative overflow-hidden flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-[13px] font-semibold transition-all duration-300 ${
        disabled
          ? 'bg-gray-200/10 text-gray-500 cursor-not-allowed border border-white/5'
          : isPurple
            ? 'bg-gradient-to-br from-indigo-500 to-purple-500 text-white shadow-[0_4px_14px_0_rgba(99,102,241,0.39)] hover:shadow-[0_6px_20px_rgba(99,102,241,0.23)] hover:-translate-y-0.5'
            : 'bg-white/10 text-white hover:bg-white/20 border border-white/10 backdrop-blur-md'
      } ${className}`}
      style={!isPurple && !disabled ? { background: color, color: textColor, ...style } : style}
    >
      {children}
    </button>
  );
}

/**
 * SmoothSlider — universal 60fps slider used across the entire app.
 * Zero React re-renders during drag. Track fill updates imperatively via DOM ref.
 * Commits value to state only on pointerUp. Double-click resets to defaultValue.
 *
 * Props:
 *   min, max, step        — range bounds
 *   value                 — controlled value (synced via useEffect when changed externally)
 *   defaultValue          — value to reset to on double-click
 *   onChange(v: number)   — called on pointerUp with the final numeric value
 *   style                 — extra styles on the <input>
 */
export const SmoothSlider = memo(function SmoothSlider({
  min, max, step = 1, value, defaultValue, onChange, style = {}
}) {
  const inputRef = useRef(null);
  const resetVal = defaultValue !== undefined ? defaultValue : value;

  // Sync externally-controlled value → DOM (preset apply, reset all, etc.)
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.value = value;
    const pct = ((value - min) / (max - min)) * 100;
    el.style.setProperty('--v', `${pct.toFixed(2)}%`);
  }, [value, min, max]);

  // During drag: only update the CSS track fill. Zero React re-renders.
  const onInput = useCallback((e) => {
    const pct = ((parseFloat(e.target.value) - min) / (max - min)) * 100;
    e.target.style.setProperty('--v', `${pct.toFixed(2)}%`);
  }, [min, max]);

  // Commit to React state only when the user releases the mouse/touch
  const onPointerUp = useCallback((e) => {
    onChange(parseFloat(e.target.value));
  }, [onChange]);

  // Commit on keyboard adjust finalization (arrow keys, home, end, page keys)
  const onKeyUp = useCallback((e) => {
    const navKeys = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End'];
    if (navKeys.includes(e.key)) {
      onChange(parseFloat(e.target.value));
    }
  }, [onChange]);

  // Double-click resets to default
  const onDoubleClick = useCallback(() => {
    const el = inputRef.current;
    if (!el) return;
    el.value = resetVal;
    const pct = ((resetVal - min) / (max - min)) * 100;
    el.style.setProperty('--v', `${pct.toFixed(2)}%`);
    onChange(resetVal);
  }, [resetVal, min, max, onChange]);

  const pct = ((value - min) / (max - min)) * 100;

  return (
    <input
      ref={inputRef}
      type="range"
      className="sl"
      min={min} max={max} step={step}
      defaultValue={value}
      style={{ '--v': `${pct.toFixed(2)}%`, ...style }}
      onInput={onInput}
      onPointerUp={onPointerUp}
      onKeyUp={onKeyUp}
      onDoubleClick={onDoubleClick}
    />
  );
});
