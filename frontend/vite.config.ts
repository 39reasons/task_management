import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import tailwindcss from "@tailwindcss/vite";

const sharedDir = (() => {
  const url = new URL("../shared", import.meta.url);
  const path = decodeURIComponent(url.pathname);
  // On Windows, file URLs produce paths like /C:/...
  return path.replace(/^\/(\w:)/, "$1");
})();

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@shared": sharedDir,
    },
  },
})
