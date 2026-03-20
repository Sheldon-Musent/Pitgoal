"use client";
import { useState, useEffect, useCallback, useRef, useMemo } from "react";

const DISPLAY = "'Sora', sans-serif";
const BODY = "'Plus Jakarta Sans', sans-serif";
const MONO = "'IBM Plex Mono', monospace";
const STORAGE_KEY = "doit-v7-full";
const DEFAULT_ENERGY = 17;

const PHASE_CARDS = [
  { id: "p1", label: "PHASE 1", title: "Pre-Piscine prep", bg: "#063d30", accent: "#5DCAA5", light: "#E1F5EE", mid: "#9FE1CB", dim: "#0F6E56", pct: 43, done: 3, total: 7 },
  { id: "p2", label: "PHASE 2", title: "The Piscine", bg: "#1e1a4d", accent: "#7F77DD", light: "#EEEDFE", mid: "#AFA9EC", dim: "#3C3489", pct: 0, done: 0, total: 5 },
  { id: "p3", label: "PHASE 3", title: "Cadet + Security+", bg: "#3e1022", accent: "#D4537E", light: "#FBEAF0", mid: "#ED93B1", dim: "#72243E", pct: 0, done: 0, total: 7 },
  { id: "p4", label: "PHASE 4", title: "First security role", bg: "#351c02", accent: "#EF9F27", light: "#FAEEDA", mid: "#FAC775", dim: "#854F0B", pct: 0, done: 0, total: 6 },
  { id: "p5", label: "PHASE 5", title: "Level up", bg: "#3a140a", accent: "#F0997B", light: "#FAECE7", mid: "#F5C4B3", dim: "#993C1D", pct: 0, done: 0, total: 7 },
];

const INCOME = [
  { label: "RM4-6K", desc: "SOC Analyst L1", bg: "#063d30", accent: "#5DCAA5", light: "#E1F5EE", mid: "#9FE1CB" },
  { label: "RM6-9K", desc: "+CEH/CySA+", bg: "#1e1a4d", accent: "#7F77DD", light: "#EEEDFE", mid: "#AFA9EC" },
  { label: "RM10-15K", desc: "Remote SG/US", bg: "#3e1022", accent: "#D4537E", light: "#FBEAF0", mid: "#ED93B1" },
  { label: "RM15-25K+", desc: "GRC / Sales Eng", bg: "#351c02", accent: "#EF9F27", light: "#FAEEDA", mid: "#FAC775" },
];

const EVENTS: { [key: string]: string } = {
  "2026-01-01": "New Year", "2026-01-29": "Thaipusam", "2026-02-01": "Fed Territory",
  "2026-02-17": "CNY Day 1", "2026-02-18": "CNY Day 2", "2026-03-20": "Nuzul Quran",
  "2026-03-31": "Hari Raya", "2026-04-01": "Raya Day 2", "2026-04-06": "Piscine starts",
  "2026-05-01": "Labour Day", "2026-05-02": "Full EHub return", "2026-05-12": "Vesak Day",
  "2026-06-02": "Agong Bday", "2026-06-07": "Hari Raya Haji", "2026-07-07": "Awal Muharram",
  "2026-08-31": "Merdeka", "2026-09-16": "M'sia Day", "2026-10-15": "Sec+ target",
  "2026-10-20": "Deepavali", "2026-12-25": "Christmas", "2026-12-31": "Year review",
};

function genId(): string { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
function pad(n: number): string { return String(n).padStart(2, "0"); }
function fmtTime(h: number, m: number): string { return `${pad(h)}:${pad(m)}`; }
function fmtDur(mins: number): string { if (mins < 60) return `${Math.round(mins)}m`; const h = Math.floor(mins / 60); const mn = Math.round(mins % 60); return mn > 0 ? `${h}h ${mn}m` : `${h}h`; }
function dateKey(d: Date): string { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }

function parseCmd(input: string) {
  let text = input.trim(); if (!text) return null;
  let type = "work";
  if (/\brest\b/i.test(text)) { type = "rest"; text = text.replace(/\brest\b/i, ""); }
  else if (/\bwork\b/i.test(text)) { text = text.replace(/\bwork\b/i, ""); }
  let duration = 60;
  const durH = text.match(/(\d+\.?\d*)\s*h(?:r|rs|ours?)?/i);
  const durM = text.match(/(\d+)\s*m(?:in|ins|inutes?)?/i);
  if (durH) { duration = parseFloat(durH[1]) * 60; text = text.replace(durH[0], ""); }
  else if (durM) { duration = parseInt(durM[1]); text = text.replace(durM[0], ""); }
  let hour = null, minute = 0;
  const t12 = text.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)/i);
  const t24 = text.match(/(\d{1,2}):(\d{2})/);
  if (t12) { hour = parseInt(t12[1]); minute = t12[2] ? parseInt(t12[2]) : 0; if (t12[3].toLowerCase() === "pm" && hour !== 12) hour += 12; if (t12[3].toLowerCase() === "am" && hour === 12) hour = 0; text = text.replace(t12[0], ""); }
  else if (t24) { hour = parseInt(t24[1]); minute = parseInt(t24[2]); text = text.replace(t24[0], ""); }
  const name = text.replace(/\s+/g, " ").trim(); if (!name) return null;
  if (hour === null) { const now = new Date(); hour = now.getHours(); minute = Math.ceil(now.getMinutes() / 5) * 5; if (minute >= 60) { hour++; minute = 0; } }
  return { name, time: fmtTime(hour, minute), timeMin: hour * 60 + minute, duration, type, id: genId(), status: "pending" };
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS_SHORT = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
const isSameDay = (a: Date, b: Date) => a.getDate() === b.getDate() && a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear();

function getAllDatesInMonth(year: number, month: number) {
  const days = new Date(year, month + 1, 0).getDate();
  const arr = [];
  for (let i = 1; i <= days; i++) arr.push(new Date(year, month, i));
  return arr;
}

function PlayIcon({ size = 18, color = "#5DCAA5" }: { size?: number; color?: string }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none"><path d="M8 5.14v13.72a1 1 0 001.5.86l11.04-6.86a1 1 0 000-1.72L9.5 4.28A1 1 0 008 5.14z" fill={color} /></svg>;
}

function StopIcon({ size = 18, color = "#E24B4A" }: { size?: number; color?: string }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none"><rect x="6" y="6" width="12" height="12" rx="2" fill={color} /></svg>;
}

function SwipeTask({ task, children, onSwipeLeft, onSwipeRight }: { task: any; children: React.ReactNode; onSwipeLeft: () => void; onSwipeRight: () => void }) {
  const startX = useRef(0); const currentX = useRef(0); const swiping = useRef(false); const [offset, setOffset] = useState(0);
  const threshold = 80; const maxSwipe = 120;
  const onTouchStart = (e: React.TouchEvent) => { startX.current = e.touches[0].clientX; currentX.current = 0; swiping.current = true; };
  const onTouchMove = (e: React.TouchEvent) => { if (!swiping.current) return; currentX.current = e.touches[0].clientX - startX.current; setOffset(Math.max(-maxSwipe, Math.min(maxSwipe, currentX.current))); };
  const onTouchEnd = () => { swiping.current = false; if (currentX.current < -threshold) onSwipeLeft(); else if (currentX.current > threshold) onSwipeRight(); setOffset(0); };
  const isWork = task.type === "work"; const accent = isWork ? "#5DCAA5" : "#7F77DD";
  return (
    <div style={{ position: "relative", overflow: "hidden", borderRadius: 16, marginBottom: 8 }}>
      <div style={{ position: "absolute", top: 0, right: 0, bottom: 0, width: maxSwipe, background: accent, borderRadius: "0 16px 16px 0", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center" }}><div style={{ fontSize: 16, color: isWork ? "#063d30" : "#1e1a4d" }}>{"\u25B6"}</div><div style={{ fontSize: 10, fontWeight: 700, color: isWork ? "#063d30" : "#1e1a4d", fontFamily: MONO, letterSpacing: 1, marginTop: 2 }}>START</div></div>
      </div>
      <div style={{ position: "absolute", top: 0, left: 0, bottom: 0, width: maxSwipe, background: "#1e1e24", borderRadius: "16px 0 0 16px", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center" }}><div style={{ fontSize: 16, color: "#888" }}>{"\u2713"}</div><div style={{ fontSize: 10, fontWeight: 700, color: "#888", fontFamily: MONO, letterSpacing: 1, marginTop: 2 }}>DONE</div></div>
      </div>
      <div onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd} style={{ transform: `translateX(${offset}px)`, transition: swiping.current ? "none" : "transform 0.3s ease", position: "relative", zIndex: 2 }}>{children}</div>
    </div>
  );
}

function SwipeDone({ children, onUndone }: { children: React.ReactNode; onUndone: () => void }) {
  const startX = useRef(0); const currentX = useRef(0); const swiping = useRef(false); const [offset, setOffset] = useState(0);
  const onTouchStart = (e: React.TouchEvent) => { startX.current = e.touches[0].clientX; swiping.current = true; };
  const onTouchMove = (e: React.TouchEvent) => { if (!swiping.current) return; currentX.current = e.touches[0].clientX - startX.current; setOffset(Math.max(-120, Math.min(120, currentX.current))); };
  const onTouchEnd = () => { swiping.current = false; if (currentX.current > 80) onUndone(); setOffset(0); };
  return (
    <div style={{ position: "relative", overflow: "hidden", borderRadius: 10, marginBottom: 4 }}>
      <div style={{ position: "absolute", top: 0, left: 0, bottom: 0, width: 120, background: "#EF9F27", borderRadius: "10px 0 0 10px", display: "flex", alignItems: "center", justifyContent: "center" }}><div style={{ fontSize: 10, fontWeight: 700, color: "#351c02", fontFamily: MONO, letterSpacing: 1 }}>UNDO</div></div>
      <div onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd} style={{ transform: `translateX(${offset}px)`, transition: swiping.current ? "none" : "transform 0.3s ease", position: "relative", zIndex: 2 }}>{children}</div>
    </div>
  );
}

function Divider() {
  return <div style={{ height: 20, display: "flex", alignItems: "center", padding: "0 24px" }}><div style={{ flex: 1, height: 1, background: "linear-gradient(90deg, transparent, #1e1e2460, transparent)" }} /></div>;
}

export default function Home() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [activeTask, setActiveTask] = useState<any>(null);
  const [dayLog, setDayLog] = useState<any[]>([]);
  const [energyUsed, setEnergyUsed] = useState(0);
  const [energyCharged, setEnergyCharged] = useState(0);
  const [powerExpanded, setPowerExpanded] = useState(false);
  const [recordExpanded, setRecordExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState("today");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMonth, setViewMonth] = useState(new Date().getMonth());
  const [viewYear, setViewYear] = useState(new Date().getFullYear());
  const [monthPickerOpen, setMonthPickerOpen] = useState(false);
  const [cmdInput, setCmdInput] = useState("");
  const [customGroups, setCustomGroups] = useState<string[]>([]);
  const [expandedTask, setExpandedTask] = useState<string | null>(null);
  const [showCompleted, setShowCompleted] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [tick, setTick] = useState(0);
  const [bottomTab, setBottomTab] = useState("cat");
  const [editModal, setEditModal] = useState<any>(null);
  const [editFields, setEditFields] = useState({ name: "", time: "", duration: "", type: "work", desc: "", rate: "" });
  const [groupInput, setGroupInput] = useState("");
  const [showGroupModal, setShowGroupModal] = useState(false);
  const monthScrollRef = useRef<HTMLDivElement>(null);
  const dateScrollRef = useRef<HTMLDivElement>(null);
  const today = useMemo(() => new Date(), []);

  useEffect(() => { try { const raw = localStorage.getItem(STORAGE_KEY); if (raw) { const d = JSON.parse(raw); setTasks(d.tasks || []); setDayLog(d.dayLog || []); setEnergyUsed(d.energyUsed || 0); setEnergyCharged(d.energyCharged || 0); setActiveTask(d.activeTask || null); setCustomGroups(d.customGroups || []); } } catch(e) {} setLoaded(true); }, []);
  const persist = useCallback((data: any) => { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch(e) {} }, []);
  const save = useCallback((t: any, log: any, eu: number, ec: number, at: any, cg: any) => { persist({ tasks: t, dayLog: log, energyUsed: eu, energyCharged: ec, activeTask: at, customGroups: cg }); }, [persist]);
  useEffect(() => { const id = setInterval(() => setTick(t => t + 1), 1000); return () => clearInterval(id); }, []);
  useEffect(() => { if (!activeTask) return; const elapsed = (Date.now() - activeTask.startedAt) / 60000; if (activeTask.type === "work") setEnergyUsed(activeTask.baseUsed + elapsed); else setEnergyCharged(activeTask.baseCharged + elapsed); }, [tick, activeTask]);

  // Scroll to selected date
  useEffect(() => {
    if (!dateScrollRef.current) return;
    const selIdx = selectedDate.getDate() - 1;
    const pillW = 52; // pill width + gap
    const container = dateScrollRef.current;
    const scrollTo = selIdx * pillW - container.clientWidth / 2 + pillW / 2;
    container.scrollTo({ left: Math.max(0, scrollTo), behavior: "smooth" });
  }, [selectedDate, viewMonth]);

  const eTotal = DEFAULT_ENERGY * 60;
  const eRemain = Math.max(0, eTotal - energyUsed + energyCharged);
  const ePct = Math.round((eRemain / eTotal) * 100);
  const eHrs = (eRemain / 60).toFixed(1);
  const usedHrs = (energyUsed / 60).toFixed(1);
  const sorted = useMemo(() => [...tasks].sort((a, b) => a.timeMin - b.timeMin), [tasks]);
  const pendingTasks = sorted.filter(t => t.status !== "done");
  const doneTasks = sorted.filter(t => t.status === "done");
  const tasksDoneCount = dayLog.filter(e => e.type === "work").length;
  const restsDoneCount = dayLog.filter(e => e.type === "rest").length;
  const totalTracked = dayLog.reduce((s, e) => s + e.duration, 0);
  const idleMins = Math.max(0, Math.round(((Date.now() - new Date().setHours(6, 30, 0, 0)) / 60000) - totalTracked - (activeTask ? (Date.now() - activeTask.startedAt) / 60000 : 0)));
  const upcoming = sorted.find(t => { if (t.status !== "pending") return false; const now = new Date(); const diff = t.timeMin - (now.getHours() * 60 + now.getMinutes()); return diff > 0 && diff <= 60; });
  const popupState = activeTask ? (activeTask.type === "work" ? "working" : "resting") : upcoming ? "upcoming" : "idle";
  const hasTasks = pendingTasks.length > 0 || doneTasks.length > 0;

  const addTask = () => { const p = parseCmd(cmdInput); if (!p) return; const n = [...tasks, p]; setTasks(n); setCmdInput(""); save(n, dayLog, energyUsed, energyCharged, activeTask, customGroups); };
  const startTask = (task: any) => { if (activeTask) stopTask(); const at = { ...task, startedAt: Date.now(), baseUsed: energyUsed, baseCharged: energyCharged }; setActiveTask(at); const u = tasks.map(t => t.id === task.id ? { ...t, status: "active" } : t); setTasks(u); setExpandedTask(null); save(u, dayLog, energyUsed, energyCharged, at, customGroups); };
  const stopTask = () => { if (!activeTask) return; const elapsed = Math.round((Date.now() - activeTask.startedAt) / 60000); const entry = { id: genId(), name: activeTask.name, type: activeTask.type, duration: elapsed, startTime: new Date(activeTask.startedAt).toTimeString().slice(0, 5), endTime: new Date().toTimeString().slice(0, 5) }; const newLog = [...dayLog, entry]; const u = tasks.map(t => t.id === activeTask.id ? { ...t, status: "done" } : t); setDayLog(newLog); setTasks(u); setActiveTask(null); save(u, newLog, energyUsed, energyCharged, null, customGroups); };
  const markDone = (task: any) => { const entry = { id: genId(), name: task.name, type: task.type, duration: task.duration, startTime: task.time, endTime: fmtTime(Math.floor((task.timeMin + task.duration) / 60), (task.timeMin + task.duration) % 60) }; const newLog = [...dayLog, entry]; const u = tasks.map(t => t.id === task.id ? { ...t, status: "done" } : t); setDayLog(newLog); setTasks(u); setExpandedTask(null); if (task.type === "work") setEnergyUsed(prev => prev + task.duration); else setEnergyCharged(prev => prev + task.duration); save(u, newLog, task.type === "work" ? energyUsed + task.duration : energyUsed, task.type === "rest" ? energyCharged + task.duration : energyCharged, activeTask, customGroups); };
  const markUndone = (task: any) => { const u = tasks.map(t => t.id === task.id ? { ...t, status: "pending" } : t); const newLog = dayLog.filter(e => e.name !== task.name || e.startTime !== task.time); setTasks(u); setDayLog(newLog); if (task.type === "work") setEnergyUsed(prev => Math.max(0, prev - task.duration)); else setEnergyCharged(prev => Math.max(0, prev - task.duration)); save(u, newLog, task.type === "work" ? Math.max(0, energyUsed - task.duration) : energyUsed, task.type === "rest" ? Math.max(0, energyCharged - task.duration) : energyCharged, activeTask, customGroups); };
  const toggleRest = (task: any) => { const u = tasks.map(t => t.id === task.id ? { ...t, type: t.type === "work" ? "rest" : "work" } : t); setTasks(u); save(u, dayLog, energyUsed, energyCharged, activeTask, customGroups); };
  const addGroup = () => { setGroupInput(""); setShowGroupModal(true); };
  const confirmAddGroup = () => { if (groupInput.trim()) { const x = [...customGroups, groupInput.trim()]; setCustomGroups(x); save(tasks, dayLog, energyUsed, energyCharged, activeTask, x); } setShowGroupModal(false); setGroupInput(""); };
  const deleteTask = (task: any) => { const u = tasks.filter(t => t.id !== task.id); setTasks(u); setExpandedTask(null); save(u, dayLog, energyUsed, energyCharged, activeTask, customGroups); };
  const openEditModal = (task: any) => {
    setEditFields({ name: task.name, time: task.time, duration: String(task.duration), type: task.type, desc: task.desc || "", rate: task.rate || "" });
    setEditModal(task); setExpandedTask(null);
  };
  const saveEdit = () => {
    if (!editModal || !editFields.name.trim()) return;
    const timeParts = editFields.time.split(":"); const h = parseInt(timeParts[0]) || 0; const m = parseInt(timeParts[1]) || 0;
    const u = tasks.map(t => t.id === editModal.id ? { ...t, name: editFields.name.trim(), time: fmtTime(h, m), timeMin: h * 60 + m, duration: parseInt(editFields.duration) || 60, type: editFields.type, desc: editFields.desc, rate: editFields.rate } : t);
    setTasks(u); save(u, dayLog, energyUsed, energyCharged, activeTask, customGroups); setEditModal(null);
  };
  const pickMonth = (m: number) => { setViewMonth(m); setMonthPickerOpen(false); const isCur = m === today.getMonth() && viewYear === today.getFullYear(); setSelectedDate(isCur ? new Date(today) : new Date(viewYear, m, 1)); };

  const allDates = useMemo(() => getAllDatesInMonth(viewYear, viewMonth), [viewYear, viewMonth]);

  const activeElapsed = activeTask ? Math.floor((Date.now() - activeTask.startedAt) / 1000) : 0;
  const activeElapsedMin = Math.floor(activeElapsed / 60);
  const activeTimerStr = `${pad(Math.floor(activeElapsed / 3600))}:${pad(Math.floor((activeElapsed % 3600) / 60))}:${pad(activeElapsed % 60)}`;
  const upcomingMins = upcoming ? Math.max(0, Math.round(upcoming.timeMin - (new Date().getHours() * 60 + new Date().getMinutes()))) : 0;
  const hasActivePopup = popupState !== "idle";

  useEffect(() => { if (monthPickerOpen && monthScrollRef.current) { const el = monthScrollRef.current.querySelector('[data-active="true"]'); if (el) el.scrollIntoView({ block: "center", behavior: "auto" }); } }, [monthPickerOpen]);

  if (!loaded) return (<div style={{ background: "#0e0e12", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}><div style={{ fontSize: 11, letterSpacing: 4, color: "#5DCAA5", fontFamily: MONO, animation: "pulse 1.5s infinite" }}>LOADING...</div></div>);

  const PILL_H = 62;

  return (
    <div style={{ background: "#0e0e12", minHeight: "100vh", fontFamily: BODY, color: "#c0c0c0", maxWidth: 430, margin: "0 auto", position: "relative", paddingBottom: hasActivePopup ? 190 : 110, paddingTop: "env(safe-area-inset-top, 0px)" }}>
      <div style={{ padding: "16px 14px 0" }}>

        {/* ═══ ZONE 1: STATS ═══ */}
        <div className="tap" onClick={() => setPowerExpanded(!powerExpanded)} style={{ marginBottom: 6 }}>
          {powerExpanded ? (
            <div style={{ background: "#13131a", borderRadius: 28, padding: "16px 22px", border: "1px solid #1e1e24" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <div><div style={{ fontSize: 20, fontWeight: 700, color: "#E1F5EE", lineHeight: 1, fontFamily: DISPLAY }}>{eHrs}<span style={{ fontSize: 13, color: "#5DCAA5", fontWeight: 500 }}>h</span></div><div style={{ fontSize: 10, color: "#555", fontFamily: MONO, marginTop: 2 }}>of {DEFAULT_ENERGY}h energy</div></div>
                <div style={{ fontSize: 28, fontWeight: 800, color: ePct > 30 ? "#5DCAA5" : ePct > 10 ? "#EF9F27" : "#E24B4A", lineHeight: 1, fontFamily: MONO }}>{ePct}%</div>
              </div>
              <div style={{ height: 12, background: "#1a2a22", borderRadius: 100, overflow: "hidden" }}><div style={{ width: `${ePct}%`, height: "100%", background: ePct > 30 ? "linear-gradient(90deg,#0F6E56,#5DCAA5)" : ePct > 10 ? "#EF9F27" : "#E24B4A", borderRadius: 100, transition: "width 1s" }} /></div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}><div style={{ fontSize: 10, color: "#444", fontFamily: MONO }}>{usedHrs}h used</div><div style={{ fontSize: 10, color: "#5DCAA5", fontFamily: MONO }}>{eHrs}h left</div></div>
            </div>
          ) : (
            <div style={{ background: "#13131a", borderRadius: 50, padding: "10px 18px", border: "1px solid #1e1e24", display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: ePct > 30 ? "#5DCAA5" : ePct > 10 ? "#EF9F27" : "#E24B4A", fontFamily: MONO }}>{ePct}%</div>
              <div style={{ flex: 1, height: 8, background: "#1a2a22", borderRadius: 100, overflow: "hidden" }}><div style={{ width: `${ePct}%`, height: "100%", background: ePct > 30 ? "#5DCAA5" : ePct > 10 ? "#EF9F27" : "#E24B4A", borderRadius: 100, transition: "width 1s" }} /></div>
              <div style={{ fontSize: 11, color: "#555", fontFamily: MONO }}>{eHrs}h</div>
            </div>
          )}
        </div>

        <div className="tap" onClick={() => setRecordExpanded(!recordExpanded)}>
          {recordExpanded ? (
            <div>
              <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                {[{ v: tasksDoneCount, l: "TASKS", c: "#5DCAA5", bg: "#063d30", lt: "#E1F5EE", dur: fmtDur(dayLog.filter(e => e.type === "work").reduce((s, e) => s + e.duration, 0)) }, { v: restsDoneCount, l: "RESTS", c: "#7F77DD", bg: "#1e1a4d", lt: "#EEEDFE", dur: fmtDur(dayLog.filter(e => e.type === "rest").reduce((s, e) => s + e.duration, 0)) }, { v: idleMins, l: "MINS", c: "#EF9F27", bg: "#351c02", lt: "#FAEEDA", dur: "idle" }].map((s, i) => (
                  <div key={i} style={{ flex: 1, background: s.bg, borderRadius: 16, padding: "14px 12px", textAlign: "center" }}>
                    <div style={{ fontSize: 26, fontWeight: 800, color: s.lt, lineHeight: 1, fontFamily: DISPLAY }}>{s.v}</div>
                    <div style={{ fontSize: 10, color: s.c, marginTop: 4, fontFamily: MONO, letterSpacing: 1 }}>{s.l}</div>
                    <div style={{ fontSize: 10, color: s.c + "99", marginTop: 2 }}>{s.dur}</div>
                  </div>
                ))}
              </div>
              <div style={{ background: "#13131a", borderRadius: 12, padding: "10px 12px", border: "1px solid #1e1e24" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}><div style={{ width: 6, height: 6, borderRadius: "50%", background: "#5DCAA5", flexShrink: 0 }} /><div style={{ flex: 1, height: 4, background: "#1e1e24", borderRadius: 2, display: "flex", overflow: "hidden" }}>{dayLog.map((e, i) => <div key={i} style={{ width: `${Math.max(2, (e.duration / eTotal) * 100)}%`, background: e.type === "work" ? "#5DCAA5" : "#7F77DD" }} />)}</div></div>
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}><div style={{ fontSize: 10, color: "#555", fontFamily: MONO }}>06:30</div><div style={{ fontSize: 10, color: "#555", fontFamily: MONO }}>{new Date().toTimeString().slice(0, 5)}</div><div style={{ fontSize: 10, color: "#555", fontFamily: MONO }}>23:30</div></div>
              </div>
            </div>
          ) : (
            <div style={{ background: "#13131a", borderRadius: 14, padding: "10px 14px", border: "1px solid #1e1e24", display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ display: "flex", gap: 10 }}>
                {[{ v: tasksDoneCount, l: "TASKS", c: "#5DCAA5" }, { v: restsDoneCount, l: "RESTS", c: "#7F77DD" }, { v: `${idleMins}m`, l: "IDLE", c: "#EF9F27" }].map((s, i) => (
                  <div key={i} style={{ textAlign: "center" }}><div style={{ fontSize: 16, fontWeight: 800, color: "#E1F5EE", lineHeight: 1, fontFamily: DISPLAY }}>{s.v}</div><div style={{ fontSize: 8, color: s.c, fontFamily: MONO, letterSpacing: 1, marginTop: 2 }}>{s.l}</div></div>
                ))}
              </div>
              <div style={{ flex: 1 }} />
              <div style={{ fontSize: 11, color: "#555", fontFamily: MONO }}>{fmtDur(totalTracked)}</div>
            </div>
          )}
        </div>

        <Divider />

        {/* ═══ ZONE 2: NAVIGATION ═══ */}
        {/* Date row: month pill + scrollable dates (all same size, selected = enlarged) */}
        <div style={{ position: "relative", marginBottom: 12 }}>
          <div style={{ display: "flex", gap: 5, alignItems: "stretch" }}>
            {/* Month pill */}
            <div style={{ position: "relative", flexShrink: 0, zIndex: monthPickerOpen ? 20 : 1 }}>
              {!monthPickerOpen ? (
                <div className="tap" onClick={() => setMonthPickerOpen(true)} style={{ textAlign: "center", padding: "8px 4px", borderRadius: 12, width: 48, height: PILL_H, background: "#13131a", border: "1px solid #1e1e24", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2 }}>
                  <div style={{ fontSize: 9, color: "#5DCAA580", fontFamily: MONO }}>{viewYear}</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#5DCAA5", fontFamily: MONO }}>{MONTHS_SHORT[viewMonth]}</div>
                </div>
              ) : (
                <div ref={monthScrollRef} className="no-scroll" style={{ position: "absolute", top: 0, left: 0, zIndex: 20, background: "#13131a", border: "1px solid #5DCAA530", borderRadius: 12, width: 50, maxHeight: 210, overflowY: "auto", padding: "4px 0" }}>
                  {MONTHS_SHORT.map((m, i) => {
                    const isCur = i === today.getMonth() && viewYear === today.getFullYear();
                    const isSel = i === viewMonth;
                    return <div key={m} data-active={isSel ? "true" : "false"} className="tap" onClick={() => pickMonth(i)} style={{ padding: "7px 4px", textAlign: "center", borderRadius: 6, margin: "1px 3px", fontSize: 11, fontFamily: MONO, fontWeight: 600, cursor: "pointer", background: isSel ? "#5DCAA518" : "transparent", color: isSel ? "#5DCAA5" : isCur ? "#5DCAA5" : "#444" }}>{m}</div>;
                  })}
                </div>
              )}
            </div>

            {/* Scrollable date strip */}
            <div ref={dateScrollRef} style={{ display: "flex", gap: 5, overflowX: "auto", overflowY: "hidden", flex: 1, scrollbarWidth: "none", msOverflowStyle: "none", WebkitOverflowScrolling: "touch" }} className="no-scroll">
              {allDates.map((d) => {
                const isT = isSameDay(d, today);
                const isSel = isSameDay(d, selectedDate);
                const ev = EVENTS[dateKey(d)];

                if (isSel) {
                  return (
                    <div key={d.getTime()} style={{ flexShrink: 0, width: 80, height: PILL_H, borderRadius: 12, background: "#5DCAA510", border: "1.5px solid #5DCAA540", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "4px 4px" }}>
                      <div style={{ fontSize: 11, color: "#5DCAA5" }}>{DAYS[d.getDay()]}</div>
                      <div style={{ fontSize: 20, fontWeight: 700, color: "#5DCAA5", lineHeight: 1.1 }}>{d.getDate()}</div>
                      <div style={{ width: 5, height: 5, borderRadius: "50%", marginTop: 2, background: isT ? "#5DCAA5" : "transparent" }} />
                      {ev && <div style={{ fontSize: 7, color: "#EF9F27", fontFamily: MONO, marginTop: 1, lineHeight: 1, whiteSpace: "nowrap", maxWidth: 72, overflow: "hidden", textOverflow: "ellipsis" }}>{ev}</div>}
                    </div>
                  );
                }

                return (
                  <div key={d.getTime()} className="tap" onClick={() => setSelectedDate(new Date(d))} style={{ flexShrink: 0, width: 46, height: PILL_H, borderRadius: 12, background: "#1e1e24", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                    <div style={{ fontSize: 11, color: "#555" }}>{DAYS[d.getDay()]}</div>
                    <div style={{ fontSize: 14, color: "#666", fontWeight: 600 }}>{d.getDate()}</div>
                    <div style={{ width: 5, height: 5, borderRadius: "50%", marginTop: 2, background: isT ? "#5DCAA5" : "transparent" }} />
                  </div>
                );
              })}
            </div>
          </div>
          {monthPickerOpen && <div onClick={() => setMonthPickerOpen(false)} style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 10 }} />}
        </div>

        {/* Tags */}
        <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap", marginBottom: 4 }}>
          {["today", "categories", "income", ...customGroups].map(t => (
            <div key={t} className="tap" onClick={() => setActiveTab(t)} style={{ padding: "7px 16px", borderRadius: 100, fontFamily: MONO, fontSize: 11, fontWeight: 700, letterSpacing: 1, background: activeTab === t ? "#5DCAA5" : "#1e1e24", color: activeTab === t ? "#063d30" : "#555" }}>{t.toUpperCase()}</div>
          ))}
          <div className="tap" onClick={addGroup} style={{ width: 30, height: 30, borderRadius: "50%", background: "#1e1e24", display: "flex", alignItems: "center", justifyContent: "center", border: "1px dashed #444" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          </div>
        </div>

        <Divider />

        {/* ═══ ZONE 3: CONTENT ═══ */}
        {activeTab === "today" && (
          <>
            {!hasTasks && (
              <div style={{ border: "1px dashed #2a2a30", borderRadius: 16, padding: "28px 16px 16px", textAlign: "center" }}>
                <div style={{ fontSize: 14, color: "#555", marginBottom: 4 }}>No tasks yet</div>
                <div style={{ fontSize: 11, color: "#333", fontFamily: MONO, marginBottom: 16 }}>Type below to add your first task</div>
                <div style={{ background: "#13131a", borderRadius: 14, padding: "12px 14px", border: "1px solid #5DCAA530", display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 16, color: "#5DCAA5" }}>+</span>
                  <input value={cmdInput} onChange={e => setCmdInput(e.target.value)} onKeyDown={e => e.key === "Enter" && addTask()} placeholder="task name 2pm 1.5h work" style={{ flex: 1, background: "none", border: "none", color: "#ccc", fontSize: 13, fontFamily: BODY, outline: "none" }} />
                  {cmdInput && <div className="tap" onClick={addTask} style={{ background: "#5DCAA5", borderRadius: 8, padding: "6px 14px", fontSize: 11, color: "#063d30", fontWeight: 700, fontFamily: MONO }}>GO</div>}
                </div>
                <div style={{ fontSize: 10, color: "#333", marginTop: 5, fontFamily: MONO }}>name + time + duration + work/rest</div>
              </div>
            )}

            {/* Pending tasks — play button on right, tap center for details */}
            {hasTasks && pendingTasks.map((task, i) => {
              const isWork = task.type === "work"; const accent = isWork ? "#5DCAA5" : "#7F77DD";
              const isActive = task.status === "active"; const isExpanded = expandedTask === task.id;

              if (isActive) return (
                <div key={task.id} style={{ marginBottom: 8, animation: `fadeUp 0.3s ease ${i * 0.04}s both` }}>
                  <div style={{ background: "#13131a", borderRadius: 16, padding: "16px 18px", border: `1px solid ${accent}50` }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 10, color: accent, fontFamily: MONO, letterSpacing: 1, marginBottom: 4 }}>{task.time} — {fmtTime(Math.floor((task.timeMin + task.duration) / 60), (task.timeMin + task.duration) % 60)}</div>
                        <div style={{ fontSize: 16, color: "#eee", fontWeight: 700, fontFamily: DISPLAY }}>{task.name}</div>
                        <div style={{ display: "flex", gap: 6, marginTop: 6 }}><span style={{ fontSize: 9, color: "#666", background: "#ffffff08", padding: "3px 8px", borderRadius: 6, fontFamily: MONO, fontWeight: 600 }}>{task.type.toUpperCase()}</span><span style={{ fontSize: 9, color: "#666", background: "#ffffff08", padding: "3px 8px", borderRadius: 6, fontFamily: MONO, fontWeight: 600 }}>{fmtDur(task.duration)}</span></div>
                      </div>
                      <div className="pulse-dot" style={{ width: 10, height: 10, borderRadius: "50%", background: accent, boxShadow: `0 0 0 3px ${accent}30` }} />
                    </div>
                  </div>
                </div>
              );

              return (
                <div key={task.id} style={{ marginBottom: 8, animation: `fadeUp 0.3s ease ${i * 0.04}s both` }}>
                  <div style={{ background: "#13131a", borderRadius: isExpanded ? "16px 16px 0 0" : 16, border: "1px solid #1e1e24", borderBottom: isExpanded ? "none" : undefined }}>
                    <div style={{ display: "flex", alignItems: "center" }}>
                      {/* Main content — tap for details */}
                      <div className="tap" onClick={() => setExpandedTask(isExpanded ? null : task.id)} style={{ flex: 1, padding: "16px 0 16px 18px" }}>
                        <div style={{ fontSize: 10, color: accent, fontFamily: MONO, letterSpacing: 1, marginBottom: 4 }}>{task.time} — {fmtTime(Math.floor((task.timeMin + task.duration) / 60), (task.timeMin + task.duration) % 60)}</div>
                        <div style={{ fontSize: 16, color: "#ccc", fontWeight: 700, fontFamily: DISPLAY }}>{task.name}</div>
                        <div style={{ display: "flex", gap: 6, marginTop: 6 }}><span style={{ fontSize: 9, color: "#666", background: "#ffffff08", padding: "3px 8px", borderRadius: 6, fontFamily: MONO, fontWeight: 600 }}>{task.type.toUpperCase()}</span><span style={{ fontSize: 9, color: "#666", background: "#ffffff08", padding: "3px 8px", borderRadius: 6, fontFamily: MONO, fontWeight: 600 }}>{fmtDur(task.duration)}</span></div>
                      </div>
                      {/* Play button */}
                      <div className="tap" onClick={(e) => { e.stopPropagation(); startTask(task); }} style={{ padding: "16px 18px 16px 12px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <div style={{ width: 36, height: 36, borderRadius: 10, background: `${accent}15`, border: `1px solid ${accent}30`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <PlayIcon size={16} color={accent} />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 4 action blocks */}
                  {isExpanded && (
                    <div style={{ background: "#13131a", borderRadius: "0 0 16px 16px", padding: "12px 14px 14px", border: "1px solid #1e1e24", borderTop: "1px dashed #2a2a30" }}>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                        {/* Set as rest / work */}
                        <div className="tap" onClick={() => toggleRest(task)} style={{ background: task.type === "rest" ? "#1e1a4d" : "#0d2a3a", borderRadius: 14, padding: "14px 12px", textAlign: "center" }}>
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={task.type === "rest" ? "#AFA9EC" : "#5DCAA5"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ margin: "0 auto 6px" }}><path d="M21 12.79A9 9 0 1111.21 3a7 7 0 009.79 9.79z"/></svg>
                          <div style={{ fontSize: 13, fontWeight: 700, color: task.type === "rest" ? "#EEEDFE" : "#E1F5EE", fontFamily: DISPLAY }}>{task.type === "rest" ? "Set as work" : "Set as rest"}</div>
                          <div style={{ fontSize: 10, color: task.type === "rest" ? "#AFA9EC" : "#9FE1CB", fontFamily: MONO, marginTop: 3 }}>{task.type === "rest" ? "drains energy" : "charges energy"}</div>
                        </div>

                        {/* Mark as done */}
                        <div className="tap" onClick={() => markDone(task)} style={{ background: "#063d30", borderRadius: 14, padding: "14px 12px", textAlign: "center" }}>
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#9FE1CB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ margin: "0 auto 6px" }}><polyline points="20 6 9 17 4 12"/></svg>
                          <div style={{ fontSize: 13, fontWeight: 700, color: "#E1F5EE", fontFamily: DISPLAY }}>Mark as done</div>
                          <div style={{ fontSize: 10, color: "#9FE1CB", fontFamily: MONO, marginTop: 3 }}>complete task</div>
                        </div>

                        {/* Edit */}
                        <div className="tap" onClick={() => openEditModal(task)} style={{ background: "#1e1a4d", borderRadius: 14, padding: "14px 12px", textAlign: "center" }}>
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#AFA9EC" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ margin: "0 auto 6px" }}><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                          <div style={{ fontSize: 13, fontWeight: 700, color: "#EEEDFE", fontFamily: DISPLAY }}>Edit</div>
                          <div style={{ fontSize: 10, color: "#AFA9EC", fontFamily: MONO, marginTop: 3 }}>rename task</div>
                        </div>

                        {/* Delete */}
                        <div className="tap" onClick={() => deleteTask(task)} style={{ background: "#3a140a", borderRadius: 14, padding: "14px 12px", textAlign: "center" }}>
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#F5C4B3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ margin: "0 auto 6px" }}><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
                          <div style={{ fontSize: 13, fontWeight: 700, color: "#FAECE7", fontFamily: DISPLAY }}>Delete</div>
                          <div style={{ fontSize: 10, color: "#F5C4B3", fontFamily: MONO, marginTop: 3 }}>remove task</div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Completed stack */}
            {doneTasks.length > 0 && (
              <div style={{ marginTop: 12 }}>
                <div className="tap" onClick={() => setShowCompleted(!showCompleted)}>
                  {!showCompleted && (
                    <div style={{ position: "relative", height: Math.min(doneTasks.length, 3) * 6 + 48 }}>
                      {doneTasks.slice(-3).map((t, i, arr) => { const isWork = t.type === "work"; const bg = isWork ? "#063d30" : "#1e1a4d"; const accent = isWork ? "#5DCAA5" : "#7F77DD"; const light = isWork ? "#E1F5EE" : "#EEEDFE"; const off = (arr.length - 1 - i) * 6; return (
                        <div key={t.id} style={{ position: i === arr.length - 1 ? "relative" : "absolute", top: off, left: 0, right: 0, background: bg, borderRadius: 12, padding: "12px 14px", border: `1px solid ${accent}30`, display: "flex", alignItems: "center", gap: 10, zIndex: i }}>
                          <div style={{ fontSize: 10, color: accent, fontFamily: MONO, minWidth: 38, fontWeight: 600 }}>{t.time}</div>
                          <div style={{ fontSize: 13, color: light, fontWeight: 700, flex: 1, textDecoration: "line-through", textDecorationColor: `${accent}60`, fontFamily: DISPLAY }}>{t.name}</div>
                          <div style={{ fontSize: 9, color: accent, fontFamily: MONO, fontWeight: 600 }}>{fmtDur(t.duration)}</div>
                        </div>
                      ); })}
                    </div>
                  )}
                </div>
                {showCompleted && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    {doneTasks.map((task, i) => { const isWork = task.type === "work"; const bg = isWork ? "#063d30" : "#1e1a4d"; const accent = isWork ? "#5DCAA5" : "#7F77DD"; const light = isWork ? "#E1F5EE" : "#EEEDFE"; const isExp = expandedTask === task.id; return (
                      <SwipeDone key={task.id} onUndone={() => markUndone(task)}>
                        <div>
                          <div className="tap" onClick={() => setExpandedTask(isExp ? null : task.id)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", background: bg, borderRadius: isExp ? "12px 12px 0 0" : 12, border: `1px solid ${accent}30`, borderBottom: isExp ? "none" : undefined, animation: `fadeUp 0.2s ease ${i * 0.03}s both` }}>
                            <div style={{ fontSize: 10, color: accent, fontFamily: MONO, minWidth: 38, fontWeight: 600 }}>{task.time}</div>
                            <div style={{ fontSize: 13, color: light, fontWeight: 700, flex: 1, textDecoration: "line-through", textDecorationColor: `${accent}60`, fontFamily: DISPLAY }}>{task.name}</div>
                            <div style={{ fontSize: 9, color: accent, fontFamily: MONO, fontWeight: 600 }}>{fmtDur(task.duration)}</div>
                          </div>
                          {isExp && (
                            <div style={{ background: bg, borderRadius: "0 0 12px 12px", padding: "10px 14px", border: `1px solid ${accent}30`, borderTop: `1px dashed ${accent}20`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                              <div style={{ display: "flex", gap: 8, fontSize: 11, color: accent + "aa", fontFamily: MONO }}><span>{task.time} — {fmtTime(Math.floor((task.timeMin + task.duration) / 60), (task.timeMin + task.duration) % 60)}</span><span>{task.type.toUpperCase()}</span><span>{fmtDur(task.duration)}</span></div>
                              <div className="tap" onClick={(e) => { e.stopPropagation(); markUndone(task); }} style={{ width: 32, height: 32, borderRadius: 8, background: `${accent}20`, border: `1.5px solid ${accent}50`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                              </div>
                            </div>
                          )}
                        </div>
                      </SwipeDone>
                    ); })}
                    <div className="tap" onClick={() => setShowCompleted(false)} style={{ textAlign: "center", padding: 8 }}><div style={{ fontSize: 10, color: "#333" }}>{"\u25B2"}</div></div>
                  </div>
                )}
              </div>
            )}

            {hasTasks && (
              <div style={{ marginTop: 14, background: "#13131a", borderRadius: 14, padding: "12px 14px", border: "1px solid #5DCAA530", display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 16, color: "#5DCAA5" }}>+</span>
                <input value={cmdInput} onChange={e => setCmdInput(e.target.value)} onKeyDown={e => e.key === "Enter" && addTask()} placeholder="task name 2pm 1.5h work" style={{ flex: 1, background: "none", border: "none", color: "#ccc", fontSize: 13, fontFamily: BODY, outline: "none" }} />
                {cmdInput && <div className="tap" onClick={addTask} style={{ background: "#5DCAA5", borderRadius: 8, padding: "6px 14px", fontSize: 11, color: "#063d30", fontWeight: 700, fontFamily: MONO }}>GO</div>}
              </div>
            )}
          </>
        )}

        {activeTab === "categories" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {PHASE_CARDS.map((p, i) => (
              <div key={p.id} style={{ background: p.bg, borderRadius: 16, padding: "18px 20px", animation: `fadeUp 0.35s ease ${i * 0.06}s both` }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}><div><div style={{ fontSize: 10, fontFamily: MONO, fontWeight: 600, letterSpacing: 2, color: p.mid }}>{p.label}</div><div style={{ fontSize: 18, fontWeight: 700, color: p.light, fontFamily: DISPLAY, marginTop: 4 }}>{p.title}</div></div><div style={{ textAlign: "right" }}><div style={{ fontSize: 30, fontWeight: 800, color: p.light, fontFamily: DISPLAY, lineHeight: 1 }}>{p.pct}<span style={{ fontSize: 14, color: p.mid }}>%</span></div><div style={{ fontSize: 11, color: p.mid, fontFamily: MONO }}>{p.done}/{p.total}</div></div></div>
                <div style={{ height: 3, background: p.dim, borderRadius: 2, marginTop: 12, overflow: "hidden" }}><div style={{ height: "100%", width: `${p.pct}%`, background: p.accent, borderRadius: 2 }} /></div>
              </div>
            ))}
          </div>
        )}

        {activeTab === "income" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {INCOME.map((m, i) => (
              <div key={m.label} style={{ background: m.bg, borderRadius: 16, padding: "20px 22px", animation: `fadeUp 0.35s ease ${i * 0.07}s both` }}>
                <div style={{ fontSize: 26, fontWeight: 800, color: m.light, fontFamily: DISPLAY, letterSpacing: -0.5 }}>{m.label}</div>
                <div style={{ fontSize: 12, color: m.mid, marginTop: 2, fontFamily: MONO }}>{m.desc}</div>
              </div>
            ))}
          </div>
        )}

        {!["today", "categories", "income"].includes(activeTab) && (
          <div style={{ textAlign: "center", padding: "40px 20px", border: "1px dashed #2a2a30", borderRadius: 16 }}><div style={{ fontSize: 14, color: "#444" }}>{activeTab}</div><div style={{ fontSize: 12, color: "#333", fontFamily: MONO, marginTop: 4 }}>Custom group</div></div>
        )}
      </div>

      {/* ═══ TASK POPUP — full visible above bottom nav ═══ */}
      {(popupState === "working" || popupState === "resting") && activeTask && (() => {
        const isW = popupState === "working"; const pc = isW ? "#5DCAA5" : "#7F77DD"; const pcBg = isW ? "#063d30" : "#1e1a4d"; const pcLight = isW ? "#E1F5EE" : "#EEEDFE";
        return (
          <div style={{ position: "fixed", bottom: "calc(76px + env(safe-area-inset-bottom, 0px))", left: "50%", transform: "translateX(-50%)", width: "calc(100% - 28px)", maxWidth: 402, zIndex: 90 }}>
            <div style={{ background: "#0c0c14", borderRadius: 20, padding: "20px", border: `1.5px solid ${pc}35` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                {/* Progress ring */}
                <div style={{ position: "relative", width: 52, height: 52, flexShrink: 0 }}>
                  <svg width="52" height="52" viewBox="0 0 52 52"><circle cx="26" cy="26" r="22" fill="none" stroke="#1e1e24" strokeWidth="3" /><circle cx="26" cy="26" r="22" fill="none" stroke={pc} strokeWidth="3" strokeDasharray="138.2" strokeDashoffset={isW ? 138.2 - (138.2 * Math.min(1, activeElapsedMin / Math.max(1, activeTask.duration))) : 138.2 * 0.3} strokeLinecap="round" transform="rotate(-90 26 26)" /></svg>
                  <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", fontSize: 11, color: pc, fontWeight: 700, fontFamily: MONO }}>{isW ? `${Math.round((activeElapsedMin / Math.max(1, activeTask.duration)) * 100)}%` : "\u2723"}</div>
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                    <div className="pulse-dot" style={{ width: 7, height: 7, borderRadius: "50%", background: pc, flexShrink: 0 }} />
                    <div style={{ fontSize: 11, color: pc, fontWeight: 700, fontFamily: MONO, letterSpacing: 1.5 }}>{isW ? "WORKING" : "RESTING"}</div>
                  </div>
                  <div style={{ fontSize: 15, color: pcLight, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{activeTask.name}</div>
                  <div style={{ fontSize: 10, color: "#555", fontFamily: MONO, marginTop: 3 }}>{isW ? `draining \u2022 ${fmtDur(activeTask.duration)} planned` : `+${(activeElapsedMin / 60).toFixed(1)}h recharged`}</div>
                </div>

                {/* Timer + stop */}
                <div style={{ textAlign: "center", flexShrink: 0 }}>
                  <div style={{ fontSize: 20, color: pcLight, fontWeight: 800, fontFamily: MONO, lineHeight: 1 }}>{activeTimerStr}</div>
                  <div className="tap" onClick={stopTask} style={{ width: 36, height: 36, borderRadius: 10, background: "#E24B4A18", border: "1px solid #E24B4A30", display: "flex", alignItems: "center", justifyContent: "center", margin: "8px auto 0" }}>
                    <StopIcon size={16} color="#E24B4A" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {popupState === "upcoming" && upcoming && (
        <div style={{ position: "fixed", bottom: "calc(76px + env(safe-area-inset-bottom, 0px))", left: "50%", transform: "translateX(-50%)", width: "calc(100% - 28px)", maxWidth: 402, zIndex: 90 }}>
          <div style={{ background: "#0c0c14", borderRadius: 20, padding: "20px", border: "1.5px solid #EF9F2735" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <div style={{ position: "relative", width: 52, height: 52, flexShrink: 0 }}>
                <svg width="52" height="52" viewBox="0 0 52 52"><circle cx="26" cy="26" r="22" fill="none" stroke="#1e1e24" strokeWidth="3" /><circle cx="26" cy="26" r="22" fill="none" stroke="#EF9F27" strokeWidth="3" strokeDasharray="138.2" strokeDashoffset={138.2 * (upcomingMins / 60)} strokeLinecap="round" transform="rotate(-90 26 26)" /></svg>
                <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", fontSize: 11, color: "#EF9F27", fontWeight: 700, fontFamily: MONO }}>{upcomingMins}m</div>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}><div style={{ width: 7, height: 7, borderRadius: "50%", background: "#EF9F27", flexShrink: 0 }} /><div style={{ fontSize: 11, color: "#EF9F27", fontWeight: 700, fontFamily: MONO, letterSpacing: 1.5 }}>NEXT UP</div></div>
                <div style={{ fontSize: 15, color: "#FAEEDA", fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{upcoming.name}</div>
                <div style={{ fontSize: 10, color: "#555", fontFamily: MONO, marginTop: 3 }}>{fmtDur(upcoming.duration)} · {upcoming.type}</div>
              </div>
              <div style={{ textAlign: "center", flexShrink: 0 }}>
                <div style={{ fontSize: 20, color: "#FAC775", fontWeight: 800, fontFamily: MONO, lineHeight: 1 }}>0:{pad(upcomingMins)}</div>
                <div className="tap" onClick={() => startTask(upcoming)} style={{ width: 36, height: 36, borderRadius: 10, background: "#5DCAA518", border: "1px solid #5DCAA530", display: "flex", alignItems: "center", justifyContent: "center", margin: "8px auto 0" }}>
                  <PlayIcon size={16} color="#5DCAA5" />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══ EDIT TASK MODAL ═══ */}
      {editModal && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 200, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
          <div onClick={() => setEditModal(null)} style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.6)" }} />
          <div style={{ position: "relative", width: "100%", maxWidth: 430, background: "#13131a", borderRadius: "24px 24px 0 0", padding: "24px 20px 36px", zIndex: 201, border: "1px solid #1e1e24", borderBottom: "none" }}>
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: "#E1F5EE", fontFamily: DISPLAY }}>Edit task</div>
              <div className="tap" onClick={() => setEditModal(null)} style={{ width: 32, height: 32, borderRadius: 10, background: "#1e1e24", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </div>
            </div>

            {/* Title */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 10, color: "#5DCAA5", fontFamily: MONO, letterSpacing: 2, marginBottom: 6 }}>TITLE</div>
              <input value={editFields.name} onChange={e => setEditFields({ ...editFields, name: e.target.value })} style={{ width: "100%", background: "#0e0e12", border: "1px solid #2a2a30", borderRadius: 12, padding: "12px 14px", color: "#ccc", fontSize: 14, fontFamily: BODY, outline: "none" }} />
            </div>

            {/* Time + Duration row */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
              <div>
                <div style={{ fontSize: 10, color: "#5DCAA5", fontFamily: MONO, letterSpacing: 2, marginBottom: 6 }}>TIME</div>
                <input type="time" value={editFields.time} onChange={e => setEditFields({ ...editFields, time: e.target.value })} style={{ width: "100%", background: "#0e0e12", border: "1px solid #2a2a30", borderRadius: 12, padding: "12px 14px", color: "#ccc", fontSize: 14, fontFamily: MONO, outline: "none", colorScheme: "dark" }} />
              </div>
              <div>
                <div style={{ fontSize: 10, color: "#5DCAA5", fontFamily: MONO, letterSpacing: 2, marginBottom: 6 }}>DURATION (MIN)</div>
                <input type="number" value={editFields.duration} onChange={e => setEditFields({ ...editFields, duration: e.target.value })} style={{ width: "100%", background: "#0e0e12", border: "1px solid #2a2a30", borderRadius: 12, padding: "12px 14px", color: "#ccc", fontSize: 14, fontFamily: MONO, outline: "none" }} />
              </div>
            </div>

            {/* Description */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 10, color: "#5DCAA5", fontFamily: MONO, letterSpacing: 2, marginBottom: 6 }}>DESCRIPTION</div>
              <input value={editFields.desc} onChange={e => setEditFields({ ...editFields, desc: e.target.value })} placeholder="Optional notes..." style={{ width: "100%", background: "#0e0e12", border: "1px solid #2a2a30", borderRadius: 12, padding: "12px 14px", color: "#ccc", fontSize: 14, fontFamily: BODY, outline: "none" }} />
            </div>

            {/* Tags + Hour rate row */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
              <div>
                <div style={{ fontSize: 10, color: "#5DCAA5", fontFamily: MONO, letterSpacing: 2, marginBottom: 6 }}>TYPE</div>
                <div style={{ display: "flex", gap: 6 }}>
                  {["work", "rest"].map(t => (
                    <div key={t} className="tap" onClick={() => setEditFields({ ...editFields, type: t })} style={{
                      flex: 1, padding: "10px 8px", borderRadius: 10, textAlign: "center", fontSize: 12, fontWeight: 700, fontFamily: MONO,
                      background: editFields.type === t ? (t === "work" ? "#063d30" : "#1e1a4d") : "#0e0e12",
                      border: `1px solid ${editFields.type === t ? (t === "work" ? "#5DCAA540" : "#7F77DD40") : "#2a2a30"}`,
                      color: editFields.type === t ? (t === "work" ? "#5DCAA5" : "#7F77DD") : "#555"
                    }}>{t.toUpperCase()}</div>
                  ))}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 10, color: "#5DCAA5", fontFamily: MONO, letterSpacing: 2, marginBottom: 6 }}>HOUR RATE (RM)</div>
                <input type="number" value={editFields.rate} onChange={e => setEditFields({ ...editFields, rate: e.target.value })} placeholder="0" style={{ width: "100%", background: "#0e0e12", border: "1px solid #2a2a30", borderRadius: 12, padding: "12px 14px", color: "#ccc", fontSize: 14, fontFamily: MONO, outline: "none" }} />
              </div>
            </div>

            {/* Save button */}
            <div className="tap" onClick={saveEdit} style={{ background: "#5DCAA5", borderRadius: 14, padding: "14px", textAlign: "center", fontSize: 14, fontWeight: 700, color: "#063d30", fontFamily: DISPLAY }}>Save changes</div>
          </div>
        </div>
      )}

      {/* ═══ ADD GROUP MODAL ═══ */}
      {showGroupModal && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 200, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
          <div onClick={() => setShowGroupModal(false)} style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.6)" }} />
          <div style={{ position: "relative", width: "100%", maxWidth: 430, background: "#13131a", borderRadius: "24px 24px 0 0", padding: "24px 20px 36px", zIndex: 201, border: "1px solid #1e1e24", borderBottom: "none" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: "#E1F5EE", fontFamily: DISPLAY }}>New group</div>
              <div className="tap" onClick={() => setShowGroupModal(false)} style={{ width: 32, height: 32, borderRadius: 10, background: "#1e1e24", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </div>
            </div>
            <div style={{ fontSize: 10, color: "#5DCAA5", fontFamily: MONO, letterSpacing: 2, marginBottom: 6 }}>GROUP NAME</div>
            <input autoFocus value={groupInput} onChange={e => setGroupInput(e.target.value)} onKeyDown={e => e.key === "Enter" && confirmAddGroup()} placeholder="e.g. PERSONAL, FITNESS..." style={{ width: "100%", background: "#0e0e12", border: "1px solid #2a2a30", borderRadius: 12, padding: "12px 14px", color: "#ccc", fontSize: 14, fontFamily: BODY, outline: "none", marginBottom: 20 }} />
            <div className="tap" onClick={confirmAddGroup} style={{ background: "#5DCAA5", borderRadius: 14, padding: "14px", textAlign: "center", fontSize: 14, fontWeight: 700, color: "#063d30", fontFamily: DISPLAY }}>Add group</div>
          </div>
        </div>
      )}

      {/* ═══ BOTTOM NAV — pill style ═══ */}
      <div style={{ position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 430, padding: "0 12px calc(12px + env(safe-area-inset-bottom, 0px))", zIndex: 100 }}>
        <div style={{ background: "#18181f", borderRadius: 50, padding: "6px 8px", display: "flex", alignItems: "center", justifyContent: "space-around", border: "1px solid #222230" }}>
          {[
            { id: "cat", label: "Home", icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg> },
            { id: "det", label: "Details", icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg> },
            { id: "con", label: "Connect", icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4-4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg> },
            { id: "ai", label: "AI", icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg> },
          ].map(item => {
            const active = bottomTab === item.id;
            return (
              <div key={item.id} className="tap" onClick={() => setBottomTab(item.id)} style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: active ? "10px 18px" : "10px 12px",
                borderRadius: 50,
                background: active ? "#252530" : "transparent",
                color: active ? "#f0f0f0" : "#3a3a42",
                transition: "all 0.2s ease",
              }}>
                <div style={{ color: "inherit" }}>{item.icon}</div>
                {active && <span style={{ fontSize: 11, fontWeight: 700, fontFamily: MONO, letterSpacing: 0.5 }}>{item.label}</span>}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}


