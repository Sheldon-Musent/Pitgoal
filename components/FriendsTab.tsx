"use client";
import { useState } from "react";
import { DISPLAY, BODY, MONO, MOCK_FRIENDS, MOCK_CHATS } from "../lib/constants";
import { statusColor, statusBg } from "../lib/utils";
import type { BottomTab } from "../lib/types";

interface Props {
  onNavigate: (tab: BottomTab, friendId?: string) => void;
}

export default function FriendsTab({ onNavigate }: Props) {
  const [search, setSearch] = useState("");
  const [chatOpen, setChatOpen] = useState<string | null>(null);
  const [chatInput, setChatInput] = useState("");

  if (chatOpen) {
    const friend = MOCK_FRIENDS.find(f => f.id === chatOpen);
    const chats = MOCK_CHATS[chatOpen] || [];
    if (!friend) return null;
    const sc = statusColor(friend.statusType);

    return (
      <div style={{ padding: "16px 14px 0" }}>
        {/* Chat header */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
          <div className="tap" onClick={() => setChatOpen(null)} style={{ width: 36, height: 36, borderRadius: 12, background: "var(--card)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--t3)" strokeWidth="2" strokeLinecap="round"><polyline points="15 18 9 12 15 6" /></svg>
          </div>
          <div style={{ width: 36, height: 36, borderRadius: 12, background: "var(--accent-10)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <span style={{ fontSize: 14, fontWeight: 800, color: sc, fontFamily: DISPLAY }}>{friend.name[0]}</span>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: "var(--t1)", fontFamily: DISPLAY }}>{friend.name}</div>
            <div style={{ fontSize: 10, color: sc, fontFamily: MONO }}>{friend.status}</div>
          </div>
          <div className="tap" style={{ fontSize: 9, color: "var(--pink)", fontFamily: MONO, letterSpacing: 1, background: "var(--pink-dim)", padding: "6px 10px", borderRadius: 8, border: "1px solid var(--pink-20)", cursor: "pointer", fontWeight: 600 }}>COLLAB</div>
        </div>

        {/* Messages */}
        <div style={{ minHeight: "calc(100vh - 280px)" }}>
          {chats.length === 0 && (
            <div style={{ textAlign: "center", padding: "40px 20px" }}>
              <div style={{ fontSize: 13, color: "var(--t4)" }}>No messages yet</div>
              <div style={{ fontSize: 11, color: "var(--t6)", marginTop: 4 }}>Say hi to {friend.name}</div>
            </div>
          )}
          {chats.map((msg, i) => (
            <div key={i} style={{ display: "flex", justifyContent: msg.from === "me" ? "flex-end" : "flex-start", marginBottom: 8 }}>
              <div style={{
                maxWidth: "75%", padding: "10px 14px",
                borderRadius: msg.from === "me" ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
                background: msg.from === "me" ? "var(--accent-10)" : "var(--card)",
                border: `1px solid ${msg.from === "me" ? "var(--accent-20)" : "var(--border)"}`,
              }}>
                <div style={{ fontSize: 13, color: "var(--t2)", lineHeight: 1.5 }}>{msg.text}</div>
                <div style={{ fontSize: 9, color: "var(--t5)", fontFamily: MONO, marginTop: 4, textAlign: "right" }}>{msg.time}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Chat input */}
        <div style={{ position: "sticky", bottom: 80, background: "var(--bg)", paddingTop: 10, paddingBottom: 10 }}>
          <div style={{ background: "var(--card)", borderRadius: 16, padding: "10px 14px", border: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 10 }}>
            <input value={chatInput} onChange={e => setChatInput(e.target.value)} placeholder={`Message ${friend.name}...`}
              style={{ flex: 1, background: "none", border: "none", color: "var(--t2)", fontSize: 13, fontFamily: BODY, outline: "none" }} />
            {chatInput && (
              <div className="tap" onClick={() => setChatInput("")} style={{ background: "var(--pink)", borderRadius: 8, padding: "6px 14px", fontSize: 11, color: "#fff", fontWeight: 700, fontFamily: MONO, cursor: "pointer" }}>SEND</div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Friend list view
  const filtered = MOCK_FRIENDS.filter(f => !search || f.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div style={{ padding: "16px 14px 0" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 800, color: "var(--t1)", fontFamily: DISPLAY }}>Friends</div>
          <div style={{ fontSize: 11, color: "var(--t4)", marginTop: 2 }}>{MOCK_FRIENDS.length} connected</div>
        </div>
        <div className="tap" style={{ background: "var(--pink)", borderRadius: 12, padding: "10px 16px", fontSize: 11, fontWeight: 700, color: "#fff", fontFamily: MONO, cursor: "pointer" }}>+ ADD</div>
      </div>

      {/* Search */}
      <div style={{ background: "var(--card)", borderRadius: 16, padding: "12px 14px", border: "1px solid var(--border)", marginBottom: 16, display: "flex", alignItems: "center", gap: 10 }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--t4)" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search friends..."
          style={{ flex: 1, background: "none", border: "none", color: "var(--t2)", fontSize: 13, fontFamily: BODY, outline: "none" }} />
      </div>

      {/* Friend cards */}
      {filtered.map((friend, i) => {
        const sc = statusColor(friend.statusType);
        const bg = statusBg(friend.statusType);
        return (
          <div key={friend.id} className="tap" onClick={() => setChatOpen(friend.id)}
            style={{ background: bg, borderRadius: 20, padding: "16px 18px", marginBottom: 8, border: "1px solid var(--border)", cursor: "pointer", animation: `fadeUp 0.25s ease ${i * 0.05}s both` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{ width: 44, height: 44, borderRadius: 14, background: "var(--accent-10)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, position: "relative" }}>
                <span style={{ fontSize: 18, fontWeight: 800, color: sc, fontFamily: DISPLAY }}>{friend.name[0]}</span>
                <div style={{ position: "absolute", bottom: -1, right: -1, width: 12, height: 12, borderRadius: "50%", background: friend.statusType !== "idle" ? "var(--accent)" : "var(--t6)", border: "2px solid var(--bg)" }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 15, fontWeight: 700, color: "var(--t1)", fontFamily: DISPLAY }}>{friend.name}</span>
                  {friend.streak > 0 && <span style={{ fontSize: 9, color: "var(--warn)", background: "var(--warn-dim)", padding: "2px 6px", borderRadius: 4, fontFamily: MONO, fontWeight: 600 }}>{friend.streak}d</span>}
                </div>
                <div style={{ fontSize: 12, color: sc, marginTop: 3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {friend.statusType !== "idle" && <span className="anim-pulse" style={{ display: "inline-block", width: 6, height: 6, borderRadius: "50%", background: sc, marginRight: 6, verticalAlign: "middle" }} />}
                  {friend.status}
                </div>
              </div>
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                <div style={{ fontSize: 10, color: "var(--t4)", fontFamily: MONO }}>{friend.lastActive}</div>
                {MOCK_CHATS[friend.id] && <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--pink)", marginTop: 6, marginLeft: "auto" }} />}
              </div>
            </div>
          </div>
        );
      })}

      {/* Verify tasks */}
      <div style={{ marginTop: 20 }}>
        <div style={{ fontSize: 10, color: "var(--pink)", fontFamily: MONO, letterSpacing: 2, marginBottom: 10 }}>VERIFY TASKS</div>
        <div style={{ background: "var(--card)", borderRadius: 20, padding: "20px", border: "1px dashed var(--pink-20)", textAlign: "center" }}>
          <div style={{ fontSize: 13, color: "var(--t5)" }}>No tasks waiting for verification</div>
          <div style={{ fontSize: 11, color: "var(--t6)", marginTop: 4 }}>When friends complete tasks, you can verify them here</div>
        </div>
      </div>

      {/* Collab invites */}
      <div style={{ marginTop: 20 }}>
        <div style={{ fontSize: 10, color: "var(--accent)", fontFamily: MONO, letterSpacing: 2, marginBottom: 10 }}>COLLAB INVITES</div>
        <div style={{ background: "var(--card)", borderRadius: 20, padding: "20px", border: "1px dashed var(--accent-20)", textAlign: "center" }}>
          <div style={{ fontSize: 13, color: "var(--t5)" }}>No pending invites</div>
          <div style={{ fontSize: 11, color: "var(--t6)", marginTop: 4 }}>Send a collab task to work on something together</div>
        </div>
      </div>
    </div>
  );
}
