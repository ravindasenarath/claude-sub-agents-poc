import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  resolve: {
    alias: {
      // `server-only`'s default export throws unconditionally (it relies on
      // Next's build-time "react-server" resolution condition to swap in a
      // no-op, which Vitest doesn't apply). Point it at the package's own
      // no-op build instead so modules marked `import "server-only"` can be
      // unit tested directly, the same way Next's own testing docs recommend.
      "server-only": fileURLToPath(
        new URL("./node_modules/server-only/empty.js", import.meta.url),
      ),
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    exclude: ["node_modules", ".next", "e2e/**"],
  },
});
