"use client";
import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
  initNotifications, scheduleTaskNotifications, schedulePauseReminder,
  cancelPauseReminder, scheduleDaySummary, onTaskDone, clearAllNotifications, getPermissionStatus,
} from "./notifications";
import { ensureAuth, syncAllTasks, syncDayLog, saveProfile } from "../lib/sync";
import {
  STORAGE_KEY, PLAN_KEY, SETTINGS_KEY, GRACE_PERIOD_MS, DEFAULT_RATES,
  DISPLAY, BODY, MONO, PHASE_CARDS, INCOME, EVENTS, DAYS, MONTHS_SHORT,
  MOCK_COLLAB_TASKS,
} from "../lib/constants";
import {
  pad, fmtTime, fmtDur, dateKey, nowMinutes, isSameDay, getAllDatesInMonth,
  getMYDate, genId, getDisplayTime, getDisplayTimeMin, parseCmd, autoShift,
  accentForType, bgForType,
} from "../lib/utils";
import type { Task, ActiveTask, Template, DayHistory, DrainRates, Theme, BottomTab, CmdCategory } from "../lib/types";
import BottomNav from "../components/BottomNav";
import CommunityTab from "../components/CommunityTab";
import FriendsTab from "../components/FriendsTab";
import FriendsFeed from "../components/FriendsFeed";
import ProfileTab from "../components/ProfileTab";
import PopupBar from "../components/PopupBar";

// ── SVG icons ──
function PlayIcon({ size = 18, color = "var(--accent)" }: { size?: number; color?: string }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none"><path d="M8 5.14v13.72a1 1 0 001.5.86l11.04-6.86a1 1 0 000-1.72L9.5 4.28A1 1 0 008 5.14z" fill={color} /></svg>;
}
function StopIcon({ size = 18, color = "var(--danger)" }: { size?: number; color?: string }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none"><rect x="6" y="6" width="12" height="12" rx="2" fill={color} /></svg>;
}
function PauseIcon({ size = 18, color = "var(--warn)" }: { size?: number; color?: string }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none"><rect x="6" y="5" width="4" height="14" rx="1" fill={color} /><rect x="14" y="5" width="4" height="14" rx="1" fill={color} /></svg>;
}
function SkipIcon({ size = 18, color = "var(--t3)" }: { size?: number; color?: string }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none"><path d="M5 4l10 8-10 8V4z" fill={color} /><rect x="17" y="5" width="3" height="14" rx="1" fill={color} /></svg>;
}
function SwitchIcon({ size = 18, color = "var(--pink)" }: { size?: number; color?: string }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="17 1 21 5 17 9" /><path d="M3 11V9a4 4 0 014-4h14" /><polyline points="7 23 3 19 7 15" /><path d="M21 13v2a4 4 0 01-4 4H3" /></svg>;
}
function Divider() {
  return <div style={{ height: 20, display: "flex", alignItems: "center", padding: "0 24px" }}><div style={{ flex: 1, height: 1, background: "linear-gradient(90deg, transparent, var(--border), transparent)" }} /></div>;
}

// ═══════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════

export default function Home() {
  // ── Core state ──
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activeTask, setActiveTask] = useState<ActiveTask | null>(null);
  const [pausedTask, setPausedTask] = useState<ActiveTask | null>(null);
  const [switchingFrom, setSwitchingFrom] = useState<ActiveTask | null>(null);
  const [dayLog, setDayLog] = useState<any[]>([]);
  const [energyUsed, setEnergyUsed] = useState(0);
  const [energyCharged, setEnergyCharged] = useState(0);
  const [drainRates, setDrainRates] = useState<DrainRates>(DEFAULT_RATES);

  // ── UI state ──
  const [bottomTab, setBottomTab] = useState<BottomTab>("main");
  const [activeTab, setActiveTab] = useState("today");
  const [theme, setTheme] = useState<Theme>("dark");
  const [loaded, setLoaded] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  // ── Main tab state ──
  const [cmdInput, setCmdInput] = useState("");
  const [cmdCategory, setCmdCategory] = useState<CmdCategory>("task");
  const [expandedTask, setExpandedTask] = useState<string | null>(null);
  const [showCompleted, setShowCompleted] = useState(false);
  const [popupMinimized, setPopupMinimized] = useState(false);
  const [expandedDone, setExpandedDone] = useState<string | null>(null);
  const [powerExpanded, setPowerExpanded] = useState(false);
  const [showPowerSettings, setShowPowerSettings] = useState(false);
  const [recordExpanded, setRecordExpanded] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMonth, setViewMonth] = useState(new Date().getMonth());
  const [viewYear, setViewYear] = useState(new Date().getFullYear());
  const [monthPickerOpen, setMonthPickerOpen] = useState(false);
  const [customGroups, setCustomGroups] = useState<string[]>([]);
  const [notifEnabled, setNotifEnabled] = useState(false);
  const [notifBanner, setNotifBanner] = useState(false);

  // ── Modals ──
  const [editModal, setEditModal] = useState<any>(null);
  const [editFields, setEditFields] = useState({ name: "", time: "", duration: "", type: "work", desc: "", rate: "" });
  const [groupInput, setGroupInput] = useState("");
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [showSwitchInput, setShowSwitchInput] = useState(false);
  const [switchInput, setSwitchInput] = useState("");

  // ── Plan data ──
  const [templates, setTemplates] = useState<Template[]>([]);
  const [history, setHistory] = useState<Record<string, DayHistory>>({});
  const [streak, setStreak] = useState(0);

  // ── Suggestion state ──
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const powerTapTimer = useRef<any>(null);
  const monthScrollRef = useRef<HTMLDivElement>(null);
  const dateScrollRef = useRef<HTMLDivElement>(null);
  const suggestTimer = useRef<any>(null);
  const today = useMemo(() => new Date(), []);

  // ═══ LOAD DATA ═══
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const planRaw = localStorage.getItem(PLAN_KEY);
      let loadedTemplates: Template[] = [];
      let loadedHistory: Record<string, DayHistory> = {};
      let loadedStreak = 0;

      if (planRaw) {
        const pd = JSON.parse(planRaw);
        loadedTemplates = pd.templates || []; loadedHistory = pd.history || {}; loadedStreak = pd.streak || 0;
        setTemplates(loadedTemplates); setHistory(loadedHistory); setStreak(loadedStreak);
      }

      try {
        const settingsRaw = localStorage.getItem(SETTINGS_KEY);
        if (settingsRaw) {
          const parsed = JSON.parse(settingsRaw);
          setDrainRates({ ...DEFAULT_RATES, ...parsed });
          if (parsed.theme) setTheme(parsed.theme);
        }
      } catch {}

      if (raw) {
        const d = JSON.parse(raw);
        const todayMY = getMYDate();
        if (d.savedDate !== todayMY) {
          // Day rollover: archive + generate from templates
          if (d.savedDate && d.tasks) {
            const prevDone = (d.dayLog || []).filter((e: any) => e.type === "work" || e.type === "rest").length;
            const prevSkipped = (d.tasks || []).filter((t: any) => t.status === "skipped").length;
            const prevTotal = (d.dayLog || []).reduce((s: number, e: any) => s + e.duration, 0);
            loadedHistory[d.savedDate] = { date: d.savedDate, tasks: d.tasks.length, done: prevDone, skipped: prevSkipped, totalMin: prevTotal, log: d.dayLog || [] };
            let s = prevDone > 0 ? 1 : 0;
            if (s > 0) { const check = new Date(d.savedDate); for (let i = 1; i < 365; i++) { check.setDate(check.getDate() - 1); const ck = dateKey(check); if (loadedHistory[ck]?.done > 0) s++; else break; } }
            loadedStreak = s; setHistory(loadedHistory); setStreak(loadedStreak); savePlan(loadedTemplates, loadedHistory, loadedStreak);
          }
          const dow = new Date().getDay();
          const gen = loadedTemplates.filter(t => t.days.length === 0 || t.days.includes(dow)).map(t => ({ name: t.name, time: t.time, timeMin: t.timeMin, duration: t.duration, type: t.type, id: genId(), status: "pending" as const, adjustedTimeMin: null, skippedAt: null, fromTemplate: t.id, urgent: false, planned_duration: t.duration, actual_duration: null }));
          setTasks(gen); setDayLog([]); setEnergyUsed(0); setEnergyCharged(0); setActiveTask(null); setPausedTask(null); setSwitchingFrom(null); setCustomGroups(d.customGroups || []);
        } else {
          setTasks(d.tasks || []); setDayLog(d.dayLog || []); setEnergyUsed(d.energyUsed || 0); setEnergyCharged(d.energyCharged || 0);
          setActiveTask(d.activeTask || null); setPausedTask(d.pausedTask || null); setSwitchingFrom(d.switchingFrom || null); setCustomGroups(d.customGroups || []);
        }
      }
    } catch {}
    ensureAuth().then(uid => { if (uid) setUserId(uid); });
    setLoaded(true);
  }, []);

  // ═══ NOTIFICATIONS ═══
  useEffect(() => { if (!loaded) return; const s = getPermissionStatus(); if (s === "granted") initNotifications().then(ok => setNotifEnabled(ok)); else if (s === "default") { const t = setTimeout(() => setNotifBanner(true), 3000); return () => clearTimeout(t); } }, [loaded]);
  useEffect(() => { if (notifEnabled) scheduleTaskNotifications(tasks); }, [tasks, notifEnabled]);
  useEffect(() => { if (notifEnabled) scheduleDaySummary(drainRates.sleepHour, drainRates.sleepMinute); }, [notifEnabled, drainRates.sleepHour, drainRates.sleepMinute]);

  // ═══ SW message handler ═══
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    const handler = (e: MessageEvent) => {
      if (e.data?.type === "NOTIFICATION_CLICK") {
        if (e.data.action === "start" && e.data.taskId) { const t = tasks.find(x => x.id === e.data.taskId); if (t?.status === "pending") startTask(t); }
        else if (e.data.action === "resume" && pausedTask) resumePaused();
      }
    };
    navigator.serviceWorker.addEventListener("message", handler);
    return () => navigator.serviceWorker.removeEventListener("message", handler);
  }, [tasks, pausedTask]);

  // ═══ PERSISTENCE ═══
  const persist = useCallback((data: any) => { try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...data, savedDate: getMYDate() })); } catch {} }, []);
  const save = useCallback((t: any, log: any, eu: number, ec: number, at: any, cg: any, pt?: any, sf?: any) => {
    persist({ tasks: t, dayLog: log, energyUsed: eu, energyCharged: ec, activeTask: at, customGroups: cg, pausedTask: pt ?? null, switchingFrom: sf ?? null });
    if (userId) { const td = getMYDate(); syncAllTasks(userId, t, td); syncDayLog(userId, td, { tasks_total: t.length, tasks_done: log.filter((e: any) => e.type === "work" || e.type === "rest").length, tasks_skipped: t.filter((x: any) => x.status === "skipped").length, energy_used: eu, energy_charged: ec, log_entries: log }); }
  }, [persist, userId]);
  const savePlan = useCallback((tpls: Template[], hist: Record<string, DayHistory>, str: number) => { try { localStorage.setItem(PLAN_KEY, JSON.stringify({ templates: tpls, history: hist, streak: str })); } catch {} }, []);
  const saveDrainRates = useCallback((rates: DrainRates) => {
    try { localStorage.setItem(SETTINGS_KEY, JSON.stringify({ ...rates, theme })); } catch {}
    setDrainRates(rates);
    if (userId) saveProfile(userId, { drain_idle: rates.idle, drain_work: rates.work, drain_urgent: rates.urgent, drain_rest: rates.rest, wake_hour: rates.wakeHour, wake_minute: rates.wakeMinute, sleep_hour: rates.sleepHour, sleep_minute: rates.sleepMinute, max_energy_h: rates.maxEnergyHours });
  }, [userId, theme]);

  // ═══ TICK + ENERGY ═══
  useEffect(() => { const id = setInterval(() => setTick(t => t + 1), 1000); return () => clearInterval(id); }, []);
  useEffect(() => { if (!activeTask) return; const elapsed = (Date.now() - activeTask.startedAt) / 60000; if (activeTask.type === "work") setEnergyUsed(activeTask.baseUsed + elapsed); else setEnergyCharged(activeTask.baseCharged + elapsed); }, [tick, activeTask]);

  // ═══ GRACE PERIOD AUTO-SKIP ═══
  useEffect(() => {
    if (activeTask) return;
    const now = nowMinutes(); const nowMs = Date.now(); let shifted = false; let u = [...tasks];
    u = u.map(t => { if (t.status !== "pending") return t; const tt = getDisplayTimeMin(t); if ((now - tt) * 60 * 1000 >= GRACE_PERIOD_MS && tt < now) { shifted = true; return { ...t, status: "skipped" as const, skippedAt: nowMs }; } return t; });
    if (shifted) { setTasks(u); save(u, dayLog, energyUsed, energyCharged, activeTask, customGroups, pausedTask, switchingFrom); }
  }, [tick, tasks, activeTask, dayLog, energyUsed, energyCharged, customGroups, pausedTask, switchingFrom, save]);

  // ═══ SCROLL ═══
  useEffect(() => { if (!dateScrollRef.current) return; const i = selectedDate.getDate() - 1; dateScrollRef.current.scrollTo({ left: Math.max(0, i * 52 - dateScrollRef.current.clientWidth / 2 + 26), behavior: "smooth" }); }, [selectedDate, viewMonth]);
  useEffect(() => { const fn = () => { if (document.visibilityState === "visible") { const n = new Date(); setSelectedDate(n); setViewMonth(n.getMonth()); setViewYear(n.getFullYear()); } }; document.addEventListener("visibilitychange", fn); return () => document.removeEventListener("visibilitychange", fn); }, []);
  useEffect(() => { if (monthPickerOpen && monthScrollRef.current) { const el = monthScrollRef.current.querySelector('[data-active="true"]'); if (el) (el as HTMLElement).scrollIntoView({ block: "center", behavior: "auto" }); } }, [monthPickerOpen]);

  // ═══ TASK ACTIONS ═══
  const addTask = () => { const p = parseCmd(cmdInput, cmdCategory); if (!p) return; const n = [...tasks, p]; setTasks(n); setCmdInput(""); save(n, dayLog, energyUsed, energyCharged, activeTask, customGroups, pausedTask, switchingFrom); };

  const startTask = (task: Task) => {
    if (activeTask) stopAndComplete();
    if (pausedTask && pausedTask.id === task.id) {
      const at = { ...task, startedAt: Date.now() - (pausedTask.elapsedMs || 0), baseUsed: energyUsed, baseCharged: energyCharged } as ActiveTask;
      setActiveTask(at); setPausedTask(null); const u = tasks.map(t => t.id === task.id ? { ...t, status: "active" as const } : t); setTasks(u); save(u, dayLog, energyUsed, energyCharged, at, customGroups, null, switchingFrom); return;
    }
    const at = { ...task, startedAt: Date.now(), baseUsed: energyUsed, baseCharged: energyCharged } as ActiveTask;
    setActiveTask(at); const u = tasks.map(t => t.id === task.id ? { ...t, status: "active" as const } : t); setTasks(u); setExpandedTask(null); save(u, dayLog, energyUsed, energyCharged, at, customGroups, pausedTask, switchingFrom);
  };

  const stopAndComplete = () => {
    if (!activeTask) return;
    const elapsed = Math.round((Date.now() - activeTask.startedAt) / 60000);
    const entry = { id: genId(), name: activeTask.name, type: activeTask.type, urgent: activeTask.urgent, duration: elapsed, startTime: new Date(activeTask.startedAt).toTimeString().slice(0, 5), endTime: new Date().toTimeString().slice(0, 5) };
    const newLog = [...dayLog, entry];
    const u = tasks.map(t => t.id === activeTask.id ? { ...t, status: "done" as const, actual_duration: elapsed, completedAt: Date.now(), startedAt: activeTask.startedAt } : t);
    setDayLog(newLog); setTasks(u); setActiveTask(null);
    if (notifEnabled) onTaskDone(activeTask.id);
    if (switchingFrom) { const orig = u.find(t => t.id === switchingFrom.id); if (orig && orig.status !== "done") { setPausedTask(switchingFrom); setSwitchingFrom(null); save(u, newLog, energyUsed, energyCharged, null, customGroups, switchingFrom, null); return; } setSwitchingFrom(null); }
    save(u, newLog, energyUsed, energyCharged, null, customGroups, pausedTask, null);
  };

  const pauseTask = () => {
    if (!activeTask) return;
    const pt = { ...activeTask, elapsedMs: Date.now() - activeTask.startedAt, pausedAt: Date.now() } as ActiveTask;
    setPausedTask(pt); const u = tasks.map(t => t.id === activeTask.id ? { ...t, status: "pending" as const } : t);
    const shifted = autoShift(u, getDisplayTimeMin(activeTask), 30); setTasks(shifted); setActiveTask(null);
    save(shifted, dayLog, energyUsed, energyCharged, null, customGroups, pt, switchingFrom);
    if (notifEnabled) schedulePauseReminder(activeTask.name, activeTask.id);
  };

  const skipTask = () => {
    if (!activeTask) return;
    if (!confirm(`Skip "${activeTask.name}"?`)) return;
    const elapsed = Math.round((Date.now() - activeTask.startedAt) / 60000);
    if (elapsed > 0) {
      const entry = { id: genId(), name: activeTask.name, type: activeTask.type, urgent: activeTask.urgent, duration: elapsed, startTime: new Date(activeTask.startedAt).toTimeString().slice(0, 5), endTime: new Date().toTimeString().slice(0, 5), partial: true };
      const newLog = [...dayLog, entry]; setDayLog(newLog);
      const u = tasks.map(t => t.id === activeTask.id ? { ...t, status: "skipped" as const, skippedAt: Date.now(), actual_duration: elapsed } : t);
      setTasks(autoShift(u, nowMinutes(), 0)); setActiveTask(null); if (notifEnabled) onTaskDone(activeTask.id); save(autoShift(u, nowMinutes(), 0), newLog, energyUsed, energyCharged, null, customGroups, pausedTask, switchingFrom);
    } else {
      const u = tasks.map(t => t.id === activeTask.id ? { ...t, status: "skipped" as const, skippedAt: Date.now() } : t);
      setTasks(autoShift(u, nowMinutes(), 0)); setActiveTask(null); if (notifEnabled) onTaskDone(activeTask.id); save(autoShift(u, nowMinutes(), 0), dayLog, energyUsed, energyCharged, null, customGroups, pausedTask, switchingFrom);
    }
  };

  const switchTask = () => {
    if (!activeTask) return;
    const sf = { ...activeTask, elapsedMs: Date.now() - activeTask.startedAt, pausedAt: Date.now() } as ActiveTask;
    setSwitchingFrom(sf); const u = tasks.map(t => t.id === activeTask.id ? { ...t, status: "pending" as const } : t); setTasks(u); setActiveTask(null); setShowSwitchInput(true); setSwitchInput(""); save(u, dayLog, energyUsed, energyCharged, null, customGroups, null, sf);
  };

  const addSwitchTask = () => {
    const p = parseCmd(switchInput); if (!p) return; p.urgent = true;
    const n = [...tasks, p]; setSwitchInput(""); setShowSwitchInput(false);
    const at = { ...p, urgent: true, startedAt: Date.now(), baseUsed: energyUsed, baseCharged: energyCharged } as ActiveTask;
    setActiveTask(at); const u = n.map(t => t.id === p.id ? { ...t, status: "active" as const, urgent: true } : t); setTasks(u); save(u, dayLog, energyUsed, energyCharged, at, customGroups, null, switchingFrom);
  };

  const resumePaused = () => { if (!pausedTask) return; const t = tasks.find(x => x.id === pausedTask.id); if (t) startTask(t); if (notifEnabled) cancelPauseReminder(); };
  const dismissPaused = () => { if (!pausedTask) return; setPausedTask(null); save(tasks, dayLog, energyUsed, energyCharged, activeTask, customGroups, null, switchingFrom); if (notifEnabled) cancelPauseReminder(); };

  const markDone = (task: Task) => { const entry = { id: genId(), name: task.name, type: task.type, urgent: task.urgent, duration: task.duration, startTime: getDisplayTime(task), endTime: fmtTime(Math.floor((getDisplayTimeMin(task) + task.duration) / 60) % 24, (getDisplayTimeMin(task) + task.duration) % 60) }; const newLog = [...dayLog, entry]; const u = tasks.map(t => t.id === task.id ? { ...t, status: "done" as const, actual_duration: task.duration, completedAt: Date.now() } : t); setDayLog(newLog); setTasks(u); setExpandedTask(null); save(u, newLog, energyUsed, energyCharged, activeTask, customGroups, pausedTask, switchingFrom); if (notifEnabled) onTaskDone(task.id); };
  const markUndone = (task: Task) => { const u = tasks.map(t => t.id === task.id ? { ...t, status: "pending" as const, actual_duration: null, completedAt: undefined } : t); const newLog = dayLog.filter(e => !(e.name === task.name && e.startTime === getDisplayTime(task))); setTasks(u); setDayLog(newLog); save(u, newLog, energyUsed, energyCharged, activeTask, customGroups, pausedTask, switchingFrom); };
  const skipPendingTask = (task: Task) => { const u = tasks.map(t => t.id === task.id ? { ...t, status: "skipped" as const, skippedAt: Date.now() } : t); setTasks(u); save(u, dayLog, energyUsed, energyCharged, activeTask, customGroups, pausedTask, switchingFrom); if (notifEnabled) onTaskDone(task.id); };
  const deleteTask = (task: Task) => { const u = tasks.filter(t => t.id !== task.id); setTasks(u); setExpandedTask(null); save(u, dayLog, energyUsed, energyCharged, activeTask, customGroups, pausedTask, switchingFrom); };
  const toggleRest = (task: Task) => { const u = tasks.map(t => t.id === task.id ? { ...t, type: t.type === "work" ? "rest" : "work" } : t); setTasks(u); save(u, dayLog, energyUsed, energyCharged, activeTask, customGroups, pausedTask, switchingFrom); };
  const toggleUrgent = (task: Task) => { const u = tasks.map(t => t.id === task.id ? { ...t, urgent: !t.urgent } : t); setTasks(u); save(u, dayLog, energyUsed, energyCharged, activeTask, customGroups, pausedTask, switchingFrom); };
  const openEditModal = (task: Task) => { setEditFields({ name: task.name, time: getDisplayTime(task), duration: String(task.duration), type: task.type, desc: task.desc || "", rate: task.rate || "" }); setEditModal(task); setExpandedTask(null); };
  const saveEdit = () => { if (!editModal || !editFields.name.trim()) return; const [h, m] = editFields.time.split(":").map(Number); const u = tasks.map(t => t.id === editModal.id ? { ...t, name: editFields.name.trim(), time: fmtTime(h || 0, m || 0), timeMin: (h || 0) * 60 + (m || 0), adjustedTimeMin: null, duration: parseInt(editFields.duration) || 60, type: editFields.type, desc: editFields.desc, rate: editFields.rate } : t); setTasks(u); save(u, dayLog, energyUsed, energyCharged, activeTask, customGroups, pausedTask, switchingFrom); setEditModal(null); };
  const addGroup = () => { setGroupInput(""); setShowGroupModal(true); };
  const confirmAddGroup = () => { if (groupInput.trim()) { const x = [...customGroups, groupInput.trim()]; setCustomGroups(x); save(tasks, dayLog, energyUsed, energyCharged, activeTask, x, pausedTask, switchingFrom); } setShowGroupModal(false); setGroupInput(""); };
  const pickMonth = (m: number) => { setViewMonth(m); setMonthPickerOpen(false); setSelectedDate(m === today.getMonth() && viewYear === today.getFullYear() ? new Date(today) : new Date(viewYear, m, 1)); };
  const resetAll = () => { setTasks([]); setDayLog([]); setTemplates([]); setHistory({}); setStreak(0); setCustomGroups([]); setEnergyUsed(0); setEnergyCharged(0); setActiveTask(null); setPausedTask(null); setSwitchingFrom(null); try { localStorage.removeItem(STORAGE_KEY); localStorage.removeItem(PLAN_KEY); } catch {} };

  const fetchSuggestions = useCallback((q: string) => {
    if (q.length < 2) { setSuggestions([]); setShowSuggestions(false); return; }
    clearTimeout(suggestTimer.current);
    suggestTimer.current = setTimeout(async () => {
      if (!userId) return;
      const { getPersonalSuggestions, getGlobalSuggestions } = await import("../lib/sync");
      const personal = await getPersonalSuggestions(userId, q, 3);
      const global = await getGlobalSuggestions(q, 3);
      const pNames = new Set(personal.map((p: any) => p.name.toLowerCase()));
      const merged = [...personal.map((p: any) => ({ ...p, source: "you" })), ...global.filter((g: any) => !pNames.has(g.name.toLowerCase())).map((g: any) => ({ ...g, source: "popular" }))].slice(0, 5);
      setSuggestions(merged); setShowSuggestions(merged.length > 0);
    }, 300);
  }, [userId]);
  const pickSuggestion = (s: any) => { setCmdInput(s.name); if (s.category) setCmdCategory(s.category); setSuggestions([]); setShowSuggestions(false); };

  // ═══ COMPUTED ═══
  const activeElapsed = activeTask ? Math.floor((Date.now() - activeTask.startedAt) / 1000) : 0;
  const activeTimerStr = `${pad(Math.floor(activeElapsed / 3600))}:${pad(Math.floor((activeElapsed % 3600) / 60))}:${pad(activeElapsed % 60)}`;
  const wakeTimeMin = drainRates.wakeHour * 60 + drainRates.wakeMinute;
  const eTotal = drainRates.maxEnergyHours * 60;
  const minutesSinceWake = Math.max(0, nowMinutes() - wakeTimeMin);
  const workMinsLogged = dayLog.filter((e: any) => e.type === "work" && !e.urgent).reduce((s: number, e: any) => s + e.duration, 0);
  const urgentMinsLogged = dayLog.filter((e: any) => e.urgent || e.type === "urgent").reduce((s: number, e: any) => s + e.duration, 0);
  const restMinsLogged = dayLog.filter((e: any) => e.type === "rest").reduce((s: number, e: any) => s + e.duration, 0);
  const activeElapsedMin = Math.floor(activeElapsed / 60);
  const totalWorkMins = workMinsLogged + (activeTask?.type === "work" && !activeTask?.urgent ? activeElapsedMin : 0);
  const totalUrgentMins = urgentMinsLogged + (activeTask?.urgent ? activeElapsedMin : 0);
  const totalRestMins = restMinsLogged + (activeTask?.type === "rest" ? activeElapsedMin : 0);
  const idleMins2 = Math.max(0, minutesSinceWake - totalWorkMins - totalUrgentMins - totalRestMins);
  const totalDrain = idleMins2 * drainRates.idle + totalWorkMins * drainRates.work + totalUrgentMins * drainRates.urgent;
  const totalRecharge = totalRestMins * drainRates.rest;
  const eRemain = Math.max(0, Math.min(eTotal, eTotal - totalDrain + totalRecharge));
  const ePct = Math.round((eRemain / eTotal) * 100);
  const eHrs = (eRemain / 60).toFixed(1);

  const sorted = useMemo(() => [...tasks].sort((a, b) => getDisplayTimeMin(a) - getDisplayTimeMin(b)), [tasks]);
  const pendingTasks = sorted.filter(t => t.status === "pending" || t.status === "active");
  const skippedTasks = sorted.filter(t => t.status === "skipped");
  const doneTasks = sorted.filter(t => t.status === "done");
  const tasksDoneCount = dayLog.filter((e: any) => e.type === "work").length;
  const restsDoneCount = dayLog.filter((e: any) => e.type === "rest").length;
  const totalTracked = dayLog.reduce((s: number, e: any) => s + e.duration, 0);
  const skippedCount = skippedTasks.length;
  const hasTasks = pendingTasks.length > 0 || doneTasks.length > 0 || skippedTasks.length > 0;
  const upcoming = sorted.find(t => t.status === "pending" && getDisplayTimeMin(t) - nowMinutes() > 0 && getDisplayTimeMin(t) - nowMinutes() <= 60);
  const overdueTask = sorted.find(t => t.status === "pending" && getDisplayTimeMin(t) <= nowMinutes() && nowMinutes() - getDisplayTimeMin(t) < 15);
  const popupState = activeTask ? (activeTask.type === "work" ? "working" : "resting") : pausedTask ? "paused" : overdueTask ? "grace" : upcoming ? "upcoming" : "idle";
  const hasActivePopup = popupState !== "idle";
  const upcomingMins = upcoming ? Math.max(0, Math.round(getDisplayTimeMin(upcoming) - nowMinutes())) : 0;
  const graceRemainingSec = overdueTask ? Math.max(0, Math.round((GRACE_PERIOD_MS - (nowMinutes() - getDisplayTimeMin(overdueTask)) * 60000) / 1000)) : 0;
  const pauseElapsedSec = pausedTask ? Math.floor((Date.now() - (pausedTask.pausedAt || Date.now())) / 1000) : 0;
  const pauseTimerStr = `${pad(Math.floor(pauseElapsedSec / 3600))}:${pad(Math.floor((pauseElapsedSec % 3600) / 60))}:${pad(pauseElapsedSec % 60)}`;
  const allDates = useMemo(() => getAllDatesInMonth(viewYear, viewMonth), [viewYear, viewMonth]);
  const PILL_H = 62;

  const handleTabChange = (tab: BottomTab) => setBottomTab(tab);
  const handleFriendsNav = (tab: BottomTab) => setBottomTab(tab);

  // Auto-restore popup when state transitions (new task, overdue, etc.)
  const prevPopupState = useRef(popupState);
  useEffect(() => { if (popupState !== prevPopupState.current) { setPopupMinimized(false); prevPopupState.current = popupState; } }, [popupState]);

  // ═══ LOADING ═══
  if (!loaded) return (
    <div style={{ background: "#050505", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ fontSize: 13, letterSpacing: 6, color: "#2ECDA7", fontFamily: MONO, fontWeight: 500 }} className="anim-pulse">PITGOAL</div>
    </div>
  );

  // ═══ RENDER ═══
  return (
    <div data-theme={theme} style={{ background: "var(--bg)", minHeight: "100vh", fontFamily: BODY, color: "var(--t2)", maxWidth: 430, margin: "0 auto", position: "relative", paddingBottom: hasActivePopup ? 200 : 110, paddingTop: "env(safe-area-inset-top, 0px)" }}>

      {/* ── MAIN TAB ── */}
      {bottomTab === "main" && (
        <div style={{ padding: "16px 14px 0" }}>

          {/* ═══ SECTION A: Power 75% + Record 25% ═══ */}
          <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
            {/* Power bar — 75% */}
            <div className="tap" onClick={() => setPowerExpanded(!powerExpanded)} style={{ flex: 3, background: "var(--card)", borderRadius: 50, padding: "10px 16px", border: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: ePct > 30 ? "var(--accent)" : ePct > 10 ? "var(--warn)" : "var(--danger)", fontFamily: MONO }}>{ePct}%</div>
              <div style={{ flex: 1, height: 6, background: "var(--border)", borderRadius: 100, overflow: "hidden" }}>
                <div style={{ width: `${ePct}%`, height: "100%", background: ePct > 30 ? "var(--accent)" : ePct > 10 ? "var(--warn)" : "var(--danger)", borderRadius: 100, transition: "width 1s" }} />
              </div>
              <div style={{ fontSize: 10, color: "var(--t5)", fontFamily: MONO }}>{eHrs}h</div>
            </div>
            {/* Record — 25% */}
            <div style={{ flex: 1, background: "var(--card)", borderRadius: 50, padding: "10px 8px", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              {[{ v: tasksDoneCount, c: "var(--accent)" }, { v: restsDoneCount, c: "var(--rest)" }, { v: skippedCount, c: "var(--warn)" }].map((s, i) => (
                <div key={i} style={{ fontSize: 14, fontWeight: 800, color: s.c, fontFamily: DISPLAY, lineHeight: 1 }}>{s.v}</div>
              ))}
            </div>
          </div>

          {/* ═══ SECTION B: Calendar — month pill + 3 dates ═══ */}
          <div style={{ marginBottom: 18 }}>
            <div style={{ display: "flex", gap: 5, alignItems: "stretch" }}>
              {/* Month picker pill */}
              <div style={{ position: "relative", flexShrink: 0, zIndex: monthPickerOpen ? 20 : 1 }}>
                {!monthPickerOpen ? (
                  <div className="tap" onClick={() => setMonthPickerOpen(true)} style={{ textAlign: "center", padding: "8px 6px", borderRadius: 12, width: 46, height: PILL_H, background: "var(--card)", border: "1px solid var(--border)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2, cursor: "pointer" }}>
                    <div style={{ fontSize: 9, color: "var(--t5)", fontFamily: MONO }}>{viewYear}</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "var(--accent)", fontFamily: MONO }}>{MONTHS_SHORT[viewMonth]}</div>
                  </div>
                ) : (
                  <div ref={monthScrollRef} className="no-scroll" style={{ position: "absolute", top: 0, left: 0, zIndex: 20, background: "var(--card)", border: "1px solid var(--accent-30)", borderRadius: 12, width: 50, maxHeight: 210, overflowY: "auto", padding: "4px 0" }}>
                    {MONTHS_SHORT.map((m, i) => {
                      const isCur = i === today.getMonth() && viewYear === today.getFullYear();
                      const isSel = i === viewMonth;
                      return <div key={m} data-active={isSel ? "true" : "false"} className="tap" onClick={() => pickMonth(i)} style={{ padding: "7px 4px", textAlign: "center", borderRadius: 6, margin: "1px 3px", fontSize: 11, fontFamily: MONO, fontWeight: 600, cursor: "pointer", background: isSel ? "var(--accent-10)" : "transparent", color: isSel ? "var(--accent)" : isCur ? "var(--accent)" : "var(--t5)" }}>{m}</div>;
                    })}
                  </div>
                )}
              </div>
              {/* 3 date pills: yesterday, today, tomorrow */}
              {(() => {
                const selIdx = allDates.findIndex(d => isSameDay(d, selectedDate));
                const nearby = [selIdx - 1, selIdx, selIdx + 1].filter(i => i >= 0 && i < allDates.length).map(i => allDates[i]);
                return nearby.map(d => {
                  const isT = isSameDay(d, today);
                  const isSel = isSameDay(d, selectedDate);
                  const ev = EVENTS[dateKey(d)];
                  return (
                    <div key={d.getTime()} className={isSel ? "" : "tap"} onClick={() => !isSel && setSelectedDate(new Date(d))}
                      style={{ flex: isSel ? 1.3 : 1, height: PILL_H, borderRadius: 12, background: isSel ? "var(--accent-10)" : "var(--card)", border: isSel ? "1.5px solid var(--accent-30)" : "1px solid var(--border)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", cursor: isSel ? "default" : "pointer", opacity: isSel ? 1 : 0.5 }}>
                      <div style={{ fontSize: 11, color: isSel ? "var(--accent)" : "var(--t5)" }}>{DAYS[d.getDay()]}</div>
                      <div style={{ fontSize: isSel ? 22 : 15, fontWeight: 700, color: isSel ? "var(--accent)" : "var(--t5)", lineHeight: 1.1 }}>{d.getDate()}</div>
                      {isT && <div style={{ width: 5, height: 5, borderRadius: "50%", marginTop: 2, background: "var(--accent)" }} />}
                      {ev && isSel && <div style={{ fontSize: 7, color: "var(--warn)", fontFamily: MONO, marginTop: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 80 }}>{ev}</div>}
                    </div>
                  );
                });
              })()}
            </div>
            {monthPickerOpen && <div onClick={() => setMonthPickerOpen(false)} style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 10 }} />}
          </div>

          {/* ═══ MAIN SECTION: Tags + Content ═══ */}
          <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap", marginBottom: 14 }}>
            {["today", "categories", "income", ...customGroups].map(t => (
              <div key={t} className="tap" onClick={() => setActiveTab(t)}
                style={{ padding: "7px 16px", borderRadius: 100, fontFamily: MONO, fontSize: 11, fontWeight: 700, letterSpacing: 1, background: activeTab === t ? "var(--accent)" : "var(--card)", color: activeTab === t ? "#fff" : "var(--t4)" }}>{t.toUpperCase()}</div>
            ))}
            <div className="tap" onClick={addGroup} style={{ width: 30, height: 30, borderRadius: "50%", background: "var(--card)", display: "flex", alignItems: "center", justifyContent: "center", border: "1px dashed var(--t5)" }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--t4)" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
            </div>
          </div>

          {/* ── TODAY TAB CONTENT ── */}
          {activeTab === "today" && (
            <>
              {/* Merged timeline: personal tasks + collab tasks, sorted by time */}
              {(() => {
                const collabAsTasks = MOCK_COLLAB_TASKS.map(ct => ({
                  ...ct, timeMin: parseInt(ct.time.split(":")[0]) * 60 + parseInt(ct.time.split(":")[1] || "0"),
                  isCollab: true, friendName: ct.friend,
                }));
                const allPending: any[] = [...pendingTasks.map(t => ({ ...t, isCollab: false, friendName: "" })), ...collabAsTasks]
                  .sort((a: any, b: any) => (a.adjustedTimeMin ?? a.timeMin) - (b.adjustedTimeMin ?? b.timeMin));
                return allPending.map((task, i) => {
                  if ((task as any).isCollab) {
                    const ct = task as any;
                    return (
                      <div key={ct.id} style={{ marginBottom: 8, animation: `fadeUp 0.3s ease ${i * 0.04}s both` }}>
                        <div style={{ background: "var(--card)", borderRadius: 20, border: "1px solid var(--border)", borderLeft: "3px solid var(--pink)", padding: "14px 16px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                            <div style={{ fontSize: 10, color: "var(--accent)", fontFamily: MONO, letterSpacing: 1 }}>{ct.time} — {fmtTime(Math.floor((ct.timeMin + ct.duration) / 60) % 24, (ct.timeMin + ct.duration) % 60)}</div>
                            <span style={{ fontSize: 8, color: "var(--pink)", background: "var(--pink-dim)", padding: "2px 6px", borderRadius: 4, fontFamily: MONO, fontWeight: 700 }}>COLLAB</span>
                          </div>
                          <div style={{ fontSize: 16, color: "var(--t2)", fontWeight: 700, fontFamily: DISPLAY }}>{ct.name}</div>
                          <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                            <span style={{ fontSize: 9, color: "var(--t4)", background: "var(--glow)", padding: "3px 8px", borderRadius: 6, fontFamily: MONO, fontWeight: 600 }}>w/ {ct.friendName}</span>
                            <span style={{ fontSize: 9, color: "var(--t4)", background: "var(--glow)", padding: "3px 8px", borderRadius: 6, fontFamily: MONO, fontWeight: 600 }}>{fmtDur(ct.duration)}</span>
                          </div>
                        </div>
                      </div>
                    );
                  }
                  const accent = accentForType(task.type);
                  const displayTime = getDisplayTime(task);
                  const endTime = fmtTime(Math.floor((getDisplayTimeMin(task) + task.duration) / 60) % 24, (getDisplayTimeMin(task) + task.duration) % 60);
                  const isActive = task.status === "active";
                  const isExpanded = expandedTask === task.id;
                  const isFilled = isActive || task.urgent;
                  const fillBg = isActive ? "var(--warn-fill)" : task.urgent ? "var(--danger-fill)" : "var(--card)";
                  const fillBorder = isFilled ? "transparent" : "var(--border)";
                  // Active yellow = dark text, Urgent red = white text
                  const fillText = isActive ? "var(--warn-fill-text)" : "var(--fill-title)";
                  const fillSub = isActive ? "rgba(40,40,0,0.6)" : "var(--fill-sub)";
                  const fillChip = isActive ? "rgba(40,40,0,0.1)" : "rgba(255,255,255,0.12)";
                  const fillDot = isActive ? "var(--warn-fill-text)" : "#fff";
                  return (
                    <div key={task.id} style={{ marginBottom: 8, animation: `fadeUp 0.3s ease ${i * 0.04}s both` }}>
                      <div style={{ background: fillBg, borderRadius: isExpanded ? "20px 20px 0 0" : 20, border: `1px solid ${fillBorder}`, borderBottom: isExpanded ? "none" : undefined }}>
                        <div style={{ display: "flex", alignItems: "center" }}>
                          <div className="tap" onClick={() => setExpandedTask(isExpanded ? null : task.id)} style={{ flex: 1, padding: "14px 0 14px 16px" }}>
                            {/* Status label for filled cards */}
                            {isFilled && (
                              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                                {isActive && <div className="anim-pulse" style={{ width: 8, height: 8, borderRadius: "50%", background: fillDot }} />}
                                {isActive && <span style={{ fontSize: 8, color: fillSub, fontFamily: MONO, fontWeight: 700, letterSpacing: 1 }}>LIVE</span>}
                                {task.urgent && !isActive && <span style={{ fontSize: 8, color: fillSub, fontFamily: MONO, fontWeight: 700, letterSpacing: 1 }}>! URGENT</span>}
                              </div>
                            )}
                            <div style={{ fontSize: 10, color: isFilled ? fillSub : accent, fontFamily: MONO, letterSpacing: 1, marginBottom: 4 }}>{displayTime} — {endTime}</div>
                            <div style={{ fontSize: 16, color: isFilled ? fillText : isActive ? "var(--t1)" : "var(--t2)", fontWeight: 700, fontFamily: DISPLAY }}>{task.name}</div>
                            <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                              <span style={{ fontSize: 9, color: isFilled ? fillSub : "var(--t4)", background: isFilled ? fillChip : "var(--glow)", padding: "3px 8px", borderRadius: 6, fontFamily: MONO, fontWeight: 600 }}>{task.type.toUpperCase()}</span>
                              <span style={{ fontSize: 9, color: isFilled ? fillSub : "var(--t4)", background: isFilled ? fillChip : "var(--glow)", padding: "3px 8px", borderRadius: 6, fontFamily: MONO, fontWeight: 600 }}>{fmtDur(task.duration)}</span>
                              {task.urgent && !isFilled && <span style={{ fontSize: 9, color: "var(--danger)", background: "var(--danger-dim)", padding: "3px 8px", borderRadius: 6, fontFamily: MONO, fontWeight: 600 }}>⚡ URGENT</span>}
                            </div>
                          </div>
                          {isActive ? (
                            <div className="anim-pulse" style={{ width: 10, height: 10, borderRadius: "50%", background: fillDot, margin: "0 18px", boxShadow: `0 0 0 3px ${isActive ? "rgba(40,40,0,0.15)" : "rgba(255,255,255,0.25)"}` }} />
                          ) : (
                            <div className="tap" onClick={(e) => { e.stopPropagation(); startTask(task); }} style={{ padding: "14px 16px 14px 10px" }}>
                              <div style={{ width: 36, height: 36, borderRadius: 12, background: isFilled ? fillChip : "var(--accent-10)", border: `1px solid ${isFilled ? (isActive ? "rgba(40,40,0,0.15)" : "rgba(255,255,255,0.25)") : "var(--accent-20)"}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                                <PlayIcon size={16} color={isFilled ? fillText : accent} />
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                      {isExpanded && (
                        <div style={{ background: "var(--card)", borderRadius: "0 0 20px 20px", padding: "12px 14px 14px", border: "1px solid var(--border)", borderTop: "1px dashed var(--border2)" }}>
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                            <div className="tap" onClick={() => markDone(task)} style={{ background: "var(--accent-bg)", borderRadius: 14, padding: "14px 12px", textAlign: "center" }}>
                              <div style={{ fontSize: 13, fontWeight: 700, color: "var(--accent)", fontFamily: DISPLAY }}>Mark done</div>
                            </div>
                            <div className="tap" onClick={() => openEditModal(task)} style={{ background: "var(--rest-bg)", borderRadius: 14, padding: "14px 12px", textAlign: "center" }}>
                              <div style={{ fontSize: 13, fontWeight: 700, color: "var(--rest)", fontFamily: DISPLAY }}>Edit</div>
                            </div>
                            <div className="tap" onClick={() => toggleRest(task)} style={{ background: "var(--card)", borderRadius: 14, padding: "14px 12px", textAlign: "center", border: "1px solid var(--border)" }}>
                              <div style={{ fontSize: 13, fontWeight: 700, color: "var(--t2)", fontFamily: DISPLAY }}>{task.type === "rest" ? "Set as work" : "Set as rest"}</div>
                            </div>
                            <div className="tap" onClick={() => deleteTask(task)} style={{ background: "var(--danger-bg)", borderRadius: 14, padding: "14px 12px", textAlign: "center" }}>
                              <div style={{ fontSize: 13, fontWeight: 700, color: "var(--danger)", fontFamily: DISPLAY }}>Delete</div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                });
              })()}

              {/* Done tasks (stacked) */}
              {doneTasks.length > 0 && (
                <div style={{ marginTop: 4, marginBottom: 8 }}>
                  <div className="tap" onClick={() => { setShowCompleted(!showCompleted); setExpandedDone(null); }}>
                    {!showCompleted && (
                      <div style={{ position: "relative", height: Math.min(doneTasks.length, 3) * 6 + 48 }}>
                        {doneTasks.slice(-3).map((t, i, arr) => {
                          const bg = bgForType(t.type); const accent = accentForType(t.type);
                          return (
                            <div key={t.id} style={{ position: i === arr.length - 1 ? "relative" : "absolute", top: (arr.length - 1 - i) * 6, left: 0, right: 0, background: bg, borderRadius: 14, padding: "12px 14px", border: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 10, zIndex: i }}>
                              <div style={{ fontSize: 10, color: accent, fontFamily: MONO, minWidth: 38, fontWeight: 600 }}>{getDisplayTime(t)}</div>
                              <div style={{ fontSize: 13, color: "var(--t1)", fontWeight: 700, flex: 1, textDecoration: "line-through", textDecorationColor: "var(--t5)", fontFamily: DISPLAY }}>{t.name}</div>
                              <div style={{ fontSize: 9, color: accent, fontFamily: MONO, fontWeight: 600 }}>{fmtDur(t.actual_duration || t.duration)}</div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  {showCompleted && doneTasks.map((t, i) => {
                    const bg = bgForType(t.type); const accent = accentForType(t.type);
                    const isDoneExpanded = expandedDone === t.id;
                    const doneTime = getDisplayTime(t);
                    const doneEndTime = fmtTime(Math.floor((getDisplayTimeMin(t) + (t.actual_duration || t.duration)) / 60) % 24, (getDisplayTimeMin(t) + (t.actual_duration || t.duration)) % 60);
                    return (
                      <div key={t.id} style={{ marginBottom: 4, animation: `fadeUp 0.2s ease ${i * 0.03}s both` }}>
                        <div className="tap" onClick={() => setExpandedDone(isDoneExpanded ? null : t.id)}
                          style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", background: bg, borderRadius: isDoneExpanded ? "14px 14px 0 0" : 14, border: "1px solid var(--border)", borderBottom: isDoneExpanded ? "none" : undefined, cursor: "pointer" }}>
                          <div style={{ width: 20, height: 20, borderRadius: 6, background: "var(--done)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                            <span style={{ fontSize: 11, color: "#050505", fontWeight: 700 }}>✓</span>
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 13, color: "var(--t3)", fontWeight: 700, textDecoration: "line-through", textDecorationColor: "var(--t5)", fontFamily: DISPLAY, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.name}</div>
                            <div style={{ fontSize: 9, color: "var(--t5)", fontFamily: MONO, marginTop: 2 }}>{doneTime} — {doneEndTime}</div>
                          </div>
                          <div style={{ fontSize: 9, color: accent, fontFamily: MONO, fontWeight: 600, flexShrink: 0 }}>{fmtDur(t.actual_duration || t.duration)}</div>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--t5)" strokeWidth="2" strokeLinecap="round" style={{ flexShrink: 0, transform: isDoneExpanded ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}><polyline points="6 9 12 15 18 9" /></svg>
                        </div>
                        {isDoneExpanded && (
                          <div style={{ background: bg, borderRadius: "0 0 14px 14px", padding: "10px 14px 12px", border: "1px solid var(--border)", borderTop: "1px dashed var(--border2)" }}>
                            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
                              <span style={{ fontSize: 9, color: "var(--t4)", background: "var(--glow)", padding: "3px 8px", borderRadius: 6, fontFamily: MONO, fontWeight: 600 }}>{t.type.toUpperCase()}</span>
                              <span style={{ fontSize: 9, color: "var(--t4)", background: "var(--glow)", padding: "3px 8px", borderRadius: 6, fontFamily: MONO, fontWeight: 600 }}>PLANNED {fmtDur(t.planned_duration || t.duration)}</span>
                              {t.actual_duration && t.actual_duration !== t.duration && (
                                <span style={{ fontSize: 9, color: accent, background: "var(--glow)", padding: "3px 8px", borderRadius: 6, fontFamily: MONO, fontWeight: 600 }}>ACTUAL {fmtDur(t.actual_duration)}</span>
                              )}
                              {t.urgent && <span style={{ fontSize: 9, color: "var(--danger)", background: "var(--danger-dim)", padding: "3px 8px", borderRadius: 6, fontFamily: MONO, fontWeight: 600 }}>⚡ URGENT</span>}
                            </div>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                              <div className="tap" onClick={(e) => { e.stopPropagation(); markUndone(t); setExpandedDone(null); }} style={{ background: "var(--card)", borderRadius: 12, padding: "12px 10px", textAlign: "center", border: "1px solid var(--border)" }}>
                                <div style={{ fontSize: 12, fontWeight: 700, color: "var(--warn)", fontFamily: DISPLAY }}>Undo</div>
                              </div>
                              <div className="tap" onClick={(e) => { e.stopPropagation(); deleteTask(t); setExpandedDone(null); }} style={{ background: "var(--danger-bg)", borderRadius: 12, padding: "12px 10px", textAlign: "center" }}>
                                <div style={{ fontSize: 12, fontWeight: 700, color: "var(--danger)", fontFamily: DISPLAY }}>Delete</div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Create task bar — BELOW tasks */}
              <div style={{ marginTop: 12, marginBottom: 24 }}>
                <div style={{ background: "var(--card)", borderRadius: 16, padding: "12px 14px", border: "1px dashed var(--border)", display: "flex", alignItems: "center", gap: 8 }}>
                  <div className="tap" onClick={() => setCmdCategory(c => c === "task" ? "rest" : c === "rest" ? "life" : "task")}
                    style={{ background: cmdCategory === "task" ? "var(--accent-20)" : cmdCategory === "rest" ? "var(--rest-20)" : "var(--warn-20)", border: `1px solid ${cmdCategory === "task" ? "var(--accent)" : cmdCategory === "rest" ? "var(--rest)" : "var(--warn)"}`, borderRadius: 8, padding: "5px 10px", fontSize: 9, fontWeight: 700, fontFamily: MONO, color: cmdCategory === "task" ? "var(--accent)" : cmdCategory === "rest" ? "var(--rest)" : "var(--warn)", cursor: "pointer", flexShrink: 0, letterSpacing: 1 }}>{cmdCategory.toUpperCase()}</div>
                  <input value={cmdInput} onChange={e => { setCmdInput(e.target.value); fetchSuggestions(e.target.value); }} onKeyDown={e => e.key === "Enter" && addTask()} placeholder="add task... 7pm 1.5h"
                    style={{ flex: 1, background: "none", border: "none", color: "var(--t2)", fontSize: 13, fontFamily: BODY, outline: "none" }} />
                  {cmdInput && <div className="tap" onClick={addTask} style={{ background: "var(--accent)", borderRadius: 8, padding: "6px 14px", fontSize: 11, color: "#fff", fontWeight: 700, fontFamily: MONO }}>GO</div>}
                </div>
              </div>

              {/* Friends feed — below the fold with fade shadow */}
              <div style={{ position: "relative" }}>
                {/* Fade gradient overlay at top of friends section */}
                <div style={{ position: "absolute", top: 0, left: -14, right: -14, height: 40, background: "linear-gradient(to bottom, var(--bg), transparent)", zIndex: 2, pointerEvents: "none" }} />
                <div style={{ paddingTop: 16, opacity: 0.6 }}>
                  <FriendsFeed onNavigate={handleFriendsNav} />
                </div>
              </div>
            </>
          )}

          {/* Categories tab */}
          {activeTab === "categories" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {PHASE_CARDS.map((p, i) => (
                <div key={p.id} style={{ background: "var(--card)", borderRadius: 20, padding: "22px 24px", animation: `fadeUp 0.35s ease ${i * 0.06}s both`, border: "1px solid var(--border)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <div><div style={{ fontSize: 10, fontFamily: MONO, fontWeight: 600, letterSpacing: 2, color: "var(--accent)" }}>{p.label}</div><div style={{ fontSize: 18, fontWeight: 700, color: "var(--t1)", fontFamily: DISPLAY, marginTop: 4 }}>{p.title}</div></div>
                    <div style={{ textAlign: "right" }}><div style={{ fontSize: 30, fontWeight: 800, color: "var(--t1)", fontFamily: DISPLAY, lineHeight: 1 }}>{p.pct}<span style={{ fontSize: 14, color: "var(--t3)" }}>%</span></div><div style={{ fontSize: 11, color: "var(--t3)", fontFamily: MONO }}>{p.done}/{p.total}</div></div>
                  </div>
                  <div style={{ height: 3, background: "var(--border)", borderRadius: 2, marginTop: 14, overflow: "hidden" }}><div style={{ height: "100%", width: `${p.pct}%`, background: "var(--accent)", borderRadius: 2 }} /></div>
                </div>
              ))}
            </div>
          )}

          {/* Income tab */}
          {activeTab === "income" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {INCOME.map((m, i) => (
                <div key={m.label} style={{ background: "var(--card)", borderRadius: 20, padding: "22px 24px", border: "1px solid var(--border)", animation: `fadeUp 0.35s ease ${i * 0.07}s both` }}>
                  <div style={{ fontSize: 26, fontWeight: 800, color: "var(--t1)", fontFamily: DISPLAY }}>{m.label}</div>
                  <div style={{ fontSize: 12, color: "var(--accent)", marginTop: 2, fontFamily: MONO }}>{m.desc}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── OTHER TABS (imported components) ── */}
      {bottomTab === "community" && <CommunityTab />}
      {bottomTab === "friends" && <FriendsTab onNavigate={handleFriendsNav} />}
      {bottomTab === "profile" && (
        <ProfileTab
          userId={userId} theme={theme} setTheme={setTheme}
          tasksDoneCount={tasksDoneCount} streak={streak} ePct={ePct}
          drainRates={drainRates} saveDrainRates={saveDrainRates}
          notifEnabled={notifEnabled} setNotifEnabled={setNotifEnabled}
          initNotifications={initNotifications} clearAllNotifications={clearAllNotifications}
          scheduleTaskNotifications={scheduleTaskNotifications} scheduleDaySummary={scheduleDaySummary}
          tasks={tasks} templates={templates} history={history}
          customGroups={customGroups} dayLog={dayLog} resetAll={resetAll}
        />
      )}

      {/* ── EDIT MODAL ── */}
      {editModal && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 200, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
          <div onClick={() => setEditModal(null)} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)" }} />
          <div style={{ position: "relative", width: "100%", maxWidth: 430, background: "var(--card)", borderRadius: "24px 24px 0 0", padding: "24px 20px 36px", zIndex: 201, border: "1px solid var(--border)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: "var(--t1)", fontFamily: DISPLAY }}>Edit task</div>
              <div className="tap" onClick={() => setEditModal(null)} style={{ width: 32, height: 32, borderRadius: 10, background: "var(--card2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--t4)" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              </div>
            </div>
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 10, color: "var(--accent)", fontFamily: MONO, letterSpacing: 2, marginBottom: 6 }}>TITLE</div>
              <input value={editFields.name} onChange={e => setEditFields({ ...editFields, name: e.target.value })} style={{ width: "100%", background: "var(--bg)", border: "1px solid var(--border2)", borderRadius: 12, padding: "12px 14px", color: "var(--t2)", fontSize: 14, fontFamily: BODY, outline: "none" }} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
              <div><div style={{ fontSize: 10, color: "var(--accent)", fontFamily: MONO, letterSpacing: 2, marginBottom: 6 }}>TIME</div><input type="time" value={editFields.time} onChange={e => setEditFields({ ...editFields, time: e.target.value })} style={{ width: "100%", background: "var(--bg)", border: "1px solid var(--border2)", borderRadius: 12, padding: "12px 14px", color: "var(--t2)", fontSize: 14, fontFamily: MONO, outline: "none" }} /></div>
              <div><div style={{ fontSize: 10, color: "var(--accent)", fontFamily: MONO, letterSpacing: 2, marginBottom: 6 }}>DURATION</div><input type="number" value={editFields.duration} onChange={e => setEditFields({ ...editFields, duration: e.target.value })} style={{ width: "100%", background: "var(--bg)", border: "1px solid var(--border2)", borderRadius: 12, padding: "12px 14px", color: "var(--t2)", fontSize: 14, fontFamily: MONO, outline: "none" }} /></div>
            </div>
            <div className="tap" onClick={saveEdit} style={{ background: "var(--accent)", borderRadius: 14, padding: "14px", textAlign: "center", fontSize: 14, fontWeight: 700, color: "#fff", fontFamily: DISPLAY }}>Save changes</div>
          </div>
        </div>
      )}

      {/* ── SWITCH INPUT ── */}
      {showSwitchInput && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 200, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
          <div onClick={() => { setShowSwitchInput(false); if (switchingFrom && !activeTask) resumePaused(); }} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)" }} />
          <div style={{ position: "relative", width: "100%", maxWidth: 430, background: "var(--card)", borderRadius: "24px 24px 0 0", padding: "24px 20px 36px", zIndex: 201, border: "1px solid var(--border)" }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: "var(--pink)", fontFamily: DISPLAY, marginBottom: 16 }}>⚡ Switch to urgent task</div>
            <div style={{ display: "flex", gap: 8 }}>
              <input autoFocus value={switchInput} onChange={e => setSwitchInput(e.target.value)} onKeyDown={e => e.key === "Enter" && addSwitchTask()} placeholder="urgent task name 30m"
                style={{ flex: 1, background: "var(--bg)", border: "1px solid var(--pink-30)", borderRadius: 12, padding: "12px 14px", color: "var(--t2)", fontSize: 13, fontFamily: BODY, outline: "none" }} />
              <div className="tap" onClick={addSwitchTask} style={{ background: "var(--pink)", borderRadius: 12, padding: "12px 16px", fontSize: 11, fontWeight: 700, color: "#fff", fontFamily: MONO, cursor: "pointer" }}>GO</div>
            </div>
          </div>
        </div>
      )}

      <PopupBar
        currentTab={bottomTab}
        popupState={popupState}
        activeTask={activeTask ?? null}
        pausedTask={pausedTask ?? null}
        overdueTask={overdueTask ?? null}
        upcomingTask={upcoming ?? null}
        activeTimerStr={activeTimerStr}
        pauseTimerStr={pauseTimerStr}
        graceRemainingMin={Math.ceil(graceRemainingSec / 60)}
        upcomingMins={upcomingMins}
        onDone={stopAndComplete}
        onPause={pauseTask}
        onSkip={skipTask}
        onSwitch={switchTask}
        onResume={resumePaused}
        onDismiss={dismissPaused}
        onStartOverdue={() => overdueTask && startTask(overdueTask)}
        onSkipOverdue={() => overdueTask && skipPendingTask(overdueTask)}
        onStartUpcoming={() => upcoming && startTask(upcoming)}
      />
      <BottomNav active={bottomTab} onChange={handleTabChange} />
    </div>
  );
}
