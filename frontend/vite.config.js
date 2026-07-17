import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Load all environment variables (including those from Vercel's system process.env)
  const env = loadEnv(mode, process.cwd(), '');

  console.log("--- Vite Build-Time Env Check ---");
  console.log("Loaded VITE_BASE_URL:", env.VITE_BASE_URL);
  console.log("---------------------------------");

  return {
    plugins: [react()],
    define: {
      "process.env.VITE_BASE_URL": JSON.stringify(env.VITE_BASE_URL),
      "import.meta.env.VITE_BASE_URL": JSON.stringify(env.VITE_BASE_URL),
    },
  };
})
