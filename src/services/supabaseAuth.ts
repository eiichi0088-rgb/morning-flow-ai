export type SupabaseAuthUser = {
  id: string;
  email?: string;
};

export type SupabaseAuthSession = {
  access_token: string;
  expires_at?: number;
  refresh_token?: string;
  token_type: string;
  user: SupabaseAuthUser;
};

type SupabaseAuthResponse = SupabaseAuthSession & {
  error?: string;
  error_description?: string;
  msg?: string;
};

export type SupabaseAuthConfigStatus = {
  configured: boolean;
  hasAnonKey: boolean;
  hasUrl: boolean;
  urlHost: string;
};

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
const authSessionStorageKey = 'morning-flow-ai:supabase-auth-session:v1';

export function isSupabaseAuthConfigured() {
  return Boolean(supabaseUrl?.trim() && supabaseAnonKey?.trim());
}

export function getSupabaseAuthConfigStatus(): SupabaseAuthConfigStatus {
  return {
    configured: isSupabaseAuthConfigured(),
    hasAnonKey: Boolean(supabaseAnonKey?.trim()),
    hasUrl: Boolean(supabaseUrl?.trim()),
    urlHost: getSupabaseHostLabel(),
  };
}

export function getStoredSupabaseAuthSession() {
  const saved = localStorage.getItem(authSessionStorageKey);
  if (!saved) return null;

  try {
    return JSON.parse(saved) as SupabaseAuthSession;
  } catch {
    localStorage.removeItem(authSessionStorageKey);
    return null;
  }
}

export function storeSupabaseAuthSession(session: SupabaseAuthSession) {
  localStorage.setItem(authSessionStorageKey, JSON.stringify(session));
}

export function clearStoredSupabaseAuthSession() {
  localStorage.removeItem(authSessionStorageKey);
}

export async function signInWithEmail(email: string, password: string) {
  const response = await fetch(createAuthUrl('/token?grant_type=password'), {
    body: JSON.stringify({ email, password }),
    headers: createAuthHeaders(),
    method: 'POST',
  });

  return readAuthResponse(response);
}

export async function signUpWithEmail(email: string, password: string) {
  const response = await fetch(createAuthUrl('/signup'), {
    body: JSON.stringify({ email, password }),
    headers: createAuthHeaders(),
    method: 'POST',
  });

  return readAuthResponse(response);
}

export function isSupabaseAuthTokenExpired(session: SupabaseAuthSession | null, bufferSeconds = 60) {
  if (!session?.access_token) return true;
  if (!session.expires_at) return false;
  return session.expires_at <= Math.floor(Date.now() / 1000) + bufferSeconds;
}

export async function refreshSupabaseAuthSession(session: SupabaseAuthSession) {
  if (!session.refresh_token) throw new Error('ログインセッションの更新情報がありません。もう一度ログインしてください。');

  const response = await fetch(createAuthUrl('/token?grant_type=refresh_token'), {
    body: JSON.stringify({ refresh_token: session.refresh_token }),
    headers: createAuthHeaders(),
    method: 'POST',
  });

  return readAuthResponse(response);
}

export async function signOutSupabaseAuth(accessToken: string) {
  if (!accessToken) return;

  await fetch(createAuthUrl('/logout'), {
    headers: createAuthHeaders({ Authorization: `Bearer ${accessToken}` }),
    method: 'POST',
  });
}

function getSupabaseHostLabel() {
  if (!supabaseUrl) return 'not configured';
  try {
    return new URL(supabaseUrl).host;
  } catch {
    return 'invalid URL';
  }
}

function createAuthHeaders(extraHeaders: Record<string, string> = {}) {
  if (!supabaseAnonKey) throw new Error('Supabase Auth is not configured.');

  return {
    apikey: supabaseAnonKey,
    Authorization: `Bearer ${supabaseAnonKey}`,
    'Content-Type': 'application/json',
    ...extraHeaders,
  };
}

function createAuthUrl(path: string) {
  if (!supabaseUrl) throw new Error('Supabase Auth is not configured.');
  return `${supabaseUrl.replace(/\/$/, '')}/auth/v1${path}`;
}

async function readAuthResponse(response: Response) {
  const text = await response.text();
  const body = text ? (JSON.parse(text) as SupabaseAuthResponse) : null;
  if (!response.ok || body?.error) {
    throw new Error(body?.error_description || body?.msg || body?.error || 'ログインに失敗しました。');
  }

  return body;
}
