import { randomUUID } from 'node:crypto';

const maxIcsBodySize = 256 * 1024;
const importTtlSeconds = 10 * 60;
const kvKeyPrefix = 'mfai:apple-calendar:';

export async function handleAppleCalendarRequest(request, response) {
  const requestUrl = new URL(request.url ?? '/api/apple-calendar', `https://${request.headers.host ?? 'localhost'}`);
  const requestInfo = {
    contentType: request.headers['content-type'] ?? '',
    debug: request.headers['x-mfai-apple-debug'] ?? requestUrl.searchParams.get('debug') ?? '',
    method: request.method,
    userAgent: request.headers['user-agent'] ?? '',
  };

  console.info('[MORNING FLOW AI] Apple Calendar API request', requestInfo);

  if (request.method === 'GET' && requestUrl.searchParams.get('debug') === '1') {
    sendJson(response, 200, {
      app: 'MORNING FLOW AI',
      endpoint: requestUrl.pathname,
      ok: true,
      runtime: 'node-serverless',
      expectedMethod: 'GET',
      expectedResponse: {
        contentDisposition: 'inline; filename="morning-flow-event.ics"',
        contentType: 'text/calendar; charset=utf-8',
        status: 200,
      },
    });
    return;
  }

  if (request.method === 'GET') {
    const importId = requestUrl.searchParams.get('id') ?? '';
    if (importId) {
      try {
        const ics = await getAppleCalendarImport(importId);
        console.info('[MORNING FLOW AI] Apple Calendar API parsed GET id', {
          found: Boolean(ics),
          id: importId,
          pathname: requestUrl.pathname,
          storage: 'vercel-kv',
        });

        if (!ics) {
          response.writeHead(410, { 'Content-Type': 'text/plain; charset=utf-8' });
          response.end('Calendar file expired. Please create it again.');
          return;
        }

        sendIcsResponse(response, ics);
      } catch (error) {
        console.error('[MORNING FLOW AI] Apple Calendar KV get failed', error);
        response.writeHead(503, { 'Content-Type': 'text/plain; charset=utf-8' });
        response.end(error instanceof Error ? error.message : 'Calendar storage is unavailable.');
      }
      return;
    }

    const payload = requestUrl.searchParams.get('payload') ?? '';
    const ics = decodeIcsPayload(payload);
    console.info('[MORNING FLOW AI] Apple Calendar API parsed GET payload', {
      hasBegin: ics.includes('BEGIN:VCALENDAR'),
      hasEvent: ics.includes('BEGIN:VEVENT'),
      length: ics.length,
      pathname: requestUrl.pathname,
    });

    if (!isValidIcsContent(ics)) {
      response.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
      response.end('Invalid calendar file.');
      return;
    }

    sendIcsResponse(response, ics);
    return;
  }

  if (request.method !== 'POST') {
    response.writeHead(405, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('POST only.');
    return;
  }

  try {
    const body = await readFormBody(request);
    const params = new URLSearchParams(body);
    const ics = String(params.get('ics') ?? '');
    console.info('[MORNING FLOW AI] Apple Calendar API parsed body', {
      hasBegin: ics.includes('BEGIN:VCALENDAR'),
      hasEvent: ics.includes('BEGIN:VEVENT'),
      length: ics.length,
    });

    if (!isValidIcsContent(ics)) {
      response.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
      response.end('Invalid calendar file.');
      return;
    }

    if (request.headers['x-mfai-apple-create-import'] === '1') {
      const id = await createAppleCalendarImport(ics);
      const url = `/api/apple-calendar.ics?id=${encodeURIComponent(id)}`;
      console.info('[MORNING FLOW AI] Apple Calendar API created import id', {
        id,
        length: ics.length,
        storage: 'vercel-kv',
        urlLength: url.length,
      });
      sendJson(response, 200, {
        expiresInSeconds: importTtlSeconds,
        id,
        ok: true,
        storage: 'vercel-kv',
        url,
      });
      return;
    }

    sendIcsResponse(response, ics);
  } catch (error) {
    response.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end(error instanceof Error ? error.message : 'Calendar export failed.');
  }
}

export function isValidIcsContent(ics) {
  return ics.includes('BEGIN:VCALENDAR') && ics.includes('END:VCALENDAR') && ics.includes('BEGIN:VEVENT');
}

export function decodeIcsPayload(payload) {
  if (!payload) return '';

  try {
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
    return Buffer.from(padded, 'base64').toString('utf8');
  } catch {
    return '';
  }
}

async function createAppleCalendarImport(ics) {
  const id = randomUUID().replace(/-/g, '').slice(0, 12);
  await runKvCommand(['SET', createAppleCalendarKey(id), ics, 'EX', importTtlSeconds]);
  return id;
}

async function getAppleCalendarImport(id) {
  const data = await runKvCommand(['GET', createAppleCalendarKey(id)]);
  return typeof data.result === 'string' ? data.result : '';
}

function createAppleCalendarKey(id) {
  return `${kvKeyPrefix}${id}`;
}

async function runKvCommand(command) {
  const apiUrl = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;

  if (!apiUrl || !token) {
    throw new Error('Vercel KV is not configured. Please set KV_REST_API_URL and KV_REST_API_TOKEN.');
  }

  const response = await fetch(apiUrl, {
    body: JSON.stringify(command),
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    method: 'POST',
  });
  const data = await response.json().catch(() => null);

  if (!response.ok || !data || data.error) {
    throw new Error(data?.error ?? `Vercel KV request failed: ${response.status}`);
  }

  return data;
}

export function sendIcsResponse(response, ics) {
  const headers = {
    'Content-Type': 'text/calendar; charset=utf-8',
    'Content-Disposition': 'inline; filename="morning-flow-event.ics"',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  };
  console.info('[MORNING FLOW AI] Apple Calendar API response', {
    contentDisposition: headers['Content-Disposition'],
    contentType: headers['Content-Type'],
    length: ics.length,
    status: 200,
  });
  response.writeHead(200, headers);
  response.end(ics);
}

function sendJson(response, status, payload) {
  response.writeHead(status, {
    'Cache-Control': 'no-store',
    'Content-Type': 'application/json; charset=utf-8',
  });
  response.end(JSON.stringify(payload));
}

function readFormBody(request) {
  return new Promise((resolve, reject) => {
    let body = '';

    request.setEncoding('utf8');
    request.on('data', (chunk) => {
      body += chunk;
      if (body.length > maxIcsBodySize) {
        reject(new Error('Calendar file is too large.'));
        request.destroy();
      }
    });
    request.on('end', () => resolve(body));
    request.on('error', reject);
  });
}
