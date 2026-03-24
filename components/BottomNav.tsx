"use client";
import React from "react";
import type { BottomTab } from "../lib/types";
import { MONO } from "../lib/constants";

const TABS: { id: BottomTab; label: string; icon: (c: string) => React.ReactNode }[] = [
  { id: "main",      label: "MAIN",    icon: (c) => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg> },
  { id: "community", label: "HUB",     icon: (c) => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" /></svg> },
  { id: "friends",   label: "FRIENDS", icon: (c) => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87" /><path d="M16 3.13a4 4 0 010 7.75" /></svg> },
  { id: "profile",   label: "ME",      icon: (c) => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" /></svg> },
];

interface Props {
  active: BottomTab;
  onChange: (tab: BottomTab) => void;
}

export default function BottomNav({ active, onChange }: Props) {
  return (
    <div style={{
      position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)",
      width: "100%", maxWidth: 430, zIndex: 80,
      background: "var(--nav-bg)", backdropFilter: "blur(16px)",
      borderTop: "1px solid var(--border)",
      padding: "8px 14px calc(8px + env(safe-area-inset-bottom, 0px))",
      display: "flex", justifyContent: "space-around", alignItems: "center",
    }}>
      {TABS.map(tab => {
        const isActive = active === tab.id;
        const color = isActive ? "var(--accent)" : "var(--t5)";
        return (
          <div key={tab.id} className="tap" onClick={() => onChange(tab.id)}
            style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, padding: "4px 12px", cursor: "pointer" }}>
            {tab.icon(color)}
            <span style={{ fontSize: 9, fontWeight: 700, color, fontFamily: MONO, letterSpacing: 1 }}>{tab.label}</span>
          </div>
        );
      })}
    </div>
  );
}
