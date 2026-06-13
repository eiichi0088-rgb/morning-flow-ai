import { defineConfig } from 'vite';
import packageJson from './package.json';

const displayVersion = (packageJson as { appVersion?: string; version: string }).appVersion ?? packageJson.version;

export default defineConfig({
  base: './',
  define: {
    __APP_VERSION__: JSON.stringify(`v${displayVersion}`),
  },
  server: {
    host: '0.0.0.0',
    allowedHosts: true,
  },
});
