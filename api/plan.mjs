import { handlePlanRequest } from '../scripts/openai-plan-handler.mjs';

export default async function handler(request, response) {
  await handlePlanRequest(request, response);
}
