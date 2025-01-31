import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: "/image-annotator",
  optimizeDeps: {
    // exclude: ['lucide-react'],
  },
});
