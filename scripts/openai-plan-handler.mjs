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
    sendJson(response, 405, { message: 'POSTで送信してください。' });
    return;
  }

  try {
    const body = await readJsonBody(request);
    const transcript = String(body.transcript ?? '').trim();
    const energy = normalizeEnergy(body.energy);

    if (!transcript) {
      sendJson(response, 400, { message: '文字起こし内容が空です。' });
      return;
    }

    if (!process.env.OPENAI_API_KEY) {
      sendJson(response, 500, {
        message: '.env に OPENAI_API_KEY を設定してください。',
      });
      return;
    }

    const plan = await createPlanFromTranscript(transcript, energy);
    sendJson(response, 200, { plan });
  } catch (error) {
    sendJson(response, 500, {
      message: error instanceof Error ? error.message : 'AI整理で問題が起きました。',
    });
  }
}

export async function createPlanFromTranscript(transcript, energy = 'normal') {
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
          content: [
            {
              type: 'input_text',
              text:
                'あなたは朝の人生を導く日本語AIコーチです。ユーザーの文字起こしと朝の気分を読み、今日の目的、目標、TODO、優先順位、推奨タイムスケジュール、注意点を実用的に整理してください。さらに、今日の最重要ミッション、3つの集中項目、朝のアドバイス、3つ以内の成功条件を生成してください。気分が疲れている場合は予定を詰め込みすぎず、最重要に絞って提案してください。仕事・健康・家族・学習の4カテゴリーにも分類してください。入力にない事実は断定せず、必要な余白も提案してください。',
            },
          ],
        },
        {
          role: 'user',
          content: [
            {
              type: 'input_text',
              text: `朝の気分: ${energy}\n\n文字起こし:\n${transcript}`,
            },
          ],
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
    throw new Error(data?.error?.message ?? 'OpenAI APIの呼び出しに失敗しました。');
  }

  const text = data.output_text ?? extractOutputText(data);
  if (!text) {
    throw new Error('OpenAI APIから整理結果を取得できませんでした。');
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
        reject(new Error('入力が大きすぎます。'));
      }
    });
    request.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        reject(new Error('JSONの読み取りに失敗しました。'));
      }
    });
    request.on('error', reject);
  });
}

function sendJson(response, status, payload) {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify(payload));
}
