"use client";

export default function Features() {
  return (
    <section
      style={{
        width: "100%",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "80px 24px",
        background: "#000000",
        position: "relative",
      }}
    >
      {/* Section divider */}
      <div
        style={{
          width: 40,
          height: 1,
          background: "#1a1a1a",
          marginBottom: 60,
          borderRadius: 1,
        }}
      />

      {/* Feature cards */}
      <div
        className="features-row"
        style={{
          display: "flex",
          justifyContent: "center",
          gap: 12,
          maxWidth: 1000,
          width: "100%",
        }}
      >
        {/* Energy */}
        <div
          id="energy"
          className="feat-card"
          style={{
            flex: 1,
            background: "#0a0a0a",
            border: "1px solid #1a1a1a",
            borderRadius: 12,
            overflow: "hidden",
            transition: "border-color 0.2s ease",
          }}
        >
          <div
            style={{
              padding: 20,
              minHeight: 110,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderBottom: "1px solid #141414",
            }}
          >
            <div style={{ width: "100%", maxWidth: 180 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 8,
                }}
              >
                <span
                  style={{
                    fontSize: 24,
                    fontWeight: 800,
                    color: "#FFD000",
                    fontFamily: "'Sora'",
                  }}
                >
                  34%
                </span>
                <span
                  style={{
                    fontSize: 8,
                    color: "#333",
                    letterSpacing: 1,
                    fontFamily: "'IBM Plex Mono'",
                  }}
                >
                  ENERGY
                </span>
              </div>
              <div
                style={{
                  height: 4,
                  background: "#1a1a1a",
                  borderRadius: 2,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    width: "34%",
                    background: "#E24B4A",
                    borderRadius: 2,
                  }}
                />
              </div>
              <div
                style={{
                  marginTop: 8,
                  fontSize: 8,
                  fontWeight: 700,
                  color: "#E24B4A",
                  background: "rgba(226,75,74,0.08)",
                  padding: "3px 8px",
                  borderRadius: 4,
                  display: "inline-block",
                  letterSpacing: 0.5,
                  fontFamily: "'IBM Plex Mono'",
                }}
              >
                REST NOW
              </div>
            </div>
          </div>
          <div style={{ padding: 20 }}>
            <div
              style={{ fontSize: 15, fontWeight: 700, color: "#fff", marginBottom: 6 }}
            >
              Energy
            </div>
            <div
              style={{
                fontSize: 12,
                color: "#444",
                lineHeight: 1.7,
                fontFamily: "'Plus Jakarta Sans'",
              }}
            >
              Mirrors real tiredness. No fake resets. Rest to recover — just like
              your body.
            </div>
          </div>
        </div>

        {/* Rocky */}
        <div
          id="rocky"
          className="feat-card"
          style={{
            flex: 1,
            background: "#0a0a0a",
            border: "1px solid #1a1a1a",
            borderRadius: 12,
            overflow: "hidden",
            transition: "border-color 0.2s ease",
          }}
        >
          <div
            style={{
              padding: 20,
              minHeight: 110,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderBottom: "1px solid #141414",
            }}
          >
            <div
              style={{
                width: "100%",
                maxWidth: 200,
                background: "#111",
                borderRadius: 8,
                border: "1px solid #1a1a1a",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                  padding: "7px 10px",
                  borderBottom: "1px solid #141414",
                  fontSize: 8,
                  color: "#333",
                  fontFamily: "'IBM Plex Mono'",
                }}
              >
                <div
                  style={{
                    width: 14,
                    height: 14,
                    borderRadius: 3,
                    background: "#141414",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 7,
                    color: "#555",
                  }}
                >
                  T
                </div>
                shared from TikTok
              </div>
              <div
                style={{
                  padding: "7px 10px",
                  fontSize: 10,
                  color: "#555",
                  lineHeight: 1.5,
                  fontFamily: "'Plus Jakarta Sans'",
                }}
              >
                &quot;This 5-minute hack will double your income instantly...&quot;
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  padding: "5px 10px",
                  background: "rgba(226,75,74,0.04)",
                  fontSize: 8,
                  fontWeight: 700,
                  color: "#E24B4A",
                  letterSpacing: 0.5,
                  fontFamily: "'IBM Plex Mono'",
                }}
              >
                FLAGGED — no source found
              </div>
            </div>
          </div>
          <div style={{ padding: 20 }}>
            <div
              style={{ fontSize: 15, fontWeight: 700, color: "#fff", marginBottom: 6 }}
            >
              Rocky
            </div>
            <div
              style={{
                fontSize: 12,
                color: "#444",
                lineHeight: 1.7,
                fontFamily: "'Plus Jakarta Sans'",
              }}
            >
              AI filter from Planet Erid. Checks sources. Flags BS before it
              reaches your feed.
            </div>
          </div>
        </div>

        {/* Pit Coin */}
        <div
          id="pitcoin"
          className="feat-card"
          style={{
            flex: 1,
            background: "#0a0a0a",
            border: "1px solid #1a1a1a",
            borderRadius: 12,
            overflow: "hidden",
            transition: "border-color 0.2s ease",
          }}
        >
          <div
            style={{
              padding: 20,
              minHeight: 110,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              borderBottom: "1px solid #141414",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                background: "#111",
                border: "1px solid #1a1a1a",
                borderRadius: 8,
                padding: "8px 16px",
              }}
            >
              <div
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: "50%",
                  background: "rgba(255,208,0,0.1)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 10,
                  color: "#FFD000",
                  fontWeight: 700,
                }}
              >
                P
              </div>
              <span style={{ fontSize: 14, fontWeight: 700, color: "#FFD000" }}>
                +5 coins
              </span>
              <div
                style={{
                  width: 16,
                  height: 16,
                  borderRadius: "50%",
                  background: "rgba(52,211,153,0.1)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <svg width="10" height="10" viewBox="0 0 12 12">
                  <path
                    d="M2 6l3 3 5-5"
                    stroke="#34D399"
                    strokeWidth="2"
                    fill="none"
                    strokeLinecap="round"
                  />
                </svg>
              </div>
            </div>
            <div
              style={{
                fontSize: 8,
                color: "#333",
                letterSpacing: 1,
                fontFamily: "'IBM Plex Mono'",
              }}
            >
              VERIFICATION COMPLETE
            </div>
          </div>
          <div style={{ padding: 20 }}>
            <div
              style={{ fontSize: 15, fontWeight: 700, color: "#fff", marginBottom: 6 }}
            >
              Pit Coin
            </div>
            <div
              style={{
                fontSize: 12,
                color: "#444",
                lineHeight: 1.7,
                fontFamily: "'Plus Jakarta Sans'",
              }}
            >
              Earned from helping others. Complete tasks, verify claims. Not
              farmable.
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .feat-card:hover { border-color: #2a2a2a !important; }
        .lp-cta:hover { opacity: 0.88; }
        .lp-cta { transition: opacity 0.15s ease; }
        @media (max-width: 768px) {
          .features-row { flex-direction: column !important; gap: 16px !important; }
        }
      `}</style>
    </section>
  );
}
