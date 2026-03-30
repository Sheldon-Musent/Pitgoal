"use client";
import React, { useState, useRef, useEffect, useCallback } from "react";

interface ResizableLayoutProps {
  sideNav: React.ReactNode;
  content: React.ReactNode;
  timeline?: React.ReactNode;
  sideNavCollapsed: boolean;
}

const STORAGE_KEY_PANELS = "pitgoal-panel-widths";
const SIDE_MIN = 56;
const SIDE_MAX = 360;
const SIDE_DEFAULT = 280;
const SIDE_COLLAPSED = 56;
const SIDE_SNAP_THRESHOLD = 180;
const TIMELINE_MIN = 200;
const TIMELINE_DEFAULT = 380;

export default function ResizableLayout({
  sideNav, content, timeline, sideNavCollapsed,
}: ResizableLayoutProps) {
  const [sideWidth, setSideWidth] = useState(sideNavCollapsed ? SIDE_COLLAPSED : SIDE_DEFAULT);
  const [timelineWidth, setTimelineWidth] = useState(TIMELINE_DEFAULT);
  const [dragging, setDragging] = useState<"side" | "timeline" | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Load saved widths
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_PANELS);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.sideWidth) setSideWidth(parsed.sideWidth);
        if (parsed.timelineWidth) setTimelineWidth(parsed.timelineWidth);
      }
    } catch {}
  }, []);

  // Sync collapsed state
  useEffect(() => {
    setSideWidth(sideNavCollapsed ? SIDE_COLLAPSED : SIDE_DEFAULT);
  }, [sideNavCollapsed]);

  // Save widths
  const saveWidths = useCallback((sw: number, tw: number) => {
    try {
      localStorage.setItem(STORAGE_KEY_PANELS, JSON.stringify({
        sideWidth: sw,
        timelineWidth: tw,
      }));
    } catch {}
  }, []);

  const handleMouseDown = (panel: "side" | "timeline") => (e: React.MouseEvent) => {
    e.preventDefault();
    setDragging(panel);
  };

  useEffect(() => {
    if (!dragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const container = containerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();

      if (dragging === "side") {
        let newWidth = e.clientX - rect.left;
        if (newWidth < SIDE_SNAP_THRESHOLD) {
          newWidth = SIDE_COLLAPSED;
        } else {
          newWidth = Math.max(SIDE_DEFAULT, Math.min(SIDE_MAX, newWidth));
        }
        setSideWidth(newWidth);
      }

      if (dragging === "timeline") {
        let newWidth = rect.right - e.clientX;
        newWidth = Math.max(TIMELINE_MIN, Math.min(rect.width * 0.6, newWidth));
        setTimelineWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setDragging(null);
      // Snap to nearest valid width on release
      setSideWidth(sw => {
        const snapped = sw < SIDE_SNAP_THRESHOLD ? SIDE_COLLAPSED : SIDE_DEFAULT;
        setTimelineWidth(tw => {
          saveWidths(snapped, tw);
          return tw;
        });
        return snapped;
      });
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [dragging, saveWidths]);

  return (
    <div
      ref={containerRef}
      style={{
        display: "flex",
        flexDirection: "row",
        width: "100%",
        height: "100dvh",
        overflow: "hidden",
        position: "relative",
        userSelect: dragging ? "none" : "auto",
      }}
    >
      {/* SideNav panel */}
      <div style={{
        width: sideWidth,
        maxWidth: sideWidth,
        minWidth: 0,
        flexShrink: 0,
        overflow: "hidden",
        transition: dragging === "side" ? "none" : "width 0.2s ease",
      }}>
        {sideNav}
      </div>

      {/* Divider: side <-> content */}
      <div
        onMouseDown={handleMouseDown("side")}
        style={{
          width: 4,
          flexShrink: 0,
          cursor: "col-resize",
          background: dragging === "side" ? "var(--accent)" : "transparent",
          transition: "background 0.15s",
          position: "relative",
          zIndex: 10,
        }}
        onMouseEnter={(e) => { if (!dragging) e.currentTarget.style.background = "var(--border)"; }}
        onMouseLeave={(e) => { if (!dragging) e.currentTarget.style.background = "transparent"; }}
      />

      {/* Content panel */}
      <div style={{
        flex: 1,
        minWidth: 280,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}>
        {content}
      </div>

      {/* Divider: content <-> timeline (only if timeline exists) */}
      {timeline && (
        <>
          <div
            onMouseDown={handleMouseDown("timeline")}
            style={{
              width: 4,
              flexShrink: 0,
              cursor: "col-resize",
              background: dragging === "timeline" ? "var(--accent)" : "transparent",
              transition: "background 0.15s",
              position: "relative",
              zIndex: 10,
            }}
            onMouseEnter={(e) => { if (!dragging) e.currentTarget.style.background = "var(--border)"; }}
            onMouseLeave={(e) => { if (!dragging) e.currentTarget.style.background = "transparent"; }}
          />

          {/* Timeline panel */}
          <div style={{
            width: timelineWidth,
            maxWidth: timelineWidth,
            minWidth: 0,
            flexShrink: 0,
            overflow: "hidden",
            transition: dragging === "timeline" ? "none" : "width 0.2s ease",
          }}>
            {timeline}
          </div>
        </>
      )}
    </div>
  );
}
