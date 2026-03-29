"use client";

export default function LandingPage() {
  return (
    <div style={{
      background: "#0a0a0a",
      minHeight: "100dvh",
      fontFamily: "'Sora', 'Plus Jakarta Sans', -apple-system, sans-serif",
      color: "#fff",
      overflowX: "hidden",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700;800&family=Plus+Jakarta+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        html { scroll-behavior: smooth; }
        body { background: #0a0a0a; }
        .lp-cta:hover { opacity: 0.9; transform: scale(1.02); }
        .lp-cta { transition: all 0.15s ease; }
        .nav-link:hover { color: #888 !important; }
        .feat-card:hover { border-color: #2a2a2a !important; }
        .feat-card { transition: border-color 0.2s ease; }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .anim-1 { animation: fadeUp 0.6s ease 0.1s both; }
        .anim-2 { animation: fadeUp 0.6s ease 0.2s both; }
        .anim-3 { animation: fadeUp 0.6s ease 0.3s both; }
        .anim-4 { animation: fadeUp 0.6s ease 0.4s both; }
      `}</style>

      {/* ═══ NAVBAR ═══ */}
      <nav style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "16px 32px",
        borderBottom: "1px solid #161616",
        position: "sticky",
        top: 0,
        background: "rgba(10,10,10,0.95)",
        backdropFilter: "blur(12px)",
        zIndex: 100,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <img src="/Trademark-white.png" alt="Pitgoal" style={{ height: 22 }} />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
          <a href="#energy" className="nav-link" style={{ fontSize: 11, fontWeight: 500, color: "#444", letterSpacing: 2, textDecoration: "none", fontFamily: "'IBM Plex Mono', monospace" }}>ENERGY</a>
          <a href="#rocky" className="nav-link" style={{ fontSize: 11, fontWeight: 500, color: "#444", letterSpacing: 2, textDecoration: "none", fontFamily: "'IBM Plex Mono', monospace" }}>ROCKY</a>
          <a href="#pitcoin" className="nav-link" style={{ fontSize: 11, fontWeight: 500, color: "#444", letterSpacing: 2, textDecoration: "none", fontFamily: "'IBM Plex Mono', monospace" }}>PIT COIN</a>
          <a href="/app" className="lp-cta" style={{ fontSize: 11, fontWeight: 700, color: "#0a0a0a", background: "#FFD000", padding: "8px 20px", borderRadius: 50, textDecoration: "none", letterSpacing: 0.5 }}>Try Pitgoal Free</a>
        </div>
      </nav>

      {/* ═══ HERO ═══ */}
      <section style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "60px 40px 50px",
        gap: 40,
        maxWidth: 1100,
        margin: "0 auto",
      }}>
        {/* Left — Copy */}
        <div className="anim-1" style={{ flex: 1, maxWidth: 440 }}>
          <div style={{
            display: "inline-block",
            fontSize: 9,
            fontWeight: 600,
            letterSpacing: 2,
            color: "#FFD000",
            background: "rgba(255,208,0,0.06)",
            border: "1px solid rgba(255,208,0,0.12)",
            padding: "5px 14px",
            borderRadius: 50,
            marginBottom: 20,
            fontFamily: "'IBM Plex Mono', monospace",
          }}>
            PRODUCTIVITY WITHOUT THE NOISE
          </div>
          <h1 style={{
            fontSize: 42,
            fontWeight: 800,
            lineHeight: 1.12,
            letterSpacing: -0.5,
            marginBottom: 16,
            fontFamily: "'Sora', sans-serif",
          }}>
            A predictable app that keeps you{" "}
            <span style={{ color: "#FFD000" }}>forward</span>
          </h1>
          <p style={{
            fontSize: 15,
            color: "#555",
            lineHeight: 1.7,
            marginBottom: 24,
            fontFamily: "'Plus Jakarta Sans', sans-serif",
          }}>
            Track real effort. Filter internet noise.<br />
            Earn by helping others.
          </p>
          <a href="/app" className="lp-cta" style={{
            display: "inline-block",
            fontSize: 14,
            fontWeight: 700,
            color: "#0a0a0a",
            background: "#FFD000",
            padding: "12px 32px",
            borderRadius: 50,
            textDecoration: "none",
            marginBottom: 10,
          }}>
            Try Pitgoal Free
          </a>
          <br />
          <span style={{
            fontSize: 9,
            color: "#333",
            letterSpacing: 2,
            fontWeight: 500,
            fontFamily: "'IBM Plex Mono', monospace",
          }}>
            FREE FOREVER. NO ADS. NO BS.
          </span>
        </div>

        {/* Right — Browser mockup */}
        <div className="anim-2" style={{ flex: 1, maxWidth: 440 }}>
          <div style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: 10, overflow: "hidden" }}>
            {/* Browser bar */}
            <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 12px", background: "#161616", borderBottom: "1px solid #1e1e1e" }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#ff5f57" }} />
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#ffbd2e" }} />
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#28ca42" }} />
              <div style={{ flex: 1, textAlign: "center", fontSize: 9, color: "#333", letterSpacing: 0.5, fontFamily: "'IBM Plex Mono', monospace" }}>pitgoal.com/app</div>
            </div>
            {/* App preview */}
            <div style={{ padding: 16 }}>
              {/* Stats */}
              <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
                {[
                  { num: "3", label: "DONE", color: "#fff" },
                  { num: "2.4h", label: "TRACKED", color: "#FFD000" },
                  { num: "72%", label: "ENERGY", color: "#34D399" },
                ].map((s, i) => (
                  <div key={i} style={{ flex: 1, background: "#1a1a1a", borderRadius: 8, padding: "10px 8px", border: "1px solid #222" }}>
                    <div style={{ fontSize: 20, fontWeight: 800, color: s.color, fontFamily: "'Sora', sans-serif" }}>{s.num}</div>
                    <div style={{ fontSize: 8, color: "#444", letterSpacing: 1.5, fontFamily: "'IBM Plex Mono', monospace", marginTop: 2 }}>{s.label}</div>
                  </div>
                ))}
              </div>
              {/* Date strip */}
              <div style={{ display: "flex", gap: 4, marginBottom: 12 }}>
                {[
                  { d: "27", t: "Fri" }, { d: "28", t: "Sat" },
                  { d: "29", t: "Sun", active: true },
                  { d: "30", t: "Mon" }, { d: "31", t: "Tue" },
                ].map((day, i) => (
                  <div key={i} style={{
                    flex: 1, textAlign: "center", padding: "6px 0", borderRadius: 6,
                    background: day.active ? "#FFD000" : "#1a1a1a",
                  }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: day.active ? "#0a0a0a" : "#555", fontFamily: "'Sora', sans-serif" }}>{day.d}</div>
                    <div style={{ fontSize: 7, color: day.active ? "#0a0a0a" : "#333" }}>{day.t}</div>
                  </div>
                ))}
              </div>
              {/* Tasks */}
              {[
                { text: "Study Security+ Ch.4", tag: "TASK", done: true },
                { text: "Review landing page", tag: "TASK", done: false },
                { text: "15 min meditation", tag: "REST", rest: true, done: false },
              ].map((t, i) => (
                <div key={i} style={{
                  display: "flex", alignItems: "center", gap: 8,
                  padding: "8px 10px", background: "#1a1a1a", borderRadius: 8,
                  marginBottom: 4, border: "1px solid #222",
                }}>
                  <div style={{
                    width: 14, height: 14, borderRadius: 4,
                    border: "1.5px solid #FFD000", flexShrink: 0,
                    background: t.done ? "rgba(255,208,0,0.15)" : "transparent",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    {t.done && (
                      <svg width="8" height="8" viewBox="0 0 12 12">
                        <path d="M2 6l3 3 5-5" stroke="#FFD000" strokeWidth="2" fill="none" strokeLinecap="round" />
                      </svg>
                    )}
                  </div>
                  <span style={{ fontSize: 9, color: "#888", flex: 1, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{t.text}</span>
                  <span style={{
                    fontSize: 7, fontWeight: 700, letterSpacing: 0.5,
                    color: t.rest ? "#6b8a7a" : "#FFD000",
                    background: t.rest ? "rgba(107,138,122,0.1)" : "rgba(255,208,0,0.1)",
                    padding: "2px 6px", borderRadius: 3,
                    fontFamily: "'IBM Plex Mono', monospace",
                  }}>{t.tag}</span>
                </div>
              ))}
              {/* Energy bar */}
              <div style={{ marginTop: 10, padding: "8px 10px", background: "#1a1a1a", borderRadius: 8, border: "1px solid #222" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 8, color: "#444", letterSpacing: 1, fontFamily: "'IBM Plex Mono', monospace" }}>ENERGY</span>
                  <span style={{ fontSize: 10, fontWeight: 700, color: "#34D399", fontFamily: "'Sora', sans-serif" }}>72%</span>
                </div>
                <div style={{ height: 4, background: "#222", borderRadius: 2, overflow: "hidden", marginTop: 4 }}>
                  <div style={{ height: "100%", width: "72%", background: "#FFD000", borderRadius: 2 }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ FEATURES ═══ */}
      <section id="energy" style={{
        display: "flex",
        gap: 12,
        padding: "0 32px 40px",
        maxWidth: 1100,
        margin: "0 auto",
      }}>
        {/* Energy */}
        <div className="feat-card anim-2" style={{ flex: 1, background: "#111", border: "1px solid #1e1e1e", borderRadius: 12, overflow: "hidden" }}>
          <div style={{ padding: 16, minHeight: 100, display: "flex", alignItems: "center", justifyContent: "center", borderBottom: "1px solid #1e1e1e" }}>
            <div style={{ width: "100%", maxWidth: 180 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <span style={{ fontSize: 22, fontWeight: 800, color: "#FFD000", fontFamily: "'Sora', sans-serif" }}>34%</span>
                <span style={{ fontSize: 8, color: "#444", letterSpacing: 1, fontFamily: "'IBM Plex Mono', monospace" }}>ENERGY</span>
              </div>
              <div style={{ height: 6, background: "#222", borderRadius: 3, overflow: "hidden" }}>
                <div style={{ height: "100%", width: "34%", background: "#E24B4A", borderRadius: 3 }} />
              </div>
              <div style={{ marginTop: 6, fontSize: 8, fontWeight: 700, color: "#E24B4A", background: "rgba(226,75,74,0.1)", padding: "3px 8px", borderRadius: 4, display: "inline-block", letterSpacing: 0.5, fontFamily: "'IBM Plex Mono', monospace" }}>REST NOW</div>
            </div>
          </div>
          <div style={{ padding: 16 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#fff", marginBottom: 6, fontFamily: "'Sora', sans-serif" }}>Energy</div>
            <div style={{ fontSize: 12, color: "#444", lineHeight: 1.6, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Mirrors real tiredness. No fake resets. Rest to recover — just like your body.</div>
          </div>
        </div>

        {/* Rocky */}
        <div id="rocky" className="feat-card anim-3" style={{ flex: 1, background: "#111", border: "1px solid #1e1e1e", borderRadius: 12, overflow: "hidden" }}>
          <div style={{ padding: 16, minHeight: 100, display: "flex", alignItems: "center", justifyContent: "center", borderBottom: "1px solid #1e1e1e" }}>
            <div style={{ width: "100%", maxWidth: 200, background: "#161616", borderRadius: 8, border: "1px solid #222", overflow: "hidden" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 5, padding: "8px 10px", borderBottom: "1px solid #1e1e1e", fontSize: 8, color: "#444", fontFamily: "'IBM Plex Mono', monospace" }}>
                <div style={{ width: 14, height: 14, borderRadius: 3, background: "#1a1a1a", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 7, color: "#888" }}>T</div>
                shared from TikTok
              </div>
              <div style={{ padding: "8px 10px", fontSize: 10, color: "#888", lineHeight: 1.5, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                &quot;This 5-minute hack will double your income instantly...&quot;
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 4, padding: "6px 10px", background: "rgba(226,75,74,0.06)", fontSize: 8, fontWeight: 700, color: "#E24B4A", letterSpacing: 0.5, fontFamily: "'IBM Plex Mono', monospace" }}>
                FLAGGED — no source found
              </div>
            </div>
          </div>
          <div style={{ padding: 16 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#fff", marginBottom: 6, fontFamily: "'Sora', sans-serif" }}>Rocky</div>
            <div style={{ fontSize: 12, color: "#444", lineHeight: 1.6, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>AI filter from Planet Erid. Checks sources. Flags BS before it reaches your feed.</div>
          </div>
        </div>

        {/* Pit Coin */}
        <div id="pitcoin" className="feat-card anim-4" style={{ flex: 1, background: "#111", border: "1px solid #1e1e1e", borderRadius: 12, overflow: "hidden" }}>
          <div style={{ padding: 16, minHeight: 100, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6, borderBottom: "1px solid #1e1e1e" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, background: "#161616", border: "1px solid #222", borderRadius: 8, padding: "8px 16px" }}>
              <div style={{ width: 20, height: 20, borderRadius: "50%", background: "rgba(255,208,0,0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: "#FFD000", fontWeight: 700, fontFamily: "'Sora', sans-serif" }}>P</div>
              <span style={{ fontSize: 14, fontWeight: 700, color: "#FFD000", fontFamily: "'Sora', sans-serif" }}>+5 coins</span>
              <div style={{ width: 16, height: 16, borderRadius: "50%", background: "rgba(52,211,153,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="10" height="10" viewBox="0 0 12 12"><path d="M2 6l3 3 5-5" stroke="#34D399" strokeWidth="2" fill="none" strokeLinecap="round" /></svg>
              </div>
            </div>
            <div style={{ fontSize: 8, color: "#444", letterSpacing: 1, fontFamily: "'IBM Plex Mono', monospace" }}>VERIFICATION COMPLETE</div>
          </div>
          <div style={{ padding: 16 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#fff", marginBottom: 6, fontFamily: "'Sora', sans-serif" }}>Pit Coin</div>
            <div style={{ fontSize: 12, color: "#444", lineHeight: 1.6, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Earned from helping others. Complete tasks, verify claims. Not farmable.</div>
          </div>
        </div>
      </section>

      {/* ═══ BOTTOM ═══ */}
      <section style={{ textAlign: "center", padding: "40px 32px 24px" }}>
        <div style={{ fontSize: 20, fontWeight: 700, color: "#FFD000", marginBottom: 6, fontFamily: "'Sora', sans-serif" }}>Made in Malaysia.</div>
        <div style={{ fontSize: 10, color: "#333", letterSpacing: 3, fontFamily: "'IBM Plex Mono', monospace" }}>PITGOAL.COM</div>
      </section>

      {/* ═══ FOOTER ═══ */}
      <footer style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "14px 32px",
        borderTop: "1px solid #161616",
      }}>
        <span style={{ fontSize: 10, color: "#222", letterSpacing: 0.5, fontFamily: "'IBM Plex Mono', monospace" }}>© 2026 Pitgoal</span>
        <div style={{ display: "flex", gap: 16 }}>
          <span style={{ fontSize: 10, color: "#333", letterSpacing: 0.5, fontFamily: "'IBM Plex Mono', monospace" }}>Privacy</span>
          <span style={{ fontSize: 10, color: "#333", letterSpacing: 0.5, fontFamily: "'IBM Plex Mono', monospace" }}>Terms</span>
        </div>
      </footer>
    </div>
  );
}
