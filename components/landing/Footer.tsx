export default function Footer() {
  return (
    <>
      {/* Made in Malaysia */}
      <section
        style={{
          textAlign: "center",
          padding: "20px 32px 30px",
          background: "#000000",
        }}
      >
        <div
          style={{
            fontSize: 14,
            fontWeight: 600,
            color: "#FFD000",
            letterSpacing: 1,
            marginBottom: 6,
          }}
        >
          Made in Malaysia.
        </div>
        <div
          style={{
            fontSize: 10,
            color: "#222",
            letterSpacing: 3,
            fontFamily: "'IBM Plex Mono', monospace",
          }}
        >
          PITGOAL.COM
        </div>
      </section>

      {/* Footer bar */}
      <footer
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "14px 32px",
          borderTop: "1px solid #111",
          background: "#000000",
        }}
      >
        <span
          style={{
            fontSize: 10,
            color: "#1a1a1a",
            letterSpacing: 0.5,
            fontFamily: "'IBM Plex Mono', monospace",
          }}
        >
          © 2026 Pitgoal
        </span>
        <div style={{ display: "flex", gap: 16 }}>
          <span
            style={{
              fontSize: 10,
              color: "#222",
              letterSpacing: 0.5,
              fontFamily: "'IBM Plex Mono', monospace",
            }}
          >
            Privacy
          </span>
          <span
            style={{
              fontSize: 10,
              color: "#222",
              letterSpacing: 0.5,
              fontFamily: "'IBM Plex Mono', monospace",
            }}
          >
            Terms
          </span>
        </div>
      </footer>
    </>
  );
}
