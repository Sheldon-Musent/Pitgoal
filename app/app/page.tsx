"use client";
import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
  initNotifications, scheduleTaskNotifications, schedulePauseReminder,
  cancelPauseReminder, scheduleDaySummary, onTaskDone, clearAllNotifications, getPermissionStatus,
} from "../notifications";
import { ensureAuth, syncAllTasks, syncDayLog, saveProfile } from "../../lib/sync";
import {
  STORAGE_KEY, PLAN_KEY, SETTINGS_KEY, GRACE_PERIOD_MS, DEFAULT_RATES,
  DISPLAY, BODY, MONO, EVENTS, DAYS, MONTHS_SHORT,
  MOCK_COLLAB_TASKS,
} from "../../lib/constants";
import {
  pad, fmtTime, fmtDur, dateKey, nowMinutes, isSameDay, getAllDatesInMonth,
  getMYDate, genId, getDisplayTime, getDisplayTimeMin, parseCmd, autoShift,
} from "../../lib/utils";
import type { Task, ActiveTask, Template, DayHistory, DrainRates, Theme, BottomTab, CmdCategory } from "../../lib/types";
import BottomNav from "../../components/BottomNav";
import PitTab from "../../components/PitTab";
import FriendsTab from "../../components/FriendsTab";
import FriendStack from "../../components/FriendStack";
import ProfileTab from "../../components/ProfileTab";
import PopupBar from "../../components/PopupBar";
import CreateTaskSheet from "../../components/CreateTaskSheet";
import type { TaskType, TaskTag, CreateTaskResult } from "../../components/CreateTaskSheet";
import { DEFAULT_TYPES, DEFAULT_TAGS, DEFAULT_TYPE_IDS, DEFAULT_TAG_IDS } from "../../components/CreateTaskSheet";
import SideNav from "../../components/SideNav";
import DayTimeline from "../../components/DayTimeline";
import ResizableLayout from "../../components/ResizableLayout";
import StatCards, { waveValues, getChargingColor } from "../../components/StatCards";
import TaskSheet from "../../components/TaskSheet";
import WeekCalendar from "../../components/WeekCalendar";
import WeekTimeline from "../../components/WeekTimeline";

// ── Energy system constants ──
const IDLE_RATE = 0.5;
const TASK_RATE = 1.0;
const URGENT_RATE = 1.5;
const REST_RATE = -0.3;
const SLEEP_RESTORE_PER_HOUR = 12.5;
const WARN_THRESHOLD = 20;

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

  // ── Energy system state ──
  const [energy, setEnergy] = useState(100);
  const [isSleeping, setIsSleeping] = useState(false);
  const [sleepStartTime, setSleepStartTime] = useState<number | null>(null);
  const [showWakePopup, setShowWakePopup] = useState(false);
  const [showRestWarning, setShowRestWarning] = useState(false);
  const lastEnergyTick = useRef<number>(Date.now());

  // ── UI state ──
  const [bottomTab, setBottomTab] = useState<BottomTab>("main");
  const [activeTab, setActiveTab] = useState("today");
  const [isDesktop, setIsDesktop] = useState(false);
  const [isWideDesktop, setIsWideDesktop] = useState(false);
  const [sideNavCollapsed, setSideNavCollapsed] = useState(false);

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
  const [statPopup, setStatPopup] = useState<number | null>(null);
  const [popupArrowVisible, setPopupArrowVisible] = useState(true);
  // 0 = done, 1 = tracked, 2 = energy, null = closed
  const [statFilter, setStatFilter] = useState<"today" | "week" | "month" | "qtr" | "year">("today");
  const [statSortNewest, setStatSortNewest] = useState(true);
  const [filterMode, setFilterMode] = useState<string>("all");
  const [calView, setCalView] = useState<"W" | "M" | "Q" | "Y">("W");
  const [magicPlannerInput, setMagicPlannerInput] = useState("");
  const [weekCalCenter, setWeekCalCenter] = useState<number>(-1);
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

  // Custom filter tags
  const [customFilterTags, setCustomFilterTags] = useState<{ id: string; label: string; color?: string }[]>([]);
  const [showAddFilterTag, setShowAddFilterTag] = useState(false);
  const [editingFilterTag, setEditingFilterTag] = useState<{ id: string; label: string; color?: string } | null>(null);
  const [filterTagInput, setFilterTagInput] = useState("");

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
  const dateSnapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dateStripDidInit = useRef(false);

  const powerTapTimer = useRef<any>(null);
  const swipeStartX = useRef<number | null>(null);
  const swipeCurrentX = useRef<number>(0);
  const swipeDelta = useRef<number>(0);
  const monthScrollRef = useRef<HTMLDivElement>(null);
  const marLabelRef = useRef<HTMLDivElement>(null);
  const taskSheetRef = useRef<{ snapTo: (idx: number) => void }>(null);
  const weekCalRef = useRef<{ scrollToToday: () => void }>(null);
  const weekTimelineRef = useRef<{ scrollToNow: () => void }>(null);
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

      // Fallback: check ProfileTab's individual rate keys
      try {
        const ptIdle = localStorage.getItem("pitgoal-rate-idle");
        const ptTask = localStorage.getItem("pitgoal-rate-task");
        const ptUrgent = localStorage.getItem("pitgoal-rate-urgent");
        const ptRest = localStorage.getItem("pitgoal-rate-rest");
        if (ptIdle || ptTask || ptUrgent || ptRest) {
          setDrainRates(prev => ({
            ...prev,
            ...(ptIdle ? { idle: parseFloat(ptIdle) } : {}),
            ...(ptTask ? { work: parseFloat(ptTask) } : {}),
            ...(ptUrgent ? { urgent: parseFloat(ptUrgent) } : {}),
            ...(ptRest ? { rest: parseFloat(ptRest) } : {}),
          }));
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

    // ── Load energy & sleep state ──
    try {
      const savedEnergy = localStorage.getItem("pitgoal-energy");
      const savedTick = localStorage.getItem("pitgoal-energy-tick");
      const savedSleeping = localStorage.getItem("pitgoal-sleeping");
      const savedSleepStart = localStorage.getItem("pitgoal-sleep-start");

      if (savedSleeping === "true" && savedSleepStart) {
        setIsSleeping(true);
        setSleepStartTime(parseInt(savedSleepStart));
        setShowWakePopup(true);
        if (savedEnergy) setEnergy(parseFloat(savedEnergy));
      } else if (savedEnergy && savedTick) {
        const lastTick = parseInt(savedTick);
        const offlineMinutes = (Date.now() - lastTick) / 60000;
        // Check if there was an active task during offline
        const raw2 = localStorage.getItem(STORAGE_KEY);
        let offlineRate = IDLE_RATE;
        if (raw2) {
          try {
            const d2 = JSON.parse(raw2);
            if (d2.activeTask) {
              const at = d2.activeTask;
              const taskType = at.type?.toUpperCase?.() || "WORK";
              if (taskType === "REST") offlineRate = REST_RATE;
              else if (at.urgent) offlineRate = URGENT_RATE;
              else offlineRate = TASK_RATE;
            }
          } catch {}
        }
        const offlineDrain = offlineRate * offlineMinutes;
        const restoredEnergy = Math.max(0, Math.min(100, parseFloat(savedEnergy) - offlineDrain));
        setEnergy(restoredEnergy);
      }
      lastEnergyTick.current = Date.now();
    } catch {}

    ensureAuth().then(uid => { if (uid) setUserId(uid); });
    setLoaded(true);
  }, []);

  // Load custom filter tags
  useEffect(() => {
    try {
      const saved = localStorage.getItem("pitgoal-filter-tags");
      if (saved) setCustomFilterTags(JSON.parse(saved));
    } catch {}
  }, []);

  const saveFilterTags = (tags: { id: string; label: string; color?: string }[]) => {
    setCustomFilterTags(tags);
    try { localStorage.setItem("pitgoal-filter-tags", JSON.stringify(tags)); } catch {};
  };

  // TEMPORARY: fake task for drag testing — remove later
  useEffect(() => {
    if (!loaded) return;
    setTasks(prev => {
      if (prev.find(t => t.id === "test-drag")) return prev;
      return [...prev, {
        id: "test-drag",
        name: "test calendar",
        time: "14:00",
        duration: 120,
        type: "work",
        status: "pending",
        planned_duration: 120,
      } as Task];
    });
  }, [loaded]);

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

  // ═══ ENERGY PERSISTENCE ═══
  useEffect(() => {
    localStorage.setItem("pitgoal-energy", energy.toString());
    localStorage.setItem("pitgoal-energy-tick", Date.now().toString());
  }, [energy]);

  useEffect(() => {
    localStorage.setItem("pitgoal-sleeping", isSleeping.toString());
    if (sleepStartTime) {
      localStorage.setItem("pitgoal-sleep-start", sleepStartTime.toString());
    }
  }, [isSleeping, sleepStartTime]);

  // ═══ TICK ═══
  useEffect(() => { const id = setInterval(() => setTick(t => t + 1), 1000); return () => clearInterval(id); }, []);

  const popupIsCharging = isSleeping || (activeTask?.type === "rest");
  useEffect(() => {
    if (!popupIsCharging) return;
    const id = setInterval(() => setPopupArrowVisible(v => !v), 600);
    return () => clearInterval(id);
  }, [popupIsCharging]);

  // ═══ CLEANUP TIMERS ON UNMOUNT ═══
  useEffect(() => {
    return () => {
      if (suggestTimer.current) clearTimeout(suggestTimer.current);
      if (longPressTimer.current) clearTimeout(longPressTimer.current);
    };
  }, []);

  // ═══ DESKTOP DETECTION ═══
  useEffect(() => {
    const check = () => {
      setIsDesktop(window.innerWidth >= 768);
      setIsWideDesktop(window.innerWidth >= 1200);
    };
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // ═══ REAL-TIME ENERGY DRAIN ═══
  useEffect(() => {
    if (isSleeping) return;
    const interval = setInterval(() => {
      // Pause drain while tab is hidden to prevent massive catch-up drain
      if (document.visibilityState === "hidden") return;

      const now = Date.now();
      const deltaMinutes = (now - lastEnergyTick.current) / 60000;
      // Cap delta to prevent massive drain after backgrounding
      const cappedDelta = Math.min(deltaMinutes, 0.5);
      lastEnergyTick.current = now;
      let rate: number;
      if (activeTask) {
        const taskType = activeTask.type?.toUpperCase?.() || "WORK";
        if (taskType === "REST") {
          rate = REST_RATE;
        } else if (activeTask.urgent) {
          rate = URGENT_RATE;
        } else {
          rate = TASK_RATE;
        }
      } else {
        rate = IDLE_RATE;
      }
      setEnergy(prev => Math.max(0, Math.min(100, prev - rate * cappedDelta)));
    }, 1000);
    return () => clearInterval(interval);
  }, [isSleeping, activeTask]);

  // ═══ REST NOW WARNING ═══
  useEffect(() => {
    setShowRestWarning(energy <= WARN_THRESHOLD && !isSleeping);
  }, [energy, isSleeping]);

  // ═══ GRACE PERIOD AUTO-SKIP ═══
  useEffect(() => {
    if (!loaded) return;
    const interval = setInterval(() => {
      if (activeTask) return;
      const now = nowMinutes(); const nowMs = Date.now();
      setTasks(prevTasks => {
        let shifted = false;
        const u = prevTasks.map(t => {
          if (t.status !== "pending") return t;
          const tt = getDisplayTimeMin(t);
          if ((now - tt) * 60 * 1000 >= GRACE_PERIOD_MS && tt < now) { shifted = true; return { ...t, status: "skipped" as const, skippedAt: nowMs }; }
          return t;
        });
        return shifted ? u : prevTasks;
      });
    }, 10000);
    return () => clearInterval(interval);
  }, [loaded, activeTask]);

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

  useEffect(() => { if (weekCalCenter === -1) { const d = new Date(); const day = d.getDay(); setWeekCalCenter(day === 0 ? 6 : day - 1); } }, [weekCalCenter]);
  useEffect(() => { const fn = () => { if (document.visibilityState === "visible") { const n = new Date(); setViewMonth(n.getMonth()); setViewYear(n.getFullYear()); } }; document.addEventListener("visibilitychange", fn); return () => document.removeEventListener("visibilitychange", fn); }, []);
  useEffect(() => { if (monthPickerOpen && monthScrollRef.current) { const el = monthScrollRef.current.querySelector('[data-active="true"]'); if (el) (el as HTMLElement).scrollIntoView({ block: "center", behavior: "auto" }); } }, [monthPickerOpen]);

  // ═══ TASK ACTIONS ═══
  const addTask = () => { const p = parseCmd(cmdInput, cmdCategory); if (!p) return; const n = [...tasks, p]; setTasks(n); setCmdInput(""); save(n, dayLog, energyUsed, energyCharged, activeTask, customGroups, pausedTask, switchingFrom); };

  const startTask = (task: Task) => {
    if (activeTask) stopAndComplete();

    // ── Retroactive penalty for late starts ──
    const now = Date.now();
    const startStr = task.time;
    let scheduledStart = now;
    if (startStr) {
      const [h, m] = startStr.split(":").map(Number);
      const d = new Date();
      d.setHours(h, m, 0, 0);
      scheduledStart = d.getTime();
    }
    if (scheduledStart < now) {
      const missedMinutes = (now - scheduledStart) / 60000;
      const taskType = task.type?.toUpperCase?.() || "WORK";
      const actualRate = task.urgent ? URGENT_RATE : (taskType === "REST" ? 0 : TASK_RATE);
      const rateDiff = actualRate - IDLE_RATE;
      if (rateDiff > 0) {
        const penalty = rateDiff * missedMinutes;
        setEnergy(prev => Math.max(0, prev - penalty));
      }
    }

    if (pausedTask && pausedTask.id === task.id) {
      const at = { ...task, startedAt: Date.now() - (pausedTask.elapsedMs || 0), baseUsed: energyUsed, baseCharged: energyCharged, actualStartTime: task.actualStartTime || new Date().toISOString() } as ActiveTask;
      setActiveTask(at); setPausedTask(null); const u = tasks.map(t => t.id === task.id ? { ...t, status: "active" as const, actualStartTime: t.actualStartTime || new Date().toISOString() } : t); setTasks(u); save(u, dayLog, energyUsed, energyCharged, at, customGroups, null, switchingFrom); return;
    }
    const at = { ...task, startedAt: Date.now(), baseUsed: energyUsed, baseCharged: energyCharged, actualStartTime: new Date().toISOString() } as ActiveTask;
    setActiveTask(at); const u = tasks.map(t => t.id === task.id ? { ...t, status: "active" as const, actualStartTime: new Date().toISOString() } : t); setTasks(u); setExpandedTask(null); save(u, dayLog, energyUsed, energyCharged, at, customGroups, pausedTask, switchingFrom);
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

  const markDone = (task: Task) => {
    // Route to correct handler based on whether task was actively running
    if (activeTask?.id === task.id && task.actualStartTime) {
      return handleActiveDone(task);
    }
    if (!task.actualStartTime) {
      return handleDirectDone(task);
    }
    // Fallback: original behavior
    const entry = { id: genId(), name: task.name, type: task.type, urgent: task.urgent, duration: task.duration, startTime: getDisplayTime(task), endTime: fmtTime(Math.floor((getDisplayTimeMin(task) + task.duration) / 60) % 24, (getDisplayTimeMin(task) + task.duration) % 60) }; const newLog = [...dayLog, entry]; const u = tasks.map(t => t.id === task.id ? { ...t, status: "done" as const, actual_duration: task.duration, completedAt: Date.now() } : t); setDayLog(newLog); setTasks(u); setExpandedTask(null); save(u, newLog, energyUsed, energyCharged, activeTask, customGroups, pausedTask, switchingFrom); if (notifEnabled) onTaskDone(task.id); if (activeTask?.id === task.id) { setActiveTask(null); save(u, newLog, energyUsed, energyCharged, null, customGroups, pausedTask, switchingFrom); } if (pausedTask?.id === task.id) setPausedTask(null); if (switchingFrom?.id === task.id) setSwitchingFrom(null);
  };
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
  const resetAll = () => { setTasks([]); setDayLog([]); setTemplates([]); setHistory({}); setStreak(0); setCustomGroups([]); setEnergyUsed(0); setEnergyCharged(0); setEnergy(100); setIsSleeping(false); setSleepStartTime(null); setActiveTask(null); setPausedTask(null); setSwitchingFrom(null); try { localStorage.removeItem(STORAGE_KEY); localStorage.removeItem(PLAN_KEY); localStorage.removeItem("pitgoal-energy"); localStorage.removeItem("pitgoal-energy-tick"); localStorage.removeItem("pitgoal-sleeping"); localStorage.removeItem("pitgoal-sleep-start"); localStorage.removeItem("pitgoal-last-sleep"); } catch {} };

  const fetchSuggestions = useCallback((q: string) => {
    if (q.length < 2) { setSuggestions([]); setShowSuggestions(false); return; }
    clearTimeout(suggestTimer.current);
    suggestTimer.current = setTimeout(async () => {
      if (!userId) return;
      const { getPersonalSuggestions, getGlobalSuggestions } = await import("../../lib/sync");
      const personal = await getPersonalSuggestions(userId, q, 3);
      const global = await getGlobalSuggestions(q, 3);
      const pNames = new Set(personal.map((p: any) => p.name.toLowerCase()));
      const merged = [...personal.map((p: any) => ({ ...p, source: "you" })), ...global.filter((g: any) => !pNames.has(g.name.toLowerCase())).map((g: any) => ({ ...g, source: "popular" }))].slice(0, 5);
      setSuggestions(merged); setShowSuggestions(merged.length > 0);
    }, 300);
  }, [userId]);
  const pickSuggestion = (s: any) => { setCmdInput(s.name); if (s.category) setCmdCategory(s.category); setSuggestions([]); setShowSuggestions(false); };

  // ═══ TASK STATE DETECTION ═══
  function getTaskState(task: any): "upcoming" | "available" | "overdue" | "active" | "done" | "skipped" {
    if (task.status === "done") return "done";
    if (task.status === "skipped") return "skipped";
    if (task.id === activeTask?.id) return "active";

    const now = Date.now();
    const startStr = task.time;
    if (!startStr) return "upcoming";

    const [h, m] = startStr.split(":").map(Number);
    const d = new Date();
    d.setHours(h, m, 0, 0);
    const start = d.getTime();

    const durationMs = (task.duration || 60) * 60 * 1000;
    const end = start + durationMs;

    if (now < start) return "upcoming";
    if (now >= start && now <= end && task.status === "pending") return "available";
    if (now > end && task.status === "pending") return "overdue";
    return "upcoming";
  }

  // ═══ HANDLE DO NOW (overdue tasks — no penalty) ═══
  const handleDoNow = (task: Task) => {
    const now = new Date();
    const nowStr = fmtTime(now.getHours(), now.getMinutes());
    const nowMin = now.getHours() * 60 + now.getMinutes();
    const u = tasks.map(t => t.id === task.id ? { ...t, time: nowStr, timeMin: nowMin, adjustedTimeMin: null } : t);
    setTasks(u);
    save(u, dayLog, energyUsed, energyCharged, activeTask, customGroups, pausedTask, switchingFrom);
    const updated = u.find(t => t.id === task.id);
    if (updated) startTask(updated);
  };

  // ═══ UPDATE TASK DURATION (from timeline drag) ═══
  const handleUpdateDuration = useCallback((taskId: string, newDurationMin: number) => {
    const u = tasks.map(t => t.id === taskId ? { ...t, duration: newDurationMin, planned_duration: newDurationMin } : t);
    setTasks(u);
    save(u, dayLog, energyUsed, energyCharged, activeTask, customGroups, pausedTask, switchingFrom);
  }, [tasks, dayLog, energyUsed, energyCharged, activeTask, customGroups, pausedTask, switchingFrom, save]);

  // ═══ HANDLE DIRECT DONE (never started — charge full duration) ═══
  const handleDirectDone = (task: Task) => {
    const durationMinutes = task.duration || 60;
    const taskRate = task.urgent ? URGENT_RATE : TASK_RATE;
    const fullCharge = taskRate * durationMinutes;

    const startStr = task.time;
    let scheduledStart = Date.now();
    if (startStr) {
      const [h, m] = startStr.split(":").map(Number);
      const d = new Date();
      d.setHours(h, m, 0, 0);
      scheduledStart = d.getTime();
    }

    const elapsed = Math.min(durationMinutes, (Date.now() - scheduledStart) / 60000);
    const alreadyDrained = IDLE_RATE * Math.max(0, elapsed);
    const netDrain = Math.max(0, fullCharge - alreadyDrained);

    setEnergy(prev => Math.max(0, prev - netDrain));

    const entry = { id: genId(), name: task.name, type: task.type, urgent: task.urgent, duration: durationMinutes, startTime: getDisplayTime(task), endTime: fmtTime(Math.floor((getDisplayTimeMin(task) + durationMinutes) / 60) % 24, (getDisplayTimeMin(task) + durationMinutes) % 60) };
    const newLog = [...dayLog, entry];
    const u = tasks.map(t => t.id === task.id ? { ...t, status: "done" as const, actual_duration: durationMinutes, completedAt: Date.now() } : t);
    setDayLog(newLog); setTasks(u); setExpandedTask(null);
    save(u, newLog, energyUsed, energyCharged, activeTask, customGroups, pausedTask, switchingFrom);
    if (notifEnabled) onTaskDone(task.id);
    if (pausedTask?.id === task.id) setPausedTask(null);
    if (switchingFrom?.id === task.id) setSwitchingFrom(null);
  };

  // ═══ HANDLE ACTIVE DONE (was running — lock actual elapsed) ═══
  const handleActiveDone = (task: Task) => {
    if (!(task as any).actualStartTime) return handleDirectDone(task);
    stopAndComplete();
  };

  // ═══ SLEEP MODE ═══
  const handleSleep = () => {
    if (activeTask) {
      skipTask();
    }

    setIsSleeping(true);
    setSleepStartTime(Date.now());
    localStorage.setItem("pitgoal-last-sleep", Date.now().toString());
  };

  // ═══ WAKE UP ═══
  const handleWake = () => {
    if (!sleepStartTime) return;
    const sleepHours = (Date.now() - sleepStartTime) / 3600000;
    const restore = Math.min(100, sleepHours * SLEEP_RESTORE_PER_HOUR);
    setEnergy(prev => Math.min(100, prev + restore));
    setIsSleeping(false);
    setSleepStartTime(null);
    setShowWakePopup(false);
    lastEnergyTick.current = Date.now();
    localStorage.removeItem("pitgoal-sleeping");
    localStorage.removeItem("pitgoal-sleep-start");
  };

  const handleStillResting = () => {
    setShowWakePopup(false);
  };

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
  // Real-time energy overrides computed value
  const ePct = Math.round(energy);
  const eHrs = ((energy / 100) * drainRates.maxEnergyHours).toFixed(1);

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
  const totalTrackedHrs = (totalTracked / 60).toFixed(1);
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
  const allDates = useMemo(() => {
    const dates: Date[] = [];
    for (let i = -15; i <= 15; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() + i);
      d.setHours(0, 0, 0, 0);
      dates.push(d);
    }
    return dates;
  }, []);
  const lastDateTapRef = useRef(0);

  // Scroll date strip to center selected date
  const smoothScrollTo = useCallback((container: HTMLElement, target: number, duration: number) => {
    const start = container.scrollLeft;
    const diff = target - start;
    if (Math.abs(diff) < 1) return;
    const startTime = performance.now();
    const ease = (t: number) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    const step = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      container.scrollLeft = start + diff * ease(progress);
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, []);

  const scrollDateToCenter = useCallback((smooth: boolean) => {
    const idx = allDates.findIndex(d => isSameDay(d, selectedDate));
    if (idx < 0) return;
    const container = dateStripScrollRef.current;
    if (!container) return;
    const cell = container.querySelector(`[data-didx="${idx}"]`) as HTMLElement;
    if (!cell) return;
    const scrollTarget = Math.max(0, cell.offsetLeft - container.offsetWidth / 2 + cell.offsetWidth / 2);
    if (smooth) {
      smoothScrollTo(container, scrollTarget, 300);
    } else {
      container.scrollLeft = scrollTarget;
    }
  }, [allDates, selectedDate, smoothScrollTo]);

  // On mount: scroll to today instantly
  useEffect(() => {
    if (!loaded || dateStripDidInit.current) return;
    setTimeout(() => {
      scrollDateToCenter(false);
      dateStripDidInit.current = true;
    }, 200);
  }, [loaded]); // eslint-disable-line react-hooks/exhaustive-deps

  // On tab return to home: re-center on selected date
  useEffect(() => {
    if (bottomTab === "main" && dateStripDidInit.current) {
      setTimeout(() => scrollDateToCenter(false), 100);
    }
  }, [bottomTab]); // eslint-disable-line react-hooks/exhaustive-deps

  // Edge dim handled by CSS gradient overlays — no JS needed

  const handleTabChange = (tab: BottomTab) => setBottomTab(tab);

  // ═══ LOADING ═══
  if (!loaded) return (
    <div style={{
      background: 'var(--bg)',
      minHeight: '100dvh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '24px',
    }}>
      <img
        src="/Trademark-white.png"
        alt="Pitgoal"
        style={{
          width: '220px',
          height: 'auto',
          opacity: 0.95,
        }}
      />
      <div style={{
        width: '40px',
        height: '3px',
        background: '#1e2530',
        borderRadius: '2px',
        overflow: 'hidden',
        position: 'relative',
      }}>
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          height: '100%',
          width: '60%',
          background: '#FFD000',
          borderRadius: '2px',
          animation: 'splash-slide 1.2s ease-in-out infinite',
        }} />
      </div>
      <style>{`
        @keyframes splash-slide {
          0% { transform: translateX(-100%); }
          50% { transform: translateX(80%); }
          100% { transform: translateX(-100%); }
        }
      `}</style>
    </div>
  );

  // ═══ RENDER ═══
  const sideNavElement = (
    <SideNav
      active={bottomTab}
      onChange={handleTabChange}
      onAdd={() => setShowCreateSheet(true)}
      energy={energy}
      isSleeping={isSleeping}
      tasksDoneCount={tasksDoneCount + restsDoneCount}
      totalTrackedHrs={totalTrackedHrs}
      activeTask={activeTask}
      activeTimerStr={activeTimerStr}
      pendingTasks={pendingTasks}
      doneTasks={doneTasks}
      getDisplayTime={getDisplayTime}
      collapsed={sideNavCollapsed}
      onToggleCollapse={() => setSideNavCollapsed(prev => !prev)}
    />
  );

  const appContent = (
    <div className="app-content" style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", maxWidth: isDesktop ? "none" : 430, margin: isDesktop ? 0 : "0 auto", width: isDesktop ? "auto" : "100%" }}>
    <div className="scroll-content" style={{ flex: 1, overflowY: (bottomTab === "main" && !isDesktop) ? "hidden" : "auto", overflowX: "hidden", WebkitOverflowScrolling: "touch" as any, paddingBottom: hasActivePopup ? 200 : 100, paddingTop: "env(safe-area-inset-top, 0px)", position: "relative", minHeight: 0 }}>

      {/* ── MAIN TAB ── */}
      {bottomTab === "main" && (
        <div style={{ padding: "24px 24px 0", display: calView === "W" ? "flex" : "block", flexDirection: "column", height: calView === "W" ? "100%" : "auto" }}>


          {/* ═══ SECTION A: 3 Stat Cards ═══ */}
          <div ref={marLabelRef}>
          <StatCards
            energy={energy}
            tasksDone={tasksDoneCount + restsDoneCount}
            hoursTracked={(totalTracked / 60).toFixed(1)}
            sleepRestoreRate={SLEEP_RESTORE_PER_HOUR}
            isSleeping={isSleeping}
            onCardClick={(i) => setStatPopup(i)}
            isCharging={isSleeping || (activeTask?.type === "rest")}
            isDesktop={isDesktop}
          />
          </div>

          {/* ═══ MAGIC PLANNER BAR ═══ */}
          <div style={{ marginTop: 8, marginBottom: 10, padding: "0 28px" }}>
            <div style={{
              display: "flex", alignItems: "center", gap: 8,
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 50, padding: "10px 14px",
            }}>
              <input
                type="text"
                value={magicPlannerInput}
                onChange={(e) => setMagicPlannerInput(e.target.value)}
                placeholder="Deep work 4h, gym 1h, read 30m..."
                style={{
                  flex: 1, background: "transparent", border: "none", outline: "none",
                  color: "var(--t1)", fontSize: 13, fontWeight: 400,
                  fontFamily: "inherit",
                }}
              />
              <div className="tap" style={{
                width: 28, height: 28, borderRadius: "50%",
                background: "rgba(255,255,255,0.06)",
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0, cursor: "pointer",
              }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="2" strokeLinecap="round">
                  <rect x="9" y="1" width="6" height="12" rx="3"/>
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                  <line x1="12" y1="19" x2="12" y2="23"/>
                </svg>
              </div>
              <div className="tap" onClick={() => {
                if (!magicPlannerInput.trim()) return;
                setMagicPlannerInput("");
              }} style={{
                width: 28, height: 28, borderRadius: "50%",
                background: magicPlannerInput.trim() ? "#FFD000" : "rgba(255,255,255,0.06)",
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0, cursor: "pointer",
                transition: "background 0.2s ease",
              }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={magicPlannerInput.trim() ? "#0a0a0a" : "rgba(255,255,255,0.35)"} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12"/>
                  <polyline points="12 5 19 12 12 19"/>
                </svg>
              </div>
            </div>
          </div>

          {calView === "W" && (
            <>
              <WeekCalendar
                ref={weekCalRef}
                tasks={tasks}
                templates={templates}
                history={history}
                selectedDate={selectedDate}
                onSelectDate={(d) => setSelectedDate(d)}
                activeTask={activeTask}
                getDisplayTimeMin={getDisplayTimeMin}
                center={weekCalCenter}
                onCenterChange={setWeekCalCenter}
                onDoubleTapToday={() => weekTimelineRef.current?.scrollToNow()}
                calView={calView}
                onCalViewChange={(v) => setCalView(v as any)}
              />
              <WeekTimeline
                ref={weekTimelineRef}
                tasks={tasks}
                templates={templates}
                history={history}
                center={weekCalCenter}
                getDisplayTimeMin={getDisplayTimeMin}
                activeTask={activeTask}
                onUpdateDuration={handleUpdateDuration}
              />
            </>
          )}

          <TaskSheet ref={taskSheetRef} marLabelRef={marLabelRef} isDesktop={isDesktop} navHeight={72} stickyHeader={
            <>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "4px 0 0" }}>
                <div style={{ width: "100%", padding: "0 24px", position: "relative" }}>

                  <div style={{ borderRadius: 50, overflow: "hidden", background: "rgba(28,28,30,0.35)", backdropFilter: "blur(15px) saturate(180%)", WebkitBackdropFilter: "blur(15px) saturate(180%)" }}>
                  <div
                    ref={dateStripScrollRef}
                    className="no-scrollbar"
                    style={{
                      padding: 5,
                      display: "flex",
                      gap: 0,
                      overflowX: "auto",
                      WebkitOverflowScrolling: "touch" as any,
                    }}
                  >
                    <div style={{ flexShrink: 0, width: "calc(50% - 32px)" }} />
                    {allDates.map((d, idx) => {
                      const isT = isSameDay(d, today);
                      const isSel = isSameDay(d, selectedDate);
                      return (
                        <div
                          key={d.getTime()}
                          data-didx={idx}
                          onClick={() => {
                            const now = Date.now();
                            if (now - lastDateTapRef.current < 300) {
                              if (dateSnapTimer.current) { clearTimeout(dateSnapTimer.current); dateSnapTimer.current = null; }
                              const todayDate = new Date();
                              todayDate.setHours(0, 0, 0, 0);
                              setSelectedDate(todayDate);
                              setViewMonth(todayDate.getMonth());
                              setViewYear(todayDate.getFullYear());
                              lastDateTapRef.current = 0;
                              setTimeout(() => {
                                const ctr = dateStripScrollRef.current;
                                const todayIdx = allDates.findIndex(dd => isSameDay(dd, todayDate));
                                const cell = ctr?.querySelector(`[data-didx="${todayIdx}"]`) as HTMLElement;
                                if (cell && ctr) {
                                  const target = Math.max(0, cell.offsetLeft - ctr.offsetWidth / 2 + cell.offsetWidth / 2);
                                  const start = ctr.scrollLeft;
                                  const diff = target - start;
                                  if (Math.abs(diff) < 1) return;
                                  const startTime = performance.now();
                                  const ease = (t: number) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
                                  const step = (now: number) => { const elapsed = now - startTime; const progress = Math.min(elapsed / 300, 1); ctr.scrollLeft = start + diff * ease(progress); if (progress < 1) requestAnimationFrame(step); };
                                  requestAnimationFrame(step);
                                }
                              }, 50);
                              return;
                            }
                            lastDateTapRef.current = now;
                            setSelectedDate(new Date(d));
                            setViewMonth(d.getMonth());
                            setViewYear(d.getFullYear());
                            if (dateSnapTimer.current) clearTimeout(dateSnapTimer.current);
                            dateSnapTimer.current = setTimeout(() => {
                              const ctr = dateStripScrollRef.current;
                              const cell = ctr?.querySelector(`[data-didx="${idx}"]`) as HTMLElement;
                              if (cell && ctr) {
                                const target = Math.max(0, cell.offsetLeft - ctr.offsetWidth / 2 + cell.offsetWidth / 2);
                                const start = ctr.scrollLeft;
                                const diff = target - start;
                                if (Math.abs(diff) < 1) return;
                                const startTime = performance.now();
                                const ease = (t: number) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
                                const step = (now: number) => { const elapsed = now - startTime; const progress = Math.min(elapsed / 300, 1); ctr.scrollLeft = start + diff * ease(progress); if (progress < 1) requestAnimationFrame(step); };
                                requestAnimationFrame(step);
                              }
                            }, 500);
                          }}
                          style={{
                            width: 72, height: 72, flexShrink: 0, borderRadius: "50%",
                            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                            cursor: "pointer",
                            background: isSel ? "#FFD000" : "transparent",
                            transition: "background 0.2s",
                            position: "relative",
                          }}
                        >
                          <div style={{ fontSize: 18, fontWeight: 700, color: isSel ? "#0a0a0a" : "var(--t5)", lineHeight: 1.2 }}>{d.getDate()}</div>
                          <div style={{ fontSize: 9, fontWeight: 500, color: isSel ? "rgba(0,0,0,0.5)" : "var(--t5)", fontFamily: MONO }}>{DAYS[d.getDay()]}</div>
                          {isT && !isSel && (
                            <div style={{ width: 4, height: 4, borderRadius: "50%", background: "var(--accent)", position: "absolute", bottom: 4, left: "50%", transform: "translateX(-50%)" }} />
                          )}
                        </div>
                      );
                    })}
                    <div style={{ flexShrink: 0, width: "calc(50% - 32px)" }} />
                  </div>
                  </div>
                </div>
              {/* MAR 2026 label */}
              <div className="tap" onClick={() => setMonthPickerOpen(!monthPickerOpen)} style={{ textAlign: "center", marginTop: 8, cursor: "pointer" }}>
                <span style={{ fontSize: 10, color: "var(--t5)", fontFamily: MONO, letterSpacing: 1, fontWeight: 600, border: "1px solid rgba(255,255,255,0.06)", borderRadius: 50, padding: "4px 14px" }}>{MONTHS_SHORT[selectedDate.getMonth()]} {selectedDate.getFullYear()} ▾</span>
              </div>
              </div>
            </>
          }>
          {/* ═══ FILTER BAR — DATE + custom tags ═══ */}
          <div
            className="no-scrollbar"
            style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "nowrap", marginBottom: 20, marginTop: 6, overflowX: "auto", WebkitUserSelect: "none", userSelect: "none" }}
          >
            {/* DATE button — always first, can't be deleted */}
            <div className="tap pill-no-select" onClick={() => { setFilterMode("all"); setActiveTab("today"); }} style={{
              padding: filterMode === "all" ? "8px 20px" : "8px 18px", borderRadius: 50, fontFamily: MONO, fontSize: 11,
              fontWeight: filterMode === "all" ? 700 : 500, letterSpacing: 1, cursor: "pointer", flexShrink: 0,
              background: filterMode === "all" ? "#FFD000" : "var(--card)",
              color: filterMode === "all" ? "#0a0a0a" : "var(--t4)",
              border: filterMode === "all" ? "none" : "1px solid var(--border)",
            }}>DATE</div>

            {/* Custom tag pills */}
            {customFilterTags.map((tag) => {
              const isActive = filterMode === `tag:${tag.id}`;
              return (
                <div key={tag.id} style={{ position: "relative", flexShrink: 0 }}>
                  <div className="tap pill-no-select"
                    onClick={() => {
                      setFilterMode(isActive ? "all" : `tag:${tag.id}`);
                      setActiveTab("today");
                    }}
                    onTouchStart={(e) => {
                      e.preventDefault();
                      const timer = setTimeout(() => {
                        setEditingFilterTag(tag);
                      }, 500);
                      (e.currentTarget as any)._lpTimer = timer;
                    }}
                    onTouchEnd={(e) => { clearTimeout((e.currentTarget as any)._lpTimer); }}
                    onTouchMove={(e) => { clearTimeout((e.currentTarget as any)._lpTimer); }}
                    onMouseDown={() => {
                      longPressTimer.current = setTimeout(() => setEditingFilterTag(tag), 500);
                    }}
                    onMouseUp={() => { if (longPressTimer.current) clearTimeout(longPressTimer.current); }}
                    onContextMenu={(e) => e.preventDefault()}
                    style={{
                      padding: isActive ? "8px 20px" : "8px 18px", borderRadius: 50, fontFamily: MONO, fontSize: 11,
                      fontWeight: isActive ? 700 : 500, cursor: "pointer", transition: "all 0.15s", flexShrink: 0,
                      background: isActive ? (tag.color || "#FFD000") : "var(--card)",
                      color: isActive ? "#0a0a0a" : tag.color || "var(--t4)",
                      border: isActive ? "none" : `1px solid ${tag.color ? tag.color + "4D" : "var(--border)"}`,
                    }}
                  >{tag.label}</div>
                </div>
              );
            })}

            {/* Add tag button */}
            <div className="tap" onClick={() => setShowAddFilterTag(true)} style={{
              width: 36, height: 36, borderRadius: "50%", flexShrink: 0,
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", border: "1px solid var(--border)", background: "var(--card)",
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--t5)" strokeWidth="2" strokeLinecap="round">
                <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </div>
          </div>

          {/* Add filter tag popup */}
          {showAddFilterTag && (
            <div onClick={() => { setShowAddFilterTag(false); setFilterTagInput(""); }} style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 100, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div onClick={(e) => e.stopPropagation()} style={{
                background: "rgba(28,28,30,0.65)", backdropFilter: "blur(30px) saturate(180%)", WebkitBackdropFilter: "blur(30px) saturate(180%)",
                border: "none", borderRadius: 20, padding: 20, width: 320, maxWidth: "calc(100% - 48px)",
              }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: "var(--t1)", marginBottom: 16 }}>Add tag</div>
                <input
                  autoFocus
                  value={filterTagInput}
                  onChange={(e) => setFilterTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && filterTagInput.trim()) {
                      saveFilterTags([...customFilterTags, { id: genId(), label: filterTagInput.trim().toUpperCase() }]);
                      setFilterTagInput("");
                      setShowAddFilterTag(false);
                    }
                  }}
                  placeholder="Tag name..."
                  style={{
                    width: "100%", padding: "12px 16px", borderRadius: 12,
                    background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
                    color: "var(--t1)", fontSize: 14, fontFamily: MONO, outline: "none",
                  }}
                />
                <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                  <div className="tap" onClick={() => {
                    if (filterTagInput.trim()) {
                      saveFilterTags([...customFilterTags, { id: genId(), label: filterTagInput.trim().toUpperCase() }]);
                      setFilterTagInput("");
                      setShowAddFilterTag(false);
                    }
                  }} style={{
                    flex: 1, padding: 12, borderRadius: 12, background: "var(--accent)",
                    color: "#0a0a0a", textAlign: "center", fontWeight: 700, fontSize: 13, fontFamily: MONO, cursor: "pointer",
                  }}>Add</div>
                  <div className="tap" onClick={() => { setShowAddFilterTag(false); setFilterTagInput(""); }} style={{
                    flex: 1, padding: 12, borderRadius: 12, border: "1px solid rgba(255,255,255,0.1)",
                    color: "var(--t4)", textAlign: "center", fontWeight: 500, fontSize: 13, fontFamily: MONO, cursor: "pointer",
                  }}>Cancel</div>
                </div>
              </div>
            </div>
          )}

          {/* Edit filter tag popup (long-press) */}
          {editingFilterTag && (
            <div onClick={() => { setEditingFilterTag(null); setFilterTagInput(""); }} style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 100, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div onClick={(e) => e.stopPropagation()} style={{
                background: "rgba(28,28,30,0.65)", backdropFilter: "blur(30px) saturate(180%)", WebkitBackdropFilter: "blur(30px) saturate(180%)",
                border: "none", borderRadius: 20, padding: 20, width: 320, maxWidth: "calc(100% - 48px)",
              }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: "var(--t1)", marginBottom: 16 }}>Edit tag</div>

                {/* Rename */}
                <input
                  autoFocus
                  defaultValue={editingFilterTag.label}
                  onChange={(e) => setFilterTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (filterTagInput || editingFilterTag.label).trim()) {
                      const updated = customFilterTags.map(t => t.id === editingFilterTag.id ? { ...t, label: (filterTagInput || editingFilterTag.label).trim().toUpperCase() } : t);
                      saveFilterTags(updated);
                      setEditingFilterTag(null);
                      setFilterTagInput("");
                    }
                  }}
                  placeholder="Tag name..."
                  style={{
                    width: "100%", padding: "12px 16px", borderRadius: 12,
                    background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
                    color: "var(--t1)", fontSize: 14, fontFamily: MONO, outline: "none",
                  }}
                />

                {/* Move up / Move down */}
                <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                  <div className="tap" onClick={() => {
                    const idx = customFilterTags.findIndex(t => t.id === editingFilterTag.id);
                    if (idx > 0) {
                      const arr = [...customFilterTags];
                      [arr[idx - 1], arr[idx]] = [arr[idx], arr[idx - 1]];
                      saveFilterTags(arr);
                    }
                  }} style={{
                    flex: 1, padding: 10, borderRadius: 12, background: "rgba(255,255,255,0.06)",
                    color: "var(--t3)", textAlign: "center", fontSize: 11, fontFamily: MONO, cursor: "pointer",
                  }}>← Move left</div>
                  <div className="tap" onClick={() => {
                    const idx = customFilterTags.findIndex(t => t.id === editingFilterTag.id);
                    if (idx < customFilterTags.length - 1) {
                      const arr = [...customFilterTags];
                      [arr[idx], arr[idx + 1]] = [arr[idx + 1], arr[idx]];
                      saveFilterTags(arr);
                    }
                  }} style={{
                    flex: 1, padding: 10, borderRadius: 12, background: "rgba(255,255,255,0.06)",
                    color: "var(--t3)", textAlign: "center", fontSize: 11, fontFamily: MONO, cursor: "pointer",
                  }}>Move right →</div>
                </div>

                {/* Actions */}
                <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                  <div className="tap" onClick={() => {
                    const newLabel = (filterTagInput || editingFilterTag.label).trim().toUpperCase();
                    if (newLabel) {
                      const updated = customFilterTags.map(t => t.id === editingFilterTag.id ? { ...t, label: newLabel } : t);
                      saveFilterTags(updated);
                    }
                    setEditingFilterTag(null);
                    setFilterTagInput("");
                  }} style={{
                    flex: 1, padding: 12, borderRadius: 12, background: "var(--accent)",
                    color: "#0a0a0a", textAlign: "center", fontWeight: 700, fontSize: 13, fontFamily: MONO, cursor: "pointer",
                  }}>Save</div>
                  <div className="tap" onClick={() => {
                    const updated = customFilterTags.filter(t => t.id !== editingFilterTag.id);
                    saveFilterTags(updated);
                    if (filterMode === `tag:${editingFilterTag.id}`) setFilterMode("all");
                    setEditingFilterTag(null);
                    setFilterTagInput("");
                  }} style={{
                    flex: 1, padding: 12, borderRadius: 12, background: "rgba(239,68,68,0.1)",
                    color: "#ef4444", textAlign: "center", fontWeight: 700, fontSize: 13, fontFamily: MONO, cursor: "pointer",
                  }}>Delete</div>
                </div>
              </div>
            </div>
          )}

          {/* ── REST NOW BANNER ── */}
          {showRestWarning && !isSleeping && (
            <div style={{
              margin: "0 0 12px", padding: "14px 18px",
              background: "rgba(226,75,74,0.06)", border: "1px solid rgba(226,75,74,0.2)", borderRadius: 16,
              display: "flex", alignItems: "center", justifyContent: "space-between",
            }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "var(--danger, #E24B4A)" }}>REST NOW</div>
                <div style={{ fontSize: 11, color: "var(--t4)", fontFamily: MONO, marginTop: 2 }}>Energy at {Math.round(energy)}% — you&apos;re running low</div>
              </div>
              <div
                onClick={handleSleep}
                style={{ padding: "8px 16px", background: "var(--accent)", color: "#0a0a0a", borderRadius: 50, fontWeight: 700, fontSize: 12, cursor: "pointer", flexShrink: 0 }}
              >Sleep</div>
            </div>
          )}

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

                  // Assign priority based on task state
                  const statePriority = (t: any): number => {
                    if (t.isCollab) return 5;
                    const state = getTaskState(t);
                    if (state === "active") return 0;
                    if (state === "available") return 1;
                    if (state === "overdue") return 2;
                    return 3; // upcoming
                  };

                  const allPending: any[] = [...pendingTasks.map(t => ({ ...t, isCollab: false, friendName: "" })), ...collabAsTasks]
                    .sort((a: any, b: any) => {
                      const aPri = statePriority(a);
                      const bPri = statePriority(b);
                      if (aPri !== bPri) return aPri - bPri;
                      const aTime = a.adjustedTimeMin ?? a.timeMin;
                      const bTime = b.adjustedTimeMin ?? b.timeMin;
                      // For overdue, sort by how overdue (most overdue first)
                      if (aPri === 2) return bTime - aTime;
                      return aTime - bTime;
                    });

                  const priorityTasks = allPending.filter((t: any) => {
                    if (t.isCollab) return false;
                    const state = getTaskState(t);
                    return state === "active" || state === "available" || state === "overdue";
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
                              borderRadius: 16,
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
                    const taskState = getTaskState(task);
                    const isOverdue = taskState === "overdue";
                    const isAvailable = taskState === "available";

                    return (
                      <div key={task.id} style={{ marginBottom: 8, animation: `fadeUp 0.3s ease ${i * 0.04}s both` }}>
                        <div style={{
                          background: task.urgent ? "var(--danger-fill)" : "var(--card)",
                          borderRadius: 14,
                          border: `1px solid ${isExpanded ? "var(--border2)" : isOverdue ? "rgba(226,75,74,0.3)" : task.urgent ? "transparent" : "var(--border)"}`,
                          transition: "border-radius 0.2s",
                          minHeight: 72,
                          overflow: "hidden",
                        }}>
                          <div style={{ display: "flex", alignItems: "center" }}>
                            <div className="tap" onClick={() => setExpandedTask(isExpanded ? null : task.id)} style={{ flex: 1, minWidth: 0, overflow: "hidden", padding: isExpanded ? "18px 0 14px 20px" : "18px 0 18px 22px" }}>
                              {/* Available badge */}
                              {isAvailable && (
                                <div style={{ marginBottom: 6 }}>
                                  <span className="anim-pulse" style={{ fontSize: 9, color: "var(--accent)", background: "var(--accent-10)", padding: "2px 8px", borderRadius: 50, fontFamily: MONO, fontWeight: 700, letterSpacing: 1 }}>START</span>
                                </div>
                              )}
                              {/* Overdue badge */}
                              {isOverdue && (
                                <div style={{ marginBottom: 6 }}>
                                  <span style={{ fontSize: 9, color: "var(--danger, #E24B4A)", background: "rgba(226,75,74,0.1)", padding: "2px 8px", borderRadius: 50, fontFamily: MONO, fontWeight: 700, letterSpacing: 1 }}>OVERDUE</span>
                                </div>
                              )}
                              {/* Upcoming badge */}
                              {isUpcomingSoon && !isAvailable && !isOverdue && (
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
                              {/* Overdue action buttons (inline) */}
                              {isOverdue && !isExpanded && (
                                <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
                                  <div className="tap" onClick={(e) => { e.stopPropagation(); handleDoNow(task); }} style={{ padding: "7px 16px", background: "var(--accent)", color: "#0a0a0a", borderRadius: 50, fontWeight: 700, fontSize: 11, fontFamily: MONO, cursor: "pointer" }}>Do now</div>
                                  <div className="tap" onClick={(e) => { e.stopPropagation(); skipPendingTask(task); }} style={{ padding: "7px 16px", background: "var(--badge-bg)", color: "var(--t4)", borderRadius: 50, fontWeight: 600, fontSize: 11, fontFamily: MONO, cursor: "pointer" }}>Skip</div>
                                </div>
                              )}
                            </div>
                            {/* Right side: play button or chevron */}
                            {isExpanded ? (
                              <div style={{ margin: "0 18px", padding: 8 }}>
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--play-icon)" strokeWidth="2" strokeLinecap="round"><polyline points="18 15 12 9 6 15" /></svg>
                              </div>
                            ) : isOverdue ? null : (
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
                          <div key={task.id} className="tap" onClick={() => markUndone(task)} style={{ background: "var(--card)", borderRadius: 14, padding: "18px 22px", border: "1px solid var(--border)", opacity: 0.5, display: "flex", alignItems: "center", gap: 12, cursor: "pointer", minHeight: 52, overflow: "hidden" }}>
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
                          <div key={task.id} style={{ background: "var(--card)", borderRadius: 14, padding: "18px 22px", border: "1px solid var(--border)", opacity: 0.5, display: "flex", alignItems: "center", gap: 12, minHeight: 52, overflow: "hidden" }}>
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
          </TaskSheet>
          {/* Month picker overlay — outside sheet so it renders as fixed overlay */}
          {monthPickerOpen && (
              <div onClick={() => setMonthPickerOpen(false)} style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 100, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", animation: "monthFadeIn 0.2s ease" }}>
                <div ref={monthScrollRef} onClick={(e) => e.stopPropagation()} style={{ background: "rgba(28,28,30,0.65)", backdropFilter: "blur(30px) saturate(180%)", WebkitBackdropFilter: "blur(30px) saturate(180%)", border: "none", borderRadius: 20, padding: 20, width: 320, maxWidth: "calc(100% - 48px)" }}>
                  {/* Year navigation */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, padding: "0 4px" }}>
                    <div className="tap" onClick={() => setViewYear(y => Math.max(2024, y - 1))} style={{ width: 32, height: 32, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", background: "rgba(255,255,255,0.06)" }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--t3)" strokeWidth="2" strokeLinecap="round"><polyline points="15 18 9 12 15 6" /></svg>
                    </div>
                    <span style={{ fontSize: 16, fontWeight: 700, color: "var(--t1)", fontFamily: MONO }}>{viewYear}</span>
                    <div className="tap" onClick={() => setViewYear(y => Math.min(2030, y + 1))} style={{ width: 32, height: 32, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", background: "rgba(255,255,255,0.06)" }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--t3)" strokeWidth="2" strokeLinecap="round"><polyline points="9 18 15 12 9 6" /></svg>
                    </div>
                  </div>
                  {/* Month grid — 4x3 */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8 }}>
                    {MONTHS_SHORT.map((m, i) => {
                      const isCur = i === today.getMonth() && viewYear === today.getFullYear();
                      const isSel = i === viewMonth;
                      return <div key={m} data-active={isSel ? "true" : "false"} className="tap" onClick={() => pickMonth(i)} style={{ padding: "10px 0", textAlign: "center", borderRadius: 50, fontSize: 11, fontFamily: MONO, fontWeight: 600, cursor: "pointer", background: isSel ? "#FFD000" : isCur ? "rgba(255,208,0,0.1)" : "rgba(255,255,255,0.04)", color: isSel ? "#0a0a0a" : isCur ? "var(--accent)" : "var(--t4)", transition: "all 0.15s" }}>{m}</div>;
                    })}
                  </div>
                </div>
              </div>
            )}
        </div>
      )}

      {/* ── OTHER TABS (imported components) ── */}
      {bottomTab === "community" && <PitTab />}
      {bottomTab === "friends" && <FriendsTab />}
      {bottomTab === "profile" && (
        <ProfileTab
          energy={energy}
          streak={streak}
          tasksDoneCount={tasksDoneCount}
          resetAll={resetAll}
        />
      )}

      </div>{/* end scroll-content */}

      {/* ── EDIT MODAL ── */}
      {editModal && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 200, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
          <div onClick={() => setEditModal(null)} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)" }} />
          <div style={{ position: "relative", width: "100%", maxWidth: isDesktop ? 500 : 430, background: "var(--card)", borderRadius: "24px 24px 0 0", padding: "24px 20px 36px", zIndex: 201, border: "1px solid var(--border)" }}>
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
          <div style={{ position: "relative", width: "100%", maxWidth: isDesktop ? 500 : 430, background: "var(--card)", borderRadius: "24px 24px 0 0", padding: "24px 20px 36px", zIndex: 201, border: "1px solid var(--border)" }}>
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
      {statPopup !== null && (() => {
        const pS = {
          heroLabel: { fontSize: 11, color: "var(--t5, #3a3a3a)", letterSpacing: 3, fontFamily: MONO, marginBottom: 16 } as React.CSSProperties,
          heroNum: { fontSize: 52, fontWeight: 700, lineHeight: 1, letterSpacing: -3, fontFamily: MONO } as React.CSSProperties,
          heroSub: { fontSize: 13, color: "var(--t4, #555)", marginTop: 4, fontFamily: MONO } as React.CSSProperties,
          sep: { height: 1, background: "var(--border, #1e1e1e)", margin: "16px 0" } as React.CSSProperties,
          secTitle: { fontSize: 10, color: "var(--t4, #444)", letterSpacing: 2, fontFamily: MONO, marginBottom: 14 } as React.CSSProperties,
          row: { display: "flex" as const, justifyContent: "space-between" as const, alignItems: "center" as const, padding: "8px 0" } as React.CSSProperties,
          rowLabel: { fontSize: 13, color: "var(--t3, #666)" } as React.CSSProperties,
          rowVal: { fontSize: 14, fontWeight: 700, fontFamily: MONO } as React.CSSProperties,
        };

        const doneCount = tasksDoneCount + restsDoneCount;
        const totalTaskCount = tasks.length;
        const completionPct = totalTaskCount > 0 ? Math.round((doneCount / totalTaskCount) * 100) : 0;
        const pendingCount = pendingTasks.length;

        // Week streak data
        const weekDayInits = ["M", "T", "W", "T", "F", "S", "S"];
        const todayDow = new Date().getDay();
        const mondayOff = todayDow === 0 ? 6 : todayDow - 1;
        const weekStartDate = new Date(); weekStartDate.setDate(weekStartDate.getDate() - mondayOff); weekStartDate.setHours(0,0,0,0);
        const todayIndex = mondayOff; // 0=Mon
        const weekDays = Array.from({ length: 7 }, (_, i) => {
          const d = new Date(weekStartDate); d.setDate(d.getDate() + i);
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
        let monthDone = doneCount;
        Object.entries(history).forEach(([k, v]) => { if (k.startsWith(monthKey)) monthDone += v.done; });

        // Best streak from history
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

        // Energy
        const energyVal = ePct;
        const hrsToFull = SLEEP_RESTORE_PER_HOUR > 0 ? Math.round(((100 - ePct) / SLEEP_RESTORE_PER_HOUR) * 10) / 10 : 0;
        const restoredToday = Math.round((totalRecharge / eTotal) * 100);

        // Energy ring segments
        const C = 2 * Math.PI * 90;
        const totalLost = 100 - energyVal;
        const urgentDrain = Math.min(totalLost, Math.round((totalUrgentMins * drainRates.urgent / eTotal) * 100));
        const workDrainPct = Math.min(totalLost - urgentDrain, Math.round((totalWorkMins * drainRates.work / eTotal) * 100));
        const idleDrainPct = Math.max(0, totalLost - urgentDrain - workDrainPct);

        const idleArc = (idleDrainPct / 100) * C;
        const workArc = (workDrainPct / 100) * C;
        const urgentArc = (urgentDrain / 100) * C;
        const healthArc = (energyVal / 100) * C;
        const idleOffset = 0;
        const workOffset = -(idleArc);
        const urgentOffset = -(idleArc + workArc);
        const healthOffset = -(idleArc + workArc + urgentArc);

        // ── Stat popup filter helpers ──
        const STAT_FILTERS = ["today", "week", "month", "qtr", "year"] as const;
        const STAT_FILTER_LABELS: Record<string, string> = { today: "TODAY", week: "WEEK", month: "MONTH", qtr: "QTR", year: "YEAR" };

        const getFilterDateRange = (filter: string): { start: Date; end: Date } => {
          const end = new Date();
          const start = new Date();
          switch (filter) {
            case "week":
              const dow = start.getDay();
              start.setDate(start.getDate() - (dow === 0 ? 6 : dow - 1));
              break;
            case "month":
              start.setDate(1);
              break;
            case "qtr":
              start.setMonth(start.getMonth() - (start.getMonth() % 3), 1);
              break;
            case "year":
              start.setMonth(0, 1);
              break;
            default: // today
              break;
          }
          start.setHours(0, 0, 0, 0);
          return { start, end };
        };

        const filterLabel = (f: string) => {
          if (f === "today") return "today";
          if (f === "week") return "this week";
          if (f === "month") return "this month";
          if (f === "qtr") return "this quarter";
          return "this year";
        };

        // Filtered done tasks (today = live doneTasks, others = from history)
        const getFilteredDoneTasks = () => {
          if (statFilter === "today") return doneTasks;
          // For other filters, combine today's done + history
          const { start } = getFilterDateRange(statFilter);
          const combined = [...doneTasks]; // today's
          Object.entries(history).forEach(([k, v]) => {
            const d = new Date(k);
            if (d >= start && !isSameDay(d, new Date()) && v.done > 0) {
              // History entries don't have full task objects, so we create placeholders
              for (let i = 0; i < v.done; i++) {
                combined.push({ id: `hist-${k}-${i}`, name: `Task from ${k}`, completedAt: d.getTime(), actual_duration: 0, duration: 0, type: "work" } as any);
              }
            }
          });
          return combined;
        };

        const getFilteredDoneCount = () => {
          if (statFilter === "today") return doneCount;
          const { start } = getFilterDateRange(statFilter);
          let count = doneCount; // today
          Object.entries(history).forEach(([k, v]) => {
            const d = new Date(k);
            if (d >= start && !isSameDay(d, new Date())) count += v.done;
          });
          return count;
        };

        const getFilteredTotalCount = () => {
          if (statFilter === "today") return totalTaskCount;
          const { start } = getFilterDateRange(statFilter);
          let count = totalTaskCount;
          Object.entries(history).forEach(([k, v]) => {
            const d = new Date(k);
            if (d >= start && !isSameDay(d, new Date())) count += v.tasks;
          });
          return count;
        };

        const getFilteredTrackedMin = () => {
          if (statFilter === "today") return totalTracked;
          const { start } = getFilterDateRange(statFilter);
          let min = totalTracked;
          Object.entries(history).forEach(([k, v]) => {
            const d = new Date(k);
            if (d >= start && !isSameDay(d, new Date())) min += v.totalMin;
          });
          return min;
        };

        const getFilteredSessionCount = () => {
          if (statFilter === "today") return doneTasks.length;
          const { start } = getFilterDateRange(statFilter);
          let count = doneTasks.length;
          Object.entries(history).forEach(([k, v]) => {
            const d = new Date(k);
            if (d >= start && !isSameDay(d, new Date())) count += v.done;
          });
          return count;
        };

        const getFilteredSkipCount = () => {
          if (statFilter === "today") return skippedCount;
          // For non-today, we only have today's skip data until Supabase history
          return skippedCount;
        };

        const getFilteredCancelCount = () => {
          // Cancelled tasks — count from today's tasks with status
          const todayCancelled = tasks.filter(t => (t as any).status === "cancelled").length;
          return todayCancelled;
        };

        const getDaysInFilter = () => {
          const { start, end } = getFilterDateRange(statFilter);
          return Math.max(1, Math.ceil((end.getTime() - start.getTime()) / 86400000));
        };

        const filteredDoneCount = getFilteredDoneCount();
        const filteredTotalCount = getFilteredTotalCount();
        const filteredCompletionPct = filteredTotalCount > 0 ? Math.round((filteredDoneCount / filteredTotalCount) * 100) : 0;
        const filteredTrackedMin = getFilteredTrackedMin();
        const filteredSessionCount = getFilteredSessionCount();
        const filteredAvgPerDay = (filteredDoneCount / getDaysInFilter()).toFixed(1);
        const filteredAvgHrsPerDay = (filteredTrackedMin / 60 / getDaysInFilter()).toFixed(1);
        const filteredSkipCount = getFilteredSkipCount();
        const filteredCancelCount = getFilteredCancelCount();

        // Energy color for power bar
        const popupEnergyColor = popupIsCharging ? getChargingColor(energyVal) : (energyVal > 50 ? "#22c55e" : energyVal >= 20 ? "#facc15" : "#ef4444");

        // ── Shared filter pills renderer ──
        const renderFilterPills = (accentColor: string) => (
          <div style={{ display: "flex", gap: 6, overflowX: "auto", padding: "14px 0 12px" }} className="no-scrollbar">
            {STAT_FILTERS.map(f => (
              <div
                key={f}
                className="tap"
                onClick={() => setStatFilter(f)}
                style={{
                  flexShrink: 0, padding: "5px 12px", borderRadius: 20, cursor: "pointer",
                  background: statFilter === f ? accentColor : "transparent",
                  border: statFilter === f ? "none" : "1px solid var(--border)",
                  color: statFilter === f ? "#060a12" : "var(--t5)",
                  fontSize: 9, fontWeight: statFilter === f ? 700 : 600,
                  letterSpacing: 1, fontFamily: MONO,
                }}
              >{STAT_FILTER_LABELS[f]}</div>
            ))}
          </div>
        );

        // ── Render functions ──

        const renderDonePopup = () => {
          const filteredDone = getFilteredDoneTasks();
          const sortedDone = statSortNewest ? [...filteredDone].reverse() : filteredDone;

          return (
            <>
              {/* Top section with SVG */}
              <div style={{ position: "relative", overflow: "hidden", minHeight: 160, paddingBottom: 12, display: "flex", flexDirection: "column", justifyContent: "space-between", borderRadius: "20px 20px 0 0" }}>
                <div style={{ position: "relative", zIndex: 1 }}>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
                    <span style={{ fontSize: 34, fontWeight: 800, color: "#22c55e", lineHeight: 1 }}>{filteredDoneCount}</span>
                    <span style={{ fontSize: 15, fontWeight: 400, color: "var(--t5)" }}>/ {filteredTotalCount}</span>
                  </div>
                  <div style={{ fontSize: 11, color: "var(--t5)", marginTop: 6 }}>{filteredCompletionPct}% completion rate</div>
                  <div style={{ fontSize: 11, color: "var(--t5)", marginTop: 4 }}>{filteredAvgPerDay} avg / day</div>
                </div>
                <div style={{ position: "relative", zIndex: 1, marginTop: 16 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.9)", lineHeight: 1 }}>TASKS</div>
                  <div style={{ fontSize: 11, fontWeight: 400, fontStyle: "italic", color: "var(--t5)", lineHeight: 1, marginTop: 2 }}>completed {filterLabel(statFilter)}</div>
                </div>
                {/* Paper with checkmarks SVG */}
                <svg viewBox="0 0 120 150" style={{ position: "absolute", right: -40, top: -30, bottom: -16, height: "calc(100% + 46px)", width: "auto" }}>
                  <g transform="rotate(-7.8, 60, 75)">
                    <path d="M20 8 L100 8 Q100 8 100 12 L100 142 Q100 146 96 146 L24 146 Q20 146 20 142 Z" fill="rgba(255,255,255,0.025)" />
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

              <div style={{ height: 1, background: "var(--border)", margin: "0 -24px" }} />

              {/* Filter pills */}
              {renderFilterPills("#22c55e")}

              {/* Task list */}
              {filteredDone.length === 0 ? (
                <div style={{ textAlign: "center", padding: "28px 16px", color: "var(--t5)", fontSize: 11, fontFamily: MONO }}>
                  No tasks completed yet
                </div>
              ) : (
                <>
                  {(statFilter === "year" || statFilter === "qtr") && (
                    <div className="tap" onClick={() => setStatSortNewest(!statSortNewest)} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, cursor: "pointer" }}>
                      <span style={{ fontSize: 9, color: "var(--t5)", letterSpacing: 1, fontFamily: MONO }}>{statSortNewest ? "LATEST FIRST" : "OLDEST FIRST"}</span>
                      <span style={{ fontSize: 9, color: "var(--t5)" }}>↕</span>
                    </div>
                  )}
                  <div className="no-scrollbar" style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 180, overflowY: "auto" }}>
                    {sortedDone.slice(0, 50).map((task, i) => (
                      <div key={task.id || i} style={{
                        display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 10,
                        background: "var(--badge-bg, rgba(255,255,255,0.025))", border: "1px solid var(--border)",
                      }}>
                        <div style={{ width: 18, height: 18, borderRadius: 5, background: "rgba(34,197,94,0.2)", border: "1.5px solid #22c55e", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          <span style={{ fontSize: 10, color: "#22c55e", fontWeight: 700 }}>✓</span>
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 11, color: "var(--t4)", textDecoration: "line-through", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{task.name}</div>
                          <div style={{ fontSize: 9, color: "var(--t5)", marginTop: 2, fontFamily: MONO }}>
                            {task.completedAt ? new Date(task.completedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }) + " · " + new Date(task.completedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : "—"}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </>
          );
        };

        const renderTrackedPopup = () => {
          // Build session list from done tasks with time info
          const sessions = doneTasks.map(t => {
            const dur = t.actual_duration ?? t.duration;
            const endTime = t.completedAt || Date.now();
            const startTime = endTime - dur * 60000;
            return { ...t, startTime, endTime: endTime, trackedMin: dur, status: "done" as const };
          });

          // Add skipped tasks
          const skippedTasks = tasks.filter(t => (t as any).status === "skipped" || (t as any).skipped);
          skippedTasks.forEach(t => {
            sessions.push({ ...t, startTime: 0, endTime: 0, trackedMin: 0, status: "skip" as const } as any);
          });

          // Add cancelled tasks
          const cancelledTasks = tasks.filter(t => (t as any).status === "cancelled");
          cancelledTasks.forEach(t => {
            sessions.push({ ...t, startTime: 0, endTime: 0, trackedMin: 0, status: "cancel" as const } as any);
          });

          const sortedSessions = statSortNewest ? [...sessions].reverse() : sessions;

          return (
            <>
              {/* Top section with stopwatch SVG */}
              <div style={{ position: "relative", overflow: "hidden", minHeight: 160, paddingBottom: 12, display: "flex", flexDirection: "column", justifyContent: "space-between", borderRadius: "20px 20px 0 0" }}>
                <div style={{ position: "relative", zIndex: 1 }}>
                  <div style={{ fontSize: 34, fontWeight: 800, color: "#facc15", lineHeight: 1 }}>{(filteredTrackedMin / 60).toFixed(1)}</div>
                  <div style={{ fontSize: 11, color: "var(--t5)", marginTop: 6 }}>{filteredSessionCount} sessions {filterLabel(statFilter)}</div>
                  <div style={{ fontSize: 11, color: "var(--t5)", marginTop: 4 }}>{filteredAvgHrsPerDay} avg / day</div>
                </div>
                <div style={{ position: "relative", zIndex: 1, marginTop: 16 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.9)", lineHeight: 1 }}>HRS</div>
                  <div style={{ fontSize: 11, fontWeight: 400, fontStyle: "italic", color: "var(--t5)", lineHeight: 1, marginTop: 2 }}>tracked {filterLabel(statFilter)}</div>
                </div>
                {/* Stopwatch SVG — longer hands */}
                <svg viewBox="0 0 120 140" style={{ position: "absolute", right: -49, top: -29, bottom: -29, height: "calc(100% + 58px)", width: "auto" }}>
                  <g transform="rotate(-7.8, 60, 70)">
                    <circle cx="60" cy="70" r="52" fill="rgba(255,255,255,0.025)" />
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

              <div style={{ height: 1, background: "var(--border)", margin: "0 -24px" }} />

              {/* Filter pills */}
              {renderFilterPills("#facc15")}

              {/* Session list */}
              {sessions.length === 0 ? (
                <div style={{ textAlign: "center", padding: "28px 16px", color: "var(--t5)", fontSize: 11, fontFamily: MONO }}>
                  No sessions tracked yet
                </div>
              ) : (
                <>
                  {(statFilter === "year" || statFilter === "qtr") && (
                    <div className="tap" onClick={() => setStatSortNewest(!statSortNewest)} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, cursor: "pointer" }}>
                      <span style={{ fontSize: 9, color: "var(--t5)", letterSpacing: 1, fontFamily: MONO }}>{statSortNewest ? "LATEST FIRST" : "OLDEST FIRST"}</span>
                      <span style={{ fontSize: 9, color: "var(--t5)" }}>↕</span>
                    </div>
                  )}
                  <div className="no-scrollbar" style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 220, overflowY: "auto" }}>
                    {sortedSessions.slice(0, 50).map((s: any, i: number) => {
                      const isSkip = s.status === "skip";
                      const isCancel = s.status === "cancel";
                      const isRest = s.type === "rest";
                      const barColor = isCancel ? "rgba(239,68,68,0.3)" : isSkip ? "rgba(255,255,255,0.1)" : isRest ? "var(--rest, #6b8a7a)" : "#facc15";
                      const durColor = isRest ? "#6b8a7a" : "#facc15";

                      return (
                        <div key={s.id || i} style={{
                          display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 10,
                          background: (isSkip || isCancel) ? "var(--badge-bg, rgba(255,255,255,0.015))" : "var(--badge-bg, rgba(255,255,255,0.025))",
                          border: "1px solid var(--border)",
                          opacity: (isSkip || isCancel) ? 0.5 : 1,
                        }}>
                          <div style={{ width: 4, height: 34, borderRadius: 2, background: barColor, flexShrink: 0 }} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{
                              fontSize: 11, color: (isSkip || isCancel) ? "var(--t5)" : "var(--t4)",
                              textDecoration: isCancel ? "line-through" : "none",
                              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                            }}>{s.name}</div>
                            <div style={{ fontSize: 9, color: "var(--t5)", marginTop: 3, fontFamily: MONO }}>
                              {(isSkip || isCancel) ? (
                                `${s.duration || 0}m planned`
                              ) : s.startTime > 0 ? (
                                `${new Date(s.startTime).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })} → ${new Date(s.endTime).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`
                              ) : "—"}
                            </div>
                          </div>
                          <div style={{ flexShrink: 0 }}>
                            {isSkip ? (
                              <div style={{ fontSize: 9, fontWeight: 600, color: "var(--t5)", letterSpacing: 1, fontFamily: MONO, background: "var(--border)", padding: "3px 8px", borderRadius: 4 }}>SKIP</div>
                            ) : isCancel ? (
                              <div style={{ fontSize: 9, fontWeight: 600, color: "rgba(239,68,68,0.4)", letterSpacing: 1, fontFamily: MONO, background: "rgba(239,68,68,0.06)", padding: "3px 8px", borderRadius: 4 }}>CANCEL</div>
                            ) : (
                              <div style={{ fontSize: 12, fontWeight: 700, color: durColor }}>{fmtDur(s.trackedMin)}</div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}

              {/* Bottom: skip/cancel counts */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 14 }}>
                {filteredSkipCount > 0 ? (
                  <div style={{ fontSize: 9, fontWeight: 600, color: "var(--t5)", fontFamily: MONO, background: "var(--border)", padding: "3px 8px", borderRadius: 4 }}>{filteredSkipCount} SKIP</div>
                ) : <div />}
                {filteredCancelCount > 0 ? (
                  <div style={{ fontSize: 9, fontWeight: 600, color: "rgba(239,68,68,0.4)", fontFamily: MONO, background: "rgba(239,68,68,0.06)", padding: "3px 8px", borderRadius: 4 }}>{filteredCancelCount} CANCEL</div>
                ) : <div />}
              </div>
            </>
          );
        };

        const renderEnergyPopup = () => {
          // Build energy event log
          const energyEvents: { type: "drain" | "charge" | "sleep" | "idle" | "rest"; name: string; detail: string; delta: number }[] = [];

          // Work/urgent drains from done tasks
          doneTasks.forEach(t => {
            const dur = t.actual_duration ?? t.duration;
            const rate = t.type === "rest" ? drainRates.rest : (t as any).urgent ? drainRates.urgent : drainRates.work;
            const delta = t.type === "rest" ? Math.round(rate * dur) : -Math.round(rate * dur);
            const startTime = (t.completedAt || Date.now()) - dur * 60000;
            energyEvents.push({
              type: t.type === "rest" ? "rest" : "drain",
              name: t.name,
              detail: `${new Date(startTime).toLocaleDateString("en-US", { month: "short", day: "numeric" })} · ${dur}m ${t.type === "rest" ? "rest" : "active"}`,
              delta,
            });
          });

          // Idle drain
          if (idleDrainPct > 0) {
            energyEvents.push({ type: "idle", name: "Idle drain", detail: "Background energy loss", delta: -idleDrainPct });
          }

          // Sleep restore (if slept today)
          if (restoredToday > 0) {
            energyEvents.push({ type: "sleep", name: "Sleep", detail: "Overnight recharge", delta: restoredToday });
          }

          const totalDrained = energyEvents.filter(e => e.delta < 0 && e.type !== "idle").reduce((s, e) => s + e.delta, 0);
          const totalIdleDrain = energyEvents.filter(e => e.type === "idle").reduce((s, e) => s + e.delta, 0);

          return (
            <>
              {/* Top section with lightning bolt SVG */}
              <div style={{ position: "relative", overflow: "hidden", minHeight: 160, paddingBottom: 12, display: "flex", flexDirection: "column", justifyContent: "space-between", borderRadius: "20px 20px 0 0" }}>
                <div style={{ position: "relative", zIndex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center" }}>
                    <span style={{ fontSize: 34, fontWeight: 800, color: popupEnergyColor, lineHeight: 1 }}>{energyVal}</span>
                    <span style={{ fontSize: 15, fontWeight: 700, color: popupEnergyColor }}>%</span>
                    {popupIsCharging && (
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 12 12"
                        fill="none"
                        style={{
                          opacity: popupArrowVisible ? 1 : 0.15,
                          transition: "opacity 0.3s",
                          marginLeft: 3,
                        }}
                      >
                        <path
                          d="M6 10V2M6 2L3 5M6 2L9 5"
                          stroke={popupEnergyColor}
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--t5)", marginTop: 6 }}>
                    {isSleeping ? "currently sleeping" : energyVal >= 100 ? "fully charged" : `${energyVal < 20 ? "critically low" : energyVal < 50 ? "getting low" : "healthy"}`}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--t5)", marginTop: 4 }}>
                    {restoredToday > 0 ? `+${restoredToday}% restored today` : "no recharge yet today"}
                  </div>
                </div>
                <div style={{ position: "relative", zIndex: 1, marginTop: 16 }}>
                  {popupIsCharging ? (
                    <div style={{ fontSize: 12, fontWeight: 600, color: popupEnergyColor, lineHeight: 1 }}>charging...</div>
                  ) : (
                    <>
                      <div style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.9)", lineHeight: 1 }}>{hrsToFull} hrs</div>
                      <div style={{ fontSize: 11, fontWeight: 400, fontStyle: "italic", color: "var(--t5)", lineHeight: 1, marginTop: 2 }}>to full charge</div>
                    </>
                  )}
                </div>
                {/* Lightning bolt SVG */}
                <svg viewBox="0 0 130 180" style={{ position: "absolute", right: -46, top: -24, bottom: -24, height: "calc(100% + 48px)", width: "auto" }}>
                  <defs>
                    <clipPath id="popup-bolt-clip">
                      <path d="M70 4 Q68 0 64 2 L20 78 Q15 85 24 85 L39 85 Q43 85 41 90 L30 174 Q28 182 36 176 L108 76 Q114 68 105 68 L82 68 Q78 68 80 62 L100 6 Q102 0 96 2 Z" />
                    </clipPath>
                  </defs>
                  <g transform="rotate(-7.8, 65, 90)">
                    <path d="M70 4 Q68 0 64 2 L20 78 Q15 85 24 85 L39 85 Q43 85 41 90 L30 174 Q28 182 36 176 L108 76 Q114 68 105 68 L82 68 Q78 68 80 62 L100 6 Q102 0 96 2 Z" fill="rgba(255,255,255,0.025)" />
                    <g clipPath="url(#popup-bolt-clip)">
                      {popupIsCharging && (
                        <rect
                          x="0"
                          y={180 - (ePct / 100) * 180}
                          width="130"
                          height={(ePct / 100) * 180}
                          fill={popupEnergyColor.startsWith("rgb(") ? popupEnergyColor.replace("rgb(", "rgba(").replace(")", ",0.12)") : popupEnergyColor + "1F"}
                          style={{ transition: "y 1s ease, height 1s ease, fill 1s ease" }}
                        />
                      )}
                      <path fill={popupEnergyColor} opacity="0.35">
                        <animate attributeName="d" dur="7s" repeatCount="indefinite"
                          keyTimes="0;0.12;0.28;0.45;0.58;0.72;0.88;1"
                          keySplines="0.4 0 0.6 1;0.2 0 0.8 1;0.5 0 0.3 1;0.3 0 0.7 1;0.6 0 0.4 1;0.2 0 0.9 1;0.4 0 0.6 1"
                          calcMode="spline"
                          values={waveValues(ePct, "back")} />
                      </path>
                      <path fill={popupEnergyColor} opacity="1">
                        <animate attributeName="d" dur="5.5s" repeatCount="indefinite"
                          keyTimes="0;0.15;0.3;0.42;0.6;0.75;0.9;1"
                          keySplines="0.3 0 0.7 1;0.5 0 0.3 1;0.2 0 0.8 1;0.6 0 0.4 1;0.3 0 0.8 1;0.5 0 0.5 1;0.4 0 0.6 1"
                          calcMode="spline"
                          values={waveValues(ePct, "front")} />
                      </path>
                    </g>
                  </g>
                </svg>
              </div>

              <div style={{ height: 1, background: "var(--border)", margin: "0 -24px" }} />

              {/* Filter pills */}
              {renderFilterPills(popupEnergyColor)}

              {/* Energy event log */}
              {energyEvents.length === 0 ? (
                <div style={{ textAlign: "center", padding: "28px 16px", color: "var(--t5)", fontSize: 11, fontFamily: MONO }}>
                  No energy events yet
                </div>
              ) : (
                <div className="no-scrollbar" style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 220, overflowY: "auto" }}>
                  {energyEvents.map((ev, i) => {
                    const isCharge = ev.delta > 0;
                    const iconColor = ev.type === "idle" ? "rgba(255,255,255,0.25)" : ev.type === "rest" ? "#6b8a7a" : isCharge ? "#22c55e" : "#ef4444";
                    const iconBg = ev.type === "idle" ? "rgba(255,255,255,0.03)" : ev.type === "rest" ? "rgba(107,138,122,0.15)" : isCharge ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)";
                    const iconBorder = ev.type === "idle" ? "rgba(255,255,255,0.08)" : ev.type === "rest" ? "rgba(107,138,122,0.3)" : isCharge ? "rgba(34,197,94,0.3)" : "rgba(239,68,68,0.3)";
                    const valColor = ev.type === "idle" ? "var(--t5)" : ev.type === "rest" ? "#6b8a7a" : isCharge ? "#22c55e" : "#ef4444";

                    return (
                      <div key={i} style={{
                        display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 10,
                        background: "var(--badge-bg, rgba(255,255,255,0.025))", border: "1px solid var(--border)",
                      }}>
                        <div style={{
                          width: 18, height: 18, borderRadius: 5,
                          background: iconBg, border: `1.5px solid ${iconBorder}`,
                          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                        }}>
                          <span style={{ fontSize: 11, color: iconColor }}>{isCharge ? "↑" : "↓"}</span>
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 11, color: "var(--t4)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ev.name}</div>
                          <div style={{ fontSize: 9, color: "var(--t5)", marginTop: 3, fontFamily: MONO }}>{ev.detail}</div>
                        </div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: valColor, flexShrink: 0 }}>
                          {ev.delta > 0 ? "+" : ""}{ev.delta}%
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Sleep button if not sleeping */}
              {!isSleeping && energyVal < 100 && (
                <div
                  className="tap"
                  onClick={handleSleep}
                  style={{ marginTop: 12, padding: 12, background: popupEnergyColor, color: "#0a0a0a", borderRadius: 50, fontWeight: 700, fontSize: 13, fontFamily: MONO, textAlign: "center", cursor: "pointer" }}
                >Sleep now</div>
              )}

              {/* Wake button if sleeping */}
              {isSleeping && (
                <div
                  className="tap"
                  onClick={handleWake}
                  style={{ marginTop: 12, padding: 12, background: "var(--accent)", color: "#0a0a0a", borderRadius: 50, fontWeight: 700, fontSize: 13, fontFamily: MONO, textAlign: "center", cursor: "pointer" }}
                >Wake up</div>
              )}

              {/* Bottom badges: drained / charged / idle */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 14 }}>
                {totalDrained < 0 ? (
                  <div style={{ fontSize: 9, fontWeight: 600, color: "rgba(239,68,68,0.5)", fontFamily: MONO, background: "rgba(239,68,68,0.06)", padding: "3px 8px", borderRadius: 4 }}>{totalDrained}% drained</div>
                ) : <div style={{ fontSize: 9, fontWeight: 600, color: "rgba(239,68,68,0.5)", fontFamily: MONO, background: "rgba(239,68,68,0.06)", padding: "3px 8px", borderRadius: 4 }}>-0% drained</div>}
                {restoredToday > 0 ? (
                  <div style={{ fontSize: 9, fontWeight: 600, color: "rgba(34,197,94,0.5)", fontFamily: MONO, background: "rgba(34,197,94,0.06)", padding: "3px 8px", borderRadius: 4 }}>+{restoredToday}% charged</div>
                ) : <div style={{ fontSize: 9, fontWeight: 600, color: "rgba(34,197,94,0.5)", fontFamily: MONO, background: "rgba(34,197,94,0.06)", padding: "3px 8px", borderRadius: 4 }}>+0% charged</div>}
                {totalIdleDrain < 0 ? (
                  <div style={{ fontSize: 9, fontWeight: 600, color: "var(--t5)", fontFamily: MONO, background: "var(--border)", padding: "3px 8px", borderRadius: 4 }}>{totalIdleDrain}% idle</div>
                ) : <div style={{ fontSize: 9, fontWeight: 600, color: "var(--t5)", fontFamily: MONO, background: "var(--border)", padding: "3px 8px", borderRadius: 4 }}>-0% idle</div>}
              </div>
            </>
          );
        };

        return (
          <div
            style={{
              position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 200,
              display: "flex", flexDirection: "column", alignItems: "stretch", justifyContent: "center", padding: "40px 0",
            }}
            onClick={() => setStatPopup(null)}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              onTouchStart={(e) => { swipeStartX.current = e.touches[0].clientX; }}
              onTouchMove={(e) => { if (swipeStartX.current === null) return; swipeDelta.current = e.touches[0].clientX - swipeStartX.current; }}
              onTouchEnd={() => {
                if (Math.abs(swipeDelta.current) > 60) {
                  if (swipeDelta.current < 0 && statPopup < 2) setStatPopup(statPopup + 1);
                  else if (swipeDelta.current > 0 && statPopup > 0) setStatPopup(statPopup - 1);
                }
                swipeStartX.current = null; swipeDelta.current = 0;
              }}
              style={{
                background: "rgba(28, 28, 30, 0.65)", backdropFilter: "blur(30px) saturate(180%)", WebkitBackdropFilter: "blur(30px) saturate(180%)", borderRadius: 20, margin: "0 auto", width: "calc(100% - 48px)", maxWidth: 320, flex: "none",
                display: "flex", flexDirection: "column", position: "relative",
                maxHeight: "85vh", overflowY: "auto", overflowX: "hidden", border: "1px solid rgba(255,255,255,0.12)",
                WebkitOverflowScrolling: "touch", animation: "popupSlideUp 0.25s ease",
              }}
              className="no-scrollbar"
            >
              {/* Content area — no close button, click outside closes */}
              <div style={{ padding: "20px 24px 20px", display: "flex", flexDirection: "column" }}>
                {statPopup === 0 && renderDonePopup()}
                {statPopup === 1 && renderTrackedPopup()}
                {statPopup === 2 && renderEnergyPopup()}

                {/* Dot indicators */}
                <div style={{ paddingTop: 18 }}>
                  <div style={{ display: "flex", gap: 6, justifyContent: "center" }}>
                    {[0, 1, 2].map((i) => (
                      <div key={i} onClick={() => { setStatPopup(i); setStatFilter("today"); }} style={{
                        width: statPopup === i ? 20 : 6, height: 6,
                        borderRadius: statPopup === i ? 3 : "50%",
                        background: statPopup === i ? "var(--accent)" : "var(--play-border, #2a2a2a)",
                        cursor: "pointer", transition: "all 0.2s ease",
                      }} />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── WAKE POPUP ── */}
      {showWakePopup && isSleeping && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 210,
          display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
        }}>
          <div style={{
            background: "var(--card)", border: "1px solid var(--border)", borderRadius: 20,
            padding: 28, width: 300, maxWidth: "90vw", textAlign: "center",
          }}>
            <div style={{ marginBottom: 16 }}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.5">
                <circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
                <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
              </svg>
            </div>
            <div style={{ fontSize: 18, fontWeight: 700, color: "var(--t1)", marginBottom: 6 }}>Start the day?</div>
            <div style={{ fontSize: 13, color: "var(--t4)", marginBottom: 4, fontFamily: MONO }}>
              Slept {sleepStartTime ? Math.round((Date.now() - sleepStartTime) / 3600000 * 10) / 10 : 0} hours
            </div>
            <div style={{ fontSize: 13, color: "var(--accent)", marginBottom: 20, fontFamily: MONO }}>
              +{sleepStartTime ? Math.round(Math.min(100, ((Date.now() - sleepStartTime) / 3600000) * SLEEP_RESTORE_PER_HOUR)) : 0}% energy restored
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <div
                onClick={handleWake}
                style={{
                  flex: 1, padding: 12, background: "var(--accent)", color: "#0a0a0a",
                  borderRadius: 50, fontWeight: 700, fontSize: 14, cursor: "pointer", textAlign: "center",
                }}
              >Yes, let&apos;s go</div>
              <div
                onClick={handleStillResting}
                style={{
                  flex: 1, padding: 12, background: "var(--card)", color: "var(--t4)",
                  borderRadius: 50, fontWeight: 600, fontSize: 14, cursor: "pointer", textAlign: "center",
                  border: "1px solid var(--border)",
                }}
              >Still resting</div>
            </div>
          </div>
        </div>
      )}

    </div>
  );

  const timelineElement = isWideDesktop && bottomTab === "main" ? (
    <DayTimeline
      tasks={sorted}
      activeTask={activeTask}
      getDisplayTimeMin={getDisplayTimeMin}
      getDisplayTime={getDisplayTime}
    />
  ) : undefined;

  return (
    <div data-theme="dark" className="app-root" style={{ minHeight: "100dvh", height: "100dvh", display: "flex", flexDirection: "row", overflow: "hidden", position: "relative", background: "var(--bg)", fontFamily: BODY, color: "var(--t2)" }}>
      {isDesktop ? (
        <ResizableLayout
          sideNavCollapsed={sideNavCollapsed}
          onSideNavCollapse={(collapsed) => setSideNavCollapsed(collapsed)}
          sideNav={sideNavElement}
          content={appContent}
          timeline={timelineElement}
        />
      ) : (
        <>
          {appContent}
          <BottomNav active={bottomTab} onChange={handleTabChange} onAdd={() => setShowCreateSheet(true)} expanded={navExpanded} onExpand={expandNav} />
        </>
      )}
    </div>
  );
}
