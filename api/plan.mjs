import { createPlanFromTranscript, normalizeEnergy } from '../scripts/openai-plan-handler.mjs';

export default {
  async fetch(request) {
    if (request.method !== 'POST') {
      return Response.json({ message: 'POSTで送信してください。' }, { status: 405 });
    }

    try {
      const body = await request.json();
      const transcript = String(body.transcript ?? '').trim();
      const energy = normalizeEnergy(body.energy);
      const mode = body.mode === 'update' ? 'update' : 'create';
      const currentPlan = body.currentPlan ?? null;
      const shoppingItems = Array.isArray(body.shoppingItems) ? body.shoppingItems.map(String) : [];
      const contactReminders = Array.isArray(body.contactReminders) ? body.contactReminders.map(String) : [];

      if (!transcript) {
        return Response.json({ message: '文字起こし内容が空です。' }, { status: 400 });
      }

      if (!process.env.OPENAI_API_KEY) {
        return Response.json(
          { message: 'VercelのEnvironment VariablesにOPENAI_API_KEYを設定してください。' },
          { status: 500 },
        );
      }

      const plan = await createPlanFromTranscript(transcript, energy, {
        contactReminders,
        currentPlan,
        mode,
        shoppingItems,
      });
      return Response.json({ plan });
    } catch (error) {
      return Response.json(
        { message: error instanceof Error ? error.message : 'AI整理で問題が起きました。' },
        { status: 500 },
      );
    }
  },
};
