import { handleAppleCalendarRequest } from '../scripts/apple-calendar-handler.mjs';

export default async function handler(request, response) {
  await handleAppleCalendarRequest(request, response);
}
