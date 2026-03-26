// ═══ PITGOAL v9.0 — Constants & mock data ═══

import type { DrainRates, Friend, ChatMessage, CollabTask, FriendActivity } from "./types";

// ── Storage keys ──
export const STORAGE_KEY = "doit-v8-shift";
export const PLAN_KEY = "doit-v8-plan";
export const SETTINGS_KEY = "doit-v8-settings";

// ── Defaults ──
export const GRACE_PERIOD_MS = 15 * 60 * 1000; // 15 min

export const DEFAULT_RATES: DrainRates = {
  idle: 0.5, work: 1.0, urgent: 1.5, rest: 0.3,
  wakeHour: 6, wakeMinute: 30,
  sleepHour: 23, sleepMinute: 30,
  maxEnergyHours: 17,
};

export const RATE_LIMITS = {
  idle:   { min: 0.1, max: 1.0 },
  work:   { min: 0.5, max: 2.0 },
  urgent: { min: 1.0, max: 3.0 },
  rest:   { min: 0.1, max: 1.0 },
};

// ── Font family tokens ──
export const DISPLAY = "'Sora', sans-serif";
export const BODY = "'Plus Jakarta Sans', sans-serif";
export const MONO = "'IBM Plex Mono', monospace";

// ── Phase cards (mission tracker) ──
export const PHASE_CARDS = [
  { id: "p1", label: "PHASE 1", title: "Pre-Piscine prep",    pct: 43, done: 3, total: 7 },
  { id: "p2", label: "PHASE 2", title: "The Piscine",         pct: 0,  done: 0, total: 5 },
  { id: "p3", label: "PHASE 3", title: "Cadet + Security+",   pct: 0,  done: 0, total: 7 },
  { id: "p4", label: "PHASE 4", title: "First security role",  pct: 0,  done: 0, total: 6 },
  { id: "p5", label: "PHASE 5", title: "Level up",             pct: 0,  done: 0, total: 7 },
];

// ── Income milestones ──
export const INCOME = [
  { label: "RM4-6K",   desc: "SOC Analyst L1" },
  { label: "RM6-9K",   desc: "+CEH/CySA+" },
  { label: "RM10-15K", desc: "Remote SG/US" },
  { label: "RM15-25K+", desc: "GRC / Sales Eng" },
];

// ── Calendar events ──
export const EVENTS: Record<string, string> = {
  "2026-01-01": "New Year",   "2026-01-29": "Thaipusam",     "2026-02-01": "Fed Territory",
  "2026-02-17": "CNY Day 1",  "2026-02-18": "CNY Day 2",     "2026-03-20": "Nuzul Quran",
  "2026-03-31": "Hari Raya",  "2026-04-01": "Raya Day 2",    "2026-04-06": "Piscine starts",
  "2026-05-01": "Labour Day", "2026-05-02": "Full EHub return","2026-05-12": "Vesak Day",
  "2026-06-02": "Agong Bday", "2026-06-07": "Hari Raya Haji","2026-07-07": "Awal Muharram",
  "2026-08-31": "Merdeka",    "2026-09-16": "M'sia Day",     "2026-10-15": "Sec+ target",
  "2026-10-20": "Deepavali",  "2026-12-25": "Christmas",     "2026-12-31": "Year review",
};

export const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
export const MONTHS_SHORT = ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];

// ── Friends data (empty — populated at runtime) ──
export const MOCK_FRIENDS: Friend[] = [];
export const MOCK_CHATS: Record<string, ChatMessage[]> = {};
export const MOCK_COLLAB_TASKS: CollabTask[] = [];
export const FRIEND_ACTIVITY: FriendActivity[] = [];
