import React from 'react';
import ReactDOM from 'react-dom/client';
import {
  ArrowRight,
  AlertTriangle,
  Brain,
  CalendarClock,
  CalendarPlus,
  ChevronRight,
  CheckCircle2,
  Clock,
  Download,
  Mail,
  MessageCircle,
  Lightbulb,
  ListChecks,
  Loader2,
  Home,
  Mic,
  Phone,
  Plus,
  RefreshCw,
  Pencil,
  Share2,
  ShoppingCart,
  Sparkles,
  Square,
  Trash2,
  X,
} from 'lucide-react';
import { createAiMorningPlan, type MorningPlan } from './services/aiPlanner';
import {
  insertGoogleCalendarEvents,
  isGoogleCalendarConfigured,
  requestGoogleAccessToken,
  revokeGoogleAccessToken,
  type GoogleCalendarPriority,
} from './services/googleCalendar';
import {
  loadLatestSnapshot,
  deleteReviewTasks,
  saveMorningSnapshot,
  saveReview,
  type MorningSnapshot,
  type ReviewStatus,
} from './services/reflectionStorage';
import {
  createShoppingPlan,
  classifyShoppingItem,
  formatShoppingItemLabel,
  groupShoppingItems,
  parseShoppingItemInput,
  postProcessShoppingItems,
  type ShoppingItem,
} from './services/shoppingPlanner';
import {
  deleteAllSupabaseShoppingItems,
  deleteSupabaseShoppingItem,
  fetchSupabaseShoppingItems,
  isSupabaseShoppingConfigured,
  mapShoppingItemToSupabase,
  mapSupabaseRowToShoppingItem,
  SupabaseShoppingItemError,
  updateSupabaseShoppingItem,
  upsertSupabaseShoppingItems,
  type SupabaseShoppingItemUpsert,
} from './services/supabaseShoppingItems';
import { findRecipeMatch } from './services/recipeDatabase';
import {
  clearStoredSupabaseAuthSession,
  getStoredSupabaseAuthSession,
  getSupabaseAuthConfigStatus,
  isSupabaseAuthTokenExpired,
  refreshSupabaseAuthSession,
  resendConfirmationEmail,
  restoreSupabaseAuthSessionFromUrl,
  sendPasswordResetEmail,
  signInWithEmail,
  signOutSupabaseAuth,
  signUpWithEmail,
  storeSupabaseAuthSession,
  type SupabaseAuthSession,
} from './services/supabaseAuth';
import {
  deleteSupabaseFollowUp,
  fetchSupabaseFollowUps,
  getSupabaseFollowUpConfigStatus,
  insertSupabaseFollowUp,
  isSupabaseFollowUpConfigured,
  SupabaseFollowUpError,
  updateSupabaseFollowUp,
  type SupabaseFollowUpRow,
  type SupabaseFollowUpStatus,
} from './services/supabaseFollowUps';
import './styles.css';

type SpeechRecognitionResultListLike = SpeechRecognitionResultList;

interface SpeechRecognitionEventLike extends Event {
  readonly resultIndex: number;
  readonly results: SpeechRecognitionResultListLike;
}

interface SpeechRecognitionErrorEventLike extends Event {
  readonly error: string;
}

interface SpeechRecognitionLike extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  }
}

const SpeechRecognition =
  window.SpeechRecognition ?? window.webkitSpeechRecognition;

const sampleTranscript =
  '\u4eca\u65e5\u306f\u4f11\u307f\u306a\u306e\u3067\u3001\u5348\u524d\u4e2d\u306b\u6383\u9664\u3068\u6d17\u6fef\u3092\u6e08\u307e\u305b\u308b\u3002\u5348\u5f8c\u306f\u53cb\u4eba\u3068\u30e9\u30f3\u30c1\u3078\u884c\u304d\u3001\u5915\u65b9\u306b\u8cb7\u3044\u7269\u3092\u3057\u3066\u3001\u591c\u306f\u6620\u753b\u3092\u898b\u306a\u304c\u3089\u3086\u3063\u304f\u308a\u904e\u3054\u3057\u305f\u3044\u3002';
const followUpPersonSuffixPattern = '(?:さん|くん|君|ちゃん|先生|社長|様|氏)';

const legacySharedStorageKeys = [
  'morning-flow-ai:transcript-draft:v1',
  'morning-flow-ai:snapshots:v1',
  'morning-flow-ai:shopping-list:v1',
  'morning-flow-ai:google-calendar-login:v1',
  'morning-flow-ai:userProfile:v1',
  'morning-flow-ai:preferences:v1',
];
type CalendarEvent = {
  id: string;
  title: string;
  start: Date;
  end: Date;
  memo: string;
  priority: GoogleCalendarPriority;
  sourceTime: string;
};

type CaptureMode = 'create' | 'update';
type AppView = 'morning' | 'shopping' | 'followUp' | 'inbox' | 'feedback' | 'analytics' | 'settings';
type AiInboxCategory = 'todo' | 'shopping' | 'followUp' | 'memo' | 'idea';
type AiInboxStatus = 'unprocessed' | 'organized';
type OnboardingPreference = 'always_show' | 'first_time_only' | 'disabled';

type OnboardingSettings = {
  preference: OnboardingPreference;
  seenGuideIds: string[];
};

type MorningDashboardItem = {
  id: string;
  label: string;
  completed?: boolean;
};

type MorningDashboardData = {
  achievementRate: number;
  aiInbox: {
    count: number;
    items: MorningDashboardItem[];
  };
  firstTask: string;
  followUp: {
    count: number;
    items: MorningDashboardItem[];
  };
  shopping: {
    count: number;
    items: MorningDashboardItem[];
  };
  today: {
    count: number;
    items: MorningDashboardItem[];
  };
  topPriority: MorningDashboardItem[];
  totalCount: number;
};

type MorningReviewDraft = {
  followUpCandidates: FollowUpDraftItem[];
  plan: MorningPlan;
  shoppingItems: ShoppingItem[];
  shoppingUpdatedAt: string;
  sourceText: string;
};

type AiConversationMessage = {
  id: string;
  role: 'assistant' | 'user';
  title?: string;
  lines: string[];
};

type PendingConversationIntent =
  | { type: 'bank_visit'; title: string }
  | { type: 'shopping' }
  | { type: 'contact_method'; person: string; originalText: string }
  | { type: 'future_event'; dateText: string; title: string }
  | { type: 'follow_up_due'; item: FollowUpDraftItem };

type ConversationTurnResult = {
  assistantLines: string[];
  draft: MorningReviewDraft;
  pendingIntent: PendingConversationIntent | null;
  pendingFollowUp: FollowUpDraftItem | null;
  shouldOpenReview: boolean;
};

type ProactiveSuggestionKind = 'bank' | 'shopping' | 'follow_up' | 'follow_up_due' | 'google_calendar';

type LlmAssistantAction =
  | { type: 'add_schedule'; payload: { date_text?: string; date?: string; time?: string; title?: string; memo?: string } }
  | { type: 'add_shopping_item'; payload: { name?: string; quantity?: string; category?: string } }
  | { type: 'add_follow_up'; payload: { person_name?: string; title?: string; action?: string; method?: FollowUpKind; due_text?: string; due?: string; memo?: string } }
  | { type: 'add_google_calendar_candidate'; payload: { date_text?: string; date?: string; time?: string; title?: string; memo?: string } }
  | { type: 'update_priority'; payload: { items?: { title?: string; reason?: string }[] } }
  | { type: 'show_review_card'; payload: { summary?: string } };

type PureLlmSecretaryJson = {
  assistant_reply: string;
  schedule_items: { title?: string; date_text?: string; time_text?: string; notes?: string }[];
  shopping_items: { name?: string; quantity?: string }[];
  follow_up_items: { title?: string; person_name?: string; action?: string; due_text?: string; notes?: string }[];
  google_calendar_candidates: { title?: string; date_text?: string; time?: string; notes?: string }[];
  priority_suggestions: { title?: string; reason?: string }[];
  needs_clarification: boolean;
  clarifying_question: string;
};

type LlmAssistantDebug = {
  actionsCount: number;
  assistantLinesCount: number;
  calendarCount: number;
  draftAutoGenerated: boolean;
  draftItemCount: number;
  extractedCalendarCandidates: string[];
  extractedFollowUpItems: string[];
  extractedScheduleItems: string[];
  extractedShoppingItems: string[];
  extractedCount: number;
  calendarRejectReasons: string[];
  followUpRejectReasons: string[];
  followUpCount: number;
  jsonParseSuccess: boolean;
  lastLlmJson: string;
  lastAssistantResponse: string;
  lostEntityCount: number;
  needsClarification: boolean;
  clarifyingQuestion: string;
  parseError: string;
  pendingSave: boolean;
  prioritySuggestionsCount: number;
  rawToolCallsCount: number;
  scheduleCount: number;
  shoppingCount: number;
  toolCalls: string[];
};

type LlmAssistantResult = {
  actionsCount: number;
  assistantLines: string[];
  assistantLinesCount: number;
  calendarCount: number;
  draftAutoGenerated: boolean;
  draftItemCount: number;
  draft: MorningReviewDraft;
  extractedCalendarCandidates: string[];
  extractedFollowUpItems: string[];
  extractedScheduleItems: string[];
  extractedShoppingItems: string[];
  extractedCount: number;
  calendarRejectReasons: string[];
  followUpRejectReasons: string[];
  followUpCount: number;
  jsonParseSuccess: boolean;
  lastLlmJson: string;
  lastAssistantResponse: string;
  lostEntityCount: number;
  needsClarification: boolean;
  clarifyingQuestion: string;
  parseError: string;
  pendingSave: boolean;
  prioritySuggestionsCount: number;
  mode: 'llm-native' | 'fallback';
  model: string;
  rawToolCallsCount: number;
  scheduleCount: number;
  shoppingCount: number;
  shouldOpenReview: boolean;
  lastActions: string[];
  toolCalls: string[];
};

type AssistantRuntimeDebug = {
  actionsCount: number;
  assistantLinesCount: number;
  calendarCount: number;
  draftAutoGenerated: boolean;
  draftItemCount: number;
  error: string;
  extractedCalendarCandidates: string[];
  extractedFollowUpItems: string[];
  extractedScheduleItems: string[];
  extractedShoppingItems: string[];
  extractedCount: number;
  calendarRejectReasons: string[];
  followUpRejectReasons: string[];
  followUpCount: number;
  jsonParseSuccess: boolean;
  lastLlmJson: string;
  fallbackError: string;
  lastActions: string[];
  lastAssistantResponse: string;
  lastAssistantAction: string;
  lastUserIntent: string;
  lostEntityCount: number;
  needsClarification: boolean;
  clarifyingQuestion: string;
  parseError: string;
  pendingSave: boolean;
  prioritySuggestionsCount: number;
  mode: 'not checked' | 'llm-native' | 'fallback';
  model: string;
  rawToolCallsCount: number;
  scheduleCount: number;
  shoppingCount: number;
  toolCalls: string[];
  updatedAt: string;
};

type UserIsolationDebug = {
  authChangeStateReset: boolean;
  currentUserEmail: string;
  currentUserId: string;
  localStorageShoppingKeys: string[];
  logoutClearedKeys: string[];
  resetAt: string;
  shoppingFetchedCount: number;
};

type VoiceRecognitionDebug = {
  error: string;
  lastEvent: string;
  restartCount: number;
  status: 'idle' | 'listening' | 'auto-restarting' | 'stopped' | 'error';
  updatedAt: string;
};

type AiInboxItem = {
  id: string;
  text: string;
  category: AiInboxCategory;
  confidence: number;
  status: AiInboxStatus;
  sourceView: AppView;
  createdAt: string;
  organizedAt?: string;
};

type FollowUpPriority = 'high' | 'medium' | 'low';
type FollowUpKind = 'phone' | 'line' | 'email' | 'sms' | 'other';
type FollowUpDuePreset = 'today' | 'tomorrow' | 'thisWeek' | 'custom';
type FollowUpStatus = 'pending' | 'contacted' | 'waiting' | 'done';

type FollowUpItem = {
  id: string;
  name: string;
  company?: string;
  content: string;
  priority: FollowUpPriority;
  duePreset: FollowUpDuePreset;
  dueDate: string;
  dueTime?: string;
  kind: FollowUpKind;
  source?: 'manual' | 'voice';
  status?: FollowUpStatus;
  completed: boolean;
  createdAt: string;
  completedAt?: string;
};

type FollowUpSplitDebug = {
  duplicateExcludedCount: number;
  excludedReasons: string[];
  generatedItemCount: number;
  personExtractions: { extractedPerson: string; originalPerson: string }[];
  originalText: string;
  personCount: number;
  persons: string[];
  reevaluated: boolean;
  splitTexts: string[];
  strategy: 'separator' | 'person-boundary';
};

type FollowUpDraftItem = Omit<FollowUpItem, 'completed' | 'completedAt' | 'createdAt' | 'id'> & {
  id: string;
  originalPerson?: string;
};

type FollowUpSupabaseDebug = {
  authMode: string;
  bodyPreview: string;
  configured: boolean;
  error: string;
  hasAnonKey: boolean;
  hasUrl: boolean;
  lastOperation: string;
  payloadPreview: string;
  payloadUserId: string;
  responseStatus: string;
  rowCount: number | null;
  tokenStatus: string;
  urlHost: string;
  userId: string;
};

type ShoppingSupabaseDebug = {
  authMode: string;
  bodyPreview: string;
  error: string;
  lastOperation: string;
  payloadPreview: string;
  payloadUserId: string;
  responseStatus: string;
  rowCount: number | null;
  tokenStatus: string;
  userId: string;
};

type FeedbackType = 'usability' | 'improvement' | 'bug' | 'feature' | 'other';
type FeedbackUrgency = 'high' | 'medium' | 'low';

type FeedbackSummary = {
  summary: string;
  detail: string;
  type: FeedbackType;
  urgency: FeedbackUrgency;
};

type AnalyticsEventType = 'app_install' | 'app_open' | 'feature_use' | 'feedback_sent' | 'test';
type AnalyticsFeature =
  | 'morning_flow'
  | 'shopping_list'
  | 'meal_to_shopping'
  | 'meal_database'
  | 'meal_database_match'
  | 'meal_unknown_recipe'
  | 'meal_to_shopping_add'
  | 'follow_up'
  | 'google_calendar'
  | 'apple_calendar'
  | 'feedback';

type ShoppingCaptureMode = 'shopping' | 'meal';

type MealIngredientCandidate = {
  id: string;
  meal: string;
  name: string;
  quantity: string;
  category: ShoppingItem['category'];
};

type MealPlanDebug = {
  extracted: string[];
  normalized: string[];
  matched: string[];
  candidateCount: number;
  isUnknown: boolean;
};

type AnalyticsSummary = {
  totalUsers?: number;
  todayUsers?: number;
  totalOpens?: number;
  popularFeatures?: Array<{ feature: string; count: number }>;
};

type AnalyticsSendResult = {
  ok: boolean;
  message: string;
  endpointConfigured: boolean;
  endpointPreview?: string;
  payload?: Record<string, string>;
  transport?: string;
};

type AnalyticsDebugEntry = {
  id: string;
  at: string;
  ok: boolean;
  message: string;
  eventType: AnalyticsEventType;
  feature: string;
};

type AppleCalendarDebugInfo = {
  apiUrl: string;
  appVersion: string;
  bodyPreview?: string;
  contentDisposition?: string;
  contentDispositionMode?: AppleCalendarDisposition;
  contentType?: string;
  fallbackUsed: string;
  hasVTIMEZONE?: boolean;
  importId?: string;
  icsLength?: number;
  icsTimeMode?: string;
  mode: string;
  payloadUrlLength?: number;
  responseStatus?: string;
  shortUrlLength?: number;
  storage?: string;
  userAgent: string;
};

type PrivateSessionKeys = {
  draft: string;
  followUps: string;
  inbox: string;
  shopping: string;
  snapshots: string;
};

const privateSessionIdStorageKey = 'morning-flow-ai:session-id:v2';
const analyticsUserIdStorageKey = 'morning-flow-ai:analytics-user-id:v1';
const analyticsInstallTrackedKey = 'morning-flow-ai:analytics-install-tracked:v1';
const analyticsDebugStorageKey = 'morning-flow-ai:analytics-debug-log:v1';
const developerModeStorageKey = 'mfai_developer_mode';
const developerModePasscode = '19810303';
const onboardingGuideId = 'morning-flow-ai-core-guide-v1';
const appVersion = __APP_VERSION__;
const isMealDatabaseExperimentalEnabled = false;
type AppleCalendarDisposition = 'inline' | 'attachment';

const reviewOptions: { label: string; value: ReviewStatus }[] = [
  { label: '✓ 完了', value: 'done' },
  { label: '△ 一部完了', value: 'partial' },
  { label: '✕ 未達成', value: 'missed' },
];

function createPrivateSessionId() {
  const savedSessionId = localStorage.getItem(privateSessionIdStorageKey);
  if (savedSessionId) return savedSessionId;

  const nextSessionId =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  localStorage.setItem(privateSessionIdStorageKey, nextSessionId);
  return nextSessionId;
}

function createLocalId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function createAnalyticsUserId() {
  const savedUserId = localStorage.getItem(analyticsUserIdStorageKey);
  if (savedUserId) return savedUserId;

  const rawId =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const nextUserId = `mfai_${rawId.replace(/-/g, '').slice(0, 8)}`;
  localStorage.setItem(analyticsUserIdStorageKey, nextUserId);
  return nextUserId;
}

function getAnalyticsEndpoint() {
  const endpoint = import.meta.env.VITE_ANALYTICS_ENDPOINT as string | undefined;
  return endpoint?.trim() || undefined;
}

function isDeveloperModeEnabled() {
  return localStorage.getItem(developerModeStorageKey) === 'true';
}

function maskAnalyticsEndpoint(endpoint?: string) {
  if (!endpoint) return undefined;
  if (endpoint.length <= 42) return endpoint;
  return `${endpoint.slice(0, 24)}...${endpoint.slice(-14)}`;
}

function readAnalyticsDebugLog(): AnalyticsDebugEntry[] {
  try {
    return JSON.parse(localStorage.getItem(analyticsDebugStorageKey) || '[]') as AnalyticsDebugEntry[];
  } catch {
    return [];
  }
}

function writeAnalyticsDebugLog(entry: Omit<AnalyticsDebugEntry, 'id' | 'at'>) {
  const nextEntry: AnalyticsDebugEntry = {
    ...entry,
    at: new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' }),
    id: createLocalId('analytics-log'),
  };
  const nextLog = [nextEntry, ...readAnalyticsDebugLog()].slice(0, 12);
  localStorage.setItem(analyticsDebugStorageKey, JSON.stringify(nextLog));
}

function createAnalyticsPayload(userId: string, eventType: AnalyticsEventType, feature = '--------') {
  return {
    eventType,
    feature,
    timestamp: new Date().toISOString(),
    userId,
    version: appVersion,
  };
}

function postAnalyticsWithHiddenForm(endpoint: string, payload: Record<string, string>) {
  return new Promise<void>((resolve) => {
    const frameName = `analytics-post-frame-${Date.now()}`;
    const iframe = document.createElement('iframe');
    iframe.name = frameName;
    iframe.style.display = 'none';
    document.body.appendChild(iframe);

    const form = document.createElement('form');
    form.action = endpoint;
    form.method = 'POST';
    form.target = frameName;
    form.style.display = 'none';

    const fields = {
      ...payload,
      payload: JSON.stringify(payload),
    };

    Object.entries(fields).forEach(([name, value]) => {
      const input = document.createElement('input');
      input.name = name;
      input.value = value;
      form.appendChild(input);
    });

    document.body.appendChild(form);

    const cleanup = () => {
      form.remove();
      window.setTimeout(() => iframe.remove(), 1000);
      resolve();
    };

    iframe.addEventListener('load', cleanup, { once: true });
    window.setTimeout(cleanup, 3000);
    form.submit();
  });
}

async function fetchAnalyticsNoCors(endpoint: string, payload: Record<string, string>) {
  await fetch(endpoint, {
    body: JSON.stringify(payload),
    headers: {
      'Content-Type': 'text/plain;charset=utf-8',
    },
    method: 'POST',
    mode: 'no-cors',
  });
}

async function forceAnalyticsGetWrite(userId: string): Promise<AnalyticsSendResult> {
  const endpoint = getAnalyticsEndpoint();
  const payload = createAnalyticsPayload(userId, 'test', 'manual_test');

  if (!endpoint) {
    return {
      endpointConfigured: false,
      message: 'VITE_ANALYTICS_ENDPOINT is not configured.',
      ok: false,
      payload,
      transport: 'get_write_test',
    };
  }

  const url = new URL(endpoint);
  url.searchParams.set('writeTest', '1');
  Object.entries(payload).forEach(([key, value]) => url.searchParams.set(key, value));

  try {
    const response = await fetch(url.toString(), { method: 'GET' });
    const text = await response.text();
    const ok = response.ok && text.includes('"ok":true');
    const message = ok
      ? 'GET write test returned ok:true. Check analytics_logs for test / manual_test.'
      : `GET write test response: ${text.slice(0, 180)}`;
    writeAnalyticsDebugLog({ eventType: 'test', feature: 'manual_test', message, ok });
    return {
      endpointConfigured: true,
      endpointPreview: maskAnalyticsEndpoint(endpoint),
      message,
      ok,
      payload,
      transport: 'get_write_test',
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    writeAnalyticsDebugLog({ eventType: 'test', feature: 'manual_test', message, ok: false });
    return {
      endpointConfigured: true,
      endpointPreview: maskAnalyticsEndpoint(endpoint),
      message,
      ok: false,
      payload,
      transport: 'get_write_test',
    };
  }
}

async function sendAnalyticsEvent(
  userId: string,
  eventType: AnalyticsEventType,
  feature = '--------',
): Promise<AnalyticsSendResult> {
  const endpoint = getAnalyticsEndpoint();
  const payload = createAnalyticsPayload(userId, eventType, feature);

  if (!endpoint) {
    const result = {
      endpointConfigured: false,
      message: 'VITE_ANALYTICS_ENDPOINT is not configured.',
      ok: false,
      payload,
      transport: 'form_post_fields',
    };
    console.error('[Analytics Lite] endpoint missing', result);
    writeAnalyticsDebugLog({ eventType, feature, message: result.message, ok: false });
    return result;
  }

  console.info('[Analytics Lite] sending', {
    endpoint: maskAnalyticsEndpoint(endpoint),
    payload,
  });

  try {
    await postAnalyticsWithHiddenForm(endpoint, payload);
    const result = {
      endpointConfigured: true,
      endpointPreview: maskAnalyticsEndpoint(endpoint),
      message:
        'Form POST submitted. Check Network tab for the Apps Script POST and analytics_logs for test / manual_test.',
      ok: true,
      payload,
      transport: 'form_post_fields',
    };
    console.info('[Analytics Lite] send completed', result);
    writeAnalyticsDebugLog({ eventType, feature, message: result.message, ok: true });
    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const result = {
      endpointConfigured: true,
      endpointPreview: maskAnalyticsEndpoint(endpoint),
      message,
      ok: false,
      payload,
      transport: 'form_post_fields',
    };
    console.error('[Analytics Lite] send failed', result);
    writeAnalyticsDebugLog({ eventType, feature, message, ok: false });
    return result;
  }
}

async function sendAnalyticsFetchDebug(userId: string): Promise<AnalyticsSendResult> {
  const endpoint = getAnalyticsEndpoint();
  const payload = createAnalyticsPayload(userId, 'test', 'manual_test');

  if (!endpoint) {
    return {
      endpointConfigured: false,
      message: 'VITE_ANALYTICS_ENDPOINT is not configured.',
      ok: false,
      payload,
      transport: 'fetch_no_cors_json',
    };
  }

  try {
    await fetchAnalyticsNoCors(endpoint, payload);
    const message =
      'fetch no-cors POST completed as an opaque request. It does not prove doPost succeeded; check Network and analytics_logs.';
    writeAnalyticsDebugLog({ eventType: 'test', feature: 'manual_test', message, ok: true });
    return {
      endpointConfigured: true,
      endpointPreview: maskAnalyticsEndpoint(endpoint),
      message,
      ok: true,
      payload,
      transport: 'fetch_no_cors_json',
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    writeAnalyticsDebugLog({ eventType: 'test', feature: 'manual_test', message, ok: false });
    return {
      endpointConfigured: true,
      endpointPreview: maskAnalyticsEndpoint(endpoint),
      message,
      ok: false,
      payload,
      transport: 'fetch_no_cors_json',
    };
  }
}

function trackAnalyticsEvent(userId: string, eventType: AnalyticsEventType, feature = '--------') {
  void sendAnalyticsEvent(userId, eventType, feature);
}

function trackAnalyticsFeature(userId: string, feature: AnalyticsFeature) {
  trackAnalyticsEvent(userId, 'feature_use', feature);
}

async function fetchAnalyticsSummary(): Promise<AnalyticsSummary | null> {
  const endpoint = getAnalyticsEndpoint();
  if (!endpoint) return null;

  try {
    const separator = endpoint.includes('?') ? '&' : '?';
    const response = await fetch(`${endpoint}${separator}summary=1`, { method: 'GET' });
    if (!response.ok) return null;
    return (await response.json()) as AnalyticsSummary;
  } catch {
    return null;
  }
}

function createPrivateSessionKeys(sessionId: string): PrivateSessionKeys {
  return {
    draft: `morning-flow-ai:session:${sessionId}:transcript-draft`,
    followUps: `morning-flow-ai:session:${sessionId}:follow-ups`,
    inbox: `morning-flow-ai:session:${sessionId}:ai-inbox`,
    shopping: `morning-flow-ai:session:${sessionId}:shopping-list`,
    snapshots: `session:${sessionId}:snapshots`,
  };
}

function createInitialAssistantRuntimeDebug(): AssistantRuntimeDebug {
  return {
    actionsCount: 0,
    assistantLinesCount: 0,
    calendarCount: 0,
    draftAutoGenerated: false,
    draftItemCount: 0,
    error: '',
    extractedCalendarCandidates: [],
    extractedFollowUpItems: [],
    extractedScheduleItems: [],
    extractedShoppingItems: [],
    extractedCount: 0,
    calendarRejectReasons: [],
    followUpRejectReasons: [],
    followUpCount: 0,
    jsonParseSuccess: false,
    lastLlmJson: '',
    fallbackError: '',
    lastActions: [],
    lastAssistantResponse: '',
    lastAssistantAction: '',
    lastUserIntent: '',
    lostEntityCount: 0,
    needsClarification: false,
    clarifyingQuestion: '',
    parseError: '',
    pendingSave: false,
    prioritySuggestionsCount: 0,
    mode: 'not checked',
    model: '',
    rawToolCallsCount: 0,
    scheduleCount: 0,
    shoppingCount: 0,
    toolCalls: [],
    updatedAt: '',
  };
}

function createInitialUserIsolationDebug(overrides: Partial<UserIsolationDebug> = {}): UserIsolationDebug {
  return {
    authChangeStateReset: false,
    currentUserEmail: '',
    currentUserId: '',
    localStorageShoppingKeys: [],
    logoutClearedKeys: [],
    resetAt: '',
    shoppingFetchedCount: 0,
    ...overrides,
  };
}

function listShoppingLocalStorageKeys() {
  return Object.keys(localStorage).filter((key) => {
    const loweredKey = key.toLowerCase();
    return loweredKey.includes('shopping') || loweredKey.includes('買い物');
  });
}

function isMorningFlowVolatileStorageKey(key: string) {
  return (
    legacySharedStorageKeys.includes(key) ||
    key.startsWith('morning-flow-ai:session:') ||
    (key.startsWith('session:') && key.endsWith(':snapshots'))
  );
}

function clearMorningFlowVolatileLocalStorage() {
  const clearedKeys: string[] = [];
  Object.keys(localStorage).forEach((key) => {
    if (!isMorningFlowVolatileStorageKey(key)) return;
    localStorage.removeItem(key);
    clearedKeys.push(key);
  });
  return clearedKeys;
}

function createMorningDashboardData(
  plan: MorningPlan | null,
  shoppingItems: ShoppingItem[],
  followUps: FollowUpItem[],
  aiInboxItems: AiInboxItem[],
): MorningDashboardData {
  const dashboardSchedule = cleanScheduleItems(plan?.schedule ?? []);
  const dashboardTodos = dedupeTodos(plan?.todos ?? []);
  const todayScheduleItems = dashboardSchedule.map((item, index) => ({
    id: `schedule-${index}-${item.time}-${item.task}`,
    label: `${item.time} ${cleanPlanningActionLabel(item.task)}`,
  }));
  const todayTodoItems = dashboardTodos.map((todo, index) => ({
    id: `todo-${index}-${todo}`,
    label: todo,
  }));
  const todayItems = [...todayScheduleItems, ...todayTodoItems];
  const openShoppingItems = shoppingItems.filter((item) => !item.completed);
  const pendingFollowUpItems = sortFollowUps(followUps.filter((item) => !item.completed));
  const unprocessedInboxItems = aiInboxItems.filter((item) => item.status === 'unprocessed');
  const completedShoppingCount = shoppingItems.filter((item) => item.completed).length;
  const completedFollowUpCount = followUps.filter((item) => item.completed).length;
  const measurableTotal = shoppingItems.length + followUps.length;
  const achievementRate = measurableTotal ? Math.round(((completedShoppingCount + completedFollowUpCount) / measurableTotal) * 100) : 0;
  const firstTask =
    plan?.priorities.highest[0] ??
    todayScheduleItems[0]?.label ??
    todayTodoItems[0]?.label ??
    (pendingFollowUpItems[0] ? formatDashboardFollowUpLabel(pendingFollowUpItems[0]) : '');
  const topPriority = createTopPriorityItems({
    aiInboxItems: unprocessedInboxItems,
    followUps: pendingFollowUpItems,
    shoppingItems: openShoppingItems,
    todayScheduleItems,
    todayTodoItems,
  });

  return {
    achievementRate,
    aiInbox: {
      count: unprocessedInboxItems.length,
      items: unprocessedInboxItems.slice(0, 3).map((item) => ({
        id: item.id,
        label: `${aiInboxCategoryLabel(item.category)}: ${item.text}`,
      })),
    },
    firstTask,
    followUp: {
      count: pendingFollowUpItems.length,
      items: pendingFollowUpItems.slice(0, 3).map((item) => ({
        id: item.id,
        label: formatDashboardFollowUpLabel(item),
      })),
    },
    shopping: {
      count: openShoppingItems.length,
      items: shoppingItems.slice(0, 3).map((item) => ({
        completed: item.completed,
        id: item.id,
        label: formatShoppingItemLabel(item),
      })),
    },
    topPriority,
    today: {
      count: todayItems.length,
      items: todayItems.slice(0, 3),
    },
    totalCount: todayItems.length + openShoppingItems.length + pendingFollowUpItems.length + unprocessedInboxItems.length,
  };
}

function formatDashboardFollowUpLabel(item: FollowUpItem) {
  return `${item.name} ${item.content}`.trim();
}

function cleanPriorityLabel(value: string) {
  const cleaned = cleanPlanningActionLabel(value);
  if (!cleaned) return '';
  if (cleaned.length <= 20) return cleaned;
  const compactMatch = cleaned.match(/(店へ行く|開店準備|オープン準備|ジムへ行く|閉店|開店|起床|銀行へ行く|電話|LINE返信|確認)/);
  if (compactMatch) return compactMatch[1];
  return `${cleaned.slice(0, 20)}…`;
}

function createTopPriorityItems({
  aiInboxItems,
  followUps,
  shoppingItems,
  todayScheduleItems,
  todayTodoItems,
}: {
  aiInboxItems: AiInboxItem[];
  followUps: FollowUpItem[];
  shoppingItems: ShoppingItem[];
  todayScheduleItems: MorningDashboardItem[];
  todayTodoItems: MorningDashboardItem[];
}): MorningDashboardItem[] {
  const priorityItems: MorningDashboardItem[] = [];
  const addItem = (item: MorningDashboardItem | null | undefined) => {
    if (!item) return;
    const label = cleanPriorityLabel(item?.label ?? '');
    if (!label) return;
    const key = normalizePlanningItemKey(label);
    if (!key || priorityItems.some((current) => normalizePlanningItemKey(current.label) === key)) return;
    priorityItems.push({ ...item, label });
  };

  todayScheduleItems.forEach(addItem);
  todayTodoItems.forEach(addItem);
  followUps.forEach((item) => addItem({ id: `priority-follow-${item.id}`, label: formatDashboardFollowUpLabel(item) }));
  aiInboxItems.forEach((item) => addItem({ id: `priority-inbox-${item.id}`, label: item.text }));

  if (!priorityItems.length && shoppingItems.length) {
    addItem({ id: 'priority-shopping-action', label: '買い物へ行く' });
  }
  const canUseShoppingAsSupplement = priorityItems.length > 1 && priorityItems.length < 3;
  if (canUseShoppingAsSupplement) {
    shoppingItems.forEach((item) => {
      if (priorityItems.length < 3) {
        addItem({ id: `priority-shopping-${item.id}`, label: formatShoppingItemLabel(item), completed: item.completed });
      }
    });
  }

  return dedupeTopPriorityItems(priorityItems);
}

function dedupeTopPriorityItems(items: MorningDashboardItem[]) {
  const byKey = new Map<string, MorningDashboardItem>();
  items.forEach((item) => {
    const label = cleanPriorityLabel(item.label);
    const key = normalizeTaskText(label);
    if (!label || !key || isPlanningLongNoise(label)) return;
    const nextItem = { ...item, label };
    const existing = byKey.get(key);
    if (!existing || getTopPriorityRank(nextItem.label) < getTopPriorityRank(existing.label)) {
      byKey.set(key, nextItem);
    }
  });

  return Array.from(byKey.values())
    .sort((a, b) => getTopPriorityRank(a.label) - getTopPriorityRank(b.label))
    .slice(0, 3);
}

function getTopPriorityRank(label: string) {
  if (/店へ行く|店に行く|銀行へ行く/.test(label)) return 10;
  if (/開店準備|オープン準備|開店/.test(label)) return 20;
  if (/ジムへ行く|ジムに行く/.test(label)) return 30;
  if (/電話|LINE|返信|確認|連絡/.test(label)) return 35;
  if (/買い物へ行く/.test(label)) return 45;
  if (/閉店/.test(label)) return 80;
  if (/起床|起きる/.test(label)) return 90;
  return 40;
}

function createDefaultOnboardingSettings(): OnboardingSettings {
  return {
    preference: 'first_time_only',
    seenGuideIds: [],
  };
}

function getOnboardingSettingsStorageKey(userId: string) {
  return `morning-flow-ai:user:${userId}:onboarding-preferences:v1`;
}

function loadOnboardingSettings(userId: string): OnboardingSettings {
  const saved = localStorage.getItem(getOnboardingSettingsStorageKey(userId));
  if (!saved) return createDefaultOnboardingSettings();

  try {
    const parsed = JSON.parse(saved) as Partial<OnboardingSettings>;
    return {
      preference: isOnboardingPreference(parsed.preference) ? parsed.preference : 'first_time_only',
      seenGuideIds: Array.isArray(parsed.seenGuideIds) ? parsed.seenGuideIds.filter((item): item is string => typeof item === 'string') : [],
    };
  } catch {
    localStorage.removeItem(getOnboardingSettingsStorageKey(userId));
    return createDefaultOnboardingSettings();
  }
}

function saveOnboardingSettingsForUser(userId: string, settings: OnboardingSettings) {
  localStorage.setItem(getOnboardingSettingsStorageKey(userId), JSON.stringify(settings));
}

function shouldShowOnboardingGuide(settings: OnboardingSettings, guideId: string) {
  if (settings.preference === 'always_show') return true;
  if (settings.preference === 'disabled') return false;
  return !settings.seenGuideIds.includes(guideId);
}

function isOnboardingPreference(value: unknown): value is OnboardingPreference {
  return value === 'always_show' || value === 'first_time_only' || value === 'disabled';
}

function removeLegacySharedStorage(currentSessionId: string) {
  legacySharedStorageKeys.forEach((key) => localStorage.removeItem(key));
  const currentSessionPrefix = `morning-flow-ai:session:${currentSessionId}:`;
  const currentSnapshotPrefix = `session:${currentSessionId}:`;
  Object.keys(localStorage)
    .filter(
      (key) =>
        (key.startsWith('morning-flow-ai:session:') && !key.startsWith(currentSessionPrefix)) ||
        (key.startsWith('session:') && key.endsWith(':snapshots') && !key.startsWith(currentSnapshotPrefix)),
    )
    .forEach((key) => localStorage.removeItem(key));
}

function App() {
  const devicePrivateSessionId = React.useMemo(createPrivateSessionId, []);
  const [authSession, setAuthSession] = React.useState<SupabaseAuthSession | null>(() => getStoredSupabaseAuthSession());
  const currentUserIdRef = React.useRef<string | null>(authSession?.user.id ?? null);
  const privateSessionId = authSession?.user.id ? `user-${authSession.user.id}` : devicePrivateSessionId;
  const privateSessionKeys = React.useMemo(() => createPrivateSessionKeys(privateSessionId), [privateSessionId]);
  const analyticsUserId = React.useMemo(createAnalyticsUserId, []);
  const [activeView, setActiveView] = React.useState<AppView>('morning');
  const [authError, setAuthError] = React.useState('');
  const [authNotice, setAuthNotice] = React.useState('');
  const [onboardingSettings, setOnboardingSettings] = React.useState<OnboardingSettings>(createDefaultOnboardingSettings);
  const [isOnboardingGuideOpen, setIsOnboardingGuideOpen] = React.useState(false);
  const [isAuthLoading, setIsAuthLoading] = React.useState(false);
  const [isListening, setIsListening] = React.useState(false);
  const [transcript, setTranscript] = React.useState('');
  const [originalTranscript, setOriginalTranscript] = React.useState('');
  const [updateInstruction, setUpdateInstruction] = React.useState('');
  const [originalUpdateInstruction, setOriginalUpdateInstruction] = React.useState('');
  const [interimTranscript, setInterimTranscript] = React.useState('');
  const [error, setError] = React.useState('');
  const [plan, setPlan] = React.useState<MorningPlan | null>(null);
  const [captureMode, setCaptureMode] = React.useState<CaptureMode>('create');
  const [highlightedScheduleKeys, setHighlightedScheduleKeys] = React.useState<string[]>([]);
  const [isOrganizing, setIsOrganizing] = React.useState(false);
  const [isResetDialogOpen, setIsResetDialogOpen] = React.useState(false);
  const [isTranscriptClearConfirmOpen, setIsTranscriptClearConfirmOpen] = React.useState(false);
  const [aiInboxItems, setAiInboxItems] = React.useState<AiInboxItem[]>([]);
  const [aiInboxMessage, setAiInboxMessage] = React.useState('');
  const [shoppingText, setShoppingText] = React.useState('');
  const [originalShoppingText, setOriginalShoppingText] = React.useState('');
  const [shoppingItems, setShoppingItems] = React.useState<ShoppingItem[]>([]);
  const [shoppingUpdatedAt, setShoppingUpdatedAt] = React.useState('');
  const [shoppingError, setShoppingError] = React.useState('');
  const [shoppingShareMessage, setShoppingShareMessage] = React.useState('');
  const [shoppingSyncError, setShoppingSyncError] = React.useState('');
  const [shoppingSyncStatus, setShoppingSyncStatus] = React.useState<'local' | 'syncing' | 'synced' | 'error'>(
    isSupabaseShoppingConfigured() ? 'syncing' : 'local',
  );
  const [shoppingSupabaseDebug, setShoppingSupabaseDebug] = React.useState<ShoppingSupabaseDebug>(() =>
    createShoppingSupabaseDebug('init'),
  );
  const [shoppingCaptureMode, setShoppingCaptureMode] = React.useState<ShoppingCaptureMode>('shopping');
  const [mealPlanText, setMealPlanText] = React.useState('');
  const [originalMealPlanText, setOriginalMealPlanText] = React.useState('');
  const [mealServings, setMealServings] = React.useState(4);
  const [mealCandidates, setMealCandidates] = React.useState<MealIngredientCandidate[]>([]);
  const [mealPlanDebug, setMealPlanDebug] = React.useState<MealPlanDebug | null>(null);
  const [isShoppingOrganizing, setIsShoppingOrganizing] = React.useState(false);
  const [isShoppingResetDialogOpen, setIsShoppingResetDialogOpen] = React.useState(false);
  const [highlightedShoppingIds, setHighlightedShoppingIds] = React.useState<string[]>([]);
  const [selectedShoppingShareIds, setSelectedShoppingShareIds] = React.useState<string[]>([]);
  const [feedbackText, setFeedbackText] = React.useState('');
  const [followUpCaptureText, setFollowUpCaptureText] = React.useState('');
  const [isFollowUpClearConfirmOpen, setIsFollowUpClearConfirmOpen] = React.useState(false);
  const [followUpSplitDebug, setFollowUpSplitDebug] = React.useState<FollowUpSplitDebug | null>(null);
  const [followUpReviewItems, setFollowUpReviewItems] = React.useState<FollowUpDraftItem[]>([]);
  const [morningFollowUpCandidates, setMorningFollowUpCandidates] = React.useState<FollowUpDraftItem[]>([]);
  const [morningFollowUpMessage, setMorningFollowUpMessage] = React.useState('');
  const [followUps, setFollowUps] = React.useState<FollowUpItem[]>([]);
  const [followUpSyncError, setFollowUpSyncError] = React.useState('');
  const [followUpLastSyncedAt, setFollowUpLastSyncedAt] = React.useState<string | null>(null);
  const [followUpSyncStatus, setFollowUpSyncStatus] = React.useState<'local' | 'syncing' | 'synced' | 'error'>(
    isSupabaseFollowUpConfigured() ? 'syncing' : 'local',
  );
  const [followUpSupabaseDebug, setFollowUpSupabaseDebug] = React.useState<FollowUpSupabaseDebug>(() =>
    createFollowUpSupabaseDebug('init'),
  );
  const [previousSnapshot, setPreviousSnapshot] = React.useState<MorningSnapshot | null>(null);
  const [reviewStatuses, setReviewStatuses] = React.useState<Record<string, ReviewStatus>>({});
  const [carriedTodos, setCarriedTodos] = React.useState<string[]>([]);
  const [morningReviewDraft, setMorningReviewDraft] = React.useState<MorningReviewDraft | null>(null);
  const [isDeveloperDebugOpen, setIsDeveloperDebugOpen] = React.useState(false);
  const [assistantRuntimeDebug, setAssistantRuntimeDebug] = React.useState<AssistantRuntimeDebug>(createInitialAssistantRuntimeDebug);
  const [userIsolationDebug, setUserIsolationDebug] = React.useState<UserIsolationDebug>(() =>
    createInitialUserIsolationDebug({
      currentUserEmail: authSession?.user.email ?? '',
      currentUserId: authSession?.user.id ?? '',
      localStorageShoppingKeys: listShoppingLocalStorageKeys(),
    }),
  );
  const [voiceRecognitionDebug, setVoiceRecognitionDebug] = React.useState<VoiceRecognitionDebug>(() => ({
    error: '',
    lastEvent: 'init',
    restartCount: 0,
    status: 'idle',
    updatedAt: '',
  }));
  const [conversationDraft, setConversationDraft] = React.useState<MorningReviewDraft>(createEmptyConversationDraft);
  const [conversationMessages, setConversationMessages] = React.useState<AiConversationMessage[]>(createInitialConversationMessages);
  const [pendingConversationIntent, setPendingConversationIntent] = React.useState<PendingConversationIntent | null>(null);
  const [pendingConversationFollowUp, setPendingConversationFollowUp] = React.useState<FollowUpDraftItem | null>(null);
  const planAnchorRef = React.useRef<HTMLDivElement | null>(null);
  const recognitionRef = React.useRef<SpeechRecognitionLike | null>(null);
  const isListeningRef = React.useRef(false);
  const manualStopRef = React.useRef(false);
  const transcriptBufferRef = React.useRef('');
  const interimBufferRef = React.useRef('');
  const recognitionRestartTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const recognitionRestartCountRef = React.useRef(0);
  const activeViewRef = React.useRef<AppView>('morning');

  const isSupported = Boolean(SpeechRecognition);
  const isShoppingView = activeView === 'shopping';
  const isFollowUpView = activeView === 'followUp';
  const isInboxView = activeView === 'inbox';
  const isFeedbackView = activeView === 'feedback';
  const getMorningSourceText = React.useCallback(
    () => [transcript, interimTranscript].filter(Boolean).join('\n').trim(),
    [interimTranscript, transcript],
  );
  const resultText = getMorningSourceText();
  const activeShoppingText = shoppingCaptureMode === 'meal' ? mealPlanText : shoppingText;
  const activeSavedShoppingText = shoppingCaptureMode === 'meal' ? originalMealPlanText : originalShoppingText;
  const shoppingResultText = [activeShoppingText, isShoppingView ? interimTranscript : ''].filter(Boolean).join('\n');
  const feedbackResultText = [feedbackText, isFeedbackView ? interimTranscript : ''].filter(Boolean).join('\n');
  const followUpResultText = [followUpCaptureText, isFollowUpView ? interimTranscript : ''].filter(Boolean).join('\n');
  const canOrganize = false;
  const canUpdatePlan = false;
  const canOrganizeShopping = Boolean(activeShoppingText.trim()) && !isListening;
  const canUseNext = canOrganize || canUpdatePlan || Boolean(plan);
  const nextButtonLabel = isOrganizing
    ? canUpdatePlan
      ? 'スケジュールを更新中…'
      : 'AIが整理中…'
    : '次へ進む';
  const hasEditableTranscript = Boolean(resultText.trim()) && captureMode === 'create';
  const pendingFollowUps = React.useMemo(() => followUps.filter((item) => !item.completed), [followUps]);
  const dueTodayFollowUps = React.useMemo(
    () => pendingFollowUps.filter((item) => isSameLocalDate(parseFollowUpDate(item.dueDate), new Date())),
    [pendingFollowUps],
  );
  const unprocessedInboxCount = React.useMemo(
    () => aiInboxItems.filter((item) => item.status === 'unprocessed').length,
    [aiInboxItems],
  );
  const morningDashboard = React.useMemo(
    () => createMorningDashboardData(plan, shoppingItems, followUps, aiInboxItems),
    [aiInboxItems, followUps, plan, shoppingItems],
  );

  React.useEffect(() => {
    activeViewRef.current = activeView;
  }, [activeView]);

  const getFreshAuthSession = React.useCallback(async (): Promise<{ session: SupabaseAuthSession; tokenStatus: string }> => {
    const currentSession = authSession ?? getStoredSupabaseAuthSession();
    if (!currentSession?.access_token || !currentSession.user) {
      throw new Error('ログインユーザーを確認できませんでした。');
    }

    if (!isSupabaseAuthTokenExpired(currentSession)) {
      return { session: currentSession, tokenStatus: 'token valid' };
    }

    const refreshedSession = await refreshSupabaseAuthSession(currentSession);
    if (!refreshedSession?.access_token || !refreshedSession.user) {
      throw new Error('ログインセッションを更新できませんでした。もう一度ログインしてください。');
    }
    storeSupabaseAuthSession(refreshedSession);
    currentUserIdRef.current = refreshedSession.user.id;
    setAuthSession(refreshedSession);
    return { session: refreshedSession, tokenStatus: 'token expired / token refreshed' };
  }, [authSession]);

  React.useEffect(() => {
    const userId = authSession?.user.id;
    if (!userId) {
      setOnboardingSettings(createDefaultOnboardingSettings());
      setIsOnboardingGuideOpen(false);
      return;
    }

    const settings = loadOnboardingSettings(userId);
    setOnboardingSettings(settings);
    setIsOnboardingGuideOpen(shouldShowOnboardingGuide(settings, onboardingGuideId));
  }, [authSession?.user.id]);

  const saveOnboardingSettings = React.useCallback(
    (nextSettings: OnboardingSettings) => {
      setOnboardingSettings(nextSettings);
      if (authSession?.user.id) saveOnboardingSettingsForUser(authSession.user.id, nextSettings);
    },
    [authSession?.user.id],
  );

  const finishOnboardingGuide = React.useCallback(
    (preference: OnboardingPreference) => {
      const nextSettings = {
        preference,
        seenGuideIds: Array.from(new Set([...onboardingSettings.seenGuideIds, onboardingGuideId])),
      };
      saveOnboardingSettings(nextSettings);
      setIsOnboardingGuideOpen(false);
    },
    [onboardingSettings.seenGuideIds, saveOnboardingSettings],
  );

  const updateOnboardingPreference = React.useCallback(
    (preference: OnboardingPreference) => {
      const nextSettings = {
        ...onboardingSettings,
        preference,
      };
      saveOnboardingSettings(nextSettings);
    },
    [onboardingSettings, saveOnboardingSettings],
  );

  const resetLocalWorkspaceState = React.useCallback(() => {
    setActiveView('morning');
    setTranscript('');
    setOriginalTranscript('');
    setUpdateInstruction('');
    setOriginalUpdateInstruction('');
    setInterimTranscript('');
    setError('');
    setPlan(null);
    setMorningReviewDraft(null);
    setCaptureMode('create');
    setHighlightedScheduleKeys([]);
    setIsResetDialogOpen(false);
    setIsTranscriptClearConfirmOpen(false);
    setAiInboxItems([]);
    setAiInboxMessage('');
    setShoppingText('');
    setOriginalShoppingText('');
    setShoppingItems([]);
    setShoppingUpdatedAt('');
    setShoppingError('');
    setShoppingShareMessage('');
    setShoppingCaptureMode('shopping');
    setMealPlanText('');
    setOriginalMealPlanText('');
    setMealServings(4);
    setMealCandidates([]);
    setMealPlanDebug(null);
    setIsShoppingResetDialogOpen(false);
    setHighlightedShoppingIds([]);
    setSelectedShoppingShareIds([]);
    setFeedbackText('');
    setFollowUpCaptureText('');
    setIsFollowUpClearConfirmOpen(false);
    setFollowUpSplitDebug(null);
    setFollowUpReviewItems([]);
    setMorningFollowUpCandidates([]);
    setMorningFollowUpMessage('');
    setFollowUps([]);
    setFollowUpLastSyncedAt(null);
    setPreviousSnapshot(null);
    setReviewStatuses({});
    setCarriedTodos([]);
    setIsListening(false);
    setConversationDraft(createEmptyConversationDraft());
    setConversationMessages(createInitialConversationMessages());
    setPendingConversationIntent(null);
    setPendingConversationFollowUp(null);
    setAssistantRuntimeDebug(createInitialAssistantRuntimeDebug());
    setVoiceRecognitionDebug({
      error: '',
      lastEvent: 'state-reset',
      restartCount: 0,
      status: 'idle',
      updatedAt: new Date().toISOString(),
    });
    transcriptBufferRef.current = '';
    interimBufferRef.current = '';
    recognitionRestartCountRef.current = 0;
  }, []);

  const applyAuthenticatedSession = React.useCallback(
    (session: SupabaseAuthSession) => {
      const nextUserId = session.user.id;
      const userChanged = currentUserIdRef.current !== nextUserId;
      const clearedKeys = userChanged ? clearMorningFlowVolatileLocalStorage() : [];
      if (userChanged) {
        resetLocalWorkspaceState();
      }
      currentUserIdRef.current = nextUserId;
      storeSupabaseAuthSession(session);
      setAuthSession(session);
      setUserIsolationDebug((current) =>
        createInitialUserIsolationDebug({
          ...current,
          authChangeStateReset: userChanged,
          currentUserEmail: session.user.email ?? '',
          currentUserId: nextUserId,
          localStorageShoppingKeys: listShoppingLocalStorageKeys(),
          logoutClearedKeys: clearedKeys,
          resetAt: userChanged ? new Date().toISOString() : current.resetAt,
        }),
      );
    },
    [resetLocalWorkspaceState],
  );

  React.useEffect(() => {
    currentUserIdRef.current = authSession?.user.id ?? null;
  }, [authSession?.user.id]);

  React.useEffect(() => {
    let isMounted = true;
    const restoreSession = async () => {
      if (authSession?.user) return;
      try {
        const session = await restoreSupabaseAuthSessionFromUrl();
        if (!isMounted || !session?.access_token || !session.user) return;
        applyAuthenticatedSession(session);
        setAuthNotice('メール認証が完了し、ログイン状態を復元しました。');
        setAuthError('');
        console.info('[MORNING FLOW AI] Supabase auth state change', { event: 'session-restored', userId: session.user.id });
      } catch (error) {
        console.warn('[MORNING FLOW AI] Supabase auth session restore failed', error);
        if (isMounted) setAuthError(getAuthErrorMessage(error));
      }
    };
    void restoreSession();
    return () => {
      isMounted = false;
    };
  }, [applyAuthenticatedSession, authSession?.user]);

  React.useEffect(() => {
    if (!localStorage.getItem(analyticsInstallTrackedKey)) {
      trackAnalyticsEvent(analyticsUserId, 'app_install');
      localStorage.setItem(analyticsInstallTrackedKey, 'true');
    }
    trackAnalyticsEvent(analyticsUserId, 'app_open');
  }, [analyticsUserId]);

  React.useEffect(() => {
    resetLocalWorkspaceState();
    const isAuthenticatedUser = Boolean(authSession?.user.id);
    const clearedKeys = isAuthenticatedUser ? clearMorningFlowVolatileLocalStorage() : [];
    removeLegacySharedStorage(privateSessionId);
    setUserIsolationDebug((current) =>
      createInitialUserIsolationDebug({
        ...current,
        authChangeStateReset: isAuthenticatedUser,
        currentUserEmail: authSession?.user.email ?? '',
        currentUserId: authSession?.user.id ?? '',
        localStorageShoppingKeys: listShoppingLocalStorageKeys(),
        logoutClearedKeys: clearedKeys.length ? clearedKeys : current.logoutClearedKeys,
        resetAt: isAuthenticatedUser ? new Date().toISOString() : current.resetAt,
      }),
    );
    if (isAuthenticatedUser) {
      return;
    }
    const snapshot = loadLatestSnapshot(privateSessionKeys.snapshots);
    setPreviousSnapshot(snapshot);
    setReviewStatuses(snapshot?.review?.statuses ?? {});
    const savedDraft = localStorage.getItem(privateSessionKeys.draft);
    if (savedDraft) {
      setTranscript(savedDraft);
      setOriginalTranscript(savedDraft);
    }
    const savedShopping = localStorage.getItem(privateSessionKeys.shopping);
    if (savedShopping) {
      try {
        const parsed = JSON.parse(savedShopping) as {
          items?: ShoppingItem[];
          text?: string;
          updatedAt?: string;
          mealText?: string;
          mealServings?: number;
          mealCandidates?: MealIngredientCandidate[];
        };
        setShoppingText(parsed.text ?? '');
        setOriginalShoppingText(parsed.text ?? '');
        setShoppingItems(Array.isArray(parsed.items) ? postProcessShoppingItems(parsed.items, parsed.text ?? '') : []);
        setShoppingUpdatedAt(parsed.updatedAt ?? '');
        setMealPlanText(parsed.mealText ?? '');
        setOriginalMealPlanText(parsed.mealText ?? '');
        setMealServings(parsed.mealServings ?? 4);
        setMealCandidates(Array.isArray(parsed.mealCandidates) ? parsed.mealCandidates : []);
      } catch {
        localStorage.removeItem(privateSessionKeys.shopping);
      }
    }
    const savedFollowUps = localStorage.getItem(privateSessionKeys.followUps);
    if (savedFollowUps) {
      try {
        const parsed = JSON.parse(savedFollowUps) as FollowUpItem[];
        setFollowUps(Array.isArray(parsed) ? parsed : []);
      } catch {
        localStorage.removeItem(privateSessionKeys.followUps);
      }
    }
    const savedInbox = localStorage.getItem(privateSessionKeys.inbox);
    if (savedInbox) {
      try {
        const parsed = JSON.parse(savedInbox) as AiInboxItem[];
        setAiInboxItems(Array.isArray(parsed) ? parsed.map(normalizeAiInboxItem) : []);
      } catch {
        localStorage.removeItem(privateSessionKeys.inbox);
      }
    }
  }, [authSession?.user.email, authSession?.user.id, privateSessionId, privateSessionKeys, resetLocalWorkspaceState]);

  React.useEffect(() => {
    if (transcript.trim()) {
      localStorage.setItem(privateSessionKeys.draft, transcript);
    } else {
      localStorage.removeItem(privateSessionKeys.draft);
    }
  }, [privateSessionKeys.draft, transcript]);

  React.useEffect(() => {
    if (!aiInboxItems.length) {
      localStorage.removeItem(privateSessionKeys.inbox);
      return;
    }

    localStorage.setItem(privateSessionKeys.inbox, JSON.stringify(aiInboxItems));
  }, [aiInboxItems, privateSessionKeys.inbox]);

  React.useEffect(() => {
    if (!highlightedScheduleKeys.length) return;
    const timeoutId = window.setTimeout(() => setHighlightedScheduleKeys([]), 7000);
    return () => window.clearTimeout(timeoutId);
  }, [highlightedScheduleKeys]);

  React.useEffect(() => {
    if (!shoppingText.trim() && !shoppingItems.length && !mealPlanText.trim() && !mealCandidates.length) {
      localStorage.removeItem(privateSessionKeys.shopping);
      return;
    }

    localStorage.setItem(
      privateSessionKeys.shopping,
      JSON.stringify({
        mealCandidates,
        mealServings,
        mealText: mealPlanText,
        items: shoppingItems,
        text: shoppingText,
        updatedAt: shoppingUpdatedAt,
      }),
    );
  }, [mealCandidates, mealPlanText, mealServings, privateSessionKeys.shopping, shoppingItems, shoppingText, shoppingUpdatedAt]);

  React.useEffect(() => {
    if (!followUps.length) {
      localStorage.removeItem(privateSessionKeys.followUps);
      return;
    }

    localStorage.setItem(privateSessionKeys.followUps, JSON.stringify(followUps));
  }, [followUps, privateSessionKeys.followUps]);

  const syncFollowUpsFromSupabase = React.useCallback(async () => {
    if (!isSupabaseFollowUpConfigured()) {
      setFollowUpSyncStatus('local');
      return;
    }
    setFollowUpSyncStatus('syncing');
    try {
      const { session } = await getFreshAuthSession();
      const requestedUserId = session.user.id;
      const rows = await fetchSupabaseFollowUps(requestedUserId, session.access_token);
      if (currentUserIdRef.current !== requestedUserId) {
        console.warn('[MORNING FLOW AI] Discarded stale follow-up sync result', {
          currentUserId: currentUserIdRef.current,
          requestedUserId,
        });
        return;
      }
      setFollowUps(rows.map(mapSupabaseRowToFollowUpItem));
      setFollowUpSyncError('');
      setFollowUpLastSyncedAt(new Date().toISOString());
      setFollowUpSyncStatus('synced');
    } catch (error) {
      setFollowUpSyncError('同期できませんでした。通信を確認してください。');
      setFollowUpSyncStatus('error');
    }
  }, [getFreshAuthSession]);

  const getShoppingSupabaseAuth = React.useCallback(async () => {
    if (!isSupabaseShoppingConfigured()) return null;
    const { session, tokenStatus } = await getFreshAuthSession();
    return { accessToken: session.access_token, tokenStatus, userId: session.user.id };
  }, [getFreshAuthSession]);

  const syncShoppingItemsFromSupabase = React.useCallback(async () => {
    const auth = await getShoppingSupabaseAuth();
    if (!auth) {
      setShoppingSyncStatus('local');
      return;
    }

    setShoppingSyncStatus('syncing');
    try {
      const requestedUserId = auth.userId;
      const rows = await fetchSupabaseShoppingItems(requestedUserId, auth.accessToken);
      if (currentUserIdRef.current !== requestedUserId) {
        console.warn('[MORNING FLOW AI] Discarded stale shopping sync result', {
          currentUserId: currentUserIdRef.current,
          requestedUserId,
        });
        return;
      }
      const ownedRows = rows.filter((row) => row.user_id === requestedUserId);
      setShoppingItems(postProcessShoppingItems(ownedRows.map(mapSupabaseRowToShoppingItem)));
      setShoppingUpdatedAt(new Date().toISOString());
      setShoppingSyncError('');
      setShoppingSyncStatus('synced');
      setUserIsolationDebug((current) => ({
        ...current,
        currentUserEmail: authSession?.user.email ?? current.currentUserEmail,
        currentUserId: requestedUserId,
        localStorageShoppingKeys: listShoppingLocalStorageKeys(),
        shoppingFetchedCount: ownedRows.length,
      }));
    } catch (error) {
      console.error('[MORNING FLOW AI] Shopping sync failed', error);
      setShoppingSyncError('買い物リストを同期できませんでした。通信を確認してください。');
      setShoppingSyncStatus('error');
    }
  }, [authSession?.user.email, getShoppingSupabaseAuth]);

  const syncShoppingItemsToSupabase = React.useCallback(
    async (items: ShoppingItem[]) => {
      const auth = await getShoppingSupabaseAuth();
      if (!auth) {
        setShoppingSyncStatus('local');
        setShoppingSupabaseDebug(createShoppingSupabaseDebug('local:save'));
        return;
      }
      if (currentUserIdRef.current !== auth.userId) {
        console.warn('[MORNING FLOW AI] Blocked stale shopping upload for previous user', {
          currentUserId: currentUserIdRef.current,
          payloadUserId: auth.userId,
        });
        setShoppingSupabaseDebug(createShoppingSupabaseDebug('upsert:blocked-stale-user', undefined, [], auth.userId, auth.accessToken, auth.tokenStatus));
        return;
      }
      const payload = items.map((item) => mapShoppingItemToSupabase(item, auth.userId));
      try {
        setShoppingSyncStatus('syncing');
        setShoppingSupabaseDebug(createShoppingSupabaseDebug('upsert:start', undefined, payload, auth.userId, auth.accessToken, auth.tokenStatus));
        const rows = await upsertSupabaseShoppingItems(payload, auth.accessToken);
        setShoppingSyncError('');
        setShoppingSyncStatus('synced');
        setShoppingSupabaseDebug({
          ...createShoppingSupabaseDebug('upsert:success', undefined, payload, auth.userId, auth.accessToken, auth.tokenStatus),
          responseStatus: '201 Created',
          rowCount: rows.length,
        });
      } catch (error) {
        console.error('[MORNING FLOW AI] Shopping upsert failed', error);
        setShoppingSyncError('買い物リストを保存できませんでした。通信を確認してください。');
        setShoppingSyncStatus('error');
        setShoppingSupabaseDebug(createShoppingSupabaseDebug('upsert:error', error, payload, auth.userId, auth.accessToken, auth.tokenStatus));
      }
    },
    [getShoppingSupabaseAuth],
  );

  React.useEffect(() => {
    void syncFollowUpsFromSupabase();

    if (!isSupabaseFollowUpConfigured()) return;
    const intervalId = window.setInterval(() => {
      void syncFollowUpsFromSupabase();
    }, 10000);

    return () => window.clearInterval(intervalId);
  }, [syncFollowUpsFromSupabase]);

  React.useEffect(() => {
    void syncShoppingItemsFromSupabase();

    if (!isSupabaseShoppingConfigured()) return;
    const intervalId = window.setInterval(() => {
      void syncShoppingItemsFromSupabase();
    }, 15000);

    return () => window.clearInterval(intervalId);
  }, [getShoppingSupabaseAuth, syncShoppingItemsFromSupabase]);

  React.useEffect(() => {
    if (!highlightedShoppingIds.length) return;
    const timeoutId = window.setTimeout(() => setHighlightedShoppingIds([]), 7000);
    return () => window.clearTimeout(timeoutId);
  }, [highlightedShoppingIds]);

  React.useEffect(() => {
    setInterimTranscript('');
  }, [activeView]);

  const saveVoiceTextToAiInbox = React.useCallback((text: string, sourceView: AppView) => {
    const normalized = text.trim();
    if (!normalized) return;
    const classification = classifyAiInboxText(normalized);
    const nextItem: AiInboxItem = {
      category: classification.category,
      confidence: classification.confidence,
      createdAt: new Date().toISOString(),
      id: createLocalId('ai-inbox'),
      sourceView,
      status: 'unprocessed',
      text: normalized,
    };
    setAiInboxItems((current) => [nextItem, ...current]);
    setAiInboxMessage('AI Inboxに保存しました。分類候補を確認して整理できます。');
    setInterimTranscript('');
    setActiveView('inbox');
  }, []);

  const processMorningConversationTurn = React.useCallback(
    async (text: string) => {
      const normalized = text.trim();
      if (!normalized) return;

      if (morningReviewDraft && isConversationSaveCommand(normalized)) {
        const draft = morningReviewDraft;
        setTranscript((current) => appendVoiceText(current, normalized));
        setOriginalTranscript((current) => appendVoiceText(current, normalized));
        setInterimTranscript('');
        setPlan(draft.plan);
        const reviewedShoppingItems = normalizeLlmFirstShoppingItems(draft.shoppingItems);
        setShoppingItems(reviewedShoppingItems);
        void syncShoppingItemsToSupabase(reviewedShoppingItems);
        setMorningFollowUpCandidates(draft.followUpCandidates);
        setShoppingUpdatedAt(draft.shoppingUpdatedAt);
        saveMorningSnapshot(draft.sourceText, draft.plan, privateSessionKeys.snapshots);
        setMorningReviewDraft(null);
        setConversationMessages((current) => [
          ...current,
          {
            id: createLocalId('conversation-user'),
            role: 'user',
            title: 'あなた',
            lines: [normalized],
          },
          {
            id: createLocalId('conversation-ai'),
            role: 'assistant',
            title: '保存完了',
            lines: ['保存しました。今日の流れに反映しました。'],
          },
        ]);
        window.requestAnimationFrame(() => {
          planAnchorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
        return;
      }

      setTranscript((current) => appendVoiceText(current, normalized));
      setOriginalTranscript((current) => appendVoiceText(current, normalized));
      setPlan(null);
      if (!morningReviewDraft) setMorningReviewDraft(null);
      setMorningFollowUpCandidates([]);
      setMorningFollowUpMessage('');
      setInterimTranscript('');

      let nextDraft = conversationDraft;
      let assistantLines: string[] = [];
      let shouldOpenReview = false;
      let nextPendingIntent = pendingConversationIntent;
      let nextPendingFollowUp = pendingConversationFollowUp;

      try {
        const llmResult = await processLlmAssistantTurn({
          conversationDraft,
          conversationMessages,
          followUps,
          plan,
          shoppingItems,
          text: normalized,
        });
        nextDraft = llmResult.draft;
        assistantLines = llmResult.assistantLines;
        shouldOpenReview = llmResult.shouldOpenReview;
        nextPendingIntent = null;
        nextPendingFollowUp = null;
        setAssistantRuntimeDebug({
          actionsCount: llmResult.actionsCount,
          assistantLinesCount: llmResult.assistantLinesCount,
          calendarCount: llmResult.calendarCount,
          draftAutoGenerated: llmResult.draftAutoGenerated,
          draftItemCount: llmResult.draftItemCount,
          error: '',
          extractedCalendarCandidates: llmResult.extractedCalendarCandidates,
          extractedFollowUpItems: llmResult.extractedFollowUpItems,
          extractedScheduleItems: llmResult.extractedScheduleItems,
          extractedShoppingItems: llmResult.extractedShoppingItems,
          extractedCount: llmResult.extractedCount,
          calendarRejectReasons: llmResult.calendarRejectReasons,
          followUpRejectReasons: llmResult.followUpRejectReasons,
          followUpCount: llmResult.followUpCount,
          jsonParseSuccess: llmResult.jsonParseSuccess,
          lastLlmJson: llmResult.lastLlmJson,
          fallbackError: '',
          lastActions: llmResult.lastActions,
          lastAssistantResponse: llmResult.lastAssistantResponse,
          lastAssistantAction: describeAssistantAction(llmResult.toolCalls, llmResult.shouldOpenReview),
          lastUserIntent: detectNaturalUserIntent(normalized),
          lostEntityCount: llmResult.lostEntityCount,
          needsClarification: llmResult.needsClarification,
          clarifyingQuestion: llmResult.clarifyingQuestion,
          parseError: llmResult.parseError,
          pendingSave: llmResult.pendingSave,
          prioritySuggestionsCount: llmResult.prioritySuggestionsCount,
          mode: 'llm-native',
          model: llmResult.model,
          rawToolCallsCount: llmResult.rawToolCallsCount,
          scheduleCount: llmResult.scheduleCount,
          shoppingCount: llmResult.shoppingCount,
          toolCalls: llmResult.toolCalls,
          updatedAt: new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        });
      } catch (error) {
        console.warn('[MORNING FLOW AI] LLM assistant fallback', error);
        nextDraft = {
          ...conversationDraft,
          sourceText: appendVoiceText(conversationDraft.sourceText, normalized),
        };
        assistantLines = [
          'AI接続に失敗しました。',
          '少し時間をおいてもう一度お試しください。',
          '入力内容は保存せず、この会話内に保持しています。',
        ];
        shouldOpenReview = false;
        nextPendingIntent = null;
        nextPendingFollowUp = null;
        setAssistantRuntimeDebug({
          actionsCount: 0,
          assistantLinesCount: 0,
          calendarCount: 0,
          draftAutoGenerated: false,
          draftItemCount: 0,
          error: error instanceof Error ? error.message : String(error),
          extractedCalendarCandidates: [],
          extractedFollowUpItems: [],
          extractedScheduleItems: [],
          extractedShoppingItems: [],
          extractedCount: 0,
          calendarRejectReasons: [],
          followUpRejectReasons: [],
          followUpCount: 0,
          jsonParseSuccess: false,
          lastLlmJson: '',
          fallbackError: error instanceof Error ? error.message : String(error),
          lastActions: [],
          lastAssistantResponse: '',
          lastAssistantAction: 'fallback-message-only',
          lastUserIntent: detectNaturalUserIntent(normalized),
          lostEntityCount: 0,
          needsClarification: false,
          clarifyingQuestion: '',
          parseError: error instanceof Error ? error.message : String(error),
          pendingSave: false,
          prioritySuggestionsCount: 0,
          mode: 'fallback',
          model: '',
          rawToolCallsCount: 0,
          scheduleCount: 0,
          shoppingCount: 0,
          toolCalls: [],
          updatedAt: new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        });
      }

      setConversationDraft(nextDraft);
      setPendingConversationIntent(nextPendingIntent);
      setPendingConversationFollowUp(nextPendingFollowUp);
      const result = { assistantLines, draft: nextDraft, shouldOpenReview };
      setConversationMessages((current) => [
        ...current,
        {
          id: createLocalId('conversation-user'),
          role: 'user',
          title: 'あなた',
          lines: [normalized],
        },
        {
          id: createLocalId('conversation-ai'),
          role: 'assistant',
          title: result.shouldOpenReview ? '保存前確認です' : 'AI秘書',
          lines: result.assistantLines,
        },
      ]);

      if (result.shouldOpenReview) {
        setMorningReviewDraft(result.draft);
      }
    },
    [conversationDraft, conversationMessages, followUps, pendingConversationFollowUp, pendingConversationIntent, plan, shoppingItems],
  );

  const routeFinalVoiceText = React.useCallback(
    (text: string, sourceView: AppView) => {
      const normalized = text.trim();
      if (!normalized) return;

      if (sourceView === 'shopping') {
        if (shoppingCaptureMode === 'meal') {
          setMealPlanText((current) => appendVoiceText(current, normalized));
        } else {
          setShoppingText((current) => appendVoiceText(current, normalized));
        }
        setInterimTranscript('');
        return;
      }

      if (sourceView === 'followUp') {
        setFollowUpCaptureText((current) => appendVoiceText(current, normalized));
        setInterimTranscript('');
        return;
      }

      if (sourceView === 'feedback') {
        setFeedbackText((current) => appendVoiceText(current, normalized));
        setInterimTranscript('');
        return;
      }

      if (sourceView === 'morning') {
        processMorningConversationTurn(normalized);
        return;
      }

      saveVoiceTextToAiInbox(normalized, sourceView);
    },
    [processMorningConversationTurn, saveVoiceTextToAiInbox, shoppingCaptureMode],
  );

  React.useEffect(() => {
    if (!SpeechRecognition) return;

    const updateVoiceDebug = (next: Partial<VoiceRecognitionDebug>) => {
      setVoiceRecognitionDebug((current) => ({
        ...current,
        ...next,
        restartCount: recognitionRestartCountRef.current,
        updatedAt: new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      }));
    };
    const restartRecognition = () => {
      if (!recognitionRef.current || manualStopRef.current || !isListeningRef.current) return;
      if (recognitionRestartCountRef.current >= 8) {
        isListeningRef.current = false;
        setIsListening(false);
        updateVoiceDebug({ lastEvent: 'restart-limit', status: 'stopped' });
        return;
      }
      recognitionRestartCountRef.current += 1;
      updateVoiceDebug({ lastEvent: 'onend:auto-restart', status: 'auto-restarting' });
      recognitionRestartTimerRef.current = setTimeout(() => {
        if (!recognitionRef.current || manualStopRef.current || !isListeningRef.current) return;
        try {
          recognitionRef.current.start();
        } catch (error) {
          console.warn('[MORNING FLOW AI] speech recognition restart failed', error);
          updateVoiceDebug({ error: error instanceof Error ? error.message : String(error), lastEvent: 'restart:error', status: 'error' });
        }
      }, 350);
    };

    const instance = new SpeechRecognition();
    recognitionRef.current = instance;
    instance.lang = 'ja-JP';
    instance.continuous = true;
    instance.interimResults = true;

    instance.onstart = () => {
      isListeningRef.current = true;
      setIsListening(true);
      updateVoiceDebug({ error: '', lastEvent: 'onstart', status: 'listening' });
      if (activeViewRef.current === 'shopping') {
        setShoppingError('');
      } else if (activeViewRef.current === 'followUp') {
        setIsFollowUpClearConfirmOpen(false);
      } else {
        setError('');
      }
    };

    instance.onend = () => {
      updateVoiceDebug({ lastEvent: 'onend', status: manualStopRef.current ? 'stopped' : 'auto-restarting' });
      if (manualStopRef.current || !isListeningRef.current) {
        isListeningRef.current = false;
        setIsListening(false);
        return;
      }
      restartRecognition();
    };

    instance.onerror = (event) => {
      console.warn('[MORNING FLOW AI] speech recognition error', event.error);
      const message = getSpeechErrorMessage(event.error);
      updateVoiceDebug({ error: event.error, lastEvent: `onerror:${event.error}`, status: 'error' });
      if (activeViewRef.current === 'shopping') {
        setShoppingError(message);
      } else {
        setError(message);
      }
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed' || event.error === 'audio-capture') {
        manualStopRef.current = true;
        isListeningRef.current = false;
        setIsListening(false);
      }
    };

    instance.onresult = (event) => {
      let finalText = '';
      let interimText = '';

      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const phrase = event.results[index][0].transcript;
        if (event.results[index].isFinal) {
          finalText += phrase;
        } else {
          interimText += phrase;
        }
      }

      if (finalText.trim()) {
        transcriptBufferRef.current = appendVoiceText(transcriptBufferRef.current, finalText.trim());
        updateVoiceDebug({ lastEvent: 'onresult:final', status: 'listening' });
      }
      interimBufferRef.current = interimText.trim();
      setInterimTranscript([transcriptBufferRef.current, interimBufferRef.current].filter(Boolean).join('\n'));
    };

    return () => {
      manualStopRef.current = true;
      isListeningRef.current = false;
      if (recognitionRestartTimerRef.current) clearTimeout(recognitionRestartTimerRef.current);
      instance.abort();
      recognitionRef.current = null;
    };
  }, []);

  const startListening = () => {
    const recognition = recognitionRef.current;
    if (!recognition || isListeningRef.current) return;

    if (activeView === 'shopping') {
      setShoppingError('');
    } else {
      setError('');
    }
    manualStopRef.current = false;
    isListeningRef.current = true;
    transcriptBufferRef.current = '';
    interimBufferRef.current = '';
    recognitionRestartCountRef.current = 0;
    if (recognitionRestartTimerRef.current) clearTimeout(recognitionRestartTimerRef.current);
    setVoiceRecognitionDebug({
      error: '',
      lastEvent: 'start:requested',
      restartCount: 0,
      status: 'listening',
      updatedAt: new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    });
    try {
      recognition.start();
    } catch {
      const message = '音声認識を開始できませんでした。少し待ってからもう一度お試しください。';
      if (activeView === 'shopping') {
        setShoppingError(message);
      } else {
        setError(message);
      }
    }
  };

  const stopListening = () => {
    const recognition = recognitionRef.current;
    manualStopRef.current = true;
    isListeningRef.current = false;
    setIsListening(false);
    if (recognitionRestartTimerRef.current) clearTimeout(recognitionRestartTimerRef.current);
    const bufferedText = [transcriptBufferRef.current, interimBufferRef.current].filter(Boolean).join('\n').trim();
    transcriptBufferRef.current = '';
    interimBufferRef.current = '';
    setInterimTranscript('');
    if (bufferedText) {
      routeFinalVoiceText(bufferedText, activeViewRef.current);
    }
    setVoiceRecognitionDebug((current) => ({
      ...current,
      lastEvent: bufferedText ? 'manual-stop:flush' : 'manual-stop',
      restartCount: recognitionRestartCountRef.current,
      status: 'stopped',
      updatedAt: new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    }));
    recognition?.stop();
  };

  const abortListening = React.useCallback(() => {
    manualStopRef.current = true;
    isListeningRef.current = false;
    transcriptBufferRef.current = '';
    interimBufferRef.current = '';
    if (recognitionRestartTimerRef.current) clearTimeout(recognitionRestartTimerRef.current);
    recognitionRef.current?.abort();
    setIsListening(false);
    setVoiceRecognitionDebug((current) => ({
      ...current,
      lastEvent: 'abort',
      restartCount: recognitionRestartCountRef.current,
      status: 'stopped',
      updatedAt: new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    }));
  }, []);

  const resetTranscript = () => {
    abortListening();
    setIsResetDialogOpen(false);
    setTranscript('');
    setOriginalTranscript('');
    setUpdateInstruction('');
    setOriginalUpdateInstruction('');
    setInterimTranscript('');
    setError('');
    setIsListening(false);
    setPlan(null);
    setMorningReviewDraft(null);
    setCarriedTodos([]);
    setCaptureMode('create');
    setHighlightedScheduleKeys([]);
    setMorningFollowUpCandidates([]);
    setMorningFollowUpMessage('');
    setConversationDraft(createEmptyConversationDraft());
    setConversationMessages(createInitialConversationMessages());
    setPendingConversationIntent(null);
    setPendingConversationFollowUp(null);
    transcriptBufferRef.current = '';
    interimBufferRef.current = '';
  };

  const useSample = () => {
    abortListening();
    setTranscript(sampleTranscript);
    setOriginalTranscript(sampleTranscript);
    setUpdateInstruction('');
    setOriginalUpdateInstruction('');
    setInterimTranscript('');
    setError('');
    setIsListening(false);
    setPlan(null);
    setMorningReviewDraft(null);
    setCaptureMode('create');
    setHighlightedScheduleKeys([]);
    setMorningFollowUpCandidates([]);
    setMorningFollowUpMessage('');
    setConversationDraft(createEmptyConversationDraft());
    setConversationMessages(createInitialConversationMessages());
    setPendingConversationFollowUp(null);
  };

  const organizeMorning = () => {
    const sourceText = getMorningSourceText();
    if (!sourceText) return;

    trackAnalyticsFeature(analyticsUserId, 'morning_flow');
    setTranscript(sourceText);
    setOriginalTranscript(sourceText);
    setInterimTranscript('');
    setIsOrganizing(true);
    setError('');
    setMorningFollowUpCandidates([]);
    setMorningFollowUpMessage('');

    console.info('[MORNING FLOW AI] organizeMorning source text', {
      sourceText,
      transcript,
      interimTranscript,
    });

    Promise.all([createAiMorningPlan(sourceText), createShoppingPlan(sourceText, shoppingItems)])
      .then(([nextPlan, shoppingPlan]) => {
        const currentShoppingItems = postProcessShoppingItems(shoppingItems);
        const normalizedShoppingItems = postProcessShoppingItems(
          normalizeMorningShoppingItems(sourceText, shoppingPlan.items, currentShoppingItems),
          sourceText,
        );
        const classifiedShoppingItems = hasShoppingItemIntent(sourceText) || normalizedShoppingItems.length > currentShoppingItems.length
          ? normalizedShoppingItems
          : currentShoppingItems;
        const planWithCarryover = addCarryoverToPlan(
          prepareUnifiedMorningPlan(nextPlan, sourceText, classifiedShoppingItems),
          carriedTodos,
        );
        const followUpCandidates = createMorningFollowUpCandidates(planWithCarryover, followUps);
        setMorningReviewDraft({
          followUpCandidates,
          plan: planWithCarryover,
          shoppingItems: classifiedShoppingItems,
          shoppingUpdatedAt: shoppingPlan.updatedAt,
          sourceText,
        });
        setCaptureMode('create');
        setUpdateInstruction('');
        setOriginalUpdateInstruction('');
        setHighlightedScheduleKeys([]);
      })
      .catch((reason: unknown) => {
        console.error(reason);
        setError('うまく処理できませんでした。もう一度お試しください。');
      })
      .finally(() => {
        setIsOrganizing(false);
      });
  };

  const confirmMorningReview = () => {
    const draft = morningReviewDraft;
    if (!draft) return;

    setPlan(draft.plan);
    const reviewedShoppingItems = normalizeLlmFirstShoppingItems(draft.shoppingItems);
    setShoppingItems(reviewedShoppingItems);
    void syncShoppingItemsToSupabase(reviewedShoppingItems);
    setMorningFollowUpCandidates(draft.followUpCandidates);
    setShoppingUpdatedAt(draft.shoppingUpdatedAt);
    saveMorningSnapshot(draft.sourceText, draft.plan, privateSessionKeys.snapshots);
    setMorningReviewDraft(null);
    window.requestAnimationFrame(() => {
      planAnchorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  const cancelMorningReview = () => {
    setMorningReviewDraft(null);
  };

  const applyScheduleUpdate = () => {
    if (!plan || !updateInstruction.trim()) return;

    const previousPlan = plan;
    setIsOrganizing(true);
    setError('');

    createAiMorningPlan(updateInstruction, {
      currentPlan: previousPlan,
      mode: 'update',
    })
      .then((nextPlan) => {
        const mergedPlan = preserveExistingPlan(previousPlan, nextPlan);
        setPlan(mergedPlan);
        setMorningFollowUpCandidates(createMorningFollowUpCandidates(mergedPlan, followUps));
        setMorningFollowUpMessage('');
        setHighlightedScheduleKeys(findNewScheduleKeys(previousPlan, mergedPlan));
        setTranscript((current) => `${current.trim()}\n\n追加・修正指示:\n${updateInstruction.trim()}`.trim());
        setUpdateInstruction('');
        setOriginalUpdateInstruction('');
        saveMorningSnapshot(transcript, mergedPlan, privateSessionKeys.snapshots);
      })
      .catch((reason: unknown) => {
        console.error(reason);
        setError('うまく処理できませんでした。もう一度お試しください。');
      })
      .finally(() => {
        setIsOrganizing(false);
      });
  };

  const carryOverTodos = (todos: string[]) => {
    setCarriedTodos(todos);
    setPlan((currentPlan) => (currentPlan ? addCarryoverToPlan(currentPlan, todos) : currentPlan));
  };

  const deleteReflectionTodos = (todos: string[]) => {
    if (!previousSnapshot || !todos.length) return;

    const nextSnapshot = deleteReviewTasks(previousSnapshot.id, todos, privateSessionKeys.snapshots);
    setPreviousSnapshot(nextSnapshot);
    setReviewStatuses((current) => {
      const nextStatuses = { ...current };
      todos.forEach((todo) => {
        delete nextStatuses[todo];
      });
      return nextStatuses;
    });
    setCarriedTodos((current) => current.filter((todo) => !todos.includes(todo)));
  };

  const saveEditedTranscript = () => {
    const normalized = resultText.trim();
    setTranscript(normalized);
    setOriginalTranscript(normalized);
    setInterimTranscript('');
    setIsTranscriptClearConfirmOpen(false);
    setPlan(null);
    setMorningReviewDraft(null);
    setMorningFollowUpCandidates([]);
    setMorningFollowUpMessage('');
  };

  const restoreOriginalTranscript = () => {
    setTranscript(originalTranscript);
    setInterimTranscript('');
    setIsTranscriptClearConfirmOpen(false);
    setPlan(null);
    setMorningReviewDraft(null);
    setMorningFollowUpCandidates([]);
    setMorningFollowUpMessage('');
  };

  const clearEditableTranscript = () => {
    abortListening();
    setTranscript('');
    setOriginalTranscript('');
    setInterimTranscript('');
    setPlan(null);
    setMorningReviewDraft(null);
    setError('');
    setMorningFollowUpCandidates([]);
    setMorningFollowUpMessage('');
    setIsListening(false);
    setIsTranscriptClearConfirmOpen(false);
  };

  const organizeShoppingList = () => {
    if (!shoppingText.trim()) return;

    if (isMealDatabaseExperimentalEnabled && detectMealPlanIntent(shoppingText)) {
      trackAnalyticsFeature(analyticsUserId, 'meal_to_shopping');
      const mealResult = createMealPlanCandidateResult(shoppingText, mealServings);
      trackAnalyticsFeature(analyticsUserId, mealResult.candidates.length ? 'meal_database_match' : 'meal_unknown_recipe');
      setMealPlanText(shoppingText.trim());
      setOriginalMealPlanText(shoppingText.trim());
      setMealCandidates(mealResult.candidates);
      setMealPlanDebug(mealResult.debug);
      setShoppingCaptureMode('meal');
      setShoppingError(mealResult.candidates.length ? '' : '\u3053\u306e\u6599\u7406\u306f\u307e\u3060\u30ec\u30b7\u30d4\u30c7\u30fc\u30bf\u30d9\u30fc\u30b9\u306b\u767b\u9332\u3055\u308c\u3066\u3044\u307e\u305b\u3093\u3002\u6750\u6599\u3092\u624b\u5165\u529b\u3059\u308b\u304b\u3001\u901a\u5e38\u306e\u8cb7\u3044\u7269\u30ea\u30b9\u30c8\u3068\u3057\u3066\u8ffd\u52a0\u3057\u3066\u304f\u3060\u3055\u3044\u3002');
      return;
    }

    trackAnalyticsFeature(analyticsUserId, 'shopping_list');
    const previousIds = new Set(shoppingItems.map((item) => item.id));
    setIsShoppingOrganizing(true);
    setShoppingError('');

    createShoppingPlan(shoppingText, shoppingItems)
      .then((shoppingPlan) => {
        const processedItems = postProcessShoppingItems(shoppingPlan.items, shoppingText);
        setShoppingItems(processedItems);
        void syncShoppingItemsToSupabase(processedItems);
        setShoppingUpdatedAt(shoppingPlan.updatedAt);
        setOriginalShoppingText(shoppingText.trim());
        setHighlightedShoppingIds(processedItems.filter((item) => !previousIds.has(item.id)).map((item) => item.id));
        setSelectedShoppingShareIds([]);
      })
      .catch((reason: unknown) => {
        console.error(reason);
        setShoppingError('\u3046\u307e\u304f\u6574\u7406\u3067\u304d\u307e\u305b\u3093\u3067\u3057\u305f\u3002\u3082\u3046\u4e00\u5ea6\u304a\u8a66\u3057\u304f\u3060\u3055\u3044\u3002');
      })
      .finally(() => {
        setIsShoppingOrganizing(false);
      });
  };

  const openMealPlanMode = () => {
    abortListening();
    setInterimTranscript('');
    setIsListening(false);
    setShoppingCaptureMode('meal');
    setShoppingError('');
    trackAnalyticsFeature(analyticsUserId, 'meal_to_shopping');
  };

  const openShoppingInputMode = () => {
    abortListening();
    setInterimTranscript('');
    setIsListening(false);
    setShoppingCaptureMode('shopping');
    setShoppingError('');
  };

  const generateMealCandidates = () => {
    if (!mealPlanText.trim()) return;

    trackAnalyticsFeature(analyticsUserId, 'meal_to_shopping');
    const mealResult = createMealPlanCandidateResult(mealPlanText, mealServings);
    trackAnalyticsFeature(analyticsUserId, mealResult.candidates.length ? 'meal_database_match' : 'meal_unknown_recipe');
    setMealCandidates(mealResult.candidates);
    setMealPlanDebug(mealResult.debug);
    setOriginalMealPlanText(mealPlanText.trim());
    setShoppingError(mealResult.candidates.length ? '' : '\u3053\u306e\u6599\u7406\u306f\u307e\u3060\u30ec\u30b7\u30d4\u30c7\u30fc\u30bf\u30d9\u30fc\u30b9\u306b\u767b\u9332\u3055\u308c\u3066\u3044\u307e\u305b\u3093\u3002\u6750\u6599\u3092\u624b\u5165\u529b\u3059\u308b\u304b\u3001\u901a\u5e38\u306e\u8cb7\u3044\u7269\u30ea\u30b9\u30c8\u3068\u3057\u3066\u8ffd\u52a0\u3057\u3066\u304f\u3060\u3055\u3044\u3002');
  };

  const changeMealServings = (servings: number) => {
    setMealServings(servings);
    if (mealPlanText.trim() && mealCandidates.length) {
      const mealResult = createMealPlanCandidateResult(mealPlanText, servings);
      setMealCandidates(mealResult.candidates);
      setMealPlanDebug(mealResult.debug);
    }
  };

  const deleteMealCandidate = (candidateId: string) => {
    setMealCandidates((current) => current.filter((candidate) => candidate.id !== candidateId));
  };

  const editMealCandidate = (candidateId: string) => {
    const candidate = mealCandidates.find((item) => item.id === candidateId);
    if (!candidate) return;

    const nextText = window.prompt('材料名と分量を編集してください', formatMealCandidateLabel(candidate))?.trim();
    if (!nextText) return;
    const parsed = parseShoppingItemInput(nextText);
    const name = parsed.name || nextText;

    setMealCandidates((current) =>
      current.map((item) =>
        item.id === candidateId
          ? {
              ...item,
              name,
              quantity: parsed.quantity || item.quantity,
              category: classifyShoppingItem(name),
            }
          : item,
      ),
    );
  };

  const addMealCandidatesToShoppingList = () => {
    if (!mealCandidates.length) return;

    trackAnalyticsFeature(analyticsUserId, 'meal_to_shopping');
    trackAnalyticsFeature(analyticsUserId, 'meal_to_shopping_add');
    const previousIds = new Set(shoppingItems.map((item) => item.id));
    const nextItems = mergeMealCandidatesIntoShoppingItems(shoppingItems, mealCandidates);
    setShoppingItems(nextItems);
    void syncShoppingItemsToSupabase(nextItems);
    setShoppingUpdatedAt(new Date().toISOString());
    setHighlightedShoppingIds(nextItems.filter((item) => !previousIds.has(item.id)).map((item) => item.id));
    setSelectedShoppingShareIds([]);
    setMealCandidates([]);
    setMealPlanDebug(null);
    setShoppingCaptureMode('shopping');
  };

  const resetShoppingList = () => {
    abortListening();
    setShoppingText('');
    setOriginalShoppingText('');
    setMealPlanText('');
    setOriginalMealPlanText('');
    setMealCandidates([]);
    setMealPlanDebug(null);
    setMealServings(4);
    setShoppingCaptureMode('shopping');
    setShoppingItems([]);
    void getShoppingSupabaseAuth().then((auth) => {
      if (auth) void deleteAllSupabaseShoppingItems(auth.userId, auth.accessToken);
    });
    setShoppingUpdatedAt('');
    setShoppingError('');
    setInterimTranscript('');
    setIsListening(false);
    setIsShoppingResetDialogOpen(false);
    setHighlightedShoppingIds([]);
    setSelectedShoppingShareIds([]);
  };

  const clearShoppingInput = () => {
    abortListening();
    setShoppingText('');
    setOriginalShoppingText('');
    setMealPlanText('');
    setOriginalMealPlanText('');
    setInterimTranscript('');
    setShoppingError('');
    setShoppingShareMessage('');
    setIsListening(false);

    if (shoppingItems.length && window.confirm('整理済みリストも削除しますか？')) {
      setShoppingItems([]);
      void getShoppingSupabaseAuth().then((auth) => {
        if (auth) void deleteAllSupabaseShoppingItems(auth.userId, auth.accessToken);
      });
      setShoppingUpdatedAt('');
      setHighlightedShoppingIds([]);
      setSelectedShoppingShareIds([]);
    }
  };

  const createNewShoppingList = () => {
    const shouldResetItems = !shoppingItems.length || window.confirm('現在の整理結果を削除して、新しく作り直しますか？');
    abortListening();
    setShoppingText('');
    setOriginalShoppingText('');
    setMealPlanText('');
    setOriginalMealPlanText('');
    setMealCandidates([]);
    setMealPlanDebug(null);
    setMealServings(4);
    setShoppingCaptureMode('shopping');
    setShoppingError('');
    setShoppingShareMessage('');
    setInterimTranscript('');
    setIsListening(false);
    setIsShoppingResetDialogOpen(false);

    if (shouldResetItems) {
      setShoppingItems([]);
      void getShoppingSupabaseAuth().then((auth) => {
        if (auth) void deleteAllSupabaseShoppingItems(auth.userId, auth.accessToken);
      });
      setShoppingUpdatedAt('');
      setHighlightedShoppingIds([]);
      setSelectedShoppingShareIds([]);
    }
  };

  const toggleShoppingItem = (itemId: string) => {
    const item = shoppingItems.find((currentItem) => currentItem.id === itemId);
    const nextCompleted = !item?.completed;
    setShoppingItems((current) =>
      current.map((item) => (item.id === itemId ? { ...item, completed: !item.completed } : item)),
    );
    setShoppingUpdatedAt(new Date().toISOString());
    if (item) {
      void getShoppingSupabaseAuth().then((auth) => {
        if (auth) void updateSupabaseShoppingItem(itemId, auth.userId, auth.accessToken, { checked: nextCompleted });
      });
    }
  };

  const toggleShoppingShareItem = (itemId: string) => {
    setSelectedShoppingShareIds((current) =>
      current.includes(itemId) ? current.filter((id) => id !== itemId) : [...current, itemId],
    );
  };

  const editShoppingItem = (itemId: string) => {
    const item = shoppingItems.find((currentItem) => currentItem.id === itemId);
    if (!item) return;

    const nextText = window.prompt('商品名と数量を編集してください', formatShoppingItemLabel(item))?.trim();
    if (!nextText) return;
    const parsed = parseShoppingItemInput(nextText);
    if (!parsed.name) return;

    const nextItem = {
      ...item,
      category: classifyShoppingItem(parsed.name),
      name: parsed.name,
      quantity: parsed.quantity,
    };
    setShoppingItems((current) => current.map((currentItem) => (currentItem.id === itemId ? nextItem : currentItem)));
    setShoppingUpdatedAt(new Date().toISOString());
    void getShoppingSupabaseAuth().then((auth) => {
      if (!auth) return;
      void updateSupabaseShoppingItem(itemId, auth.userId, auth.accessToken, {
          category: nextItem.category,
          name: nextItem.name,
          quantity: nextItem.quantity,
        });
    });
  };

  const deleteShoppingItem = (itemId: string) => {
    setShoppingItems((current) => current.filter((item) => item.id !== itemId));
    setSelectedShoppingShareIds((current) => current.filter((id) => id !== itemId));
    setShoppingUpdatedAt(new Date().toISOString());
    void getShoppingSupabaseAuth().then((auth) => {
      if (auth) void deleteSupabaseShoppingItem(itemId, auth.userId, auth.accessToken);
    });
  };

  const addFollowUp = async (item: Omit<FollowUpItem, 'completed' | 'completedAt' | 'createdAt' | 'id'>): Promise<boolean> => {
    const isDone = item.status === 'done';
    const nextItem: FollowUpItem = {
      ...item,
      completed: isDone,
      completedAt: isDone ? new Date().toISOString() : undefined,
      createdAt: new Date().toISOString(),
      id: createLocalId('follow-up'),
      source: item.source ?? 'manual',
      status: item.status ?? 'pending',
    };
    trackAnalyticsFeature(analyticsUserId, 'follow_up');

    if (isSupabaseFollowUpConfigured()) {
      let userId = '';
      let accessToken = '';
      let tokenStatus = '';
      let insertPayload: ReturnType<typeof mapFollowUpItemToSupabaseInsert> | undefined;
      try {
        const freshAuth = await getFreshAuthSession();
        userId = freshAuth.session.user.id;
        accessToken = freshAuth.session.access_token;
        tokenStatus = freshAuth.tokenStatus;
        setFollowUpSyncStatus('syncing');
        insertPayload = mapFollowUpItemToSupabaseInsert(nextItem, userId);
        console.info('[MORNING FLOW AI] Supabase follow-up insert start', {
          config: getSupabaseFollowUpConfigStatus(),
          payload: insertPayload,
        });
        setFollowUpSupabaseDebug(createFollowUpSupabaseDebug('insert:start', undefined, insertPayload, userId, accessToken, tokenStatus));
        const savedRow = await insertSupabaseFollowUp(insertPayload, accessToken);
        if (!savedRow) {
          throw new Error('Supabase insert returned no row. Check table permissions and Prefer return=representation support.');
        }
        if (currentUserIdRef.current !== userId) {
          console.warn('[MORNING FLOW AI] Discarded stale follow-up insert result', {
            currentUserId: currentUserIdRef.current,
            requestedUserId: userId,
          });
          return false;
        }
        const savedItem = mapSupabaseRowToFollowUpItem(savedRow);
        setFollowUps((current) => [...current.filter((currentItem) => currentItem.id !== savedItem.id), savedItem]);
        notifyFollowUpDueToday(savedItem);
        setFollowUpSyncError('');
        setFollowUpSyncStatus('synced');
        setFollowUpSupabaseDebug({
          ...createFollowUpSupabaseDebug('insert:success', undefined, insertPayload, userId, accessToken, tokenStatus),
          responseStatus: '201 Created',
          rowCount: 1,
        });
        return true;
      } catch (error) {
        console.error('[MORNING FLOW AI] Supabase follow-up insert failed', error);
        const message = getSupabaseFollowUpErrorMessage(error);
        setFollowUpSyncError(message);
        setFollowUpSyncStatus('error');
        setFollowUpSupabaseDebug(createFollowUpSupabaseDebug('insert:error', error, insertPayload, userId, accessToken, tokenStatus));
        return false;
      }
    }

    setFollowUps((current) => [...current, nextItem]);
    notifyFollowUpDueToday(nextItem);
    setFollowUpSupabaseDebug(createFollowUpSupabaseDebug('local:add'));
    return true;
  };

  const organizeFollowUpCapture = () => {
    const normalized = followUpResultText.trim();
    if (!normalized) return 0;

    const splitResult = createFollowUpsFromSplitText(normalized);
    const splitItems = splitResult.items;
    const fallbackItem = createVoiceFollowUp(normalized);
    const nextItems = splitItems.length ? splitItems : fallbackItem ? [fallbackItem] : [];
    const debug = {
      ...splitResult.debug,
      generatedItemCount: nextItems.length,
    };
    setFollowUpSplitDebug(debug);
    console.info('[MORNING FLOW AI] Follow Up split debug', debug);
    setFollowUpReviewItems(nextItems.map((item) => ({
      company: item.company,
      content: item.content,
      dueDate: item.dueDate,
      duePreset: item.duePreset,
      dueTime: item.dueTime,
      id: createLocalId('follow-up-review'),
      kind: item.kind,
      name: item.name,
      originalPerson: findFollowUpPersonMatch(item.name + 'に' + item.content)?.originalPerson ?? item.name,
      priority: item.priority,
      source: 'voice',
      status: item.status ?? 'pending',
    })));
    setInterimTranscript('');
    setIsFollowUpClearConfirmOpen(false);
    return nextItems.length;
  };

  const updateFollowUpReviewItem = (itemId: string, updates: Partial<FollowUpDraftItem>) => {
    setFollowUpReviewItems((current) =>
      current.map((item) => (item.id === itemId ? { ...item, ...updates } : item)),
    );
  };

  const deleteFollowUpReviewItem = (itemId: string) => {
    setFollowUpReviewItems((current) => current.filter((item) => item.id !== itemId));
  };

  const cancelFollowUpReview = () => {
    setFollowUpReviewItems([]);
  };

  const saveFollowUpReviewItems = async () => {
    const itemsToSave = followUpReviewItems.filter((item) => item.name.trim() && item.content.trim());
    if (!itemsToSave.length) return 0;

    let savedCount = 0;
    for (const item of itemsToSave) {
      const saved = await addFollowUp({
        company: item.company,
        content: item.content.trim(),
        dueDate: item.dueDate,
        duePreset: item.duePreset,
        dueTime: item.dueTime,
        kind: item.kind,
        name: item.name.trim(),
        priority: item.priority,
        source: 'voice',
        status: item.status ?? 'pending',
      });
      if (saved) savedCount += 1;
    }
    if (savedCount > 0) {
      setFollowUpReviewItems((current) => current.slice(savedCount));
    }
    return savedCount;
  };

  const clearFollowUpCapture = () => {
    abortListening();
    setFollowUpCaptureText('');
    setInterimTranscript('');
    setIsListening(false);
    setIsFollowUpClearConfirmOpen(false);
    setFollowUpSplitDebug(null);
    setFollowUpReviewItems([]);
  };

  const addVoiceFollowUpsFromText = (text: string) => {
    const extracted = extractFollowUpsFromText(text);
    if (!extracted.length) return;

    setFollowUps((current) => {
      const existingKeys = new Set(current.map(createFollowUpDedupeKey));
      const nextItems = extracted.filter((item) => !existingKeys.has(createFollowUpDedupeKey(item)));
      nextItems.forEach(notifyFollowUpDueToday);
      return nextItems.length ? [...current, ...nextItems] : current;
    });
  };

  const saveMorningFollowUpCandidates = async () => {
    if (!morningFollowUpCandidates.length) return;
    let savedCount = 0;
    for (const item of morningFollowUpCandidates) {
      const saved = await addFollowUp({
        company: item.company,
        content: item.content,
        dueDate: item.dueDate,
        duePreset: item.duePreset,
        dueTime: item.dueTime,
        kind: item.kind,
        name: item.name,
        priority: item.priority,
        source: 'voice',
        status: item.status ?? 'pending',
      });
      if (saved) savedCount += 1;
    }
    setMorningFollowUpCandidates([]);
    setMorningFollowUpMessage(savedCount ? `${savedCount}件を未返信・折り返しに追加しました。` : '追加できる候補がありませんでした。');
  };

  const dismissMorningFollowUpCandidates = () => {
    setMorningFollowUpCandidates([]);
    setMorningFollowUpMessage('未返信・折り返しへの追加を見送りました。');
  };

  const updateAiInboxCategory = (itemId: string, category: AiInboxCategory) => {
    setAiInboxItems((current) => current.map((item) => (item.id === itemId ? { ...item, category, confidence: 100 } : item)));
    setAiInboxMessage('');
  };

  const organizeAiInboxItem = async (itemId: string) => {
    const targetItem = aiInboxItems.find((item) => item.id === itemId);
    if (!targetItem) return;
    const classification = classifyAiInboxText(targetItem.text, targetItem.category);
    const nextItem = {
      ...targetItem,
      category: targetItem.confidence === 100 ? targetItem.category : classification.category,
      confidence: targetItem.confidence === 100 ? targetItem.confidence : classification.confidence,
      organizedAt: new Date().toISOString(),
      status: 'organized' as const,
    };
    const routed = await routeHighConfidenceInboxItem(nextItem);
    if (nextItem.category === 'followUp' && !routed) {
      setAiInboxMessage('Follow Upへ保存できませんでした。Supabase Debugと通信状態を確認してください。');
      return;
    }
    setAiInboxItems((current) =>
      current.map((item) => (item.id === itemId ? nextItem : item)),
    );
    setAiInboxMessage(routed ? `${aiInboxCategoryLabel(nextItem.category)}へ保存しました。` : 'Inbox項目を整理済みにしました。');
  };

  const routeHighConfidenceInboxItem = async (item: AiInboxItem) => {
    if (item.confidence < 85) return false;
    const appendText = (current: string) => `${current}${current ? '\n' : ''}${item.text}`.trim();

    if (item.category === 'todo') {
      setTranscript((current) => {
        const nextText = appendText(current);
        setOriginalTranscript(nextText);
        return nextText;
      });
      setPlan(null);
      setMorningReviewDraft(null);
      setHighlightedScheduleKeys([]);
      return true;
    }

    if (item.category === 'shopping') {
      setShoppingText((current) => {
        const nextText = appendText(current);
        setOriginalShoppingText(nextText);
        return nextText;
      });
      setShoppingCaptureMode('shopping');
      return true;
    }

    if (item.category === 'followUp') {
      const followUpItem = createVoiceFollowUp(item.text);
      if (!followUpItem) return false;
      const saved = await addFollowUp({
        company: followUpItem.company,
        content: followUpItem.content,
        dueDate: followUpItem.dueDate,
        duePreset: followUpItem.duePreset,
        dueTime: followUpItem.dueTime,
        kind: followUpItem.kind,
        name: followUpItem.name,
        priority: followUpItem.priority,
        source: 'voice',
        status: followUpItem.status ?? 'pending',
      });
      if (!saved) return false;
      setFollowUpCaptureText((current) => appendText(current));
      setIsFollowUpClearConfirmOpen(false);
      setFollowUpReviewItems([]);
      return true;
    }

    return false;
  };

  const reopenAiInboxItem = (itemId: string) => {
    setAiInboxItems((current) =>
      current.map((item) => (item.id === itemId ? { ...item, organizedAt: undefined, status: 'unprocessed' } : item)),
    );
    setAiInboxMessage('Inbox項目を未整理に戻しました。');
  };

  const deleteAiInboxItem = (itemId: string) => {
    setAiInboxItems((current) => current.filter((item) => item.id !== itemId));
    setAiInboxMessage('');
  };

  const completeFollowUp = (itemId: string) => {
    const completedAt = new Date().toISOString();
    setFollowUps((current) =>
      current.map((item) =>
        item.id === itemId
          ? {
              ...item,
              completed: true,
              completedAt,
              status: 'done',
            }
          : item,
      ),
    );
    if (isSupabaseFollowUpConfigured()) {
      void getFreshAuthSession()
        .then(({ session }) =>
          updateSupabaseFollowUp(itemId, session.user.id, session.access_token, {
            completed_at: completedAt,
            status: 'done',
          }),
        )
        .then((row) => {
          if (row) setFollowUps((current) => current.map((item) => (item.id === itemId ? mapSupabaseRowToFollowUpItem(row) : item)));
          setFollowUpSyncError('');
          setFollowUpSyncStatus('synced');
        })
        .catch((error) => {
          setFollowUpSyncError(getSupabaseFollowUpErrorMessage(error));
          setFollowUpSyncStatus('error');
        });
    }
  };

  const reopenFollowUp = (itemId: string) => {
    setFollowUps((current) =>
      current.map((item) =>
        item.id === itemId
          ? {
              ...item,
              completed: false,
              completedAt: undefined,
              status: 'pending',
            }
          : item,
      ),
    );
    if (isSupabaseFollowUpConfigured()) {
      void getFreshAuthSession()
        .then(({ session }) =>
          updateSupabaseFollowUp(itemId, session.user.id, session.access_token, {
            completed_at: null,
            status: 'pending',
          }),
        )
        .then((row) => {
          if (row) setFollowUps((current) => current.map((item) => (item.id === itemId ? mapSupabaseRowToFollowUpItem(row) : item)));
          setFollowUpSyncError('');
          setFollowUpSyncStatus('synced');
        })
        .catch((error) => {
          setFollowUpSyncError(getSupabaseFollowUpErrorMessage(error));
          setFollowUpSyncStatus('error');
        });
    }
  };

  const editFollowUp = (itemId: string) => {
    const item = followUps.find((currentItem) => currentItem.id === itemId);
    if (!item) return;

    const nextName = window.prompt('相手を編集してください', item.name)?.trim();
    if (!nextName) return;
    const nextContent = window.prompt('内容を編集してください', item.content)?.trim();
    if (!nextContent) return;
    const nextItem = {
      ...item,
      content: nextContent,
      name: nextName,
    };

    setFollowUps((current) => current.map((currentItem) => (currentItem.id === itemId ? nextItem : currentItem)));
    if (isSupabaseFollowUpConfigured()) {
      void getFreshAuthSession()
        .then(({ session }) =>
          updateSupabaseFollowUp(itemId, session.user.id, session.access_token, {
            memo: nextContent,
            person_name: nextName,
            title: formatFollowUpTitle(nextItem),
          }),
        )
        .then((row) => {
          if (row) setFollowUps((current) => current.map((currentItem) => (currentItem.id === itemId ? mapSupabaseRowToFollowUpItem(row) : currentItem)));
          setFollowUpSyncError('');
          setFollowUpSyncStatus('synced');
        })
        .catch((error) => {
          setFollowUpSyncError(getSupabaseFollowUpErrorMessage(error));
          setFollowUpSyncStatus('error');
        });
    }
  };

  const deleteFollowUp = (itemId: string) => {
    setFollowUps((current) => current.filter((item) => item.id !== itemId));
    if (isSupabaseFollowUpConfigured()) {
      void getFreshAuthSession()
        .then(({ session }) => deleteSupabaseFollowUp(itemId, session.user.id, session.access_token))
        .then(() => {
          setFollowUpSyncError('');
          setFollowUpSyncStatus('synced');
        })
        .catch((error) => {
          setFollowUpSyncError(getSupabaseFollowUpErrorMessage(error));
          setFollowUpSyncStatus('error');
        });
    }
  };

  const shareShoppingList = async () => {
    const selectedItems = shoppingItems.filter((item) => selectedShoppingShareIds.includes(item.id));
    const itemsToShare = selectedItems.length
      ? selectedItems
      : window.confirm('共有する項目が選択されていません。全件共有しますか？')
        ? shoppingItems
        : [];
    if (!itemsToShare.length) {
      setShoppingShareMessage('共有する項目を選んでください。');
      return;
    }

    const shareText = formatShoppingShareText(itemsToShare);
    setShoppingShareMessage('');

    try {
      if (navigator.share) {
        await navigator.share({
          text: shareText,
          title: '今日の買い物リスト',
        });
        setShoppingShareMessage('共有メニューを開きました。LINEなどを選んで送れます。');
        return;
      }

      await navigator.clipboard.writeText(shareText);
      setShoppingShareMessage('買い物リストをコピーしました。LINEに貼り付けて共有できます。');
    } catch (error) {
      if (isShareCancelError(error)) {
        setShoppingShareMessage('共有をキャンセルしました。');
        return;
      }

      console.error(error);
      setShoppingShareMessage('共有できませんでした。もう一度お試しください。');
    }
  };

  const handleNextAction = () => {
    if (isOrganizing) return;

    if (canUpdatePlan) {
      applyScheduleUpdate();
      return;
    }

    if (!plan && canOrganize) {
      organizeMorning();
      return;
    }

    const target = document.querySelector('.calendar-add-button, .calendar-panel') ?? planAnchorRef.current;
    target?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const loginWithEmail = async (email: string, password: string) => {
    setIsAuthLoading(true);
    setAuthError('');
    setAuthNotice('');
    try {
      const session = await signInWithEmail(email, password);
      if (!session?.access_token || !session.user) {
        throw new Error('ログイン情報を取得できませんでした。');
      }
      applyAuthenticatedSession(session);
      setAuthNotice('');
      console.info('[MORNING FLOW AI] Supabase auth state change', { event: 'login-success', userId: session.user.id });
    } catch (error) {
      console.warn('[MORNING FLOW AI] Supabase login error', error);
      setAuthError(getAuthErrorMessage(error));
    } finally {
      setIsAuthLoading(false);
    }
  };

  const signUpWithEmailPassword = async (email: string, password: string) => {
    setIsAuthLoading(true);
    setAuthError('');
    setAuthNotice('');
    try {
      const session = await signUpWithEmail(email, password);
      console.info('[MORNING FLOW AI] Supabase signup result', {
        hasAccessToken: Boolean(session?.access_token),
        hasUser: Boolean(session?.user),
        userId: session?.user?.id,
      });
      if (session?.access_token && session.user) {
        applyAuthenticatedSession(session);
        setAuthNotice('');
        console.info('[MORNING FLOW AI] Supabase auth state change', { event: 'signup-session-created', userId: session.user.id });
        return;
      }
      setAuthNotice('確認メールを送信しました。メール内のリンクを開いてからログインしてください。すでに登録済みの場合も、同じメールに案内が届くことがあります。');
    } catch (error) {
      console.warn('[MORNING FLOW AI] Supabase signup error', error);
      setAuthError(getAuthErrorMessage(error));
    } finally {
      setIsAuthLoading(false);
    }
  };

  const resendSignupConfirmation = async (email: string) => {
    setIsAuthLoading(true);
    setAuthError('');
    setAuthNotice('');
    try {
      const result = await resendConfirmationEmail(email);
      console.info('[MORNING FLOW AI] Supabase confirmation resend result', result);
      setAuthNotice('確認メールを再送信しました。届かない場合は迷惑メール、入力メールアドレス、Supabaseのメール設定を確認してください。');
    } catch (error) {
      console.warn('[MORNING FLOW AI] Supabase confirmation resend error', error);
      setAuthError(getAuthErrorMessage(error));
    } finally {
      setIsAuthLoading(false);
    }
  };

  const sendPasswordReset = async (email: string) => {
    setIsAuthLoading(true);
    setAuthError('');
    setAuthNotice('');
    try {
      const result = await sendPasswordResetEmail(email);
      console.info('[MORNING FLOW AI] Supabase password reset result', result);
      setAuthNotice('パスワード再設定メールを送信しました。メール内のリンクから新しいパスワードを設定してください。');
    } catch (error) {
      console.warn('[MORNING FLOW AI] Supabase password reset error', error);
      setAuthError(getAuthErrorMessage(error));
    } finally {
      setIsAuthLoading(false);
    }
  };

  const logout = async () => {
    const accessToken = authSession?.access_token;
    abortListening();
    resetLocalWorkspaceState();
    const clearedKeys = clearMorningFlowVolatileLocalStorage();
    clearStoredSupabaseAuthSession();
    currentUserIdRef.current = null;
    setAuthSession(null);
    setAuthNotice('');
    setActiveView('morning');
    setUserIsolationDebug(
      createInitialUserIsolationDebug({
        localStorageShoppingKeys: listShoppingLocalStorageKeys(),
        logoutClearedKeys: clearedKeys,
        resetAt: new Date().toISOString(),
      }),
    );
    if (accessToken) {
      try {
        await signOutSupabaseAuth(accessToken);
      } catch (error) {
        console.warn('[MORNING FLOW AI] Supabase logout request failed', error);
      }
    }
  };

  if (!authSession?.user) {
    return (
      <AuthGate
        authError={authError}
        authNotice={authNotice}
        config={getSupabaseAuthConfigStatus()}
        isLoading={isAuthLoading}
        onLogin={loginWithEmail}
        onPasswordReset={sendPasswordReset}
        onResendConfirmation={resendSignupConfirmation}
        onSignUp={signUpWithEmailPassword}
      />
    );
  }

  return (
    <main className="app-shell">
      <div className="ambient-layer" aria-hidden="true">
        <span className="morning-orbit orbit-one" />
        <span className="morning-orbit orbit-two" />
        <span className="horizon-line" />
      </div>
      <AuthStatusBar email={authSession.user.email} onLogout={() => void logout()} onSettings={() => setActiveView('settings')} />

      {isShoppingView ? (
        <ShoppingListPage
          canOrganize={canOrganizeShopping}
          error={shoppingError}
          highlightedIds={highlightedShoppingIds}
          isListening={isListening}
          isOrganizing={isShoppingOrganizing}
          isResetDialogOpen={isShoppingResetDialogOpen}
          isSupported={isSupported}
          items={shoppingItems}
          mealCandidates={mealCandidates}
          mealDebug={mealPlanDebug}
          mealPlanText={mealPlanText}
          mealServings={mealServings}
          mode="shopping"
          onAddMealCandidates={addMealCandidatesToShoppingList}
          onBack={() => {
            abortListening();
            setInterimTranscript('');
            setIsListening(false);
            setActiveView('morning');
          }}
          onCancelReset={() => setIsShoppingResetDialogOpen(false)}
          onChangeMealServings={changeMealServings}
          onClearInput={clearShoppingInput}
          onDeleteMealCandidate={deleteMealCandidate}
          onEditMealCandidate={editMealCandidate}
          onGenerateMealCandidates={generateMealCandidates}
          onNewList={createNewShoppingList}
          onOpenMealMode={openMealPlanMode}
          onOpenShoppingMode={openShoppingInputMode}
          onOrganize={organizeShoppingList}
          onReset={resetShoppingList}
          onResetRequest={() => setIsShoppingResetDialogOpen(true)}
          onStartListening={startListening}
          onStopListening={stopListening}
          shoppingSyncError={shoppingSyncError}
          shoppingSyncStatus={shoppingSyncStatus}
          shoppingSupabaseDebug={shoppingSupabaseDebug}
          onEditItem={editShoppingItem}
          onTextChange={(value) => {
            if (shoppingCaptureMode === 'meal') {
              setMealPlanText(value);
            } else {
              setShoppingText(value);
            }
            setShoppingError('');
          }}
          onDeleteItem={deleteShoppingItem}
          onShare={shareShoppingList}
          onToggleShareItem={toggleShoppingShareItem}
          onToggleItem={toggleShoppingItem}
          resultText={shoppingResultText}
          savedText={activeSavedShoppingText}
          selectedShareIds={selectedShoppingShareIds}
          text={activeShoppingText}
          updatedAt={shoppingUpdatedAt}
          shareMessage={shoppingShareMessage}
        />
      ) : isFollowUpView ? (
        <FollowUpManagerPage
          dueTodayCount={dueTodayFollowUps.length}
          completedCount={followUps.filter((item) => item.completed).length}
          followUpSplitDebug={followUpSplitDebug}
          followUpLastSyncedAt={followUpLastSyncedAt}
          followUpSupabaseDebug={followUpSupabaseDebug}
          followUpSyncError={followUpSyncError}
          followUpSyncStatus={followUpSyncStatus}
          isClearConfirmOpen={isFollowUpClearConfirmOpen}
          isListening={isListening}
          isSupported={isSupported}
          items={followUps}
          onAdd={addFollowUp}
          onBack={() => setActiveView('morning')}
          onCancelClear={() => setIsFollowUpClearConfirmOpen(false)}
          onClear={clearFollowUpCapture}
          onClearRequest={() => setIsFollowUpClearConfirmOpen(true)}
          onComplete={completeFollowUp}
          onDelete={deleteFollowUp}
          onEdit={editFollowUp}
          onCancelReview={cancelFollowUpReview}
          onDeleteReviewItem={deleteFollowUpReviewItem}
          onOrganizeCapture={organizeFollowUpCapture}
          onReopen={reopenFollowUp}
          onSaveReview={saveFollowUpReviewItems}
          onSyncNow={syncFollowUpsFromSupabase}
          onStartListening={startListening}
          onStopListening={stopListening}
          onTextChange={(value) => {
            setFollowUpCaptureText(value);
            setInterimTranscript('');
            setIsFollowUpClearConfirmOpen(false);
            setFollowUpSplitDebug(null);
            setFollowUpReviewItems([]);
          }}
          onUpdateReviewItem={updateFollowUpReviewItem}
          pendingCount={pendingFollowUps.length}
          resultText={followUpResultText}
          reviewItems={followUpReviewItems}
        />
      ) : isInboxView ? (
        <AiInboxPage
          followUpSupabaseDebug={followUpSupabaseDebug}
          followUpSyncError={followUpSyncError}
          items={aiInboxItems}
          message={aiInboxMessage}
          onBack={() => setActiveView('morning')}
          onCategoryChange={updateAiInboxCategory}
          onDelete={deleteAiInboxItem}
          onOrganize={organizeAiInboxItem}
          onReopen={reopenAiInboxItem}
        />
      ) : isFeedbackView ? (
        <FeedbackBoxPage
          analyticsUserId={analyticsUserId}
          isListening={isListening}
          isSupported={isSupported}
          onBack={() => {
            abortListening();
            setInterimTranscript('');
            setIsListening(false);
            setActiveView('morning');
          }}
          onStartListening={startListening}
          onStopListening={stopListening}
          onTextChange={setFeedbackText}
          resultText={feedbackResultText}
          text={feedbackText}
        />
      ) : activeView === 'analytics' ? (
        <AnalyticsDashboardPage onBack={() => setActiveView('morning')} userId={analyticsUserId} />
      ) : activeView === 'settings' ? (
        <SettingsPage
          onboardingPreference={onboardingSettings.preference}
          onBack={() => setActiveView('morning')}
          onOpenGuide={() => setIsOnboardingGuideOpen(true)}
          onPreferenceChange={updateOnboardingPreference}
        />
      ) : (
      <section className="hero-panel home-motion-panel" aria-label="音声入力">
        <div className="digital-motion-field" aria-hidden="true">
          {Array.from({ length: 7 }).map((_, index) => (
            <span key={index} />
          ))}
        </div>

        <div className="top-bar v4-home-topbar">
          <div>
            <p className="eyebrow">MORNING FLOW AI <span>{appVersion}</span></p>
            <p className="hero-subtitle">AI Conversation Core</p>
          </div>
          {isDeveloperModeEnabled() ? (
            <button
              className="brand-mark debug-brand-button"
              onClick={() => setIsDeveloperDebugOpen(true)}
              type="button"
              aria-label="Developer Debugを開く"
            >
              <Sparkles size={21} />
            </button>
          ) : (
            <div className="brand-mark" aria-hidden="true">
              <Sparkles size={21} />
            </div>
          )}
        </div>

        <section className="home-brand-hero v4-brand-hero" aria-label="MORNING FLOW AI brand visual">
          <img src="./assets/morning-flow-hero.png" alt="MORNING FLOW AI" />
        </section>

        <section className="conversation-hero" aria-label="AI conversation start">
          <span>おはようございます</span>
          <h1>今日のことを話してください</h1>
          <p>予定、買い物、連絡、未来の予定まで、まとめて自然に話せます。</p>
        </section>

        {morningReviewDraft && (
          <MorningReviewCard
            aiInboxCount={unprocessedInboxCount}
            draft={morningReviewDraft}
            onCancel={cancelMorningReview}
            onConfirm={confirmMorningReview}
            onDraftChange={setMorningReviewDraft}
          />
        )}

        <div className="focus-area v4-focus-area">
          <div className={`voice-stage ${isListening ? 'is-listening' : ''}`}>
            <div className="waveform" aria-hidden="true">
              {Array.from({ length: 17 }).map((_, index) => (
                <span key={index} style={{ animationDelay: `${index * 72}ms` }} />
              ))}
            </div>

            <button
              className={`mic-button v4-mic-button ${isListening ? 'is-listening' : ''}`}
              type="button"
              onClick={isListening ? stopListening : startListening}
              disabled={!isSupported}
              aria-label={isListening ? '音声認識を停止' : '音声認識を開始'}
            >
              <span className="pulse-ring ring-one" aria-hidden="true" />
              <span className="pulse-ring ring-two" aria-hidden="true" />
              <span className="mic-glass" aria-hidden="true" />
              {isListening ? <Square size={42} fill="currentColor" /> : <Mic size={64} />}
            </button>
          </div>

          <button className="conversation-start-button" type="button" onClick={isListening ? stopListening : startListening} disabled={!isSupported}>
            <Mic size={19} />
            {isListening ? '聞き取りを終了' : '今日のことを話す'}
          </button>

          <div className="status-row" role="status" aria-live="polite">
            <span className={`status-dot ${isListening ? 'active' : ''}`} />
            {getStatusLabel(isSupported, isListening, transcript, plan, voiceRecognitionDebug.status)}
          </div>
        </div>

        <AiConversationPanel messages={conversationMessages} />
        {isDeveloperModeEnabled() && (
          <>
            <AssistantRuntimeDebugPanel debug={assistantRuntimeDebug} />
            <VoiceRecognitionDebugPanel debug={voiceRecognitionDebug} />
          </>
        )}
        {isDeveloperModeEnabled() && isDeveloperDebugOpen && (
          <DeveloperDebugDialog
            assistantDebug={assistantRuntimeDebug}
            onClose={() => setIsDeveloperDebugOpen(false)}
            userIsolationDebug={userIsolationDebug}
            voiceDebug={voiceRecognitionDebug}
          />
        )}

        {false && hasEditableTranscript && (
          <TranscriptEditor
            isClearConfirmOpen={isTranscriptClearConfirmOpen}
            onCancel={restoreOriginalTranscript}
            onCancelClear={() => setIsTranscriptClearConfirmOpen(false)}
            onClear={clearEditableTranscript}
            onClearRequest={() => setIsTranscriptClearConfirmOpen(true)}
            onSave={saveEditedTranscript}
            onTextChange={(value) => {
              setTranscript(value);
              setInterimTranscript('');
              setPlan(null);
              setMorningReviewDraft(null);
              setIsTranscriptClearConfirmOpen(false);
            }}
            savedText={originalTranscript}
            text={resultText}
          />
        )}

        {canOrganize && (
          <button
            className={`organize-button ${isOrganizing ? 'is-organizing' : ''}`}
            type="button"
            onClick={organizeMorning}
            disabled={isOrganizing}
          >
            <Brain size={21} />
            {isOrganizing ? 'AIが整理しています' : 'AI整理'}
            <Sparkles size={18} />
          </button>
        )}

        {error && <p className="error-message">{error}</p>}
        {isOrganizing && (
          <p className="loading-message" role="status" aria-live="polite">
            AIが整理中です。少しだけお待ちください。
          </p>
        )}

        <div className="flow-switcher" aria-label="MORNING FLOW AI menu">
          <button className="selected" type="button">
            今日の予定を整理する
          </button>
          <button
            type="button"
            onClick={() => {
              trackAnalyticsFeature(analyticsUserId, 'shopping_list');
              setActiveView('shopping');
            }}
          >
            <ShoppingCart size={18} />
            買い物リストを作る
          </button>
          <button
            type="button"
            onClick={() => {
              trackAnalyticsFeature(analyticsUserId, 'follow_up');
              setActiveView('followUp');
            }}
          >
            <MessageCircle size={18} />
            {'\u672a\u8fd4\u4fe1\u30fb\u6298\u308a\u8fd4\u3057'}
            <span className="follow-up-badge">{'\u672a\u8fd4\u4fe1'} {pendingFollowUps.length}{'\u4ef6'} / {'\u4eca\u65e5'} {dueTodayFollowUps.length}{'\u4ef6'}</span>
          </button>
          <button type="button" onClick={() => setActiveView('inbox')}>
            <ListChecks size={18} />
            AI Inbox
            <span className="follow-up-badge">未整理 {unprocessedInboxCount}件</span>
          </button>
          <button
            type="button"
            onClick={() => {
              trackAnalyticsFeature(analyticsUserId, 'feedback');
              setActiveView('feedback');
            }}
          >
            <Mail size={18} />
            {'\u3054\u610f\u898b\u30fb\u6539\u5584\u8981\u671b'}
          </button>
          <button type="button" onClick={() => setActiveView('analytics')}>
            <ListChecks size={18} />
            {'\u5229\u7528\u72b6\u6cc1'}
          </button>
        </div>

        <div ref={planAnchorRef} />
        {plan && (
          <PlanView
            analyticsUserId={analyticsUserId}
            highlightedScheduleKeys={highlightedScheduleKeys}
            plan={plan}
            shoppingItems={shoppingItems}
          />
        )}

        {morningFollowUpCandidates.length > 0 && (
          <MorningFollowUpCandidatePanel
            items={morningFollowUpCandidates}
            onCancel={dismissMorningFollowUpCandidates}
            onSave={() => void saveMorningFollowUpCandidates()}
          />
        )}
        {morningFollowUpMessage && <p className="follow-up-suggestion">{morningFollowUpMessage}</p>}

        <div className="action-row">
          <button className="secondary-button" type="button" onClick={() => setIsResetDialogOpen(true)}>
            <RefreshCw size={19} />
            やり直し
          </button>
          <button className="secondary-button sample-button" type="button" onClick={useSample}>
            サンプル
          </button>
        </div>
      </section>
      )}
      {activeView === 'morning' && (
      <div className="floating-next-bar" aria-label="次の操作">
        <button
          className={`primary-button floating-next-button ${isOrganizing ? 'is-loading' : ''}`}
          type="button"
          disabled={isOrganizing || !canUseNext}
          onClick={handleNextAction}
        >
          {nextButtonLabel}
          {isOrganizing ? <Loader2 className="button-spinner" size={21} /> : <ArrowRight size={21} />}
        </button>
      </div>
      )}
      {isResetDialogOpen && (
        <div className="confirm-dialog-backdrop" role="presentation">
          <section
            aria-describedby="reset-dialog-description"
            aria-labelledby="reset-dialog-title"
            aria-modal="true"
            className="confirm-dialog"
            role="dialog"
          >
            <div className="confirm-dialog-icon" aria-hidden="true">
              <AlertTriangle size={23} />
            </div>
            <h2 id="reset-dialog-title">本当に最初からやり直しますか？</h2>
            <p id="reset-dialog-description">
              現在の音声入力・AI整理結果・スケジュールは削除されます。
            </p>
            <div className="confirm-dialog-actions">
              <button className="secondary-button" type="button" onClick={() => setIsResetDialogOpen(false)}>
                キャンセル
              </button>
              <button className="danger-button" type="button" onClick={resetTranscript}>
                やり直す
              </button>
            </div>
          </section>
        </div>
      )}
      {isOnboardingGuideOpen && (
        <OnboardingGuideDialog
          onClose={() => finishOnboardingGuide(onboardingSettings.preference)}
          onFinish={finishOnboardingGuide}
        />
      )}
    </main>
  );
}

function AuthGate({
  authError,
  authNotice,
  config,
  isLoading,
  onLogin,
  onPasswordReset,
  onResendConfirmation,
  onSignUp,
}: {
  authError: string;
  authNotice: string;
  config: ReturnType<typeof getSupabaseAuthConfigStatus>;
  isLoading: boolean;
  onLogin: (email: string, password: string) => Promise<void>;
  onPasswordReset: (email: string) => Promise<void>;
  onResendConfirmation: (email: string) => Promise<void>;
  onSignUp: (email: string, password: string) => Promise<void>;
}) {
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [mode, setMode] = React.useState<'login' | 'signup'>('login');
  const canSubmit = Boolean(email.trim() && password.trim().length >= 6 && config.configured && !isLoading);
  const canUseEmailAction = Boolean(email.trim() && config.configured && !isLoading);

  const submit = () => {
    if (!canSubmit) return;
    if (mode === 'login') {
      void onLogin(email.trim(), password);
      return;
    }
    void onSignUp(email.trim(), password);
  };

  return (
    <main className="app-shell auth-shell">
      <div className="ambient-layer" aria-hidden="true">
        <span className="morning-orbit orbit-one" />
        <span className="morning-orbit orbit-two" />
        <span className="horizon-line" />
      </div>
      <section className="hero-panel auth-panel" aria-label="ログイン">
        <div className="top-bar">
          <div>
            <p className="eyebrow">MORNING FLOW AI <span>{appVersion}</span></p>
            <h1>Sign In</h1>
            <p className="hero-subtitle">Your Day. Secured.</p>
          </div>
          <div className="brand-mark" aria-hidden="true">
            <Sparkles size={21} />
          </div>
        </div>

        <div className="auth-mode-tabs" aria-label="ログイン方法">
          <button className={mode === 'login' ? 'selected' : ''} onClick={() => setMode('login')} type="button">
            ログイン
          </button>
          <button className={mode === 'signup' ? 'selected' : ''} onClick={() => setMode('signup')} type="button">
            新規登録
          </button>
        </div>

        <section className="auth-form">
          <label>
            メールアドレス
            <input autoComplete="email" inputMode="email" onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" type="email" value={email} />
          </label>
          <label>
            パスワード
            <input autoComplete={mode === 'login' ? 'current-password' : 'new-password'} onChange={(event) => setPassword(event.target.value)} placeholder="6文字以上" type="password" value={password} />
          </label>
          {!config.configured && (
            <p className="error-message">
              Supabase Authが未設定です。VITE_SUPABASE_URL と VITE_SUPABASE_ANON_KEY を確認してください。
            </p>
          )}
          {authNotice && <p className="auth-notice">{authNotice}</p>}
          {authError && <p className="error-message">{authError}</p>}
          <button className="organize-button" disabled={!canSubmit} onClick={submit} type="button">
            {isLoading ? <Loader2 className="button-spinner" size={19} /> : <CheckCircle2 size={19} />}
            {mode === 'login' ? 'ログインする' : '登録する'}
          </button>
          <div className="auth-help-actions">
            <button className="secondary-button" disabled={!canUseEmailAction} onClick={() => void onResendConfirmation(email.trim())} type="button">
              確認メールを再送信
            </button>
            <button className="secondary-button" disabled={!canUseEmailAction} onClick={() => void onPasswordReset(email.trim())} type="button">
              パスワード再設定
            </button>
          </div>
          <small className="auth-note">
            ログインできない場合は、メール未認証・登録未完了・パスワード違い・古い確認メールリンクの可能性があります。
          </small>
          <small className="auth-note">ログイン後にMORNING FLOW AI本体を表示します。今回はデータ分離までは行いません。</small>
        </section>
      </section>
    </main>
  );
}

function MorningDashboard({
  data,
  onOpenFollowUp,
  onOpenInbox,
  onOpenShopping,
  onOpenToday,
}: {
  data: MorningDashboardData;
  onOpenFollowUp: () => void;
  onOpenInbox: () => void;
  onOpenShopping: () => void;
  onOpenToday: () => void;
}) {
  return (
    <section className="morning-dashboard" aria-label="朝のまとめ">
      <div className="morning-dashboard-header">
        <div>
          <p>おはようございます</p>
          <h2>今日のまとめ</h2>
        </div>
        <div className="morning-dashboard-score">
          <span>今日の達成率</span>
          <strong>{data.achievementRate}%</strong>
        </div>
      </div>

      <div className="morning-dashboard-summary">
        <span>今日やること合計 {data.totalCount}件</span>
        <strong>まずやること：{data.firstTask || 'まだありません'}</strong>
      </div>

      <section className="top-priority-card" aria-label="今日の最重要3件">
        <div className="top-priority-header">
          <span>Today Focus</span>
          <strong>今日の最重要3件</strong>
        </div>
        {data.topPriority.length ? (
          <ol>
            {data.topPriority.map((item) => (
              <li key={item.id}>{item.label}</li>
            ))}
          </ol>
        ) : (
          <p>まだありません</p>
        )}
      </section>

      <div className="morning-dashboard-grid">
        <MorningDashboardCard title="今日のやること・予定" count={data.today.count} items={data.today.items} onOpen={onOpenToday} />
        <MorningDashboardCard title="買い物" count={data.shopping.count} items={data.shopping.items} onOpen={onOpenShopping} />
        <MorningDashboardCard title="Follow Up" count={data.followUp.count} items={data.followUp.items} onOpen={onOpenFollowUp} />
      </div>
    </section>
  );
}

function MorningDashboardCard({
  count,
  items,
  onOpen,
  title,
}: {
  count: number;
  items: MorningDashboardItem[];
  onOpen: () => void;
  title: string;
}) {
  return (
    <article className="morning-dashboard-card">
      <div className="morning-dashboard-card-top">
        <div>
          <span>{title}</span>
          <strong>{count}件</strong>
        </div>
        <button className="secondary-button" onClick={onOpen} type="button">
          開く
        </button>
      </div>
      {items.length ? (
        <ul>
          {items.map((item) => (
            <li className={item.completed ? 'is-completed' : ''} key={item.id}>
              {typeof item.completed === 'boolean' && <span className="dashboard-check">{item.completed ? '✓' : '□'}</span>}
              <span>{item.label}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p>まだありません</p>
      )}
    </article>
  );
}

function createInitialConversationMessages(): AiConversationMessage[] {
  return [
    {
      id: createLocalId('conversation-ai'),
      role: 'assistant',
      title: 'AI秘書',
      lines: ['おはようございます。今日の予定、買い物、連絡、未来の予定をそのまま話してください。'],
    },
  ];
}

function createEmptyConversationDraft(): MorningReviewDraft {
  return {
    followUpCandidates: [],
    plan: {
      advice: [],
      categories: {
        family: [],
        health: [],
        learning: [],
        work: [],
      },
      coach: {
        focusItems: {
          highest: '',
          important: '',
          optional: '',
        },
        mission: '',
        morningAdvice: '',
        successConditions: [],
      },
      goals: [],
      priorities: {
        highest: [],
        important: [],
        optional: [],
      },
      purpose: 'AI会話で今日を整理する',
      schedule: [],
      todos: [],
    },
    shoppingItems: [],
    shoppingUpdatedAt: new Date().toISOString(),
    sourceText: '',
  };
}

async function processLlmAssistantTurn({
  conversationDraft,
  conversationMessages,
  followUps,
  plan,
  shoppingItems,
  text,
}: {
  conversationDraft: MorningReviewDraft;
  conversationMessages: AiConversationMessage[];
  followUps: FollowUpItem[];
  plan: MorningPlan | null;
  shoppingItems: ShoppingItem[];
  text: string;
}): Promise<LlmAssistantResult> {
  if (isConversationSaveCommand(text)) {
    const hasDraft = hasConversationDraftContent(conversationDraft);
    const assistantLines = hasDraft
      ? ['保存前確認を表示します。内容を確認してください。']
      : ['保存できる候補がまだありません。もう一度、予定や買い物を話してください。'];
    const extracted = summarizePureLlmDraft(conversationDraft);
    return {
      actionsCount: extracted.extractedCount,
      assistantLines,
      assistantLinesCount: assistantLines.length,
      draft: conversationDraft,
      calendarCount: extracted.calendarCount,
      draftAutoGenerated: false,
      draftItemCount: extracted.extractedCount,
      extractedCalendarCandidates: extracted.extractedCalendarCandidates,
      extractedFollowUpItems: extracted.extractedFollowUpItems,
      extractedScheduleItems: extracted.extractedScheduleItems,
      extractedShoppingItems: extracted.extractedShoppingItems,
      extractedCount: extracted.extractedCount,
      calendarRejectReasons: [],
      followUpRejectReasons: [],
      followUpCount: extracted.followUpCount,
      jsonParseSuccess: true,
      lastLlmJson: '',
      lastAssistantResponse: assistantLines.join('\n'),
      lostEntityCount: 0,
      needsClarification: false,
      clarifyingQuestion: '',
      parseError: '',
      pendingSave: hasDraft,
      prioritySuggestionsCount: 0,
      mode: 'llm-native',
      model: '',
      rawToolCallsCount: 0,
      scheduleCount: extracted.scheduleCount,
      shoppingCount: extracted.shoppingCount,
      shouldOpenReview: hasDraft,
      lastActions: [],
      toolCalls: [],
    };
  }

  const response = await fetch('/api/assistant', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      conversationMessages,
      currentDraft: conversationDraft,
      savedFollowUps: followUps,
      savedPlan: plan,
      savedShoppingItems: shoppingItems,
      userText: text,
    }),
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(payload?.message ?? 'LLM assistant request failed.');
  }

  const llmJson = normalizePureLlmSecretaryJson(payload?.result);
  const appliedPure = applyPureLlmSecretaryJson(conversationDraft, llmJson, text);
  const extractedPure = summarizePureLlmJson(llmJson);
  const shouldAutoReview = extractedPure.extractedCount > 0 && !llmJson.needs_clarification;
  const pureAssistantLines = dedupeConversationLines(
    [llmJson.assistant_reply, llmJson.needs_clarification ? llmJson.clarifying_question : '']
      .map((line) => line.trim())
      .filter(Boolean),
  );
  console.info('[MORNING FLOW AI] Pure LLM secretary debug', {
    jsonParseSuccess: Boolean(payload?.debug?.jsonParseSuccess),
    scheduleItemsCount: llmJson.schedule_items.length,
    shoppingItemsCount: llmJson.shopping_items.length,
    followUpItemsCount: llmJson.follow_up_items.length,
    googleCalendarCandidatesCount: llmJson.google_calendar_candidates.length,
    prioritySuggestionsCount: llmJson.priority_suggestions.length,
    needsClarification: llmJson.needs_clarification,
  });
  return {
    actionsCount: extractedPure.extractedCount,
    assistantLines: pureAssistantLines,
    assistantLinesCount: pureAssistantLines.length,
    draft: appliedPure.draft,
    calendarCount: extractedPure.calendarCount,
    draftAutoGenerated: shouldAutoReview,
    draftItemCount: extractedPure.extractedCount,
    extractedCalendarCandidates: extractedPure.extractedCalendarCandidates,
    extractedFollowUpItems: extractedPure.extractedFollowUpItems,
    extractedScheduleItems: extractedPure.extractedScheduleItems,
    extractedShoppingItems: extractedPure.extractedShoppingItems,
    extractedCount: extractedPure.extractedCount,
    calendarRejectReasons: [],
    followUpRejectReasons: [],
    followUpCount: extractedPure.followUpCount,
    jsonParseSuccess: Boolean(payload?.debug?.jsonParseSuccess),
    lastLlmJson: String(payload?.debug?.lastLlmJson ?? ''),
    lastAssistantResponse: llmJson.assistant_reply,
    lostEntityCount: 0,
    needsClarification: llmJson.needs_clarification,
    clarifyingQuestion: llmJson.clarifying_question,
    parseError: String(payload?.debug?.parseError ?? ''),
    pendingSave: shouldAutoReview,
    prioritySuggestionsCount: llmJson.priority_suggestions.length,
    mode: payload?.mode === 'llm-native' ? 'llm-native' : 'llm-native',
    model: String(payload?.model ?? ''),
    rawToolCallsCount: 0,
    scheduleCount: extractedPure.scheduleCount,
    shoppingCount: extractedPure.shoppingCount,
    shouldOpenReview: shouldAutoReview,
    lastActions: [],
    toolCalls: [],
  };

  const apiActions = normalizeLlmAssistantActions(payload?.actions);
  const repairedActions = apiActions.length ? [] : createContextRepairActions(conversationDraft, text);
  const textRecoveryActions = apiActions.length || repairedActions.length ? [] : createTextRecoveryActions(text);
  const semanticRecoveryActions = shouldApplySemanticRecovery(text) ? createTextRecoveryActions(text) : [];
  const fullCoverageActions = createFullCoverageActions(text);
  const candidateActions = apiActions.length
    ? [...apiActions, ...semanticRecoveryActions, ...fullCoverageActions]
    : repairedActions.length
      ? [...repairedActions, ...fullCoverageActions]
      : [...textRecoveryActions, ...fullCoverageActions];
  const actions = repairSemanticActionBoundaries(candidateActions);
  const rejectReasons = summarizeSemanticRejectReasons(candidateActions);
  const debug = normalizeLlmAssistantDebug(payload?.debug, actions);
  const applied = applyLlmAssistantActions(conversationDraft, actions, text);
  const extracted = summarizeExtractedActions(actions);
  const coverage = createEntityCoverageReport(fullCoverageActions, actions);
  if (coverage.lostEntityCount > 0) {
    console.warn('[MORNING FLOW AI] Lost semantic entities detected', coverage);
  }
  const assistantLines = dedupeConversationLines(
    sanitizeAssistantLines(
      safeStringArray(payload?.assistantLines).length
        ? safeStringArray(payload.assistantLines)
        : createRecoveredAssistantLines(conversationDraft, actions, text),
    ),
  );
  console.info('[MORNING FLOW AI] LLM assistant client debug', {
    actionsCount: actions.length,
    apiActionsCount: apiActions.length,
    assistantLinesCount: assistantLines.length,
    rawToolCallsCount: debug.rawToolCallsCount,
    repairedActionsCount: repairedActions.length,
    fullCoverageActionsCount: fullCoverageActions.length,
    calendarRejectReasons: rejectReasons.calendar,
    followUpRejectReasons: rejectReasons.followUp,
    lostEntityCount: coverage.lostEntityCount,
    semanticRecoveryActionsCount: semanticRecoveryActions.length,
    textRecoveryActionsCount: textRecoveryActions.length,
    toolCalls: debug.toolCalls,
  });
  const fallbackLine = actions.length
    ? '内容を理解して候補へ反映しました。保存するときは「保存して」と話してください。'
    : '内容を受け取りました。必要な確認があれば続けて質問します。';
  return {
    actionsCount: actions.length,
    assistantLines,
    assistantLinesCount: assistantLines.length,
    draft: applied.draft,
    calendarCount: coverage.calendarCount,
    draftAutoGenerated: false,
    draftItemCount: coverage.extractedCount,
    extractedCalendarCandidates: extracted.calendar,
    extractedFollowUpItems: extracted.followUp,
    extractedScheduleItems: extracted.schedule,
    extractedShoppingItems: extracted.shopping,
    extractedCount: coverage.extractedCount,
    calendarRejectReasons: rejectReasons.calendar,
    followUpRejectReasons: rejectReasons.followUp,
    followUpCount: coverage.followUpCount,
    jsonParseSuccess: false,
    lastLlmJson: '',
    lastAssistantResponse: debug.lastAssistantResponse,
    lostEntityCount: coverage.lostEntityCount,
    needsClarification: false,
    clarifyingQuestion: '',
    parseError: '',
    pendingSave: applied.shouldOpenReview || isConversationSaveCommand(text),
    prioritySuggestionsCount: 0,
    mode: payload?.mode === 'llm-native' ? 'llm-native' : 'llm-native',
    model: String(payload?.model ?? ''),
    rawToolCallsCount: debug.rawToolCallsCount,
    scheduleCount: coverage.scheduleCount,
    shoppingCount: coverage.shoppingCount,
    shouldOpenReview: applied.shouldOpenReview || isConversationSaveCommand(text),
    lastActions: actions.map((action) => action.type),
    toolCalls: debug.toolCalls.length ? debug.toolCalls : actions.map((action) => action.type),
  };
}

function normalizePureLlmSecretaryJson(value: unknown): PureLlmSecretaryJson {
  const source = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  const normalized = {
    assistant_reply: stringPayload(source.assistant_reply) || '内容を整理しました。',
    schedule_items: objectArray(source.schedule_items).map((item) => ({
      title: stringPayload(item.title),
      date_text: stringPayload(item.date_text),
      time_text: stringPayload(item.time_text),
      notes: stringPayload(item.notes),
    })).filter((item) => item.title),
    shopping_items: objectArray(source.shopping_items).map((item) => ({
      name: stringPayload(item.name),
      quantity: stringPayload(item.quantity),
    })).filter((item) => item.name),
    follow_up_items: objectArray(source.follow_up_items).map((item) => ({
      title: stringPayload(item.title),
      person_name: stringPayload(item.person_name),
      action: stringPayload(item.action),
      due_text: stringPayload(item.due_text),
      notes: stringPayload(item.notes),
    })).filter((item) => item.title || item.person_name || item.action),
    google_calendar_candidates: objectArray(source.google_calendar_candidates).map((item) => ({
      title: stringPayload(item.title),
      date_text: stringPayload(item.date_text),
      time: stringPayload(item.time),
      notes: stringPayload(item.notes),
    })).filter((item) => item.title),
    priority_suggestions: objectArray(source.priority_suggestions).map((item) => ({
      title: stringPayload(item.title),
      reason: stringPayload(item.reason),
    })).filter((item) => item.title),
    needs_clarification: Boolean(source.needs_clarification),
    clarifying_question: stringPayload(source.clarifying_question),
  };
  return dedupePureLlmSecretaryJson(normalized);
}

function objectArray(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value)
    ? value.filter((item): item is Record<string, unknown> => Boolean(item && typeof item === 'object'))
    : [];
}

function dedupePureLlmSecretaryJson(result: PureLlmSecretaryJson): PureLlmSecretaryJson {
  return {
    ...result,
    schedule_items: dedupeByKey(result.schedule_items, (item) =>
      normalizeTaskText([item.date_text, item.time_text, item.title].filter(Boolean).join(' ')),
    ),
    shopping_items: dedupeShoppingJsonItems(result.shopping_items),
    follow_up_items: dedupeByKey(result.follow_up_items, (item) =>
      normalizeTaskText([item.title, item.person_name, item.action].filter(Boolean).join(' ')),
    ),
    google_calendar_candidates: dedupeByKey(result.google_calendar_candidates, (item) =>
      normalizeTaskText([item.date_text, item.time, item.title].filter(Boolean).join(' ')),
    ),
    priority_suggestions: dedupeByKey(result.priority_suggestions, (item) => normalizeTaskText(item.title ?? '')),
  };
}

function dedupeByKey<T>(items: T[], getKey: (item: T) => string) {
  const seen = new Set<string>();
  const deduped: T[] = [];
  items.forEach((item) => {
    const key = getKey(item);
    if (!key || seen.has(key)) return;
    seen.add(key);
    deduped.push(item);
  });
  return deduped;
}

function dedupeShoppingJsonItems(items: PureLlmSecretaryJson['shopping_items']) {
  const byName = new Map<string, { name?: string; quantity?: string }>();
  items.forEach((item) => {
    const key = normalizeTaskText(item.name ?? '');
    if (!key) return;
    const current = byName.get(key);
    if (!current) {
      byName.set(key, item);
      return;
    }
    if (!current.quantity && item.quantity) {
      byName.set(key, { ...current, quantity: item.quantity });
    }
  });
  return Array.from(byName.values());
}

function applyPureLlmSecretaryJson(draft: MorningReviewDraft, result: PureLlmSecretaryJson, sourceText: string) {
  let nextDraft = { ...draft, sourceText: appendVoiceText(draft.sourceText, sourceText) };
  result.schedule_items.forEach((item) => {
    nextDraft = applyLlmScheduleAction(nextDraft, {
      date_text: item.date_text,
      memo: item.notes,
      time: item.time_text,
      title: item.title,
    });
  });
  result.google_calendar_candidates.forEach((item) => {
    nextDraft = applyLlmGoogleCalendarAction(nextDraft, {
      date_text: item.date_text,
      memo: item.notes,
      time: item.time,
      title: item.title,
    });
  });
  result.shopping_items.forEach((item) => {
    nextDraft = appendPureLlmShoppingItem(nextDraft, item);
  });
  result.follow_up_items.forEach((item) => {
    nextDraft = applyLlmFollowUpAction(nextDraft, {
      action: item.action,
      due_text: item.due_text,
      memo: item.notes,
      person_name: item.person_name,
      title: item.title,
    });
  });
  if (result.priority_suggestions.length || result.assistant_reply) {
    nextDraft = {
      ...nextDraft,
      plan: {
        ...nextDraft.plan,
        advice: dedupeTodos([
          ...result.priority_suggestions.map((item) => [item.title, item.reason].filter(Boolean).join(': ')),
          result.assistant_reply,
          ...nextDraft.plan.advice,
        ]),
        priorities: {
          ...nextDraft.plan.priorities,
          highest: dedupeTodos([
            ...result.priority_suggestions.map((item) => item.title ?? '').filter(Boolean),
            ...nextDraft.plan.priorities.highest,
          ]).slice(0, 3),
        },
      },
    };
  }
  return { draft: normalizePureLlmReviewDraft(nextDraft) };
}

function appendPureLlmShoppingItem(draft: MorningReviewDraft, item: { name?: string; quantity?: string }) {
  const name = String(item.name ?? '').trim();
  if (!name) return draft;
  const nextItem: ShoppingItem = {
    addedAt: new Date().toISOString(),
    category: classifyShoppingItem(name),
    completed: false,
    id: createLocalShoppingItemId(name),
    name,
    quantity: String(item.quantity ?? '').trim(),
    source: 'voice',
  };
  return {
    ...draft,
    shoppingItems: normalizeLlmFirstShoppingItems([...draft.shoppingItems, nextItem]),
    shoppingUpdatedAt: new Date().toISOString(),
  };
}

function normalizePureLlmReviewDraft(draft: MorningReviewDraft): MorningReviewDraft {
  return {
    ...draft,
    followUpCandidates: dedupeByKey(draft.followUpCandidates, (item) =>
      normalizeTaskText([item.name, item.content, item.dueDate, item.dueTime].filter(Boolean).join(' ')),
    ),
    plan: {
      ...draft.plan,
      advice: dedupeTodos(draft.plan.advice),
      priorities: {
        highest: dedupeTodos(draft.plan.priorities.highest).slice(0, 3),
        important: dedupeTodos(draft.plan.priorities.important).slice(0, 3),
        optional: dedupeTodos(draft.plan.priorities.optional).slice(0, 3),
      },
      schedule: dedupeByKey(draft.plan.schedule, (item) =>
        normalizeTaskText([item.time, item.task].filter(Boolean).join(' ')),
      ),
      todos: dedupeTodos(draft.plan.todos),
    },
    shoppingItems: normalizeLlmFirstShoppingItems(draft.shoppingItems),
  };
}

function normalizeLlmFirstShoppingItems(items: ShoppingItem[]) {
  const byName = new Map<string, ShoppingItem>();
  items.forEach((item) => {
    const key = normalizeTaskText(item.name);
    if (!key) return;
    const current = byName.get(key);
    if (!current) {
      byName.set(key, {
        ...item,
        name: item.name.trim(),
        quantity: item.quantity.trim(),
      });
      return;
    }
    if (!current.quantity && item.quantity.trim()) {
      byName.set(key, { ...current, quantity: item.quantity.trim() });
    }
  });
  return Array.from(byName.values());
}

function summarizePureLlmJson(result: PureLlmSecretaryJson) {
  const extractedScheduleItems = result.schedule_items.map((item) => item.title ?? '').filter(Boolean);
  const extractedShoppingItems = result.shopping_items.map((item) => [item.name, item.quantity].filter(Boolean).join(' ')).filter(Boolean);
  const extractedFollowUpItems = result.follow_up_items.map((item) => item.title || [item.person_name, item.action].filter(Boolean).join('へ')).filter(Boolean);
  const extractedCalendarCandidates = result.google_calendar_candidates.map((item) => [item.date_text, item.time, item.title].filter(Boolean).join(' ')).filter(Boolean);
  return {
    calendarCount: extractedCalendarCandidates.length,
    extractedCalendarCandidates,
    extractedFollowUpItems,
    extractedScheduleItems,
    extractedShoppingItems,
    extractedCount: extractedScheduleItems.length + extractedShoppingItems.length + extractedFollowUpItems.length + extractedCalendarCandidates.length,
    followUpCount: extractedFollowUpItems.length,
    scheduleCount: extractedScheduleItems.length,
    shoppingCount: extractedShoppingItems.length,
  };
}

function summarizePureLlmDraft(draft: MorningReviewDraft) {
  const extractedScheduleItems = cleanScheduleItems(draft.plan.schedule).map((item) => item.task).filter(Boolean);
  const extractedShoppingItems = draft.shoppingItems.map((item) => [item.name, item.quantity].filter(Boolean).join(' ')).filter(Boolean);
  const extractedFollowUpItems = draft.followUpCandidates.map((item) => [item.name, item.content].filter(Boolean).join('へ')).filter(Boolean);
  const extractedCalendarCandidates = createCalendarEvents(draft.plan).map((item) => [item.sourceTime, item.title].filter(Boolean).join(' ')).filter(Boolean);
  return {
    calendarCount: extractedCalendarCandidates.length,
    extractedCalendarCandidates,
    extractedFollowUpItems,
    extractedScheduleItems,
    extractedShoppingItems,
    extractedCount: extractedScheduleItems.length + extractedShoppingItems.length + extractedFollowUpItems.length + extractedCalendarCandidates.length,
    followUpCount: extractedFollowUpItems.length,
    scheduleCount: extractedScheduleItems.length,
    shoppingCount: extractedShoppingItems.length,
  };
}

function normalizeLlmAssistantActions(value: unknown): LlmAssistantAction[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const action = item as { name?: unknown; type?: unknown; arguments?: unknown; payload?: unknown };
      const type = typeof action.type === 'string' ? action.type : typeof action.name === 'string' ? action.name : '';
      const payloadSource = action.payload && typeof action.payload === 'object' ? action.payload : action.arguments;
      if (!isLlmAssistantActionType(type) || !payloadSource || typeof payloadSource !== 'object') return null;
      return { type, payload: normalizeLlmActionPayload(type, payloadSource as Record<string, unknown>) } as LlmAssistantAction;
    })
    .filter((item): item is LlmAssistantAction => Boolean(item));
}

function isLlmAssistantActionType(value: string): value is LlmAssistantAction['type'] {
  return (
    value === 'add_schedule' ||
    value === 'add_shopping_item' ||
    value === 'add_follow_up' ||
    value === 'add_google_calendar_candidate' ||
    value === 'update_priority' ||
    value === 'show_review_card'
  );
}

function normalizeLlmActionPayload(type: LlmAssistantAction['type'], payload: Record<string, unknown>): LlmAssistantAction['payload'] {
  if (type === 'add_schedule' || type === 'add_google_calendar_candidate') {
    return {
      date: stringPayload(payload.date),
      date_text: stringPayload(payload.date_text),
      memo: stringPayload(payload.memo),
      time: stringPayload(payload.time),
      title: stringPayload(payload.title),
    };
  }
  if (type === 'add_shopping_item') {
    return {
      category: stringPayload(payload.category),
      name: stringPayload(payload.name),
      quantity: stringPayload(payload.quantity),
    };
  }
  if (type === 'add_follow_up') {
    return {
      action: stringPayload(payload.action),
      due: stringPayload(payload.due),
      due_text: stringPayload(payload.due_text),
      memo: stringPayload(payload.memo),
      method: normalizeLlmFollowUpKind(payload.method),
      person_name: stringPayload(payload.person_name),
      title: stringPayload(payload.title),
    };
  }
  if (type === 'update_priority') {
    return {
      items: Array.isArray(payload.items)
        ? payload.items.map((item) => (item && typeof item === 'object' ? item : {})) as { title?: string; reason?: string }[]
        : [],
    };
  }
  return {
    summary: stringPayload(payload.summary),
  };
}

function normalizeLlmAssistantDebug(value: unknown, actions: LlmAssistantAction[]): LlmAssistantDebug {
  const debug = value && typeof value === 'object'
    ? (value as { actionsCount?: unknown; assistantLinesCount?: unknown; lastAssistantResponse?: unknown; rawToolCallsCount?: unknown; toolCalls?: unknown })
    : {};
  const extracted = summarizeExtractedActions(actions);
  return {
    actionsCount: numberPayload(debug.actionsCount, actions.length),
    assistantLinesCount: numberPayload(debug.assistantLinesCount, 0),
    calendarCount: extracted.calendar.length,
    draftAutoGenerated: false,
    draftItemCount: extracted.schedule.length + extracted.shopping.length + extracted.followUp.length + extracted.calendar.length,
    extractedCalendarCandidates: extracted.calendar,
    extractedFollowUpItems: extracted.followUp,
    extractedScheduleItems: extracted.schedule,
    extractedShoppingItems: extracted.shopping,
    extractedCount: extracted.schedule.length + extracted.shopping.length + extracted.followUp.length + extracted.calendar.length,
    calendarRejectReasons: [],
    followUpRejectReasons: [],
    followUpCount: extracted.followUp.length,
    jsonParseSuccess: false,
    lastLlmJson: '',
    lastAssistantResponse: stringPayload(debug.lastAssistantResponse),
    lostEntityCount: 0,
    needsClarification: false,
    clarifyingQuestion: '',
    parseError: '',
    pendingSave: false,
    prioritySuggestionsCount: 0,
    rawToolCallsCount: numberPayload(debug.rawToolCallsCount, actions.length),
    scheduleCount: extracted.schedule.length,
    shoppingCount: extracted.shopping.length,
    toolCalls: safeStringArray(debug.toolCalls),
  };
}

function shouldApplySemanticRecovery(text: string) {
  const intent = detectNaturalUserIntent(text);
  return intent === 'priority' || intent === 'freeform';
}

function repairSemanticActionBoundaries(actions: LlmAssistantAction[]) {
  return dedupeLlmAssistantActions(actions.filter((action) => {
    if (action.type === 'add_follow_up') {
      const label = getRecoveredActionTitle(action);
      if (containsShoppingEntity(label)) return false;
      if (label.length > 40 && /買|牛乳|卵|銀行|会合|予定/.test(label)) return false;
      return Boolean(
        (action.payload.person_name && action.payload.action) ||
        (action.payload.title && action.payload.title.length > 0),
      );
    }
    if (action.type === 'add_google_calendar_candidate') {
      const title = action.payload.title ?? '';
      const time = action.payload.time ?? '';
      const date = action.payload.date_text || action.payload.date || '';
      if (/銀行/.test(title) && !hasExplicitClock(time)) return false;
      return Boolean(title && (date || hasExplicitClock(time)));
    }
    if (action.type === 'add_schedule') {
      const time = action.payload.time ?? '';
      const date = action.payload.date_text || action.payload.date || '';
      if (date && hasExplicitClock(time) && isFutureConversationText(date)) return false;
    }
    if (action.type === 'add_shopping_item') {
      return Boolean(action.payload.name && !/LINE|電話|メール|連絡|返信/.test(action.payload.name));
    }
    return true;
  }));
}

function summarizeSemanticRejectReasons(actions: LlmAssistantAction[]) {
  return actions.reduce(
    (summary, action) => {
      if (action.type === 'add_follow_up') {
        const reasons = getFollowUpRejectReasons(action);
        if (reasons.length) summary.followUp.push(reasons.join(', '));
      }
      if (action.type === 'add_google_calendar_candidate') {
        const reasons = getCalendarRejectReasons(action);
        if (reasons.length) summary.calendar.push(reasons.join(', '));
      }
      return summary;
    },
    { calendar: [] as string[], followUp: [] as string[] },
  );
}

function getFollowUpRejectReasons(action: Extract<LlmAssistantAction, { type: 'add_follow_up' }>) {
  const label = getRecoveredActionTitle(action);
  const hasPersonAction = Boolean(action.payload.person_name && action.payload.action);
  const hasTitleFallback = Boolean(action.payload.title && action.payload.title.length > 0);
  const reasons: string[] = [];
  if (containsShoppingEntity(label)) reasons.push('shopping entity');
  if (label.length > 40 && /買|牛乳|卵|銀行|会合|予定/.test(label)) reasons.push('long mixed entity');
  if (!hasPersonAction && !hasTitleFallback) {
    if (!action.payload.person_name) reasons.push('missing person_name');
    if (!action.payload.action) reasons.push('missing action');
    if (!action.payload.title) reasons.push('missing title fallback');
  }
  return reasons;
}

function getCalendarRejectReasons(action: Extract<LlmAssistantAction, { type: 'add_google_calendar_candidate' }>) {
  const title = action.payload.title ?? '';
  const time = action.payload.time ?? '';
  const date = action.payload.date_text || action.payload.date || '';
  const hasClock = hasExplicitClock(time);
  const reasons: string[] = [];
  if (/銀行/.test(title) && !hasClock) reasons.push('bank item without explicit clock time');
  if (!title) reasons.push('missing title');
  if (!date && !hasClock) {
    reasons.push('missing date');
    reasons.push('missing time');
  }
  return reasons;
}

function summarizeExtractedActions(actions: LlmAssistantAction[]) {
  return {
    calendar: actions.filter((action) => action.type === 'add_google_calendar_candidate').map(getRecoveredActionTitle).filter(Boolean),
    followUp: actions.filter((action) => action.type === 'add_follow_up').map(getRecoveredActionTitle).filter(Boolean),
    schedule: actions.filter((action) => action.type === 'add_schedule').map(getRecoveredActionTitle).filter(Boolean),
    shopping: actions.filter((action) => action.type === 'add_shopping_item').map(getRecoveredActionTitle).filter(Boolean),
  };
}

function createFullCoverageActions(text: string) {
  return dedupeLlmAssistantActions([
    ...createTextRecoveryActions(text),
    ...createParallelToolRecoveryActions(text),
  ]);
}

function createEntityCoverageReport(expectedActions: LlmAssistantAction[], actualActions: LlmAssistantAction[]) {
  const expected = summarizeExtractedActions(repairSemanticActionBoundaries(expectedActions));
  const actual = summarizeExtractedActions(actualActions);
  const lostEntityCount =
    countMissingLabels(expected.schedule, actual.schedule) +
    countMissingLabels(expected.shopping, actual.shopping) +
    countMissingLabels(expected.followUp, actual.followUp) +
    countMissingLabels(expected.calendar, actual.calendar);
  return {
    calendarCount: actual.calendar.length,
    expectedCount: expected.schedule.length + expected.shopping.length + expected.followUp.length + expected.calendar.length,
    extractedCount: actual.schedule.length + actual.shopping.length + actual.followUp.length + actual.calendar.length,
    followUpCount: actual.followUp.length,
    lostEntityCount,
    scheduleCount: actual.schedule.length,
    shoppingCount: actual.shopping.length,
  };
}

function countMissingLabels(expected: string[], actual: string[]) {
  const actualKeys = new Set(actual.map(normalizeTaskText));
  return expected.filter((item) => !actualKeys.has(normalizeTaskText(item))).length;
}

function createParallelToolRecoveryActions(text: string): LlmAssistantAction[] {
  const normalized = text.normalize('NFKC');
  const actions: LlmAssistantAction[] = [];
  const defaultDateText = extractDefaultDateText(normalized) || extractParallelDefaultDateText(normalized);

  if (/銀行\s*(へ|に)?\s*行/.test(normalized)) {
    actions.push({
      payload: {
        date_text: defaultDateText,
        time: /午前中|午前/.test(normalized) ? '午前中' : '',
        title: '銀行へ行く',
      },
      type: 'add_schedule',
    });
  }

  extractParallelShoppingItems(normalized).forEach((item) => {
    actions.push({
      payload: {
        category: item.category,
        name: item.name,
        quantity: item.quantity,
      },
      type: 'add_shopping_item',
    });
  });

  const followUp = extractParallelFollowUpAction(normalized);
  if (followUp) {
    actions.push({
      payload: {
        action: followUp.action,
        due_text: '',
        method: followUp.method,
        person_name: followUp.personName,
        title: `${followUp.personName}へ${followUp.action}`,
      },
      type: 'add_follow_up',
    });
  }

  const calendar = extractParallelCalendarCandidate(normalized, defaultDateText);
  if (calendar) {
    actions.push({
      payload: calendar,
      type: 'add_google_calendar_candidate',
    });
  }

  if (detectNaturalUserIntent(text) === 'priority' && actions.length) {
    actions.push({
      payload: {
        items: actions
          .map((action) => ({ title: getRecoveredActionTitle(action), reason: getAssistantPriorityReason(getRecoveredActionTitle(action)) }))
          .filter((item) => item.title)
          .slice(0, 4),
      },
      type: 'update_priority',
    });
  }

  return dedupeLlmAssistantActions(actions);
}

function extractParallelShoppingItems(text: string) {
  const items: Array<{ category: string; name: string; quantity: string }> = [];
  const pattern = /([一-龥ぁ-んァ-ヶーA-Za-z]+?)\s*(\d+(?:\.\d+)?)\s*(本|個|袋|パック|箱|枚|kg|キロ|g|グラム|L|リットル|ml|ミリリットル)/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text))) {
    const name = match[1]
      .replace(/.*(?:帰りに|ついでに|あと|と|、|,)/, '')
      .replace(/(を|が|も|は)$/, '')
      .trim();
    if (!name || /時|銀行|会合|LINE|電話|メール|連絡|予定|午前|午後|夕方/.test(name)) continue;
    items.push({
      category: classifyShoppingItem(name),
      name,
      quantity: `${match[2]}${match[3]}`,
    });
  }
  return items;
}

function extractParallelDefaultDateText(text: string) {
  return text.match(/明日|あした|明後日|あさって|来週|来月|\d{1,2}月\d{1,2}日?/)?.[0] ?? '';
}

function extractParallelFollowUpAction(text: string) {
  const match = text.match(/([一-龥ぁ-んァ-ヶーA-Za-z]+(?:さん|くん|君|ちゃん|様)?)\s*(?:へ|に)?\s*(LINE|ライン|電話|メール|返信|折り返し|連絡|確認)(?:する|して|をする)?/);
  if (!match) return null;
  const actionText = match[2].replace(/ライン/i, 'LINE');
  return {
    action: actionText === 'LINE' ? 'LINEする' : `${actionText}する`,
    method: normalizeLlmFollowUpKind(actionText),
    personName: match[1],
  };
}

function extractParallelCalendarCandidate(text: string, defaultDateText: string): { date_text: string; time: string; title: string } | null {
  const hasFutureDate = Boolean(defaultDateText) || isFutureConversationText(text);
  if (!hasFutureDate) return null;
  const match = text.match(/(?:午前|午後|夕方|夜)?\s*(\d{1,2})(?::([0-5]\d)|時(?:([0-5]?\d)分)?)\s*(?:から|に)?\s*([一-龥ぁ-んァ-ヶーA-Za-z]+(?:会合|会議|打ち合わせ|打合せ|面談|予約))/);
  if (!match) return null;
  const hour = match[1].padStart(2, '0');
  const minute = (match[2] || match[3] || '00').padStart(2, '0');
  return {
    date_text: defaultDateText,
    time: `${hour}:${minute}`,
    title: match[4].replace(/があります|です|する$/, '').trim(),
  };
}

function containsShoppingEntity(text: string) {
  return /牛乳|卵|大根|人参|にんじん|ネギ|ねぎ|買い物|買う|購入|スーパー|パック|本|個|袋/.test(text);
}

function hasExplicitClock(text: string) {
  return /\b\d{1,2}:\d{2}\b|\d{1,2}時(?:半|[0-5]?\d分?)?/.test(text);
}

function createContextRepairActions(draft: MorningReviewDraft, text: string): LlmAssistantAction[] {
  const intent = detectNaturalUserIntent(text);
  const actions: LlmAssistantAction[] = [];
  const scheduleItems = cleanScheduleItems(draft.plan.schedule);
  const shoppingDraftItems = draft.shoppingItems.filter((item) => item.name.trim());
  const followUpItems = draft.followUpCandidates.filter((item) => item.name.trim() && item.content.trim());

  if (intent === 'shopping-only' || intent === 'add-all') {
    shoppingDraftItems.forEach((item) => {
      actions.push({
        payload: {
          category: item.category,
          name: item.name,
          quantity: item.quantity,
        },
        type: 'add_shopping_item',
      });
    });
  }

  if (intent === 'follow-up' || intent === 'add-all') {
    followUpItems.forEach((item) => {
      actions.push({
        payload: {
          action: item.content,
          due_text: item.duePreset,
          method: item.kind,
          person_name: item.name,
          title: `${item.name}へ${item.content}`,
        },
        type: 'add_follow_up',
      });
    });
  }

  if (intent === 'calendar' || intent === 'add-all') {
    scheduleItems
      .filter((item) => isFutureConversationTime(item.time) || isFutureConversationText(`${item.time} ${item.task}`))
      .forEach((item) => {
        actions.push({
          payload: {
            date_text: extractDateTextFromLlmTime(item.time),
            time: extractClockTextFromLlmTime(item.time),
            title: item.task,
          },
          type: 'add_google_calendar_candidate',
        });
      });
  }

  if (intent === 'add-all') {
    scheduleItems.forEach((item) => {
      actions.push({
        payload: {
          date_text: extractDateTextFromLlmTime(item.time),
          time: extractClockTextFromLlmTime(item.time),
          title: item.task,
        },
        type: 'add_schedule',
      });
    });
  }

  if (intent === 'review' && hasConversationDraftContent(draft)) {
    actions.push({
      payload: { summary: createNaturalReviewSummary(draft) },
      type: 'show_review_card',
    });
  }

  return dedupeLlmAssistantActions(actions);
}

function hasConversationDraftContent(draft: MorningReviewDraft) {
  return Boolean(cleanScheduleItems(draft.plan.schedule).length || draft.shoppingItems.length || draft.followUpCandidates.length || draft.plan.todos.length);
}

function extractDateTextFromLlmTime(value: string) {
  const withoutClock = value.replace(/\b\d{1,2}:\d{2}\b/g, '').trim();
  const date = withoutClock.match(/明後日|明日|今日|\d{1,2}月\d{1,2}日/)?.[0];
  return date ?? withoutClock.replace(/午前中|午前|午後|朝|昼|夕方|夜/g, '').trim();
}

function extractClockTextFromLlmTime(value: string) {
  const clock = value.match(/\b\d{1,2}:\d{2}\b/)?.[0];
  if (clock) return clock;
  if (/午前中|午前|午後|朝|昼|夕方|夜/.test(value)) return value.replace(/明後日|明日|今日/g, '').trim();
  return '';
}

function dedupeLlmAssistantActions(actions: LlmAssistantAction[]) {
  const seen = new Set<string>();
  return actions.filter((action) => {
    const key = getLlmAssistantActionDedupeKey(action);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function getLlmAssistantActionDedupeKey(action: LlmAssistantAction) {
  if (action.type === 'add_schedule' || action.type === 'add_google_calendar_candidate') {
    const date = 'date_text' in action.payload ? action.payload.date_text || action.payload.date || '' : '';
    const time = 'time' in action.payload ? action.payload.time || '' : '';
    return `${action.type}:${normalizeTaskText(action.payload.title ?? '')}:${normalizeTaskText(date)}:${normalizeTaskText(time)}`;
  }
  if (action.type === 'add_shopping_item') {
    return `${action.type}:${normalizeTaskText(action.payload.name ?? '')}:${normalizeTaskText(action.payload.quantity ?? '')}`;
  }
  if (action.type === 'add_follow_up') {
    return `${action.type}:${normalizeTaskText(getRecoveredActionTitle(action))}`;
  }
  if (action.type === 'update_priority') {
    const items = action.payload.items?.map((item) => normalizeTaskText(item.title ?? '')).join('|') ?? '';
    return `${action.type}:${items}`;
  }
  return `${action.type}:${normalizeTaskText(action.payload.summary ?? '')}`;
}

function createTextRecoveryActions(text: string): LlmAssistantAction[] {
  const actions: LlmAssistantAction[] = [];
  const schedules = recoverImplicitScheduleItems(text, parseConversationScheduleItems(text));
  const shoppingItems = extractConversationShoppingItems(text);
  const followUp = createConversationFollowUpCandidate(text);
  const isPriorityQuestion = detectNaturalUserIntent(text) === 'priority';
  const defaultDateText = extractDefaultDateText(text);

  schedules.forEach((item) => {
    const dateText = extractDateTextFromLlmTime(item.time) || defaultDateText;
    const clockText = extractClockTextFromLlmTime(item.time);
    const isCalendarCandidate = (isFutureConversationTime(item.time) || isFutureConversationText(`${dateText} ${item.time} ${item.task}`)) && hasExplicitClock(item.time);
    if (!isCalendarCandidate) {
      actions.push({
        payload: {
          date_text: dateText,
          time: clockText,
          title: item.task,
        },
        type: 'add_schedule',
      });
    }
    if (isCalendarCandidate) {
      actions.push({
        payload: {
          date_text: dateText,
          time: clockText,
          title: item.task,
        },
        type: 'add_google_calendar_candidate',
      });
    }
  });

  shoppingItems.forEach((item) => {
    actions.push({
      payload: {
        category: item.category,
        name: item.name,
        quantity: item.quantity,
      },
      type: 'add_shopping_item',
    });
  });

  if (followUp) {
    actions.push({
      payload: {
        action: followUp.content,
        due_text: followUp.duePreset,
        method: followUp.kind,
        person_name: followUp.name,
        title: `${followUp.name}へ${followUp.content}`,
      },
      type: 'add_follow_up',
    });
  }

  if (isPriorityQuestion && actions.length) {
    actions.push({
      payload: {
        items: actions
          .filter((action) => action.type !== 'update_priority')
          .map((action) => ({ title: getRecoveredActionTitle(action), reason: getAssistantPriorityReason(getRecoveredActionTitle(action)) }))
          .filter((item) => item.title)
          .slice(0, 4),
      },
      type: 'update_priority',
    });
  }

  return dedupeLlmAssistantActions(actions);
}

function extractDefaultDateText(text: string) {
  return text.match(/明後日|明日|今日|\d{1,2}月\d{1,2}日/)?.[0] ?? '';
}

function recoverImplicitScheduleItems(text: string, parsed: MorningPlan['schedule']): MorningPlan['schedule'] {
  const nextItems = [...parsed];
  const normalized = text.normalize('NFKC');
  const hasBank = /銀行.*行/.test(normalized);
  const hasBankAlready = nextItems.some((item) => /銀行/.test(item.task));
  if (hasBank && !hasBankAlready) {
    const dateText = /明日/.test(normalized) ? '明日' : /明後日/.test(normalized) ? '明後日' : '';
    const timeText = /午前中|午前/.test(normalized) ? '午前中' : /朝/.test(normalized) ? '朝' : '';
    nextItems.push({
      task: '銀行へ行く',
      time: [dateText, timeText].filter(Boolean).join(' ') || '時間調整',
    });
  }
  return nextItems;
}

function getRecoveredActionTitle(action: LlmAssistantAction) {
  if (action.type === 'add_schedule' || action.type === 'add_google_calendar_candidate') return action.payload.title ?? '';
  if (action.type === 'add_shopping_item') return [action.payload.name, action.payload.quantity].filter(Boolean).join(' ');
  if (action.type === 'add_follow_up') return action.payload.title || [action.payload.person_name, action.payload.action].filter(Boolean).join('へ');
  return '';
}

function createRecoveredAssistantLines(draft: MorningReviewDraft, actions: LlmAssistantAction[], text: string) {
  if (!actions.length) return [createLlmFallbackLine(0)];
  if (actions.some((action) => action.type === 'show_review_card') || detectNaturalUserIntent(text) === 'review') {
    return ['保存前確認を表示します。'];
  }
  if (detectNaturalUserIntent(text) === 'priority' || actions.some((action) => action.type === 'update_priority')) {
    const titles = actions.map(getRecoveredActionTitle).filter(Boolean);
    return [
      'おすすめ順です。',
      ...titles.slice(0, 4).map((title, index) => `${index + 1}. ${title}`),
      '必要なら「全部追加して」と言ってください。',
    ];
  }
  const labels = actions.map(getRecoveredActionTitle).filter(Boolean);
  return labels.length
    ? ['追加しました。', ...labels.slice(0, 6).map((label) => `・${label}`), '保存前確認を表示する場合は「保存して」と言ってください。']
    : [createLlmFallbackLine(actions.length)];
}

function stringPayload(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function numberPayload(value: unknown, fallback: number) {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function safeStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map(String).map((item) => item.trim()).filter(Boolean) : [];
}

function createLlmFallbackLine(actionCount: number) {
  return actionCount
    ? '内容を理解して候補に反映しました。保存するときは「保存して」と話してください。'
    : '内容を受け取りました。必要な確認があれば続けて質問します。';
}

function sanitizeAssistantLines(lines: string[]) {
  const replacements: Array<[RegExp, string]> = [
    [/^\s*[ABC]\s*[:：]\s*/i, ''],
    [/該当番号を?教えてください/g, '必要なものを自然な言葉で話してください'],
    [/番号を教えてください/g, '必要なものを自然な言葉で話してください'],
    [/選択してください/g, '必要なものを自然な言葉で話してください'],
  ];
  return lines
    .map((line) =>
      replacements
        .reduce((current, [pattern, replacement]) => current.replace(pattern, replacement), line)
        .trim(),
    )
    .filter((line) => line && !/^(?:[ABC]\s*[:：]?|該当番号|番号を教えてください|選択してください)$/i.test(line));
}

function detectNaturalUserIntent(text: string) {
  if (/全部追加して|すべて追加|全部入れて|全部登録|お願い|それで|保存して|これでOK|これでオーケー/i.test(text)) return 'add-all';
  if (/全部|すべて|まとめて/.test(text)) return 'add-all';
  if (/買い物.*(?:だけ|入れて|追加)|(?:だけ|入れて|追加).*買い物/.test(text)) return 'shopping-only';
  if (/(?:LINE|ライン|フォロー|Follow Up|連絡).*?(?:入れて|追加|登録)/i.test(text)) return 'follow-up';
  if (/(?:カレンダー|Google).*?(?:入れて|追加|登録)/.test(text)) return 'calendar';
  if (/保存|OK|オーケー|これで/.test(text)) return 'review';
  if (/お願い|それで|それも/.test(text)) return 'approval';
  if (/順番|優先|どう.*動|何から/.test(text)) return 'priority';
  return 'freeform';
}

function describeAssistantAction(toolCalls: string[], shouldOpenReview: boolean) {
  if (shouldOpenReview) return 'show-review-card';
  if (!toolCalls.length) return 'reply-only';
  return toolCalls.join(', ');
}

function applyLlmAssistantActions(draft: MorningReviewDraft, actions: LlmAssistantAction[], sourceText: string) {
  let nextDraft = { ...draft, sourceText: appendVoiceText(draft.sourceText, sourceText) };
  let shouldOpenReview = false;
  for (const action of actions) {
    if (action.type === 'add_schedule') {
      nextDraft = applyLlmScheduleAction(nextDraft, action.payload);
    } else if (action.type === 'add_shopping_item') {
      nextDraft = applyLlmShoppingAction(nextDraft, action.payload);
    } else if (action.type === 'add_follow_up') {
      nextDraft = applyLlmFollowUpAction(nextDraft, action.payload);
    } else if (action.type === 'add_google_calendar_candidate') {
      nextDraft = applyLlmGoogleCalendarAction(nextDraft, action.payload);
    } else if (action.type === 'update_priority') {
      nextDraft = applyLlmPriorityAction(nextDraft, action.payload);
    } else if (action.type === 'show_review_card') {
      shouldOpenReview = true;
      if (action.payload.summary) {
        nextDraft = {
          ...nextDraft,
          plan: {
            ...nextDraft.plan,
            advice: dedupeTodos([String(action.payload.summary), ...nextDraft.plan.advice]),
          },
        };
      }
    }
  }
  return { draft: nextDraft, shouldOpenReview };
}

function applyLlmScheduleAction(draft: MorningReviewDraft, action: { date_text?: string; date?: string; time?: string; title?: string; memo?: string }) {
  const title = String(action.title ?? '').trim();
  if (!title) return draft;
  const time = createLlmScheduleTime(action.date_text || action.date, action.time);
  return appendConversationSchedules(draft, [{ time, task: title }], title);
}

function applyLlmShoppingAction(draft: MorningReviewDraft, action: { name?: string; quantity?: string; category?: string }) {
  const name = String(action.name ?? '').trim();
  if (!name) return draft;
  const item: ShoppingItem = {
    addedAt: new Date().toISOString(),
    category: classifyShoppingItem(name),
    completed: false,
    id: createLocalShoppingItemId(name),
    name,
    quantity: String(action.quantity ?? '').trim(),
    source: 'voice',
  };
  return {
    ...draft,
    shoppingItems: postProcessShoppingItems([...draft.shoppingItems, item]),
    shoppingUpdatedAt: new Date().toISOString(),
  };
}

function applyLlmFollowUpAction(
  draft: MorningReviewDraft,
  action: { person_name?: string; title?: string; action?: string; method?: FollowUpKind; due_text?: string; due?: string; memo?: string },
) {
  const parsed = parseLlmFollowUpPayload(action);
  const name = parsed.name;
  const content = parsed.content;
  if (!name || !content) return draft;
  const item = createConversationFollowUpFromParts(name, content, normalizeLlmFollowUpKind(action.method));
  const dueItem = applyFollowUpDueFromReply(item, String(action.due_text || action.due || ''));
  return appendConversationFollowUp(draft, { ...dueItem, content: [content, action.memo].filter(Boolean).join(' ') }, content);
}

function parseLlmFollowUpPayload(action: { person_name?: string; title?: string; action?: string }) {
  const title = String(action.title ?? '').trim();
  let name = String(action.person_name ?? '').trim();
  let content = String(action.action ?? '').trim();
  if ((!name || !content) && title) {
    const match = title.match(/^(.+?)(?:さん)?(?:へ|に)(.+)$/);
    if (match) {
      name = name || match[1].replace(/さん$/, '').trim();
      content = content || match[2].trim();
    } else {
      content = content || title;
    }
  }
  return { content, name };
}

function applyLlmGoogleCalendarAction(
  draft: MorningReviewDraft,
  action: { date_text?: string; date?: string; time?: string; title?: string; memo?: string },
) {
  const title = String(action.title ?? '').trim();
  if (!title) return draft;
  return applyLlmScheduleAction(draft, {
    date: action.date,
    date_text: action.date_text,
    memo: action.memo,
    time: action.time,
    title,
  });
}

function applyLlmPriorityAction(draft: MorningReviewDraft, action: { items?: { title?: string; reason?: string }[] }) {
  const items = Array.isArray(action.items) ? action.items : [];
  const titles = items.map((item) => String(item.title ?? '').trim()).filter(Boolean).slice(0, 3);
  const reasons = items
    .map((item) => [item.title, item.reason].filter(Boolean).join(': '))
    .filter(Boolean)
    .slice(0, 3);
  if (!titles.length && !reasons.length) return draft;
  return {
    ...draft,
    plan: {
      ...draft.plan,
      advice: dedupeTodos([...reasons, ...draft.plan.advice]),
      priorities: {
        ...draft.plan.priorities,
        highest: dedupeTodos([...titles, ...draft.plan.priorities.highest]).slice(0, 3),
      },
    },
  };
}

function createLlmScheduleTime(dateText?: string, timeText?: string) {
  const date = String(dateText ?? '').trim();
  const time = String(timeText ?? '').trim();
  return [date, normalizeLlmTimeText(time)].filter(Boolean).join(' ') || '時間調整';
}

function normalizeLlmTimeText(value: string) {
  const time = parseMemoryTimeAnswer(value);
  return time || value;
}

function normalizeLlmFollowUpKind(value: unknown): FollowUpKind {
  return value === 'phone' || value === 'line' || value === 'email' || value === 'sms' || value === 'other'
    ? value
    : 'other';
}

function processConversationTurn(
  currentDraft: MorningReviewDraft,
  text: string,
  pendingIntent: PendingConversationIntent | null,
  pendingFollowUp: FollowUpDraftItem | null,
): ConversationTurnResult {
  if (pendingIntent) {
    const memoryResult = processPendingConversationIntent(currentDraft, text, pendingIntent);
    if (memoryResult) return memoryResult;
  }

  if (isMorningAssistantQuestion(text)) {
    return {
      assistantLines: createAssistantPrioritySuggestionLines(currentDraft),
      draft: {
        ...currentDraft,
        sourceText: appendVoiceText(currentDraft.sourceText, text),
      },
      pendingIntent,
      pendingFollowUp,
      shouldOpenReview: false,
    };
  }

  if (isConversationSaveCommand(text)) {
    return {
      assistantLines: createAssistantSaveLines(currentDraft),
      draft: currentDraft,
      pendingIntent: null,
      pendingFollowUp: null,
      shouldOpenReview: true,
    };
  }

  if (pendingFollowUp && isConversationAffirmative(text)) {
    const nextPendingFollowUp = applyFollowUpDueFromReply(pendingFollowUp, text);
    const draft = appendConversationFollowUp(currentDraft, nextPendingFollowUp, text);
    return {
      assistantLines: [
        `${nextPendingFollowUp.name}への${nextPendingFollowUp.content}をFollow Up候補に追加しました。`,
        ...createFollowUpDueQuestionLines(nextPendingFollowUp),
        ...createProactiveSuggestionLines('follow_up', draft, nextPendingFollowUp),
      ],
      draft,
      pendingIntent: createFollowUpDueQuestionLines(nextPendingFollowUp).length ? { type: 'follow_up_due', item: nextPendingFollowUp } : null,
      pendingFollowUp: null,
      shouldOpenReview: false,
    };
  }

  if (isFollowUpDueReply(text) && currentDraft.followUpCandidates.length) {
    const draft = updateLatestFollowUpDue(currentDraft, text);
    const latest = draft.followUpCandidates[draft.followUpCandidates.length - 1];
    return {
      assistantLines: [
        latest ? `${latest.name}への${latest.content}の期限を更新しました。` : 'Follow Upの期限を更新しました。',
        ...createProactiveSuggestionLines('follow_up_due', draft, latest),
      ],
      draft: {
        ...draft,
        sourceText: appendVoiceText(draft.sourceText, text),
      },
      pendingIntent: null,
      pendingFollowUp: null,
      shouldOpenReview: false,
    };
  }

  const schedules = parseConversationScheduleItems(text);
  const shoppingItems = extractConversationShoppingItems(text);
  const followUpItem = createConversationFollowUpCandidate(text);
  const hasFutureSchedule = schedules.some((item) => isFutureConversationTime(item.time)) || isFutureConversationText(text);
  const unscheduledTodo = !schedules.length ? createConversationTodo(text) : '';
  let draft = appendConversationSchedules(currentDraft, schedules, text);
  if (unscheduledTodo) {
    draft = {
      ...draft,
      plan: {
        ...draft.plan,
        todos: dedupeTodos([...draft.plan.todos, unscheduledTodo]),
      },
    };
  }
  if (shoppingItems.length) {
    draft = {
      ...draft,
      shoppingItems: postProcessShoppingItems([...draft.shoppingItems, ...shoppingItems]),
      shoppingUpdatedAt: new Date().toISOString(),
    };
  }

  const assistantLines: string[] = [];
  if (hasFutureSchedule && schedules.length) {
    assistantLines.push('未来予定としてGoogleカレンダー候補にも追加しました。登録しますか？');
  }
  if (schedules.length) {
    assistantLines.push(`予定候補に追加しました: ${schedules.map((item) => `${item.time} ${item.task}`).join('、')}`);
  }
  if (unscheduledTodo) {
    assistantLines.push(`やること候補に追加しました: ${unscheduledTodo}`);
  }
  if (shoppingItems.length) {
    assistantLines.push(`買い物候補へ追加しました: ${shoppingItems.map(formatShoppingItemLabel).join('、')}`);
  }

  let nextPendingFollowUp: FollowUpDraftItem | null = null;
  let nextPendingIntent = createPendingIntentFromTurn(text, schedules, shoppingItems, followUpItem);
  if (followUpItem) {
    nextPendingFollowUp = followUpItem;
    if (isVagueContactText(text)) {
      nextPendingIntent = { type: 'contact_method', person: followUpItem.name, originalText: text };
      assistantLines.push(`${followUpItem.name}への連絡は、電話ですか？LINEですか？メールですか？`);
    } else {
      assistantLines.push(`${followUpItem.name}への${followUpItem.content}はFollow Upにも登録しますか？`);
    }
  }

  if (followUpItem && !isVagueContactText(text)) {
    draft = appendConversationFollowUp(draft, followUpItem, text);
    nextPendingFollowUp = null;
    nextPendingIntent = { type: 'follow_up_due', item: followUpItem };
  }

  const questions = createImmediateConversationQuestions(text, schedules, shoppingItems);
  assistantLines.push(...questions);
  assistantLines.push(...createSecretaryQuestionLines(text, schedules, shoppingItems, followUpItem));
  if (!assistantLines.length) {
    assistantLines.push('内容を受け取りました。時間や相手、買うものがあれば続けて話してください。');
  }

  return {
    assistantLines: dedupeConversationLines(assistantLines),
    draft: {
      ...draft,
      sourceText: appendVoiceText(draft.sourceText, text),
    },
    pendingIntent: nextPendingIntent,
    pendingFollowUp: nextPendingFollowUp,
    shouldOpenReview: false,
  };
}

function appendConversationSchedules(draft: MorningReviewDraft, schedules: MorningPlan['schedule'], sourceText: string): MorningReviewDraft {
  if (!schedules.length) {
    return draft;
  }
  const nextSchedule = cleanScheduleItems([...draft.plan.schedule, ...schedules], schedules, schedules);
  const nextTodos = dedupeTodos([...draft.plan.todos, ...schedules.map((item) => item.task)]);
  return {
    ...draft,
    plan: {
      ...draft.plan,
      priorities: {
        ...draft.plan.priorities,
        highest: dedupeTodos([...draft.plan.priorities.highest, ...schedules.map((item) => item.task)]).slice(0, 3),
      },
      schedule: nextSchedule,
      todos: nextTodos,
    },
  };
}

function appendConversationFollowUp(draft: MorningReviewDraft, item: FollowUpDraftItem, sourceText: string): MorningReviewDraft {
  const existingKeys = new Set(draft.followUpCandidates.map((candidate) => `${candidate.name}-${candidate.content}`));
  const nextItems = existingKeys.has(`${item.name}-${item.content}`)
    ? draft.followUpCandidates
    : [...draft.followUpCandidates, item];
  return {
    ...draft,
    followUpCandidates: nextItems,
    sourceText: appendVoiceText(draft.sourceText, sourceText),
  };
}

function parseConversationScheduleItems(text: string): MorningPlan['schedule'] {
  const normalized = text.normalize('NFKC');
  const schedule: MorningPlan['schedule'] = [];
  const timePattern =
    /(?:(今日|明日|明後日|来週(?:月曜|火曜|水曜|木曜|金曜|土曜|日曜|月曜日|火曜日|水曜日|木曜日|金曜日|土曜日|日曜日)?|\d{1,2}月\d{1,2}日)\s*)?(午前|午後|朝|昼|夜)?\s*(\d{1,2})時(半|[0-5]?\d分?)?(?:から|に)?\s*([^、。\n]*)/g;
  let match: RegExpExecArray | null;
  while ((match = timePattern.exec(normalized))) {
    const hour = normalizeConversationHour(Number(match[3]), match[2] ?? '');
    const minute = normalizeConversationMinute(match[4] ?? '');
    if (hour < 0 || hour > 23 || minute < 0 || minute > 59) continue;
    const datePrefix = match[1] ? `${match[1]} ` : '';
    const time = `${datePrefix}${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
    const task = createConversationScheduleTitle(match[5] || normalized);
    if (task) schedule.push({ time, task });
  }
  return cleanScheduleItems(schedule, schedule, schedule);
}

function normalizeConversationHour(hour: number, period: string) {
  if ((period === '午後' || period === '夜') && hour < 12) return hour + 12;
  if (period === '朝' && hour === 12) return 0;
  return hour;
}

function normalizeConversationMinute(value: string) {
  if (!value) return 0;
  if (value === '半') return 30;
  return Number(value.replace('分', '') || 0);
}

function createConversationScheduleTitle(value: string) {
  const cleaned = value
    .replace(/^(に|へ|で|から|は)+/, '')
    .replace(/(があります|がある|ある|する|します|して)$/g, '')
    .replace(/[、。]/g, '')
    .trim();
  if (!cleaned) return '';
  if (/買い物|買う|購入/.test(cleaned)) return '買い物';
  if (/開ける|オープン/.test(cleaned)) return cleaned.includes('準備') ? 'オープン準備' : '店を開ける';
  if (/夜営業/.test(cleaned)) return '夜営業開始';
  return cleaned;
}

function extractConversationShoppingItems(text: string): ShoppingItem[] {
  if (!hasShoppingActionIntent(text) && !hasShoppingItemIntent(text)) return [];
  const items: ShoppingItem[] = [];
  const normalized = text.normalize('NFKC');
  const shoppingText = extractShoppingClause(normalized)
    .replace(/(?:(?:今日|明日|明後日|来週(?:月曜|火曜|水曜|木曜|金曜|土曜|日曜|月曜日|火曜日|水曜日|木曜日|金曜日|土曜日|日曜日)?|\d{1,2}月\d{1,2}日)\s*)?(?:午前|午後|朝|昼|夜)?\s*\d{1,2}時(?:半|[0-5]?\d分?)?(?:から|に)?/g, ' ')
    .replace(/帰りに|スーパーで|買い物で|買い物|購入|買って帰る|買って|を買う|買う/g, ' ');
  const quantityPattern = /([一-龥ぁ-んァ-ヶーA-Za-z]+?)\s*([0-9０-９]+)\s*(本|個|袋|パック|箱|枚|束|玉|丁|g|kg|グラム)/g;
  let match: RegExpExecArray | null;
  while ((match = quantityPattern.exec(shoppingText))) {
    const name = cleanShoppingEntityName(match[1]);
    if (!name || /時|買い物|予定|店|帰り|銀行|会合|LINE|電話|メール|連絡/.test(name)) continue;
    items.push({
      addedAt: new Date().toISOString(),
      category: classifyShoppingItem(name),
      completed: false,
      id: createLocalShoppingItemId(name),
      name,
      quantity: `${match[2]}${match[3]}`,
      source: 'voice',
    });
  }
  return postProcessShoppingItems(items);
}

function extractShoppingClause(text: string) {
  const match = text.match(/(?:帰りに|スーパーで|買い物で)?(.+?)(?:を)?(?:買って帰る|買って|買う|購入)/);
  return match?.[1] ?? text;
}

function cleanShoppingEntityName(value: string) {
  const parts = value
    .replace(/[、。]/g, ' ')
    .split(/と|や|,|，|\s+/)
    .map((item) => item.replace(/^(に|へ|で|を|も|は|が|帰りに|スーパーで)+/, '').trim())
    .filter(Boolean);
  return parts[parts.length - 1] ?? '';
}

function createConversationFollowUpCandidate(text: string): FollowUpDraftItem | null {
  if (!/電話|LINE|ライン|返信|折り返し|連絡|確認|メール/.test(text)) return null;
  const followUpText = extractFollowUpClause(text);
  if (!followUpText || containsShoppingEntity(followUpText)) return null;
  const item = createVoiceFollowUp(followUpText);
  if (!item) return null;
  return {
    company: item.company,
    content: item.content,
    dueDate: item.dueDate,
    duePreset: item.duePreset,
    dueTime: item.dueTime,
    id: createLocalId('conversation-follow-up'),
    kind: item.kind,
    name: item.name,
    originalPerson: item.name,
    priority: item.priority,
    source: 'voice',
    status: item.status ?? 'pending',
  };
}

function extractFollowUpClause(text: string) {
  const normalized = text.normalize('NFKC');
  const personAction = normalized.match(/([一-龥ぁ-んァ-ヶーA-Za-z]+(?:さん|くん|君|ちゃん|様)?)\s*(?:へ|に)?\s*(LINE|ライン|電話|メール|返信|折り返し|連絡|確認)(?:する|して|をする)?/);
  if (!personAction) return '';
  const person = personAction[1].trim();
  const action = personAction[2].replace(/ライン/i, 'LINE');
  return `${person}へ${action}する`;
}

function createConversationTodo(text: string) {
  const cleaned = text.replace(/^(今日は|今日|明日は|明日)/, '').trim();
  if (/銀行.*行く/.test(cleaned)) return '銀行へ行く';
  if (/買い物.*行く/.test(cleaned)) return '買い物へ行く';
  if (/(行く|確認|連絡|電話|返信)/.test(cleaned)) return cleaned;
  return '';
}

function createImmediateConversationQuestions(text: string, schedules: MorningPlan['schedule'], shoppingItems: ShoppingItem[]) {
  const questions: string[] = [];
  if (!schedules.length && /銀行.*行く/.test(text)) questions.push('銀行は何時頃ですか？');
  if (/買い物/.test(text) && shoppingItems.length === 0) questions.push('買い物内容は何ですか？');
  return questions;
}

function isConversationSaveCommand(text: string) {
  return /お願いします|お願い|保存して|保存|これでOK|これでオーケー|OK|オーケー|登録して|進めて|完了/.test(text);
}

function isConversationAffirmative(text: string) {
  return /追加して|登録して|お願い|はい|うん|OK|オーケー/.test(text);
}

function isVagueContactText(text: string) {
  return /連絡|確認/.test(text) && !/電話|LINE|ライン|返信|折り返し|メール/.test(text);
}

function isMorningAssistantQuestion(text: string) {
  return /(?:\u4f55\u304b\u3089|\u306a\u306b\u304b\u3089|\u512a\u5148|\u304a\u3059\u3059\u3081|\u30aa\u30b9\u30b9\u30e1|\u3069\u3046\u9032\u3081|\u9806\u756a|\u6700\u521d)/.test(text);
}

function isFutureConversationText(text: string) {
  return /(?:\u660e\u65e5|\u3042\u3057\u305f|\u660e\u5f8c\u65e5|\u6765\u9031|\u6765\u6708|\d{1,2}\u6708\d{1,2}\u65e5?|\u6708\u66dc|\u706b\u66dc|\u6c34\u66dc|\u6728\u66dc|\u91d1\u66dc|\u571f\u66dc|\u65e5\u66dc)/.test(text);
}

function isFutureConversationTime(time: string) {
  return isFutureConversationText(time);
}

function createAssistantSaveLines(draft: MorningReviewDraft) {
  return [
    '\u4fdd\u5b58\u524d\u78ba\u8a8d\u3067\u3059\u3002\u4e88\u5b9a\u3001\u8cb7\u3044\u7269\u3001Follow Up\u3001Google\u30ab\u30ec\u30f3\u30c0\u30fc\u5019\u88dc\u3092\u78ba\u8a8d\u3057\u3066\u304f\u3060\u3055\u3044\u3002',
    ...createAssistantSummaryLines(draft),
  ];
}

function createAssistantSummaryLines(draft: MorningReviewDraft) {
  const scheduleCount = cleanScheduleItems(draft.plan.schedule).length;
  const shoppingCount = draft.shoppingItems.length;
  const followUpCount = draft.followUpCandidates.length;
  const googleCount = createCalendarEvents(draft.plan).length;
  const priorities = createAssistantPriorityItems(draft);
  const llmSummary = draft.plan.advice.find((item) => item && item.length > 12);
  const comment = priorities.length
    ? `AI\u30b3\u30e1\u30f3\u30c8: \u4eca\u65e5\u306f${priorities.join('\u3001')}\u306e\u9806\u3067\u9032\u3081\u308b\u3068\u52b9\u7387\u7684\u3067\u3059\u3002`
    : 'AI\u30b3\u30e1\u30f3\u30c8: \u4eca\u65e5\u306e\u5019\u88dc\u3092\u4f1a\u8a71\u3067\u5c11\u3057\u305a\u3064\u6574\u3048\u307e\u3057\u3087\u3046\u3002';
  return [
    `AI要約: ${createNaturalReviewSummary(draft)}`,
    ...(llmSummary ? [`AI\u8981\u7d04: ${llmSummary}`] : []),
    `AI\u30b5\u30de\u30ea\u30fc: \u4eca\u65e5\u306e\u4e88\u5b9a ${scheduleCount}\u4ef6 / \u8cb7\u3044\u7269 ${shoppingCount}\u4ef6 / Follow Up ${followUpCount}\u4ef6 / Google\u30ab\u30ec\u30f3\u30c0\u30fc ${googleCount}\u4ef6`,
    comment,
  ];
}

function createNaturalReviewSummary(draft: MorningReviewDraft) {
  const flowItems = [
    ...cleanScheduleItems(draft.plan.schedule)
      .slice(0, 4)
      .map((item) => `${item.time ? `${item.time}に` : ''}${item.task}`.trim()),
    ...draft.shoppingItems.slice(0, 3).map((item) => `${formatShoppingItemLabel(item)}を買い物リストに入れる`),
    ...draft.followUpCandidates.slice(0, 3).map((item) => `${item.name}さんへ${formatFollowUpActionLabel(item)}する`),
  ].filter(Boolean);
  if (!flowItems.length) return '今日の流れは、まだ保存対象が少ない状態です。予定、買い物、連絡事項を話すとここにまとまります。';
  return `今日の流れは、${joinJapaneseList(flowItems)}流れです。`;
}

function formatFollowUpActionLabel(item: FollowUpDraftItem) {
  if (item.kind === 'line') return 'LINE';
  if (item.kind === 'phone') return '電話';
  if (item.kind === 'email') return 'メール';
  if (item.kind === 'sms') return 'SMS';
  return item.content || '連絡';
}

function joinJapaneseList(items: string[]) {
  if (items.length <= 1) return items[0] ?? '';
  return `${items.slice(0, -1).join('、')}、最後に${items[items.length - 1]}という`;
}

function createAssistantPrioritySuggestionLines(draft: MorningReviewDraft) {
  const recommendations = createAssistantPriorityRecommendations(draft);
  if (!recommendations.length) {
    return ['\u307e\u3060\u512a\u5148\u9806\u4f4d\u3092\u4f5c\u308c\u308b\u5019\u88dc\u304c\u5c11\u306a\u3044\u3067\u3059\u3002\u6642\u9593\u306e\u3042\u308b\u4e88\u5b9a\u3084\u9023\u7d61\u4e8b\u9805\u3092\u8a71\u3057\u3066\u304f\u3060\u3055\u3044\u3002'];
  }
  return [
    '\u73fe\u5728\u306e\u5019\u88dc\u3092\u898b\u308b\u3068\u3001\u3053\u306e3\u4ef6\u304b\u3089\u59cb\u3081\u308b\u306e\u304c\u304a\u3059\u3059\u3081\u3067\u3059\u3002',
    ...recommendations.map((item, index) => `${index + 1}. ${item.label} - ${item.reason}`),
  ];
}

function createShortPrioritySuggestionLines(draft: MorningReviewDraft) {
  const priorities = createAssistantPriorityItems(draft);
  return priorities.length ? [`\u6b21\u306b\u3084\u308b\u306a\u3089\u300c${priorities[0]}\u300d\u304b\u3089\u59cb\u3081\u308b\u306e\u304c\u304a\u3059\u3059\u3081\u3067\u3059\u3002`] : [];
}

function createProactiveSuggestionLines(kind: ProactiveSuggestionKind, draft: MorningReviewDraft, context?: unknown) {
  if (kind === 'bank') {
    const time = typeof context === 'object' && context && 'time' in context ? String((context as { time?: string }).time ?? '') : '';
    const minutes = getScheduleStartMinutes(time);
    if (minutes >= 9 * 60 && minutes <= 11 * 60 + 30) {
      return ['午前中に行くのは良い選択です。窓口や移動の余裕も取りやすい時間です。'];
    }
    return ['銀行は受付時間が限られるので、前後の予定に少し余裕を見ておくのがおすすめです。'];
  }
  if (kind === 'shopping') {
    const count = Array.isArray(context) ? context.length : draft.shoppingItems.length;
    return [`買い物候補が${count}件入りました。現在の買い物リストにまとめて確認できます。`];
  }
  if (kind === 'follow_up_due') {
    return ['期限つきのFollow Upとして優先候補へ入れておきます。忘れやすい連絡なので、早めに片付けるのがおすすめです。'];
  }
  if (kind === 'follow_up') {
    return ['期限が決まると優先順位を付けやすくなります。今日中か明日で教えてください。'];
  }
  if (kind === 'google_calendar') {
    return ['Googleカレンダー候補へ入れました。忘れないように前日通知を設定しますか？'];
  }
  return [];
}

function dedupeConversationLines(lines: string[]) {
  const seen = new Set<string>();
  return lines.filter((line) => {
    const key = normalizeTaskText(line);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function createAssistantPriorityRecommendations(draft: MorningReviewDraft) {
  return createAssistantPriorityItems(draft).map((label) => ({
    label,
    reason: getAssistantPriorityReason(label),
  }));
}

function getAssistantPriorityReason(text: string) {
  if (/(?:\u9280\u884c)/.test(text)) return '営業時間の都合で早めに動くと安心です。';
  if (/(?:\u96fb\u8a71|\u9023\u7d61|LINE|\u8fd4\u4fe1)/i.test(text)) return '相手待ちになる前に先に進めると流れが良くなります。';
  if (/(?:\u6e96\u5099|\u958b\u5e97|\u4ed5\u8fbc\u307f)/.test(text)) return '後の予定へ影響しやすい準備タスクです。';
  if (/(?:\u8cb7\u3044\u7269|\u8cfc\u5165)/.test(text)) return '時間調整しやすいので、予定の隙間にまとめると効率的です。';
  if (/(?:\u4f1a\u8b70|\u4f1a\u5408|\u6253\u3061\u5408\u308f\u305b)/.test(text)) return '時間固定の予定なので先に把握しておくと安心です。';
  return '今日の流れを作るうえで優先度が高い候補です。';
}

function createAssistantPriorityItems(draft: MorningReviewDraft) {
  const scheduleCandidates = cleanScheduleItems(draft.plan.schedule).map((item) => {
    const minutes = getScheduleStartMinutes(item.time);
    const timeWeight = Number.isFinite(minutes) && minutes < 12 * 60 ? 2 : 1;
    return { label: item.task, weight: getAssistantPriorityWeight(item.task) + timeWeight };
  });
  const todoCandidates = dedupeTodos(draft.plan.todos).map((item) => ({
    label: item,
    weight: getAssistantPriorityWeight(item),
  }));
  const followUpCandidates = draft.followUpCandidates.map((item) => {
    const label = `${item.name}\u3078${item.content}`.trim();
    const dueWeight = item.duePreset === 'today' ? 4 : item.duePreset === 'tomorrow' ? 2 : 1;
    return { label, weight: getAssistantPriorityWeight(label) + dueWeight };
  });
  const shoppingCandidates = draft.shoppingItems.length ? [{ label: '\u8cb7\u3044\u7269', weight: 2 }] : [];
  const candidates = [...scheduleCandidates, ...todoCandidates, ...followUpCandidates, ...shoppingCandidates]
    .map((item) => ({ ...item, label: item.label.replace(/^\d{1,2}:\d{2}\s*/, '').trim() }))
    .filter((item) => item.label && item.label.length <= 24);
  const seen = new Set<string>();
  return candidates
    .sort((a, b) => b.weight - a.weight)
    .filter((item) => {
      const key = normalizeTaskText(item.label);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map((item) => item.label)
    .slice(0, 3);
}

function getAssistantPriorityWeight(text: string) {
  if (/(?:\u6e96\u5099|\u9280\u884c|\u96fb\u8a71|\u9023\u7d61|\u78ba\u8a8d|\u4f1a\u8b70|\u4f1a\u5408|\u6253\u3061\u5408\u308f\u305b|\u4ed5\u8fbc\u307f|\u958b\u5e97)/.test(text)) return 5;
  if (/(?:LINE|\u8fd4\u4fe1|Follow Up)/i.test(text)) return 4;
  if (/(?:\u8cb7\u3044\u7269|\u8cfc\u5165)/.test(text)) return 2;
  if (/(?:\u8d77\u5e8a|\u9589\u5e97)/.test(text)) return 1;
  return 3;
}

function createSecretaryQuestionLines(
  text: string,
  schedules: MorningPlan['schedule'],
  shoppingItems: ShoppingItem[],
  followUpItem: FollowUpDraftItem | null,
) {
  const questions = new Set<string>();
  if (!schedules.length && /(?:\u9280\u884c).*(?:\u884c\u304f|\u884c\u304d)/.test(text)) {
    questions.add('\u9280\u884c\u3078\u306f\u4f55\u6642\u9803\u884c\u304d\u307e\u3059\u304b\uff1f');
  }
  if (/(?:\u8cb7\u3044\u7269|\u8cfc\u5165).*(?:\u884c\u304f|\u884c\u304d)?/.test(text) && shoppingItems.length === 0) {
    questions.add('\u8cb7\u3044\u7269\u306f\u4f55\u3092\u8cb7\u3044\u307e\u3059\u304b\uff1f');
  }
  if (/(?:\u4f1a\u5408|\u4f1a\u8b70|\u6253\u3061\u5408\u308f\u305b|\u6253\u5408\u305b)/.test(text) && !schedules.length) {
    questions.add('\u4f1a\u5408\u306f\u3044\u3064\u306e\u4f55\u6642\u3067\u3059\u304b\uff1f Google\u30ab\u30ec\u30f3\u30c0\u30fc\u306b\u767b\u9332\u3057\u307e\u3059\u304b\uff1f');
  }
  if (isFutureConversationText(text) && !schedules.length) {
    questions.add('\u672a\u6765\u4e88\u5b9a\u306e\u65e5\u4ed8\u3068\u6642\u9593\u3092\u78ba\u8a8d\u3057\u305f\u3044\u3067\u3059\u3002\u4f55\u65e5\u306e\u4f55\u6642\u3067\u3059\u304b\uff1f');
  }
  if (followUpItem && isVagueContactText(text)) {
    questions.add(`${followUpItem.name}\u3078\u306e\u9023\u7d61\u306f\u3001\u96fb\u8a71\u30fbLINE\u30fb\u30e1\u30fc\u30eb\u306e\u3069\u308c\u3067\u3059\u304b\uff1f`);
  }
  return Array.from(questions);
}

function createFollowUpDueQuestionLines(item: FollowUpDraftItem) {
  if (item.duePreset === 'today' || item.duePreset === 'tomorrow') return [];
  return [`${item.name}\u3078\u306e${item.content}\u306f\u4eca\u65e5\u4e2d\u3067\u3059\u304b\uff1f \u660e\u65e5\u3067\u3082\u5927\u4e08\u592b\u3067\u3059\u304b\uff1f`];
}

function applyFollowUpDueFromReply(item: FollowUpDraftItem, text: string): FollowUpDraftItem {
  if (/\u660e\u65e5|\u3042\u3057\u305f/.test(text)) {
    return {
      ...item,
      dueDate: formatDateInput(addDays(startOfLocalDay(new Date()), 1)),
      duePreset: 'tomorrow',
    };
  }
  if (/\u4eca\u65e5|\u304d\u3087\u3046|\u4e2d/.test(text)) {
    return {
      ...item,
      dueDate: formatDateInput(startOfLocalDay(new Date())),
      duePreset: 'today',
    };
  }
  return item;
}

function isFollowUpDueReply(text: string) {
  return /(?:\u4eca\u65e5\u4e2d|\u4eca\u65e5|\u304d\u3087\u3046|\u660e\u65e5|\u3042\u3057\u305f)/.test(text);
}

function updateLatestFollowUpDue(draft: MorningReviewDraft, text: string): MorningReviewDraft {
  const latestIndex = draft.followUpCandidates.length - 1;
  if (latestIndex < 0) return draft;
  return {
    ...draft,
    followUpCandidates: draft.followUpCandidates.map((item, index) =>
      index === latestIndex ? applyFollowUpDueFromReply(item, text) : item,
    ),
  };
}

function processPendingConversationIntent(
  currentDraft: MorningReviewDraft,
  text: string,
  pendingIntent: PendingConversationIntent,
): ConversationTurnResult | null {
  if (pendingIntent.type === 'bank_visit') {
    const time = parseMemoryTimeAnswer(text);
    if (!time) return null;
    const schedule = [{ time, task: pendingIntent.title }];
    const draft = {
      ...appendConversationSchedules(currentDraft, schedule, text),
      sourceText: appendVoiceText(currentDraft.sourceText, text),
    };
    return {
      assistantLines: [`了解しました。${time}に${pendingIntent.title}予定として追加しました。`, ...createProactiveSuggestionLines('bank', draft, { time })],
      draft,
      pendingIntent: null,
      pendingFollowUp: null,
      shouldOpenReview: false,
    };
  }

  if (pendingIntent.type === 'shopping') {
    const shoppingItems = extractMemoryShoppingItems(text);
    if (!shoppingItems.length) return null;
    const draft = {
      ...currentDraft,
      shoppingItems: postProcessShoppingItems([...currentDraft.shoppingItems, ...shoppingItems]),
      shoppingUpdatedAt: new Date().toISOString(),
      sourceText: appendVoiceText(currentDraft.sourceText, text),
    };
    return {
      assistantLines: [
        `了解しました。買い物候補へ${shoppingItems.map(formatShoppingItemLabel).join('、')}を追加しました。`,
        ...createProactiveSuggestionLines('shopping', draft, shoppingItems),
      ],
      draft,
      pendingIntent: null,
      pendingFollowUp: null,
      shouldOpenReview: false,
    };
  }

  if (pendingIntent.type === 'contact_method') {
    const method = parseContactMethodAnswer(text);
    if (!method) return null;
    const content = method === 'line' ? 'LINEする' : method === 'email' ? 'メールする' : '電話する';
    const item = createConversationFollowUpFromParts(pendingIntent.person, content, method);
    const draft = {
      ...appendConversationFollowUp(currentDraft, item, text),
      plan: {
        ...currentDraft.plan,
        todos: dedupeTodos([...currentDraft.plan.todos, `${pendingIntent.person}へ${content}`]),
      },
      sourceText: appendVoiceText(currentDraft.sourceText, text),
    };
    return {
      assistantLines: [
        `了解しました。${pendingIntent.person}へ${content}予定として追加しました。`,
        `${pendingIntent.person}への${content}は今日中ですか？ 明日でも大丈夫ですか？`,
        ...createProactiveSuggestionLines('follow_up', draft, item),
      ],
      draft,
      pendingIntent: { type: 'follow_up_due', item },
      pendingFollowUp: null,
      shouldOpenReview: false,
    };
  }

  if (pendingIntent.type === 'future_event') {
    const time = parseMemoryTimeAnswer(text);
    if (!time) return null;
    const schedule = [{ time: `${pendingIntent.dateText} ${time}`, task: pendingIntent.title }];
    const draft = {
      ...appendConversationSchedules(currentDraft, schedule, text),
      sourceText: appendVoiceText(currentDraft.sourceText, text),
    };
    return {
      assistantLines: [
        `了解しました。${pendingIntent.dateText}${time}の${pendingIntent.title}としてGoogleカレンダー候補へ追加しました。`,
        ...createProactiveSuggestionLines('google_calendar', draft, pendingIntent),
      ],
      draft,
      pendingIntent: null,
      pendingFollowUp: null,
      shouldOpenReview: false,
    };
  }

  if (pendingIntent.type === 'follow_up_due') {
    const draft = {
      ...updateFollowUpDueById(currentDraft, pendingIntent.item.id, text),
      sourceText: appendVoiceText(currentDraft.sourceText, text),
    };
    const item = draft.followUpCandidates.find((candidate) => candidate.id === pendingIntent.item.id) ?? pendingIntent.item;
    return {
      assistantLines: [`了解しました。${item.name}への${item.content}を${formatFollowUpDueDraft(item)}のFollow Upとして登録しました。`],
      draft,
      pendingIntent: null,
      pendingFollowUp: null,
      shouldOpenReview: false,
    };
  }

  return null;
}

function createPendingIntentFromTurn(
  text: string,
  schedules: MorningPlan['schedule'],
  shoppingItems: ShoppingItem[],
  followUpItem: FollowUpDraftItem | null,
): PendingConversationIntent | null {
  if (!schedules.length && /(?:\u9280\u884c).*(?:\u884c\u304f|\u884c\u304d)/.test(text)) {
    return { type: 'bank_visit', title: '\u9280\u884c\u3078\u884c\u304f' };
  }
  if (/(?:\u8cb7\u3044\u7269|\u8cfc\u5165).*(?:\u884c\u304f|\u884c\u304d)?/.test(text) && shoppingItems.length === 0) {
    return { type: 'shopping' };
  }
  if (!schedules.length && isFutureConversationText(text)) {
    const title = extractFutureEventTitle(text);
    const dateText = extractFutureEventDateText(text);
    return { type: 'future_event', dateText, title };
  }
  if (followUpItem && isVagueContactText(text)) {
    return { type: 'contact_method', person: followUpItem.name, originalText: text };
  }
  return null;
}

function parseMemoryTimeAnswer(text: string) {
  const normalized = text.normalize('NFKC');
  const match = normalized.match(/(?:(午前|午後|朝|昼|夜)\s*)?(\d{1,2})時(?:\s*(半|[0-5]?\d分))?|^(\d{1,2})(?::([0-5]\d))?$/);
  if (!match) return '';
  const period = match[1] ?? '';
  let hour = Number(match[2] ?? match[4]);
  const minute = match[3] === '半' ? 30 : Number((match[3] ?? '').replace('分', '') || match[5] || 0);
  if ((period === '午後' || period === '夜') && hour < 12) hour += 12;
  if (period === '朝' && hour === 12) hour = 0;
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return '';
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

function extractMemoryShoppingItems(text: string) {
  return extractConversationShoppingItems(`買い物 ${text}`);
}

function parseContactMethodAnswer(text: string): FollowUpKind | '' {
  if (/LINE|ライン/i.test(text)) return 'line';
  if (/メール|mail/i.test(text)) return 'email';
  if (/電話|TEL|tel/i.test(text)) return 'phone';
  return '';
}

function createConversationFollowUpFromParts(name: string, content: string, kind: FollowUpKind): FollowUpDraftItem {
  return {
    company: '',
    content,
    dueDate: formatDateInput(startOfLocalDay(new Date())),
    duePreset: 'today',
    id: createLocalId('conversation-follow-up'),
    kind,
    name,
    originalPerson: name,
    priority: 'medium',
    source: 'voice',
    status: 'pending',
  };
}

function extractFutureEventDateText(text: string) {
  const normalized = text.normalize('NFKC');
  const match = normalized.match(/(?:明後日|明日|あした|来週(?:月曜|火曜|水曜|木曜|金曜|土曜|日曜|月曜日|火曜日|水曜日|木曜日|金曜日|土曜日|日曜日)?|来月|\d{1,2}月\d{1,2}日?)/);
  return match?.[0] ?? '未来予定';
}

function extractFutureEventTitle(text: string) {
  const compact = text
    .normalize('NFKC')
    .replace(/(?:明後日|明日|あした|来週(?:月曜|火曜|水曜|木曜|金曜|土曜|日曜|月曜日|火曜日|水曜日|木曜日|金曜日|土曜日|日曜日)?|来月|\d{1,2}月\d{1,2}日?)/g, '')
    .replace(/(?:(午前|午後|朝|昼|夜)\s*)?\d{1,2}時(?:半|[0-5]?\d分)?/g, '')
    .replace(/[、。,\s]/g, '')
    .replace(/がある|ある|する|です/g, '')
    .trim();
  return compact || '予定';
}

function updateFollowUpDueById(draft: MorningReviewDraft, id: string, text: string): MorningReviewDraft {
  return {
    ...draft,
    followUpCandidates: draft.followUpCandidates.map((item) =>
      item.id === id ? applyFollowUpDueFromReply(item, text) : item,
    ),
  };
}

function formatFollowUpDueDraft(item: FollowUpDraftItem) {
  return item.duePreset === 'tomorrow' ? '明日' : '今日中';
}

function AiConversationPanel({ messages }: { messages: AiConversationMessage[] }) {
  return (
    <section className="ai-conversation-panel" aria-label="AI conversation">
      <div className="ai-conversation-header">
        <div>
          <span>AI Secretary</span>
          <strong>会話しながら朝を整理します</strong>
        </div>
        <MessageCircle size={20} />
      </div>
      <div className="ai-conversation-thread">
        {messages.map((message) => (
          <article className={`ai-chat-bubble is-${message.role}`} key={message.id}>
            {message.title && <strong>{message.title}</strong>}
            {message.lines.map((line, index) => (
              <p key={`${message.id}-${index}`}>{line}</p>
            ))}
          </article>
        ))}
      </div>
    </section>
  );
}

function AssistantRuntimeDebugPanel({ debug }: { debug: AssistantRuntimeDebug }) {
  return (
    <details className="follow-up-debug-details">
      <summary>Assistant Debug</summary>
      <small>Assistant Mode: {debug.mode}</small>
      <small>OpenAI Model: {debug.model || 'not checked'}</small>
      <small>Tool Calls: {debug.toolCalls.length ? debug.toolCalls.join(', ') : 'none'}</small>
      <small>Raw Tool Calls Count: {debug.rawToolCallsCount}</small>
      <small>Actions Count: {debug.actionsCount}</small>
      <small>JSON Parse Success: {debug.jsonParseSuccess ? 'true' : 'false'}</small>
      <small>Draft Auto Generated: {debug.draftAutoGenerated ? 'true' : 'false'}</small>
      <small>Draft Item Count: {debug.draftItemCount}</small>
      <small>Pending Save: {debug.pendingSave ? 'true' : 'false'}</small>
      <small>Assistant Lines Count: {debug.assistantLinesCount}</small>
      <small>Extracted Count: {debug.extractedCount}</small>
      <small>Schedule Count: {debug.scheduleCount}</small>
      <small>Shopping Count: {debug.shoppingCount}</small>
      <small>Follow Up Count: {debug.followUpCount}</small>
      <small>Calendar Count: {debug.calendarCount}</small>
      <small>Priority Suggestions Count: {debug.prioritySuggestionsCount}</small>
      <small>Lost Entity Count: {debug.lostEntityCount}</small>
      <small>Follow Up Reject Reason: {debug.followUpRejectReasons.length ? debug.followUpRejectReasons.join(' / ') : 'none'}</small>
      <small>Calendar Reject Reason: {debug.calendarRejectReasons.length ? debug.calendarRejectReasons.join(' / ') : 'none'}</small>
      <small>Last Actions: {debug.lastActions.length ? debug.lastActions.join(', ') : 'none'}</small>
      <small>Last Assistant Response: {debug.lastAssistantResponse || 'none'}</small>
      <small>Last LLM JSON: {debug.lastLlmJson || 'none'}</small>
      <small>Extracted Schedule Items: {debug.extractedScheduleItems.length ? debug.extractedScheduleItems.join(', ') : 'none'}</small>
      <small>Extracted Shopping Items: {debug.extractedShoppingItems.length ? debug.extractedShoppingItems.join(', ') : 'none'}</small>
      <small>Extracted Follow Up Items: {debug.extractedFollowUpItems.length ? debug.extractedFollowUpItems.join(', ') : 'none'}</small>
      <small>Extracted Calendar Candidates: {debug.extractedCalendarCandidates.length ? debug.extractedCalendarCandidates.join(', ') : 'none'}</small>
      <small>Last User Intent: {debug.lastUserIntent || 'none'}</small>
      <small>Last Assistant Action: {debug.lastAssistantAction || 'none'}</small>
      <small>Needs Clarification: {debug.needsClarification ? 'true' : 'false'}</small>
      <small>Clarifying Question: {debug.clarifyingQuestion || 'none'}</small>
      <small>Parse Error: {debug.parseError || 'none'}</small>
      <small>Fallback Error: {debug.fallbackError || 'none'}</small>
      <small>Updated: {debug.updatedAt || 'not checked'}</small>
      <small>Error: {debug.error || 'none'}</small>
    </details>
  );
}

function DeveloperDebugDialog({
  assistantDebug,
  onClose,
  userIsolationDebug,
  voiceDebug,
}: {
  assistantDebug: AssistantRuntimeDebug;
  onClose: () => void;
  userIsolationDebug: UserIsolationDebug;
  voiceDebug: VoiceRecognitionDebug;
}) {
  return (
    <div className="confirm-dialog-backdrop developer-debug-backdrop" role="presentation">
      <section className="confirm-dialog developer-debug-dialog" role="dialog" aria-modal="true" aria-label="Developer Debug">
        <div className="developer-debug-header">
          <div>
            <span>Developer Debug</span>
            <h2>Assistant Runtime</h2>
          </div>
          <button className="icon-ghost-button" onClick={onClose} type="button" aria-label="Developer Debugを閉じる">
            <X size={18} />
          </button>
        </div>

        <div className="developer-debug-grid">
          <DebugMetric label="Assistant Mode" value={assistantDebug.mode} />
          <DebugMetric label="Assistant Lines Count" value={assistantDebug.assistantLinesCount} />
          <DebugMetric label="Raw Tool Calls Count" value={assistantDebug.rawToolCallsCount} />
          <DebugMetric label="Actions Count" value={assistantDebug.actionsCount} />
          <DebugMetric label="JSON Parse Success" value={assistantDebug.jsonParseSuccess ? 'true' : 'false'} />
          <DebugMetric label="Draft Auto Generated" value={assistantDebug.draftAutoGenerated ? 'true' : 'false'} />
          <DebugMetric label="Draft Item Count" value={assistantDebug.draftItemCount} />
          <DebugMetric label="Pending Save" value={assistantDebug.pendingSave ? 'true' : 'false'} />
          <DebugMetric label="Extracted Count" value={assistantDebug.extractedCount} />
          <DebugMetric label="Schedule Count" value={assistantDebug.scheduleCount} />
          <DebugMetric label="Shopping Count" value={assistantDebug.shoppingCount} />
          <DebugMetric label="Follow Up Count" value={assistantDebug.followUpCount} />
          <DebugMetric label="Calendar Count" value={assistantDebug.calendarCount} />
          <DebugMetric label="Priority Suggestions Count" value={assistantDebug.prioritySuggestionsCount} />
          <DebugMetric label="Lost Entity Count" value={assistantDebug.lostEntityCount} />
          <DebugMetric label="Follow Up Reject Reason" value={assistantDebug.followUpRejectReasons.length ? assistantDebug.followUpRejectReasons.join(' / ') : 'none'} />
          <DebugMetric label="Calendar Reject Reason" value={assistantDebug.calendarRejectReasons.length ? assistantDebug.calendarRejectReasons.join(' / ') : 'none'} />
          <DebugMetric label="Fallback Error" value={assistantDebug.fallbackError || 'none'} />
          <DebugMetric label="Voice Status" value={voiceDebug.status} />
          <DebugMetric label="Current User Email" value={userIsolationDebug.currentUserEmail || 'none'} />
          <DebugMetric label="Current User ID" value={userIsolationDebug.currentUserId || 'none'} />
          <DebugMetric label="Shopping Items Fetched" value={userIsolationDebug.shoppingFetchedCount} />
          <DebugMetric label="Auth Change State Reset" value={userIsolationDebug.authChangeStateReset ? 'true' : 'false'} />
        </div>

        <section className="developer-debug-section">
          <span>Last Actions</span>
          <p>{assistantDebug.lastActions.length ? assistantDebug.lastActions.join(', ') : 'none'}</p>
        </section>

        <section className="developer-debug-section">
          <span>Last Assistant Response</span>
          <p>{assistantDebug.lastAssistantResponse || 'none'}</p>
        </section>

        <section className="developer-debug-section">
          <span>Last LLM JSON</span>
          <p>{assistantDebug.lastLlmJson || 'none'}</p>
        </section>

        <section className="developer-debug-section">
          <span>Review Draft</span>
          <p>Draft Auto Generated: {assistantDebug.draftAutoGenerated ? 'true' : 'false'}</p>
          <p>Draft Item Count: {assistantDebug.draftItemCount}</p>
          <p>Pending Save: {assistantDebug.pendingSave ? 'true' : 'false'}</p>
        </section>

        <section className="developer-debug-section">
          <span>Clarification</span>
          <p>Needs Clarification: {assistantDebug.needsClarification ? 'true' : 'false'}</p>
          <p>Question: {assistantDebug.clarifyingQuestion || 'none'}</p>
          <p>Parse Error: {assistantDebug.parseError || 'none'}</p>
        </section>

        <section className="developer-debug-section">
          <span>Extracted Entities</span>
          <p>Schedule: {assistantDebug.extractedScheduleItems.length ? assistantDebug.extractedScheduleItems.join(', ') : 'none'}</p>
          <p>Shopping: {assistantDebug.extractedShoppingItems.length ? assistantDebug.extractedShoppingItems.join(', ') : 'none'}</p>
          <p>Follow Up: {assistantDebug.extractedFollowUpItems.length ? assistantDebug.extractedFollowUpItems.join(', ') : 'none'}</p>
          <p>Calendar: {assistantDebug.extractedCalendarCandidates.length ? assistantDebug.extractedCalendarCandidates.join(', ') : 'none'}</p>
        </section>

        <section className="developer-debug-section">
          <span>User Isolation</span>
          <p>Current User Email: {userIsolationDebug.currentUserEmail || 'none'}</p>
          <p>Current User ID: {userIsolationDebug.currentUserId || 'none'}</p>
          <p>Shopping Items Fetched: {userIsolationDebug.shoppingFetchedCount}</p>
          <p>LocalStorage Shopping Keys: {userIsolationDebug.localStorageShoppingKeys.length ? userIsolationDebug.localStorageShoppingKeys.join(', ') : 'none'}</p>
          <p>Logout Cleared Keys: {userIsolationDebug.logoutClearedKeys.length ? userIsolationDebug.logoutClearedKeys.join(', ') : 'none'}</p>
          <p>Auth Change State Reset: {userIsolationDebug.authChangeStateReset ? 'true' : 'false'}</p>
          <p>Reset At: {userIsolationDebug.resetAt || 'not checked'}</p>
        </section>

        <button className="secondary-button" onClick={onClose} type="button">
          閉じる
        </button>
      </section>
    </div>
  );
}

function DebugMetric({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="developer-debug-metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function VoiceRecognitionDebugPanel({ debug }: { debug: VoiceRecognitionDebug }) {
  return (
    <details className="follow-up-debug-details">
      <summary>Voice Recognition Debug</summary>
      <small>Status: {debug.status}</small>
      <small>Last Event: {debug.lastEvent}</small>
      <small>Restart Count: {debug.restartCount}</small>
      <small>Updated: {debug.updatedAt || 'not checked'}</small>
      <small>Error: {debug.error || 'none'}</small>
    </details>
  );
}

function createAiConversationMessages({
  draft,
  isListening,
  isOrganizing,
  plan,
  sourceText,
}: {
  draft: MorningReviewDraft | null;
  isListening: boolean;
  isOrganizing: boolean;
  plan: MorningPlan | null;
  sourceText: string;
}): AiConversationMessage[] {
  const messages: AiConversationMessage[] = [
    {
      id: 'assistant-welcome',
      role: 'assistant',
      title: 'おはようございます',
      lines: ['今日の予定、買い物、連絡、未来の予定をまとめて話してください。', '不足があれば、保存前に確認します。'],
    },
  ];

  if (sourceText) {
    messages.push({
      id: 'user-source',
      role: 'user',
      title: 'あなた',
      lines: [sourceText],
    });
  }

  if (isListening) {
    messages.push({
      id: 'assistant-listening',
      role: 'assistant',
      title: '聞き取り中',
      lines: ['そのまま自然に話してください。カテゴリは選ばなくて大丈夫です。'],
    });
  } else if (isOrganizing) {
    messages.push({
      id: 'assistant-organizing',
      role: 'assistant',
      title: '整理中',
      lines: ['予定、買い物、Follow Up、Googleカレンダー候補に分けています。'],
    });
  } else if (draft) {
    messages.push(createConversationReviewMessage(draft));
    const questions = createConversationQuestions(draft);
    if (questions.length) {
      messages.push({
        id: 'assistant-questions',
        role: 'assistant',
        title: '確認したいこと',
        lines: questions,
      });
    }
  } else if (plan) {
    const scheduleCount = cleanScheduleItems(plan.schedule).length;
    const todoCount = dedupeTodos(plan.todos).length;
    messages.push({
      id: 'assistant-saved',
      role: 'assistant',
      title: '保存済み',
      lines: [`今日のやること ${todoCount}件、予定 ${scheduleCount}件として整理済みです。`],
    });
  }

  return messages;
}

function createConversationReviewMessage(draft: MorningReviewDraft): AiConversationMessage {
  const calendarEvents = createCalendarEvents(draft.plan);
  const futureEvents = calendarEvents.filter((event) => !isSameLocalDate(event.start, new Date()));
  const scheduleLines = cleanScheduleItems(draft.plan.schedule).slice(0, 5).map((item) => `・${item.time} ${item.task}`);
  const shoppingLines = draft.shoppingItems.slice(0, 5).map((item) => `・${formatShoppingItemLabel(item)}`);
  const followUpLines = draft.followUpCandidates.slice(0, 4).map((item) => `・${item.name} ${item.content}`.trim());
  const calendarLines = calendarEvents
    .slice(0, 4)
    .map((event) => `・${event.start.toLocaleDateString('ja-JP')} ${formatScheduleDisplayTime(event.sourceTime, event.start)} ${event.title}`);
  return {
    id: 'assistant-review',
    role: 'assistant',
    title: 'AIがこう整理しました',
    lines: [
      `今日のやること: ${dedupeTodos(draft.plan.todos).length}件`,
      `今日の予定: ${cleanScheduleItems(draft.plan.schedule).length}件`,
      ...scheduleLines,
      `買い物: ${draft.shoppingItems.length}件`,
      ...shoppingLines,
      `Follow Up候補: ${draft.followUpCandidates.length}件`,
      ...followUpLines,
      `Googleカレンダー候補: ${calendarEvents.length}件${futureEvents.length ? `（未来予定 ${futureEvents.length}件）` : ''}`,
      ...calendarLines,
      '下の確認カードで内容を見てから保存できます。',
    ],
  };
}

function createConversationQuestions(draft: MorningReviewDraft): string[] {
  const questions: string[] = [];
  const todos = dedupeTodos(draft.plan.todos);
  const scheduleTitles = cleanScheduleItems(draft.plan.schedule).map((item) => normalizeTaskText(item.task));
  const unscheduled = todos
    .filter((todo) => !scheduleTitles.includes(normalizeTaskText(todo)))
    .filter((todo) => /銀行|会議|会合|病院|打合せ|打ち合わせ|面談|予約|店|仕入れ|電話|連絡|確認/.test(todo))
    .slice(0, 2);

  unscheduled.forEach((todo) => {
    questions.push(`「${todo}」は時間が未定です。必要なら何時頃か追加で話してください。`);
  });

  draft.followUpCandidates.slice(0, 2).forEach((item) => {
    const followLabel = `${item.name} ${item.content}`.trim();
    if (/連絡|確認/.test(item.content) && !/電話|LINE|返信|折り返し|メール/.test(item.content)) {
      questions.push(`「${followLabel}」は電話、LINE、返信のどれで対応しますか？`);
    } else {
      questions.push(`「${followLabel}」をFollow Upに追加しますか？保存前に確認できます。`);
    }
  });

  if ((hasShoppingItemIntent(draft.sourceText) || hasShoppingActionIntent(draft.sourceText)) && draft.shoppingItems.length === 0) {
    questions.push('買い物内容がまだ分かりません。買うものを追加で話してください。');
  }

  const futureEvents = createCalendarEvents(draft.plan).filter((event) => !isSameLocalDate(event.start, new Date()));
  if (futureEvents.length) {
    questions.push(`未来予定 ${futureEvents.length}件をGoogleカレンダー登録候補にしました。`);
  }

  return Array.from(new Set(questions)).slice(0, 4);
}

function MorningReviewCard({
  aiInboxCount,
  draft,
  onCancel,
  onConfirm,
  onDraftChange,
}: {
  aiInboxCount: number;
  draft: MorningReviewDraft;
  onCancel: () => void;
  onConfirm: () => void;
  onDraftChange: React.Dispatch<React.SetStateAction<MorningReviewDraft | null>>;
}) {
  const dashboardData = createMorningDashboardData(draft.plan, draft.shoppingItems, [], []);
  const scheduleItems = cleanScheduleItems(draft.plan.schedule);
  const todoItems = dedupeTodos(draft.plan.todos);
  const shoppingPreview = draft.shoppingItems.slice(0, 8);
  const followUpPreview = draft.followUpCandidates.slice(0, 5);
  const googleCalendarPreview = createCalendarEvents(draft.plan).slice(0, 6);
  const assistantRecommendations = createAssistantPriorityRecommendations(draft);
  const updateDraft = (updater: (current: MorningReviewDraft) => MorningReviewDraft) => {
    onDraftChange((current) => (current ? updater(current) : current));
  };

  return (
    <section className="morning-review-card" aria-label="AI整理結果確認">
      <div className="morning-review-header">
        <div>
          <span>Review Before Save</span>
          <strong>AIがこう整理しました</strong>
        </div>
        <small>保存前に内容を確認できます</small>
      </div>

      <div className="morning-review-section">
        <span>AIサマリー</span>
        {createAssistantSummaryLines(draft).map((line) => (
          <p key={line}>{line}</p>
        ))}
      </div>

      <div className="morning-review-section">
        <span>今日のおすすめ順</span>
        {assistantRecommendations.length ? (
          <ol>
            {assistantRecommendations.map((item) => (
              <li key={item.label}>
                <strong>{item.label}</strong>
                <small>{item.reason}</small>
              </li>
            ))}
          </ol>
        ) : (
          <p>まだおすすめ順を作れる候補がありません</p>
        )}
      </div>

      <div className="morning-review-section">
        <span>今日の最重要3件</span>
        {dashboardData.topPriority.length ? (
          <ol>
            {dashboardData.topPriority.map((item) => (
              <li key={item.id}>{item.label}</li>
            ))}
          </ol>
        ) : (
          <p>まだありません</p>
        )}
      </div>

      <div className="morning-review-grid">
        <MorningReviewList
          title="今日のやること"
          items={todoItems}
          onSave={(items) =>
            updateDraft((current) => ({
              ...current,
              plan: { ...current.plan, todos: dedupeTodos(items) },
            }))
          }
        />
        <MorningReviewList
          title="今日のスケジュール"
          items={scheduleItems.map((item) => `${item.time} ${item.task}`)}
          onSave={(items) =>
            updateDraft((current) => ({
              ...current,
              plan: {
                ...current.plan,
                schedule: cleanScheduleItems(items.map(parseMorningReviewScheduleText)),
              },
            }))
          }
        />
        <MorningReviewList
          title="買い物リスト"
          items={shoppingPreview.map(formatShoppingItemLabel)}
          onSave={(items) =>
            updateDraft((current) => ({
              ...current,
              shoppingItems: postProcessShoppingItems(current.shoppingItems.map((item) => {
                const previewIndex = shoppingPreview.findIndex((previewItem) => previewItem.id === item.id);
                const editedText = previewIndex >= 0 ? items[previewIndex] : '';
                if (!editedText) return item;
                const parsed = parseShoppingItemInput(editedText);
                return {
                  ...item,
                  name: parsed.name || item.name,
                  quantity: parsed.quantity,
                  category: classifyShoppingItem(parsed.name || item.name),
                };
              }), current.sourceText),
            }))
          }
        />
        <MorningReviewList
          title="Follow Up候補"
          items={followUpPreview.map((item) => `${item.name} ${item.content}`.trim())}
          onSave={(items) =>
            updateDraft((current) => ({
              ...current,
              followUpCandidates: current.followUpCandidates.map((item) => {
                const previewIndex = followUpPreview.findIndex((previewItem) => previewItem.id === item.id);
                const editedText = previewIndex >= 0 ? items[previewIndex] : '';
                const nextItem = editedText ? createVoiceFollowUp(editedText) : null;
                return nextItem
                  ? {
                      ...item,
                      name: nextItem.name,
                      content: nextItem.content,
                      dueDate: nextItem.dueDate,
                      duePreset: nextItem.duePreset,
                      kind: nextItem.kind,
                      priority: nextItem.priority,
                      status: nextItem.status,
                    }
                  : item;
              }),
            }))
          }
        />
        <MorningReviewList
          title="Googleカレンダー候補"
          items={googleCalendarPreview.map((event) => `${event.start.toLocaleDateString('ja-JP')} ${formatScheduleDisplayTime(event.sourceTime, event.start)} ${event.title}`)}
        />
      </div>

      <div className="morning-review-actions">
        <button className="secondary-button" onClick={onCancel} type="button">
          戻って修正
        </button>
        <button className="primary-button" onClick={onConfirm} type="button">
          保存して今日をスタート
        </button>
      </div>
    </section>
  );
}

function parseMorningReviewScheduleText(text: string): MorningPlan['schedule'][number] {
  const trimmed = text.trim();
  const match = trimmed.match(/^([0-2]?\d(?::[0-5]\d)?|[0-2]?\d時(?:半)?)(?:\s+|　+)?(.+)$/);
  if (!match) return { time: '', task: trimmed };
  return {
    time: match[1],
    task: match[2].trim(),
  };
}

function MorningReviewList({ items, onSave, title }: { items: string[]; onSave?: (items: string[]) => void; title: string }) {
  const [isEditing, setIsEditing] = React.useState(false);
  const [draftItems, setDraftItems] = React.useState(items);
  React.useEffect(() => {
    if (!isEditing) setDraftItems(items);
  }, [isEditing, items]);
  const visibleItems = items.map((item) => item.trim()).filter(Boolean);
  return (
    <section className={`morning-review-list ${isEditing ? 'is-editing' : ''}`}>
      <div className="morning-review-list-header">
        <span>{title}</span>
        {onSave ? (
          isEditing ? (
            <div>
              <button
                className="review-mini-button"
                onClick={() => {
                  setDraftItems(items);
                  setIsEditing(false);
                }}
                type="button"
              >
                キャンセル
              </button>
              <button
                className="review-mini-button is-primary"
                onClick={() => {
                  onSave(draftItems.map((item) => item.trim()).filter(Boolean));
                  setIsEditing(false);
                }}
                type="button"
              >
                保存
              </button>
            </div>
          ) : (
            <button className="review-mini-button" onClick={() => setIsEditing(true)} type="button">
              <Pencil size={13} />
              編集
            </button>
          )
        ) : null}
      </div>
      {isEditing ? (
        <div className="review-edit-stack">
          {draftItems.map((item, index) => (
            <div className="review-edit-grid" key={`${title}-edit-${index}`}>
              <label className="review-edit-field review-edit-wide">
                <small>タイトル / メモ</small>
                <input
                  value={item}
                  onChange={(event) =>
                    setDraftItems((current) => current.map((value, itemIndex) => (itemIndex === index ? event.target.value : value)))
                  }
                />
              </label>
              <label className="review-edit-field">
                <small>カテゴリ</small>
                <input readOnly value={title} />
              </label>
            </div>
          ))}
        </div>
      ) : visibleItems.length ? (
        <ul>
          {visibleItems.map((item, index) => (
            <li key={`${title}-${index}-${item}`}>{item}</li>
          ))}
        </ul>
      ) : (
        <p>まだありません</p>
      )}
    </section>
  );
}

function MorningStepGuide() {
  return (
    <section className="morning-step-guide" aria-label="使い方ステップ">
      <div>
        <span>STEP 1</span>
        <strong>今日の予定を話す</strong>
      </div>
      <div>
        <span>STEP 2</span>
        <strong>AI整理</strong>
      </div>
      <div>
        <span>STEP 3</span>
        <strong>今日をスタート</strong>
      </div>
    </section>
  );
}

function AuthStatusBar({ email, onLogout, onSettings }: { email?: string; onLogout: () => void; onSettings: () => void }) {
  return (
    <div className="auth-status-bar">
      <span>ログイン中 {email || 'User'}</span>
      <div className="auth-status-actions">
        <button onClick={onSettings} type="button">
          設定
        </button>
        <button onClick={onLogout} type="button">
          ログアウト
        </button>
      </div>
    </div>
  );
}

function SettingsPage({
  onboardingPreference,
  onBack,
  onOpenGuide,
  onPreferenceChange,
}: {
  onboardingPreference: OnboardingPreference;
  onBack: () => void;
  onOpenGuide: () => void;
  onPreferenceChange: (preference: OnboardingPreference) => void;
}) {
  const [isDeveloperMode, setIsDeveloperMode] = React.useState(() => isDeveloperModeEnabled());
  const [developerPasscode, setDeveloperPasscode] = React.useState('');
  const [developerMessage, setDeveloperMessage] = React.useState('');

  const unlockDeveloperMode = () => {
    if (developerPasscode !== developerModePasscode) {
      localStorage.removeItem(developerModeStorageKey);
      setIsDeveloperMode(false);
      setDeveloperMessage('パスコードが違います。');
      return;
    }
    localStorage.setItem(developerModeStorageKey, 'true');
    setIsDeveloperMode(true);
    setDeveloperPasscode('');
    setDeveloperMessage('Developer ModeをONにしました。ホーム右上のキラキラからDebugを開けます。');
  };

  const lockDeveloperMode = () => {
    localStorage.removeItem(developerModeStorageKey);
    setIsDeveloperMode(false);
    setDeveloperPasscode('');
    setDeveloperMessage('Developer ModeをOFFにしました。');
  };

  return (
    <section className="hero-panel settings-page" aria-label="設定">
      <div className="top-bar">
        <div>
          <p className="eyebrow">MORNING FLOW AI <span>{appVersion}</span></p>
          <h1>設定</h1>
          <p className="hero-subtitle">Guide Preferences</p>
        </div>
        <div className="brand-mark" aria-hidden="true">
          <Sparkles size={21} />
        </div>
      </div>

      <section className="settings-card">
        <div>
          <span className="settings-label">使い方ガイド</span>
          <strong>初回ガイドの表示設定</strong>
        </div>
        <button className="organize-button" onClick={onOpenGuide} type="button">
          使い方ガイドを見る
        </button>
        <div className="settings-options" role="radiogroup" aria-label="初回ガイド表示設定">
          <label>
            <input
              checked={onboardingPreference === 'always_show'}
              name="onboardingPreference"
              onChange={() => onPreferenceChange('always_show')}
              type="radio"
            />
            初回ガイドを毎回表示する
          </label>
          <label>
            <input
              checked={onboardingPreference === 'first_time_only'}
              name="onboardingPreference"
              onChange={() => onPreferenceChange('first_time_only')}
              type="radio"
            />
            初回だけ表示する
          </label>
          <label>
            <input
              checked={onboardingPreference === 'disabled'}
              name="onboardingPreference"
              onChange={() => onPreferenceChange('disabled')}
              type="radio"
            />
            初回ガイドを表示しない
          </label>
        </div>
      </section>

      <section className="settings-card">
        <div>
          <span className="settings-label">Developer Mode</span>
          <strong>{isDeveloperMode ? 'ON' : 'OFF'}</strong>
        </div>
        {isDeveloperMode ? (
          <button className="secondary-action-button" onClick={lockDeveloperMode} type="button">
            Developer ModeをOFF
          </button>
        ) : (
          <div className="developer-mode-form">
            <label>
              パスコード
              <input
                autoComplete="off"
                inputMode="numeric"
                onChange={(event) => {
                  setDeveloperPasscode(event.target.value);
                  setDeveloperMessage('');
                }}
                type="password"
                value={developerPasscode}
              />
            </label>
            <button className="organize-button" onClick={unlockDeveloperMode} type="button">
              Developer ModeをON
            </button>
          </div>
        )}
        {developerMessage && <p className="settings-help-text">{developerMessage}</p>}
      </section>

      <button className="secondary-button" onClick={onBack} type="button">
        <Home size={18} />
        ホームへ戻る
      </button>
    </section>
  );
}

function OnboardingGuideDialog({
  onClose,
  onFinish,
}: {
  onClose: () => void;
  onFinish: (preference: OnboardingPreference) => void;
}) {
  return (
    <div className="confirm-dialog-backdrop onboarding-backdrop" role="presentation">
      <section className="confirm-dialog onboarding-dialog" role="dialog" aria-modal="true" aria-label="使い方ガイド">
        <div className="confirm-dialog-icon" aria-hidden="true">
          <Sparkles size={23} />
        </div>
        <h2>使い方ガイド</h2>
        <div className="onboarding-guide-list">
          <p>1. ホームでは今日の予定を話して整理できます。</p>
          <p>2. 買い物リストでは買う物だけを話すと、その場で分解して保存します。</p>
          <p>3. Follow Upでは電話・LINE・返信などを話すと、保存前に確認できます。</p>
          <p>4. 迷った内容や複数カテゴリが混ざる内容は AI Inbox に集めて整理できます。</p>
        </div>
        <div className="confirm-dialog-actions onboarding-actions">
          <button className="secondary-button" onClick={() => onFinish('disabled')} type="button">
            次回から表示しない
          </button>
          <button className="primary-button" onClick={() => onFinish('always_show')} type="button">
            毎回表示する
          </button>
        </div>
        <button className="secondary-button" onClick={onClose} type="button">
          今の設定のまま閉じる
        </button>
      </section>
    </div>
  );
}

function FollowUpManagerPage({
  completedCount,
  dueTodayCount,
  followUpSplitDebug,
  followUpLastSyncedAt,
  followUpSupabaseDebug,
  followUpSyncError,
  followUpSyncStatus,
  isClearConfirmOpen,
  isListening,
  isSupported,
  items,
  onAdd,
  onBack,
  onCancelClear,
  onClear,
  onClearRequest,
  onComplete,
  onDelete,
  onCancelReview,
  onDeleteReviewItem,
  onEdit,
  onOrganizeCapture,
  onReopen,
  onSaveReview,
  onSyncNow,
  onStartListening,
  onStopListening,
  onTextChange,
  onUpdateReviewItem,
  pendingCount,
  resultText,
  reviewItems,
}: {
  completedCount: number;
  dueTodayCount: number;
  followUpSplitDebug: FollowUpSplitDebug | null;
  followUpLastSyncedAt: string | null;
  followUpSupabaseDebug: FollowUpSupabaseDebug;
  followUpSyncError: string;
  followUpSyncStatus: 'local' | 'syncing' | 'synced' | 'error';
  isClearConfirmOpen: boolean;
  isListening: boolean;
  isSupported: boolean;
  items: FollowUpItem[];
  onAdd: (item: Omit<FollowUpItem, 'completed' | 'completedAt' | 'createdAt' | 'id'>) => Promise<boolean>;
  onBack: () => void;
  onCancelClear: () => void;
  onClear: () => void;
  onClearRequest: () => void;
  onComplete: (itemId: string) => void;
  onDelete: (itemId: string) => void;
  onCancelReview: () => void;
  onDeleteReviewItem: (itemId: string) => void;
  onEdit: (itemId: string) => void;
  onOrganizeCapture: () => number;
  onReopen: (itemId: string) => void;
  onSaveReview: () => Promise<number>;
  onSyncNow: () => Promise<void>;
  onStartListening: () => void;
  onStopListening: () => void;
  onTextChange: (text: string) => void;
  onUpdateReviewItem: (itemId: string, updates: Partial<FollowUpDraftItem>) => void;
  pendingCount: number;
  resultText: string;
  reviewItems: FollowUpDraftItem[];
}) {
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [name, setName] = React.useState('');
  const [company, setCompany] = React.useState('');
  const [content, setContent] = React.useState('');
  const [priority, setPriority] = React.useState<FollowUpPriority>('medium');
  const [duePreset, setDuePreset] = React.useState<FollowUpDuePreset>('today');
  const [customDate, setCustomDate] = React.useState(formatDateInput(new Date()));
  const [dueTime, setDueTime] = React.useState('');
  const [kind, setKind] = React.useState<FollowUpKind>('phone');
  const [captureMessage, setCaptureMessage] = React.useState('');
  const [isDebugOpen, setIsDebugOpen] = React.useState(false);
  const textareaRef = React.useRef<HTMLTextAreaElement | null>(null);

  const suggestion = React.useMemo(() => suggestFollowUp(content), [content]);
  const pendingItems = React.useMemo(() => sortFollowUps(items.filter((item) => !item.completed)), [items]);
  const completedItems = React.useMemo(() => sortCompletedFollowUps(items.filter((item) => item.completed)), [items]);

  React.useEffect(() => {
    if (!content.trim()) return;
    setPriority((current) => (current === 'medium' ? suggestion.priority : current));
    setKind((current) => (current === 'phone' ? suggestion.kind : current));
  }, [content, suggestion.kind, suggestion.priority]);

  React.useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = 'auto';
    textarea.style.height = `${textarea.scrollHeight}px`;
  }, [resultText]);

  const resetForm = () => {
    setName('');
    setCompany('');
    setContent('');
    setPriority('medium');
    setDuePreset('today');
    setCustomDate(formatDateInput(new Date()));
    setDueTime('');
    setKind('phone');
  };

  const submitFollowUp = () => {
    if (!name.trim() || !content.trim()) return;
    void onAdd({
      name: name.trim(),
      company: company.trim() || undefined,
      content: content.trim(),
      dueDate: resolveFollowUpDueDate(duePreset, customDate),
      duePreset,
      dueTime: dueTime || undefined,
      kind,
      priority,
    });
    resetForm();
    setIsFormOpen(false);
  };

  const organizeCapture = () => {
    const count = onOrganizeCapture();
    setCaptureMessage(count ? `${count}件のフォロー候補を作成しました。確認してから保存してください。` : 'フォローとして整理できる内容が見つかりませんでした。');
  };

  const saveReviewItems = async () => {
    const count = await onSaveReview();
    setCaptureMessage(count ? `${count}件のフォローを保存しました。` : '保存できるフォロー候補がありません。');
  };

  return (
    <section className="hero-panel follow-up-page" aria-label="FOLLOW UP MANAGER">
      <div className="top-bar">
        <button className="icon-ghost-button" onClick={onBack} type="button" aria-label="戻る">
          <Home size={20} />
        </button>
        <div>
          <p className="eyebrow">MORNING FLOW AI <span>{appVersion}</span></p>
          <h1>FOLLOW UP MANAGER</h1>
        </div>
        <button className="icon-ghost-button" onClick={() => setIsFormOpen((current) => !current)} type="button" aria-label="追加">
          <Plus size={21} />
        </button>
      </div>

      <div className="follow-up-summary">
        <div>
          <span>未返信</span>
          <strong>{pendingCount}件</strong>
        </div>
        <div>
          <span>今日期限</span>
          <strong>{dueTodayCount}件</strong>
        </div>
        <div>
          <span>完了履歴</span>
          <strong>{completedCount}件</strong>
        </div>
      </div>

      <div className={`follow-up-sync-status ${followUpSyncStatus}`}>
        <div className="follow-up-sync-main">
          <div>
            <span>{getFollowUpSyncStatusLabel(followUpSyncStatus)}</span>
            <small>{followUpLastSyncedAt ? `最終同期 ${formatFollowUpSyncTime(followUpLastSyncedAt)}` : '最終同期 まだありません'}</small>
          </div>
          <button className="secondary-button" disabled={followUpSyncStatus === 'syncing'} onClick={() => void onSyncNow()} type="button">
            今すぐ同期
          </button>
        </div>
        {followUpSyncError && <small className="follow-up-sync-error">{followUpSyncError}</small>}
        <details className="follow-up-debug-details" open={isDebugOpen} onToggle={(event) => setIsDebugOpen(event.currentTarget.open)}>
          <summary>Supabase Debug</summary>
          <small>Supabase URL: {followUpSupabaseDebug.hasUrl ? followUpSupabaseDebug.urlHost : 'not configured'}</small>
          <small>Anon Key: {followUpSupabaseDebug.hasAnonKey ? 'configured' : 'not configured'}</small>
          <small>Last Operation: {followUpSupabaseDebug.lastOperation || 'not checked'}</small>
          <small>Auth Mode: {followUpSupabaseDebug.authMode || 'not checked'}</small>
          <small>Token Status: {followUpSupabaseDebug.tokenStatus || 'not checked'}</small>
          <small>Current User ID: {followUpSupabaseDebug.userId || 'not checked'}</small>
          <small>Payload User ID: {followUpSupabaseDebug.payloadUserId || 'not checked'}</small>
          <small>Response: {followUpSupabaseDebug.responseStatus || 'not received'}</small>
          <small>Rows: {typeof followUpSupabaseDebug.rowCount === 'number' ? followUpSupabaseDebug.rowCount : 'not checked'}</small>
          <small>Payload: {followUpSupabaseDebug.payloadPreview || 'not checked'}</small>
          <small>Body: {followUpSupabaseDebug.bodyPreview || 'not received'}</small>
          <small>Error: {followUpSupabaseDebug.error || 'none'}</small>
        </details>
      </div>

      <div className="focus-area follow-up-capture">
        <div className={`voice-stage ${isListening ? 'is-listening' : ''}`}>
          <div className="waveform" aria-hidden="true">
            {Array.from({ length: 17 }).map((_, index) => (
              <span key={index} style={{ animationDelay: `${index * 72}ms` }} />
            ))}
          </div>

          <button
            aria-label={isListening ? '音声入力を止める' : 'フォローアップを音声入力する'}
            className={`mic-button ${isListening ? 'is-listening' : ''}`}
            disabled={!isSupported}
            onClick={isListening ? onStopListening : onStartListening}
            type="button"
          >
            <span className="pulse-ring ring-one" aria-hidden="true" />
            <span className="pulse-ring ring-two" aria-hidden="true" />
            <span className="mic-glass" aria-hidden="true" />
            {isListening ? <Square size={38} fill="currentColor" /> : <Mic size={56} />}
          </button>
        </div>

        <div className="status-row" role="status" aria-live="polite">
          <span className={`status-dot ${isListening ? 'active' : ''}`} />
          {isListening ? '音声認識中' : 'フォロー内容を話して整理できます'}
        </div>
      </div>

      <VoiceInputGuide
        examples={[
          '高橋さんに電話を返す',
          '小田原さんに見積もり依頼',
          '柴田君にLINE返信',
        ]}
      />

      <section className="editor-card follow-up-capture-card" aria-label="フォローアップ音声入力">
        <div className="editor-header">
          <span>FOLLOW UP CAPTURE</span>
          <strong>AIで整理する前に編集できます</strong>
        </div>
        <textarea
          aria-label="フォローアップ内容を編集"
          className="transcript-editor"
          onChange={(event) => {
            onTextChange(event.target.value);
            setCaptureMessage('');
          }}
          placeholder="例：山田さんに見積もりの返事を確認する。金曜日までに連絡する。"
          ref={textareaRef}
          rows={4}
          value={resultText}
        />
        <div className="editor-actions">
          <button className="secondary-button" disabled={!resultText.trim()} onClick={onClearRequest} type="button">
            全文削除
          </button>
          <button className="primary-button" disabled={!resultText.trim()} onClick={organizeCapture} type="button">
            フォローを整理する
          </button>
        </div>
        {isClearConfirmOpen && (
          <section className="inline-confirm-card transcript-clear-confirm" aria-label="フォロー入力削除確認">
            <strong>入力をすべて削除しますか？</strong>
            <p>入力欄の文章と音声入力中の一時テキストを削除します。</p>
            <div className="confirm-dialog-actions">
              <button className="secondary-button" type="button" onClick={onCancelClear}>
                キャンセル
              </button>
              <button
                className="danger-button"
                type="button"
                onClick={() => {
                  onClear();
                  setCaptureMessage('');
                }}
              >
                削除する
              </button>
            </div>
          </section>
        )}
        {captureMessage && <p className="follow-up-suggestion">{captureMessage}</p>}
        {followUpSplitDebug && (
          <div className="follow-up-debug-card">
            <span>Follow Up Debug</span>
            <small>検出人物数: {followUpSplitDebug.personCount}</small>
            <small>生成案件数: {followUpSplitDebug.generatedItemCount}</small>
            <small>重複除外件数: {followUpSplitDebug.duplicateExcludedCount}</small>
            <small>再評価: {followUpSplitDebug.reevaluated ? 'あり' : 'なし'}</small>
            <small>方式: {followUpSplitDebug.strategy}</small>
            <small>元テキスト: {followUpSplitDebug.originalText}</small>
            <small>分割後テキスト: {followUpSplitDebug.splitTexts.join(' / ') || '-'}</small>
            <small>人物: {followUpSplitDebug.persons.join(', ') || '-'}</small>
            <small>
              Original Person: {followUpSplitDebug.personExtractions.map((item) => item.originalPerson).join(', ') || '-'}
            </small>
            <small>
              Extracted Person: {followUpSplitDebug.personExtractions.map((item) => item.extractedPerson).join(', ') || '-'}
            </small>
            <small>
              除外理由: {followUpSplitDebug.excludedReasons.join(' / ') || (followUpSplitDebug.duplicateExcludedCount ? '重複を除外しました' : '重複除外なし')}
            </small>
          </div>
        )}
      </section>

      {reviewItems.length > 0 && (
        <FollowUpReviewPanel
          items={reviewItems}
          onCancel={() => {
            onCancelReview();
            setCaptureMessage('');
          }}
          onDelete={onDeleteReviewItem}
          onSave={saveReviewItems}
          onUpdate={onUpdateReviewItem}
        />
      )}

      {isFormOpen && (
        <section className="follow-up-form" aria-label="未返信・折り返し登録">
          <label>
            名前
            <input value={name} onChange={(event) => setName(event.target.value)} placeholder="山田さん" />
          </label>
          <label>
            会社名 任意
            <input value={company} onChange={(event) => setCompany(event.target.value)} placeholder="○○会社" />
          </label>
          <label>
            内容
            <textarea value={content} onChange={(event) => setContent(event.target.value)} placeholder="折り返し電話、LINE返信など" rows={3} />
          </label>

          <div className="follow-up-grid">
            <label>
              優先度
              <select value={priority} onChange={(event) => setPriority(event.target.value as FollowUpPriority)}>
                <option value="high">高</option>
                <option value="medium">中</option>
                <option value="low">低</option>
              </select>
            </label>
            <label>
              種別
              <select value={kind} onChange={(event) => setKind(event.target.value as FollowUpKind)}>
                <option value="phone">電話</option>
                <option value="line">LINE</option>
                <option value="email">メール</option>
                <option value="sms">SMS</option>
                <option value="other">その他</option>
              </select>
            </label>
          </div>

          <div className="follow-up-grid">
            <label>
              期限
              <select value={duePreset} onChange={(event) => setDuePreset(event.target.value as FollowUpDuePreset)}>
                <option value="today">今日</option>
                <option value="tomorrow">明日</option>
                <option value="thisWeek">今週</option>
                <option value="custom">日付指定</option>
              </select>
            </label>
            <label>
              時刻 任意
              <input type="time" value={dueTime} onChange={(event) => setDueTime(event.target.value)} />
            </label>
          </div>

          {duePreset === 'custom' && (
            <label>
              日付
              <input type="date" value={customDate} onChange={(event) => setCustomDate(event.target.value)} />
            </label>
          )}

          <p className="follow-up-suggestion">
            AI候補: 優先度 {followUpPriorityLabel(suggestion.priority)} / 種別 {followUpKindLabel(suggestion.kind)}
          </p>

          <button className="organize-button" disabled={!name.trim() || !content.trim()} onClick={submitFollowUp} type="button">
            <Plus size={19} />
            登録する
          </button>
        </section>
      )}

      <FollowUpList items={pendingItems} mode="pending" onComplete={onComplete} onDelete={onDelete} onEdit={onEdit} onReopen={onReopen} />
      <FollowUpList items={completedItems} mode="completed" onComplete={onComplete} onDelete={onDelete} onEdit={onEdit} onReopen={onReopen} />
    </section>
  );
}

function FeedbackBoxPage({
  analyticsUserId,
  isListening,
  isSupported,
  onBack,
  onStartListening,
  onStopListening,
  onTextChange,
  resultText,
  text,
}: {
  analyticsUserId: string;
  isListening: boolean;
  isSupported: boolean;
  onBack: () => void;
  onStartListening: () => void;
  onStopListening: () => void;
  onTextChange: (text: string) => void;
  resultText: string;
  text: string;
}) {
  const [senderName, setSenderName] = React.useState('');
  const [feedbackType, setFeedbackType] = React.useState<FeedbackType>('improvement');
  const [summary, setSummary] = React.useState<FeedbackSummary>(() => createFeedbackSummary('', 'improvement'));
  const [editableBody, setEditableBody] = React.useState('');

  const summarize = () => {
    const nextSummary = createFeedbackSummary(text, feedbackType);
    setSummary(nextSummary);
    setEditableBody(formatFeedbackEmailBody(nextSummary, text, senderName));
  };

  const sendFeedback = () => {
    const nextSummary = editableBody ? summary : createFeedbackSummary(text, feedbackType);
    const body = editableBody || formatFeedbackEmailBody(nextSummary, text, senderName);
    trackAnalyticsEvent(analyticsUserId, 'feedback_sent', 'feedback');
    window.location.href = createFeedbackMailto(body);
  };

  return (
    <section className="hero-panel feedback-page" aria-label="FEEDBACK BOX">
      <div className="top-bar">
        <button className="icon-ghost-button" onClick={onBack} type="button" aria-label="戻る">
          <Home size={20} />
        </button>
        <div>
          <p className="eyebrow">MORNING FLOW AI <span>{appVersion}</span></p>
          <h1>FEEDBACK BOX</h1>
        </div>
        <div className="brand-mark" aria-hidden="true">
          <Mail size={21} />
        </div>
      </div>

      <p className="feedback-warning">
        {'\u3053\u306e\u5185\u5bb9\u306f\u958b\u767a\u8005\u306b\u9001\u4fe1\u3055\u308c\u307e\u3059\u3002\u500b\u4eba\u60c5\u5831\u3084\u30d1\u30b9\u30ef\u30fc\u30c9\u306a\u3069\u306f\u5165\u529b\u3057\u306a\u3044\u3067\u304f\u3060\u3055\u3044\u3002'}
      </p>

      <div className="feedback-mic">
        <button
          className={`mic-button ${isListening ? 'is-listening' : ''}`}
          disabled={!isSupported}
          onClick={isListening ? onStopListening : onStartListening}
          type="button"
        >
          {isListening ? <Square size={32} fill="currentColor" /> : <Mic size={44} />}
        </button>
      </div>

      <section className="feedback-form" aria-label="ご意見・改善要望">
        <label>
          {'\u540d\u524d \u4efb\u610f'}
          <input value={senderName} onChange={(event) => setSenderName(event.target.value)} placeholder="未入力でも送信できます" />
        </label>
        <label>
          {'\u7a2e\u985e'}
          <select value={feedbackType} onChange={(event) => setFeedbackType(event.target.value as FeedbackType)}>
            <option value="usability">使いにくかったところ</option>
            <option value="improvement">改善してほしいところ</option>
            <option value="bug">不具合報告</option>
            <option value="feature">追加してほしい機能</option>
            <option value="other">その他</option>
          </select>
        </label>
        <label>
          {'\u30d5\u30a3\u30fc\u30c9\u30d0\u30c3\u30af\u5185\u5bb9'}
          <textarea
            onChange={(event) => onTextChange(event.target.value)}
            placeholder="使いにくかった点、改善要望、不具合などを入力してください。"
            rows={6}
            value={resultText}
          />
        </label>
        <button className="organize-button" disabled={!text.trim()} onClick={summarize} type="button">
          <Brain size={19} />
          AI要約
        </button>
      </section>

      <section className="feedback-result" aria-label="要約結果">
        <div className="feedback-result-grid">
          <label>
            {'\u8981\u7d04'}
            <textarea value={summary.summary} onChange={(event) => setSummary((current) => ({ ...current, summary: event.target.value }))} rows={3} />
          </label>
          <label>
            {'\u8a73\u7d30'}
            <textarea value={summary.detail} onChange={(event) => setSummary((current) => ({ ...current, detail: event.target.value }))} rows={5} />
          </label>
        </div>
        <div className="follow-up-grid">
          <label>
            {'\u7a2e\u985e'}
            <select value={summary.type} onChange={(event) => setSummary((current) => ({ ...current, type: event.target.value as FeedbackType }))}>
              <option value="usability">使いにくかったところ</option>
              <option value="improvement">改善してほしいところ</option>
              <option value="bug">不具合報告</option>
              <option value="feature">追加してほしい機能</option>
              <option value="other">その他</option>
            </select>
          </label>
          <label>
            {'\u7dca\u6025\u5ea6'}
            <select value={summary.urgency} onChange={(event) => setSummary((current) => ({ ...current, urgency: event.target.value as FeedbackUrgency }))}>
              <option value="high">高</option>
              <option value="medium">中</option>
              <option value="low">低</option>
            </select>
          </label>
        </div>
        <label>
          {'\u9001\u4fe1\u524d\u306b\u7de8\u96c6\u3067\u304d\u308b\u30e1\u30fc\u30eb\u672c\u6587'}
          <textarea
            onChange={(event) => setEditableBody(event.target.value)}
            rows={8}
            value={editableBody || formatFeedbackEmailBody(summary, text, senderName)}
          />
        </label>
        <button className="calendar-register-button" disabled={!text.trim()} onClick={sendFeedback} type="button">
          <Mail size={18} />
          送信メールを開く
        </button>
      </section>
    </section>
  );
}

function AnalyticsDashboardPage({ onBack, userId }: { onBack: () => void; userId: string }) {
  const [summary, setSummary] = React.useState<AnalyticsSummary | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [testResult, setTestResult] = React.useState<AnalyticsSendResult | null>(null);
  const [debugLog, setDebugLog] = React.useState<AnalyticsDebugEntry[]>(() => readAnalyticsDebugLog());
  const [isTesting, setIsTesting] = React.useState(false);
  const [isDeveloperMode, setIsDeveloperMode] = React.useState(() => isDeveloperModeEnabled());
  const [isPasscodeOpen, setIsPasscodeOpen] = React.useState(false);
  const [passcode, setPasscode] = React.useState('');
  const [passcodeError, setPasscodeError] = React.useState('');
  const endpoint = getAnalyticsEndpoint();

  const reloadSummary = React.useCallback(() => {
    if (!isDeveloperMode) return;
    setIsLoading(true);
    fetchAnalyticsSummary()
      .then(setSummary)
      .finally(() => setIsLoading(false));
  }, [isDeveloperMode]);

  React.useEffect(() => {
    reloadSummary();
  }, [reloadSummary]);

  const unlockDeveloperMode = () => {
    if (passcode !== developerModePasscode) {
      localStorage.removeItem(developerModeStorageKey);
      setIsDeveloperMode(false);
      setPasscodeError('パスコードが違います。');
      return;
    }

    localStorage.setItem(developerModeStorageKey, 'true');
    setIsDeveloperMode(true);
    setIsPasscodeOpen(false);
    setPasscode('');
    setPasscodeError('');
  };

  const lockDeveloperMode = () => {
    localStorage.removeItem(developerModeStorageKey);
    setIsDeveloperMode(false);
    setSummary(null);
    setTestResult(null);
    setDebugLog([]);
    setPasscode('');
    setPasscodeError('');
  };

  const runAnalyticsTest = async () => {
    setIsTesting(true);
    const result = await sendAnalyticsEvent(userId, 'test', 'manual_test');
    setTestResult(result);
    setDebugLog(readAnalyticsDebugLog());
    window.setTimeout(reloadSummary, 1200);
    setIsTesting(false);
  };

  const runFetchPostTest = async () => {
    setIsTesting(true);
    const result = await sendAnalyticsFetchDebug(userId);
    setTestResult(result);
    setDebugLog(readAnalyticsDebugLog());
    window.setTimeout(reloadSummary, 1200);
    setIsTesting(false);
  };

  const runForceWriteTest = async () => {
    setIsTesting(true);
    const result = await forceAnalyticsGetWrite(userId);
    setTestResult(result);
    setDebugLog(readAnalyticsDebugLog());
    window.setTimeout(reloadSummary, 1200);
    setIsTesting(false);
  };

  return (
    <section className="hero-panel analytics-page" aria-label="Analytics Lite">
      <div className="top-bar">
        <button className="icon-ghost-button" onClick={onBack} type="button" aria-label="戻る">
          <Home size={20} />
        </button>
        <div>
          <p className="eyebrow">MORNING FLOW AI <span>{appVersion}</span></p>
          <h1>{'\u5229\u7528\u72b6\u6cc1'}</h1>
        </div>
        <div className="brand-mark" aria-hidden="true">
          <ListChecks size={21} />
        </div>
      </div>

      <p className="analytics-privacy">
        {'\u5229\u7528\u72b6\u6cc1\u5411\u4e0a\u306e\u305f\u3081\u3001\u533f\u540d\u306e\u5229\u7528\u7d71\u8a08\u3092\u53ce\u96c6\u3057\u3066\u3044\u307e\u3059\u3002\u500b\u4eba\u60c5\u5831\u3084\u5165\u529b\u5185\u5bb9\u306f\u9001\u4fe1\u3055\u308c\u307e\u305b\u3093\u3002'}
      </p>

      {!isDeveloperMode && (
        <section className="analytics-card developer-mode-card">
          {!isPasscodeOpen ? (
            <button className="secondary-action-button" onClick={() => setIsPasscodeOpen(true)} type="button">
              開発者モード
            </button>
          ) : (
            <div className="developer-mode-form">
              <label>
                パスコード
                <input
                  autoComplete="off"
                  inputMode="numeric"
                  onChange={(event) => {
                    setPasscode(event.target.value);
                    setPasscodeError('');
                  }}
                  type="password"
                  value={passcode}
                />
              </label>
              {passcodeError && <p className="developer-mode-error">{passcodeError}</p>}
              <div className="developer-mode-actions">
                <button className="calendar-register-button" onClick={unlockDeveloperMode} type="button">
                  開く
                </button>
                <button className="secondary-action-button" onClick={() => setIsPasscodeOpen(false)} type="button">
                  戻る
                </button>
              </div>
            </div>
          )}
        </section>
      )}

      {isDeveloperMode && (
        <>
      <div className="analytics-grid">
        <AnalyticsMetric label={'\u7dcf\u5229\u7528\u8005\u6570'} value={summary?.totalUsers ?? '-'} />
        <AnalyticsMetric label={'\u672c\u65e5\u5229\u7528\u8005\u6570'} value={summary?.todayUsers ?? '-'} />
        <AnalyticsMetric label={'\u7dcf\u8d77\u52d5\u56de\u6570'} value={summary?.totalOpens ?? '-'} />
      </div>

      <section className="analytics-card">
        <div className="follow-up-list-header">
          <span>{'\u4eba\u6c17\u6a5f\u80fd\u30e9\u30f3\u30ad\u30f3\u30b0'}</span>
          <strong>{isLoading ? 'Loading' : endpoint ? 'Apps Script' : '未設定'}</strong>
        </div>
        {summary?.popularFeatures?.length ? (
          <ol className="analytics-ranking">
            {summary.popularFeatures.map((item) => (
              <li key={item.feature}>
                <span>{formatAnalyticsFeatureLabel(item.feature)}</span>
                <strong>{item.count}</strong>
              </li>
            ))}
          </ol>
        ) : (
          <p className="follow-up-empty">
            {endpoint
              ? '\u96c6\u8a08\u30c7\u30fc\u30bf\u3092\u53d6\u5f97\u3067\u304d\u306a\u3044\u5834\u5408\u306f\u3001Google Apps Script\u306eGET\u5fdc\u7b54\u3092\u78ba\u8a8d\u3057\u3066\u304f\u3060\u3055\u3044\u3002'
              : 'VITE_ANALYTICS_ENDPOINT\u3092\u8a2d\u5b9a\u3059\u308b\u3068Google Apps Script\u3078\u9001\u4fe1\u3057\u307e\u3059\u3002'}
          </p>
        )}
      </section>

      <section className="analytics-card">
        <span className="muted-category">Anonymous userId</span>
        <strong>{userId}</strong>
      </section>

      <section className="analytics-card">
        <div className="follow-up-list-header">
          <span>Analytics Test</span>
          <strong>{endpoint ? 'Ready' : 'No endpoint'}</strong>
        </div>
        <button className="calendar-register-button" disabled={isTesting} onClick={runAnalyticsTest} type="button">
          {isTesting ? <Loader2 className="spin" size={18} /> : <RefreshCw size={18} />}
          Analytics Test
        </button>
        <button className="secondary-action-button" disabled={isTesting} onClick={runFetchPostTest} type="button">
          Fetch POST Test
        </button>
        <button className="secondary-action-button" disabled={isTesting} onClick={runForceWriteTest} type="button">
          Force Row Test
        </button>
        <p className="follow-up-empty">
          {endpoint
            ? `Endpoint: ${maskAnalyticsEndpoint(endpoint)}`
            : 'VITE_ANALYTICS_ENDPOINT is not configured in this build.'}
        </p>
        {testResult && (
          <div className={`analytics-debug-result ${testResult.ok ? 'success' : 'error'}`}>
            <strong>{testResult.ok ? '送信リクエスト完了' : '送信失敗'}</strong>
            <span>{testResult.message}</span>
            {testResult.payload && (
              <small>
                {testResult.payload.eventType} / {testResult.payload.feature} / {testResult.payload.version}
              </small>
            )}
            {testResult.transport && <small>transport: {testResult.transport}</small>}
          </div>
        )}
      </section>

      <section className="analytics-card">
        <div className="follow-up-list-header">
          <span>送信ログ</span>
          <strong>{debugLog.length}件</strong>
        </div>
        {debugLog.length ? (
          <div className="analytics-debug-list">
            {debugLog.map((entry) => (
              <div className={`analytics-debug-row ${entry.ok ? 'success' : 'error'}`} key={entry.id}>
                <span>{entry.at}</span>
                <strong>
                  {entry.eventType} / {entry.feature}
                </strong>
                <small>{entry.message}</small>
              </div>
            ))}
          </div>
        ) : (
          <p className="follow-up-empty">まだ送信ログはありません。</p>
        )}
      </section>
      <section className="analytics-card developer-mode-card">
        <button className="secondary-action-button" onClick={lockDeveloperMode} type="button">
          開発者モード解除
        </button>
      </section>
        </>
      )}
    </section>
  );
}

function AnalyticsMetric({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="analytics-card">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function AiInboxPage({
  followUpSupabaseDebug,
  followUpSyncError,
  items,
  message,
  onBack,
  onCategoryChange,
  onDelete,
  onOrganize,
  onReopen,
}: {
  followUpSupabaseDebug: FollowUpSupabaseDebug;
  followUpSyncError: string;
  items: AiInboxItem[];
  message: string;
  onBack: () => void;
  onCategoryChange: (itemId: string, category: AiInboxCategory) => void;
  onDelete: (itemId: string) => void;
  onOrganize: (itemId: string) => void;
  onReopen: (itemId: string) => void;
}) {
  const unprocessedItems = items.filter((item) => item.status === 'unprocessed');
  const organizedItems = items.filter((item) => item.status === 'organized');

  return (
    <section className="hero-panel ai-inbox-page" aria-label="AI Inbox">
      <div className="top-bar">
        <button className="icon-ghost-button" onClick={onBack} type="button" aria-label="戻る">
          <Home size={20} />
        </button>
        <div>
          <p className="eyebrow">MORNING FLOW AI <span>{appVersion}</span></p>
          <h1>AI Inbox</h1>
          <p className="hero-subtitle">Capture first. Organize next.</p>
        </div>
        <div className="brand-mark" aria-hidden="true">
          <ListChecks size={21} />
        </div>
      </div>

      <div className="follow-up-summary ai-inbox-summary">
        <div>
          <span>未整理</span>
          <strong>{unprocessedItems.length}件</strong>
        </div>
        <div>
          <span>整理済み</span>
          <strong>{organizedItems.length}件</strong>
        </div>
      </div>

      <p className="ai-inbox-lead">音声入力はまずここに保存されます。分類候補を確認してから整理してください。</p>
      {message && <p className="follow-up-suggestion">{message}</p>}
      {(followUpSyncError || followUpSupabaseDebug.lastOperation.includes('insert')) && (
        <section className="follow-up-sync-status error">
          <span>Follow Up Save Debug</span>
          {followUpSyncError && <small className="follow-up-sync-error">{followUpSyncError}</small>}
          <small>Auth Mode: {followUpSupabaseDebug.authMode || 'not checked'}</small>
          <small>Token Status: {followUpSupabaseDebug.tokenStatus || 'not checked'}</small>
          <small>Current User ID: {followUpSupabaseDebug.userId || 'not checked'}</small>
          <small>Payload User ID: {followUpSupabaseDebug.payloadUserId || 'not checked'}</small>
          <small>Response: {followUpSupabaseDebug.responseStatus || 'not received'}</small>
          <small>Body: {followUpSupabaseDebug.bodyPreview || 'not received'}</small>
          <small>Error: {followUpSupabaseDebug.error || 'none'}</small>
          <small>Payload: {followUpSupabaseDebug.payloadPreview || 'not checked'}</small>
        </section>
      )}

      <AiInboxSection
        emptyText="未整理のInboxはありません。"
        items={unprocessedItems}
        onCategoryChange={onCategoryChange}
        onDelete={onDelete}
        onOrganize={onOrganize}
        onReopen={onReopen}
        title="未整理"
      />
      <AiInboxSection
        emptyText="整理済みのInboxはありません。"
        items={organizedItems}
        onCategoryChange={onCategoryChange}
        onDelete={onDelete}
        onOrganize={onOrganize}
        onReopen={onReopen}
        title="整理済み"
      />
    </section>
  );
}

function AiInboxSection({
  emptyText,
  items,
  onCategoryChange,
  onDelete,
  onOrganize,
  onReopen,
  title,
}: {
  emptyText: string;
  items: AiInboxItem[];
  onCategoryChange: (itemId: string, category: AiInboxCategory) => void;
  onDelete: (itemId: string) => void;
  onOrganize: (itemId: string) => void;
  onReopen: (itemId: string) => void;
  title: string;
}) {
  return (
    <section className="ai-inbox-section">
      <div className="follow-up-list-header">
        <span>{title}</span>
        <small>{items.length}件</small>
      </div>
      {items.length ? (
        <div className="ai-inbox-list">
          {items.map((item) => (
            <article className={`ai-inbox-item ${item.status}`} key={item.id}>
              <div>
                <span className="ai-inbox-category">{aiInboxCategoryLabel(item.category)}</span>
                <span className="ai-inbox-confidence">{formatAiInboxConfidence(item.confidence)}</span>
                <small>{formatAiInboxCreatedAt(item.createdAt)} / {item.status === 'organized' ? '整理済み' : '未整理'}</small>
              </div>
              <p>{item.text}</p>
              <label>
                分類候補
                <select value={item.category} onChange={(event) => onCategoryChange(item.id, event.target.value as AiInboxCategory)}>
                  {aiInboxCategoryOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <div className="ai-inbox-actions">
                {item.status === 'organized' ? (
                  <button className="secondary-button" onClick={() => onReopen(item.id)} type="button">
                    未整理へ戻す
                  </button>
                ) : (
                  <button className="organize-button" onClick={() => onOrganize(item.id)} type="button">
                    <Brain size={18} />
                    AIで整理する
                  </button>
                )}
                <button className="danger-button" onClick={() => onDelete(item.id)} type="button">
                  削除
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <p className="purpose-text">{emptyText}</p>
      )}
    </section>
  );
}

function FollowUpList({
  items,
  mode,
  onComplete,
  onDelete,
  onEdit,
  onReopen,
}: {
  items: FollowUpItem[];
  mode: 'pending' | 'completed';
  onComplete: (itemId: string) => void;
  onDelete: (itemId: string) => void;
  onEdit: (itemId: string) => void;
  onReopen: (itemId: string) => void;
}) {
  return (
    <section className="follow-up-list" aria-label={mode === 'pending' ? '未対応一覧' : '完了一覧'}>
      <div className="follow-up-list-header">
        <span>{mode === 'pending' ? '未対応' : '完了履歴'}</span>
        <strong>{items.length}件</strong>
      </div>

      {items.length ? (
        items.map((item) => (
          <article className={`follow-up-item priority-${item.priority}`} key={item.id}>
            <div className="follow-up-item-top">
              <span className="follow-up-priority">【{followUpPriorityLabel(item.priority)}】</span>
              <span className="follow-up-kind">{followUpKindLabel(item.kind)}</span>
            </div>
            <strong>{formatFollowUpTitle(item)}</strong>
            {item.company && <small>{item.company}</small>}
            <p>{item.content}</p>
            <div className="follow-up-meta">
              <Clock size={15} />
              <span>期限 {formatFollowUpDue(item)}</span>
            </div>
            <div className="follow-up-meta">
              <CheckCircle2 size={15} />
              <span>状態 {followUpStatusLabel(item)}</span>
            </div>
            {mode === 'completed' && (
              <div className="follow-up-meta follow-up-completed-meta">
                <CheckCircle2 size={15} />
                <span>完了 {formatFollowUpCompletedAt(item)}</span>
              </div>
            )}
            <div className="follow-up-actions">
              {mode === 'pending' ? (
                <button onClick={() => onComplete(item.id)} type="button">
                  <CheckCircle2 size={16} />
                  完了
                </button>
              ) : (
                <button onClick={() => onReopen(item.id)} type="button">
                  未対応に戻す
                </button>
              )}
              <button onClick={() => onEdit(item.id)} type="button">
                <Pencil size={16} />
                編集
              </button>
              <button className="danger-button" onClick={() => onDelete(item.id)} type="button">
                <Trash2 size={16} />
                削除
              </button>
            </div>
          </article>
        ))
      ) : (
        <p className="follow-up-empty">{mode === 'pending' ? '未対応の連絡はありません。' : '完了履歴はまだありません。'}</p>
      )}
    </section>
  );
}

function VoiceInputGuide({ examples }: { examples: string[] }) {
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <section className={`voice-guide-card ${isOpen ? 'is-open' : ''}`} aria-label="話し方の例">
      <button
        aria-expanded={isOpen}
        className="voice-guide-toggle"
        onClick={() => setIsOpen((current) => !current)}
        type="button"
      >
        <span>
          <Lightbulb size={17} />
          話し方の例を見る
        </span>
        <ChevronRight className="voice-guide-chevron" size={18} />
      </button>
      {isOpen && (
        <ul className="voice-guide-list">
          {examples.map((example) => (
            <li key={example}>{example}</li>
          ))}
        </ul>
      )}
    </section>
  );
}

function MorningFollowUpCandidatePanel({
  items,
  onCancel,
  onSave,
}: {
  items: FollowUpDraftItem[];
  onCancel: () => void;
  onSave: () => void;
}) {
  return (
    <section className="morning-follow-up-candidates" aria-label="未返信・折り返し追加確認">
      <div className="follow-up-review-header">
        <div>
          <span>FOLLOW UP CANDIDATES</span>
          <strong>未返信・折り返しにも追加しますか？</strong>
        </div>
        <small>{items.length}件</small>
      </div>
      <div className="morning-follow-up-candidate-list">
        {items.map((item) => (
          <article className="morning-follow-up-candidate" key={item.id}>
            <strong>{item.name}</strong>
            <span>{item.content}</span>
            <small>{followUpKindLabel(item.kind)} / {followUpPriorityLabel(item.priority)}</small>
          </article>
        ))}
      </div>
      <div className="follow-up-review-actions">
        <button className="secondary-button" onClick={onCancel} type="button">
          追加しない
        </button>
        <button className="organize-button" onClick={onSave} type="button">
          <CheckCircle2 size={19} />
          追加する
        </button>
      </div>
    </section>
  );
}

function FollowUpReviewPanel({
  items,
  onCancel,
  onDelete,
  onSave,
  onUpdate,
}: {
  items: FollowUpDraftItem[];
  onCancel: () => void;
  onDelete: (itemId: string) => void;
  onSave: () => void;
  onUpdate: (itemId: string, updates: Partial<FollowUpDraftItem>) => void;
}) {
  return (
    <section className="follow-up-review-panel" aria-label="フォロー候補確認">
      <div className="follow-up-review-header">
        <div>
          <span>FOLLOW UP REVIEW</span>
          <strong>保存前に確認できます</strong>
        </div>
        <small>{items.length}件</small>
      </div>

      <div className="follow-up-review-list">
        {items.map((item, index) => (
          <article className="follow-up-review-item" key={item.id}>
            <div className="follow-up-review-item-header">
              <span>候補 {index + 1}</span>
              <button className="shopping-icon-button shopping-delete-button" onClick={() => onDelete(item.id)} type="button" aria-label="候補を削除">
                <Trash2 size={16} />
              </button>
            </div>

            <label>
              相手
              <input value={item.name} onChange={(event) => onUpdate(item.id, { name: event.target.value })} />
            </label>
            {item.originalPerson && (
              <small className="follow-up-review-person-check">
                Original Person: {item.originalPerson} / Extracted Person: {item.name}
                {!item.originalPerson.includes(item.name) ? ' / 人物名を確認してください' : ''}
              </small>
            )}
            <label>
              内容
              <textarea value={item.content} onChange={(event) => onUpdate(item.id, { content: event.target.value })} rows={2} />
            </label>

            <div className="follow-up-grid">
              <label>
                種別
                <select value={item.kind} onChange={(event) => onUpdate(item.id, { kind: event.target.value as FollowUpKind })}>
                  <option value="phone">電話</option>
                  <option value="line">LINE</option>
                  <option value="email">メール</option>
                  <option value="sms">SMS</option>
                  <option value="other">その他</option>
                </select>
              </label>
              <label>
                状態
                <select value={item.status ?? 'pending'} onChange={(event) => onUpdate(item.id, { status: event.target.value as FollowUpStatus })}>
                  <option value="pending">未対応</option>
                  <option value="contacted">連絡済</option>
                  <option value="waiting">返信待ち</option>
                  <option value="done">完了</option>
                </select>
              </label>
            </div>

            <div className="follow-up-grid">
              <label>
                期限
                <input type="date" value={item.dueDate} onChange={(event) => onUpdate(item.id, { dueDate: event.target.value, duePreset: 'custom' })} />
              </label>
              <label>
                時刻 任意
                <input type="time" value={item.dueTime ?? ''} onChange={(event) => onUpdate(item.id, { dueTime: event.target.value || undefined })} />
              </label>
            </div>
          </article>
        ))}
      </div>

      <div className="follow-up-review-actions">
        <button className="secondary-button" onClick={onCancel} type="button">
          キャンセル
        </button>
        <button className="organize-button" onClick={onSave} type="button">
          <CheckCircle2 size={19} />
          この内容で保存
        </button>
      </div>
    </section>
  );
}

function ShoppingListPage({
  canOrganize,
  error,
  highlightedIds,
  isListening,
  isOrganizing,
  isResetDialogOpen,
  isSupported,
  items,
  mealCandidates,
  mealDebug,
  mealPlanText,
  mealServings,
  mode,
  onAddMealCandidates,
  onBack,
  onCancelReset,
  onChangeMealServings,
  onClearInput,
  onDeleteMealCandidate,
  onEditMealCandidate,
  onGenerateMealCandidates,
  onNewList,
  onOpenMealMode,
  onOpenShoppingMode,
  onOrganize,
  onReset,
  onResetRequest,
  onStartListening,
  onStopListening,
  shoppingSyncError,
  shoppingSyncStatus,
  shoppingSupabaseDebug,
  onDeleteItem,
  onEditItem,
  onShare,
  onToggleShareItem,
  onTextChange,
  onToggleItem,
  resultText,
  savedText,
  selectedShareIds,
  shareMessage,
  text,
  updatedAt,
}: {
  canOrganize: boolean;
  error: string;
  highlightedIds: string[];
  isListening: boolean;
  isOrganizing: boolean;
  isResetDialogOpen: boolean;
  isSupported: boolean;
  items: ShoppingItem[];
  mealCandidates: MealIngredientCandidate[];
  mealDebug: MealPlanDebug | null;
  mealPlanText: string;
  mealServings: number;
  mode: ShoppingCaptureMode;
  onAddMealCandidates: () => void;
  onBack: () => void;
  onCancelReset: () => void;
  onChangeMealServings: (servings: number) => void;
  onClearInput: () => void;
  onDeleteMealCandidate: (candidateId: string) => void;
  onEditMealCandidate: (candidateId: string) => void;
  onGenerateMealCandidates: () => void;
  onNewList: () => void;
  onOpenMealMode: () => void;
  onOpenShoppingMode: () => void;
  onOrganize: () => void;
  onReset: () => void;
  onResetRequest: () => void;
  onStartListening: () => void;
  onStopListening: () => void;
  shoppingSyncError: string;
  shoppingSyncStatus: 'local' | 'syncing' | 'synced' | 'error';
  shoppingSupabaseDebug: ShoppingSupabaseDebug;
  onDeleteItem: (itemId: string) => void;
  onEditItem: (itemId: string) => void;
  onShare: () => void;
  onToggleShareItem: (itemId: string) => void;
  onTextChange: (value: string) => void;
  onToggleItem: (itemId: string) => void;
  resultText: string;
  savedText: string;
  selectedShareIds: string[];
  shareMessage: string;
  text: string;
  updatedAt: string;
}) {
  const textareaRef = React.useRef<HTMLTextAreaElement | null>(null);
  const groups = groupShoppingItems(items);
  const completedCount = items.filter((item) => item.completed).length;
  const isMealMode = mode === 'meal';
  const updatedLabel = updatedAt
    ? new Date(updatedAt).toLocaleString('ja-JP', {
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        month: 'short',
      })
    : '';

  React.useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = 'auto';
    textarea.style.height = `${textarea.scrollHeight}px`;
  }, [text]);

  return (
    <section className="hero-panel shopping-page" aria-label="買い物リスト">
      <div className="top-bar">
        <div>
          <p className="eyebrow">MORNING FLOW AI <span>{appVersion}</span></p>
          <h1>買い物リスト</h1>
        </div>
        <button className="icon-ghost-button" type="button" onClick={onBack} aria-label="トップページへ戻る">
          <Home size={20} />
        </button>
      </div>

      <div className={`shopping-sync-status ${shoppingSyncStatus}`}>
        <span>{getShoppingSyncStatusLabel(shoppingSyncStatus)}</span>
        {shoppingSyncError && <small>{shoppingSyncError}</small>}
        {(shoppingSyncError || shoppingSupabaseDebug.lastOperation.includes('upsert')) && (
          <details className="follow-up-debug-details" open={Boolean(shoppingSyncError)}>
            <summary>Shopping Save Debug</summary>
            <small>Current User ID: {shoppingSupabaseDebug.userId || 'not checked'}</small>
            <small>Payload User ID: {shoppingSupabaseDebug.payloadUserId || 'not checked'}</small>
            <small>Auth Mode: {shoppingSupabaseDebug.authMode || 'not checked'}</small>
            <small>Token Status: {shoppingSupabaseDebug.tokenStatus || 'not checked'}</small>
            <small>Response: {shoppingSupabaseDebug.responseStatus || 'not received'}</small>
            <small>Rows: {typeof shoppingSupabaseDebug.rowCount === 'number' ? shoppingSupabaseDebug.rowCount : 'not checked'}</small>
            <small>Body: {shoppingSupabaseDebug.bodyPreview || 'not received'}</small>
            <small>Error: {shoppingSupabaseDebug.error || 'none'}</small>
            <small>INSERT Payload: {shoppingSupabaseDebug.payloadPreview || 'not checked'}</small>
          </details>
        )}
      </div>

      <div className="flow-switcher" aria-label="MORNING FLOW AI menu">
        <button type="button" onClick={onBack}>
          今日の予定を整理する
        </button>
        <button className="selected" type="button">
          <ShoppingCart size={18} />
          買い物リストを作る
        </button>
      </div>

      <p className="shopping-lead">買いたい物をマイクに向かって話してください。あとから思い出した物も、そのまま追加できます。</p>

      {isMealDatabaseExperimentalEnabled && (
        <div className="shopping-mode-tabs" aria-label="買い物リスト入力方法">
          <button className={!isMealMode ? 'selected' : ''} onClick={onOpenShoppingMode} type="button">
            音声・手入力で追加
          </button>
          <button className={isMealMode ? 'selected' : ''} onClick={onOpenMealMode} type="button">
            献立から作成
          </button>
        </div>
      )}

      <div className="focus-area shopping-focus">
        <div className={`voice-stage ${isListening ? 'is-listening' : ''}`}>
          <div className="waveform" aria-hidden="true">
            {Array.from({ length: 17 }).map((_, index) => (
              <span key={index} style={{ animationDelay: `${index * 72}ms` }} />
            ))}
          </div>

          <button
            aria-label={isListening ? '音声入力を止める' : '買い物リストを音声入力する'}
            className={`mic-button ${isListening ? 'is-listening' : ''}`}
            disabled={!isSupported}
            onClick={isListening ? onStopListening : onStartListening}
            type="button"
          >
            <span className="pulse-ring ring-one" aria-hidden="true" />
            <span className="pulse-ring ring-two" aria-hidden="true" />
            <span className="mic-glass" aria-hidden="true" />
            {isListening ? <Square size={38} fill="currentColor" /> : <Mic size={56} />}
          </button>
        </div>

        <div className="status-row" role="status" aria-live="polite">
          <span className={`status-dot ${isListening ? 'active' : ''}`} />
          {isListening ? '音声認識中' : items.length ? '買い物リストを保存中' : '話すだけでカテゴリ分けします'}
        </div>
      </div>

      <VoiceInputGuide
        examples={[
          '卵を2パック',
          '牛乳を1本',
          '豚肉500g',
          '今日買うものはトマトと玉ねぎ',
        ]}
      />

      {error && <p className="error-message">{error}</p>}
      {isOrganizing && (
        <p className="loading-message" role="status" aria-live="polite">
          AIが買い物リストを整理中です。カテゴリ分けしています。
        </p>
      )}

      <section className="editor-card shopping-editor" aria-label="買い物メモ編集">
        <div className="editor-header">
          <span>{isMealMode ? 'Meal Capture' : 'Shopping Capture'}</span>
          <strong>{isMealMode ? '献立を話すか入力してください' : 'AIで整理する前に編集できます'}</strong>
        </div>
        {text.trim() !== savedText.trim() && (
          <p className="editor-live-note">入力中の内容はこのままAI整理に反映されます。</p>
        )}
        <textarea
          aria-label="買いたい物のテキストを編集"
          className="transcript-editor"
          onChange={(event) => onTextChange(event.target.value)}
          placeholder={isMealMode ? '例：今日の夜はカレーとサラダにしたい' : '例：牛乳、卵、ネギ、洗剤、子供のお菓子、ジム用の水'}
          ref={textareaRef}
          rows={5}
          value={resultText}
        />
        <div className="shopping-editor-actions">
          <button className="secondary-button" onClick={onClearInput} type="button">
            全文削除
          </button>
          <button className="secondary-button" onClick={onNewList} type="button">
            新しく作る
          </button>
        </div>
        {isMealMode && (
          <label className="meal-servings-control">
            人数
            <select value={mealServings} onChange={(event) => onChangeMealServings(Number(event.target.value))}>
              {[1, 2, 3, 4, 5, 6].map((servings) => (
                <option key={servings} value={servings}>
                  {servings}人前
                </option>
              ))}
            </select>
          </label>
        )}
        <button
          className={`organize-button ${isOrganizing ? 'is-organizing' : ''}`}
          disabled={!canOrganize || isOrganizing}
          onClick={isMealMode ? onGenerateMealCandidates : onOrganize}
          type="button"
        >
          <Brain size={21} />
          {isMealMode ? '材料候補を作成' : isOrganizing ? '買い物リストを整理中…' : '買い物リストを整理する'}
          {isOrganizing ? <Loader2 className="button-spinner" size={18} /> : <Sparkles size={18} />}
        </button>
      </section>

      {isMealMode && (
        <section className="plan-card meal-candidate-card" aria-label="材料候補確認">
          <div className="plan-title">
            <span><ShoppingCart size={18} /></span>
            <h2>材料候補確認</h2>
          </div>
          <p className="meal-candidate-note">不要な材料は削除してから、買い物リストに追加してください。</p>
          {mealDebug && isDeveloperModeEnabled() && (
            <div className="meal-debug-card">
              <span>Developer Debug</span>
              <small>extracted: {mealDebug.extracted.join(', ') || '-'}</small>
              <small>normalized: {mealDebug.normalized.join(', ') || '-'}</small>
              <small>matched: {mealDebug.matched.join(', ') || '-'}</small>
              <small>candidateCount: {mealDebug.candidateCount}</small>
              <small>isUnknown: {String(mealDebug.isUnknown)}</small>
            </div>
          )}
          {mealCandidates.length ? (
            <>
              <div className="meal-candidate-list">
                {mealCandidates.map((candidate) => (
                  <div className="meal-candidate-row" key={candidate.id}>
                    <div>
                      <span>{candidate.meal}</span>
                      <strong>{formatMealCandidateLabel(candidate)}</strong>
                    </div>
                    <button className="shopping-icon-button" onClick={() => onEditMealCandidate(candidate.id)} type="button">
                      <Pencil size={17} />
                    </button>
                    <button className="shopping-icon-button shopping-delete-button" onClick={() => onDeleteMealCandidate(candidate.id)} type="button">
                      <Trash2 size={17} />
                    </button>
                  </div>
                ))}
              </div>
              <button className="shopping-share-button" onClick={onAddMealCandidates} type="button">
                <Plus size={18} />
                買い物リストに追加
              </button>
            </>
          ) : (
            <p className="calendar-empty">
              {mealPlanText.trim() ? '材料候補を作成すると、ここに確認リストが表示されます。' : '献立を入力してから材料候補を作成してください。'}
            </p>
          )}
        </section>
      )}

      <section className="plan-card shopping-result-card" aria-label="整理結果">
        <div className="plan-title">
          <span><ListChecks size={18} /></span>
          <h2>整理結果</h2>
        </div>

        {items.length ? (
          <>
            <div className="shopping-summary">
              <strong>{completedCount}/{items.length} 完了</strong>
              {updatedLabel && <span>最終更新 {updatedLabel}</span>}
            </div>
            <button className="shopping-share-button" type="button" onClick={onShare}>
              <Share2 size={18} />
              {selectedShareIds.length ? `選択した${selectedShareIds.length}件を共有` : '家族に共有'}
            </button>
            {shareMessage && <p className="shopping-share-message">{shareMessage}</p>}
            <div className="shopping-category-list">
              {groups.map((group) => (
                <div className="shopping-category" key={group.category}>
                  <h3>{group.category}</h3>
                  <div className="shopping-check-list">
                    {group.items.map((item) => {
                      const checkboxId = item.id;
                      return (
                        <div
                          className={`shopping-check-row ${highlightedIds.includes(item.id) ? 'is-new' : ''}`}
                          key={item.id}
                        >
                          <label className="shopping-share-select" htmlFor={`share-${item.id}`}>
                            <input
                              checked={selectedShareIds.includes(item.id)}
                              id={`share-${item.id}`}
                              onChange={() => onToggleShareItem(item.id)}
                              type="checkbox"
                            />
                            <span>共有</span>
                          </label>
                          <label
                            className={`shopping-check-item ${item.completed ? 'is-completed' : ''}`}
                            htmlFor={checkboxId}
                          >
                            <input
                              checked={item.completed}
                              id={checkboxId}
                              onChange={() => onToggleItem(item.id)}
                              type="checkbox"
                            />
                            <span>{formatShoppingItemLabel(item)}</span>
                          </label>
                          <button
                            aria-label={`${formatShoppingItemLabel(item)}を編集`}
                            className="shopping-icon-button"
                            onClick={() => onEditItem(item.id)}
                            type="button"
                          >
                            <Pencil size={17} />
                          </button>
                          <button
                            aria-label={`${formatShoppingItemLabel(item)}を削除`}
                            className="shopping-icon-button shopping-delete-button"
                            onClick={() => onDeleteItem(item.id)}
                            type="button"
                          >
                            <Trash2 size={17} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <p className="calendar-empty">まだ買い物リストはありません。マイクで話すか、テキストで入力してください。</p>
        )}
      </section>

      <div className="action-row">
        <button className="secondary-button" type="button" onClick={onResetRequest}>
          <RefreshCw size={19} />
          やり直し
        </button>
        <button className="secondary-button" type="button" onClick={onBack}>
          <Home size={18} />
          トップページへ戻る
        </button>
      </div>

      {isResetDialogOpen && (
        <section className="inline-confirm-card" aria-label="買い物リストやり直し確認">
          <strong>本当にやり直しますか？</strong>
          <p>入力中の内容と現在の買い物リストを削除します。</p>
          <div className="confirm-dialog-actions">
            <button className="secondary-button" type="button" onClick={onCancelReset}>
              キャンセル
            </button>
            <button className="danger-button" type="button" onClick={onReset}>
              やり直す
            </button>
          </div>
        </section>
      )}
    </section>
  );
}

function CaptureModeSwitcher({
  mode,
  onChange,
  planExists,
}: {
  mode: CaptureMode;
  onChange: (mode: CaptureMode) => void;
  planExists: boolean;
}) {
  return (
    <div className="capture-mode-card" aria-label="音声入力モード">
      <button
        className={mode === 'create' ? 'selected' : ''}
        onClick={() => onChange('create')}
        type="button"
      >
        新規スケジュール作成
      </button>
      <button
        className={mode === 'update' ? 'selected' : ''}
        disabled={!planExists}
        onClick={() => onChange('update')}
        type="button"
      >
        既存スケジュールへの追加・修正
      </button>
    </div>
  );
}

function TranscriptEditor({
  isClearConfirmOpen,
  onCancel,
  onCancelClear,
  onClear,
  onClearRequest,
  onSave,
  onTextChange,
  savedText,
  text,
}: {
  isClearConfirmOpen: boolean;
  onCancel: () => void;
  onCancelClear: () => void;
  onClear: () => void;
  onClearRequest: () => void;
  onSave: () => void;
  onTextChange: (value: string) => void;
  savedText: string;
  text: string;
}) {
  const textareaRef = React.useRef<HTMLTextAreaElement | null>(null);
  const isDirty = text.trim() !== savedText.trim();

  React.useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = 'auto';
    textarea.style.height = `${textarea.scrollHeight}px`;
  }, [text]);

  return (
    <section className="editor-card" aria-label="文字起こし編集">
      <div className="editor-header">
        <span>Editable Transcript</span>
        <strong>AI整理前に修正できます</strong>
      </div>
      {isDirty && <p className="editor-live-note">編集中の内容はそのままAI整理に反映されます。</p>}
      <textarea
        aria-label="認識されたテキストを編集"
        className="transcript-editor"
        onChange={(event) => onTextChange(event.target.value)}
        placeholder="AI整理へ渡す内容をここで修正できます。"
        ref={textareaRef}
        rows={4}
        value={text}
      />
      <div className="editor-actions">
        <button className="secondary-button" disabled={!text.trim()} onClick={onClearRequest} type="button">
          全文削除
        </button>
        <button className="secondary-button" onClick={onCancel} type="button">
          元に戻す
        </button>
        <button className="primary-button" disabled={!text.trim()} onClick={onSave} type="button">
          修正を保存
        </button>
      </div>
      {isClearConfirmOpen && (
        <section className="inline-confirm-card transcript-clear-confirm" aria-label="入力削除確認">
          <strong>入力をすべて削除しますか？</strong>
          <p>Editable Transcript内の文字と音声入力中の一時テキストを削除します。</p>
          <div className="confirm-dialog-actions">
            <button className="secondary-button" type="button" onClick={onCancelClear}>
              キャンセル
            </button>
            <button className="danger-button" type="button" onClick={onClear}>
              削除する
            </button>
          </div>
        </section>
      )}
    </section>
  );
}

function ReflectionView({
  carriedTodos,
  onCarryOver,
  onDeleteAll,
  onDeleteTask,
  onStatusChange,
  snapshot,
  statuses,
}: {
  carriedTodos: string[];
  onCarryOver: (todos: string[]) => void;
  onDeleteAll: () => void;
  onDeleteTask: (task: string) => void;
  onStatusChange: (task: string, status: ReviewStatus) => void;
  snapshot: MorningSnapshot;
  statuses: Record<string, ReviewStatus>;
}) {
  const [swipedTodo, setSwipedTodo] = React.useState('');
  const pointerStartX = React.useRef<number | null>(null);
  const todos = snapshot.plan.todos;
  const completed = todos.filter((todo) => statuses[todo] === 'done').length;
  const partial = todos.filter((todo) => statuses[todo] === 'partial').length;
  const score = todos.length ? Math.round(((completed + partial * 0.5) / todos.length) * 100) : 0;
  const unfinished = todos.filter((todo) => statuses[todo] === 'partial' || statuses[todo] === 'missed');
  const reflection = createReflectionMessage(statuses, todos);

  const carryUnfinished = () => {
    onCarryOver(Array.from(new Set([...carriedTodos, ...unfinished])));
  };

  const deleteAll = () => {
    if (!todos.length) return;
    if (window.confirm('\u3059\u3079\u3066\u306e\u632f\u308a\u8fd4\u308a\u9805\u76ee\u3092\u524a\u9664\u3057\u307e\u3059\u304b\uff1f')) {
      onDeleteAll();
    }
  };

  const deleteTask = (todo: string) => {
    onDeleteTask(todo);
    setSwipedTodo('');
  };

  return (
    <section className="reflection-card" aria-label="yesterday review">
      <div className="reflection-header">
        <div>
          <span>{'\u6628\u65e5\u306e\u632f\u308a\u8fd4\u308a'}</span>
          <strong>{'\u4eca\u65e5\u306b\u3064\u306a\u3052\u308b'}</strong>
        </div>
        <button className="reflection-clear-button" disabled={!todos.length} onClick={deleteAll} type="button">
          {'\u3059\u3079\u3066\u524a\u9664'}
        </button>
        <div className="score-ring">
          <b>{score}%</b>
          <small>{completed}{'\u4ef6\u5b8c\u4e86'}</small>
        </div>
      </div>

      <p className="reflection-purpose">{snapshot.plan.purpose}</p>

      <div className="review-list">
        {todos.map((todo) => (
          <div className={`review-swipe-row ${swipedTodo === todo ? 'is-swiped' : ''}`} key={todo}>
            <div className="review-delete-action">
              <button onClick={() => deleteTask(todo)} type="button">
                {'\u524a\u9664'}
              </button>
            </div>
            <div
              className="review-item"
              onPointerDown={(event) => {
                pointerStartX.current = event.clientX;
              }}
              onPointerUp={(event) => {
                if (pointerStartX.current === null) return;
                const deltaX = event.clientX - pointerStartX.current;
                pointerStartX.current = null;
                if (Math.abs(deltaX) > 42) {
                  setSwipedTodo((current) => (current === todo ? '' : todo));
                }
              }}
            >
              <span>{todo}</span>
              <div className="review-buttons" aria-label={`${todo} review status`}
              >
                {reviewOptions.map((option) => (
                  <button
                    className={statuses[todo] === option.value ? 'selected' : ''}
                    key={option.value}
                    onClick={() => onStatusChange(todo, option.value)}
                    type="button"
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="reflection-insight">
        <Lightbulb size={17} />
        <span>{reflection}</span>
      </div>

      <div className="reflection-footer">
        <span>{todos.length}{'\u4ef6\u4e2d'}{completed}{'\u4ef6\u5b8c\u4e86'}</span>
        <button disabled={!unfinished.length} onClick={carryUnfinished} type="button">
          {'\u4eca\u65e5\u3078\u7e70\u308a\u8d8a\u3059'}
          <ChevronRight size={17} />
        </button>
      </div>

      {carriedTodos.length > 0 && (
        <p className="carryover-note">{carriedTodos.length}{'\u4ef6\u3092\u4eca\u65e5\u306eAI\u6574\u7406\u306b\u53cd\u6620\u3057\u307e\u3059\u3002'}</p>
      )}
    </section>
  );
}

function PlanView({
  analyticsUserId,
  highlightedScheduleKeys,
  plan,
  shoppingItems,
}: {
  analyticsUserId: string;
  highlightedScheduleKeys: string[];
  plan: MorningPlan;
  shoppingItems: ShoppingItem[];
}) {
  const [isCalendarOpen, setIsCalendarOpen] = React.useState(false);
  const [showDetails, setShowDetails] = React.useState(false);
  const today = React.useMemo(() => startOfLocalDay(new Date()), []);
  const calendarEvents = React.useMemo(() => createCalendarEvents(plan), [plan]);
  const todayEvents = React.useMemo(
    () => calendarEvents.filter((event) => isSameLocalDate(event.start, today)),
    [calendarEvents, today],
  );
  const futureEvents = React.useMemo(
    () => calendarEvents.filter((event) => isFutureLocalDate(event.start, today)),
    [calendarEvents, today],
  );
  const futureEventGroups = React.useMemo(() => groupFutureEventsByDate(futureEvents), [futureEvents]);
  const todayTodos = React.useMemo(
    () => plan.todos.filter((todo) => !isFutureDatedText(todo, today) && (isFoodEventText(todo) || !isShoppingItemText(todo))),
    [plan.todos, today],
  );
  const visibleShoppingItems = React.useMemo(
    () => dedupeShoppingItemsForDisplay(groupShoppingItems(shoppingItems).flatMap((group) => group.items)),
    [shoppingItems],
  );
  const visibleSchedule = todayEvents;
  return (
    <section className="plan-stack" aria-label="AI organized result">
      <PlanSection icon={<ListChecks size={18} />} title={'\u4eca\u65e5\u306e\u3084\u308b\u3053\u3068'}>
        {todayTodos.length ? (
          <div className="todo-list">
            {todayTodos.map((todo) => (
              <label key={todo} className="todo-item">
                <input type="checkbox" />
                <span>{todo}</span>
              </label>
            ))}
          </div>
        ) : (
          <p className="purpose-text">{'\u4eca\u65e5\u306e\u3084\u308b\u3053\u3068\u306f\u307e\u3060\u3042\u308a\u307e\u305b\u3093\u3002'}</p>
        )}
      </PlanSection>

      <PlanSection icon={<ShoppingCart size={18} />} title={'\u8cb7\u3044\u7269\u30ea\u30b9\u30c8'}>
        {visibleShoppingItems.length ? (
          <ul className="clean-list">
            {visibleShoppingItems.map((item) => (
              <li key={item.id}>{formatShoppingItemLabel(item)}</li>
            ))}
          </ul>
        ) : (
          <p className="purpose-text">{'\u8cb7\u3044\u7269\u30ea\u30b9\u30c8\u306f\u307e\u3060\u3042\u308a\u307e\u305b\u3093\u3002'}</p>
        )}
      </PlanSection>

      <PlanSection icon={<CalendarClock size={18} />} title={'\u4eca\u65e5\u306e\u30b9\u30b1\u30b8\u30e5\u30fc\u30eb'}>
        {visibleSchedule.length ? (
          <div className="schedule-list">
            {visibleSchedule.map((event) => (
              <div
                className={`schedule-item ${
                  highlightedScheduleKeys.includes(`${event.sourceTime.trim()}::${event.title.trim()}`) ? 'is-new' : ''
                }`}
                key={event.id}
              >
                <time>{formatScheduleDisplayTime(event.sourceTime, event.start)}</time>
                <span>{cleanScheduleDisplayTitle(event.title)}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="purpose-text">{'\u4eca\u65e5\u306e\u30b9\u30b1\u30b8\u30e5\u30fc\u30eb\u306f\u307e\u3060\u3042\u308a\u307e\u305b\u3093\u3002'}</p>
        )}
      </PlanSection>

      {futureEventGroups.length > 0 && (
        <PlanSection icon={<CalendarClock size={18} />} title={'\u672a\u6765\u306e\u4e88\u5b9a'}>
          <div className="future-schedule-list">
            {futureEventGroups.map((group) => (
              <section className="future-schedule-day" key={group.dateLabel}>
                <strong>{group.dateLabel}</strong>
                <div className="schedule-list">
                  {group.events.map((event) => (
                    <div className="schedule-item" key={event.id}>
                      <time>{formatScheduleDisplayTime(event.sourceTime, event.start)}</time>
                      <span>{cleanScheduleDisplayTitle(event.title)}</span>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </PlanSection>
      )}

      <PlanSection icon={<CalendarClock size={18} />} title={'Google\u30ab\u30ec\u30f3\u30c0\u30fc'}>
        <button
          className="calendar-add-button"
          disabled={!calendarEvents.length}
          onClick={() => setIsCalendarOpen((current) => !current)}
          type="button"
        >
          <CalendarPlus size={19} />
          {'\u30ab\u30ec\u30f3\u30c0\u30fc\u3078\u8ffd\u52a0'}
        </button>
        {isCalendarOpen && <GoogleCalendarExportPanel analyticsUserId={analyticsUserId} events={calendarEvents} />}
      </PlanSection>

    </section>
  );
}

function dedupeShoppingItemsForDisplay(items: ShoppingItem[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = normalizeTaskText(formatShoppingItemLabel(item));
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function groupFutureEventsByDate(events: CalendarEvent[]) {
  const groups = new Map<string, { dateLabel: string; events: CalendarEvent[]; sortTime: number }>();
  events.forEach((event) => {
    const dateLabel = event.start.toLocaleDateString('ja-JP', {
      month: 'numeric',
      day: 'numeric',
      weekday: 'short',
    });
    const dateKey = event.start.toDateString();
    const currentGroup = groups.get(dateKey) ?? {
      dateLabel,
      events: [],
      sortTime: startOfLocalDay(event.start).getTime(),
    };
    currentGroup.events.push(event);
    groups.set(dateKey, currentGroup);
  });

  return Array.from(groups.values())
    .sort((a, b) => a.sortTime - b.sortTime)
    .map((group) => ({
      dateLabel: group.dateLabel,
      events: group.events.sort((a, b) => a.start.getTime() - b.start.getTime()),
    }));
}

function cleanScheduleDisplayTitle(value: string) {
  return cleanPriorityLabel(value).replace(/^(明日は|明日|今日は|今日)\s*/, '');
}

function GoogleCalendarExportPanel({ analyticsUserId, events }: { analyticsUserId: string; events: CalendarEvent[] }) {
  const [accessToken, setAccessToken] = React.useState('');
  const [selectedEventIds, setSelectedEventIds] = React.useState(() => events.map((event) => event.id));
  const [statusMessage, setStatusMessage] = React.useState('');
  const [appleDebug, setAppleDebug] = React.useState<AppleCalendarDebugInfo | null>(null);
  const [appleDisposition, setAppleDisposition] = React.useState<AppleCalendarDisposition>('inline');
  const [isSigningIn, setIsSigningIn] = React.useState(false);
  const [isRegistering, setIsRegistering] = React.useState(false);
  const isConfigured = isGoogleCalendarConfigured();
  const selectedEvents = events.filter((event) => selectedEventIds.includes(event.id));

  React.useEffect(() => {
    return () => {
      if (accessToken) {
        revokeGoogleAccessToken(accessToken);
      }
    };
  }, [accessToken]);

  React.useEffect(() => {
    setSelectedEventIds(events.map((event) => event.id));
  }, [events]);

  const connectGoogle = () => {
    setIsSigningIn(true);
    setStatusMessage('');
    requestGoogleAccessToken()
      .then((token) => {
        setAccessToken(token);
        setStatusMessage('Google account selected. Please confirm the events before registration.');
      })
      .catch((reason: unknown) => {
        setStatusMessage(reason instanceof Error ? reason.message : 'Google sign-in failed.');
      })
      .finally(() => setIsSigningIn(false));
  };

  const disconnectGoogle = () => {
    if (accessToken) {
      revokeGoogleAccessToken(accessToken);
    }
    setAccessToken('');
    setStatusMessage('Google Calendar connection was cleared.');
  };

  const toggleEvent = (eventId: string) => {
    setSelectedEventIds((current) =>
      current.includes(eventId) ? current.filter((id) => id !== eventId) : [...current, eventId],
    );
  };

  const registerSelectedEvents = () => {
    if (!accessToken || !selectedEvents.length) return;

    trackAnalyticsFeature(analyticsUserId, 'google_calendar');
    setIsRegistering(true);
    setStatusMessage('');
    console.info('[MORNING FLOW AI] Google Calendar selected events', {
      count: selectedEvents.length,
      events: selectedEvents.map((event) => ({
        title: event.title,
        start: event.start,
        end: event.end,
      })),
    });

    insertGoogleCalendarEvents(accessToken, selectedEvents)
      .then((result) => {
        const failureSummary = result.failed
          .map((event) => `${event.title}: ${event.status ? `${event.status} ` : ''}${event.message}`)
          .join(' / ');
        setStatusMessage(
          result.failed.length
            ? `Google Calendar: ${result.requested}件中 成功 ${result.created.length}件 / 失敗 ${result.failed.length}件。${failureSummary}`
            : `Google Calendar: ${result.requested}件中 成功 ${result.created.length}件 / 失敗 0件。`,
        );
        revokeGoogleAccessToken(accessToken);
        setAccessToken('');
      })
      .catch((reason: unknown) => {
        setStatusMessage(reason instanceof Error ? reason.message : 'Google Calendar registration failed.');
      })
      .finally(() => setIsRegistering(false));
  };

  const openAppleCalendar = () => {
    trackAnalyticsFeature(analyticsUserId, 'apple_calendar');
    setStatusMessage('AppleカレンダーAPIを確認しています。');
    void openAppleCalendarIcs(events, setAppleDebug, appleDisposition).then(setStatusMessage);
  };

  if (!events.length) {
    return (
      <div className="calendar-panel">
        <div className="calendar-panel-header">
          <span>Calendar Export</span>
          <strong>登録できる予定がありません</strong>
        </div>
        <p className="calendar-empty">
          タイムスケジュールに「9:00」「11:00-14:00」のような時刻が入ると予定化できます。
        </p>
      </div>
    );
  }

  const dateLabel = events[0].start.toLocaleDateString('ja-JP', {
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  });

  return (
    <div className="calendar-panel" aria-label="予定一覧確認画面">
      <div className="calendar-panel-header">
        <span>Google Calendar</span>
        <strong>予定一覧確認画面</strong>
      </div>

      <p className="calendar-date">{dateLabel} の予定として作成します。登録しない予定はチェックを外せます。</p>

      <div className="google-connect-card">
        <div>
          <span>Google OAuth</span>
          <strong>{accessToken ? '接続済み' : '初回のみログイン'}</strong>
        </div>
        {accessToken ? (
          <button className="calendar-mini-button" onClick={disconnectGoogle} type="button">
            ログアウト
          </button>
        ) : (
          <button
            className="calendar-mini-button"
            disabled={!isConfigured || isSigningIn}
            onClick={connectGoogle}
            type="button"
          >
            {isSigningIn ? '接続中' : 'Googleログイン'}
          </button>
        )}
      </div>

      {!isConfigured && (
        <p className="calendar-status is-warning">
          .envにVITE_GOOGLE_CLIENT_IDを設定するとGoogleカレンダーへ直接登録できます。
        </p>
      )}

      <div className="calendar-event-list">
        {events.map((event) => {
          const checkboxId = `calendar-event-${event.id.replace(/[^a-zA-Z0-9_-]/g, '-')}`;
          return (
          <article className="calendar-event" key={event.id}>
            <label className="calendar-event-check" htmlFor={checkboxId}>
              <input
                aria-label={`${event.title}をGoogleカレンダー登録対象にする`}
                checked={selectedEventIds.includes(event.id)}
                id={checkboxId}
                onChange={() => toggleEvent(event.id)}
                type="checkbox"
              />
              <div>
                <time dateTime={event.start.toISOString()}>
                  {formatEventDateTime(event.start)} - {formatEventTime(event.end)}
                </time>
                <strong>{event.title}</strong>
                <p>{event.memo}</p>
                <small>優先度: {event.priority}</small>
              </div>
            </label>
          </article>
          );
        })}
      </div>

      <p className="calendar-primary-note">メイン操作: 選択した予定をまとめてGoogleカレンダーへ登録します。</p>

      <button
        className="calendar-register-button"
        disabled={!accessToken || !selectedEvents.length || isRegistering}
        onClick={registerSelectedEvents}
        aria-label="選択した予定をGoogleカレンダーへ一括登録"
        type="button"
      >
        <CalendarPlus size={18} />
        {isRegistering ? '登録中' : `Googleカレンダーへ登録 (${selectedEvents.length}件)`}
      </button>

      {statusMessage && <p className="calendar-status">{statusMessage}</p>}

      <button
        className="calendar-download-button"
        onClick={openAppleCalendar}
        type="button"
      >
        <Download size={18} />
        Appleカレンダーに追加
      </button>
      <AppleCalendarDispositionControl value={appleDisposition} onChange={setAppleDisposition} />
      {appleDebug && <AppleCalendarDebugPanel debug={appleDebug} />}
    </div>
  );
}

function CalendarExportPanel({ events }: { events: CalendarEvent[] }) {
  const [appleStatusMessage, setAppleStatusMessage] = React.useState('');
  const [appleDebug, setAppleDebug] = React.useState<AppleCalendarDebugInfo | null>(null);
  const [appleDisposition, setAppleDisposition] = React.useState<AppleCalendarDisposition>('inline');

  const openAppleCalendar = () => {
    setAppleStatusMessage('AppleカレンダーAPIを確認しています。');
    void openAppleCalendarIcs(events, setAppleDebug, appleDisposition).then(setAppleStatusMessage);
  };

  if (!events.length) {
    return (
      <div className="calendar-panel">
        <div className="calendar-panel-header">
          <span>Calendar Export</span>
          <strong>登録できる予定がありません</strong>
        </div>
        <p className="calendar-empty">
          タイムスケジュールに「9:00」「11:00〜14:00」のような時刻が入ると予定化できます。
        </p>
      </div>
    );
  }

  const dateLabel = events[0].start.toLocaleDateString('ja-JP', {
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  });

  return (
    <div className="calendar-panel" aria-label="登録する予定を確認">
      <div className="calendar-panel-header">
        <span>Calendar Export</span>
        <strong>登録する予定を確認</strong>
      </div>

      <p className="calendar-date">{dateLabel} の予定として作成します</p>

      <div className="calendar-event-list">
        {events.map((event) => (
          <article className="calendar-event" key={event.id}>
            <div>
              <time dateTime={event.start.toISOString()}>
                {formatEventDateTime(event.start)} - {formatEventTime(event.end)}
              </time>
              <strong>{event.title}</strong>
              <p>{event.memo}</p>
            </div>
          </article>
        ))}
      </div>

      <button className="calendar-download-button" onClick={openAppleCalendar} type="button">
        <Download size={18} />
        Appleカレンダーに追加
      </button>
      <AppleCalendarDispositionControl value={appleDisposition} onChange={setAppleDisposition} />
      {appleStatusMessage && <p className="calendar-status">{appleStatusMessage}</p>}
      {appleDebug && <AppleCalendarDebugPanel debug={appleDebug} />}
    </div>
  );
}

function AppleCalendarDispositionControl({
  onChange,
  value,
}: {
  onChange: (value: AppleCalendarDisposition) => void;
  value: AppleCalendarDisposition;
}) {
  return (
    <div className="apple-calendar-disposition" aria-label="Apple Calendar Content-Disposition">
      <button className={value === 'inline' ? 'selected' : ''} onClick={() => onChange('inline')} type="button">
        inline
      </button>
      <button className={value === 'attachment' ? 'selected' : ''} onClick={() => onChange('attachment')} type="button">
        attachment
      </button>
    </div>
  );
}

function AppleCalendarDebugPanel({ debug }: { debug: AppleCalendarDebugInfo }) {
  return (
    <section className="apple-calendar-debug" aria-label="Apple Calendar Debug">
      <strong>Apple Calendar Debug</strong>
      <dl>
        <div>
          <dt>Apple ICS mode</dt>
          <dd>{debug.mode}</dd>
        </div>
        <div>
          <dt>API URL</dt>
          <dd>
            <a href={debug.apiUrl} rel="noreferrer" target="_blank">
              {debug.apiUrl}
            </a>
          </dd>
        </div>
        <div>
          <dt>ICS link</dt>
          <dd>
            <a href={debug.apiUrl} rel="noreferrer" target="_blank">
              .icsを直接開く
            </a>
          </dd>
        </div>
        {debug.importId && (
          <div>
            <dt>Import ID</dt>
            <dd>{debug.importId}</dd>
          </div>
        )}
        {typeof debug.icsLength === 'number' && (
          <div>
            <dt>ICS length</dt>
            <dd>{debug.icsLength}</dd>
          </div>
        )}
        {typeof debug.payloadUrlLength === 'number' && (
          <div>
            <dt>payload URL length</dt>
            <dd>{debug.payloadUrlLength}</dd>
          </div>
        )}
        {typeof debug.shortUrlLength === 'number' && (
          <div>
            <dt>short URL length</dt>
            <dd>{debug.shortUrlLength}</dd>
          </div>
        )}
        <div>
          <dt>API response status</dt>
          <dd>{debug.responseStatus ?? 'not checked'}</dd>
        </div>
        <div>
          <dt>Content-Type</dt>
          <dd>{debug.contentType ?? 'not received'}</dd>
        </div>
        <div>
          <dt>Content-Disposition</dt>
          <dd>{debug.contentDisposition ?? 'not received'}</dd>
        </div>
        <div>
          <dt>Disposition mode</dt>
          <dd>{debug.contentDispositionMode ?? 'inline'}</dd>
        </div>
        <div>
          <dt>icsTimeMode</dt>
          <dd>{debug.icsTimeMode ?? 'unknown'}</dd>
        </div>
        <div>
          <dt>hasVTIMEZONE</dt>
          <dd>{String(debug.hasVTIMEZONE ?? false)}</dd>
        </div>
        <div>
          <dt>fallback used</dt>
          <dd>{debug.fallbackUsed}</dd>
        </div>
        <div>
          <dt>storage</dt>
          <dd>{debug.storage ?? 'not checked'}</dd>
        </div>
        <div>
          <dt>current appVersion</dt>
          <dd>{debug.appVersion}</dd>
        </div>
        {debug.bodyPreview && (
          <div>
            <dt>Response Body</dt>
            <dd>{debug.bodyPreview}</dd>
          </div>
        )}
      </dl>
    </section>
  );
}

function PlanSection({
  children,
  icon,
  title,
}: {
  children: React.ReactNode;
  icon: React.ReactNode;
  title: string;
}) {
  return (
    <article className="plan-card">
      <div className="plan-title">
        <span>{icon}</span>
        <h2>{title}</h2>
      </div>
      {children}
    </article>
  );
}

function formatShoppingShareText(items: ShoppingItem[]) {
  const lines = dedupeShoppingItemsForDisplay(groupShoppingItems(items).flatMap((group) => group.items))
    .map((item) => `・${formatShoppingItemLabel(item)}`);

  return ['買い物お願いします。', '', lines.join('\n') || '買い物リストはまだありません。'].join('\n');
}


function sortFollowUps(items: FollowUpItem[]) {
  return [...items].sort((a, b) => {
    const dueDiff = parseFollowUpDate(a.dueDate).getTime() - parseFollowUpDate(b.dueDate).getTime();
    if (dueDiff !== 0) return dueDiff;
    return followUpPriorityWeight(b.priority) - followUpPriorityWeight(a.priority);
  });
}

function sortCompletedFollowUps(items: FollowUpItem[]) {
  return [...items].sort((a, b) => {
    const completedDiff = getFollowUpCompletedTime(b) - getFollowUpCompletedTime(a);
    if (completedDiff !== 0) return completedDiff;
    return parseFollowUpDate(b.dueDate).getTime() - parseFollowUpDate(a.dueDate).getTime();
  });
}

function getFollowUpCompletedTime(item: FollowUpItem) {
  return item.completedAt ? new Date(item.completedAt).getTime() : 0;
}

function mapSupabaseRowToFollowUpItem(row: SupabaseFollowUpRow): FollowUpItem {
  const status = normalizeSupabaseFollowUpStatus(row.status);
  const createdAt = row.created_at || new Date().toISOString();
  const completedAt = row.completed_at ?? undefined;

  return {
    completed: status === 'done' || Boolean(completedAt),
    completedAt,
    content: row.memo || row.title || '',
    createdAt,
    dueDate: formatDateInput(new Date(createdAt)),
    duePreset: 'today',
    id: row.id,
    kind: normalizeSupabaseFollowUpKind(row.action_type),
    name: row.person_name || '連絡先未設定',
    priority: 'medium',
    source: 'voice',
    status,
  };
}

function mapFollowUpItemToSupabaseInsert(item: FollowUpItem, userId: string) {
  const status = mapFollowUpStatusToSupabase(item.completed ? 'done' : item.status ?? 'pending');
  return {
    action_type: item.kind,
    completed_at: status === 'done' ? item.completedAt ?? new Date().toISOString() : null,
    created_at: item.createdAt,
    id: item.id,
    memo: item.content,
    person_name: item.name,
    status,
    title: formatFollowUpTitle(item),
    updated_at: new Date().toISOString(),
    user_id: userId,
  };
}

function mapFollowUpStatusToSupabase(status: FollowUpStatus): SupabaseFollowUpStatus {
  return status;
}

function normalizeSupabaseFollowUpStatus(status: string | null | undefined): FollowUpStatus {
  return status === 'contacted' || status === 'waiting' || status === 'done' ? status : 'pending';
}

function normalizeSupabaseFollowUpKind(actionType: string | null | undefined): FollowUpKind {
  return actionType === 'phone' || actionType === 'line' || actionType === 'email' || actionType === 'sms' || actionType === 'other'
    ? actionType
    : 'other';
}

function getSupabaseFollowUpErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return `Supabase同期に失敗しました。${message}`;
}

function getAuthErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  if (/invalid login credentials/i.test(message)) {
    return 'ログインできませんでした。メール未認証、パスワード違い、登録未完了、または古い確認メールリンクの可能性があります。確認メールを開く、確認メール再送信、またはパスワード再設定を試してください。';
  }
  if (/email not confirmed|not confirmed/i.test(message)) {
    return 'メール未認証の可能性があります。確認メール内のリンクを開いてから、もう一度ログインしてください。届かない場合は確認メールを再送信してください。';
  }
  if (/already registered|user already registered|already been registered/i.test(message)) {
    return 'すでに登録済みの可能性があります。ログイン、確認メール再送信、またはパスワード再設定を試してください。';
  }
  if (/expired|invalid.*link|token/i.test(message)) {
    return '確認メールリンクが古い、または無効になっている可能性があります。確認メールを再送信して、新しいリンクを開いてください。';
  }
  if (/password/i.test(message)) {
    return 'パスワードを確認してください。忘れた場合はパスワード再設定を試してください。';
  }
  if (/rate limit|too many/i.test(message)) {
    return '短時間に何度も試行されています。少し時間を置いてからもう一度お試しください。';
  }
  return message ? `認証に失敗しました。${message}` : '認証に失敗しました。確認メール再送信、またはパスワード再設定を試してください。';
}

function createFollowUpSupabaseDebug(
  lastOperation: string,
  error?: unknown,
  payload?: ReturnType<typeof mapFollowUpItemToSupabaseInsert>,
  userId = '',
  accessToken = '',
  tokenStatus = '',
): FollowUpSupabaseDebug {
  const config = getSupabaseFollowUpConfigStatus();
  const supabaseError = error instanceof SupabaseFollowUpError ? error : null;
  const fallbackError = error && !supabaseError ? (error instanceof Error ? error.message : String(error)) : '';

  return {
    authMode: accessToken ? 'authenticated-access-token' : 'anon-key',
    bodyPreview: supabaseError?.body ? supabaseError.body.slice(0, 220) : '',
    configured: config.configured,
    error: supabaseError ? supabaseError.message : fallbackError,
    hasAnonKey: config.hasAnonKey,
    hasUrl: config.hasUrl,
    lastOperation,
    payloadPreview: payload ? JSON.stringify(payload).slice(0, 260) : '',
    payloadUserId: payload?.user_id ?? '',
    responseStatus: supabaseError ? `${supabaseError.status} ${supabaseError.statusText}`.trim() : '',
    rowCount: null,
    tokenStatus,
    urlHost: config.urlHost,
    userId,
  };
}

function createShoppingSupabaseDebug(
  lastOperation: string,
  error?: unknown,
  payload: SupabaseShoppingItemUpsert[] = [],
  userId = '',
  accessToken = '',
  tokenStatus = '',
): ShoppingSupabaseDebug {
  const supabaseError = error instanceof SupabaseShoppingItemError ? error : null;
  const fallbackError = error && !supabaseError ? (error instanceof Error ? error.message : String(error)) : '';
  const firstPayload = payload[0];

  return {
    authMode: accessToken ? 'authenticated-access-token' : 'anon-key',
    bodyPreview: supabaseError?.body ? supabaseError.body.slice(0, 260) : '',
    error: supabaseError ? supabaseError.message : fallbackError,
    lastOperation,
    payloadPreview: payload.length ? JSON.stringify(payload).slice(0, 320) : '',
    payloadUserId: firstPayload?.user_id ?? '',
    responseStatus: supabaseError ? `${supabaseError.status} ${supabaseError.statusText}`.trim() : '',
    rowCount: null,
    tokenStatus,
    userId,
  };
}

function getFollowUpSyncStatusLabel(status: 'local' | 'syncing' | 'synced' | 'error') {
  if (status === 'synced') return 'Supabase同期済み';
  if (status === 'syncing') return '同期中...';
  if (status === 'error') return 'Supabase同期エラー';
  return 'ローカル保存';
}

function getShoppingSyncStatusLabel(status: 'local' | 'syncing' | 'synced' | 'error') {
  if (status === 'synced') return '買い物リスト同期済み';
  if (status === 'syncing') return '買い物リスト同期中...';
  if (status === 'error') return '買い物リスト同期エラー';
  return 'ローカル保存';
}

const aiInboxCategoryOptions: { label: string; value: AiInboxCategory }[] = [
  { label: '今日のやること', value: 'todo' },
  { label: '買い物', value: 'shopping' },
  { label: 'Follow Up', value: 'followUp' },
  { label: 'メモ', value: 'memo' },
  { label: 'アイデア', value: 'idea' },
];

function aiInboxCategoryLabel(category: AiInboxCategory) {
  return aiInboxCategoryOptions.find((option) => option.value === category)?.label ?? 'メモ';
}

function classifyAiInboxText(text: string, fallback: AiInboxCategory = 'memo'): { category: AiInboxCategory; confidence: number } {
  if (detectFollowUpIntent(text)) return { category: 'followUp', confidence: extractFollowUpPersons(text).length ? 92 : 88 };
  if (hasShoppingItemIntent(text) || hasShoppingActionIntent(text)) return { category: 'shopping', confidence: 95 };
  if (isShoppingItemText(text)) return { category: 'shopping', confidence: 86 };
  if (/(アイデア|思いついた|企画|やってみたい|改善案|提案)/.test(text)) return { category: 'idea', confidence: 90 };
  if (hasScheduleTimeText(text)) return { category: 'todo', confidence: 91 };
  if (isScheduleActionText(text)) return { category: 'todo', confidence: 84 };
  return { category: fallback, confidence: fallback === 'memo' ? 72 : 80 };
}

function shouldRouteMorningVoiceToAiInbox(text: string) {
  const normalized = text.trim();
  if (!normalized) return false;

  const hasShopping = hasShoppingItemIntent(normalized) || hasShoppingActionIntent(normalized) || isShoppingItemText(normalized);
  const hasFollowUp = detectFollowUpIntent(normalized);
  const hasIdea = detectIdeaIntent(normalized);
  const hasTodoOrSchedule = detectTodoOrScheduleIntent(normalized);

  if (hasIdea) return true;
  if (hasShopping && hasFollowUp) return true;
  return false;
}

function detectIdeaIntent(text: string) {
  return /\u30a2\u30a4\u30c7\u30a2|\u601d\u3044\u3064\u3044\u305f|\u4f01\u753b|\u65b0\u3057\u3044|\u30e1\u30e2|\u8003\u3048\u308b|\u8003\u3048\u3066\u304a\u304f|\u6848/i.test(text);
}

function detectTodoOrScheduleIntent(text: string) {
  return /\d{1,2}\s*[:：]\s*\d{2}|\d{1,2}\s*\u6642|\u5348\u524d|\u5348\u5f8c|\u4eca\u65e5|\u660e\u65e5|\u4e88\u5b9a|\u884c\u304f|\u3059\u308b|\u3084\u308b|\u98df\u3079\u308b|\u30e9\u30f3\u30c1|\u5915\u98df|\u671d\u98df/.test(text);
}

function appendVoiceText(current: string, nextText: string) {
  const currentText = current.trim();
  const incomingText = nextText.trim();
  if (!incomingText) return currentText;
  return [currentText, incomingText].filter(Boolean).join('\n');
}

function normalizeAiInboxItem(item: AiInboxItem): AiInboxItem {
  if (typeof item.confidence === 'number') return item;
  const classification = classifyAiInboxText(item.text, item.category);
  return {
    ...item,
    category: item.category ?? classification.category,
    confidence: classification.confidence,
  };
}

function formatAiInboxConfidence(confidence: number) {
  return `${Math.max(0, Math.min(100, Math.round(confidence || 0)))}%`;
}

function formatAiInboxCreatedAt(isoText: string) {
  const date = new Date(isoText);
  if (Number.isNaN(date.getTime())) return '日時不明';
  return date.toLocaleString('ja-JP', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatFollowUpSyncTime(isoText: string) {
  const date = new Date(isoText);
  if (Number.isNaN(date.getTime())) return '--:--';
  return date.toLocaleTimeString('ja-JP', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function suggestFollowUp(text: string): { priority: FollowUpPriority; kind: FollowUpKind } {
  const normalized = text.toLowerCase();
  const kind: FollowUpKind = includesAny(normalized, ['line'])
    ? 'line'
    : includesAny(normalized, ['mail', '\u30e1\u30fc\u30eb'])
      ? 'email'
      : includesAny(normalized, ['sms', '\u30b7\u30e7\u30fc\u30c8'])
        ? 'sms'
        : includesAny(normalized, ['\u96fb\u8a71', '\u6298\u308a\u8fd4\u3057', 'tel'])
          ? 'phone'
          : 'other';
  const priority: FollowUpPriority = includesAny(text, ['\u81f3\u6025', '\u6025\u304e', '\u4eca\u65e5\u4e2d', '\u6298\u308a\u8fd4\u3057', '\u96fb\u8a71', '\u50ac\u4fc3'])
    ? 'high'
    : includesAny(text, ['\u6765\u9031\u3067\u3082', '\u6025\u304e\u3058\u3083\u306a\u3044', '\u5f8c\u3067', '\u4f59\u88d5'])
      ? 'low'
      : 'medium';

  return { kind, priority };
}

function includesAny(text: string, keywords: string[]) {
  return keywords.some((keyword) => text.includes(keyword));
}

function detectFollowUpIntent(text: string) {
  return includesAny(text, [
    '\u6298\u308a\u8fd4\u3057',
    '\u96fb\u8a71',
    '\u8fd4\u4fe1',
    '\u9023\u7d61',
    'LINE',
    'line',
    '\u30e1\u30fc\u30eb',
    '\u8fd4\u3059',
    '\u8fd4\u4e8b',
    '\u78ba\u8a8d',
    '\u898b\u7a4d',
    '\u898b\u7a4d\u3082\u308a',
    '\u4f9d\u983c',
    '\u304a\u9858\u3044',
    '\u3082\u3089\u3046',
    '\u672a\u8fd4\u4fe1',
    '\u78ba\u8a8d\u3057\u3066\u8fd4\u4e8b',
  ]);
}

function extractFollowUpsFromText(text: string): FollowUpItem[] {
  return createFollowUpsFromSplitText(text).items;
}

function createFollowUpsFromSplitText(text: string) {
  const persons = extractFollowUpPersons(text);
  const separatorSegments = splitInputItems(text);
  const personBoundarySegments = splitFollowUpTextByPerson(text);
  const separatorResult = createFollowUpItemsFromSegments(separatorSegments);
  const personBoundaryResult = createFollowUpItemsFromSegments(personBoundarySegments);
  const shouldUsePersonBoundary = persons.length > 1 && personBoundaryResult.items.length >= persons.length;
  const shouldReevaluate = persons.length > 0 && separatorResult.items.length < persons.length;
  const strategy: FollowUpSplitDebug['strategy'] =
    shouldUsePersonBoundary || shouldReevaluate ? 'person-boundary' : 'separator';
  const selectedResult = shouldUsePersonBoundary || shouldReevaluate ? personBoundaryResult : separatorResult;
  const splitTexts = shouldUsePersonBoundary || shouldReevaluate ? personBoundarySegments : separatorSegments;
  const dedupeResult = dedupeFollowUpItems(selectedResult.items);

  return {
    debug: {
      duplicateExcludedCount: dedupeResult.duplicateExcludedCount,
      excludedReasons: selectedResult.excludedReasons,
      generatedItemCount: dedupeResult.items.length,
      originalText: text,
      personExtractions: getFollowUpPersonExtractions(text),
      personCount: persons.length,
      persons,
      reevaluated: shouldReevaluate,
      splitTexts,
      strategy,
    },
    items: dedupeResult.items,
  };
}

function createFollowUpItemsFromSegments(segments: string[]) {
  const excludedReasons: string[] = [];
  const items = segments
    .map((rawText) => {
      const segment = rawText.trim();
      if (!segment) return null;
      if (!detectFollowUpIntent(segment)) {
        excludedReasons.push(`${extractFollowUpName(segment)}: フォロー意図を検出できませんでした (${segment})`);
        return null;
      }
      const item = createVoiceFollowUp(segment);
      if (!item) {
        excludedReasons.push(`${segment}: フォロー項目を作成できませんでした`);
        return null;
      }
      return item;
    })
    .filter((item): item is FollowUpItem => Boolean(item));

  return { excludedReasons, items };
}

function createVoiceFollowUp(text: string): FollowUpItem | null {
  if (!text) return null;

  const suggestion = suggestFollowUp(text);
  const duePreset = detectFollowUpDuePreset(text);
  const dueDate = detectFollowUpDueDate(text, duePreset);

  return {
    completed: false,
    content: normalizeFollowUpContent(text),
    createdAt: new Date().toISOString(),
    dueDate,
    duePreset,
    id: createLocalId('follow-up-voice'),
    kind: suggestion.kind,
    name: extractFollowUpName(text),
    priority: suggestion.priority,
    source: 'voice',
    status: 'pending',
  };
}

function splitInputItems(text: string) {
  return normalizeFollowUpSplitText(text)
    .split(/[\n。．.!！?？、,]+|\s*(?:それから|それと|あと|そして)\s*/g)
    .map((item) => item.trim())
    .filter(Boolean);
}

function splitFollowUpTextByPerson(text: string) {
  const normalized = text.replace(/\s+/g, ' ').trim();
  const boundaries = getFollowUpPersonBoundaries(normalized);
  if (boundaries.length <= 1) return splitInputItems(text);

  return boundaries
    .map((boundary, index) => {
      const start = boundary.start;
      const nextBoundary = boundaries[index + 1];
      const end = nextBoundary
        ? nextBoundary.prefixIsTaskText
          ? nextBoundary.start
          : nextBoundary.matchStart
        : normalized.length;
      return normalized.slice(start, end).replace(/^[、。,.!?！？\s]+|[、。,.!?！？\s]+$/g, '').trim();
    })
    .filter(Boolean);
}

function normalizeFollowUpSplitText(text: string) {
  return text
    .replace(/\s+/g, ' ')
    .replace(new RegExp(`(?!^)([^、。,.!?！？\\n\\sにへ]+${followUpPersonSuffixPattern}(?:に|へ))`, 'g'), '\n$1')
    .trim();
}

function extractFollowUpPersons(text: string) {
  return Array.from(new Set(getFollowUpPersonBoundaries(text).map((boundary) => boundary.person).filter(Boolean)));
}

function getFollowUpPersonExtractions(text: string) {
  return getFollowUpPersonBoundaries(text).map((boundary) => ({
    extractedPerson: boundary.person,
    originalPerson: boundary.originalPerson,
  }));
}

function getFollowUpPersonBoundaries(text: string) {
  const normalized = text.replace(/\s+/g, ' ').trim();
  return Array.from(normalized.matchAll(new RegExp(`[^、。,.!?！？\\n\\sにへ]+${followUpPersonSuffixPattern}(?:に|へ)`, 'g')))
    .map((match) => {
      const matchedText = match[0];
      const rawName = matchedText.replace(/(?:に|へ)$/, '');
      const person = extractExactFollowUpPersonName(rawName);
      const personOffset = rawName.lastIndexOf(person);
      const prefix = personOffset > 0 ? rawName.slice(0, personOffset) : '';
      return {
        matchStart: match.index ?? 0,
        originalPerson: rawName,
        person,
        prefixIsTaskText: /(返信|連絡|電話|折り返し|LINE|見積もり)/.test(prefix),
        start: (match.index ?? 0) + Math.max(personOffset, 0),
      };
    })
    .filter((boundary) => boundary.person);
}

function findFollowUpPersonMatch(text: string) {
  return getFollowUpPersonBoundaries(text)[0] ?? null;
}

function extractExactFollowUpPersonName(name: string) {
  const withoutLead = name
    .replace(/^(ねえ|ねぇ|あの|えっと|今日は|今日|明日|あした|あとで)+/, '')
    .replace(/^(返信|連絡|電話|折り返し|LINE|見積もり)+/, '')
    .trim();
  const exactMatch = withoutLead.match(new RegExp(`([^の、。,.!?！？\\sにへ]+${followUpPersonSuffixPattern})$`));
  return exactMatch?.[1]?.trim() || withoutLead;
}

function normalizeFollowUpPersonName(name: string) {
  return extractExactFollowUpPersonName(name);
}

function dedupeFollowUpItems(items: FollowUpItem[]) {
  const seen = new Set<string>();
  let duplicateExcludedCount = 0;
  const dedupedItems = items.filter((item) => {
    const key = createFollowUpDedupeKey(item);
    if (seen.has(key)) {
      duplicateExcludedCount += 1;
      return false;
    }
    seen.add(key);
    return true;
  });
  return { duplicateExcludedCount, items: dedupedItems };
}

function detectFollowUpDuePreset(text: string): FollowUpDuePreset {
  if (includesAny(text, ['\u660e\u65e5', '\u3042\u3057\u305f', '\u660e\u65e5\u4e2d'])) return 'tomorrow';
  if (detectWeekdayDate(text)) return 'custom';
  if (includesAny(text, ['\u4eca\u9031', '\u6765\u9031'])) return 'thisWeek';
  return 'today';
}

function detectFollowUpDueDate(text: string, preset: FollowUpDuePreset) {
  return detectWeekdayDate(text) ?? resolveFollowUpDueDate(preset, formatDateInput(new Date()));
}

function detectWeekdayDate(text: string) {
  const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
  const match = text.match(/(日曜|月曜|火曜|水曜|木曜|金曜|土曜|日曜日|月曜日|火曜日|水曜日|木曜日|金曜日|土曜日)/);
  if (!match) return null;

  const target = weekdays.findIndex((weekday) => match[1].startsWith(weekday));
  if (target < 0) return null;

  const today = startOfLocalDay(new Date());
  const diff = (target - today.getDay() + 7) % 7;
  return formatDateInput(addDays(today, diff || 7));
}

function extractFollowUpName(text: string) {
  const exactMatch = findFollowUpPersonMatch(text);
  if (exactMatch?.person) return exactMatch.person;
  const cleaned = text.replace(/^(今日は|今日|明日|あした|あとで)/, '').trim();
  const match = cleaned.match(new RegExp(`^(.+?${followUpPersonSuffixPattern}?)(?:に|へ)(?:.*)$`));
  const rawName = match?.[1] ?? cleaned.replace(/(へ|に)?(電話|折り返し|返信|連絡|返事|メール|LINE|SMS).*/, '').trim();
  return normalizeFollowUpPersonName(rawName) || '\u9023\u7d61\u5148\u672a\u8a2d\u5b9a';
}

function normalizeFollowUpContent(text: string) {
  const withoutLead = text
    .replace(/^(今日は|今日|明日|あした|あとで)/, '')
    .replace(new RegExp(`^(.+?${followUpPersonSuffixPattern}?)(?:に|へ)`), '')
    .replace(/(今日中|明日中|今週中|来週中|日曜日|月曜日|火曜日|水曜日|木曜日|金曜日|土曜日)(まで|に)?/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (/line/i.test(withoutLead) && /(返す|返信|返事)/.test(withoutLead)) return 'LINE返信';
  if (/メール/.test(withoutLead) && /(返す|返信|返事)/.test(withoutLead)) return 'メール返信';
  return withoutLead || text.replace(/\s+/g, ' ').trim();
}

function createFollowUpDedupeKey(item: Pick<FollowUpItem, 'content' | 'dueDate' | 'kind' | 'name'>) {
  return [normalizeTaskText(item.name), normalizeTaskText(item.content), item.dueDate, item.kind].join('::');
}

function resolveFollowUpDueDate(preset: FollowUpDuePreset, customDate: string) {
  const today = startOfLocalDay(new Date());
  if (preset === 'tomorrow') return formatDateInput(addDays(today, 1));
  if (preset === 'thisWeek') return formatDateInput(addDays(today, 6));
  if (preset === 'custom' && customDate) return customDate;
  return formatDateInput(today);
}

function parseFollowUpDate(dateText: string) {
  const [year, month, day] = dateText.split('-').map(Number);
  if (!year || !month || !day) return startOfLocalDay(new Date());
  return new Date(year, month - 1, day);
}

function formatDateInput(date: Date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
}

function formatFollowUpDue(item: FollowUpItem) {
  const date = parseFollowUpDate(item.dueDate);
  const dateLabel = date.toLocaleDateString('ja-JP', {
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  });
  return item.dueTime ? dateLabel + ' ' + item.dueTime : dateLabel;
}

function formatFollowUpCompletedAt(item: FollowUpItem) {
  if (!item.completedAt) return '日時未記録';
  return new Date(item.completedAt).toLocaleString('ja-JP', {
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    month: 'long',
    weekday: 'short',
  });
}

function formatFollowUpTitle(item: FollowUpItem) {
  const action =
    item.kind === 'phone'
      ? '\u3078\u96fb\u8a71'
      : item.kind === 'line'
        ? '\u3078LINE\u8fd4\u4fe1'
        : item.kind === 'email'
          ? '\u3078\u30e1\u30fc\u30eb\u8fd4\u4fe1'
          : item.kind === 'sms'
            ? '\u3078SMS\u8fd4\u4fe1'
            : /見積/.test(item.content)
              ? 'へ見積もり依頼'
            : '\u3078\u9023\u7d61';
  return item.name + action;
}

function followUpPriorityLabel(priority: FollowUpPriority) {
  return priority === 'high' ? '\u9ad8' : priority === 'medium' ? '\u4e2d' : '\u4f4e';
}

function followUpPriorityWeight(priority: FollowUpPriority) {
  return priority === 'high' ? 3 : priority === 'medium' ? 2 : 1;
}

function followUpKindLabel(kind: FollowUpKind) {
  const labels: Record<FollowUpKind, string> = {
    phone: '\u96fb\u8a71',
    line: 'LINE',
    email: '\u30e1\u30fc\u30eb',
    sms: 'SMS',
    other: '\u305d\u306e\u4ed6',
  };
  return labels[kind];
}

function followUpStatusLabel(item: FollowUpItem) {
  const status = item.completed ? 'done' : item.status ?? 'pending';
  const labels: Record<FollowUpStatus, string> = {
    contacted: '連絡済',
    done: '完了',
    pending: '未対応',
    waiting: '返信待ち',
  };
  return labels[status];
}

function createFeedbackSummary(text: string, selectedType: FeedbackType): FeedbackSummary {
  const normalized = text.trim();
  const sentences = normalized.split(/[?.!???\n]+/).map((item) => item.trim()).filter(Boolean);
  const summary = sentences[0] || '\u307e\u3060\u8981\u7d04\u304c\u3042\u308a\u307e\u305b\u3093\u3002';
  return {
    detail: normalized || '\u8a73\u7d30\u306f\u672a\u5165\u529b\u3067\u3059\u3002',
    summary: summary.length > 90 ? summary.slice(0, 90) + '...' : summary,
    type: selectedType,
    urgency: detectFeedbackUrgency(normalized),
  };
}

function detectFeedbackUrgency(text: string): FeedbackUrgency {
  if (includesAny(text, ['\u52d5\u304b\u306a\u3044', '\u9001\u4fe1\u3067\u304d\u306a\u3044', '\u6d88\u3048\u305f', '\u4f7f\u3048\u306a\u3044', '\u91cd\u5927'])) return 'high';
  if (includesAny(text, ['\u5206\u304b\u308a\u306b\u304f\u3044', '\u898b\u3064\u3051\u306b\u304f\u3044', '\u6539\u5584', '\u4e0d\u5177\u5408'])) return 'medium';
  return 'low';
}

function feedbackTypeLabel(type: FeedbackType) {
  const labels: Record<FeedbackType, string> = {
    usability: '\u4f7f\u3044\u306b\u304f\u304b\u3063\u305f\u3068\u3053\u308d',
    improvement: '\u6539\u5584\u3057\u3066\u307b\u3057\u3044\u3068\u3053\u308d',
    bug: '\u4e0d\u5177\u5408\u5831\u544a',
    feature: '\u8ffd\u52a0\u3057\u3066\u307b\u3057\u3044\u6a5f\u80fd',
    other: '\u305d\u306e\u4ed6',
  };
  return labels[type];
}

function feedbackUrgencyLabel(urgency: FeedbackUrgency) {
  return urgency === 'high' ? '\u9ad8' : urgency === 'medium' ? '\u4e2d' : '\u4f4e';
}

function formatFeedbackEmailBody(summary: FeedbackSummary, originalText: string, senderName: string) {
  return [
    'MORNING FLOW AI\u306b\u30d5\u30a3\u30fc\u30c9\u30d0\u30c3\u30af\u304c\u5c4a\u304d\u307e\u3057\u305f\u3002',
    '',
    '\u25a0 \u8981\u7d04',
    summary.summary,
    '',
    '\u25a0 \u8a73\u7d30',
    summary.detail || originalText || '\u672a\u5165\u529b',
    '',
    '\u25a0 \u7a2e\u985e',
    feedbackTypeLabel(summary.type),
    '',
    '\u25a0 \u7dca\u6025\u5ea6',
    feedbackUrgencyLabel(summary.urgency),
    '',
    '\u25a0 \u9001\u4fe1\u65e5\u6642',
    new Date().toLocaleString('ja-JP'),
    '',
    '\u25a0 \u9001\u4fe1\u8005',
    senderName.trim() || '\u672a\u5165\u529b',
  ].join('\n');
}

function createFeedbackMailto(body: string) {
  const subject = '\u3010MORNING FLOW AI \u30d5\u30a3\u30fc\u30c9\u30d0\u30c3\u30af\u3011';
  return `mailto:eiichi0088@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

function formatAnalyticsFeatureLabel(feature: string) {
  const labels: Record<string, string> = {
    apple_calendar: 'Apple Calendar',
    feedback: 'Feedback',
    follow_up: 'Follow Up',
    google_calendar: 'Google Calendar',
    meal_to_shopping: '献立から買い物',
    meal_database: 'Meal Database',
    meal_database_match: 'Meal Database Match',
    meal_unknown_recipe: '未登録レシピ',
    meal_to_shopping_add: 'Meal Add',
    morning_flow: 'Morning Flow',
    shopping_list: '\u8cb7\u3044\u7269\u30ea\u30b9\u30c8',
  };
  return labels[feature] ?? feature;
}

function notifyFollowUpDueToday(item: FollowUpItem) {
  if (!('Notification' in window)) return;
  if (!isSameLocalDate(parseFollowUpDate(item.dueDate), new Date())) return;

  const show = () => {
    new Notification('MORNING FLOW AI \u672a\u8fd4\u4fe1\u30ea\u30de\u30a4\u30f3\u30c9', {
      body: formatFollowUpTitle(item) + ': ' + item.content,
    });
  };

  if (Notification.permission === 'granted') {
    show();
    return;
  }

  if (Notification.permission === 'default') {
    Notification.requestPermission().then((permission) => {
      if (permission === 'granted') show();
    });
  }
}

function isShareCancelError(error: unknown) {
  if (!(error instanceof DOMException || error instanceof Error)) return false;
  return error.name === 'AbortError' || /cancel|abort|キャンセル/i.test(error.message);
}

function preserveExistingPlan(previousPlan: MorningPlan, nextPlan: MorningPlan): MorningPlan {
  const schedule = dedupeSchedule(mergeSchedule(previousPlan.schedule, nextPlan.schedule));
  const todos = dedupeTodos(mergeStrings(previousPlan.todos, nextPlan.todos));
  const goals = mergeStrings(previousPlan.goals, nextPlan.goals);

  return {
    ...nextPlan,
    goals,
    todos,
    schedule,
    priorities: {
      highest: mergeStrings(previousPlan.priorities.highest, nextPlan.priorities.highest),
      important: mergeStrings(previousPlan.priorities.important, nextPlan.priorities.important),
      optional: mergeStrings(previousPlan.priorities.optional, nextPlan.priorities.optional),
    },
  };
}

function mergeSchedule(
  previousSchedule: MorningPlan['schedule'],
  nextSchedule: MorningPlan['schedule'],
) {
  const byKey = new Map<string, MorningPlan['schedule'][number]>();
  previousSchedule.forEach((item) => byKey.set(getScheduleKey(item), item));
  nextSchedule.forEach((item) => byKey.set(getScheduleKey(item), item));
  return Array.from(byKey.values());
}

function findNewScheduleKeys(previousPlan: MorningPlan, nextPlan: MorningPlan) {
  const previousKeys = new Set(previousPlan.schedule.map(getScheduleKey));
  return nextPlan.schedule.map(getScheduleKey).filter((key) => !previousKeys.has(key));
}

function getScheduleKey(item: MorningPlan['schedule'][number]) {
  return `${item.time.trim()}::${item.task.trim()}`;
}

function mergeStrings(previousItems: string[], nextItems: string[]) {
  return Array.from(new Set([...previousItems, ...nextItems].map((item) => item.trim()).filter(Boolean)));
}

function dedupeTodos(items: string[]) {
  const byKey = new Map<string, string>();
  items.forEach((item) => {
    const cleaned = cleanPlanningActionLabel(item);
    const key = normalizeTaskText(cleaned);
    if (!key || isPlanningLongNoise(cleaned)) return;
    const existing = byKey.get(key);
    if (!existing || cleaned.length < existing.length || getTopPriorityRank(cleaned) < getTopPriorityRank(existing)) {
      byKey.set(key, cleaned);
    }
  });
  return Array.from(byKey.values());
}

function dedupePlanningTodos(items: string[]) {
  return dedupeTodos(items);
}

function removeScheduleItemsCoveredBy(
  schedule: MorningPlan['schedule'],
  preferredSchedule: MorningPlan['schedule'],
) {
  const preferredTaskKeys = new Set(preferredSchedule.map((item) => normalizeTaskText(item.task)));
  return schedule.filter((item) => !preferredTaskKeys.has(normalizeTaskText(item.task)));
}

function dedupeSchedule(
  schedule: MorningPlan['schedule'],
  preferredSchedule: MorningPlan['schedule'] = [],
) {
  const preferredKeys = new Set(preferredSchedule.map((item) => getScheduleTaskKey(item.task)));
  const byTask = new Map<string, MorningPlan['schedule'][number]>();

  schedule.forEach((item) => {
    const task = cleanPlanningActionLabel(item.task);
    const taskKey = getScheduleTaskKey(task);
    if (!taskKey || isPlanningLongNoise(task)) return;

    const candidate = { ...item, task };
    const existing = byTask.get(taskKey);
    if (!existing || compareScheduleCandidate(candidate, existing, preferredKeys) < 0) {
      byTask.set(taskKey, candidate);
    }
  });

  const byExact = new Map<string, MorningPlan['schedule'][number]>();
  byTask.forEach((item) => byExact.set(getScheduleKey(item), item));
  return sortScheduleByTime(Array.from(byExact.values()));
}

function cleanScheduleItems(
  schedule: MorningPlan['schedule'],
  parserSchedule: MorningPlan['schedule'] = [],
  preferredSchedule: MorningPlan['schedule'] = parserSchedule,
) {
  const safeParserSchedule = dedupeParserSchedule(parserSchedule);
  const inferredParserSchedule = safeParserSchedule.length >= 2 ? safeParserSchedule : inferParserScheduleFromItems(schedule);
  const hasReliableParserSchedule = inferredParserSchedule.length >= 2;
  const parserKeys = new Set(inferredParserSchedule.map((item) => getScheduleTaskKey(item.task)));

  if (hasReliableParserSchedule) {
    return inferredParserSchedule;
  }

  const cleanedSchedule = schedule.filter((item) => {
    if (isLongScheduleCandidate(item, parserKeys, hasReliableParserSchedule)) return false;
    if (hasReliableParserSchedule && parserKeys.has(getScheduleTaskKey(item.task)) && !inferredParserSchedule.some((parserItem) => getScheduleKey(parserItem) === getScheduleKey(item))) {
      return false;
    }
    return true;
  });

  return dedupeSchedule(cleanedSchedule, preferredSchedule);
}

function dedupeParserSchedule(parserSchedule: MorningPlan['schedule']) {
  const byKey = new Map<string, MorningPlan['schedule'][number]>();
  parserSchedule.forEach((item) => {
    const task = cleanPlanningActionLabel(item.task);
    const time = item.time.trim();
    if (!task || !parseScheduleTime(time)) return;
    const nextItem = { ...item, task, time };
    const key = getScheduleKey(nextItem);
    byKey.set(key, nextItem);
  });
  return sortScheduleByTime(Array.from(byKey.values()));
}

function inferParserScheduleFromItems(schedule: MorningPlan['schedule']) {
  return dedupeParserSchedule(schedule.filter((item) => {
    const task = cleanPlanningActionLabel(item.task);
    if (!parseScheduleTime(item.time)) return false;
    if (isLongScheduleCandidate(item, new Set(), false)) return false;
    if (!task || task.length > 20) return false;
    return true;
  }));
}

function isLongScheduleCandidate(
  item: MorningPlan['schedule'][number],
  parserKeys: Set<string>,
  hasReliableParserSchedule: boolean,
) {
  const title = item.task.normalize('NFKC').trim();
  const compact = title.replace(/\s/g, '');
  const timeHits = (compact.match(/(?:午前|午後|朝|昼|夜)?\d{1,2}(?:時(?:半|\d{1,2}分?)?|:\d{2})/g) ?? []).length;
  if (compact.length >= 20) return true;
  if (timeHits >= 2) return true;
  if (/^(明日は|明日|今日は|今日)/.test(compact) && compact.length >= 18) return true;
  if (hasReliableParserSchedule && parserKeys.has(getScheduleTaskKey(title)) && compact.length >= 18) return true;
  return false;
}

function getScheduleTaskKey(task: string) {
  return normalizeTaskText(task);
}

function compareScheduleCandidate(
  nextItem: MorningPlan['schedule'][number],
  currentItem: MorningPlan['schedule'][number],
  preferredKeys: Set<string>,
) {
  const nextPreferred = preferredKeys.has(getScheduleTaskKey(nextItem.task));
  const currentPreferred = preferredKeys.has(getScheduleTaskKey(currentItem.task));
  if (nextPreferred !== currentPreferred) return nextPreferred ? -1 : 1;

  const nextIsLikelyWrongDefault = isLikelyWrongDefaultEight(nextItem);
  const currentIsLikelyWrongDefault = isLikelyWrongDefaultEight(currentItem);
  if (nextIsLikelyWrongDefault !== currentIsLikelyWrongDefault) return nextIsLikelyWrongDefault ? 1 : -1;

  const nextHasConcreteTime = parseScheduleTime(nextItem.time) !== null;
  const currentHasConcreteTime = parseScheduleTime(currentItem.time) !== null;
  if (nextHasConcreteTime !== currentHasConcreteTime) return nextHasConcreteTime ? -1 : 1;

  return nextItem.task.length - currentItem.task.length;
}

function isLikelyWrongDefaultEight(item: MorningPlan['schedule'][number]) {
  const minutes = getScheduleStartMinutes(item.time);
  return minutes === 8 * 60 && !/起床|起きる/.test(item.task);
}

function sortScheduleByTime(schedule: MorningPlan['schedule']) {
  return [...schedule].sort((a, b) => getScheduleStartMinutes(a.time) - getScheduleStartMinutes(b.time));
}

function prepareUnifiedMorningPlan(plan: MorningPlan, sourceText: string, shoppingItems: ShoppingItem[]): MorningPlan {
  const shoppingNames = new Set(shoppingItems.map((item) => normalizeTaskText(item.name)));
  const extractedActions = extractScheduleActionsFromUnifiedInput(sourceText);
  const extractedSchedule = extractDatedScheduleItems(sourceText);
  const parsedSchedule = parseScheduleSegments(sourceText);
  const fullCapture = createFullCapturePlanItems(sourceText);
  const preferredSchedule = dedupeSchedule([...parsedSchedule, ...fullCapture.schedule], parsedSchedule);
  const futureTaskNames = new Set([...extractedSchedule, ...parsedSchedule].map((item) => normalizeTaskText(item.task)));
  const hasShoppingAction = hasShoppingActionIntent(sourceText);
  const hasShoppingItems = hasShoppingItemIntent(sourceText) && extractShoppingItemsFromUnifiedInput(sourceText).length > 0;
  const shouldAddShoppingAction = hasShoppingAction || hasShoppingItems;
  const shoppingAction = shouldAddShoppingAction ? ['買い物へ行く'] : [];
  const shoppingSchedule = shouldAddShoppingAction ? [{ time: '時間調整', task: '買い物へ行く' }] : [];
  const isShoppingText = (value: string) =>
    !isFoodEventText(value) &&
    (isGeneratedShoppingSupportTask(value) ||
      isShoppingItemText(value) ||
      shoppingItems.some((item) => normalizeTaskText(value).includes(normalizeTaskText(item.name))));
  const isFutureTaskText = (value: string) =>
    Array.from(futureTaskNames).some((task) => task && normalizeTaskText(value).includes(task));

  const nextPlan = {
    ...plan,
    todos: dedupeTodos(
      mergeStrings(
        [
          ...plan.todos.filter((todo) => !isShoppingText(todo) && !isFutureTaskText(todo)),
          ...extractedActions,
          ...parsedSchedule.map((item) => item.task),
          ...fullCapture.todos,
          ...shoppingAction,
        ],
        [],
      ),
    ),
    schedule: cleanScheduleItems(
      filterUnconfirmedDefaultScheduleTimes(
        mergeSchedule(
          removeScheduleItemsCoveredBy(
            plan.schedule.filter((item) => !isShoppingText(item.task) && !isFutureTaskText(item.task)),
            preferredSchedule,
          ),
          mergeSchedule(
            removeScheduleItemsCoveredBy(extractedSchedule, preferredSchedule),
            mergeSchedule(preferredSchedule, shoppingSchedule),
          ),
        ),
        sourceText,
      ),
      parsedSchedule,
      preferredSchedule,
    ),
    priorities: {
      highest: plan.priorities.highest.filter((item) => !isShoppingText(item) && !isFutureTaskText(item)),
      important: plan.priorities.important.filter((item) => !isShoppingText(item) && !isFutureTaskText(item)),
      optional: plan.priorities.optional.filter((item) => !isShoppingText(item) && !isFutureTaskText(item)),
    },
    categories: {
      work: plan.categories.work.filter((item) => !isShoppingText(item) && !shoppingNames.has(normalizeTaskText(item))),
      health: plan.categories.health.filter((item) => !isShoppingText(item) && !shoppingNames.has(normalizeTaskText(item))),
      family: plan.categories.family.filter((item) => !isShoppingText(item) && !shoppingNames.has(normalizeTaskText(item))),
      learning: plan.categories.learning.filter((item) => !isShoppingText(item) && !shoppingNames.has(normalizeTaskText(item))),
    },
    advice: plan.advice.filter((item) => !isGeneratedShoppingSupportTask(item)),
    coach: {
      ...plan.coach,
      successConditions: plan.coach.successConditions.filter((item) => !isGeneratedShoppingSupportTask(item)),
    },
  };

  console.info('[MORNING FLOW AI] Schedule Cleanup Safety', {
    cleanedSchedule: nextPlan.schedule,
    parserSchedule: parsedSchedule,
    preferredSchedule,
  });

  return {
    ...nextPlan,
    todos: dedupeTodos(nextPlan.todos),
    schedule: cleanScheduleItems(nextPlan.schedule, parsedSchedule, preferredSchedule),
  };
}

function filterUnconfirmedDefaultScheduleTimes(schedule: MorningPlan['schedule'], sourceText: string) {
  const normalizedSource = normalizeJapaneseDateText(sourceText);
  return schedule.filter((item) => {
    const normalizedTime = item.time.trim();
    const isDefaultNine = normalizedTime === '09:00' || normalizedTime === '9:00' || normalizedTime === '9時' || normalizedTime === '09時';
    if (!isDefaultNine) return true;
    return /\b0?9(?::00)?\b|0?9時/.test(normalizedSource);
  });
}

function parseScheduleSegments(sourceText: string): MorningPlan['schedule'] {
  const normalized = sourceText.normalize('NFKC').replace(/[，,]/g, '、');
  const defaultDatePrefix = getFullCaptureDefaultDatePrefix(normalized);
  const timePattern = /(?:明後日|明日|今日)?(?:午前|午後|朝|昼|夜)?\s*\d{1,2}(?:時(?:半|\d{1,2}分?)?|:\d{2})/g;
  const matches = Array.from(normalized.matchAll(timePattern));
  const schedule: MorningPlan['schedule'] = [];
  let lastTime = '';

  matches.forEach((match, index) => {
    if (match.index === undefined) return;
    const rawTime = match[0];
    const parsedTime = parseJapaneseScheduleTime(rawTime);
    if (!parsedTime) return;

    const start = match.index + rawTime.length;
    const end = matches[index + 1]?.index ?? normalized.length;
    const segmentBody = normalized.slice(start, end);
    const time = applyFullCaptureDefaultDatePrefix(parsedTime, defaultDatePrefix);
    const { primary, after } = splitScheduleSegmentAction(segmentBody);
    const title = createScheduleParserActionTitle(primary);

    if (title) {
      schedule.push({ time, task: title });
      lastTime = time;
    }

    const afterTitle = createScheduleParserActionTitle(after);
    if (afterTitle && lastTime) {
      const nextTime = nextFullCaptureTime(lastTime);
      if (nextTime) {
        schedule.push({ time: nextTime, task: afterTitle });
        lastTime = nextTime;
      }
    }
  });

  return dedupeSchedule(schedule, schedule);
}

function parseJapaneseScheduleTime(rawTime: string) {
  const normalized = normalizeJapaneseDateText(rawTime.normalize('NFKC'));
  const match = normalized.match(/(?:(明後日|明日|今日))?(午前|午後|朝|昼|夜)?(\d{1,2})(?:時(半|\d{1,2}分?)?|:(\d{2}))/);
  if (!match) return '';

  const datePrefix = match[1] ? `${match[1]} ` : '';
  const period = match[2] ?? '';
  let hour = Number(match[3]);
  const minuteText = match[4] ?? match[5] ?? '';
  const minute = minuteText === '半' ? 30 : Number(minuteText.replace('分', '') || 0);

  if (period === '午後' && hour < 12) hour += 12;
  if (period === '夜' && hour < 12) hour += 12;
  if (period === '昼' && hour < 12) hour += 12;
  if (period === '午前' && hour === 12) hour = 0;

  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return '';
  return `${datePrefix}${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

function splitScheduleSegmentAction(segmentBody: string) {
  const cleaned = segmentBody
    .replace(/^[\s、。]+/, '')
    .replace(/^(?:には|に|から|まで)/, '')
    .replace(/^[\s、。]+/, '')
    .trim();
  const [primary = '', ...afterParts] = cleaned.split(/(?:、|。)?(?:その後|そのあと|それから|続いて)/);
  return {
    primary,
    after: afterParts.join('、'),
  };
}

function createScheduleParserActionTitle(value: string) {
  const compact = value
    .replace(/^[\s、。]+/, '')
    .replace(/^(?:には|に|から|まで)/, '')
    .replace(/^[\s、。]+/, '')
    .replace(/[、。]+$/g, '')
    .replace(/して$/, '')
    .replace(/する$/, '')
    .replace(/行って$/, '行く')
    .replace(/起きて$/, '起床')
    .trim();
  if (!compact) return '';

  const extractedActions = extractFullCaptureActions(compact);
  if (extractedActions.length) return extractedActions[0];
  return cleanPlanningActionLabel(compact);
}

function createFullCapturePlanItems(sourceText: string): { schedule: MorningPlan['schedule']; todos: string[] } {
  const segments = splitFullCaptureSegments(sourceText);
  const schedule: MorningPlan['schedule'] = [];
  const todos: string[] = [];
  const defaultDatePrefix = getFullCaptureDefaultDatePrefix(sourceText);
  let lastTime = '';

  segments.forEach((segment) => {
    const time = applyFullCaptureDefaultDatePrefix(extractFullCaptureTime(segment), defaultDatePrefix);
    const actions = extractFullCaptureActions(segment);
    const effectiveTime = time || (lastTime && (hasSequentialTimeCue(segment) || actions.length) ? nextFullCaptureTime(lastTime) : '');
    if (time) lastTime = time;

    actions.forEach((action) => {
      if (!action || isShoppingItemText(action)) return;
      todos.push(action);
      if (effectiveTime) {
        schedule.push({ time: effectiveTime, task: action });
        if (!time) lastTime = effectiveTime;
      }
    });
  });

  return {
    schedule: dedupeFullCaptureSchedule(schedule),
    todos: dedupePlanningTodos(todos),
  };
}

function getFullCaptureDefaultDatePrefix(sourceText: string) {
  const normalized = normalizeJapaneseDateText(sourceText);
  if (/明後日/.test(normalized)) return '明後日';
  if (/明日/.test(normalized)) return '明日';
  if (/今日/.test(normalized)) return '今日';
  return '';
}

function applyFullCaptureDefaultDatePrefix(time: string, defaultDatePrefix: string) {
  if (!time || !defaultDatePrefix || /^(明後日|明日|今日)\s/.test(time)) return time;
  return `${defaultDatePrefix} ${time}`;
}

function splitFullCaptureSegments(sourceText: string) {
  return sourceText
    .replace(/そして|それから|そのあと|その後/g, '。')
    .replace(/([^\s。！？\n\r、])((?:明後日|明日|今日)?\d{1,2}(?:時|:))/g, '$1。$2')
    .split(/[。！？\n\r、]+/)
    .map((segment) => segment.trim())
    .filter(Boolean)
    .flatMap((segment) => splitSegmentByFullCaptureConnector(segment));
}

function splitSegmentByFullCaptureConnector(segment: string) {
  return segment
    .split(/(?:して|行って|触って|作成して|炊いて)(?=[^、。！？\n\r]*?(?:する|行く|開店|閉店|休憩|準備|作成|炊く|触る|起きる|戻る|ジム))/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function extractFullCaptureTime(segment: string) {
  const normalized = normalizeJapaneseDateText(segment);
  const match = normalized.match(/(?:(明後日|明日|今日))?(\d{1,2})(?:時|:)(半|\d{2})?/);
  if (!match) return '';

  const datePrefix = match[1] ? `${match[1]} ` : '';
  const hour = Number(match[2]);
  const minute = match[3] === '半' ? 30 : Number(match[3] ?? 0);
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return '';
  return `${datePrefix}${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

function hasSequentialTimeCue(segment: string) {
  return /その後|そのあと|それから|続いて/.test(segment);
}

function nextFullCaptureTime(previousTime: string) {
  const match = previousTime.match(/^(?:(明後日|明日|今日)\s*)?(\d{2}):(\d{2})$/);
  if (!match) return '';
  const prefix = match[1] ? `${match[1]} ` : '';
  const minutes = Number(match[2]) * 60 + Number(match[3]) + 30;
  const hour = Math.floor(minutes / 60) % 24;
  const minute = minutes % 60;
  return `${prefix}${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

function extractFullCaptureActions(segment: string) {
  const cleaned = segment
    .replace(/^(明日は|明日|今日は|今日|その後|そのあと|それから|そして)/, '')
    .replace(/\d{1,2}(?:時|:)(?:半|\d{2})?(?:には|に|から|まで)?/g, '')
    .replace(/1時間ほど|少し|ほど/g, '')
    .trim();
  const actions: string[] = [];

  if (/起き|起床/.test(cleaned)) actions.push('起床');
  if (/パソコン.*触|PC.*触/.test(cleaned)) actions.push('パソコンを触る');
  if (/アプリ.*(作成|作る|開発)/.test(cleaned)) actions.push('アプリ作成');
  if (/店へ行|店に行|お店へ行|お店に行/.test(cleaned)) actions.push('店へ行く');
  if (/オープン準備|開店準備/.test(cleaned)) actions.push('オープン準備');
  if (/チャーシュー.*(炊|作)/.test(cleaned)) actions.push('チャーシューを炊く');
  if (/休憩/.test(cleaned)) actions.push(/まで/.test(segment) ? '店へ戻る' : '休憩');
  if (/開店/.test(cleaned)) actions.push('開店');
  if (/閉店/.test(cleaned)) actions.push('閉店');
  if (/ジム.*行/.test(cleaned)) actions.push('ジムへ行く');
  if (/銀行.*行/.test(cleaned)) actions.push('銀行へ行く');
  if (/Instagram|インスタ/.test(cleaned)) actions.push('Instagram投稿');

  const fallback = normalizeFullCaptureAction(cleaned);
  if (!actions.length && fallback && isFullCaptureActionText(fallback)) actions.push(fallback);
  return Array.from(new Set(actions));
}

function normalizeFullCaptureAction(value: string) {
  return value
    .replace(/^(には|に|から|まで|は|を|が|へ)/, '')
    .trim();
}

function isFullCaptureActionText(value: string) {
  return /(行く|作成|作る|触る|準備|炊く|休憩|開店|閉店|起床|起きる|戻る|投稿|電話|確認)/.test(value);
}

function dedupeFullCaptureSchedule(schedule: MorningPlan['schedule']) {
  const seen = new Set<string>();
  return schedule.filter((item) => {
    const key = getScheduleKey(item);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function createMorningFollowUpCandidates(plan: MorningPlan, existingFollowUps: FollowUpItem[]): FollowUpDraftItem[] {
  const sourceTexts = [
    ...plan.todos,
    ...plan.schedule.map((item) => item.task),
  ]
    .map((item) => item.trim())
    .filter(Boolean)
    .filter(detectFollowUpIntent);
  const existingKeys = new Set(existingFollowUps.map(createFollowUpDedupeKey));
  const seenKeys = new Set<string>();

  return sourceTexts
    .map((text) => createVoiceFollowUp(text))
    .filter((item): item is FollowUpItem => Boolean(item))
    .filter((item) => {
      const key = createFollowUpDedupeKey(item);
      if (existingKeys.has(key) || seenKeys.has(key)) return false;
      seenKeys.add(key);
      return true;
    })
    .map((item) => ({
      company: item.company,
      content: item.content,
      dueDate: item.dueDate,
      duePreset: item.duePreset,
      dueTime: item.dueTime,
      id: createLocalId('morning-follow-up-candidate'),
      kind: item.kind,
      name: item.name,
      originalPerson: findFollowUpPersonMatch(item.name + 'に' + item.content)?.originalPerson ?? item.name,
      priority: item.priority,
      source: 'voice',
      status: item.status ?? 'pending',
    }));
}

function mergeShoppingPlans(aiItems: ShoppingItem[], localItems: ShoppingItem[]) {
  const byName = new Map<string, ShoppingItem>();
  [...aiItems, ...localItems].forEach((item) => {
    const key = normalizeTaskText(item.name);
    if (!key) return;
    const existing = byName.get(key);
    if (existing) {
      if (!existing.quantity && item.quantity) existing.quantity = item.quantity;
      return;
    }
    byName.set(key, item);
  });
  return Array.from(byName.values());
}

function normalizeMorningShoppingItems(text: string, aiItems: ShoppingItem[], currentItems: ShoppingItem[]) {
  const localItems = extractShoppingItemsFromUnifiedInput(text);
  const directItems = extractDirectJapaneseShoppingItems(text);
  return mergeShoppingPlans(mergeShoppingPlans(currentItems, aiItems), mergeShoppingPlans(localItems, directItems));
}

function extractShoppingItemsFromUnifiedInput(text: string): ShoppingItem[] {
  const directItems = extractDirectJapaneseShoppingItems(text);
  const normalized = normalizeJapaneseDateText(text)
    .replace(/帰りに/g, '')
    .replace(/を買う/g, '、')
    .replace(/買う/g, '、')
    .replace(/買って/g, '、')
    .replace(/と/g, '、');
  const candidates = normalized
    .split(/[、。,.]/)
    .map((item) => item.trim())
    .filter(Boolean)
    .filter((item) => !isFoodEventText(item))
    .filter((item) => !isScheduleActionText(item))
    .filter((item) => isShoppingItemText(item));

  const extractedItems = candidates.map((candidate) => {
    const parsed = parseShoppingItemInput(candidate);
    const name = parsed.name || candidate;
    return {
      id: createLocalShoppingItemId(name),
      name,
      quantity: parsed.quantity,
      category: classifyShoppingItem(name),
      completed: false,
      addedAt: new Date().toISOString(),
    };
  });
  return mergeShoppingPlans(directItems, extractedItems);
}

function extractDirectJapaneseShoppingItems(text: string): ShoppingItem[] {
  if (!hasDirectJapaneseShoppingIntent(text)) return [];

  const items: ShoppingItem[] = [];
  const consumedRanges: Array<[number, number]> = [];
  const quantityPattern =
    /([一-龥ぁ-んァ-ヶーA-Za-z]+?)\s*([0-9０-９一二三四五六七八九十]+)\s*(本|丁|個|つ|パック|袋|箱|枚|束|玉|缶|瓶|杯|斤|g|G|グラム|kg|KG|キロ|ml|mL|ML|L|リットル)/g;
  let match: RegExpExecArray | null;
  while ((match = quantityPattern.exec(text))) {
    const name = cleanDirectShoppingItemName(match[1]);
    const quantity = normalizeDirectShoppingQuantity(`${match[2]}${match[3]}`);
    if (!name) continue;
    items.push(createDirectShoppingItem(name, quantity));
    consumedRanges.push([match.index, match.index + match[0].length]);
  }

  const remainingText = consumedRanges
    .reduce((current, [start, end]) => `${current.slice(0, start)}${' '.repeat(end - start)}${current.slice(end)}`, text)
    .replace(/今日は|今日の買い物|今日買うもの|買うもの|買います|買う|購入|買って|買い物|スーパー|ドラッグストア|コンビニ/g, '、');

  remainingText
    .split(/[、。,.，\n\r\s]+|と/)
    .map(cleanDirectShoppingItemName)
    .filter(Boolean)
    .forEach((name) => items.push(createDirectShoppingItem(name, '')));

  return dedupeDirectShoppingItems(items);
}

function hasDirectJapaneseShoppingIntent(text: string) {
  return /買い物|買う|買います|買って|購入|今日買うもの|買うもの|スーパー|ドラッグストア|コンビニ/.test(text);
}

function cleanDirectShoppingItemName(value: string) {
  return value
    .replace(/^(今日は|今日|の|は|を|が|に|へ|で|と)+/, '')
    .replace(/(を|が|は|も|です|で|お願いします|ください)$/, '')
    .trim();
}

function normalizeDirectShoppingQuantity(value: string) {
  return value.replace(/[０-９]/g, (char) => String.fromCharCode(char.charCodeAt(0) - 0xfee0)).trim();
}

function createDirectShoppingItem(name: string, quantity: string): ShoppingItem {
  return {
    addedAt: new Date().toISOString(),
    category: classifyShoppingItem(name),
    completed: false,
    id: createLocalShoppingItemId(name),
    name,
    quantity,
    source: 'manual',
  };
}

function dedupeDirectShoppingItems(items: ShoppingItem[]) {
  const byName = new Map<string, ShoppingItem>();
  items.forEach((item) => {
    const key = normalizeTaskText(item.name);
    if (!key || isShoppingMetaOrDirectNoise(item.name)) return;
    const existing = byName.get(key);
    if (existing) {
      if (!existing.quantity && item.quantity) existing.quantity = item.quantity;
      return;
    }
    byName.set(key, item);
  });
  return Array.from(byName.values());
}

function isShoppingMetaOrDirectNoise(text: string) {
  return /^(今日|今日は|今日の|買い物|買う|買います|購入|もの|リスト|スーパー|ドラッグストア|コンビニ)$/.test(text);
}

function extractScheduleActionsFromUnifiedInput(text: string) {
  const actions = normalizeJapaneseDateText(text)
    .replace(/今日は/g, '')
    .split(/[、。,.]|そして|それから/)
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => item.replace(/^(帰りに|その後|あとで)/, '').trim())
    .filter((item) => isScheduleActionText(item))
    .filter((item) => !isFutureDatedText(item, new Date()))
    .map(normalizeScheduleActionText);

  if (/買う|買って|購入/.test(text) && !actions.some((item) => item.includes('買い物'))) {
    actions.push('買い物へ行く');
  }

  return Array.from(new Set(actions));
}

function hasShoppingActionIntent(text: string) {
  if (/買い物.*(行く|行きます|行って|行こう)|スーパー.*(行く|行きます|行って|行こう)/.test(text)) return true;
  return /(買い物|スーパー|店|ドラッグストア|コンビニ|市場).*(行く|寄る|行って|寄って)|(?:行く|寄る).*(買い物|スーパー|店|ドラッグストア|コンビニ|市場)/.test(text);
}

function hasShoppingItemIntent(text: string) {
  if (hasDirectJapaneseShoppingIntent(text)) return true;
  return /(今日買うもの|買うもの|買い物リスト|買って|買う|購入|スーパーで|店で|ドラッグストアで|コンビニで)/.test(text);
}

function isFoodEventText(text: string) {
  const normalized = normalizeTaskText(text);
  return (
    hasScheduleTimeText(normalized) ||
    /(食べる|食べに行く|食事|食事する|ランチ|昼食|夕食|朝食|朝ごはん|昼ごはん|夜ごはん|晩ごはん|外食|焼肉に行く|ラーメンを食べる)/.test(normalized)
  );
}

function hasScheduleTimeText(text: string) {
  return /(\d{1,2})(?::\d{2}|時(?:\d{1,2}分?|半)?)/.test(text);
}

function isGeneratedShoppingSupportTask(text: string) {
  const normalized = normalizeTaskText(text);
  if (!normalized) return false;

  return (
    /買い物リスト.*(確認|チェック|整理|見直|作成|準備)/.test(normalized) ||
    /食材.*(冷蔵|冷凍|保存|整理|仕分|下処理|片付)/.test(normalized) ||
    /買った.*(食材|もの|物).*(整理|保存|片付|冷蔵|冷凍)/.test(normalized) ||
    /購入品.*(整理|保存|片付|確認)/.test(normalized)
  );
}

function extractDatedScheduleItems(text: string): MorningPlan['schedule'] {
  const normalized = normalizeJapaneseDateText(text);
  const explicitDateTime = normalized.match(/(\d{1,2}月\d{1,2}日)\s*(\d{1,2}(?::\d{2}|時(?:\d{1,2}分?)?))\s*(?:から)?(.+)/);
  if (explicitDateTime) {
    return [
      {
        time: `${explicitDateTime[1]} ${explicitDateTime[2]}`,
        task: normalizeScheduleActionText(explicitDateTime[3]),
      },
    ];
  }

  const todayTime = normalized.match(/(\d{1,2}(?::\d{2}|時(?:\d{1,2}分?|半)?))\s*(?:から|に)?(.+)/);
  if (!todayTime || !isScheduleActionText(todayTime[2])) return [];

  return [
    {
      time: todayTime[1],
      task: normalizeScheduleActionText(todayTime[2]),
    },
  ];
}

function isScheduleActionText(text: string) {
  return /(行く|迎え|会う|会議|仕事|病院|銀行|ジム|電話|支払い|送迎|予約|面談|打ち合わせ|食べる|食事|ランチ|昼食|夕食|朝食|朝ごはん|昼ごはん|夜ごはん|晩ごはん|外食)/.test(text);
}

function isShoppingItemText(text: string) {
  return /(ネギ|ねぎ|玉ねぎ|玉葱|歯ブラシ|牛乳|卵|洗剤|ティッシュ|ラップ|お菓子|水|キロ|kg|g|本|個|袋|買う|購入)/.test(text);
}

function normalizeScheduleActionText(text: string) {
  return text
    .replace(/^今日は/, '')
    .replace(/^\d{1,2}(?::\d{2}|時(?:\d{1,2}分?|半)?)\s*(?:から|に)?/, '')
    .replace(/^(から|に|へ|を|帰りに)/, '')
    .replace(/行って$/, '行く')
    .replace(/を?買う.*$/, '')
    .replace(/へ$/, 'へ行く')
    .trim();
}

function createLocalShoppingItemId(name: string) {
  return `shopping-local-${normalizeTaskText(name)}-${Date.now()}`;
}

function createMealIngredientCandidates(text: string, servings: number): MealIngredientCandidate[] {
  return createMealPlanCandidateResult(text, servings).candidates;
}

function createMealPlanCandidateResult(text: string, servings: number): { candidates: MealIngredientCandidate[]; debug: MealPlanDebug } {
  const extractedMeals = extractMealNames(text);
  const normalizedMeals = extractedMeals.map(normalizeMealName);
  const multiplier = Math.max(1, servings) / 4;
  const matchedMeals: string[] = [];
  const seenIngredients = new Set<string>();
  const candidates: MealIngredientCandidate[] = [];

  normalizedMeals.forEach((meal, mealIndex) => {
    const match = findRecipeMatch(meal);
    if (!match) return;
    matchedMeals.push(match.name);

    match.recipe.ingredients.forEach((ingredient) => {
      const normalizedIngredient = normalizeTaskText(ingredient);
      if (seenIngredients.has(normalizedIngredient)) return;
      seenIngredients.add(normalizedIngredient);
      candidates.push({
      category: classifyShoppingItem(ingredient),
      id: createLocalId('meal-candidate'),
        meal: extractedMeals[mealIndex] ?? meal,
      name: ingredient,
      quantity: scaleMealQuantity(estimateIngredientQuantity(ingredient), multiplier),
      });
    });
  });

  return {
    candidates,
    debug: {
      candidateCount: candidates.length,
      extracted: extractedMeals,
      isUnknown: candidates.length === 0,
      matched: matchedMeals,
      normalized: normalizedMeals,
    },
  };
}

function extractMealNames(text: string) {
  if (text.includes('\u30e9\u30b6\u30cb\u30a2')) return ['\u30e9\u30b6\u30cb\u30a2'];
  if (text.includes('\u305f\u3089\u3053\u30b9\u30d1\u30b2\u30c6\u30a3') || text.includes('\u305f\u3089\u3053\u30d1\u30b9\u30bf')) {
    return ['\u305f\u3089\u3053\u30b9\u30d1\u30b2\u30c6\u30a3'];
  }

  const removePhrases = [
    '\u4eca\u65e5\u306e\u591c\u3054\u98ef\u306f',
    '\u4eca\u65e5\u306e\u6669\u3054\u98ef\u306f',
    '\u4eca\u65e5\u306e\u591c\u306f',
    '\u4eca\u65e5',
    '\u4eca\u591c\u306f',
    '\u591c\u3054\u98ef\u306f',
    '\u3054\u98ef\u306f',
    '\u6669\u3054\u98ef\u306f',
    '\u5915\u98ef\u306f',
    '\u660e\u65e5\u306f',
    '\u4f5c\u308b',
    '\u4f5c\u308a\u307e\u3059',
    '\u4f5c\u308a\u305f\u3044',
    '\u306b\u3057\u307e\u3059',
    '\u306b\u3057\u305f\u3044',
    '\u98df\u3079\u305f\u3044',
    '\u732e\u7acb',
    '\u6599\u7406',
  ];
  const knownMeal = removePhrases.reduce((current, phrase) => current.replaceAll(phrase, ''), text).trim();

  return knownMeal
    .split(/[\u3001,\u3068]/)
    .map((meal) => meal.trim())
    .filter((meal) => meal.length >= 2)
    .slice(0, 3);
}

function normalizeMealName(meal: string) {
  const compact = meal.replace(/\s/g, '').replace(/\u3000/g, '');
  if (compact.includes('\u3089\u3056\u306b\u3042') || compact.includes('\u30e9\u30b6\u30cb\u30a2')) return '\u30e9\u30b6\u30cb\u30a2';
  if (
    compact.includes('\u305f\u3089\u3053\u30b9\u30d1\u30b2\u30c6\u30a3') ||
    compact.includes('\u305f\u3089\u3053\u30d1\u30b9\u30bf') ||
    compact.includes('\u660e\u592a\u5b50\u30d1\u30b9\u30bf')
  ) {
    return '\u305f\u3089\u3053\u30b9\u30d1\u30b2\u30c6\u30a3';
  }
  if (compact.includes('\u30ab\u30ec\u30fc\u30e9\u30a4\u30b9') || compact.includes('\u30ab\u30ec\u30fc')) return '\u30ab\u30ec\u30fc';
  if (compact.includes('\u91ce\u83dc\u30b5\u30e9\u30c0') || compact.includes('\u30b5\u30e9\u30c0')) return '\u30b5\u30e9\u30c0';
  return compact;
}

function estimateIngredientQuantity(name: string) {
  if (includesAny(name, ['\u8089', '\u3072\u304d\u8089', '\u9d8f', '\u8c5a', '\u725b', '\u9b5a', '\u9bad', '\u3082\u3064'])) return '300g';
  if (includesAny(name, ['\u30d1\u30b9\u30bf', '\u30b9\u30d1\u30b2\u30c6\u30a3', '\u9eba', '\u30de\u30ab\u30ed\u30cb'])) return '400g';
  if (includesAny(name, ['\u725b\u4e73', '\u751f\u30af\u30ea\u30fc\u30e0', '\u30c8\u30de\u30c8\u7f36', '\u30db\u30ef\u30a4\u30c8\u30bd\u30fc\u30b9', '\u934b\u3064\u3086'])) return '1\u500b';
  if (includesAny(name, ['\u5375'])) return '4\u500b';
  if (includesAny(name, ['\u7389\u306d\u304e', '\u306b\u3093\u3058\u3093', '\u3058\u3083\u304c\u3044\u3082', '\u30c8\u30de\u30c8', '\u304d\u3085\u3046\u308a', '\u306d\u304e', '\u9577\u306d\u304e', '\u5927\u8449'])) return '2\u500b';
  if (includesAny(name, ['\u767d\u83dc', '\u30ad\u30e3\u30d9\u30c4', '\u30ec\u30bf\u30b9'])) return '1/2\u500b';
  if (includesAny(name, ['\u30c1\u30fc\u30ba', '\u30d0\u30bf\u30fc', '\u305f\u3089\u3053'])) return '100g';
  if (includesAny(name, ['\u91a4\u6cb9', '\u307f\u308a\u3093', '\u9152', '\u7802\u7cd6', '\u5869', '\u3053\u3057\u3087\u3046', '\u5473\u564c', '\u6cb9', '\u3054\u307e\u6cb9', '\u30aa\u30ea\u30fc\u30d6\u30aa\u30a4\u30eb', '\u3060\u3057', '\u30bd\u30fc\u30b9', '\u30b1\u30c1\u30e3\u30c3\u30d7'])) return '\u9069\u91cf';
  return '1\u500b';
}

function scaleMealQuantity(quantity: string, multiplier: number) {
  if (quantity.includes('\u9069\u91cf') || quantity.includes('\u5c11\u3005') || quantity.includes('\u5fc5\u8981\u5206')) return quantity;
  return quantity.replace(/^(\d+(?:\.\d+)?)(.*)$/, (_match, amount, unit) => {
    const scaled = Number(amount) * multiplier;
    const rounded = Number.isInteger(scaled) ? String(scaled) : String(Math.round(scaled * 10) / 10);
    return rounded + unit;
  });
}

function formatMealCandidateLabel(candidate: Pick<MealIngredientCandidate, 'name' | 'quantity'>) {
  return [candidate.name, candidate.quantity].filter(Boolean).join(' ');
}

function mergeMealCandidatesIntoShoppingItems(
  currentItems: ShoppingItem[],
  candidates: MealIngredientCandidate[],
): ShoppingItem[] {
  const existingNames = new Set(currentItems.map((item) => normalizeTaskText(item.name)));
  const nextItems = [...currentItems];

  candidates.forEach((candidate) => {
    const normalized = normalizeTaskText(candidate.name);
    if (!normalized || existingNames.has(normalized)) return;

    existingNames.add(normalized);
    nextItems.push({
      addedAt: new Date().toISOString(),
      category: candidate.category,
      completed: false,
      id: createLocalShoppingItemId(candidate.name),
      name: candidate.name,
      quantity: candidate.quantity,
      source: 'meal_plan',
    });
  });

  return groupShoppingItems(nextItems).flatMap((group) => group.items);
}

function detectMealPlanIntent(text: string) {
  if (detectExplicitShoppingIntent(text)) return false;
  return includesAny(text, [
    '\u4eca\u65e5\u306e\u591c\u3054\u98ef',
    '\u4eca\u65e5\u306e\u6669\u3054\u98ef',
    '\u5915\u98ef',
    '\u6669\u3054\u98ef',
    '\u4eca\u591c',
    '\u591c\u3054\u98ef',
    '\u3054\u98ef\u306f',
    '\u4f5c\u308b',
    '\u4f5c\u308a\u307e\u3059',
    '\u306b\u3057\u307e\u3059',
    '\u98df\u3079\u305f\u3044',
    '\u732e\u7acb',
  ]);
}

function detectExplicitShoppingIntent(text: string) {
  return includesAny(text, [
    '\u8cb7\u3046',
    '\u8cb7\u3044\u307e\u3059',
    '\u8cb7\u3044\u305f\u3044',
    '\u8cfc\u5165',
    '\u51b7\u51cd',
    '\u306e\u7d20',
  ]);
}

function isSameLocalDate(date: Date, baseDate: Date) {
  return startOfLocalDay(date).getTime() === startOfLocalDay(baseDate).getTime();
}

function isFutureLocalDate(date: Date, baseDate: Date) {
  return startOfLocalDay(date).getTime() > startOfLocalDay(baseDate).getTime();
}

function isFutureDatedText(text: string, baseDate: Date) {
  return isFutureLocalDate(parseScheduleDate(text, baseDate), baseDate);
}

function getScheduleStartMinutes(timeText: string) {
  return parseScheduleTime(timeText)?.startMinutes ?? Number.MAX_SAFE_INTEGER;
}

function createCalendarEvents(plan: MorningPlan): CalendarEvent[] {
  const today = new Date();
  today.setSeconds(0, 0);

  return cleanScheduleItems(plan.schedule)
    .map((item, index) => {
      const range = parseScheduleTime(item.time);
      if (!range) return null;
      const fallbackStartMinutes = 9 * 60 + index * 60;
      const startMinutes = range?.startMinutes ?? fallbackStartMinutes;
      const targetDate = parseScheduleDate(`${item.time} ${item.task}`, today);

      const start = new Date(targetDate);
      start.setHours(Math.floor(startMinutes / 60), startMinutes % 60, 0, 0);

      const endMinutes = range?.endMinutes ?? startMinutes + 60;
      const end = new Date(targetDate);
      end.setHours(Math.floor(endMinutes / 60), endMinutes % 60, 0, 0);
      if (end <= start) {
        end.setTime(start.getTime() + 60 * 60 * 1000);
      }

      const title = item.task.trim() || 'MORNING FLOW AI 予定';

      return {
        id: `${index}-${item.time}-${title}`,
        title,
        start,
        end,
        priority: getSchedulePriority(title, plan),
        sourceTime: item.time,
        memo: `MORNING FLOW AIで整理した予定: ${item.time} ${title}\n今日の目的: ${plan.purpose}`,
      };
    })
    .filter((event): event is CalendarEvent => Boolean(event));
}

function getSchedulePriority(title: string, plan: MorningPlan): GoogleCalendarPriority {
  if (includesSimilarTask(plan.priorities.highest, title)) return '最優先';
  if (includesSimilarTask(plan.priorities.important, title)) return '重要';
  if (includesSimilarTask(plan.priorities.optional, title)) return '時間があれば';
  return '通常';
}

function includesSimilarTask(tasks: string[], title: string) {
  const normalizedTitle = normalizeTaskText(title);
  return tasks.some((task) => {
    const normalizedTask = normalizeTaskText(task);
    return normalizedTask.includes(normalizedTitle) || normalizedTitle.includes(normalizedTask);
  });
}

function normalizeTaskText(value: string) {
  return value
    .normalize('NFKC')
    .replace(/\s/g, '')
    .replace(/^(今日は|明日は|今日|明日)/, '')
    .replace(/\d{1,2}(?:時(?:半|\d{1,2}分?)?|:\d{2})(?:には|に|から|まで)?/g, '')
    .replace(/[、。,.!！?？:：]/g, '')
    .replace(/(を|へ|に|の|が)/g, '')
    .replace(/する$/, '')
    .replace(/起きる|起床する/g, '起床')
    .replace(/開店準備/g, 'オープン準備')
    .replace(/ジム行く/g, 'ジム行く')
    .replace(/line/g, 'LINE')
    .replace(/ライン/g, 'LINE')
    .toLowerCase();
}

function normalizePlanningItemKey(value: string) {
  return normalizeTaskText(value);
}

function cleanPlanningActionLabel(value: string) {
  const cleaned = value
    .normalize('NFKC')
    .replace(/\s+/g, ' ')
    .replace(/^(今日の予定|今日やること|予定|タスク)[:：\s]*/, '')
    .replace(/^(?:明後日|明日|今日)?\s*\d{1,2}(?:時(?:半|\d{1,2}分?)?|:\d{2})(?:には|に|から|まで)?\s*/, '')
    .replace(/^(明日は|明日|今日は|今日)\s*/, '')
    .replace(/起床する/g, '起床')
    .replace(/起きる/g, '起床')
    .replace(/店に行く/g, '店へ行く')
    .replace(/お店に行く/g, '店へ行く')
    .replace(/お店へ行く/g, '店へ行く')
    .replace(/ジムに行く/g, 'ジムへ行く')
    .replace(/開店準備/g, 'オープン準備')
    .trim();
  const compactMatch = cleaned.match(/(オープン準備|チャーシューを炊く|店へ行く|ジムへ行く|開店|閉店|起床|銀行へ行く|買い物へ行く|LINE返信|電話|確認|連絡|仕込み)/);
  if (isPlanningLongNoise(cleaned) && compactMatch) return compactMatch[1];
  return cleaned;
}

function isPlanningLongNoise(value: string) {
  const compact = value.replace(/\s/g, '');
  const actionHits = (compact.match(/起床|起き|店へ行く|店に行く|オープン準備|開店準備|チャーシュー|開店|閉店|ジム/g) ?? []).length;
  return compact.length > 32 && actionHits >= 2;
}

function parseScheduleTime(timeText: string) {
  const matches = Array.from(
    timeText
      .replace(/：/g, ':')
      .matchAll(/(\d{1,2})(?::(\d{2})|時(?:\s*(\d{1,2})\s*分?|半)?)/g),
  );

  const times = matches
    .map((match) => {
      const hour = Number(match[1]);
      const minute = match[0].includes('半') ? 30 : Number(match[2] ?? match[3] ?? 0);
      if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
      return hour * 60 + minute;
    })
    .filter((minutes): minutes is number => minutes !== null);

  if (!times.length) return null;

  return {
    startMinutes: times[0],
    endMinutes: times[1],
  };
}

function parseScheduleDate(dateText: string, baseDate: Date) {
  const normalizedText = normalizeJapaneseDateText(dateText);
  const today = startOfLocalDay(baseDate);
  const explicitDate = parseExplicitMonthDay(normalizedText, today);
  if (explicitDate) return explicitDate;

  if (normalizedText.includes('\u660e\u5f8c\u65e5')) return addDays(today, 2);
  if (normalizedText.includes('\u660e\u65e5') || normalizedText.includes('\u3042\u3057\u305f')) {
    return addDays(today, 1);
  }
  if (normalizedText.includes('\u4eca\u65e5')) return today;

  const nextWeekday = parseNextWeekday(normalizedText, today);
  if (nextWeekday) return nextWeekday;

  return today;
}

function normalizeJapaneseDateText(value: string) {
  return value
    .replace(/[０-９]/g, (digit) => String.fromCharCode(digit.charCodeAt(0) - 0xfee0))
    .replace(/\s/g, '');
}

function parseExplicitMonthDay(value: string, today: Date) {
  const match = value.match(/(\d{1,2})(?:\u6708|\/)(\d{1,2})(?:\u65e5)?/);
  if (!match) return null;

  const month = Number(match[1]);
  const day = Number(match[2]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;

  const target = new Date(today);
  target.setMonth(month - 1, day);
  if (target.getMonth() !== month - 1 || target.getDate() !== day) return null;

  if (target.getTime() < today.getTime() - 12 * 60 * 60 * 1000) {
    target.setFullYear(target.getFullYear() + 1);
  }
  return target;
}

function parseNextWeekday(value: string, today: Date) {
  if (!value.includes('\u6765\u9031')) return null;

  const weekdayIndex = getJapaneseWeekdayIndex(value);
  if (weekdayIndex === null) return null;

  const currentMondayIndex = (today.getDay() + 6) % 7;
  const daysUntilNextMonday = 7 - currentMondayIndex;
  return addDays(today, daysUntilNextMonday + weekdayIndex);
}

function getJapaneseWeekdayIndex(value: string) {
  const weekdays = [
    '\u6708\u66dc\u65e5',
    '\u706b\u66dc\u65e5',
    '\u6c34\u66dc\u65e5',
    '\u6728\u66dc\u65e5',
    '\u91d1\u66dc\u65e5',
    '\u571f\u66dc\u65e5',
    '\u65e5\u66dc\u65e5',
    '\u6708\u66dc',
    '\u706b\u66dc',
    '\u6c34\u66dc',
    '\u6728\u66dc',
    '\u91d1\u66dc',
    '\u571f\u66dc',
    '\u65e5\u66dc',
    '\u6708',
    '\u706b',
    '\u6c34',
    '\u6728',
    '\u91d1',
    '\u571f',
    '\u65e5',
  ];
  const match = weekdays.find((weekday) => value.includes(weekday));
  if (!match) return null;
  return weekdays.indexOf(match) % 7;
}

function startOfLocalDay(date: Date) {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

function addDays(date: Date, days: number) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function createIcsContent(events: CalendarEvent[]) {
  const now = toUtcCalendarTimestamp(new Date());
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//MORNING FLOW AI//JP',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    ...events.flatMap((event, index) => [
      'BEGIN:VEVENT',
      `UID:morning-flow-ai-${Date.now()}-${index}@local`,
      `DTSTAMP:${now}`,
      `CREATED:${now}`,
      `LAST-MODIFIED:${now}`,
      `DTSTART:${toUtcCalendarTimestamp(event.start)}`,
      `DTEND:${toUtcCalendarTimestamp(event.end)}`,
      `SUMMARY:${escapeIcsText(event.title)}`,
      `DESCRIPTION:${escapeIcsText(event.memo)}`,
      'END:VEVENT',
    ]),
    'END:VCALENDAR',
  ];

  return `${lines.join('\r\n')}\r\n`;
}

async function openAppleCalendarIcs(
  events: CalendarEvent[],
  onDebug?: (debug: AppleCalendarDebugInfo) => void,
  disposition: AppleCalendarDisposition = 'inline',
) {
  const icsContent = createIcsContent(events);
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const fileName = 'morning-flow-event.ics';

  if (isAppleMobileBrowser()) {
    const payloadUrl = createAppleCalendarPayloadUrl(icsContent);
    const session = await createAppleCalendarImportSession(icsContent, disposition);
    const debug = await verifyAppleCalendarGetUrl(session.importUrl, {
      contentDispositionMode: disposition,
      fallbackUsed: session.fallbackUsed,
      hasVTIMEZONE: icsContent.includes('BEGIN:VTIMEZONE'),
      icsLength: icsContent.length,
      icsTimeMode: 'utc-z',
      importId: session.id,
      payloadUrlLength: payloadUrl.length,
      shortUrlLength: session.importUrl.length,
      storage: session.storage,
    });
    onDebug?.(debug);
    console.info('[MORNING FLOW AI] Apple Calendar API debug', debug);

    if (!debug.responseStatus?.startsWith('200')) {
      await copyIcsToClipboard(icsContent);
      return 'AppleカレンダーGET URLの応答を確認できませんでした。Debug表示を確認してください。予定データはコピーを試みました。';
    }

    await wait(700);
    window.location.href = session.importUrl;
    return 'Appleカレンダー用の短いICS URLを開きます。登録画面が表示されたら追加を押してください。';
  }

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  return 'Appleカレンダー用の予定ファイルを作成しました。';
}

function createAppleCalendarPayloadUrl(icsContent: string) {
  const url = new URL('/api/apple-calendar.ics', window.location.href);
  url.searchParams.set('payload', encodeIcsPayload(icsContent));
  return url.toString();
}

async function createAppleCalendarImportSession(icsContent: string, disposition: AppleCalendarDisposition) {
  const apiUrl = new URL('/api/apple-calendar', window.location.href).toString();

  try {
    const response = await fetch(apiUrl, {
      body: new URLSearchParams({ ics: icsContent }),
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
        'X-MFAI-Apple-Create-Import': '1',
      },
      method: 'POST',
    });
    const result = (await response.json()) as { id?: string; storage?: string; url?: string };

    if (!response.ok || !result.id || !result.url) {
      throw new Error(`Import session failed: ${response.status}`);
    }

    return {
      fallbackUsed: 'none',
      id: result.id,
      importUrl: withAppleCalendarDisposition(new URL(result.url, window.location.href), disposition).toString(),
      storage: result.storage ?? 'upstash-redis',
    };
  } catch (error) {
    console.info('[MORNING FLOW AI] Apple Calendar short URL creation failed', error);
    return {
      fallbackUsed: 'payload_url',
      id: undefined,
      importUrl: withAppleCalendarDisposition(new URL(createAppleCalendarPayloadUrl(icsContent)), disposition).toString(),
      storage: 'payload-url-fallback',
    };
  }
}

function withAppleCalendarDisposition(url: URL, disposition: AppleCalendarDisposition) {
  url.searchParams.set('disposition', disposition);
  return url;
}

async function verifyAppleCalendarGetUrl(
  apiUrl: string,
  details: Partial<AppleCalendarDebugInfo> = {},
): Promise<AppleCalendarDebugInfo> {
  const baseDebug: AppleCalendarDebugInfo = {
    apiUrl,
    appVersion,
    contentDispositionMode: details.contentDispositionMode,
    fallbackUsed: details.fallbackUsed ?? 'none',
    hasVTIMEZONE: details.hasVTIMEZONE,
    icsLength: details.icsLength,
    icsTimeMode: details.icsTimeMode,
    importId: details.importId,
    mode: details.importId ? 'api-get-short-id-ics-url' : 'api-get-payload-ics-url',
    payloadUrlLength: details.payloadUrlLength,
    shortUrlLength: details.shortUrlLength,
    storage: details.storage,
    userAgent: navigator.userAgent,
  };

  try {
    const response = await fetch(apiUrl, {
      cache: 'no-store',
      headers: {
        'X-MFAI-Apple-Debug': '1',
      },
      method: 'GET',
    });
    const responseText = await response.text();

    return {
      ...baseDebug,
      bodyPreview: responseText.slice(0, 180).replace(/\r/g, '\\r').replace(/\n/g, '\\n'),
      contentDisposition: response.headers.get('content-disposition') ?? undefined,
      contentType: response.headers.get('content-type') ?? undefined,
      fallbackUsed: response.ok ? baseDebug.fallbackUsed : 'api_status_error',
      responseStatus: `${response.status} ${response.statusText}`.trim(),
    };
  } catch (error) {
    return {
      ...baseDebug,
      bodyPreview: error instanceof Error ? error.message : 'Unknown API verification error.',
      fallbackUsed: 'api_fetch_error',
      responseStatus: 'fetch failed',
    };
  }
}

function encodeIcsPayload(icsContent: string) {
  const bytes = new TextEncoder().encode(icsContent);
  let binary = '';
  const chunkSize = 0x8000;

  for (let index = 0; index < bytes.length; index += chunkSize) {
    const chunk = bytes.slice(index, index + chunkSize);
    binary += String.fromCharCode(...chunk);
  }

  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function createIcsDataUrl(icsContent: string) {
  return `data:text/calendar;charset=utf-8,${encodeURIComponent(icsContent)}`;
}

async function copyIcsToClipboard(icsContent: string) {
  try {
    await navigator.clipboard?.writeText(icsContent);
  } catch (error) {
    console.info('[MORNING FLOW AI] Apple Calendar clipboard fallback failed', error);
  }
}

function wait(milliseconds: number) {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
}

function isAppleMobileBrowser() {
  const standaloneNavigator = navigator as Navigator & { standalone?: boolean };
  const isTouchMac = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
  const isIphoneOrIpad = /iPhone|iPad|iPod/.test(navigator.userAgent) || isTouchMac;
  const isStandalonePwa =
    window.matchMedia?.('(display-mode: standalone)').matches || standaloneNavigator.standalone === true;
  return isIphoneOrIpad || isStandalonePwa;
}

function toUtcCalendarTimestamp(date: Date) {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

function escapeIcsText(value: string) {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;');
}

function formatEventTime(date: Date) {
  return date.toLocaleTimeString('ja-JP', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatScheduleDisplayTime(sourceTime: string, fallbackDate: Date) {
  const range = parseScheduleTime(sourceTime);
  if (!range) return formatEventTime(fallbackDate);
  const hour = Math.floor(range.startMinutes / 60);
  const minute = range.startMinutes % 60;
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

function formatEventDateTime(date: Date) {
  return `${date.toLocaleDateString('ja-JP', {
    month: 'numeric',
    day: 'numeric',
    weekday: 'short',
  })} ${formatEventTime(date)}`;
}

function addCarryoverToPlan(plan: MorningPlan, carriedTodos: string[]): MorningPlan {
  if (!carriedTodos.length) return plan;

  const todos = Array.from(new Set([...carriedTodos, ...plan.todos]));
  return {
    ...plan,
    todos,
    priorities: {
      ...plan.priorities,
      highest: Array.from(new Set([...carriedTodos, ...plan.priorities.highest])),
    },
    advice: Array.from(new Set([`昨日の未完了タスクを今日の前半に置くと、流れを取り戻しやすくなります。`, ...plan.advice])),
  };
}

function createReflectionMessage(statuses: Record<string, ReviewStatus>, todos: string[]) {
  const missed = todos.filter((todo) => statuses[todo] === 'missed');
  const partial = todos.filter((todo) => statuses[todo] === 'partial');
  const done = todos.filter((todo) => statuses[todo] === 'done');

  if (missed.length > 0) {
    return `${missed[0]}が未達成でした。優先順位が低かった可能性があります。今日に繰り越しますか？`;
  }
  if (partial.length > 0) {
    return `${partial[0]}は一部完了です。小さく分けて今日の前半に置くと進めやすくなります。`;
  }
  if (done.length === todos.length && todos.length > 0) {
    return '昨日より前進しています。無理なく継続しましょう。';
  }
  return '昨日の結果を選ぶと、AIが今日へのつなげ方を提案します。';
}

function getStatusLabel(
  isSupported: boolean,
  isListening: boolean,
  transcript: string,
  plan: MorningPlan | null,
  voiceStatus: VoiceRecognitionDebug['status'] = 'idle',
) {
  if (!isSupported) return 'このブラウザは音声入力に対応していません';
  if (voiceStatus === 'auto-restarting') return '一時停止しました。自動再開中です';
  if (isListening) return '音声認識中';
  if (plan) return '今日の流れを整理しました';
  if (transcript) return '会話として受け取りました。続けて話すか、保存してと言ってください。';
  return 'タップして話しはじめる';
}

function getSpeechErrorMessage(error: string) {
  if (error === 'not-allowed' || error === 'service-not-allowed') {
    return 'マイクの使用が許可されていません。ブラウザの設定からマイクを許可してください。';
  }
  if (error === 'no-speech') {
    return '音声が聞き取れませんでした。もう一度、少し近くで話してみてください。';
  }
  if (error === 'network') {
    return '音声認識サービスに接続できませんでした。通信状況を確認してください。';
  }
  return '音声認識で問題が起きました。もう一度お試しください。';
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

