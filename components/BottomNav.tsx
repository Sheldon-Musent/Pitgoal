"use client";
import React, { useRef, useEffect, useCallback } from "react";

type BottomTab = "main" | "community" | "friends" | "profile";

interface BottomNavProps {
  active: BottomTab;
  onChange: (tab: BottomTab) => void;
  onAdd?: () => void;
  expanded: boolean;
  onExpand?: (startCollapse?: boolean) => void;
}

const TAB_LABELS: Record<BottomTab, string> = {
  main: "Home",
  community: "Pit",
  friends: "Chats",
  profile: "You",
};

const TABS: { id: BottomTab; icon: (active: boolean) => React.ReactNode }[] = [
  {
    id: "main",
    icon: (a) => (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
        stroke={a ? "#0a0a0a" : "var(--nav-inactive)"}
        strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/>
        <polyline points="9 22 9 12 15 12 15 22"/>
      </svg>
    ),
  },
  {
    id: "community",
    icon: (a) => (
      <svg width="22" height="22" viewBox="0 0 100 100" fill="none"
        stroke={a ? "#0a0a0a" : "var(--nav-inactive)"}
        strokeWidth="6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M50 10C50 10 20 40 20 62C20 78 33 92 50 92C67 92 80 78 80 62C80 40 50 10 50 10Z"/>
        <path d="M50 50C50 50 36 64 36 72C36 80 42 86 50 86C58 86 64 80 64 72C64 64 50 50 50 50Z"/>
      </svg>
    ),
  },
  {
    id: "friends",
    icon: (a) => (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
        stroke={a ? "#0a0a0a" : "var(--nav-inactive)"}
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
        stroke={a ? "#0a0a0a" : "var(--nav-inactive)"}
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
  const pointerStartRef = useRef<{ x: number; y: number } | null>(null);
  const isDragRef = useRef(false);

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
    isDragRef.current = false;
    pointerStartRef.current = { x: e.clientX, y: e.clientY };
    // Select tab immediately on touch, but don't expand yet
    const tab = getTabFromPointer(e.clientX);
    if (tab) onChange(tab);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!draggingRef.current) return;
    const start = pointerStartRef.current;
    if (start) {
      const dx = e.clientX - start.x;
      const dy = e.clientY - start.y;
      if (Math.sqrt(dx * dx + dy * dy) >= 10 && !isDragRef.current) {
        isDragRef.current = true;
        onExpand?.(false); // expand labels on drag start
      }
    }
    if (isDragRef.current) {
      const tab = getTabFromPointer(e.clientX);
      if (tab) onChange(tab);
    }
  };

  const handleRelease = (e: React.PointerEvent) => {
    const pill = pillRef.current;
    if (pill) pill.releasePointerCapture(e.pointerId);
    draggingRef.current = false;
    if (isDragRef.current) {
      onExpand?.(true); // finger lifted after drag — start 1.5s collapse timer
    }
    isDragRef.current = false;
    pointerStartRef.current = null;
  };

  // Attach touchend as fallback for mobile Safari
  useEffect(() => {
    const pill = pillRef.current;
    if (!pill) return;
    const onTouchEnd = () => {
      draggingRef.current = false;
      if (isDragRef.current) {
        onExpand?.(true);
      }
      isDragRef.current = false;
      pointerStartRef.current = null;
    };
    pill.addEventListener("touchend", onTouchEnd, { passive: true });
    return () => pill.removeEventListener("touchend", onTouchEnd);
  }, [onExpand]);

  return (
    <div
      className="nav-fixed"
      onTouchStart={(e) => e.stopPropagation()}
      onTouchMove={(e) => e.stopPropagation()}
      style={{
        position: "fixed",
        bottom: "calc(16px + env(safe-area-inset-bottom, 0px))",
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 100,
        display: "flex",
        alignItems: "center",
        gap: 10,
        willChange: "transform",
        WebkitBackfaceVisibility: "hidden",
        backfaceVisibility: "hidden",
        isolation: "isolate",
      } as React.CSSProperties}
    >
      {/* Nav pill */}
      <div
        ref={pillRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handleRelease}
        onPointerCancel={handleRelease}
        style={{
          display: "flex",
          alignItems: "center",
          background: "var(--nav-bg)",
          borderRadius: 50,
          padding: 5,
          border: "1px solid var(--nav-border)",
          position: "relative",
          touchAction: "none",
          userSelect: "none",
          willChange: "transform",
          WebkitTransform: "translateZ(0)",
          transform: "translateZ(0)",
          maxWidth: expanded ? "calc(100vw - 56px)" : "calc(100vw - 80px)",
          overflow: "hidden",
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
            willChange: "left, width",
            WebkitTransform: "translateZ(0)",
            transform: "translateZ(0)",
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
            width: expanded ? 36 : 50,
            height: expanded ? 36 : 50,
            borderRadius: "50%",
            background: "#FFD000",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            flexShrink: 0,
            transition: "width 0.3s ease, height 0.3s ease",
            willChange: "transform",
            WebkitTransform: "translateZ(0)",
            transform: "translateZ(0)",
          }}
        >
          <svg width={expanded ? "16" : "22"} height={expanded ? "16" : "22"} viewBox="0 0 24 24" fill="none" stroke="#0a0a0a" strokeWidth="2.5" strokeLinecap="round" style={{ transition: "width 0.3s ease, height 0.3s ease" }}>
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </div>
      )}
    </div>
  );
}
