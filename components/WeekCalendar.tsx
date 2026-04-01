"use client";
import React, { useMemo, forwardRef, useImperativeHandle } from "react";
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

const WeekCalendar = forwardRef<{ scrollToToday: () => void }, WeekCalendarProps>(
  function WeekCalendar({ tasks, templates, history, selectedDate, onSelectDate }, ref) {

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

    const dayData = useMemo(() => {
      return weekDays.map((day) => {
        const isToday = isSameDay(day, today);
        const isFuture = day > today;

        if (isToday) {
          const hrs = tasks.reduce((sum, t) => sum + (t.duration || 0), 0) / 60;
          return { hrs, taskCount: tasks.length };
        }

        if (!isFuture) {
          const key = dateKey(day);
          const h = history[key];
          if (h) {
            return { hrs: h.totalMin / 60, taskCount: h.tasks };
          }
        }

        if (isFuture) {
          const dow = day.getDay();
          const matching = templates.filter(t => t.days.length === 0 || t.days.includes(dow));
          const hrs = matching.reduce((sum, t) => sum + (t.duration || 0), 0) / 60;
          return { hrs, taskCount: matching.length };
        }

        return { hrs: 0, taskCount: 0 };
      });
    }, [weekDays, today, tasks, templates, history]);

    // Mock data fallback for visual testing — remove when real data flows
    const hasRealData = dayData.some(d => d.hrs > 0);
    const displayData = hasRealData ? dayData : [
      { hrs: 2.5, taskCount: 2 },   // MON
      { hrs: 4.0, taskCount: 3 },   // TUE
      { hrs: 6.5, taskCount: 5 },   // WED (today)
      { hrs: 3.5, taskCount: 3 },   // THU
      { hrs: 1.5, taskCount: 2 },   // FRI
      { hrs: 2.0, taskCount: 1 },   // SAT
      { hrs: 0, taskCount: 0 },     // SUN
    ];
    const maxHrs = Math.max(...displayData.map(d => d.hrs), 1);

    useImperativeHandle(ref, () => ({
      scrollToToday: () => {}
    }));

    return (
      <div style={{
        display: "flex", justifyContent: "space-between",
        padding: "0 28px",
      }}>
        {weekDays.map((day, i) => {
          const isToday = isSameDay(day, today);
          const isSel = isSameDay(day, selectedDate);
          const isFuture = day > today;
          const { hrs } = displayData[i];
          const barPct = maxHrs > 0 ? hrs / maxHrs : 0;

          return (
            <div
              key={i}
              className="tap"
              onClick={() => onSelectDate(new Date(day))}
              style={{
                display: "flex", flexDirection: "column",
                alignItems: "center", gap: 2,
                cursor: "pointer",
                padding: "6px 0",
                opacity: isFuture ? 0.3 : 1,
              }}
            >
              {/* Day letter */}
              <span style={{
                fontSize: 10, fontWeight: 500,
                color: isToday ? "var(--accent)" : "rgba(255,255,255,0.2)",
              }}>{DAY_LETTERS[i]}</span>

              {/* Date circle */}
              <div style={{
                width: isToday ? 34 : 28,
                height: isToday ? 34 : 28,
                borderRadius: "50%",
                display: "flex", alignItems: "center", justifyContent: "center",
                background: isToday ? "var(--accent)" : "transparent",
                border: isSel && !isToday ? "1.5px solid rgba(255,208,0,0.4)" : "1.5px solid transparent",
                transition: "all 0.2s",
              }}>
                <span style={{
                  fontSize: isToday ? 15 : 13,
                  fontWeight: isToday ? 800 : 400,
                  color: isToday ? "#0a0a0a" : isSel ? "var(--t1)" : "var(--t3)",
                }}>{day.getDate()}</span>
              </div>

              {/* Effort bar */}
              <div style={{
                width: 20, height: 3, borderRadius: 2,
                background: "rgba(255,255,255,0.04)",
                overflow: "hidden",
                marginTop: 3,
              }}>
                {hrs > 0 && (
                  <div style={{
                    width: `${barPct * 100}%`,
                    height: "100%",
                    borderRadius: 2,
                    background: isToday ? "var(--accent)" : "rgba(255,208,0,0.4)",
                  }} />
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  }
);

export default WeekCalendar;
