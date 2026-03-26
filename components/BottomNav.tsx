"use client";
import React, { useRef, useEffect, useCallback } from "react";

type BottomTab = "main" | "community" | "friends" | "profile";

interface BottomNavProps {
  active: BottomTab;
  onChange: (tab: BottomTab) => void;
  onAdd?: () => void;
  expanded: boolean;
  onExpand?: () => void;
}

const TAB_LABELS: Record<BottomTab, string> = {
  main: "Home",
  community: "Market",
  friends: "Chats",
  profile: "You",
};

const TABS: { id: BottomTab; icon: (active: boolean) => React.ReactNode }[] = [
  {
    id: "main",
    icon: (a) => (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
        stroke={a ? "#0a0a0a" : "#3a3a3a"}
        strokeWidth="1.8" strokeLinecap="round">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    ),
  },
  {
    id: "community",
    icon: (a) => (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
        stroke={a ? "#0a0a0a" : "#3a3a3a"}
        strokeWidth="1.8" strokeLinecap="round">
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
  },
  {
    id: "friends",
    icon: (a) => (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
        stroke={a ? "#0a0a0a" : "#3a3a3a"}
        strokeWidth="1.8" strokeLinecap="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    id: "profile",
    icon: (a) => (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
        stroke={a ? "#0a0a0a" : "#3a3a3a"}
        strokeWidth="1.8" strokeLinecap="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    ),
  },
];

export default function BottomNav({ active, onChange, onAdd, expanded, onExpand }: BottomNavProps) {
  const pillRef = useRef<HTMLDivElement>(null);
  const cellRefs = useRef<(HTMLDivElement | null)[]>([]);
  const highlightRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);

  // Position the highlight on the active cell
  const updateHighlight = useCallback(() => {
    const pill = pillRef.current;
    const highlight = highlightRef.current;
    if (!pill || !highlight) return;
    const idx = TABS.findIndex(t => t.id === active);
    const cell = cellRefs.current[idx];
    if (!cell) return;
    highlight.style.left = `${cell.offsetLeft}px`;
    highlight.style.width = `${cell.offsetWidth}px`;
    highlight.style.height = `${cell.offsetHeight}px`;
  }, [active]);

  useEffect(() => {
    // Small delay to allow layout to settle after expand/collapse
    const t = setTimeout(updateHighlight, 20);
    return () => clearTimeout(t);
  }, [active, expanded, updateHighlight]);

  const getTabFromPointer = (clientX: number): BottomTab | null => {
    for (let i = 0; i < TABS.length; i++) {
      const cell = cellRefs.current[i];
      if (!cell) continue;
      const rect = cell.getBoundingClientRect();
      if (clientX >= rect.left && clientX <= rect.right) return TABS[i].id;
    }
    return null;
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    const pill = pillRef.current;
    if (!pill) return;
    pill.setPointerCapture(e.pointerId);
    draggingRef.current = true;
    onExpand?.();
    const tab = getTabFromPointer(e.clientX);
    if (tab) onChange(tab);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!draggingRef.current) return;
    const tab = getTabFromPointer(e.clientX);
    if (tab) onChange(tab);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    const pill = pillRef.current;
    if (pill) pill.releasePointerCapture(e.pointerId);
    draggingRef.current = false;
    // onExpand was already called — page.tsx starts the 2s collapse timer on expand
    onExpand?.();
  };

  return (
    <div
      style={{
        position: "fixed",
        bottom: "calc(16px + env(safe-area-inset-bottom, 0px))",
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 100,
        display: "flex",
        alignItems: "center",
        gap: 10,
      }}
    >
      {/* Nav pill */}
      <div
        ref={pillRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        style={{
          display: "flex",
          alignItems: "center",
          background: "#161616",
          borderRadius: 50,
          padding: 5,
          border: "1px solid #222",
          position: "relative",
          touchAction: "none",
          userSelect: "none",
        }}
      >
        {/* Yellow highlight (absolute positioned) */}
        <div
          ref={highlightRef}
          style={{
            position: "absolute",
            top: 5,
            borderRadius: 50,
            background: "#FFD000",
            transition: "left 0.3s ease, width 0.3s ease",
            pointerEvents: "none",
            zIndex: 0,
          }}
        />
        {TABS.map((tab, idx) => {
          const isActive = active === tab.id;
          return (
            <div
              key={tab.id}
              ref={(el) => { cellRefs.current[idx] = el; }}
              style={{
                height: 50,
                display: "flex",
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: expanded ? 6 : 0,
                cursor: "pointer",
                position: "relative",
                zIndex: 1,
                borderRadius: 50,
                width: expanded ? "auto" : 50,
                paddingLeft: expanded ? 14 : 0,
                paddingRight: expanded ? 14 : 0,
                transition: "width 0.3s ease, padding 0.3s ease",
                minWidth: 50,
              }}
            >
              <div style={{ flexShrink: 0 }}>{tab.icon(isActive)}</div>
              <span style={{
                fontSize: 11,
                fontWeight: 600,
                color: isActive ? "#0a0a0a" : "#666",
                lineHeight: 1,
                overflow: "hidden",
                whiteSpace: "nowrap",
                width: expanded ? "auto" : 0,
                opacity: expanded ? 1 : 0,
                transition: "width 0.3s ease, opacity 0.3s ease",
              }}>
                {TAB_LABELS[tab.id]}
              </span>
            </div>
          );
        })}
      </div>

      {/* Floating add button */}
      {onAdd && (
        <div
          className="tap"
          onClick={onAdd}
          style={{
            width: 50,
            height: 50,
            borderRadius: "50%",
            background: "#FFD000",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            flexShrink: 0,
          }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#0a0a0a" strokeWidth="2.5" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </div>
      )}
    </div>
  );
}
