export type GoogleCalendarPriority = string;

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
  error_description?: string;
  error_uri?: string;
  expires_in?: number;
  scope?: string;
  token_type?: string;
}

interface TokenClient {
  callback: (response: TokenResponse) => void;
  requestAccessToken: (options?: { prompt?: string }) => void;
}

interface CalendarApiErrorPayload {
  error?: {
    code?: number;
    message?: string;
    status?: string;
  };
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
const googleIdentityScriptUrl = 'https://accounts.google.com/gsi/client';
const calendarScope = 'https://www.googleapis.com/auth/calendar.events';
const tokyoTimeZone = 'Asia/Tokyo';

export function getGoogleClientId() {
  return import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;
}

export function isGoogleCalendarConfigured() {
  return Boolean(getGoogleClientId());
}

export async function requestGoogleAccessToken() {
  const clientId = getGoogleClientId();
  if (!clientId) {
    throw new Error('Google Client ID is not configured. Set VITE_GOOGLE_CLIENT_ID in the environment.');
  }

  await loadGoogleIdentityServices();

  return new Promise<string>((resolve, reject) => {
    const oauth2 = window.google?.accounts?.oauth2;
    if (!oauth2) {
      reject(new Error('Google sign-in could not be initialized. Please reload the page and try again.'));
      return;
    }

    const tokenClient = oauth2.initTokenClient({
      client_id: clientId,
      scope: calendarScope,
      callback: (response) => {
        if (response.error || !response.access_token) {
          reject(
            new Error(
              response.error_description ||
                response.error ||
                'Google sign-in did not complete. Please choose an account and try again.',
            ),
          );
          return;
        }
        resolve(response.access_token);
      },
    });

    tokenClient.requestAccessToken({ prompt: 'select_account consent' });
  });
}

export function revokeGoogleAccessToken(accessToken: string) {
  if (!accessToken) return;
  window.google?.accounts?.oauth2?.revoke(accessToken);
}

export async function insertGoogleCalendarEvents(accessToken: string, events: GoogleCalendarEventInput[]) {
  if (!accessToken) {
    throw new Error('Google access token is missing. Please choose a Google account again.');
  }
  if (!events.length) {
    throw new Error('There are no events selected for Google Calendar.');
  }

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
          description: `${event.memo}\n\nPriority: ${event.priority}`,
          start: {
            dateTime: toTokyoDateTime(event.start),
            timeZone: tokyoTimeZone,
          },
          end: {
            dateTime: toTokyoDateTime(event.end),
            timeZone: tokyoTimeZone,
          },
          extendedProperties: {
            private: {
              priority: event.priority,
              source: 'MORNING FLOW AI v2.9',
            },
          },
        }),
      });

      if (!response.ok) {
        throw new Error(await buildCalendarErrorMessage(response));
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
    timeZone: tokyoTimeZone,
  });
  return formatter.format(date).replace(' ', 'T');
}

async function buildCalendarErrorMessage(response: Response) {
  const payload = (await response.json().catch(() => null)) as CalendarApiErrorPayload | null;
  const detail = payload?.error?.message || response.statusText || 'Unknown error';
  return `Google Calendar registration failed (${response.status}): ${detail}`;
}

function loadGoogleIdentityServices() {
  if (window.google?.accounts?.oauth2) {
    return Promise.resolve();
  }

  return new Promise<void>((resolve, reject) => {
    const existingScript = document.getElementById(googleIdentityScriptId) as HTMLScriptElement | null;
    if (existingScript) {
      waitForGoogleIdentityServices().then(resolve, reject);
      return;
    }

    const script = document.createElement('script');
    script.id = googleIdentityScriptId;
    script.src = googleIdentityScriptUrl;
    script.async = true;
    script.defer = true;
    script.onload = () => waitForGoogleIdentityServices().then(resolve, reject);
    script.onerror = () => reject(new Error('Failed to load Google sign-in. Please check the network and try again.'));
    document.head.appendChild(script);
  });
}

function waitForGoogleIdentityServices() {
  return new Promise<void>((resolve, reject) => {
    const startedAt = Date.now();
    const timer = window.setInterval(() => {
      if (window.google?.accounts?.oauth2) {
        window.clearInterval(timer);
        resolve();
        return;
      }

      if (Date.now() - startedAt > 8000) {
        window.clearInterval(timer);
        reject(new Error('Google sign-in took too long to initialize. Please reload the page and try again.'));
      }
    }, 100);
  });
}
