const defaultModel = 'gpt-5-mini';

const tools = [
  {
    type: 'function',
    name: 'add_schedule',
    description: 'Extract one user schedule/action/task. Call for bank visits, hospital visits, store visits, work, meetings, gatherings, errands, or other planned actions. Register as a schedule even when the time is vague.',
    strict: true,
    parameters: {
      type: 'object',
      additionalProperties: false,
      properties: {
        date_text: { type: 'string', description: 'Relative or explicit date text. Empty means today.' },
        time: { type: 'string', description: 'Time such as 10:00, 午前, 夕方, or empty when unknown.' },
        title: { type: 'string', description: 'Short action title.' },
        memo: { type: 'string', description: 'Optional note.' },
      },
      required: ['date_text', 'time', 'title', 'memo'],
    },
  },
  {
    type: 'function',
    name: 'add_shopping_item',
    description: 'Extract one product the user will buy. Call once per product, such as milk 2 bottles, eggs 1 pack, daikon 1. Keep product name and quantity separate. Never put a whole sentence into one item.',
    strict: true,
    parameters: {
      type: 'object',
      additionalProperties: false,
      properties: {
        name: { type: 'string' },
        quantity: { type: 'string' },
        category: { type: 'string' },
      },
      required: ['name', 'quantity', 'category'],
    },
  },
  {
    type: 'function',
    name: 'add_follow_up',
    description: 'Extract one follow-up/contact action. Call when the user will contact, reply, call, LINE, email, confirm, or follow up with someone. If a person and contact action are mentioned, this tool is mandatory.',
    strict: true,
    parameters: {
      type: 'object',
      additionalProperties: false,
      properties: {
        person_name: {
          type: 'string',
          description: '連絡する相手の名前。必須。例: 田中さん',
        },
        action: {
          type: 'string',
          description: '行う行動。必須。例: LINEする、電話する、メールする',
        },
        method: { type: 'string', enum: ['phone', 'line', 'email', 'sms', 'other'] },
        due_text: { type: 'string' },
        memo: { type: 'string' },
      },
      required: ['person_name', 'action', 'method', 'due_text', 'memo'],
    },
  },
  {
    type: 'function',
    name: 'add_google_calendar_candidate',
    description: 'Extract one Google Calendar candidate. Call for a future-dated event with a clear numeric time, such as tomorrow 18:00 gathering or next Tuesday 10:00 meeting.',
    strict: true,
    parameters: {
      type: 'object',
      additionalProperties: false,
      properties: {
        date_text: { type: 'string' },
        time: { type: 'string' },
        title: { type: 'string' },
        memo: { type: 'string' },
      },
      required: ['date_text', 'time', 'title', 'memo'],
    },
  },
  {
    type: 'function',
    name: 'update_priority',
    description: 'Update recommended order and reasons.',
    strict: true,
    parameters: {
      type: 'object',
      additionalProperties: false,
      properties: {
        items: {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: false,
            properties: {
              title: { type: 'string' },
              reason: { type: 'string' },
            },
            required: ['title', 'reason'],
          },
        },
      },
      required: ['items'],
    },
  },
  {
    type: 'function',
    name: 'show_review_card',
    description: 'Ask the app to show the save-before-confirm review card.',
    strict: true,
    parameters: {
      type: 'object',
      additionalProperties: false,
      properties: {
        summary: { type: 'string' },
      },
      required: ['summary'],
    },
  },
];

const assistantJsonSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    assistant_reply: { type: 'string' },
    schedule_items: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          title: { type: 'string' },
          date_text: { type: 'string' },
          time_text: { type: 'string' },
          notes: { type: 'string' },
        },
        required: ['title', 'date_text', 'time_text', 'notes'],
      },
    },
    shopping_items: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          name: { type: 'string' },
          quantity: { type: 'string' },
        },
        required: ['name', 'quantity'],
      },
    },
    follow_up_items: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          title: { type: 'string' },
          person_name: { type: 'string' },
          action: { type: 'string' },
          due_text: { type: 'string' },
          notes: { type: 'string' },
        },
        required: ['title', 'person_name', 'action', 'due_text', 'notes'],
      },
    },
    google_calendar_candidates: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          title: { type: 'string' },
          date_text: { type: 'string' },
          time: { type: 'string' },
          notes: { type: 'string' },
        },
        required: ['title', 'date_text', 'time', 'notes'],
      },
    },
    priority_suggestions: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          title: { type: 'string' },
          reason: { type: 'string' },
        },
        required: ['title', 'reason'],
      },
    },
    understanding: {
      type: 'object',
      additionalProperties: false,
      properties: {
        summary: { type: 'string' },
        understood_items: {
          type: 'array',
          items: { type: 'string' },
        },
      },
      required: ['summary', 'understood_items'],
    },
    save_candidates: {
      type: 'object',
      additionalProperties: false,
      properties: {
        schedules: {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: false,
            properties: {
              title: { type: 'string' },
              date_text: { type: 'string' },
              time_text: { type: 'string' },
              notes: { type: 'string' },
            },
            required: ['title', 'date_text', 'time_text', 'notes'],
          },
        },
        shopping: {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: false,
            properties: {
              name: { type: 'string' },
              quantity: { type: 'string' },
              notes: { type: 'string' },
            },
            required: ['name', 'quantity', 'notes'],
          },
        },
        follow_ups: {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: false,
            properties: {
              title: { type: 'string' },
              person_name: { type: 'string' },
              action: { type: 'string' },
              due_text: { type: 'string' },
              notes: { type: 'string' },
            },
            required: ['title', 'person_name', 'action', 'due_text', 'notes'],
          },
        },
        calendar_candidates: {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: false,
            properties: {
              title: { type: 'string' },
              date_text: { type: 'string' },
              time: { type: 'string' },
              notes: { type: 'string' },
            },
            required: ['title', 'date_text', 'time', 'notes'],
          },
        },
      },
      required: ['schedules', 'shopping', 'follow_ups', 'calendar_candidates'],
    },
    clarification: {
      type: 'object',
      additionalProperties: false,
      properties: {
        needs_clarification: { type: 'boolean' },
        question: { type: 'string' },
        missing_fields: {
          type: 'array',
          items: { type: 'string' },
        },
      },
      required: ['needs_clarification', 'question', 'missing_fields'],
    },
    needs_clarification: { type: 'boolean' },
    clarifying_question: { type: 'string' },
  },
  required: [
    'assistant_reply',
    'schedule_items',
    'shopping_items',
    'follow_up_items',
    'google_calendar_candidates',
    'priority_suggestions',
    'understanding',
    'save_candidates',
    'clarification',
    'needs_clarification',
    'clarifying_question',
  ],
};

export default {
  async fetch(request) {
    if (request.method !== 'POST') {
      return Response.json({ message: 'POST only' }, { status: 405 });
    }

    if (!process.env.OPENAI_API_KEY) {
      return Response.json({ message: 'OPENAI_API_KEY is not configured.' }, { status: 503 });
    }

    try {
      const body = await request.json();
      const userText = String(body.userText ?? '').trim();
      if (!userText) {
        return Response.json({ message: 'userText is required.' }, { status: 400 });
      }

      const context = {
        conversationMessages: Array.isArray(body.conversationMessages) ? body.conversationMessages.slice(-12) : [],
        currentDraft: body.currentDraft ?? null,
        savedPlan: body.savedPlan ?? null,
        savedShoppingItems: Array.isArray(body.savedShoppingItems) ? body.savedShoppingItems : [],
        savedFollowUps: Array.isArray(body.savedFollowUps) ? body.savedFollowUps : [],
      };

      const first = await createResponse({
        input: [
          {
            role: 'user',
            content: [
              {
                type: 'input_text',
                text: JSON.stringify({ userText, context }),
              },
            ],
          },
        ],
      });

      let finalText = extractOutputText(first);
      const result = parseAssistantJson(finalText);
      finalText = JSON.stringify(result);

      console.info('[MORNING FLOW AI] assistant response debug', {
        jsonParseSuccess: true,
        firstOutputTypes: getOutputTypes(first),
        textLength: finalText.length,
      });

      return Response.json({
        result,
        debug: {
          jsonParseSuccess: true,
          lastLlmJson: finalText.slice(0, 4000),
          parseError: '',
          mode: 'llm-native',
          model: process.env.OPENAI_ASSISTANT_MODEL || defaultModel,
          needsClarification: Boolean(result.needs_clarification),
          outputTypes: getOutputTypes(first),
          rawToolCallsCount: 0,
          toolCalls: [],
        },
        model: process.env.OPENAI_ASSISTANT_MODEL || defaultModel,
        mode: 'llm-native',
      });
    } catch (error) {
      return Response.json(
        { message: error instanceof Error ? error.message : 'Assistant request failed.' },
        { status: 500 },
      );
    }
  },
};

async function createResponse(payload) {
  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: process.env.OPENAI_ASSISTANT_MODEL || defaultModel,
      instructions: pureAssistantInstructions,
      max_output_tokens: 2400,
      text: {
        format: {
          type: 'json_schema',
          name: 'morning_flow_secretary_result',
          strict: true,
          schema: assistantJsonSchema,
        },
      },
      ...payload,
    }),
  });

  const json = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(json?.error?.message || json?.message || `OpenAI Responses API error ${response.status}`);
  }
  return json;
}

function parseAssistantJson(text) {
  const raw = String(text || '').trim();
  const jsonText = extractJsonObjectText(raw);
  if (!jsonText) {
    throw new Error('Assistant did not return valid JSON.');
  }
  const parsed = safeJsonParse(jsonText);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Assistant JSON parse failed.');
  }
  return normalizeAssistantJson(parsed);
}

function extractJsonObjectText(text) {
  if (!text) return '';
  if (text.startsWith('{') && text.endsWith('}')) return text;
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1]?.trim();
  if (fenced?.startsWith('{') && fenced.endsWith('}')) return fenced;
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  return start >= 0 && end > start ? text.slice(start, end + 1) : '';
}

function normalizeAssistantJson(value) {
  const legacySchedules = objectArray(value.schedule_items).map((item) => ({
    title: stringValue(item.title),
    date_text: stringValue(item.date_text),
    time_text: stringValue(item.time_text),
    notes: stringValue(item.notes),
  }));
  const legacyShopping = objectArray(value.shopping_items).map((item) => ({
    name: stringValue(item.name),
    quantity: stringValue(item.quantity),
  }));
  const legacyFollowUps = objectArray(value.follow_up_items).map((item) => ({
    title: stringValue(item.title),
    person_name: stringValue(item.person_name),
    action: stringValue(item.action),
    due_text: stringValue(item.due_text),
    notes: stringValue(item.notes),
  }));
  const legacyCalendar = objectArray(value.google_calendar_candidates).map((item) => ({
    title: stringValue(item.title),
    date_text: stringValue(item.date_text),
    time: stringValue(item.time),
    notes: stringValue(item.notes),
  }));
  const candidateSource = value.save_candidates && typeof value.save_candidates === 'object' ? value.save_candidates : {};
  const candidateSchedules = objectArray(candidateSource.schedules).map((item) => ({
    title: stringValue(item.title),
    date_text: stringValue(item.date_text),
    time_text: stringValue(item.time_text || item.time),
    notes: stringValue(item.notes),
  }));
  const candidateShopping = objectArray(candidateSource.shopping).map((item) => ({
    name: stringValue(item.name || item.title),
    quantity: stringValue(item.quantity),
    notes: stringValue(item.notes),
  }));
  const candidateFollowUps = objectArray(candidateSource.follow_ups).map((item) => ({
    title: stringValue(item.title),
    person_name: stringValue(item.person_name),
    action: stringValue(item.action),
    due_text: stringValue(item.due_text),
    notes: stringValue(item.notes),
  }));
  const candidateCalendar = objectArray(candidateSource.calendar_candidates).map((item) => ({
    title: stringValue(item.title),
    date_text: stringValue(item.date_text),
    time: stringValue(item.time),
    notes: stringValue(item.notes),
  }));
  const schedules = candidateSchedules.length ? candidateSchedules : legacySchedules;
  const shopping = candidateShopping.length ? candidateShopping : legacyShopping.map((item) => ({ ...item, notes: '' }));
  const followUps = candidateFollowUps.length ? candidateFollowUps : legacyFollowUps;
  const calendarCandidates = candidateCalendar.length ? candidateCalendar : legacyCalendar;
  const understandingSource = value.understanding && typeof value.understanding === 'object' ? value.understanding : {};
  const clarificationSource = value.clarification && typeof value.clarification === 'object' ? value.clarification : {};
  const clarificationQuestion = stringValue(clarificationSource.question) || stringValue(value.clarifying_question);
  const needsClarification = Boolean(clarificationSource.needs_clarification ?? value.needs_clarification);
  return {
    assistant_reply: stringValue(value.assistant_reply),
    schedule_items: legacySchedules.length ? legacySchedules : schedules,
    shopping_items: legacyShopping.length ? legacyShopping : shopping.map((item) => ({
      name: item.name,
      quantity: item.quantity,
    })),
    follow_up_items: legacyFollowUps.length ? legacyFollowUps : followUps,
    google_calendar_candidates: legacyCalendar.length ? legacyCalendar : calendarCandidates,
    priority_suggestions: objectArray(value.priority_suggestions).map((item) => ({
      title: stringValue(item.title),
      reason: stringValue(item.reason),
    })),
    understanding: {
      summary: stringValue(understandingSource.summary) || stringValue(value.assistant_reply),
      understood_items: stringArray(understandingSource.understood_items),
    },
    save_candidates: {
      schedules,
      shopping,
      follow_ups: followUps,
      calendar_candidates: calendarCandidates,
    },
    clarification: {
      needs_clarification: needsClarification,
      question: clarificationQuestion,
      missing_fields: stringArray(clarificationSource.missing_fields),
    },
    needs_clarification: needsClarification,
    clarifying_question: clarificationQuestion,
  };
}

function objectArray(value) {
  return Array.isArray(value) ? value.filter((item) => item && typeof item === 'object') : [];
}

function stringArray(value) {
  return Array.isArray(value) ? value.map((item) => String(item || '').trim()).filter(Boolean) : [];
}

function extractToolCalls(response) {
  const calls = [];
  collectToolCalls(response, calls);
  return calls
    .map((item) => ({
      arguments: typeof item.arguments === 'string' ? safeJsonParse(item.arguments) : item.arguments || {},
      call_id: item.call_id || item.id,
      name: item.name || item.function?.name,
    }))
    .filter((item) => item.name && item.call_id);
}

function collectToolCalls(value, calls, seen = new Set()) {
  if (!value || typeof value !== 'object' || seen.has(value)) return;
  seen.add(value);
  if (value.type === 'function_call' || value.type === 'tool_call') {
    calls.push(value);
  }
  if (Array.isArray(value.tool_calls)) {
    value.tool_calls.forEach((item) => calls.push(item));
  }
  for (const child of Object.values(value)) {
    if (Array.isArray(child)) {
      child.forEach((item) => collectToolCalls(item, calls, seen));
    } else if (child && typeof child === 'object') {
      collectToolCalls(child, calls, seen);
    }
  }
}

function normalizeToolCallAction(action) {
  if (!action?.name || !action?.arguments) return null;
  return {
    arguments: action.arguments,
    name: action.name,
    payload: normalizeActionPayload(action.name, action.arguments),
    type: action.name,
  };
}

function normalizeActionPayload(type, args) {
  if (type === 'add_schedule') {
    return {
      date: stringValue(args.date_text),
      memo: stringValue(args.memo),
      time: stringValue(args.time),
      title: stringValue(args.title),
    };
  }
  if (type === 'add_shopping_item') {
    return {
      category: stringValue(args.category),
      name: stringValue(args.name),
      quantity: stringValue(args.quantity),
    };
  }
  if (type === 'add_follow_up') {
    const person = stringValue(args.person_name);
    const action = stringValue(args.action);
    return {
      action,
      due: stringValue(args.due_text),
      memo: stringValue(args.memo),
      method: stringValue(args.method),
      person_name: person,
      title: [person, action].filter(Boolean).join('へ'),
    };
  }
  if (type === 'add_google_calendar_candidate') {
    return {
      date: stringValue(args.date_text),
      memo: stringValue(args.memo),
      time: stringValue(args.time),
      title: stringValue(args.title),
    };
  }
  if (type === 'update_priority') {
    return {
      items: Array.isArray(args.items) ? args.items : [],
    };
  }
  if (type === 'show_review_card') {
    return {
      summary: stringValue(args.summary),
    };
  }
  return args;
}

function stringValue(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function extractOutputText(response) {
  if (typeof response?.output_text === 'string' && response.output_text.trim()) return response.output_text.trim();
  const parts = [];
  collectOutputText(response, parts);
  return Array.from(new Set(parts.map((part) => part.trim()).filter(Boolean))).join('\n').trim();
}

function collectOutputText(value, parts, seen = new Set()) {
  if (!value || typeof value !== 'object' || seen.has(value)) return;
  seen.add(value);
  if ((value.type === 'output_text' || value.type === 'text') && typeof value.text === 'string') {
    parts.push(value.text);
  }
  if (typeof value.content === 'string') {
    parts.push(value.content);
  }
  if (value.type === 'message' && Array.isArray(value.content)) {
    value.content.forEach((item) => collectOutputText(item, parts, seen));
  }
  for (const child of Object.values(value)) {
    if (Array.isArray(child)) {
      child.forEach((item) => collectOutputText(item, parts, seen));
    } else if (child && typeof child === 'object') {
      collectOutputText(child, parts, seen);
    }
  }
}

function getOutputTypes(response) {
  return (Array.isArray(response?.output) ? response.output : [])
    .map((item) => String(item?.type || 'unknown'))
    .filter(Boolean);
}

function splitAssistantText(text) {
  return sanitizeAssistantText(text)
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 8);
}

function sanitizeAssistantText(text) {
  return String(text || '')
    .split(/\n+/)
    .map((line) =>
      line
        .replace(/^\s*[ABC]\s*[:：]\s*/i, '')
        .replace(/該当番号を?教えてください/g, '必要なものを自然な言葉で話してください')
        .replace(/番号を教えてください/g, '必要なものを自然な言葉で話してください')
        .replace(/選択してください/g, '必要なものを自然な言葉で話してください')
        .trim(),
    )
    .filter((line) => !/^(?:[ABC]\s*[:：]?|該当番号|番号を教えてください|選択してください)$/i.test(line))
    .join('\n');
}

function safeJsonParse(value) {
  try {
    return JSON.parse(value || '{}');
  } catch {
    return {};
  }
}

const assistantInstructions = `
You are MORNING FLOW AI's Semantic Entity Extraction Engine and voice-first assistant for Japanese users.

Your job:
- Extract semantic entities from the full user utterance and conversation context before replying.
- Extract these groups exactly: schedule_items, shopping_items, follow_up_items, google_calendar_candidates, priority_suggestions, assistant_reply.
- Full Entity Coverage is mandatory: never drop a candidate found in the utterance.
- Before writing assistant_reply, count every extracted entity in each array. After writing assistant_reply, ensure the counts did not shrink.
- Tool calls must cover every extracted schedule_items, shopping_items, follow_up_items, and google_calendar_candidates entry.
- Use function tools for app actions. Do not rely on fixed keyword logic.
- Keep replies short, clear, action-centered, and in Japanese.
- Do not chat at length.
- Act like a natural voice-first AI secretary, not a numbered-choice chatbot.

Hard conversation rules:
- Never present action choices as A:, B:, C:, or any lettered menu.
- Never ask for a number, an option number, or "該当番号".
- Never say "番号を教えてください", "該当番号を教えてください", or "選択してください".
- The user should be able to answer naturally: "お願い", "それで", "全部追加して", "買い物だけ追加して", "カレンダーに入れて", "LINEも登録して", "保存して", "これでOK".
- When suggesting next actions, describe them in natural Japanese and invite natural phrases such as "全部追加して" or "カレンダーだけ追加して".

Tool policy:
- Use add_schedule for today's or time-based plans.
- Use add_shopping_item once per product. Shopping items must be product name + quantity only.
- Use add_follow_up for calls, replies, confirmations, LINE/email/SMS/contact follow-ups.
- Use add_google_calendar_candidate for future or calendar-worthy events.
- Use update_priority when the user asks what to do first, or after multiple candidates exist.
- Use show_review_card when the user says to save, confirm, OK, or asks to start the day.
- When the user mentions actionable schedule, shopping, follow-up, or calendar candidates, call the matching tools immediately to keep those candidates in currentDraft. This is required even when the user is only asking for a recommended order.
- When the user asks "what order should I do this in", first call tools for every actionable candidate in the utterance, then call update_priority, then answer naturally.
- Critical parallel extraction rule: when one utterance contains multiple entities such as a schedule, shopping items, a follow-up, and a future timed event, call multiple function tools in the same response. Never choose only one entity. Never give up because the sentence is complex.
- Example: "銀行に行って、牛乳を買って、田中にLINEする" must call add_schedule, add_shopping_item, and add_follow_up together.
- Example: "明日の午前中に銀行へ行って、帰りに牛乳2本と卵1パックを買って、田中さんにLINEして、夕方18時から会合があります" must call add_schedule, add_shopping_item, add_shopping_item, add_follow_up, and add_google_calendar_candidate.
- If the user says "全部追加して", "お願い", "それで", "保存して", or "これでOK", refer to the previous assistant suggestion and currentDraft, then call every needed tool again so the app can rebuild the Review Draft.
- If the user says "全部追加して", call every needed tool from the current utterance and currentDraft: calendar candidates, shopping items, Follow Up items, priority if useful, then summarize what was added.
- If the user says "買い物だけ", "買い物も入れて", or equivalent, call only add_shopping_item for shopping items.
- If the user says "カレンダーに入れて" or equivalent, call only add_google_calendar_candidate for calendar-worthy events.
- If the user says "LINEも登録して", "フォローに入れて", or equivalent, call add_follow_up for the relevant contact item.
- If the user excludes something, such as "カレンダーはまだいい" or "やっぱり買い物だけ", honor that exclusion and do not call tools for the excluded category.
- If the user says "保存して", "これでOK", or "今日をスタート", call show_review_card using the existing currentDraft. Do not create an empty review card.

Semantic classification rules:
- Shopping items must go only to add_shopping_item. Examples: 牛乳2本, 卵1パック, 大根1本, 人参2本, ネギ1本, 買う, 買って帰る, 帰りに買う, スーパーで買う.
- Never put shopping text or grocery items into add_follow_up.
- Follow Up is only for person/contact actions. Examples: 田中さんへLINE, 柴田くんへ電話, 山田さんにメール, 連絡する, 返信する, 折り返す.
- Never put the whole utterance into add_follow_up. Extract only the person and contact action.
- Schedule items include 銀行へ行く, 店へ行く, 病院へ行く, 打ち合わせ, 会議, 予約, 作業, 予定.
- Google Calendar candidates require a future date and a clear numeric time. Examples: 明日18:00 会合, 来週火曜10:00 打ち合わせ.
- Do not convert vague time such as 明日の午前中 to 09:00. Keep it as add_schedule only and ask for a time if needed.
- Do not add 銀行へ行く to Google Calendar unless the user gives a clear numeric time for it.

Clarify instead of guessing when an important date, time, item, or contact method is missing.
For future events, ask whether to register in Google Calendar when appropriate.
For review, include a short natural AI summary of the day flow and recommended order with reasons.

Example style:
User asks what order to move in.
Reply: "おすすめはこの順番です。" then a numbered order is OK for explanation only. Then say which candidates can be added, and invite "全部追加して" or "カレンダーだけ追加して".
Do not use A/B/C labels for those actions.
`;

const pureAssistantInstructions = `
You are MORNING FLOW AI's Pure LLM Secretary Core for Japanese voice-first users.

Return only valid JSON that matches the provided schema. Do not output Markdown, code fences, explanations, or tool calls.

Your job is to understand the user's natural speech and structure it into:
- assistant_reply
- understanding
- save_candidates
- clarification
- schedule_items
- shopping_items
- follow_up_items
- google_calendar_candidates
- priority_suggestions
- needs_clarification
- clarifying_question

The app will display and save your JSON directly. Do not rely on the app to reclassify, repair, or extract entities with rules.

True Conversation First rules:
- Do not omit, summarize away, or silently discard any meaningful part of the user's utterance.
- Put every understood action, errand, purchase, cooking task, destination, and follow-up into understanding.understood_items.
- Put every item that can be saved into save_candidates, classified as schedules, shopping, follow_ups, or calendar_candidates.
- Keep the legacy arrays too, but save_candidates is the primary source for app save candidates.
- Do not drop content just because it does not fit an old JSON array. Keep it in understanding and ask a clarification question if needed.
- If information is missing, use clarification.needs_clarification, clarification.question, and clarification.missing_fields.
- Outings such as "店へ行く" and "スターバックスへ行く" are schedule candidates, even without an exact time.
- Cooking or preparation tasks such as "とんかつを作る" are schedule/task candidates.
- Buying coffee can be shopping only when the user means an item to remember buying; if it is just part of an outing, keep it in understanding and only add it to shopping when useful.

Extraction rules:
- Put errands, actions, and vague-time plans into schedule_items. Example: bank visit tomorrow morning.
- Put every product into shopping_items, one item per product. Keep quantities exactly.
- Put person/contact actions into follow_up_items. Example: Tanaka-san LINE.
- Put future-dated events with a clear numeric time into google_calendar_candidates. Example: tomorrow 18:00 gathering.
- If the user asks for the recommended order, fill priority_suggestions and write a natural assistant_reply.
- If information is insufficient, set needs_clarification true and write clarifying_question. Otherwise false and empty string.

Important:
- Do not invent missing exact times. "tomorrow morning" stays time_text "morning" in schedule_items, not 09:00.
- Do not duplicate shopping items into follow_up_items.
- Do not duplicate vague schedules into google_calendar_candidates unless a future date and clear numeric time are present.
- Keep assistant_reply short, calm, and useful.
- Use empty arrays when there are no items.
- Keep needs_clarification/clarifying_question aligned with clarification.needs_clarification/clarification.question.
`;
