import { createServer } from 'node:http';
import { createServer as createViteServer } from 'vite';
import { handlePlanRequest, loadEnvFile } from './openai-plan-handler.mjs';
import { handleShoppingRequest } from './openai-shopping-handler.mjs';

await loadEnvFile();

const host = process.env.HOST || '127.0.0.1';
const port = Number(process.env.PORT || 5173);

const vite = await createViteServer({
  appType: 'spa',
  server: {
    host,
    middlewareMode: true,
  },
});

createServer(async (request, response) => {
  const url = new URL(request.url ?? '/', `http://${request.headers.host}`);

  if (url.pathname === '/api/plan') {
    await handlePlanRequest(request, response);
    return;
  }

  if (url.pathname === '/api/shopping') {
    await handleShoppingRequest(request, response);
    return;
  }

  vite.middlewares(request, response, () => {
    response.writeHead(404);
    response.end('Not found');
  });
}).listen(port, host, () => {
  console.log(`MORNING FLOW AI v1.3 is running at http://${host}:${port}/`);
});
