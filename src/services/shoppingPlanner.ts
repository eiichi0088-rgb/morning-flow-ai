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
  const normalizedItems = postProcessShoppingItems(items.map(normalizeStoredItem));

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
  const japaneseParsed = parseJapaneseShoppingItemInput(value);
  if (japaneseParsed.name) return japaneseParsed;

  const cleaned = cleanShoppingItemName(value);
  if (!cleaned) return { name: '', quantity: '' };

  const quantityPattern =
    /(?:が|を|は)?\s*([0-9０-９]+(?:[.．][0-9０-９]+)?\s*(?:kg|KG|Kg|キロ|ｋｇ|グラム|g|G|本|個|つ|袋|パック|箱|枚|束|玉|缶|瓶|杯|切れ|ロール|ml|mL|ML|ミリ|L|l|リットル))$/;
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

export function postProcessShoppingItems(items: ShoppingItem[], sourceText = ''): ShoppingItem[] {
  const expandedItems = items.flatMap((item) => splitShoppingItemRecord(item));
  const sourceItems = sourceText ? extractJapaneseShoppingItems(sourceText).map(createPostProcessedShoppingItem) : [];
  const byName = new Map<string, { item: ShoppingItem; count: number; quantities: string[] }>();

  [...expandedItems, ...sourceItems].forEach((item) => {
    const parsed = parseShoppingItemInput(formatShoppingItemLabel(item));
    const name = normalizeShoppingDisplayName(parsed.name || item.name);
    const quantity = normalizeQuantity(parsed.quantity || item.quantity || '');
    if (!name || isShoppingMetaOrActionText(name) || isJapaneseShoppingNoise(name)) return;

    const key = normalizeName(name);
    if (!key) return;
    const normalizedItem: ShoppingItem = {
      ...item,
      category: normalizeCategory(item.category || classifyShoppingItem(name)),
      name,
      quantity,
    };
    const existing = byName.get(key);
    if (!existing) {
      byName.set(key, { count: 1, item: normalizedItem, quantities: quantity ? [quantity] : [] });
      return;
    }

    existing.count += 1;
    if (quantity && !existing.quantities.includes(quantity)) existing.quantities.push(quantity);
    if (!existing.item.quantity && quantity) existing.item.quantity = quantity;
  });

  return sortShoppingItems(
    Array.from(byName.values()).map(({ count, item, quantities }) => {
      if (count >= 2 && !quantities.length) return { ...item, quantity: `×${count}` };
      return item;
    }),
  );
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

  return mergeAiItems(currentItems, [...(payload?.plan?.items ?? []), ...extractJapaneseShoppingItems(text)], text);
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
    text,
  );
}

function mergeAiItems(
  currentItems: ShoppingItem[],
  aiItems: Array<{ name: string; quantity?: string; category: ShoppingCategory }>,
  sourceText = '',
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
    items: postProcessShoppingItems(nextItems, sourceText),
    updatedAt: new Date().toISOString(),
  };
}

function splitShoppingItemRecord(item: ShoppingItem): ShoppingItem[] {
  // 既に name と quantity が分離されている場合は再パースしない（数量重複バグ防止）
  if (item.name && item.quantity) return [item];
  const label = formatShoppingItemLabel(item);
  const parsedItems = extractJapaneseShoppingItems(label);
  if (parsedItems.length <= 1) return [item];

  return parsedItems.map((parsed) => ({
    ...item,
    category: normalizeCategory(parsed.category),
    id: createShoppingItemId(),
    name: parsed.name,
    quantity: parsed.quantity || '',
  }));
}

function createPostProcessedShoppingItem(item: { name: string; quantity?: string; category?: ShoppingCategory }): ShoppingItem {
  const name = normalizeShoppingDisplayName(item.name);
  return {
    addedAt: new Date().toISOString(),
    category: normalizeCategory(item.category || classifyShoppingItem(name)),
    completed: false,
    id: createShoppingItemId(),
    name,
    quantity: normalizeQuantity(item.quantity || ''),
    source: 'voice',
  };
}

function extractJapaneseShoppingItems(text: string): Array<{ name: string; quantity: string; category: ShoppingCategory }> {
  const normalizedText = normalizeShoppingSourceText(text);
  const items: Array<{ name: string; quantity: string; category: ShoppingCategory }> = [];
  const consumedRanges: Array<[number, number]> = [];
  const quantityPattern =
    /([一-龥ぁ-んァ-ヶーA-Za-z][一-龥ぁ-んァ-ヶーA-Za-z\s]*?)(?:が|を|は)?\s*([0-9０-９一二三四五六七八九十百]+(?:[.．][0-9０-９]+)?\s*(?:パック|個|本|袋|箱|枚|束|玉|丁|缶|瓶|杯|粒|切れ|ロール|グラム|g|G|kg|KG|キロ|ml|mL|ML|L|l|リットル|つ))/g;

  let match: RegExpExecArray | null;
  while ((match = quantityPattern.exec(normalizedText))) {
    const name = normalizeShoppingDisplayName(match[1]);
    const quantity = normalizeJapaneseQuantity(match[2]);
    if (name && !isJapaneseShoppingNoise(name)) {
      items.push({ category: classifyShoppingItem(name), name, quantity });
      consumedRanges.push([match.index, match.index + match[0].length]);
    }
  }

  const remainingText = consumedRanges
    .reduce((current, [start, end]) => `${current.slice(0, start)}${' '.repeat(end - start)}${current.slice(end)}`, normalizedText)
    .replace(/今日の買い物|今日買うもの|買うもの|買い物リスト|買い物です|のお買い物|お買い物|買い物|購入品|購入/g, '、');

  remainingText
    .split(/(?:\r?\n|、|,|，|・|それと|あと|及び|および|\s+と\s+|と(?=[一-龥ぁ-んァ-ヶーA-Za-z]))+/)
    .map(normalizeShoppingDisplayName)
    .filter((name) => name && !isJapaneseShoppingNoise(name))
    .forEach((name) => items.push({ category: classifyShoppingItem(name), name, quantity: '' }));

  return dedupeJapaneseShoppingItems(items);
}

function parseJapaneseShoppingItemInput(value: string): ParsedShoppingInput {
  const items = extractJapaneseShoppingItems(value);
  if (items.length === 1) {
    return {
      name: items[0].name,
      quantity: items[0].quantity,
    };
  }
  return { name: '', quantity: '' };
}

function dedupeJapaneseShoppingItems(items: Array<{ name: string; quantity: string; category: ShoppingCategory }>) {
  const byName = new Map<string, { item: { name: string; quantity: string; category: ShoppingCategory }; count: number }>();
  items.forEach((item) => {
    const key = normalizeName(item.name);
    if (!key) return;
    const existing = byName.get(key);
    if (!existing) {
      byName.set(key, { count: 1, item });
      return;
    }
    existing.count += 1;
    if (!existing.item.quantity && item.quantity) existing.item.quantity = item.quantity;
  });

  return Array.from(byName.values()).map(({ count, item }) => ({
    ...item,
    quantity: count >= 2 && !item.quantity ? `×${count}` : item.quantity,
  }));
}

function normalizeShoppingSourceText(value: string) {
  return value
    .replace(/[０-９]/g, (char) => String.fromCharCode(char.charCodeAt(0) - 0xfee0))
    .replace(/[，､]/g, '、')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeShoppingDisplayName(value: string) {
  return value
    .replace(/今日の買い物|今日買うもの|買うもの|買い物リスト|買い物です|のお買い物|お買い物|買い物|購入品|購入/g, '')
    .replace(/^(は|が|を|と|に|へ|で|の)+/g, '')
    .replace(/(を|が|は|です|ください|お願いします)$/g, '')
    .replace(/[、。,.，・]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeJapaneseQuantity(value: string) {
  return normalizeQuantity(
    value
      .replace(/[０-９]/g, (char) => String.fromCharCode(char.charCodeAt(0) - 0xfee0))
      .replace(/\s+/g, ''),
  );
}

function isJapaneseShoppingNoise(value: string) {
  const normalized = normalizeShoppingDisplayName(value).replace(/\s+/g, '');
  if (!normalized) return true;
  if (/^(今日|もの|買うもの|買い物|買い物リスト|リスト|お願いします|ください)$/.test(normalized)) return true;
  if (/^(の)?お?買い物(は|です)?$/.test(normalized)) return true;
  if (normalized.length >= 16 && countJapaneseQuantityTokens(normalized) >= 2) return true;
  return false;
}

function countJapaneseQuantityTokens(value: string) {
  return (value.match(/[0-9０-９一二三四五六七八九十百]+(?:パック|個|本|袋|箱|枚|束|玉|丁|缶|瓶|杯|粒|切れ|ロール|グラム|g|G|kg|KG|キロ|ml|mL|ML|L|l|リットル|つ)/g) ?? []).length;
}

function extractShoppingItems(text: string): ParsedShoppingInput[] {
  const normalizedText = text
    .replace(/今日買うものは|今日買うもの|買うものは|買うもの|買って|買う|買いたい|購入|追加して|追加|入れて|お願い|あと|それと|それから/g, '、')
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
    .replace(/^(今日買うものは?|買うものは?|もの)/, '')
    .replace(/^(と|で|には|に|へ|を)+/, '')
    .replace(/(です|ください|して)$/g, '')
    .trim();
}

function cleanupShoppingItems(items: ShoppingItem[]): ShoppingItem[] {
  return items.filter((item) => !isTranscriptNoiseItem(item, items));
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

function isTranscriptNoiseItem(item: Pick<ShoppingItem, 'name' | 'quantity'>, allItems: Array<Pick<ShoppingItem, 'name' | 'quantity'>>) {
  const text = normalizeForMatching([item.name, item.quantity].filter(Boolean).join(''));
  const name = normalizeForMatching(item.name);
  if (!text) return true;
  if (isShoppingMetaOrActionText(item.name)) return true;

  const quantityCount = countShoppingQuantities(text);
  if (quantityCount >= 2) return true;

  const otherItemMatches = allItems.filter((other) => {
    const otherName = normalizeForMatching(other.name);
    return otherName.length >= 2 && otherName !== name && text.includes(otherName);
  });
  if (otherItemMatches.length >= 2) return true;

  return /^(今日買うもの|買うもの|もの)/.test(name) && otherItemMatches.length >= 1;
}

function countShoppingQuantities(text: string) {
  return (text.match(/[0-9０-９]+(?:[.．][0-9０-９]+)?(?:kg|キロ|ｋｇ|グラム|g|本|個|つ|袋|パック|箱|枚|束|玉|缶|瓶|杯|切れ|ロール|ml|ミリ|l|リットル)/gi) ?? []).length;
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
