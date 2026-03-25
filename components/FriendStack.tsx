"use client";
import { useState } from "react";

const MONO = "'IBM Plex Mono', monospace";
const DISPLAY = "'Sora', sans-serif";

interface FriendStatus {
  id: string;
  name: string;
  initial: string;
  activity: string;
  state: "working" | "resting" | "upcoming";
}

interface FriendStackProps {
  friends: FriendStatus[];
}

export default function FriendStack({ friends }: FriendStackProps) {
  const [expanded, setExpanded] = useState(false);

  if (friends.length === 0) return null;

  const stateColor = (s: string) =>
    s === "working" ? "var(--accent)" : s === "resting" ? "var(--rest)" : "var(--t4)";

  const stateLabel = (s: string) =>
    s === "working" ? "now" : s === "resting" ? "rest" : "soon";

  // Single friend — no stacking needed
  if (friends.length === 1) {
    const f = friends[0];
    return (
      <div
        style={{
          background: "var(--card)",
          borderRadius: 10,
          border: "1px solid var(--pink-10)",
          padding: "8px 14px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div
            style={{
              width: 24,
              height: 24,
              borderRadius: "50%",
              background: "var(--pink-10)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 11,
              color: "var(--pink)",
              fontWeight: 600,
              flexShrink: 0,
            }}
          >
            {f.initial}
          </div>
          <div style={{ fontSize: 13, color: "var(--t3)", fontWeight: 500, fontFamily: DISPLAY }}>
            {f.name} {f.activity}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
          <div
            className={f.state === "working" ? "anim-pulse" : undefined}
            style={{
              width: 5,
              height: 5,
              borderRadius: "50%",
              background: stateColor(f.state),
            }}
          />
          <span style={{ fontSize: 11, color: "var(--t5)", fontFamily: MONO }}>
            {stateLabel(f.state)}
          </span>
        </div>
      </div>
    );
  }

  // Multiple friends — stacked
  const cardHeight = 40;
  const peekOffset = 5;
  const expandGap = cardHeight + 6;
  const collapsedHeight = cardHeight + peekOffset * Math.min(friends.length - 1, 3);
  const expandedHeight = friends.length * expandGap - 6;

  return (
    <div
      onClick={() => setExpanded(!expanded)}
      style={{
        position: "relative",
        cursor: "pointer",
        height: expanded ? expandedHeight : collapsedHeight,
        transition: "height 0.35s cubic-bezier(0.4, 0, 0.2, 1)",
      }}
    >
      {friends.map((f, i) => {
        const isTop = i === 0;
        const collapsedTop = i * peekOffset;
        const expandedTop = i * expandGap;
        const collapsedOpacity = isTop ? 1 : Math.max(0.25, 1 - i * 0.25);
        const collapsedScale = isTop ? 1 : Math.max(0.94, 1 - i * 0.02);

        return (
          <div
            key={f.id}
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              top: expanded ? expandedTop : collapsedTop,
              opacity: expanded ? 1 : collapsedOpacity,
              transform: expanded ? "scale(1)" : `scale(${collapsedScale})`,
              transition: "all 0.35s cubic-bezier(0.4, 0, 0.2, 1)",
              zIndex: friends.length - i,
              background: "var(--card)",
              borderRadius: 10,
              border: "1px solid var(--pink-10)",
              padding: "8px 14px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              height: cardHeight,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, overflow: "hidden" }}>
              <div
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: "50%",
                  background: "var(--pink-10)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 11,
                  color: "var(--pink)",
                  fontWeight: 600,
                  flexShrink: 0,
                }}
              >
                {f.initial}
              </div>
              <div
                style={{
                  fontSize: 13,
                  color: "var(--t3)",
                  fontWeight: 500,
                  fontFamily: DISPLAY,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {f.name} {f.activity}
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0, paddingLeft: 8 }}>
              <div
                className={f.state === "working" ? "anim-pulse" : undefined}
                style={{
                  width: 5,
                  height: 5,
                  borderRadius: "50%",
                  background: stateColor(f.state),
                }}
              />
              <span style={{ fontSize: 11, color: "var(--t5)", fontFamily: MONO }}>
                {stateLabel(f.state)}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
