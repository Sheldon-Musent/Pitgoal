"use client";

interface PlaceholderTabProps {
  icon: string;
  title: string;
  description: string;
  color: string;
  premium?: boolean;
}

export function PlaceholderTab({
  icon,
  title,
  description,
  color,
  premium,
}: PlaceholderTabProps) {
  return (
    <div
      className="animate-fade-up"
      style={{
        textAlign: "center",
        padding: "60px 24px",
        border: `1px dashed ${color}30`,
        borderRadius: 16,
        marginTop: 20,
      }}
    >
      <div style={{ fontSize: 40, color, marginBottom: 16, opacity: 0.6 }}>
        {icon}
      </div>
      <h2
        className="font-display text-lg font-semibold mb-2"
        style={{ color: "var(--text-primary)" }}
      >
        {title}
      </h2>
      <p
        className="text-xs mb-4"
        style={{ color: "var(--text-muted)", maxWidth: 240, margin: "0 auto" }}
      >
        {description}
      </p>
      <div
        style={{
          display: "inline-block",
          padding: "6px 16px",
          borderRadius: 20,
          border: `1px solid ${color}30`,
          background: `${color}08`,
          fontSize: 10,
          color,
          letterSpacing: 2,
          fontWeight: 600,
        }}
      >
        {premium ? "COMING SOON — PREMIUM" : "COMING SOON"}
      </div>
    </div>
  );
}
