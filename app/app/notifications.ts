// ═══ PITGOAL NOTIFICATION ENGINE ═══
// Local notification scheduling — no push server needed for v1
// Works when PWA is installed + backgrounded (service worker showNotification)
// Hooks into: task start, grace period, pause resume, day summary

type NotifType = "task-start" | "grace-warn" | "resume" | "day-summary" | "upcoming";

interface ScheduledNotif {
  id: string;
  timerId: ReturnType<typeof setTimeout>;
  type: NotifType;
  fireAt: number; // timestamp ms
}

interface TaskLike {
  id: string;
  name: string;
  duration: number;
  type: string;
  status: string;
  timeMin: number;
  adjustedTimeMin: number | null;
  urgent?: boolean;
}

// Active scheduled notifications — module-level so they persist across re-renders
let activeNotifs: ScheduledNotif[] = [];
let swRegistration: ServiceWorkerRegistration | null = null;

// ─── PERMISSION ───
export async function requestNotificationPermission(): Promise<boolean> {
  if (!("Notification" in window)) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;

  const result = await Notification.requestPermission();
  return result === "granted";
}

export function getPermissionStatus(): "granted" | "denied" | "default" | "unsupported" {
  if (!("Notification" in window)) return "unsupported";
  return Notification.permission;
}

// ─── SERVICE WORKER REGISTRATION ───
export async function initNotifications(): Promise<boolean> {
  const permitted = await requestNotificationPermission();
  if (!permitted) return false;

  if ("serviceWorker" in navigator) {
    try {
      swRegistration = await navigator.serviceWorker.ready;
    } catch (e) {
      console.warn("[Notif] SW not ready:", e);
    }
  }
  return true;
}

// ─── SHOW NOTIFICATION ───
// Uses service worker when available (works in background), falls back to Notification API
async function showNotification(title: string, options: NotificationOptions & { data?: any }) {
  if (Notification.permission !== "granted") return;

  // Don't notify if app is focused (user is already looking at it)
  if (document.visibilityState === "visible" && document.hasFocus()) return;

  try {
    if (swRegistration) {
      await swRegistration.showNotification(title, {
        icon: "/icons/icon-192.png",
        badge: "/icons/icon-96.png",
        tag: options.tag || "pitgoal",
        ...options,
      });
    } else {
      new Notification(title, {
        icon: "/icons/icon-192.png",
        tag: options.tag || "pitgoal",
        ...options,
      });
    }
  } catch (e) {
    console.warn("[Notif] Failed to show:", e);
  }
}

// ─── CLEAR ALL SCHEDULED ───
function clearAll() {
  for (const n of activeNotifs) {
    clearTimeout(n.timerId);
  }
  activeNotifs = [];
}

function clearByType(type: NotifType) {
  activeNotifs = activeNotifs.filter((n) => {
    if (n.type === type) {
      clearTimeout(n.timerId);
      return false;
    }
    return true;
  });
}

function clearByTaskId(taskId: string) {
  activeNotifs = activeNotifs.filter((n) => {
    if (n.id.startsWith(taskId)) {
      clearTimeout(n.timerId);
      return false;
    }
    return true;
  });
}

// ─── SCHEDULE HELPER ───
function scheduleAt(id: string, type: NotifType, fireAt: number, callback: () => void) {
  const delay = fireAt - Date.now();
  if (delay <= 0) return; // already past

  const timerId = setTimeout(callback, delay);
  activeNotifs.push({ id, timerId, type, fireAt });
}

// ─── GET DISPLAY TIME IN MS TODAY ───
function taskTimeToMs(task: TaskLike): number {
  const mins = task.adjustedTimeMin ?? task.timeMin;
  const now = new Date();
  const target = new Date(now.getFullYear(), now.getMonth(), now.getDate(), Math.floor(mins / 60), mins % 60, 0);
  return target.getTime();
}

// ═══ MAIN SCHEDULER ═══
// Call this whenever tasks state changes
export function scheduleTaskNotifications(tasks: TaskLike[]) {
  if (Notification.permission !== "granted") return;

  clearAll();
  const now = Date.now();

  const pendingTasks = tasks
    .filter((t) => t.status === "pending")
    .sort((a, b) => (a.adjustedTimeMin ?? a.timeMin) - (b.adjustedTimeMin ?? b.timeMin));

  for (const task of pendingTasks) {
    const taskMs = taskTimeToMs(task);

    // 1. UPCOMING: 5 minutes before task time
    const upcomingMs = taskMs - 5 * 60 * 1000;
    if (upcomingMs > now) {
      scheduleAt(`${task.id}-upcoming`, "upcoming", upcomingMs, () => {
        const displayTime = formatTimeFromMin(task.adjustedTimeMin ?? task.timeMin);
        showNotification(`${task.name} in 5 minutes`, {
          body: `${displayTime} · ${task.duration}min · ${task.type}`,
          tag: `upcoming-${task.id}`,
          data: { action: "focus", taskId: task.id },
          silent: true, // passive, no sound
        });
      });
    }

    // 2. TASK START: at scheduled time
    if (taskMs > now) {
      scheduleAt(`${task.id}-start`, "task-start", taskMs, () => {
        const urgentPrefix = task.urgent ? "⚡ " : "";
        showNotification(`${urgentPrefix}Time to: ${task.name}`, {
          body: `Tap to start · ${task.duration}min ${task.type}`,
          tag: `start-${task.id}`,
          data: { action: "start", taskId: task.id },
          requireInteraction: true, // stays until tapped
        });
      });
    }

    // 3. GRACE WARNING: 10 minutes after scheduled time (5 min before auto-skip)
    const graceWarnMs = taskMs + 10 * 60 * 1000;
    if (graceWarnMs > now && taskMs <= now) {
      // Task is already overdue but within grace — schedule the warning
      scheduleAt(`${task.id}-grace`, "grace-warn", graceWarnMs, () => {
        showNotification(`${task.name} — skipping in 5 min`, {
          body: "Tap to start now, or it moves to tomorrow",
          tag: `grace-${task.id}`,
          data: { action: "start", taskId: task.id },
          requireInteraction: true,
        });
      });
    } else if (graceWarnMs > now && taskMs > now) {
      // Task hasn't started yet — schedule grace warning for later
      scheduleAt(`${task.id}-grace`, "grace-warn", graceWarnMs, () => {
        showNotification(`${task.name} — skipping in 5 min`, {
          body: "Tap to start now, or it moves to tomorrow",
          tag: `grace-${task.id}`,
          data: { action: "start", taskId: task.id },
          requireInteraction: true,
        });
      });
    }
  }
}

// ═══ PAUSE RESUME REMINDER ═══
// Call when user pauses a task
export function schedulePauseReminder(taskName: string, taskId: string) {
  if (Notification.permission !== "granted") return;

  clearByType("resume");

  const fireAt = Date.now() + 30 * 60 * 1000; // 30 minutes from now
  scheduleAt(`${taskId}-resume`, "resume", fireAt, () => {
    showNotification(`Resume ${taskName}?`, {
      body: "Paused 30 minutes ago · Tap to continue",
      tag: `resume-${taskId}`,
      data: { action: "resume", taskId },
      requireInteraction: true,
    });
  });
}

// Call when user resumes or dismisses pause
export function cancelPauseReminder() {
  clearByType("resume");
}

// ═══ DAY SUMMARY ═══
// Call on app load to schedule end-of-day summary
export function scheduleDaySummary(sleepHour: number, sleepMinute: number) {
  if (Notification.permission !== "granted") return;

  clearByType("day-summary");

  const now = new Date();
  const sleepTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), sleepHour, sleepMinute, 0);
  const fireAt = sleepTime.getTime();

  if (fireAt <= Date.now()) return; // already past sleep time

  scheduleAt("day-summary", "day-summary", fireAt, () => {
    // Read current stats from localStorage
    try {
      const raw = localStorage.getItem("doit-v8-shift");
      if (raw) {
        const data = JSON.parse(raw);
        const log = data.dayLog || [];
        const tasksDone = log.filter((e: any) => e.type === "work").length;
        const totalMin = log.reduce((s: number, e: any) => s + e.duration, 0);
        const hours = (totalMin / 60).toFixed(1);
        showNotification("Day complete", {
          body: `${tasksDone} tasks · ${hours}h tracked · Good work`,
          tag: "day-summary",
          data: { action: "focus" },
        });
      }
    } catch (e) {}
  });
}

// ═══ WHEN TASK COMPLETES/SKIPS ═══
// Clear notifications for a specific task
export function onTaskDone(taskId: string) {
  clearByTaskId(taskId);
  // Also dismiss any visible notification for this task
  if (swRegistration) {
    swRegistration.getNotifications({ tag: `start-${taskId}` }).then((n) => n.forEach((x) => x.close()));
    swRegistration.getNotifications({ tag: `grace-${taskId}` }).then((n) => n.forEach((x) => x.close()));
    swRegistration.getNotifications({ tag: `upcoming-${taskId}` }).then((n) => n.forEach((x) => x.close()));
  }
}

// ═══ CLEANUP ═══
export function clearAllNotifications() {
  clearAll();
}

// ─── HELPERS ───
function formatTimeFromMin(mins: number): string {
  const h = Math.floor(mins / 60) % 24;
  const m = mins % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}
