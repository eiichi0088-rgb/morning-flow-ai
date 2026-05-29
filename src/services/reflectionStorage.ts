import type { MorningPlan } from './aiPlanner';

export type ReviewStatus = 'done' | 'partial' | 'missed';

export interface MorningSnapshot {
  id: string;
  createdAt: string;
  transcript: string;
  plan: MorningPlan;
  review?: {
    statuses: Record<string, ReviewStatus>;
    updatedAt: string;
  };
}

const storageKey = 'morning-flow-ai:snapshots:v1';

export function loadLatestSnapshot(): MorningSnapshot | null {
  return loadSnapshots()[0] ?? null;
}

export function saveMorningSnapshot(transcript: string, plan: MorningPlan) {
  const snapshots = loadSnapshots();
  const snapshot: MorningSnapshot = {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    transcript,
    plan,
  };

  saveSnapshots([snapshot, ...snapshots].slice(0, 30));
  return snapshot;
}

export function saveReview(snapshotId: string, statuses: Record<string, ReviewStatus>) {
  const snapshots = loadSnapshots().map((snapshot) =>
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

  saveSnapshots(snapshots);
}

function loadSnapshots(): MorningSnapshot[] {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveSnapshots(snapshots: MorningSnapshot[]) {
  localStorage.setItem(storageKey, JSON.stringify(snapshots));
}
