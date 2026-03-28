"use client";
import React, { useState } from "react";

/* ── Types ── */
interface PitPost {
  id: string;
  tag: "win" | "question" | "tip" | "verify" | "discussion";
  title: string;
  source?: {
    platform: "x" | "tiktok" | "youtube" | "instagram" | "chrome";
    handle?: string;
  };
  photoRatio?: "16:9" | "4:5" | "1:1";
  rocky: {
    status: "verified" | "flagged" | "analyzed";
    summary: string;
  };
  rank: "NEWCOMER" | "REGULAR" | "VETERAN";
  coins?: number;
  upvotes: number;
  comments: number;
  topicCluster?: string;
}

interface VerifyPost {
  id: string;
  claim: string;
  source: string;
  status: "pending" | "resolved";
  reward: number;
  votes: { legit: number; bs: number; meh: number };
  consensus?: number;
}

interface HistoryItem {
  id: string;
  preview: string;
  status: "verified" | "flagged";
  mode: "TIP" | "FLAG" | "ASK" | "IDEAS";
  upvotes: number;
  comments: number;
}

/* ── Constants ── */
const TAG_COLORS: Record<PitPost["tag"], string> = {
  win: "#FFD000",
  question: "#60A5FA",
  tip: "#34D399",
  verify: "#F87171",
  discussion: "#A78BFA",
};

const MODE_COLORS: Record<string, string> = {
  TIP: "#34D399",
  FLAG: "#F87171",
  ASK: "#60A5FA",
  IDEAS: "#A78BFA",
};

const PLATFORM_LABELS: Record<string, string> = {
  x: "X",
  tiktok: "TikTok",
  youtube: "YouTube",
  instagram: "Instagram",
  chrome: "Chrome",
};

const RATIO_MAP: Record<string, string> = {
  "16:9": "16/9",
  "4:5": "4/5",
  "1:1": "1/1",
};

/* ── Mock Data ── */
const MOCK_POSTS: PitPost[] = [
  {
    id: "stack-poly-1",
    tag: "discussion",
    title: "Is polyphasic sleep actually sustainable long-term?",
    source: { platform: "x", handle: "@sleephacker" },
    photoRatio: "16:9",
    rocky: { status: "flagged", summary: "Limited peer-reviewed evidence supports polyphasic sleep for most people. Short-term gains often reverse after 2-3 weeks due to accumulated sleep debt." },
    rank: "REGULAR",
    coins: 12,
    upvotes: 47,
    comments: 23,
    topicCluster: "polyphasic-sleep",
  },
  {
    id: "stack-poly-2",
    tag: "verify",
    title: "Polyphasic sleep helped me study 14 hours a day",
    source: { platform: "tiktok", handle: "@grindset99" },
    photoRatio: "4:5",
    rocky: { status: "flagged", summary: "Anecdotal claim. No controlled studies confirm this is safe or effective beyond a few days." },
    rank: "NEWCOMER",
    upvotes: 89,
    comments: 41,
    topicCluster: "polyphasic-sleep",
  },
  {
    id: "stack-poly-3",
    tag: "question",
    title: "What's the best polyphasic schedule for a student?",
    source: { platform: "youtube", handle: "@studytube" },
    photoRatio: "16:9",
    rocky: { status: "analyzed", summary: "Everyman 3 is the most commonly attempted schedule. However, academic performance studies show mixed results." },
    rank: "VETERAN",
    coins: 5,
    upvotes: 31,
    comments: 18,
    topicCluster: "polyphasic-sleep",
  },
  {
    id: "post-2min",
    tag: "tip",
    title: "The 2-minute rule changed how I handle procrastination",
    source: { platform: "x", handle: "@productivitypro" },
    photoRatio: "16:9",
    rocky: { status: "verified", summary: "The 2-minute rule (from GTD by David Allen) is well-supported by behavioral psychology. Small action thresholds reduce activation energy for tasks." },
    rank: "VETERAN",
    coins: 25,
    upvotes: 134,
    comments: 42,
  },
  {
    id: "post-cold",
    tag: "verify",
    title: "Cold showers boost testosterone by 400% — here's the science",
    source: { platform: "tiktok", handle: "@biohackbro" },
    photoRatio: "4:5",
    rocky: { status: "flagged", summary: "The 400% claim is unsubstantiated. While cold exposure may slightly increase norepinephrine, no credible study shows a 400% testosterone increase from cold showers." },
    rank: "NEWCOMER",
    upvotes: 203,
    comments: 87,
  },
  {
    id: "post-journal",
    tag: "question",
    title: "Morning vs evening journaling — which is actually better for mental health?",
    source: { platform: "instagram", handle: "@mindful.pages" },
    photoRatio: "1:1",
    rocky: { status: "verified", summary: "Both have evidence. Morning journaling aids intention-setting (goal priming), while evening journaling supports emotional processing. Consistency matters more than timing." },
    rank: "REGULAR",
    coins: 8,
    upvotes: 76,
    comments: 34,
  },
  {
    id: "post-win",
    tag: "win",
    title: "42-day streak! Longest I've ever maintained a daily habit",
    rocky: { status: "verified", summary: "Incredible consistency! 42 days puts you well past the average habit-formation threshold of 21-66 days." },
    rank: "VETERAN",
    coins: 50,
    upvotes: 312,
    comments: 56,
  },
  {
    id: "post-sleep-guru",
    tag: "discussion",
    title: "This sleep guru's $500 course is just repackaged free info",
    source: { platform: "youtube", handle: "@sleepguru" },
    photoRatio: "16:9",
    rocky: { status: "analyzed", summary: "Course content overlaps significantly with freely available resources from Huberman Lab and Matthew Walker's published research. Price-to-value ratio is questionable." },
    rank: "REGULAR",
    coins: 15,
    upvotes: 198,
    comments: 73,
  },
];

const MOCK_VERIFY_POSTS: VerifyPost[] = [
  { id: "v1", claim: "Drinking lemon water on an empty stomach detoxifies the liver", source: "TikTok @cleanseliving", status: "pending", reward: 5, votes: { legit: 12, bs: 45, meh: 8 } },
  { id: "v2", claim: "Reading 30 minutes a day increases lifespan by 2 years", source: "X @bookworm_facts", status: "pending", reward: 5, votes: { legit: 34, bs: 15, meh: 22 } },
  { id: "v3", claim: "Blue light glasses have no proven benefit for sleep", source: "YouTube @optometrist_real", status: "resolved", reward: 5, votes: { legit: 89, bs: 23, meh: 11 }, consensus: 72 },
  { id: "v4", claim: "Walking 10,000 steps a day was invented as a marketing gimmick", source: "Instagram @healthmyths", status: "pending", reward: 5, votes: { legit: 67, bs: 31, meh: 19 } },
  { id: "v5", claim: "Creatine supplementation improves cognitive performance", source: "X @supplement_sci", status: "resolved", reward: 5, votes: { legit: 78, bs: 12, meh: 15 }, consensus: 74 },
];

const MOCK_HISTORY: HistoryItem[] = [
  { id: "h1", preview: "The 2-minute rule for beating procrastination", status: "verified", mode: "TIP", upvotes: 134, comments: 42 },
  { id: "h2", preview: "Cold showers don't boost testosterone by 400%", status: "flagged", mode: "FLAG", upvotes: 203, comments: 87 },
  { id: "h3", preview: "Best journaling time — morning or evening?", status: "verified", mode: "ASK", upvotes: 76, comments: 34 },
  { id: "h4", preview: "Polyphasic sleep is not sustainable", status: "flagged", mode: "FLAG", upvotes: 47, comments: 23 },
  { id: "h5", preview: "Meditation reduces cortisol within 8 weeks", status: "verified", mode: "TIP", upvotes: 91, comments: 28 },
  { id: "h6", preview: "Sleep guru course is overpriced", status: "verified", mode: "IDEAS", upvotes: 198, comments: 73 },
  { id: "h7", preview: "Dopamine fasting is pseudoscience", status: "flagged", mode: "FLAG", upvotes: 145, comments: 61 },
  { id: "h8", preview: "Wim Hof method for anxiety — does it work?", status: "verified", mode: "ASK", upvotes: 54, comments: 19 },
  { id: "h9", preview: "HIIT vs steady-state cardio for fat loss", status: "verified", mode: "IDEAS", upvotes: 88, comments: 37 },
];

/* ── Helpers ── */
const AnonymousAvatar = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4a5568" strokeWidth="1.5" strokeLinecap="round">
    <circle cx="12" cy="8" r="4" />
    <path d="M6 21v-1a6 6 0 0112 0v1" />
  </svg>
);

const PlatformIcon = ({ platform }: { platform: string }) => (
  <div style={{
    width: 16, height: 16, borderRadius: 4,
    background: "#1e2530", display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 9, color: "#7a8490", fontWeight: 700,
  }}>
    {platform[0].toUpperCase()}
  </div>
);

/* ── Sub-components ── */

function SourceBar({ source, rocky }: { source: PitPost["source"]; rocky: PitPost["rocky"] }) {
  if (!source) return null;
  const statusColor = rocky.status === "flagged" ? "#F87171" : "#34D399";
  const statusLabel = rocky.status === "flagged" ? "FLAGGED" : rocky.status === "verified" ? "VERIFIED" : "ANALYZED";
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", fontSize: 10, color: "#7a8490" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <PlatformIcon platform={source.platform} />
        <span>shared from {PLATFORM_LABELS[source.platform]}</span>
        <span style={{ color: "#3a4048" }}>&rarr;</span>
        <span style={{ color: statusColor }}>Rocky {rocky.status}</span>
      </div>
      <div style={{
        padding: "2px 8px", borderRadius: 10, fontSize: 9, fontWeight: 700, letterSpacing: 0.5,
        color: statusColor, background: `${statusColor}15`, border: `1px solid ${statusColor}30`,
      }}>
        {statusLabel}
      </div>
    </div>
  );
}

function PhotoArea({ post }: { post: PitPost }) {
  const ratio = RATIO_MAP[post.photoRatio || "16:9"] || "16/9";
  if (post.tag === "win") {
    return (
      <div style={{
        aspectRatio: "16/9", background: "linear-gradient(135deg, #0d1219, #1a1f2e)",
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        gap: 12, padding: 20,
      }}>
        <div style={{ fontSize: 40 }}>🏆</div>
        <div style={{ color: "#FFD000", fontSize: 18, fontWeight: 700 }}>42-Day Streak!</div>
        <div style={{ display: "flex", gap: 8 }}>
          {[{ label: "STREAK", value: "42d" }, { label: "DONE", value: "126" }, { label: "AVG", value: "3/day" }].map((s) => (
            <div key={s.label} style={{
              background: "#1e2530", borderRadius: 8, padding: "8px 14px", textAlign: "center",
              border: "1px solid #2a3040",
            }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#FFD000" }}>{s.value}</div>
              <div style={{ fontSize: 8, color: "#4a5568", letterSpacing: 1, marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return (
    <div style={{
      aspectRatio: ratio,
      background: "linear-gradient(135deg, #0d1219 0%, #141a24 100%)",
      display: "flex", alignItems: "center", justifyContent: "center",
      color: "#2a3040", fontSize: 12, maxHeight: 260, overflow: "hidden",
    }}>
      <div style={{ textAlign: "center", padding: 20, color: "#3a4048" }}>
        <div style={{ fontSize: 24, marginBottom: 6 }}>{post.source?.platform === "tiktok" ? "▶" : "📷"}</div>
        <div style={{ fontSize: 10 }}>{post.source?.handle || "content"}</div>
      </div>
    </div>
  );
}

function RockyBox({ rocky }: { rocky: PitPost["rocky"] }) {
  const isFlagged = rocky.status === "flagged";
  const color = isFlagged ? "#F87171" : "#34D399";
  return (
    <div style={{
      margin: "0 12px 12px", padding: "10px 12px", borderRadius: 10,
      background: isFlagged ? "#F8717108" : "#34D39908",
      border: `1px solid ${isFlagged ? "#F8717120" : "#34D39920"}`,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
        <div style={{
          width: 16, height: 16, borderRadius: "50%", background: `${color}20`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 9, color,
        }}>
          {isFlagged ? "!" : "\u2605"}
        </div>
        <span style={{ fontSize: 10, fontWeight: 700, color, letterSpacing: 0.5 }}>ROCKY</span>
        <span style={{ fontSize: 10, color: "#7a8490", opacity: 0.47 }}>&middot; from Planet Erid</span>
      </div>
      <div style={{ fontSize: 11, color: "#7a8490", lineHeight: 1.55 }}>{rocky.summary}</div>
    </div>
  );
}

function VoteButtons() {
  return (
    <div style={{ padding: "0 12px 10px" }}>
      <div style={{ display: "flex", gap: 8 }}>
        {[
          { label: "LEGIT", color: "#34D399" },
          { label: "BS", color: "#F87171" },
          { label: "MEH", color: "#FFD000" },
        ].map((b) => (
          <button key={b.label} style={{
            flex: 1, padding: "8px 0", borderRadius: 8, border: "none", cursor: "pointer",
            background: `${b.color}1a`, color: b.color, fontSize: 11, fontWeight: 700, letterSpacing: 0.5,
          }}>
            {b.label}
          </button>
        ))}
      </div>
      <div style={{ textAlign: "center", fontSize: 9, color: "#4a5568", marginTop: 6 }}>+5 coins for correct vote</div>
    </div>
  );
}

function CardMeta({ post }: { post: PitPost }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "8px 12px 12px", fontSize: 10,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <div style={{
          width: 20, height: 20, borderRadius: "50%", background: "#1e2530",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <AnonymousAvatar />
        </div>
        <div style={{
          padding: "1px 6px", borderRadius: 6, fontSize: 8, fontWeight: 700, letterSpacing: 0.5,
          background: "#FFD00020", color: "#FFD000",
        }}>
          {post.rank}
        </div>
        {post.coins != null && (
          <span style={{ color: "#FFD000", fontSize: 9 }}>● {post.coins}</span>
        )}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, color: "#4a5568" }}>
        <span style={{ color: "#FFD000" }}>▲ {post.upvotes}</span>
        <span>💬 {post.comments}</span>
      </div>
    </div>
  );
}

function PostCard({ post }: { post: PitPost }) {
  const tagColor = TAG_COLORS[post.tag];
  return (
    <div style={{
      background: "#0d1219", borderRadius: 14, border: "1px solid #1e2530",
      overflow: "hidden",
    }}>
      {/* Tag strip */}
      <div style={{ height: 3, background: tagColor }} />

      {/* Source bar */}
      {post.source && <SourceBar source={post.source} rocky={post.rocky} />}

      {/* Photo */}
      <PhotoArea post={post} />

      {/* Body */}
      <div style={{ padding: "10px 12px 6px" }}>
        <div style={{
          display: "inline-block", padding: "2px 8px", borderRadius: 6,
          fontSize: 9, fontWeight: 700, letterSpacing: 0.5,
          color: tagColor, background: `${tagColor}26`,
          marginBottom: 6,
        }}>
          {post.tag.toUpperCase()}
        </div>
        <div style={{
          fontSize: 14, fontWeight: 600, color: "#e0e0e0", lineHeight: 1.5,
        }}>
          {post.title}
        </div>
      </div>

      {/* Rocky box */}
      <RockyBox rocky={post.rocky} />

      {/* Verify vote buttons */}
      {post.tag === "verify" && <VoteButtons />}

      {/* Meta */}
      <CardMeta post={post} />
    </div>
  );
}

function TopicStack({ posts }: { posts: PitPost[] }) {
  const main = posts[0];
  const tagColor = TAG_COLORS[main.tag];
  const flagged = posts.filter((p) => p.rocky.status === "flagged").length;
  const verified = posts.filter((p) => p.rocky.status !== "flagged").length;
  return (
    <div style={{ position: "relative" }}>
      {/* Shadow cards */}
      <div style={{
        position: "absolute", top: 12, left: 6, right: 6, bottom: -6,
        background: "#0d1219", borderRadius: 14, border: "1px solid #1e2530", opacity: 0.5,
      }} />
      <div style={{
        position: "absolute", top: 6, left: 3, right: 3, bottom: -3,
        background: "#0d1219", borderRadius: 14, border: "1px solid #1e2530", opacity: 0.7,
      }} />

      {/* Main card */}
      <div style={{
        position: "relative", background: "#0d1219", borderRadius: 14,
        border: "1px solid #1e2530", overflow: "hidden", zIndex: 1,
      }}>
        {/* Stack badge */}
        <div style={{
          position: "absolute", top: 10, right: 10, zIndex: 2,
          padding: "3px 10px", borderRadius: 8,
          background: "#FFD000", color: "#0a0a0a",
          fontSize: 10, fontWeight: 700,
        }}>
          {posts.length} posts
        </div>

        <div style={{ height: 3, background: tagColor }} />

        {/* Topic header */}
        <div style={{
          padding: "16px 12px", display: "flex", flexDirection: "column", gap: 8,
          background: "linear-gradient(135deg, #0d1219, #141a24)",
        }}>
          <div style={{
            display: "inline-block", padding: "2px 8px", borderRadius: 6,
            fontSize: 9, fontWeight: 700, letterSpacing: 0.5,
            color: tagColor, background: `${tagColor}26`, alignSelf: "flex-start",
          }}>
            TOPIC
          </div>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#e0e0e0" }}>Polyphasic Sleep</div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "#7a8490" }}>
            <span>{posts.length} people are discussing this</span>
            <div style={{ display: "flex", marginLeft: 4 }}>
              {posts.slice(0, 3).map((_, i) => (
                <div key={i} style={{
                  width: 18, height: 18, borderRadius: "50%", background: "#1e2530",
                  border: "2px solid #0d1219", marginLeft: i > 0 ? -6 : 0,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <AnonymousAvatar />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Tag breakdown */}
        <div style={{ display: "flex", gap: 6, padding: "0 12px 10px" }}>
          {flagged > 0 && (
            <div style={{
              padding: "3px 8px", borderRadius: 6, fontSize: 9, fontWeight: 700,
              color: "#F87171", background: "#F8717115",
            }}>
              {flagged} FLAGGED
            </div>
          )}
          {verified > 0 && (
            <div style={{
              padding: "3px 8px", borderRadius: 6, fontSize: 9, fontWeight: 700,
              color: "#34D399", background: "#34D39915",
            }}>
              {verified} VERIFIED
            </div>
          )}
        </div>

        {/* Rocky consensus */}
        <RockyBox rocky={{
          status: "analyzed",
          summary: "Community consensus leans skeptical. Most peer-reviewed research does not support polyphasic sleep for sustained cognitive performance.",
        }} />

        {/* Footer */}
        <div style={{
          padding: "10px 12px 14px", textAlign: "center",
          background: "#FFD00008",
        }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: "#FFD000", cursor: "pointer" }}>
            View all {posts.length} posts &rarr;
          </span>
        </div>
      </div>
    </div>
  );
}

/* ── Feed Tab ── */
function FeedTab() {
  const [activeFilter, setActiveFilter] = useState("hot");
  const filters = ["Hot", "New", "Wins", "Tips", "Questions"];

  // Group topic clusters
  const clusterIds = new Set(MOCK_POSTS.filter((p) => p.topicCluster).map((p) => p.topicCluster));
  const clusters: Record<string, PitPost[]> = {};
  clusterIds.forEach((cid) => {
    if (cid) clusters[cid] = MOCK_POSTS.filter((p) => p.topicCluster === cid);
  });
  const standalone = MOCK_POSTS.filter((p) => !p.topicCluster);

  return (
    <div>
      {/* Filter pills */}
      <div style={{
        display: "flex", gap: 8, padding: "0 0 16px", overflowX: "auto",
        scrollbarWidth: "none",
      }}>
        {filters.map((f) => {
          const key = f.toLowerCase();
          const isActive = activeFilter === key;
          return (
            <button key={key} onClick={() => setActiveFilter(key)} style={{
              padding: "6px 14px", borderRadius: 20, border: `1px solid ${isActive ? "#FFD000" : "#1e2530"}`,
              background: isActive ? "#FFD00026" : "transparent",
              color: isActive ? "#FFD000" : "#4a5568",
              fontSize: 11, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap",
              letterSpacing: 0.3,
            }}>
              {f}
            </button>
          );
        })}
      </div>

      {/* Posts */}
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        {/* Topic stacks first */}
        {Object.values(clusters).map((posts) => (
          <TopicStack key={posts[0].topicCluster} posts={posts} />
        ))}
        {/* Standalone posts */}
        {standalone.map((post) => (
          <PostCard key={post.id} post={post} />
        ))}
      </div>
    </div>
  );
}

/* ── Verify Tab ── */
function VerifyTab() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {MOCK_VERIFY_POSTS.map((vp) => (
        <div key={vp.id} style={{
          background: "#0d1219", borderRadius: 14, border: "1px solid #1e2530",
          overflow: "hidden", padding: 14,
        }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#e0e0e0", lineHeight: 1.5, marginBottom: 6 }}>
            {vp.claim}
          </div>
          <div style={{ fontSize: 10, color: "#4a5568", marginBottom: 10 }}>Source: {vp.source}</div>

          {vp.status === "resolved" && vp.consensus != null ? (
            <div style={{ marginBottom: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#7a8490", marginBottom: 4 }}>
                <span>Community consensus</span>
                <span style={{ color: "#34D399", fontWeight: 700 }}>{vp.consensus}% LEGIT</span>
              </div>
              <div style={{ height: 4, borderRadius: 2, background: "#1e2530", overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${vp.consensus}%`, background: "#34D399", borderRadius: 2 }} />
              </div>
            </div>
          ) : (
            <div>
              <div style={{ display: "flex", gap: 8, marginBottom: 6 }}>
                {[
                  { label: "LEGIT", color: "#34D399", count: vp.votes.legit },
                  { label: "BS", color: "#F87171", count: vp.votes.bs },
                  { label: "MEH", color: "#FFD000", count: vp.votes.meh },
                ].map((b) => (
                  <button key={b.label} style={{
                    flex: 1, padding: "8px 0", borderRadius: 8, border: "none", cursor: "pointer",
                    background: `${b.color}1a`, color: b.color, fontSize: 11, fontWeight: 700,
                    letterSpacing: 0.5,
                  }}>
                    {b.label} <span style={{ opacity: 0.6, fontSize: 9 }}>({b.count})</span>
                  </button>
                ))}
              </div>
              <div style={{ textAlign: "center", fontSize: 9, color: "#4a5568" }}>+5 coins for correct verification</div>
            </div>
          )}

          <div style={{
            display: "inline-block", marginTop: 8, padding: "2px 8px", borderRadius: 6,
            fontSize: 9, fontWeight: 700, letterSpacing: 0.5,
            color: vp.status === "resolved" ? "#34D399" : "#FFD000",
            background: vp.status === "resolved" ? "#34D39915" : "#FFD00015",
          }}>
            {vp.status === "resolved" ? "RESOLVED" : "PENDING"}
          </div>
          <span style={{ fontSize: 9, color: "#4a5568", marginLeft: 8 }}>+{vp.reward} coins</span>
        </div>
      ))}
    </div>
  );
}

/* ── History Tab ── */
function HistoryTab() {
  const [historyFilter, setHistoryFilter] = useState<"all" | "posted" | "flagged" | "saved">("all");
  const historyFilters: Array<"all" | "posted" | "flagged" | "saved"> = ["all", "posted", "flagged", "saved"];

  const stats = [
    { label: "POSTED", value: "24", color: "#FFD000" },
    { label: "FLAGGED", value: "7", color: "#F87171" },
    { label: "VERIFIED", value: "15", color: "#34D399" },
    { label: "COINS", value: "340", color: "#FFD000", prefix: "\u25CF " },
    { label: "UPVOTES", value: "1.2k", color: "#e0e0e0", prefix: "\u25B2 " },
    { label: "COMMENTS", value: "89", color: "#60A5FA" },
  ];

  return (
    <div>
      {/* Rocky avatar + header */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 16, gap: 6 }}>
        <div style={{
          width: 56, height: 56, borderRadius: "50%",
          background: "#34D39915", border: "2px solid #34D39940",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 22, color: "#34D399",
        }}>
          ★
        </div>
        <div style={{ fontSize: 16, fontWeight: 700, color: "#e0e0e0" }}>Your Rocky Log</div>
        <div style={{ fontSize: 11, color: "#7a8490" }}>Everything you&apos;ve shared through Rocky</div>
      </div>

      {/* Stats grid */}
      <div style={{
        display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 1,
        borderRadius: 12, overflow: "hidden", marginBottom: 16,
        background: "#1e2530",
      }}>
        {stats.map((s) => (
          <div key={s.label} style={{
            background: "#0d1219", padding: "12px 8px", textAlign: "center",
          }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: s.color }}>
              {s.prefix && <span style={{ fontSize: 10 }}>{s.prefix}</span>}
              {s.value}
            </div>
            <div style={{ fontSize: 8, color: "#4a5568", letterSpacing: 1, marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div style={{ display: "flex", gap: 0, marginBottom: 16, borderBottom: "1px solid #1e2530" }}>
        {historyFilters.map((f) => {
          const isActive = historyFilter === f;
          return (
            <button key={f} onClick={() => setHistoryFilter(f)} style={{
              flex: 1, padding: "8px 0", border: "none", cursor: "pointer",
              background: "transparent", color: isActive ? "#FFD000" : "#3a4048",
              fontSize: 11, fontWeight: 700, letterSpacing: 0.5,
              borderBottom: isActive ? "2px solid #FFD000" : "2px solid transparent",
              textTransform: "uppercase",
            }}>
              {f}
            </button>
          );
        })}
      </div>

      {/* Grid */}
      <div style={{
        display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 3,
      }}>
        {MOCK_HISTORY.map((item) => (
          <div key={item.id} style={{
            aspectRatio: "1/1", background: "linear-gradient(135deg, #0d1219, #141a24)",
            borderRadius: 8, position: "relative", overflow: "hidden", padding: 8,
            display: "flex", flexDirection: "column", justifyContent: "space-between",
            cursor: "pointer",
          }}>
            {/* Status dot */}
            <div style={{
              position: "absolute", top: 6, right: 6,
              width: 6, height: 6, borderRadius: "50%",
              background: item.status === "verified" ? "#34D399" : "#F87171",
            }} />

            {/* Mode badge */}
            <div style={{
              alignSelf: "flex-start",
              padding: "1px 5px", borderRadius: 4,
              fontSize: 7, fontWeight: 700, letterSpacing: 0.5,
              color: MODE_COLORS[item.mode], background: `${MODE_COLORS[item.mode]}20`,
            }}>
              {item.mode}
            </div>

            {/* Preview */}
            <div style={{
              fontSize: 9, color: "#7a8490", lineHeight: 1.3,
              overflow: "hidden", display: "-webkit-box",
              WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
            } as React.CSSProperties}>
              {item.preview}
            </div>

            {/* Engagement */}
            <div style={{ display: "flex", gap: 6, fontSize: 8, color: "#4a5568" }}>
              <span>▲ {item.upvotes}</span>
              <span>💬 {item.comments}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Main Component ── */
export default function PitTab() {
  const [activeSubTab, setActiveSubTab] = useState<"feed" | "verify" | "history">("feed");
  const subTabs: Array<"feed" | "verify" | "history"> = ["feed", "verify", "history"];

  return (
    <div style={{
      minHeight: "100dvh", background: "var(--bg, #080B11)",
      paddingBottom: 120,
    }}>
      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "16px 16px 0",
      }}>
        <div style={{ fontSize: 22, fontWeight: 800, color: "#e0e0e0", letterSpacing: -0.5 }}>Pit</div>
        <button style={{
          padding: "6px 14px", borderRadius: 20, border: "none", cursor: "pointer",
          background: "#FFD000", color: "#0a0a0a",
          fontSize: 11, fontWeight: 700, letterSpacing: 0.3,
          display: "flex", alignItems: "center", gap: 4,
        }}>
          ↗ SHARE
        </button>
      </div>

      {/* Sub-tab bar */}
      <div style={{
        display: "flex", gap: 0, margin: "12px 16px 16px",
        borderBottom: "1px solid #1e2530",
      }}>
        {subTabs.map((tab) => {
          const isActive = activeSubTab === tab;
          return (
            <button key={tab} onClick={() => setActiveSubTab(tab)} style={{
              flex: 1, padding: "10px 0", border: "none", cursor: "pointer",
              background: "transparent", color: isActive ? "#FFD000" : "#3a4048",
              fontSize: 12, fontWeight: 700, letterSpacing: 1,
              borderBottom: isActive ? "2px solid #FFD000" : "2px solid transparent",
              textTransform: "uppercase",
            }}>
              {tab}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div style={{ padding: "0 16px" }}>
        {activeSubTab === "feed" && <FeedTab />}
        {activeSubTab === "verify" && <VerifyTab />}
        {activeSubTab === "history" && <HistoryTab />}
      </div>
    </div>
  );
}
