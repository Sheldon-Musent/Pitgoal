"use client";
import { DISPLAY, MONO } from "../lib/constants";

export default function CommunityTab() {
  return (
    <div style={{ padding: "16px 14px 0" }}>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 20, fontWeight: 800, color: "var(--t1)", fontFamily: DISPLAY }}>Community</div>
        <div style={{ fontSize: 11, color: "var(--t4)", marginTop: 4 }}>Marketplace, coins & support</div>
      </div>

      {/* Coin balance */}
      <div style={{ background: "var(--warn-bg)", borderRadius: 20, padding: "24px 20px", border: "1px solid var(--warn-10)", marginBottom: 16 }}>
        <div style={{ fontSize: 10, color: "var(--warn)", fontFamily: MONO, letterSpacing: 2, marginBottom: 8 }}>PIT COINS</div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
          <div style={{ fontSize: 40, fontWeight: 800, color: "var(--t1)", fontFamily: DISPLAY, lineHeight: 1 }}>0</div>
          <div style={{ fontSize: 12, color: "var(--t4)", fontFamily: MONO }}>coins</div>
        </div>
        <div style={{ fontSize: 11, color: "var(--t4)", marginTop: 8 }}>Earn coins by completing tasks</div>
      </div>

      {/* Coming soon */}
      {[
        { title: "Task marketplace", desc: "Post and find tasks in the community", icon: "◈", cssColor: "var(--warn)" },
        { title: "Stake & contracts", desc: "Bet coins on your own goals", icon: "◆", cssColor: "var(--pink)" },
        { title: "Support others", desc: "Invest coins in people you believe in", icon: "♡", cssColor: "var(--accent)" },
      ].map((item, i) => (
        <div key={i} style={{
          background: "var(--card)", borderRadius: 20, padding: "18px 20px",
          border: "1px solid var(--border)", marginBottom: 8,
          display: "flex", alignItems: "center", gap: 14,
          animation: `fadeUp 0.3s ease ${i * 0.06}s both`,
        }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: "var(--glow)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, color: item.cssColor, flexShrink: 0 }}>{item.icon}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "var(--t1)", fontFamily: DISPLAY }}>{item.title}</div>
            <div style={{ fontSize: 11, color: "var(--t4)", marginTop: 2 }}>{item.desc}</div>
          </div>
          <div style={{ fontSize: 9, color: "var(--t6)", fontFamily: MONO, letterSpacing: 1, background: "var(--card2)", padding: "4px 8px", borderRadius: 6 }}>SOON</div>
        </div>
      ))}
    </div>
  );
}
