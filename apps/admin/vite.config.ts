import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

const target = process.env.API_PROXY_TARGET ?? 'http://localhost:3000';

export default defineConfig({
  base: '/admin/',
  plugins: [react()],
  server: {
    port: 5174,
    proxy: { '/api': target, '/media': target },
  },
  test: {
    include: ['src/**/*.test.ts'],
  },
});
