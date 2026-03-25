"use client";
import { useState, useEffect, useRef, useCallback } from "react";

// ── Types ──
type PopupState = "working" | "resting" | "paused" | "grace" | "upcoming" | "idle";
type CollapseLevel = "full" | "medium" | "pill";

interface TaskInfo {
  name: string;
  type: string;
  duration: number;
  urgent?: boolean;
}

interface PopupBarProps {
  currentTab: string;
  popupState: PopupState;
  activeTask: TaskInfo | null;
  pausedTask: (TaskInfo & { name: string }) | null;
  overdueTask: (TaskInfo & { name: string }) | null;
  upcomingTask: (TaskInfo & { name: string }) | null;
  activeTimerStr: string;
  pauseTimerStr: string;
  graceRemainingMin: number;
  upcomingMins: number;
  // Callbacks
  onDone: () => void;
  onPause: () => void;
  onSkip: () => void;
  onSwitch: () => void;
  onResume: () => void;
  onDismiss: () => void;
  onStartOverdue: () => void;
  onSkipOverdue: () => void;
  onStartUpcoming: () => void;
}

// ── Constants ──
const DISPLAY = "'Sora', sans-serif";
const MONO = "'IBM Plex Mono', monospace";
const BODY = "'Plus Jakarta Sans', sans-serif";

const fmtDur = (m: number) => {
  if (m >= 60) {
    const h = Math.floor(m / 60);
    const r = m % 60;
    return r ? `${h}h ${r}m` : `${h}h`;
  }
  return `${m}m`;
};

// ── Component ──
export default function PopupBar({
  currentTab,
  popupState,
  activeTask,
  pausedTask,
  overdueTask,
  upcomingTask,
  activeTimerStr,
  pauseTimerStr,
  graceRemainingMin,
  upcomingMins,
  onDone,
  onPause,
  onSkip,
  onSwitch,
  onResume,
  onDismiss,
  onStartOverdue,
  onSkipOverdue,
  onStartUpcoming,
}: PopupBarProps) {
  const [collapse, setCollapse] = useState<CollapseLevel>("full");
  const touchStartY = useRef(0);
  const touchDelta = useRef(0);
  const prevState = useRef(popupState);

  const isMainTab = currentTab === "main";
  const isActiveState = popupState === "working" || popupState === "resting" || popupState === "paused";

  // Auto-restore when popup state changes
  useEffect(() => {
    if (popupState !== prevState.current) {
      setCollapse(isMainTab ? "full" : "medium");
      prevState.current = popupState;
    }
  }, [popupState, isMainTab]);

  // Clamp to medium when leaving main tab
  useEffect(() => {
    if (!isMainTab && collapse === "full") {
      setCollapse("medium");
    }
  }, [isMainTab]);

  // Don't render if idle
  if (popupState === "idle") return null;

  // Non-main tabs: only show if actively running/paused
  if (!isMainTab && !isActiveState) return null;

  // ── Collapse handlers ──
  const collapseOne = () => {
    setCollapse((c) =>
      c === "full" ? "medium" : c === "medium" ? "pill" : "pill"
    );
  };

  const expandOne = () => {
    setCollapse((c) =>
      c === "pill" ? "medium" : c === "medium" ? "full" : "full"
    );
  };

  // ── Swipe down to collapse ──
  const onTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
  };

  const onTouchMove = (e: React.TouchEvent) => {
    touchDelta.current = e.touches[0].clientY - touchStartY.current;
  };

  const onTouchEnd = () => {
    if (touchDelta.current > 40) {
      collapseOne();
    }
    touchDelta.current = 0;
  };

  // ── Derived values ──
  const isWorking = popupState === "working" || popupState === "resting";
  const isPaused = popupState === "paused";
  const isGrace = popupState === "grace";
  const isUpcoming = popupState === "upcoming";

  const currentTask = isWorking
    ? activeTask
    : isPaused
    ? pausedTask
    : isGrace
    ? overdueTask
    : upcomingTask;

  const timerStr = isWorking
    ? activeTimerStr
    : isPaused
    ? pauseTimerStr
    : isGrace
    ? `${graceRemainingMin}m`
    : `${upcomingMins}m`;

  const statusLabel = isWorking
    ? activeTask?.type === "rest"
      ? "RESTING"
      : activeTask?.urgent
      ? "URGENT"
      : "ACTIVE"
    : isPaused
    ? "PAUSED"
    : isGrace
    ? "OVERDUE"
    : "UPCOMING";

  const statusColor = isWorking
    ? activeTask?.type === "rest"
      ? "var(--rest)"
      : activeTask?.urgent
      ? "var(--danger)"
      : "var(--accent)"
    : isPaused
    ? "var(--warn)"
    : isGrace
    ? "var(--danger)"
    : "var(--accent)";

  // Pill colors follow status
  const pillBg = isWorking
    ? activeTask?.urgent
      ? "var(--danger-fill)"
      : activeTask?.type === "rest"
      ? "var(--rest)"
      : "var(--warn-fill)"
    : isPaused
    ? "var(--warn)"
    : isGrace
    ? "var(--danger)"
    : "var(--accent)";

  const isYellowPill =
    isWorking && !activeTask?.urgent && activeTask?.type !== "rest";
  const pillTextColor = isYellowPill ? "var(--warn-fill-text)" : "#fff";

  // ── Action pills for full view ──
  const getActions = () => {
    if (isWorking) {
      return [
        { label: "Done", action: onDone, primary: true },
        { label: "Pause", action: onPause, primary: false },
        { label: "Skip", action: onSkip, primary: false },
        { label: "Switch", action: onSwitch, primary: false },
      ];
    }
    if (isPaused) {
      return [
        { label: "Resume", action: onResume, primary: true },
        { label: "Dismiss", action: onDismiss, primary: false },
      ];
    }
    if (isGrace) {
      return [
        { label: "Start", action: onStartOverdue, primary: true },
        { label: "Skip", action: onSkipOverdue, primary: false },
      ];
    }
    if (isUpcoming) {
      return [
        { label: "Start now", action: onStartUpcoming, primary: true },
      ];
    }
    return [];
  };

  // ── Compact actions for medium view ──
  const getMediumActions = () => {
    if (isWorking) {
      return [
        { label: "Done", action: onDone, primary: true },
        { label: "Pause", action: onPause, primary: false },
        { label: "Skip", action: onSkip, primary: false },
      ];
    }
    if (isPaused) {
      return [
        { label: "Resume", action: onResume, primary: true },
        { label: "Dismiss", action: onDismiss, primary: false },
      ];
    }
    if (isGrace) {
      return [
        { label: "Start", action: onStartOverdue, primary: true },
        { label: "Skip", action: onSkipOverdue, primary: false },
      ];
    }
    if (isUpcoming) {
      return [{ label: "Start", action: onStartUpcoming, primary: true }];
    }
    return [];
  };

  const actions = getActions();
  const mediumActions = getMediumActions();

  return (
    <>
      {/* ── Dark overlay (full state only) ── */}
      {collapse === "full" && (
        <div
          onClick={collapseOne}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.3)",
            zIndex: 85,
            cursor: "pointer",
            animation: "fadeIn 0.2s ease",
          }}
        />
      )}

      {/* ═══ FULL STATE ═══ */}
      <div
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        style={{
          position: "fixed",
          bottom: "calc(84px + env(safe-area-inset-bottom, 0px))",
          left: "50%",
          width: "calc(100% - 32px)",
          maxWidth: 398,
          zIndex: 90,
          transform:
            collapse === "full"
              ? "translate(-50%, 0)"
              : "translate(-50%, calc(100% + 40px))",
          opacity: collapse === "full" ? 1 : 0,
          transition:
            "transform 0.35s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.25s ease",
          pointerEvents: collapse === "full" ? "auto" : "none",
        }}
      >
        <div
          style={{
            background: "var(--card)",
            borderRadius: 24,
            padding: "20px 20px 24px",
            border: "1px solid var(--border)",
          }}
        >
          {/* Drag handle */}
          <div
            style={{
              width: 36,
              height: 4,
              borderRadius: 2,
              background: "var(--border2)",
              margin: "0 auto 16px",
              cursor: "pointer",
            }}
            onClick={collapseOne}
          />

          {/* Status + task info */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 4,
            }}
          >
            <div
              className={isWorking ? "anim-pulse" : undefined}
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: statusColor,
              }}
            />
            <span
              style={{
                fontSize: 10,
                letterSpacing: 1.5,
                color: "var(--t4)",
                fontWeight: 600,
                fontFamily: MONO,
              }}
            >
              {statusLabel}
            </span>
          </div>

          <div
            style={{
              fontSize: 17,
              fontWeight: 700,
              color: "var(--t1)",
              fontFamily: DISPLAY,
              marginBottom: 2,
            }}
          >
            {currentTask?.name || "—"}
          </div>
          <div
            style={{
              fontSize: 11,
              color: "var(--t4)",
              fontFamily: MONO,
              marginBottom: 20,
            }}
          >
            {currentTask?.type?.toUpperCase() || "—"} ·{" "}
            {currentTask?.duration ? fmtDur(currentTask.duration) : "—"}
          </div>

          {/* Action pills — scrollable, hidden scrollbar */}
          <div
            style={{
              display: "flex",
              gap: 8,
              overflowX: "auto",
              marginBottom: 24,
              msOverflowStyle: "none",
              scrollbarWidth: "none",
            }}
            className="no-scroll"
          >
            {actions.map((a) => (
              <div
                key={a.label}
                className="tap"
                onClick={a.action}
                style={{
                  flexShrink: 0,
                  padding: "10px 22px",
                  borderRadius: 40,
                  fontSize: 13,
                  fontWeight: 600,
                  fontFamily: BODY,
                  cursor: "pointer",
                  transition: "all 0.2s",
                  background: a.primary ? "var(--accent)" : "transparent",
                  color: a.primary ? "#fff" : "var(--t3)",
                  border: a.primary
                    ? "1.5px solid var(--accent)"
                    : "1.5px solid var(--border2)",
                }}
              >
                {a.label}
              </div>
            ))}
          </div>

          {/* Timer display */}
          <div
            style={{
              textAlign: "center",
              padding: "20px 0",
              background: "var(--card2)",
              borderRadius: 16,
            }}
          >
            <div
              style={{
                fontSize: 10,
                letterSpacing: 2,
                color: "var(--t4)",
                fontFamily: MONO,
                marginBottom: 8,
              }}
            >
              {isWorking
                ? "ELAPSED"
                : isPaused
                ? "PAUSED FOR"
                : isGrace
                ? "GRACE LEFT"
                : "STARTS IN"}
            </div>
            <div
              style={{
                fontSize: 48,
                fontWeight: 500,
                color: "var(--t1)",
                fontFamily: MONO,
                letterSpacing: 2,
              }}
            >
              {timerStr}
            </div>
          </div>
        </div>
      </div>

      {/* ═══ MEDIUM STATE ═══ */}
      <div
        onClick={expandOne}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={() => {
          if (touchDelta.current > 40) {
            setCollapse("pill");
          }
          touchDelta.current = 0;
        }}
        style={{
          position: "fixed",
          bottom: "calc(84px + env(safe-area-inset-bottom, 0px))",
          left: "50%",
          width: "calc(100% - 32px)",
          maxWidth: 398,
          zIndex: 90,
          transform:
            collapse === "medium"
              ? "translate(-50%, 0)"
              : "translate(-50%, calc(100% + 40px))",
          opacity: collapse === "medium" ? 1 : 0,
          transition:
            "transform 0.35s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.25s ease",
          pointerEvents: collapse === "medium" ? "auto" : "none",
          cursor: "pointer",
        }}
      >
        <div
          style={{
            background: "var(--card)",
            borderRadius: 20,
            padding: "14px 20px 16px",
            border: "1px solid var(--border)",
          }}
        >
          {/* Task info + timer */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  marginBottom: 3,
                }}
              >
                <div
                  className={isWorking ? "anim-pulse" : undefined}
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: statusColor,
                    flexShrink: 0,
                  }}
                />
                <span
                  style={{
                    fontSize: 9,
                    letterSpacing: 1,
                    color: "var(--t4)",
                    fontFamily: MONO,
                    fontWeight: 600,
                  }}
                >
                  {statusLabel}
                </span>
              </div>
              <div
                style={{
                  fontSize: 15,
                  fontWeight: 700,
                  color: "var(--t1)",
                  fontFamily: DISPLAY,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {currentTask?.name || "—"}
              </div>
            </div>
            <div
              style={{
                fontSize: 26,
                fontWeight: 600,
                color: "var(--t1)",
                fontFamily: MONO,
                letterSpacing: 1,
                paddingLeft: 16,
                flexShrink: 0,
              }}
            >
              {timerStr}
            </div>
          </div>

          {/* Compact action buttons */}
          <div
            className="no-scroll"
            style={{ display: "flex", gap: 6, marginTop: 12, overflowX: "auto", scrollbarWidth: "none", msOverflowStyle: "none" }}
            onClick={(e) => e.stopPropagation()}
          >
            {mediumActions.map((a) => (
              <div
                key={a.label}
                className="tap"
                onClick={a.action}
                  style={{
                  flexShrink: 0,
                  minWidth: 75,
                  padding: "9px 0",
                  borderRadius: 10,
                  textAlign: "center",
                  fontSize: 12,
                  fontWeight: 600,
                  fontFamily: BODY,
                  cursor: "pointer",
                  background: a.primary ? "var(--accent)" : "var(--card2)",
                  color: a.primary ? "#fff" : "var(--t3)",
                }}
              >
                {a.label}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ═══ PILL STATE ═══ */}
      <div
        className="tap"
        onClick={expandOne}
        style={{
          position: "fixed",
          bottom: "calc(84px + env(safe-area-inset-bottom, 0px))",
          left: "50%",
          zIndex: 90,
          transform:
            collapse === "pill"
              ? "translateX(-50%) translateY(0)"
              : "translateX(-50%) translateY(20px)",
          opacity: collapse === "pill" ? 1 : 0,
          transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
          pointerEvents: collapse === "pill" ? "auto" : "none",
          background: pillBg,
          borderRadius: 24,
          padding: "10px 24px",
          display: "flex",
          alignItems: "center",
          gap: 8,
          cursor: "pointer",
        }}
      >
        {isWorking && (
          <div
            className="anim-pulse"
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: pillTextColor,
            }}
          />
        )}
        <span
          style={{
            fontSize: 12,
            fontWeight: 700,
            color: pillTextColor,
            fontFamily: MONO,
            letterSpacing: 1,
            whiteSpace: "nowrap",
          }}
        >
          {timerStr}
        </span>
        <svg
          width="10"
          height="10"
          viewBox="0 0 24 24"
          fill="none"
          stroke={pillTextColor}
          strokeWidth="3"
          strokeLinecap="round"
        >
          <polyline points="18 15 12 9 6 15" />
        </svg>
      </div>

      {/* Inline style for fadeIn + no-scroll */}
      <style>{`
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
      `}</style>
    </>
  );
}
