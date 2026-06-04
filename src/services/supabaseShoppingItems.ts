import type { ShoppingItem, ShoppingCategory } from './shoppingPlanner';

export type SupabaseShoppingItemRow = {
  category: string | null;
  checked: boolean | null;
  created_at: string;
  id: string;
  name: string;
  quantity: string | null;
  updated_at: string;
  user_id: string;
};

export type SupabaseShoppingItemUpsert = {
  category: string;
  checked: boolean;
  created_at: string;
  id: string;
  name: string;
  quantity: string;
  updated_at: string;
  user_id: string;
};

export class SupabaseShoppingItemError extends Error {
  body: string;
  status: number;
  statusText: string;
  url: string;

  constructor(response: Response, body: string) {
    super(body || `Supabase shopping request failed: ${response.status} ${response.statusText}`.trim());
    this.body = body;
    this.name = 'SupabaseShoppingItemError';
    this.status = response.status;
    this.statusText = response.statusText;
    this.url = response.url;
  }
}

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export function isSupabaseShoppingConfigured() {
  return Boolean(supabaseUrl?.trim() && supabaseAnonKey?.trim());
}

function createSupabaseHeaders(accessToken = '', extraHeaders: Record<string, string> = {}) {
  if (!supabaseAnonKey) throw new Error('Supabase shopping sync is not configured.');

  return {
    apikey: supabaseAnonKey,
    Authorization: `Bearer ${accessToken || supabaseAnonKey}`,
    'Content-Type': 'application/json',
    ...extraHeaders,
  };
}

function createShoppingItemsUrl(query = '') {
  if (!supabaseUrl) throw new Error('Supabase shopping sync is not configured.');
  const baseUrl = `${supabaseUrl.replace(/\/$/, '')}/rest/v1/shopping_items`;
  return query ? `${baseUrl}?${query}` : baseUrl;
}

async function readSupabaseResponse<T>(response: Response): Promise<T> {
  const text = await response.text();
  if (!response.ok) {
    throw new SupabaseShoppingItemError(response, text);
  }
  return text ? (JSON.parse(text) as T) : ([] as T);
}

export async function fetchSupabaseShoppingItems(userId: string, accessToken: string) {
  const response = await fetch(createShoppingItemsUrl(`select=*&user_id=eq.${encodeURIComponent(userId)}&order=updated_at.desc`), {
    headers: createSupabaseHeaders(accessToken),
    method: 'GET',
  });

  return readSupabaseResponse<SupabaseShoppingItemRow[]>(response);
}

export async function upsertSupabaseShoppingItems(items: SupabaseShoppingItemUpsert[], accessToken: string) {
  if (!items.length) return [];
  const response = await fetch(createShoppingItemsUrl('on_conflict=id'), {
    body: JSON.stringify(items),
    headers: createSupabaseHeaders(accessToken, { Prefer: 'resolution=merge-duplicates,return=representation' }),
    method: 'POST',
  });

  const rows = await readSupabaseResponse<SupabaseShoppingItemRow[]>(response);
  console.info('[MORNING FLOW AI] Supabase shopping upsert response', {
    rowCount: rows.length,
    status: response.status,
    statusText: response.statusText,
    url: response.url,
  });
  return rows;
}

export async function updateSupabaseShoppingItem(itemId: string, userId: string, accessToken: string, updates: Partial<SupabaseShoppingItemUpsert>) {
  const response = await fetch(createShoppingItemsUrl(`id=eq.${encodeURIComponent(itemId)}&user_id=eq.${encodeURIComponent(userId)}`), {
    body: JSON.stringify({
      ...updates,
      updated_at: updates.updated_at ?? new Date().toISOString(),
    }),
    headers: createSupabaseHeaders(accessToken, { Prefer: 'return=representation' }),
    method: 'PATCH',
  });

  const rows = await readSupabaseResponse<SupabaseShoppingItemRow[]>(response);
  return rows[0];
}

export async function deleteSupabaseShoppingItem(itemId: string, userId: string, accessToken: string) {
  const response = await fetch(createShoppingItemsUrl(`id=eq.${encodeURIComponent(itemId)}&user_id=eq.${encodeURIComponent(userId)}`), {
    headers: createSupabaseHeaders(accessToken),
    method: 'DELETE',
  });

  await readSupabaseResponse<[]>(response);
}

export async function deleteAllSupabaseShoppingItems(userId: string, accessToken: string) {
  const response = await fetch(createShoppingItemsUrl(`user_id=eq.${encodeURIComponent(userId)}`), {
    headers: createSupabaseHeaders(accessToken),
    method: 'DELETE',
  });

  await readSupabaseResponse<[]>(response);
}

export function mapSupabaseRowToShoppingItem(row: SupabaseShoppingItemRow): ShoppingItem {
  return {
    addedAt: row.created_at || new Date().toISOString(),
    category: (row.category || 'その他') as ShoppingCategory,
    completed: Boolean(row.checked),
    id: row.id,
    name: row.name,
    quantity: row.quantity || '',
    source: 'manual',
  };
}

export function mapShoppingItemToSupabase(item: ShoppingItem, userId: string): SupabaseShoppingItemUpsert {
  return {
    category: item.category,
    checked: item.completed,
    created_at: item.addedAt || new Date().toISOString(),
    id: item.id,
    name: item.name,
    quantity: item.quantity || '',
    updated_at: new Date().toISOString(),
    user_id: userId,
  };
}
