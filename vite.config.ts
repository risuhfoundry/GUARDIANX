import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    allowedHosts: [
      '3000-i8ln88nw2ba6ovr9lgjxv-02eab0ea.sg2.manus.computer',
      '8328-i8ln88nw2ba6ovr9lgjxv-02eab0ea.sg2.manus.computer',
    ],
    host: '0.0.0.0',
    port: 3000,
    strictPort: true,
  },
});
