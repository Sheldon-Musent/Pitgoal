// ═══ PITGOAL v9.0 — Utility functions ═══

import type { Task, CmdCategory } from "./types";

// ── Formatting ──
export const pad = (n: number) => String(n).padStart(2, "0");
export const fmtTime = (h: number, m: number) => `${pad(h)}:${pad(m)}`;
export const fmtDur = (mins: number) => {
  if (mins < 60) return `${Math.round(mins)}m`;
  const h = Math.floor(mins / 60);
  const m = Math.round(mins % 60);
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
};

// ── Date ──
export const dateKey = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export const nowMinutes = () => {
  const n = new Date();
  return n.getHours() * 60 + n.getMinutes();
};

export const isSameDay = (a: Date, b: Date) =>
  a.getDate() === b.getDate() && a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear();

export const getAllDatesInMonth = (year: number, month: number) => {
  const days = new Date(year, month + 1, 0).getDate();
  return Array.from({ length: days }, (_, i) => new Date(year, month, i + 1));
};

export const getMYDate = () =>
  new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kuala_Lumpur" });

// ── ID generation ──
export const genId = () =>
  Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

// ── Task display helpers ──
export const getDisplayTime = (task: Task) => {
  const mins = task.adjustedTimeMin ?? task.timeMin;
  return fmtTime(Math.floor(mins / 60) % 24, mins % 60);
};

export const getDisplayTimeMin = (task: Task) =>
  task.adjustedTimeMin ?? task.timeMin;

// ── Command parser ──
export function parseCmd(input: string, category: CmdCategory = "task"): Task | null {
  let text = input.trim();
  if (!text) return null;

  let type = category === "rest" ? "rest" : "work";
  let urgent = false;

  if (/\burgent\b/i.test(text)) { urgent = true; text = text.replace(/\burgent\b/i, ""); }
  if (/\brest\b/i.test(text))   { type = "rest"; text = text.replace(/\brest\b/i, ""); }
  else if (/\bwork\b/i.test(text)) { text = text.replace(/\bwork\b/i, ""); }

  let duration = 60;
  const durH = text.match(/(\d+\.?\d*)\s*h(?:r|rs|ours?)?/i);
  const durM = text.match(/(\d+)\s*m(?:in|ins|inutes?)?/i);
  if (durH)      { duration = parseFloat(durH[1]) * 60; text = text.replace(durH[0], ""); }
  else if (durM) { duration = parseInt(durM[1]);         text = text.replace(durM[0], ""); }

  let hour: number | null = null, minute = 0;
  const t12 = text.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)/i);
  const t24 = text.match(/(\d{1,2}):(\d{2})/);
  if (t12) {
    hour = parseInt(t12[1]); minute = t12[2] ? parseInt(t12[2]) : 0;
    if (t12[3].toLowerCase() === "pm" && hour !== 12) hour += 12;
    if (t12[3].toLowerCase() === "am" && hour === 12) hour = 0;
    text = text.replace(t12[0], "");
  } else if (t24) {
    hour = parseInt(t24[1]); minute = parseInt(t24[2]);
    text = text.replace(t24[0], "");
  }

  const name = text.replace(/\s+/g, " ").trim();
  if (!name) return null;

  if (hour === null) {
    const now = new Date();
    hour = now.getHours();
    minute = Math.ceil(now.getMinutes() / 5) * 5;
    if (minute >= 60) { hour++; minute = 0; }
  }

  return {
    name, category: category as any, type, urgent,
    time: fmtTime(hour, minute),
    timeMin: hour * 60 + minute,
    duration, planned_duration: duration,
    actual_duration: null,
    id: genId(),
    status: "pending",
    adjustedTimeMin: null,
    skippedAt: null,
  };
}

// ── Auto-shift engine ──
export function autoShift(tasks: Task[], fromTimeMin: number, delayMinutes: number): Task[] {
  return tasks.map(t => {
    if (t.status === "done" || t.status === "skipped" || t.status === "active") return t;
    const effectiveTime = t.adjustedTimeMin ?? t.timeMin;
    if (effectiveTime >= fromTimeMin) {
      return { ...t, adjustedTimeMin: effectiveTime + delayMinutes };
    }
    return t;
  });
}

// ── Color helpers for task type ──
export const accentForType = (type: string) =>
  type === "rest" ? "var(--rest)" : "var(--accent)";

export const bgForType = (type: string) =>
  type === "rest" ? "var(--rest-bg)" : "var(--accent-bg)";

export const statusColor = (statusType: string) =>
  statusType === "work" ? "var(--accent)" : statusType === "rest" ? "var(--rest)" : "var(--t6)";

export const statusBg = (statusType: string) =>
  statusType === "work" ? "var(--accent-bg)" : statusType === "rest" ? "var(--rest-bg)" : "var(--card)";
