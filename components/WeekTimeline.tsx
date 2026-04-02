"use client";
import React, { useRef, useEffect, useCallback, useState } from "react";
import type { Task } from "../lib/types";

interface WeekTimelineProps {
  tasks: Task[];
  getDisplayTimeMin: (task: any) => number;
  activeTask: any;
  onUpdateDuration: (taskId: string, newDurationMin: number) => void;
}

const HOUR_START = 6;
const HOUR_END = 22;
const TOTAL_HOURS = HOUR_END - HOUR_START;
const HOUR_H = 72;
const TIME_COL = 70;

const fmtHour = (h: number): string => {
  if (h === 0 || h === 24) return "12 AM";
  if (h < 12) return `${h} AM`;
  if (h === 12) return "12 PM";
  return `${h - 12} PM`;
};

const typeColor = (task: Task): string => {
  const t = (task as any).customType || task.type || "work";
  if (t === "rest") return "var(--rest, #6b8a7a)";
  return "var(--accent, #FFD000)";
};

const typeBg = (task: Task): string => {
  const t = (task as any).customType || task.type || "work";
  if (t === "rest") return "rgba(107,138,122,0.15)";
  return "rgba(255,208,0,0.1)";
};

const glassStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  padding: "4px 10px",
  borderRadius: 8,
  background: "rgba(255,255,255,0.04)",
  backdropFilter: "blur(12px) saturate(150%)",
  WebkitBackdropFilter: "blur(12px) saturate(150%)" as any,
  border: "1px solid rgba(255,255,255,0.06)",
};

export default function WeekTimeline({ tasks, getDisplayTimeMin, activeTask, onUpdateDuration }: WeekTimelineProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ taskId: string; startY: number; startDur: number } | null>(null);

  // Auto-scroll to current time on mount
  useEffect(() => {
    if (scrollRef.current) {
      const now = new Date();
      const nowHour = now.getHours() + now.getMinutes() / 60;
      const offset = (nowHour - HOUR_START) * HOUR_H - 120;
      scrollRef.current.scrollTop = Math.max(0, offset);
    }
  }, []);

  // Now line position (updates every minute)
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

  // Drag handle
  const onHandleStart = useCallback((e: any, task: Task) => {
    e.preventDefault();
    e.stopPropagation();
    const y = e.clientY ?? e.touches?.[0]?.clientY;
    dragRef.current = { taskId: task.id, startY: y, startDur: task.duration || 60 };

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
        flex: 1,
        overflowY: "auto",
        overflowX: "hidden",
        WebkitOverflowScrolling: "touch" as any,
        position: "relative",
        minHeight: 0,
      }}
    >
      <div style={{
        position: "relative",
        height: TOTAL_HOURS * HOUR_H + 40,
        padding: "0 16px",
      }}>
        {/* Glass time pills + gridlines */}
        {Array.from({ length: TOTAL_HOURS }, (_, hi) => {
          const h = HOUR_START + hi;
          return (
            <div key={h}>
              <div style={{
                position: "absolute", top: hi * HOUR_H,
                left: TIME_COL, right: 16,
                height: 1, background: "rgba(255,255,255,0.035)",
              }} />
              <div style={{
                position: "absolute", top: hi * HOUR_H - 11,
                left: 4, zIndex: 3, ...glassStyle,
              }}>
                <span style={{
                  fontSize: 11, fontWeight: 600,
                  color: "rgba(255,255,255,0.3)",
                  letterSpacing: -0.2,
                }}>{fmtHour(h)}</span>
              </div>
            </div>
          );
        })}

        {/* Task blocks with drag handles */}
        {tasks.filter(t => t.status !== "skipped").map((task) => {
          const timeMin = getDisplayTimeMin(task);
          const startHour = timeMin / 60;
          const durHours = (task.duration || 60) / 60;
          const top = (startHour - HOUR_START) * HOUR_H;
          const height = durHours * HOUR_H;
          const isDone = task.status === "done";
          const isActive = task.id === activeTask?.id;
          const color = typeColor(task);

          if (top + height < 0 || top > TOTAL_HOURS * HOUR_H) return null;

          return (
            <div key={task.id} style={{
              position: "absolute",
              top: top + 2, left: TIME_COL, right: 16,
              height: height - 4, minHeight: 32,
              borderRadius: 10,
              background: typeBg(task),
              backdropFilter: "blur(8px)",
              WebkitBackdropFilter: "blur(8px)" as any,
              borderLeft: `3px solid ${color}`,
              border: isActive ? `1px solid rgba(255,208,0,0.25)` : `1px solid rgba(255,255,255,0.04)`,
              borderLeftWidth: 3,
              borderLeftColor: color,
              padding: "8px 12px 16px",
              display: "flex", flexDirection: "column",
              justifyContent: "center",
              opacity: isDone ? 0.35 : 1,
              overflow: "visible",
            }}>
              <span style={{
                fontSize: 13, fontWeight: 600,
                color: isDone ? "rgba(255,255,255,0.4)" : "var(--t1)",
                textDecoration: isDone ? "line-through" : "none",
                whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
              }}>{task.name}</span>
              {height > 48 && (
                <span style={{
                  fontSize: 10, color: "rgba(255,255,255,0.2)",
                  marginTop: 3, display: "flex", alignItems: "center", gap: 6,
                }}>
                  {durHours >= 1 ? `${Math.floor(durHours)}h${(task.duration % 60) > 0 ? `${task.duration % 60}m` : ""}` : `${task.duration}m`}
                  {isActive && (
                    <span style={{ color: "var(--accent)", fontWeight: 700, fontSize: 9, letterSpacing: 1 }}>ACTIVE</span>
                  )}
                </span>
              )}

              {/* Drag handle */}
              {!isDone && (
                <div
                  onPointerDown={(e) => onHandleStart(e, task)}
                  onTouchStart={(e) => onHandleStart(e, task)}
                  style={{
                    position: "absolute",
                    bottom: 0, left: 12, right: 12,
                    height: 14,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    cursor: "ns-resize",
                    touchAction: "none",
                  }}
                >
                  <div style={{ display: "flex", flexDirection: "column", gap: 2, alignItems: "center" }}>
                    <div style={{ width: 20, height: 1.5, borderRadius: 1, background: "rgba(255,255,255,0.12)" }} />
                    <div style={{ width: 14, height: 1.5, borderRadius: 1, background: "rgba(255,255,255,0.08)" }} />
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {/* Now line */}
        {nowHour >= HOUR_START && nowHour <= HOUR_END && (
          <div style={{
            position: "absolute",
            top: (nowHour - HOUR_START) * HOUR_H,
            left: TIME_COL, right: 16,
            height: 2,
            background: "var(--danger, #E24B4A)",
            borderRadius: 1,
            zIndex: 6,
            pointerEvents: "none",
          }}>
            <div style={{
              position: "absolute",
              left: -4, top: -3,
              width: 8, height: 8,
              borderRadius: "50%",
              background: "var(--danger, #E24B4A)",
              boxShadow: "0 0 6px var(--danger, #E24B4A)",
            }} />
          </div>
        )}
      </div>
    </div>
  );
}
