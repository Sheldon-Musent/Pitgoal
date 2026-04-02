"use client";
import React, { useState, useRef, useMemo, useCallback, forwardRef, useImperativeHandle } from "react";
import { dateKey } from "../lib/utils";
import type { Task, Template, DayHistory } from "../lib/types";

interface WeekCalendarProps {
  tasks: Task[];
  templates: Template[];
  history: Record<string, DayHistory>;
  selectedDate: Date;
  onSelectDate: (d: Date) => void;
  activeTask: any;
  getDisplayTimeMin: (task: any) => number;
}

const getWeekStart = (date: Date): Date => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
};

const isSameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

const DAY_LETTERS = ["M", "T", "W", "T", "F", "S", "S"];

// Distance-based specs: [center, ±1, ±2, ±3]
const SPEC: Record<string, number[]> = {
  colWidth:    [120, 76, 44, 32],
  circle:      [38, 30, 22, 16],
  dateFont:    [16, 14, 10, 9],
  dayFont:     [11, 10, 8, 7],
  opacity:     [1, 0.65, 0.25, 0.12],
  barWidth:    [32, 22, 14, 8],
  barHeight:   [3, 3, 2, 1.5],
  blockWidth:  [108, 62, 28, 16],
  blockH:      [18, 10, 5, 3],
  blockGap:    [4, 3, 1.5, 1],
  blockRadius: [6, 4, 2, 1.5],
  blockFont:   [9, 7.5, 0, 0],
  blockBorder: [2.5, 2, 1, 1],
  maxBlocks:   [8, 5, 3, 2],
  durScale:    [28, 10, 0, 0],
};

const getS = (key: string, dist: number): number =>
  SPEC[key][Math.min(dist, SPEC[key].length - 1)];

const fmtDur = (hrs: number): string => {
  if (hrs >= 1) {
    const h = Math.floor(hrs);
    const m = Math.round((hrs - h) * 60);
    return m > 0 ? `${h}h${m}m` : `${h}h`;
  }
  return `${Math.round(hrs * 60)}m`;
};

const typeColor = (type: string): string => {
  if (type === "rest") return "var(--rest, #6b8a7a)";
  if (type === "urgent" || type === "work") return "var(--accent, #FFD000)";
  if (type === "life") return "#f59e0b";
  return "var(--accent, #FFD000)";
};

const typeBg = (type: string, bright: boolean): string => {
  const a = bright ? 0.35 : 0.2;
  if (type === "rest") return `rgba(107,138,122,${a})`;
  if (type === "life") return `rgba(245,158,11,${a})`;
  return `rgba(255,208,0,${a})`;
};

interface DayTaskBlock {
  name: string;
  dur: number;
  type: string;
  timeMin: number;
  status: string;
}

const WeekCalendar = forwardRef<{ scrollToToday: () => void }, WeekCalendarProps>(
  function WeekCalendar({ tasks, templates, history, selectedDate, onSelectDate, getDisplayTimeMin }, ref) {

    const today = useMemo(() => {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      return d;
    }, []);

    const weekDays = useMemo(() => {
      const start = getWeekStart(today);
      return Array.from({ length: 7 }, (_, i) => {
        const d = new Date(start);
        d.setDate(start.getDate() + i);
        return d;
      });
    }, [today]);

    const todayIdx = useMemo(() => {
      return weekDays.findIndex(d => isSameDay(d, today));
    }, [weekDays, today]);

    const [center, setCenter] = useState(todayIdx >= 0 ? todayIdx : 0);

    // Build task blocks + hours per day
    const dayInfo = useMemo(() => {
      return weekDays.map((day) => {
        const isToday = isSameDay(day, today);
        const isFuture = day.getTime() > today.getTime();

        let blocks: DayTaskBlock[] = [];
        let hrs = 0;

        if (isToday) {
          blocks = tasks.map(t => ({
            name: t.name,
            dur: (t.duration || 60) / 60,
            type: (t as any).customType || t.type || "work",
            timeMin: getDisplayTimeMin(t),
            status: t.status || "pending",
          }));
          hrs = tasks.reduce((sum, t) => sum + (t.duration || 0), 0) / 60;
        } else if (!isFuture) {
          const key = dateKey(day);
          const h = history[key];
          if (h && h.log) {
            blocks = h.log.map(entry => ({
              name: entry.name,
              dur: (entry.duration || 0) / 60,
              type: entry.type || "work",
              timeMin: 0,
              status: "done",
            }));
            hrs = h.totalMin / 60;
          }
        } else {
          const dow = day.getDay();
          const matching = templates.filter(t => t.days.length === 0 || t.days.includes(dow));
          blocks = matching.map(t => ({
            name: t.name,
            dur: (t.duration || 60) / 60,
            type: t.type || "work",
            timeMin: t.timeMin || 0,
            status: "pending",
          }));
          hrs = matching.reduce((sum, t) => sum + (t.duration || 0), 0) / 60;
        }

        return { blocks, hrs };
      });
    }, [weekDays, today, tasks, templates, history]);

    // Mock fallback
    const hasRealData = dayInfo.some(d => d.hrs > 0);
    const displayInfo = hasRealData ? dayInfo : [
      { blocks: [{ name: "Sprint plan", dur: 1.5, type: "work", timeMin: 540, status: "done" }, { name: "1:1", dur: 1, type: "work", timeMin: 840, status: "pending" }], hrs: 2.5 },
      { blocks: [{ name: "Gym", dur: 1, type: "rest", timeMin: 420, status: "done" }, { name: "Deep work", dur: 2.5, type: "work", timeMin: 540, status: "done" }, { name: "Review", dur: 1, type: "work", timeMin: 780, status: "done" }], hrs: 4.5 },
      { blocks: [{ name: "Run", dur: 0.75, type: "rest", timeMin: 390, status: "done" }, { name: "Pitgoal", dur: 3, type: "work", timeMin: 480, status: "done" }, { name: "Lunch", dur: 0.75, type: "rest", timeMin: 720, status: "active" }, { name: "Security+", dur: 2, type: "work", timeMin: 840, status: "pending" }, { name: "Emails", dur: 0.5, type: "work", timeMin: 960, status: "pending" }], hrs: 7 },
      { blocks: [{ name: "Walk", dur: 0.5, type: "rest", timeMin: 420, status: "pending" }, { name: "Standup", dur: 0.5, type: "work", timeMin: 540, status: "pending" }, { name: "Code review", dur: 2, type: "work", timeMin: 600, status: "pending" }, { name: "Retro", dur: 1, type: "work", timeMin: 840, status: "pending" }], hrs: 4 },
      { blocks: [{ name: "Yoga", dur: 1, type: "rest", timeMin: 480, status: "pending" }, { name: "Feature", dur: 2, type: "work", timeMin: 600, status: "pending" }], hrs: 3 },
      { blocks: [{ name: "Hike", dur: 2, type: "rest", timeMin: 600, status: "pending" }], hrs: 2 },
      { blocks: [], hrs: 0 },
    ];

    const maxHrs = Math.max(...displayInfo.map(d => d.hrs), 1);

    // Swipe handling
    const startXRef = useRef(0);
    const isDragging = useRef(false);

    const onTouchStart = useCallback((e: React.TouchEvent) => {
      startXRef.current = e.touches[0].clientX;
      isDragging.current = true;
    }, []);

    const onTouchEnd = useCallback((e: React.TouchEvent) => {
      if (!isDragging.current) return;
      isDragging.current = false;
      const dx = e.changedTouches[0].clientX - startXRef.current;
      if (dx < -35 && center < 6) {
        const next = center + 1;
        setCenter(next);
        onSelectDate(new Date(weekDays[next]));
      } else if (dx > 35 && center > 0) {
        const next = center - 1;
        setCenter(next);
        onSelectDate(new Date(weekDays[next]));
      }
    }, [center, weekDays, onSelectDate]);

    // scrollToToday resets center
    useImperativeHandle(ref, () => ({
      scrollToToday: () => {
        const idx = weekDays.findIndex(d => isSameDay(d, today));
        if (idx >= 0) {
          setCenter(idx);
          onSelectDate(new Date(weekDays[idx]));
        }
      }
    }));

    const colWidths = weekDays.map((_, i) => getS("colWidth", Math.abs(i - center)));
    let activeCenter = 0;
    for (let i = 0; i < center; i++) activeCenter += colWidths[i];
    activeCenter += colWidths[center] / 2;

    return (
      <div style={{ overflow: "hidden", padding: "4px 0 16px", minHeight: 160 }}>
        <div
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
          style={{
            display: "flex",
            alignItems: "flex-start",
            touchAction: "pan-y",
            cursor: "grab",
            transform: `translateX(calc(50% - ${activeCenter}px))`,
            transition: "transform 0.3s cubic-bezier(0.25, 0.1, 0.25, 1)",
            willChange: "transform",
          }}
        >
          {weekDays.map((day, i) => {
          const dist = Math.abs(i - center);
          const isCenter = i === center;
          const isToday = isSameDay(day, today);
          const isFuture = day.getTime() > today.getTime();
          const isBeside = dist === 1;

          const { blocks, hrs } = displayInfo[i];
          const barPct = maxHrs > 0 ? hrs / maxHrs : 0;

          const colW = getS("colWidth", dist);
          const circleS = getS("circle", dist);
          const dateF = getS("dateFont", dist);
          const dayF = getS("dayFont", dist);
          const op = getS("opacity", dist) * (isFuture && !isCenter ? 0.5 : 1);
          const barW = getS("barWidth", dist);
          const barH = getS("barHeight", dist);
          const blockW = getS("blockWidth", dist);
          const blockH = getS("blockH", dist);
          const blockGap = getS("blockGap", dist);
          const blockR = getS("blockRadius", dist);
          const blockF = getS("blockFont", dist);
          const blockBorder = getS("blockBorder", dist);
          const maxBlocks = getS("maxBlocks", dist);
          const durScale = getS("durScale", dist);

          return (
            <div
              key={i}
              className="tap"
              onClick={() => {
                setCenter(i);
                onSelectDate(new Date(day));
              }}
              style={{
                display: "flex", flexDirection: "column",
                alignItems: "center",
                gap: 3,
                width: colW,
                flexShrink: 0,
                opacity: op,
                transition: "all 0.3s cubic-bezier(0.25, 0.1, 0.25, 1)",
                cursor: "pointer",
              }}
            >
              {/* Day letter */}
              <span style={{
                fontSize: dayF,
                fontWeight: isCenter ? 700 : isBeside ? 600 : 400,
                color: isToday && isCenter ? "var(--accent)" : isToday ? "rgba(255,208,0,0.6)" : "rgba(255,255,255,0.25)",
                transition: "all 0.3s ease",
              }}>{DAY_LETTERS[i]}</span>

              {/* Date circle */}
              <div style={{
                width: circleS, height: circleS,
                borderRadius: "50%",
                display: "flex", alignItems: "center", justifyContent: "center",
                background: isToday ? "var(--accent)" : "transparent",
                border: isCenter && !isToday ? "1.5px solid rgba(255,208,0,0.35)" : "1.5px solid transparent",
                transition: "all 0.3s cubic-bezier(0.25, 0.1, 0.25, 1)",
              }}>
                <span style={{
                  fontSize: dateF,
                  fontWeight: isCenter ? 800 : isBeside ? 600 : 400,
                  color: isToday ? "#0a0a0a" : isCenter ? "var(--t1)" : isBeside ? "rgba(255,255,255,0.55)" : "var(--t3)",
                  transition: "all 0.3s ease",
                }}>{day.getDate()}</span>
              </div>

              {/* Effort bar */}
              <div style={{
                width: barW, height: barH,
                borderRadius: 2,
                background: "rgba(255,255,255,0.04)",
                overflow: "hidden",
                transition: "all 0.3s ease",
              }}>
                {hrs > 0 && (
                  <div style={{
                    width: `${barPct * 100}%`,
                    height: "100%",
                    borderRadius: 2,
                    background: isToday && isCenter ? "var(--accent)" : "rgba(255,208,0,0.35)",
                    transition: "width 0.3s ease",
                  }} />
                )}
              </div>

              {/* Task blocks */}
              {blocks.length > 0 && (
                <div style={{
                  display: "flex", flexDirection: "column",
                  alignItems: "center",
                  gap: blockGap,
                  marginTop: isCenter ? 4 : isBeside ? 3 : 2,
                  width: blockW,
                  transition: "all 0.3s ease",
                  position: "relative",
                }}>
                  {blocks.slice(0, maxBlocks).map((t, ti) => {
                    const color = typeColor(t.type);
                    const bg = typeBg(t.type, isCenter || isBeside);
                    const h = durScale > 0 ? Math.max(blockH, t.dur * durScale) : blockH;

                    return (
                      <div key={ti} style={{
                        width: "100%",
                        height: h,
                        borderRadius: blockR,
                        background: bg,
                        borderLeft: `${blockBorder}px solid ${color}`,
                        display: "flex",
                        alignItems: "center",
                        padding: blockF > 0 ? "0 5px" : 0,
                        overflow: "hidden",
                        transition: "all 0.3s ease",
                      }}>
                        {blockF > 0 && h > 10 && (
                          <span style={{
                            fontSize: blockF,
                            fontWeight: 600,
                            color: t.type === "rest" ? "rgba(255,255,255,0.5)" : "rgba(255,255,255,0.55)",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            display: "block",
                            lineHeight: 1.2,
                          }}>{t.name}</span>
                        )}
                      </div>
                    );
                  })}
                  {/* Now line — center column, today only */}
                  {isCenter && isToday && (() => {
                    const now = new Date();
                    const nowMin = now.getHours() * 60 + now.getMinutes();
                    const sorted = blocks.slice(0, maxBlocks);
                    let nowIdx = sorted.findIndex(t =>
                      t.status === "pending" && t.timeMin > nowMin
                    );
                    if (nowIdx === -1) nowIdx = sorted.length;
                    let topPx = 0;
                    for (let j = 0; j < nowIdx; j++) {
                      const bh = durScale > 0 ? Math.max(blockH, sorted[j].dur * durScale) : blockH;
                      topPx += bh + blockGap;
                    }
                    topPx -= blockGap / 2;

                    return (
                      <div style={{
                        position: "absolute",
                        top: topPx,
                        left: -2,
                        right: -2,
                        height: 2,
                        background: "var(--danger, #E24B4A)",
                        borderRadius: 1,
                        zIndex: 2,
                      }}>
                        <div style={{
                          position: "absolute",
                          left: -3,
                          top: -2.5,
                          width: 7,
                          height: 7,
                          borderRadius: "50%",
                          background: "var(--danger, #E24B4A)",
                        }} />
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          );
        })}
        </div>
      </div>
    );
  }
);

export default WeekCalendar;
