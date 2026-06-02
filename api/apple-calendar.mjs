import { isValidIcsContent } from '../scripts/apple-calendar-handler.mjs';

export default {
  async fetch(request) {
    if (request.method !== 'POST') {
      return new Response('POST only.', {
        status: 405,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      });
    }

    const formData = await request.formData();
    const ics = String(formData.get('ics') ?? '');

    if (!isValidIcsContent(ics)) {
      return new Response('Invalid calendar file.', {
        status: 400,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      });
    }

    return new Response(ics, {
      status: 200,
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': 'inline; filename="morning-flow-event.ics"',
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  },
};
