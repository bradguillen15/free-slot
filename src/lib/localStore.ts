// Guest mode storage — localStorage-backed mirror of the Supabase schema.
// Layout:
//   freeslot.guest.profile           -> single Profile object
//   freeslot.guest.categories        -> Category[]
//   freeslot.guest.activities        -> Activity[]
//   freeslot.guest.schedule_blocks   -> ScheduleBlock[]
//   freeslot.guest.time_logs.YYYY-MM -> TimeLog[]   (one bucket per month)
//   freeslot.guest.bootstrapped      -> "1" once defaults seeded

const PREFIX = "freeslot.guest";

export type LocalCategory = {
  id: string;
  name: string;
  type: "productive" | "unproductive";
  color: string;
  is_default: boolean;
  created_at: string;
};

export type LocalActivity = {
  id: string;
  name: string;
  category_id: string | null;
  target_hours_per_week: number;
  is_active: boolean;
  created_at: string;
};

export type LocalScheduleBlock = {
  id: string;
  name: string;
  start_time: string;
  end_time: string;
  days_of_week: number[];
  color: string;
  type: "fixed" | "waste_expected";
  category_id: string | null;
  created_at: string;
};

export type LocalTimeLog = {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  category_id: string | null;
  type: "productive" | "unproductive";
  notes: string | null;
  created_at: string;
};

export type LocalProfile = {
  buffer_minutes: number;
  peak_hours: { start: string; end: string };
  include_weekends: boolean;
  weekly_review_day: number;
  onboarding_completed: boolean;
};

const DEFAULT_CATEGORIES: Omit<LocalCategory, "id" | "created_at">[] = [
  { name: "Deep work",     type: "productive",   color: "#3b82f6", is_default: true },
  { name: "Reading",       type: "productive",   color: "#8b5cf6", is_default: true },
  { name: "Exercise",      type: "productive",   color: "#10b981", is_default: true },
  { name: "Study",         type: "productive",   color: "#f59e0b", is_default: true },
  { name: "Creative work", type: "productive",   color: "#ec4899", is_default: true },
  { name: "Side project",  type: "productive",   color: "#06b6d4", is_default: true },
  { name: "Social media",  type: "unproductive", color: "#ef4444", is_default: true },
  { name: "Gaming",        type: "unproductive", color: "#f97316", is_default: true },
  { name: "Idle",          type: "unproductive", color: "#6b7280", is_default: true },
];

const DEFAULT_PROFILE: LocalProfile = {
  buffer_minutes: 15,
  peak_hours: { start: "09:00", end: "12:00" },
  include_weekends: true,
  weekly_review_day: 0,
  onboarding_completed: false,
};

function rid() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `local-${Math.random().toString(36).slice(2)}-${Date.now()}`;
}

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

/** Like read(), but guards against valid-JSON-wrong-shape values (e.g. "{}" where an array is expected). */
function readArray<T>(key: string): T[] {
  const v = read<T[]>(key, []);
  return Array.isArray(v) ? v : [];
}

function write<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
    // Same-tab listeners
    window.dispatchEvent(new CustomEvent("freeslot:guest-change", { detail: { key } }));
  } catch (e) {
    console.error("localStore write failed", e);
  }
}

export function monthKey(iso: string) {
  return iso.slice(0, 7); // YYYY-MM
}

function logsKey(month: string) {
  return `${PREFIX}.time_logs.${month}`;
}

export function ensureBootstrap() {
  if (typeof window === "undefined") return;
  if (localStorage.getItem(`${PREFIX}.bootstrapped`)) return;
  const now = new Date().toISOString();
  const cats: LocalCategory[] = DEFAULT_CATEGORIES.map((c) => ({
    ...c,
    id: rid(),
    created_at: now,
  }));
  write(`${PREFIX}.categories`, cats);
  write(`${PREFIX}.activities`, [] as LocalActivity[]);
  write(`${PREFIX}.schedule_blocks`, [] as LocalScheduleBlock[]);
  write(`${PREFIX}.profile`, DEFAULT_PROFILE);
  localStorage.setItem(`${PREFIX}.bootstrapped`, "1");
}

// ---------- Profile ----------
export function getProfile(): LocalProfile {
  const p = read<unknown>(`${PREFIX}.profile`, DEFAULT_PROFILE);
  if (!p || typeof p !== "object" || Array.isArray(p)) return DEFAULT_PROFILE;
  const obj = p as Partial<LocalProfile>;
  const peak =
    obj.peak_hours && typeof obj.peak_hours === "object" && !Array.isArray(obj.peak_hours)
      ? { ...DEFAULT_PROFILE.peak_hours, ...obj.peak_hours }
      : DEFAULT_PROFILE.peak_hours;
  return { ...DEFAULT_PROFILE, ...obj, peak_hours: peak };
}

export function updateProfile(patch: Partial<LocalProfile>) {
  const next = { ...getProfile(), ...patch };
  write(`${PREFIX}.profile`, next);
  return next;
}

// ---------- Categories ----------
export function listCategories(): LocalCategory[] {
  return readArray<LocalCategory>(`${PREFIX}.categories`);
}

// ---------- Activities ----------
export function listActivities(): LocalActivity[] {
  return readArray<LocalActivity>(`${PREFIX}.activities`);
}

export function upsertActivity(input: Partial<LocalActivity> & { id?: string }) {
  const all = listActivities();
  if (input.id && all.some((a) => a.id === input.id)) {
    const next = all.map((a) => (a.id === input.id ? { ...a, ...input } : a));
    write(`${PREFIX}.activities`, next);
    return next.find((a) => a.id === input.id)!;
  }
  const created: LocalActivity = {
    id: input.id ?? rid(),
    name: input.name ?? "Untitled",
    category_id: input.category_id ?? null,
    target_hours_per_week: input.target_hours_per_week ?? 1,
    is_active: input.is_active ?? true,
    created_at: new Date().toISOString(),
  };
  write(`${PREFIX}.activities`, [...all, created]);
  return created;
}

export function deleteActivity(id: string) {
  write(`${PREFIX}.activities`, listActivities().filter((a) => a.id !== id));
}

// ---------- Schedule blocks ----------
export function listScheduleBlocks(): LocalScheduleBlock[] {
  return readArray<LocalScheduleBlock>(`${PREFIX}.schedule_blocks`);
}

export function upsertScheduleBlock(input: Partial<LocalScheduleBlock> & { id?: string }) {
  const all = listScheduleBlocks();
  if (input.id && all.some((b) => b.id === input.id)) {
    const next = all.map((b) => (b.id === input.id ? { ...b, ...input } : b));
    write(`${PREFIX}.schedule_blocks`, next);
    return next.find((b) => b.id === input.id)!;
  }
  const created: LocalScheduleBlock = {
    id: input.id ?? rid(),
    name: input.name ?? "Block",
    start_time: input.start_time ?? "09:00",
    end_time: input.end_time ?? "10:00",
    days_of_week: input.days_of_week ?? [],
    color: input.color ?? "#3b82f6",
    type: input.type ?? "fixed",
    category_id: input.category_id ?? null,
    created_at: new Date().toISOString(),
  };
  write(`${PREFIX}.schedule_blocks`, [...all, created]);
  return created;
}

export function deleteScheduleBlock(id: string) {
  write(`${PREFIX}.schedule_blocks`, listScheduleBlocks().filter((b) => b.id !== id));
}

// ---------- Time logs (monthly buckets) ----------
export function listLogsForMonth(month: string): LocalTimeLog[] {
  return readArray<LocalTimeLog>(logsKey(month));
}

export function listLogsInRange(startISO: string, endISO: string): LocalTimeLog[] {
  // Spans at most a few months. Iterate months as numbers — parsing the ISO
  // strings with new Date() reads them as UTC midnight, which skips the final
  // month in timezones west of UTC.
  const months = new Set<string>();
  const [sy, sm] = startISO.split("-").map(Number);
  const [ey, em] = endISO.split("-").map(Number);
  let y = sy;
  let m = sm;
  while (y < ey || (y === ey && m <= em)) {
    months.add(`${y}-${String(m).padStart(2, "0")}`);
    m += 1;
    if (m > 12) { m = 1; y += 1; }
  }
  const out: LocalTimeLog[] = [];
  for (const m of months) {
    for (const log of listLogsForMonth(m)) {
      if (log.date >= startISO && log.date <= endISO) out.push(log);
    }
  }
  return out.sort((a, b) => (a.date + a.start_time).localeCompare(b.date + b.start_time));
}

export function listAllLogs(): LocalTimeLog[] {
  if (typeof window === "undefined") return [];
  const out: LocalTimeLog[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith(`${PREFIX}.time_logs.`)) {
      const arr = read<LocalTimeLog[]>(k, []);
      out.push(...arr);
    }
  }
  return out;
}

export function insertLog(input: Partial<LocalTimeLog> & { date: string; start_time: string; end_time: string; type: "productive" | "unproductive" }) {
  const log: LocalTimeLog = {
    id: input.id ?? rid(),
    date: input.date,
    start_time: input.start_time,
    end_time: input.end_time,
    category_id: input.category_id ?? null,
    type: input.type,
    notes: input.notes ?? null,
    created_at: new Date().toISOString(),
  };
  const month = monthKey(input.date);
  const all = listLogsForMonth(month);
  write(logsKey(month), [...all, log]);
  return log;
}

export function deleteLog(id: string) {
  if (typeof window === "undefined") return;
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (!k || !k.startsWith(`${PREFIX}.time_logs.`)) continue;
    const arr = read<LocalTimeLog[]>(k, []);
    const next = arr.filter((l) => l.id !== id);
    if (next.length !== arr.length) write(k, next);
  }
}

export function updateLog(id: string, patch: Partial<Omit<LocalTimeLog, "id" | "date" | "created_at">>) {
  if (typeof window === "undefined") return;
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (!k || !k.startsWith(`${PREFIX}.time_logs.`)) continue;
    const arr = readArray<LocalTimeLog>(k);
    const idx = arr.findIndex((l) => l.id === id);
    if (idx !== -1) {
      const updated = [...arr];
      updated[idx] = { ...updated[idx], ...patch };
      write(k, updated);
      return updated[idx];
    }
  }
  // Parity with the cloud adapter (.single() rejects on zero rows).
  throw new Error("Time log not found");
}

// ---------- Snapshot for migration ----------
export type LocalPriority = { week_start: string; activity_id: string; rank: number };

function prioKey(weekStart: string) {
  return `${PREFIX}.weekly_priorities.${weekStart}`;
}

export function listPriorities(weekStart: string): LocalPriority[] {
  return read<LocalPriority[]>(prioKey(weekStart), []);
}

export function setPriorities(weekStart: string, items: { activity_id: string; rank: number }[]) {
  write(prioKey(weekStart), items.map((it) => ({ week_start: weekStart, ...it })));
}

export function listAllPriorities(): LocalPriority[] {
  if (typeof window === "undefined") return [];
  const out: LocalPriority[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith(`${PREFIX}.weekly_priorities.`)) {
      out.push(...read<LocalPriority[]>(k, []));
    }
  }
  return out;
}

export type GuestSnapshot = {
  profile: LocalProfile;
  categories: LocalCategory[];
  activities: LocalActivity[];
  schedule_blocks: LocalScheduleBlock[];
  time_logs: LocalTimeLog[];
  priorities: LocalPriority[];
};

export function snapshot(): GuestSnapshot {
  return {
    profile: getProfile(),
    categories: listCategories(),
    activities: listActivities(),
    schedule_blocks: listScheduleBlocks(),
    time_logs: listAllLogs(),
    priorities: listAllPriorities(),
  };
}

export function hasGuestData() {
  const s = snapshot();
  return (
    s.activities.length > 0 ||
    s.schedule_blocks.length > 0 ||
    s.time_logs.length > 0 ||
    s.priorities.length > 0 ||
    s.profile.onboarding_completed
  );
}

export function clearGuestData() {
  if (typeof window === "undefined") return;
  const toRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith(PREFIX)) toRemove.push(k);
  }
  toRemove.forEach((k) => localStorage.removeItem(k));
  window.dispatchEvent(new CustomEvent("freeslot:guest-change", { detail: { key: "*" } }));
}
