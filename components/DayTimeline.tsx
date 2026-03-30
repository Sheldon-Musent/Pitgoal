"use client";
import React, { useState, useMemo } from "react";

interface DayTimelineProps {
  tasks: any[];
  activeTask: any;
  getDisplayTimeMin: (task: any) => number;
  getDisplayTime: (task: any) => string;
}

const HOUR_START = 6;
const HOUR_END = 23;
const TOTAL_HOURS = HOUR_END - HOUR_START;

type ViewMode = "day" | "week" | "month" | "year" | "schedule";

const VIEW_OPTIONS: { id: ViewMode; label: string; shortcut: string }[] = [
  { id: "day", label: "Day", shortcut: "D" },
  { id: "week", label: "Week", shortcut: "W" },
  { id: "month", label: "Month", shortcut: "M" },
  { id: "year", label: "Year", shortcut: "Y" },
  { id: "schedule", label: "Schedule", shortcut: "S" },
];

const DAYS_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS_FULL = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function hourLabel(h: number): string {
  if (h === 0) return "12a";
  if (h < 12) return `${h}a`;
  if (h === 12) return "12p";
  return `${h - 12}p`;
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function getMonthDays(year: number, month: number): (Date | null)[][] {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const weeks: (Date | null)[][] = [];
  let week: (Date | null)[] = [];
  for (let i = 0; i < firstDay; i++) week.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    week.push(new Date(year, month, d));
    if (week.length === 7) { weeks.push(week); week = []; }
  }
  if (week.length > 0) {
    while (week.length < 7) week.push(null);
    weeks.push(week);
  }
  return weeks;
}

export default function DayTimeline({
  tasks, activeTask, getDisplayTimeMin, getDisplayTime,
}: DayTimelineProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("day");
  const [viewDate, setViewDate] = useState(new Date());
  const [showViewPicker, setShowViewPicker] = useState(false);

  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const nowPct = ((nowMinutes - HOUR_START * 60) / (TOTAL_HOURS * 60)) * 100;

  const taskBlocks = useMemo(() => {
    return tasks.filter(t => t.status !== "skipped").map(t => {
      const startMin = getDisplayTimeMin(t);
      const duration = t.duration || t.planned_duration || 30;
      const topPct = ((startMin - HOUR_START * 60) / (TOTAL_HOURS * 60)) * 100;
      const heightPct = (duration / (TOTAL_HOURS * 60)) * 100;
      const isDone = t.status === "done";
      const isRest = t.type === "rest";
      const isActive = activeTask?.id === t.id;
      return { ...t, topPct, heightPct, isDone, isRest, isActive, startMin, duration };
    }).filter(t => t.topPct >= 0 && t.topPct < 100);
  }, [tasks, activeTask, getDisplayTimeMin]);

  const weekDays = useMemo(() => {
    const days: Date[] = [];
    const start = new Date(viewDate);
    const dow = start.getDay();
    start.setDate(start.getDate() - dow + 1);
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      days.push(d);
    }
    return days;
  }, [viewDate]);

  const hours: number[] = [];
  for (let h = HOUR_START; h <= HOUR_END; h++) hours.push(h);

  // Navigation
  const navigate = (dir: number) => {
    const d = new Date(viewDate);
    if (viewMode === "day") d.setDate(d.getDate() + dir);
    else if (viewMode === "week") d.setDate(d.getDate() + dir * 7);
    else if (viewMode === "month") d.setMonth(d.getMonth() + dir);
    else if (viewMode === "year") d.setFullYear(d.getFullYear() + dir);
    else if (viewMode === "schedule") d.setDate(d.getDate() + dir * 7);
    setViewDate(d);
  };

  const goToday = () => setViewDate(new Date());

  // Header title
  const headerTitle = () => {
    if (viewMode === "day") return viewDate.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
    if (viewMode === "week") {
      const end = new Date(weekDays[6]);
      return `${weekDays[0].toLocaleDateString("en-US", { month: "short", day: "numeric" })} — ${end.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
    }
    if (viewMode === "month") return `${MONTHS_FULL[viewDate.getMonth()]} ${viewDate.getFullYear()}`;
    if (viewMode === "year") return `${viewDate.getFullYear()}`;
    if (viewMode === "schedule") return "Schedule";
    return "";
  };

  // Keyboard shortcut
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const map: Record<string, ViewMode> = { d: "day", w: "week", m: "month", y: "year", s: "schedule" };
      if (map[e.key]) { setViewMode(map[e.key]); setShowViewPicker(false); }
      if (e.key === "t") goToday();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // ── Render helpers ──

  const renderDayGrid = (tasksToShow: typeof taskBlocks, showNow: boolean) => (
    <div style={{ flex: 1, overflowY: "auto", display: "flex", position: "relative" }}>
      <div style={{ width: 36, flexShrink: 0, position: "relative" }}>
        {hours.map((h) => (
          <div key={h} style={{ height: `${100 / TOTAL_HOURS}%`, position: "relative" }}>
            <span style={{ position: "absolute", top: -6, right: 6, fontSize: 9, color: "var(--t5)" }}>
              {hourLabel(h)}
            </span>
          </div>
        ))}
      </div>
      <div style={{ flex: 1, position: "relative", borderLeft: "1px solid var(--border)", minHeight: TOTAL_HOURS * 60 }}>
        {hours.map((h) => (
          <div key={h} style={{
            position: "absolute", top: `${((h - HOUR_START) / TOTAL_HOURS) * 100}%`,
            left: 0, right: 0, height: 1, background: "var(--border)", opacity: 0.5,
          }} />
        ))}
        {tasksToShow.map((t) => (
          <div key={t.id} style={{
            position: "absolute", top: `${t.topPct}%`, left: 4, right: 4,
            height: `${Math.max(t.heightPct, 1.5)}%`, minHeight: 20,
            background: t.isRest ? "var(--rest, #6b8a7a)" : "var(--accent)",
            borderRadius: 6, padding: "3px 8px",
            display: "flex", alignItems: "center", gap: 6,
            opacity: t.isDone ? 0.3 : 1,
            border: t.isActive ? "2px solid var(--accent)" : "none",
            cursor: "pointer", overflow: "hidden",
          }}>
            <span style={{
              fontSize: 10, fontWeight: t.isActive ? 600 : 500,
              color: t.isRest ? "#fff" : "#0a0a0a",
              whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
            }}>{t.name}</span>
            {t.heightPct > 3 && (
              <span style={{ fontSize: 9, color: t.isRest ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.5)", flexShrink: 0 }}>
                {t.duration}m
              </span>
            )}
          </div>
        ))}
        {showNow && nowPct > 0 && nowPct < 100 && (
          <>
            <div style={{ position: "absolute", top: `${nowPct}%`, left: 0, right: 0, height: 1.5, background: "var(--danger, #E24B4A)", zIndex: 2 }} />
            <div style={{ position: "absolute", top: `calc(${nowPct}% - 4px)`, left: -4, width: 9, height: 9, borderRadius: "50%", background: "var(--danger, #E24B4A)", zIndex: 3 }} />
          </>
        )}
      </div>
    </div>
  );

  const renderWeek = () => (
    <div style={{ flex: 1, overflowY: "auto", display: "flex" }}>
      <div style={{ width: 36, flexShrink: 0, position: "relative" }}>
        {hours.map((h) => (
          <div key={h} style={{ height: `${100 / TOTAL_HOURS}%`, position: "relative" }}>
            <span style={{ position: "absolute", top: -6, right: 6, fontSize: 9, color: "var(--t5)" }}>{hourLabel(h)}</span>
          </div>
        ))}
      </div>
      <div style={{ flex: 1, display: "flex" }}>
        {weekDays.map((day, di) => {
          const isToday = isSameDay(day, now);
          return (
            <div key={di} style={{ flex: 1, borderLeft: di > 0 ? "1px solid var(--border)" : "none", position: "relative", minWidth: 0 }}>
              <div style={{ textAlign: "center", padding: "4px 0 8px", borderBottom: "1px solid var(--border)" }}>
                <div style={{ fontSize: 9, color: isToday ? "var(--accent)" : "var(--t5)" }}>{DAYS_SHORT[day.getDay()]}</div>
                <div style={{
                  fontSize: 14, fontWeight: 600,
                  color: isToday ? "var(--accent)" : "var(--t3)",
                  ...(isToday ? { width: 28, height: 28, lineHeight: "28px", borderRadius: "50%", background: "var(--accent)", color: "#0a0a0a", margin: "0 auto" } : {}),
                }}>{day.getDate()}</div>
              </div>
              <div style={{ position: "relative", height: "calc(100% - 44px)" }}>
                {hours.map((h) => (
                  <div key={h} style={{
                    position: "absolute", top: `${((h - HOUR_START) / TOTAL_HOURS) * 100}%`,
                    left: 0, right: 0, height: 1, background: "var(--border)", opacity: 0.3,
                  }} />
                ))}
                {isToday && taskBlocks.map((t) => (
                  <div key={t.id} style={{
                    position: "absolute", top: `${t.topPct}%`, left: 2, right: 2,
                    height: `${Math.max(t.heightPct, 2)}%`, minHeight: 16,
                    background: t.isRest ? "var(--rest, #6b8a7a)" : "var(--accent)",
                    borderRadius: 4, padding: "1px 4px",
                    display: "flex", alignItems: "center",
                    opacity: t.isDone ? 0.3 : 1, overflow: "hidden",
                  }}>
                    <span style={{ fontSize: 8, fontWeight: 500, color: t.isRest ? "#fff" : "#0a0a0a", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.name}</span>
                  </div>
                ))}
                {isToday && nowPct > 0 && nowPct < 100 && (
                  <div style={{ position: "absolute", top: `${nowPct}%`, left: 0, right: 0, height: 1.5, background: "var(--danger, #E24B4A)", zIndex: 2 }} />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  const renderMonth = () => {
    const weeks = getMonthDays(viewDate.getFullYear(), viewDate.getMonth());
    return (
      <div style={{ flex: 1, overflowY: "auto", padding: "0 12px" }}>
        {/* Day headers */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", borderBottom: "1px solid var(--border)", paddingBottom: 8, marginBottom: 4 }}>
          {DAYS_SHORT.map(d => (
            <div key={d} style={{ textAlign: "center", fontSize: 10, color: "var(--t5)", fontWeight: 500 }}>{d}</div>
          ))}
        </div>
        {/* Weeks */}
        {weeks.map((week, wi) => (
          <div key={wi} style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", minHeight: 80, borderBottom: "1px solid var(--border)" }}>
            {week.map((day, di) => {
              if (!day) return <div key={di} style={{ borderRight: di < 6 ? "1px solid var(--border)" : "none" }} />;
              const isToday = isSameDay(day, now);
              return (
                <div key={di}
                  onClick={() => { setViewDate(new Date(day)); setViewMode("day"); }}
                  style={{
                    padding: "4px 6px", cursor: "pointer",
                    borderRight: di < 6 ? "1px solid var(--border)" : "none",
                    background: isToday ? "rgba(255,208,0,0.05)" : "transparent",
                  }}
                >
                  <div style={{
                    fontSize: 12, fontWeight: 500, marginBottom: 4,
                    color: isToday ? "var(--accent)" : "var(--t3)",
                    ...(isToday ? { width: 24, height: 24, lineHeight: "24px", textAlign: "center", borderRadius: "50%", background: "var(--accent)", color: "#0a0a0a" } : {}),
                  }}>{day.getDate()}</div>
                  {/* Show task dots for today only (v1) */}
                  {isToday && taskBlocks.slice(0, 3).map((t, ti) => (
                    <div key={ti} style={{
                      fontSize: 8, color: t.isRest ? "var(--rest, #6b8a7a)" : "var(--t4)",
                      whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                      padding: "1px 0", lineHeight: 1.3,
                    }}>
                      <span style={{
                        display: "inline-block", width: 4, height: 4, borderRadius: "50%",
                        background: t.isRest ? "var(--rest, #6b8a7a)" : "var(--accent)",
                        marginRight: 3, verticalAlign: "middle",
                      }} />
                      {t.name}
                    </div>
                  ))}
                  {isToday && taskBlocks.length > 3 && (
                    <div style={{ fontSize: 8, color: "var(--t5)" }}>+{taskBlocks.length - 3} more</div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    );
  };

  const renderYear = () => {
    const year = viewDate.getFullYear();
    return (
      <div style={{ flex: 1, overflowY: "auto", padding: 12 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
          {Array.from({ length: 12 }, (_, mi) => {
            const weeks = getMonthDays(year, mi);
            const isCurrentMonth = now.getFullYear() === year && now.getMonth() === mi;
            return (
              <div key={mi}
                onClick={() => { setViewDate(new Date(year, mi, 1)); setViewMode("month"); }}
                style={{ cursor: "pointer" }}
              >
                <div style={{
                  fontSize: 12, fontWeight: 600, marginBottom: 6,
                  color: isCurrentMonth ? "var(--accent)" : "var(--t3)",
                }}>{MONTHS_SHORT[mi]}</div>
                {/* Mini day headers */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", marginBottom: 2 }}>
                  {["S","M","T","W","T","F","S"].map((d, i) => (
                    <div key={i} style={{ fontSize: 7, color: "var(--t5)", textAlign: "center" }}>{d}</div>
                  ))}
                </div>
                {/* Mini calendar */}
                {weeks.map((week, wi) => (
                  <div key={wi} style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)" }}>
                    {week.map((day, di) => {
                      if (!day) return <div key={di} />;
                      const isToday = isSameDay(day, now);
                      return (
                        <div key={di} style={{
                          fontSize: 9, textAlign: "center", padding: "2px 0",
                          color: isToday ? "#0a0a0a" : "var(--t5)",
                          fontWeight: isToday ? 700 : 400,
                          background: isToday ? "var(--accent)" : "transparent",
                          borderRadius: isToday ? "50%" : 0,
                          width: isToday ? 18 : "auto",
                          height: isToday ? 18 : "auto",
                          lineHeight: isToday ? "18px" : "inherit",
                          margin: isToday ? "0 auto" : 0,
                        }}>{day.getDate()}</div>
                      );
                    })}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderSchedule = () => (
    <div style={{ flex: 1, overflowY: "auto", padding: "12px 16px" }}>
      {taskBlocks.length === 0 ? (
        <div style={{ textAlign: "center", padding: "40px 0", color: "var(--t5)", fontSize: 13 }}>
          No tasks scheduled
        </div>
      ) : (
        <>
          <div style={{ fontSize: 12, fontWeight: 600, color: "var(--t2)", marginBottom: 12 }}>
            {viewDate.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
          </div>
          {taskBlocks.map((t) => (
            <div key={t.id} style={{
              display: "flex", gap: 12, alignItems: "flex-start",
              padding: "10px 0", borderBottom: "1px solid var(--border)",
              opacity: t.isDone ? 0.35 : 1,
            }}>
              <div style={{
                width: 48, flexShrink: 0, fontSize: 11, color: "var(--t5)",
                paddingTop: 2,
              }}>
                {getDisplayTime(t)}
              </div>
              <div style={{
                width: 4, flexShrink: 0, borderRadius: 2,
                background: t.isRest ? "var(--rest, #6b8a7a)" : "var(--accent)",
                alignSelf: "stretch", minHeight: 20,
              }} />
              <div style={{ flex: 1 }}>
                <div style={{
                  fontSize: 13, fontWeight: 500, color: "var(--t1)",
                  textDecoration: t.isDone ? "line-through" : "none",
                }}>{t.name}</div>
                <div style={{ fontSize: 11, color: "var(--t5)", marginTop: 2 }}>
                  {t.duration}min · {t.isRest ? "rest" : t.type || "task"}
                </div>
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );

  return (
    <div className="day-timeline" style={{
      width: "100%",
      height: "100dvh",
      display: "flex",
      flexDirection: "column",
      borderLeft: "1px solid var(--border)",
      background: "var(--bg)",
      overflow: "hidden",
      minWidth: 0,
    }}>
      {/* Header */}
      <div style={{
        padding: "10px 16px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        borderBottom: "1px solid var(--border)",
        flexShrink: 0,
        gap: 12,
      }}>
        {/* Left: nav arrows + title */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
          <div className="tap" onClick={goToday} style={{
            padding: "4px 10px", borderRadius: 6, fontSize: 11, fontWeight: 500,
            border: "1px solid var(--border)", color: "var(--t3)", cursor: "pointer",
            flexShrink: 0,
          }}>Today</div>
          <div className="tap" onClick={() => navigate(-1)} style={{
            width: 24, height: 24, borderRadius: 6, display: "flex",
            alignItems: "center", justifyContent: "center", cursor: "pointer",
            color: "var(--t5)", flexShrink: 0,
          }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
          </div>
          <div className="tap" onClick={() => navigate(1)} style={{
            width: 24, height: 24, borderRadius: 6, display: "flex",
            alignItems: "center", justifyContent: "center", cursor: "pointer",
            color: "var(--t5)", flexShrink: 0,
          }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
          </div>
          <span style={{
            fontSize: 13, fontWeight: 600, color: "var(--t2)",
            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
          }}>{headerTitle()}</span>
        </div>

        {/* Right: view picker */}
        <div style={{ position: "relative", flexShrink: 0 }}>
          <div
            className="tap"
            onClick={() => setShowViewPicker(!showViewPicker)}
            style={{
              padding: "5px 12px", borderRadius: 6, fontSize: 10, fontWeight: 500,
              border: "1px solid var(--border)", color: "var(--t3)", cursor: "pointer",
              display: "flex", alignItems: "center", gap: 4,
            }}
          >
            {VIEW_OPTIONS.find(v => v.id === viewMode)?.label}
            <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>
          </div>

          {/* Dropdown */}
          {showViewPicker && (
            <>
              <div onClick={() => setShowViewPicker(false)} style={{ position: "fixed", inset: 0, zIndex: 99 }} />
              <div style={{
                position: "absolute", top: "100%", right: 0, marginTop: 4,
                background: "var(--card)", border: "1px solid var(--border)",
                borderRadius: 10, padding: 4, zIndex: 100,
                minWidth: 140, boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
              }}>
                {VIEW_OPTIONS.map((v) => (
                  <div key={v.id}
                    onClick={() => { setViewMode(v.id); setShowViewPicker(false); }}
                    style={{
                      display: "flex", justifyContent: "space-between", alignItems: "center",
                      padding: "8px 12px", borderRadius: 6, cursor: "pointer",
                      background: viewMode === v.id ? "var(--border)" : "transparent",
                      transition: "background 0.1s",
                    }}
                    onMouseEnter={(e) => { if (viewMode !== v.id) e.currentTarget.style.background = "rgba(255,255,255,0.05)"; }}
                    onMouseLeave={(e) => { if (viewMode !== v.id) e.currentTarget.style.background = "transparent"; }}
                  >
                    <span style={{ fontSize: 12, color: viewMode === v.id ? "var(--t1)" : "var(--t3)" }}>{v.label}</span>
                    <span style={{ fontSize: 10, color: "var(--t5)", fontFamily: "monospace" }}>{v.shortcut}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Views */}
      {viewMode === "day" && renderDayGrid(taskBlocks, isSameDay(viewDate, now))}
      {viewMode === "week" && renderWeek()}
      {viewMode === "month" && renderMonth()}
      {viewMode === "year" && renderYear()}
      {viewMode === "schedule" && renderSchedule()}
    </div>
  );
}
