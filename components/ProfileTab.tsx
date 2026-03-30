"use client";
import { useState, useEffect } from "react";
import React from "react";
import { MONO } from "../lib/constants";

// ── Props ──
interface Props {
  energy: number;
  streak: number;
  tasksDoneCount: number;
  resetAll: () => void;
}

// ── Toggle ──
function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <div
      onClick={onToggle}
      style={{
        width: 44, height: 26, borderRadius: 13,
        background: on ? "var(--accent, #FFD000)" : "var(--t5, #333)",
        position: "relative", cursor: "pointer", transition: "background 0.2s", flexShrink: 0,
      }}
    >
      <div style={{
        position: "absolute", top: 3, left: on ? 21 : 3,
        width: 20, height: 20, borderRadius: "50%", background: "#fff", transition: "left 0.2s",
      }} />
    </div>
  );
}

// ── SettingsRow ──
function SettingsRow({ icon, iconBg, label, sub, right, danger, onClick }: {
  icon: React.ReactNode; iconBg: string; label: string; sub?: string;
  right?: React.ReactNode; danger?: boolean; onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "14px 18px", cursor: onClick ? "pointer" : "default",
        borderBottom: "1px solid var(--border, #111)",
        background: danger ? "rgba(226,75,74,0.04)" : "transparent",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1, minWidth: 0 }}>
        <div style={{
          width: 32, height: 32, borderRadius: 10,
          display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0, background: iconBg,
        }}>
          {icon}
        </div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 500, color: danger ? "var(--danger, #E24B4A)" : "var(--t1, #ddd)" }}>
            {label}
          </div>
          {sub && <div style={{ fontSize: 11, color: "var(--t4, #444)", fontFamily: MONO, marginTop: 1 }}>{sub}</div>}
        </div>
      </div>
      {right || (onClick && <span style={{ color: "var(--t5, #333)", fontSize: 14, flexShrink: 0, marginLeft: 8 }}>›</span>)}
    </div>
  );
}

// ── RateSlider ──
function RateSlider({ label, value, min, max, step, color, unit, onChange }: {
  label: string; value: number; min: number; max: number; step: number;
  color: string; unit: string; onChange: (v: number) => void;
}) {
  return (
    <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--border, #111)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <span style={{ fontSize: 13, color: "var(--t2, #aaa)" }}>{label}</span>
        <span style={{ fontSize: 13, color, fontFamily: MONO, fontWeight: 600 }}>
          {value.toFixed(1)}{unit}
        </span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        style={{ width: "100%", accentColor: color, height: 6, cursor: "pointer" }}
      />
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
        <span style={{ fontSize: 10, color: "var(--t5, #333)", fontFamily: MONO }}>{min}</span>
        <span style={{ fontSize: 10, color: "var(--t5, #333)", fontFamily: MONO }}>{max}</span>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// PROFILE TAB — "You" settings page
// ═══════════════════════════════════════════════════════════
export default function ProfileTab({ energy, streak, tasksDoneCount, resetAll }: Props) {

  // ── State ──
  const [userName, setUserName] = useState(() =>
    (typeof window !== "undefined" && localStorage.getItem("pitgoal-username")) || "User"
  );
  const [avatarColor, setAvatarColor] = useState(() =>
    (typeof window !== "undefined" && localStorage.getItem("pitgoal-avatar-color")) || "#FFD000"
  );
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showAbout, setShowAbout] = useState(false);

  // Notification toggles
  const [notifEnabled, setNotifEnabled] = useState(() =>
    typeof window !== "undefined" ? localStorage.getItem("pitgoal-notif") !== "false" : true
  );
  const [restWarning, setRestWarning] = useState(() =>
    typeof window !== "undefined" ? localStorage.getItem("pitgoal-rest-warning") !== "false" : true
  );
  const [overdueAlerts, setOverdueAlerts] = useState(() =>
    typeof window !== "undefined" ? localStorage.getItem("pitgoal-overdue-alerts") !== "false" : true
  );

  // Energy drain rates
  const [idleRate, setIdleRate] = useState(() =>
    typeof window !== "undefined" ? parseFloat(localStorage.getItem("pitgoal-rate-idle") || "0.5") : 0.5
  );
  const [taskRate, setTaskRate] = useState(() =>
    typeof window !== "undefined" ? parseFloat(localStorage.getItem("pitgoal-rate-task") || "1.0") : 1.0
  );
  const [urgentRate, setUrgentRate] = useState(() =>
    typeof window !== "undefined" ? parseFloat(localStorage.getItem("pitgoal-rate-urgent") || "1.5") : 1.5
  );
  const [restRate, setRestRate] = useState(() =>
    typeof window !== "undefined" ? parseFloat(localStorage.getItem("pitgoal-rate-rest") || "0.3") : 0.3
  );
  const [sleepRate, setSleepRate] = useState(() =>
    typeof window !== "undefined" ? parseFloat(localStorage.getItem("pitgoal-rate-sleep") || "12.5") : 12.5
  );

  // ── Save helpers ──
  useEffect(() => { localStorage.setItem("pitgoal-username", userName); }, [userName]);
  useEffect(() => { localStorage.setItem("pitgoal-avatar-color", avatarColor); }, [avatarColor]);
  useEffect(() => { localStorage.setItem("pitgoal-notif", notifEnabled.toString()); }, [notifEnabled]);
  useEffect(() => { localStorage.setItem("pitgoal-rest-warning", restWarning.toString()); }, [restWarning]);
  useEffect(() => { localStorage.setItem("pitgoal-overdue-alerts", overdueAlerts.toString()); }, [overdueAlerts]);
  useEffect(() => {
    localStorage.setItem("pitgoal-rate-idle", idleRate.toString());
    localStorage.setItem("pitgoal-rate-task", taskRate.toString());
    localStorage.setItem("pitgoal-rate-urgent", urgentRate.toString());
    localStorage.setItem("pitgoal-rate-rest", restRate.toString());
    localStorage.setItem("pitgoal-rate-sleep", sleepRate.toString());
    // Sync to main settings key so page.tsx energy drain reads the correct rates
    try {
      const raw = localStorage.getItem("doit-v8-settings");
      const existing = raw ? JSON.parse(raw) : {};
      const updated = {
        ...existing,
        idle: idleRate,
        work: taskRate,
        urgent: urgentRate,
        rest: restRate,
      };
      localStorage.setItem("doit-v8-settings", JSON.stringify(updated));
    } catch {}
  }, [idleRate, taskRate, urgentRate, restRate, sleepRate]);

  // ── Handlers ──
  function handleSaveName() {
    const trimmed = nameInput.trim();
    if (trimmed) setUserName(trimmed);
    setEditingName(false);
  }

  function handleExport() {
    const data: Record<string, string | null> = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) data[key] = localStorage.getItem(key);
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pitgoal-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleReset() {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) keysToRemove.push(key);
    }
    keysToRemove.forEach(k => localStorage.removeItem(k));
    resetAll();
    window.location.reload();
  }

  function resetEnergyRates() {
    setIdleRate(0.5);
    setTaskRate(1.0);
    setUrgentRate(1.5);
    setRestRate(0.3);
    setSleepRate(12.5);
  }

  const AVATAR_COLORS = ["#FFD000", "#f472b6", "#fb923c", "#a78bfa", "#00d4ff", "#2ECDA7", "#E24B4A", "#6b8a7a"];

  // ── Render ──
  return (
    <div style={{
      flex: 1, overflowY: "auto", overflowX: "hidden",
      WebkitOverflowScrolling: "touch" as any, paddingBottom: 120,
      minHeight: 0,
    }}>

      {/* ── PROFILE HERO ── */}
      <div style={{
        display: "flex", flexDirection: "column", alignItems: "center",
        padding: "28px 20px 20px",
      }}>
        {/* Avatar */}
        <div style={{ position: "relative", marginBottom: 12 }}>
          <div
            onClick={() => setShowAvatarPicker(true)}
            style={{
              width: 80, height: 80, borderRadius: "50%",
              background: `${avatarColor}22`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 32, fontWeight: 700, color: avatarColor, cursor: "pointer",
            }}
          >
            {userName[0]?.toUpperCase() || "?"}
          </div>
          <div
            onClick={() => setShowAvatarPicker(true)}
            style={{
              position: "absolute", bottom: 0, right: 0,
              width: 28, height: 28, borderRadius: "50%",
              background: "var(--accent, #FFD000)",
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", border: "2px solid var(--bg, #0a0a0a)",
            }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#0a0a0a" strokeWidth="2.5" strokeLinecap="round">
              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
          </div>
        </div>

        {/* Name */}
        <div
          onClick={() => { setNameInput(userName); setEditingName(true); }}
          style={{ fontSize: 20, fontWeight: 700, color: "var(--t1, #fff)", cursor: "pointer" }}
        >
          {userName}
        </div>
        <div style={{ fontSize: 12, color: "var(--t4, #444)", fontFamily: MONO }}>
          @{userName.toLowerCase().replace(/\s+/g, "")}
        </div>

        {/* Mini stats row */}
        <div style={{ display: "flex", gap: 8, width: "100%", marginTop: 14 }}>
          {[
            { num: String(streak || "—"), label: "STREAK", color: "var(--accent, #FFD000)" },
            { num: String(tasksDoneCount || "—"), label: "DONE", color: "var(--t1, #fff)" },
            { num: `${Math.round(energy)}%`, label: "ENERGY", color: energy > 80 ? "#2ECDA7" : energy > 50 ? "var(--accent)" : "var(--danger, #E24B4A)" },
            { num: "0", label: "COINS", color: "var(--accent, #FFD000)" },
          ].map((s, i) => (
            <div key={i} style={{
              flex: 1, background: "var(--card, #161616)", border: "1px solid var(--border, #1e1e1e)",
              borderRadius: 12, padding: "12px 8px", textAlign: "center",
            }}>
              <div style={{ fontSize: 20, fontWeight: 700, fontFamily: MONO, color: s.color }}>{s.num}</div>
              <div style={{ fontSize: 9, color: "var(--t5, #3a3a3a)", letterSpacing: 2, fontFamily: MONO, marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>
        {/* TODO: Wire coins from page.tsx state */}
      </div>

      {/* ── ENERGY SETTINGS ── */}
      <div style={{ fontSize: 10, color: "var(--t5, #333)", letterSpacing: 2, fontFamily: MONO, padding: "20px 20px 10px" }}>
        ENERGY SETTINGS
      </div>
      <div style={{ background: "var(--card, #161616)", border: "1px solid var(--border, #1e1e1e)", borderRadius: 16, margin: "0 16px 8px", overflow: "hidden" }}>
        <RateSlider label="Idle drain" value={idleRate} min={0.1} max={2.0} step={0.1} color="var(--t3, #555)" unit="/min" onChange={setIdleRate} />
        <RateSlider label="Task drain" value={taskRate} min={0.1} max={3.0} step={0.1} color="#fb923c" unit="/min" onChange={setTaskRate} />
        <RateSlider label="Urgent drain" value={urgentRate} min={0.1} max={4.0} step={0.1} color="var(--danger, #E24B4A)" unit="/min" onChange={setUrgentRate} />
        <RateSlider label="Rest restore" value={restRate} min={0.1} max={2.0} step={0.1} color="var(--rest, #6b8a7a)" unit="/min" onChange={setRestRate} />
        <RateSlider label="Sleep restore" value={sleepRate} min={5.0} max={25.0} step={0.5} color="#a78bfa" unit="%/hr" onChange={setSleepRate} />
        <div
          onClick={resetEnergyRates}
          style={{ padding: "14px 18px", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}
        >
          <span style={{ fontSize: 13, color: "var(--accent, #FFD000)" }}>Reset to defaults</span>
          <span style={{ color: "var(--accent, #FFD000)", fontSize: 14 }}>↺</span>
        </div>
      </div>

      {/* ── APPEARANCE ── */}
      <div style={{ fontSize: 10, color: "var(--t5, #333)", letterSpacing: 2, fontFamily: MONO, padding: "20px 20px 10px" }}>
        APPEARANCE
      </div>
      <div style={{ background: "var(--card, #161616)", border: "1px solid var(--border, #1e1e1e)", borderRadius: 16, margin: "0 16px 8px", overflow: "hidden" }}>
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "14px 18px",
        }}>
          <div>
            <div style={{ fontSize: 14, color: "var(--t1, #ddd)", fontWeight: 500 }}>Dark mode</div>
            <div style={{ fontSize: 11, color: "var(--t4, #444)", marginTop: 2 }}>Light mode coming soon</div>
          </div>
          <div style={{
            width: 44, height: 24, borderRadius: 12,
            background: "var(--accent, #FFD000)", position: "relative",
            cursor: "not-allowed", opacity: 0.7,
          }}>
            <div style={{
              width: 20, height: 20, borderRadius: "50%",
              background: "#fff", position: "absolute",
              top: 2, right: 2, transition: "all 0.2s",
            }} />
          </div>
        </div>
      </div>

      {/* ── NOTIFICATIONS ── */}
      <div style={{ fontSize: 10, color: "var(--t5, #333)", letterSpacing: 2, fontFamily: MONO, padding: "20px 20px 10px" }}>
        NOTIFICATIONS
      </div>
      <div style={{ background: "var(--card, #161616)", border: "1px solid var(--border, #1e1e1e)", borderRadius: 16, margin: "0 16px 8px", overflow: "hidden" }}>
        <SettingsRow
          icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FFD000" strokeWidth="2"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>}
          iconBg="rgba(255,208,0,0.1)"
          label="Push notifications"
          sub="Task reminders & alerts"
          right={<Toggle on={notifEnabled} onToggle={() => setNotifEnabled(!notifEnabled)} />}
        />
        <SettingsRow
          icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#E24B4A" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M8 12l2 2 4-4"/></svg>}
          iconBg="rgba(226,75,74,0.1)"
          label="REST NOW warning"
          sub="Alert at 20% energy"
          right={<Toggle on={restWarning} onToggle={() => setRestWarning(!restWarning)} />}
        />
        <SettingsRow
          icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fb923c" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>}
          iconBg="rgba(251,146,60,0.1)"
          label="Overdue alerts"
          sub="When tasks pass their window"
          right={<Toggle on={overdueAlerts} onToggle={() => setOverdueAlerts(!overdueAlerts)} />}
        />
      </div>

      {/* ── DATA ── */}
      <div style={{ fontSize: 10, color: "var(--t5, #333)", letterSpacing: 2, fontFamily: MONO, padding: "20px 20px 10px" }}>
        DATA
      </div>
      <div style={{ background: "var(--card, #161616)", border: "1px solid var(--border, #1e1e1e)", borderRadius: 16, margin: "0 16px 8px", overflow: "hidden" }}>
        <SettingsRow
          icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#00d4ff" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>}
          iconBg="rgba(0,212,255,0.1)"
          label="Export data"
          sub="Download as JSON"
          onClick={handleExport}
        />
        <SettingsRow
          icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>}
          iconBg="rgba(167,139,250,0.1)"
          label="Import data"
          sub="Restore from backup"
          onClick={() => {
            // TODO: implement file picker and import logic
            alert("Import coming soon");
          }}
        />
        <SettingsRow
          icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#E24B4A" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>}
          iconBg="rgba(226,75,74,0.1)"
          label="Reset all data"
          sub="Delete everything"
          danger
          onClick={() => setShowResetConfirm(true)}
        />
      </div>

      {/* ── ABOUT ── */}
      <div style={{ fontSize: 10, color: "var(--t5, #333)", letterSpacing: 2, fontFamily: MONO, padding: "20px 20px 10px" }}>
        ABOUT
      </div>
      <div style={{ background: "var(--card, #161616)", border: "1px solid var(--border, #1e1e1e)", borderRadius: 16, margin: "0 16px 8px", overflow: "hidden" }}>
        <div style={{ display: "flex", justifyContent: "space-between", padding: "14px 18px", borderBottom: "1px solid var(--border, #111)" }}>
          <span style={{ fontSize: 14, color: "var(--t1, #ddd)", fontWeight: 500 }}>Version</span>
          <span style={{ fontSize: 13, color: "var(--t4, #555)", fontFamily: MONO }}>v13.1</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", padding: "14px 18px", borderBottom: "1px solid var(--border, #111)" }}>
          <span style={{ fontSize: 14, color: "var(--t1, #ddd)", fontWeight: 500 }}>Build</span>
          <span style={{ fontSize: 13, color: "var(--t4, #555)", fontFamily: MONO }}>2026.03.27</span>
        </div>
        <SettingsRow
          icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--t3, #888)" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>}
          iconBg="rgba(136,136,136,0.1)"
          label="What's Pitgoal?"
          onClick={() => setShowAbout(true)}
        />
        <div style={{ padding: "14px 18px", cursor: "pointer", display: "flex", justifyContent: "space-between" }}>
          <span style={{ fontSize: 14, color: "var(--accent, #FFD000)", fontWeight: 500 }}>Rate this app</span>
          <span style={{ color: "var(--accent, #FFD000)", fontSize: 14 }}>›</span>
        </div>
      </div>

      {/* Footer */}
      <div style={{ textAlign: "center", padding: "24px 0 40px" }}>
        <div style={{ fontSize: 11, color: "var(--border, #222)", fontFamily: MONO }}>pitgoal.com</div>
        <div style={{ fontSize: 10, color: "var(--border, #1a1a1a)", fontFamily: MONO, marginTop: 4 }}>Made by July</div>
      </div>

      {/* ── MODALS ── */}

      {/* Edit Name */}
      {editingName && (
        <div onClick={() => setEditingName(false)} style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 200,
          display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
        }}>
          <div onClick={(e) => e.stopPropagation()} style={{
            background: "var(--card, #161616)", border: "1px solid var(--border, #1e1e1e)",
            borderRadius: 20, padding: 24, width: 300, maxWidth: "90vw", textAlign: "center",
          }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: "var(--t1, #fff)", marginBottom: 6 }}>Edit name</div>
            <div style={{ fontSize: 13, color: "var(--t4, #555)", marginBottom: 16 }}>This is shown to your friends</div>
            <input
              autoFocus
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSaveName()}
              maxLength={24}
              placeholder="Your name..."
              style={{
                background: "var(--badge-bg, #222)", border: "1px solid var(--border2, #333)",
                borderRadius: 12, padding: "10px 14px", color: "var(--t1, #fff)",
                fontSize: 15, width: "100%", outline: "none", fontFamily: "inherit",
                marginBottom: 12, boxSizing: "border-box" as const,
              }}
            />
            <div
              onClick={handleSaveName}
              style={{
                padding: 12, background: "var(--accent, #FFD000)", color: "#0a0a0a",
                borderRadius: 50, fontWeight: 700, fontSize: 14, cursor: "pointer",
                marginBottom: 8, textAlign: "center",
              }}
            >Save</div>
            <div
              onClick={() => setEditingName(false)}
              style={{
                padding: 12, background: "var(--badge-bg, #222)", color: "var(--t3, #888)",
                borderRadius: 50, fontSize: 14, cursor: "pointer", textAlign: "center",
              }}
            >Cancel</div>
          </div>
        </div>
      )}

      {/* Avatar Color Picker */}
      {showAvatarPicker && (
        <div onClick={() => setShowAvatarPicker(false)} style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 200,
          display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
        }}>
          <div onClick={(e) => e.stopPropagation()} style={{
            background: "var(--card, #161616)", border: "1px solid var(--border, #1e1e1e)",
            borderRadius: 20, padding: 24, width: 300, maxWidth: "90vw", textAlign: "center",
          }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: "var(--t1, #fff)", marginBottom: 6 }}>Choose color</div>
            <div style={{ fontSize: 13, color: "var(--t4, #555)", marginBottom: 16 }}>Pick your avatar accent</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center", marginBottom: 16 }}>
              {AVATAR_COLORS.map((c) => (
                <div
                  key={c}
                  onClick={() => { setAvatarColor(c); setShowAvatarPicker(false); }}
                  style={{
                    width: 44, height: 44, borderRadius: "50%",
                    background: `${c}22`, display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 18, fontWeight: 700, color: c, cursor: "pointer",
                    border: avatarColor === c ? `2px solid ${c}` : "2px solid transparent",
                    transition: "border 0.2s",
                  }}
                >
                  {userName[0]?.toUpperCase() || "?"}
                </div>
              ))}
            </div>
            <div
              onClick={() => setShowAvatarPicker(false)}
              style={{
                padding: 12, background: "var(--badge-bg, #222)", color: "var(--t3, #888)",
                borderRadius: 50, fontSize: 14, cursor: "pointer",
              }}
            >Done</div>
          </div>
        </div>
      )}

      {/* Reset Confirm */}
      {showResetConfirm && (
        <div onClick={() => setShowResetConfirm(false)} style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 200,
          display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
        }}>
          <div onClick={(e) => e.stopPropagation()} style={{
            background: "var(--card, #161616)", border: "1px solid var(--border, #1e1e1e)",
            borderRadius: 20, padding: 24, width: 300, maxWidth: "90vw", textAlign: "center",
          }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: "var(--danger, #E24B4A)", marginBottom: 6 }}>Reset all data?</div>
            <div style={{ fontSize: 13, color: "var(--t4, #555)", marginBottom: 20, lineHeight: 1.5 }}>
              This will delete all your tasks, progress, settings, and energy history. This cannot be undone.
            </div>
            <div
              onClick={handleReset}
              style={{
                padding: 12, background: "var(--danger, #E24B4A)", color: "#fff",
                borderRadius: 50, fontWeight: 700, fontSize: 14, cursor: "pointer", marginBottom: 8,
              }}
            >Delete everything</div>
            <div
              onClick={() => setShowResetConfirm(false)}
              style={{
                padding: 12, background: "var(--badge-bg, #222)", color: "var(--t3, #888)",
                borderRadius: 50, fontSize: 14, cursor: "pointer",
              }}
            >Cancel</div>
          </div>
        </div>
      )}

      {/* About */}
      {showAbout && (
        <div onClick={() => setShowAbout(false)} style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 200,
          display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
        }}>
          <div onClick={(e) => e.stopPropagation()} style={{
            background: "var(--card, #161616)", border: "1px solid var(--border, #1e1e1e)",
            borderRadius: 20, padding: 24, width: 320, maxWidth: "90vw",
          }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: "var(--t1, #fff)", marginBottom: 12, textAlign: "center" }}>Pitgoal</div>
            <div style={{ fontSize: 13, color: "var(--t3, #888)", lineHeight: 1.6, marginBottom: 20 }}>
              A predictable app that keeps you forward without thinking.
              <br /><br />
              Track daily tasks, manage energy, build streaks, and stay accountable with friends.
              <br /><br />
              Color = status. Everything else is grayscale.
              <br /><br />
              Built by July in Cyberjaya, Malaysia.
            </div>
            <div
              onClick={() => setShowAbout(false)}
              style={{
                padding: 12, background: "var(--accent, #FFD000)", color: "#0a0a0a",
                borderRadius: 50, fontWeight: 700, fontSize: 14, cursor: "pointer", textAlign: "center",
              }}
            >Close</div>
          </div>
        </div>
      )}

    </div>
  );
}
