"use client";
import React, { useState, useRef, useMemo, useCallback, useEffect } from "react";
import { dateKey } from "../lib/utils";
import type { Task, Template, DayHistory } from "../lib/types";

interface MonthCalendarProps {
  tasks: Task[];
  templates: Template[];
  history: Record<string, DayHistory>;
  selectedDate: Date;
  onSelectDate: (d: Date) => void;
  calView: string;
  onCalViewChange: (v: string) => void;
  getDisplayTimeMin: (task: any) => number;
}

const MONTHS_FULL = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DAY_LETTERS = ["M", "T", "W", "T", "F", "S", "S"];
const CAL_VIEWS = ["W", "M", "Q", "Y"];

const isSameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

/** Monday-start weeks for a given month */
function getMonthWeeks(year: number, month: number): Date[][] {
  const first = new Date(year, month, 1);
  const dow = first.getDay();
  const off = dow === 0 ? -6 : 1 - dow;
  const start = new Date(year, month, 1 + off);
  const weeks: Date[][] = [];
  for (let w = 0; w < 6; w++) {
    const wk: Date[] = [];
    for (let d = 0; d < 7; d++) {
      const dt = new Date(start);
      dt.setDate(start.getDate() + w * 7 + d);
      wk.push(dt);
    }
    // Skip 6th week if it's entirely next month
    if (w === 5 && wk[0].getMonth() !== month && wk[0].getDate() > 7) break;
    weeks.push(wk);
  }
  return weeks;
}

/** Count task + rest dots for a date (NOT a hook — plain function) */
function getDayDots(
  day: Date,
  today: Date,
  tasks: Task[],
  templates: Template[],
  history: Record<string, DayHistory>,
): { taskCount: number; restCount: number } {
  const isToday = isSameDay(day, today);
  const isFuture = day.getTime() > today.getTime();
  const isPast = !isToday && !isFuture;

  if (isToday) {
    let tc = 0, rc = 0;
    tasks.forEach((t) => {
      if (t.status === "skipped") return;
      if ((t as any).customType === "rest" || t.type === "rest") rc++;
      else tc++;
    });
    return { taskCount: tc, restCount: rc };
  }

  if (isPast) {
    const key = dateKey(day);
    const h = history[key];
    if (!h) return { taskCount: 0, restCount: 0 };
    return { taskCount: Math.min(h.done || 0, 3), restCount: 0 };
  }

  // Future: count from templates
  const dow = day.getDay();
  let tc = 0, rc = 0;
  templates.forEach((t) => {
    if (t.days.length > 0 && !t.days.includes(dow)) return;
    if (t.type === "rest") rc++;
    else tc++;
  });
  return { taskCount: Math.min(tc, 3), restCount: Math.min(rc, 1) };
}

// ── Sunrise glass pill (reusable) ──
function SunrisePill({ children, style, onClick }: {
  children: React.ReactNode;
  style?: React.CSSProperties;
  onClick?: () => void;
}) {
  return (
    <div onClick={onClick} style={{
      position: "relative", display: "inline-flex", alignItems: "center",
      borderRadius: 10, overflow: "hidden",
      border: "1px solid rgba(255,255,255,0.1)",
      cursor: "pointer", ...style,
    }}>
      <div style={{
        position: "absolute", inset: 0,
        background: "linear-gradient(135deg, rgba(255,120,40,0.35) 0%, rgba(255,170,50,0.25) 40%, rgba(255,210,70,0.15) 70%, rgba(255,235,130,0.08) 100%)",
      }} />
      <div style={{
        position: "absolute", inset: 0,
        background: "rgba(255,255,255,0.04)",
        backdropFilter: "blur(10px) saturate(140%)",
        WebkitBackdropFilter: "blur(10px) saturate(140%)" as any,
      }} />
      {children}
    </div>
  );
}

// ── Task dots row ──
function DayDots({ taskCount, restCount }: { taskCount: number; restCount: number }) {
  if (taskCount === 0 && restCount === 0) return null;
  return (
    <div style={{ display: "flex", gap: 3, justifyContent: "center", marginTop: 5 }}>
      {Array.from({ length: Math.min(taskCount, 3) }, (_, i) => (
        <div key={`t${i}`} style={{ width: 4, height: 4, borderRadius: "50%", background: "var(--accent, #FFD000)" }} />
      ))}
      {restCount > 0 && (
        <div style={{ width: 4, height: 4, borderRadius: "50%", background: "var(--rest, #6b8a7a)" }} />
      )}
    </div>
  );
}

// ═══ MAIN COMPONENT ═══
export default function MonthCalendar({
  tasks, templates, history, selectedDate, onSelectDate,
  calView, onCalViewChange, getDisplayTimeMin,
}: MonthCalendarProps) {
  const today = useMemo(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; }, []);

  // Displayed month (what the header shows)
  const [displayMonth, setDisplayMonth] = useState(today.getMonth());
  const [displayYear, setDisplayYear] = useState(today.getFullYear());

  // Dropdown state
  const [ddOpen, setDdOpen] = useState(false);
  const [ddYear, setDdYear] = useState(today.getFullYear());

  // Scroll ref
  const scrollRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const scrollTimer = useRef<any>(null);

  // View switcher
  const [viewLetterAnim, setViewLetterAnim] = useState(false);
  const viewDragStartY = useRef(0);
  const viewDragActive = useRef(false);
  const viewDragMoved = useRef(false);

  const cycleCalView = useCallback((dir: 1 | -1) => {
    const idx = CAL_VIEWS.indexOf(calView);
    const next = ((idx + dir) % 4 + 4) % 4;
    onCalViewChange(CAL_VIEWS[next]);
    setViewLetterAnim(true);
    setTimeout(() => setViewLetterAnim(false), 200);
  }, [calView, onCalViewChange]);

  // Generate months to render (current ±1 previous, +4 forward)
  const monthPages = useMemo(() => {
    const pages: { year: number; month: number }[] = [];
    for (let i = -1; i <= 4; i++) {
      const m = (displayMonth + i + 120) % 12;
      const y = displayYear + Math.floor((displayMonth + i) / 12);
      pages.push({ year: y, month: m });
    }
    return pages;
  }, [displayMonth, displayYear]);

  // On mount / displayMonth change: scroll to current month page
  useEffect(() => {
    const sc = scrollRef.current;
    if (!sc) return;
    requestAnimationFrame(() => {
      const pages = sc.querySelectorAll<HTMLElement>("[data-month-page]");
      for (const p of Array.from(pages)) {
        if (+p.dataset.m! === displayMonth && +p.dataset.y! === displayYear) {
          sc.scrollTop = p.offsetTop;
          break;
        }
      }
    });
  }, [displayMonth, displayYear]);

  // Scroll listener: update header when user scrolls between months
  const handleScroll = useCallback(() => {
    clearTimeout(scrollTimer.current);
    scrollTimer.current = setTimeout(() => {
      const sc = scrollRef.current;
      if (!sc) return;
      const pages = sc.querySelectorAll<HTMLElement>("[data-month-page]");
      const mid = sc.scrollTop + sc.clientHeight / 3;
      let closest: HTMLElement | null = null;
      let minDist = Infinity;
      pages.forEach((p) => {
        const d = Math.abs(p.offsetTop - mid);
        if (d < minDist) { minDist = d; closest = p; }
      });
      if (closest) {
        const nm = +(closest as HTMLElement).dataset.m!;
        const ny = +(closest as HTMLElement).dataset.y!;
        if (nm !== displayMonth || ny !== displayYear) {
          setDisplayMonth(nm);
          setDisplayYear(ny);
        }
      }
    }, 80);
  }, [displayMonth, displayYear]);

  // Dropdown position
  const [boxTop, setBoxTop] = useState(0);
  const openDropdown = () => {
    setDdYear(displayYear);
    if (headerRef.current) {
      const phone = headerRef.current.closest<HTMLElement>("[data-main-content]");
      if (phone) {
        const hr = headerRef.current.getBoundingClientRect();
        const pr = phone.getBoundingClientRect();
        setBoxTop(hr.bottom - pr.top + 4);
      } else {
        setBoxTop(headerRef.current.offsetTop + headerRef.current.offsetHeight + 4);
      }
    }
    setDdOpen(true);
  };
  const closeDropdown = () => setDdOpen(false);
  const pickMonth = (m: number) => {
    setDisplayMonth(m);
    setDisplayYear(ddYear);
    closeDropdown();
  };

  // Tap a date → select it and switch to W view
  const handleDateTap = (d: Date) => {
    onSelectDate(d);
    onCalViewChange("W");
  };

  return (
    <div data-main-content style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0, overflow: "hidden", position: "relative" }}>

      {/* ── Header: view pill + month pill ── */}
      <div ref={headerRef} style={{
        padding: "0 16px 8px", display: "flex", alignItems: "center",
        justifyContent: "space-between", flexShrink: 0, zIndex: 20, position: "relative",
      }}>
        {/* View switcher pill */}
        <SunrisePill
          style={{ padding: "5px 10px" }}
          onClick={() => cycleCalView(1)}
        >
          <div
            style={{
              position: "absolute", inset: 0, zIndex: 5,
              touchAction: "none", cursor: "grab",
            }}
            onTouchStart={(e) => {
              viewDragStartY.current = e.touches[0].clientY;
              viewDragActive.current = true;
              viewDragMoved.current = false;
            }}
            onTouchMove={(e) => {
              if (!viewDragActive.current) return;
              const dy = e.touches[0].clientY - viewDragStartY.current;
              if (Math.abs(dy) > 30) {
                viewDragMoved.current = true;
                cycleCalView(dy < 0 ? 1 : -1);
                viewDragActive.current = false;
              }
            }}
            onTouchEnd={() => { viewDragActive.current = false; }}
          />
          <span style={{
            position: "relative", zIndex: 2, fontSize: 12, fontWeight: 700,
            color: "var(--accent, #FFD000)", letterSpacing: 0.5,
            transition: "transform 0.2s, opacity 0.2s",
            transform: viewLetterAnim ? "translateY(-8px)" : "translateY(0)",
            opacity: viewLetterAnim ? 0 : 1,
          }}>{calView}</span>
        </SunrisePill>

        {/* Month header pill */}
        <SunrisePill style={{ padding: "6px 16px", gap: 8 }} onClick={openDropdown}>
          <span style={{ position: "relative", zIndex: 2, fontSize: 15, fontWeight: 700, color: "var(--accent, #FFD000)", letterSpacing: 0.3 }}>
            {MONTHS_FULL[displayMonth]}
          </span>
          <span style={{ position: "relative", zIndex: 2, fontSize: 12, fontWeight: 500, color: "rgba(255,208,0,0.4)" }}>
            {displayYear}
          </span>
          <span style={{
            position: "relative", zIndex: 2, fontSize: 11,
            color: "rgba(255,208,0,0.5)", marginLeft: 3,
            display: "inline-block", transition: "transform 0.25s",
            transform: ddOpen ? "rotate(180deg)" : "none",
          }}>▾</span>
        </SunrisePill>

        <div style={{ width: 28 }} />
      </div>

      {/* ── Day headers: M T W T F S S ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", padding: "6px 16px", flexShrink: 0 }}>
        {DAY_LETTERS.map((d, i) => (
          <span key={i} style={{ textAlign: "center", fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.18)", letterSpacing: 0.5 }}>{d}</span>
        ))}
      </div>

      {/* ── Snap scroll area ── */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        style={{
          flex: 1, overflowY: "auto",
          scrollSnapType: "y mandatory",
          WebkitOverflowScrolling: "touch" as any,
          minHeight: 0,
        }}
        className="no-scrollbar"
      >
        {monthPages.map(({ year, month }, pi) => {
          const weeks = getMonthWeeks(year, month);
          const isFirst = pi === 0;
          return (
            <React.Fragment key={`${year}-${month}`}>
              {/* Month separator for non-first pages */}
              {!isFirst && (
                <div style={{ padding: "10px 16px 6px", display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.06)" }} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.2)", letterSpacing: 0.3 }}>
                    {MONTHS_FULL[month]} {year}
                  </span>
                  <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.06)" }} />
                </div>
              )}
              <div
                data-month-page
                data-m={month}
                data-y={year}
                style={{
                  scrollSnapAlign: "start", scrollSnapStop: "always",
                  padding: "0 16px", display: "flex", flexDirection: "column",
                  minHeight: "100%",
                }}
              >
                {weeks.map((week, wi) => (
                  <div key={wi} style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", flex: 1 }}>
                    {week.map((day, di) => {
                      const inMonth = day.getMonth() === month;
                      const isToday = isSameDay(day, today);
                      const dots = inMonth
                        ? getDayDots(day, today, tasks, templates, history)
                        : { taskCount: 0, restCount: 0 };

                      return (
                        <div
                          key={di}
                          className="tap"
                          onClick={() => handleDateTap(day)}
                          style={{
                            display: "flex", flexDirection: "column",
                            alignItems: "center", paddingTop: 6,
                            borderRadius: 8, cursor: "pointer",
                          }}
                        >
                          {isToday ? (
                            /* Today: sunrise glass rounded rect */
                            <div style={{
                              position: "relative", display: "inline-flex",
                              alignItems: "center", justifyContent: "center",
                              width: 30, height: 30, borderRadius: 10, overflow: "hidden",
                            }}>
                              <div style={{
                                position: "absolute", inset: 0,
                                background: "linear-gradient(135deg, rgba(255,120,40,0.5) 0%, rgba(255,170,50,0.4) 35%, rgba(255,210,70,0.3) 65%, rgba(255,235,130,0.15) 100%)",
                              }} />
                              <div style={{
                                position: "absolute", inset: 0,
                                background: "rgba(255,255,255,0.05)",
                                backdropFilter: "blur(8px)",
                                WebkitBackdropFilter: "blur(8px)" as any,
                              }} />
                              <span style={{
                                position: "relative", zIndex: 1,
                                fontSize: 14, fontWeight: 700, color: "var(--accent, #FFD000)",
                              }}>{day.getDate()}</span>
                            </div>
                          ) : (
                            <span style={{
                              fontSize: 14, fontWeight: inMonth ? 500 : 400,
                              color: inMonth ? "rgba(255,255,255,0.45)" : "rgba(255,255,255,0.1)",
                            }}>{day.getDate()}</span>
                          )}
                          {inMonth && <DayDots taskCount={dots.taskCount} restCount={dots.restCount} />}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </React.Fragment>
          );
        })}
      </div>

      {/* ── Glass dropdown overlay ── */}
      {ddOpen && (
        <div style={{ position: "absolute", inset: 0, zIndex: 25 }}>
          {/* Backdrop */}
          <div onClick={closeDropdown} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.45)" }} />

          {/* Glass box — positioned below header */}
          <div style={{
            position: "absolute", left: 16, right: 16, top: boxTop,
            borderRadius: 18, overflow: "hidden",
            border: "1px solid rgba(255,255,255,0.1)",
          }}>
            {/* Glass blur background */}
            <div style={{
              position: "absolute", inset: 0,
              background: "rgba(16,16,22,0.72)",
              backdropFilter: "blur(40px) saturate(160%)",
              WebkitBackdropFilter: "blur(40px) saturate(160%)" as any,
            }} />

            <div style={{ position: "relative", zIndex: 1 }}>
              {/* Year swiper */}
              <div style={{
                display: "flex", alignItems: "center", justifyContent: "center",
                gap: 16, padding: "14px 16px 10px",
                borderBottom: "1px solid rgba(255,255,255,0.06)",
              }}>
                <div
                  className="tap"
                  onClick={() => ddYear > today.getFullYear() - 2 && setDdYear(ddYear - 1)}
                  style={{
                    width: 28, height: 28, borderRadius: 8,
                    border: "1px solid rgba(255,255,255,0.08)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: "rgba(255,255,255,0.25)", fontSize: 14, cursor: "pointer",
                    opacity: ddYear <= today.getFullYear() - 2 ? 0.15 : 1,
                  }}
                >‹</div>

                {/* Year pill (sunrise glass) */}
                <SunrisePill style={{ padding: "4px 14px", borderRadius: 8 }}>
                  <span style={{ position: "relative", zIndex: 2, fontSize: 15, fontWeight: 700, color: "var(--accent, #FFD000)", letterSpacing: 0.5 }}>{ddYear}</span>
                </SunrisePill>

                <div
                  className="tap"
                  onClick={() => ddYear < today.getFullYear() + 5 && setDdYear(ddYear + 1)}
                  style={{
                    width: 28, height: 28, borderRadius: 8,
                    border: "1px solid rgba(255,255,255,0.08)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: "rgba(255,255,255,0.25)", fontSize: 14, cursor: "pointer",
                    opacity: ddYear >= today.getFullYear() + 5 ? 0.15 : 1,
                  }}
                >›</div>
              </div>

              {/* Month grid — 3 columns */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 4, padding: "10px 12px 14px" }}>
                {MONTHS_SHORT.map((label, m) => {
                  const isActive = m === displayMonth && ddYear === displayYear;
                  const isCurrent = m === today.getMonth() && ddYear === today.getFullYear();
                  return (
                    <div
                      key={m}
                      className="tap"
                      onClick={() => pickMonth(m)}
                      style={{
                        padding: "12px 4px", textAlign: "center",
                        borderRadius: 12, cursor: "pointer",
                        position: "relative", overflow: "hidden",
                      }}
                    >
                      {isActive && (
                        <>
                          <div style={{
                            position: "absolute", inset: 0,
                            background: "linear-gradient(135deg, rgba(255,120,40,0.3) 0%, rgba(255,170,50,0.2) 40%, rgba(255,210,70,0.1) 100%)",
                            borderRadius: 12,
                          }} />
                          <div style={{
                            position: "absolute", inset: 0,
                            background: "rgba(255,255,255,0.03)",
                            backdropFilter: "blur(6px)",
                            WebkitBackdropFilter: "blur(6px)" as any,
                            borderRadius: 12,
                          }} />
                        </>
                      )}
                      <span style={{
                        fontSize: 14, position: "relative", zIndex: 1,
                        fontWeight: isActive ? 700 : 600,
                        color: isActive
                          ? "var(--accent, #FFD000)"
                          : isCurrent
                            ? "rgba(255,255,255,0.55)"
                            : "rgba(255,255,255,0.3)",
                      }}>{label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
