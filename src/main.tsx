import React from 'react';
import ReactDOM from 'react-dom/client';
import {
  ArrowRight,
  Brain,
  CalendarClock,
  CalendarPlus,
  CheckCircle2,
  ChevronRight,
  Compass,
  Download,
  ExternalLink,
  Flag,
  HeartPulse,
  Lightbulb,
  ListChecks,
  Mic,
  RefreshCw,
  Route,
  Sparkles,
  Square,
  Target,
} from 'lucide-react';
import { createAiMorningPlan, type EnergyMood, type MorningPlan } from './services/aiPlanner';
import {
  loadLatestSnapshot,
  saveMorningSnapshot,
  saveReview,
  type MorningSnapshot,
  type ReviewStatus,
} from './services/reflectionStorage';
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
  '今日は朝9時から仕込みをして、11時から14時まで昼営業。売上目標を達成したい。15時に銀行で手続き、17時に買い物。家族との時間も取りたい。夜22時半にジムへ行って30分運動したい。銀行の営業時間に間に合うように注意したい。';

const draftStorageKey = 'morning-flow-ai:transcript-draft:v1';

type CalendarEvent = {
  id: string;
  title: string;
  start: Date;
  end: Date;
  memo: string;
  sourceTime: string;
};

const reviewOptions: { label: string; value: ReviewStatus }[] = [
  { label: '✓ 完了', value: 'done' },
  { label: '△ 一部完了', value: 'partial' },
  { label: '✕ 未達成', value: 'missed' },
];

const energyOptions: { label: string; value: EnergyMood }[] = [
  { label: '😊 絶好調', value: 'great' },
  { label: '🙂 普通', value: 'normal' },
  { label: '😴 疲れている', value: 'tired' },
  { label: '😣 とても疲れている', value: 'exhausted' },
];

function App() {
  const [recognition, setRecognition] = React.useState<SpeechRecognitionLike | null>(null);
  const [isListening, setIsListening] = React.useState(false);
  const [transcript, setTranscript] = React.useState('');
  const [originalTranscript, setOriginalTranscript] = React.useState('');
  const [interimTranscript, setInterimTranscript] = React.useState('');
  const [error, setError] = React.useState('');
  const [plan, setPlan] = React.useState<MorningPlan | null>(null);
  const [isOrganizing, setIsOrganizing] = React.useState(false);
  const [previousSnapshot, setPreviousSnapshot] = React.useState<MorningSnapshot | null>(null);
  const [reviewStatuses, setReviewStatuses] = React.useState<Record<string, ReviewStatus>>({});
  const [carriedTodos, setCarriedTodos] = React.useState<string[]>([]);
  const [energy, setEnergy] = React.useState<EnergyMood>('normal');

  const isSupported = Boolean(SpeechRecognition);
  const resultText = [transcript, interimTranscript].filter(Boolean).join('\n');
  const canOrganize = Boolean(transcript.trim()) && !isListening;
  const hasEditableTranscript = Boolean(transcript.trim()) && !isListening;

  React.useEffect(() => {
    const snapshot = loadLatestSnapshot();
    setPreviousSnapshot(snapshot);
    setReviewStatuses(snapshot?.review?.statuses ?? {});
    const savedDraft = localStorage.getItem(draftStorageKey);
    if (savedDraft) {
      setTranscript(savedDraft);
      setOriginalTranscript(savedDraft);
    }
  }, []);

  React.useEffect(() => {
    if (transcript.trim()) {
      localStorage.setItem(draftStorageKey, transcript);
    } else {
      localStorage.removeItem(draftStorageKey);
    }
  }, [transcript]);

  React.useEffect(() => {
    if (!SpeechRecognition) return;

    const instance = new SpeechRecognition();
    instance.lang = 'ja-JP';
    instance.continuous = true;
    instance.interimResults = true;

    instance.onstart = () => {
      setIsListening(true);
      setError('');
    };

    instance.onend = () => {
      setIsListening(false);
      setInterimTranscript('');
    };

    instance.onerror = (event) => {
      setIsListening(false);
      setInterimTranscript('');
      setError(getSpeechErrorMessage(event.error));
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
        setTranscript((current) => {
          const nextTranscript = `${current}${current ? '\n' : ''}${finalText.trim()}`;
          setOriginalTranscript(nextTranscript);
          return nextTranscript;
        });
        setPlan(null);
      }
      setInterimTranscript(interimText.trim());
    };

    setRecognition(instance);

    return () => {
      instance.abort();
    };
  }, []);

  const startListening = () => {
    if (!recognition || isListening) return;

    setError('');
    try {
      recognition.start();
    } catch {
      setError('音声認識を開始できませんでした。少し待ってからもう一度お試しください。');
    }
  };

  const stopListening = () => {
    recognition?.stop();
  };

  const resetTranscript = () => {
    recognition?.abort();
    setTranscript('');
    setOriginalTranscript('');
    setInterimTranscript('');
    setError('');
    setIsListening(false);
    setPlan(null);
    setCarriedTodos([]);
  };

  const useSample = () => {
    recognition?.abort();
    setTranscript(sampleTranscript);
    setOriginalTranscript(sampleTranscript);
    setInterimTranscript('');
    setError('');
    setIsListening(false);
    setPlan(null);
  };

  const organizeMorning = () => {
    if (!transcript.trim()) return;

    setIsOrganizing(true);
    setError('');

    createAiMorningPlan(transcript, energy)
      .then((nextPlan) => {
        const planWithCarryover = addCarryoverToPlan(nextPlan, carriedTodos);
        setPlan(planWithCarryover);
        saveMorningSnapshot(transcript, planWithCarryover);
      })
      .catch((reason: unknown) => {
        setError(reason instanceof Error ? reason.message : 'AI整理に失敗しました。');
      })
      .finally(() => {
        setIsOrganizing(false);
      });
  };

  const carryOverTodos = (todos: string[]) => {
    setCarriedTodos(todos);
    setPlan((currentPlan) => (currentPlan ? addCarryoverToPlan(currentPlan, todos) : currentPlan));
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

  return (
    <main className="app-shell">
      <div className="ambient-layer" aria-hidden="true">
        <span className="morning-orbit orbit-one" />
        <span className="morning-orbit orbit-two" />
        <span className="horizon-line" />
      </div>

      <section className="hero-panel" aria-label="音声入力">
        <div className="top-bar">
          <div>
            <p className="eyebrow">MORNING FLOW AI <span>v1.9</span></p>
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

        {previousSnapshot && (
          <ReflectionView
            carriedTodos={carriedTodos}
            onCarryOver={carryOverTodos}
            onStatusChange={(task, status) => {
              const nextStatuses = { ...reviewStatuses, [task]: status };
              setReviewStatuses(nextStatuses);
              saveReview(previousSnapshot.id, nextStatuses);
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
            text={transcript}
          />
        )}

        <EnergySelector energy={energy} onChange={setEnergy} />

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

        {plan && <CoachCard plan={plan} />}
        {plan && <PlanView plan={plan} />}

        <div className="action-row">
          <button className="secondary-button" type="button" onClick={resetTranscript}>
            <RefreshCw size={19} />
            やり直し
          </button>
          <button className="secondary-button sample-button" type="button" onClick={useSample}>
            サンプル
          </button>
        </div>
      </section>
      <div className="floating-next-bar" aria-label="次の操作">
        <button className="primary-button floating-next-button" type="button" disabled={!plan}>
          次へ進む
          <ArrowRight size={21} />
        </button>
      </div>
    </main>
  );
}

function EnergySelector({
  energy,
  onChange,
}: {
  energy: EnergyMood;
  onChange: (energy: EnergyMood) => void;
}) {
  return (
    <section className="energy-card" aria-label="朝の気分">
      <div className="energy-header">
        <span>Energy Check</span>
        <strong>今朝の気分</strong>
      </div>
      <div className="energy-options">
        {energyOptions.map((option) => (
          <button
            className={energy === option.value ? 'selected' : ''}
            key={option.value}
            onClick={() => onChange(option.value)}
            type="button"
          >
            {option.label}
          </button>
        ))}
      </div>
    </section>
  );
}

function TranscriptEditor({
  onCancel,
  onSave,
  onTextChange,
  text,
}: {
  onCancel: () => void;
  onSave: () => void;
  onTextChange: (value: string) => void;
  text: string;
}) {
  const textareaRef = React.useRef<HTMLTextAreaElement | null>(null);

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
  const completed = todos.filter((todo) => statuses[todo] === 'done').length;
  const partial = todos.filter((todo) => statuses[todo] === 'partial').length;
  const reviewed = todos.filter((todo) => statuses[todo]).length;
  const score = todos.length ? Math.round(((completed + partial * 0.5) / todos.length) * 100) : 0;
  const unfinished = todos.filter((todo) => statuses[todo] === 'partial' || statuses[todo] === 'missed');
  const reflection = createReflectionMessage(statuses, todos);

  const carryUnfinished = () => {
    onCarryOver(Array.from(new Set([...carriedTodos, ...unfinished])));
  };

  return (
    <section className="reflection-card" aria-label="昨日の振り返り">
      <div className="reflection-header">
        <div>
          <span>昨日の振り返り</span>
          <strong>今日につなげる</strong>
        </div>
        <div className="score-ring">
          <b>{score}%</b>
          <small>{completed}件完了</small>
        </div>
      </div>

      <p className="reflection-purpose">{snapshot.plan.purpose}</p>

      <div className="review-list">
        {todos.map((todo) => (
          <div className="review-item" key={todo}>
            <span>{todo}</span>
            <div className="review-buttons" aria-label={`${todo}の達成状況`}>
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
        ))}
      </div>

      <div className="reflection-insight">
        <Lightbulb size={17} />
        <span>{reflection}</span>
      </div>

      <div className="reflection-footer">
        <span>{todos.length}件中{completed}件完了</span>
        <button disabled={!unfinished.length} onClick={carryUnfinished} type="button">
          今日へ繰り越す
          <ChevronRight size={17} />
        </button>
      </div>

      {carriedTodos.length > 0 && (
        <p className="carryover-note">{carriedTodos.length}件を今日のAI整理に反映します。</p>
      )}
    </section>
  );
}

function PlanView({ plan }: { plan: MorningPlan }) {
  const [isCalendarOpen, setIsCalendarOpen] = React.useState(false);
  const calendarEvents = React.useMemo(() => createCalendarEvents(plan), [plan]);

  return (
    <section className="plan-stack" aria-label="AI整理結果">
      <PlanSection icon={<Flag size={18} />} title="今日の目的">
        <p className="purpose-text">{plan.purpose}</p>
      </PlanSection>

      <PlanSection icon={<Target size={18} />} title="今日の目標">
        <ul className="clean-list">
          {plan.goals.map((goal) => (
            <li key={goal}>{goal}</li>
          ))}
        </ul>
      </PlanSection>

      <PlanSection icon={<ListChecks size={18} />} title="やることリスト">
        <div className="todo-list">
          {plan.todos.map((todo) => (
            <label key={todo} className="todo-item">
              <input type="checkbox" />
              <span>{todo}</span>
            </label>
          ))}
        </div>
      </PlanSection>

      <PlanSection icon={<HeartPulse size={18} />} title="4カテゴリー分類">
        <div className="category-grid">
          <CategoryColumn title="仕事" items={plan.categories.work} />
          <CategoryColumn title="健康" items={plan.categories.health} />
          <CategoryColumn title="家族" items={plan.categories.family} />
          <CategoryColumn title="学習" items={plan.categories.learning} />
        </div>
      </PlanSection>

      <PlanSection icon={<Route size={18} />} title="優先順位">
        <div className="priority-grid">
          <PriorityColumn title="1. 最優先" items={plan.priorities.highest} />
          <PriorityColumn title="2. 重要" items={plan.priorities.important} />
          <PriorityColumn title="3. 時間があれば" items={plan.priorities.optional} />
        </div>
      </PlanSection>

      <PlanSection icon={<CalendarClock size={18} />} title="推奨タイムスケジュール">
        <div className="schedule-list">
          {plan.schedule.map((item) => (
            <div className="schedule-item" key={`${item.time}-${item.task}`}>
              <time>{item.time}</time>
              <span>{item.task}</span>
            </div>
          ))}
        </div>
        <button
          className="calendar-add-button"
          disabled={!calendarEvents.length}
          onClick={() => setIsCalendarOpen((current) => !current)}
          type="button"
        >
          <CalendarPlus size={19} />
          カレンダーへ追加
        </button>
        {isCalendarOpen && <CalendarExportPanel events={calendarEvents} />}
      </PlanSection>

      <PlanSection icon={<Lightbulb size={18} />} title="AIアドバイス">
        <ul className="advice-list">
          {plan.advice.map((advice) => (
            <li key={advice}>
              <CheckCircle2 size={16} />
              <span>{advice}</span>
            </li>
          ))}
        </ul>
      </PlanSection>
    </section>
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
                {formatEventTime(event.start)} - {formatEventTime(event.end)}
              </time>
              <strong>{event.title}</strong>
              <p>{event.memo}</p>
            </div>
            <a
              className="calendar-link"
              href={createGoogleCalendarUrl(event)}
              rel="noreferrer"
              target="_blank"
            >
              Googleで開く
              <ExternalLink size={15} />
            </a>
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

function createCalendarEvents(plan: MorningPlan): CalendarEvent[] {
  const today = new Date();
  today.setSeconds(0, 0);

  return plan.schedule
    .map((item, index) => {
      const range = parseScheduleTime(item.time);
      if (!range) return null;

      const start = new Date(today);
      start.setHours(Math.floor(range.startMinutes / 60), range.startMinutes % 60, 0, 0);

      const endMinutes = range.endMinutes ?? range.startMinutes + 60;
      const end = new Date(today);
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
        sourceTime: item.time,
        memo: `MORNING FLOW AIで整理した予定: ${item.time} ${title}\n今日の目的: ${plan.purpose}`,
      };
    })
    .filter((event): event is CalendarEvent => Boolean(event));
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

function createGoogleCalendarUrl(event: CalendarEvent) {
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    dates: `${toCalendarTimestamp(event.start)}/${toCalendarTimestamp(event.end)}`,
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
    'PRODID:-//MORNING FLOW AI//Calendar Export//JA',
    'CALSCALE:GREGORIAN',
    ...events.flatMap((event, index) => [
      'BEGIN:VEVENT',
      `UID:morning-flow-ai-${Date.now()}-${index}@local`,
      `DTSTAMP:${now}`,
      `DTSTART:${toCalendarTimestamp(event.start)}`,
      `DTEND:${toCalendarTimestamp(event.end)}`,
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
