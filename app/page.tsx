"use client";
import { useEffect, useRef } from "react";

export default function LandingPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;

    let W: number, H: number, rw: number, rh: number, midX: number, midY: number;
    const dpr = window.devicePixelRatio || 1;

    function resize() {
      const r = c!.getBoundingClientRect();
      rw = r.width;
      rh = r.height;
      W = c!.width = rw * dpr;
      H = c!.height = rh * dpr;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      midX = rw / 2;
      midY = rh / 2;
    }
    resize();
    window.addEventListener("resize", resize);

    const offsets = [-186, -130, -76, -12, 52, 106, 160];

    interface Particle {
      x: number; y: number; startX: number; startY: number;
      vx: number; vy: number; sz: number; life: number; decay: number;
      col: number[]; phase: number; freq: number; amp: number;
      returning: boolean; travelDist: number;
      trail: { x: number; y: number }[];
    }

    const particles: Particle[] = [];
    let frame = 0;

    function spawn() {
      const li = Math.floor(Math.random() * 7);
      const ox = midX + offsets[li] + (Math.random() * 36 - 18);
      const oy = midY + (Math.random() * 30 - 15);
      const spd = 0.15 + Math.random() * 0.6;
      const sz = Math.random() < 0.3 ? (1.5 + Math.random()) : (0.5 + Math.random());
      const r = Math.random();
      let col: number[];
      if (r < 0.75) { col = [255, 208, 0, 0.2 + Math.random() * 0.45]; }
      else if (r < 0.88) { col = [255, 0, 64, 0.1 + Math.random() * 0.2]; }
      else { col = [0, 255, 255, 0.08 + Math.random() * 0.15]; }

      particles.push({
        x: ox, y: oy, startX: ox, startY: oy,
        vx: -spd, vy: (Math.random() - 0.5) * 0.2,
        sz, life: 1, decay: 0.002 + Math.random() * 0.004,
        col, phase: Math.random() * 6.28,
        freq: 0.008 + Math.random() * 0.012,
        amp: 0.3 + Math.random() * 0.6,
        returning: false, travelDist: 40 + Math.random() * 100,
        trail: [],
      });
    }

    let animId: number;
    function draw() {
      ctx!.clearRect(0, 0, rw, rh);

      if (frame % 3 === 0 && particles.length < 120) {
        const n = Math.random() < 0.15 ? 2 : 1;
        for (let i = 0; i < n; i++) spawn();
      }

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        const wobble = Math.sin(p.phase + frame * p.freq) * p.amp;

        if (!p.returning) {
          p.x += p.vx;
          p.y += p.vy + wobble * 0.1;
          if (Math.abs(p.x - p.startX) > p.travelDist) p.returning = true;
        } else {
          const tx = p.startX + 40 + Math.random() * 20;
          const ty = p.startY;
          p.x += (tx - p.x) * 0.015;
          p.y += (ty - p.y) * 0.01 + wobble * 0.06;
          if (Math.abs(p.x - tx) < 5 && Math.abs(p.y - ty) < 5) p.life -= 0.015;
        }
        p.life -= p.decay;

        p.trail.push({ x: p.x, y: p.y });
        if (p.trail.length > 8) p.trail.shift();

        for (let t = 0; t < p.trail.length; t++) {
          const pt = p.trail[t];
          const ta = p.life * (t / p.trail.length) * 0.2 * p.col[3];
          ctx!.fillStyle = `rgba(${p.col[0]},${p.col[1]},${p.col[2]},${ta.toFixed(3)})`;
          const ts = p.sz * 0.4 * (t / p.trail.length);
          ctx!.fillRect(pt.x - ts / 2, pt.y - ts / 2, ts, ts);
        }

        const fa = p.life * p.col[3];
        ctx!.fillStyle = `rgba(${p.col[0]},${p.col[1]},${p.col[2]},${fa.toFixed(3)})`;
        ctx!.fillRect(p.x - p.sz / 2, p.y - p.sz / 2, p.sz, p.sz);

        if (Math.random() < 0.008 && p.life > 0.5) {
          ctx!.fillStyle = `rgba(255,208,0,${(p.life * 0.15).toFixed(3)})`;
          ctx!.fillRect(p.x + (Math.random() * 6 - 3), p.y + (Math.random() * 6 - 3), 0.5, 0.5);
        }

        if (p.life <= 0) particles.splice(i, 1);
      }

      if (Math.random() < 0.025) {
        const sy = midY + (Math.random() * 50 - 25);
        const sw = 8 + Math.random() * 40;
        const sx = midX - 200 + Math.random() * 400;
        ctx!.fillStyle = "rgba(255,208,0,0.02)";
        ctx!.fillRect(sx, sy, sw, 0.5);
      }

      frame++;
      animId = requestAnimationFrame(draw);
    }
    draw();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <div style={{
      background: "#000",
      minHeight: "100dvh",
      fontFamily: "'Sora', -apple-system, sans-serif",
      color: "#fff",
      overflowX: "hidden",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700;800&family=Plus+Jakarta+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        html { scroll-behavior: smooth; }
        body { background: #000; }

        .ch { position: relative; display: inline-block; font-family: 'P22 Folk Art', 'Sora', sans-serif; font-size: 76px; font-weight: 800; color: #FFD000; letter-spacing: 6px; line-height: 1; will-change: opacity; }
        .ch::before, .ch::after { content: attr(data-ch); position: absolute; top: 0; left: 0; width: 100%; height: 100%; font-size: inherit; font-weight: inherit; letter-spacing: inherit; line-height: inherit; overflow: hidden; }
        .ch::before { color: rgba(255,0,64,0.7); z-index: -1; }
        .ch::after { color: rgba(0,255,255,0.5); z-index: -2; }

        .ch-F::before{animation:gA 4.2s infinite 0s} .ch-F::after{animation:gB 5.1s infinite .4s} .ch-F{animation:fk 7s infinite 0s}
        .ch-O::before{animation:gA 3.8s infinite .6s} .ch-O::after{animation:gB 4.4s infinite .2s} .ch-O{animation:fk 6s infinite 1.1s}
        .ch-R1::before{animation:gA 5.3s infinite .2s} .ch-R1::after{animation:gB 3.7s infinite .8s} .ch-R1{animation:fk 8s infinite .4s}
        .ch-W::before{animation:gA 4s infinite .9s} .ch-W::after{animation:gB 4.8s infinite .1s} .ch-W{animation:fk 5.5s infinite 1.5s}
        .ch-A::before{animation:gA 4.6s infinite .3s} .ch-A::after{animation:gB 3.5s infinite .7s} .ch-A{animation:fk 6.5s infinite .7s}
        .ch-R2::before{animation:gA 3.4s infinite .5s} .ch-R2::after{animation:gB 5.5s infinite .3s} .ch-R2{animation:fk 7.5s infinite 1.3s}
        .ch-D::before{animation:gA 5s infinite .1s} .ch-D::after{animation:gB 3.9s infinite .6s} .ch-D{animation:fk 6.8s infinite .2s}

        @keyframes gA{
          0%,100%{clip-path:inset(0 0 100% 0);transform:translateX(0)}
          12%{clip-path:inset(0 0 100% 0);transform:translateX(0)}
          13%{clip-path:inset(35% 0 48% 0);transform:translateX(-2px)}
          15%{clip-path:inset(0 0 100% 0);transform:translateX(0)}
          58%{clip-path:inset(0 0 100% 0);transform:translateX(0)}
          59%{clip-path:inset(68% 0 12% 0);transform:translateX(2px)}
          61%{clip-path:inset(0 0 100% 0);transform:translateX(0)}
        }
        @keyframes gB{
          0%,100%{clip-path:inset(0 0 100% 0);transform:translateX(0)}
          22%{clip-path:inset(0 0 100% 0);transform:translateX(0)}
          23%{clip-path:inset(52% 0 28% 0);transform:translateX(2px)}
          25%{clip-path:inset(0 0 100% 0);transform:translateX(0)}
          74%{clip-path:inset(0 0 100% 0);transform:translateX(0)}
          75%{clip-path:inset(18% 0 68% 0);transform:translateX(-1px)}
          77%{clip-path:inset(0 0 100% 0);transform:translateX(0)}
        }
        @keyframes fk{
          0%,100%{opacity:1}
          40%{opacity:1}41%{opacity:.55}42%{opacity:1}
        }

        .nav-link:hover { color: #666 !important; }
        .lp-cta:hover { opacity: 0.88; }
        .lp-cta { transition: opacity 0.15s ease; }
        .feat-card:hover { border-color: #2a2a2a !important; }
        .feat-card { transition: border-color 0.2s ease; }

        @media (max-width: 768px) {
          .ch { font-size: 42px !important; letter-spacing: 3px !important; }
          .hero-section { min-height: 320px !important; }
          .features-row { flex-direction: column !important; gap: 16px !important; }
          .nav-links-desktop { display: none !important; }
        }
      `}</style>

      {/* ═══ NAVBAR ═══ */}
      <nav style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        padding: "16px 32px", borderBottom: "1px solid #111",
        position: "sticky", top: 0, background: "rgba(0,0,0,0.95)",
        backdropFilter: "blur(12px)", zIndex: 100,
      }}>
        <img src="/Trademark-white.png" alt="Pitgoal" style={{ height: 22 }} />
        <div className="nav-links-desktop" style={{ display: "flex", alignItems: "center", gap: 28 }}>
          <a href="#energy" className="nav-link" style={{ fontSize: 11, fontWeight: 500, color: "#333", letterSpacing: 2, textDecoration: "none", fontFamily: "'IBM Plex Mono', monospace" }}>ENERGY</a>
          <a href="#rocky" className="nav-link" style={{ fontSize: 11, fontWeight: 500, color: "#333", letterSpacing: 2, textDecoration: "none", fontFamily: "'IBM Plex Mono', monospace" }}>ROCKY</a>
          <a href="#pitcoin" className="nav-link" style={{ fontSize: 11, fontWeight: 500, color: "#333", letterSpacing: 2, textDecoration: "none", fontFamily: "'IBM Plex Mono', monospace" }}>PIT COIN</a>
          <a href="/app" className="lp-cta" style={{ fontSize: 11, fontWeight: 700, color: "#000", background: "#FFD000", padding: "8px 20px", borderRadius: 6, textDecoration: "none", letterSpacing: 0.5 }}>Try Pitgoal Free</a>
        </div>
      </nav>

      {/* ═══ HERO ═══ */}
      <section className="hero-section" style={{
        position: "relative", overflow: "hidden", minHeight: 420,
        display: "flex", flexDirection: "column", alignItems: "center",
        justifyContent: "center", textAlign: "center", padding: "60px 24px",
      }}>
        <canvas ref={canvasRef} style={{
          position: "absolute", inset: 0, zIndex: 1, pointerEvents: "none",
          width: "100%", height: "100%",
        }} />

        <div style={{ position: "relative", zIndex: 2, display: "flex", flexDirection: "column", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "center", gap: 0, marginBottom: 28 }}>
            <span className="ch ch-F" data-ch="F">F</span>
            <span className="ch ch-O" data-ch="O">O</span>
            <span className="ch ch-R1" data-ch="R">R</span>
            <span className="ch ch-W" data-ch="W">W</span>
            <span className="ch ch-A" data-ch="A">A</span>
            <span className="ch ch-R2" data-ch="R">R</span>
            <span className="ch ch-D" data-ch="D">D</span>
          </div>

          <p style={{
            fontSize: 15, fontWeight: 400, color: "#333", lineHeight: 1.8,
            margin: "0 0 36px", fontFamily: "'Plus Jakarta Sans', sans-serif",
          }}>
            Track real effort. Filter internet noise.<br />Earn by helping others.
          </p>
          <a href="/app" className="lp-cta" style={{
            display: "inline-block", fontSize: 14, fontWeight: 600,
            color: "#000", background: "#FFD000", padding: "13px 36px",
            borderRadius: 8, textDecoration: "none", letterSpacing: 0.5,
            marginBottom: 14,
          }}>
            Try Pitgoal Free
          </a>
          <span style={{
            fontSize: 10, color: "#222", letterSpacing: 2, fontWeight: 500,
            fontFamily: "'IBM Plex Mono', monospace",
          }}>
            FREE FOREVER &nbsp;&middot;&nbsp; NO ADS &nbsp;&middot;&nbsp; NO BS
          </span>
        </div>
      </section>

      {/* ═══ DIVIDER ═══ */}
      <div style={{ width: 40, height: 1, background: "#1a1a1a", margin: "50px auto" }} />

      {/* ═══ FEATURES ═══ */}
      <section className="features-row" style={{
        display: "flex", justifyContent: "center", gap: 12,
        padding: "0 32px 60px", maxWidth: 1000, margin: "0 auto",
      }}>
        {/* Energy */}
        <div id="energy" className="feat-card" style={{ flex: 1, background: "#0a0a0a", border: "1px solid #1a1a1a", borderRadius: 12, overflow: "hidden" }}>
          <div style={{ padding: 20, minHeight: 110, display: "flex", alignItems: "center", justifyContent: "center", borderBottom: "1px solid #141414" }}>
            <div style={{ width: "100%", maxWidth: 180 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <span style={{ fontSize: 24, fontWeight: 800, color: "#FFD000", fontFamily: "'Sora'" }}>34%</span>
                <span style={{ fontSize: 8, color: "#333", letterSpacing: 1, fontFamily: "'IBM Plex Mono'" }}>ENERGY</span>
              </div>
              <div style={{ height: 4, background: "#1a1a1a", borderRadius: 2, overflow: "hidden" }}>
                <div style={{ height: "100%", width: "34%", background: "#E24B4A", borderRadius: 2 }} />
              </div>
              <div style={{ marginTop: 8, fontSize: 8, fontWeight: 700, color: "#E24B4A", background: "rgba(226,75,74,0.08)", padding: "3px 8px", borderRadius: 4, display: "inline-block", letterSpacing: 0.5, fontFamily: "'IBM Plex Mono'" }}>REST NOW</div>
            </div>
          </div>
          <div style={{ padding: 20 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#fff", marginBottom: 6 }}>Energy</div>
            <div style={{ fontSize: 12, color: "#444", lineHeight: 1.7, fontFamily: "'Plus Jakarta Sans'" }}>Mirrors real tiredness. No fake resets. Rest to recover — just like your body.</div>
          </div>
        </div>

        {/* Rocky */}
        <div id="rocky" className="feat-card" style={{ flex: 1, background: "#0a0a0a", border: "1px solid #1a1a1a", borderRadius: 12, overflow: "hidden" }}>
          <div style={{ padding: 20, minHeight: 110, display: "flex", alignItems: "center", justifyContent: "center", borderBottom: "1px solid #141414" }}>
            <div style={{ width: "100%", maxWidth: 200, background: "#111", borderRadius: 8, border: "1px solid #1a1a1a", overflow: "hidden" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 5, padding: "7px 10px", borderBottom: "1px solid #141414", fontSize: 8, color: "#333", fontFamily: "'IBM Plex Mono'" }}>
                <div style={{ width: 14, height: 14, borderRadius: 3, background: "#141414", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 7, color: "#555" }}>T</div>
                shared from TikTok
              </div>
              <div style={{ padding: "7px 10px", fontSize: 10, color: "#555", lineHeight: 1.5, fontFamily: "'Plus Jakarta Sans'" }}>
                &quot;This 5-minute hack will double your income instantly...&quot;
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 4, padding: "5px 10px", background: "rgba(226,75,74,0.04)", fontSize: 8, fontWeight: 700, color: "#E24B4A", letterSpacing: 0.5, fontFamily: "'IBM Plex Mono'" }}>
                FLAGGED — no source found
              </div>
            </div>
          </div>
          <div style={{ padding: 20 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#fff", marginBottom: 6 }}>Rocky</div>
            <div style={{ fontSize: 12, color: "#444", lineHeight: 1.7, fontFamily: "'Plus Jakarta Sans'" }}>AI filter from Planet Erid. Checks sources. Flags BS before it reaches your feed.</div>
          </div>
        </div>

        {/* Pit Coin */}
        <div id="pitcoin" className="feat-card" style={{ flex: 1, background: "#0a0a0a", border: "1px solid #1a1a1a", borderRadius: 12, overflow: "hidden" }}>
          <div style={{ padding: 20, minHeight: 110, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6, borderBottom: "1px solid #141414" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, background: "#111", border: "1px solid #1a1a1a", borderRadius: 8, padding: "8px 16px" }}>
              <div style={{ width: 20, height: 20, borderRadius: "50%", background: "rgba(255,208,0,0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: "#FFD000", fontWeight: 700 }}>P</div>
              <span style={{ fontSize: 14, fontWeight: 700, color: "#FFD000" }}>+5 coins</span>
              <div style={{ width: 16, height: 16, borderRadius: "50%", background: "rgba(52,211,153,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="10" height="10" viewBox="0 0 12 12"><path d="M2 6l3 3 5-5" stroke="#34D399" strokeWidth="2" fill="none" strokeLinecap="round" /></svg>
              </div>
            </div>
            <div style={{ fontSize: 8, color: "#333", letterSpacing: 1, fontFamily: "'IBM Plex Mono'" }}>VERIFICATION COMPLETE</div>
          </div>
          <div style={{ padding: 20 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#fff", marginBottom: 6 }}>Pit Coin</div>
            <div style={{ fontSize: 12, color: "#444", lineHeight: 1.7, fontFamily: "'Plus Jakarta Sans'" }}>Earned from helping others. Complete tasks, verify claims. Not farmable.</div>
          </div>
        </div>
      </section>

      {/* ═══ BOTTOM ═══ */}
      <section style={{ textAlign: "center", padding: "20px 32px 30px" }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: "#FFD000", letterSpacing: 1, marginBottom: 6 }}>Made in Malaysia.</div>
        <div style={{ fontSize: 10, color: "#222", letterSpacing: 3, fontFamily: "'IBM Plex Mono', monospace" }}>PITGOAL.COM</div>
      </section>

      {/* ═══ FOOTER ═══ */}
      <footer style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        padding: "14px 32px", borderTop: "1px solid #111",
      }}>
        <span style={{ fontSize: 10, color: "#1a1a1a", letterSpacing: 0.5, fontFamily: "'IBM Plex Mono', monospace" }}>© 2026 Pitgoal</span>
        <div style={{ display: "flex", gap: 16 }}>
          <span style={{ fontSize: 10, color: "#222", letterSpacing: 0.5, fontFamily: "'IBM Plex Mono', monospace" }}>Privacy</span>
          <span style={{ fontSize: 10, color: "#222", letterSpacing: 0.5, fontFamily: "'IBM Plex Mono', monospace" }}>Terms</span>
        </div>
      </footer>
    </div>
  );
}
