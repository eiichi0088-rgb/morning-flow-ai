export type GoogleCalendarPriority = '最優先' | '重要' | '時間があれば' | '通常';

export interface GoogleCalendarEventInput {
  title: string;
  start: Date;
  end: Date;
  memo: string;
  priority: GoogleCalendarPriority;
}

interface TokenResponse {
  access_token?: string;
  error?: string;
  expires_in?: number;
  scope?: string;
  token_type?: string;
}

interface TokenClient {
  callback: (response: TokenResponse) => void;
  requestAccessToken: (options?: { prompt?: '' | 'consent' }) => void;
}

declare global {
  interface Window {
    google?: {
      accounts?: {
        oauth2?: {
          initTokenClient: (config: {
            client_id: string;
            callback: (response: TokenResponse) => void;
            scope: string;
          }) => TokenClient;
          revoke: (token: string, callback?: () => void) => void;
        };
      };
    };
  }
}

const googleIdentityScriptId = 'google-identity-services';
const calendarScope = 'https://www.googleapis.com/auth/calendar.events';

export function getGoogleClientId() {
  return import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;
}

export function isGoogleCalendarConfigured() {
  return Boolean(getGoogleClientId());
}

export async function requestGoogleAccessToken(prompt: '' | 'consent' = 'consent') {
  const clientId = getGoogleClientId();
  if (!clientId) {
    throw new Error('Google Client IDが未設定です。.envにVITE_GOOGLE_CLIENT_IDを設定してください。');
  }

  await loadGoogleIdentityServices();

  return new Promise<string>((resolve, reject) => {
    const oauth2 = window.google?.accounts?.oauth2;
    if (!oauth2) {
      reject(new Error('Googleログインの準備に失敗しました。ページを再読み込みしてください。'));
      return;
    }

    const tokenClient = oauth2.initTokenClient({
      client_id: clientId,
      scope: calendarScope,
      callback: (response) => {
        if (response.error || !response.access_token) {
          reject(new Error('Googleログインが完了しませんでした。もう一度お試しください。'));
          return;
        }
        resolve(response.access_token);
      },
    });

    tokenClient.requestAccessToken({ prompt });
  });
}

export function revokeGoogleAccessToken(accessToken: string) {
  window.google?.accounts?.oauth2?.revoke(accessToken);
}

export async function insertGoogleCalendarEvents(
  accessToken: string,
  events: GoogleCalendarEventInput[],
) {
  const timeZone = 'Asia/Tokyo';

  return Promise.all(
    events.map(async (event) => {
      const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          summary: event.title,
          description: `${event.memo}\n\n優先度: ${event.priority}`,
          start: {
            dateTime: toTokyoDateTime(event.start),
            timeZone,
          },
          end: {
            dateTime: toTokyoDateTime(event.end),
            timeZone,
          },
          extendedProperties: {
            private: {
              priority: event.priority,
              source: 'MORNING FLOW AI',
            },
          },
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        const message = payload?.error?.message ?? 'Googleカレンダーへの登録に失敗しました。';
        throw new Error(message);
      }

      return response.json();
    }),
  );
}

function toTokyoDateTime(date: Date) {
  const formatter = new Intl.DateTimeFormat('sv-SE', {
    dateStyle: 'short',
    hour12: false,
    timeStyle: 'medium',
    timeZone: 'Asia/Tokyo',
  });
  return formatter.format(date).replace(' ', 'T');
}

function loadGoogleIdentityServices() {
  if (window.google?.accounts?.oauth2) {
    return Promise.resolve();
  }

  return new Promise<void>((resolve, reject) => {
    const existingScript = document.getElementById(googleIdentityScriptId) as HTMLScriptElement | null;
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve(), { once: true });
      existingScript.addEventListener('error', () => reject(new Error('Googleログインの読み込みに失敗しました。')), {
        once: true,
      });
      return;
    }

    const script = document.createElement('script');
    script.id = googleIdentityScriptId;
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Googleログインの読み込みに失敗しました。'));
    document.head.appendChild(script);
  });
}
