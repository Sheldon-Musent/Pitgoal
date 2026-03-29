"use client";
import React, { useMemo } from "react";

interface DayTimelineProps {
  tasks: any[];
  activeTask: any;
  getDisplayTimeMin: (task: any) => number;
  getDisplayTime: (task: any) => string;
}

const HOUR_START = 6;  // 6am
const HOUR_END = 23;   // 11pm
const TOTAL_HOURS = HOUR_END - HOUR_START;

function hourLabel(h: number): string {
  if (h === 0) return "12a";
  if (h < 12) return `${h}a`;
  if (h === 12) return "12p";
  return `${h - 12}p`;
}

export default function DayTimeline({
  tasks, activeTask, getDisplayTimeMin, getDisplayTime,
}: DayTimelineProps) {
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

  const hours = [];
  for (let h = HOUR_START; h <= HOUR_END; h++) {
    hours.push(h);
  }

  return (
    <div className="day-timeline" style={{
      flex: 1,
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
        padding: "12px 20px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        borderBottom: "1px solid var(--border)",
        flexShrink: 0,
      }}>
        <span style={{
          fontSize: 13, fontWeight: 600, color: "var(--t2)",
        }}>
          {now.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
        </span>
        <div style={{ display: "flex", gap: 4 }}>
          {["Day", "Week"].map((v) => (
            <div key={v} style={{
              padding: "5px 10px",
              borderRadius: 6,
              fontSize: 10,
              fontWeight: 500,
              background: v === "Day" ? "var(--card)" : "transparent",
              color: v === "Day" ? "var(--t2)" : "var(--t5)",
              border: `1px solid ${v === "Day" ? "var(--border)" : "transparent"}`,
              cursor: "pointer",
            }}>{v}</div>
          ))}
        </div>
      </div>

      {/* Timeline grid */}
      <div style={{
        flex: 1,
        overflowY: "auto",
        display: "flex",
        position: "relative",
      }}>
        {/* Hour labels */}
        <div style={{
          width: 36,
          flexShrink: 0,
          position: "relative",
        }}>
          {hours.map((h, i) => (
            <div key={h} style={{
              height: `${100 / TOTAL_HOURS}%`,
              position: "relative",
            }}>
              <span style={{
                position: "absolute",
                top: -6,
                right: 6,
                fontSize: 9,
                color: "var(--t5)",
              }}>
                {hourLabel(h)}
              </span>
            </div>
          ))}
        </div>

        {/* Grid + task blocks */}
        <div style={{
          flex: 1,
          position: "relative",
          borderLeft: "1px solid var(--border)",
          minHeight: TOTAL_HOURS * 60, /* 60px per hour minimum */
        }}>
          {/* Hour lines */}
          {hours.map((h) => (
            <div key={h} style={{
              position: "absolute",
              top: `${((h - HOUR_START) / TOTAL_HOURS) * 100}%`,
              left: 0,
              right: 0,
              height: 1,
              background: "var(--border)",
              opacity: 0.5,
            }} />
          ))}

          {/* Task blocks */}
          {taskBlocks.map((t) => (
            <div key={t.id} style={{
              position: "absolute",
              top: `${t.topPct}%`,
              left: 4,
              right: 4,
              height: `${Math.max(t.heightPct, 1.5)}%`,
              minHeight: 20,
              background: t.isRest ? "var(--rest, #6b8a7a)" : "var(--accent)",
              borderRadius: 6,
              padding: "3px 8px",
              display: "flex",
              alignItems: "center",
              gap: 6,
              opacity: t.isDone ? 0.3 : 1,
              border: t.isActive ? "2px solid var(--accent)" : "none",
              cursor: "pointer",
              overflow: "hidden",
              transition: "opacity 0.2s",
            }}>
              <span style={{
                fontSize: 10,
                fontWeight: t.isActive ? 600 : 500,
                color: t.isRest ? "#fff" : "#0a0a0a",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}>
                {t.name}
              </span>
              {t.heightPct > 3 && (
                <span style={{
                  fontSize: 9,
                  color: t.isRest ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.5)",
                  flexShrink: 0,
                }}>
                  {t.duration}m
                </span>
              )}
            </div>
          ))}

          {/* Now marker */}
          {nowPct > 0 && nowPct < 100 && (
            <>
              <div style={{
                position: "absolute",
                top: `${nowPct}%`,
                left: 0,
                right: 0,
                height: 1.5,
                background: "var(--danger, #E24B4A)",
                zIndex: 2,
              }} />
              <div style={{
                position: "absolute",
                top: `calc(${nowPct}% - 4px)`,
                left: -4,
                width: 9,
                height: 9,
                borderRadius: "50%",
                background: "var(--danger, #E24B4A)",
                zIndex: 3,
              }} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
