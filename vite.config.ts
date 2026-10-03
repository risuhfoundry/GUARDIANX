import { defineConfig, loadEnv } from 'vite';
import { readSupabaseConfig } from './src/lib/supabaseConfig';
import react from '@vitejs/plugin-react';

export default defineConfig(({ command, mode }) => {
  const config = readSupabaseConfig(loadEnv(mode, process.cwd(), 'VITE_'));
  if (command === 'build' && !config.ok) {
    throw new Error(`GUARDIAN X build configuration: ${config.message}`);
  }
  return {
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
  };
});
