"use client";
import React, { useRef, useEffect, useCallback, useState } from "react";

interface TaskSheetProps {
  children: React.ReactNode;
  marLabelRef: React.RefObject<HTMLDivElement | null>;
  navHeight?: number;
  isDesktop: boolean;
}

const HANDLE_GAP = 25; // px gap between handle bar and nav top

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * Math.min(1, Math.max(0, t));
}

export default function TaskSheet({ children, marLabelRef, navHeight = 72, isDesktop }: TaskSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Snap points stored in ref (recalculated on mount/resize)
  const snapsRef = useRef({ FULL: 0, HALF: 200, CLOSED: 500 });
  const currentTopRef = useRef(0);
  const currentSnapRef = useRef(0); // 0=FULL, 1=HALF, 2=CLOSED
  const draggingRef = useRef(false);
  const startYRef = useRef(0);
  const startTopRef = useRef(0);

  // Desktop: just render children, no sheet
  if (isDesktop) {
    return <div>{children}</div>;
  }

  const measure = () => {
    const container = containerRef.current;
    if (!container) return;
    const cRect = container.getBoundingClientRect();

    let HALF = 200;
    if (marLabelRef.current) {
      const mRect = marLabelRef.current.getBoundingClientRect();
      HALF = Math.round(mRect.bottom - cRect.top) + 4;
    }

    const navEl = document.querySelector(".nav-fixed");
    let CLOSED = cRect.height - navHeight - HANDLE_GAP;
    if (navEl) {
      const nRect = navEl.getBoundingClientRect();
      CLOSED = Math.round(nRect.top - cRect.top) - HANDLE_GAP;
    }

    snapsRef.current = { FULL: 0, HALF, CLOSED };
  };

  const updateSheet = (top: number) => {
    const sheet = sheetRef.current;
    const content = contentRef.current;
    if (!sheet || !content) return;

    const { HALF, CLOSED } = snapsRef.current;
    let sideGap: number, rad: number, bgA: number, borderA: number, contentOp: number;

    if (top <= HALF) {
      const t = HALF > 0 ? top / HALF : 0;
      sideGap = lerp(0, 10, t);
      rad = lerp(0, 18, t);
      bgA = 0.85;
      borderA = 0.1;
      contentOp = 1;
    } else {
      const t = CLOSED > HALF ? (top - HALF) / (CLOSED - HALF) : 0;
      sideGap = lerp(10, 14, t);
      rad = lerp(18, 22, t);
      bgA = lerp(0.85, 0, t);
      borderA = lerp(0.1, 0, t);
      contentOp = lerp(1, 0, t);
    }

    sheet.style.top = `${top}px`;
    sheet.style.left = `${sideGap}px`;
    sheet.style.right = `${sideGap}px`;
    sheet.style.borderRadius = `${rad}px ${rad}px 0 0`;
    sheet.style.background = `rgba(28,28,30,${bgA.toFixed(3)})`;
    sheet.style.borderColor = `rgba(255,255,255,${borderA.toFixed(3)})`;
    content.style.opacity = contentOp.toFixed(3);

    // Enable scroll only near FULL
    sheet.style.overflowY = top < HALF * 0.5 ? "auto" : "hidden";

    currentTopRef.current = top;
  };

  const snapTo = (idx: number) => {
    const sheet = sheetRef.current;
    const content = contentRef.current;
    if (!sheet || !content) return;

    currentSnapRef.current = idx;
    sheet.style.transition = "all 0.35s cubic-bezier(0.25, 1, 0.5, 1)";
    content.style.transition = "opacity 0.3s ease";

    const { FULL, HALF, CLOSED } = snapsRef.current;
    const targets = [FULL, HALF, CLOSED];
    updateSheet(targets[idx]);
  };

  const nearest = (y: number): number => {
    const { FULL, HALF, CLOSED } = snapsRef.current;
    const targets = [FULL, HALF, CLOSED];
    let best = 0;
    let bestDist = Math.abs(y - targets[0]);
    for (let i = 1; i < targets.length; i++) {
      const d = Math.abs(y - targets[i]);
      if (d < bestDist) { bestDist = d; best = i; }
    }
    return best;
  };

  const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

  const onStart = (e: React.TouchEvent | React.MouseEvent) => {
    // Don't drag if touching nav
    if ((e.target as HTMLElement).closest(".nav-fixed")) return;
    // Don't drag if scrolling inside content at FULL
    if (currentSnapRef.current === 0 && sheetRef.current) {
      const scrollTop = sheetRef.current.scrollTop;
      if (scrollTop > 0) return; // let normal scroll happen
    }

    draggingRef.current = true;
    const sheet = sheetRef.current;
    if (sheet) {
      sheet.style.transition = "none";
      if (contentRef.current) contentRef.current.style.transition = "none";
    }

    const t = "touches" in e ? e.touches[0] : e;
    const container = containerRef.current;
    if (!container) return;
    const cRect = container.getBoundingClientRect();
    startYRef.current = t.clientY - cRect.top;
    startTopRef.current = currentTopRef.current;
  };

  const onMove = (e: React.TouchEvent | React.MouseEvent) => {
    if (!draggingRef.current) return;
    // Prevent default to avoid page scroll while dragging
    if ("preventDefault" in e) e.preventDefault();

    const t = "touches" in e ? e.touches[0] : e;
    const container = containerRef.current;
    if (!container) return;
    const cRect = container.getBoundingClientRect();
    const y = t.clientY - cRect.top;
    const { FULL, CLOSED } = snapsRef.current;
    const newTop = clamp(startTopRef.current + (y - startYRef.current), FULL - 20, CLOSED + 20);
    updateSheet(newTop);
  };

  const onEnd = () => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    const cur = currentTopRef.current;
    const vel = cur - startTopRef.current;
    const target = Math.abs(vel) > 40 ? cur + vel * 0.3 : cur;
    snapTo(nearest(target));
  };

  // Measure on mount + resize
  useEffect(() => {
    const timer = setTimeout(() => {
      measure();
      snapTo(0); // default FULL
    }, 50);

    const onResize = () => { measure(); snapTo(currentSnapRef.current); };
    window.addEventListener("resize", onResize);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", onResize);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div
      ref={containerRef}
      style={{ position: "relative", flex: 1, minHeight: 0 }}
    >
      <div
        ref={sheetRef}
        className="task-sheet-mobile"
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          top: 0,
          background: "rgba(28,28,30,0.85)",
          border: "1px solid rgba(255,255,255,0.1)",
          borderBottom: "none",
          borderRadius: 0,
          zIndex: 10,
          overflowY: "auto",
          overflowX: "hidden",
          WebkitOverflowScrolling: "touch" as any,
          willChange: "top, left, right, border-radius",
        }}
        onTouchStart={onStart}
        onTouchMove={onMove}
        onTouchEnd={onEnd}
        onMouseDown={onStart}
        onMouseMove={onMove}
        onMouseUp={onEnd}
        onMouseLeave={onEnd}
      >
        {/* Handle bar */}
        <div className="task-sheet-handle">
          <div style={{
            width: 36,
            height: 4,
            borderRadius: 2,
            background: "rgba(255,255,255,0.2)",
          }} />
        </div>
        {/* Task content */}
        <div ref={contentRef}>
          {children}
        </div>
      </div>
    </div>
  );
}
