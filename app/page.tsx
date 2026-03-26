"use client";
import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
  initNotifications, scheduleTaskNotifications, schedulePauseReminder,
  cancelPauseReminder, scheduleDaySummary, onTaskDone, clearAllNotifications, getPermissionStatus,
} from "./notifications";
import { ensureAuth, syncAllTasks, syncDayLog, saveProfile } from "../lib/sync";
import {
  STORAGE_KEY, PLAN_KEY, SETTINGS_KEY, GRACE_PERIOD_MS, DEFAULT_RATES,
  DISPLAY, BODY, MONO, EVENTS, DAYS, MONTHS_SHORT,
  MOCK_COLLAB_TASKS,
} from "../lib/constants";
import {
  pad, fmtTime, fmtDur, dateKey, nowMinutes, isSameDay, getAllDatesInMonth,
  getMYDate, genId, getDisplayTime, getDisplayTimeMin, parseCmd, autoShift,
} from "../lib/utils";
import type { Task, ActiveTask, Template, DayHistory, DrainRates, Theme, BottomTab, CmdCategory } from "../lib/types";
import BottomNav from "../components/BottomNav";
import CommunityTab from "../components/CommunityTab";
import FriendsTab from "../components/FriendsTab";
import FriendStack from "../components/FriendStack";
import ProfileTab from "../components/ProfileTab";
import PopupBar from "../components/PopupBar";
import CreateTaskSheet from "../components/CreateTaskSheet";
import type { TaskType, TaskTag, CreateTaskResult } from "../components/CreateTaskSheet";
import { DEFAULT_TYPES, DEFAULT_TAGS, DEFAULT_TYPE_IDS, DEFAULT_TAG_IDS } from "../components/CreateTaskSheet";

// ── SVG icons ──
function PlayIcon({ size = 18, color = "var(--accent)" }: { size?: number; color?: string }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none"><path d="M8 5.14v13.72a1 1 0 001.5.86l11.04-6.86a1 1 0 000-1.72L9.5 4.28A1 1 0 008 5.14z" fill={color} /></svg>;
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

  const [loaded, setLoaded] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  // ── Main tab state ──
  const [cmdInput, setCmdInput] = useState("");
  const [cmdCategory, setCmdCategory] = useState<CmdCategory>("task");
  const [expandedTask, setExpandedTask] = useState<string | null>(null);
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
  const [showCreateSheet, setShowCreateSheet] = useState(false);
  const [customTypes, setCustomTypes] = useState<TaskType[]>([]);
  const [customTagDefs, setCustomTagDefs] = useState<TaskTag[]>([]);
  const [showDone, setShowDone] = useState(false);
  const [showSkipped, setShowSkipped] = useState(false);
  const [statPopup, setStatPopup] = useState<"done" | "tracked" | "energy" | null>(null);
  const [filterMode, setFilterMode] = useState<string>("all");
  const [deleteMode, setDeleteMode] = useState(false);
  const longPressTimer = useRef<any>(null);
  const [confirmSkipId, setConfirmSkipId] = useState<string | null>(null);
  const [editingPill, setEditingPill] = useState<{
    kind: "type" | "tag";
    key: string;
    name: string;
    color: string;
  } | null>(null);
  const [editPillName, setEditPillName] = useState("");
  const [editPillColor, setEditPillColor] = useState("");

  // Storage key for types/tags
  const TYPES_KEY = "pitgoal-custom-types";
  const TAGS_KEY = "pitgoal-custom-tags";
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


  // ── Nav expanded state (fix #6) ──
  const [navExpanded, setNavExpanded] = useState(false);
  const navScrollTimer = useRef<any>(null);

  const dateStripScrollRef = useRef<HTMLDivElement>(null);
  const dateStripInitialScroll = useRef(false);

  const powerTapTimer = useRef<any>(null);
  const monthScrollRef = useRef<HTMLDivElement>(null);
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

      try {
        const typesRaw = localStorage.getItem(TYPES_KEY);
        if (typesRaw) setCustomTypes(JSON.parse(typesRaw));
      } catch {}
      try {
        const tagsRaw = localStorage.getItem(TAGS_KEY);
        if (tagsRaw) setCustomTagDefs(JSON.parse(tagsRaw));
      } catch {}

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
    try { localStorage.setItem(SETTINGS_KEY, JSON.stringify({ ...rates, theme: "dark" })); } catch {}
    setDrainRates(rates);
    if (userId) saveProfile(userId, { drain_idle: rates.idle, drain_work: rates.work, drain_urgent: rates.urgent, drain_rest: rates.rest, wake_hour: rates.wakeHour, wake_minute: rates.wakeMinute, sleep_hour: rates.sleepHour, sleep_minute: rates.sleepMinute, max_energy_h: rates.maxEnergyHours });
  }, [userId]);

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

  // ═══ NAV — expand on interaction, collapse after 1.5s on release ═══
  const expandNav = useCallback((startCollapse?: boolean) => {
    setNavExpanded(true);
    clearTimeout(navScrollTimer.current);
    if (startCollapse) {
      navScrollTimer.current = setTimeout(() => setNavExpanded(false), 1500);
    }
  }, []);
  useEffect(() => {
    const handleScroll = () => expandNav(true);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => { window.removeEventListener("scroll", handleScroll); clearTimeout(navScrollTimer.current); };
  }, [expandNav]);

  useEffect(() => { const fn = () => { if (document.visibilityState === "visible") { const n = new Date(); setViewMonth(n.getMonth()); setViewYear(n.getFullYear()); } }; document.addEventListener("visibilitychange", fn); return () => document.removeEventListener("visibilitychange", fn); }, []);
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

  // ═══ CUSTOM TYPES ═══
const allTypesList = [...DEFAULT_TYPES, ...customTypes];
const allTypeIds = allTypesList.map(t => t.id);

const addCustomType = (t: TaskType) => {
  const next = [...customTypes, t];
  setCustomTypes(next);
  try { localStorage.setItem(TYPES_KEY, JSON.stringify(next)); } catch {}
};

const PILL_COLORS = [
  "#FFD000", "#fb923c", "#f472b6", "#a78bfa",
  "#00d4ff", "#2ECDA7", "#E24B4A", "#6b8a7a",
];

const deleteCustomType = (id: string) => {
  const next = customTypes.filter(t => t.id !== id);
  setCustomTypes(next);
  try { localStorage.setItem("pitgoal-custom-types", JSON.stringify(next)); } catch {}
};

const deleteCustomTag = (id: string) => {
  const next = customTagDefs.filter(t => t.id !== id);
  setCustomTagDefs(next);
  try { localStorage.setItem("pitgoal-custom-tags", JSON.stringify(next)); } catch {}
};

const openPillEditor = (kind: "type" | "tag", id: string, label: string, color: string) => {
  setEditingPill({ kind, key: id, name: label, color });
  setEditPillName(label);
  setEditPillColor(color);
};

const savePillEdit = () => {
  if (!editingPill || !editPillName.trim()) return;
  const newLabel = editPillName.trim().toUpperCase();
  const newColor = editPillColor;
  if (editingPill.kind === "type") {
    const next = customTypes.map(t => t.id === editingPill.key ? { ...t, label: newLabel, color: newColor } : t);
    setCustomTypes(next);
    try { localStorage.setItem(TYPES_KEY, JSON.stringify(next)); } catch {}
  } else {
    const next = customTagDefs.map(t => t.id === editingPill.key ? { ...t, label: newLabel, color: newColor } : t);
    setCustomTagDefs(next);
    try { localStorage.setItem(TAGS_KEY, JSON.stringify(next)); } catch {}
  }
  setEditingPill(null);
};

const deletePillFromEditor = () => {
  if (!editingPill) return;
  if (!confirm(`Delete this ${editingPill.kind}?`)) return;
  if (editingPill.kind === "type") {
    deleteCustomType(editingPill.key);
    // Reset tasks using this type back to default
    const u = tasks.map(t => (t as any).customType === editingPill.key ? { ...t, customType: undefined, type: "work" } : t);
    setTasks(u);
    save(u, dayLog, energyUsed, energyCharged, activeTask, customGroups, pausedTask, switchingFrom);
    if (filterMode === `type:${editingPill.key}`) setFilterMode("all");
  } else {
    deleteCustomTag(editingPill.key);
    // Remove tag from tasks that have it
    const u = tasks.map(t => (t as any).tags ? { ...t, tags: (t as any).tags.filter((tag: string) => tag !== editingPill.key) } : t);
    setTasks(u);
    save(u, dayLog, energyUsed, energyCharged, activeTask, customGroups, pausedTask, switchingFrom);
    if (filterMode === `tag:${editingPill.key}`) setFilterMode("all");
  }
  setEditingPill(null);
};

const addCustomTag = (t: TaskTag) => {
  const next = [...customTagDefs, t];
  setCustomTagDefs(next);
  try { localStorage.setItem(TAGS_KEY, JSON.stringify(next)); } catch {}
};

// ═══ CREATE FROM SHEET ═══
const handleSheetCreate = (result: CreateTaskResult) => {
  const task: Task = {
    id: genId(),
    name: result.name,
    time: result.time,
    timeMin: result.timeMin,
    duration: result.duration,
    type: result.type === "rest" ? "rest" : "work",
    status: "pending" as const,
    adjustedTimeMin: undefined as any,
    skippedAt: undefined as any,
    fromTemplate: undefined as any,
    urgent: false,
    planned_duration: result.duration,
    actual_duration: undefined as any,
    customType: result.type,
    tags: result.tags,
    desc: result.desc,
  };
  const n = [...tasks, task];
  setTasks(n);
  save(n, dayLog, energyUsed, energyCharged, activeTask, customGroups, pausedTask, switchingFrom);
};

// ═══ CYCLE TYPE (for inline mode) — REPLACE the old setCmdCategory cycle ═══
// Instead of: setCmdCategory(c => c === "task" ? "rest" : c === "rest" ? "life" : "task")
// Use this:
const cycleType = () => {
  setCmdCategory(c => {
    const idx = allTypeIds.indexOf(c);
    const nextIdx = (idx + 1) % allTypeIds.length;
    return allTypeIds[nextIdx] as CmdCategory;
  });
};

// ═══ GET TYPE COLOR (for inline pill display) ═══
const getTypeColor = (typeId: string): string => {
  const found = allTypesList.find(t => t.id === typeId);
  if (found) return found.color;
  if (typeId === "task") return "var(--accent)";
  if (typeId === "rest") return "var(--rest)";
  if (typeId === "life") return "var(--warn)";
  return "var(--t4)";
};

const getTypeLabel = (typeId: string): string => {
  const found = allTypesList.find(t => t.id === typeId);
  return found ? found.label : typeId.toUpperCase();
};

  const addSwitchTask = () => {
    const p = parseCmd(switchInput); if (!p) return; p.urgent = true;
    const n = [...tasks, p]; setSwitchInput(""); setShowSwitchInput(false);
    const at = { ...p, urgent: true, startedAt: Date.now(), baseUsed: energyUsed, baseCharged: energyCharged } as ActiveTask;
    setActiveTask(at); const u = n.map(t => t.id === p.id ? { ...t, status: "active" as const, urgent: true } : t); setTasks(u); save(u, dayLog, energyUsed, energyCharged, at, customGroups, null, switchingFrom);
  };

  const resumePaused = () => { if (!pausedTask) return; const t = tasks.find(x => x.id === pausedTask.id); if (t) startTask(t); if (notifEnabled) cancelPauseReminder(); };
  const dismissPaused = () => { if (!pausedTask) return; setPausedTask(null); save(tasks, dayLog, energyUsed, energyCharged, activeTask, customGroups, null, switchingFrom); if (notifEnabled) cancelPauseReminder(); };

  const markDone = (task: Task) => { const entry = { id: genId(), name: task.name, type: task.type, urgent: task.urgent, duration: task.duration, startTime: getDisplayTime(task), endTime: fmtTime(Math.floor((getDisplayTimeMin(task) + task.duration) / 60) % 24, (getDisplayTimeMin(task) + task.duration) % 60) }; const newLog = [...dayLog, entry]; const u = tasks.map(t => t.id === task.id ? { ...t, status: "done" as const, actual_duration: task.duration, completedAt: Date.now() } : t); setDayLog(newLog); setTasks(u); setExpandedTask(null); save(u, newLog, energyUsed, energyCharged, activeTask, customGroups, pausedTask, switchingFrom); if (notifEnabled) onTaskDone(task.id); if (activeTask?.id === task.id) { setActiveTask(null); save(u, newLog, energyUsed, energyCharged, null, customGroups, pausedTask, switchingFrom); } if (pausedTask?.id === task.id) setPausedTask(null); if (switchingFrom?.id === task.id) setSwitchingFrom(null); };
  const markUndone = (task: Task) => { const u = tasks.map(t => t.id === task.id ? { ...t, status: "pending" as const, actual_duration: null, completedAt: undefined } : t); const newLog = dayLog.filter(e => !(e.name === task.name && e.startTime === getDisplayTime(task))); setTasks(u); setDayLog(newLog); save(u, newLog, energyUsed, energyCharged, activeTask, customGroups, pausedTask, switchingFrom); };
  const skipPendingTask = (task: Task) => { const u = tasks.map(t => t.id === task.id ? { ...t, status: "skipped" as const, skippedAt: Date.now() } : t); setTasks(u); save(u, dayLog, energyUsed, energyCharged, activeTask, customGroups, pausedTask, switchingFrom); if (notifEnabled) onTaskDone(task.id); if (activeTask?.id === task.id) { setActiveTask(null); save(u, dayLog, energyUsed, energyCharged, null, customGroups, pausedTask, switchingFrom); } if (pausedTask?.id === task.id) setPausedTask(null); if (switchingFrom?.id === task.id) setSwitchingFrom(null); };
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
  const filteredPending = (() => {
    if (filterMode === "all") return pendingTasks;
    if (filterMode.startsWith("type:")) {
      const typeId = filterMode.split(":")[1];
      return pendingTasks.filter(t =>
        (t as any).customType === typeId || (typeId === "task" && t.type === "work" && !(t as any).customType) || (typeId === "rest" && t.type === "rest") || (typeId === "life" && (t as any).customType === "life")
      );
    }
    if (filterMode.startsWith("tag:")) {
      const tagId = filterMode.split(":")[1];
      return pendingTasks.filter(t => (t as any).tags && (t as any).tags.includes(tagId));
    }
    return pendingTasks;
  })();
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
  const lastDateTapRef = useRef(0);

  // Auto-scroll date strip to selected date
  useEffect(() => {
    const container = dateStripScrollRef.current;
    if (!container) return;
    const idx = selectedDate.getMonth() === viewMonth && selectedDate.getFullYear() === viewYear
      ? selectedDate.getDate() - 1 : 0;
    const cellW = 56 + 4; // width + gap
    const scrollPos = idx * cellW - container.clientWidth / 2 + 28;
    container.scrollTo({ left: scrollPos, behavior: dateStripInitialScroll.current ? "smooth" : "auto" });
    dateStripInitialScroll.current = true;
  }, [selectedDate, viewMonth, viewYear, bottomTab]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleTabChange = (tab: BottomTab) => setBottomTab(tab);
  const handleFriendsNav = (tab: BottomTab) => setBottomTab(tab);

  // ═══ LOADING ═══
  if (!loaded) return (
    <div style={{ background: "var(--bg)", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ fontSize: 13, letterSpacing: 6, color: "#FFD000", fontFamily: MONO, fontWeight: 500 }} className="anim-pulse">PITGOAL</div>
    </div>
  );

  // ═══ RENDER ═══
  return (
    <div data-theme="dark" style={{ background: "var(--bg-gradient, var(--bg))", minHeight: "100vh", fontFamily: BODY, color: "var(--t2)", maxWidth: 430, margin: "0 auto", position: "relative", paddingBottom: hasActivePopup ? 200 : 110, paddingTop: "env(safe-area-inset-top, 0px)" }}>

      {/* ── MAIN TAB ── */}
      {bottomTab === "main" && (
        <div style={{ padding: "24px 24px 0" }}>


          {/* ═══ SECTION A: 3 Stat Cards ═══ */}
          <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
            <div className="tap" onClick={() => setStatPopup("done")} style={{ flex: 1, background: "var(--card)", borderRadius: 16, padding: "16px 12px", border: "1px solid var(--border)", textAlign: "center", cursor: "pointer" }}>
              <div style={{ fontSize: 30, fontWeight: 700, color: "var(--t1)", letterSpacing: -1, lineHeight: 1 }}>{tasksDoneCount + restsDoneCount}</div>
              <div style={{ fontSize: 9, color: "var(--t5)", fontFamily: MONO, letterSpacing: 2, fontWeight: 600, marginTop: 6 }}>DONE</div>
            </div>
            <div className="tap" onClick={() => setStatPopup("tracked")} style={{ flex: 1, background: "var(--card)", borderRadius: 16, padding: "16px 12px", border: "1px solid var(--border)", textAlign: "center", cursor: "pointer" }}>
              <div style={{ fontSize: 30, fontWeight: 700, color: "var(--accent)", letterSpacing: -1, lineHeight: 1 }}>{(totalTracked / 60).toFixed(1)}</div>
              <div style={{ fontSize: 9, color: "var(--t5)", fontFamily: MONO, letterSpacing: 2, fontWeight: 600, marginTop: 6 }}>TRACKED</div>
            </div>
            <div className="tap" onClick={() => setStatPopup("energy")} style={{ flex: 1, background: "var(--card)", borderRadius: 16, padding: "16px 12px", border: "1px solid var(--border)", textAlign: "center", cursor: "pointer" }}>
              <div style={{ fontSize: 30, fontWeight: 700, color: ePct > 30 ? "var(--t1)" : ePct > 10 ? "var(--warn)" : "var(--danger)", letterSpacing: -1, lineHeight: 1 }}>{ePct}%</div>
              <div style={{ fontSize: 9, color: "var(--t5)", fontFamily: MONO, letterSpacing: 2, fontWeight: 600, marginTop: 6 }}>ENERGY</div>
            </div>
          </div>

          {/* ═══ SECTION B: Scrollable Date Strip ═══ */}
          <div style={{ marginBottom: 18, position: "relative" }}>
            <div
              ref={dateStripScrollRef}
              className="no-scrollbar"
              style={{ background: "var(--card)", borderRadius: 50, padding: 6, border: "1px solid var(--border)", display: "flex", gap: 4, overflowX: "auto", scrollSnapType: "x mandatory", WebkitOverflowScrolling: "touch" as any }}
            >
              {allDates.map(d => {
                const isT = isSameDay(d, today);
                const isSel = isSameDay(d, selectedDate);
                return (
                  <div key={d.getTime()} onClick={() => {
                    const now = Date.now();
                    if (now - lastDateTapRef.current < 300) {
                      const todayDate = new Date();
                      setSelectedDate(todayDate);
                      setViewMonth(todayDate.getMonth());
                      setViewYear(todayDate.getFullYear());
                      lastDateTapRef.current = 0;
                      return;
                    }
                    lastDateTapRef.current = now;
                    setSelectedDate(new Date(d));
                  }}
                    style={{ width: 56, height: 64, flexShrink: 0, borderRadius: 50, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", cursor: "pointer", background: isSel ? "#FFD000" : "transparent", transition: "background 0.2s", scrollSnapAlign: "center" }}>
                    <div style={{ fontSize: 18, fontWeight: 700, color: isSel ? "#0a0a0a" : "var(--t5)", lineHeight: 1.2 }}>{d.getDate()}</div>
                    <div style={{ fontSize: 10, fontWeight: 500, color: isSel ? "rgba(0,0,0,0.5)" : "var(--t5)", fontFamily: MONO }}>{DAYS[d.getDay()]}</div>
                    {isT && !isSel && <div style={{ width: 4, height: 4, borderRadius: "50%", marginTop: 2, background: "var(--accent)" }} />}
                  </div>
                );
              })}
            </div>
            {/* Month label below strip */}
            <div className="tap" onClick={() => setMonthPickerOpen(!monthPickerOpen)} style={{ textAlign: "center", marginTop: 8, cursor: "pointer" }}>
              <span style={{ fontSize: 10, color: "var(--t5)", fontFamily: MONO, letterSpacing: 1, fontWeight: 600 }}>{MONTHS_SHORT[viewMonth]} {viewYear} ▾</span>
            </div>
            {/* Month picker overlay — centered fixed modal */}
            {monthPickerOpen && (
              <div onClick={() => setMonthPickerOpen(false)} style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 100, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", animation: "monthFadeIn 0.2s ease" }}>
                <div ref={monthScrollRef} onClick={(e) => e.stopPropagation()} style={{ background: "var(--card)", border: "1px solid var(--border2)", borderRadius: 16, padding: 20, width: 280 }}>
                  {/* Year navigation */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, padding: "0 4px" }}>
                    <div className="tap" onClick={() => setViewYear(y => Math.max(2024, y - 1))} style={{ width: 32, height: 32, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", background: "var(--badge-bg)" }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--t3)" strokeWidth="2" strokeLinecap="round"><polyline points="15 18 9 12 15 6" /></svg>
                    </div>
                    <span style={{ fontSize: 16, fontWeight: 700, color: "var(--t1)", fontFamily: MONO }}>{viewYear}</span>
                    <div className="tap" onClick={() => setViewYear(y => Math.min(2030, y + 1))} style={{ width: 32, height: 32, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", background: "var(--badge-bg)" }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--t3)" strokeWidth="2" strokeLinecap="round"><polyline points="9 18 15 12 9 6" /></svg>
                    </div>
                  </div>
                  {/* Month grid — 4x3 */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8 }}>
                    {MONTHS_SHORT.map((m, i) => {
                      const isCur = i === today.getMonth() && viewYear === today.getFullYear();
                      const isSel = i === viewMonth;
                      return <div key={m} data-active={isSel ? "true" : "false"} className="tap" onClick={() => pickMonth(i)} style={{ padding: "10px 0", textAlign: "center", borderRadius: 50, fontSize: 11, fontFamily: MONO, fontWeight: 600, cursor: "pointer", background: isSel ? "#FFD000" : isCur ? "var(--accent-10)" : "var(--badge-bg)", color: isSel ? "#0a0a0a" : isCur ? "var(--accent)" : "var(--t4)", transition: "all 0.15s" }}>{m}</div>;
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ═══ FILTER BAR — single scrollable row, hidden scrollbar ═══ */}
          <div
            className="no-scrollbar"
            onClick={() => { if (deleteMode) setDeleteMode(false); }}
            style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "nowrap", marginBottom: 20, overflowX: "auto", WebkitUserSelect: "none", userSelect: "none" }}
          >
            {/* ALL button */}
            <div className="tap pill-no-select" onClick={() => { setFilterMode("all"); setActiveTab("today"); }} style={{
              padding: filterMode === "all" ? "8px 20px" : "8px 18px", borderRadius: 50, fontFamily: MONO, fontSize: 11,
              fontWeight: filterMode === "all" ? 700 : 500, letterSpacing: 1, cursor: "pointer", flexShrink: 0,
              background: filterMode === "all" ? "#FFD000" : "var(--card)",
              color: filterMode === "all" ? "#0a0a0a" : "var(--t4)",
              border: filterMode === "all" ? "none" : "1px solid var(--border)",
            }}>ALL</div>

            {/* Types (pill shape) */}
            {[...DEFAULT_TYPES, ...customTypes].map((t) => {
              const isActive = filterMode === `type:${t.id}`;
              const isCustom = !DEFAULT_TYPE_IDS.has(t.id);
              return (
                <div key={`type-${t.id}`} style={{ position: "relative", flexShrink: 0 }}>
                  <div className="tap pill-no-select"
                    onClick={(e) => {
                      e.stopPropagation();
                      setFilterMode(isActive ? "all" : `type:${t.id}`);
                      setActiveTab("today");
                    }}
                    onTouchStart={(e) => {
                      if (isCustom) {
                        e.preventDefault();
                        const timer = setTimeout(() => {
                          openPillEditor("type", t.id, t.label, t.color);
                        }, 500);
                        (e.currentTarget as any)._lpTimer = timer;
                      }
                    }}
                    onTouchEnd={(e) => { if (isCustom) clearTimeout((e.currentTarget as any)._lpTimer); }}
                    onTouchMove={(e) => { if (isCustom) clearTimeout((e.currentTarget as any)._lpTimer); }}
                    onMouseDown={() => {
                      if (isCustom) longPressTimer.current = setTimeout(() => openPillEditor("type", t.id, t.label, t.color), 500);
                    }}
                    onMouseUp={() => { if (longPressTimer.current) clearTimeout(longPressTimer.current); }}
                    onContextMenu={(e) => { if (isCustom) e.preventDefault(); }}
                    style={{
                      padding: isActive ? "8px 20px" : "8px 18px", borderRadius: 50, fontFamily: MONO, fontSize: 11,
                      fontWeight: isActive ? 700 : 500, cursor: "pointer", transition: "all 0.15s", flexShrink: 0,
                      background: isActive ? (isCustom ? t.color : "#FFD000") : "var(--card)",
                      color: isActive ? "#0a0a0a" : isCustom ? t.color : "var(--t4)",
                      border: isActive ? "none" : isCustom ? `1px solid ${t.color}4D` : "1px solid var(--border)",
                    }}
                  >{t.label}</div>
                </div>
              );
            })}

            {/* Tags (pill shape) */}
            {[...DEFAULT_TAGS, ...customTagDefs].map((t) => {
              const isActive = filterMode === `tag:${t.id}`;
              const isCustom = !DEFAULT_TAG_IDS.has(t.id);
              return (
                <div key={`tag-${t.id}`} style={{ position: "relative", flexShrink: 0 }}>
                  <div className="tap pill-no-select"
                    onClick={(e) => {
                      e.stopPropagation();
                      setFilterMode(isActive ? "all" : `tag:${t.id}`);
                      setActiveTab("today");
                    }}
                    onTouchStart={(e) => {
                      if (isCustom) {
                        e.preventDefault();
                        const timer = setTimeout(() => {
                          openPillEditor("tag", t.id, t.label, t.color);
                        }, 500);
                        (e.currentTarget as any)._lpTimer = timer;
                      }
                    }}
                    onTouchEnd={(e) => { if (isCustom) clearTimeout((e.currentTarget as any)._lpTimer); }}
                    onTouchMove={(e) => { if (isCustom) clearTimeout((e.currentTarget as any)._lpTimer); }}
                    onMouseDown={() => {
                      if (isCustom) longPressTimer.current = setTimeout(() => openPillEditor("tag", t.id, t.label, t.color), 500);
                    }}
                    onMouseUp={() => { if (longPressTimer.current) clearTimeout(longPressTimer.current); }}
                    onContextMenu={(e) => { if (isCustom) e.preventDefault(); }}
                    style={{
                      padding: isActive ? "8px 20px" : "8px 18px", borderRadius: 50, fontFamily: MONO, fontSize: 11,
                      fontWeight: isActive ? 700 : 500, cursor: "pointer", transition: "all 0.15s", flexShrink: 0,
                      background: isActive ? (isCustom ? t.color : "#FFD000") : "var(--card)",
                      color: isActive ? "#0a0a0a" : isCustom ? t.color : "var(--t4)",
                      border: isActive ? "none" : isCustom ? `1px solid ${t.color}4D` : "1px solid var(--border)",
                    }}
                  >{t.label}</div>
                </div>
              );
            })}
          </div>

          {/* ── TODAY TAB CONTENT ── */}
          {activeTab === "today" && (
            <>

              {/* Apply filter */}
              {(() => {
                let filteredPending = pendingTasks;
                if (filterMode !== "all") {
                  if (filterMode.startsWith("type:")) {
                    const typeId = filterMode.split(":")[1];
                    filteredPending = pendingTasks.filter(t =>
                      (t as any).customType === typeId || (typeId === "task" && t.type === "work") || (typeId === "rest" && t.type === "rest")
                    );
                  } else if (filterMode.startsWith("tag:")) {
                    const tagId = filterMode.split(":")[1];
                    filteredPending = pendingTasks.filter(t =>
                      (t as any).tags && (t as any).tags.includes(tagId)
                    );
                  }
                }
                // Now use filteredPending instead of pendingTasks in the timeline below
                return null;
              })()}

              {/* ── Timeline ── */}
              <div style={{ marginBottom: 16 }}>
                {(() => {
                  const collabAsTasks = MOCK_COLLAB_TASKS.map(ct => ({
                    ...ct, timeMin: parseInt(ct.time.split(":")[0]) * 60 + parseInt(ct.time.split(":")[1] || "0"),
                    isCollab: true, friendName: ct.friend,
                  }));
                  const now2 = nowMinutes();
                  const allPending: any[] = [...pendingTasks.map(t => ({ ...t, isCollab: false, friendName: "" })), ...collabAsTasks]
                    .sort((a: any, b: any) => {
                      const aTime = a.adjustedTimeMin ?? a.timeMin;
                      const bTime = b.adjustedTimeMin ?? b.timeMin;
                      const aActive = a.status === "active" ? 0 : 1;
                      const bActive = b.status === "active" ? 0 : 1;
                      if (aActive !== bActive) return aActive - bActive;
                      const aUpcoming = (a.status === "pending" && !a.isCollab && aTime - now2 <= 5 && aTime - now2 > 0) ? 0 : 1;
                      const bUpcoming = (b.status === "pending" && !b.isCollab && bTime - now2 <= 5 && bTime - now2 > 0) ? 0 : 1;
                      if (aUpcoming !== bUpcoming) return aUpcoming - bUpcoming;
                      return aTime - bTime;
                    });

                  const priorityTasks = allPending.filter((t: any) => {
                    const tTime = t.adjustedTimeMin ?? t.timeMin;
                    return t.status === "active" || (t.status === "pending" && !t.isCollab && tTime - now2 <= 5 && tTime - now2 > 0);
                  });
                  const restTasks = allPending.filter(t => !priorityTasks.includes(t));

                  const renderTask = (task: any, i: number) => {
                    // Collab tasks — same pill style as pending, COLLAB badge + avatar
                    if ((task as any).isCollab) {
                      const ct = task as any;
                      return (
                        <div key={ct.id} style={{ marginBottom: 8, animation: `fadeUp 0.3s ease ${i * 0.04}s both` }}>
                          <div style={{ background: "var(--card)", borderRadius: ct.name.length > 35 ? 28 : 50, border: "1px solid var(--border)", padding: "18px 22px", display: "flex", alignItems: "center", minHeight: 72, overflow: "hidden" }}>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                                <span style={{ fontSize: 8, color: "#c8a000", background: "rgba(255,208,0,0.1)", padding: "2px 6px", borderRadius: 50, fontFamily: MONO, fontWeight: 700, letterSpacing: 1 }}>COLLAB</span>
                                <div style={{ fontSize: 10, color: "var(--t5)", fontFamily: MONO, fontWeight: 500 }}>{ct.time} — {fmtTime(Math.floor((ct.timeMin + ct.duration) / 60) % 24, (ct.timeMin + ct.duration) % 60)}</div>
                              </div>
                              <div style={{ fontSize: 16, color: "var(--t2)", fontWeight: 600, fontFamily: DISPLAY, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as const, overflow: "hidden", lineHeight: 1.3, wordBreak: "break-word" }}>{ct.name}</div>
                              <div style={{ display: "flex", gap: 5, marginTop: 6 }}>
                                <span style={{ fontSize: 9, color: "var(--badge-text)", background: "var(--badge-bg)", padding: "3px 10px", borderRadius: 50, fontFamily: MONO, fontWeight: 500 }}>w/ {ct.friendName}</span>
                                <span style={{ fontSize: 9, color: "var(--badge-text)", background: "var(--badge-bg)", padding: "3px 10px", borderRadius: 50, fontFamily: MONO, fontWeight: 500 }}>{fmtDur(ct.duration)}</span>
                              </div>
                            </div>
                            {/* Friend avatar */}
                            <div style={{ width: 36, height: 36, borderRadius: "50%", background: "rgba(255,208,0,0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: "#c8a000", flexShrink: 0, marginLeft: 12 }}>{ct.friendName?.[0] || "?"}</div>
                          </div>
                        </div>
                      );
                    }

                    // Self tasks with v13 pill styling
                    const displayTime = getDisplayTime(task);
                    const endTime = fmtTime(
                      Math.floor((getDisplayTimeMin(task) + task.duration) / 60) % 24,
                      (getDisplayTimeMin(task) + task.duration) % 60
                    );
                    const isActive = task.status === "active";
                    const isExpanded = expandedTask === task.id;
                    const tTime = task.adjustedTimeMin ?? task.timeMin;
                    const now2 = nowMinutes();
                    const isUpcomingSoon = task.status === "pending" && tTime - now2 <= 5 && tTime - now2 > 0;

                    // ── Active task card (yellow pill) ──
                    if (isActive) {
                      return (
                        <div key={task.id} style={{ marginBottom: 8, animation: `fadeUp 0.3s ease ${i * 0.04}s both` }}>
                          <div
                            className="tap"
                            onClick={() => setExpandedTask(isExpanded ? null : task.id)}
                            style={{
                              background: "#FFD000",
                              borderRadius: isExpanded ? 24 : 50,
                              padding: "24px 28px",
                              cursor: "pointer",
                              transition: "border-radius 0.2s",
                              overflow: "hidden",
                            }}
                          >
                            {/* Row 1: status */}
                            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
                              <div className="anim-pulse" style={{ width: 6, height: 6, borderRadius: "50%", background: "#0a0a0a" }} />
                              <span style={{ fontSize: 9, color: "rgba(0,0,0,0.4)", fontFamily: MONO, fontWeight: 700, letterSpacing: 1 }}>ACTIVE</span>
                              <span style={{ fontSize: 9, color: "rgba(0,0,0,0.25)", fontFamily: MONO, fontWeight: 500 }}>{displayTime} — {endTime}</span>
                            </div>
                            {/* Row 2: name + timer */}
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                              <div style={{ fontSize: 19, fontWeight: 700, color: "#0a0a0a", fontFamily: DISPLAY, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as const, overflow: "hidden", lineHeight: 1.3, flex: 1, minWidth: 0, wordBreak: "break-word" }}>{task.name}</div>
                              <div style={{ fontSize: 24, fontWeight: 700, color: "#0a0a0a", fontFamily: MONO, fontVariantNumeric: "tabular-nums", flexShrink: 0, marginLeft: 12 }}>{activeTimerStr}</div>
                            </div>
                            {/* Row 3: action buttons */}
                            <div style={{ display: "flex", gap: 6 }}>
                              <div className="tap" onClick={(e) => { e.stopPropagation(); stopAndComplete(); }} style={{ flex: 1, padding: "10px 0", borderRadius: 50, background: "#0a0a0a", textAlign: "center", fontSize: 11, fontWeight: 700, color: "#FFD000", fontFamily: MONO, cursor: "pointer" }}>Done</div>
                              <div className="tap" onClick={(e) => { e.stopPropagation(); pauseTask(); }} style={{ flex: 1, padding: "10px 0", borderRadius: 50, background: "rgba(0,0,0,0.1)", textAlign: "center", fontSize: 11, fontWeight: 600, color: "rgba(0,0,0,0.45)", fontFamily: MONO, cursor: "pointer" }}>Pause</div>
                              <div className="tap" onClick={(e) => { e.stopPropagation(); skipTask(); }} style={{ flex: 1, padding: "10px 0", borderRadius: 50, background: "rgba(0,0,0,0.1)", textAlign: "center", fontSize: 11, fontWeight: 600, color: "rgba(0,0,0,0.45)", fontFamily: MONO, cursor: "pointer" }}>Skip</div>
                            </div>
                            {/* Expanded content */}
                            {isExpanded && (
                              <div style={{ marginTop: 12, animation: "fadeUp 0.15s ease" }}>
                                {task.desc && <div style={{ fontSize: 13, color: "rgba(0,0,0,0.5)", lineHeight: 1.5, fontFamily: BODY, marginBottom: 12, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical" as const, wordBreak: "break-word", maxHeight: "4.5em" }}>{task.desc}</div>}
                                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                                  <div className="tap" onClick={(e) => { e.stopPropagation(); openEditModal(task); }} style={{ padding: "7px 14px", borderRadius: 50, background: "rgba(0,0,0,0.1)", fontSize: 11, fontWeight: 600, color: "rgba(0,0,0,0.45)", fontFamily: MONO, cursor: "pointer" }}>Edit</div>
                                  <div className="tap" onClick={(e) => { e.stopPropagation(); switchTask(); }} style={{ padding: "7px 14px", borderRadius: 50, background: "rgba(0,0,0,0.1)", fontSize: 11, fontWeight: 600, color: "rgba(0,0,0,0.45)", fontFamily: MONO, cursor: "pointer" }}>Switch</div>
                                  <div className="tap" onClick={(e) => { e.stopPropagation(); toggleUrgent(task); }} style={{ padding: "7px 14px", borderRadius: 50, background: task.urgent ? "rgba(226,75,74,0.15)" : "rgba(0,0,0,0.1)", fontSize: 11, fontWeight: 600, color: task.urgent ? "#E24B4A" : "rgba(0,0,0,0.45)", fontFamily: MONO, cursor: "pointer" }}>{task.urgent ? "! Urgent" : "Urgent"}</div>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    }

                    // ── Pending task card (pill or expanded) ──
                    return (
                      <div key={task.id} style={{ marginBottom: 8, animation: `fadeUp 0.3s ease ${i * 0.04}s both` }}>
                        <div style={{
                          background: task.urgent ? "var(--danger-fill)" : "var(--card)",
                          borderRadius: isExpanded ? 16 : (task.name.length > 35 ? 28 : 50),
                          border: `1px solid ${isExpanded ? "var(--border2)" : task.urgent ? "transparent" : "var(--border)"}`,
                          transition: "border-radius 0.2s",
                          minHeight: 72,
                          overflow: "hidden",
                        }}>
                          <div style={{ display: "flex", alignItems: "center" }}>
                            <div className="tap" onClick={() => setExpandedTask(isExpanded ? null : task.id)} style={{ flex: 1, minWidth: 0, overflow: "hidden", padding: isExpanded ? "18px 0 14px 20px" : "18px 0 18px 22px" }}>
                              {/* Upcoming badge */}
                              {isUpcomingSoon && (
                                <div style={{ marginBottom: 6 }}>
                                  <span style={{ fontSize: 8, color: "var(--accent)", background: "var(--accent-10)", padding: "2px 6px", borderRadius: 50, fontFamily: MONO, fontWeight: 700, letterSpacing: 1 }}>IN {Math.max(1, Math.round(tTime - now2))} MIN</span>
                                </div>
                              )}
                              {/* Urgent badge (non-active) */}
                              {task.urgent && (
                                <div style={{ marginBottom: 6 }}>
                                  <span style={{ fontSize: 8, color: "var(--fill-sub)", fontFamily: MONO, fontWeight: 700, letterSpacing: 1 }}>! URGENT</span>
                                </div>
                              )}
                              {/* Timestamp */}
                              <div style={{ fontSize: 10, color: task.urgent ? "var(--fill-sub)" : "var(--t5)", fontFamily: MONO, fontWeight: 500, marginBottom: 4, minHeight: 14 }}>{displayTime} — {endTime}</div>
                              {/* Task name */}
                              <div style={{ fontSize: 16, color: task.urgent ? "var(--fill-title)" : "var(--t2)", fontWeight: 600, fontFamily: DISPLAY, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as const, overflow: "hidden", lineHeight: 1.3, wordBreak: "break-word" }}>{task.name}</div>
                              {/* Badges */}
                              <div style={{ display: "flex", gap: 5, marginTop: 8, flexWrap: "wrap" }}>
                                <span style={{ fontSize: 9, color: task.urgent ? "var(--fill-sub)" : "var(--play-icon)", background: task.urgent ? "rgba(255,255,255,0.12)" : "var(--badge-bg)", padding: "3px 10px", borderRadius: 50, fontFamily: MONO, fontWeight: 500 }}>{(task.customType || task.type).toUpperCase()}</span>
                                <span style={{ fontSize: 9, color: task.urgent ? "var(--fill-sub)" : "var(--play-icon)", background: task.urgent ? "rgba(255,255,255,0.12)" : "var(--badge-bg)", padding: "3px 10px", borderRadius: 50, fontFamily: MONO, fontWeight: 500 }}>{fmtDur(task.duration)}</span>
                                {task.tags && task.tags.map((tagId: string) => {
                                  const tagDef = [...DEFAULT_TAGS, ...customTagDefs].find((t) => t.id === tagId);
                                  if (!tagDef) return null;
                                  return <span key={tagId} style={{ fontSize: 9, color: task.urgent ? "var(--fill-sub)" : tagDef.color, background: task.urgent ? "rgba(255,255,255,0.12)" : `${tagDef.color}15`, padding: "3px 10px", borderRadius: 50, fontFamily: MONO, fontWeight: 500 }}>{tagDef.label}</span>;
                                })}
                              </div>
                            </div>
                            {/* Right side: play button or chevron */}
                            {isExpanded ? (
                              <div style={{ margin: "0 18px", padding: 8 }}>
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--play-icon)" strokeWidth="2" strokeLinecap="round"><polyline points="18 15 12 9 6 15" /></svg>
                              </div>
                            ) : (
                              <div className="tap" onClick={() => startTask(task)} style={{ margin: "0 14px" }}>
                                <div style={{ width: 40, height: 40, borderRadius: "50%", border: "2px solid var(--play-border)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                  <PlayIcon size={14} color="var(--play-icon)" />
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Expanded detail panel */}
                          {isExpanded && (
                            <div style={{ padding: "0 20px 16px", animation: "fadeUp 0.15s ease" }}>
                              {/* Description */}
                              {task.desc && <div style={{ fontSize: 12, color: "var(--t3)", lineHeight: 1.5, fontFamily: BODY, marginBottom: 12, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical" as const, wordBreak: "break-word", maxHeight: "4.5em" }}>{task.desc}</div>}
                              {/* Action pills */}
                              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                                <div className="tap" onClick={() => markDone(task)} style={{ padding: "7px 14px", borderRadius: 50, background: "#FFD000", fontSize: 11, fontWeight: 700, color: "#0a0a0a", fontFamily: MONO, cursor: "pointer" }}>Done</div>
                                <div className="tap" onClick={() => openEditModal(task)} style={{ padding: "7px 14px", borderRadius: 50, background: "var(--badge-bg)", fontSize: 11, fontWeight: 600, color: "var(--badge-text)", fontFamily: MONO, cursor: "pointer" }}>Edit</div>
                                <div className="tap" onClick={() => skipPendingTask(task)} style={{ padding: "7px 14px", borderRadius: 50, background: "var(--badge-bg)", fontSize: 11, fontWeight: 600, color: "var(--badge-text)", fontFamily: MONO, cursor: "pointer" }}>Skip</div>
                                <div className="tap" onClick={() => toggleUrgent(task)} style={{ padding: "7px 14px", borderRadius: 50, background: "var(--badge-bg)", fontSize: 11, fontWeight: 600, color: task.urgent ? "var(--danger)" : "var(--badge-text)", fontFamily: MONO, cursor: "pointer" }}>{task.urgent ? "! Urgent" : "Urgent"}</div>
                                <div className="tap" onClick={() => toggleRest(task)} style={{ padding: "7px 14px", borderRadius: 50, background: "var(--badge-bg)", fontSize: 11, fontWeight: 600, color: "var(--badge-text)", fontFamily: MONO, cursor: "pointer" }}>{task.type === "rest" ? "→ Task" : "→ Rest"}</div>
                                <div className="tap" onClick={() => { if (confirm(`Delete "${task.name}"?`)) deleteTask(task); }} style={{ padding: "7px 14px", borderRadius: 50, background: "rgba(200,50,50,0.08)", fontSize: 11, fontWeight: 600, color: "#844", fontFamily: MONO, cursor: "pointer" }}>Delete</div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  };

                  return (
                    <>
                      {priorityTasks.map((t, i) => renderTask(t, i))}
                      {/* Friend status — between priority and rest */}
                      <div style={{ marginTop: 8, marginBottom: 8 }}>
                        <FriendStack friends={[
                          { id: "f1", name: "Amir", initial: "A", activity: "studying C", state: "working" },
                          { id: "f2", name: "Siti", initial: "S", activity: "doing exercises", state: "working" },
                          { id: "f3", name: "Mei Ling", initial: "M", activity: "resting", state: "resting" },
                        ]} />
                      </div>
                      {restTasks.map((t, i) => renderTask(t, priorityTasks.length + i))}
                    </>
                  );
                })()}
              </div>

              {/* ── Inline suggestions (shown when typing in switch input) ── */}
              {showSuggestions && suggestions.length > 0 && cmdInput.length >= 2 && (
                <div style={{ marginBottom: 16, background: "var(--card)", borderRadius: 12, border: "1px solid var(--border)", overflow: "hidden" }}>
                  {suggestions.map((s: any, si: number) => (
                    <div key={si} className="tap" onClick={() => pickSuggestion(s)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", borderBottom: si < suggestions.length - 1 ? "1px solid var(--border)" : "none", cursor: "pointer" }}>
                      <div style={{ fontSize: 13, color: "var(--t2)", fontFamily: BODY }}>{s.name}</div>
                      <span style={{ fontSize: 9, color: s.source === "you" ? "var(--accent)" : "var(--t4)", background: s.source === "you" ? "var(--accent-10)" : "rgba(255,255,255,0.05)", padding: "2px 6px", borderRadius: 4, fontFamily: MONO, fontWeight: 600 }}>{(s.source || "").toUpperCase()}</span>
                    </div>
                  ))}
                </div>
              )}
              {/* ── Done tasks (collapsible) ── */}
              {doneTasks.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <div className="tap" onClick={() => setShowDone(!showDone)} style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 4px", cursor: "pointer" }}>
                    <span style={{ fontSize: 11, fontWeight: 600, color: "var(--t6)", letterSpacing: 1, fontFamily: MONO }}>COMPLETED</span>
                    <span style={{ fontSize: 10, color: "var(--t5)", background: "var(--border)", padding: "2px 8px", borderRadius: 50, fontFamily: MONO, fontWeight: 600 }}>{doneTasks.length}</span>
                    <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--t6)" strokeWidth="2" strokeLinecap="round" style={{ transform: showDone ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}><polyline points="6 9 12 15 18 9" /></svg>
                  </div>
                  {showDone && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8, animation: "fadeUp 0.2s ease" }}>
                      {doneTasks.map((task) => {
                        const displayTime = getDisplayTime(task);
                        const endTime = fmtTime(Math.floor((getDisplayTimeMin(task) + (task.actual_duration || task.duration)) / 60) % 24, (getDisplayTimeMin(task) + (task.actual_duration || task.duration)) % 60);
                        return (
                          <div key={task.id} className="tap" onClick={() => markUndone(task)} style={{ background: "var(--card)", borderRadius: task.name.length > 35 ? 28 : 50, padding: "18px 22px", border: "1px solid var(--border)", opacity: 0.5, display: "flex", alignItems: "center", gap: 12, cursor: "pointer", minHeight: 52, overflow: "hidden" }}>
                            <div style={{ flex: 1, minWidth: 0, overflow: "hidden" }}>
                              <div style={{ fontSize: 13, color: "var(--t5)", textDecoration: "line-through", fontFamily: BODY, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as const, overflow: "hidden", lineHeight: 1.3, wordBreak: "break-word" }}>{task.name}</div>
                              <div style={{ fontSize: 10, color: "var(--t5)", fontFamily: MONO, marginTop: 2, fontWeight: 500 }}>{displayTime} — {endTime}{task.actual_duration ? ` · ${fmtDur(task.actual_duration)} actual` : ""}</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* ── Skipped tasks (collapsible) ── */}
              {skippedTasks.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <div className="tap" onClick={() => setShowSkipped(!showSkipped)} style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 4px", cursor: "pointer" }}>
                    <span style={{ fontSize: 11, fontWeight: 600, color: "var(--t6)", letterSpacing: 1, fontFamily: MONO }}>SKIPPED</span>
                    <span style={{ fontSize: 10, color: "var(--t5)", background: "var(--border)", padding: "2px 8px", borderRadius: 50, fontFamily: MONO, fontWeight: 600 }}>{skippedTasks.length}</span>
                    <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--t6)" strokeWidth="2" strokeLinecap="round" style={{ transform: showSkipped ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}><polyline points="6 9 12 15 18 9" /></svg>
                  </div>
                  {showSkipped && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8, animation: "fadeUp 0.2s ease" }}>
                      {skippedTasks.map((task) => {
                        const displayTime = getDisplayTime(task);
                        return (
                          <div key={task.id} style={{ background: "var(--card)", borderRadius: task.name.length > 35 ? 28 : 50, padding: "18px 22px", border: "1px solid var(--border)", opacity: 0.5, display: "flex", alignItems: "center", gap: 12, minHeight: 52, overflow: "hidden" }}>
                            <div style={{ flex: 1, minWidth: 0, overflow: "hidden" }}>
                              <div style={{ fontSize: 13, color: "var(--t5)", textDecoration: "line-through", fontFamily: BODY, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as const, overflow: "hidden", lineHeight: 1.3, wordBreak: "break-word" }}>{task.name}</div>
                              <div style={{ fontSize: 10, color: "var(--t5)", fontFamily: MONO, marginTop: 2, fontWeight: 500 }}>{displayTime} · skipped{task.actual_duration ? ` · ${fmtDur(task.actual_duration)} partial` : ""}</div>
                            </div>
                            <div className="tap" onClick={() => { const u = tasks.map((t) => t.id === task.id ? { ...t, status: "pending" as const, skippedAt: null } : t); setTasks(u); save(u, dayLog, energyUsed, energyCharged, activeTask, customGroups, pausedTask, switchingFrom); }} style={{ padding: "5px 12px", borderRadius: 50, background: "var(--warn-10)", fontSize: 10, fontWeight: 600, fontFamily: MONO, color: "var(--warn)", cursor: "pointer", flexShrink: 0 }}>REDO</div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ── OTHER TABS (imported components) ── */}
      {bottomTab === "community" && <CommunityTab />}
      {bottomTab === "friends" && <FriendsTab onNavigate={handleFriendsNav} />}
      {bottomTab === "profile" && (
        <ProfileTab
          userId={userId} theme={"dark" as Theme} setTheme={() => {}}
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
            <div className="tap" onClick={saveEdit} style={{ background: "var(--accent)", borderRadius: 14, padding: "14px", textAlign: "center", fontSize: 14, fontWeight: 700, color: "#0a0a0a", fontFamily: DISPLAY }}>Save changes</div>
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
              <div className="tap" onClick={addSwitchTask} style={{ background: "var(--pink)", borderRadius: 12, padding: "12px 16px", fontSize: 11, fontWeight: 700, color: "var(--t1)", fontFamily: MONO, cursor: "pointer" }}>GO</div>
            </div>
          </div>
        </div>
      )}

      {/* ── EDIT PILL POPUP ── */}
      {editingPill && (
        <div onClick={() => setEditingPill(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 16, padding: 20, width: 280, maxWidth: "90vw" }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: "var(--t1)", fontFamily: DISPLAY, marginBottom: 16 }}>Edit {editingPill.kind}</div>
            <input
              value={editPillName}
              onChange={(e) => setEditPillName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") savePillEdit(); if (e.key === "Escape") setEditingPill(null); }}
              maxLength={20}
              autoFocus
              style={{ width: "100%", background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 12, padding: "10px 14px", color: "var(--t1)", fontSize: 14, fontFamily: MONO, outline: "none", textTransform: "uppercase", letterSpacing: 1, boxSizing: "border-box", marginBottom: 16 }}
            />
            <div style={{ fontSize: 11, color: "var(--t4)", fontFamily: MONO, letterSpacing: 1, marginBottom: 8 }}>COLOR</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
              {PILL_COLORS.map((c) => (
                <div
                  key={c}
                  className="tap"
                  onClick={() => setEditPillColor(c)}
                  style={{
                    width: 32, height: 32, borderRadius: "50%", cursor: "pointer",
                    background: c,
                    border: editPillColor === c ? "2px solid var(--accent)" : "2px solid transparent",
                    transition: "border 0.2s",
                  }}
                />
              ))}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <div className="tap" onClick={savePillEdit} style={{ flex: 1, background: "var(--accent)", color: "#0a0a0a", borderRadius: 50, padding: 10, fontWeight: 700, fontSize: 13, fontFamily: MONO, textAlign: "center", cursor: "pointer" }}>Save</div>
              <div className="tap" onClick={deletePillFromEditor} style={{ background: "var(--danger-dim)", color: "var(--danger)", borderRadius: 50, padding: "10px 16px", fontSize: 13, fontWeight: 600, fontFamily: MONO, textAlign: "center", cursor: "pointer" }}>Delete</div>
            </div>
          </div>
        </div>
      )}

      <CreateTaskSheet
        open={showCreateSheet}
        onClose={() => setShowCreateSheet(false)}
        onCreateTask={handleSheetCreate}
        customTypes={customTypes}
        onAddType={addCustomType}
        onDeleteType={deleteCustomType}
        customTags={customTagDefs}
        onAddTag={addCustomTag}
        onDeleteTag={deleteCustomTag}
        suggestions={suggestions}
        onInputChange={(q) => fetchSuggestions(q)}
      />

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
      {/* ── STAT POPUPS ── */}
      {statPopup && (() => {
        const pS = {
          sectionTitle: { fontSize: 10, letterSpacing: 1, color: "var(--t4)", fontFamily: MONO, marginBottom: 8, marginTop: 4 } as React.CSSProperties,
          divider: { height: 1, background: "var(--border)", margin: "14px 0" } as React.CSSProperties,
          row: { display: "flex" as const, justifyContent: "space-between" as const, alignItems: "center" as const, padding: "6px 0" } as React.CSSProperties,
          rowLabel: { fontSize: 12, color: "var(--t3)" } as React.CSSProperties,
          rowVal: { fontSize: 13, color: "var(--t2)", fontWeight: 600, fontFamily: MONO } as React.CSSProperties,
        };

        const doneCount = tasksDoneCount + restsDoneCount;
        const totalTaskCount = tasks.length;
        const completionPct = totalTaskCount > 0 ? Math.round((doneCount / totalTaskCount) * 100) : 0;
        const pendingCount = pendingTasks.length;

        // Week streak data
        const weekDayInits = ["M", "T", "W", "T", "F", "S", "S"];
        const todayDow = new Date().getDay();
        const mondayOffset = todayDow === 0 ? 6 : todayDow - 1;
        const weekStart = new Date(); weekStart.setDate(weekStart.getDate() - mondayOffset); weekStart.setHours(0,0,0,0);
        const weekDays = Array.from({ length: 7 }, (_, i) => {
          const d = new Date(weekStart); d.setDate(d.getDate() + i);
          const dk = dateKey(d);
          const isToday = isSameDay(d, new Date());
          const isFuture = d > new Date();
          const hadActivity = isToday ? doneCount > 0 : !!(history[dk]?.done && history[dk].done > 0);
          return { init: weekDayInits[i], isToday, isFuture, hadActivity };
        });

        // Streak calculation from history
        const calcStreak = () => {
          let s = doneCount > 0 ? 1 : 0;
          if (s === 0) return 0;
          const check = new Date(); check.setHours(0,0,0,0);
          for (let i = 1; i < 365; i++) {
            check.setDate(check.getDate() - 1);
            const dk = dateKey(check);
            if (history[dk]?.done && history[dk].done > 0) s++;
            else break;
          }
          return s;
        };
        const currentStreak = calcStreak();

        // Monthly done count
        const now = new Date();
        const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
        let monthDone = doneCount; // today
        Object.entries(history).forEach(([k, v]) => { if (k.startsWith(monthKey)) monthDone += v.done; });

        // Best streak from history
        // TODO: implement proper best streak tracking with historical data
        const bestStreak = Math.max(currentStreak, streak);

        // Tracked by type
        const allTypesList2 = [...DEFAULT_TYPES, ...customTypes];
        const allTagsList2 = [...DEFAULT_TAGS, ...customTagDefs];
        const typeTimeMap: Record<string, number> = {};
        const tagTimeMap: Record<string, number> = {};

        doneTasks.forEach(t => {
          const dur = t.actual_duration ?? t.duration;
          const typeId = t.customType || (t.type === "work" ? "task" : t.type === "rest" ? "rest" : "task");
          typeTimeMap[typeId] = (typeTimeMap[typeId] || 0) + dur;
          if (t.tags) t.tags.forEach(tag => { tagTimeMap[tag] = (tagTimeMap[tag] || 0) + dur; });
        });
        // Also include active task elapsed
        if (activeTask) {
          const aDur = Math.floor((Date.now() - activeTask.startedAt) / 60000);
          const aTypeId = (activeTask as any).customType || (activeTask.type === "work" ? "task" : activeTask.type === "rest" ? "rest" : "task");
          typeTimeMap[aTypeId] = (typeTimeMap[aTypeId] || 0) + aDur;
          if (activeTask.tags) activeTask.tags.forEach(tag => { tagTimeMap[tag] = (tagTimeMap[tag] || 0) + aDur; });
        }

        const maxTypeTime = Math.max(1, ...Object.values(typeTimeMap));
        const maxTagTime = Math.max(1, ...Object.values(tagTimeMap));

        const typeColor = (id: string) => {
          if (id === "task") return "var(--accent)";
          if (id === "rest") return "var(--rest)";
          if (id === "life") return "#a78bfa";
          const ct = allTypesList2.find(x => x.id === id);
          return ct?.color || "var(--t4)";
        };

        // Weekly/monthly tracked hours
        let weekTrackedMin = totalTracked;
        let monthTrackedMin = totalTracked;
        Object.entries(history).forEach(([k, v]) => {
          const d = new Date(k);
          if (k.startsWith(monthKey)) monthTrackedMin += v.totalMin;
          const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
          if (diffDays >= 0 && diffDays < 7) weekTrackedMin += v.totalMin;
        });
        const daysThisMonth = now.getDate();
        const dailyAvgMin = daysThisMonth > 0 ? monthTrackedMin / daysThisMonth : 0;

        // Energy ring value
        const energyVal = ePct;

        // Energy drain/restore explanation (from actual drain rate system)
        // Energy system: drain = idleMins * idle_rate + workMins * work_rate + urgentMins * urgent_rate
        // Recharge = restMins * rest_rate
        // Rates: idle=0.5, work=1.0, urgent=1.5, rest=0.3 (per minute, in energy-minutes)
        // Energy is NOT event-based (no "+X per task"), it's continuous drain/recharge over time
        const restoredToday = Math.round((totalRecharge / eTotal) * 100);

        return (
          <div
            onClick={() => setStatPopup(null)}
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 200, display: "flex", alignItems: "flex-start", justifyContent: "center", paddingTop: 60, overflowY: "auto" }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 16, padding: 20, width: 320, maxWidth: "90vw", position: "relative", marginBottom: 40, animation: "popupIn 0.2s ease" }}
            >
              {/* Close button */}
              <div onClick={() => setStatPopup(null)} style={{ position: "absolute", top: 12, right: 12, width: 28, height: 28, borderRadius: "50%", background: "var(--badge-bg, #222)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                <span style={{ fontSize: 14, color: "var(--t4)", lineHeight: 1 }}>✕</span>
              </div>

              {/* ═══ DONE POPUP ═══ */}
              {statPopup === "done" && (
                <div>
                  <div style={{ fontSize: 11, letterSpacing: 2, color: "var(--t4)", fontFamily: MONO, marginBottom: 12 }}>COMPLETED TODAY</div>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                    <span style={{ fontSize: 36, fontWeight: 700, color: "var(--t1)", fontFamily: MONO }}>{doneCount}</span>
                    <span style={{ fontSize: 13, color: "var(--t4)" }}>/ {totalTaskCount} tasks</span>
                  </div>
                  <div style={{ fontSize: 11, color: "var(--t5)", fontFamily: MONO, marginTop: 2 }}>{completionPct}% completion rate</div>

                  <div style={pS.divider} />

                  <div style={pS.sectionTitle}>TODAY&apos;S DONE</div>
                  {doneTasks.length === 0 ? (
                    <div style={{ fontSize: 12, color: "var(--t5)", padding: "8px 0" }}>No tasks completed yet</div>
                  ) : (
                    doneTasks.map(t => (
                      <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 0", borderBottom: "1px solid var(--border)" }}>
                        <div style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--accent)", flexShrink: 0 }} />
                        <div style={{ fontSize: 12, color: "var(--t2)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.name}</div>
                        <div style={{ fontSize: 10, color: "var(--t5)", fontFamily: MONO, flexShrink: 0 }}>{fmtDur(t.actual_duration ?? t.duration)}</div>
                      </div>
                    ))
                  )}
                  {pendingCount > 0 && (
                    <div style={{ opacity: 0.3, fontSize: 11, color: "var(--t5)", padding: "7px 0" }}>{pendingCount} remaining...</div>
                  )}

                  <div style={pS.divider} />

                  <div style={pS.sectionTitle}>THIS WEEK</div>
                  <div style={{ display: "flex", gap: 3 }}>
                    {weekDays.map((d, i) => (
                      <div key={i} style={{
                        width: 24, height: 24, borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 8, fontFamily: MONO, fontWeight: 600,
                        background: d.hadActivity ? (d.isToday ? "rgba(255,208,0,0.3)" : "rgba(255,208,0,0.15)") : "var(--badge-bg, #1e1e1e)",
                        color: d.hadActivity ? "var(--accent)" : "var(--t5)",
                        border: d.isToday && d.hadActivity ? "1px solid rgba(255,208,0,0.4)" : "none",
                      }}>{d.init}</div>
                    ))}
                  </div>
                  <div style={{ fontSize: 10, color: "var(--t5)", fontFamily: MONO, marginTop: 6 }}>{currentStreak} day streak</div>

                  <div style={pS.divider} />

                  <div style={pS.row}><span style={pS.rowLabel}>Best streak</span><span style={pS.rowVal}>{bestStreak > 0 ? `${bestStreak} days` : "\u2014"}</span></div>
                  <div style={pS.row}><span style={pS.rowLabel}>This month</span><span style={pS.rowVal}>{monthDone} done</span></div>
                </div>
              )}

              {/* ═══ TRACKED POPUP ═══ */}
              {statPopup === "tracked" && (
                <div>
                  <div style={{ fontSize: 11, letterSpacing: 2, color: "var(--t4)", fontFamily: MONO, marginBottom: 12 }}>TIME TRACKED</div>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                    <span style={{ fontSize: 36, fontWeight: 700, color: "var(--accent)", fontFamily: MONO }}>{(totalTracked / 60).toFixed(1)}</span>
                    <span style={{ fontSize: 13, color: "var(--t4)" }}>hrs today</span>
                  </div>
                  <div style={{ fontSize: 11, color: "var(--t5)", fontFamily: MONO, marginTop: 2 }}>{totalTracked} min of focused work</div>

                  <div style={pS.divider} />

                  <div style={pS.sectionTitle}>BY TYPE</div>
                  {allTypesList2.filter(t => (typeTimeMap[t.id] || 0) > 0).map(t => (
                    <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                      <span style={{ fontSize: 11, color: "var(--t4)", width: 48, flexShrink: 0, fontFamily: MONO }}>{t.label}</span>
                      <div style={{ flex: 1, height: 4, background: "var(--border)", borderRadius: 2, overflow: "hidden" }}>
                        <div style={{ height: "100%", borderRadius: 2, width: `${((typeTimeMap[t.id] || 0) / maxTypeTime) * 100}%`, background: typeColor(t.id) }} />
                      </div>
                      <span style={{ fontSize: 11, color: "var(--t3)", fontFamily: MONO, width: 36, textAlign: "right", flexShrink: 0 }}>{fmtDur(typeTimeMap[t.id] || 0)}</span>
                    </div>
                  ))}
                  {Object.keys(typeTimeMap).length === 0 && (
                    <div style={{ fontSize: 12, color: "var(--t5)", padding: "4px 0" }}>No tracked time yet</div>
                  )}

                  <div style={pS.divider} />

                  <div style={pS.sectionTitle}>BY TAG</div>
                  {allTagsList2.filter(t => (tagTimeMap[t.id] || 0) > 0).map(t => (
                    <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                      <span style={{ fontSize: 11, color: t.color, width: 48, flexShrink: 0, fontFamily: MONO }}>{t.label}</span>
                      <div style={{ flex: 1, height: 4, background: "var(--border)", borderRadius: 2, overflow: "hidden" }}>
                        <div style={{ height: "100%", borderRadius: 2, width: `${((tagTimeMap[t.id] || 0) / maxTagTime) * 100}%`, background: t.color }} />
                      </div>
                      <span style={{ fontSize: 11, color: "var(--t3)", fontFamily: MONO, width: 36, textAlign: "right", flexShrink: 0 }}>{fmtDur(tagTimeMap[t.id] || 0)}</span>
                    </div>
                  ))}
                  {Object.keys(tagTimeMap).length === 0 && (
                    <div style={{ fontSize: 12, color: "var(--t5)", padding: "4px 0" }}>No tagged time yet</div>
                  )}

                  <div style={pS.divider} />

                  <div style={pS.row}><span style={pS.rowLabel}>This week</span><span style={{ ...pS.rowVal, color: "var(--accent)" }}>{(weekTrackedMin / 60).toFixed(1)} hrs</span></div>
                  <div style={pS.row}><span style={pS.rowLabel}>This month</span><span style={{ ...pS.rowVal, color: "var(--accent)" }}>{(monthTrackedMin / 60).toFixed(1)} hrs</span></div>
                  <div style={pS.row}><span style={pS.rowLabel}>Daily avg</span><span style={pS.rowVal}>{(dailyAvgMin / 60).toFixed(1)} hrs</span></div>
                </div>
              )}

              {/* ═══ ENERGY POPUP ═══ */}
              {statPopup === "energy" && (
                <div>
                  <div style={{ fontSize: 11, letterSpacing: 2, color: "var(--t4)", fontFamily: MONO, marginBottom: 12 }}>ENERGY LEVEL</div>

                  <div style={{ display: "flex", justifyContent: "center", margin: "8px 0 4px" }}>
                    <svg width={90} height={90} viewBox="0 0 90 90">
                      <circle cx={45} cy={45} r={38} fill="none" stroke="var(--border)" strokeWidth={5} />
                      <circle cx={45} cy={45} r={38} fill="none" stroke="var(--accent)" strokeWidth={5}
                        strokeDasharray={2 * Math.PI * 38} strokeDashoffset={2 * Math.PI * 38 * (1 - energyVal / 100)}
                        strokeLinecap="round" transform="rotate(-90 45 45)" />
                      <text x={45} y={42} textAnchor="middle" fill="var(--t1)" fontSize={22} fontWeight={700} fontFamily="monospace">{energyVal}</text>
                      <text x={45} y={56} textAnchor="middle" fill="var(--t5)" fontSize={9} fontFamily="monospace" letterSpacing={1}>PERCENT</text>
                    </svg>
                  </div>

                  <div style={pS.divider} />

                  <div style={pS.sectionTitle}>WHAT DRAINS ENERGY</div>
                  <div style={pS.row}><span style={pS.rowLabel}>Idle time</span><span style={{ ...pS.rowVal, color: "var(--t4)" }}>{drainRates.idle}/min</span></div>
                  <div style={pS.row}><span style={pS.rowLabel}>Working</span><span style={{ ...pS.rowVal, color: "var(--warn)" }}>{drainRates.work}/min</span></div>
                  <div style={pS.row}><span style={pS.rowLabel}>Urgent tasks</span><span style={{ ...pS.rowVal, color: "var(--danger)" }}>{drainRates.urgent}/min</span></div>

                  <div style={pS.divider} />

                  <div style={pS.sectionTitle}>WHAT RESTORES</div>
                  <div style={pS.row}><span style={pS.rowLabel}>Rest tasks</span><span style={{ ...pS.rowVal, color: "var(--rest)" }}>+{drainRates.rest}/min</span></div>
                  <div style={pS.row}><span style={pS.rowLabel}>New day</span><span style={{ ...pS.rowVal, color: "var(--t4)" }}>Full reset</span></div>

                  <div style={pS.divider} />

                  <div style={pS.row}><span style={pS.rowLabel}>Today&apos;s skips</span><span style={{ ...pS.rowVal, color: skippedCount > 0 ? "var(--danger)" : "var(--t5)" }}>{skippedCount}</span></div>
                  <div style={pS.row}><span style={pS.rowLabel}>Restored today</span><span style={{ ...pS.rowVal, color: "#2ECDA7" }}>+{restoredToday}%</span></div>
                </div>
              )}
            </div>
          </div>
        );
      })()}

      <BottomNav active={bottomTab} onChange={handleTabChange} onAdd={() => setShowCreateSheet(true)} expanded={navExpanded} onExpand={expandNav} />
    </div>
  );
}
