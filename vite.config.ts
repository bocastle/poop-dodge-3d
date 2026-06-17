import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    // The Three/R3F renderer is intentionally split as a cacheable 3D vendor chunk.
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) {
            return undefined;
          }

          if (id.includes("/three/")) {
            return "vendor-three";
          }

          if (id.includes("/@react-three/")) {
            return "vendor-r3f";
          }

          if (id.includes("/socket.io-client/") || id.includes("/engine.io-client/")) {
            return "vendor-socket";
          }

          if (id.includes("/react/") || id.includes("/react-dom/") || id.includes("/scheduler/")) {
            return "vendor-react";
          }

          return "vendor";
        },
      },
    },
  },
  server: {
    host: "127.0.0.1",
    port: 5173,
  },
});
