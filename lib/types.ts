// ═══ PITGOAL v9.0 — Type definitions ═══

export interface DrainRates {
  idle: number;
  work: number;
  urgent: number;
  rest: number;
  wakeHour: number;
  wakeMinute: number;
  sleepHour: number;
  sleepMinute: number;
  maxEnergyHours: number;
}

export interface Template {
  id: string;
  name: string;
  time: string;
  timeMin: number;
  duration: number;
  type: string;
  days: number[]; // 0=Sun..6=Sat, empty = daily
}

export interface DayHistory {
  date: string;
  tasks: number;
  done: number;
  skipped: number;
  totalMin: number;
  log: LogEntry[];
}

export interface LogEntry {
  id: string;
  name: string;
  type: string;
  urgent?: boolean;
  duration: number;
  startTime: string;
  endTime: string;
  partial?: boolean;
}

export interface Task {
  id: string;
  name: string;
  category?: "task" | "rest" | "life";
  time: string;
  timeMin: number;
  duration: number;
  planned_duration: number;
  actual_duration: number | null;
  type: string;
  urgent: boolean;
  status: "pending" | "active" | "done" | "skipped";
  adjustedTimeMin: number | null;
  skippedAt: number | null;
  startedAt?: number;
  completedAt?: number;
  desc?: string;
  rate?: string;
  group?: string;
  fromTemplate?: string;
  customType?: string;  // ADD — stores actual type id (task/rest/life/focus/etc)
  tags?: string[];      // ADD — array of tag ids
}

export interface ActiveTask extends Task {
  startedAt: number;
  baseUsed: number;
  baseCharged: number;
  elapsedMs?: number;
  pausedAt?: number;
}

export interface Friend {
  id: string;
  name: string;
  status: string;
  statusType: "work" | "rest" | "idle";
  lastActive: string;
  streak: number;
  pet: "healthy" | "hungry";
}

export interface ChatMessage {
  from: "me" | "them";
  text: string;
  time: string;
}

export interface CollabTask {
  id: string;
  name: string;
  friend: string;
  friendId: string;
  status: string;
  time: string;
  duration: number;
  type: string;
}

export interface FriendActivity {
  friendId: string;
  name: string;
  action: string;
  task: string;
  time: string;
  type: "work" | "rest";
}

export type BottomTab = "main" | "community" | "friends" | "profile";
export type Theme = "dark" | "light";
export type CmdCategory = string;
export type ProfileView = "main" | "settings";
export type SettingsSection = "account" | "appearance" | "energy" | "notifications" | "data" | null;
