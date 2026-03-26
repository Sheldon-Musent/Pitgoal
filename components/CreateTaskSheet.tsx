"use client";
import { useState, useEffect, useRef, useCallback } from "react";

const DISPLAY = "'Sora', sans-serif";
const MONO = "'IBM Plex Mono', monospace";
const BODY = "'Plus Jakarta Sans', sans-serif";

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
  customTags: TaskTag[];
  onAddTag: (t: TaskTag) => void;
  suggestions: Array<{ name: string; duration?: number; type?: string; source?: string }>;
  onInputChange: (q: string) => void;
}

export { DEFAULT_TYPES, DEFAULT_TAGS, COLOR_POOL };

export default function CreateTaskSheet({
  open, onClose, onCreateTask, customTypes, onAddType, customTags, onAddTag,
  suggestions, onInputChange,
}: CreateTaskSheetProps) {
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [selectedType, setSelectedType] = useState("task");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [time, setTime] = useState("");
  const [duration, setDuration] = useState("");
  const [addPopup, setAddPopup] = useState<"type" | "tag" | null>(null);
  const [newLabel, setNewLabel] = useState("");

  const inputRef = useRef<HTMLInputElement>(null);
  const popupInputRef = useRef<HTMLInputElement>(null);
  const touchStartY = useRef(0);
  const touchDelta = useRef(0);

  const allTypes = [...DEFAULT_TYPES, ...customTypes];
  const allTags = [...DEFAULT_TAGS, ...customTags];

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
      setName(""); setDesc(""); setSelectedType("task"); setSelectedTags([]);
      setTime(""); setDuration(""); setAddPopup(null); setNewLabel("");
    }
  }, [open]);

  useEffect(() => {
    if (addPopup) setTimeout(() => popupInputRef.current?.focus(), 100);
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
    if (parsedDur && !duration) setDuration(parsedDur);
    if (parsedTags.length > 0) setSelectedTags((prev) => [...new Set([...prev, ...parsedTags])]);
  };

  const toggleTag = (tagId: string) => {
    setSelectedTags((prev) => prev.includes(tagId) ? prev.filter((t) => t !== tagId) : [...prev, tagId]);
  };

  const handleCreate = () => {
    const { cleanName } = parseInline(name);
    const taskName = cleanName || name.trim();
    if (!taskName) return;
    const [h, m] = (time || "00:00").split(":").map(Number);
    onCreateTask({
      name: taskName, type: selectedType, tags: selectedTags, desc: desc.trim(),
      time: time || `${String(h || 0).padStart(2, "0")}:${String(m || 0).padStart(2, "0")}`,
      timeMin: (h || 0) * 60 + (m || 0),
      duration: parseInt(duration) || 60,
    });
    setName(""); setDesc(""); setSelectedType("task"); setSelectedTags([]);
    setTime(""); setDuration(""); onClose();
  };

  const handlePickSuggestion = (s: any) => {
    setName(s.name);
    if (s.duration) setDuration(String(s.duration));
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
    setAddPopup(null);
    setNewLabel("");
  };

  const onTouchStart = (e: React.TouchEvent) => { touchStartY.current = e.touches[0].clientY; };
  const onTouchMove = (e: React.TouchEvent) => { touchDelta.current = e.touches[0].clientY - touchStartY.current; };
  const onTouchEnd = () => { if (touchDelta.current > 80) onClose(); touchDelta.current = 0; };

  const fmtDur = (m: number) => m >= 60 ? (m % 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${Math.floor(m / 60)}h`) : `${m}m`;

  if (!open) return null;

  const selectedTypeObj = allTypes.find((t) => t.id === selectedType) || allTypes[0];
  const previewColor = addPopup === "type"
    ? COLOR_POOL[customTypes.length % COLOR_POOL.length]
    : COLOR_POOL[customTags.length % COLOR_POOL.length];

  return (
    <>
      {/* Overlay */}
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 200, animation: "fadeIn 0.2s ease" }} />

      {/* Sheet */}
      <div onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd} style={{
        position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 201, maxWidth: 430, margin: "0 auto",
        background: "var(--card)", borderRadius: "24px 24px 0 0", border: "1px solid var(--border)", borderBottom: "none",
        padding: "0 0 env(safe-area-inset-bottom, 16px)", animation: "sheetUp 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        maxHeight: "85vh", overflowY: "auto",
      }}>
        {/* Drag handle */}
        <div style={{ display: "flex", justifyContent: "center", padding: "10px 0 6px" }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: "var(--border2)" }} />
        </div>

        <div style={{ padding: "0 20px 20px" }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: "var(--t1)", fontFamily: DISPLAY, marginBottom: 16 }}>New task</div>

          {/* ── Name input + attached suggestions ── */}
          <div style={{ marginBottom: 14 }}>
            <div style={{
              background: "var(--bg)", padding: "14px 16px",
              borderRadius: hasSuggestions ? "14px 14px 0 0" : 14,
              border: `1.5px solid ${selectedTypeObj.color}40`,
              borderBottom: hasSuggestions ? `0.5px solid var(--border)` : undefined,
            }}>
              <input ref={inputRef} value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                placeholder="Task name..."
                style={{ width: "100%", background: "none", border: "none", color: "var(--t1)", fontSize: 15, fontFamily: BODY, outline: "none" }}
              />
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
            <div style={{ fontSize: 10, color: "var(--t5)", fontFamily: MONO, letterSpacing: 1, marginBottom: 8 }}>DESCRIPTION</div>
            <textarea value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Task details / notes (optional)..."
              rows={2}
              style={{
                width: "100%", background: "var(--bg)", borderRadius: 12, border: "1px solid var(--border2)",
                padding: "12px 14px", color: "var(--t2)", fontSize: 13, fontFamily: BODY, outline: "none",
                resize: "vertical", minHeight: 56, lineHeight: 1.5,
              }}
            />
          </div>

          {/* ── TYPE ── */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 10, color: "var(--t5)", fontFamily: MONO, letterSpacing: 1, marginBottom: 8 }}>TYPE</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
              {allTypes.map((t) => {
                const sel = selectedType === t.id;
                return (
                  <div key={t.id} className="tap" onClick={() => setSelectedType(t.id)} style={{
                    padding: "7px 16px", borderRadius: 100, fontFamily: MONO, fontSize: 11, fontWeight: 700,
                    letterSpacing: 1, cursor: "pointer", transition: "all 0.15s",
                    background: sel ? `${t.color}22` : "transparent",
                    color: sel ? t.color : "var(--t5)",
                    border: `1px solid ${sel ? `${t.color}55` : "var(--border2)"}`,
                  }}>{t.label}</div>
                );
              })}
              <div className="tap" onClick={() => { setAddPopup("type"); setNewLabel(""); }} style={{
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
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 10, color: "var(--t5)", fontFamily: MONO, letterSpacing: 1, marginBottom: 8 }}>TAGS</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
              {allTags.map((t) => {
                const sel = selectedTags.includes(t.id);
                return (
                  <div key={t.id} className="tap" onClick={() => toggleTag(t.id)} style={{
                    padding: "6px 12px", borderRadius: 8, fontSize: 11, fontWeight: 600, fontFamily: MONO,
                    cursor: "pointer", transition: "all 0.15s",
                    background: sel ? `${t.color}22` : "transparent",
                    color: sel ? t.color : "var(--t5)",
                    border: `1.5px solid ${sel ? `${t.color}55` : "var(--border2)"}`,
                  }}>{t.label}</div>
                );
              })}
              <div className="tap" onClick={() => { setAddPopup("tag"); setNewLabel(""); }} style={{
                width: 30, height: 30, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center",
                border: "1px dashed var(--border2)", cursor: "pointer",
              }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--t5)" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              </div>
            </div>
          </div>

          {/* ── TIME + DURATION ── */}
          <div style={{ marginBottom: 18 }}>
            <div style={{ fontSize: 10, color: "var(--t5)", fontFamily: MONO, letterSpacing: 1, marginBottom: 8 }}>TIME + DURATION</div>
            <div style={{ display: "flex", gap: 8 }}>
              <div style={{ flex: 1, background: "var(--bg)", borderRadius: 12, border: "1px solid var(--border2)", padding: "12px 14px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: 11, color: "var(--t5)", fontFamily: MONO }}>TIME</span>
                <input type="time" value={time} onChange={(e) => setTime(e.target.value)}
                  style={{ background: "none", border: "none", color: "var(--accent)", fontSize: 14, fontWeight: 600, fontFamily: MONO, outline: "none", width: 80, textAlign: "right" }} />
              </div>
              <div style={{ flex: 1, background: "var(--bg)", borderRadius: 12, border: "1px solid var(--border2)", padding: "12px 14px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: 11, color: "var(--t5)", fontFamily: MONO }}>MIN</span>
                <input type="number" value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="60"
                  style={{ background: "none", border: "none", color: "var(--accent)", fontSize: 14, fontWeight: 600, fontFamily: MONO, outline: "none", width: 60, textAlign: "right" }} />
              </div>
            </div>
            <div style={{ fontSize: 10, color: "var(--t6)", fontFamily: MONO, marginTop: 6 }}>
              or type inline: &quot;study C 2pm 1.5h&quot; still works
            </div>
          </div>

          {/* ── Buttons ── */}
          <div style={{ display: "flex", gap: 8 }}>
            <div className="tap" onClick={handleCreate} style={{
              flex: 1, background: "var(--accent)", borderRadius: 14, padding: 14, textAlign: "center",
              fontSize: 14, fontWeight: 700, color: "#fff", fontFamily: DISPLAY, cursor: "pointer",
            }}>Create task</div>
            <div className="tap" onClick={onClose} style={{
              width: 50, background: "var(--card2)", borderRadius: 14, border: "1px solid var(--border)",
              display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--t4)" strokeWidth="2" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ ADD TYPE / TAG POPUP ═══ */}
      {addPopup && (
        <>
          <div onClick={() => { setAddPopup(null); setNewLabel(""); }} style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 300, animation: "fadeIn 0.15s ease",
          }} />
          <div style={{
            position: "fixed", bottom: "30%", left: "50%", transform: "translateX(-50%)",
            width: "calc(100% - 48px)", maxWidth: 380, zIndex: 301,
            background: "var(--card)", borderRadius: 20, border: "1px solid var(--border)",
            padding: "24px 20px", animation: "popIn 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
          }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "var(--t1)", fontFamily: DISPLAY, marginBottom: 16 }}>
              Add custom {addPopup}
            </div>

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

            {newLabel.trim() && (
              <>
                <div style={{ fontSize: 10, color: "var(--t5)", fontFamily: MONO, letterSpacing: 1, marginBottom: 10 }}>PREVIEW</div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center", marginBottom: 20 }}>
                  {(addPopup === "type" ? allTypes : allTags).map((t) => (
                    <div key={t.id} style={{
                      padding: addPopup === "type" ? "7px 16px" : "6px 12px",
                      borderRadius: addPopup === "type" ? 100 : 8,
                      fontFamily: MONO, fontSize: 11, fontWeight: 600, letterSpacing: addPopup === "type" ? 1 : 0,
                      background: "transparent", color: "var(--t5)", border: "1px solid var(--border2)",
                    }}>{t.label}</div>
                  ))}
                  <div style={{
                    padding: addPopup === "type" ? "7px 16px" : "6px 12px",
                    borderRadius: addPopup === "type" ? 100 : 8,
                    fontFamily: MONO, fontSize: 11, fontWeight: 700, letterSpacing: addPopup === "type" ? 1 : 0,
                    background: `${previewColor}22`, color: previewColor,
                    border: `1.5px solid ${previewColor}55`,
                  }}>{newLabel.trim().toUpperCase()}</div>
                  <span style={{ fontSize: 9, color: "var(--accent)", fontFamily: MONO }}>new</span>
                </div>
              </>
            )}

            <div style={{ display: "flex", gap: 8 }}>
              <div className="tap" onClick={confirmAddPopup} style={{
                flex: 1, background: newLabel.trim() ? "var(--accent)" : "var(--border2)",
                borderRadius: 12, padding: 12, textAlign: "center", fontSize: 13, fontWeight: 700,
                color: newLabel.trim() ? "#fff" : "var(--t5)", fontFamily: DISPLAY, cursor: "pointer",
                transition: "all 0.15s",
              }}>Add {addPopup}</div>
              <div className="tap" onClick={() => { setAddPopup(null); setNewLabel(""); }} style={{
                width: 44, background: "var(--card2)", borderRadius: 12, border: "1px solid var(--border)",
                display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
              }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--t4)" strokeWidth="2" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </div>
            </div>
          </div>
        </>
      )}

      <style>{`
        @keyframes sheetUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes popIn { from { opacity: 0; transform: translateX(-50%) scale(0.95); } to { opacity: 1; transform: translateX(-50%) scale(1); } }
      `}</style>
    </>
  );
}
