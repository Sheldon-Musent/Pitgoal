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

const SPEC: Record<string, number[]> = {
  colWidth:    [80, 60, 44, 32],
  circle:      [36, 28, 22, 16],
  dateFont:    [15, 13, 10, 9],
  dayFont:     [10, 9, 8, 7],
  opacity:     [1, 0.6, 0.28, 0.15],
  barWidth:    [28, 20, 14, 8],
  barHeight:   [3, 2.5, 2, 1.5],
};

const getS = (key: string, dist: number): number =>
  SPEC[key][Math.min(dist, SPEC[key].length - 1)];

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
    for (let i = 0; i < center; i++) activeCenter += colWidths[i];
    activeCenter += colWidths[center] / 2;

    return (
      <div style={{ overflow: "hidden", padding: "4px 0 8px" }}>
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

            return (
              <div
                key={i}
                className="tap"
                onClick={() => {
                  const now = Date.now();
                  const isDoubleTap = i === center && isToday && (now - lastTapRef.current < 300);
                  lastTapRef.current = now;
                  setCenter(i);
                  onSelectDate(new Date(day));
                  if (isDoubleTap && onDoubleTapToday) {
                    onDoubleTapToday();
                  }
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
                <span style={{
                  fontSize: getS("dayFont", dist),
                  fontWeight: isCenter ? 700 : isBeside ? 600 : 400,
                  color: isToday && isCenter ? "var(--accent)" : isToday ? "rgba(255,208,0,0.5)" : "rgba(255,255,255,0.2)",
                  transition: "all 0.3s ease",
                }}>{DAY_LETTERS[i]}</span>

                <div style={{
                  width: getS("circle", dist), height: getS("circle", dist),
                  borderRadius: "50%",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  background: isToday ? "var(--accent)" : "transparent",
                  border: isCenter && !isToday ? "1.5px solid rgba(255,208,0,0.3)" : "1.5px solid transparent",
                  transition: "all 0.3s cubic-bezier(0.25, 0.1, 0.25, 1)",
                }}>
                  <span style={{
                    fontSize: getS("dateFont", dist),
                    fontWeight: isCenter ? 800 : isBeside ? 600 : 400,
                    color: isToday ? "#0a0a0a" : isCenter ? "var(--t1)" : isBeside ? "rgba(255,255,255,0.5)" : "var(--t3)",
                    transition: "all 0.3s ease",
                  }}>{day.getDate()}</span>
                </div>

                <div style={{
                  width: getS("barWidth", dist), height: getS("barHeight", dist),
                  borderRadius: 2, background: "rgba(255,255,255,0.04)",
                  overflow: "hidden", transition: "all 0.3s ease",
                }}>
                  {displayHours[i] > 0 && (
                    <div style={{
                      width: `${(displayHours[i] / maxHrs) * 100}%`, height: "100%", borderRadius: 2,
                      background: isToday && isCenter ? "var(--accent)" : "rgba(255,208,0,0.3)",
                    }} />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }
);

export default WeekCalendar;
