import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { handlePlanRequest, loadEnvFile } from './openai-plan-handler.mjs';
import { handleShoppingRequest } from './openai-shopping-handler.mjs';

const root = join(process.cwd(), 'dist');
const port = Number(process.env.PORT ?? 4173);

await loadEnvFile();

const contentTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
};

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

  const pathname = url.pathname === '/' ? '/index.html' : url.pathname;
  const filePath = normalize(join(root, pathname));

  if (!filePath.startsWith(root)) {
    response.writeHead(403);
    response.end('Forbidden');
    return;
  }

  try {
    const data = await readFile(filePath);
    response.writeHead(200, { 'Content-Type': contentTypes[extname(filePath)] ?? 'application/octet-stream' });
    response.end(data);
  } catch {
    const fallback = await readFile(join(root, 'index.html'));
    response.writeHead(200, { 'Content-Type': contentTypes['.html'] });
    response.end(fallback);
  }
}).listen(port, '0.0.0.0', () => {
  console.log(`MORNING FLOW AI v3.0 is running at http://localhost:${port}`);
});
