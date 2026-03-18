"use client";

import { useState } from "react";
import {
  PHASES,
  TYPE_LABELS,
  TYPE_COLORS,
  INCOME_MILESTONES,
  type GoalType,
} from "@/data/phases";

interface MissionTabProps {
  store: {
    completed: Record<string, boolean>;
    notes: Record<string, string>;
    activePhase: string;
    toggleGoal: (id: string) => void;
    saveNote: (id: string, text: string) => void;
    setActivePhase: (id: string) => void;
  };
}

export function MissionTab({ store }: MissionTabProps) {
  const [editingNote, setEditingNote] = useState<string | null>(null);
  const [noteInput, setNoteInput] = useState("");

  const phase = PHASES.find((p) => p.id === store.activePhase) ?? PHASES[0];
  const phaseDone = phase.goals.filter((g) => store.completed[g.id]).length;
  const phasePct = Math.round((phaseDone / phase.goals.length) * 100);

  const handleSaveNote = (goalId: string) => {
    store.saveNote(goalId, noteInput);
    setEditingNote(null);
    setNoteInput("");
  };

  return (
    <div className="animate-fade-up" style={{ animationDelay: "0s" }}>
      {/* Phase selector */}
      <div className="flex gap-1.5 mb-5 flex-wrap">
        {PHASES.map((p, i) => {
          const done = p.goals.filter((g) => store.completed[g.id]).length;
          const isActive = p.id === store.activePhase;
          const allDone = done === p.goals.length;
          return (
            <button
              key={p.id}
              className="tap"
              onClick={() => store.setActivePhase(p.id)}
              style={{
                background: isActive ? `${p.color}10` : "var(--bg-card)",
                border: `1px solid ${isActive ? p.color + "50" : "var(--border-light)"}`,
                borderRadius: 8,
                padding: "8px 12px",
                flex: "1 1 auto",
                minWidth: 90,
                textAlign: "left",
                fontFamily: "inherit",
                cursor: "pointer",
                ...(isActive
                  ? ({
                      "--glow-color": p.color,
                      animation: "glowPulse 3s infinite",
                    } as React.CSSProperties)
                  : {}),
              }}
            >
              <div className="flex items-center gap-1.5 mb-0.5">
                <span
                  style={{
                    fontSize: 12,
                    color: allDone || isActive ? p.color : "var(--text-dim)",
                  }}
                >
                  {allDone ? "✓" : p.icon}
                </span>
                <span
                  style={{
                    fontSize: 9,
                    letterSpacing: 1,
                    color: isActive ? p.color : "var(--text-dim)",
                    fontWeight: 600,
                  }}
                >
                  P{i + 1}
                </span>
              </div>
              <div
                className="font-display"
                style={{
                  fontSize: 10,
                  color: isActive ? "var(--text-secondary)" : "var(--text-dim)",
                  fontWeight: 500,
                }}
              >
                {p.title}
              </div>
              <div style={{ fontSize: 9, color: "var(--text-dim)" }}>
                {done}/{p.goals.length}
              </div>
            </button>
          );
        })}
      </div>

      {/* Active phase detail */}
      <div
        style={{
          background: "var(--bg-surface)",
          border: `1px solid ${phase.color}25`,
          borderRadius: 12,
          padding: 20,
          marginBottom: 20,
        }}
      >
        {/* Phase header */}
        <div className="flex justify-between items-start mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span style={{ color: phase.color, fontSize: 18 }}>
                {phase.icon}
              </span>
              <h2
                className="font-display text-lg font-semibold"
                style={{ color: "var(--text-primary)" }}
              >
                {phase.title}
              </h2>
            </div>
            <p
              className="text-[11px] tracking-wider mb-0.5"
              style={{ color: "var(--text-dim)" }}
            >
              {phase.period}
            </p>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              {phase.description}
            </p>
          </div>
          <div
            style={{
              background: `${phase.color}15`,
              border: `1px solid ${phase.color}30`,
              borderRadius: 8,
              padding: "8px 14px",
              textAlign: "center",
              minWidth: 64,
            }}
          >
            <div
              className="font-display text-xl font-bold"
              style={{ color: phase.color }}
            >
              {phasePct}%
            </div>
            <div
              className="text-[8px] tracking-[2px]"
              style={{ color: "var(--text-dim)" }}
            >
              DONE
            </div>
          </div>
        </div>

        {/* Phase progress bar */}
        <div
          className="h-[2px] rounded-full overflow-hidden mb-5"
          style={{ background: "var(--border)" }}
        >
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${phasePct}%`, background: phase.color }}
          />
        </div>

        {/* Goals list */}
        <div className="flex flex-col gap-1">
          {phase.goals.map((goal, i) => {
            const done = store.completed[goal.id];
            const hasNote = store.notes[goal.id];
            const isEditing = editingNote === goal.id;

            return (
              <div
                key={goal.id}
                className="animate-fade-up"
                style={{
                  display: "flex",
                  flexDirection: "column",
                  padding: "12px 14px",
                  borderRadius: 8,
                  border: `1px solid ${done ? phase.color + "20" : "transparent"}`,
                  background: done ? `${phase.color}06` : "transparent",
                  animationDelay: `${i * 0.05}s`,
                  transition: "all 0.2s ease",
                }}
              >
                <div className="flex items-start gap-3">
                  {/* Checkbox */}
                  <div
                    className="tap"
                    onClick={() => store.toggleGoal(goal.id)}
                    style={{
                      width: 20,
                      height: 20,
                      minWidth: 20,
                      borderRadius: 4,
                      border: `1.5px solid ${done ? phase.color : "var(--border)"}`,
                      background: done ? `${phase.color}20` : "transparent",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      marginTop: 1,
                      cursor: "pointer",
                      transition: "all 0.15s",
                    }}
                  >
                    {done && (
                      <span
                        style={{
                          color: phase.color,
                          fontSize: 12,
                          fontWeight: 700,
                        }}
                      >
                        ✓
                      </span>
                    )}
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className="text-xs leading-relaxed"
                        style={{
                          color: done
                            ? "var(--text-dim)"
                            : "var(--text-secondary)",
                          textDecoration: done ? "line-through" : "none",
                        }}
                      >
                        {goal.text}
                      </span>
                      <span
                        style={{
                          fontSize: 8,
                          letterSpacing: 2,
                          color: TYPE_COLORS[goal.type],
                          background: `${TYPE_COLORS[goal.type]}12`,
                          padding: "2px 6px",
                          borderRadius: 3,
                          fontWeight: 600,
                        }}
                      >
                        {TYPE_LABELS[goal.type]}
                      </span>
                    </div>

                    {/* Existing note display */}
                    {hasNote && !isEditing && (
                      <div
                        onClick={() => {
                          setEditingNote(goal.id);
                          setNoteInput(store.notes[goal.id] || "");
                        }}
                        className="tap"
                        style={{
                          fontSize: 11,
                          color: "var(--text-muted)",
                          marginTop: 6,
                          padding: "6px 8px",
                          borderRadius: 4,
                          borderLeft: `2px solid ${phase.color}40`,
                          cursor: "pointer",
                        }}
                      >
                        {store.notes[goal.id]}
                      </div>
                    )}

                    {/* Note editor */}
                    {isEditing && (
                      <div className="mt-2 flex gap-1.5">
                        <input
                          autoFocus
                          value={noteInput}
                          onChange={(e) => setNoteInput(e.target.value)}
                          onKeyDown={(e) =>
                            e.key === "Enter" && handleSaveNote(goal.id)
                          }
                          placeholder="Add a note..."
                          style={{
                            flex: 1,
                            background: "var(--border)",
                            border: `1px solid ${phase.color}30`,
                            borderRadius: 4,
                            padding: "5px 8px",
                            color: "var(--text-secondary)",
                            fontSize: 10,
                            fontFamily: "inherit",
                            outline: "none",
                          }}
                        />
                        <button
                          onClick={() => handleSaveNote(goal.id)}
                          style={{
                            background: `${phase.color}18`,
                            border: `1px solid ${phase.color}35`,
                            borderRadius: 4,
                            padding: "3px 8px",
                            color: phase.color,
                            fontSize: 9,
                            fontFamily: "inherit",
                            cursor: "pointer",
                            fontWeight: 600,
                          }}
                        >
                          SAVE
                        </button>
                        <button
                          onClick={() => setEditingNote(null)}
                          style={{
                            background: "transparent",
                            border: "1px solid var(--border)",
                            borderRadius: 4,
                            padding: "3px 6px",
                            color: "var(--text-dim)",
                            fontSize: 9,
                            fontFamily: "inherit",
                            cursor: "pointer",
                          }}
                        >
                          ✕
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Edit note button */}
                  {!isEditing && (
                    <button
                      onClick={() => {
                        setEditingNote(goal.id);
                        setNoteInput(store.notes[goal.id] || "");
                      }}
                      style={{
                        background: "none",
                        border: "none",
                        color: "var(--text-ghost)",
                        cursor: "pointer",
                        fontSize: 10,
                        padding: "2px 3px",
                        fontFamily: "inherit",
                        opacity: 0.5,
                      }}
                    >
                      ✎
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Income milestones */}
      <div
        style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border-light)",
          borderRadius: 12,
          padding: 16,
          marginBottom: 20,
        }}
      >
        <div
          className="text-[9px] tracking-[2px] mb-2.5"
          style={{ color: "var(--text-dim)" }}
        >
          INCOME MILESTONES
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {INCOME_MILESTONES.map((m) => (
            <div
              key={m.label}
              style={{
                flex: "1 1 110px",
                padding: "10px 12px",
                borderRadius: 8,
                border: `1px solid ${m.color}18`,
                background: `${m.color}05`,
                textAlign: "center",
              }}
            >
              <div
                className="font-display text-sm font-bold"
                style={{ color: m.color }}
              >
                {m.label}
              </div>
              <div
                className="text-[8px] mt-0.5"
                style={{ color: "var(--text-muted)", letterSpacing: 0.5 }}
              >
                {m.desc}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Reset */}
      <div className="text-center py-2">
        <button
          onClick={() => {
            if (confirm("Reset all MISSION progress? This cannot be undone.")) {
              localStorage.removeItem("doit-v1");
              window.location.reload();
            }
          }}
          style={{
            background: "none",
            border: "1px solid var(--border-light)",
            borderRadius: 6,
            padding: "6px 16px",
            color: "var(--text-ghost)",
            fontSize: 9,
            fontFamily: "inherit",
            cursor: "pointer",
            letterSpacing: 2,
          }}
        >
          RESET MISSION
        </button>
      </div>
    </div>
  );
}
