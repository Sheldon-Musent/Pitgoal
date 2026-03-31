"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { DISPLAY, MONO, BODY } from "../lib/constants";

const DEFAULT_TYPES: TaskType[] = [
  { id: "task", label: "TASK", color: "var(--accent)" },
  { id: "rest", label: "REST", color: "var(--rest)" },
  { id: "life", label: "LIFE", color: "var(--warn)" },
];

const DEFAULT_TAGS: TaskTag[] = [
  { id: "42kl", label: "42KL", color: "#fb923c" },
  { id: "hub", label: "HUB", color: "#e8627a" },
  { id: "cert", label: "CERT", color: "#a78bfa" },
  { id: "doit", label: "DOIT", color: "#2ecda7" },
  { id: "self", label: "SELF", color: "#00d4ff" },
];

const DEFAULT_TYPE_IDS = new Set(DEFAULT_TYPES.map((t) => t.id));
const DEFAULT_TAG_IDS = new Set(DEFAULT_TAGS.map((t) => t.id));

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
  desc: string;
}

interface CreateTaskSheetProps {
  open: boolean;
  onClose: () => void;
  onCreateTask: (result: CreateTaskResult) => void;
  customTypes: TaskType[];
  onAddType: (t: TaskType) => void;
  onDeleteType: (id: string) => void;
  customTags: TaskTag[];
  onAddTag: (t: TaskTag) => void;
  onDeleteTag: (id: string) => void;
  suggestions: Array<{ name: string; duration?: number; type?: string; source?: string }>;
  onInputChange: (q: string) => void;
}

export { DEFAULT_TYPES, DEFAULT_TAGS, DEFAULT_TYPE_IDS, DEFAULT_TAG_IDS, COLOR_POOL };

export default function CreateTaskSheet({
  open, onClose, onCreateTask, customTypes, onAddType, onDeleteType,
  customTags, onAddTag, onDeleteTag, suggestions, onInputChange,
}: CreateTaskSheetProps) {
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [selectedType, setSelectedType] = useState("task");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [time, setTime] = useState("");
  const [durationMin, setDurationMin] = useState(0);
  const [addPopup, setAddPopup] = useState<"type" | "tag" | null>(null);
  const [newLabel, setNewLabel] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const popupInputRef = useRef<HTMLInputElement>(null);

  const allTypes = [...DEFAULT_TYPES, ...customTypes];
  const allTags = [...DEFAULT_TAGS, ...customTags];

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
      setName(""); setDesc(""); setSelectedType("task"); setSelectedTags([]);
      setTime(""); setDurationMin(0); setAddPopup(null); setNewLabel(""); setConfirmDeleteId(null);
    }
  }, [open]);

  useEffect(() => {
    if (addPopup) {
      setNewLabel(""); setConfirmDeleteId(null);
      setTimeout(() => popupInputRef.current?.focus(), 100);
    }
  }, [addPopup]);

  const hasSuggestions = suggestions.length > 0 && name.length >= 2;

  const parseInline = useCallback((text: string) => {
    let remaining = text;
    let parsedTime = "";
    let parsedDur = "";
    let parsedTags: string[] = [];

    const tagMatches = remaining.match(/#(\w+)/g);
    if (tagMatches) {
      tagMatches.forEach((tm) => {
        const tagName = tm.slice(1).toLowerCase();
        const found = allTags.find((t) => t.label.toLowerCase() === tagName || t.id === tagName);
        if (found && !parsedTags.includes(found.id)) parsedTags.push(found.id);
        remaining = remaining.replace(tm, "").trim();
      });
    }

    const timeMatch = remaining.match(/\b(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)\b/i);
    if (timeMatch) {
      const raw = timeMatch[1].toLowerCase().trim();
      let h = 0, m = 0;
      if (raw.includes(":")) { const p = raw.replace(/[ap]m/i, "").split(":"); h = parseInt(p[0]); m = parseInt(p[1]); }
      else h = parseInt(raw);
      if (raw.includes("pm") && h < 12) h += 12;
      if (raw.includes("am") && h === 12) h = 0;
      parsedTime = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
      remaining = remaining.replace(timeMatch[0], "").trim();
    }

    const durMatch = remaining.match(/\b(\d+(?:\.\d+)?)\s*h(?:\s*(\d+)\s*m)?\b/i);
    const durMatchM = remaining.match(/\b(\d+)\s*m\b/i);
    if (durMatch) {
      const totalMins = Math.round(parseFloat(durMatch[1]) * 60 + (durMatch[2] ? parseInt(durMatch[2]) : 0));
      parsedDur = String(totalMins);
      remaining = remaining.replace(durMatch[0], "").trim();
    } else if (durMatchM) {
      parsedDur = durMatchM[1];
      remaining = remaining.replace(durMatchM[0], "").trim();
    }

    return { cleanName: remaining.replace(/\s+/g, " ").trim(), parsedTime, parsedDur, parsedTags };
  }, [allTags]);

  const handleNameChange = (val: string) => {
    setName(val);
    onInputChange(val);
    const { parsedTime, parsedDur, parsedTags } = parseInline(val);
    if (parsedTime && !time) setTime(parsedTime);
    if (parsedDur && durationMin === 0) {
      const mins = parseInt(parsedDur);
      if (!isNaN(mins)) {
        setDurationMin(mins);
      }
    }
    if (parsedTags.length > 0) setSelectedTags((prev) => [...new Set([...prev, ...parsedTags])]);
  };

  const toggleTag = (tagId: string) => {
    setSelectedTags((prev) => prev.includes(tagId) ? prev.filter((t) => t !== tagId) : [...prev, tagId]);
  };

  const handleCreate = () => {
    const { cleanName } = parseInline(name);
    const taskName = cleanName || name.trim();
    if (!taskName) return;
    const now = new Date();
    const fallbackTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    const [h, m] = (time || fallbackTime).split(":").map(Number);
    onCreateTask({
      name: taskName, type: selectedType, tags: selectedTags, desc: desc.trim(),
      time: time || fallbackTime,
      timeMin: (h || 0) * 60 + (m || 0),
      duration: durationMin || 60,
    });
    setName(""); setDesc(""); setSelectedType("task"); setSelectedTags([]);
    setTime(""); setDurationMin(0); onClose();
  };

  const handlePickSuggestion = (s: any) => {
    setName(s.name);
    if (s.duration) {
      setDurationMin(s.duration);
    }
    if (s.type) setSelectedType(s.type);
    onInputChange("");
  };

  const confirmAddPopup = () => {
    if (!newLabel.trim()) return;
    const label = newLabel.trim().toUpperCase();
    const id = label.toLowerCase().replace(/\s+/g, "-");

    if (addPopup === "type") {
      if (allTypes.find((t) => t.id === id)) { setAddPopup(null); setNewLabel(""); return; }
      const colorIdx = customTypes.length % COLOR_POOL.length;
      onAddType({ id, label, color: COLOR_POOL[colorIdx] });
      setSelectedType(id);
    } else {
      if (allTags.find((t) => t.id === id)) { setAddPopup(null); setNewLabel(""); return; }
      const colorIdx = customTags.length % COLOR_POOL.length;
      onAddTag({ id, label, color: COLOR_POOL[colorIdx] });
      setSelectedTags((prev) => [...prev, id]);
    }
    setAddPopup(null); setNewLabel("");
  };

  const handleDeleteInPopup = (id: string) => {
    if (confirmDeleteId === id) {
      if (addPopup === "type") {
        onDeleteType(id);
        if (selectedType === id) setSelectedType("task");
      } else {
        onDeleteTag(id);
        setSelectedTags((prev) => prev.filter((t) => t !== id));
      }
      setConfirmDeleteId(null);
    } else {
      setConfirmDeleteId(id);
    }
  };

  const formatDuration = (totalMinutes: number): string => {
    if (totalMinutes <= 60) {
      return `${String(totalMinutes).padStart(2, "0")}:00`;
    } else {
      const hrs = Math.floor(totalMinutes / 60);
      const mins = totalMinutes % 60;
      return `${String(hrs).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
    }
  };

  const handleDurationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^0-9]/g, "");

    if (raw.length === 0) {
      setDurationMin(0);
      return;
    }

    const num = parseInt(raw, 10);

    if (raw.length <= 2) {
      setDurationMin(num);
      return;
    }

    if (raw.length === 3) {
      const h = parseInt(raw[0], 10);
      const m = parseInt(raw.slice(1), 10);
      setDurationMin(h * 60 + Math.min(m, 59));
      return;
    }

    if (raw.length >= 4) {
      const h = parseInt(raw.slice(0, 2), 10);
      const m = parseInt(raw.slice(2, 4), 10);
      setDurationMin(h * 60 + Math.min(m, 59));
      return;
    }
  };

  const fmtDur = (m: number) => m >= 60 ? (m % 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${Math.floor(m / 60)}h`) : `${m}m`;

  if (!open) return null;

  const selectedTypeObj = allTypes.find((t) => t.id === selectedType) || allTypes[0];
  const previewColor = addPopup === "type"
    ? COLOR_POOL[customTypes.length % COLOR_POOL.length]
    : COLOR_POOL[customTags.length % COLOR_POOL.length];
  const popupItems = addPopup === "type" ? allTypes : allTags;
  const defaultIds = addPopup === "type" ? DEFAULT_TYPE_IDS : DEFAULT_TAG_IDS;
  const isRound = addPopup === "type";

  const sectionLabelStyle: React.CSSProperties = {
    fontSize: 10,
    fontWeight: 600,
    letterSpacing: 2,
    color: "var(--t5)",
    marginBottom: 10,
    textTransform: "uppercase",
    fontFamily: MONO,
  };

  return (
    <>
      {/* Overlay */}
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 200, animation: "fadeIn 0.2s ease" }} />

      {/* Popup container */}
      <div onClick={onClose} style={{ position: "fixed", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 201 }}>
        <div className="create-popup" onClick={(e) => e.stopPropagation()} style={{
          width: 320, maxHeight: "80vh", overflowY: "auto",
          scrollbarWidth: "none", msOverflowStyle: "none" as any, WebkitOverflowScrolling: "touch" as any,
          background: "rgba(28,28,30,0.65)",
          backdropFilter: "blur(30px) saturate(180%)",
          WebkitBackdropFilter: "blur(30px) saturate(180%)",
          border: "1px solid rgba(255,255,255,0.12)",
          borderRadius: 20,
          padding: "24px 20px 20px",
          animation: "popInCenter 0.2s ease",
        }}>
          {/* ── Title ── */}
          <div style={sectionLabelStyle}>NEW TASK</div>

          {/* ── Name input + attached suggestions ── */}
          <div style={{ marginBottom: 14 }}>
            <div style={{
              background: "var(--bg)", padding: "14px 16px",
              borderRadius: hasSuggestions ? "14px 14px 0 0" : 14,
              border: `1.5px solid ${selectedTypeObj.color}40`,
              borderBottom: hasSuggestions ? "0.5px solid var(--border)" : undefined,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <input ref={inputRef} value={name}
                  maxLength={50}
                  onChange={(e) => handleNameChange(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                  placeholder="Task name..."
                  style={{ flex: 1, background: "none", border: "none", color: "var(--t1)", fontSize: 15, fontFamily: BODY, outline: "none" }}
                />
              </div>
            </div>
            <div style={{ fontSize: 9, color: "var(--t5)", textAlign: "right", marginTop: 4, opacity: 0.5 }}>
              {name.length} / 50
            </div>
            {hasSuggestions && (
              <div style={{
                background: "var(--bg)", borderRadius: "0 0 14px 14px",
                border: `1.5px solid ${selectedTypeObj.color}40`, borderTop: "none",
              }}>
                {suggestions.slice(0, 3).map((s, i) => (
                  <div key={i} className="tap" onClick={() => handlePickSuggestion(s)} style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "10px 16px", cursor: "pointer",
                    borderTop: i === 0 ? "none" : "0.5px solid var(--border)",
                  }}>
                    <div>
                      <div style={{ fontSize: 13, color: "var(--t2)", fontFamily: BODY }}>{s.name}</div>
                      <div style={{ fontSize: 10, color: "var(--t5)", fontFamily: MONO, marginTop: 2 }}>
                        {s.duration ? fmtDur(s.duration) : ""}{s.type ? ` · ${s.type}` : ""}
                      </div>
                    </div>
                    <span style={{
                      fontSize: 9, fontFamily: MONO, fontWeight: 600, padding: "2px 6px", borderRadius: 4,
                      color: s.source === "you" ? "var(--accent)" : "var(--t4)",
                      background: s.source === "you" ? "var(--accent-10)" : "rgba(255,255,255,0.05)",
                    }}>{(s.source || "").toUpperCase()}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Description ── */}
          <div style={{ marginBottom: 14 }}>
            <div style={sectionLabelStyle}>DESCRIPTION</div>
            <textarea value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Task details / notes (optional)..."
              maxLength={120}
              rows={2}
              style={{
                width: "100%", background: "var(--bg)", borderRadius: 12, border: "1px solid var(--border2)",
                padding: "12px 14px", color: "var(--t2)", fontSize: 13, fontFamily: BODY, outline: "none",
                resize: "none", minHeight: 56, maxHeight: 80, overflowY: "auto", scrollbarWidth: "none" as any, lineHeight: 1.5,
              }}
            />
            <div style={{ fontSize: 9, color: "var(--t5)", textAlign: "right", marginTop: 4, opacity: 0.5 }}>
              {desc.length} / 120
            </div>
          </div>

          {/* ── TYPE ── */}
          <div style={{ marginBottom: 14 }}>
            <div style={sectionLabelStyle}>TYPE</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
              {allTypes.map((t) => {
                const sel = selectedType === t.id;
                return (
                  <div key={t.id} className="tap pill-no-select" onClick={() => setSelectedType(t.id)} style={{
                    padding: "7px 16px", borderRadius: 100, fontFamily: MONO, fontSize: 11, fontWeight: 700,
                    letterSpacing: 1, cursor: "pointer", transition: "all 0.15s",
                    background: sel ? `${t.color}22` : "transparent",
                    color: sel ? t.color : "var(--t5)",
                    border: `1px solid ${sel ? `${t.color}55` : "var(--border2)"}`,
                  }}>{t.label}</div>
                );
              })}
              <div className="tap" onClick={() => setAddPopup("type")} style={{
                width: 32, height: 32, borderRadius: 100, display: "flex", alignItems: "center", justifyContent: "center",
                border: "1px dashed var(--border2)", cursor: "pointer",
              }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--t5)" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              </div>
            </div>
          </div>

          {/* ── TAGS ── */}
          <div style={{ marginBottom: 0 }}>
            <div style={sectionLabelStyle}>TAGS</div>
            <div className="tag-scroll" style={{
              display: "flex", gap: 6, overflowX: "auto", scrollbarWidth: "none",
              msOverflowStyle: "none" as any, paddingBottom: 4, WebkitOverflowScrolling: "touch" as any,
            }}>
              {allTags.map((t) => {
                const sel = selectedTags.includes(t.id);
                return (
                  <button key={t.id} onClick={() => toggleTag(t.id)} style={{
                    flexShrink: 0, padding: "5px 12px", fontSize: 10, borderRadius: 16,
                    fontWeight: 600, letterSpacing: 1, cursor: "pointer",
                    border: `1px solid ${sel ? "var(--accent-40, rgba(250,204,21,0.5))" : "var(--border)"}`,
                    background: sel ? "rgba(250,204,21,0.08)" : "rgba(255,255,255,0.04)",
                    color: sel ? "var(--accent, #facc15)" : "var(--t5)",
                    whiteSpace: "nowrap", fontFamily: "inherit", textTransform: "uppercase",
                  }}>{t.label}</button>
                );
              })}
              <button onClick={() => setAddPopup("tag")} style={{
                flexShrink: 0, padding: "5px 8px", borderRadius: 16,
                border: "1px solid var(--border)", background: "rgba(255,255,255,0.04)",
                cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--t5)" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              </button>
            </div>
            <div style={{ marginBottom: 14 }} />
          </div>

          {/* ── Divider ── */}
          <div style={{ height: 1, background: "rgba(255,255,255,0.06)", margin: "16px 0" }} />

          {/* ── TIME + DURATION ── */}
          <div style={{ marginBottom: 18 }}>
            <div style={{ display: "flex", gap: 8 }}>
              {/* TIME */}
              <div style={{ flex: 1, background: "var(--bg)", borderRadius: 12, border: "1px solid var(--border2)", padding: "12px 14px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <input type="time" value={time} onChange={(e) => setTime(e.target.value)}
                  placeholder="--:--"
                  style={{ background: "none", border: "none", color: time ? "var(--t1)" : "var(--t5)", fontSize: 15, fontWeight: 600, fontFamily: MONO, outline: "none", width: "100%" }} />
              </div>
              {/* DURATION */}
              <div style={{
                display: "flex", alignItems: "center", justifyContent: "center", gap: 2,
                background: "var(--bg, rgba(255,255,255,0.04))", border: "1px solid var(--border)",
                borderRadius: 12, padding: "10px 16px", minWidth: 80,
              }}>
                <input
                  value={formatDuration(durationMin)}
                  onChange={handleDurationChange}
                  inputMode="numeric"
                  style={{
                    width: 52, background: "none", border: "none", color: "var(--t1)",
                    fontSize: 15, fontWeight: 600, textAlign: "center", fontFamily: "inherit", outline: "none",
                  }}
                />
              </div>
            </div>
          </div>

          {/* ── Buttons ── */}
          <button onClick={handleCreate} style={{
            width: "100%", background: "var(--accent, #facc15)", borderRadius: 14, padding: 14, textAlign: "center",
            fontSize: 15, fontWeight: 700, color: "#0a0a0a", border: "none", cursor: "pointer", fontFamily: "inherit",
          }}>Create task</button>
        </div>
      </div>

      {/* ═══ ADD TYPE / TAG POPUP ═══ */}
      {addPopup && (
        <>
          <div onClick={() => { setAddPopup(null); setNewLabel(""); setConfirmDeleteId(null); }} style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 300, animation: "fadeIn 0.15s ease",
          }} />
          <div style={{
            position: "fixed", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 301,
          }}>
            <div style={{
              width: "calc(100% - 48px)", maxWidth: 380,
              background: "rgba(28,28,30,0.65)",
              backdropFilter: "blur(30px) saturate(180%)",
              WebkitBackdropFilter: "blur(30px) saturate(180%)",
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 20,
              padding: "24px 20px", animation: "popInCenter 0.2s ease",
            }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "var(--t1)", fontFamily: DISPLAY, marginBottom: 16 }}>
                Add custom {addPopup}
              </div>

              {/* Input */}
              <div style={{
                background: "var(--bg)", borderRadius: 12,
                border: `1px solid ${addPopup === "type" ? "var(--accent-30)" : "var(--pink-30)"}`,
                padding: "14px 16px", marginBottom: 16,
              }}>
                <input ref={popupInputRef} value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") confirmAddPopup(); if (e.key === "Escape") { setAddPopup(null); setNewLabel(""); } }}
                  placeholder={`${addPopup === "type" ? "Type" : "Tag"} name...`}
                  style={{ width: "100%", background: "none", border: "none", color: "var(--t1)", fontSize: 16, fontFamily: MONO, outline: "none", textTransform: "uppercase", letterSpacing: 1 }}
                />
              </div>

              {/* Existing items with delete on custom */}
              <div style={{ fontSize: 10, color: "var(--t5)", fontFamily: MONO, letterSpacing: 1, marginBottom: 10 }}>
                {newLabel.trim() ? "PREVIEW" : "EXISTING"}
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center", marginBottom: 20 }}>
                {popupItems.map((t) => {
                  const isCustom = !defaultIds.has(t.id);
                  const isConfirming = confirmDeleteId === t.id;
                  return (
                    <div key={t.id} style={{ position: "relative", display: "flex", alignItems: "center" }}>
                      <div style={{
                        padding: isRound ? "7px 16px" : "6px 12px",
                        paddingRight: isCustom ? (isRound ? 28 : 24) : undefined,
                        borderRadius: isRound ? 100 : 8,
                        fontFamily: MONO, fontSize: 11, fontWeight: isCustom ? 700 : 600,
                        letterSpacing: isRound ? 1 : 0,
                        background: isCustom ? `${t.color}22` : "transparent",
                        color: isCustom ? t.color : "var(--t5)",
                        border: isCustom ? `1.5px solid ${t.color}55` : "1px solid var(--border2)",
                        display: "flex", alignItems: "center", gap: 6,
                      }}>
                        {t.label}
                        {isCustom && (
                          <div className="tap" onClick={(e) => { e.stopPropagation(); handleDeleteInPopup(t.id); }}
                            style={{
                              width: 16, height: 16, borderRadius: "50%",
                              background: isConfirming ? "var(--danger)" : "var(--danger-10)",
                              display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
                              transition: "all 0.15s",
                            }}>
                            <svg width="8" height="8" viewBox="0 0 24 24" fill="none"
                              stroke={isConfirming ? "#fff" : "var(--danger)"} strokeWidth="3" strokeLinecap="round">
                              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
                          </div>
                        )}
                      </div>
                      {isConfirming && (
                        <span style={{ position: "absolute", top: -8, right: -4, fontSize: 8, color: "var(--danger)", fontFamily: MONO, fontWeight: 700, whiteSpace: "nowrap" }}>tap to confirm</span>
                      )}
                    </div>
                  );
                })}
                {/* Preview new item */}
                {newLabel.trim() && (
                  <>
                    <div style={{
                      padding: isRound ? "7px 16px" : "6px 12px",
                      borderRadius: isRound ? 100 : 8,
                      fontFamily: MONO, fontSize: 11, fontWeight: 700, letterSpacing: isRound ? 1 : 0,
                      background: `${previewColor}22`, color: previewColor,
                      border: `1.5px solid ${previewColor}55`,
                    }}>{newLabel.trim().toUpperCase()}</div>
                    <span style={{ fontSize: 9, color: "var(--accent)", fontFamily: MONO }}>new</span>
                  </>
                )}
              </div>

              {/* Buttons */}
              <div style={{ display: "flex", gap: 8 }}>
                <div className="tap" onClick={confirmAddPopup} style={{
                  flex: 1, background: newLabel.trim() ? "var(--accent)" : "var(--border2)",
                  borderRadius: 12, padding: 12, textAlign: "center", fontSize: 13, fontWeight: 700,
                  color: newLabel.trim() ? "var(--fill-title)" : "var(--t5)", fontFamily: DISPLAY, cursor: "pointer",
                  transition: "all 0.15s",
                }}>Add {addPopup}</div>
                <div className="tap" onClick={() => { setAddPopup(null); setNewLabel(""); setConfirmDeleteId(null); }} style={{
                  width: 44, background: "var(--card2)", borderRadius: 12, border: "1px solid var(--border)",
                  display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
                }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--t4)" strokeWidth="2" strokeLinecap="round">
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      <style>{`
        @keyframes sheetUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes popIn { from { opacity: 0; transform: translateX(-50%) scale(0.95); } to { opacity: 1; transform: translateX(-50%) scale(1); } }
        @keyframes popInCenter { from { opacity: 0; transform: scale(0.96); } to { opacity: 1; transform: scale(1); } }
        .create-popup::-webkit-scrollbar { display: none; }
        .tag-scroll::-webkit-scrollbar { display: none; }
      `}</style>
    </>
  );
}
