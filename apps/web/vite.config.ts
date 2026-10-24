import { reactRouter } from '@react-router/dev/vite';
import { defineConfig } from 'vite';

const target = process.env.API_PROXY_TARGET ?? 'http://localhost:3000';

export default defineConfig({
  plugins: [reactRouter()],
  resolve: { tsconfigPaths: true },
  server: {
    port: 5173,
    proxy: { '/api': target, '/media': target },
  },
});
