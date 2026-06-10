const defaultModel = 'gpt-5-mini';

const tools = [
  {
    type: 'function',
    name: 'add_schedule',
    description: 'Add a today or dated schedule candidate.',
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
    description: 'Add one shopping item. Use only product name and quantity, never a whole sentence.',
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
    description: 'Add a follow-up/contact candidate.',
    strict: true,
    parameters: {
      type: 'object',
      additionalProperties: false,
      properties: {
        person_name: { type: 'string' },
        action: { type: 'string' },
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
    description: 'Add a future or calendar-worthy event candidate.',
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

      const rawToolCalls = extractToolCalls(first);
      const actions = rawToolCalls.map(normalizeToolCallAction).filter(Boolean);
      let finalText = extractOutputText(first);
      let lastAssistantResponse = finalText;

      if (rawToolCalls.length) {
        const toolOutputs = rawToolCalls.map((action) => ({
          type: 'function_call_output',
          call_id: action.call_id,
          output: JSON.stringify({ ok: true, action: action.name, received: action.arguments }),
        }));
        const second = await createResponse({
          previous_response_id: first.id,
          input: toolOutputs,
        });
        const secondText = extractOutputText(second);
        finalText = secondText || finalText;
        lastAssistantResponse = secondText || lastAssistantResponse;
      }
      const assistantLines = splitAssistantText(finalText);

      console.info('[MORNING FLOW AI] assistant response debug', {
        actionsCount: actions.length,
        assistantLinesCount: assistantLines.length,
        firstOutputTypes: getOutputTypes(first),
        rawToolCallsCount: rawToolCalls.length,
        textLength: finalText.length,
      });

      return Response.json({
        actions,
        assistantLines,
        debug: {
          actionsCount: actions.length,
          assistantLinesCount: assistantLines.length,
          lastAssistantResponse: lastAssistantResponse.slice(0, 1200),
          mode: 'llm-native',
          model: process.env.OPENAI_ASSISTANT_MODEL || defaultModel,
          outputTypes: getOutputTypes(first),
          rawToolCallsCount: rawToolCalls.length,
          toolCalls: rawToolCalls.map((action) => action.name),
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
      instructions: assistantInstructions,
      max_output_tokens: 900,
      parallel_tool_calls: true,
      tools,
      ...payload,
    }),
  });

  const json = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(json?.error?.message || json?.message || `OpenAI Responses API error ${response.status}`);
  }
  return json;
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
