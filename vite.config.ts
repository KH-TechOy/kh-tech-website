import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    base: env.VITE_BASE_PATH || '/',
    plugins: [react()],
    build: { rollupOptions: { input: {
      home: resolve(__dirname, 'index.html'),
      services: resolve(__dirname, 'palvelut/index.html'),
      company: resolve(__dirname, 'yritys/index.html'),
      contact: resolve(__dirname, 'yhteystiedot/index.html'),
      privacy: resolve(__dirname, 'tietosuoja/index.html'),
      report: resolve(__dirname, 'report/index.html'),
      game: resolve(__dirname, 'peli/index.html'),
    } } },
  };
});
