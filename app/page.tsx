"use client";

import { useDoitStorage } from "@/hooks/useDoitStorage";
import { PHASES } from "@/data/phases";
import { BottomNav } from "@/components/BottomNav";
import { MissionTab } from "@/components/MissionTab";
import { PlaceholderTab } from "@/components/PlaceholderTab";

export default function Home() {
  const store = useDoitStorage();

  const totalGoals = PHASES.reduce((a, p) => a + p.goals.length, 0);
  const totalDone = Object.values(store.completed).filter(Boolean).length;
  const missionPct = Math.round((totalDone / totalGoals) * 100);

  if (!store.loaded) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-[#00ff9f] text-sm animate-pulse-slow">
          LOADING MISSION DATA...
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[520px] mx-auto relative">
      <div className="scanline" />
      {store.saving && <div className="save-dot" />}

      {/* Header */}
      <div
        className="sticky top-0 z-40"
        style={{
          background: "rgba(6,10,18,0.97)",
          backdropFilter: "blur(16px)",
          borderBottom: "1px solid var(--bg-surface)",
          padding: "calc(14px + env(safe-area-inset-top, 0px)) 16px 10px",
        }}
      >
        <div className="flex justify-between items-start mb-2">
          <div>
            <div className="flex items-center gap-1.5 mb-0.5">
              <span
                className="text-[9px] tracking-[4px]"
                style={{ color: "var(--green)", opacity: 0.5 }}
              >
                SYS://
              </span>
              <span
                className="text-[8px] animate-pulse-slow"
                style={{ color: "var(--green)" }}
              >
                ●
              </span>
            </div>
            <h1
              className="font-display text-[22px] font-bold leading-none"
              style={{ color: "var(--text-primary)", letterSpacing: -0.5 }}
            >
              DO<span style={{ color: "var(--green)" }}>IT</span>
            </h1>
            <div
              className="text-[9px] tracking-[2px] mt-0.5"
              style={{ color: "var(--text-ghost)" }}
            >
              {store.activeTab === "mission"
                ? "MISSION CONTROL"
                : store.activeTab === "details"
                ? "OVERVIEW"
                : store.activeTab === "connect"
                ? "CONNECT"
                : "AI ASSISTANT"}
            </div>
          </div>
          <div className="text-right">
            <div
              className="font-display text-xl font-bold leading-none"
              style={{ color: "var(--green)" }}
            >
              {missionPct}%
            </div>
            <div
              className="text-[8px] tracking-wider"
              style={{ color: "var(--text-dim)" }}
            >
              MISSION
            </div>
          </div>
        </div>

        {/* Overall progress bar */}
        <div
          className="h-[2px] rounded-full overflow-hidden mb-0.5"
          style={{ background: "var(--bg-surface)" }}
        >
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${missionPct}%`,
              background: "linear-gradient(90deg, #00ff9f, #00d4ff)",
            }}
          />
        </div>
        <div className="flex justify-between">
          <span className="text-[8px]" style={{ color: "var(--text-ghost)" }}>
            OVERALL
          </span>
          <span className="text-[8px]" style={{ color: "var(--text-dim)" }}>
            {totalDone}/{totalGoals}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 pt-3.5 pb-24">
        {store.activeTab === "mission" && <MissionTab store={store} />}
        {store.activeTab === "details" && (
          <PlaceholderTab
            icon="◫"
            title="Details"
            description="Weekly / monthly / quarterly overviews"
            color="var(--purple)"
          />
        )}
        {store.activeTab === "connect" && (
          <PlaceholderTab
            icon="◎"
            title="Connect"
            description="Chat with friends & find similar goals nearby"
            color="var(--pink)"
          />
        )}
        {store.activeTab === "ai" && (
          <PlaceholderTab
            icon="◆"
            title="AI Assistant"
            description="Create tasks, get advice & discuss decisions"
            color="var(--orange)"
            premium
          />
        )}
      </div>

      {/* Bottom Nav */}
      <BottomNav
        activeTab={store.activeTab}
        onTabChange={store.setActiveTab}
      />
    </div>
  );
}
