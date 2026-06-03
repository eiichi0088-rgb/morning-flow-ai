import { readJsonBody, sendJson } from './openai-plan-handler.mjs';

const defaultShoppingModel = 'gpt-4o-mini';

export const shoppingCategories = [
  '食品',
  '飲み物',
  '日用品',
  '子供用品',
  'ジム・外出用品',
  'その他',
];

const shoppingSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['items'],
  properties: {
    items: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['name', 'quantity', 'category'],
        properties: {
          name: { type: 'string' },
          quantity: { type: 'string' },
          category: { type: 'string', enum: shoppingCategories },
        },
      },
    },
  },
};

export async function handleShoppingRequest(request, response) {
  if (request.method !== 'POST') {
    sendJson(response, 405, { message: 'POST only.' });
    return;
  }

  try {
    const body = await readJsonBody(request);
    const text = String(body.text ?? '').trim();
    const currentItems = Array.isArray(body.currentItems) ? body.currentItems : [];

    if (!text) {
      sendJson(response, 400, { message: 'Shopping text is empty.' });
      return;
    }

    if (!process.env.OPENAI_API_KEY) {
      sendJson(response, 500, { message: 'Please set OPENAI_API_KEY in .env.' });
      return;
    }

    const plan = await createShoppingPlanFromTranscript(text, currentItems);
    sendJson(response, 200, { plan });
  } catch (error) {
    sendJson(response, 500, {
      message: error instanceof Error ? error.message : 'Failed to organize the shopping list.',
    });
  }
}

export async function createShoppingPlanFromTranscript(text, currentItems = []) {
  const systemText = [
    'You are MORNING FLOW AI shopping organizer.',
    'Classify Japanese shopping items into simple categories anyone can use.',
    'Return only JSON that matches the schema.',
    'Return the complete merged shopping list: include relevant existing items plus the new items.',
    'Shopping list output must contain purchase items only, such as 卵, 牛乳, 玉ねぎ, 豚肉.',
    'Do not return actions or tasks such as 買い物へ行く, スーパーへ行く, 買い物リストを確認する, 食材を保存する, or 冷蔵する.',
    'Do not return food event text such as ラーメンを食べる, 友人とランチ, 焼肉に行く, or 朝ごはんを食べる unless the user clearly says to buy it.',
    'Merge duplicates into one item.',
    'Very important: preserve quantities and units. Never delete quantities such as 3キロ, 1.5キロ, 1本, 3パック, 1袋, 1つ, 2個, 500ml, 2L.',
    'Separate item name and quantity. Do not mix quantity into name.',
    'If an item has no quantity, return quantity as an empty string.',
    'Use only these categories: 食品, 飲み物, 日用品, 子供用品, ジム・外出用品, その他.',
    'Do not create categories for store use, household use, office use, or prep use.',
    'Do not classify an item as store use just because it contains 麺.',
    '牛乳, 卵, 玉ねぎ, 生姜, キャベツ, 小麦粉, パスタ, うどん, そば, 素麺, カップ麺, and インスタントラーメン are 食品.',
    '炭酸水, 水, お茶, コーヒー, ジュース, and ミネラルウォーター are 飲み物 unless clearly gym/outdoor use.',
    '歯磨き粉, 洗剤, ラップ, トイレットペーパー, and ティッシュ are 日用品.',
    'プロテイン, タオル, 水筒, and gym items are ジム・外出用品.',
    '子供, 娘, 息子, おむつ, and school/kids items are 子供用品.',
    'If unsure, choose その他 rather than forcing a category.',
  ].join(' ');

  const userText = [
    'Categories:',
    shoppingCategories.map((category) => `- ${category}`).join('\n'),
    '',
    'Current shopping list JSON:',
    JSON.stringify(currentItems, null, 2),
    '',
    'New shopping input:',
    text,
    '',
    'Return JSON like:',
    '{"items":[{"name":"玉ねぎ","quantity":"3キロ","category":"食品"}]}',
  ].join('\n');

  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: process.env.OPENAI_SHOPPING_MODEL || process.env.OPENAI_MODEL || defaultShoppingModel,
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
          name: 'shopping_list',
          strict: true,
          schema: shoppingSchema,
        },
      },
    }),
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.error?.message ?? 'OpenAI shopping request failed.');
  }

  const outputText = data?.output_text ?? extractOutputText(data);
  if (!outputText) {
    throw new Error('OpenAI API returned no shopping list text.');
  }

  return normalizeShoppingPayload(parseOpenAiJson(outputText));
}

function normalizeShoppingPayload(payload) {
  const seen = new Set();
  const items = Array.isArray(payload?.items) ? payload.items : [];

  return {
    items: items
      .map((item) => ({
        name: String(item?.name ?? '').trim(),
        quantity: String(item?.quantity ?? '').trim(),
        category: shoppingCategories.includes(item?.category) ? item.category : 'その他',
      }))
      .filter((item) => {
        const key = item.name.replace(/\s/g, '').toLowerCase();
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
      }),
  };
}

function extractOutputText(data) {
  return data?.output
    ?.flatMap((item) => item.content ?? [])
    ?.map((content) => content.text ?? '')
    ?.join('')
    ?.trim();
}

function parseOpenAiJson(outputText) {
  try {
    return JSON.parse(outputText);
  } catch {
    const match = outputText.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('OpenAI API returned invalid shopping JSON.');
    try {
      return JSON.parse(match[0]);
    } catch {
      throw new Error('OpenAI API returned invalid shopping JSON.');
    }
  }
}
