"use client";
import React, { useRef, useEffect } from "react";

interface TaskSheetProps {
  children: React.ReactNode;
  marLabelRef: React.RefObject<HTMLDivElement | null>;
  navHeight?: number;
  isDesktop: boolean;
}

const HANDLE_GAP = 35;

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * Math.min(1, Math.max(0, t));
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

export default function TaskSheet({ children, marLabelRef, navHeight = 72, isDesktop }: TaskSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const gradientRef = useRef<HTMLDivElement>(null);
  const snapsRef = useRef({ FULL: 0, HALF: 200, CLOSED: 500 });
  const currentTopRef = useRef(0);
  const currentSnapRef = useRef(0);
  const draggingRef = useRef(false);
  const startYRef = useRef(0);
  const startTopRef = useRef(0);

  // Desktop: just render children, no sheet
  if (isDesktop) {
    return <div>{children}</div>;
  }

  // Measure snap points from viewport — same as prototype measures from phone frame
  const measure = () => {
    // Get safe area inset for iOS PWA (notch)
    const safeDiv = document.createElement("div");
    safeDiv.style.cssText = "position:fixed;top:0;padding-top:env(safe-area-inset-top,0px);visibility:hidden;pointer-events:none;";
    document.body.appendChild(safeDiv);
    const safeTop = parseInt(getComputedStyle(safeDiv).paddingTop) || 0;
    document.body.removeChild(safeDiv);

    let HALF = 200;
    if (marLabelRef.current) {
      const mRect = marLabelRef.current.getBoundingClientRect();
      HALF = Math.round(mRect.bottom) + 4;
    }

    let CLOSED = window.innerHeight - navHeight - HANDLE_GAP;
    const navEl = document.querySelector(".nav-fixed");
    if (navEl) {
      const nRect = navEl.getBoundingClientRect();
      CLOSED = Math.round(nRect.top) - HANDLE_GAP;
    }

    const FULL = safeTop;
    HALF = Math.max(FULL, HALF);
    CLOSED = Math.max(HALF + 50, CLOSED);
    snapsRef.current = { FULL, HALF, CLOSED };
  };

  // Update sheet position + lerped styles — direct port from prototype updateSheet()
  const updateSheet = (top: number) => {
    const sheet = sheetRef.current;
    const content = contentRef.current;
    if (!sheet || !content) return;

    const { HALF, CLOSED } = snapsRef.current;
    let sideGap: number, rad: number, closedT: number;

    if (top <= HALF) {
      const { FULL } = snapsRef.current;
      const t = HALF > FULL ? (top - FULL) / (HALF - FULL) : 0;
      sideGap = lerp(0, 10, t);
      rad = lerp(0, 24, t);
    } else {
      const t2 = (top - HALF) / Math.max(CLOSED - HALF, 1);
      sideGap = lerp(10, 14, t2);
      rad = lerp(24, 28, t2);
    }

    closedT = clamp((top - HALF) / Math.max(CLOSED - HALF, 1), 0, 1);
    const bgA = lerp(0.85, 0, closedT);
    const borderA = lerp(0.1, 0, closedT);

    sheet.style.transform = `translateY(${top}px)`;
    sheet.style.left = `${sideGap}px`;
    sheet.style.right = `${sideGap}px`;
    sheet.style.borderRadius = `${rad}px ${rad}px 0 0`;
    sheet.style.background = `rgba(28,28,30,${bgA.toFixed(3)})`;
    sheet.style.borderColor = `rgba(255,255,255,${borderA.toFixed(3)})`;
    content.style.opacity = `${(1 - closedT).toFixed(3)}`;

    // Allow scroll in FULL and HALF views
    if (scrollRef.current) {
      scrollRef.current.style.overflowY = top <= HALF + 10 ? "auto" : "hidden";
    }
    // Fade gradient with content
    if (gradientRef.current) {
      gradientRef.current.style.opacity = `${(1 - closedT).toFixed(3)}`;
    }

    currentTopRef.current = top;
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

  const snapTo = (idx: number) => {
    const sheet = sheetRef.current;
    const content = contentRef.current;
    if (!sheet || !content) return;
    currentSnapRef.current = idx;
    sheet.style.transition = "transform 0.35s cubic-bezier(0.25, 1, 0.5, 1), left 0.35s cubic-bezier(0.25, 1, 0.5, 1), right 0.35s cubic-bezier(0.25, 1, 0.5, 1), border-radius 0.35s cubic-bezier(0.25, 1, 0.5, 1), background 0.35s cubic-bezier(0.25, 1, 0.5, 1), border-color 0.35s cubic-bezier(0.25, 1, 0.5, 1)";
    content.style.transition = "opacity 0.3s ease";
    const targets = [snapsRef.current.FULL, snapsRef.current.HALF, snapsRef.current.CLOSED];
    updateSheet(targets[idx]);
  };

  // Touch/mouse handlers — direct port from prototype
  const MARGIN_PX = 24;

  const onStart = (e: React.TouchEvent | React.MouseEvent) => {
    if ((e.target as HTMLElement).closest(".nav-fixed")) return;

    // Check if touch is in content area (between side margins) — if so, let scroll handle it
    const sheet = sheetRef.current;
    if (sheet) {
      const t = "touches" in e ? e.touches[0] : e;
      const rect = sheet.getBoundingClientRect();
      const touchX = t.clientX - rect.left;
      const touchY = t.clientY - rect.top;
      const isInSideMargin = touchX < MARGIN_PX || touchX > (rect.width - MARGIN_PX);
      const isInHandleZone = touchY < 44;
      // Only drag from handle zone or side margins — content area scrolls
      if (!isInHandleZone && !isInSideMargin) return;
    }

    draggingRef.current = true;
    if (sheet) { sheet.style.transition = "none"; }
    if (contentRef.current) { contentRef.current.style.transition = "none"; }

    const pt = "touches" in e ? e.touches[0] : e;
    startYRef.current = pt.clientY;
    startTopRef.current = currentTopRef.current;
  };

  const onMove = (e: React.TouchEvent | React.MouseEvent) => {
    if (!draggingRef.current) return;
    if ("preventDefault" in e && "touches" in e) {
      (e as React.TouchEvent).preventDefault?.();
    }
    const t = "touches" in e ? e.touches[0] : e;
    const { FULL, CLOSED } = snapsRef.current;
    const newTop = clamp(
      startTopRef.current + (t.clientY - startYRef.current),
      FULL - 20,
      CLOSED + 20
    );
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
      snapTo(0);
    }, 50);
    const onResize = () => { measure(); snapTo(currentSnapRef.current); };
    window.addEventListener("resize", onResize);
    return () => { clearTimeout(timer); window.removeEventListener("resize", onResize); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      <div
        ref={sheetRef}
        className="task-sheet-mobile"
        style={{
          position: "fixed",
          left: 0,
          right: 0,
          bottom: 0,
          top: 0,
          transform: "translateY(0px)",
          background: "rgba(28,28,30,0)",
          border: "1px solid rgba(255,255,255,0)",
          borderBottom: "none",
          borderRadius: 0,
          zIndex: 10,
          overflow: "hidden",
          willChange: "transform, border-radius",
        }}
        onTouchStart={onStart}
        onTouchMove={onMove}
        onTouchEnd={onEnd}
        onMouseDown={onStart}
        onMouseMove={onMove}
        onMouseUp={onEnd}
        onMouseLeave={onEnd}
      >
        {/* Inner scroll container */}
        <div
          ref={scrollRef}
          style={{
            height: "100%",
            overflowY: "auto",
            overflowX: "hidden",
            WebkitOverflowScrolling: "touch" as any,
          }}
        >
          {/* Handle bar */}
          <div style={{ cursor: "grab", touchAction: "none", padding: "6px 24px 10px" }}>
            <div className="task-sheet-handle">
              <div style={{
                width: 46,
                height: 5,
                borderRadius: 3,
                background: "rgba(255,255,255,0.2)",
              }} />
            </div>
          </div>
          {/* Task content */}
          <div ref={contentRef} style={{ padding: "0 24px", paddingBottom: "calc(100px + env(safe-area-inset-bottom, 0px))" }}>
            {children}
          </div>
        </div>
        {/* Bottom gradient — outside scroll, inside sheet shell */}
        <div ref={gradientRef} style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: 80,
          background: "linear-gradient(to bottom, transparent, #0a0a0a)",
          pointerEvents: "none",
        }} />
      </div>
    </>
  );
}
