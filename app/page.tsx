"use client";
import { useState, useEffect, useCallback, useRef, useMemo } from "react";

import {
  initNotifications,
  scheduleTaskNotifications,
  schedulePauseReminder,
  cancelPauseReminder,
  scheduleDaySummary,
  onTaskDone,
  clearAllNotifications,
  getPermissionStatus,
} from "./notifications";

import { ensureAuth, syncAllTasks, syncDayLog, saveProfile } from '../lib/sync';

const DISPLAY = "'Sora', sans-serif";
const BODY = "'Plus Jakarta Sans', sans-serif";
const MONO = "'IBM Plex Mono', monospace";
const STORAGE_KEY = "doit-v8-shift";
const PLAN_KEY = "doit-v8-plan";
const SETTINGS_KEY = "doit-v8-settings";
const DEFAULT_ENERGY = 17;
const GRACE_PERIOD_MS = 15 * 60 * 1000; // 15 minutes

// Power bar drain rates (per real minute)
interface DrainRates {
  idle: number;     // Low consume when doing nothing
  work: number;     // Normal consume during tasks
  urgent: number;   // Faster consume during urgent tasks
  rest: number;     // Recharge rate (negative = recharge)
  wakeHour: number;
  wakeMinute: number;
  sleepHour: number;
  sleepMinute: number;
  maxEnergyHours: number;
}

const DEFAULT_RATES: DrainRates = {
  idle: 0.5,
  work: 1.0,
  urgent: 1.5,
  rest: 0.3,  // recharge per minute
  wakeHour: 6, wakeMinute: 30,
  sleepHour: 23, sleepMinute: 30,
  maxEnergyHours: 17,
};

const RATE_LIMITS = {
  idle: { min: 0.1, max: 1.0 },
  work: { min: 0.5, max: 2.0 },
  urgent: { min: 1.0, max: 3.0 },
  rest: { min: 0.1, max: 1.0 },
};

interface Template {
  id: string;
  name: string;
  time: string;
  timeMin: number;
  duration: number;
  type: string;
  days: number[]; // 0=Sun, 1=Mon, ..., 6=Sat. Empty = daily
}

interface DayHistory {
  date: string;
  tasks: number;
  done: number;
  skipped: number;
  totalMin: number;
  log: any[];
}

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
function nowMinutes(): number { const n = new Date(); return n.getHours() * 60 + n.getMinutes(); }

function parseCmd(input: string, category: 'task' | 'rest' | 'life' = 'task') {
  let text = input.trim(); if (!text) return null;
  // Category → energy type: rest charges, task/life drain
  let type = category === 'rest' ? 'rest' : 'work';
  let urgent = false;
  if (/\burgent\b/i.test(text)) { urgent = true; text = text.replace(/\burgent\b/i, ""); }
  // Still allow text override for backward compat
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
  return { name, category, time: fmtTime(hour, minute), timeMin: hour * 60 + minute, duration, planned_duration: duration, actual_duration: null as number | null, type, urgent, id: genId(), status: "pending", adjustedTimeMin: null as number | null, skippedAt: null as number | null };
}

// ═══ AUTO-SHIFT ENGINE ═══
// When a disruption happens (skip, late start, pause overrun), recalculate all future task times
function autoShift(tasks: any[], fromTimeMin: number, delayMinutes: number): any[] {
  return tasks.map(t => {
    if (t.status === "done" || t.status === "skipped" || t.status === "active") return t;
    const effectiveTime = t.adjustedTimeMin ?? t.timeMin;
    if (effectiveTime >= fromTimeMin) {
      return { ...t, adjustedTimeMin: effectiveTime + delayMinutes };
    }
    return t;
  });
}

// Get the display time for a task (adjusted or original)
function getDisplayTime(task: any): string {
  const mins = task.adjustedTimeMin ?? task.timeMin;
  return fmtTime(Math.floor(mins / 60) % 24, mins % 60);
}
function getDisplayTimeMin(task: any): number {
  return task.adjustedTimeMin ?? task.timeMin;
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

function PauseIcon({ size = 18, color = "#EF9F27" }: { size?: number; color?: string }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none"><rect x="6" y="5" width="4" height="14" rx="1" fill={color} /><rect x="14" y="5" width="4" height="14" rx="1" fill={color} /></svg>;
}

function SkipIcon({ size = 18, color = "#888" }: { size?: number; color?: string }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none"><path d="M5 4l10 8-10 8V4z" fill={color} /><rect x="17" y="5" width="3" height="14" rx="1" fill={color} /></svg>;
}

function SwitchIcon({ size = 18, color = "#D4537E" }: { size?: number; color?: string }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="17 1 21 5 17 9" /><path d="M3 11V9a4 4 0 014-4h14" /><polyline points="7 23 3 19 7 15" /><path d="M21 13v2a4 4 0 01-4 4H3" /></svg>;
}

function Divider() {
  return <div style={{ height: 20, display: "flex", alignItems: "center", padding: "0 24px" }}><div style={{ flex: 1, height: 1, background: "linear-gradient(90deg, transparent, #1e1e2460, transparent)" }} /></div>;
}

export default function Home() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [activeTask, setActiveTask] = useState<any>(null);
  const [pausedTask, setPausedTask] = useState<any>(null); // NEW: paused task state
  const [switchingFrom, setSwitchingFrom] = useState<any>(null); // NEW: task we switched away from
  const [dayLog, setDayLog] = useState<any[]>([]);
  const [energyUsed, setEnergyUsed] = useState(0);
  const [energyCharged, setEnergyCharged] = useState(0);
  const [powerExpanded, setPowerExpanded] = useState(false);
  const [showPowerSettings, setShowPowerSettings] = useState(false);
  const [drainRates, setDrainRates] = useState<DrainRates>(DEFAULT_RATES);
  const powerTapTimer = useRef<any>(null);
  const [recordExpanded, setRecordExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState("today");
  const [notifEnabled, setNotifEnabled] = useState(false);
  const [notifBanner, setNotifBanner] = useState(false); // show permission prompt
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMonth, setViewMonth] = useState(new Date().getMonth());
  const [viewYear, setViewYear] = useState(new Date().getFullYear());
  const [cmdCategory, setCmdCategory] = useState<'task' | 'rest' | 'life'>('task');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [monthPickerOpen, setMonthPickerOpen] = useState(false);
  const [cmdInput, setCmdInput] = useState("");
  const [customGroups, setCustomGroups] = useState<string[]>([]);
  const [expandedTask, setExpandedTask] = useState<string | null>(null);
  const [showCompleted, setShowCompleted] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const [editModal, setEditModal] = useState<any>(null);
  const [editFields, setEditFields] = useState({ name: "", time: "", duration: "", type: "work", desc: "", rate: "" });
  const [groupInput, setGroupInput] = useState("");
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [showSwitchInput, setShowSwitchInput] = useState(false);
  const [switchInput, setSwitchInput] = useState("");
  // Plan data (kept for template auto-gen on day rollover)
  const [templates, setTemplates] = useState<Template[]>([]);
  const [history, setHistory] = useState<{ [date: string]: DayHistory }>({});
  const [streak, setStreak] = useState(0);
  const monthScrollRef = useRef<HTMLDivElement>(null);
  const dateScrollRef = useRef<HTMLDivElement>(null);
  const today = useMemo(() => new Date(), []);

  const getMYDate = (): string => {
    return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kuala_Lumpur" });
  };

  useEffect(() => {

    if (!("serviceWorker" in navigator)) return;
      const handler = (event: MessageEvent) => {
        if (event.data?.type === "NOTIFICATION_CLICK") {
          const { action, taskId } = event.data;
          if (action === "start" && taskId) {
            const task = tasks.find((t) => t.id === taskId);
            if (task && task.status === "pending") {
              startTask(task);
            }
          } else if (action === "resume") {
            if (pausedTask) resumePaused();
          }
          // "focus" action — just focusing the window is enough, already handled by SW
        }
      };
      navigator.serviceWorker.addEventListener("message", handler);
      return () => navigator.serviceWorker.removeEventListener("message", handler);
    }, [tasks, pausedTask]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const planRaw = localStorage.getItem(PLAN_KEY);
      let loadedTemplates: Template[] = [];
      let loadedHistory: { [date: string]: DayHistory } = {};
      let loadedStreak = 0;

      // Load plan data (persists forever)
      if (planRaw) {
        const pd = JSON.parse(planRaw);
        loadedTemplates = pd.templates || [];
        loadedHistory = pd.history || {};
        loadedStreak = pd.streak || 0;
        setTemplates(loadedTemplates);
        setHistory(loadedHistory);
        setStreak(loadedStreak);
      }

      // Load drain rate settings
      try {
        const settingsRaw = localStorage.getItem(SETTINGS_KEY);
        if (settingsRaw) setDrainRates({ ...DEFAULT_RATES, ...JSON.parse(settingsRaw) });
      } catch (e) {}

      if (raw) {
        const d = JSON.parse(raw);
        const todayMY = getMYDate();
        const savedDate = d.savedDate || "";
        if (savedDate !== todayMY) {
          // Archive yesterday's data to history
          if (savedDate && d.tasks) {
            const prevDone = (d.dayLog || []).filter((e: any) => e.type === "work").length + (d.dayLog || []).filter((e: any) => e.type === "rest").length;
            const prevSkipped = (d.tasks || []).filter((t: any) => t.status === "skipped").length;
            const prevTotal = (d.dayLog || []).reduce((s: number, e: any) => s + e.duration, 0);
            const hist: DayHistory = { date: savedDate, tasks: (d.tasks || []).length, done: prevDone, skipped: prevSkipped, totalMin: prevTotal, log: d.dayLog || [] };
            loadedHistory[savedDate] = hist;
            // Calculate streak
            let s = prevDone > 0 ? 1 : 0;
            if (s > 0) {
              const check = new Date(savedDate);
              for (let i = 1; i < 365; i++) {
                check.setDate(check.getDate() - 1);
                const ck = dateKey(check);
                if (loadedHistory[ck] && loadedHistory[ck].done > 0) s++;
                else break;
              }
            }
            loadedStreak = s;
            setHistory(loadedHistory);
            setStreak(loadedStreak);
            savePlan(loadedTemplates, loadedHistory, loadedStreak);
          }

          // Generate today's tasks from templates
          const todayDate = new Date();
          const todayDow = todayDate.getDay(); // 0=Sun
          const generatedTasks = loadedTemplates
            .filter(tpl => tpl.days.length === 0 || tpl.days.includes(todayDow))
            .map(tpl => ({
              name: tpl.name,
              time: tpl.time,
              timeMin: tpl.timeMin,
              duration: tpl.duration,
              type: tpl.type,
              id: genId(),
              status: "pending",
              adjustedTimeMin: null,
              skippedAt: null,
              fromTemplate: tpl.id,
            }));

          // Merge: keep manual tasks (no fromTemplate), replace template-generated ones
          const manualTasks = (d.tasks || []).filter((t: any) => !t.fromTemplate).map((t: any) => ({ ...t, status: "pending", adjustedTimeMin: null, skippedAt: null }));
          setTasks([...generatedTasks, ...manualTasks]);
          setDayLog([]);
          setEnergyUsed(0);
          setEnergyCharged(0);
          setActiveTask(null);
          setPausedTask(null);
          setSwitchingFrom(null);
          setCustomGroups(d.customGroups || []);
        } else {
          setTasks(d.tasks || []);
          setDayLog(d.dayLog || []);
          setEnergyUsed(d.energyUsed || 0);
          setEnergyCharged(d.energyCharged || 0);
          setActiveTask(d.activeTask || null);
          setPausedTask(d.pausedTask || null);
          setSwitchingFrom(d.switchingFrom || null);
          setCustomGroups(d.customGroups || []);
        }
      } else if (loadedTemplates.length > 0) {
        // No daily data but templates exist — generate tasks
        const todayDate = new Date();
        const todayDow = todayDate.getDay();
        const generatedTasks = loadedTemplates
          .filter(tpl => tpl.days.length === 0 || tpl.days.includes(todayDow))
          .map(tpl => ({
            name: tpl.name, time: tpl.time, timeMin: tpl.timeMin, duration: tpl.duration, type: tpl.type,
            id: genId(), status: "pending", adjustedTimeMin: null, skippedAt: null, fromTemplate: tpl.id,
          }));
        setTasks(generatedTasks);
      }
    } catch (e) {}

    // Connect to Supabase (non-blocking)
    ensureAuth().then(uid => {
      if (uid) setUserId(uid);
    });

    setLoaded(true);
  }, []);

    // ═══ NOTIFICATION INIT ═══
  useEffect(() => {
    if (!loaded) return;
    const status = getPermissionStatus();
    if (status === "granted") {
      initNotifications().then((ok) => setNotifEnabled(ok));
    } else if (status === "default") {
      // Show permission banner after 3 seconds (not immediately — feels less pushy)
      const t = setTimeout(() => setNotifBanner(true), 3000);
      return () => clearTimeout(t);
    }
  }, [loaded]);

    // ═══ RESCHEDULE ON TASK CHANGE ═══
  useEffect(() => {
    if (!notifEnabled) return;
    scheduleTaskNotifications(tasks);
  }, [tasks, notifEnabled]);

  // Schedule day summary on load
  useEffect(() => {
    if (!notifEnabled) return;
    scheduleDaySummary(drainRates.sleepHour, drainRates.sleepMinute);
  }, [notifEnabled, drainRates.sleepHour, drainRates.sleepMinute]);

  const persist = useCallback((data: any) => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...data, savedDate: getMYDate() })); } catch (e) {}
  }, []);

  const save = useCallback((t: any, log: any, eu: number, ec: number, at: any, cg: any, pt?: any, sf?: any) => {
    persist({ tasks: t, dayLog: log, energyUsed: eu, energyCharged: ec, activeTask: at, customGroups: cg, pausedTask: pt ?? null, switchingFrom: sf ?? null });
    // Background sync to Supabase
    if (userId) {
      const today = getMYDate();
      syncAllTasks(userId, t, today);
      syncDayLog(userId, today, {
        tasks_total: t.length,
        tasks_done: log.filter((e: any) => e.type === 'work' || e.type === 'rest').length,
        tasks_skipped: t.filter((x: any) => x.status === 'skipped').length,
        work_minutes: Math.round(log.filter((e: any) => e.type === 'work').reduce((s: number, e: any) => s + e.duration, 0)),
        rest_minutes: Math.round(log.filter((e: any) => e.type === 'rest').reduce((s: number, e: any) => s + e.duration, 0)),
        energy_used: eu,
        energy_charged: ec,
        log_entries: log,
      });
    }
  }, [persist, userId]);

  const savePlan = useCallback((tpls: Template[], hist: { [date: string]: DayHistory }, str: number) => {
    try { localStorage.setItem(PLAN_KEY, JSON.stringify({ templates: tpls, history: hist, streak: str })); } catch (e) {}
  }, []);

  const saveDrainRates = useCallback((rates: DrainRates) => {
    try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(rates)); } catch (e) {}
    setDrainRates(rates);
    if (userId) saveProfile(userId, {
      drain_idle: rates.idle, drain_work: rates.work,
      drain_urgent: rates.urgent, drain_rest: rates.rest,
      wake_hour: rates.wakeHour, wake_minute: rates.wakeMinute,
      sleep_hour: rates.sleepHour, sleep_minute: rates.sleepMinute,
      max_energy_h: rates.maxEnergyHours,
    });
  }, [userId]);

  // Template CRUD
  useEffect(() => { const id = setInterval(() => setTick(t => t + 1), 1000); return () => clearInterval(id); }, []);
  useEffect(() => { if (!activeTask) return; const elapsed = (Date.now() - activeTask.startedAt) / 60000; if (activeTask.type === "work") setEnergyUsed(activeTask.baseUsed + elapsed); else setEnergyCharged(activeTask.baseCharged + elapsed); }, [tick, activeTask]);

  // ═══ GRACE PERIOD AUTO-SKIP ═══
  useEffect(() => {
    if (activeTask) return; // don't auto-skip while something is running
    const now = nowMinutes();
    const nowMs = Date.now();
    let shifted = false;
    let updatedTasks = [...tasks];

    updatedTasks = updatedTasks.map(t => {
      if (t.status !== "pending") return t;
      const taskTime = getDisplayTimeMin(t);
      const overdueMs = (now - taskTime) * 60 * 1000;
      // If task is more than 15 minutes overdue and not yet skipped
      if (overdueMs >= GRACE_PERIOD_MS && taskTime < now) {
        shifted = true;
        return { ...t, status: "skipped", skippedAt: nowMs };
      }
      return t;
    });

    if (shifted) {
      // Auto-shift remaining tasks
      const skippedTasks = updatedTasks.filter(t => t.status === "skipped" && t.skippedAt === nowMs);
      let totalDelay = 0;
      for (const st of skippedTasks) {
        totalDelay += st.duration;
      }
      if (totalDelay > 0) {
        updatedTasks = autoShift(updatedTasks, now, 0); // just re-sort, delay already baked in by time passing
      }
      setTasks(updatedTasks);
      save(updatedTasks, dayLog, energyUsed, energyCharged, activeTask, customGroups, pausedTask, switchingFrom);
    }
  }, [tick, tasks, activeTask, dayLog, energyUsed, energyCharged, customGroups, pausedTask, switchingFrom, save]);

  // Scroll to selected date
  useEffect(() => {
    if (!dateScrollRef.current) return;
    const selIdx = selectedDate.getDate() - 1;
    const pillW = 52;
    const container = dateScrollRef.current;
    const scrollTo = selIdx * pillW - container.clientWidth / 2 + pillW / 2;
    container.scrollTo({ left: Math.max(0, scrollTo), behavior: "smooth" });
  }, [selectedDate, viewMonth]);

  // Auto-scroll back to today when user returns to app or switches to Today tab
  useEffect(() => {
    const resetToToday = () => {
      if (document.visibilityState === "visible") {
        const now = new Date();
        setSelectedDate(now);
        setViewMonth(now.getMonth());
        setViewYear(now.getFullYear());
      }
    };
    document.addEventListener("visibilitychange", resetToToday);
    return () => document.removeEventListener("visibilitychange", resetToToday);
  }, []);

  // ═══ POWER BAR — drain rate calculation ═══
  const activeElapsed = activeTask ? Math.floor((Date.now() - activeTask.startedAt) / 1000) : 0;
  const activeElapsedMin = Math.floor(activeElapsed / 60);
  const activeTimerStr = `${pad(Math.floor(activeElapsed / 3600))}:${pad(Math.floor((activeElapsed % 3600) / 60))}:${pad(activeElapsed % 60)}`;

  const wakeTimeMin = drainRates.wakeHour * 60 + drainRates.wakeMinute;
  const eTotal = drainRates.maxEnergyHours * 60;
  const minutesSinceWake = Math.max(0, nowMinutes() - wakeTimeMin);

  // Sum tracked time from dayLog by type
  const workMinsLogged = dayLog.filter(e => e.type === "work" && !e.urgent).reduce((s, e) => s + e.duration, 0);
  const urgentMinsLogged = dayLog.filter(e => e.urgent || e.type === "urgent").reduce((s, e) => s + e.duration, 0);
  const restMinsLogged = dayLog.filter(e => e.type === "rest").reduce((s, e) => s + e.duration, 0);

  // Add active task elapsed time
  const activeIsUrgent = activeTask?.urgent || activeTask?.type === "urgent";
  const activeWorkNow = activeTask && activeTask.type === "work" && !activeIsUrgent ? activeElapsedMin : 0;
  const activeUrgentNow = activeTask && activeIsUrgent ? activeElapsedMin : 0;
  const activeRestNow = activeTask && activeTask.type === "rest" ? activeElapsedMin : 0;

  const totalWorkMins = workMinsLogged + activeWorkNow;
  const totalUrgentMins = urgentMinsLogged + activeUrgentNow;
  const totalRestMins = restMinsLogged + activeRestNow;
  const totalTrackedMins = totalWorkMins + totalUrgentMins + totalRestMins;
  const idleMins2 = Math.max(0, minutesSinceWake - totalTrackedMins);

  // Calculate drain
  const totalDrain = (idleMins2 * drainRates.idle) + (totalWorkMins * drainRates.work) + (totalUrgentMins * drainRates.urgent);
  const totalRecharge = totalRestMins * drainRates.rest;
  const eRemain = Math.max(0, Math.min(eTotal, eTotal - totalDrain + totalRecharge));
  const ePct = Math.round((eRemain / eTotal) * 100);
  const eHrs = (eRemain / 60).toFixed(1);
  const usedHrs = ((totalDrain - totalRecharge) / 60).toFixed(1);
  const sorted = useMemo(() => [...tasks].sort((a, b) => getDisplayTimeMin(a) - getDisplayTimeMin(b)), [tasks]);
  const pendingTasks = sorted.filter(t => t.status === "pending" || t.status === "active");
  const skippedTasks = sorted.filter(t => t.status === "skipped");
  const doneTasks = sorted.filter(t => t.status === "done");
  const tasksDoneCount = dayLog.filter(e => e.type === "work").length;
  const restsDoneCount = dayLog.filter(e => e.type === "rest").length;
  const totalTracked = dayLog.reduce((s, e) => s + e.duration, 0);
  const idleMins = Math.max(0, Math.round(((Date.now() - new Date().setHours(6, 30, 0, 0)) / 60000) - totalTracked - (activeTask ? (Date.now() - activeTask.startedAt) / 60000 : 0)));
  const upcoming = sorted.find(t => { if (t.status !== "pending") return false; const now = new Date(); const diff = getDisplayTimeMin(t) - (now.getHours() * 60 + now.getMinutes()); return diff > 0 && diff <= 60; });

  // Overdue task: pending and past its time but within grace period
  const overdueTask = sorted.find(t => {
    if (t.status !== "pending") return false;
    const taskTime = getDisplayTimeMin(t);
    const now = nowMinutes();
    return taskTime <= now && (now - taskTime) < 15;
  });

  const popupState = activeTask
    ? (activeTask.type === "work" ? "working" : "resting")
    : pausedTask
      ? "paused"
      : overdueTask
        ? "grace"
        : upcoming
          ? "upcoming"
          : "idle";
  const hasTasks = pendingTasks.length > 0 || doneTasks.length > 0 || skippedTasks.length > 0;

  // ═══ TASK ACTIONS ═══
  const addTask = () => { const p = parseCmd(cmdInput, cmdCategory); if (!p) return; const n = [...tasks, p]; setTasks(n); setCmdInput(""); save(n, dayLog, energyUsed, energyCharged, activeTask, customGroups, pausedTask, switchingFrom); };

  // Auto-predict: fetch suggestions as user types
  const suggestTimer = useRef<any>(null);
  const fetchSuggestions = useCallback((query: string) => {
    if (query.length < 2) { setSuggestions([]); setShowSuggestions(false); return; }
    clearTimeout(suggestTimer.current);
    suggestTimer.current = setTimeout(async () => {
      if (!userId) return;
      const { getPersonalSuggestions, getGlobalSuggestions } = await import('../lib/sync');
      const personal = await getPersonalSuggestions(userId, query, 3);
      const global = await getGlobalSuggestions(query, 3);
      // Merge: personal first, then global (deduplicated)
      const personalNames = new Set(personal.map((p: any) => p.name.toLowerCase()));
      const merged = [
        ...personal.map((p: any) => ({ ...p, source: 'you' })),
        ...global.filter((g: any) => !personalNames.has(g.name.toLowerCase())).map((g: any) => ({ ...g, source: 'popular' })),
      ].slice(0, 5);
      setSuggestions(merged);
      setShowSuggestions(merged.length > 0);
    }, 300); // 300ms debounce
  }, [userId]);

  const pickSuggestion = (s: any) => {
    setCmdInput(s.name);
    if (s.category) setCmdCategory(s.category);
    setSuggestions([]);
    setShowSuggestions(false);
  };

  const startTask = (task: any) => {
    // If something is running, stop it first
    if (activeTask) stopAndComplete();
    // If resuming from pause, clear paused state
    if (pausedTask && pausedTask.id === task.id) {
      const at = { ...task, startedAt: Date.now() - (pausedTask.elapsedMs || 0), baseUsed: energyUsed, baseCharged: energyCharged };
      setActiveTask(at);
      setPausedTask(null);
      const u = tasks.map(t => t.id === task.id ? { ...t, status: "active" } : t);
      setTasks(u);
      save(u, dayLog, energyUsed, energyCharged, at, customGroups, null, switchingFrom);
      return;
    }
    const at = { ...task, startedAt: Date.now(), baseUsed: energyUsed, baseCharged: energyCharged };
    setActiveTask(at);
    const u = tasks.map(t => t.id === task.id ? { ...t, status: "active" } : t);
    setTasks(u);
    setExpandedTask(null);
    save(u, dayLog, energyUsed, energyCharged, at, customGroups, pausedTask, switchingFrom);
  };

  // Complete a task (stop timer, log it, mark done)
  const stopAndComplete = () => {
    if (!activeTask) return;
    const elapsed = Math.round((Date.now() - activeTask.startedAt) / 60000);
    const entry = { id: genId(), name: activeTask.name, type: activeTask.type, urgent: activeTask.urgent || false, duration: elapsed, startTime: new Date(activeTask.startedAt).toTimeString().slice(0, 5), endTime: new Date().toTimeString().slice(0, 5) };
    const newLog = [...dayLog, entry];
    const u = tasks.map(t => t.id === activeTask.id ? { ...t, status: "done", actual_duration: elapsed, completedAt: Date.now(), startedAt: activeTask.startedAt } : t);
    setDayLog(newLog);
    setTasks(u);
    setActiveTask(null);
    if (notifEnabled) onTaskDone(activeTask.id);

    // If we were switching, resume the original task
    if (switchingFrom) {
      const origTask = u.find(t => t.id === switchingFrom.id);
      if (origTask && origTask.status !== "done") {
        setPausedTask(switchingFrom);
        setSwitchingFrom(null);
        save(u, newLog, energyUsed, energyCharged, null, customGroups, switchingFrom, null);
        return;
      }
      setSwitchingFrom(null);
    }
    save(u, newLog, energyUsed, energyCharged, null, customGroups, pausedTask, null);
  };

  // ═══ PAUSE — freeze timer, remind in 30 min ═══
  const pauseTask = () => {
    if (!activeTask) return;
    const elapsedMs = Date.now() - activeTask.startedAt;
    const pt = { ...activeTask, elapsedMs, pausedAt: Date.now() };
    setPausedTask(pt);
    const u = tasks.map(t => t.id === activeTask.id ? { ...t, status: "pending" } : t);
    setTasks(u);
    setActiveTask(null);
    // Shift remaining tasks by 30 min (expected pause duration)
    const shifted = autoShift(u, getDisplayTimeMin(activeTask), 30);
    setTasks(shifted);
    save(shifted, dayLog, energyUsed, energyCharged, null, customGroups, pt, switchingFrom);
    // Notify to resume in 30 min
    if (notifEnabled) schedulePauseReminder(activeTask.name, activeTask.id);
  };

  // ═══ SKIP — log partial time, mark skipped, shift everything ═══
  const skipTask = () => {
    if (!activeTask) return;
    const elapsed = Math.round((Date.now() - activeTask.startedAt) / 60000);
    const remaining = Math.max(0, activeTask.duration - elapsed);
    // Log partial time
    if (elapsed > 0) {
      const entry = { id: genId(), name: activeTask.name, type: activeTask.type, urgent: activeTask.urgent || false, duration: elapsed, startTime: new Date(activeTask.startedAt).toTimeString().slice(0, 5), endTime: new Date().toTimeString().slice(0, 5), partial: true };
      const newLog = [...dayLog, entry];
      setDayLog(newLog);
      const u = tasks.map(t => t.id === activeTask.id ? { ...t, status: "skipped", skippedAt: Date.now(), actual_duration: elapsed, startedAt: activeTask.startedAt } : t);
      // Shift remaining tasks forward — they already lost the elapsed time, but the remaining planned time is freed
      const shifted = autoShift(u, nowMinutes(), 0);
      setTasks(shifted);
      setActiveTask(null);
      if (notifEnabled) onTaskDone(activeTask.id);
      save(shifted, newLog, energyUsed, energyCharged, null, customGroups, pausedTask, switchingFrom);
    } else {
      const u = tasks.map(t => t.id === activeTask.id ? { ...t, status: "skipped", skippedAt: Date.now() } : t);
      const shifted = autoShift(u, nowMinutes(), 0);
      setTasks(shifted);
      setActiveTask(null);
      if (notifEnabled) onTaskDone(activeTask.id);
      save(shifted, dayLog, energyUsed, energyCharged, null, customGroups, pausedTask, switchingFrom);
    }
  };

  // Skip a pending task (from grace period or manual)
  const skipPendingTask = (task: any) => {
    const u = tasks.map(t => t.id === task.id ? { ...t, status: "skipped", skippedAt: Date.now() } : t);
    setTasks(u);
    save(u, dayLog, energyUsed, energyCharged, activeTask, customGroups, pausedTask, switchingFrom);
    if (notifEnabled) onTaskDone(task.id);
  };

  // ═══ SWITCH — pause current, open command bar for urgent task ═══
  const switchTask = () => {
    if (!activeTask) return;
    const elapsedMs = Date.now() - activeTask.startedAt;
    const sf = { ...activeTask, elapsedMs, pausedAt: Date.now() };
    setSwitchingFrom(sf);
    const u = tasks.map(t => t.id === activeTask.id ? { ...t, status: "pending" } : t);
    setTasks(u);
    setActiveTask(null);
    setShowSwitchInput(true);
    setSwitchInput("");
    save(u, dayLog, energyUsed, energyCharged, null, customGroups, null, sf);
  };

  const addSwitchTask = () => {
    const p = parseCmd(switchInput);
    if (!p) return;
    p.status = "pending";
    (p as any).urgent = true; // Auto-tag as urgent from Switch
    const n = [...tasks, p];
    setTasks(n);
    setSwitchInput("");
    setShowSwitchInput(false);
    // Start the urgent task immediately
    const at = { ...p, urgent: true, startedAt: Date.now(), baseUsed: energyUsed, baseCharged: energyCharged };
    setActiveTask(at);
    const u = n.map(t => t.id === p.id ? { ...t, status: "active", urgent: true } : t);
    setTasks(u);
    save(u, dayLog, energyUsed, energyCharged, at, customGroups, null, switchingFrom);
  };

  // Resume paused task
  const resumePaused = () => {
    if (!pausedTask) return;
    const task = tasks.find(t => t.id === pausedTask.id);
    if (task) startTask(task);
    if (notifEnabled) cancelPauseReminder();
  };

  // Dismiss paused task
  const dismissPaused = () => {
    if (!pausedTask) return;
    setPausedTask(null);
    save(tasks, dayLog, energyUsed, energyCharged, activeTask, customGroups, null, switchingFrom);
    if (notifEnabled) cancelPauseReminder();
  };

  const markDone = (task: any) => { const entry = { id: genId(), name: task.name, type: task.type, urgent: task.urgent || false, duration: task.duration, startTime: getDisplayTime(task), endTime: fmtTime(Math.floor((getDisplayTimeMin(task) + task.duration) / 60) % 24, (getDisplayTimeMin(task) + task.duration) % 60) }; const newLog = [...dayLog, entry]; const u = tasks.map(t => t.id === task.id ? { ...t, status: "done", actual_duration: task.duration, completedAt: Date.now() } : t); setDayLog(newLog); setTasks(u); setExpandedTask(null); if (task.type === "work") setEnergyUsed(prev => prev + task.duration); else setEnergyCharged(prev => prev + task.duration); save(u, newLog, task.type === "work" ? energyUsed + task.duration : energyUsed, task.type === "rest" ? energyCharged + task.duration : energyCharged, activeTask, customGroups, pausedTask, switchingFrom); if (notifEnabled) onTaskDone(task.id);};

  const markUndone = (task: any) => { const u = tasks.map(t => t.id === task.id ? { ...t, status: "pending", actual_duration: null, completedAt: null } : t); const newLog = dayLog.filter(e => e.name !== task.name || e.startTime !== getDisplayTime(task)); setTasks(u); setDayLog(newLog); if (task.type === "work") setEnergyUsed(prev => Math.max(0, prev - task.duration)); else setEnergyCharged(prev => Math.max(0, prev - task.duration)); save(u, newLog, task.type === "work" ? Math.max(0, energyUsed - task.duration) : energyUsed, task.type === "rest" ? Math.max(0, energyCharged - task.duration) : energyCharged, activeTask, customGroups, pausedTask, switchingFrom); };
  const toggleRest = (task: any) => { const u = tasks.map(t => t.id === task.id ? { ...t, type: t.type === "work" ? "rest" : "work" } : t); setTasks(u); save(u, dayLog, energyUsed, energyCharged, activeTask, customGroups, pausedTask, switchingFrom); };
  const toggleUrgent = (task: any) => { const u = tasks.map(t => t.id === task.id ? { ...t, urgent: !t.urgent } : t); setTasks(u); save(u, dayLog, energyUsed, energyCharged, activeTask, customGroups, pausedTask, switchingFrom); };
  const addGroup = () => { setGroupInput(""); setShowGroupModal(true); };
  const confirmAddGroup = () => { if (groupInput.trim()) { const x = [...customGroups, groupInput.trim()]; setCustomGroups(x); save(tasks, dayLog, energyUsed, energyCharged, activeTask, x, pausedTask, switchingFrom); } setShowGroupModal(false); setGroupInput(""); };
  const deleteTask = (task: any) => { const u = tasks.filter(t => t.id !== task.id); setTasks(u); setExpandedTask(null); save(u, dayLog, energyUsed, energyCharged, activeTask, customGroups, pausedTask, switchingFrom); };
  const openEditModal = (task: any) => {
    setEditFields({ name: task.name, time: getDisplayTime(task), duration: String(task.duration), type: task.type, desc: task.desc || "", rate: task.rate || "" });
    setEditModal(task); setExpandedTask(null);
  };
  const saveEdit = () => {
    if (!editModal || !editFields.name.trim()) return;
    const timeParts = editFields.time.split(":"); const h = parseInt(timeParts[0]) || 0; const m = parseInt(timeParts[1]) || 0;
    const u = tasks.map(t => t.id === editModal.id ? { ...t, name: editFields.name.trim(), time: fmtTime(h, m), timeMin: h * 60 + m, adjustedTimeMin: null, duration: parseInt(editFields.duration) || 60, type: editFields.type, desc: editFields.desc, rate: editFields.rate } : t);
    setTasks(u); save(u, dayLog, energyUsed, energyCharged, activeTask, customGroups, pausedTask, switchingFrom); setEditModal(null);
  };
  const pickMonth = (m: number) => { setViewMonth(m); setMonthPickerOpen(false); const isCur = m === today.getMonth() && viewYear === today.getFullYear(); setSelectedDate(isCur ? new Date(today) : new Date(viewYear, m, 1)); };

  const allDates = useMemo(() => getAllDatesInMonth(viewYear, viewMonth), [viewYear, viewMonth]);

  const upcomingMins = upcoming ? Math.max(0, Math.round(getDisplayTimeMin(upcoming) - (new Date().getHours() * 60 + new Date().getMinutes()))) : 0;
  const hasActivePopup = popupState !== "idle";

  // Grace period remaining for overdue task
  const graceRemainingSec = overdueTask ? Math.max(0, Math.round((GRACE_PERIOD_MS - (nowMinutes() - getDisplayTimeMin(overdueTask)) * 60000) / 1000)) : 0;
  const graceRemainingMin = Math.ceil(graceRemainingSec / 60);

  // Pause timer
  const pauseElapsedSec = pausedTask ? Math.floor((Date.now() - pausedTask.pausedAt) / 1000) : 0;
  const pauseTimerStr = pausedTask ? `${pad(Math.floor(pauseElapsedSec / 3600))}:${pad(Math.floor((pauseElapsedSec % 3600) / 60))}:${pad(pauseElapsedSec % 60)}` : "00:00:00";

  useEffect(() => { if (monthPickerOpen && monthScrollRef.current) { const el = monthScrollRef.current.querySelector('[data-active="true"]'); if (el) el.scrollIntoView({ block: "center", behavior: "auto" }); } }, [monthPickerOpen]);

  // Day summary counts
  const skippedCount = skippedTasks.length;
  const doneCount = doneTasks.length;

  if (!loaded) return (<div style={{ background: "#0e0e12", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}><div style={{ fontSize: 11, letterSpacing: 4, color: "#5DCAA5", fontFamily: MONO, animation: "pulse 1.5s infinite" }}>LOADING...</div></div>);

  const PILL_H = 62;

  return (
    <div style={{ background: "#0e0e12", minHeight: "100vh", fontFamily: BODY, color: "#c0c0c0", maxWidth: 430, margin: "0 auto", position: "relative", paddingBottom: hasActivePopup ? 130 : 40, paddingTop: "env(safe-area-inset-top, 0px)" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700;800&family=Plus+Jakarta+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }
        @keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
        @keyframes graceFlash { 0%,100% { border-color: #EF9F2740; } 50% { border-color: #EF9F2780; } }
        .tap:active { opacity: 0.65; transform: scale(0.97); }
        .no-scroll::-webkit-scrollbar { display: none; }
        .no-scroll { -ms-overflow-style: none; scrollbar-width: none; }
        .pulse-dot { animation: pulse 2s infinite; }
        input:focus { outline: none; }
      `}</style>

      <div style={{ padding: "16px 14px 0" }}>

        {/* ═══ ZONE 1: STATS ═══ */}
        <div onClick={() => {
          if (powerTapTimer.current) {
            clearTimeout(powerTapTimer.current);
            powerTapTimer.current = null;
            setShowPowerSettings(true); // double tap
          } else {
            powerTapTimer.current = setTimeout(() => {
              powerTapTimer.current = null;
              setPowerExpanded(!powerExpanded); // single tap
            }, 280);
          }
        }} style={{ marginBottom: 6 }}>
          {powerExpanded ? (
            <div style={{ background: "#13131a", borderRadius: 28, padding: "16px 22px", border: "1px solid #1e1e24" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <div><div style={{ fontSize: 20, fontWeight: 700, color: "#E1F5EE", lineHeight: 1, fontFamily: DISPLAY }}>{eHrs}<span style={{ fontSize: 13, color: "#5DCAA5", fontWeight: 500 }}>h</span></div><div style={{ fontSize: 10, color: "#555", fontFamily: MONO, marginTop: 2 }}>of {drainRates.maxEnergyHours}h energy</div></div>
                <div style={{ fontSize: 28, fontWeight: 800, color: ePct > 30 ? "#5DCAA5" : ePct > 10 ? "#EF9F27" : "#E24B4A", lineHeight: 1, fontFamily: MONO }}>{ePct}%</div>
              </div>
              <div style={{ height: 12, background: "#1a2a22", borderRadius: 100, overflow: "hidden" }}><div style={{ width: `${ePct}%`, height: "100%", background: ePct > 30 ? "linear-gradient(90deg,#0F6E56,#5DCAA5)" : ePct > 10 ? "#EF9F27" : "#E24B4A", borderRadius: 100, transition: "width 1s" }} /></div>
              {/* Drain breakdown */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 6, marginTop: 10 }}>
                {[
                  { label: "IDLE", mins: idleMins2, rate: drainRates.idle, color: "#555", drain: Math.round(idleMins2 * drainRates.idle) },
                  { label: "WORK", mins: totalWorkMins, rate: drainRates.work, color: "#5DCAA5", drain: Math.round(totalWorkMins * drainRates.work) },
                  { label: "URGENT", mins: totalUrgentMins, rate: drainRates.urgent, color: "#D4537E", drain: Math.round(totalUrgentMins * drainRates.urgent) },
                  { label: "REST", mins: totalRestMins, rate: drainRates.rest, color: "#7F77DD", drain: -Math.round(totalRestMins * drainRates.rest) },
                ].map(d => (
                  <div key={d.label} style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: d.color, fontFamily: MONO }}>{d.drain > 0 ? "-" : "+"}{fmtDur(Math.abs(d.drain))}</div>
                    <div style={{ fontSize: 8, color: "#3a3a42", fontFamily: MONO, letterSpacing: 1, marginTop: 2 }}>{d.label}</div>
                    <div style={{ fontSize: 8, color: "#2a2a30", fontFamily: MONO }}>{d.rate}x</div>
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}><div style={{ fontSize: 10, color: "#444", fontFamily: MONO }}>{usedHrs}h drained</div><div style={{ fontSize: 10, color: "#3a3a42", fontFamily: MONO }}>double-tap to edit</div><div style={{ fontSize: 10, color: "#5DCAA5", fontFamily: MONO }}>{eHrs}h left</div></div>
            </div>
          ) : (
            <div style={{ background: "#13131a", borderRadius: 50, padding: "10px 18px", border: "1px solid #1e1e24", display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: ePct > 30 ? "#5DCAA5" : ePct > 10 ? "#EF9F27" : "#E24B4A", fontFamily: MONO }}>{ePct}%</div>
              <div style={{ flex: 1, height: 8, background: "#1a2a22", borderRadius: 100, overflow: "hidden" }}><div style={{ width: `${ePct}%`, height: "100%", background: ePct > 30 ? "#5DCAA5" : ePct > 10 ? "#EF9F27" : "#E24B4A", borderRadius: 100, transition: "width 1s" }} /></div>
              <div style={{ fontSize: 11, color: "#555", fontFamily: MONO }}>{eHrs}h</div>
              {notifEnabled && (
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#5DCAA5", flexShrink: 0 }} title="Notifications on" />
              )}
            </div>
          )}
        </div>

        <div className="tap" onClick={() => setRecordExpanded(!recordExpanded)}>
          {recordExpanded ? (
            <div>
              <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                {[
                  { v: tasksDoneCount, l: "TASKS", c: "#5DCAA5", bg: "#063d30", lt: "#E1F5EE", dur: fmtDur(dayLog.filter(e => e.type === "work").reduce((s, e) => s + e.duration, 0)) },
                  { v: restsDoneCount, l: "RESTS", c: "#7F77DD", bg: "#1e1a4d", lt: "#EEEDFE", dur: fmtDur(dayLog.filter(e => e.type === "rest").reduce((s, e) => s + e.duration, 0)) },
                  { v: skippedCount, l: "MOVED", c: "#EF9F27", bg: "#351c02", lt: "#FAEEDA", dur: "tmrw" },
                ].map((s, i) => (
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
                {[{ v: tasksDoneCount, l: "TASKS", c: "#5DCAA5" }, { v: restsDoneCount, l: "RESTS", c: "#7F77DD" }, { v: skippedCount, l: "MOVED", c: "#EF9F27" }].map((s, i) => (
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
        <div style={{ position: "relative", marginBottom: 12 }}>
          <div style={{ display: "flex", gap: 5, alignItems: "stretch" }}>
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
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
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
                <div style={{ position: "relative" }}>
                  <div style={{ background: "#13131a", borderRadius: 14, padding: "12px 14px", border: "1px solid #5DCAA530", display: "flex", alignItems: "center", gap: 8 }}>
                    <div className="tap" onClick={() => setCmdCategory(c => c === 'task' ? 'rest' : c === 'rest' ? 'life' : 'task')} style={{ background: cmdCategory === 'task' ? '#5DCAA520' : cmdCategory === 'rest' ? '#7F77DD20' : '#EF9F2720', border: `1px solid ${cmdCategory === 'task' ? '#5DCAA5' : cmdCategory === 'rest' ? '#7F77DD' : '#EF9F27'}`, borderRadius: 8, padding: "5px 10px", fontSize: 9, fontWeight: 700, fontFamily: MONO, color: cmdCategory === 'task' ? '#5DCAA5' : cmdCategory === 'rest' ? '#7F77DD' : '#EF9F27', cursor: "pointer", flexShrink: 0, letterSpacing: 1, userSelect: "none" }}>{cmdCategory.toUpperCase()}</div>
                    <input value={cmdInput} onChange={e => { setCmdInput(e.target.value); fetchSuggestions(e.target.value); }} onKeyDown={e => e.key === "Enter" && addTask()} onFocus={() => suggestions.length > 0 && setShowSuggestions(true)} onBlur={() => setTimeout(() => setShowSuggestions(false), 200)} placeholder="study C 7pm 1.5h" style={{ flex: 1, background: "none", border: "none", color: "#ccc", fontSize: 13, fontFamily: BODY, outline: "none" }} />
                    {cmdInput && <div className="tap" onClick={addTask} style={{ background: "#5DCAA5", borderRadius: 8, padding: "6px 14px", fontSize: 11, color: "#063d30", fontWeight: 700, fontFamily: MONO }}>GO</div>}
                  </div>
                  {showSuggestions && suggestions.length > 0 && (
                    <div style={{ position: "absolute", top: "100%", left: 0, right: 0, marginTop: 4, background: "#1a1a24", border: "1px solid #2a2a34", borderRadius: 12, overflow: "hidden", zIndex: 20 }}>
                      {suggestions.map((s: any, i: number) => (
                        <div key={i} className="tap" onMouseDown={() => pickSuggestion(s)} style={{ padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: i < suggestions.length - 1 ? "1px solid #1e1e28" : "none", cursor: "pointer" }}>
                          <span style={{ fontSize: 12, color: "#ccc", fontFamily: BODY }}>{s.name}</span>
                          <span style={{ fontSize: 9, color: "#555", fontFamily: MONO }}>{s.source === 'you' ? 'YOUR HISTORY' : 'POPULAR'}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div style={{ fontSize: 10, color: "#333", marginTop: 5, fontFamily: MONO }}>tap category · type name · time · duration</div>
              </div>
            )}

            {/* Pending tasks */}
            {hasTasks && pendingTasks.map((task, i) => {
              const isWork = task.type === "work"; const accent = isWork ? "#5DCAA5" : "#7F77DD";
              const isActive = task.status === "active"; const isExpanded = expandedTask === task.id;
              const displayTime = getDisplayTime(task);
              const displayTimeMin = getDisplayTimeMin(task);
              const endTimeMin = displayTimeMin + task.duration;
              const endTime = fmtTime(Math.floor(endTimeMin / 60) % 24, endTimeMin % 60);
              const isAdjusted = task.adjustedTimeMin !== null && task.adjustedTimeMin !== task.timeMin;

              if (isActive) return (
                <div key={task.id} style={{ marginBottom: 8, animation: `fadeUp 0.3s ease ${i * 0.04}s both` }}>
                  <div style={{ background: "#13131a", borderRadius: 16, padding: "16px 18px", border: `1px solid ${accent}50` }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 10, color: accent, fontFamily: MONO, letterSpacing: 1, marginBottom: 4 }}>
                          {displayTime} — {endTime}
                          {isAdjusted && <span style={{ marginLeft: 6, fontSize: 8, color: "#EF9F27", background: "#EF9F2715", padding: "1px 5px", borderRadius: 3 }}>SHIFTED</span>}
                        </div>
                        <div style={{ fontSize: 16, color: "#eee", fontWeight: 700, fontFamily: DISPLAY }}>{task.name}</div>
                        <div style={{ display: "flex", gap: 6, marginTop: 6 }}><span style={{ fontSize: 9, color: "#666", background: "#ffffff08", padding: "3px 8px", borderRadius: 6, fontFamily: MONO, fontWeight: 600 }}>{task.type.toUpperCase()}</span><span style={{ fontSize: 9, color: "#666", background: "#ffffff08", padding: "3px 8px", borderRadius: 6, fontFamily: MONO, fontWeight: 600 }}>{fmtDur(task.duration)}</span>{task.urgent && <span style={{ fontSize: 9, color: "#D4537E", background: "#D4537E15", padding: "3px 8px", borderRadius: 6, fontFamily: MONO, fontWeight: 600 }}>⚡ URGENT</span>}</div>
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
                      <div className="tap" onClick={() => setExpandedTask(isExpanded ? null : task.id)} style={{ flex: 1, padding: "16px 0 16px 18px" }}>
                        <div style={{ fontSize: 10, color: accent, fontFamily: MONO, letterSpacing: 1, marginBottom: 4 }}>
                          {displayTime} — {endTime}
                          {isAdjusted && <span style={{ marginLeft: 6, fontSize: 8, color: "#EF9F27", background: "#EF9F2715", padding: "1px 5px", borderRadius: 3 }}>SHIFTED</span>}
                        </div>
                        <div style={{ fontSize: 16, color: "#ccc", fontWeight: 700, fontFamily: DISPLAY }}>{task.name}</div>
                        <div style={{ display: "flex", gap: 6, marginTop: 6 }}><span style={{ fontSize: 9, color: "#666", background: "#ffffff08", padding: "3px 8px", borderRadius: 6, fontFamily: MONO, fontWeight: 600 }}>{task.type.toUpperCase()}</span><span style={{ fontSize: 9, color: "#666", background: "#ffffff08", padding: "3px 8px", borderRadius: 6, fontFamily: MONO, fontWeight: 600 }}>{fmtDur(task.duration)}</span>{task.urgent && <span style={{ fontSize: 9, color: "#D4537E", background: "#D4537E15", padding: "3px 8px", borderRadius: 6, fontFamily: MONO, fontWeight: 600 }}>⚡ URGENT</span>}</div>
                      </div>
                      <div className="tap" onClick={(e) => { e.stopPropagation(); startTask(task); }} style={{ padding: "16px 18px 16px 12px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <div style={{ width: 36, height: 36, borderRadius: 10, background: `${accent}15`, border: `1px solid ${accent}30`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <PlayIcon size={16} color={accent} />
                        </div>
                      </div>
                    </div>
                  </div>

                  {isExpanded && (
                    <div style={{ background: "#13131a", borderRadius: "0 0 16px 16px", padding: "12px 14px 14px", border: "1px solid #1e1e24", borderTop: "1px dashed #2a2a30" }}>
                      {/* Urgent toggle */}
                      <div className="tap" onClick={() => toggleUrgent(task)} style={{
                        display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                        padding: "10px 12px", borderRadius: 10, marginBottom: 8,
                        background: task.urgent ? "#D4537E18" : "#0e0e12",
                        border: `1px solid ${task.urgent ? "#D4537E40" : "#2a2a30"}`,
                      }}>
                        <span style={{ fontSize: 13 }}>⚡</span>
                        <span style={{ fontSize: 12, fontWeight: 700, color: task.urgent ? "#D4537E" : "#555", fontFamily: MONO }}>
                          {task.urgent ? "URGENT — 1.5x drain" : "Mark as urgent"}
                        </span>
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                        <div className="tap" onClick={() => toggleRest(task)} style={{ background: task.type === "rest" ? "#1e1a4d" : "#0d2a3a", borderRadius: 14, padding: "14px 12px", textAlign: "center" }}>
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={task.type === "rest" ? "#AFA9EC" : "#5DCAA5"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ margin: "0 auto 6px" }}><path d="M21 12.79A9 9 0 1111.21 3a7 7 0 009.79 9.79z" /></svg>
                          <div style={{ fontSize: 13, fontWeight: 700, color: task.type === "rest" ? "#EEEDFE" : "#E1F5EE", fontFamily: DISPLAY }}>{task.type === "rest" ? "Set as work" : "Set as rest"}</div>
                          <div style={{ fontSize: 10, color: task.type === "rest" ? "#AFA9EC" : "#9FE1CB", fontFamily: MONO, marginTop: 3 }}>{task.type === "rest" ? "drains energy" : "charges energy"}</div>
                        </div>
                        <div className="tap" onClick={() => markDone(task)} style={{ background: "#063d30", borderRadius: 14, padding: "14px 12px", textAlign: "center" }}>
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#9FE1CB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ margin: "0 auto 6px" }}><polyline points="20 6 9 17 4 12" /></svg>
                          <div style={{ fontSize: 13, fontWeight: 700, color: "#E1F5EE", fontFamily: DISPLAY }}>Mark as done</div>
                          <div style={{ fontSize: 10, color: "#9FE1CB", fontFamily: MONO, marginTop: 3 }}>complete task</div>
                        </div>
                        <div className="tap" onClick={() => openEditModal(task)} style={{ background: "#1e1a4d", borderRadius: 14, padding: "14px 12px", textAlign: "center" }}>
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#AFA9EC" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ margin: "0 auto 6px" }}><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                          <div style={{ fontSize: 13, fontWeight: 700, color: "#EEEDFE", fontFamily: DISPLAY }}>Edit</div>
                          <div style={{ fontSize: 10, color: "#AFA9EC", fontFamily: MONO, marginTop: 3 }}>rename task</div>
                        </div>
                        <div className="tap" onClick={() => deleteTask(task)} style={{ background: "#3a140a", borderRadius: 14, padding: "14px 12px", textAlign: "center" }}>
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#F5C4B3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ margin: "0 auto 6px" }}><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" /></svg>
                          <div style={{ fontSize: 13, fontWeight: 700, color: "#FAECE7", fontFamily: DISPLAY }}>Delete</div>
                          <div style={{ fontSize: 10, color: "#F5C4B3", fontFamily: MONO, marginTop: 3 }}>remove task</div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {/* ═══ CREATE TASK — between pending and completed ═══ */}
            {hasTasks && (
              <div style={{ marginTop: 14, marginBottom: 14, position: "relative" }}>
                <div style={{ background: "#13131a", borderRadius: 14, padding: "12px 14px", border: "1px solid #5DCAA530", display: "flex", alignItems: "center", gap: 8 }}>
                  <div className="tap" onClick={() => setCmdCategory(c => c === 'task' ? 'rest' : c === 'rest' ? 'life' : 'task')} style={{ background: cmdCategory === 'task' ? '#5DCAA520' : cmdCategory === 'rest' ? '#7F77DD20' : '#EF9F2720', border: `1px solid ${cmdCategory === 'task' ? '#5DCAA5' : cmdCategory === 'rest' ? '#7F77DD' : '#EF9F27'}`, borderRadius: 8, padding: "5px 10px", fontSize: 9, fontWeight: 700, fontFamily: MONO, color: cmdCategory === 'task' ? '#5DCAA5' : cmdCategory === 'rest' ? '#7F77DD' : '#EF9F27', cursor: "pointer", flexShrink: 0, letterSpacing: 1, userSelect: "none" }}>{cmdCategory.toUpperCase()}</div>
                  <input value={cmdInput} onChange={e => { setCmdInput(e.target.value); fetchSuggestions(e.target.value); }} onKeyDown={e => e.key === "Enter" && addTask()} onFocus={() => suggestions.length > 0 && setShowSuggestions(true)} onBlur={() => setTimeout(() => setShowSuggestions(false), 200)} placeholder="study C 7pm 1.5h" style={{ flex: 1, background: "none", border: "none", color: "#ccc", fontSize: 13, fontFamily: BODY, outline: "none" }} />
                  {cmdInput && <div className="tap" onClick={addTask} style={{ background: "#5DCAA5", borderRadius: 8, padding: "6px 14px", fontSize: 11, color: "#063d30", fontWeight: 700, fontFamily: MONO }}>GO</div>}
                </div>
                {showSuggestions && suggestions.length > 0 && (
                  <div style={{ position: "absolute", top: "100%", left: 0, right: 0, marginTop: 4, background: "#1a1a24", border: "1px solid #2a2a34", borderRadius: 12, overflow: "hidden", zIndex: 20 }}>
                    {suggestions.map((s: any, i: number) => (
                      <div key={i} className="tap" onMouseDown={() => pickSuggestion(s)} style={{ padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: i < suggestions.length - 1 ? "1px solid #1e1e28" : "none", cursor: "pointer" }}>
                        <span style={{ fontSize: 12, color: "#ccc", fontFamily: BODY }}>{s.name}</span>
                        <span style={{ fontSize: 9, color: "#555", fontFamily: MONO }}>{s.source === 'you' ? 'YOUR HISTORY' : 'POPULAR'}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ═══ SKIPPED TASKS — subtle, not guilt-inducing ═══ */}
            {skippedTasks.length > 0 && (
              <div style={{ marginTop: 8 }}>
                <div style={{ fontSize: 10, color: "#3a3a42", fontFamily: MONO, letterSpacing: 2, marginBottom: 6, padding: "0 4px" }}>
                  {skippedTasks.length} MOVED TO TOMORROW
                </div>
                {skippedTasks.map((task) => {
                  const isWork = task.type === "work";
                  const accent = isWork ? "#5DCAA5" : "#7F77DD";
                  return (
                    <div key={task.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", marginBottom: 4, borderRadius: 12, background: "#13131a08", border: "1px solid #1a1a20", opacity: 0.4 }}>
                      <div style={{ fontSize: 10, color: "#3a3a42", fontFamily: MONO, minWidth: 38 }}>{getDisplayTime(task)}</div>
                      <div style={{ fontSize: 13, color: "#3a3a42", flex: 1, fontFamily: DISPLAY }}>{task.name}</div>
                      {task.actual_duration != null && task.actual_duration > 0 && (
                        <div style={{ fontSize: 9, color: "#555", fontFamily: MONO }}>{fmtDur(task.actual_duration)}/{fmtDur(task.duration)}</div>
                      )}
                      <div className="tap" onClick={() => { const u = tasks.map(t => t.id === task.id ? { ...t, status: "pending", skippedAt: null, actual_duration: null } : t); setTasks(u); save(u, dayLog, energyUsed, energyCharged, activeTask, customGroups, pausedTask, switchingFrom); }} style={{ fontSize: 9, color: "#555", fontFamily: MONO, padding: "4px 8px", borderRadius: 6, border: "1px solid #2a2a30" }}>
                        UNDO
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Completed stack */}
            {doneTasks.length > 0 && (
              <div style={{ marginTop: 12 }}>
                <div className="tap" onClick={() => setShowCompleted(!showCompleted)}>
                  {!showCompleted && (
                    <div style={{ position: "relative", height: Math.min(doneTasks.length, 3) * 6 + 48 }}>
                      {doneTasks.slice(-3).map((t, i, arr) => { const isWork = t.type === "work"; const bg = isWork ? "#063d30" : "#1e1a4d"; const accent = isWork ? "#5DCAA5" : "#7F77DD"; const light = isWork ? "#E1F5EE" : "#EEEDFE"; const off = (arr.length - 1 - i) * 6; return (
                        <div key={t.id} style={{ position: i === arr.length - 1 ? "relative" : "absolute", top: off, left: 0, right: 0, background: bg, borderRadius: 12, padding: "12px 14px", border: `1px solid ${accent}30`, display: "flex", alignItems: "center", gap: 10, zIndex: i }}>
                          <div style={{ fontSize: 10, color: accent, fontFamily: MONO, minWidth: 38, fontWeight: 600 }}>{getDisplayTime(t)}</div>
                          <div style={{ fontSize: 13, color: light, fontWeight: 700, flex: 1, textDecoration: "line-through", textDecorationColor: `${accent}60`, fontFamily: DISPLAY }}>{t.name}</div>
                          <div style={{ fontSize: 9, color: accent, fontFamily: MONO, fontWeight: 600 }}>{t.actual_duration != null && t.actual_duration !== t.duration ? `${fmtDur(t.actual_duration)}/${fmtDur(t.duration)}` : fmtDur(t.duration)}</div>
                        </div>
                      ); })}
                    </div>
                  )}
                </div>
                {showCompleted && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    {doneTasks.map((task, i) => { const isWork = task.type === "work"; const bg = isWork ? "#063d30" : "#1e1a4d"; const accent = isWork ? "#5DCAA5" : "#7F77DD"; const light = isWork ? "#E1F5EE" : "#EEEDFE"; const isExp = expandedTask === task.id; return (
                      <div key={task.id}>
                        <div className="tap" onClick={() => setExpandedTask(isExp ? null : task.id)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", background: bg, borderRadius: isExp ? "12px 12px 0 0" : 12, border: `1px solid ${accent}30`, borderBottom: isExp ? "none" : undefined, animation: `fadeUp 0.2s ease ${i * 0.03}s both` }}>
                          <div style={{ fontSize: 10, color: accent, fontFamily: MONO, minWidth: 38, fontWeight: 600 }}>{getDisplayTime(task)}</div>
                          <div style={{ fontSize: 13, color: light, fontWeight: 700, flex: 1, textDecoration: "line-through", textDecorationColor: `${accent}60`, fontFamily: DISPLAY }}>{task.name}</div>
                          <div style={{ fontSize: 9, color: accent, fontFamily: MONO, fontWeight: 600 }}>{task.actual_duration != null && task.actual_duration !== task.duration ? `${fmtDur(task.actual_duration)}/${fmtDur(task.duration)}` : fmtDur(task.duration)}</div>
                        </div>
                        {isExp && (
                          <div style={{ background: bg, borderRadius: "0 0 12px 12px", padding: "10px 14px", border: `1px solid ${accent}30`, borderTop: `1px dashed ${accent}20`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                            <div style={{ display: "flex", gap: 8, fontSize: 11, color: accent + "aa", fontFamily: MONO, flexWrap: "wrap" }}><span>{getDisplayTime(task)} — {fmtTime(Math.floor((getDisplayTimeMin(task) + task.duration) / 60) % 24, (getDisplayTimeMin(task) + task.duration) % 60)}</span><span>{task.type.toUpperCase()}</span>{task.actual_duration != null && task.actual_duration !== task.duration ? <span style={{ color: accent }}>Set: {fmtDur(task.duration)} · Actual: {fmtDur(task.actual_duration)}</span> : <span>{fmtDur(task.duration)}</span>}</div>
                            <div className="tap" onClick={(e) => { e.stopPropagation(); markUndone(task); }} style={{ width: 32, height: 32, borderRadius: 8, background: `${accent}20`, border: `1.5px solid ${accent}50`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                            </div>
                          </div>
                        )}
                      </div>
                    ); })}
                    <div className="tap" onClick={() => setShowCompleted(false)} style={{ textAlign: "center", padding: 8 }}><div style={{ fontSize: 10, color: "#333" }}>{"\u25B2"}</div></div>
                  </div>
                )}
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


      {/* ═══ POWER SETTINGS MODAL ═══ */}
      {showPowerSettings && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 200, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
          <div onClick={() => setShowPowerSettings(false)} style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.6)" }} />
          <div style={{ position: "relative", width: "100%", maxWidth: 430, background: "#13131a", borderRadius: "24px 24px 0 0", padding: "24px 20px 36px", zIndex: 201, border: "1px solid #1e1e24", borderBottom: "none", maxHeight: "85vh", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: "#E1F5EE", fontFamily: DISPLAY }}>Power settings</div>
              <div className="tap" onClick={() => setShowPowerSettings(false)} style={{ width: 32, height: 32, borderRadius: 10, background: "#1e1e24", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              </div>
            </div>

            <div style={{ fontSize: 10, color: "#5DCAA5", fontFamily: MONO, letterSpacing: 2, marginBottom: 12 }}>DRAIN RATES</div>
            <div style={{ fontSize: 11, color: "#444", marginBottom: 16 }}>How fast each state consumes your energy. 1x = 1 min per real min.</div>

            {([
              { key: "idle" as const, label: "IDLE", desc: "No task running", color: "#555", icon: "○" },
              { key: "work" as const, label: "WORK", desc: "Normal task drain", color: "#5DCAA5", icon: "▶" },
              { key: "urgent" as const, label: "URGENT", desc: "Switched / high intensity", color: "#D4537E", icon: "⚡" },
              { key: "rest" as const, label: "REST", desc: "Recharge rate", color: "#7F77DD", icon: "◆" },
            ]).map(item => {
              const val = drainRates[item.key];
              const limits = RATE_LIMITS[item.key];
              return (
                <div key={item.key} style={{ marginBottom: 16, background: "#0e0e12", borderRadius: 14, padding: "14px 16px", border: "1px solid #1e1e24" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                    <span style={{ fontSize: 14 }}>{item.icon}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: item.color, fontFamily: MONO, letterSpacing: 1 }}>{item.label}</span>
                    <span style={{ fontSize: 10, color: "#444", flex: 1 }}>{item.desc}</span>
                    <span style={{ fontSize: 16, fontWeight: 800, color: item.color, fontFamily: MONO }}>{val}x</span>
                  </div>
                  <input type="range" min={limits.min * 10} max={limits.max * 10} step="1" value={val * 10}
                    onChange={e => {
                      const newVal = parseInt(e.target.value) / 10;
                      const updated = { ...drainRates, [item.key]: newVal };
                      saveDrainRates(updated);
                    }}
                    style={{ width: "100%", accentColor: item.color, height: 4, WebkitAppearance: "none", appearance: "none", background: "#1e1e24", borderRadius: 2, outline: "none" }}
                  />
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
                    <span style={{ fontSize: 9, color: "#333", fontFamily: MONO }}>{limits.min}x</span>
                    <span style={{ fontSize: 9, color: "#333", fontFamily: MONO }}>{limits.max}x</span>
                  </div>
                </div>
              );
            })}

            <div style={{ fontSize: 10, color: "#5DCAA5", fontFamily: MONO, letterSpacing: 2, marginBottom: 12, marginTop: 8 }}>MAX ENERGY</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 10, marginBottom: 20 }}>
              <div style={{ background: "#0e0e12", borderRadius: 14, padding: "14px 16px", border: "1px solid #1e1e24" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                  <span style={{ fontSize: 12, color: "#888" }}>Daily energy hours</span>
                  <span style={{ fontSize: 18, fontWeight: 800, color: "#5DCAA5", fontFamily: MONO }}>{drainRates.maxEnergyHours}h</span>
                </div>
                <input type="range" min="10" max="20" step="1" value={drainRates.maxEnergyHours}
                  onChange={e => {
                    const updated = { ...drainRates, maxEnergyHours: parseInt(e.target.value) };
                    saveDrainRates(updated);
                  }}
                  style={{ width: "100%", accentColor: "#5DCAA5", height: 4, WebkitAppearance: "none", appearance: "none", background: "#1e1e24", borderRadius: 2, outline: "none" }}
                />
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
                  <span style={{ fontSize: 9, color: "#333", fontFamily: MONO }}>10h</span>
                  <span style={{ fontSize: 9, color: "#333", fontFamily: MONO }}>20h</span>
                </div>
              </div>
            </div>

            <div className="tap" onClick={() => { saveDrainRates(DEFAULT_RATES); }} style={{ background: "#1e1e24", borderRadius: 14, padding: "12px", textAlign: "center", fontSize: 12, color: "#555", fontFamily: MONO }}>Reset to defaults</div>
          </div>
        </div>
      )}

      {(popupState === "working" || popupState === "resting") && activeTask && (() => {
        const isW = popupState === "working"; const pc = isW ? "#5DCAA5" : "#7F77DD"; const pcBg = isW ? "#063d30" : "#1e1a4d"; const pcLight = isW ? "#E1F5EE" : "#EEEDFE";
        return (
          <div style={{ position: "fixed", bottom: "calc(16px + env(safe-area-inset-bottom, 0px))", left: "50%", transform: "translateX(-50%)", width: "calc(100% - 28px)", maxWidth: 402, zIndex: 90 }}>
            <div style={{ background: "#0c0c14", borderRadius: 20, padding: "18px 20px", border: `1.5px solid ${pc}35` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 14 }}>
                {/* Progress ring */}
                <div style={{ position: "relative", width: 48, height: 48, flexShrink: 0 }}>
                  <svg width="48" height="48" viewBox="0 0 48 48"><circle cx="24" cy="24" r="20" fill="none" stroke="#1e1e24" strokeWidth="3" /><circle cx="24" cy="24" r="20" fill="none" stroke={pc} strokeWidth="3" strokeDasharray="125.7" strokeDashoffset={isW ? 125.7 - (125.7 * Math.min(1, activeElapsedMin / Math.max(1, activeTask.duration))) : 125.7 * 0.3} strokeLinecap="round" transform="rotate(-90 24 24)" /></svg>
                  <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", fontSize: 10, color: pc, fontWeight: 700, fontFamily: MONO }}>{isW ? `${Math.round((activeElapsedMin / Math.max(1, activeTask.duration)) * 100)}%` : "\u2723"}</div>
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                    <div className="pulse-dot" style={{ width: 6, height: 6, borderRadius: "50%", background: pc, flexShrink: 0 }} />
                    <div style={{ fontSize: 10, color: pc, fontWeight: 700, fontFamily: MONO, letterSpacing: 1.5 }}>{isW ? "WORKING" : "RESTING"}</div>
                  </div>
                  <div style={{ fontSize: 14, color: pcLight, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{activeTask.name}</div>
                </div>

                {/* Timer */}
                <div style={{ textAlign: "center", flexShrink: 0 }}>
                  <div style={{ fontSize: 18, color: pcLight, fontWeight: 800, fontFamily: MONO, lineHeight: 1 }}>{activeTimerStr}</div>
                  <div style={{ fontSize: 9, color: "#555", fontFamily: MONO, marginTop: 2 }}>{fmtDur(activeTask.duration)} planned</div>
                </div>
              </div>

              {/* ═══ 3 ACTION BUTTONS: PAUSE / SKIP / SWITCH ═══ */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                <div className="tap" onClick={pauseTask} style={{ background: "#EF9F2712", border: "1px solid #EF9F2730", borderRadius: 12, padding: "10px 8px", textAlign: "center" }}>
                  <PauseIcon size={16} color="#EF9F27" />
                  <div style={{ fontSize: 9, fontWeight: 700, color: "#EF9F27", fontFamily: MONO, marginTop: 4, letterSpacing: 1 }}>PAUSE</div>
                </div>
                <div className="tap" onClick={skipTask} style={{ background: "#ffffff06", border: "1px solid #2a2a30", borderRadius: 12, padding: "10px 8px", textAlign: "center" }}>
                  <SkipIcon size={16} color="#888" />
                  <div style={{ fontSize: 9, fontWeight: 700, color: "#888", fontFamily: MONO, marginTop: 4, letterSpacing: 1 }}>SKIP</div>
                </div>
                <div className="tap" onClick={switchTask} style={{ background: "#D4537E12", border: "1px solid #D4537E30", borderRadius: 12, padding: "10px 8px", textAlign: "center" }}>
                  <SwitchIcon size={16} color="#D4537E" />
                  <div style={{ fontSize: 9, fontWeight: 700, color: "#D4537E", fontFamily: MONO, marginTop: 4, letterSpacing: 1 }}>SWITCH</div>
                </div>
              </div>

              {/* Stop / Complete button below */}
              <div className="tap" onClick={stopAndComplete} style={{ marginTop: 10, background: `${pc}15`, border: `1px solid ${pc}30`, borderRadius: 12, padding: "10px", textAlign: "center", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                <StopIcon size={14} color={pc} />
                <div style={{ fontSize: 11, fontWeight: 700, color: pc, fontFamily: MONO, letterSpacing: 1 }}>DONE</div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ═══ PAUSED POPUP ═══ */}
      {popupState === "paused" && pausedTask && (
        <div style={{ position: "fixed", bottom: "calc(16px + env(safe-area-inset-bottom, 0px))", left: "50%", transform: "translateX(-50%)", width: "calc(100% - 28px)", maxWidth: 402, zIndex: 90 }}>
          <div style={{ background: "#0c0c14", borderRadius: 20, padding: "18px 20px", border: "1.5px solid #EF9F2735" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{ position: "relative", width: 48, height: 48, flexShrink: 0 }}>
                <svg width="48" height="48" viewBox="0 0 48 48"><circle cx="24" cy="24" r="20" fill="none" stroke="#1e1e24" strokeWidth="3" /><circle cx="24" cy="24" r="20" fill="none" stroke="#EF9F27" strokeWidth="3" strokeDasharray="125.7" strokeDashoffset="62.85" strokeLinecap="round" transform="rotate(-90 24 24)" /></svg>
                <PauseIcon size={16} color="#EF9F27" />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                  <div style={{ fontSize: 10, color: "#EF9F27", fontWeight: 700, fontFamily: MONO, letterSpacing: 1.5 }}>PAUSED</div>
                </div>
                <div style={{ fontSize: 14, color: "#FAEEDA", fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{pausedTask.name}</div>
                <div style={{ fontSize: 9, color: "#555", fontFamily: MONO, marginTop: 2 }}>paused {fmtDur(Math.round(pauseElapsedSec / 60))} ago</div>
              </div>
              <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                <div className="tap" onClick={resumePaused} style={{ width: 40, height: 40, borderRadius: 10, background: "#5DCAA518", border: "1px solid #5DCAA530", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <PlayIcon size={16} color="#5DCAA5" />
                </div>
                <div className="tap" onClick={dismissPaused} style={{ width: 40, height: 40, borderRadius: 10, background: "#ffffff08", border: "1px solid #2a2a30", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <SkipIcon size={14} color="#666" />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══ GRACE PERIOD POPUP — overdue task within 15 min ═══ */}
      {popupState === "grace" && overdueTask && (
        <div style={{ position: "fixed", bottom: "calc(16px + env(safe-area-inset-bottom, 0px))", left: "50%", transform: "translateX(-50%)", width: "calc(100% - 28px)", maxWidth: 402, zIndex: 90 }}>
          <div style={{ background: "#0c0c14", borderRadius: 20, padding: "18px 20px", border: "1.5px solid #EF9F2740", animation: "graceFlash 2s infinite" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{ position: "relative", width: 48, height: 48, flexShrink: 0 }}>
                <svg width="48" height="48" viewBox="0 0 48 48"><circle cx="24" cy="24" r="20" fill="none" stroke="#1e1e24" strokeWidth="3" /><circle cx="24" cy="24" r="20" fill="none" stroke="#EF9F27" strokeWidth="3" strokeDasharray="125.7" strokeDashoffset={125.7 * (1 - graceRemainingSec / 900)} strokeLinecap="round" transform="rotate(-90 24 24)" /></svg>
                <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", fontSize: 11, color: "#EF9F27", fontWeight: 700, fontFamily: MONO }}>{graceRemainingMin}m</div>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                  <div style={{ fontSize: 10, color: "#EF9F27", fontWeight: 700, fontFamily: MONO, letterSpacing: 1.5 }}>OVERDUE</div>
                </div>
                <div style={{ fontSize: 14, color: "#FAEEDA", fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{overdueTask.name}</div>
                <div style={{ fontSize: 9, color: "#555", fontFamily: MONO, marginTop: 2 }}>auto-skips in {graceRemainingMin}m</div>
              </div>
              <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                <div className="tap" onClick={() => startTask(overdueTask)} style={{ width: 40, height: 40, borderRadius: 10, background: "#5DCAA518", border: "1px solid #5DCAA530", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <PlayIcon size={16} color="#5DCAA5" />
                </div>
                <div className="tap" onClick={() => skipPendingTask(overdueTask)} style={{ width: 40, height: 40, borderRadius: 10, background: "#ffffff08", border: "1px solid #2a2a30", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <SkipIcon size={14} color="#666" />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══ UPCOMING POPUP ═══ */}
      {popupState === "upcoming" && upcoming && (
        <div style={{ position: "fixed", bottom: "calc(16px + env(safe-area-inset-bottom, 0px))", left: "50%", transform: "translateX(-50%)", width: "calc(100% - 28px)", maxWidth: 402, zIndex: 90 }}>
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

      {/* ═══ SWITCH INPUT MODAL ═══ */}
      {showSwitchInput && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 200, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
          <div onClick={() => { setShowSwitchInput(false); }} style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.6)" }} />
          <div style={{ position: "relative", width: "100%", maxWidth: 430, background: "#13131a", borderRadius: "24px 24px 0 0", padding: "24px 20px 36px", zIndex: 201, border: "1px solid #D4537E30", borderBottom: "none" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
              <SwitchIcon size={18} color="#D4537E" />
              <div style={{ fontSize: 16, fontWeight: 700, color: "#FBEAF0", fontFamily: DISPLAY }}>Urgent task</div>
              <div style={{ flex: 1 }} />
              <div className="tap" onClick={() => setShowSwitchInput(false)} style={{ width: 32, height: 32, borderRadius: 10, background: "#1e1e24", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              </div>
            </div>
            {switchingFrom && (
              <div style={{ fontSize: 10, color: "#D4537E", fontFamily: MONO, marginBottom: 12, padding: "8px 12px", background: "#D4537E10", borderRadius: 8, border: "1px solid #D4537E20" }}>
                ⏸ {switchingFrom.name} paused — will resume after
              </div>
            )}
            <div style={{ background: "#0e0e12", borderRadius: 14, padding: "12px 14px", border: "1px solid #D4537E30", display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 16, color: "#D4537E" }}>⚡</span>
              <input autoFocus value={switchInput} onChange={e => setSwitchInput(e.target.value)} onKeyDown={e => e.key === "Enter" && addSwitchTask()} placeholder="urgent task 30m work" style={{ flex: 1, background: "none", border: "none", color: "#ccc", fontSize: 13, fontFamily: BODY, outline: "none" }} />
              {switchInput && <div className="tap" onClick={addSwitchTask} style={{ background: "#D4537E", borderRadius: 8, padding: "6px 14px", fontSize: 11, color: "#fff", fontWeight: 700, fontFamily: MONO }}>GO</div>}
            </div>
            <div style={{ fontSize: 10, color: "#333", marginTop: 5, fontFamily: MONO }}>name + duration + work/rest</div>
          </div>
        </div>
      )}

      {/* ═══ EDIT TASK MODAL ═══ */}
      {editModal && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 200, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
          <div onClick={() => setEditModal(null)} style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.6)" }} />
          <div style={{ position: "relative", width: "100%", maxWidth: 430, background: "#13131a", borderRadius: "24px 24px 0 0", padding: "24px 20px 36px", zIndex: 201, border: "1px solid #1e1e24", borderBottom: "none" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: "#E1F5EE", fontFamily: DISPLAY }}>Edit task</div>
              <div className="tap" onClick={() => setEditModal(null)} style={{ width: 32, height: 32, borderRadius: 10, background: "#1e1e24", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              </div>
            </div>
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 10, color: "#5DCAA5", fontFamily: MONO, letterSpacing: 2, marginBottom: 6 }}>TITLE</div>
              <input value={editFields.name} onChange={e => setEditFields({ ...editFields, name: e.target.value })} style={{ width: "100%", background: "#0e0e12", border: "1px solid #2a2a30", borderRadius: 12, padding: "12px 14px", color: "#ccc", fontSize: 14, fontFamily: BODY, outline: "none" }} />
            </div>
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
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 10, color: "#5DCAA5", fontFamily: MONO, letterSpacing: 2, marginBottom: 6 }}>DESCRIPTION</div>
              <input value={editFields.desc} onChange={e => setEditFields({ ...editFields, desc: e.target.value })} placeholder="Optional notes..." style={{ width: "100%", background: "#0e0e12", border: "1px solid #2a2a30", borderRadius: 12, padding: "12px 14px", color: "#ccc", fontSize: 14, fontFamily: BODY, outline: "none" }} />
            </div>
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
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              </div>
            </div>
            <div style={{ fontSize: 10, color: "#5DCAA5", fontFamily: MONO, letterSpacing: 2, marginBottom: 6 }}>GROUP NAME</div>
            <input autoFocus value={groupInput} onChange={e => setGroupInput(e.target.value)} onKeyDown={e => e.key === "Enter" && confirmAddGroup()} placeholder="e.g. PERSONAL, FITNESS..." style={{ width: "100%", background: "#0e0e12", border: "1px solid #2a2a30", borderRadius: 12, padding: "12px 14px", color: "#ccc", fontSize: 14, fontFamily: BODY, outline: "none", marginBottom: 20 }} />
            <div className="tap" onClick={confirmAddGroup} style={{ background: "#5DCAA5", borderRadius: 14, padding: "14px", textAlign: "center", fontSize: 14, fontWeight: 700, color: "#063d30", fontFamily: DISPLAY }}>Add group</div>
          </div>
        </div>
      )}

      {/* ═══ NOTIFICATION PERMISSION BANNER ═══ */}
      {notifBanner && !notifEnabled && (
        <div style={{
          position: "fixed",
          bottom: "calc(80px + env(safe-area-inset-bottom, 0px))",
          left: "50%",
          transform: "translateX(-50%)",
          width: "calc(100% - 28px)",
          maxWidth: 402,
          zIndex: 95,
          animation: "fadeUp 0.3s ease",
        }}>
          <div style={{
            background: "#13131a",
            borderRadius: 20,
            padding: "18px 20px",
            border: "1.5px solid #5DCAA530",
            display: "flex",
            alignItems: "center",
            gap: 14,
          }}>
            <div style={{
              width: 40, height: 40, borderRadius: 12,
              background: "#5DCAA515",
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0,
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#5DCAA5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 01-3.46 0" />
              </svg>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#E1F5EE", marginBottom: 2 }}>
                Enable autopilot?
              </div>
              <div style={{ fontSize: 11, color: "#555" }}>
                Get task reminders when the app is closed
              </div>
            </div>
            <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
              <div
                className="tap"
                onClick={() => setNotifBanner(false)}
                style={{
                  padding: "8px 12px", borderRadius: 10,
                  background: "#1e1e24", border: "1px solid #2a2a30",
                  fontSize: 11, fontWeight: 600, color: "#555",
                  fontFamily: "'IBM Plex Mono', monospace",
                  cursor: "pointer",
                }}
              >
                LATER
              </div>
              <div
                className="tap"
                onClick={async () => {
                  const ok = await initNotifications();
                  setNotifEnabled(ok);
                  setNotifBanner(false);
                  if (ok) {
                    scheduleTaskNotifications(tasks);
                    scheduleDaySummary(drainRates.sleepHour, drainRates.sleepMinute);
                  }
                }}
                style={{
                  padding: "8px 14px", borderRadius: 10,
                  background: "#5DCAA5", border: "none",
                  fontSize: 11, fontWeight: 700, color: "#063d30",
                  fontFamily: "'IBM Plex Mono', monospace",
                  cursor: "pointer",
                }}
              >
                YES
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
