"use client";

import { useEffect, useRef } from "react";

export default function Hero() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;

    interface Particle {
      x: number; y: number; startX: number; startY: number;
      vx: number; vy: number; sz: number; life: number; decay: number;
      col: number[]; phase: number; freq: number; amp: number;
      returning: boolean; travelDist: number;
      trail: { x: number; y: number }[];
    }

    const particles: Particle[] = [];
    let frame = 0;
    let cw = 0, ch = 0;

    const resize = () => {
      const rect = canvas.parentElement?.getBoundingClientRect();
      if (!rect) return;
      const dpr = window.devicePixelRatio || 1;
      cw = rect.width;
      ch = rect.height;
      canvas.width = cw * dpr;
      canvas.height = ch * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    function spawn() {
      const midX = cw / 2;
      const midY = ch / 2;
      const ox = midX + (Math.random() * 200 - 100);
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

    const animate = () => {
      ctx.clearRect(0, 0, cw, ch);

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
          ctx.fillStyle = `rgba(${p.col[0]},${p.col[1]},${p.col[2]},${ta.toFixed(3)})`;
          const ts = p.sz * 0.4 * (t / p.trail.length);
          ctx.fillRect(pt.x - ts / 2, pt.y - ts / 2, ts, ts);
        }

        const fa = p.life * p.col[3];
        ctx.fillStyle = `rgba(${p.col[0]},${p.col[1]},${p.col[2]},${fa.toFixed(3)})`;
        ctx.fillRect(p.x - p.sz / 2, p.y - p.sz / 2, p.sz, p.sz);

        if (Math.random() < 0.008 && p.life > 0.5) {
          ctx.fillStyle = `rgba(255,208,0,${(p.life * 0.15).toFixed(3)})`;
          ctx.fillRect(p.x + (Math.random() * 6 - 3), p.y + (Math.random() * 6 - 3), 0.5, 0.5);
        }

        if (p.life <= 0) particles.splice(i, 1);
      }

      if (Math.random() < 0.025) {
        const midX = cw / 2;
        const midY = ch / 2;
        const sy = midY + (Math.random() * 50 - 25);
        const sw = 8 + Math.random() * 40;
        const sx = midX - 200 + Math.random() * 400;
        ctx.fillStyle = "rgba(255,208,0,0.02)";
        ctx.fillRect(sx, sy, sw, 0.5);
      }

      frame++;
      animId = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <section
      style={{
        position: "relative",
        width: "100%",
        height: "100vh",
        minHeight: 600,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        background: "#000000",
      }}
    >
      {/* Nav bar */}
      <nav
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "16px 32px",
          zIndex: 10,
          borderBottom: "1px solid #111",
          background: "rgba(0,0,0,0.95)",
          backdropFilter: "blur(12px)",
        }}
      >
        <img src="/Trademark-white.png" alt="Pitgoal" style={{ height: 22 }} />
        <div className="nav-links-desktop" style={{ display: "flex", alignItems: "center", gap: 28 }}>
          {["ENERGY", "ROCKY", "PIT COIN"].map((item) => (
            <a
              key={item}
              href={`#${item.toLowerCase().replace(" ", "")}`}
              style={{
                fontSize: 11,
                fontWeight: 500,
                color: "#333",
                letterSpacing: 2,
                textDecoration: "none",
                fontFamily: "'IBM Plex Mono', monospace",
                transition: "color 0.2s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#666")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "#333")}
            >
              {item}
            </a>
          ))}
          <a
            href="/app"
            className="lp-cta"
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: "#000",
              background: "#FFD000",
              padding: "8px 20px",
              borderRadius: 6,
              textDecoration: "none",
              letterSpacing: 0.5,
              transition: "opacity 0.15s ease",
            }}
          >
            Try Pitgoal Free
          </a>
        </div>
      </nav>

      {/* FORWARD text with particle canvas scoped behind it */}
      <div
        style={{
          position: "relative",
          textAlign: "center",
          zIndex: 2,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <div style={{ position: "relative", display: "inline-block" }}>
          {/* Particle canvas — sits BEHIND the text, scoped to text container */}
          <canvas
            ref={canvasRef}
            style={{
              position: "absolute",
              top: "-40%",
              left: "-20%",
              width: "140%",
              height: "180%",
              pointerEvents: "none",
              zIndex: 0,
            }}
          />
          {/* FORWARD glitch text */}
          <div
            style={{
              position: "relative",
              zIndex: 1,
              display: "flex",
              alignItems: "baseline",
              justifyContent: "center",
              gap: 0,
              marginBottom: 28,
            }}
          >
            {["F", "O", "R", "W", "A", "R", "D"].map((char, i) => {
              const cls = `ch ch-${char}${char === "R" ? (i === 2 ? "1" : "2") : ""}`;
              return (
                <span key={i} className={cls} data-ch={char}>
                  {char}
                </span>
              );
            })}
          </div>
        </div>

        {/* Subtitle — BELOW the particle zone */}
        <p
          style={{
            fontSize: 15,
            fontWeight: 400,
            color: "#333",
            lineHeight: 1.8,
            margin: "0 0 36px",
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            position: "relative",
            zIndex: 3,
          }}
        >
          Track real effort. Filter internet noise.
          <br />
          Earn by helping others.
        </p>

        {/* CTA button */}
        <a
          href="/app"
          className="lp-cta"
          style={{
            display: "inline-block",
            fontSize: 14,
            fontWeight: 600,
            color: "#000",
            background: "#FFD000",
            padding: "13px 36px",
            borderRadius: 8,
            textDecoration: "none",
            letterSpacing: 0.5,
            marginBottom: 14,
            position: "relative",
            zIndex: 3,
          }}
        >
          Try Pitgoal Free
        </a>

        {/* Trust line */}
        <span
          style={{
            fontSize: 10,
            color: "#222",
            letterSpacing: 2,
            fontWeight: 500,
            fontFamily: "'IBM Plex Mono', monospace",
            position: "relative",
            zIndex: 3,
          }}
        >
          FREE FOREVER &nbsp;&middot;&nbsp; NO ADS &nbsp;&middot;&nbsp; NO BS
        </span>
      </div>

      {/* Scroll indicator */}
      <div
        style={{
          position: "absolute",
          bottom: 32,
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 3,
        }}
      >
        <div
          style={{
            width: 24,
            height: 40,
            border: "1px solid #333",
            borderRadius: 12,
            display: "flex",
            justifyContent: "center",
            paddingTop: 8,
          }}
        >
          <div
            style={{
              width: 3,
              height: 8,
              background: "#FFD000",
              borderRadius: 2,
              animation: "scrollBounce 2s infinite",
            }}
          />
        </div>
      </div>

      {/* Glitch + scroll keyframes */}
      <style>{`
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

        @keyframes scrollBounce {
          0%, 100% { transform: translateY(0); opacity: 1; }
          50% { transform: translateY(6px); opacity: 0.3; }
        }

        @media (max-width: 768px) {
          .ch { font-size: 42px !important; letter-spacing: 3px !important; }
          .nav-links-desktop { display: none !important; }
        }
      `}</style>
    </section>
  );
}
