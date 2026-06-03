export type SupabaseFollowUpStatus = 'pending' | 'contacted' | 'waiting' | 'done';

export type SupabaseFollowUpRow = {
  action_type: string | null;
  completed_at: string | null;
  created_at: string;
  id: string;
  memo: string | null;
  person_name: string;
  status: SupabaseFollowUpStatus;
  title: string;
  updated_at: string;
  user_id: string;
};

export type SupabaseFollowUpInsert = {
  action_type: string;
  completed_at: string | null;
  created_at: string;
  id: string;
  memo: string;
  person_name: string;
  status: SupabaseFollowUpStatus;
  title: string;
  updated_at: string;
  user_id: string;
};

export type SupabaseFollowUpUpdate = Partial<SupabaseFollowUpInsert> & {
  updated_at?: string;
};

export type SupabaseFollowUpConfigStatus = {
  configured: boolean;
  hasAnonKey: boolean;
  hasUrl: boolean;
  urlHost: string;
};

export class SupabaseFollowUpError extends Error {
  body: string;
  status: number;
  statusText: string;
  url: string;

  constructor(response: Response, body: string) {
    super(body || `Supabase request failed: ${response.status} ${response.statusText}`.trim());
    this.body = body;
    this.name = 'SupabaseFollowUpError';
    this.status = response.status;
    this.statusText = response.statusText;
    this.url = response.url;
  }
}

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export function isSupabaseFollowUpConfigured() {
  return Boolean(supabaseUrl?.trim() && supabaseAnonKey?.trim());
}

export function getSupabaseFollowUpConfigStatus(): SupabaseFollowUpConfigStatus {
  return {
    configured: isSupabaseFollowUpConfigured(),
    hasAnonKey: Boolean(supabaseAnonKey?.trim()),
    hasUrl: Boolean(supabaseUrl?.trim()),
    urlHost: getSupabaseHostLabel(),
  };
}

function getSupabaseHostLabel() {
  if (!supabaseUrl) return 'not configured';
  try {
    return new URL(supabaseUrl).host;
  } catch {
    return 'invalid URL';
  }
}

function createSupabaseHeaders(extraHeaders: Record<string, string> = {}) {
  if (!supabaseAnonKey) throw new Error('Supabase is not configured.');

  return {
    apikey: supabaseAnonKey,
    Authorization: `Bearer ${supabaseAnonKey}`,
    'Content-Type': 'application/json',
    ...extraHeaders,
  };
}

function createFollowUpsUrl(query = '') {
  if (!supabaseUrl) throw new Error('Supabase is not configured.');
  const baseUrl = `${supabaseUrl.replace(/\/$/, '')}/rest/v1/follow_ups`;
  return query ? `${baseUrl}?${query}` : baseUrl;
}

async function readSupabaseResponse<T>(response: Response): Promise<T> {
  const text = await response.text();
  if (!response.ok) {
    throw new SupabaseFollowUpError(response, text);
  }
  return text ? (JSON.parse(text) as T) : ([] as T);
}

export async function fetchSupabaseFollowUps(userId: string) {
  const response = await fetch(createFollowUpsUrl(`select=*&user_id=eq.${encodeURIComponent(userId)}&order=updated_at.desc`), {
    headers: createSupabaseHeaders(),
    method: 'GET',
  });

  return readSupabaseResponse<SupabaseFollowUpRow[]>(response);
}

export async function insertSupabaseFollowUp(item: SupabaseFollowUpInsert) {
  const url = createFollowUpsUrl();
  const response = await fetch(createFollowUpsUrl(), {
    body: JSON.stringify(item),
    headers: createSupabaseHeaders({ Prefer: 'return=representation' }),
    method: 'POST',
  });

  const rows = await readSupabaseResponse<SupabaseFollowUpRow[]>(response);
  console.info('[MORNING FLOW AI] Supabase follow-up insert response', {
    rowCount: rows.length,
    status: response.status,
    statusText: response.statusText,
    url,
  });
  return rows[0];
}

export async function updateSupabaseFollowUp(itemId: string, userId: string, updates: SupabaseFollowUpUpdate) {
  const response = await fetch(createFollowUpsUrl(`id=eq.${encodeURIComponent(itemId)}&user_id=eq.${encodeURIComponent(userId)}`), {
    body: JSON.stringify({
      ...updates,
      updated_at: updates.updated_at ?? new Date().toISOString(),
    }),
    headers: createSupabaseHeaders({ Prefer: 'return=representation' }),
    method: 'PATCH',
  });

  const rows = await readSupabaseResponse<SupabaseFollowUpRow[]>(response);
  return rows[0];
}

export async function deleteSupabaseFollowUp(itemId: string, userId: string) {
  const response = await fetch(createFollowUpsUrl(`id=eq.${encodeURIComponent(itemId)}&user_id=eq.${encodeURIComponent(userId)}`), {
    headers: createSupabaseHeaders(),
    method: 'DELETE',
  });

  await readSupabaseResponse<[]>(response);
}
