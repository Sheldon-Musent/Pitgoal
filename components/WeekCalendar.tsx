"use client";
import React, { useRef, useEffect, useImperativeHandle, forwardRef, useState, useMemo } from "react";
import type { Task, Template, DayHistory } from "../lib/types";
import { dateKey } from "../lib/utils";

interface WeekCalendarProps {
  tasks: Task[];
  templates: Template[];
  history: Record<string, DayHistory>;
  selectedDate: Date;
  onSelectDate: (d: Date) => void;
  activeTask: any;
  getDisplayTimeMin: (task: any) => number;
}

const HOUR_START = 6;
const HOUR_END = 23;
const HOUR_HEIGHT = 48;
const GUTTER_W = 26;
const COL_W = 120;
const HEADER_H = 58;
const TOTAL_H = (HOUR_END - HOUR_START) * HOUR_HEIGHT;
const DAY_ABBR = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
const MONO = "'IBM Plex Mono', monospace";

const isSameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

const getWeekStart = (date: Date): Date => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
};

const getWeekDays = (date: Date): Date[] => {
  const start = getWeekStart(date);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
};

const formatHour = (h: number) => {
  if (h === 0 || h === 24) return "12a";
  if (h === 12) return "12p";
  return h < 12 ? `${h}a` : `${h - 12}p`;
};

interface BlockData {
  name: string;
  type: string;
  topPx: number;
  heightPx: number;
  isProjected?: boolean;
}

const WeekCalendar = forwardRef<{ scrollToToday: () => void }, WeekCalendarProps>(
  function WeekCalendar({ tasks, templates, history, selectedDate, onSelectDate, activeTask, getDisplayTimeMin }, ref) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [now, setNow] = useState(new Date());
  const today = useMemo(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; }, []);
  const weekDays = useMemo(() => getWeekDays(selectedDate), [selectedDate]);

  const scrollToToday = () => {
    const el = scrollRef.current;
    if (!el) return;
    const todayIdx = weekDays.findIndex(d => isSameDay(d, today));
    if (todayIdx >= 0) {
      const targetX = GUTTER_W + todayIdx * COL_W - el.clientWidth / 2 + COL_W / 2;
      el.scrollTo({ left: Math.max(0, targetX), behavior: "smooth" });
    }
  };

  useImperativeHandle(ref, () => ({ scrollToToday }));

  // Update now every minute
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(id);
  }, []);

  // Auto-scroll on mount
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    // Horizontal: center today
    const todayIdx = weekDays.findIndex(d => isSameDay(d, today));
    if (todayIdx >= 0) {
      const targetX = GUTTER_W + todayIdx * COL_W - el.clientWidth / 2 + COL_W / 2;
      el.scrollLeft = Math.max(0, targetX);
    }
    // Vertical: scroll to now (offset by header height)
    const nowH = now.getHours() + now.getMinutes() / 60;
    const targetY = HEADER_H + (nowH - HOUR_START) * HOUR_HEIGHT - el.clientHeight / 3;
    el.scrollTop = Math.max(0, targetY);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Build blocks for each day
  const getBlocks = (day: Date): BlockData[] => {
    const isToday = isSameDay(day, today);
    const isPast = day < today && !isToday;
    const isFuture = day > today;

    if (isToday) {
      return tasks.map(t => {
        const tMin = getDisplayTimeMin(t);
        const dur = t.status === "active" && activeTask ? Math.max(t.duration, (Date.now() - activeTask.startedAt) / 60000) : t.duration;
        return {
          name: t.name,
          type: t.type || (t.category === "rest" ? "rest" : "task"),
          topPx: ((tMin / 60) - HOUR_START) * HOUR_HEIGHT,
          heightPx: Math.max(4, (dur / 60) * HOUR_HEIGHT),
        };
      }).filter(b => b.topPx + b.heightPx > 0 && b.topPx < TOTAL_H);
    }

    if (isPast) {
      const key = dateKey(day);
      const dh = history[key];
      if (!dh) return [];
      return dh.log.map(entry => {
        const [hStr, mStr] = entry.startTime.split(":");
        const h = parseInt(hStr, 10) + parseInt(mStr, 10) / 60;
        return {
          name: entry.name,
          type: entry.type,
          topPx: (h - HOUR_START) * HOUR_HEIGHT,
          heightPx: Math.max(4, (entry.duration / 60) * HOUR_HEIGHT),
        };
      }).filter(b => b.topPx + b.heightPx > 0 && b.topPx < TOTAL_H);
    }

    if (isFuture) {
      const dayOfWeek = day.getDay();
      return templates
        .filter(t => t.days.length === 0 || t.days.includes(dayOfWeek))
        .map(t => ({
          name: t.name,
          type: t.type,
          topPx: ((t.timeMin / 60) - HOUR_START) * HOUR_HEIGHT,
          heightPx: Math.max(4, (t.duration / 60) * HOUR_HEIGHT),
          isProjected: true,
        }))
        .filter(b => b.topPx + b.heightPx > 0 && b.topPx < TOTAL_H);
    }

    return [];
  };

  // Total hours per day
  const getDayHours = (day: Date): string => {
    const isToday = isSameDay(day, today);
    if (isToday) {
      const total = tasks.reduce((s, t) => s + t.duration, 0);
      return `${(total / 60).toFixed(1)}h`;
    }
    const key = dateKey(day);
    const dh = history[key];
    if (dh) return `${(dh.totalMin / 60).toFixed(1)}h`;
    const dayOfWeek = day.getDay();
    const total = templates.filter(t => t.days.length === 0 || t.days.includes(dayOfWeek)).reduce((s, t) => s + t.duration, 0);
    return total > 0 ? `${(total / 60).toFixed(1)}h` : "";
  };

  const nowH = now.getHours() + now.getMinutes() / 60;
  const nowY = (nowH - HOUR_START) * HOUR_HEIGHT;

  const isRest = (type: string) => type === "rest" || type === "sleep";

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
      {/* Single scroll container — both axes */}
      <div
        ref={scrollRef}
        className="no-scrollbar"
        style={{
          flex: 1,
          overflow: "auto",
          WebkitOverflowScrolling: "touch" as any,
          position: "relative",
        }}
      >
        <div style={{ display: "flex", width: GUTTER_W + COL_W * 7, minHeight: HEADER_H + TOTAL_H }}>
          {/* Sticky hour gutter */}
          <div style={{
            width: GUTTER_W,
            flexShrink: 0,
            position: "sticky",
            left: 0,
            zIndex: 5,
            background: "#0a0a0a",
          }}>
            {/* Spacer for header row */}
            <div style={{ height: HEADER_H }} />
            {/* Hour labels */}
            <div style={{ position: "relative", height: TOTAL_H }}>
              {Array.from({ length: HOUR_END - HOUR_START }, (_, i) => {
                const h = HOUR_START + i;
                if (i % 2 !== 0) return null;
                return (
                  <div key={h} style={{
                    position: "absolute",
                    top: i * HOUR_HEIGHT - 5,
                    right: 4,
                    fontSize: 8,
                    fontFamily: MONO,
                    color: "var(--t5)",
                    lineHeight: 1,
                  }}>
                    {formatHour(h)}
                  </div>
                );
              })}
            </div>
          </div>

          {/* 7 day columns */}
          {weekDays.map((day) => {
            const isT = isSameDay(day, today);
            const isSel = isSameDay(day, selectedDate) && !isT;
            const blocks = getBlocks(day);
            return (
              <div
                key={day.getTime()}
                style={{
                  width: COL_W,
                  flexShrink: 0,
                  borderLeft: "1px solid rgba(255,255,255,0.06)",
                }}
              >
                {/* Sticky day header */}
                <div
                  onClick={() => onSelectDate(new Date(day))}
                  style={{
                    position: "sticky",
                    top: 0,
                    zIndex: 4,
                    background: "#0a0a0a",
                    height: HEADER_H,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    padding: "4px 0 2px",
                  }}
                >
                  <div style={{
                    fontSize: 9,
                    fontWeight: 600,
                    fontFamily: MONO,
                    color: isT ? "var(--accent)" : "var(--t4)",
                    letterSpacing: 1,
                    marginBottom: 2,
                  }}>
                    {DAY_ABBR[day.getDay()]}
                  </div>
                  <div style={{
                    width: 28,
                    height: 28,
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 13,
                    fontWeight: 700,
                    color: isT ? "#0a0a0a" : isSel ? "var(--accent)" : "var(--t2)",
                    background: isT ? "var(--accent)" : "transparent",
                    border: isSel ? "1.5px solid var(--accent)" : "1.5px solid transparent",
                  }}>
                    {day.getDate()}
                  </div>
                  <div style={{
                    fontSize: 9,
                    fontFamily: MONO,
                    color: "var(--t4)",
                    marginTop: 1,
                  }}>
                    {getDayHours(day)}
                  </div>
                </div>

                {/* Time grid + task blocks */}
                <div style={{
                  position: "relative",
                  height: TOTAL_H,
                  background: isT ? "rgba(255,208,0,0.025)" : "transparent",
                }}>
                  {/* Hour gridlines */}
                  {Array.from({ length: HOUR_END - HOUR_START }, (_, i) => (
                    <div key={i} style={{
                      position: "absolute",
                      top: i * HOUR_HEIGHT,
                      left: 0,
                      right: 0,
                      height: 1,
                      background: "rgba(255,255,255,0.06)",
                    }} />
                  ))}

                  {/* Task blocks */}
                  {blocks.map((b, bi) => {
                    const rest = isRest(b.type);
                    const taskBg = isT ? "rgba(255,208,0,0.5)" : "rgba(255,208,0,0.25)";
                    const restBg = isT ? "rgba(107,138,122,0.65)" : "rgba(107,138,122,0.4)";
                    return (
                      <div key={bi} style={{
                        position: "absolute",
                        top: Math.max(0, b.topPx),
                        left: 2,
                        right: 4,
                        height: b.heightPx,
                        background: rest ? restBg : taskBg,
                        borderLeft: `2.5px solid ${rest ? "#6b8a7a" : "#FFD000"}`,
                        borderRadius: "0 4px 4px 0",
                        overflow: "hidden",
                        opacity: b.isProjected ? 0.6 : 1,
                      }}>
                        {b.heightPx > 20 && (
                          <div style={{
                            fontSize: 9,
                            fontWeight: 600,
                            color: "var(--t1)",
                            padding: "3px 4px",
                            lineHeight: 1.2,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}>
                            {b.name}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* Now line — today only */}
                  {isT && nowY > 0 && nowY < TOTAL_H && (
                    <>
                      <div style={{
                        position: "absolute",
                        top: nowY,
                        left: 0,
                        right: 0,
                        height: 1.5,
                        background: "#E24B4A",
                        zIndex: 3,
                      }} />
                      <div style={{
                        position: "absolute",
                        top: nowY - 3,
                        left: -3.5,
                        width: 7,
                        height: 7,
                        borderRadius: "50%",
                        background: "#E24B4A",
                        zIndex: 3,
                      }} />
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Faint now line across full width */}
        {nowY > 0 && nowY < TOTAL_H && (
          <div style={{
            position: "absolute",
            top: HEADER_H + nowY,
            left: 0,
            right: 0,
            height: 1,
            background: "rgba(226,75,74,0.15)",
            zIndex: 1,
            pointerEvents: "none",
          }} />
        )}
      </div>
    </div>
  );
});

export default WeekCalendar;
