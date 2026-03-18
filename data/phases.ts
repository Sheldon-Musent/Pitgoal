export type GoalType = "learning" | "career" | "finance";

export interface Goal {
  id: string;
  text: string;
  type: GoalType;
}

export interface Phase {
  id: string;
  title: string;
  period: string;
  icon: string;
  color: string;
  description: string;
  goals: Goal[];
}

export const PHASES: Phase[] = [
  {
    id: "phase1",
    title: "Pre-Piscine Prep",
    period: "Mar – Jun 2026",
    icon: "◈",
    color: "#00ff9f",
    description: "Build foundation while keeping current job",
    goals: [
      { id: "p1g1", text: "Watch Professor Messer Security+ (YouTube) — full playlist", type: "learning" },
      { id: "p1g2", text: "Create TryHackMe account & complete Pre Security path", type: "learning" },
      { id: "p1g3", text: "Complete TryHackMe Intro to Cyber Security path", type: "learning" },
      { id: "p1g4", text: "Learn basic Linux commands (42 KL prep)", type: "learning" },
      { id: "p1g5", text: "Practice C basics — variables, loops, pointers", type: "learning" },
      { id: "p1g6", text: "Set up emergency fund (3 months expenses)", type: "finance" },
      { id: "p1g7", text: "Read 42 KL Piscine survival guides & tips", type: "career" },
    ],
  },
  {
    id: "phase2",
    title: "The Piscine",
    period: "Jun – Jul 2026",
    icon: "⬡",
    color: "#00d4ff",
    description: "Go all in — this IS your cybersecurity foundation",
    goals: [
      { id: "p2g1", text: "Survive & pass the Piscine", type: "career" },
      { id: "p2g2", text: "Master C programming fundamentals", type: "learning" },
      { id: "p2g3", text: "Learn shell scripting basics", type: "learning" },
      { id: "p2g4", text: "Build peer network at 42 KL", type: "career" },
      { id: "p2g5", text: "Complete all Piscine projects on time", type: "learning" },
    ],
  },
  {
    id: "phase3",
    title: "Cadet + Security+",
    period: "Jul – Dec 2026",
    icon: "△",
    color: "#a78bfa",
    description: "42 projects by day, Security+ study by night",
    goals: [
      { id: "p3g1", text: "Begin 42 KL Cadet projects (networking, sysadmin)", type: "learning" },
      { id: "p3g2", text: "Start CompTIA Security+ study (SY0-701)", type: "learning" },
      { id: "p3g3", text: "Complete TryHackMe SOC Level 1 path", type: "learning" },
      { id: "p3g4", text: "Join HackTheBox — complete 5 beginner machines", type: "learning" },
      { id: "p3g5", text: "Schedule Security+ exam (target: Oct/Nov 2026)", type: "career" },
      { id: "p3g6", text: "Pass CompTIA Security+ exam", type: "career" },
      { id: "p3g7", text: "Update LinkedIn with 42 KL + Security+ credentials", type: "career" },
    ],
  },
  {
    id: "phase4",
    title: "First Security Role",
    period: "Early 2027",
    icon: "◇",
    color: "#f472b6",
    description: "Land SOC Analyst or Security Awareness role — RM4k-6k",
    goals: [
      { id: "p4g1", text: "Build cybersecurity portfolio (write-ups, CTF results)", type: "career" },
      { id: "p4g2", text: "Apply to SOC Analyst L1 roles (Cyberjaya, KL, remote)", type: "career" },
      { id: "p4g3", text: "Apply to Security Awareness / GRC entry roles", type: "career" },
      { id: "p4g4", text: "Attend cybersecurity meetups / conferences in MY", type: "career" },
      { id: "p4g5", text: "Land first cybersecurity job — target RM4,000-6,000/mo", type: "finance" },
      { id: "p4g6", text: "Start studying for CEH or CySA+", type: "learning" },
    ],
  },
  {
    id: "phase5",
    title: "Level Up",
    period: "Mid 2027 – 2028",
    icon: "⬢",
    color: "#fb923c",
    description: "Second cert + remote international work — RM6k-25k",
    goals: [
      { id: "p5g1", text: "Pass CEH or CySA+ certification", type: "career" },
      { id: "p5g2", text: "Reach 1 year cybersecurity experience", type: "career" },
      { id: "p5g3", text: "Apply for remote roles (SG/US/EU companies)", type: "career" },
      { id: "p5g4", text: "Explore GRC / Security Sales Engineer paths", type: "career" },
      { id: "p5g5", text: "Hit RM10,000+/month income", type: "finance" },
      { id: "p5g6", text: "Start planning CISSP (needs 5yr experience)", type: "learning" },
      { id: "p5g7", text: "Build Fiveteenmove into side revenue stream", type: "finance" },
    ],
  },
];

export const TYPE_LABELS: Record<GoalType, string> = {
  learning: "LEARN",
  career: "CAREER",
  finance: "FINANCE",
};

export const TYPE_COLORS: Record<GoalType, string> = {
  learning: "#00d4ff",
  career: "#00ff9f",
  finance: "#fb923c",
};

export const INCOME_MILESTONES = [
  { label: "RM4-6K", desc: "SOC Analyst L1", color: "#00ff9f" },
  { label: "RM6-9K", desc: "+CEH/CySA+", color: "#00d4ff" },
  { label: "RM10-15K", desc: "Remote SG/US", color: "#a78bfa" },
  { label: "RM15-25K+", desc: "GRC / Sales Eng", color: "#fb923c" },
];
