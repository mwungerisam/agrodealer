import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { nitro } from "nitro/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig(({ command }) => ({
  plugins: [
    tanstackStart({ server: { entry: "server" } }),
    // Nitro's Vercel preset creates deployment artifacts during a production
    // build, but it takes over Vite's request handler in development and
    // returns 404 for the app routes. Let TanStack Start handle dev requests.
    ...(command === "build" ? [nitro({ preset: "vercel" })] : []),
    viteReact(),
    tailwindcss(),
    tsconfigPaths(),
  ],
}));
