"use client";
import { useState, useEffect, useRef, useCallback } from "react";

const DISPLAY = "'Sora', sans-serif";
const MONO = "'IBM Plex Mono', monospace";
const BODY = "'Plus Jakarta Sans', sans-serif";

// Default type definitions
const DEFAULT_TYPES: TaskType[] = [
  { id: "task", label: "TASK", color: "var(--accent)" },
  { id: "rest", label: "REST", color: "var(--rest)" },
  { id: "life", label: "LIFE", color: "var(--warn)" },
];

// Default tag definitions
const DEFAULT_TAGS: TaskTag[] = [
  { id: "42kl", label: "42KL", color: "#fb923c" },
  { id: "hub", label: "HUB", color: "#e8627a" },
  { id: "cert", label: "CERT", color: "#a78bfa" },
  { id: "doit", label: "DOIT", color: "#2ecda7" },
  { id: "self", label: "SELF", color: "#00d4ff" },
];

// Color pool for new custom types/tags
const COLOR_POOL = [
  "#e8627a", "#fb923c", "#a78bfa", "#00d4ff", "#fbbf24",
  "#34d399", "#f472b6", "#60a5fa", "#c084fc", "#fb7185",
];

export interface TaskType {
  id: string;
  label: string;
  color: string;
}

export interface TaskTag {
  id: string;
  label: string;
  color: string;
}

export interface CreateTaskResult {
  name: string;
  type: string;
  tags: string[];
  time: string;
  timeMin: number;
  duration: number;
}

interface CreateTaskSheetProps {
  open: boolean;
  onClose: () => void;
  onCreateTask: (result: CreateTaskResult) => void;
  customTypes: TaskType[];
  onAddType: (t: TaskType) => void;
  customTags: TaskTag[];
  onAddTag: (t: TaskTag) => void;
  suggestions: Array<{ name: string; duration?: number; type?: string; source?: string }>;
  onInputChange: (q: string) => void;
}

export { DEFAULT_TYPES, DEFAULT_TAGS, COLOR_POOL };

export default function CreateTaskSheet({
  open,
  onClose,
  onCreateTask,
  customTypes,
  onAddType,
  customTags,
  onAddTag,
  suggestions,
  onInputChange,
}: CreateTaskSheetProps) {
  const [name, setName] = useState("");
  const [selectedType, setSelectedType] = useState("task");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [time, setTime] = useState("");
  const [duration, setDuration] = useState("");
  const [showAddType, setShowAddType] = useState(false);
  const [showAddTag, setShowAddTag] = useState(false);
  const [newTypeLabel, setNewTypeLabel] = useState("");
  const [newTagLabel, setNewTagLabel] = useState("");

  const inputRef = useRef<HTMLInputElement>(null);
  const touchStartY = useRef(0);
  const touchDelta = useRef(0);

  const allTypes = [...DEFAULT_TYPES, ...customTypes];
  const allTags = [...DEFAULT_TAGS, ...customTags];

  // Auto-focus input on open
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
      // Reset fields
      setName("");
      setSelectedType("task");
      setSelectedTags([]);
      setTime("");
      setDuration("");
      setShowAddType(false);
      setShowAddTag(false);
    }
  }, [open]);

  // Parse inline syntax from name
  const parseInline = useCallback((text: string) => {
    let remaining = text;
    let parsedTime = "";
    let parsedDur = "";
    let parsedTags: string[] = [];

    // Extract #tags
    const tagMatches = remaining.match(/#(\w+)/g);
    if (tagMatches) {
      tagMatches.forEach((tm) => {
        const tagName = tm.slice(1).toLowerCase();
        const found = allTags.find(
          (t) => t.label.toLowerCase() === tagName || t.id === tagName
        );
        if (found && !parsedTags.includes(found.id)) {
          parsedTags.push(found.id);
        }
        remaining = remaining.replace(tm, "").trim();
      });
    }

    // Extract time (e.g. 2pm, 14:00, 2:30pm)
    const timeMatch = remaining.match(
      /\b(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)\b/i
    );
    if (timeMatch) {
      const raw = timeMatch[1].toLowerCase().trim();
      let h = 0;
      let m = 0;
      if (raw.includes(":")) {
        const parts = raw.replace(/[ap]m/i, "").split(":");
        h = parseInt(parts[0]);
        m = parseInt(parts[1]);
      } else {
        h = parseInt(raw);
      }
      if (raw.includes("pm") && h < 12) h += 12;
      if (raw.includes("am") && h === 12) h = 0;
      parsedTime = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
      remaining = remaining.replace(timeMatch[0], "").trim();
    }

    // Extract duration (e.g. 1.5h, 30m, 1h30m)
    const durMatch = remaining.match(/\b(\d+(?:\.\d+)?)\s*h(?:\s*(\d+)\s*m)?\b/i);
    const durMatchM = remaining.match(/\b(\d+)\s*m\b/i);
    if (durMatch) {
      const hours = parseFloat(durMatch[1]);
      const mins = durMatch[2] ? parseInt(durMatch[2]) : 0;
      const totalMins = Math.round(hours * 60 + mins);
      parsedDur = String(totalMins);
      remaining = remaining.replace(durMatch[0], "").trim();
    } else if (durMatchM) {
      parsedDur = durMatchM[1];
      remaining = remaining.replace(durMatchM[0], "").trim();
    }

    return {
      cleanName: remaining.replace(/\s+/g, " ").trim(),
      parsedTime,
      parsedDur,
      parsedTags,
    };
  }, [allTags]);

  const handleNameChange = (val: string) => {
    setName(val);
    onInputChange(val);

    // Live parse
    const { parsedTime, parsedDur, parsedTags } = parseInline(val);
    if (parsedTime && !time) setTime(parsedTime);
    if (parsedDur && !duration) setDuration(parsedDur);
    if (parsedTags.length > 0) {
      setSelectedTags((prev) => [
        ...new Set([...prev, ...parsedTags]),
      ]);
    }
  };

  const toggleTag = (tagId: string) => {
    setSelectedTags((prev) =>
      prev.includes(tagId) ? prev.filter((t) => t !== tagId) : [...prev, tagId]
    );
  };

  const handleCreate = () => {
    const { cleanName } = parseInline(name);
    const taskName = cleanName || name.trim();
    if (!taskName) return;

    const [h, m] = (time || "00:00").split(":").map(Number);
    const timeMin = (h || 0) * 60 + (m || 0);
    const dur = parseInt(duration) || 60;

    onCreateTask({
      name: taskName,
      type: selectedType,
      tags: selectedTags,
      time: time || `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`,
      timeMin,
      duration: dur,
    });

    setName("");
    setSelectedType("task");
    setSelectedTags([]);
    setTime("");
    setDuration("");
    onClose();
  };

  const handlePickSuggestion = (s: any) => {
    setName(s.name);
    if (s.duration) setDuration(String(s.duration));
    if (s.type) setSelectedType(s.type);
    onInputChange("");
  };

  const addCustomType = () => {
    if (!newTypeLabel.trim()) return;
    const label = newTypeLabel.trim().toUpperCase();
    const id = label.toLowerCase().replace(/\s+/g, "-");
    if (allTypes.find((t) => t.id === id)) return;
    const colorIdx = customTypes.length % COLOR_POOL.length;
    onAddType({ id, label, color: COLOR_POOL[colorIdx] });
    setNewTypeLabel("");
    setShowAddType(false);
    setSelectedType(id);
  };

  const addCustomTag = () => {
    if (!newTagLabel.trim()) return;
    const label = newTagLabel.trim().toUpperCase();
    const id = label.toLowerCase().replace(/\s+/g, "-");
    if (allTags.find((t) => t.id === id)) return;
    const colorIdx = customTags.length % COLOR_POOL.length;
    onAddTag({ id, label, color: COLOR_POOL[colorIdx] });
    setNewTagLabel("");
    setShowAddTag(false);
    setSelectedTags((prev) => [...prev, id]);
  };

  // Swipe to dismiss
  const onTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
  };
  const onTouchMove = (e: React.TouchEvent) => {
    touchDelta.current = e.touches[0].clientY - touchStartY.current;
  };
  const onTouchEnd = () => {
    if (touchDelta.current > 80) onClose();
    touchDelta.current = 0;
  };

  const fmtDur = (m: number) => {
    if (m >= 60) {
      const h = Math.floor(m / 60);
      const r = m % 60;
      return r ? `${h}h ${r}m` : `${h}h`;
    }
    return `${m}m`;
  };

  if (!open) return null;

  const selectedTypeObj = allTypes.find((t) => t.id === selectedType) || allTypes[0];

  return (
    <>
      {/* Overlay */}
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.6)",
          zIndex: 200,
          animation: "fadeIn 0.2s ease",
        }}
      />

      {/* Sheet */}
      <div
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 201,
          maxWidth: 430,
          margin: "0 auto",
          background: "var(--card)",
          borderRadius: "24px 24px 0 0",
          border: "1px solid var(--border)",
          borderBottom: "none",
          padding: "0 0 env(safe-area-inset-bottom, 16px)",
          animation: "sheetUp 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
          maxHeight: "85vh",
          overflowY: "auto",
        }}
      >
        {/* Drag handle */}
        <div style={{ display: "flex", justifyContent: "center", padding: "10px 0 6px" }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: "var(--border2)" }} />
        </div>

        <div style={{ padding: "0 20px" }} onClick={() => { setShowAddType(false); setShowAddTag(false); setNewTypeLabel(""); setNewTagLabel(""); }}>
          {/* Title */}
          <div
            style={{
              fontSize: 16,
              fontWeight: 700,
              color: "var(--t1)",
              fontFamily: DISPLAY,
              marginBottom: 16,
            }}
          >
            New task
          </div>

          {/* Name input */}
          <div
            style={{
              background: "var(--bg)",
              borderRadius: 14,
              border: `1.5px solid ${selectedTypeObj.color}40`,
              padding: "14px 16px",
              marginBottom: 14,
            }}
          >
            <input
              ref={inputRef}
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              placeholder="Task name..."
              style={{
                width: "100%",
                background: "none",
                border: "none",
                color: "var(--t1)",
                fontSize: 15,
                fontFamily: BODY,
                outline: "none",
              }}
            />
          </div>

          {/* Description / suggestions */}
          {suggestions.length > 0 && name.length >= 2 && (
            <div style={{ marginBottom: 14, marginTop: -6 }}>
              <div
                style={{
                  fontSize: 10,
                  color: "var(--t5)",
                  fontFamily: MONO,
                  letterSpacing: 1,
                  marginBottom: 8,
                }}
              >
                DESCRIPTION
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {suggestions.slice(0, 3).map((s, i) => (
                  <div
                    key={i}
                    className="tap"
                    onClick={() => handlePickSuggestion(s)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "10px 14px",
                      background: "var(--bg)",
                      borderRadius: 10,
                      border: "1px solid var(--border)",
                      cursor: "pointer",
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 13, color: "var(--t2)", fontFamily: BODY }}>
                        {s.name}
                      </div>
                      <div
                        style={{
                          fontSize: 10,
                          color: "var(--t5)",
                          fontFamily: MONO,
                          marginTop: 2,
                        }}
                      >
                        {s.duration ? fmtDur(s.duration) : ""} {s.type ? `· ${s.type}` : ""}
                      </div>
                    </div>
                    <span
                      style={{
                        fontSize: 9,
                        color:
                          s.source === "you" ? "var(--accent)" : "var(--t4)",
                        background:
                          s.source === "you"
                            ? "var(--accent-10)"
                            : "rgba(255,255,255,0.05)",
                        padding: "2px 6px",
                        borderRadius: 4,
                        fontFamily: MONO,
                        fontWeight: 600,
                      }}
                    >
                      {(s.source || "").toUpperCase()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TYPE */}
          <div style={{ marginBottom: 14 }}>
            <div
              style={{
                fontSize: 10,
                color: "var(--t5)",
                fontFamily: MONO,
                letterSpacing: 1,
                marginBottom: 8,
              }}
            >
              TYPE
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
              {allTypes.map((t) => {
                const isSelected = selectedType === t.id;
                return (
                  <div
                    key={t.id}
                    className="tap"
                    onClick={() => setSelectedType(t.id)}
                    style={{
                      padding: "7px 16px",
                      borderRadius: 100,
                      fontFamily: MONO,
                      fontSize: 11,
                      fontWeight: 700,
                      letterSpacing: 1,
                      cursor: "pointer",
                      background: isSelected ? `${t.color}22` : "transparent",
                      color: isSelected ? t.color : "var(--t5)",
                      border: `1px solid ${isSelected ? `${t.color}55` : "var(--border2)"}`,
                      transition: "all 0.15s",
                    }}
                  >
                    {t.label}
                  </div>
                );
              })}
              {/* Add type button or input */}
              {showAddType ? (
                <div style={{ display: "flex", gap: 4, alignItems: "center" }} onClick={(e) => e.stopPropagation()}>
                  <input
                    autoFocus
                    value={newTypeLabel}
                    onChange={(e) => setNewTypeLabel(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") addCustomType();
                      if (e.key === "Escape") setShowAddType(false);
                    }}
                    placeholder="Name..."
                    style={{
                      width: 80,
                      padding: "6px 10px",
                      borderRadius: 100,
                      border: "1px solid var(--accent-30)",
                      background: "var(--bg)",
                      color: "var(--t2)",
                      fontSize: 11,
                      fontFamily: MONO,
                      outline: "none",
                    }}
                  />
                  <div
                    className="tap"
                    onClick={addCustomType}
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 100,
                      background: "var(--accent)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "pointer",
                    }}
                  >
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#fff"
                      strokeWidth="3"
                      strokeLinecap="round"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>
                </div>
              ) : (
                <div
                  className="tap"
                  onClick={() => setShowAddType(true)}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 100,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    border: "1px dashed var(--border2)",
                    cursor: "pointer",
                  }}
                >
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="var(--t5)"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  >
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                </div>
              )}
            </div>
          </div>

          {/* TAGS */}
          <div style={{ marginBottom: 14 }}>
            <div
              style={{
                fontSize: 10,
                color: "var(--t5)",
                fontFamily: MONO,
                letterSpacing: 1,
                marginBottom: 8,
              }}
            >
              TAGS
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
              {allTags.map((t) => {
                const isSelected = selectedTags.includes(t.id);
                return (
                  <div
                    key={t.id}
                    className="tap"
                    onClick={() => toggleTag(t.id)}
                    style={{
                      padding: "6px 12px",
                      borderRadius: 8,
                      fontSize: 11,
                      fontWeight: 600,
                      fontFamily: MONO,
                      cursor: "pointer",
                      background: isSelected ? `${t.color}22` : "transparent",
                      color: isSelected ? t.color : "var(--t5)",
                      border: `1.5px solid ${isSelected ? `${t.color}55` : "var(--border2)"}`,
                      transition: "all 0.15s",
                    }}
                  >
                    {t.label}
                  </div>
                );
              })}
              {/* Add tag button or input */}
              {showAddTag ? (
                <div style={{ display: "flex", gap: 4, alignItems: "center" }} onClick={(e) => e.stopPropagation()}>
                  <input
                    autoFocus
                    value={newTagLabel}
                    onChange={(e) => setNewTagLabel(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") addCustomTag();
                      if (e.key === "Escape") setShowAddTag(false);
                    }}
                    placeholder="Tag..."
                    style={{
                      width: 80,
                      padding: "6px 10px",
                      borderRadius: 8,
                      border: "1px solid var(--accent-30)",
                      background: "var(--bg)",
                      color: "var(--t2)",
                      fontSize: 11,
                      fontFamily: MONO,
                      outline: "none",
                    }}
                  />
                  <div
                    className="tap"
                    onClick={addCustomTag}
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 8,
                      background: "var(--accent)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "pointer",
                    }}
                  >
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#fff"
                      strokeWidth="3"
                      strokeLinecap="round"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>
                </div>
              ) : (
                <div
                  className="tap"
                  onClick={() => setShowAddTag(true)}
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: 8,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    border: "1px dashed var(--border2)",
                    cursor: "pointer",
                  }}
                >
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="var(--t5)"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  >
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                </div>
              )}
            </div>
          </div>

          {/* TIME + DURATION */}
          <div style={{ marginBottom: 18 }}>
            <div
              style={{
                fontSize: 10,
                color: "var(--t5)",
                fontFamily: MONO,
                letterSpacing: 1,
                marginBottom: 8,
              }}
            >
              TIME + DURATION
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <div
                style={{
                  flex: 1,
                  background: "var(--bg)",
                  borderRadius: 12,
                  border: "1px solid var(--border2)",
                  padding: "12px 14px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <span
                  style={{
                    fontSize: 11,
                    color: "var(--t5)",
                    fontFamily: MONO,
                  }}
                >
                  TIME
                </span>
                <input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  style={{
                    background: "none",
                    border: "none",
                    color: "var(--accent)",
                    fontSize: 14,
                    fontWeight: 600,
                    fontFamily: MONO,
                    outline: "none",
                    width: 80,
                    textAlign: "right",
                  }}
                />
              </div>
              <div
                style={{
                  flex: 1,
                  background: "var(--bg)",
                  borderRadius: 12,
                  border: "1px solid var(--border2)",
                  padding: "12px 14px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <span
                  style={{
                    fontSize: 11,
                    color: "var(--t5)",
                    fontFamily: MONO,
                  }}
                >
                  MIN
                </span>
                <input
                  type="number"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  placeholder="60"
                  style={{
                    background: "none",
                    border: "none",
                    color: "var(--accent)",
                    fontSize: 14,
                    fontWeight: 600,
                    fontFamily: MONO,
                    outline: "none",
                    width: 60,
                    textAlign: "right",
                  }}
                />
              </div>
            </div>
            <div
              style={{
                fontSize: 10,
                color: "var(--t6)",
                fontFamily: MONO,
                marginTop: 6,
              }}
            >
              or type inline: &quot;study C 2pm 1.5h&quot; still works
            </div>
          </div>

          {/* Buttons */}
          <div style={{ display: "flex", gap: 8 }}>
            <div
              className="tap"
              onClick={handleCreate}
              style={{
                flex: 1,
                background: "var(--accent)",
                borderRadius: 14,
                padding: 14,
                textAlign: "center",
                fontSize: 14,
                fontWeight: 700,
                color: "#fff",
                fontFamily: DISPLAY,
                cursor: "pointer",
              }}
            >
              Create task
            </div>
            <div
              className="tap"
              onClick={onClose}
              style={{
                width: 50,
                background: "var(--card2)",
                borderRadius: 14,
                border: "1px solid var(--border)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
              }}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--t4)"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes sheetUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </>
  );
}
