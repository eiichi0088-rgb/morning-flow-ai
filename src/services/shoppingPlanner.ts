export const shoppingCategories = [
  '食品・調味料',
  '野菜・果物',
  '肉・魚・冷凍食品',
  '飲み物',
  '日用品',
  '店舗・仕込み関連',
  '家族・子供用品',
  'ジム・外出用品',
  'その他',
] as const;

export type ShoppingCategory = (typeof shoppingCategories)[number];

export interface ShoppingItem {
  id: string;
  name: string;
  category: ShoppingCategory;
  completed: boolean;
  addedAt: string;
}

export interface ShoppingPlan {
  items: ShoppingItem[];
  updatedAt: string;
}

type CategoryRule = {
  category: ShoppingCategory;
  patterns: RegExp[];
};

const categoryAliases: Record<string, ShoppingCategory> = {
  食品: '食品・調味料',
  '肉・魚': '肉・魚・冷凍食品',
};

const contextRules: CategoryRule[] = [
  {
    category: '店舗・仕込み関連',
    patterns: [
      /店舗|店用|業務用|仕込み|営業用|厨房|ラーメン/,
      /チャーシュー用|替玉用|替え玉用|スープ用|仕込み用/,
      /ネギ\s*\d+\s*(kg|キロ)|\d+\s*(kg|キロ)\s*ネギ/,
      /紅しょうが|紅生姜|チャーシュー|替玉|替え玉|麺/,
    ],
  },
  {
    category: '家族・子供用品',
    patterns: [/娘|息子|子供|こども|子ども|チーちゃん|アズキ|家族|学校|保育|子供用|こども用|子ども用/],
  },
  {
    category: 'ジム・外出用品',
    patterns: [/ジム用|運動用|外出用|トレーニング用|プロテイン|スポーツ|水筒|ジム|運動/],
  },
];

const itemRules: CategoryRule[] = [
  {
    category: '日用品',
    patterns: [/洗剤|ラップ|トイレットペーパー|ティッシュ|キッチンペーパー|ゴミ袋|電池|掃除|シャンプー|石鹸|せっけん/],
  },
  {
    category: '野菜・果物',
    patterns: [/ネギ|ねぎ|玉ねぎ|玉葱|人参|にんじん|じゃがいも|キャベツ|レタス|トマト|きゅうり|りんご|バナナ|野菜|果物/],
  },
  {
    category: '肉・魚・冷凍食品',
    patterns: [/豚肉|牛肉|鶏肉|肉|魚|刺身|鮭|さば|サバ|まぐろ|ツナ|冷凍|ハム|ベーコン/],
  },
  {
    category: '食品・調味料',
    patterns: [/牛乳|卵|たまご|パン|米|ご飯|チーズ|ヨーグルト|豆腐|納豆|調味料|砂糖|塩|醤油|味噌|しょうが|生姜|お菓子|食品/],
  },
  {
    category: '飲み物',
    patterns: [/水|お茶|茶|コーヒー|ジュース|飲み物|ドリンク|炭酸/],
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

  const existingByName = new Map(normalizedCurrentItems.map((item) => [normalizeName(item.name), item]));
  const removeMode = /消して|削除|外して|いらない|不要/.test(instruction);
  const detectedItems = extractShoppingItems(instruction);

  if (removeMode) {
    const removeNames = new Set(detectedItems.map((item) => normalizeName(item)));
    return {
      items: normalizedCurrentItems.filter((item) => !removeNames.has(normalizeName(item.name))),
      updatedAt: new Date().toISOString(),
    };
  }

  const nextItems = [...normalizedCurrentItems];

  detectedItems.forEach((name) => {
    const normalized = normalizeName(name);
    if (!normalized || existingByName.has(normalized)) return;

    const category = classifyShoppingItem(name);
    const item: ShoppingItem = {
      id: `${Date.now()}-${category}-${normalized}`,
      name,
      category,
      completed: false,
      addedAt: new Date().toISOString(),
    };

    existingByName.set(normalized, item);
    nextItems.push(item);
  });

  return {
    items: sortShoppingItems(nextItems),
    updatedAt: new Date().toISOString(),
  };
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

  for (const rule of contextRules) {
    if (rule.patterns.some((pattern) => pattern.test(itemText))) {
      return rule.category;
    }
  }

  for (const rule of itemRules) {
    if (rule.patterns.some((pattern) => pattern.test(itemText))) {
      return rule.category;
    }
  }

  return 'その他';
}

function extractShoppingItems(text: string) {
  const normalizedText = text
    .replace(/買って|買う|買いたい|購入|追加して|追加|入れて|お願い|あと|それと|それから/g, '、')
    .replace(/[。\n\r]/g, '、')
    .replace(/\s*,\s*/g, '、');

  return normalizedText
    .split(/[、,，/／・]+/)
    .map(cleanShoppingItemName)
    .filter((item) => item.length >= 1)
    .filter((item) => !/買い物|リスト|予定|修正|削除|消して|外して/.test(item));
}

function cleanShoppingItemName(item: string) {
  return item
    .trim()
    .replace(/^(と|を|は|に|へ|も)+/, '')
    .replace(/(です|ください|して)$/g, '')
    .trim();
}

function normalizeStoredItem(item: ShoppingItem): ShoppingItem {
  return {
    ...item,
    category: categoryAliases[item.category] ?? item.category,
  };
}

function sortShoppingItems(items: ShoppingItem[]) {
  return items.map((item, index) => ({ item, index })).sort((a, b) => {
    const categoryOrder = shoppingCategories.indexOf(a.item.category) - shoppingCategories.indexOf(b.item.category);
    if (categoryOrder !== 0) return categoryOrder;
    return a.index - b.index;
  }).map(({ item }) => item);
}

function normalizeForMatching(value: string) {
  return value.replace(/\s/g, '').toLowerCase();
}

function normalizeName(name: string) {
  return normalizeForMatching(name).replace(/[。、,，/／・]/g, '');
}
