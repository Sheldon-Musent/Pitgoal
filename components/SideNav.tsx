"use client";
import React from "react";

type BottomTab = "main" | "community" | "friends" | "profile";

interface SideNavProps {
  active: BottomTab;
  onChange: (tab: BottomTab) => void;
  onAdd: () => void;
  energy: number;
  isSleeping: boolean;
  tasksDoneCount: number;
  totalTrackedHrs: string;
  activeTask: any;
  activeTimerStr: string;
  pendingTasks: any[];
  doneTasks: any[];
  getDisplayTime: (task: any) => string;
  onDone?: () => void;
  onSkip?: () => void;
}

const NAV_ITEMS: { id: BottomTab; label: string; icon: (active: boolean) => React.ReactNode }[] = [
  {
    id: "main",
    label: "Home",
    icon: (a) => (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
        stroke={a ? "#FFD000" : "var(--t5)"}
        strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/>
        <polyline points="9 22 9 12 15 12 15 22"/>
      </svg>
    ),
  },
  {
    id: "community",
    label: "Pit",
    icon: (a) => (
      <svg width="16" height="16" viewBox="0 0 100 100" fill="none"
        stroke={a ? "#FFD000" : "var(--t5)"}
        strokeWidth="6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M50 10C50 10 20 40 20 62C20 78 33 92 50 92C67 92 80 78 80 62C80 40 50 10 50 10Z"/>
        <path d="M50 50C50 50 36 64 36 72C36 80 42 86 50 86C58 86 64 80 64 72C64 64 50 50 50 50Z"/>
      </svg>
    ),
  },
  {
    id: "friends",
    label: "Chats",
    icon: (a) => (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
        stroke={a ? "#FFD000" : "var(--t5)"}
        strokeWidth="1.8" strokeLinecap="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
        <circle cx="9" cy="7" r="4"/>
        <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
        <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
      </svg>
    ),
  },
  {
    id: "profile",
    label: "You",
    icon: (a) => (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
        stroke={a ? "#FFD000" : "var(--t5)"}
        strokeWidth="1.8" strokeLinecap="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
        <circle cx="12" cy="7" r="4"/>
      </svg>
    ),
  },
];

export default function SideNav({
  active, onChange, onAdd, energy, isSleeping,
  tasksDoneCount, totalTrackedHrs, activeTask, activeTimerStr,
  pendingTasks, doneTasks, getDisplayTime, onDone, onSkip,
}: SideNavProps) {
  const ePct = Math.round(energy);

  return (
    <div className="side-nav" style={{
      width: 280,
      height: "100dvh",
      flexShrink: 0,
      background: "var(--bg)",
      borderRight: "1px solid var(--border)",
      display: "flex",
      flexDirection: "column",
      overflow: "hidden",
    }}>
      {/* Header */}
      <div style={{
        padding: "14px 16px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flexShrink: 0,
      }}>
        <img src="/Trademark-white.png" alt="Pitgoal" style={{ height: 16, opacity: 0.8 }} />
        <div style={{ display: "flex", gap: 6 }}>
          <div
            title="Expand to full view"
            className="tap"
            style={{
              width: 22, height: 22, borderRadius: 6,
              border: "1px solid var(--border)",
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer",
            }}
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--t5)" strokeWidth="2">
              <polyline points="15 3 21 3 21 9"/>
              <polyline points="9 21 3 21 3 15"/>
              <line x1="21" y1="3" x2="14" y2="10"/>
              <line x1="3" y1="21" x2="10" y2="14"/>
            </svg>
          </div>
        </div>
      </div>

      {/* Energy + Stats */}
      <div style={{ padding: "0 16px 12px", flexShrink: 0 }}>
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 6,
        }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
            <span style={{
              fontSize: 24,
              fontWeight: 700,
              color: isSleeping ? "var(--rest, #6b8a7a)" : ePct > 30 ? "var(--t1)" : ePct > 10 ? "var(--warn)" : "var(--danger)",
              lineHeight: 1,
            }}>
              {isSleeping ? "ZZZ" : `${ePct}%`}
            </span>
            <span style={{ fontSize: 10, color: "var(--t5)" }}>energy</span>
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: "var(--t1)", lineHeight: 1 }}>{tasksDoneCount}</div>
              <div style={{ fontSize: 8, color: "var(--t5)", letterSpacing: 1.5 }}>DONE</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: "var(--accent)", lineHeight: 1 }}>{totalTrackedHrs}</div>
              <div style={{ fontSize: 8, color: "var(--t5)", letterSpacing: 1.5 }}>HRS</div>
            </div>
          </div>
        </div>
        <div style={{
          height: 3, borderRadius: 2,
          background: "var(--border)", overflow: "hidden",
        }}>
          <div style={{
            width: `${ePct}%`, height: "100%", borderRadius: 2,
            background: isSleeping ? "var(--rest, #6b8a7a)" : "var(--accent)",
            transition: "width 0.5s ease",
          }} />
        </div>
      </div>

      <div style={{ height: 1, background: "var(--border)", flexShrink: 0 }} />

      {/* Active Task */}
      {activeTask && (
        <div style={{
          padding: "10px 16px",
          background: "var(--card)",
          borderBottom: "1px solid var(--border)",
          display: "flex",
          alignItems: "center",
          gap: 10,
          flexShrink: 0,
        }}>
          <div style={{
            width: 6, height: 6, borderRadius: "50%",
            background: activeTask.type === "rest" ? "var(--rest, #6b8a7a)" : "var(--accent)",
            animation: "pulse-dot 2s infinite",
            flexShrink: 0,
          }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: 12, fontWeight: 600, color: "var(--t1)",
              whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
            }}>{activeTask.name}</div>
          </div>
          <div style={{
            fontSize: 13, fontWeight: 600,
            color: activeTask.type === "rest" ? "var(--rest, #6b8a7a)" : "var(--accent)",
            fontVariantNumeric: "tabular-nums",
            flexShrink: 0,
          }}>{activeTimerStr}</div>
        </div>
      )}

      {/* Task Queue */}
      <div style={{
        flex: 1,
        overflowY: "auto",
        padding: "8px 16px",
        minHeight: 0,
      }}>
        {pendingTasks.length > 0 && (
          <>
            <div style={{
              fontSize: 9, color: "var(--t5)", letterSpacing: 2,
              marginBottom: 6, fontWeight: 600,
            }}>
              {activeTask ? "NEXT UP" : "TODAY"}
            </div>
            {pendingTasks.slice(0, 12).map((task) => (
              <div
                key={task.id}
                onClick={() => onChange("main")}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "8px 0",
                  borderBottom: "1px solid var(--border)",
                  cursor: "pointer",
                }}
              >
                <div style={{
                  width: 4, height: 4, borderRadius: "50%",
                  background: task.type === "rest" ? "var(--rest, #6b8a7a)" : "var(--accent)",
                  flexShrink: 0,
                }} />
                <span style={{
                  fontSize: 12, color: "var(--t3)",
                  flex: 1, whiteSpace: "nowrap",
                  overflow: "hidden", textOverflow: "ellipsis",
                }}>{task.name}</span>
                <span style={{
                  fontSize: 10, color: "var(--t5)",
                  flexShrink: 0,
                }}>{getDisplayTime(task)}</span>
              </div>
            ))}
          </>
        )}

        {doneTasks.length > 0 && (
          <>
            <div style={{
              fontSize: 9, color: "var(--t5)", letterSpacing: 2,
              marginTop: 12, marginBottom: 6, fontWeight: 600,
            }}>DONE</div>
            {doneTasks.slice(0, 5).map((task) => (
              <div
                key={task.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "8px 0",
                  borderBottom: "1px solid var(--border)",
                  opacity: 0.35,
                }}
              >
                <div style={{
                  width: 4, height: 4, borderRadius: "50%",
                  background: task.type === "rest" ? "var(--rest, #6b8a7a)" : "var(--accent)",
                  flexShrink: 0,
                }} />
                <span style={{
                  fontSize: 12, color: "var(--t3)",
                  flex: 1, textDecoration: "line-through",
                  whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                }}>{task.name}</span>
                <span style={{ fontSize: 10, color: "var(--t5)", flexShrink: 0 }}>
                  {getDisplayTime(task)}
                </span>
              </div>
            ))}
          </>
        )}
      </div>

      {/* Nav Tabs */}
      <div style={{
        padding: "8px 12px",
        borderTop: "1px solid var(--border)",
        display: "flex",
        flexDirection: "column",
        gap: 2,
        flexShrink: 0,
      }}>
        {NAV_ITEMS.map((item) => {
          const isActive = active === item.id;
          return (
            <div
              key={item.id}
              className="tap"
              onClick={() => onChange(item.id)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "9px 12px",
                borderRadius: 10,
                background: isActive ? "var(--card)" : "transparent",
                cursor: "pointer",
                transition: "background 0.15s",
              }}
            >
              {item.icon(isActive)}
              <span style={{
                fontSize: 12,
                fontWeight: isActive ? 600 : 400,
                color: isActive ? "var(--t1)" : "var(--t5)",
              }}>{item.label}</span>
            </div>
          );
        })}
      </div>

      {/* New Task Button */}
      <div style={{ padding: "8px 16px 16px", flexShrink: 0 }}>
        <div
          className="tap"
          onClick={onAdd}
          style={{
            width: "100%",
            padding: 11,
            borderRadius: 10,
            background: "var(--accent)",
            textAlign: "center",
            fontSize: 12,
            fontWeight: 700,
            color: "#0a0a0a",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
            stroke="#0a0a0a" strokeWidth="2.5" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          New task
        </div>
      </div>

      <style>{`
        @keyframes pulse-dot {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}
