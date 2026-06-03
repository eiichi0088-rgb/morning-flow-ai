export const shoppingCategories = [
  '食品',
  '飲み物',
  '日用品',
  '子供用品',
  'ジム・外出用品',
  'その他',
] as const;

export type ShoppingCategory = (typeof shoppingCategories)[number];

export interface ShoppingItem {
  id: string;
  name: string;
  quantity: string;
  category: ShoppingCategory;
  completed: boolean;
  addedAt: string;
  source?: 'manual' | 'voice' | 'meal_plan';
}

export interface ShoppingPlan {
  items: ShoppingItem[];
  updatedAt: string;
}

type CategoryRule = {
  category: ShoppingCategory;
  patterns: RegExp[];
};

type ParsedShoppingInput = {
  name: string;
  quantity: string;
};

const categoryAliases: Record<string, ShoppingCategory> = {
  '食品・調味料': '食品',
  '野菜・果物': '食品',
  '肉・魚・冷凍食品': '食品',
  '店舗・仕込み関連': '食品',
  '家族・子供用品': '子供用品',
};

const localCategoryRules: CategoryRule[] = [
  {
    category: '子供用品',
    patterns: [/子供|こども|子ども|娘|息子|おむつ|オムツ|ベビー|学校|保育|チーちゃん|アズキ|子供用|こども用|子ども用/],
  },
  {
    category: 'ジム・外出用品',
    patterns: [/ジム|運動|外出|プロテイン|タオル|水筒|スポーツ|トレーニング|着替え|汗拭き/],
  },
  {
    category: '飲み物',
    patterns: [/炭酸水|ミネラルウォーター|水|お茶|茶|コーヒー|珈琲|ジュース|飲み物|ドリンク|炭酸/],
  },
  {
    category: '日用品',
    patterns: [/洗剤|ラップ|トイレットペーパー|ティッシュ|キッチンペーパー|ゴミ袋|電池|掃除|シャンプー|石鹸|せっけん|歯ブラシ|歯磨き|歯磨き粉/],
  },
  {
    category: '食品',
    patterns: [
      /卵|たまご|パン|米|ご飯|小麦粉|粉|チーズ|牛乳|豆乳|ヨーグルト|豆腐|納豆|調味料|砂糖|塩|醤油|味噌|しょうが|生姜|お菓子/,
      /ネギ|ねぎ|玉ねぎ|玉葱|人参|にんじん|じゃがいも|キャベツ|レタス|トマト|きゅうり|りんご|バナナ|野菜|果物/,
      /豚肉|牛肉|鶏肉|肉|魚|刺身|鮭|さば|サバ|まぐろ|ツナ|冷凍|ハム|ベーコン/,
      /パスタ|うどん|そば|素麺|そうめん|カップ麺|インスタントラーメン|ラーメン|中華麺|麺/,
    ],
  },
];

export async function createShoppingPlan(
  text: string,
  currentItems: ShoppingItem[] = [],
): Promise<ShoppingPlan> {
  const instruction = text.trim();
  const normalizedCurrentItems = currentItems.map(normalizeStoredItem);

  if (!instruction) {
    return {
      items: normalizedCurrentItems,
      updatedAt: new Date().toISOString(),
    };
  }

  const removeMode = /消して|削除|外して|いらない|不要/.test(instruction);
  if (removeMode) {
    const removeNames = new Set(extractShoppingItems(instruction).map((item) => normalizeName(item.name)));
    return {
      items: normalizedCurrentItems.filter((item) => !removeNames.has(normalizeName(item.name))),
      updatedAt: new Date().toISOString(),
    };
  }

  try {
    return await createShoppingPlanWithAi(instruction, normalizedCurrentItems);
  } catch (error) {
    console.warn('Shopping AI classification failed. Falling back to local rules.', error);
    return createShoppingPlanWithLocalRules(instruction, normalizedCurrentItems);
  }
}

export function groupShoppingItems(items: ShoppingItem[]) {
  const normalizedItems = items.map(normalizeStoredItem);

  return shoppingCategories
    .map((category) => ({
      category,
      items: normalizedItems.filter((item) => item.category === category),
    }))
    .filter((group) => group.items.length > 0);
}

export function classifyShoppingItem(name: string): ShoppingCategory {
  const itemText = normalizeForMatching(name);

  for (const rule of localCategoryRules) {
    if (rule.patterns.some((pattern) => pattern.test(itemText))) {
      return rule.category;
    }
  }

  return 'その他';
}

export function formatShoppingItemLabel(item: Pick<ShoppingItem, 'name' | 'quantity'>) {
  return [item.name, item.quantity].filter(Boolean).join(' ');
}

export function parseShoppingItemInput(value: string): ParsedShoppingInput {
  const cleaned = cleanShoppingItemName(value);
  if (!cleaned) return { name: '', quantity: '' };

  const quantityPattern =
    /(?:が|を|は)?\s*([0-9０-９]+(?:[.．][0-9０-９]+)?\s*(?:kg|KG|Kg|キロ|ｋｇ|グラム|g|G|本|個|つ|袋|パック|箱|枚|束|玉|缶|瓶|杯|ロール|ml|mL|ML|ミリ|L|l|リットル))$/;
  const match = cleaned.match(quantityPattern);

  if (!match) {
    return {
      name: cleaned.replace(/(?:が|を|は)$/g, '').trim(),
      quantity: '',
    };
  }

  const quantity = normalizeQuantity(match[1]);
  const name = cleaned
    .slice(0, match.index)
    .replace(/(?:が|を|は)$/g, '')
    .trim();

  return {
    name,
    quantity,
  };
}

async function createShoppingPlanWithAi(
  text: string,
  currentItems: ShoppingItem[],
): Promise<ShoppingPlan> {
  const response = await fetch('/api/shopping', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      currentItems,
      text,
    }),
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(payload?.message ?? 'Shopping AI request failed.');
  }

  return mergeAiItems(currentItems, payload?.plan?.items ?? []);
}

function createShoppingPlanWithLocalRules(
  text: string,
  currentItems: ShoppingItem[],
): ShoppingPlan {
  return mergeAiItems(
    currentItems,
    extractShoppingItems(text).map((item) => ({
      ...item,
      category: classifyShoppingItem(item.name),
    })),
  );
}

function mergeAiItems(
  currentItems: ShoppingItem[],
  aiItems: Array<{ name: string; quantity?: string; category: ShoppingCategory }>,
): ShoppingPlan {
  const existingByName = new Map(currentItems.map((item) => [normalizeName(item.name), item]));
  const nextItems = [...currentItems];

  aiItems.forEach((aiItem) => {
    const parsed = parseShoppingItemInput([aiItem.name, aiItem.quantity].filter(Boolean).join(' '));
    const name = String(parsed.name || aiItem.name || '').trim();
    const quantity = normalizeQuantity(parsed.quantity || aiItem.quantity || '');
    const normalized = normalizeName(name);
    if (!normalized) return;
    if (isShoppingMetaOrActionText(name)) return;

    const category = normalizeCategory(aiItem.category);
    const existing = existingByName.get(normalized);
    if (existing) {
      existing.category = category;
      if (quantity) existing.quantity = quantity;
      return;
    }

    const item: ShoppingItem = {
      id: createShoppingItemId(),
      name,
      quantity,
      category,
      completed: false,
      addedAt: new Date().toISOString(),
      source: 'manual',
    };
    existingByName.set(normalized, item);
    nextItems.push(item);
  });

  return {
    items: sortShoppingItems(nextItems),
    updatedAt: new Date().toISOString(),
  };
}

function extractShoppingItems(text: string): ParsedShoppingInput[] {
  const normalizedText = text
    .replace(/今日買うものは|買って|買う|買いたい|購入|追加して|追加|入れて|お願い|あと|それと|それから/g, '、')
    .replace(/[。\n\r]/g, '、')
    .replace(/\s*,\s*/g, '、')
    .replace(/と(?=[^、，,。\n\r]*[0-9０-９])/g, '、')
    .replace(/\s+と\s+/g, '、');

  return normalizedText
    .split(/[、，,]+/)
    .map(parseShoppingItemInput)
    .filter((item) => item.name.length >= 1)
    .filter((item) => !isShoppingMetaOrActionText(item.name));
}

function cleanShoppingItemName(item: string) {
  return item
    .trim()
    .replace(/^(と|で|には|に|へ|を)+/, '')
    .replace(/(です|ください|して)$/g, '')
    .trim();
}

function normalizeStoredItem(item: ShoppingItem): ShoppingItem {
  const parsed = parseShoppingItemInput([item.name, item.quantity].filter(Boolean).join(' '));

  return {
    ...item,
    name: parsed.name || item.name,
    quantity: normalizeQuantity(parsed.quantity || item.quantity || ''),
    category: normalizeCategory(item.category),
    id: item.id?.startsWith('shopping-') ? item.id : createShoppingItemId(),
    source: item.source ?? 'manual',
  };
}

function normalizeCategory(category: string): ShoppingCategory {
  if (shoppingCategories.includes(category as ShoppingCategory)) return category as ShoppingCategory;
  return categoryAliases[category] ?? 'その他';
}

function sortShoppingItems(items: ShoppingItem[]) {
  return items
    .map((item, index) => ({ item, index }))
    .sort((a, b) => {
      const categoryOrder = shoppingCategories.indexOf(a.item.category) - shoppingCategories.indexOf(b.item.category);
      if (categoryOrder !== 0) return categoryOrder;
      return a.index - b.index;
    })
    .map(({ item }) => item);
}

function normalizeQuantity(value: string) {
  return value
    .trim()
    .replace(/[０-９]/g, (char) => String.fromCharCode(char.charCodeAt(0) - 0xfee0))
    .replace(/．/g, '.')
    .replace(/\s+/g, '');
}

function normalizeForMatching(value: string) {
  return value.replace(/\s/g, '').toLowerCase();
}

function normalizeName(name: string) {
  return normalizeForMatching(name).replace(/[。、，,]/g, '');
}

function isShoppingMetaOrActionText(text: string) {
  const normalized = normalizeForMatching(text);
  return (
    /買い物|リスト|予定|修正|削除|消して|外して/.test(normalized) ||
    /(スーパー|店|ドラッグストア|コンビニ).*(行く|寄る)/.test(normalized) ||
    /食材.*(冷蔵|冷凍|保存|整理|仕分|下処理|片付)/.test(normalized) ||
    /買った.*(食材|もの|物).*(整理|保存|片付|冷蔵|冷凍)/.test(normalized)
  );
}

function createShoppingItemId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `shopping-${crypto.randomUUID()}`;
  }
  return `shopping-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
