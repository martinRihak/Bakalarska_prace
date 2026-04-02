import { useState, useEffect } from "react";

const VARIANTS = ["Frosted Glass", "Soft Depth", "Minimal Wire", "Gradient Edge"];

// Fake sensor data
const SENSOR_DATA = {
  temperature: { value: 24.5, unit: "°C", label: "Teplotní senzor", updated: "10:36:56" },
  humidity: { value: 46.5, unit: "%", label: "Vlhkostní senzor", updated: "10:36:56" },
  light: { value: 16256, unit: "Lux", label: "Senzor Intenzity", updated: "10:36:56" },
};

const tempChartPoints = [
  22.5, 22.8, 23.2, 24.0, 24.3, 24.1, 24.5, 24.8, 25.1, 24.9, 24.6, 24.5,
  24.2, 24.0, 24.3, 24.5, 24.7, 25.0, 25.2, 24.8, 24.5, 24.3, 24.1, 24.5,
];
const humChartPoints = [
  39.2, 39.5, 40.1, 40.8, 41.0, 40.5, 40.2, 39.8, 40.5, 41.2, 41.5, 41.0,
  40.8, 41.5, 42.0, 43.2, 44.5, 45.0, 45.8, 46.0, 46.2, 46.5, 46.3, 46.5,
];

function generatePath(points, w, h, padding = 20) {
  const minV = Math.min(...points) - 1;
  const maxV = Math.max(...points) + 1;
  const stepX = (w - padding * 2) / (points.length - 1);
  return points
    .map((p, i) => {
      const x = padding + i * stepX;
      const y = padding + ((maxV - p) / (maxV - minV)) * (h - padding * 2);
      return `${i === 0 ? "M" : "L"}${x},${y}`;
    })
    .join(" ");
}

function generateAreaPath(points, w, h, padding = 20) {
  const line = generatePath(points, w, h, padding);
  const minV = Math.min(...points) - 1;
  const maxV = Math.max(...points) + 1;
  const stepX = (w - padding * 2) / (points.length - 1);
  const lastX = padding + (points.length - 1) * stepX;
  return `${line} L${lastX},${h - padding} L${padding},${h - padding} Z`;
}

// ─── Icons ──────────────────────────────
function ThermometerIcon({ size = 48, color = "#ef4444" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <rect x="18" y="4" width="12" height="30" rx="6" stroke={color} strokeWidth="2.5" fill="none" />
      <circle cx="24" cy="36" r="8" fill={color} opacity="0.15" stroke={color} strokeWidth="2.5" />
      <circle cx="24" cy="36" r="4" fill={color} />
      <rect x="22" y="16" width="4" height="16" rx="2" fill={color} />
    </svg>
  );
}

function DropIcon({ size = 48, color = "#3b82f6" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <path
        d="M24 6C24 6 10 22 10 32a14 14 0 0028 0C38 22 24 6 24 6z"
        fill={color}
        opacity="0.15"
        stroke={color}
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <path d="M20 30a6 6 0 006 6" stroke="white" strokeWidth="2" strokeLinecap="round" opacity="0.6" />
    </svg>
  );
}

function SunIcon({ size = 32, color = "#eab308" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <circle cx="16" cy="16" r="6" fill={color} opacity="0.2" stroke={color} strokeWidth="2" />
      {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
        <line
          key={a}
          x1={16 + 9 * Math.cos((a * Math.PI) / 180)}
          y1={16 + 9 * Math.sin((a * Math.PI) / 180)}
          x2={16 + 12 * Math.cos((a * Math.PI) / 180)}
          y2={16 + 12 * Math.sin((a * Math.PI) / 180)}
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
        />
      ))}
    </svg>
  );
}

function RefreshIcon({ color = "currentColor" }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke={color} strokeWidth="1.5">
      <path d="M2 8a6 6 0 0110.5-4M14 8a6 6 0 01-10.5 4" strokeLinecap="round" />
      <path d="M12.5 1v3h-3M3.5 15v-3h3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CloseIcon({ color = "currentColor" }) {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke={color} strokeWidth="1.5">
      <path d="M3 3l8 8M11 3l-8 8" strokeLinecap="round" />
    </svg>
  );
}

// ─── Toggle ─────────────────────────
function Toggle({ on = true, accent = "#22c55e", size = "sm" }) {
  const w = size === "sm" ? 36 : 44;
  const h = size === "sm" ? 20 : 24;
  const dot = size === "sm" ? 14 : 18;
  return (
    <div
      style={{
        width: w, height: h, borderRadius: h,
        background: on ? accent : "rgba(128,128,128,0.3)",
        position: "relative", transition: "background 0.2s", cursor: "pointer",
      }}
    >
      <div
        style={{
          width: dot, height: dot, borderRadius: "50%", background: "#fff",
          position: "absolute", top: (h - dot) / 2,
          left: on ? w - dot - 3 : 3, transition: "left 0.2s",
          boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
        }}
      />
    </div>
  );
}

// ─── Chart Components ───────────────
function LineChart({ points, w, h, color, dark, glass }) {
  const path = generatePath(points, w, h);
  const gridColor = dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)";
  return (
    <svg width="100%" height="100%" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
      {[0.25, 0.5, 0.75].map((f) => (
        <line key={f} x1="20" y1={h * f} x2={w - 20} y2={h * f} stroke={gridColor} strokeWidth="1" />
      ))}
      <defs>
        <linearGradient id={`lg-${color.replace("#", "")}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={generateAreaPath(points, w, h)} fill={`url(#lg-${color.replace("#", "")})`} />
      <path d={path} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function AreaChart({ points, w, h, color, dark }) {
  const areaPath = generateAreaPath(points, w, h);
  const linePath = generatePath(points, w, h);
  const gridColor = dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)";
  return (
    <svg width="100%" height="100%" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
      {[0.25, 0.5, 0.75].map((f) => (
        <line key={f} x1="20" y1={h * f} x2={w - 20} y2={h * f} stroke={gridColor} strokeWidth="1" />
      ))}
      <defs>
        <linearGradient id={`ag-${color.replace("#", "")}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0.03" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#ag-${color.replace("#", "")})`} />
      <path d={linePath} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ─── Shared Styles ──────────────────
function getTheme(dark) {
  return {
    bg: dark ? "#0f1117" : "#f0f2f5",
    surface: dark ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.7)",
    sidebar: "#1e3a8a",
    sidebarActive: "#3b82f6",
    text: dark ? "#f1f5f9" : "#0f172a",
    textSecondary: dark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.45)",
    border: dark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)",
    accent: "#3b82f6",
    red: "#ef4444",
    green: "#22c55e",
    yellow: "#eab308",
  };
}

// ════════════════════════════════════════════
//  VARIANT 1 — Frosted Glass
// ════════════════════════════════════════════
function FrostedGlass({ dark }) {
  const t = getTheme(dark);
  const card = {
    background: dark ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.55)",
    backdropFilter: "blur(24px) saturate(1.4)",
    WebkitBackdropFilter: "blur(24px) saturate(1.4)",
    borderRadius: 16,
    border: `1px solid ${dark ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.8)"}`,
    boxShadow: dark
      ? "0 8px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.05)"
      : "0 8px 32px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.9)",
    padding: 20,
    position: "relative",
    overflow: "hidden",
  };
  const cardHeader = {
    display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16,
  };
  const cardTitle = { fontSize: 13, fontWeight: 600, letterSpacing: "0.02em", color: t.text, opacity: 0.8 };
  const controls = { display: "flex", gap: 8, alignItems: "center" };
  const iconBtn = {
    width: 28, height: 28, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center",
    background: dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)", border: "none", cursor: "pointer",
    color: t.textSecondary,
  };
  const bigValue = { fontSize: 36, fontWeight: 300, color: t.text, letterSpacing: "-0.02em" };
  const unitStyle = { fontSize: 16, fontWeight: 400, opacity: 0.5 };
  const timeLabel = { fontSize: 11, color: t.textSecondary, marginTop: 8 };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1.8fr 1fr", gridTemplateRows: "auto auto", gap: 16, padding: 24 }}>
      {/* Temp value */}
      <div style={card}>
        <div style={cardHeader}>
          <span style={cardTitle}>Teplota</span>
          <div style={controls}><Toggle on accent={t.green} /><button style={iconBtn}><CloseIcon /></button><button style={iconBtn}><RefreshIcon /></button></div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16, justifyContent: "center", padding: "12px 0" }}>
          <ThermometerIcon size={56} color={t.red} />
          <div>
            <div style={bigValue}>24.5<span style={unitStyle}> °C</span></div>
          </div>
        </div>
        <div style={timeLabel}>Aktualizace: 10:36:56</div>
      </div>

      {/* Temp chart */}
      <div style={card}>
        <div style={cardHeader}>
          <span style={cardTitle}>Teplota — průběh</span>
          <div style={controls}>
            <select style={{ fontSize: 11, background: "transparent", border: `1px solid ${t.border}`, borderRadius: 6, padding: "3px 8px", color: t.text, outline: "none" }}>
              <option>7 dní</option><option>24 hodin</option>
            </select>
            <Toggle on accent={t.green} />
            <button style={iconBtn}><RefreshIcon /></button>
          </div>
        </div>
        <div style={{ height: 160 }}>
          <LineChart points={tempChartPoints} w={520} h={160} color={t.accent} dark={dark} />
        </div>
        <div style={timeLabel}>Aktualizace: 10:36:56</div>
      </div>

      {/* Light */}
      <div style={card}>
        <div style={cardHeader}>
          <span style={cardTitle}>Intenzita světla</span>
          <div style={controls}><Toggle on accent={t.green} /><button style={iconBtn}><RefreshIcon /></button></div>
        </div>
        <div style={{ textAlign: "center", padding: "16px 0" }}>
          <SunIcon size={36} color={t.yellow} />
          <div style={{ ...bigValue, marginTop: 8 }}>16 256<span style={unitStyle}> Lux</span></div>
        </div>
        <div style={timeLabel}>Aktualizace: 10:36:56</div>
      </div>

      {/* Humidity chart */}
      <div style={{ ...card, gridColumn: "1 / 3" }}>
        <div style={cardHeader}>
          <span style={cardTitle}>Vlhkost — průběh</span>
          <div style={controls}>
            <select style={{ fontSize: 11, background: "transparent", border: `1px solid ${t.border}`, borderRadius: 6, padding: "3px 8px", color: t.text, outline: "none" }}>
              <option>7 dní</option><option>24 hodin</option>
            </select>
            <Toggle on accent={t.green} />
            <button style={iconBtn}><RefreshIcon /></button>
          </div>
        </div>
        <div style={{ height: 150 }}>
          <AreaChart points={humChartPoints} w={680} h={150} color={t.accent} dark={dark} />
        </div>
        <div style={timeLabel}>Aktualizace: 10:36:56</div>
      </div>

      {/* Humidity value */}
      <div style={card}>
        <div style={cardHeader}>
          <span style={cardTitle}>Vlhkost</span>
          <div style={controls}><Toggle on accent={t.green} /><button style={iconBtn}><RefreshIcon /></button></div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, justifyContent: "center", padding: "12px 0" }}>
          <DropIcon size={52} color={t.accent} />
          <div style={bigValue}>46.5<span style={unitStyle}> %</span></div>
        </div>
        <div style={timeLabel}>Aktualizace: 10:36:56</div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════
//  VARIANT 2 — Soft Depth
// ════════════════════════════════════════════
function SoftDepth({ dark }) {
  const t = getTheme(dark);
  const card = {
    background: dark ? "rgba(255,255,255,0.035)" : "rgba(255,255,255,0.65)",
    backdropFilter: "blur(16px)",
    WebkitBackdropFilter: "blur(16px)",
    borderRadius: 20,
    border: `1px solid ${dark ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.9)"}`,
    boxShadow: dark
      ? "0 4px 24px rgba(0,0,0,0.4), 0 1px 2px rgba(0,0,0,0.2)"
      : "0 4px 20px rgba(0,0,0,0.04), 0 1px 3px rgba(0,0,0,0.06)",
    padding: 24,
  };
  const pill = {
    fontSize: 10, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase",
    padding: "4px 10px", borderRadius: 20,
    background: dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
    color: t.textSecondary, display: "inline-block",
  };
  const bigValue = { fontSize: 42, fontWeight: 200, color: t.text, letterSpacing: "-0.03em", lineHeight: 1 };
  const unitStyle = { fontSize: 18, fontWeight: 400, opacity: 0.4 };
  const controls = { display: "flex", gap: 6, alignItems: "center" };
  const iconBtn = {
    width: 30, height: 30, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center",
    background: dark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)",
    border: `1px solid ${dark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)"}`,
    cursor: "pointer", color: t.textSecondary,
  };
  const timeLabel = { fontSize: 11, color: t.textSecondary, marginTop: 12 };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, padding: 24 }}>
      {/* Temp */}
      <div style={card}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
          <span style={pill}>Teplota</span>
          <div style={controls}><Toggle on accent={t.green} /><button style={iconBtn}><CloseIcon /></button><button style={iconBtn}><RefreshIcon /></button></div>
        </div>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 16 }}>
          <ThermometerIcon size={64} color={t.red} />
          <div>
            <div style={bigValue}>24.5<span style={unitStyle}>°C</span></div>
            <div style={timeLabel}>10:36:56</div>
          </div>
        </div>
      </div>

      {/* Light */}
      <div style={card}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
          <span style={pill}>Světlo</span>
          <div style={controls}><Toggle on accent={t.green} /><button style={iconBtn}><CloseIcon /></button><button style={iconBtn}><RefreshIcon /></button></div>
        </div>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 16 }}>
          <SunIcon size={48} color={t.yellow} />
          <div>
            <div style={bigValue}>16 256<span style={unitStyle}> Lux</span></div>
            <div style={timeLabel}>10:36:56</div>
          </div>
        </div>
      </div>

      {/* Humidity */}
      <div style={card}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
          <span style={pill}>Vlhkost</span>
          <div style={controls}><Toggle on accent={t.green} /><button style={iconBtn}><CloseIcon /></button><button style={iconBtn}><RefreshIcon /></button></div>
        </div>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 16 }}>
          <DropIcon size={56} color={t.accent} />
          <div>
            <div style={bigValue}>46.5<span style={unitStyle}>%</span></div>
            <div style={timeLabel}>10:36:56</div>
          </div>
        </div>
      </div>

      {/* Temp chart — full width */}
      <div style={{ ...card, gridColumn: "1 / -1" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
          <span style={pill}>Teplota — průběh</span>
          <div style={controls}>
            <select style={{ fontSize: 11, background: "transparent", border: `1px solid ${t.border}`, borderRadius: 8, padding: "4px 10px", color: t.text, outline: "none" }}>
              <option>7 dní</option><option>24 hodin</option>
            </select>
            <Toggle on accent={t.green} />
            <button style={iconBtn}><RefreshIcon /></button>
          </div>
        </div>
        <div style={{ height: 140 }}>
          <LineChart points={tempChartPoints} w={900} h={140} color={t.accent} dark={dark} />
        </div>
      </div>

      {/* Humidity chart — full width */}
      <div style={{ ...card, gridColumn: "1 / -1" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
          <span style={pill}>Vlhkost — průběh</span>
          <div style={controls}>
            <select style={{ fontSize: 11, background: "transparent", border: `1px solid ${t.border}`, borderRadius: 8, padding: "4px 10px", color: t.text, outline: "none" }}>
              <option>7 dní</option><option>24 hodin</option>
            </select>
            <Toggle on accent={t.green} />
            <button style={iconBtn}><RefreshIcon /></button>
          </div>
        </div>
        <div style={{ height: 140 }}>
          <AreaChart points={humChartPoints} w={900} h={140} color={t.accent} dark={dark} />
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════
//  VARIANT 3 — Minimal Wire
// ════════════════════════════════════════════
function MinimalWire({ dark }) {
  const t = getTheme(dark);
  const card = {
    background: dark ? "rgba(255,255,255,0.02)" : "rgba(255,255,255,0.45)",
    backdropFilter: "blur(12px)",
    WebkitBackdropFilter: "blur(12px)",
    borderRadius: 12,
    border: `1px solid ${t.border}`,
    padding: 20,
  };
  const label = { fontSize: 11, fontWeight: 500, color: t.textSecondary, letterSpacing: "0.04em", textTransform: "uppercase" };
  const bigValue = { fontSize: 32, fontWeight: 300, color: t.text, letterSpacing: "-0.02em", marginTop: 8 };
  const unitStyle = { fontSize: 14, opacity: 0.4 };
  const row = { display: "flex", justifyContent: "space-between", alignItems: "center" };
  const controls = { display: "flex", gap: 6, alignItems: "center" };
  const iconBtn = {
    width: 26, height: 26, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center",
    background: "transparent", border: `1px solid ${t.border}`, cursor: "pointer", color: t.textSecondary,
  };
  const separator = { height: 1, background: t.border, margin: "12px 0" };
  const timeLabel = { fontSize: 10, color: t.textSecondary };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12, padding: 24 }}>
      {/* Temp */}
      <div style={card}>
        <div style={row}><span style={label}>Teplota</span><div style={controls}><Toggle on accent={t.green} /><button style={iconBtn}><RefreshIcon /></button></div></div>
        <div style={separator} />
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <ThermometerIcon size={40} color={t.red} />
          <div style={bigValue}>24.5<span style={unitStyle}> °C</span></div>
        </div>
        <div style={{ ...timeLabel, marginTop: 12 }}>10:36:56</div>
      </div>

      {/* Temp chart */}
      <div style={{ ...card, gridColumn: "2 / 4" }}>
        <div style={row}>
          <span style={label}>Teplota — line</span>
          <div style={controls}>
            <select style={{ fontSize: 10, background: "transparent", border: `1px solid ${t.border}`, borderRadius: 4, padding: "2px 6px", color: t.text, outline: "none" }}>
              <option>7d</option><option>24h</option>
            </select>
            <button style={iconBtn}><RefreshIcon /></button>
          </div>
        </div>
        <div style={separator} />
        <div style={{ height: 120 }}>
          <LineChart points={tempChartPoints} w={460} h={120} color={t.accent} dark={dark} />
        </div>
      </div>

      {/* Light */}
      <div style={card}>
        <div style={row}><span style={label}>Světlo</span><div style={controls}><Toggle on accent={t.green} /><button style={iconBtn}><RefreshIcon /></button></div></div>
        <div style={separator} />
        <div style={{ textAlign: "center" }}>
          <SunIcon size={28} color={t.yellow} />
          <div style={bigValue}>16 256<span style={unitStyle}> Lux</span></div>
        </div>
        <div style={{ ...timeLabel, marginTop: 12 }}>10:36:56</div>
      </div>

      {/* Humidity */}
      <div style={card}>
        <div style={row}><span style={label}>Vlhkost</span><div style={controls}><Toggle on accent={t.green} /><button style={iconBtn}><RefreshIcon /></button></div></div>
        <div style={separator} />
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <DropIcon size={40} color={t.accent} />
          <div style={bigValue}>46.5<span style={unitStyle}> %</span></div>
        </div>
        <div style={{ ...timeLabel, marginTop: 12 }}>10:36:56</div>
      </div>

      {/* Humidity chart */}
      <div style={{ ...card, gridColumn: "2 / 5" }}>
        <div style={row}>
          <span style={label}>Vlhkost — area</span>
          <div style={controls}>
            <select style={{ fontSize: 10, background: "transparent", border: `1px solid ${t.border}`, borderRadius: 4, padding: "2px 6px", color: t.text, outline: "none" }}>
              <option>7d</option><option>24h</option>
            </select>
            <button style={iconBtn}><RefreshIcon /></button>
          </div>
        </div>
        <div style={separator} />
        <div style={{ height: 120 }}>
          <AreaChart points={humChartPoints} w={620} h={120} color={t.accent} dark={dark} />
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════
//  VARIANT 4 — Gradient Edge
// ════════════════════════════════════════════
function GradientEdge({ dark }) {
  const t = getTheme(dark);

  function GlowCard({ children, accentColor, style: s = {} }) {
    return (
      <div style={{
        background: dark ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.6)",
        backdropFilter: "blur(20px) saturate(1.3)",
        WebkitBackdropFilter: "blur(20px) saturate(1.3)",
        borderRadius: 16,
        border: `1px solid ${dark ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.85)"}`,
        boxShadow: dark
          ? `0 8px 32px rgba(0,0,0,0.3), 0 0 0 1px ${accentColor}15`
          : `0 4px 24px rgba(0,0,0,0.05), 0 0 0 1px ${accentColor}10`,
        padding: 22, position: "relative", overflow: "hidden", ...s,
      }}>
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0, height: 3,
          background: `linear-gradient(90deg, ${accentColor}, ${accentColor}00)`,
          borderRadius: "16px 16px 0 0",
        }} />
        {children}
      </div>
    );
  }

  const label = { fontSize: 12, fontWeight: 600, color: t.textSecondary, letterSpacing: "0.03em" };
  const bigValue = { fontSize: 38, fontWeight: 200, color: t.text, letterSpacing: "-0.03em" };
  const unitStyle = { fontSize: 16, opacity: 0.4 };
  const controls = { display: "flex", gap: 6, alignItems: "center" };
  const iconBtn = {
    width: 28, height: 28, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center",
    background: dark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)", border: "none", cursor: "pointer", color: t.textSecondary,
  };
  const timeLabel = { fontSize: 10, color: t.textSecondary, marginTop: 10 };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gridTemplateRows: "auto auto auto", gap: 16, padding: 24 }}>
      {/* Temp */}
      <GlowCard accentColor={t.red}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
          <span style={label}>Teplota</span>
          <div style={controls}><Toggle on accent={t.green} /><button style={iconBtn}><CloseIcon /></button><button style={iconBtn}><RefreshIcon /></button></div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 14, justifyContent: "center" }}>
          <ThermometerIcon size={52} color={t.red} />
          <div style={bigValue}>24.5<span style={unitStyle}> °C</span></div>
        </div>
        <div style={timeLabel}>10:36:56</div>
      </GlowCard>

      {/* Light */}
      <GlowCard accentColor={t.yellow}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
          <span style={label}>Intenzita světla</span>
          <div style={controls}><Toggle on accent={t.green} /><button style={iconBtn}><CloseIcon /></button><button style={iconBtn}><RefreshIcon /></button></div>
        </div>
        <div style={{ textAlign: "center" }}>
          <SunIcon size={36} color={t.yellow} />
          <div style={{ ...bigValue, marginTop: 8 }}>16 256<span style={unitStyle}> Lux</span></div>
        </div>
        <div style={timeLabel}>10:36:56</div>
      </GlowCard>

      {/* Humidity */}
      <GlowCard accentColor={t.accent}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
          <span style={label}>Vlhkost</span>
          <div style={controls}><Toggle on accent={t.green} /><button style={iconBtn}><CloseIcon /></button><button style={iconBtn}><RefreshIcon /></button></div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 14, justifyContent: "center" }}>
          <DropIcon size={52} color={t.accent} />
          <div style={bigValue}>46.5<span style={unitStyle}> %</span></div>
        </div>
        <div style={timeLabel}>10:36:56</div>
      </GlowCard>

      {/* Temp chart */}
      <GlowCard accentColor={t.accent} style={{ gridColumn: "1 / -1" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
          <span style={label}>Teplota — průběh</span>
          <div style={controls}>
            <select style={{ fontSize: 11, background: "transparent", border: `1px solid ${t.border}`, borderRadius: 6, padding: "3px 8px", color: t.text, outline: "none" }}>
              <option>7 dní</option><option>24 hodin</option>
            </select>
            <Toggle on accent={t.green} /><button style={iconBtn}><RefreshIcon /></button>
          </div>
        </div>
        <div style={{ height: 140 }}>
          <LineChart points={tempChartPoints} w={900} h={140} color={t.accent} dark={dark} />
        </div>
      </GlowCard>

      {/* Humidity chart */}
      <GlowCard accentColor={t.accent} style={{ gridColumn: "1 / -1" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
          <span style={label}>Vlhkost — průběh</span>
          <div style={controls}>
            <select style={{ fontSize: 11, background: "transparent", border: `1px solid ${t.border}`, borderRadius: 6, padding: "3px 8px", color: t.text, outline: "none" }}>
              <option>7 dní</option><option>24 hodin</option>
            </select>
            <Toggle on accent={t.green} /><button style={iconBtn}><RefreshIcon /></button>
          </div>
        </div>
        <div style={{ height: 140 }}>
          <AreaChart points={humChartPoints} w={900} h={140} color={t.accent} dark={dark} />
        </div>
      </GlowCard>
    </div>
  );
}

// ════════════════════════════════════════════
//  SIDEBAR + NAV
// ════════════════════════════════════════════
function Sidebar({ dark }) {
  const items = ["Domů", "Senzory", "Data Export", "Uživatelé"];
  return (
    <div style={{
      width: 180, background: dark ? "rgba(30,58,138,0.6)" : "rgba(30,58,138,0.85)",
      backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)",
      display: "flex", flexDirection: "column", padding: "20px 0",
      borderRight: `1px solid ${dark ? "rgba(255,255,255,0.06)" : "rgba(30,58,138,0.15)"}`,
      minHeight: "100%",
    }}>
      {items.map((item, i) => (
        <div key={item} style={{
          padding: "12px 24px", fontSize: 13, fontWeight: i === 0 ? 600 : 400,
          color: "rgba(255,255,255,0.9)", cursor: "pointer",
          background: i === 0 ? "rgba(59,130,246,0.4)" : "transparent",
          borderLeft: i === 0 ? "3px solid #60a5fa" : "3px solid transparent",
          transition: "all 0.15s",
        }}>
          {item}
        </div>
      ))}
      <div style={{ flex: 1 }} />
      <div style={{
        padding: "12px 24px", fontSize: 12, color: "rgba(255,255,255,0.5)",
        borderTop: "1px solid rgba(255,255,255,0.08)", marginTop: 12, cursor: "pointer",
      }}>
        Odhlásit se
      </div>
    </div>
  );
}

function TopBar({ dark, onToggleDark }) {
  const t = getTheme(dark);
  return (
    <div style={{
      height: 52, display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "0 24px",
      background: dark ? "rgba(255,255,255,0.02)" : "rgba(255,255,255,0.4)",
      backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)",
      borderBottom: `1px solid ${t.border}`,
    }}>
      <div style={{ display: "flex", gap: 10 }}>
        <button style={{
          fontSize: 11, fontWeight: 600, padding: "6px 14px", borderRadius: 8,
          background: dark ? "rgba(59,130,246,0.15)" : "rgba(59,130,246,0.1)",
          border: `1px solid ${dark ? "rgba(59,130,246,0.3)" : "rgba(59,130,246,0.2)"}`,
          color: t.accent, cursor: "pointer",
        }}>+ Dashboard</button>
        <button style={{
          fontSize: 11, fontWeight: 600, padding: "6px 14px", borderRadius: 8,
          background: dark ? "rgba(59,130,246,0.15)" : "rgba(59,130,246,0.1)",
          border: `1px solid ${dark ? "rgba(59,130,246,0.3)" : "rgba(59,130,246,0.2)"}`,
          color: t.accent, cursor: "pointer",
        }}>+ Widget</button>
        <select style={{
          fontSize: 12, padding: "6px 12px", borderRadius: 8,
          background: dark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)",
          border: `1px solid ${t.border}`, color: t.text, outline: "none", minWidth: 160,
        }}>
          <option>Test</option>
        </select>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <button onClick={onToggleDark} style={{
          width: 34, height: 34, borderRadius: 10, border: `1px solid ${t.border}`,
          background: dark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)",
          cursor: "pointer", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center",
          color: t.text,
        }}>{dark ? "☀️" : "🌙"}</button>
        <span style={{ fontSize: 12, color: t.textSecondary }}>test | 10:37:15 | 02. 04. 2026</span>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════
//  MAIN APP
// ════════════════════════════════════════════
export default function App() {
  const [variant, setVariant] = useState(0);
  const [dark, setDark] = useState(true);
  const t = getTheme(dark);

  const VariantComponent = [FrostedGlass, SoftDepth, MinimalWire, GradientEdge][variant];

  return (
    <div style={{
      width: "100%", minHeight: "100vh", fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
      background: dark
        ? "radial-gradient(ellipse at 20% 0%, rgba(30,58,138,0.15) 0%, #0f1117 60%)"
        : "radial-gradient(ellipse at 20% 0%, rgba(59,130,246,0.06) 0%, #f0f2f5 60%)",
      color: t.text, display: "flex", transition: "background 0.3s",
    }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@200;300;400;500;600;700&display=swap" rel="stylesheet" />

      <Sidebar dark={dark} />

      <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: "100vh" }}>
        <TopBar dark={dark} onToggleDark={() => setDark(!dark)} />

        {/* Variant tabs */}
        <div style={{
          display: "flex", gap: 4, padding: "16px 24px 0",
        }}>
          {VARIANTS.map((name, i) => (
            <button
              key={name}
              onClick={() => setVariant(i)}
              style={{
                fontSize: 12, fontWeight: variant === i ? 600 : 400,
                padding: "8px 18px", borderRadius: 10, cursor: "pointer",
                background: variant === i
                  ? (dark ? "rgba(59,130,246,0.15)" : "rgba(59,130,246,0.1)")
                  : "transparent",
                border: variant === i
                  ? `1px solid ${dark ? "rgba(59,130,246,0.3)" : "rgba(59,130,246,0.25)"}`
                  : `1px solid transparent`,
                color: variant === i ? t.accent : t.textSecondary,
                transition: "all 0.15s",
              }}
            >
              {name}
            </button>
          ))}
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflow: "auto" }}>
          <VariantComponent dark={dark} />
        </div>
      </div>
    </div>
  );
}