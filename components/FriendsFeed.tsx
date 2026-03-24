"use client";
import { DISPLAY, MONO, MOCK_FRIENDS, MOCK_COLLAB_TASKS, FRIEND_ACTIVITY } from "../lib/constants";
import { fmtDur, statusColor } from "../lib/utils";
import type { BottomTab } from "../lib/types";

interface Props {
  onNavigate: (tab: BottomTab, friendId?: string) => void;
}

export default function FriendsFeed({ onNavigate }: Props) {
  return (
    <>
      {/* ── Collab tasks ── */}
      {MOCK_COLLAB_TASKS.length > 0 && (
        <div style={{ marginBottom: 4, marginTop: 8 }}>
          <div style={{ fontSize: 10, color: "var(--pink)", fontFamily: MONO, letterSpacing: 2, marginBottom: 10 }}>COLLAB TASKS</div>
          {MOCK_COLLAB_TASKS.map((ct, i) => (
            <div key={ct.id} style={{
              background: "var(--card)", borderRadius: 20, padding: "14px 16px", marginBottom: 8,
              border: "1px solid var(--pink-20)", display: "flex", alignItems: "center", gap: 12,
              animation: `fadeUp 0.3s ease ${i * 0.05}s both`,
            }}>
              <div style={{ width: 34, height: 34, borderRadius: 10, background: "var(--pink-dim)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <span style={{ fontSize: 13, fontWeight: 800, color: "var(--pink)", fontFamily: DISPLAY }}>{ct.friend[0]}</span>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, color: "var(--t2)", fontWeight: 700, fontFamily: DISPLAY }}>{ct.name}</div>
                <div style={{ display: "flex", gap: 6, marginTop: 4, alignItems: "center" }}>
                  <span style={{ fontSize: 9, color: "var(--pink)", background: "var(--pink-dim)", padding: "2px 7px", borderRadius: 4, fontFamily: MONO, fontWeight: 600 }}>COLLAB</span>
                  <span style={{ fontSize: 10, color: "var(--t4)", fontFamily: MONO }}>{ct.time} · {fmtDur(ct.duration)}</span>
                </div>
              </div>
              <span style={{ fontSize: 10, color: "var(--t5)", fontFamily: MONO }}>w/ {ct.friend}</span>
            </div>
          ))}
        </div>
      )}

      {/* ── Friends activity ── */}
      <div style={{ marginTop: 8 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <div style={{ fontSize: 10, color: "var(--rest)", fontFamily: MONO, letterSpacing: 2 }}>FRIENDS ACTIVITY</div>
          <div className="tap" onClick={() => onNavigate("friends")} style={{ fontSize: 9, color: "var(--t4)", fontFamily: MONO, cursor: "pointer", letterSpacing: 1 }}>VIEW ALL →</div>
        </div>

        {/* Live status strip */}
        <div style={{ display: "flex", gap: 8, overflowX: "auto", marginBottom: 12, paddingBottom: 2 }} className="no-scroll">
          {MOCK_FRIENDS.filter(f => f.statusType !== "idle").map(friend => {
            const sc = statusColor(friend.statusType);
            return (
              <div key={friend.id} className="tap" onClick={() => onNavigate("friends", friend.id)}
                style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: 8, background: "var(--glow)", border: "1px solid var(--border)", borderRadius: 14, padding: "8px 12px", cursor: "pointer" }}>
                <div style={{ position: "relative" }}>
                  <div style={{ width: 28, height: 28, borderRadius: 8, background: "var(--accent-10)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <span style={{ fontSize: 11, fontWeight: 800, color: sc, fontFamily: DISPLAY }}>{friend.name[0]}</span>
                  </div>
                  <div style={{ position: "absolute", bottom: -2, right: -2, width: 8, height: 8, borderRadius: "50%", background: sc, border: "2px solid var(--bg)" }} />
                </div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "var(--t1)", fontFamily: DISPLAY, whiteSpace: "nowrap" }}>{friend.name}</div>
                  <div style={{ fontSize: 9, color: sc, fontFamily: MONO, whiteSpace: "nowrap", maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis" }}>{friend.status}</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Activity cards */}
        {FRIEND_ACTIVITY.slice(0, 4).map((a, i) => {
          const isDone = a.action === "completed";
          const isRest = a.type === "rest";
          const accent = isRest ? "var(--rest)" : isDone ? "var(--accent)" : "var(--warn)";
          const label = isDone ? "✓ done" : isRest ? "◆ resting" : "▶ started";
          return (
            <div key={i} className="tap" onClick={() => onNavigate("friends", a.friendId)}
              style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", marginBottom: 4, borderRadius: 14, background: "var(--glow)", border: "1px solid var(--border)", cursor: "pointer", animation: `fadeUp 0.25s ease ${i * 0.04}s both` }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: "var(--accent-dim)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <span style={{ fontSize: 11, fontWeight: 800, color: accent, fontFamily: DISPLAY }}>{a.name[0]}</span>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "var(--t2)", fontFamily: DISPLAY }}>{a.name}</span>
                  <span style={{ fontSize: 9, color: accent, fontFamily: MONO, fontWeight: 600 }}>{label}</span>
                </div>
                <div style={{ fontSize: 11, color: "var(--t4)", marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{a.task}</div>
              </div>
              <div style={{ fontSize: 9, color: "var(--t6)", fontFamily: MONO, flexShrink: 0 }}>{a.time}</div>
            </div>
          );
        })}
      </div>
    </>
  );
}
