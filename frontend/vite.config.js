import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import dotenv from "dotenv";

dotenv.config();

console.log("--- Vite Build-Time Env Check ---");
console.log("process.env.VITE_BASE_URL:", process.env.VITE_BASE_URL);
console.log("---------------------------------");

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    "process.env.VITE_BASE_URL": JSON.stringify(process.env.VITE_BASE_URL),
    "import.meta.env.VITE_BASE_URL": JSON.stringify(process.env.VITE_BASE_URL),
  },
})
