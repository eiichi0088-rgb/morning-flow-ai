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
  type ShoppingItem,
} from './services/shoppingPlanner';
import { findRecipeMatch } from './services/recipeDatabase';
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
type AppView = 'morning' | 'shopping' | 'followUp' | 'inbox' | 'feedback' | 'analytics';
type AiInboxCategory = 'todo' | 'shopping' | 'followUp' | 'memo' | 'idea';
type AiInboxStatus = 'unprocessed' | 'organized';

type AiInboxItem = {
  id: string;
  text: string;
  category: AiInboxCategory;
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
  bodyPreview: string;
  configured: boolean;
  error: string;
  hasAnonKey: boolean;
  hasUrl: boolean;
  lastOperation: string;
  responseStatus: string;
  rowCount: number | null;
  urlHost: string;
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

function removeLegacySharedStorage(currentSessionId: string) {
  legacySharedStorageKeys.forEach((key) => localStorage.removeItem(key));
  Object.keys(localStorage)
    .filter((key) => key.startsWith('morning-flow-ai:session:') && !key.includes(`:${currentSessionId}:`))
    .forEach((key) => localStorage.removeItem(key));
  Object.keys(localStorage)
    .filter((key) => key.startsWith('morning-flow-ai:v2.8:session:') && !key.includes(`:${currentSessionId}:`))
    .forEach((key) => localStorage.removeItem(key));
  Object.keys(localStorage)
    .filter((key) => key.startsWith('session:') && key.endsWith(':snapshots') && !key.includes(`:${currentSessionId}:`))
    .forEach((key) => localStorage.removeItem(key));
}

function App() {
  const privateSessionId = React.useMemo(createPrivateSessionId, []);
  const privateSessionKeys = React.useMemo(() => createPrivateSessionKeys(privateSessionId), [privateSessionId]);
  const analyticsUserId = React.useMemo(createAnalyticsUserId, []);
  const [activeView, setActiveView] = React.useState<AppView>('morning');
  const [recognition, setRecognition] = React.useState<SpeechRecognitionLike | null>(null);
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
  const planAnchorRef = React.useRef<HTMLDivElement | null>(null);

  const isSupported = Boolean(SpeechRecognition);
  const isShoppingView = activeView === 'shopping';
  const isFollowUpView = activeView === 'followUp';
  const isInboxView = activeView === 'inbox';
  const isFeedbackView = activeView === 'feedback';
  const resultText = [transcript, interimTranscript].filter(Boolean).join('\n');
  const activeShoppingText = shoppingCaptureMode === 'meal' ? mealPlanText : shoppingText;
  const activeSavedShoppingText = shoppingCaptureMode === 'meal' ? originalMealPlanText : originalShoppingText;
  const shoppingResultText = [activeShoppingText, isShoppingView ? interimTranscript : ''].filter(Boolean).join('\n');
  const feedbackResultText = [feedbackText, isFeedbackView ? interimTranscript : ''].filter(Boolean).join('\n');
  const followUpResultText = [followUpCaptureText, isFollowUpView ? interimTranscript : ''].filter(Boolean).join('\n');
  const canOrganize = Boolean(transcript.trim()) && !isListening && captureMode === 'create';
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

  React.useEffect(() => {
    if (!localStorage.getItem(analyticsInstallTrackedKey)) {
      trackAnalyticsEvent(analyticsUserId, 'app_install');
      localStorage.setItem(analyticsInstallTrackedKey, 'true');
    }
    trackAnalyticsEvent(analyticsUserId, 'app_open');
  }, [analyticsUserId]);

  React.useEffect(() => {
    removeLegacySharedStorage(privateSessionId);
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
        setShoppingItems(Array.isArray(parsed.items) ? parsed.items : []);
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
        setAiInboxItems(Array.isArray(parsed) ? parsed : []);
      } catch {
        localStorage.removeItem(privateSessionKeys.inbox);
      }
    }
  }, [privateSessionId, privateSessionKeys]);

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
      const rows = await fetchSupabaseFollowUps();
      setFollowUps(rows.map(mapSupabaseRowToFollowUpItem));
      setFollowUpSyncError('');
      setFollowUpLastSyncedAt(new Date().toISOString());
      setFollowUpSyncStatus('synced');
    } catch (error) {
      setFollowUpSyncError('同期できませんでした。通信を確認してください。');
      setFollowUpSyncStatus('error');
    }
  }, []);

  React.useEffect(() => {
    void syncFollowUpsFromSupabase();

    if (!isSupabaseFollowUpConfigured()) return;
    const intervalId = window.setInterval(() => {
      void syncFollowUpsFromSupabase();
    }, 10000);

    return () => window.clearInterval(intervalId);
  }, [syncFollowUpsFromSupabase]);

  React.useEffect(() => {
    if (!highlightedShoppingIds.length) return;
    const timeoutId = window.setTimeout(() => setHighlightedShoppingIds([]), 7000);
    return () => window.clearTimeout(timeoutId);
  }, [highlightedShoppingIds]);

  const saveVoiceTextToAiInbox = React.useCallback((text: string, sourceView: AppView) => {
    const normalized = text.trim();
    if (!normalized) return;
    const nextItem: AiInboxItem = {
      category: classifyAiInboxText(normalized),
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

  React.useEffect(() => {
    if (!SpeechRecognition) return;

    const instance = new SpeechRecognition();
    instance.lang = 'ja-JP';
    instance.continuous = true;
    instance.interimResults = true;

    instance.onstart = () => {
      setIsListening(true);
      if (activeView === 'shopping') {
        setShoppingError('');
      } else if (activeView === 'followUp') {
        setIsFollowUpClearConfirmOpen(false);
      } else {
        setError('');
      }
    };

    instance.onend = () => {
      setIsListening(false);
      setInterimTranscript('');
    };

    instance.onerror = (event) => {
      setIsListening(false);
      setInterimTranscript('');
      if (activeView === 'shopping') {
        setShoppingError(getSpeechErrorMessage(event.error));
      } else {
        setError(getSpeechErrorMessage(event.error));
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

      if (finalText) {
        saveVoiceTextToAiInbox(finalText, activeView);
      }
      setInterimTranscript(interimText.trim());
    };

    setRecognition(instance);

    return () => {
      instance.abort();
    };
  }, [activeView, saveVoiceTextToAiInbox]);

  const startListening = () => {
    if (!recognition || isListening) return;

    if (activeView === 'shopping') {
      setShoppingError('');
    } else {
      setError('');
    }
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
    recognition?.stop();
  };

  const resetTranscript = () => {
    recognition?.abort();
    setIsResetDialogOpen(false);
    setTranscript('');
    setOriginalTranscript('');
    setUpdateInstruction('');
    setOriginalUpdateInstruction('');
    setInterimTranscript('');
    setError('');
    setIsListening(false);
    setPlan(null);
    setCarriedTodos([]);
    setCaptureMode('create');
    setHighlightedScheduleKeys([]);
    setMorningFollowUpCandidates([]);
    setMorningFollowUpMessage('');
  };

  const useSample = () => {
    recognition?.abort();
    setTranscript(sampleTranscript);
    setOriginalTranscript(sampleTranscript);
    setUpdateInstruction('');
    setOriginalUpdateInstruction('');
    setInterimTranscript('');
    setError('');
    setIsListening(false);
    setPlan(null);
    setCaptureMode('create');
    setHighlightedScheduleKeys([]);
    setMorningFollowUpCandidates([]);
    setMorningFollowUpMessage('');
  };

  const organizeMorning = () => {
    if (!transcript.trim()) return;

    trackAnalyticsFeature(analyticsUserId, 'morning_flow');
    setIsOrganizing(true);
    setError('');
    setMorningFollowUpCandidates([]);
    setMorningFollowUpMessage('');

    Promise.all([createAiMorningPlan(transcript), createShoppingPlan(transcript, shoppingItems)])
      .then(([nextPlan, shoppingPlan]) => {
        const classifiedShoppingItems = hasShoppingItemIntent(transcript)
          ? mergeShoppingPlans(shoppingPlan.items, extractShoppingItemsFromUnifiedInput(transcript))
          : shoppingItems;
        const planWithCarryover = addCarryoverToPlan(
          prepareUnifiedMorningPlan(nextPlan, transcript, classifiedShoppingItems),
          carriedTodos,
        );
        setPlan(planWithCarryover);
        setMorningFollowUpCandidates(createMorningFollowUpCandidates(planWithCarryover, followUps));
        setShoppingText(transcript.trim());
        setOriginalShoppingText(transcript.trim());
        setShoppingItems(classifiedShoppingItems);
        setShoppingUpdatedAt(shoppingPlan.updatedAt);
        setCaptureMode('create');
        setUpdateInstruction('');
        setOriginalUpdateInstruction('');
        setHighlightedScheduleKeys([]);
        saveMorningSnapshot(transcript, planWithCarryover, privateSessionKeys.snapshots);
      })
      .catch((reason: unknown) => {
        console.error(reason);
        setError('うまく処理できませんでした。もう一度お試しください。');
      })
      .finally(() => {
        setIsOrganizing(false);
      });
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
    setMorningFollowUpCandidates([]);
    setMorningFollowUpMessage('');
  };

  const restoreOriginalTranscript = () => {
    setTranscript(originalTranscript);
    setInterimTranscript('');
    setIsTranscriptClearConfirmOpen(false);
    setPlan(null);
    setMorningFollowUpCandidates([]);
    setMorningFollowUpMessage('');
  };

  const clearEditableTranscript = () => {
    recognition?.abort();
    setTranscript('');
    setOriginalTranscript('');
    setInterimTranscript('');
    setPlan(null);
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
        setShoppingItems(shoppingPlan.items);
        setShoppingUpdatedAt(shoppingPlan.updatedAt);
        setOriginalShoppingText(shoppingText.trim());
        setHighlightedShoppingIds(shoppingPlan.items.filter((item) => !previousIds.has(item.id)).map((item) => item.id));
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
    recognition?.abort();
    setInterimTranscript('');
    setIsListening(false);
    setShoppingCaptureMode('meal');
    setShoppingError('');
    trackAnalyticsFeature(analyticsUserId, 'meal_to_shopping');
  };

  const openShoppingInputMode = () => {
    recognition?.abort();
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
    setShoppingUpdatedAt(new Date().toISOString());
    setHighlightedShoppingIds(nextItems.filter((item) => !previousIds.has(item.id)).map((item) => item.id));
    setSelectedShoppingShareIds([]);
    setMealCandidates([]);
    setMealPlanDebug(null);
    setShoppingCaptureMode('shopping');
  };

  const resetShoppingList = () => {
    recognition?.abort();
    setShoppingText('');
    setOriginalShoppingText('');
    setMealPlanText('');
    setOriginalMealPlanText('');
    setMealCandidates([]);
    setMealPlanDebug(null);
    setMealServings(4);
    setShoppingCaptureMode('shopping');
    setShoppingItems([]);
    setShoppingUpdatedAt('');
    setShoppingError('');
    setInterimTranscript('');
    setIsListening(false);
    setIsShoppingResetDialogOpen(false);
    setHighlightedShoppingIds([]);
    setSelectedShoppingShareIds([]);
  };

  const clearShoppingInput = () => {
    recognition?.abort();
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
      setShoppingUpdatedAt('');
      setHighlightedShoppingIds([]);
      setSelectedShoppingShareIds([]);
    }
  };

  const createNewShoppingList = () => {
    const shouldResetItems = !shoppingItems.length || window.confirm('現在の整理結果を削除して、新しく作り直しますか？');
    recognition?.abort();
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
      setShoppingUpdatedAt('');
      setHighlightedShoppingIds([]);
      setSelectedShoppingShareIds([]);
    }
  };

  const toggleShoppingItem = (itemId: string) => {
    setShoppingItems((current) =>
      current.map((item) => (item.id === itemId ? { ...item, completed: !item.completed } : item)),
    );
    setShoppingUpdatedAt(new Date().toISOString());
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

    setShoppingItems((current) =>
      current.map((currentItem) =>
        currentItem.id === itemId
          ? {
              ...currentItem,
              name: parsed.name,
              quantity: parsed.quantity,
            }
          : currentItem,
      ),
    );
    setShoppingUpdatedAt(new Date().toISOString());
  };

  const deleteShoppingItem = (itemId: string) => {
    setShoppingItems((current) => current.filter((item) => item.id !== itemId));
    setSelectedShoppingShareIds((current) => current.filter((id) => id !== itemId));
    setShoppingUpdatedAt(new Date().toISOString());
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
      try {
        setFollowUpSyncStatus('syncing');
        const insertPayload = mapFollowUpItemToSupabaseInsert(nextItem);
        console.info('[MORNING FLOW AI] Supabase follow-up insert start', {
          config: getSupabaseFollowUpConfigStatus(),
          payload: insertPayload,
        });
        setFollowUpSupabaseDebug(createFollowUpSupabaseDebug('insert:start'));
        const savedRow = await insertSupabaseFollowUp(insertPayload);
        if (!savedRow) {
          throw new Error('Supabase insert returned no row. Check table permissions and Prefer return=representation support.');
        }
        const savedItem = mapSupabaseRowToFollowUpItem(savedRow);
        setFollowUps((current) => [...current.filter((currentItem) => currentItem.id !== savedItem.id), savedItem]);
        notifyFollowUpDueToday(savedItem);
        setFollowUpSyncError('');
        setFollowUpSyncStatus('synced');
        setFollowUpSupabaseDebug({
          ...createFollowUpSupabaseDebug('insert:success'),
          responseStatus: '201 Created',
          rowCount: 1,
        });
        return true;
      } catch (error) {
        console.error('[MORNING FLOW AI] Supabase follow-up insert failed', error);
        const message = getSupabaseFollowUpErrorMessage(error);
        setFollowUpSyncError(message);
        setFollowUpSyncStatus('error');
        setFollowUpSupabaseDebug(createFollowUpSupabaseDebug('insert:error', error));
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
    recognition?.abort();
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
    setAiInboxItems((current) => current.map((item) => (item.id === itemId ? { ...item, category } : item)));
    setAiInboxMessage('');
  };

  const organizeAiInboxItem = (itemId: string) => {
    setAiInboxItems((current) =>
      current.map((item) =>
        item.id === itemId
          ? {
              ...item,
              category: classifyAiInboxText(item.text, item.category),
              organizedAt: new Date().toISOString(),
              status: 'organized',
            }
          : item,
      ),
    );
    setAiInboxMessage('Inbox項目を整理済みにしました。');
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
      void updateSupabaseFollowUp(itemId, {
        completed_at: completedAt,
        status: 'done',
      })
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
      void updateSupabaseFollowUp(itemId, {
        completed_at: null,
        status: 'pending',
      })
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
      void updateSupabaseFollowUp(itemId, {
        memo: nextContent,
        person_name: nextName,
        title: formatFollowUpTitle(nextItem),
      })
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
      void deleteSupabaseFollowUp(itemId)
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
      setShoppingShareMessage('共有する項目を選択してください。');
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

  return (
    <main className="app-shell">
      <div className="ambient-layer" aria-hidden="true">
        <span className="morning-orbit orbit-one" />
        <span className="morning-orbit orbit-two" />
        <span className="horizon-line" />
      </div>

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
            recognition?.abort();
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
            recognition?.abort();
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
      ) : (
      <section className="hero-panel" aria-label="音声入力">
        <div className="top-bar">
          <div>
            <p className="eyebrow">MORNING FLOW AI <span>{appVersion}</span></p>
            <h1>話して人生を整える</h1>
            <p className="hero-subtitle">Your Day. Optimized.</p>
            <p className="hero-kicker">Speak. Organize. Move.</p>
          </div>
          <div className="brand-mark" aria-hidden="true">
            <Sparkles size={21} />
          </div>
        </div>

        <div className="focus-area">
          <div className={`voice-stage ${isListening ? 'is-listening' : ''}`}>
            <div className="waveform" aria-hidden="true">
              {Array.from({ length: 17 }).map((_, index) => (
                <span key={index} style={{ animationDelay: `${index * 72}ms` }} />
              ))}
            </div>

            <button
              className={`mic-button ${isListening ? 'is-listening' : ''}`}
              type="button"
              onClick={isListening ? stopListening : startListening}
              disabled={!isSupported}
              aria-label={isListening ? '音声認識を停止' : '音声認識を開始'}
            >
              <span className="pulse-ring ring-one" aria-hidden="true" />
              <span className="pulse-ring ring-two" aria-hidden="true" />
              <span className="mic-glass" aria-hidden="true" />
              {isListening ? <Square size={38} fill="currentColor" /> : <Mic size={56} />}
            </button>
          </div>

          <div className="status-row" role="status" aria-live="polite">
            <span className={`status-dot ${isListening ? 'active' : ''}`} />
            {getStatusLabel(isSupported, isListening, transcript, plan)}
          </div>
        </div>

        <VoiceInputGuide
          examples={[
            '16時半からラーメンを食べる',
            '19時にジムへ行く',
            '妻に電話する',
          ]}
        />

        {hasEditableTranscript && (
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

        {previousSnapshot && (
          <ReflectionView
            carriedTodos={carriedTodos}
            onDeleteAll={() => deleteReflectionTodos(previousSnapshot.plan.todos)}
            onDeleteTask={(task) => deleteReflectionTodos([task])}
            onCarryOver={carryOverTodos}
            onStatusChange={(task, status) => {
              const nextStatuses = { ...reviewStatuses, [task]: status };
              setReviewStatuses(nextStatuses);
              saveReview(previousSnapshot.id, nextStatuses, privateSessionKeys.snapshots);
            }}
            snapshot={previousSnapshot}
            statuses={reviewStatuses}
          />
        )}

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
      {!isShoppingView && !isInboxView && (
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
    </main>
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
          <small>Response: {followUpSupabaseDebug.responseStatus || 'not received'}</small>
          <small>Rows: {typeof followUpSupabaseDebug.rowCount === 'number' ? followUpSupabaseDebug.rowCount : 'not checked'}</small>
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
  items,
  message,
  onBack,
  onCategoryChange,
  onDelete,
  onOrganize,
  onReopen,
}: {
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
  const todayTodos = React.useMemo(
    () => plan.todos.filter((todo) => !isFutureDatedText(todo, today) && (isFoodEventText(todo) || !isShoppingItemText(todo))).slice(0, 5),
    [plan.todos, today],
  );
  const visibleShoppingItems = React.useMemo(
    () => dedupeShoppingItemsForDisplay(groupShoppingItems(shoppingItems).flatMap((group) => group.items)),
    [shoppingItems],
  );
  const visibleSchedule = todayEvents.slice(0, 5);
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
                <time>{formatEventTime(event.start)}</time>
                <span>{event.title}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="purpose-text">{'\u4eca\u65e5\u306e\u30b9\u30b1\u30b8\u30e5\u30fc\u30eb\u306f\u307e\u3060\u3042\u308a\u307e\u305b\u3093\u3002'}</p>
        )}
      </PlanSection>

      {futureEvents.length > 0 && (
        <PlanSection icon={<CalendarClock size={18} />} title={'\u672a\u6765\u306e\u4e88\u5b9a'}>
          <div className="schedule-list">
            {futureEvents.map((event) => (
              <div className="schedule-item" key={event.id}>
                <time>{formatEventDateTime(event.start)}</time>
                <span>{event.title}</span>
              </div>
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

function mapFollowUpItemToSupabaseInsert(item: FollowUpItem) {
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

function createFollowUpSupabaseDebug(lastOperation: string, error?: unknown): FollowUpSupabaseDebug {
  const config = getSupabaseFollowUpConfigStatus();
  const supabaseError = error instanceof SupabaseFollowUpError ? error : null;
  const fallbackError = error && !supabaseError ? (error instanceof Error ? error.message : String(error)) : '';

  return {
    bodyPreview: supabaseError?.body ? supabaseError.body.slice(0, 220) : '',
    configured: config.configured,
    error: supabaseError ? supabaseError.message : fallbackError,
    hasAnonKey: config.hasAnonKey,
    hasUrl: config.hasUrl,
    lastOperation,
    responseStatus: supabaseError ? `${supabaseError.status} ${supabaseError.statusText}`.trim() : '',
    rowCount: null,
    urlHost: config.urlHost,
  };
}

function getFollowUpSyncStatusLabel(status: 'local' | 'syncing' | 'synced' | 'error') {
  if (status === 'synced') return 'Supabase同期済み';
  if (status === 'syncing') return '同期中...';
  if (status === 'error') return 'Supabase同期エラー';
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

function classifyAiInboxText(text: string, fallback: AiInboxCategory = 'memo'): AiInboxCategory {
  if (detectFollowUpIntent(text)) return 'followUp';
  if (hasShoppingItemIntent(text) || hasShoppingActionIntent(text) || isShoppingItemText(text)) return 'shopping';
  if (/(アイデア|思いついた|企画|やってみたい|改善案|提案)/.test(text)) return 'idea';
  if (isScheduleActionText(text) || hasScheduleTimeText(text)) return 'todo';
  return fallback;
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
  const schedule = sortScheduleByTime(mergeSchedule(previousPlan.schedule, nextPlan.schedule));
  const todos = mergeStrings(previousPlan.todos, nextPlan.todos);
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

function sortScheduleByTime(schedule: MorningPlan['schedule']) {
  return [...schedule].sort((a, b) => getScheduleStartMinutes(a.time) - getScheduleStartMinutes(b.time));
}

function prepareUnifiedMorningPlan(plan: MorningPlan, sourceText: string, shoppingItems: ShoppingItem[]): MorningPlan {
  const shoppingNames = new Set(shoppingItems.map((item) => normalizeTaskText(item.name)));
  const extractedActions = extractScheduleActionsFromUnifiedInput(sourceText);
  const extractedSchedule = extractDatedScheduleItems(sourceText);
  const futureTaskNames = new Set(extractedSchedule.map((item) => normalizeTaskText(item.task)));
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

  return {
    ...plan,
    todos: mergeStrings(
      [...plan.todos.filter((todo) => !isShoppingText(todo) && !isFutureTaskText(todo)), ...extractedActions, ...shoppingAction],
      [],
    ),
    schedule: sortScheduleByTime(
      filterUnconfirmedDefaultScheduleTimes(
        mergeSchedule(
        plan.schedule.filter((item) => !isShoppingText(item.task) && !isFutureTaskText(item.task)),
        mergeSchedule(extractedSchedule, shoppingSchedule),
        ),
        sourceText,
      ),
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

function extractShoppingItemsFromUnifiedInput(text: string): ShoppingItem[] {
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

  return candidates.map((candidate) => {
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
  return /(買い物|スーパー|店|ドラッグストア|コンビニ|市場).*(行く|寄る|行って|寄って)|(?:行く|寄る).*(買い物|スーパー|店|ドラッグストア|コンビニ|市場)/.test(text);
}

function hasShoppingItemIntent(text: string) {
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

  return plan.schedule
    .map((item, index) => {
      const range = parseScheduleTime(item.time);
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
  return value.replace(/\s/g, '').toLowerCase();
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
) {
  if (!isSupported) return 'このブラウザは音声入力に対応していません';
  if (isListening) return '音声認識中';
  if (plan) return '今日の流れを整理しました';
  if (transcript) return 'AI整理を押すと今日の計画を生成します';
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

