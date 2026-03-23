import { supabase } from './supabase';

// ─── AUTH ───────────────────────────────────────────────
// Signs in anonymously on first visit. Returns user UUID.
// If already signed in, returns existing session.

export async function ensureAuth(): Promise<string | null> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user?.id) return session.user.id;

    // No session — sign in anonymously
    const { data, error } = await supabase.auth.signInAnonymously();
    if (error) throw error;
    return data.user?.id ?? null;
  } catch (e) {
    console.warn('[sync] Auth failed, running offline:', e);
    return null;
  }
}

// ─── SYNC QUEUE ─────────────────────────────────────────
// When offline, changes queue here and retry when back online

const QUEUE_KEY = 'pitgoal-sync-queue';

interface QueueItem {
  table: string;
  operation: 'upsert' | 'delete';
  data: any;
  timestamp: number;
}

function getQueue(): QueueItem[] {
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
  } catch { return []; }
}

function addToQueue(item: QueueItem) {
  const queue = getQueue();
  queue.push(item);
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

function clearQueue() {
  localStorage.removeItem(QUEUE_KEY);
}

async function flushQueue() {
  const queue = getQueue();
  if (!queue.length) return;

  const failed: QueueItem[] = [];
  for (const item of queue) {
    try {
      if (item.operation === 'upsert') {
        const { error } = await supabase.from(item.table).upsert(item.data);
        if (error) throw error;
      } else if (item.operation === 'delete') {
        const { error } = await supabase.from(item.table).delete().eq('id', item.data.id);
        if (error) throw error;
      }
    } catch {
      failed.push(item);
    }
  }

  if (failed.length) {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(failed));
  } else {
    clearQueue();
  }
}

// Retry queue when back online
if (typeof window !== 'undefined') {
  window.addEventListener('online', flushQueue);
}

// ─── PROFILE / SETTINGS ────────────────────────────────

export async function loadProfile(userId: string) {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    if (error) throw error;
    return data;
  } catch {
    return null;
  }
}

export async function saveProfile(userId: string, settings: Record<string, any>) {
  const payload = { id: userId, ...settings, updated_at: new Date().toISOString() };

  try {
    const { error } = await supabase.from('profiles').upsert(payload);
    if (error) throw error;
  } catch {
    addToQueue({ table: 'profiles', operation: 'upsert', data: payload, timestamp: Date.now() });
  }
}

// ─── TASKS ──────────────────────────────────────────────

export async function loadTasks(userId: string, date: string) {
  try {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', userId)
      .eq('date', date)
      .order('sort_order');
    if (error) throw error;
    return data;
  } catch {
    return null; // caller falls back to localStorage
  }
}

export async function syncTask(userId: string, task: any) {
  const payload = {
    ...task,
    user_id: userId,
    updated_at: new Date().toISOString(),
  };

  try {
    const { error } = await supabase.from('tasks').upsert(payload);
    if (error) throw error;
  } catch {
    addToQueue({ table: 'tasks', operation: 'upsert', data: payload, timestamp: Date.now() });
  }
}

export async function syncAllTasks(userId: string, tasks: any[], date: string) {
  const payloads = tasks.map((t, i) => ({
    id: t.id,
    user_id: userId,
    name: t.name,
    category: t.category || 'task',
    type: t.type || 'work',
    urgent: t.urgent || false,
    date,
    scheduled_time: t.timeMin,
    adjusted_time: t.adjustedTimeMin ?? null,
    sort_order: i,
    planned_duration: t.planned_duration || t.duration,
    actual_duration: t.actual_duration ?? null,
    status: t.status || 'pending',
    started_at: t.startedAt ? new Date(t.startedAt).toISOString() : null,
    completed_at: t.completedAt ? new Date(t.completedAt).toISOString() : null,
    description: t.desc || null,
    group_name: t.group || null,
    from_template_id: t.fromTemplate || null,
    updated_at: new Date().toISOString(),
  }));

  try {
    const { error } = await supabase.from('tasks').upsert(payloads);
    if (error) throw error;
  } catch {
    for (const p of payloads) {
      addToQueue({ table: 'tasks', operation: 'upsert', data: p, timestamp: Date.now() });
    }
  }
}

  try {
    const { error } = await supabase.from('tasks').upsert(payloads);
    if (error) throw error;
  } catch {
    for (const p of payloads) {
      addToQueue({ table: 'tasks', operation: 'upsert', data: p, timestamp: Date.now() });
    }
  }


export async function deleteTask(taskId: string) {
  try {
    const { error } = await supabase.from('tasks').delete().eq('id', taskId);
    if (error) throw error;
  } catch {
    addToQueue({ table: 'tasks', operation: 'delete', data: { id: taskId }, timestamp: Date.now() });
  }
}

// ─── DAY LOG ────────────────────────────────────────────

export async function loadDayLog(userId: string, date: string) {
  try {
    const { data, error } = await supabase
      .from('day_logs')
      .select('*')
      .eq('user_id', userId)
      .eq('date', date)
      .single();
    if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows
    return data;
  } catch {
    return null;
  }
}

export async function syncDayLog(userId: string, date: string, log: Record<string, any>) {
  const payload = {
    ...log,
    user_id: userId,
    date,
    updated_at: new Date().toISOString(),
  };

  try {
    const { error } = await supabase
      .from('day_logs')
      .upsert(payload, { onConflict: 'user_id,date' });
    if (error) throw error;
  } catch {
    addToQueue({ table: 'day_logs', operation: 'upsert', data: payload, timestamp: Date.now() });
  }
}

// ─── TEMPLATES ──────────────────────────────────────────

export async function loadTemplates(userId: string) {
  try {
    const { data, error } = await supabase
      .from('templates')
      .select('*')
      .eq('user_id', userId)
      .eq('active', true)
      .order('default_time');
    if (error) throw error;
    return data;
  } catch {
    return null;
  }
}

export async function syncTemplate(userId: string, template: any) {
  const payload = {
    ...template,
    user_id: userId,
    updated_at: new Date().toISOString(),
  };

  try {
    const { error } = await supabase.from('templates').upsert(payload);
    if (error) throw error;
  } catch {
    addToQueue({ table: 'templates', operation: 'upsert', data: payload, timestamp: Date.now() });
  }
}

export async function deleteTemplate(templateId: string) {
  try {
    const { error } = await supabase.from('templates').delete().eq('id', templateId);
    if (error) throw error;
  } catch {
    addToQueue({ table: 'templates', operation: 'delete', data: { id: templateId }, timestamp: Date.now() });
  }
}

// ─── AUTO-PREDICT ───────────────────────────────────────

export async function getPersonalSuggestions(userId: string, query: string, limit = 5) {
  if (query.length < 2) return [];

  try {
    const { data, error } = await supabase
      .from('tasks')
      .select('name, category, type')
      .eq('user_id', userId)
      .ilike('name', `${query}%`)
      .limit(limit * 3); // get extra to deduplicate
    if (error) throw error;

    // Deduplicate and count
    const counts: Record<string, { name: string; category: string; type: string; count: number }> = {};
    for (const row of data || []) {
      const key = row.name.toLowerCase();
      if (!counts[key]) {
        counts[key] = { name: row.name, category: row.category, type: row.type, count: 0 };
      }
      counts[key].count++;
    }

    return Object.values(counts)
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  } catch {
    return [];
  }
}

export async function getGlobalSuggestions(query: string, limit = 5) {
  if (query.length < 2) return [];

  try {
    const { data, error } = await supabase
      .from('suggestions')
      .select('name, category, type, usage_count, avg_duration')
      .ilike('name', `%${query}%`)
      .order('usage_count', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return data || [];
  } catch {
    return [];
  }
}

// ─── HISTORY (for streaks, stats) ───────────────────────

export async function loadHistory(userId: string, days = 30) {
  try {
    const { data, error } = await supabase
      .from('day_logs')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false })
      .limit(days);
    if (error) throw error;
    return data || [];
  } catch {
    return [];
  }
}