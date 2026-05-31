export type LifeCategory = 'work' | 'health' | 'family' | 'learning';
export type EnergyMood = 'great' | 'normal' | 'tired' | 'exhausted';

export interface MorningPlan {
  purpose: string;
  goals: string[];
  todos: string[];
  priorities: {
    highest: string[];
    important: string[];
    optional: string[];
  };
  schedule: {
    time: string;
    task: string;
  }[];
  advice: string[];
  categories: Record<LifeCategory, string[]>;
  shoppingCandidates: string[];
  contactReminders: string[];
  coach: {
    energy: EnergyMood;
    mission: string;
    focusItems: {
      highest: string;
      important: string;
      optional: string;
    };
    morningAdvice: string;
    successConditions: string[];
  };
}

export interface PlanUpdateContext {
  currentPlan?: MorningPlan | null;
  mode?: 'create' | 'update';
  shoppingItems?: string[];
  contactReminders?: string[];
}

export async function createAiMorningPlan(
  transcript: string,
  energy: EnergyMood,
  context: PlanUpdateContext = {},
): Promise<MorningPlan> {
  const response = await fetch('/api/plan', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contactReminders: context.contactReminders ?? [],
      currentPlan: context.currentPlan,
      energy,
      mode: context.mode ?? 'create',
      shoppingItems: context.shoppingItems ?? [],
      transcript,
    }),
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(payload?.message ?? 'AI整理に失敗しました。設定を確認してください。');
  }

  return normalizePlan(payload.plan);
}

function normalizePlan(plan: Partial<MorningPlan> | null | undefined): MorningPlan {
  return {
    purpose: plan?.purpose || '今日を落ち着いて整える',
    goals: safeArray(plan?.goals),
    todos: safeArray(plan?.todos),
    priorities: {
      highest: safeArray(plan?.priorities?.highest),
      important: safeArray(plan?.priorities?.important),
      optional: safeArray(plan?.priorities?.optional),
    },
    schedule: Array.isArray(plan?.schedule)
      ? plan.schedule.map((item) => ({
          time: String(item.time ?? '時間調整'),
          task: String(item.task ?? '予定'),
        }))
      : [],
    advice: safeArray(plan?.advice),
    categories: {
      work: safeArray(plan?.categories?.work),
      health: safeArray(plan?.categories?.health),
      family: safeArray(plan?.categories?.family),
      learning: safeArray(plan?.categories?.learning),
    },
    shoppingCandidates: safeArray(plan?.shoppingCandidates),
    contactReminders: safeArray(plan?.contactReminders),
    coach: {
      energy: plan?.coach?.energy || 'normal',
      mission:
        plan?.coach?.mission ||
        plan?.priorities?.highest?.[0] ||
        plan?.todos?.[0] ||
        '今日を整える',
      focusItems: {
        highest:
          plan?.coach?.focusItems?.highest ||
          plan?.priorities?.highest?.[0] ||
          '最重要タスクを進める',
        important:
          plan?.coach?.focusItems?.important ||
          plan?.priorities?.important?.[0] ||
          '重要な予定を守る',
        optional:
          plan?.coach?.focusItems?.optional ||
          plan?.priorities?.optional?.[0] ||
          '余裕があれば整える',
      },
      morningAdvice:
        plan?.coach?.morningAdvice ||
        plan?.advice?.[0] ||
        '一番重い予定を先に決めると、今日が動き出します。',
      successConditions: safeArray(plan?.coach?.successConditions).slice(0, 3),
    },
  };
}

function safeArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map(String).map((item) => item.trim()).filter(Boolean) : [];
}
