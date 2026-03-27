"use client";
import { useState, useRef, useEffect } from "react";

// TODO: Replace with Supabase real-time data
const FRIENDS = [
  {
    id: 1, name: "Siti", initial: "S", color: "#f472b6", online: true,
    status: "studying C", energy: 85, streak: 6, doneToday: 3, unread: 2,
    lastTime: "now", hasStory: true, storySeen: false,
    storyText: "Just completed TryHackMe SOC room!", storyTime: "2h ago",
    group: false, members: 0,
  },
  {
    id: 2, name: "Amir", initial: "A", color: "#fb923c", online: true,
    status: "reviewing code", energy: 72, streak: 12, doneToday: 5, unread: 0,
    lastTime: "2:30 PM", hasStory: true, storySeen: false,
    storyText: "12 day streak!", storyTime: "4h ago",
    group: false, members: 0,
  },
  {
    id: 3, name: "Piscine Squad", initial: "P", color: "#a78bfa", online: false,
    status: "", energy: 0, streak: 0, doneToday: 0, unread: 5,
    lastTime: "1:15 PM", hasStory: false, storySeen: false,
    storyText: "", storyTime: "",
    group: true, members: 8,
  },
  {
    id: 4, name: "Daniel", initial: "D", color: "#00d4ff", online: false,
    status: "", energy: 91, streak: 8, doneToday: 2, unread: 0,
    lastTime: "Yesterday", hasStory: false, storySeen: false,
    storyText: "", storyTime: "",
    group: false, members: 0,
  },
  {
    id: 5, name: "Wei Lin", initial: "W", color: "#2ECDA7", online: false,
    status: "", energy: 65, streak: 3, doneToday: 1, unread: 0,
    lastTime: "Yesterday", hasStory: true, storySeen: true,
    storyText: "Energy dropped to 65%", storyTime: "8h ago",
    group: false, members: 0,
  },
];

// TODO: Replace with Supabase real-time messages
const INITIAL_MESSAGES: Record<number, any[]> = {
  1: [
    { id: 1, from: "them", text: "Hey! Have you started the C module yet?", time: "10:02 AM" },
    { id: 2, from: "me", text: "Yeah just finished ft_printf", time: "10:05 AM" },
    { id: 3, from: "them", text: "Nice! I'm still on get_next_line", time: "10:06 AM" },
    { id: 4, from: "me", text: "Want to pair on it later?", time: "10:08 AM" },
    { id: 5, from: "them", text: "Yes please!", time: "10:09 AM" },
    { id: 6, from: "them", type: "collab", text: "Collab: get_next_line review", desc: "Let's review each other's GNL implementation", time: "10:12 AM" },
  ],
  2: [
    { id: 1, from: "them", text: "Can you review my push_swap?", time: "9:30 AM" },
    { id: 2, from: "me", text: "Sure, send the repo link", time: "9:35 AM" },
    { id: 3, from: "them", text: "github.com/amir/push_swap", time: "9:36 AM" },
    { id: 4, from: "me", text: "Looks clean, left some comments on the sorting algo", time: "11:00 AM" },
  ],
  3: [
    { id: 1, from: "Rina", text: "Everyone ready for the exam?", time: "12:45 PM" },
    { id: 2, from: "Haziq", text: "Still grinding ft_printf lol", time: "12:50 PM" },
    { id: 3, from: "me", text: "I think we should do a mock exam tonight", time: "12:55 PM" },
    { id: 4, from: "Alia", text: "Count me in!", time: "1:00 PM" },
    { id: 5, from: "Rina", text: "Let's meet at 9pm in the lab", time: "1:15 PM" },
  ],
  4: [
    { id: 1, from: "me", text: "How's Security+ prep going?", time: "Yesterday" },
    { id: 2, from: "them", text: "Almost done with network security domain", time: "Yesterday" },
    { id: 3, from: "me", text: "Nice, lmk if you want to quiz each other", time: "Yesterday" },
  ],
  5: [
    { id: 1, from: "them", text: "Is the piscine really 26 days straight?", time: "Yesterday" },
    { id: 2, from: "me", text: "Yeah but it's worth it, trust the process", time: "Yesterday" },
    { id: 3, from: "them", text: "Okay I'm committing. Starting next month", time: "Yesterday" },
  ],
};

export default function FriendsTab() {
  const [view, setView] = useState<"list" | "chat" | "profile">("list");
  const [activeChat, setActiveChat] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "unread" | "groups">("all");
  const [messages, setMessages] = useState<Record<number, any[]>>({});
  const [msgInput, setMsgInput] = useState("");
  const [storyViewing, setStoryViewing] = useState<any>(null);
  const [storyProgress, setStoryProgress] = useState(0);
  const [friendsData, setFriendsData] = useState(FRIENDS);
  const [myStoryOpen, setMyStoryOpen] = useState(false);
  const msgEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMessages(INITIAL_MESSAGES);
  }, []);

  useEffect(() => {
    if (msgEndRef.current) {
      msgEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, activeChat]);

  // Story progress timer
  useEffect(() => {
    if (!storyViewing) { setStoryProgress(0); return; }
    const interval = setInterval(() => {
      setStoryProgress(p => {
        if (p >= 100) {
          clearInterval(interval);
          setStoryViewing(null);
          return 0;
        }
        return p + 2;
      });
    }, 100);
    return () => clearInterval(interval);
  }, [storyViewing]);

  // Mark story as seen
  useEffect(() => {
    if (storyViewing) {
      setFriendsData(prev => prev.map(f => f.id === storyViewing.id ? { ...f, storySeen: true } : f));
    }
  }, [storyViewing]);

  const openChat = (friend: any) => {
    setActiveChat(friend);
    setView("chat");
    // Clear unread
    setFriendsData(prev => prev.map(f => f.id === friend.id ? { ...f, unread: 0 } : f));
  };

  const sendMessage = () => {
    if (!msgInput.trim() || !activeChat) return;
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    setMessages(prev => ({
      ...prev,
      [activeChat.id]: [
        ...(prev[activeChat.id] || []),
        { id: Date.now(), from: "me", text: msgInput.trim(), time: timeStr },
      ],
    }));
    setMsgInput("");
  };

  const getLastMessage = (friendId: number) => {
    const msgs = messages[friendId];
    if (!msgs || msgs.length === 0) return "";
    const last = msgs[msgs.length - 1];
    if (last.type === "collab") return "Sent a collab invite";
    const friend = friendsData.find(f => f.id === friendId);
    if (last.from === "me") return `You: ${last.text}`;
    if (friend?.group && last.from !== "them") return `${last.from}: ${last.text}`;
    return last.text;
  };

  // Stories sorted: hasStory unseen first, then seen, then no story
  const storyFriends = [...friendsData]
    .filter(f => f.hasStory)
    .sort((a, b) => (a.storySeen === b.storySeen ? 0 : a.storySeen ? 1 : -1));

  // Filtered chat list
  const filteredChats = friendsData.filter(f => {
    if (searchQuery && !f.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (activeTab === "unread" && f.unread === 0) return false;
    if (activeTab === "groups" && !f.group) return false;
    return true;
  });

  const energyColor = (e: number) => e > 80 ? "#2ECDA7" : e > 50 ? "var(--accent)" : "var(--danger, #ef4444)";

  // ─── STORY VIEWER ───
  if (storyViewing) {
    return (
      <div style={{ position: "absolute", inset: 0, background: "var(--bg, #0a0a0a)", zIndex: 10, display: "flex", flexDirection: "column" }}>
        {/* Progress bar */}
        <div style={{ padding: "8px 12px 0" }}>
          <div style={{ height: 2, background: "rgba(255,255,255,0.15)", borderRadius: 1 }}>
            <div style={{ height: "100%", background: "#fff", borderRadius: 1, width: `${storyProgress}%`, transition: "width 0.1s linear" }} />
          </div>
        </div>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px" }}>
          <div style={{ width: 36, height: 36, borderRadius: "50%", background: `${storyViewing.color}22`, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: storyViewing.color }}>{storyViewing.initial}</span>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: "var(--t1)" }}>{storyViewing.name}</div>
            <div style={{ fontSize: 10, color: "var(--t4)", fontFamily: "monospace" }}>{storyViewing.storyTime}</div>
          </div>
          <div onClick={() => setStoryViewing(null)} style={{ width: 36, height: 36, borderRadius: "50%", background: "rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--t3)" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </div>
        </div>

        {/* Story content */}
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 24px" }}>
          <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 20, padding: "28px 24px", textAlign: "center", width: "100%", maxWidth: 320 }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>
              {storyViewing.storyText.includes("completed") ? "✓" : storyViewing.storyText.includes("streak") ? "⚡" : "●"}
            </div>
            <div style={{ fontSize: 18, fontWeight: 700, color: "var(--t1)", lineHeight: 1.4 }}>{storyViewing.storyText}</div>
            <div style={{ fontSize: 12, color: "var(--t4)", fontFamily: "monospace", marginTop: 8 }}>{storyViewing.storyTime}</div>
          </div>
        </div>

        {/* Reply input */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px 24px" }}>
          <input
            placeholder="Reply..."
            style={{ flex: 1, background: "var(--card)", border: "1px solid var(--border)", borderRadius: 50, padding: "10px 16px", color: "var(--t2)", fontSize: 14, outline: "none" }}
          />
          <div style={{ width: 40, height: 40, borderRadius: "50%", background: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0a0a0a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>
          </div>
        </div>
      </div>
    );
  }

  // ─── MY STORY PROMPT ───
  if (myStoryOpen) {
    return (
      <div style={{ position: "absolute", inset: 0, background: "var(--bg, #0a0a0a)", zIndex: 10, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <div onClick={() => setMyStoryOpen(false)} style={{ position: "absolute", top: 16, right: 16, width: 36, height: 36, borderRadius: "50%", background: "rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--t3)" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
        </div>
        <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 20, padding: "32px 24px", textAlign: "center", maxWidth: 300 }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>📸</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: "var(--t1)", marginBottom: 8 }}>Share your progress</div>
          <div style={{ fontSize: 13, color: "var(--t4)", marginBottom: 20 }}>Your achievements auto-generate stories for friends to see</div>
          <div style={{ display: "inline-block", padding: "10px 24px", background: "var(--accent)", color: "#0a0a0a", borderRadius: 50, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Share now</div>
        </div>
      </div>
    );
  }

  // ─── PROFILE VIEW ───
  if (view === "profile" && activeChat && !activeChat.group) {
    return (
      <div style={{ position: "absolute", inset: 0, background: "var(--bg, #0a0a0a)", display: "flex", flexDirection: "column", transition: "transform 0.3s ease" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "16px" }}>
          <div onClick={() => setView("chat")} style={{ width: 36, height: 36, borderRadius: "50%", background: "var(--card)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--t3)" strokeWidth="2" strokeLinecap="round"><polyline points="15 18 9 12 15 6" /></svg>
          </div>
          <span style={{ fontSize: 16, fontWeight: 600, color: "var(--t1)" }}>Profile</span>
        </div>

        {/* Content */}
        <div style={{ padding: "28px 20px", display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
          <div style={{ width: 80, height: 80, borderRadius: "50%", background: `${activeChat.color}22`, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontSize: 28, fontWeight: 700, color: activeChat.color }}>{activeChat.initial}</span>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 20, fontWeight: 700, color: "var(--t1)" }}>{activeChat.name}</div>
            <div style={{ fontSize: 12, color: "var(--t4)", fontFamily: "monospace", marginTop: 4 }}>
              {activeChat.online ? `Online — ${activeChat.status}` : "Offline"}
            </div>
          </div>

          {/* Stats */}
          <div style={{ display: "flex", gap: 10, width: "100%", marginTop: 8 }}>
            {[
              { label: "STREAK", value: `${activeChat.streak}d`, color: "var(--accent)" },
              { label: "TODAY", value: activeChat.doneToday, color: "var(--t1)" },
              { label: "ENERGY", value: `${activeChat.energy}%`, color: energyColor(activeChat.energy) },
            ].map(s => (
              <div key={s.label} style={{ flex: 1, background: "var(--card)", border: "1px solid var(--border)", borderRadius: 14, padding: "14px 8px", textAlign: "center" }}>
                <div style={{ fontSize: 20, fontWeight: 700, color: s.color }}>{s.value}</div>
                <div style={{ fontSize: 9, color: "var(--t4)", fontFamily: "monospace", marginTop: 4, letterSpacing: 1 }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div style={{ display: "flex", gap: 10, width: "100%", marginTop: 8 }}>
            <div style={{ flex: 1, padding: "12px 0", background: "var(--accent)", color: "#0a0a0a", borderRadius: 50, textAlign: "center", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Send collab</div>
            <div style={{ flex: 1, padding: "12px 0", background: "var(--card)", color: "var(--t3)", border: "1px solid var(--border)", borderRadius: 50, textAlign: "center", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Mute</div>
          </div>

          {/* Shared collabs */}
          <div style={{ width: "100%", marginTop: 16 }}>
            <div style={{ fontSize: 10, color: "var(--t5)", fontFamily: "monospace", letterSpacing: 1, marginBottom: 10 }}>SHARED COLLABS</div>
            <div style={{ background: "var(--card)", border: "1px dashed var(--border)", borderRadius: 14, padding: 20, textAlign: "center" }}>
              <div style={{ fontSize: 13, color: "var(--t5)" }}>No shared collabs yet</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── CHAT VIEW ───
  if (view === "chat" && activeChat) {
    const chatMsgs = messages[activeChat.id] || [];
    return (
      <div style={{ position: "absolute", inset: 0, background: "var(--bg, #0a0a0a)", display: "flex", flexDirection: "column", transition: "transform 0.3s ease" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "16px 16px 12px", borderBottom: "1px solid var(--border)" }}>
          <div onClick={() => setView("list")} style={{ width: 36, height: 36, borderRadius: "50%", background: "var(--card)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--t3)" strokeWidth="2" strokeLinecap="round"><polyline points="15 18 9 12 15 6" /></svg>
          </div>
          <div
            onClick={() => { if (!activeChat.group) setView("profile"); }}
            style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, cursor: activeChat.group ? "default" : "pointer" }}
          >
            <div style={{ width: 40, height: 40, borderRadius: "50%", background: `${activeChat.color}22`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, position: "relative" }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: activeChat.color }}>{activeChat.initial}</span>
              {activeChat.online && (
                <div style={{ position: "absolute", bottom: 0, right: 0, width: 10, height: 10, borderRadius: "50%", background: "#2ECDA7", border: "2px solid var(--bg, #0a0a0a)" }} />
              )}
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 600, color: "var(--t1)" }}>{activeChat.name}</div>
              <div style={{ fontSize: 11, color: "var(--t4)", fontFamily: "monospace" }}>
                {activeChat.group
                  ? `${activeChat.members} members`
                  : activeChat.online
                    ? `Online — ${activeChat.status}`
                    : `last seen ${activeChat.lastTime}`
                }
              </div>
            </div>
          </div>
          <div style={{ width: 36, height: 36, borderRadius: "50%", background: "var(--card)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--t4)" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="5" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="12" cy="19" r="1" /></svg>
          </div>
        </div>

        {/* Messages */}
        <div className="no-scrollbar" style={{ flex: 1, overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 6 }}>
          {chatMsgs.map(msg => {
            const isMe = msg.from === "me";
            const isCollab = msg.type === "collab";
            // Group message sender color
            const senderFriend = activeChat.group && !isMe ? friendsData.find(f => f.name === msg.from) : null;
            const senderColor = senderFriend?.color || "#a78bfa";

            if (isCollab) {
              return (
                <div key={msg.id} style={{ maxWidth: "78%", alignSelf: isMe ? "flex-end" : "flex-start" }}>
                  <div style={{ background: "rgba(255,208,0,0.06)", border: "1px solid rgba(255,208,0,0.15)", borderRadius: 14, padding: 12 }}>
                    <div style={{ fontSize: 12, color: "var(--accent)", fontWeight: 600, marginBottom: 4 }}>{msg.text}</div>
                    <div style={{ fontSize: 12, color: "var(--t3)", marginBottom: 8 }}>{msg.desc}</div>
                    <span style={{ display: "inline-block", padding: "6px 14px", background: "var(--accent)", color: "#0a0a0a", borderRadius: 50, fontSize: 11, fontWeight: 700, cursor: "pointer" }}>Accept collab</span>
                  </div>
                  <div style={{ fontSize: 10, color: "var(--t5)", fontFamily: "monospace", marginTop: 3, textAlign: isMe ? "right" : "left" }}>{msg.time}</div>
                </div>
              );
            }

            return (
              <div key={msg.id} style={{ maxWidth: "78%", alignSelf: isMe ? "flex-end" : "flex-start", display: "flex", flexDirection: "column" }}>
                {activeChat.group && !isMe && (
                  <div style={{ fontSize: 11, fontWeight: 600, color: senderColor, marginBottom: 2, paddingLeft: 12 }}>{msg.from}</div>
                )}
                <div style={{
                  padding: "10px 14px",
                  borderRadius: isMe ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                  background: isMe ? "var(--accent)" : "var(--card)",
                  color: isMe ? "#0a0a0a" : "var(--t2)",
                }}>
                  <div style={{ fontSize: 14, lineHeight: 1.45 }}>{msg.text}</div>
                </div>
                <div style={{ fontSize: 10, color: "var(--t5)", fontFamily: "monospace", marginTop: 3, textAlign: isMe ? "right" : "left" }}>{msg.time}</div>
              </div>
            );
          })}
          <div ref={msgEndRef} />
        </div>

        {/* Input bar */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px 24px", borderTop: "1px solid var(--border)" }}>
          <div style={{ width: 36, height: 36, borderRadius: "50%", background: "var(--card)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--t4)" strokeWidth="2" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
          </div>
          <input
            value={msgInput}
            onChange={e => setMsgInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") sendMessage(); }}
            placeholder="Message..."
            style={{ flex: 1, background: "var(--card)", border: "1px solid var(--border)", borderRadius: 50, padding: "10px 16px", color: "var(--t2)", fontSize: 14, outline: "none" }}
          />
          <div onClick={sendMessage} style={{ width: 40, height: 40, borderRadius: "50%", background: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0a0a0a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>
          </div>
        </div>
      </div>
    );
  }

  // ─── LIST VIEW ───
  return (
    <div style={{ position: "absolute", inset: 0, background: "var(--bg, #0a0a0a)", display: "flex", flexDirection: "column", transition: "transform 0.3s ease" }}>
      {/* Search bar */}
      <div style={{ padding: "16px 16px 0" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, borderBottom: "1px solid var(--border)", paddingBottom: 12 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--t5)" strokeWidth="2" strokeLinecap="round">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search..."
            style={{ flex: 1, background: "none", border: "none", color: "var(--t2)", fontSize: 15, outline: "none" }}
          />
        </div>
      </div>

      {/* Stories row */}
      <div className="no-scrollbar" style={{ display: "flex", gap: 14, padding: "14px 16px", overflowX: "auto", borderBottom: "1px solid var(--border)", WebkitOverflowScrolling: "touch" as any }}>
        {/* My story */}
        <div onClick={() => setMyStoryOpen(true)} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, cursor: "pointer", flexShrink: 0 }}>
          <div style={{ width: 52, height: 52, borderRadius: "50%", border: "2px dashed var(--t5)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
          </div>
          <span style={{ fontSize: 10, color: "var(--accent)", maxWidth: 52, textAlign: "center", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>My story</span>
        </div>
        {/* Friend stories */}
        {storyFriends.map(f => (
          <div key={f.id} onClick={() => setStoryViewing(f)} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, cursor: "pointer", flexShrink: 0 }}>
            <div style={{ width: 52, height: 52, borderRadius: "50%", border: `2px solid ${f.storySeen ? "var(--border2, #2a2a2a)" : "var(--accent)"}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div style={{ width: 44, height: 44, borderRadius: "50%", background: `${f.color}22`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ fontSize: 16, fontWeight: 700, color: f.color }}>{f.initial}</span>
              </div>
            </div>
            <span style={{ fontSize: 10, color: "var(--t4)", maxWidth: 52, textAlign: "center", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.name}</span>
          </div>
        ))}
      </div>

      {/* Tab pills */}
      <div style={{ display: "flex", gap: 6, padding: "10px 16px" }}>
        {(["all", "unread", "groups"] as const).map(tab => (
          <div
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              borderRadius: 50,
              padding: "7px 16px",
              fontSize: 12,
              fontWeight: activeTab === tab ? 700 : 600,
              background: activeTab === tab ? "var(--accent)" : "transparent",
              color: activeTab === tab ? "#0a0a0a" : "var(--t4)",
              cursor: "pointer",
              textTransform: "capitalize",
            }}
          >
            {tab === "all" ? "All" : tab === "unread" ? "Unread" : "Groups"}
          </div>
        ))}
      </div>

      {/* Chat list */}
      <div className="no-scrollbar" style={{ flex: 1, overflowY: "auto", overflowX: "hidden", minHeight: 0, paddingBottom: 120 }}>
        {filteredChats.length === 0 && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "48px 20px", gap: 8 }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--t5)" strokeWidth="1.5" strokeLinecap="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
            <div style={{ fontSize: 14, color: "var(--t4)" }}>No chats found</div>
          </div>
        )}
        {filteredChats.map((f, i) => (
          <div key={f.id}>
            <div
              onClick={() => openChat(f)}
              style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 16px", cursor: "pointer" }}
              onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,208,0,0.04)")}
              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
            >
              {/* Avatar */}
              <div style={{ width: 52, height: 52, borderRadius: "50%", background: `${f.color}22`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, position: "relative" }}>
                <span style={{ fontSize: 18, fontWeight: 700, color: f.color }}>{f.initial}</span>
                {f.online && (
                  <div style={{ position: "absolute", bottom: 2, right: 2, width: 12, height: 12, borderRadius: "50%", background: "#2ECDA7", border: "2px solid var(--bg, #0a0a0a)" }} />
                )}
              </div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 15, fontWeight: 600, color: "var(--t1)" }}>{f.name}</span>
                  {f.online && f.status && !f.group && (
                    <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <span style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--accent)", display: "inline-block" }} />
                      <span style={{ fontSize: 10, color: "var(--accent)", fontFamily: "monospace" }}>{f.status}</span>
                    </span>
                  )}
                  {f.group && (
                    <span style={{ fontSize: 10, color: "var(--t4)", fontFamily: "monospace" }}>{f.members} members</span>
                  )}
                </div>
                <div style={{ fontSize: 13, color: "var(--t4)", marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {getLastMessage(f.id) || "No messages yet"}
                </div>
              </div>

              {/* Meta */}
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, flexShrink: 0 }}>
                <span style={{ fontSize: 11, color: "var(--t5)", fontFamily: "monospace" }}>{f.lastTime}</span>
                {f.unread > 0 && (
                  <div style={{ minWidth: 20, height: 20, borderRadius: 10, background: "var(--accent)", color: "#0a0a0a", fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 6px" }}>
                    {f.unread}
                  </div>
                )}
              </div>
            </div>
            {i < filteredChats.length - 1 && (
              <div style={{ height: 1, background: "var(--border)", margin: "0 16px" }} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
