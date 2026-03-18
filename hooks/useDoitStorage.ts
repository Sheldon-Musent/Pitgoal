"use client";

import { useState, useEffect, useCallback } from "react";

interface DoitData {
  completed: Record<string, boolean>;
  notes: Record<string, string>;
  activePhase: string;
  activeTab: string;
}

const STORAGE_KEY = "doit-v1";

const DEFAULT_DATA: DoitData = {
  completed: {},
  notes: {},
  activePhase: "phase1",
  activeTab: "mission",
};

export function useDoitStorage() {
  const [data, setData] = useState<DoitData>(DEFAULT_DATA);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        setData({ ...DEFAULT_DATA, ...parsed });
      }
    } catch (e) {
      console.log("No saved data yet");
    }
    setLoaded(true);
  }, []);

  const save = useCallback((updates: Partial<DoitData>) => {
    setSaving(true);
    setData((prev) => {
      const next = { ...prev, ...updates };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch (e) {
        console.error("Save failed:", e);
      }
      return next;
    });
    setTimeout(() => setSaving(false), 600);
  }, []);

  const toggleGoal = useCallback(
    (goalId: string) => {
      const next = { ...data.completed, [goalId]: !data.completed[goalId] };
      save({ completed: next });
    },
    [data.completed, save]
  );

  const saveNote = useCallback(
    (goalId: string, text: string) => {
      const next = { ...data.notes, [goalId]: text };
      save({ notes: next });
    },
    [data.notes, save]
  );

  const setActivePhase = useCallback(
    (phaseId: string) => save({ activePhase: phaseId }),
    [save]
  );

  const setActiveTab = useCallback(
    (tab: string) => save({ activeTab: tab }),
    [save]
  );

  return {
    ...data,
    loaded,
    saving,
    toggleGoal,
    saveNote,
    setActivePhase,
    setActiveTab,
  };
}
