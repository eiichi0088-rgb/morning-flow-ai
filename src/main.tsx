import React from 'react';
import ReactDOM from 'react-dom/client';
import {
  ArrowRight,
  AlertTriangle,
  Brain,
  CalendarClock,
  CalendarPlus,
  CheckCircle2,
  ChevronRight,
  Compass,
  Download,
  Flag,
  HeartPulse,
  Lightbulb,
  ListChecks,
  Loader2,
  Home,
  Mic,
  RefreshCw,
  Route,
  Pencil,
  Share2,
  ShoppingCart,
  Sparkles,
  Square,
  Target,
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
type AppView = 'morning' | 'shopping';

type PrivateSessionKeys = {
  draft: string;
  shopping: string;
  snapshots: string;
};

const privateSessionIdStorageKey = 'morning-flow-ai:session-id:v2';

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

function createPrivateSessionKeys(sessionId: string): PrivateSessionKeys {
  return {
    draft: `morning-flow-ai:session:${sessionId}:transcript-draft`,
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
  const [shoppingText, setShoppingText] = React.useState('');
  const [originalShoppingText, setOriginalShoppingText] = React.useState('');
  const [shoppingItems, setShoppingItems] = React.useState<ShoppingItem[]>([]);
  const [shoppingUpdatedAt, setShoppingUpdatedAt] = React.useState('');
  const [shoppingError, setShoppingError] = React.useState('');
  const [shoppingShareMessage, setShoppingShareMessage] = React.useState('');
  const [isShoppingOrganizing, setIsShoppingOrganizing] = React.useState(false);
  const [isShoppingResetDialogOpen, setIsShoppingResetDialogOpen] = React.useState(false);
  const [highlightedShoppingIds, setHighlightedShoppingIds] = React.useState<string[]>([]);
  const [previousSnapshot, setPreviousSnapshot] = React.useState<MorningSnapshot | null>(null);
  const [reviewStatuses, setReviewStatuses] = React.useState<Record<string, ReviewStatus>>({});
  const [carriedTodos, setCarriedTodos] = React.useState<string[]>([]);
  const planAnchorRef = React.useRef<HTMLDivElement | null>(null);

  const isSupported = Boolean(SpeechRecognition);
  const isShoppingView = activeView === 'shopping';
  const resultText = [transcript, interimTranscript].filter(Boolean).join('\n');
  const shoppingResultText = [shoppingText, isShoppingView ? interimTranscript : ''].filter(Boolean).join('\n');
  const canOrganize = Boolean(transcript.trim()) && !isListening && captureMode === 'create';
  const canUpdatePlan = false;
  const canOrganizeShopping = Boolean(shoppingText.trim()) && !isListening;
  const canUseNext = canOrganize || canUpdatePlan || Boolean(plan);
  const nextButtonLabel = isOrganizing
    ? canUpdatePlan
      ? 'スケジュールを更新中…'
      : 'AIが整理中…'
    : '次へ進む';
  const hasEditableTranscript = Boolean(transcript.trim()) && !isListening && captureMode === 'create';

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
        };
        setShoppingText(parsed.text ?? '');
        setOriginalShoppingText(parsed.text ?? '');
        setShoppingItems(Array.isArray(parsed.items) ? parsed.items : []);
        setShoppingUpdatedAt(parsed.updatedAt ?? '');
      } catch {
        localStorage.removeItem(privateSessionKeys.shopping);
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
    if (!highlightedScheduleKeys.length) return;
    const timeoutId = window.setTimeout(() => setHighlightedScheduleKeys([]), 7000);
    return () => window.clearTimeout(timeoutId);
  }, [highlightedScheduleKeys]);

  React.useEffect(() => {
    if (!shoppingText.trim() && !shoppingItems.length) {
      localStorage.removeItem(privateSessionKeys.shopping);
      return;
    }

    localStorage.setItem(
      privateSessionKeys.shopping,
      JSON.stringify({
        items: shoppingItems,
        text: shoppingText,
        updatedAt: shoppingUpdatedAt,
      }),
    );
  }, [privateSessionKeys.shopping, shoppingItems, shoppingText, shoppingUpdatedAt]);

  React.useEffect(() => {
    if (!highlightedShoppingIds.length) return;
    const timeoutId = window.setTimeout(() => setHighlightedShoppingIds([]), 7000);
    return () => window.clearTimeout(timeoutId);
  }, [highlightedShoppingIds]);

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
        const appendText = (current: string) => `${current}${current ? '\n' : ''}${finalText.trim()}`;
        if (activeView === 'shopping') {
          setShoppingText((current) => {
            const nextText = appendText(current);
            setOriginalShoppingText(nextText);
            return nextText;
          });
        } else if (captureMode === 'update') {
          setUpdateInstruction((current) => {
            const nextInstruction = appendText(current);
            setOriginalUpdateInstruction(nextInstruction);
            return nextInstruction;
          });
        } else {
          setTranscript((current) => {
            const nextTranscript = appendText(current);
            setOriginalTranscript(nextTranscript);
            return nextTranscript;
          });
          setPlan(null);
          setHighlightedScheduleKeys([]);
        }
      }
      setInterimTranscript(interimText.trim());
    };

    setRecognition(instance);

    return () => {
      instance.abort();
    };
  }, [activeView, captureMode]);

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
  };

  const organizeMorning = () => {
    if (!transcript.trim()) return;

    setIsOrganizing(true);
    setError('');

    Promise.all([createAiMorningPlan(transcript), createShoppingPlan(transcript, shoppingItems)])
      .then(([nextPlan, shoppingPlan]) => {
        const classifiedShoppingItems = mergeShoppingPlans(shoppingPlan.items, extractShoppingItemsFromUnifiedInput(transcript));
        const planWithCarryover = addCarryoverToPlan(
          prepareUnifiedMorningPlan(nextPlan, transcript, classifiedShoppingItems),
          carriedTodos,
        );
        setPlan(planWithCarryover);
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
    const normalized = transcript.trim();
    setTranscript(normalized);
    setOriginalTranscript(normalized);
    setPlan(null);
  };

  const restoreOriginalTranscript = () => {
    setTranscript(originalTranscript);
    setPlan(null);
  };

  const organizeShoppingList = () => {
    if (!shoppingText.trim()) return;

    const previousIds = new Set(shoppingItems.map((item) => item.id));
    setIsShoppingOrganizing(true);
    setShoppingError('');

    createShoppingPlan(shoppingText, shoppingItems)
      .then((shoppingPlan) => {
        setShoppingItems(shoppingPlan.items);
        setShoppingUpdatedAt(shoppingPlan.updatedAt);
        setOriginalShoppingText(shoppingText.trim());
        setHighlightedShoppingIds(shoppingPlan.items.filter((item) => !previousIds.has(item.id)).map((item) => item.id));
      })
      .catch((reason: unknown) => {
        console.error(reason);
        setShoppingError('うまく整理できませんでした。もう一度お試しください。');
      })
      .finally(() => {
        setIsShoppingOrganizing(false);
      });
  };

  const resetShoppingList = () => {
    recognition?.abort();
    setShoppingText('');
    setOriginalShoppingText('');
    setShoppingItems([]);
    setShoppingUpdatedAt('');
    setShoppingError('');
    setInterimTranscript('');
    setIsListening(false);
    setIsShoppingResetDialogOpen(false);
    setHighlightedShoppingIds([]);
  };

  const toggleShoppingItem = (itemId: string) => {
    setShoppingItems((current) =>
      current.map((item) => (item.id === itemId ? { ...item, completed: !item.completed } : item)),
    );
    setShoppingUpdatedAt(new Date().toISOString());
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
    setShoppingUpdatedAt(new Date().toISOString());
  };

  const shareShoppingList = async () => {
    const shareText = formatShoppingShareText(shoppingItems);
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
          onBack={() => {
            recognition?.abort();
            setInterimTranscript('');
            setIsListening(false);
            setActiveView('morning');
          }}
          onCancelReset={() => setIsShoppingResetDialogOpen(false)}
          onOrganize={organizeShoppingList}
          onReset={resetShoppingList}
          onResetRequest={() => setIsShoppingResetDialogOpen(true)}
          onStartListening={startListening}
          onStopListening={stopListening}
          onEditItem={editShoppingItem}
          onTextChange={(value) => {
            setShoppingText(value);
            setShoppingError('');
          }}
          onDeleteItem={deleteShoppingItem}
          onShare={shareShoppingList}
          onToggleItem={toggleShoppingItem}
          resultText={shoppingResultText}
          savedText={originalShoppingText}
          text={shoppingText}
          updatedAt={shoppingUpdatedAt}
          shareMessage={shoppingShareMessage}
        />
      ) : (
      <section className="hero-panel" aria-label="音声入力">
        <div className="top-bar">
          <div>
            <p className="eyebrow">MORNING FLOW AI <span>v2.11.5</span></p>
            <h1>話して人生を整える</h1>
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
          <button type="button" onClick={() => setActiveView('shopping')}>
            <ShoppingCart size={18} />
            買い物リストを作る
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

        <div className="transcript-card">
          <div className="transcript-header">
            <span>Today Capture</span>
            {interimTranscript && <span className="live-label">Listening</span>}
          </div>
          <div className={`transcript-box ${resultText ? 'has-text' : ''}`}>
            {resultText || '今日の予定、やること、目標、目的をそのまま話してください。'}
          </div>
        </div>

        {hasEditableTranscript && (
          <TranscriptEditor
            onCancel={restoreOriginalTranscript}
            onSave={saveEditedTranscript}
            onTextChange={(value) => {
              setTranscript(value);
              setPlan(null);
            }}
            savedText={originalTranscript}
            text={transcript}
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

        {false && (
          <button
            className={`organize-button ${isOrganizing ? 'is-organizing' : ''}`}
            type="button"
            onClick={applyScheduleUpdate}
            disabled={isOrganizing}
          >
            <Brain size={21} />
            {isOrganizing ? '既存スケジュールを更新中' : 'この内容をスケジュールに反映'}
            <Sparkles size={18} />
          </button>
        )}

        <div ref={planAnchorRef} />
        {plan && <CoachCard plan={plan} />}
        {plan && <PlanView highlightedScheduleKeys={highlightedScheduleKeys} plan={plan} shoppingItems={shoppingItems} />}

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
      {!isShoppingView && (
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

function ShoppingListPage({
  canOrganize,
  error,
  highlightedIds,
  isListening,
  isOrganizing,
  isResetDialogOpen,
  isSupported,
  items,
  onBack,
  onCancelReset,
  onOrganize,
  onReset,
  onResetRequest,
  onStartListening,
  onStopListening,
  onDeleteItem,
  onEditItem,
  onShare,
  onTextChange,
  onToggleItem,
  resultText,
  savedText,
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
  onBack: () => void;
  onCancelReset: () => void;
  onOrganize: () => void;
  onReset: () => void;
  onResetRequest: () => void;
  onStartListening: () => void;
  onStopListening: () => void;
  onDeleteItem: (itemId: string) => void;
  onEditItem: (itemId: string) => void;
  onShare: () => void;
  onTextChange: (value: string) => void;
  onToggleItem: (itemId: string) => void;
  resultText: string;
  savedText: string;
  shareMessage: string;
  text: string;
  updatedAt: string;
}) {
  const textareaRef = React.useRef<HTMLTextAreaElement | null>(null);
  const groups = groupShoppingItems(items);
  const completedCount = items.filter((item) => item.completed).length;
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
          <p className="eyebrow">MORNING FLOW AI <span>v2.11.5</span></p>
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

      {error && <p className="error-message">{error}</p>}
      {isOrganizing && (
        <p className="loading-message" role="status" aria-live="polite">
          AIが買い物リストを整理中です。カテゴリ分けしています。
        </p>
      )}

      <section className="editor-card shopping-editor" aria-label="買い物メモ編集">
        <div className="editor-header">
          <span>Shopping Capture</span>
          <strong>AIで整理する前に編集できます</strong>
        </div>
        {text.trim() !== savedText.trim() && (
          <p className="editor-live-note">入力中の内容はこのままAI整理に反映されます。</p>
        )}
        <textarea
          aria-label="買いたい物のテキストを編集"
          className="transcript-editor"
          onChange={(event) => onTextChange(event.target.value)}
          placeholder="例：牛乳、卵、ネギ、洗剤、子供のお菓子、ジム用の水"
          ref={textareaRef}
          rows={5}
          value={resultText}
        />
        <button
          className={`organize-button ${isOrganizing ? 'is-organizing' : ''}`}
          disabled={!canOrganize || isOrganizing}
          onClick={onOrganize}
          type="button"
        >
          <Brain size={21} />
          {isOrganizing ? '買い物リストを整理中…' : '買い物リストを整理する'}
          {isOrganizing ? <Loader2 className="button-spinner" size={18} /> : <Sparkles size={18} />}
        </button>
      </section>

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
              家族に共有
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
        <div className="confirm-dialog-backdrop" role="presentation">
          <section
            aria-describedby="shopping-reset-dialog-description"
            aria-labelledby="shopping-reset-dialog-title"
            aria-modal="true"
            className="confirm-dialog"
            role="dialog"
          >
            <div className="confirm-dialog-icon" aria-hidden="true">
              <AlertTriangle size={23} />
            </div>
            <h2 id="shopping-reset-dialog-title">本当に買い物リストを最初から作り直しますか？</h2>
            <p id="shopping-reset-dialog-description">現在の買い物リストは削除されます。</p>
            <div className="confirm-dialog-actions">
              <button className="secondary-button" type="button" onClick={onCancelReset}>
                キャンセル
              </button>
              <button className="danger-button" type="button" onClick={onReset}>
                やり直す
              </button>
            </div>
          </section>
        </div>
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
  onCancel,
  onSave,
  onTextChange,
  savedText,
  text,
}: {
  onCancel: () => void;
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
        <button className="secondary-button" onClick={onCancel} type="button">
          元に戻す
        </button>
        <button className="primary-button" disabled={!text.trim()} onClick={onSave} type="button">
          修正を保存
        </button>
      </div>
    </section>
  );
}

function CoachCard({ plan }: { plan: MorningPlan }) {
  const conditions = plan.coach.successConditions.length
    ? plan.coach.successConditions
    : plan.todos.slice(0, 3);

  return (
    <section className="coach-card" aria-label="AI Morning Coach">
      <div className="coach-top">
        <div>
          <span>AI Morning Coach</span>
          <h2>今日の最重要ミッション</h2>
        </div>
        <Compass size={24} />
      </div>

      <p className="mission-text">{plan.coach.mission}</p>

      <div className="focus-three">
        <div>
          <span>① 最重要</span>
          <strong>{plan.coach.focusItems.highest}</strong>
        </div>
        <div>
          <span>② 重要</span>
          <strong>{plan.coach.focusItems.important}</strong>
        </div>
        <div>
          <span>③ できれば実施</span>
          <strong>{plan.coach.focusItems.optional}</strong>
        </div>
      </div>

      <div className="coach-advice">
        <Lightbulb size={17} />
        <span>{plan.coach.morningAdvice}</span>
      </div>

      <div className="success-conditions">
        <span>今日の成功条件</span>
        {conditions.map((condition) => (
          <div key={condition}>
            <CheckCircle2 size={16} />
            <strong>{condition}</strong>
          </div>
        ))}
        <p>この3つを達成すれば、今日は成功です。</p>
      </div>
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
  highlightedScheduleKeys,
  plan,
  shoppingItems,
}: {
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
    () => plan.todos.filter((todo) => !isFutureDatedText(todo, today) && !isShoppingItemText(todo)).slice(0, 5),
    [plan.todos, today],
  );
  const visibleSchedule = todayEvents.slice(0, 5);
  const topTask = todayTodos[0] ?? visibleSchedule[0]?.title ?? '';
  const todayPurpose = topTask ? `${topTask}\u3092\u9032\u3081\u308b` : '\u4eca\u65e5\u306e\u4e88\u5b9a\u306f\u307e\u3060\u3042\u308a\u307e\u305b\u3093\u3002';

  return (
    <section className="plan-stack" aria-label="AI organized result">
      <PlanSection icon={<Flag size={18} />} title={'\u4eca\u65e5\u306e\u76ee\u7684'}>
        <p className="purpose-text">{todayPurpose}</p>
      </PlanSection>

      <PlanSection icon={<Target size={18} />} title={'\u4eca\u65e5\u306e\u6700\u512a\u5148'}>
        <p className="purpose-text">{topTask || '\u4eca\u65e5\u306e\u6700\u512a\u5148\u30bf\u30b9\u30af\u306f\u307e\u3060\u3042\u308a\u307e\u305b\u3093\u3002'}</p>
      </PlanSection>

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
        {shoppingItems.length ? (
          <ul className="clean-list">
            {shoppingItems.map((item) => (
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
        {isCalendarOpen && <GoogleCalendarExportPanel events={calendarEvents} />}
      </PlanSection>

      <button className="calendar-download-button" onClick={() => setShowDetails((current) => !current)} type="button">
        {showDetails ? '\u8a73\u7d30\u3092\u9589\u3058\u308b' : '\u8a73\u3057\u304f\u898b\u308b'}
      </button>

      {showDetails && (
        <>
          <PlanSection icon={<Target size={18} />} title={'\u4eca\u65e5\u306e\u76ee\u6a19'}>
            <ul className="clean-list">
              {plan.goals.map((goal) => (
                <li key={goal}>{goal}</li>
              ))}
            </ul>
          </PlanSection>

          <PlanSection icon={<HeartPulse size={18} />} title={'4\u30ab\u30c6\u30b4\u30ea\u30fc\u5206\u985e'}>
            <div className="category-grid">
              <CategoryColumn title={'\u4ed5\u4e8b'} items={plan.categories.work} />
              <CategoryColumn title={'\u5065\u5eb7'} items={plan.categories.health} />
              <CategoryColumn title={'\u5bb6\u65cf'} items={plan.categories.family} />
              <CategoryColumn title={'\u5b66\u7fd2'} items={plan.categories.learning} />
            </div>
          </PlanSection>

          <PlanSection icon={<Route size={18} />} title={'\u512a\u5148\u9806\u4f4d'}>
            <div className="priority-grid">
              <PriorityColumn title={'1. \u6700\u512a\u5148'} items={plan.priorities.highest} />
              <PriorityColumn title={'2. \u91cd\u8981'} items={plan.priorities.important} />
              <PriorityColumn title={'3. \u6642\u9593\u304c\u3042\u308c\u3070'} items={plan.priorities.optional} />
            </div>
          </PlanSection>

          <PlanSection icon={<Lightbulb size={18} />} title={'AI\u30a2\u30c9\u30d0\u30a4\u30b9'}>
            <ul className="advice-list">
              {plan.advice.map((advice) => (
                <li key={advice}>
                  <CheckCircle2 size={16} />
                  <span>{advice}</span>
                </li>
              ))}
            </ul>
          </PlanSection>
        </>
      )}
    </section>
  );
}

function GoogleCalendarExportPanel({ events }: { events: CalendarEvent[] }) {
  const [accessToken, setAccessToken] = React.useState('');
  const [selectedEventIds, setSelectedEventIds] = React.useState(() => events.map((event) => event.id));
  const [statusMessage, setStatusMessage] = React.useState('');
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

      <button className="calendar-download-button" onClick={() => downloadIcs(events)} type="button">
        <Download size={18} />
        Appleカレンダー用ファイルを保存
      </button>
    </div>
  );
}

function CalendarExportPanel({ events }: { events: CalendarEvent[] }) {
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

      <button className="calendar-download-button" onClick={() => downloadIcs(events)} type="button">
        <Download size={18} />
        Appleカレンダー用ファイルを保存
      </button>
    </div>
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

function PriorityColumn({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="priority-column">
      <h3>{title}</h3>
      {items.map((item) => (
        <span key={item}>{item}</span>
      ))}
    </div>
  );
}

function CategoryColumn({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="category-column">
      <h3>{title}</h3>
      {items.length ? (
        items.map((item) => <span key={item}>{item}</span>)
      ) : (
        <span className="muted-category">該当なし</span>
      )}
    </div>
  );
}

function formatShoppingShareText(items: ShoppingItem[]) {
  const groups = groupShoppingItems(items).filter((group) => group.items.length > 0);
  const body = groups
    .map((group) => {
      const lines = group.items.map((item) => `・${formatShoppingItemLabel(item)}`);
      return [`■ ${group.category}`, ...lines].join('\n');
    })
    .join('\n\n');

  return ['【今日の買い物リスト】', '', body || '買い物リストはまだありません。', '', '買い物よろしくお願いします。'].join('\n');
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
  const shoppingAction = shoppingItems.length ? ['買い物へ行く'] : [];
  const isShoppingText = (value: string) =>
    isShoppingItemText(value) || shoppingItems.some((item) => normalizeTaskText(value).includes(normalizeTaskText(item.name)));
  const isFutureTaskText = (value: string) =>
    Array.from(futureTaskNames).some((task) => task && normalizeTaskText(value).includes(task));

  return {
    ...plan,
    todos: mergeStrings(
      [...plan.todos.filter((todo) => !isShoppingText(todo) && !isFutureTaskText(todo)), ...extractedActions, ...shoppingAction],
      [],
    ),
    schedule: sortScheduleByTime(
      mergeSchedule(
        plan.schedule.filter((item) => !isShoppingText(item.task) && !isFutureTaskText(item.task)),
        extractedSchedule,
      ),
    ),
    priorities: {
      highest: plan.priorities.highest.filter((item) => !isShoppingText(item) && !isFutureTaskText(item)),
      important: plan.priorities.important.filter((item) => !isShoppingText(item) && !isFutureTaskText(item)),
      optional: plan.priorities.optional.filter((item) => !isShoppingText(item) && !isFutureTaskText(item)),
    },
    categories: {
      work: plan.categories.work.filter((item) => !shoppingNames.has(normalizeTaskText(item))),
      health: plan.categories.health.filter((item) => !shoppingNames.has(normalizeTaskText(item))),
      family: plan.categories.family.filter((item) => !shoppingNames.has(normalizeTaskText(item))),
      learning: plan.categories.learning.filter((item) => !shoppingNames.has(normalizeTaskText(item))),
    },
  };
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

function extractDatedScheduleItems(text: string): MorningPlan['schedule'] {
  const normalized = normalizeJapaneseDateText(text);
  const explicitDateTime = normalized.match(/(\d{1,2}月\d{1,2}日)\s*(\d{1,2}(?::\d{2}|時(?:\d{1,2}分?)?))\s*(?:から)?(.+)/);
  if (!explicitDateTime) return [];

  return [
    {
      time: `${explicitDateTime[1]} ${explicitDateTime[2]}`,
      task: normalizeScheduleActionText(explicitDateTime[3]),
    },
  ];
}

function isScheduleActionText(text: string) {
  return /(行く|迎え|会う|会議|仕事|病院|銀行|ジム|電話|支払い|送迎|予約|面談|打ち合わせ)/.test(text);
}

function isShoppingItemText(text: string) {
  return /(ネギ|ねぎ|玉ねぎ|玉葱|歯ブラシ|牛乳|卵|洗剤|ティッシュ|ラップ|お菓子|水|キロ|kg|g|本|個|袋|買う|購入)/.test(text);
}

function normalizeScheduleActionText(text: string) {
  return text
    .replace(/^今日は/, '')
    .replace(/^(から|に|へ|を|帰りに)/, '')
    .replace(/行って$/, '行く')
    .replace(/を?買う.*$/, '')
    .replace(/へ$/, 'へ行く')
    .trim();
}

function createLocalShoppingItemId(name: string) {
  return `shopping-local-${normalizeTaskText(name)}-${Date.now()}`;
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
      .matchAll(/(\d{1,2})(?::(\d{2})|時(?:\s*(\d{1,2})\s*分?)?)/g),
  );

  const times = matches
    .map((match) => {
      const hour = Number(match[1]);
      const minute = Number(match[2] ?? match[3] ?? 0);
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

function downloadIcs(events: CalendarEvent[]) {
  const now = toCalendarTimestamp(new Date());
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//MORNING FLOW AI//Calendar Export//JA',
    'CALSCALE:GREGORIAN',
    ...events.flatMap((event, index) => [
      'BEGIN:VEVENT',
      `UID:morning-flow-ai-${Date.now()}-${index}@local`,
      `DTSTAMP:${now}`,
      `DTSTART;TZID=Asia/Tokyo:${toLocalCalendarTimestamp(event.start)}`,
      `DTEND;TZID=Asia/Tokyo:${toLocalCalendarTimestamp(event.end)}`,
      `SUMMARY:${escapeIcsText(event.title)}`,
      `DESCRIPTION:${escapeIcsText(event.memo)}`,
      'END:VEVENT',
    ]),
    'END:VCALENDAR',
  ];
  const blob = new Blob([lines.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'morning-flow-ai-schedule.ics';
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function toCalendarTimestamp(date: Date) {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

function toLocalCalendarTimestamp(date: Date) {
  const formatter = new Intl.DateTimeFormat('sv-SE', {
    dateStyle: 'short',
    hour12: false,
    timeStyle: 'medium',
    timeZone: 'Asia/Tokyo',
  });
  return formatter.format(date).replace(/[-: ]/g, '');
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
