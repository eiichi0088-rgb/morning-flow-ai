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

      const actions = extractToolCalls(first);
      let finalText = extractOutputText(first);

      if (actions.length) {
        const toolOutputs = actions.map((action) => ({
          type: 'function_call_output',
          call_id: action.call_id,
          output: JSON.stringify({ ok: true, action: action.name, received: action.arguments }),
        }));
        const second = await createResponse({
          previous_response_id: first.id,
          input: toolOutputs,
        });
        finalText = extractOutputText(second) || finalText;
      }

      return Response.json({
        actions: actions.map(({ call_id, ...action }) => action),
        assistantLines: splitAssistantText(finalText),
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
  return (Array.isArray(response?.output) ? response.output : [])
    .filter((item) => item?.type === 'function_call')
    .map((item) => ({
      arguments: safeJsonParse(item.arguments),
      call_id: item.call_id,
      name: item.name,
    }))
    .filter((item) => item.name && item.call_id);
}

function extractOutputText(response) {
  if (typeof response?.output_text === 'string') return response.output_text;
  const parts = [];
  for (const item of Array.isArray(response?.output) ? response.output : []) {
    if (item?.type !== 'message') continue;
    for (const content of Array.isArray(item.content) ? item.content : []) {
      if (typeof content?.text === 'string') parts.push(content.text);
    }
  }
  return parts.join('\n').trim();
}

function splitAssistantText(text) {
  return String(text || '')
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 8);
}

function safeJsonParse(value) {
  try {
    return JSON.parse(value || '{}');
  } catch {
    return {};
  }
}

const assistantInstructions = `
You are MORNING FLOW AI, a concise morning secretary for Japanese users.

Your job:
- Understand the full user utterance and conversation context.
- Decide what to ask, suggest, and store.
- Use function tools for app actions. Do not rely on fixed keyword logic.
- Keep replies short, clear, action-centered, and in Japanese.
- Do not chat at length.

Tool policy:
- Use add_schedule for today's or time-based plans.
- Use add_shopping_item once per product. Shopping items must be product name + quantity only.
- Use add_follow_up for calls, replies, confirmations, LINE/email/SMS/contact follow-ups.
- Use add_google_calendar_candidate for future or calendar-worthy events.
- Use update_priority when the user asks what to do first, or after multiple candidates exist.
- Use show_review_card when the user says to save, confirm, OK, or asks to start the day.

Clarify instead of guessing when an important date, time, item, or contact method is missing.
For future events, ask whether to register in Google Calendar when appropriate.
For review, include a short AI summary and recommended order with reasons.
`;
