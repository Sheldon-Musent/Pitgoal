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
  center?: number;
  onCenterChange?: (idx: number) => void;
  onDoubleTapToday?: () => void;

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
const DAY_NAMES = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

const SPEC: Record<string, number[]> = {
  colWidth:    [140, 60, 36, 26],
  circle:      [36, 28, 22, 16],
  dateFont:    [15, 13, 10, 9],
  dayFont:     [10, 9, 8, 7],
  opacity:     [1, 0.6, 0.28, 0.15],
  barWidth:    [28, 20, 14, 8],
  barHeight:   [3, 2.5, 2, 1.5],
};

const getS = (key: string, dist: number): number =>
  SPEC[key][Math.min(dist, SPEC[key].length - 1)];

const COL_GAP = 6;

const WeekCalendar = forwardRef<{ scrollToToday: () => void }, WeekCalendarProps>(
  function WeekCalendar({ tasks, templates, history, selectedDate, onSelectDate, center: propCenter, onCenterChange, onDoubleTapToday }, ref) {

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

    const todayIdx = useMemo(() => weekDays.findIndex(d => isSameDay(d, today)), [weekDays, today]);

    const isControlled = typeof propCenter === "number" && propCenter >= 0;
    const [internalCenter, setInternalCenter] = useState(todayIdx >= 0 ? todayIdx : 0);
    const center = isControlled ? propCenter : internalCenter;
    const setCenter = useCallback((idx: number) => {
      setInternalCenter(idx);
      if (onCenterChange) onCenterChange(idx);
    }, [onCenterChange]);

    const lastTapRef = useRef(0);


    const dayHours = useMemo(() => {
      return weekDays.map((day) => {
        const isToday = isSameDay(day, today);
        const isFuture = day.getTime() > today.getTime();
        if (isToday) return tasks.reduce((sum, t) => sum + (t.duration || 0), 0) / 60;
        if (!isFuture) {
          const h = history[dateKey(day)];
          return h ? h.totalMin / 60 : 0;
        }
        const dow = day.getDay();
        const matching = templates.filter(t => t.days.length === 0 || t.days.includes(dow));
        return matching.reduce((sum, t) => sum + (t.duration || 0), 0) / 60;
      });
    }, [weekDays, today, tasks, templates, history]);

    const hasRealData = dayHours.some(h => h > 0);
    const displayHours = hasRealData ? dayHours : [2.5, 4.0, 6.5, 3.5, 1.5, 2.0, 0];
    const maxHrs = Math.max(...displayHours, 1);

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
    }, [center, weekDays, onSelectDate, setCenter]);

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
    for (let i = 0; i < center; i++) activeCenter += colWidths[i] + COL_GAP;
    activeCenter += colWidths[center] / 2;

    return (
      <div style={{ overflow: "hidden", padding: "6px 0 0", position: "relative", zIndex: 5 }}>
        <div
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: COL_GAP,
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

            return (
              <div
                key={i}
                className="tap"
                onClick={() => {
                  const now = Date.now();
                  const isDoubleTap = now - lastTapRef.current < 300;
                  lastTapRef.current = now;
                  if (isDoubleTap) {
                    const todayI = weekDays.findIndex(d => isSameDay(d, today));
                    if (todayI >= 0) {
                      setCenter(todayI);
                      onSelectDate(new Date(weekDays[todayI]));
                    }
                    if (onDoubleTapToday) onDoubleTapToday();
                    return;
                  }
                  setCenter(i);
                  onSelectDate(new Date(day));
                }}
                style={{
                  display: "flex", flexDirection: "column",
                  alignItems: "center", gap: 2,
                  width: getS("colWidth", dist), flexShrink: 0,
                  opacity: getS("opacity", dist) * (isFuture && !isCenter ? 0.5 : 1),
                  transition: "all 0.3s cubic-bezier(0.25, 0.1, 0.25, 1)",
                  cursor: "pointer",
                }}
              >
                {isCenter ? (
                  /* ── Center: horizontal glass pill with sunrise gradient ── */
                  <div style={{
                    position: "relative", display: "inline-flex", alignItems: "center",
                    gap: 8, padding: "6px 18px", borderRadius: 12, overflow: "hidden",
                    border: "1px solid rgba(255,255,255,0.13)",
                    transition: "all 0.3s cubic-bezier(0.25, 0.1, 0.25, 1)",
                  }}>
                    {/* Sunrise gradient — contained inside glass rect */}
                    <div style={{
                      position: "absolute", inset: 0,
                      background: "linear-gradient(135deg, rgba(255,120,40,0.4) 0%, rgba(255,170,50,0.3) 35%, rgba(255,210,70,0.2) 65%, rgba(255,235,130,0.1) 100%)",
                      zIndex: 0,
                    }} />
                    {/* Glass frost layer */}
                    <div style={{
                      position: "absolute", inset: 0,
                      background: "rgba(255,255,255,0.05)",
                      backdropFilter: "blur(10px) saturate(140%)",
                      WebkitBackdropFilter: "blur(10px) saturate(140%)" as any,
                      zIndex: 1,
                    }} />
                    <span style={{
                      fontSize: 13, fontWeight: 700, color: "var(--accent)",
                      letterSpacing: 0.5, zIndex: 2, position: "relative",
                    }}>{DAY_NAMES[i]}</span>
                    <span style={{
                      fontSize: 16, fontWeight: 800, color: "var(--accent)",
                      zIndex: 2, position: "relative",
                    }}>{day.getDate()}</span>
                  </div>
                ) : (
                  /* ── Non-center: vertical letter + number, no circle, no bar ── */
                  <>
                    <span style={{
                      fontSize: getS("dayFont", dist),
                      fontWeight: isBeside ? 600 : 400,
                      color: isToday ? "rgba(255,208,0,0.5)" : "rgba(255,255,255,0.2)",
                      transition: "all 0.3s ease",
                    }}>{DAY_LETTERS[i]}</span>
                    <span style={{
                      fontSize: getS("dateFont", dist),
                      fontWeight: isBeside ? 600 : 400,
                      color: isToday ? "var(--accent)" : isBeside ? "rgba(255,255,255,0.5)" : "var(--t3)",
                      transition: "all 0.3s ease",
                    }}>{day.getDate()}</span>
                  </>
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
