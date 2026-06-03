import { defineConfig } from 'vite';
import packageJson from './package.json';

export default defineConfig({
  base: './',
  define: {
    __APP_VERSION__: JSON.stringify(`v${packageJson.version}`),
  },
  server: {
    host: '0.0.0.0',
  },
});
