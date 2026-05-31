import React from 'react';
import ReactDOM from 'react-dom/client';
import {
  AlertTriangle,
  AtSign,
  CalendarClock,
  CalendarPlus,
  CheckCircle2,
  Clock3,
  Download,
  ExternalLink,
  Home,
  Loader2,
  Mail,
  MessageCircle,
  Mic,
  Pencil,
  Phone,
  RefreshCw,
  Share2,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  Square,
  Trash2,
} from 'lucide-react';
import { createAiMorningPlan, type EnergyMood, type MorningPlan } from './services/aiPlanner';
import {
  insertGoogleCalendarEvents,
  isGoogleCalendarConfigured,
  requestGoogleAccessToken,
  revokeGoogleAccessToken,
  type GoogleCalendarPriority,
} from './services/googleCalendar';
import { loadLatestSnapshot, saveMorningSnapshot, saveReview, type MorningSnapshot, type ReviewStatus } from './services/reflectionStorage';
import {
  createManualShoppingItem,
  createShoppingPlan,
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

type CaptureMode = 'create' | 'update';
type AppView = 'morning' | 'shopping' | 'contacts';
type ContactKind = 'phone' | 'line' | 'mail' | 'sns' | 'other';

interface ContactReminder {
  id: string;
  text: string;
  kind: ContactKind;
  completed: boolean;
  createdAt: string;
}

type V3PrivateKeys = {
  draft: string;
  shopping: string;
  snapshots: string;
  contacts: string;
};

type CalendarEvent = {
  id: string;
  title: string;
  start: Date;
  end: Date;
  memo: string;
  priority: GoogleCalendarPriority;
  sourceTime: string;
};

const SpeechRecognition = window.SpeechRecognition ?? window.webkitSpeechRecognition;
const appVersion = 'v3.0';
const activeProfileKey = 'morning-flow-ai:v3:active-profile';
const v2AndSharedStorageKeys = [
  'morning-flow-ai:transcript-draft:v1',
  'morning-flow-ai:snapshots:v1',
  'morning-flow-ai:shopping-list:v1',
  'morning-flow-ai:google-calendar-login:v1',
  'morning-flow-ai:userProfile:v1',
  'morning-flow-ai:preferences:v1',
];

const sampleTranscript =
  '今日は午前中に資料作成を終わらせる。昼に買い物で牛乳と卵を買う。午後は山田さんに折り返し電話して、LINEの返信も忘れない。夕方に30分歩いて、夜は明日の準備をする。';

const reviewOptions: { label: string; value: ReviewStatus }[] = [
  { label: '完了', value: 'done' },
  { label: '一部完了', value: 'partial' },
  { label: '未達成', value: 'missed' },
];

const energyOptions: { label: string; value: EnergyMood }[] = [
  { label: '絶好調', value: 'great' },
  { label: '普通', value: 'normal' },
  { label: '疲れ気味', value: 'tired' },
  { label: 'かなり疲れている', value: 'exhausted' },
];

function getOrCreatePrivateProfileId() {
  const saved = localStorage.getItem(activeProfileKey);
  if (saved?.startsWith('local-private-')) return saved;
  const next = `local-private-${createId()}`;
  localStorage.setItem(activeProfileKey, next);
  return next;
}

function createPrivateKeys(ownerId: string): V3PrivateKeys {
  const base = `morning-flow-ai:v3:owner:${ownerId}`;
  return {
    draft: `${base}:transcript-draft`,
    shopping: `${base}:shopping-list`,
    snapshots: `${base}:snapshots`,
    contacts: `${base}:contact-reminders`,
  };
}

function clearLegacyAndForeignSessionStorage(ownerId: string) {
  v2AndSharedStorageKeys.forEach((key) => localStorage.removeItem(key));
  Object.keys(localStorage)
    .filter((key) => key.startsWith('morning-flow-ai:session:'))
    .forEach((key) => localStorage.removeItem(key));
  Object.keys(localStorage)
    .filter((key) => key.startsWith('morning-flow-ai:v3:owner:') && !key.includes(`:${ownerId}:`))
    .forEach((key) => localStorage.removeItem(key));
}

function App() {
  const ownerId = React.useMemo(getOrCreatePrivateProfileId, []);
  const privateKeys = React.useMemo(() => createPrivateKeys(ownerId), [ownerId]);
  const [activeView, setActiveView] = React.useState<AppView>('morning');
  const [recognition, setRecognition] = React.useState<SpeechRecognitionLike | null>(null);
  const [isListening, setIsListening] = React.useState(false);
  const [captureMode, setCaptureMode] = React.useState<CaptureMode>('create');
  const [transcript, setTranscript] = React.useState('');
  const [originalTranscript, setOriginalTranscript] = React.useState('');
  const [updateInstruction, setUpdateInstruction] = React.useState('');
  const [interimTranscript, setInterimTranscript] = React.useState('');
  const [error, setError] = React.useState('');
  const [plan, setPlan] = React.useState<MorningPlan | null>(null);
  const [isOrganizing, setIsOrganizing] = React.useState(false);
  const [previousSnapshot, setPreviousSnapshot] = React.useState<MorningSnapshot | null>(null);
  const [reviewStatuses, setReviewStatuses] = React.useState<Record<string, ReviewStatus>>({});
  const [carriedTodos, setCarriedTodos] = React.useState<string[]>([]);
  const [energy, setEnergy] = React.useState<EnergyMood>('normal');
  const [shoppingText, setShoppingText] = React.useState('');
  const [shoppingItems, setShoppingItems] = React.useState<ShoppingItem[]>([]);
  const [shoppingUpdatedAt, setShoppingUpdatedAt] = React.useState('');
  const [shoppingError, setShoppingError] = React.useState('');
  const [shoppingShareMessage, setShoppingShareMessage] = React.useState('');
  const [isShoppingOrganizing, setIsShoppingOrganizing] = React.useState(false);
  const [highlightedShoppingIds, setHighlightedShoppingIds] = React.useState<string[]>([]);
  const [contacts, setContacts] = React.useState<ContactReminder[]>([]);
  const [contactDraft, setContactDraft] = React.useState('');
  const [calendarOpen, setCalendarOpen] = React.useState(false);
  const activeText = captureMode === 'update' ? updateInstruction : transcript;
  const resultText = [activeText, interimTranscript].filter(Boolean).join('\n');
  const shoppingResultText = [shoppingText, activeView === 'shopping' ? interimTranscript : ''].filter(Boolean).join('\n');
  const isSupported = Boolean(SpeechRecognition);
  const canOrganize = Boolean(transcript.trim()) && !isListening && !isOrganizing;
  const calendarEvents = React.useMemo(() => (plan ? createCalendarEvents(plan) : []), [plan]);

  React.useEffect(() => {
    clearLegacyAndForeignSessionStorage(ownerId);
    const snapshot = loadLatestSnapshot(privateKeys.snapshots);
    setPreviousSnapshot(snapshot);
    setReviewStatuses(snapshot?.review?.statuses ?? {});

    const savedDraft = localStorage.getItem(privateKeys.draft);
    if (savedDraft) {
      setTranscript(savedDraft);
      setOriginalTranscript(savedDraft);
    }

    const savedShopping = readJson<{ items?: ShoppingItem[]; text?: string; updatedAt?: string }>(privateKeys.shopping);
    if (savedShopping) {
      setShoppingText(savedShopping.text ?? '');
      setShoppingItems(Array.isArray(savedShopping.items) ? savedShopping.items : []);
      setShoppingUpdatedAt(savedShopping.updatedAt ?? '');
    }

    const savedContacts = readJson<ContactReminder[]>(privateKeys.contacts);
    if (Array.isArray(savedContacts)) {
      setContacts(savedContacts);
    }
  }, [ownerId, privateKeys]);

  React.useEffect(() => {
    if (transcript.trim()) {
      localStorage.setItem(privateKeys.draft, transcript);
    } else {
      localStorage.removeItem(privateKeys.draft);
    }
  }, [privateKeys.draft, transcript]);

  React.useEffect(() => {
    localStorage.setItem(
      privateKeys.shopping,
      JSON.stringify({ items: shoppingItems, text: shoppingText, updatedAt: shoppingUpdatedAt }),
    );
  }, [privateKeys.shopping, shoppingItems, shoppingText, shoppingUpdatedAt]);

  React.useEffect(() => {
    localStorage.setItem(privateKeys.contacts, JSON.stringify(contacts));
  }, [privateKeys.contacts, contacts]);

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
      setError('');
      setShoppingError('');
    };
    instance.onend = () => {
      setIsListening(false);
      setInterimTranscript('');
    };
    instance.onerror = (event) => {
      setIsListening(false);
      setInterimTranscript('');
      const message = getSpeechErrorMessage(event.error);
      if (activeView === 'shopping') setShoppingError(message);
      else setError(message);
    };
    instance.onresult = (event) => {
      let finalText = '';
      let interimText = '';
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const phrase = event.results[index][0].transcript;
        if (event.results[index].isFinal) finalText += phrase;
        else interimText += phrase;
      }
      if (finalText) appendRecognizedText(finalText.trim());
      setInterimTranscript(interimText.trim());
    };

    setRecognition(instance);
    return () => instance.abort();
  }, [activeView, captureMode]);

  const appendRecognizedText = (text: string) => {
    const append = (current: string) => `${current}${current ? '\n' : ''}${text}`;
    if (activeView === 'shopping') {
      setShoppingText((current) => append(current));
      return;
    }
    if (activeView === 'contacts') {
      setContactDraft((current) => append(current));
      return;
    }
    if (captureMode === 'update') {
      setUpdateInstruction((current) => append(current));
      return;
    }
    setTranscript((current) => {
      const next = append(current);
      setOriginalTranscript(next);
      return next;
    });
    setPlan(null);
  };

  const startListening = () => {
    if (!recognition || isListening) return;
    try {
      recognition.start();
    } catch {
      const message = '音声入力を開始できませんでした。少し待ってからもう一度お試しください。';
      activeView === 'shopping' ? setShoppingError(message) : setError(message);
    }
  };

  const stopListening = () => recognition?.stop();

  const resetPrivateData = () => {
    recognition?.abort();
    [privateKeys.draft, privateKeys.shopping, privateKeys.snapshots, privateKeys.contacts].forEach((key) =>
      localStorage.removeItem(key),
    );
    setTranscript('');
    setOriginalTranscript('');
    setUpdateInstruction('');
    setInterimTranscript('');
    setPlan(null);
    setPreviousSnapshot(null);
    setReviewStatuses({});
    setCarriedTodos([]);
    setShoppingText('');
    setShoppingItems([]);
    setShoppingUpdatedAt('');
    setContacts([]);
    setContactDraft('');
    setError('');
    setShoppingError('');
    setCaptureMode('create');
  };

  const organizeMorning = () => {
    const text = captureMode === 'update' ? updateInstruction : transcript;
    if (!text.trim()) return;

    const contactTexts = contacts.filter((item) => !item.completed).map((item) => item.text);
    const shoppingLabels = shoppingItems.filter((item) => !item.completed).map(formatShoppingItemLabel);
    const derivedContacts = extractContactReminders(text);
    mergeContacts(derivedContacts);

    setIsOrganizing(true);
    setError('');
    createAiMorningPlan(text, energy, {
      contactReminders: Array.from(new Set([...contactTexts, ...derivedContacts.map((item) => item.text)])),
      currentPlan: captureMode === 'update' ? plan : null,
      mode: captureMode,
      shoppingItems: shoppingLabels,
    })
      .then((nextPlan) => {
        const mergedPlan = captureMode === 'update' && plan ? preserveExistingPlan(plan, nextPlan) : nextPlan;
        const planWithCarryover = addCarryoverToPlan(mergedPlan, carriedTodos);
        setPlan(planWithCarryover);
        setCalendarOpen(false);
        setCaptureMode('update');
        setUpdateInstruction('');
        if (captureMode === 'update') {
          setTranscript((current) => `${current.trim()}\n\n追加・修正指示:\n${text.trim()}`.trim());
        }
        saveMorningSnapshot(transcript || text, planWithCarryover, privateKeys.snapshots, ownerId);
      })
      .catch((reason: unknown) => {
        console.error(reason);
        setError(reason instanceof Error ? reason.message : 'AI整理に失敗しました。もう一度お試しください。');
      })
      .finally(() => setIsOrganizing(false));
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
        setHighlightedShoppingIds(shoppingPlan.items.filter((item) => !previousIds.has(item.id)).map((item) => item.id));
      })
      .catch((reason: unknown) => {
        console.error(reason);
        setShoppingError('買い物リストを整理できませんでした。内容を少し短くしてもう一度お試しください。');
      })
      .finally(() => setIsShoppingOrganizing(false));
  };

  const addManualShoppingItem = () => {
    const item = createManualShoppingItem(shoppingText);
    if (!item) return;
    setShoppingItems((current) => [...current, item]);
    setShoppingUpdatedAt(new Date().toISOString());
    setHighlightedShoppingIds([item.id]);
    setShoppingText('');
  };

  const addContactReminder = (text = contactDraft) => {
    const normalized = text.trim();
    if (!normalized) return;
    const next = createContactReminder(normalized);
    mergeContacts([next]);
    setContactDraft('');
  };

  const mergeContacts = (items: ContactReminder[]) => {
    if (!items.length) return;
    setContacts((current) => {
      const existing = new Set(current.map((item) => normalizeText(item.text)));
      const additions = items.filter((item) => !existing.has(normalizeText(item.text)));
      return [...additions, ...current];
    });
  };

  const shareShoppingList = async () => {
    const shareText = formatShoppingShareText(shoppingItems);
    setShoppingShareMessage('');
    try {
      if (navigator.share) {
        await navigator.share({ text: shareText, title: '今日の買い物リスト' });
        setShoppingShareMessage('共有メニューを開きました。LINEなどで送れます。');
        return;
      }
      await navigator.clipboard.writeText(shareText);
      setShoppingShareMessage('買い物リストをコピーしました。LINEなどに貼り付けて共有できます。');
    } catch (reason) {
      setShoppingShareMessage(isShareCancelError(reason) ? '共有をキャンセルしました。' : '共有できませんでした。');
    }
  };

  return (
    <main className="app-shell">
      <section className="phone-shell" aria-label="MORNING FLOW AI v3.0">
        <header className="top-bar">
          <div>
            <p className="eyebrow">MORNING FLOW AI <span>{appVersion}</span></p>
            <h1>今日を安全に整える</h1>
          </div>
          <div className="brand-mark" aria-hidden="true"><Sparkles size={20} /></div>
        </header>

        <div className="privacy-strip">
          <ShieldCheck size={18} />
          <span>v3専用の個人プロファイルに保存中。v2共有データは読み込みません。</span>
        </div>

        <nav className="segmented-nav" aria-label="メニュー">
          <button className={activeView === 'morning' ? 'selected' : ''} onClick={() => setActiveView('morning')} type="button">朝</button>
          <button className={activeView === 'shopping' ? 'selected' : ''} onClick={() => setActiveView('shopping')} type="button">買い物</button>
          <button className={activeView === 'contacts' ? 'selected' : ''} onClick={() => setActiveView('contacts')} type="button">連絡</button>
        </nav>

        {activeView === 'morning' && (
          <MorningView
            canOrganize={canOrganize}
            calendarEvents={calendarEvents}
            calendarOpen={calendarOpen}
            carriedTodos={carriedTodos}
            contacts={contacts}
            energy={energy}
            error={error}
            isListening={isListening}
            isOrganizing={isOrganizing}
            isSupported={isSupported}
            onCalendarOpenChange={setCalendarOpen}
            onCarryOver={(todos) => {
              setCarriedTodos(todos);
              setPlan((current) => (current ? addCarryoverToPlan(current, todos) : current));
            }}
            onEnergyChange={setEnergy}
            onOrganize={organizeMorning}
            onReset={resetPrivateData}
            onSample={() => {
              setTranscript(sampleTranscript);
              setOriginalTranscript(sampleTranscript);
              setPlan(null);
              setCaptureMode('create');
            }}
            onStartListening={startListening}
            onStatusChange={(task, status) => {
              if (!previousSnapshot) return;
              const nextStatuses = { ...reviewStatuses, [task]: status };
              setReviewStatuses(nextStatuses);
              saveReview(previousSnapshot.id, nextStatuses, privateKeys.snapshots);
            }}
            onStopListening={stopListening}
            onTextChange={(value) => {
              captureMode === 'update' ? setUpdateInstruction(value) : setTranscript(value);
              setError('');
            }}
            plan={plan}
            previousSnapshot={previousSnapshot}
            resultText={resultText}
            reviewStatuses={reviewStatuses}
            shoppingItems={shoppingItems}
            textChanged={captureMode === 'create' && transcript.trim() !== originalTranscript.trim()}
          />
        )}

        {activeView === 'shopping' && (
          <ShoppingView
            error={shoppingError}
            highlightedIds={highlightedShoppingIds}
            isListening={isListening}
            isOrganizing={isShoppingOrganizing}
            isSupported={isSupported}
            items={shoppingItems}
            onAddManual={addManualShoppingItem}
            onDelete={(id) => {
              setShoppingItems((current) => current.filter((item) => item.id !== id));
              setShoppingUpdatedAt(new Date().toISOString());
            }}
            onEdit={(id, value) => {
              const parsed = parseShoppingItemInput(value);
              if (!parsed.name) return;
              setShoppingItems((current) =>
                current.map((item) => (item.id === id ? { ...item, name: parsed.name, quantity: parsed.quantity } : item)),
              );
              setShoppingUpdatedAt(new Date().toISOString());
            }}
            onOrganize={organizeShoppingList}
            onReset={() => {
              setShoppingText('');
              setShoppingItems([]);
              setShoppingUpdatedAt('');
            }}
            onShare={shareShoppingList}
            onStartListening={startListening}
            onStopListening={stopListening}
            onTextChange={setShoppingText}
            onToggle={(id) => {
              setShoppingItems((current) =>
                current.map((item) => (item.id === id ? { ...item, completed: !item.completed } : item)),
              );
              setShoppingUpdatedAt(new Date().toISOString());
            }}
            resultText={shoppingResultText}
            shareMessage={shoppingShareMessage}
            text={shoppingText}
            updatedAt={shoppingUpdatedAt}
          />
        )}

        {activeView === 'contacts' && (
          <ContactsView
            contacts={contacts}
            draft={contactDraft}
            isListening={isListening}
            isSupported={isSupported}
            onAdd={() => addContactReminder()}
            onDelete={(id) => setContacts((current) => current.filter((item) => item.id !== id))}
            onDraftChange={setContactDraft}
            onStartListening={startListening}
            onStopListening={stopListening}
            onToggle={(id) =>
              setContacts((current) =>
                current.map((item) => (item.id === id ? { ...item, completed: !item.completed } : item)),
              )
            }
          />
        )}
      </section>
    </main>
  );
}

function MorningView({
  calendarEvents,
  calendarOpen,
  canOrganize,
  carriedTodos,
  contacts,
  energy,
  error,
  isListening,
  isOrganizing,
  isSupported,
  onCalendarOpenChange,
  onCarryOver,
  onEnergyChange,
  onOrganize,
  onReset,
  onSample,
  onStartListening,
  onStatusChange,
  onStopListening,
  onTextChange,
  plan,
  previousSnapshot,
  resultText,
  reviewStatuses,
  shoppingItems,
}: {
  calendarEvents: CalendarEvent[];
  calendarOpen: boolean;
  canOrganize: boolean;
  carriedTodos: string[];
  contacts: ContactReminder[];
  energy: EnergyMood;
  error: string;
  isListening: boolean;
  isOrganizing: boolean;
  isSupported: boolean;
  onCalendarOpenChange: (open: boolean) => void;
  onCarryOver: (todos: string[]) => void;
  onEnergyChange: (energy: EnergyMood) => void;
  onOrganize: () => void;
  onReset: () => void;
  onSample: () => void;
  onStartListening: () => void;
  onStatusChange: (task: string, status: ReviewStatus) => void;
  onStopListening: () => void;
  onTextChange: (value: string) => void;
  plan: MorningPlan | null;
  previousSnapshot: MorningSnapshot | null;
  resultText: string;
  reviewStatuses: Record<string, ReviewStatus>;
  shoppingItems: ShoppingItem[];
  textChanged: boolean;
}) {
  const unfinishedContacts = contacts.filter((item) => !item.completed);
  const unfinishedShopping = shoppingItems.filter((item) => !item.completed);

  return (
    <div className="view-stack">
      <VoicePad
        isListening={isListening}
        isSupported={isSupported}
        onStart={onStartListening}
        onStop={onStopListening}
        status={isListening ? '音声認識中' : plan ? '今日の流れを整理しました' : '話すだけで予定・買い物・連絡を整理'}
      />

      <div className="energy-row">
        {energyOptions.map((option) => (
          <button className={energy === option.value ? 'selected' : ''} key={option.value} onClick={() => onEnergyChange(option.value)} type="button">
            {option.label}
          </button>
        ))}
      </div>

      {previousSnapshot && (
        <ReflectionView
          carriedTodos={carriedTodos}
          onCarryOver={onCarryOver}
          onStatusChange={onStatusChange}
          snapshot={previousSnapshot}
          statuses={reviewStatuses}
        />
      )}

      <section className="panel">
        <div className="panel-header">
          <span>Morning Capture</span>
          <strong>今日の予定・買い物・連絡忘れをまとめて入力</strong>
        </div>
        <textarea
          aria-label="今日の予定を入力"
          onChange={(event) => onTextChange(event.target.value)}
          placeholder="例: 10時に資料作成。牛乳と卵を買う。山田さんに折り返し電話。LINE返信も忘れない。"
          rows={7}
          value={resultText}
        />
        <div className="button-row">
          <button className="secondary-button" onClick={onSample} type="button">サンプル</button>
          <button className="secondary-button" onClick={onReset} type="button"><RefreshCw size={16} />個人データ初期化</button>
        </div>
        {error && <p className="error-message">{error}</p>}
        <button className="primary-button" disabled={!canOrganize || isOrganizing} onClick={onOrganize} type="button">
          {isOrganizing ? <Loader2 className="spin" size={18} /> : <Sparkles size={18} />}
          {isOrganizing ? 'AIが整理中' : 'AIで今日を整理'}
        </button>
      </section>

      {(unfinishedShopping.length > 0 || unfinishedContacts.length > 0) && (
        <section className="panel compact">
          <div className="panel-header">
            <span>Context</span>
            <strong>AI整理に含める未完了メモ</strong>
          </div>
          {unfinishedShopping.length > 0 && <p>買い物: {unfinishedShopping.map(formatShoppingItemLabel).join('、')}</p>}
          {unfinishedContacts.length > 0 && <p>連絡: {unfinishedContacts.map((item) => item.text).join('、')}</p>}
        </section>
      )}

      {plan && <PlanView events={calendarEvents} isCalendarOpen={calendarOpen} onCalendarOpenChange={onCalendarOpenChange} plan={plan} />}
    </div>
  );
}

function ShoppingView({
  error,
  highlightedIds,
  isListening,
  isOrganizing,
  isSupported,
  items,
  onAddManual,
  onDelete,
  onEdit,
  onOrganize,
  onReset,
  onShare,
  onStartListening,
  onStopListening,
  onTextChange,
  onToggle,
  resultText,
  shareMessage,
  text,
  updatedAt,
}: {
  error: string;
  highlightedIds: string[];
  isListening: boolean;
  isOrganizing: boolean;
  isSupported: boolean;
  items: ShoppingItem[];
  onAddManual: () => void;
  onDelete: (id: string) => void;
  onEdit: (id: string, value: string) => void;
  onOrganize: () => void;
  onReset: () => void;
  onShare: () => void;
  onStartListening: () => void;
  onStopListening: () => void;
  onTextChange: (value: string) => void;
  onToggle: (id: string) => void;
  resultText: string;
  shareMessage: string;
  text: string;
  updatedAt: string;
}) {
  const groups = groupShoppingItems(items);

  return (
    <div className="view-stack">
      <VoicePad
        isListening={isListening}
        isSupported={isSupported}
        onStart={onStartListening}
        onStop={onStopListening}
        status={isListening ? '買い物を聞き取り中' : '数量と単位を残してカテゴリ分け'}
      />
      <section className="panel">
        <div className="panel-header">
          <span>Shopping</span>
          <strong>音声またはテキストから買い物リスト作成</strong>
        </div>
        <textarea
          aria-label="買い物メモ"
          onChange={(event) => onTextChange(event.target.value)}
          placeholder="例: 牛乳1本、卵1パック、炭酸水2L、洗剤"
          rows={5}
          value={resultText || text}
        />
        {error && <p className="error-message">{error}</p>}
        <div className="button-row">
          <button className="primary-button" disabled={!text.trim() || isOrganizing} onClick={onOrganize} type="button">
            {isOrganizing ? <Loader2 className="spin" size={18} /> : <ShoppingCart size={18} />}
            AIで分類
          </button>
          <button className="secondary-button" disabled={!text.trim()} onClick={onAddManual} type="button">手動追加</button>
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <span>{updatedAt ? new Date(updatedAt).toLocaleString('ja-JP', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'List'}</span>
          <strong>{items.length}件の買い物</strong>
        </div>
        {groups.length ? (
          groups.map((group) => (
            <div className="list-group" key={group.category}>
              <h3>{group.category}</h3>
              {group.items.map((item) => (
                <ShoppingRow
                  highlighted={highlightedIds.includes(item.id)}
                  item={item}
                  key={item.id}
                  onDelete={onDelete}
                  onEdit={onEdit}
                  onToggle={onToggle}
                />
              ))}
            </div>
          ))
        ) : (
          <p className="empty-text">買い物リストはまだありません。</p>
        )}
        <div className="button-row">
          <button className="secondary-button" disabled={!items.length} onClick={onShare} type="button"><Share2 size={16} />共有文を作る</button>
          <button className="danger-button" disabled={!items.length} onClick={onReset} type="button"><Trash2 size={16} />クリア</button>
        </div>
        {shareMessage && <p className="success-message">{shareMessage}</p>}
      </section>
    </div>
  );
}

function ContactsView({
  contacts,
  draft,
  isListening,
  isSupported,
  onAdd,
  onDelete,
  onDraftChange,
  onStartListening,
  onStopListening,
  onToggle,
}: {
  contacts: ContactReminder[];
  draft: string;
  isListening: boolean;
  isSupported: boolean;
  onAdd: () => void;
  onDelete: (id: string) => void;
  onDraftChange: (value: string) => void;
  onStartListening: () => void;
  onStopListening: () => void;
  onToggle: (id: string) => void;
}) {
  const unfinished = contacts.filter((item) => !item.completed);

  return (
    <div className="view-stack">
      <VoicePad
        isListening={isListening}
        isSupported={isSupported}
        onStart={onStartListening}
        onStop={onStopListening}
        status={isListening ? '連絡忘れを聞き取り中' : '電話・LINE・メール・SNS返信を保存'}
      />
      <section className="panel">
        <div className="panel-header">
          <span>Reply Check</span>
          <strong>未完了の連絡を次回起動時にも確認</strong>
        </div>
        <textarea
          aria-label="連絡忘れ"
          onChange={(event) => onDraftChange(event.target.value)}
          placeholder="例: 山田さんに折り返し電話 / 佐藤さんへLINE返信 / 請求書メール返信"
          rows={4}
          value={draft}
        />
        <button className="primary-button" disabled={!draft.trim()} onClick={onAdd} type="button">
          <CheckCircle2 size={18} />未完了リストに追加
        </button>
      </section>
      <section className="panel">
        <div className="panel-header">
          <span>{unfinished.length} pending</span>
          <strong>連絡忘れリスト</strong>
        </div>
        {contacts.length ? (
          <div className="contact-list">
            {contacts.map((item) => (
              <ContactRow item={item} key={item.id} onDelete={onDelete} onToggle={onToggle} />
            ))}
          </div>
        ) : (
          <p className="empty-text">未完了の連絡はありません。</p>
        )}
      </section>
    </div>
  );
}

function VoicePad({
  isListening,
  isSupported,
  onStart,
  onStop,
  status,
}: {
  isListening: boolean;
  isSupported: boolean;
  onStart: () => void;
  onStop: () => void;
  status: string;
}) {
  return (
    <section className="voice-pad">
      <button
        aria-label={isListening ? '音声入力を停止' : '音声入力を開始'}
        className={`mic-button ${isListening ? 'is-listening' : ''}`}
        disabled={!isSupported}
        onClick={isListening ? onStop : onStart}
        type="button"
      >
        {isListening ? <Square fill="currentColor" size={34} /> : <Mic size={48} />}
      </button>
      <p>{isSupported ? status : 'このブラウザは音声入力に対応していません'}</p>
    </section>
  );
}

function PlanView({
  events,
  isCalendarOpen,
  onCalendarOpenChange,
  plan,
}: {
  events: CalendarEvent[];
  isCalendarOpen: boolean;
  onCalendarOpenChange: (open: boolean) => void;
  plan: MorningPlan;
}) {
  return (
    <section className="plan-stack">
      <PlanCard icon={<Sparkles size={17} />} title="目的"><p className="purpose-text">{plan.purpose}</p></PlanCard>
      <PlanCard icon={<CheckCircle2 size={17} />} title="今日やること">
        <ul>{plan.todos.map((todo) => <li key={todo}>{todo}</li>)}</ul>
      </PlanCard>
      <PlanCard icon={<Clock3 size={17} />} title="推奨タイムスケジュール">
        <div className="schedule-list">
          {plan.schedule.map((item) => (
            <div className="schedule-item" key={`${item.time}-${item.task}`}>
              <time>{item.time}</time>
              <span>{item.task}</span>
            </div>
          ))}
        </div>
        <button className="secondary-button full" disabled={!events.length} onClick={() => onCalendarOpenChange(!isCalendarOpen)} type="button">
          <CalendarPlus size={17} />登録前確認を開く
        </button>
        {isCalendarOpen && <GoogleCalendarExportPanel events={events} />}
      </PlanCard>
      <PlanCard icon={<ShoppingCart size={17} />} title="買い物候補">
        {plan.shoppingCandidates.length ? <ul>{plan.shoppingCandidates.map((item) => <li key={item}>{item}</li>)}</ul> : <p>買い物候補はありません。</p>}
      </PlanCard>
      <PlanCard icon={<MessageCircle size={17} />} title="連絡忘れ">
        {plan.contactReminders.length ? <ul>{plan.contactReminders.map((item) => <li key={item}>{item}</li>)}</ul> : <p>連絡忘れはありません。</p>}
      </PlanCard>
      <PlanCard icon={<CalendarClock size={17} />} title="優先順位">
        <div className="priority-grid">
          <p><strong>最優先</strong>{plan.priorities.highest.join('、') || 'なし'}</p>
          <p><strong>重要</strong>{plan.priorities.important.join('、') || 'なし'}</p>
          <p><strong>余裕があれば</strong>{plan.priorities.optional.join('、') || 'なし'}</p>
        </div>
      </PlanCard>
    </section>
  );
}

function GoogleCalendarExportPanel({ events }: { events: CalendarEvent[] }) {
  const [accessToken, setAccessToken] = React.useState('');
  const [selectedEventIds, setSelectedEventIds] = React.useState(() => events.map((event) => event.id));
  const [statusMessage, setStatusMessage] = React.useState('');
  const [isSigningIn, setIsSigningIn] = React.useState(false);
  const [isRegistering, setIsRegistering] = React.useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = React.useState(false);
  const isConfigured = isGoogleCalendarConfigured();
  const selectedEvents = events.filter((event) => selectedEventIds.includes(event.id));

  React.useEffect(() => {
    setSelectedEventIds(events.map((event) => event.id));
  }, [events]);

  const connectGoogle = () => {
    setIsSigningIn(true);
    setStatusMessage('');
    requestGoogleAccessToken('select_account consent')
      .then((token) => {
        setAccessToken(token);
        setStatusMessage('Googleに接続しました。登録前に予定とアカウント選択画面を必ず確認してください。');
      })
      .catch((reason: unknown) => {
        setStatusMessage(reason instanceof Error ? reason.message : 'Googleログインに失敗しました。');
      })
      .finally(() => setIsSigningIn(false));
  };

  const disconnectGoogle = () => {
    if (accessToken) revokeGoogleAccessToken(accessToken);
    setAccessToken('');
    setStatusMessage('Google連携を解除しました。自動再接続はしません。');
  };

  const registerSelectedEvents = () => {
    if (!accessToken || !selectedEvents.length) return;
    setIsRegistering(true);
    setStatusMessage('');
    insertGoogleCalendarEvents(accessToken, selectedEvents)
      .then(() => {
        setStatusMessage(`${selectedEvents.length}件をGoogleカレンダーへ登録しました。`);
        setIsConfirmOpen(false);
      })
      .catch((reason: unknown) => {
        setStatusMessage(reason instanceof Error ? reason.message : '登録に失敗しました。Googleアカウントと権限を確認してください。');
      })
      .finally(() => setIsRegistering(false));
  };

  return (
    <div className="calendar-panel">
      <div className="panel-header">
        <span>Google Calendar</span>
        <strong>登録前に予定を確認</strong>
      </div>
      {!isConfigured && <p className="warning-message">.envにVITE_GOOGLE_CLIENT_IDを設定すると直接登録できます。</p>}
      <div className="calendar-safe-card">
        <ShieldCheck size={17} />
        <span>自動再接続なし。毎回アカウント選択を要求します。</span>
      </div>
      {events.map((event) => (
        <label className="calendar-event" key={event.id}>
          <input
            checked={selectedEventIds.includes(event.id)}
            onChange={() =>
              setSelectedEventIds((current) =>
                current.includes(event.id) ? current.filter((id) => id !== event.id) : [...current, event.id],
              )
            }
            type="checkbox"
          />
          <span><time>{formatEventTime(event.start)} - {formatEventTime(event.end)}</time>{event.title}</span>
        </label>
      ))}
      <div className="button-row">
        {accessToken ? (
          <button className="secondary-button" onClick={disconnectGoogle} type="button">ログアウト</button>
        ) : (
          <button className="secondary-button" disabled={!isConfigured || isSigningIn} onClick={connectGoogle} type="button">
            {isSigningIn ? '接続中' : 'Googleログイン'}
          </button>
        )}
        <button className="primary-button" disabled={!accessToken || !selectedEvents.length} onClick={() => setIsConfirmOpen(true)} type="button">
          <CalendarPlus size={17} />登録確認
        </button>
      </div>
      <button className="secondary-button full" disabled={!selectedEvents.length} onClick={() => selectedEvents.forEach((event) => window.open(createGoogleCalendarUrl(event), '_blank', 'noopener,noreferrer'))} type="button">
        <ExternalLink size={17} />Google画面で確認して登録
      </button>
      <button className="secondary-button full" onClick={() => downloadIcs(events)} type="button"><Download size={17} />Appleカレンダー用ファイル保存</button>
      {statusMessage && <p className="success-message">{statusMessage}</p>}
      {isConfirmOpen && (
        <div className="confirm-dialog-backdrop" role="presentation">
          <section aria-modal="true" className="confirm-dialog" role="dialog">
            <AlertTriangle size={22} />
            <h2>このGoogleアカウントへ登録しますか？</h2>
            <p>Googleのアカウント選択画面で、登録先が自分のアカウントであることを確認してください。</p>
            <ul>{selectedEvents.map((event) => <li key={event.id}>{event.title}</li>)}</ul>
            <div className="button-row">
              <button className="secondary-button" onClick={() => setIsConfirmOpen(false)} type="button">キャンセル</button>
              <button className="primary-button" disabled={isRegistering} onClick={registerSelectedEvents} type="button">
                {isRegistering ? <Loader2 className="spin" size={17} /> : <CalendarPlus size={17} />}登録する
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

function PlanCard({ children, icon, title }: { children: React.ReactNode; icon: React.ReactNode; title: string }) {
  return (
    <article className="panel plan-card">
      <div className="plan-title"><span>{icon}</span><h2>{title}</h2></div>
      {children}
    </article>
  );
}

function ShoppingRow({
  highlighted,
  item,
  onDelete,
  onEdit,
  onToggle,
}: {
  highlighted: boolean;
  item: ShoppingItem;
  onDelete: (id: string) => void;
  onEdit: (id: string, value: string) => void;
  onToggle: (id: string) => void;
}) {
  return (
    <div className={`item-row ${highlighted ? 'is-new' : ''}`}>
      <label>
        <input checked={item.completed} onChange={() => onToggle(item.id)} type="checkbox" />
        <span>{formatShoppingItemLabel(item)}</span>
      </label>
      <button aria-label="編集" onClick={() => {
        const next = window.prompt('商品名と数量を編集してください', formatShoppingItemLabel(item))?.trim();
        if (next) onEdit(item.id, next);
      }} type="button"><Pencil size={15} /></button>
      <button aria-label="削除" onClick={() => onDelete(item.id)} type="button"><Trash2 size={15} /></button>
    </div>
  );
}

function ContactRow({ item, onDelete, onToggle }: { item: ContactReminder; onDelete: (id: string) => void; onToggle: (id: string) => void }) {
  return (
    <div className="item-row">
      <label>
        <input checked={item.completed} onChange={() => onToggle(item.id)} type="checkbox" />
        <span>{getContactIcon(item.kind)}{item.text}</span>
      </label>
      <button aria-label="削除" onClick={() => onDelete(item.id)} type="button"><Trash2 size={15} /></button>
    </div>
  );
}

function ReflectionView({
  carriedTodos,
  onCarryOver,
  onStatusChange,
  snapshot,
  statuses,
}: {
  carriedTodos: string[];
  onCarryOver: (todos: string[]) => void;
  onStatusChange: (task: string, status: ReviewStatus) => void;
  snapshot: MorningSnapshot;
  statuses: Record<string, ReviewStatus>;
}) {
  const todos = snapshot.plan.todos;
  const unfinished = todos.filter((todo) => statuses[todo] === 'missed' || statuses[todo] === 'partial');
  if (!todos.length) return null;

  return (
    <section className="panel compact">
      <div className="panel-header">
        <span>Yesterday</span>
        <strong>前回の未完了を確認</strong>
      </div>
      {todos.slice(0, 4).map((todo) => (
        <div className="review-row" key={todo}>
          <span>{todo}</span>
          <div>
            {reviewOptions.map((option) => (
              <button className={statuses[todo] === option.value ? 'selected' : ''} key={option.value} onClick={() => onStatusChange(todo, option.value)} type="button">
                {option.label}
              </button>
            ))}
          </div>
        </div>
      ))}
      <button className="secondary-button full" disabled={!unfinished.length} onClick={() => onCarryOver(unfinished)} type="button">
        {carriedTodos.length ? `${carriedTodos.length}件を反映中` : '未完了を今日へ繰り越す'}
      </button>
    </section>
  );
}

function createCalendarEvents(plan: MorningPlan): CalendarEvent[] {
  const today = new Date();
  today.setSeconds(0, 0);

  return plan.schedule
    .map((item, index) => {
      const range = parseScheduleTime(item.time);
      if (!range) return null;
      const start = new Date(today);
      start.setHours(Math.floor(range.startMinutes / 60), range.startMinutes % 60, 0, 0);
      const end = new Date(today);
      const endMinutes = range.endMinutes ?? range.startMinutes + 60;
      end.setHours(Math.floor(endMinutes / 60), endMinutes % 60, 0, 0);
      if (end <= start) end.setTime(start.getTime() + 60 * 60 * 1000);
      const title = item.task.trim() || 'MORNING FLOW AI 予定';
      return {
        id: `${index}-${item.time}-${title}`,
        title,
        start,
        end,
        priority: getSchedulePriority(title, plan),
        sourceTime: item.time,
        memo: `MORNING FLOW AI v3.0で整理した予定: ${item.time} ${title}\n今日の目的: ${plan.purpose}`,
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

function parseScheduleTime(timeText: string) {
  const matches = Array.from(timeText.replace(/：/g, ':').matchAll(/(\d{1,2})(?::(\d{2})|時(?:\s*(\d{1,2})\s*分?)?)/g));
  const times = matches
    .map((match) => {
      const hour = Number(match[1]);
      const minute = Number(match[2] ?? match[3] ?? 0);
      if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
      return hour * 60 + minute;
    })
    .filter((minutes): minutes is number => minutes !== null);
  if (!times.length) return null;
  return { startMinutes: times[0], endMinutes: times[1] };
}

function createGoogleCalendarUrl(event: CalendarEvent) {
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    ctz: 'Asia/Tokyo',
    dates: `${toLocalCalendarTimestamp(event.start)}/${toLocalCalendarTimestamp(event.end)}`,
    details: event.memo,
    text: event.title,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

function downloadIcs(events: CalendarEvent[]) {
  const now = toCalendarTimestamp(new Date());
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//MORNING FLOW AI v3.0//Calendar Export//JA',
    'CALSCALE:GREGORIAN',
    ...events.flatMap((event, index) => [
      'BEGIN:VEVENT',
      `UID:morning-flow-ai-v3-${Date.now()}-${index}@local`,
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
  link.download = 'morning-flow-ai-v3-schedule.ics';
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function formatShoppingShareText(items: ShoppingItem[]) {
  const groups = groupShoppingItems(items).filter((group) => group.items.length > 0);
  const body = groups
    .map((group) => [`■ ${group.category}`, ...group.items.map((item) => `・${formatShoppingItemLabel(item)}`)].join('\n'))
    .join('\n\n');
  return ['【今日の買い物リスト】', '', body || '買い物リストはまだありません。', '', '買い物よろしくお願いします。'].join('\n');
}

function extractContactReminders(text: string): ContactReminder[] {
  return text
    .split(/[。\n、,]/)
    .map((value) => value.trim())
    .filter((value) => /(折り返し|電話|LINE|ライン|メール|返信|SNS|DM|連絡)/i.test(value))
    .map(createContactReminder);
}

function createContactReminder(text: string): ContactReminder {
  return {
    id: `contact-${createId()}`,
    text,
    kind: detectContactKind(text),
    completed: false,
    createdAt: new Date().toISOString(),
  };
}

function detectContactKind(text: string): ContactKind {
  if (/電話|折り返し/.test(text)) return 'phone';
  if (/LINE|ライン/i.test(text)) return 'line';
  if (/メール|mail/i.test(text)) return 'mail';
  if (/SNS|DM|Instagram|X|Twitter/i.test(text)) return 'sns';
  return 'other';
}

function getContactIcon(kind: ContactKind) {
  const props = { size: 15, 'aria-hidden': true };
  if (kind === 'phone') return <Phone {...props} />;
  if (kind === 'line') return <MessageCircle {...props} />;
  if (kind === 'mail') return <Mail {...props} />;
  if (kind === 'sns') return <AtSign {...props} />;
  return <Home {...props} />;
}

function preserveExistingPlan(previousPlan: MorningPlan, nextPlan: MorningPlan): MorningPlan {
  return {
    ...nextPlan,
    goals: mergeStrings(previousPlan.goals, nextPlan.goals),
    todos: mergeStrings(previousPlan.todos, nextPlan.todos),
    schedule: sortScheduleByTime(mergeSchedule(previousPlan.schedule, nextPlan.schedule)),
    shoppingCandidates: mergeStrings(previousPlan.shoppingCandidates, nextPlan.shoppingCandidates),
    contactReminders: mergeStrings(previousPlan.contactReminders, nextPlan.contactReminders),
    priorities: {
      highest: mergeStrings(previousPlan.priorities.highest, nextPlan.priorities.highest),
      important: mergeStrings(previousPlan.priorities.important, nextPlan.priorities.important),
      optional: mergeStrings(previousPlan.priorities.optional, nextPlan.priorities.optional),
    },
  };
}

function mergeSchedule(previousSchedule: MorningPlan['schedule'], nextSchedule: MorningPlan['schedule']) {
  const byKey = new Map<string, MorningPlan['schedule'][number]>();
  previousSchedule.forEach((item) => byKey.set(`${item.time.trim()}::${item.task.trim()}`, item));
  nextSchedule.forEach((item) => byKey.set(`${item.time.trim()}::${item.task.trim()}`, item));
  return Array.from(byKey.values());
}

function addCarryoverToPlan(plan: MorningPlan, carriedTodos: string[]): MorningPlan {
  if (!carriedTodos.length) return plan;
  return {
    ...plan,
    todos: mergeStrings(carriedTodos, plan.todos),
    priorities: {
      ...plan.priorities,
      highest: mergeStrings(carriedTodos, plan.priorities.highest),
    },
  };
}

function sortScheduleByTime(schedule: MorningPlan['schedule']) {
  return [...schedule].sort((a, b) => (parseScheduleTime(a.time)?.startMinutes ?? 99999) - (parseScheduleTime(b.time)?.startMinutes ?? 99999));
}

function mergeStrings(previousItems: string[], nextItems: string[]) {
  return Array.from(new Set([...previousItems, ...nextItems].map((item) => item.trim()).filter(Boolean)));
}

function includesSimilarTask(tasks: string[], title: string) {
  const normalizedTitle = normalizeText(title);
  return tasks.some((task) => {
    const normalizedTask = normalizeText(task);
    return normalizedTask.includes(normalizedTitle) || normalizedTitle.includes(normalizedTask);
  });
}

function normalizeText(value: string) {
  return value.replace(/\s/g, '').toLowerCase();
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
  return value.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
}

function formatEventTime(date: Date) {
  return date.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
}

function readJson<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    localStorage.removeItem(key);
    return null;
  }
}

function isShareCancelError(error: unknown) {
  if (!(error instanceof DOMException || error instanceof Error)) return false;
  return error.name === 'AbortError' || /cancel|abort|キャンセル/i.test(error.message);
}

function getSpeechErrorMessage(error: string) {
  if (error === 'not-allowed' || error === 'service-not-allowed') {
    return 'マイクの使用が許可されていません。ブラウザ設定からマイクを許可してください。';
  }
  if (error === 'no-speech') return '音声が聞き取れませんでした。もう一度お試しください。';
  if (error === 'network') return '音声認識サービスに接続できませんでした。通信状況を確認してください。';
  return '音声認識で問題が起きました。もう一度お試しください。';
}

function createId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
