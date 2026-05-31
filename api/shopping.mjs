import { createShoppingPlanFromTranscript } from '../scripts/openai-shopping-handler.mjs';

export default {
  async fetch(request) {
    if (request.method !== 'POST') {
      return Response.json({ message: 'POSTで送信してください。' }, { status: 405 });
    }

    try {
      const body = await request.json();
      const text = String(body.text ?? '').trim();
      const currentItems = Array.isArray(body.currentItems) ? body.currentItems : [];

      if (!text) {
        return Response.json({ message: '買い物リストの内容が空です。' }, { status: 400 });
      }

      if (!process.env.OPENAI_API_KEY) {
        return Response.json(
          { message: 'VercelのEnvironment VariablesにOPENAI_API_KEYを設定してください。' },
          { status: 500 },
        );
      }

      const plan = await createShoppingPlanFromTranscript(text, currentItems);
      return Response.json({ plan });
    } catch (error) {
      return Response.json(
        { message: error instanceof Error ? error.message : '買い物リストのAI整理で問題が起きました。' },
        { status: 500 },
      );
    }
  },
};
