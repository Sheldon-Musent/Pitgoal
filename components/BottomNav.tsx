"use client";
interface BottomNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}
const TABS = [
  { id: "mission", icon: "◈", label: "MISSION", desc: "Phase goals" },
  { id: "details", icon: "◫", label: "DETAILS", desc: "Overviews" },
  { id: "connect", icon: "◎", label: "CONNECT", desc: "Social" },
  { id: "ai", icon: "◆", label: "AI", desc: "Premium" },
];
export function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-40"
      style={{
        background: "rgba(6,10,18,0.97)",
        backdropFilter: "blur(16px)",
        borderTop: "1px solid var(--border-light)",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}
    >
      <div
        className="max-w-[520px] mx-auto grid"
        style={{ gridTemplateColumns: "repeat(4, 1fr)" }}
      >
        {TABS.map((t) => {
          const active = activeTab === t.id;
          const accentColor =
            t.id === "mission"
              ? "var(--green)"
              : t.id === "details"
              ? "var(--purple)"
              : t.id === "connect"
              ? "var(--pink)"
              : "var(--orange)";
          return (
            <button
              key={t.id}
              className="tap"
              onClick={() => onTabChange(t.id)}
              style={{
                background: "none",
                border: "none",
                fontFamily: "inherit",
                padding: "10px 4px 8px",
                cursor: "pointer",
                textAlign: "center",
                borderTop: active
                  ? `2px solid ${accentColor}`
                  : "2px solid transparent",
              }}
            >
              <div
                style={{
                  fontSize: 16,
                  color: active ? accentColor : "var(--text-ghost)",
                  marginBottom: 1,
                  lineHeight: 1,
                }}
              >
                {t.icon}
              </div>
              <div
                style={{
                  fontSize: 9,
                  fontWeight: 700,
                  letterSpacing: 2,
                  color: active ? accentColor : "var(--text-ghost)",
                }}
              >
                {t.label}
              </div>
              <div
                style={{
                  fontSize: 7,
                  color: active ? `${accentColor}66` : "var(--text-ghost)",
                  letterSpacing: 0.5,
                  marginTop: 1,
                }}
              >
                {t.desc}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
