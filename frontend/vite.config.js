import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  // Read development settings from local environment files.
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react()],

    // Forward API requests to the local backend during development.
    // VITE_DEV_API_TARGET is configured locally, not hardcoded here.
    server: {
      proxy: env.VITE_DEV_API_TARGET
        ? {
            '/api': {
              target: env.VITE_DEV_API_TARGET,
              changeOrigin: true,
            },
          }
        : undefined,
    },
  };
});
