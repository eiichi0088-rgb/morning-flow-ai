import type { MorningPlan } from './aiPlanner';

export type ReviewStatus = 'done' | 'partial' | 'missed';

export interface MorningSnapshot {
  id: string;
  ownerId?: string;
  createdAt: string;
  transcript: string;
  plan: MorningPlan;
  review?: {
    statuses: Record<string, ReviewStatus>;
    updatedAt: string;
  };
}

const defaultStorageKey = 'morning-flow-ai:v3:private:snapshots';

export function loadLatestSnapshot(storageKey = defaultStorageKey): MorningSnapshot | null {
  return loadSnapshots(storageKey)[0] ?? null;
}

export function saveMorningSnapshot(
  transcript: string,
  plan: MorningPlan,
  storageKey = defaultStorageKey,
  ownerId = 'local-private',
) {
  const snapshots = loadSnapshots(storageKey);
  const snapshot: MorningSnapshot = {
    id: createId(),
    ownerId,
    createdAt: new Date().toISOString(),
    transcript,
    plan,
  };

  saveSnapshots([snapshot, ...snapshots].slice(0, 30), storageKey);
  return snapshot;
}

export function saveReview(snapshotId: string, statuses: Record<string, ReviewStatus>, storageKey = defaultStorageKey) {
  const snapshots = loadSnapshots(storageKey).map((snapshot) =>
    snapshot.id === snapshotId
      ? {
          ...snapshot,
          review: {
            statuses,
            updatedAt: new Date().toISOString(),
          },
        }
      : snapshot,
  );

  saveSnapshots(snapshots, storageKey);
}

function loadSnapshots(storageKey: string): MorningSnapshot[] {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveSnapshots(snapshots: MorningSnapshot[], storageKey: string) {
  localStorage.setItem(storageKey, JSON.stringify(snapshots));
}

function createId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
