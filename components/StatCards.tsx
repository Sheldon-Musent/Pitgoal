"use client";

interface StatCardsProps {
  energy: number;
  tasksDone: number;
  hoursTracked: string;
  sleepRestoreRate: number;
  isSleeping: boolean;
  onCardClick: (index: number) => void;
  onSleepToggle: () => void;
  isDesktop: boolean;
}

const getEnergyColor = (energy: number): string => {
  if (energy > 50) return '#22c55e';
  if (energy >= 20) return '#facc15';
  return '#ef4444';
};

export default function StatCards({ energy, tasksDone, hoursTracked, sleepRestoreRate, isSleeping, onCardClick, onSleepToggle, isDesktop }: StatCardsProps) {
  const ePct = Math.round(energy);
  const energyColor = getEnergyColor(energy);
  const hrsToFull = sleepRestoreRate > 0 ? Math.round(((100 - ePct) / sleepRestoreRate) * 10) / 10 : 0;

  const numSize = isDesktop ? 34 : 26;
  const labelSize = isDesktop ? 12 : 10;
  const descSize = isDesktop ? 11 : 9;
  const pctSymSize = isDesktop ? 15 : 12;
  const radius = isDesktop ? 16 : 14;
  const pad = isDesktop ? 16 : 14;

  const cardBase: React.CSSProperties = {
    background: "transparent",
    border: "1px solid rgba(255,255,255,0.06)",
    borderRadius: radius,
    padding: pad,
    overflow: "hidden",
    position: "relative",
    aspectRatio: "1 / 1",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    cursor: "pointer",
    flex: 1,
  };

  const textLayer: React.CSSProperties = { position: "relative", zIndex: 1 };

  return (
    <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
      {/* ── DONE Card ── */}
      <div className="tap" onClick={() => onCardClick(0)} style={cardBase}>
        <div style={textLayer}>
          <div style={{ fontSize: numSize, fontWeight: 800, color: "#22c55e", lineHeight: 1 }}>{tasksDone}</div>
        </div>
        <div style={textLayer}>
          <div style={{ fontSize: labelSize, fontWeight: 600, color: "rgba(255,255,255,0.9)", lineHeight: 1 }}>TASKS</div>
          <div style={{ fontSize: descSize, fontWeight: 400, fontStyle: "italic", color: "rgba(255,255,255,0.3)", lineHeight: 1, marginTop: 2 }}>completed today</div>
        </div>
        {/* SVG: paper with checkmarks */}
        <svg
          viewBox="0 0 120 150"
          style={{ position: "absolute", right: -40, top: -30, bottom: -16, height: "calc(100% + 46px)", width: "auto" }}
        >
          <g transform="rotate(-7.8, 60, 75)">
            <path d="M20 8 L100 8 Q100 8 100 12 L100 142 Q100 146 96 146 L24 146 Q20 146 20 142 Z" fill="rgba(255,255,255,0.025)" />
            {/* Row 1 y=36 */}
            <rect x="40" y="36" width="16" height="16" rx="3" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="1.5" />
            <rect x="62" y="42" width="26" height="3" rx="1.5" fill="rgba(255,255,255,0.04)" />
            <path d="M44 43 L47 47" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="8" strokeDashoffset="8">
              <animate attributeName="stroke-dashoffset" values="8;8;0;0;0;0;0;0;0;0" dur="7s" repeatCount="indefinite" keyTimes="0;0.08;0.12;0.3;0.5;0.65;0.75;0.82;0.9;1" />
              <animate attributeName="opacity" values="0;1;1;1;1;1;1;0.6;0.2;0" dur="7s" repeatCount="indefinite" keyTimes="0;0.08;0.3;0.5;0.65;0.75;0.8;0.85;0.92;1" />
            </path>
            <path d="M47 47 L58 33" fill="none" stroke="#22c55e" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="20" strokeDashoffset="20">
              <animate attributeName="stroke-dashoffset" values="20;20;20;0;0;0;0;0;0;0" dur="7s" repeatCount="indefinite" keyTimes="0;0.12;0.13;0.18;0.3;0.5;0.65;0.75;0.9;1" />
              <animate attributeName="opacity" values="0;1;1;1;1;1;1;0.6;0.2;0" dur="7s" repeatCount="indefinite" keyTimes="0;0.08;0.3;0.5;0.65;0.75;0.8;0.85;0.92;1" />
            </path>
            {/* Row 2 y=60 */}
            <rect x="40" y="60" width="16" height="16" rx="3" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="1.5" />
            <rect x="62" y="66" width="20" height="3" rx="1.5" fill="rgba(255,255,255,0.04)" />
            <path d="M44 67 L47 71" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="8" strokeDashoffset="8">
              <animate attributeName="stroke-dashoffset" values="8;8;8;0;0;0;0;0;0;0" dur="7s" repeatCount="indefinite" keyTimes="0;0.22;0.24;0.28;0.4;0.5;0.65;0.75;0.9;1" />
              <animate attributeName="opacity" values="0;0;1;1;1;1;1;1;0.4;0" dur="7s" repeatCount="indefinite" keyTimes="0;0.22;0.28;0.5;0.65;0.75;0.8;0.85;0.92;1" />
            </path>
            <path d="M47 71 L58 57" fill="none" stroke="#22c55e" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="20" strokeDashoffset="20">
              <animate attributeName="stroke-dashoffset" values="20;20;20;20;0;0;0;0;0;0" dur="7s" repeatCount="indefinite" keyTimes="0;0.28;0.29;0.3;0.36;0.5;0.65;0.75;0.9;1" />
              <animate attributeName="opacity" values="0;0;1;1;1;1;1;1;0.4;0" dur="7s" repeatCount="indefinite" keyTimes="0;0.22;0.28;0.5;0.65;0.75;0.8;0.85;0.92;1" />
            </path>
            {/* Row 3 y=84 */}
            <rect x="40" y="84" width="16" height="16" rx="3" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="1.5" />
            <rect x="62" y="90" width="30" height="3" rx="1.5" fill="rgba(255,255,255,0.04)" />
            <path d="M44 91 L47 95" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="8" strokeDashoffset="8">
              <animate attributeName="stroke-dashoffset" values="8;8;8;8;0;0;0;0;0;0" dur="7s" repeatCount="indefinite" keyTimes="0;0.36;0.38;0.4;0.44;0.5;0.65;0.75;0.9;1" />
              <animate attributeName="opacity" values="0;0;0;1;1;1;1;1;0.6;0" dur="7s" repeatCount="indefinite" keyTimes="0;0.36;0.4;0.5;0.65;0.75;0.8;0.85;0.92;1" />
            </path>
            <path d="M47 95 L58 81" fill="none" stroke="#22c55e" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="20" strokeDashoffset="20">
              <animate attributeName="stroke-dashoffset" values="20;20;20;20;20;0;0;0;0;0" dur="7s" repeatCount="indefinite" keyTimes="0;0.4;0.42;0.44;0.46;0.52;0.65;0.75;0.9;1" />
              <animate attributeName="opacity" values="0;0;0;1;1;1;1;1;0.6;0" dur="7s" repeatCount="indefinite" keyTimes="0;0.36;0.4;0.5;0.65;0.75;0.8;0.85;0.92;1" />
            </path>
          </g>
        </svg>
      </div>

      {/* ── TRACKED Card ── */}
      <div className="tap" onClick={() => onCardClick(1)} style={cardBase}>
        <div style={textLayer}>
          <div style={{ fontSize: numSize, fontWeight: 800, color: "#facc15", lineHeight: 1 }}>{hoursTracked}</div>
        </div>
        <div style={textLayer}>
          <div style={{ fontSize: labelSize, fontWeight: 600, color: "rgba(255,255,255,0.9)", lineHeight: 1 }}>HRS</div>
          <div style={{ fontSize: descSize, fontWeight: 400, fontStyle: "italic", color: "rgba(255,255,255,0.3)", lineHeight: 1, marginTop: 2 }}>tracked today</div>
        </div>
        {/* SVG: stopwatch */}
        <svg
          viewBox="0 0 120 140"
          style={{ position: "absolute", right: -49, top: -29, bottom: -29, height: "calc(100% + 58px)", width: "auto" }}
        >
          <g transform="rotate(-7.8, 60, 70)">
            <circle cx="60" cy="70" r="48" fill="rgba(255,255,255,0.025)" />
            <circle cx="60" cy="70" r="3" fill="#facc15" />
            <line x1="60" y1="70" x2="60" y2="44" stroke="#facc15" strokeWidth="2.5" strokeLinecap="round">
              <animateTransform attributeName="transform" type="rotate" from="0 60 70" to="360 60 70" dur="14s" repeatCount="indefinite" />
            </line>
            <line x1="60" y1="70" x2="60" y2="32" stroke="rgba(255,255,255,0.2)" strokeWidth="1" strokeLinecap="round">
              <animateTransform attributeName="transform" type="rotate" from="0 60 70" to="360 60 70" dur="3s" repeatCount="indefinite" />
            </line>
          </g>
        </svg>
      </div>

      {/* ── POWER BAR Card ── */}
      <div className="tap" onClick={() => onCardClick(2)} style={cardBase}>
        {/* Sleep/Wake button */}
        <div
          onClick={(e) => { e.stopPropagation(); onSleepToggle(); }}
          style={{
            position: "absolute", top: 6, right: 6, width: 22, height: 22, borderRadius: "50%",
            background: "rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", zIndex: 2,
          }}
        >
          {isSleeping ? (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={energyColor} strokeWidth="2">
              <circle cx="12" cy="12" r="5" /><line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" />
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
              <line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" />
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
            </svg>
          ) : (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="2">
              <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
            </svg>
          )}
        </div>
        <div style={textLayer}>
          <div style={{ display: "flex", alignItems: "baseline" }}>
            <span style={{ fontSize: numSize, fontWeight: 800, color: energyColor, lineHeight: 1 }}>{ePct}</span>
            <span style={{ fontSize: pctSymSize, fontWeight: 700, color: energyColor }}>%</span>
          </div>
        </div>
        <div style={textLayer}>
          <div style={{ fontSize: labelSize, fontWeight: 600, color: "rgba(255,255,255,0.9)", lineHeight: 1 }}>{hrsToFull} hrs</div>
          <div style={{ fontSize: descSize, fontWeight: 400, fontStyle: "italic", color: "rgba(255,255,255,0.3)", lineHeight: 1, marginTop: 2 }}>to full charge</div>
        </div>
        {/* SVG: lightning bolt with liquid wave fill */}
        <svg
          viewBox="0 0 130 180"
          style={{ position: "absolute", right: -46, top: -24, bottom: -24, height: "calc(100% + 48px)", width: "auto" }}
        >
          <defs>
            <clipPath id="bolt-clip">
              <path d="M70 4 Q68 0 64 2 L20 78 Q15 85 24 85 L39 85 Q43 85 41 90 L30 174 Q28 182 36 176 L108 76 Q114 68 105 68 L82 68 Q78 68 80 62 L100 6 Q102 0 96 2 Z" />
            </clipPath>
          </defs>
          <g transform="rotate(-7.8, 65, 90)">
            <path d="M70 4 Q68 0 64 2 L20 78 Q15 85 24 85 L39 85 Q43 85 41 90 L30 174 Q28 182 36 176 L108 76 Q114 68 105 68 L82 68 Q78 68 80 62 L100 6 Q102 0 96 2 Z" fill="rgba(255,255,255,0.025)" />
            <g clipPath="url(#bolt-clip)">
              {/* Back wave */}
              <path fill={energyColor} opacity="0.35">
                <animate
                  attributeName="d"
                  dur="7s"
                  repeatCount="indefinite"
                  keyTimes="0;0.12;0.28;0.45;0.58;0.72;0.88;1"
                  keySplines="0.4 0 0.6 1;0.2 0 0.8 1;0.5 0 0.3 1;0.3 0 0.7 1;0.6 0 0.4 1;0.2 0 0.9 1;0.4 0 0.6 1"
                  calcMode="spline"
                  values={waveValues(ePct, "back")}
                />
              </path>
              {/* Front wave */}
              <path fill={energyColor} opacity="1">
                <animate
                  attributeName="d"
                  dur="5.5s"
                  repeatCount="indefinite"
                  keyTimes="0;0.15;0.3;0.42;0.6;0.75;0.9;1"
                  keySplines="0.3 0 0.7 1;0.5 0 0.3 1;0.2 0 0.8 1;0.6 0 0.4 1;0.3 0 0.8 1;0.5 0 0.5 1;0.4 0 0.6 1"
                  calcMode="spline"
                  values={waveValues(ePct, "front")}
                />
              </path>
            </g>
          </g>
        </svg>
      </div>
    </div>
  );
}

/** Shift wave Y coords based on energy %. Base values are for 72% energy. */
export function waveValues(ePct: number, layer: "back" | "front"): string {
  const shift = (72 - ePct) * 1.76;

  if (layer === "back") {
    const base = [
      [49, 43, 49, 55, 49, 43, 49],
      [45, 51, 44, 37, 46, 53, 45],
      [50, 39, 51, 57, 45, 39, 50],
      [43, 50, 42, 35, 47, 53, 43],
      [48, 55, 47, 39, 51, 57, 48],
      [44, 37, 46, 53, 43, 37, 47],
      [51, 45, 52, 57, 47, 41, 49],
      [49, 43, 49, 55, 49, 43, 49],
    ];
    return base.map(row => {
      const ys = row.map(y => Math.round(y + shift));
      return `M-10 ${ys[0]} Q15 ${ys[1]} 40 ${ys[2]} Q65 ${ys[3]} 90 ${ys[4]} Q115 ${ys[5]} 140 ${ys[6]} L140 200 L-10 200 Z`;
    }).join(";");
  }

  // front
  const base = [
    [54, 60, 54, 48, 54, 58, 54],
    [57, 46, 58, 64, 52, 48, 56],
    [51, 58, 50, 44, 56, 62, 52],
    [58, 52, 59, 64, 54, 50, 57],
    [52, 46, 55, 60, 50, 46, 54],
    [56, 62, 54, 46, 58, 62, 55],
    [50, 56, 49, 44, 55, 58, 51],
    [54, 60, 54, 48, 54, 58, 54],
  ];
  return base.map(row => {
    const ys = row.map(y => Math.round(y + shift));
    return `M-10 ${ys[0]} Q20 ${ys[1]} 50 ${ys[2]} Q80 ${ys[3]} 110 ${ys[4]} Q130 ${ys[5]} 140 ${ys[6]} L140 200 L-10 200 Z`;
  }).join(";");
}
