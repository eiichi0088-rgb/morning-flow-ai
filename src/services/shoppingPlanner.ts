export const shoppingCategories = [
  '食品',
  '野菜・果物',
  '肉・魚',
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

export async function createShoppingPlan(
  text: string,
  currentItems: ShoppingItem[] = [],
): Promise<ShoppingPlan> {
  const instruction = text.trim();
  if (!instruction) {
    return {
      items: currentItems,
      updatedAt: new Date().toISOString(),
    };
  }

  const existingByName = new Map(currentItems.map((item) => [normalizeName(item.name), item]));
  const removeMode = /消して|削除|外して|いらない|不要/.test(instruction);
  const detectedItems = extractShoppingItems(instruction);

  if (removeMode) {
    const removeNames = new Set(detectedItems.map((item) => normalizeName(item)));
    return {
      items: currentItems.filter((item) => !removeNames.has(normalizeName(item.name))),
      updatedAt: new Date().toISOString(),
    };
  }

  const nextItems = [...currentItems];

  detectedItems.forEach((name) => {
    const normalized = normalizeName(name);
    if (!normalized || existingByName.has(normalized)) return;

    const category = categorizeShoppingItem(name, instruction);
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
  return shoppingCategories
    .map((category) => ({
      category,
      items: items.filter((item) => item.category === category),
    }))
    .filter((group) => group.items.length > 0);
}

function extractShoppingItems(text: string) {
  const normalizedText = text
    .replace(/買って|買う|買いたい|追加して|追加|入れて|お願い|あと|それと|それから/g, '、')
    .replace(/も/g, '、')
    .replace(/[。\n\r]/g, '、')
    .replace(/\s+/g, '、');

  return normalizedText
    .split(/[、,，/／・]+/)
    .map((item) => item.trim())
    .map((item) => item.replace(/^(と|を|は|に|へ)+/, '').replace(/(です|ください|して)$/g, '').trim())
    .filter((item) => item.length >= 1)
    .filter((item) => !/買い物|リスト|予定|修正|削除|消して|外して/.test(item));
}

function categorizeShoppingItem(name: string, fullText: string): ShoppingCategory {
  const value = `${name} ${fullText}`;

  if (/チャーシュー|仕込み|店舗|店|業務|営業|スープ|麺|ラーメン|餃子|厨房|テイクアウト/.test(value)) {
    return '店舗・仕込み関連';
  }
  if (/子供|こども|娘|息子|お菓子|おやつ|学校|保育|家族/.test(value)) {
    return '家族・子供用品';
  }
  if (/ジム|外出|水筒|タオル|プロテイン|スポーツ|移動|車/.test(value)) {
    return 'ジム・外出用品';
  }
  if (/洗剤|ラップ|トイレット|ティッシュ|シャンプー|石鹸|せっけん|ゴミ袋|電池|掃除|日用品/.test(value)) {
    return '日用品';
  }
  if (/水|お茶|茶|コーヒー|ジュース|飲み物|ドリンク|炭酸/.test(value)) {
    return '飲み物';
  }
  if (/肉|魚|鶏|豚|牛|刺身|鮭|さば|サバ|まぐろ|ツナ|ハム|ベーコン/.test(value)) {
    return '肉・魚';
  }
  if (/ネギ|ねぎ|玉ねぎ|玉葱|人参|にんじん|じゃがいも|キャベツ|レタス|トマト|きゅうり|りんご|バナナ|果物|野菜/.test(value)) {
    return '野菜・果物';
  }
  if (/卵|たまご|パン|米|ご飯|牛乳|チーズ|ヨーグルト|食品|豆腐|納豆|調味料|砂糖|塩|醤油|味噌/.test(value)) {
    return '食品';
  }

  return 'その他';
}

function sortShoppingItems(items: ShoppingItem[]) {
  return [...items].sort((a, b) => {
    const categoryOrder = shoppingCategories.indexOf(a.category) - shoppingCategories.indexOf(b.category);
    if (categoryOrder !== 0) return categoryOrder;
    return a.name.localeCompare(b.name, 'ja-JP');
  });
}

function normalizeName(name: string) {
  return name.replace(/\s/g, '').toLowerCase();
}
