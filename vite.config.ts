import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { adminPlugin } from './plugins/adminPlugin';

export default defineConfig({
  server: {
    port: 3000,
    host: '0.0.0.0',
    allowedHosts: [
      "noncognizant-milania-untamely.ngrok-free.dev"
    ]
  },
  plugins: [react(), adminPlugin()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    }
  }
});
