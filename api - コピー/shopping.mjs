import { handleShoppingRequest } from '../scripts/openai-shopping-handler.mjs';

export default async function handler(request, response) {
  await handleShoppingRequest(request, response);
}
