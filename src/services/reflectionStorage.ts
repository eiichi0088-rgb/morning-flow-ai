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

export function loadLatestSnapshot(storageKey: string): MorningSnapshot | null {
  return loadSnapshots(storageKey)[0] ?? null;
}

export function saveMorningSnapshot(transcript: string, plan: MorningPlan, storageKey: string) {
  const snapshots = loadSnapshots(storageKey);
  const snapshot: MorningSnapshot = {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    transcript,
    plan,
  };

  saveSnapshots([snapshot, ...snapshots].slice(0, 30), storageKey);
  return snapshot;
}

export function saveReview(snapshotId: string, statuses: Record<string, ReviewStatus>, storageKey: string) {
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

export function deleteReviewTasks(snapshotId: string, tasks: string[], storageKey: string) {
  const taskSet = new Set(tasks);
  const snapshots = loadSnapshots(storageKey).map((snapshot) => {
    if (snapshot.id !== snapshotId) return snapshot;

    const nextStatuses = { ...(snapshot.review?.statuses ?? {}) };
    tasks.forEach((task) => {
      delete nextStatuses[task];
    });

    return {
      ...snapshot,
      plan: {
        ...snapshot.plan,
        todos: snapshot.plan.todos.filter((todo) => !taskSet.has(todo)),
      },
      review: {
        statuses: nextStatuses,
        updatedAt: new Date().toISOString(),
      },
    };
  });

  saveSnapshots(snapshots, storageKey);
  return snapshots.find((snapshot) => snapshot.id === snapshotId) ?? null;
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
