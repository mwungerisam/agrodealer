import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { nitro } from "nitro/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [
    tanstackStart({ server: { entry: "server" } }),
    // Emit Vercel Build Output API artifacts instead of a long-running Node server.
    // The application is deployed on Vercel, so relying on Nitro's local default
    // (`node-server`) produces an artifact Vercel cannot reliably run.
    nitro({ preset: "vercel" }),
    viteReact(),
    tailwindcss(),
    tsconfigPaths(),
  ],
});
