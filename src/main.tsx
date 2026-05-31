import React from 'react';
import ReactDOM from 'react-dom/client';
import {
  AlertTriangle,
  CalendarPlus,
  CheckCircle2,
  Loader2,
  MessageCircle,
  Mic,
  RefreshCw,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
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
import {
  createSnapshotStorageKey,
  loadLatestSnapshot,
  saveMorningSnapshot,
  saveReview,
  type MorningSnapshot,
  type ReviewStatus,
} from './services/reflectionStorage';
import {
  createManualShoppingItem,
  createShoppingPlan,
  formatShoppingItemLabel,
  groupShoppingItems,
  parseShoppingItemInput,
  type ShoppingItem,
} from './services/shoppingPlanner';
import './styles.css';

type AppView = 'morning' | 'shopping' | 'contacts';
type ContactKind = 'phone' | 'line' | 'mail' | 'sns' | 'other';
type CaptureMode = 'create' | 'update';

interface ContactReminder {
  id: string;
  text: string;
  kind: ContactKind;
  completed: boolean;
  createdAt: string;
}

interface PrivateKeys {
  draft: string;
  shopping: string;
  contacts: string;
  snapshots: string;
}

interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  memo: string;
  priority: GoogleCalendarPriority;
}

interface SpeechRecognitionLike extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onresult: ((event: { resultIndex: number; results: SpeechRecognitionResultList }) => void) | null;
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

const SpeechRecognition = window.SpeechRecognition ?? window.webkitSpeechRecognition;
const appVersion = 'v3.1';
const activeProfileSessionKey = 'morning-flow-ai:v3.1:active-user-profile';
const legacyStorageKeys = [
  'morning-flow-ai:transcript-draft:v1',
  'morning-flow-ai:snapshots:v1',
  'morning-flow-ai:shopping-list:v1',
  'morning-flow-ai:google-calendar-login:v1',
  'morning-flow-ai:userProfile:v1',
  'morning-flow-ai:preferences:v1',
  'morning-flow-ai:v3:active-profile',
  'morning-flow-ai:v3:private:snapshots',
];

const energyOptions: Array<{ label: string; value: EnergyMood }> = [
  { label: '好調', value: 'great' },
  { label: '普通', value: 'normal' },
  { label: '疲れ気味', value: 'tired' },
  { label: 'かなり疲れた', value: 'exhausted' },
];

function App() {
  const userProfileId = React.useMemo(getOrCreateUserProfileId, []);
  const privateKeys = React.useMemo(() => createPrivateKeys(userProfileId), [userProfileId]);
  const [activeView, setActiveView] = React.useState<AppView>('morning');
  const [captureMode, setCaptureMode] = React.useState<CaptureMode>('create');
  const [transcript, setTranscript] = React.useState('');
  const [updateInstruction, setUpdateInstruction] = React.useState('');
  const [interimTranscript, setInterimTranscript] = React.useState('');
  const [energy, setEnergy] = React.useState<EnergyMood>('normal');
  const [plan, setPlan] = React.useState<MorningPlan | null>(null);
  const [previousSnapshot, setPreviousSnapshot] = React.useState<MorningSnapshot | null>(null);
  const [reviewStatuses, setReviewStatuses] = React.useState<Record<string, ReviewStatus>>({});
  const [shoppingText, setShoppingText] = React.useState('');
  const [shoppingItems, setShoppingItems] = React.useState<ShoppingItem[]>([]);
  const [shoppingUpdatedAt, setShoppingUpdatedAt] = React.useState('');
  const [contacts, setContacts] = React.useState<ContactReminder[]>([]);
  const [contactDraft, setContactDraft] = React.useState('');
  const [error, setError] = React.useState('');
  const [shoppingError, setShoppingError] = React.useState('');
  const [statusMessage, setStatusMessage] = React.useState('');
  const [recognition, setRecognition] = React.useState<SpeechRecognitionLike | null>(null);
  const [isListening, setIsListening] = React.useState(false);
  const [isOrganizing, setIsOrganizing] = React.useState(false);
  const [isShoppingOrganizing, setIsShoppingOrganizing] = React.useState(false);
  const [calendarToken, setCalendarToken] = React.useState('');
  const [isCalendarBusy, setIsCalendarBusy] = React.useState(false);

  const activeMorningText = captureMode === 'update' ? updateInstruction : transcript;
  const calendarEvents = React.useMemo(() => (plan ? createCalendarEvents(plan) : []), [plan]);

  React.useEffect(() => {
    clearLegacyAndForeignStorage(userProfileId);
    const snapshot = loadLatestSnapshot(privateKeys.snapshots);
    setPreviousSnapshot(snapshot);
    setReviewStatuses(snapshot?.review?.statuses ?? {});

    const savedDraft = localStorage.getItem(privateKeys.draft);
    if (savedDraft) setTranscript(savedDraft);

    const savedShopping = readJson<{ items?: ShoppingItem[]; text?: string; updatedAt?: string }>(privateKeys.shopping);
    if (savedShopping) {
      setShoppingItems(Array.isArray(savedShopping.items) ? savedShopping.items : []);
      setShoppingText(savedShopping.text ?? '');
      setShoppingUpdatedAt(savedShopping.updatedAt ?? '');
    }

    const savedContacts = readJson<ContactReminder[]>(privateKeys.contacts);
    if (Array.isArray(savedContacts)) setContacts(savedContacts);
  }, [privateKeys, userProfileId]);

  React.useEffect(() => {
    if (transcript.trim()) localStorage.setItem(privateKeys.draft, transcript);
    else localStorage.removeItem(privateKeys.draft);
  }, [privateKeys.draft, transcript]);

  React.useEffect(() => {
    localStorage.setItem(privateKeys.shopping, JSON.stringify({ items: shoppingItems, text: shoppingText, updatedAt: shoppingUpdatedAt }));
  }, [privateKeys.shopping, shoppingItems, shoppingText, shoppingUpdatedAt]);

  React.useEffect(() => {
    localStorage.setItem(privateKeys.contacts, JSON.stringify(contacts));
  }, [privateKeys.contacts, contacts]);

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
    instance.onerror = () => {
      setIsListening(false);
      setInterimTranscript('');
      activeView === 'shopping' ? setShoppingError('音声入力に失敗しました。') : setError('音声入力に失敗しました。');
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
    if (activeView === 'shopping') setShoppingText((current) => append(current));
    else if (activeView === 'contacts') setContactDraft((current) => append(current));
    else if (captureMode === 'update') setUpdateInstruction((current) => append(current));
    else setTranscript((current) => append(current));
  };

  const startListening = () => {
    if (!recognition || isListening) return;
    try {
      recognition.start();
    } catch {
      setError('音声入力を開始できませんでした。少し待ってからもう一度お試しください。');
    }
  };

  const organizeMorning = async () => {
    const text = activeMorningText.trim();
    if (!text) return;
    setIsOrganizing(true);
    setError('');
    setStatusMessage('');
    const derivedContacts = extractContactReminders(text);
    mergeContacts(derivedContacts);

    try {
      const nextPlan = await createAiMorningPlan(text, energy, {
        contactReminders: [...contacts.filter((item) => !item.completed).map((item) => item.text), ...derivedContacts.map((item) => item.text)],
        currentPlan: captureMode === 'update' ? plan : null,
        mode: captureMode,
        shoppingItems: shoppingItems.filter((item) => !item.completed).map(formatShoppingItemLabel),
      });
      setPlan(nextPlan);
      setCaptureMode('update');
      setUpdateInstruction('');
      saveMorningSnapshot(transcript || text, nextPlan, privateKeys.snapshots, userProfileId);
      setStatusMessage('AI整理を保存しました。');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'AI整理に失敗しました。');
    } finally {
      setIsOrganizing(false);
    }
  };

  const organizeShopping = async () => {
    if (!shoppingText.trim()) return;
    setIsShoppingOrganizing(true);
    setShoppingError('');
    try {
      const shoppingPlan = await createShoppingPlan(shoppingText, shoppingItems);
      setShoppingItems(shoppingPlan.items);
      setShoppingUpdatedAt(shoppingPlan.updatedAt);
    } catch (reason) {
      setShoppingError(reason instanceof Error ? reason.message : '買い物AIの分類に失敗しました。');
    } finally {
      setIsShoppingOrganizing(false);
    }
  };

  const addManualShopping = () => {
    const item = createManualShoppingItem(shoppingText);
    if (!item) return;
    setShoppingItems((current) => [...current, item]);
    setShoppingText('');
    setShoppingUpdatedAt(new Date().toISOString());
  };

  const addContact = () => {
    const text = contactDraft.trim();
    if (!text) return;
    mergeContacts([createContactReminder(text)]);
    setContactDraft('');
  };

  const resetPrivateData = () => {
    [privateKeys.draft, privateKeys.shopping, privateKeys.contacts, privateKeys.snapshots].forEach((key) => localStorage.removeItem(key));
    setTranscript('');
    setUpdateInstruction('');
    setPlan(null);
    setPreviousSnapshot(null);
    setReviewStatuses({});
    setShoppingText('');
    setShoppingItems([]);
    setShoppingUpdatedAt('');
    setContacts([]);
    setContactDraft('');
    setError('');
    setShoppingError('');
    setStatusMessage('このuserProfileIdの保存データを削除しました。');
  };

  const connectGoogle = async () => {
    setIsCalendarBusy(true);
    setStatusMessage('');
    try {
      const token = await requestGoogleAccessToken('select_account consent');
      setCalendarToken(token);
      setStatusMessage('Googleに接続しました。登録前に予定内容を確認してください。');
    } catch (reason) {
      setStatusMessage(reason instanceof Error ? reason.message : 'Googleログインに失敗しました。');
    } finally {
      setIsCalendarBusy(false);
    }
  };

  const registerCalendar = async () => {
    if (!calendarToken || !calendarEvents.length) return;
    const ok = window.confirm('選択中のGoogleアカウントに予定を登録します。アカウントが正しいことを確認しましたか？');
    if (!ok) return;
    setIsCalendarBusy(true);
    try {
      await insertGoogleCalendarEvents(calendarToken, calendarEvents);
      setStatusMessage(`${calendarEvents.length}件をGoogleカレンダーに登録しました。`);
    } catch (reason) {
      setStatusMessage(reason instanceof Error ? reason.message : 'Googleカレンダー登録に失敗しました。');
    } finally {
      setIsCalendarBusy(false);
    }
  };

  const disconnectGoogle = () => {
    if (calendarToken) revokeGoogleAccessToken(calendarToken);
    setCalendarToken('');
    setStatusMessage('Google接続を解除しました。自動再接続は行いません。');
  };

  const mergeContacts = (items: ContactReminder[]) => {
    if (!items.length) return;
    setContacts((current) => {
      const seen = new Set(current.map((item) => normalizeText(item.text)));
      const additions = items.filter((item) => !seen.has(normalizeText(item.text)));
      return [...additions, ...current];
    });
  };

  return (
    <main className="app-shell">
      <section className="phone-shell" aria-label="MORNING FLOW AI v3.1">
        <header className="top-bar">
          <div>
            <p className="eyebrow">MORNING FLOW AI <span>{appVersion}</span></p>
            <h1>今日を安全に整理する</h1>
          </div>
          <div className="brand-mark" aria-hidden="true"><Sparkles size={20} /></div>
        </header>

        <div className="privacy-strip">
          <ShieldCheck size={18} />
          <span>保存はこのセッションのuserProfileId別キーのみ。他人の履歴は読み込みません。</span>
        </div>

        <nav className="segmented-nav" aria-label="メニュー">
          <button className={activeView === 'morning' ? 'selected' : ''} onClick={() => setActiveView('morning')} type="button">朝</button>
          <button className={activeView === 'shopping' ? 'selected' : ''} onClick={() => setActiveView('shopping')} type="button">買い物</button>
          <button className={activeView === 'contacts' ? 'selected' : ''} onClick={() => setActiveView('contacts')} type="button">連絡</button>
        </nav>

        {activeView === 'morning' && (
          <section className="panel">
            <div className="panel-header">
              <span>Morning</span>
              <strong>{captureMode === 'update' ? '予定を修正' : '今日の予定を入力'}</strong>
            </div>
            <div className="chip-row">
              {energyOptions.map((option) => (
                <button className={energy === option.value ? 'selected' : ''} key={option.value} onClick={() => setEnergy(option.value)} type="button">
                  {option.label}
                </button>
              ))}
            </div>
            <textarea
              value={[activeMorningText, activeView === 'morning' ? interimTranscript : ''].filter(Boolean).join('\n')}
              onChange={(event) => (captureMode === 'update' ? setUpdateInstruction(event.target.value) : setTranscript(event.target.value))}
              placeholder="今日やること、目的、買い物、連絡忘れを入力"
            />
            <div className="button-row">
              <button className="secondary-button" disabled={!SpeechRecognition || isListening} onClick={startListening} type="button"><Mic size={17} />音声</button>
              <button className="secondary-button" disabled={!isListening} onClick={() => recognition?.stop()} type="button">停止</button>
              <button className="primary-button" disabled={!activeMorningText.trim() || isOrganizing} onClick={organizeMorning} type="button">
                {isOrganizing ? <Loader2 className="spin" size={17} /> : <Sparkles size={17} />}AI整理
              </button>
            </div>
            {previousSnapshot && (
              <div className="panel compact">
                <div className="panel-header"><span>Snapshot</span><strong>前回の未完了確認</strong></div>
                {previousSnapshot.plan.todos.slice(0, 4).map((todo) => (
                  <div className="review-row" key={todo}>
                    <span>{todo}</span>
                    <div>
                      {(['done', 'partial', 'missed'] as ReviewStatus[]).map((status) => (
                        <button
                          className={reviewStatuses[todo] === status ? 'selected' : ''}
                          key={status}
                          onClick={() => {
                            const next = { ...reviewStatuses, [todo]: status };
                            setReviewStatuses(next);
                            saveReview(previousSnapshot.id, next, privateKeys.snapshots);
                          }}
                          type="button"
                        >
                          {status === 'done' ? '完了' : status === 'partial' ? '途中' : '未完'}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {activeView === 'shopping' && (
          <section className="panel">
            <div className="panel-header"><span>Shopping</span><strong>買い物AI分類</strong></div>
            <textarea value={shoppingText} onChange={(event) => setShoppingText(event.target.value)} placeholder="例: 牛乳2本、卵1パック、洗剤" />
            <div className="button-row">
              <button className="primary-button" disabled={!shoppingText.trim() || isShoppingOrganizing} onClick={organizeShopping} type="button">
                {isShoppingOrganizing ? <Loader2 className="spin" size={17} /> : <ShoppingCart size={17} />}AI分類
              </button>
              <button className="secondary-button" disabled={!shoppingText.trim()} onClick={addManualShopping} type="button">手動追加</button>
            </div>
            {shoppingUpdatedAt && <p className="success-message">更新: {formatDateTime(shoppingUpdatedAt)}</p>}
            {groupShoppingItems(shoppingItems).map((group) => (
              <div className="panel compact" key={group.category}>
                <div className="panel-header"><span>{group.category}</span><strong>{group.items.length}件</strong></div>
                {group.items.map((item) => (
                  <div className="item-row" key={item.id}>
                    <label>
                      <input checked={item.completed} onChange={() => setShoppingItems(toggleItem(shoppingItems, item.id))} type="checkbox" />
                      <span>{formatShoppingItemLabel(item)}</span>
                    </label>
                    <button onClick={() => editShoppingItem(item.id)} type="button">編集</button>
                    <button onClick={() => setShoppingItems(shoppingItems.filter((next) => next.id !== item.id))} type="button"><Trash2 size={15} /></button>
                  </div>
                ))}
              </div>
            ))}
            <button className="secondary-button full" onClick={() => navigator.clipboard?.writeText(formatShoppingShareText(shoppingItems))} type="button">
              共有用文章をコピー
            </button>
          </section>
        )}

        {activeView === 'contacts' && (
          <section className="panel">
            <div className="panel-header"><span>Contacts</span><strong>連絡忘れ</strong></div>
            <textarea value={contactDraft} onChange={(event) => setContactDraft(event.target.value)} placeholder="例: 山田さんに折り返し電話" />
            <button className="primary-button full" disabled={!contactDraft.trim()} onClick={addContact} type="button">
              <MessageCircle size={17} />未完了に追加
            </button>
            {contacts.map((item) => (
              <div className="item-row" key={item.id}>
                <label>
                  <input checked={item.completed} onChange={() => setContacts(toggleItem(contacts, item.id))} type="checkbox" />
                  <span>{getContactLabel(item)}</span>
                </label>
                <button onClick={() => setContacts(contacts.filter((next) => next.id !== item.id))} type="button"><Trash2 size={15} /></button>
              </div>
            ))}
          </section>
        )}

        {plan && (
          <section className="results-grid">
            <PlanCard title="目的">{plan.purpose}</PlanCard>
            <PlanCard title="今日やること">{plan.todos.length ? <List items={plan.todos} /> : '未登録'}</PlanCard>
            <PlanCard title="優先順位">
              <List items={[...plan.priorities.highest, ...plan.priorities.important, ...plan.priorities.optional]} />
            </PlanCard>
            <PlanCard title="推奨スケジュール">
              <List items={plan.schedule.map((item) => `${item.time} ${item.task}`)} />
            </PlanCard>
            <PlanCard title="買い物"><List items={plan.shoppingCandidates} /></PlanCard>
            <PlanCard title="連絡忘れ"><List items={plan.contactReminders} /></PlanCard>
            <section className="panel">
              <div className="panel-header"><span>Google Calendar</span><strong>登録前に確認</strong></div>
              {!isGoogleCalendarConfigured() && <p className="warning-message">VITE_GOOGLE_CLIENT_ID が未設定です。</p>}
              <div className="calendar-safe-card"><AlertTriangle size={17} />自動再接続はしません。毎回アカウント選択を求めます。</div>
              <div className="button-row">
                {calendarToken ? (
                  <button className="secondary-button" onClick={disconnectGoogle} type="button">接続解除</button>
                ) : (
                  <button className="secondary-button" disabled={!isGoogleCalendarConfigured() || isCalendarBusy} onClick={connectGoogle} type="button">
                    Googleログイン
                  </button>
                )}
                <button className="primary-button" disabled={!calendarToken || !calendarEvents.length || isCalendarBusy} onClick={registerCalendar} type="button">
                  <CalendarPlus size={17} />登録
                </button>
              </div>
            </section>
          </section>
        )}

        {(error || shoppingError || statusMessage) && (
          <p className={error || shoppingError ? 'warning-message' : 'success-message'}>{error || shoppingError || statusMessage}</p>
        )}

        <button className="secondary-button full" onClick={resetPrivateData} type="button">
          <RefreshCw size={17} />このuserProfileIdの保存データを削除
        </button>
      </section>
    </main>
  );

  function editShoppingItem(id: string) {
    const item = shoppingItems.find((candidate) => candidate.id === id);
    if (!item) return;
    const nextText = window.prompt('品名と数量を編集', formatShoppingItemLabel(item))?.trim();
    if (!nextText) return;
    const parsed = parseShoppingItemInput(nextText);
    setShoppingItems((current) =>
      current.map((candidate) => (candidate.id === id ? { ...candidate, name: parsed.name || candidate.name, quantity: parsed.quantity } : candidate)),
    );
  }
}

function PlanCard({ children, title }: { children: React.ReactNode; title: string }) {
  return (
    <article className="panel plan-card">
      <div className="plan-title"><span><CheckCircle2 size={17} /></span><h2>{title}</h2></div>
      {children}
    </article>
  );
}

function List({ items }: { items: string[] }) {
  return items.length ? <ul>{items.map((item) => <li key={item}>{item}</li>)}</ul> : <p>なし</p>;
}

function getOrCreateUserProfileId() {
  const saved = sessionStorage.getItem(activeProfileSessionKey);
  if (saved?.startsWith('user-profile-')) return saved;
  const next = `user-profile-${createId()}`;
  sessionStorage.setItem(activeProfileSessionKey, next);
  return next;
}

function createPrivateKeys(userProfileId: string): PrivateKeys {
  const base = `morning-flow-ai:v3.1:user:${userProfileId}`;
  return {
    contacts: `${base}:contact-reminders`,
    draft: `${base}:transcript-draft`,
    shopping: `${base}:shopping-list`,
    snapshots: createSnapshotStorageKey(userProfileId),
  };
}

function clearLegacyAndForeignStorage(userProfileId: string) {
  legacyStorageKeys.forEach((key) => localStorage.removeItem(key));
  Object.keys(localStorage)
    .filter((key) => key.startsWith('morning-flow-ai:session:'))
    .forEach((key) => localStorage.removeItem(key));
  Object.keys(localStorage)
    .filter((key) => key.startsWith('morning-flow-ai:v3:owner:') || key.startsWith('morning-flow-ai:v3:user:'))
    .forEach((key) => localStorage.removeItem(key));
  Object.keys(localStorage)
    .filter((key) => key.startsWith('morning-flow-ai:v3.1:user:') && !key.includes(`:${userProfileId}:`))
    .forEach((key) => localStorage.removeItem(key));
}

function createCalendarEvents(plan: MorningPlan): CalendarEvent[] {
  const today = new Date();
  today.setSeconds(0, 0);
  return plan.schedule
    .map((item, index) => {
      const start = new Date(today);
      start.setHours(9 + index, 0, 0, 0);
      const end = new Date(start);
      end.setMinutes(start.getMinutes() + 45);
      return {
        id: `${index}-${item.time}-${item.task}`,
        title: item.task || 'MORNING FLOW AI 予定',
        start,
        end,
        memo: `MORNING FLOW AI v3.1で整理した予定\n目的: ${plan.purpose}`,
        priority: getSchedulePriority(item.task, plan),
      };
    })
    .slice(0, 8);
}

function getSchedulePriority(title: string, plan: MorningPlan): GoogleCalendarPriority {
  if (plan.priorities.highest.some((item) => title.includes(item) || item.includes(title))) return '最優先';
  if (plan.priorities.important.some((item) => title.includes(item) || item.includes(title))) return '重要';
  return '通常';
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

function extractContactReminders(text: string) {
  return text
    .split(/[。\n、]/)
    .map((value) => value.trim())
    .filter((value) => /(折り返し|電話|LINE|ライン|メール|返信|SNS|DM|連絡)/i.test(value))
    .map(createContactReminder);
}

function detectContactKind(text: string): ContactKind {
  if (/電話|折り返し/.test(text)) return 'phone';
  if (/LINE|ライン/i.test(text)) return 'line';
  if (/メール|mail/i.test(text)) return 'mail';
  if (/SNS|DM|Instagram|X|Twitter/i.test(text)) return 'sns';
  return 'other';
}

function getContactLabel(item: ContactReminder) {
  const labels: Record<ContactKind, string> = {
    line: 'LINE',
    mail: 'メール',
    other: '連絡',
    phone: '電話',
    sns: 'SNS',
  };
  return `${labels[item.kind]}: ${item.text}`;
}

function toggleItem<T extends { id: string; completed: boolean }>(items: T[], id: string) {
  return items.map((item) => (item.id === id ? { ...item, completed: !item.completed } : item));
}

function formatShoppingShareText(items: ShoppingItem[]) {
  const groups = groupShoppingItems(items).filter((group) => group.items.length);
  if (!groups.length) return '買い物リストはまだありません。';
  return groups
    .map((group) => [`【${group.category}】`, ...group.items.map((item) => `・${formatShoppingItemLabel(item)}`)].join('\n'))
    .join('\n\n');
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString('ja-JP', { dateStyle: 'short', timeStyle: 'short' });
}

function normalizeText(value: string) {
  return value.replace(/\s/g, '').toLowerCase();
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

function createId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
