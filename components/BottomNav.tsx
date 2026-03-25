"use client";
import { useState, useEffect, useRef } from "react";

type BottomTab = "main" | "community" | "friends" | "profile";

interface BottomNavProps {
  active: BottomTab;
  onChange: (tab: BottomTab) => void;
}

const MONO = "'IBM Plex Mono', monospace";

// ── Tab definitions ──
const TABS: { id: BottomTab; label: string; icon: (active: boolean) => JSX.Element }[] = [
  {
    id: "main",
    label: "Main",
    icon: (a) => (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
        stroke={a ? "var(--accent)" : "var(--t4)"}
        strokeWidth="1.8" strokeLinecap="round">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    ),
  },
  {
    id: "community",
    label: "Hub",
    icon: (a) => (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
        stroke={a ? "var(--accent)" : "var(--t4)"}
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
    label: "Friends",
    icon: (a) => (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
        stroke={a ? "var(--accent)" : "var(--t4)"}
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
    label: "Me",
    icon: (a) => (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
        stroke={a ? "var(--accent)" : "var(--t4)"}
        strokeWidth="1.8" strokeLinecap="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    ),
  },
];

export default function BottomNav({ active, onChange }: BottomNavProps) {
  // Track if labels should show — brief flash then collapse
  const [showLabel, setShowLabel] = useState(true);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleTap = (tab: BottomTab) => {
    onChange(tab);
    // Show label briefly on tap
    setShowLabel(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setShowLabel(false), 1800);
  };

  // Initially show label, then collapse after a beat
  useEffect(() => {
    hideTimer.current = setTimeout(() => setShowLabel(false), 2500);
    return () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, []);

  return (
    <div
      style={{
        position: "fixed",
        bottom: "calc(16px + env(safe-area-inset-bottom, 0px))",
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 100,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          background: "var(--card)",
          borderRadius: 28,
          padding: "6px 4px",
          border: "1px solid var(--border)",
        }}
      >
        {TABS.map((tab) => {
          const isActive = active === tab.id;
          const labelVisible = isActive && showLabel;

          return (
            <div
              key={tab.id}
              className="tap"
              onClick={() => handleTap(tab.id)}
              style={{
                display: "flex",
                alignItems: "center",
                padding: "10px 14px",
                borderRadius: 22,
                cursor: "pointer",
                transition: "background 0.3s ease",
                background: isActive ? "var(--accent-10)" : "transparent",
              }}
            >
              {tab.icon(isActive)}
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  fontFamily: MONO,
                  color: isActive ? "var(--accent)" : "var(--t4)",
                  maxWidth: labelVisible ? 60 : 0,
                  overflow: "hidden",
                  opacity: labelVisible ? 1 : 0,
                  marginLeft: labelVisible ? 6 : 0,
                  whiteSpace: "nowrap",
                  transition:
                    "max-width 0.35s ease, opacity 0.3s ease, margin 0.3s ease",
                }}
              >
                {tab.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
