"use client";
import { useState } from "react";
import { DISPLAY, BODY, MONO, DEFAULT_RATES, RATE_LIMITS, STORAGE_KEY, PLAN_KEY, SETTINGS_KEY } from "../lib/constants";
import { fmtTime, fmtDur, getMYDate } from "../lib/utils";
import type { DrainRates, Theme, ProfileView, SettingsSection, Task, Template, DayHistory } from "../lib/types";

interface Props {
  userId: string | null;
  theme: Theme;
  setTheme: (t: Theme) => void;
  tasksDoneCount: number;
  streak: number;
  ePct: number;
  drainRates: DrainRates;
  saveDrainRates: (r: DrainRates) => void;
  notifEnabled: boolean;
  setNotifEnabled: (v: boolean) => void;
  initNotifications: () => Promise<boolean>;
  clearAllNotifications: () => void;
  scheduleTaskNotifications: (tasks: Task[]) => void;
  scheduleDaySummary: (h: number, m: number) => void;
  tasks: Task[];
  templates: Template[];
  history: Record<string, DayHistory>;
  customGroups: string[];
  dayLog: any[];
  resetAll: () => void;
}

export default function ProfileTab(props: Props) {
  const {
    userId, theme, setTheme, tasksDoneCount, streak, ePct,
    drainRates, saveDrainRates, notifEnabled, setNotifEnabled,
    initNotifications, clearAllNotifications, scheduleTaskNotifications,
    scheduleDaySummary, tasks, templates, history, customGroups, dayLog, resetAll,
  } = props;

  const [view, setView] = useState<ProfileView>("main");
  const [section, setSection] = useState<SettingsSection>(null);
  const [displayName, setDisplayName] = useState("Anonymous");
  const [editingName, setEditingName] = useState(false);

  // ── PROFILE MAIN ──
  if (view === "main") return (
    <div style={{ padding: "16px 14px 0" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div style={{ fontSize: 20, fontWeight: 800, color: "var(--t1)", fontFamily: DISPLAY }}>Profile</div>
        <div className="tap" onClick={() => { setView("settings"); setSection(null); }}
          style={{ width: 36, height: 36, borderRadius: 12, background: "var(--card)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--t4)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" /></svg>
        </div>
      </div>

      {/* User card */}
      <div style={{ background: "var(--card)", borderRadius: 20, padding: "24px 20px", border: "1px solid var(--border)", marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20 }}>
          <div style={{ width: 56, height: 56, borderRadius: 18, background: "var(--accent-10)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontSize: 22, fontWeight: 800, color: "var(--accent)", fontFamily: DISPLAY }}>{displayName[0]?.toUpperCase()}</span>
          </div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, color: "var(--t1)", fontFamily: DISPLAY }}>{displayName}</div>
            <div style={{ fontSize: 10, color: "var(--t4)", fontFamily: MONO }}>{userId ? `ID: ${userId.slice(0, 8)}...` : "Offline mode"}</div>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
          {[
            { v: tasksDoneCount, l: "TODAY",  c: "var(--accent)", bg: "var(--accent-bg)" },
            { v: streak,         l: "STREAK", c: "var(--warn)",   bg: "var(--warn-bg)" },
            { v: "0",            l: "COINS",  c: "var(--pink)",   bg: "var(--pink-bg)" },
          ].map((s, i) => (
            <div key={i} style={{ background: s.bg, borderRadius: 14, padding: "14px 10px", textAlign: "center" }}>
              <div style={{ fontSize: 24, fontWeight: 800, color: "var(--t1)", fontFamily: DISPLAY, lineHeight: 1 }}>{s.v}</div>
              <div style={{ fontSize: 9, color: s.c, fontFamily: MONO, letterSpacing: 1, marginTop: 4 }}>{s.l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick links */}
      {[
        { icon: "⚡", label: "Energy settings", desc: `${ePct}% remaining · ${drainRates.maxEnergyHours}h max`, color: "var(--accent)", action: () => { setView("settings"); setSection("energy"); } },
        { icon: "🐾", label: "Pet settings", desc: "Manage your digital companion", color: "var(--rest)", soon: true },
        { icon: "◈",  label: "Coin history", desc: "Earned, spent, invested", color: "var(--warn)", soon: true },
      ].map((item, i) => (
        <div key={i} className={item.action ? "tap" : ""} onClick={item.action || undefined}
          style={{ background: "var(--card)", borderRadius: 20, padding: "18px 20px", border: "1px solid var(--border)", marginBottom: 8, display: "flex", alignItems: "center", gap: 14, cursor: item.action ? "pointer" : "default" }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: "var(--glow)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>{item.icon}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "var(--t1)", fontFamily: DISPLAY }}>{item.label}</div>
            <div style={{ fontSize: 11, color: "var(--t4)", marginTop: 2 }}>{item.desc}</div>
          </div>
          {item.soon ? (
            <div style={{ fontSize: 9, color: "var(--t6)", fontFamily: MONO, letterSpacing: 1, background: "var(--card2)", padding: "4px 8px", borderRadius: 6 }}>SOON</div>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--t6)" strokeWidth="2" strokeLinecap="round"><polyline points="9 18 15 12 9 6" /></svg>
          )}
        </div>
      ))}

      {/* Sync */}
      <div style={{ background: "var(--card)", borderRadius: 20, padding: "14px 20px", border: "1px solid var(--border)", marginBottom: 8, display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ width: 8, height: 8, borderRadius: "50%", background: userId ? "var(--accent)" : "var(--pink)", flexShrink: 0 }} />
        <span style={{ fontSize: 12, color: "var(--t4)" }}>{userId ? "Synced to Supabase" : "Offline — local only"}</span>
      </div>
      <div style={{ fontSize: 11, color: "var(--t6)", fontFamily: MONO, textAlign: "center", marginTop: 20 }}>PITGOAL v9.0</div>
    </div>
  );

  // ── SETTINGS VIEW ──
  return (
    <div style={{ padding: "16px 14px 0" }}>
      {/* Back header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
        <div className="tap" onClick={() => { if (section) setSection(null); else setView("main"); }}
          style={{ width: 36, height: 36, borderRadius: 12, background: "var(--card)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--t3)" strokeWidth="2" strokeLinecap="round"><polyline points="15 18 9 12 15 6" /></svg>
        </div>
        <div style={{ fontSize: 20, fontWeight: 800, color: "var(--t1)", fontFamily: DISPLAY }}>
          {section === "energy" ? "Energy" : section === "account" ? "Account" : section === "appearance" ? "Appearance" : section === "notifications" ? "Notifications" : section === "data" ? "Data" : "Settings"}
        </div>
      </div>

      {/* Settings menu */}
      {!section && (
        <>
          {[
            { id: "account" as const, label: "Account", desc: displayName, icon: "👤", color: "var(--accent)" },
            { id: "appearance" as const, label: "Appearance", desc: theme === "dark" ? "Dark mode" : "Light mode", icon: theme === "dark" ? "🌙" : "☀️", color: "var(--t3)" },
            { id: "energy" as const, label: "Energy & sleep", desc: `Wake ${fmtTime(drainRates.wakeHour, drainRates.wakeMinute)} · Sleep ${fmtTime(drainRates.sleepHour, drainRates.sleepMinute)}`, icon: "⚡", color: "var(--warn)" },
            { id: "notifications" as const, label: "Notifications", desc: notifEnabled ? "Enabled" : "Disabled", icon: "🔔", color: "var(--rest)" },
            { id: "data" as const, label: "Data & storage", desc: "Export, reset, manage", icon: "💾", color: "var(--pink)" },
          ].map(item => (
            <div key={item.id} className="tap" onClick={() => setSection(item.id)}
              style={{ background: "var(--card)", borderRadius: 20, padding: "16px 18px", border: "1px solid var(--border)", marginBottom: 8, display: "flex", alignItems: "center", gap: 14, cursor: "pointer" }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: "var(--glow)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>{item.icon}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: "var(--t1)", fontFamily: DISPLAY }}>{item.label}</div>
                <div style={{ fontSize: 11, color: "var(--t4)", marginTop: 2 }}>{item.desc}</div>
              </div>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--t6)" strokeWidth="2" strokeLinecap="round"><polyline points="9 18 15 12 9 6" /></svg>
            </div>
          ))}
        </>
      )}

      {/* ── APPEARANCE ── */}
      {section === "appearance" && (
        <div>
          <div style={{ background: "var(--card)", borderRadius: 20, padding: "22px", border: "1px solid var(--border)", marginBottom: 12 }}>
            <div style={{ fontSize: 10, color: "var(--t3)", fontFamily: MONO, letterSpacing: 2, marginBottom: 14 }}>THEME</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {(["dark", "light"] as const).map(t => (
                <div key={t} className="tap" onClick={() => {
                  setTheme(t);
                  try { const s = JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}"); s.theme = t; localStorage.setItem(SETTINGS_KEY, JSON.stringify(s)); } catch (e) {}
                }} style={{
                  padding: "20px 16px", borderRadius: 16, textAlign: "center", cursor: "pointer",
                  background: theme === t ? "var(--accent-20)" : "var(--bg)",
                  border: `2px solid ${theme === t ? "var(--accent)" : "var(--border)"}`,
                }}>
                  <div style={{ fontSize: 28, marginBottom: 8 }}>{t === "dark" ? "🌙" : "☀️"}</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: theme === t ? "var(--accent)" : "var(--t3)", fontFamily: DISPLAY }}>{t === "dark" ? "Dark" : "Light"}</div>
                </div>
              ))}
            </div>
          </div>
          <div style={{ background: "var(--card)", borderRadius: 20, padding: "18px 22px", border: "1px solid var(--border)", fontSize: 12, color: "var(--t4)", lineHeight: 1.6 }}>
            Dark mode is easier on your eyes at night. Light mode works better in bright environments.
          </div>
        </div>
      )}

      {/* ── ACCOUNT ── */}
      {section === "account" && (
        <div>
          <div style={{ background: "var(--card)", borderRadius: 20, padding: "22px", border: "1px solid var(--border)", marginBottom: 12 }}>
            <div style={{ fontSize: 10, color: "var(--accent)", fontFamily: MONO, letterSpacing: 2, marginBottom: 10 }}>DISPLAY NAME</div>
            {editingName ? (
              <div style={{ display: "flex", gap: 8 }}>
                <input autoFocus value={displayName} onChange={e => setDisplayName(e.target.value)} onKeyDown={e => e.key === "Enter" && setEditingName(false)}
                  style={{ flex: 1, background: "var(--bg)", border: "1px solid var(--accent-30)", borderRadius: 12, padding: "12px 14px", color: "var(--t2)", fontSize: 14, fontFamily: BODY, outline: "none" }} />
                <div className="tap" onClick={() => setEditingName(false)} style={{ background: "var(--accent)", borderRadius: 12, padding: "12px 16px", fontSize: 12, fontWeight: 700, color: "var(--accent-bg)", fontFamily: MONO, cursor: "pointer", display: "flex", alignItems: "center" }}>SAVE</div>
              </div>
            ) : (
              <div className="tap" onClick={() => setEditingName(true)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px", background: "var(--bg)", borderRadius: 12, border: "1px solid var(--border2)", cursor: "pointer" }}>
                <span style={{ fontSize: 14, color: "var(--t2)" }}>{displayName}</span>
                <span style={{ fontSize: 10, color: "var(--t4)", fontFamily: MONO }}>TAP TO EDIT</span>
              </div>
            )}
          </div>
          <div style={{ background: "var(--card)", borderRadius: 20, padding: "22px", border: "1px solid var(--border)" }}>
            <div style={{ fontSize: 10, color: "var(--accent)", fontFamily: MONO, letterSpacing: 2, marginBottom: 10 }}>USER ID</div>
            <div style={{ fontSize: 12, color: "var(--t4)", fontFamily: MONO, wordBreak: "break-all" }}>{userId || "Not connected"}</div>
          </div>
        </div>
      )}

      {/* ── ENERGY ── */}
      {section === "energy" && (
        <div>
          <div style={{ background: "var(--card)", borderRadius: 20, padding: "22px", border: "1px solid var(--border)", marginBottom: 12 }}>
            <div style={{ fontSize: 10, color: "var(--warn)", fontFamily: MONO, letterSpacing: 2, marginBottom: 14 }}>SCHEDULE</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div>
                <div style={{ fontSize: 10, color: "var(--t4)", fontFamily: MONO, marginBottom: 6 }}>WAKE UP</div>
                <input type="time" value={fmtTime(drainRates.wakeHour, drainRates.wakeMinute)}
                  onChange={e => { const [h, m] = e.target.value.split(":").map(Number); saveDrainRates({ ...drainRates, wakeHour: h, wakeMinute: m }); }}
                  style={{ width: "100%", background: "var(--bg)", border: "1px solid var(--border2)", borderRadius: 12, padding: "12px 14px", color: "var(--warn)", fontSize: 16, fontFamily: MONO, outline: "none", fontWeight: 700 }} />
              </div>
              <div>
                <div style={{ fontSize: 10, color: "var(--t4)", fontFamily: MONO, marginBottom: 6 }}>SLEEP</div>
                <input type="time" value={fmtTime(drainRates.sleepHour, drainRates.sleepMinute)}
                  onChange={e => { const [h, m] = e.target.value.split(":").map(Number); saveDrainRates({ ...drainRates, sleepHour: h, sleepMinute: m }); }}
                  style={{ width: "100%", background: "var(--bg)", border: "1px solid var(--border2)", borderRadius: 12, padding: "12px 14px", color: "var(--warn)", fontSize: 16, fontFamily: MONO, outline: "none", fontWeight: 700 }} />
              </div>
            </div>
            <div style={{ marginTop: 12 }}>
              <div style={{ fontSize: 10, color: "var(--t4)", fontFamily: MONO, marginBottom: 6 }}>MAX ENERGY (HOURS)</div>
              <input type="number" value={drainRates.maxEnergyHours}
                onChange={e => saveDrainRates({ ...drainRates, maxEnergyHours: Math.min(24, Math.max(1, parseInt(e.target.value) || 17)) })}
                style={{ width: "100%", background: "var(--bg)", border: "1px solid var(--border2)", borderRadius: 12, padding: "12px 14px", color: "var(--warn)", fontSize: 16, fontFamily: MONO, outline: "none", fontWeight: 700 }} />
            </div>
          </div>

          {/* Drain rates */}
          <div style={{ background: "var(--card)", borderRadius: 20, padding: "22px", border: "1px solid var(--border)" }}>
            <div style={{ fontSize: 10, color: "var(--warn)", fontFamily: MONO, letterSpacing: 2, marginBottom: 6 }}>DRAIN RATES</div>
            <div style={{ fontSize: 11, color: "var(--t5)", marginBottom: 14 }}>How fast each state consumes energy. 1x = 1 min per real min.</div>
            {([
              { key: "idle" as const, label: "IDLE",   desc: "No task running",   color: "var(--t4)", icon: "○" },
              { key: "work" as const, label: "WORK",   desc: "Normal task drain", color: "var(--accent)", icon: "▶" },
              { key: "urgent" as const, label: "URGENT", desc: "High intensity",   color: "var(--pink)", icon: "⚡" },
              { key: "rest" as const, label: "REST",   desc: "Recharge rate",     color: "var(--rest)", icon: "◆" },
            ]).map(item => (
              <div key={item.key} style={{ marginBottom: 16 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ color: item.color, fontSize: 12 }}>{item.icon}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: item.color, fontFamily: MONO }}>{item.label}</span>
                    <span style={{ fontSize: 10, color: "var(--t5)" }}>{item.desc}</span>
                  </div>
                  <span style={{ fontSize: 14, fontWeight: 700, color: item.color, fontFamily: MONO }}>{drainRates[item.key]}x</span>
                </div>
                <input type="range" min={RATE_LIMITS[item.key].min * 10} max={RATE_LIMITS[item.key].max * 10} value={drainRates[item.key] * 10}
                  onChange={e => saveDrainRates({ ...drainRates, [item.key]: parseInt(e.target.value) / 10 })}
                  style={{ width: "100%", accentColor: item.color }} />
              </div>
            ))}
            <div className="tap" onClick={() => saveDrainRates(DEFAULT_RATES)}
              style={{ textAlign: "center", padding: "10px", borderRadius: 12, border: "1px solid var(--border2)", fontSize: 11, color: "var(--t4)", fontFamily: MONO, cursor: "pointer", marginTop: 4 }}>RESET TO DEFAULTS</div>
          </div>
        </div>
      )}

      {/* ── NOTIFICATIONS ── */}
      {section === "notifications" && (
        <div>
          <div style={{ background: "var(--card)", borderRadius: 20, padding: "22px", border: "1px solid var(--border)", marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "var(--t1)", fontFamily: DISPLAY }}>Task reminders</div>
                <div style={{ fontSize: 11, color: "var(--t4)", marginTop: 2 }}>Get notified when tasks are about to start</div>
              </div>
              <div className="tap" onClick={async () => {
                if (notifEnabled) { clearAllNotifications(); setNotifEnabled(false); }
                else { const ok = await initNotifications(); setNotifEnabled(ok); if (ok) { scheduleTaskNotifications(tasks); scheduleDaySummary(drainRates.sleepHour, drainRates.sleepMinute); } }
              }} style={{ width: 50, height: 28, borderRadius: 14, cursor: "pointer", background: notifEnabled ? "var(--accent)" : "var(--border2)", display: "flex", alignItems: "center", padding: "2px", transition: "background 0.2s" }}>
                <div style={{ width: 24, height: 24, borderRadius: 12, background: "#fff", transform: notifEnabled ? "translateX(22px)" : "translateX(0)", transition: "transform 0.2s" }} />
              </div>
            </div>
          </div>
          {["Day summary", "Pause reminders"].map((label, i) => (
            <div key={i} style={{ background: "var(--card)", borderRadius: 20, padding: "22px", border: "1px solid var(--border)", marginBottom: 12 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "var(--t1)", fontFamily: DISPLAY }}>{label}</div>
              <div style={{ fontSize: 11, color: "var(--t4)", marginTop: 2 }}>{i === 0 ? `Summary at bedtime (${fmtTime(drainRates.sleepHour, drainRates.sleepMinute)})` : "Reminds you to resume after 30 min pause"}</div>
              <div style={{ marginTop: 8, fontSize: 10, color: notifEnabled ? "var(--accent)" : "var(--pink)", fontFamily: MONO }}>{notifEnabled ? "ACTIVE" : "REQUIRES NOTIFICATIONS ON"}</div>
            </div>
          ))}
        </div>
      )}

      {/* ── DATA ── */}
      {section === "data" && (
        <div>
          <div style={{ background: "var(--card)", borderRadius: 20, padding: "22px", border: "1px solid var(--border)", marginBottom: 12 }}>
            <div style={{ fontSize: 10, color: "var(--pink)", fontFamily: MONO, letterSpacing: 2, marginBottom: 12 }}>STORAGE</div>
            {[
              { l: "Tasks today", v: tasks.length },
              { l: "Templates", v: templates.length },
              { l: "History days", v: Object.keys(history).length },
              { l: "Custom groups", v: customGroups.length },
            ].map((r, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", marginBottom: i < 3 ? 8 : 0 }}>
                <span style={{ fontSize: 12, color: "var(--t3)" }}>{r.l}</span>
                <span style={{ fontSize: 12, color: "var(--t2)", fontFamily: MONO }}>{r.v}</span>
              </div>
            ))}
          </div>

          <div className="tap" onClick={() => {
            const data = { tasks, dayLog, templates, history, customGroups, drainRates, streak, exportedAt: new Date().toISOString(), version: "v9.0" };
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a"); a.href = url; a.download = `pitgoal-export-${getMYDate()}.json`; a.click(); URL.revokeObjectURL(url);
          }} style={{ background: "var(--card)", borderRadius: 20, padding: "18px 20px", border: "1px solid var(--accent-30)", marginBottom: 8, display: "flex", alignItems: "center", gap: 14, cursor: "pointer" }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: "var(--accent-10)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>📦</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "var(--t1)", fontFamily: DISPLAY }}>Export data</div>
              <div style={{ fontSize: 11, color: "var(--t4)", marginTop: 2 }}>Download as JSON file</div>
            </div>
          </div>

          <div className="tap" onClick={() => { if (confirm("Reset ALL data? This cannot be undone.")) resetAll(); }}
            style={{ background: "var(--card)", borderRadius: 20, padding: "18px 20px", border: "1px solid var(--pink-30)", marginBottom: 8, display: "flex", alignItems: "center", gap: 14, cursor: "pointer" }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: "var(--pink-10)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>🗑️</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "var(--pink)", fontFamily: DISPLAY }}>Reset all data</div>
              <div style={{ fontSize: 11, color: "var(--t4)", marginTop: 2 }}>Clear everything and start fresh</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
