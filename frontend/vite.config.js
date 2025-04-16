import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@material-dashboard': path.resolve(__dirname, '.src/assets/dashboard'),
      '@com': path.resolve(__dirname, 'src/components'),
    },
  },
});
