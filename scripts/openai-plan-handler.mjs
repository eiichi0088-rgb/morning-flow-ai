import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

const defaultModel = 'gpt-5.4-mini';

const planSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['purpose', 'goals', 'todos', 'priorities', 'schedule', 'advice', 'categories', 'coach'],
  properties: {
    purpose: { type: 'string' },
    goals: { type: 'array', items: { type: 'string' } },
    todos: { type: 'array', items: { type: 'string' } },
    priorities: {
      type: 'object',
      additionalProperties: false,
      required: ['highest', 'important', 'optional'],
      properties: {
        highest: { type: 'array', items: { type: 'string' } },
        important: { type: 'array', items: { type: 'string' } },
        optional: { type: 'array', items: { type: 'string' } },
      },
    },
    schedule: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['time', 'task'],
        properties: {
          time: { type: 'string' },
          task: { type: 'string' },
        },
      },
    },
    advice: { type: 'array', items: { type: 'string' } },
    categories: {
      type: 'object',
      additionalProperties: false,
      required: ['work', 'health', 'family', 'learning'],
      properties: {
        work: { type: 'array', items: { type: 'string' } },
        health: { type: 'array', items: { type: 'string' } },
        family: { type: 'array', items: { type: 'string' } },
        learning: { type: 'array', items: { type: 'string' } },
      },
    },
    coach: {
      type: 'object',
      additionalProperties: false,
      required: ['energy', 'mission', 'focusItems', 'morningAdvice', 'successConditions'],
      properties: {
        energy: { type: 'string', enum: ['great', 'normal', 'tired', 'exhausted'] },
        mission: { type: 'string' },
        focusItems: {
          type: 'object',
          additionalProperties: false,
          required: ['highest', 'important', 'optional'],
          properties: {
            highest: { type: 'string' },
            important: { type: 'string' },
            optional: { type: 'string' },
          },
        },
        morningAdvice: { type: 'string' },
        successConditions: {
          type: 'array',
          items: { type: 'string' },
        },
      },
    },
  },
};

export async function loadEnvFile(root = process.cwd()) {
  const envPath = join(root, '.env');
  if (!existsSync(envPath)) return;

  const lines = (await readFile(envPath, 'utf8')).split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;

    const index = trimmed.indexOf('=');
    const key = trimmed.slice(0, index).trim();
    const rawValue = trimmed.slice(index + 1).trim();
    const value = rawValue.replace(/^["']|["']$/g, '');
    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

export async function handlePlanRequest(request, response) {
  if (request.method !== 'POST') {
    sendJson(response, 405, { message: 'POST only.' });
    return;
  }

  try {
    const body = await readJsonBody(request);
    const transcript = String(body.transcript ?? '').trim();
    const energy = normalizeEnergy(body.energy);
    const mode = body.mode === 'update' ? 'update' : 'create';
    const currentPlan = body.currentPlan ?? null;

    if (!transcript) {
      sendJson(response, 400, { message: 'Transcript is empty.' });
      return;
    }

    if (!process.env.OPENAI_API_KEY) {
      sendJson(response, 500, {
        message: 'Please set OPENAI_API_KEY in .env.',
      });
      return;
    }

    const plan = await createPlanFromTranscript(transcript, energy, { currentPlan, mode });
    sendJson(response, 200, { plan });
  } catch (error) {
    sendJson(response, 500, {
      message: error instanceof Error ? error.message : 'Failed to organize the morning plan.',
    });
  }
}

export async function createPlanFromTranscript(transcript, energy = 'normal', context = {}) {
  const mode = context.mode === 'update' ? 'update' : 'create';
  const currentPlan = context.currentPlan ?? null;
  const systemText = [
    'You are MORNING FLOW AI, a Japanese morning planning coach.',
    'Return a concise Japanese day plan in the requested JSON schema.',
    'Use the user transcript, energy level, and context to organize purpose, goals, todos, priorities, schedule, advice, categories, and coach.',
    'If mode is update, integrate the new instruction into the current plan. Keep existing schedules and tasks unless the user clearly asks to change them.',
    'Do not drop existing items when adding new items. Insert new schedule items at a reasonable time between existing items when possible.',
  ].join(' ');
  const userText = mode === 'update'
    ? [
        `Mode: update`,
        `Morning energy: ${energy}`,
        '',
        'Current MORNING FLOW AI plan JSON:',
        JSON.stringify(currentPlan, null, 2),
        '',
        'Additional or correction instruction:',
        transcript,
      ].join('\n')
    : `Mode: create\nMorning energy: ${energy}\n\nTranscript:\n${transcript}`;

  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || defaultModel,
      input: [
        {
          role: 'system',
          content: [{ type: 'input_text', text: systemText }],
        },
        {
          role: 'user',
          content: [{ type: 'input_text', text: userText }],
        },
      ],
      text: {
        format: {
          type: 'json_schema',
          name: 'morning_plan',
          strict: true,
          schema: planSchema,
        },
      },
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data?.error?.message ?? 'OpenAI API request failed.');
  }

  const text = data.output_text ?? extractOutputText(data);
  if (!text) {
    throw new Error('OpenAI API returned no plan text.');
  }

  return JSON.parse(text);
}

export function normalizeEnergy(value) {
  return ['great', 'normal', 'tired', 'exhausted'].includes(value) ? value : 'normal';
}

function extractOutputText(data) {
  return data?.output
    ?.flatMap((item) => item.content ?? [])
    ?.map((content) => content.text ?? '')
    ?.join('')
    ?.trim();
}

function readJsonBody(request) {
  return new Promise((resolve, reject) => {
    let body = '';
    request.on('data', (chunk) => {
      body += chunk;
      if (body.length > 1_000_000) {
        request.destroy();
        reject(new Error('Request body is too large.'));
      }
    });
    request.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        reject(new Error('Failed to parse JSON.'));
      }
    });
    request.on('error', reject);
  });
}

function sendJson(response, status, payload) {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify(payload));
}
