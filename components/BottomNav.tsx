"use client";
import React from "react";

type BottomTab = "main" | "community" | "friends" | "profile";

interface BottomNavProps {
  active: BottomTab;
  onChange: (tab: BottomTab) => void;
  onAdd?: () => void;
}

// ── Tab definitions (icon-only, per v13 spec) ──
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

export default function BottomNav({ active, onChange, onAdd }: BottomNavProps) {
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
        style={{
          display: "flex",
          alignItems: "center",
          background: "#161616",
          borderRadius: 50,
          padding: 5,
          border: "1px solid #222",
        }}
      >
        {TABS.map((tab) => {
          const isActive = active === tab.id;
          return (
            <div
              key={tab.id}
              className="tap"
              onClick={() => onChange(tab.id)}
              style={{
                width: 50,
                height: 50,
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                transition: "background 0.2s ease",
                background: isActive ? "#FFD000" : "transparent",
              }}
            >
              {tab.icon(isActive)}
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
