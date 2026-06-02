const maxIcsBodySize = 256 * 1024;

export async function handleAppleCalendarRequest(request, response) {
  if (request.method !== 'POST') {
    response.writeHead(405, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('POST only.');
    return;
  }

  try {
    const body = await readFormBody(request);
    const params = new URLSearchParams(body);
    const ics = String(params.get('ics') ?? '');

    if (!isValidIcsContent(ics)) {
      response.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
      response.end('Invalid calendar file.');
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

export function sendIcsResponse(response, ics) {
  response.writeHead(200, {
    'Content-Type': 'text/calendar; charset=utf-8',
    'Content-Disposition': 'inline; filename="morning-flow-event.ics"',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  });
  response.end(ics);
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
