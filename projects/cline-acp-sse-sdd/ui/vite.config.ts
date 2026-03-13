import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    proxy: {
      '/events': 'http://localhost:3002',
      '/prompt': 'http://localhost:3002',
      '/permission': 'http://localhost:3002',
      '/health': 'http://localhost:3002',
    },
  },
});
