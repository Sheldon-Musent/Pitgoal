"use client";
import React, { useState, useRef, useEffect, useCallback } from "react";

interface ResizableLayoutProps {
  sideNav: React.ReactNode;
  content: React.ReactNode;
  timeline?: React.ReactNode;
  sideNavCollapsed: boolean;
  onSideNavCollapse?: (collapsed: boolean) => void;
}

const STORAGE_KEY_PANELS = "pitgoal-panel-widths";
const SIDE_COLLAPSED = 56;
const SIDE_EXPANDED_MIN = 220;
const SIDE_EXPANDED_DEFAULT = 280;
const SIDE_EXPANDED_MAX = 360;
const DEAD_ZONE_LOW = 100;
const DEAD_ZONE_HIGH = 180;
const TIMELINE_MIN = 180;
const TIMELINE_DEFAULT = 380;

export default function ResizableLayout({
  sideNav, content, timeline, sideNavCollapsed, onSideNavCollapse,
}: ResizableLayoutProps) {
  const [sideWidth, setSideWidth] = useState(sideNavCollapsed ? SIDE_COLLAPSED : SIDE_EXPANDED_DEFAULT);
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

  // Sync collapsed state from parent toggle button
  useEffect(() => {
    setSideWidth(sideNavCollapsed ? SIDE_COLLAPSED : SIDE_EXPANDED_DEFAULT);
  }, [sideNavCollapsed]);

  // Save widths to localStorage
  const saveWidths = useCallback((sw: number, tw: number) => {
    try {
      localStorage.setItem(STORAGE_KEY_PANELS, JSON.stringify({ sideWidth: sw, timelineWidth: tw }));
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
        const raw = e.clientX - rect.left;

        let newWidth: number;
        if (raw < DEAD_ZONE_LOW) {
          // Below dead zone: allow collapsed sizes (40-72)
          newWidth = Math.max(40, Math.min(raw, 72));
        } else if (raw >= DEAD_ZONE_LOW && raw < DEAD_ZONE_HIGH) {
          // Inside dead zone: snap to nearest edge
          newWidth = raw < (DEAD_ZONE_LOW + DEAD_ZONE_HIGH) / 2
            ? SIDE_COLLAPSED
            : SIDE_EXPANDED_DEFAULT;
        } else {
          // Above dead zone: expanded range
          newWidth = Math.max(SIDE_EXPANDED_MIN, Math.min(SIDE_EXPANDED_MAX, raw));
        }

        setSideWidth(newWidth);
        // Update collapsed state in parent
        if (onSideNavCollapse) {
          onSideNavCollapse(newWidth < DEAD_ZONE_LOW);
        }
      }

      if (dragging === "timeline") {
        const newWidth = rect.right - e.clientX;
        setTimelineWidth(Math.max(TIMELINE_MIN, Math.min(rect.width * 0.55, newWidth)));
      }
    };

    const handleMouseUp = () => {
      setDragging(null);

      // On release: snap sidebar to clean value
      setSideWidth(prev => {
        let snapped: number;
        if (prev < DEAD_ZONE_LOW) {
          snapped = SIDE_COLLAPSED;
        } else {
          snapped = Math.max(SIDE_EXPANDED_MIN, Math.min(SIDE_EXPANDED_MAX, prev));
        }

        if (onSideNavCollapse) {
          onSideNavCollapse(snapped <= SIDE_COLLAPSED);
        }

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
  }, [dragging, saveWidths, onSideNavCollapse]);

  const dividerStyle = (active: boolean): React.CSSProperties => ({
    width: 5,
    flexShrink: 0,
    cursor: "col-resize",
    background: active ? "var(--accent)" : "transparent",
    transition: "background 0.1s",
    position: "relative",
    zIndex: 10,
  });

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

      {/* Divider: side ↔ content */}
      <div
        onMouseDown={handleMouseDown("side")}
        style={dividerStyle(dragging === "side")}
        onMouseEnter={(e) => { if (!dragging) e.currentTarget.style.background = "var(--border)"; }}
        onMouseLeave={(e) => { if (!dragging) e.currentTarget.style.background = "transparent"; }}
      />

      {/* Content panel */}
      <div style={{
        flex: 1,
        minWidth: 0,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}>
        {content}
      </div>

      {/* Divider + Timeline (only if timeline exists) */}
      {timeline && (
        <>
          <div
            onMouseDown={handleMouseDown("timeline")}
            style={dividerStyle(dragging === "timeline")}
            onMouseEnter={(e) => { if (!dragging) e.currentTarget.style.background = "var(--border)"; }}
            onMouseLeave={(e) => { if (!dragging) e.currentTarget.style.background = "transparent"; }}
          />
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
