"use client";
import React, { useRef, useEffect, useCallback } from "react";

type BottomTab = "main" | "community" | "friends" | "profile";

interface BottomNavProps {
  active: BottomTab;
  onChange: (tab: BottomTab) => void;
  onAdd?: () => void;
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
        stroke={a ? "var(--fill-title, #0a0a0a)" : "var(--nav-inactive)"}
        strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/>
        <polyline points="9 22 9 12 15 12 15 22"/>
      </svg>
    ),
  },
  {
    id: "community",
    icon: (a) => (
      <img
        src="/icons/pit-nav.png"
        width={22}
        height={22}
        alt="Pit"
        style={{
          opacity: a ? 1 : 0.4,
          filter: a ? "none" : "invert(1) brightness(0.6)",
          transition: "opacity 0.2s, filter 0.2s",
        }}
      />
    ),
  },
  {
    id: "friends",
    icon: (a) => (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
        stroke={a ? "var(--fill-title, #0a0a0a)" : "var(--nav-inactive)"}
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
        stroke={a ? "var(--fill-title, #0a0a0a)" : "var(--nav-inactive)"}
        strokeWidth="1.8" strokeLinecap="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    ),
  },
];

export default function BottomNav({ active, onChange, onAdd }: BottomNavProps) {
  const pillRef = useRef<HTMLDivElement>(null);
  const cellRefs = useRef<(HTMLDivElement | null)[]>([]);
  const highlightRef = useRef<HTMLDivElement>(null);

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
    const t = setTimeout(updateHighlight, 20);
    return () => clearTimeout(t);
  }, [active, updateHighlight]);

  return (
    <div
      className="nav-fixed"
      onTouchStart={(e) => e.stopPropagation()}
      onTouchMove={(e) => e.stopPropagation()}
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        background: "transparent",
        transform: "translateZ(0)",
        willChange: "transform",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
        paddingTop: 8,
        paddingLeft: 16,
        paddingRight: 16,
        paddingBottom: "calc(8px + env(safe-area-inset-bottom, 0px))",
      } as React.CSSProperties}
    >
      {/* Nav pill */}
      <div
        ref={pillRef}
        style={{
          display: "flex",
          alignItems: "center",
          background: "var(--nav-bg)",
          borderRadius: 50,
          padding: 5,
          border: "none",
          position: "relative",
          userSelect: "none",
          willChange: "transform",
          WebkitTransform: "translateZ(0)",
          transform: "translateZ(0)",
          overflow: "hidden",
        }}
      >
        {/* Yellow highlight */}
        <div
          ref={highlightRef}
          style={{
            position: "absolute",
            top: 5,
            borderRadius: 50,
            background: "var(--accent)",
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
              onClick={() => onChange(tab.id)}
              style={{
                height: 44,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 2,
                cursor: "pointer",
                position: "relative",
                zIndex: 1,
                borderRadius: 50,
                padding: "0 16px",
                minWidth: 56,
              }}
            >
              <div style={{ flexShrink: 0 }}>{tab.icon(isActive)}</div>
              <span style={{
                fontSize: 9,
                fontWeight: 600,
                color: isActive ? "var(--fill-title, #0a0a0a)" : "var(--t4)",
                lineHeight: 1,
                whiteSpace: "nowrap",
                letterSpacing: 0.5,
              }}>
                {TAB_LABELS[tab.id]}
              </span>
            </div>
          );
        })}
      </div>

      {/* Add button */}
      {onAdd && (
        <div
          className="tap"
          onClick={onAdd}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onAdd?.(); }}
          style={{
            width: 50,
            height: 50,
            borderRadius: "50%",
            background: "var(--accent)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            flexShrink: 0,
            willChange: "transform",
            WebkitTransform: "translateZ(0)",
            transform: "translateZ(0)",
          }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--fill-title, #0a0a0a)" strokeWidth="2.5" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </div>
      )}
    </div>
  );
}
