"use client";
import React, { useRef, useEffect, useCallback, useState, useMemo, forwardRef, useImperativeHandle } from "react";
import { dateKey } from "../lib/utils";
import type { Task, Template, DayHistory } from "../lib/types";

interface WeekTimelineProps {
  tasks: Task[];
  templates: Template[];
  history: Record<string, DayHistory>;
  center: number;
  getDisplayTimeMin: (task: any) => number;
  activeTask: any;
  onUpdateDuration: (taskId: string, newDurationMin: number) => void;
}

const HOUR_START = 0;
const HOUR_END = 24;
const TOTAL_HOURS = HOUR_END - HOUR_START;
const HOUR_H = 72;
const TIME_COL = 64;
const TOP_PAD = 16;

const COL_WIDTHS = [80, 60, 44, 32];
const getColW = (dist: number) => COL_WIDTHS[Math.min(dist, COL_WIDTHS.length - 1)];

const fmtHour = (h: number): string => {
  if (h === 0 || h === 24) return "12 AM";
  if (h < 12) return `${h} AM`;
  if (h === 12) return "12 PM";
  return `${h - 12} PM`;
};

const isSameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

const getWeekStart = (date: Date): Date => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
};

const skyColor = (h: number): string => {
  if (h >= 0 && h < 4) return "rgba(30,30,80,0.35)";
  if (h >= 4 && h < 5) return "rgba(45,35,90,0.3)";
  if (h >= 5 && h < 6) return "rgba(80,50,70,0.3)";
  if (h >= 6 && h < 7) return "rgba(120,70,30,0.25)";
  if (h >= 7 && h < 8) return "rgba(140,90,20,0.2)";
  if (h >= 8 && h < 11) return "rgba(40,70,120,0.15)";
  if (h >= 11 && h < 14) return "rgba(50,80,130,0.12)";
  if (h >= 14 && h < 16) return "rgba(60,70,110,0.15)";
  if (h >= 16 && h < 18) return "rgba(130,85,25,0.2)";
  if (h >= 18 && h < 19) return "rgba(140,60,40,0.25)";
  if (h >= 19 && h < 20) return "rgba(90,45,70,0.28)";
  if (h >= 20 && h < 22) return "rgba(40,35,80,0.3)";
  return "rgba(30,28,75,0.35)";
};

const skyTextColor = (h: number): string => {
  if ((h >= 6 && h < 8) || (h >= 16 && h < 19)) return "rgba(255,220,150,0.4)";
  if (h >= 0 && h < 5 || h >= 20) return "rgba(180,180,220,0.3)";
  return "rgba(255,255,255,0.3)";
};

const getGlassStyle = (h: number): React.CSSProperties => ({
  display: "inline-flex",
  alignItems: "center",
  padding: "4px 10px",
  borderRadius: 8,
  background: skyColor(h),
  backdropFilter: "blur(12px) saturate(150%)",
  WebkitBackdropFilter: "blur(12px) saturate(150%)" as any,
  border: "1px solid rgba(255,255,255,0.06)",
});

interface BlockInfo {
  name: string;
  startMin: number;
  durMin: number;
  type: string;
  status: string;
  id: string;
  isToday: boolean;
}

const WeekTimeline = forwardRef<{ scrollToNow: () => void }, WeekTimelineProps>(
  function WeekTimeline({ tasks, templates, history, center, getDisplayTimeMin, activeTask, onUpdateDuration }, ref) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ taskId: string; startY: number; startDur: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const today = useMemo(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; }, []);

  const weekDays = useMemo(() => {
    const start = getWeekStart(today);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  }, [today]);

  const weekBlocks = useMemo(() => {
    return weekDays.map((day) => {
      const isToday = isSameDay(day, today);
      const isFuture = day.getTime() > today.getTime();

      if (isToday) {
        return tasks.filter(t => t.status !== "skipped").map(t => ({
          name: t.name,
          startMin: getDisplayTimeMin(t),
          durMin: t.duration || 60,
          type: (t as any).customType || t.type || "work",
          status: t.status || "pending",
          id: t.id,
          isToday: true,
        }));
      }

      if (!isFuture) {
        const key = dateKey(day);
        const h = history[key];
        if (h && h.log) {
          return h.log.map((entry, ei) => {
            const [hh, mm] = (entry.startTime || "0:0").split(":").map(Number);
            return {
              name: entry.name,
              startMin: (hh || 0) * 60 + (mm || 0),
              durMin: entry.duration || 60,
              type: entry.type || "work",
              status: "done",
              id: `hist-${ei}`,
              isToday: false,
            };
          });
        }
        return [];
      }

      const dow = day.getDay();
      const matching = templates.filter(t => t.days.length === 0 || t.days.includes(dow));
      return matching.map((t, ti) => ({
        name: t.name,
        startMin: t.timeMin || 0,
        durMin: t.duration || 60,
        type: t.type || "work",
        status: "pending",
        id: `tmpl-${ti}`,
        isToday: false,
      }));
    });
  }, [weekDays, today, tasks, templates, history, getDisplayTimeMin]);

  // Column layout aligned with picker
  const colWidths = weekDays.map((_, i) => getColW(Math.abs(i - center)));
  let activeCenterX = 0;
  for (let i = 0; i < center; i++) activeCenterX += colWidths[i];
  activeCenterX += colWidths[center] / 2;

  // Auto-scroll to current time on mount
  useEffect(() => {
    if (scrollRef.current) {
      const now = new Date();
      const nowHour = now.getHours() + now.getMinutes() / 60;
      const offset = (nowHour - HOUR_START) * HOUR_H + TOP_PAD - 120;
      scrollRef.current.scrollTop = Math.max(0, offset);
    }
  }, []);

  useImperativeHandle(ref, () => ({
    scrollToNow: () => {
      if (scrollRef.current) {
        const now = new Date();
        const nowH = now.getHours() + now.getMinutes() / 60;
        const offset = (nowH - HOUR_START) * HOUR_H + TOP_PAD - 120;
        scrollRef.current.scrollTo({ top: Math.max(0, offset), behavior: "smooth" });
      }
    }
  }));

  const [nowMin, setNowMin] = useState(() => {
    const n = new Date();
    return n.getHours() * 60 + n.getMinutes();
  });

  useEffect(() => {
    const id = setInterval(() => {
      const n = new Date();
      setNowMin(n.getHours() * 60 + n.getMinutes());
    }, 60000);
    return () => clearInterval(id);
  }, []);

  const nowHour = nowMin / 60;

  const onHandleStart = useCallback((e: any, taskId: string, startDur: number) => {
    e.preventDefault();
    e.stopPropagation();
    const y = e.clientY ?? e.touches?.[0]?.clientY;
    dragRef.current = { taskId, startY: y, startDur };
    setIsDragging(true);

    const onMove = (ev: any) => {
      if (!dragRef.current) return;
      const cy = ev.clientY ?? ev.touches?.[0]?.clientY;
      const dy = cy - dragRef.current.startY;
      const durDeltaMin = (dy / HOUR_H) * 60;
      const newDur = Math.max(15, Math.round((dragRef.current.startDur + durDeltaMin) / 15) * 15);
      onUpdateDuration(dragRef.current.taskId, newDur);
    };

    const onUp = () => {
      dragRef.current = null;
      setIsDragging(false);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onUp);
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("touchmove", onMove, { passive: false });
    window.addEventListener("touchend", onUp);
  }, [onUpdateDuration]);

  return (
    <div
      ref={scrollRef}
      className="no-scrollbar"
      style={{
        flex: 1, overflowY: "auto", overflowX: "hidden",
        WebkitOverflowScrolling: "touch" as any,
        position: "relative", minHeight: 0,
      }}
    >
      <div style={{
        position: "relative",
        height: TOTAL_HOURS * HOUR_H + TOP_PAD + 40,
      }}>
        {/* Glass time pills */}
        {Array.from({ length: TOTAL_HOURS }, (_, hi) => {
          const h = HOUR_START + hi;
          return (
            <div key={h} style={{
              position: "absolute", top: hi * HOUR_H + TOP_PAD - 11,
              left: 4, zIndex: 8, ...getGlassStyle(h),
            }}>
              <span style={{
                fontSize: 11, fontWeight: 600,
                color: skyTextColor(h), letterSpacing: -0.2,
              }}>{fmtHour(h)}</span>
            </div>
          );
        })}

        {/* Gridlines — full width of task area */}
        {Array.from({ length: TOTAL_HOURS }, (_, hi) => (
          <div key={`gl-${hi}`} style={{
            position: "absolute", top: hi * HOUR_H + TOP_PAD,
            left: TIME_COL, right: 16,
            height: 1, background: "rgba(255,255,255,0.035)",
          }} />
        ))}

        {/* Now line — full width */}
        {nowHour >= HOUR_START && nowHour <= HOUR_END && (
          <div style={{
            position: "absolute",
            top: (nowHour - HOUR_START) * HOUR_H + TOP_PAD,
            left: TIME_COL, right: 16,
            height: 2,
            background: "linear-gradient(to right, var(--danger, #E24B4A) 0%, var(--danger, #E24B4A) 60%, transparent 100%)",
            borderRadius: 1, zIndex: 7, pointerEvents: "none",
          }}>
            <div style={{
              position: "absolute", left: -4, top: -3,
              width: 8, height: 8, borderRadius: "50%",
              background: "var(--danger, #E24B4A)",
              boxShadow: "0 0 8px var(--danger, #E24B4A), 0 0 16px rgba(226,75,74,0.3)",
            }} />
          </div>
        )}

        {/* Day columns — translateX aligned with picker */}
        <div style={{
          position: "absolute",
          top: 0, bottom: 0,
          left: TIME_COL, right: 0,
          overflow: "hidden",
        }}>
        <div style={{
          display: "flex",
          transform: `translateX(calc(50% - ${activeCenterX}px))`,
          transition: "transform 0.3s cubic-bezier(0.25, 0.1, 0.25, 1)",
          willChange: "transform",
          height: "100%",
        }}>
          {weekDays.map((day, i) => {
            const dist = Math.abs(i - center);
            const isCenter = i === center;
            const isBeside = dist === 1;
            const isDayToday = isSameDay(day, today);
            const colW = getColW(dist);
            const blocks = weekBlocks[i];
            const opacity = isCenter ? 1 : isBeside ? 0.5 : dist === 2 ? 0.2 : 0.08;

            return (
              <div key={i} style={{
                width: colW, flexShrink: 0,
                position: "relative",
                height: TOTAL_HOURS * HOUR_H + TOP_PAD + 40,
                opacity,
                overflow: "visible",
                transition: "all 0.3s cubic-bezier(0.25, 0.1, 0.25, 1)",
              }}>
                {/* Day column separator — visible only during drag */}
                <div style={{
                  position: "absolute", top: TOP_PAD, bottom: 0,
                  right: 0, width: 1,
                  background: "rgba(255,255,255,0.06)",
                  opacity: isDragging ? 1 : 0,
                  transition: "opacity 0.2s ease",
                  pointerEvents: "none",
                }} />

                {/* Task blocks */}
                {blocks.map((b) => {
                  const startH = b.startMin / 60;
                  const durH = b.durMin / 60;
                  const top = (startH - HOUR_START) * HOUR_H + TOP_PAD;
                  const height = Math.min(durH * HOUR_H, 6 * HOUR_H);
                  const isDone = b.status === "done";
                  const isActive = b.id === activeTask?.id;
                  const color = b.type === "rest" ? "var(--rest, #6b8a7a)" : "var(--accent, #FFD000)";
                  const bg = b.type === "rest" ? "rgba(107,138,122,0.15)" : "rgba(255,208,0,0.1)";

                  if (isDayToday) {
                    return (
                      <div key={b.id} style={{
                        position: "absolute",
                        top: top + 1, left: 2, right: -40,
                        height: height - 2, minHeight: 28,
                        borderRadius: 8,
                        background: bg,
                        backdropFilter: "blur(8px)",
                        WebkitBackdropFilter: "blur(8px)" as any,
                        borderLeft: `3px solid ${color}`,
                        border: isActive ? `1px solid rgba(255,208,0,0.25)` : `1px solid rgba(255,255,255,0.04)`,
                        borderLeftWidth: 3,
                        borderLeftColor: color,
                        padding: "6px 8px 14px",
                        display: "flex", flexDirection: "column",
                        justifyContent: "center",
                        opacity: isDone ? 0.35 : 1,
                        overflow: "visible",
                      }}>
                        <span style={{
                          fontSize: 11, fontWeight: 600,
                          color: isDone ? "rgba(255,255,255,0.4)" : "var(--t1)",
                          textDecoration: isDone ? "line-through" : "none",
                          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                        }}>{b.name}</span>
                        {height > 44 && (
                          <span style={{
                            fontSize: 9, color: "rgba(255,255,255,0.2)", marginTop: 2,
                          }}>
                            {b.durMin >= 60 ? `${Math.floor(b.durMin / 60)}h${b.durMin % 60 > 0 ? `${b.durMin % 60}m` : ""}` : `${b.durMin}m`}
                            {isActive && <span style={{ color: "var(--accent)", fontWeight: 700, marginLeft: 4, fontSize: 8, letterSpacing: 1 }}>ACTIVE</span>}
                          </span>
                        )}
                        {!isDone && b.isToday && (
                          <div
                            onPointerDown={(e) => onHandleStart(e, b.id, b.durMin)}
                            onTouchStart={(e) => onHandleStart(e, b.id, b.durMin)}
                            style={{
                              position: "absolute", bottom: 0, left: 8, right: 8,
                              height: 12, display: "flex", alignItems: "center", justifyContent: "center",
                              cursor: "ns-resize", touchAction: "none",
                            }}
                          >
                            <div style={{ display: "flex", flexDirection: "column", gap: 2, alignItems: "center" }}>
                              <div style={{ width: 18, height: 1.5, borderRadius: 1, background: "rgba(255,255,255,0.12)" }} />
                              <div style={{ width: 12, height: 1.5, borderRadius: 1, background: "rgba(255,255,255,0.08)" }} />
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  } else {
                    return (
                      <div key={b.id} style={{
                        position: "absolute",
                        top: top + 1, left: 3, right: 5,
                        height: Math.max(height - 2, 4),
                        borderRadius: isBeside ? 4 : 2,
                        background: "transparent",
                        border: "1px solid rgba(255,255,255,0.04)",
                        borderLeftWidth: 2,
                        borderLeftColor: color,
                        opacity: isDone ? 0.15 : 0.25,
                      }} />
                    );
                  }
                })}
              </div>
            );
          })}
        </div>
        </div>
      </div>
    </div>
  );
});

export default WeekTimeline;
