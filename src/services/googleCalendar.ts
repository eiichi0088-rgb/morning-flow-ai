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

export type GoogleCalendarInsertFailure = {
  title: string;
  status?: number;
  message: string;
};

export type GoogleCalendarInsertResult = {
  requested: number;
  created: unknown[];
  failed: GoogleCalendarInsertFailure[];
};

const calendarInsertDelayMs = 750;

export async function insertGoogleCalendarEvents(
  accessToken: string,
  events: GoogleCalendarEventInput[],
): Promise<GoogleCalendarInsertResult> {
  if (!accessToken) {
    throw new Error('Google access token is missing. Please choose a Google account again.');
  }
  if (!events.length) {
    throw new Error('There are no events selected for Google Calendar.');
  }

  console.info('[MORNING FLOW AI] Google Calendar selected event count', {
    count: events.length,
  });

  const createdEvents = [];
  const failedEvents: GoogleCalendarInsertFailure[] = [];

  for (const [index, event] of events.entries()) {
    try {
      createdEvents.push(await insertSingleGoogleCalendarEvent(accessToken, event, index, events.length));
    } catch (error) {
      const calendarError = normalizeGoogleCalendarError(error);
      failedEvents.push({
        title: event.title,
        status: calendarError.status,
        message: calendarError.message,
      });
    }

    if (index < events.length - 1) {
      await wait(calendarInsertDelayMs);
    }
  }

  console.info('[MORNING FLOW AI] Google Calendar registration result', {
    requested: events.length,
    created: createdEvents.length,
    failed: failedEvents.length,
    failureReasons: failedEvents,
  });

  return {
    requested: events.length,
    created: createdEvents,
    failed: failedEvents,
  };
}

async function insertSingleGoogleCalendarEvent(
  accessToken: string,
  event: GoogleCalendarEventInput,
  index: number,
  total: number,
) {
  const startDateTime = toGoogleCalendarTokyoDateTime(event.start);
  const endDateTime = toGoogleCalendarTokyoDateTime(event.end);

  console.info('[MORNING FLOW AI] Google Calendar event payload', {
    index: index + 1,
    total,
    title: event.title,
    startDateTime,
    endDateTime,
    timeZone: tokyoTimeZone,
  });

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
        dateTime: startDateTime,
        timeZone: tokyoTimeZone,
      },
      end: {
        dateTime: endDateTime,
        timeZone: tokyoTimeZone,
      },
      extendedProperties: {
        private: {
          priority: event.priority,
          source: 'MORNING FLOW AI v2.11.3',
        },
      },
    }),
  });

  if (!response.ok) {
    throw await buildCalendarError(response);
  }

  return response.json();
}

function wait(delayMs: number) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, delayMs);
  });
}

function normalizeGoogleCalendarError(error: unknown) {
  if (error instanceof GoogleCalendarApiError) {
    return {
      status: error.status,
      message: error.message,
    };
  }

  return {
    status: undefined,
    message: error instanceof Error ? error.message : 'Unknown Google Calendar error.',
  };
}

function toGoogleCalendarTokyoDateTime(date: Date) {
  return [
    `${date.getFullYear()}-${padDatePart(date.getMonth() + 1)}-${padDatePart(date.getDate())}`,
    `${padDatePart(date.getHours())}:${padDatePart(date.getMinutes())}:${padDatePart(date.getSeconds())}`,
  ].join('T');
}

function padDatePart(value: number) {
  return String(value).padStart(2, '0');
}

class GoogleCalendarApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'GoogleCalendarApiError';
  }
}

async function buildCalendarError(response: Response) {
  const payload = (await response.json().catch(() => null)) as CalendarApiErrorPayload | null;
  const detail = payload?.error?.message || response.statusText || 'Unknown error';
  return new GoogleCalendarApiError(response.status, `Google Calendar registration failed (${response.status}): ${detail}`);
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
