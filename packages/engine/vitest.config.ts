import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    // Enforces the deck's "one physical id, one zone" invariant after every
    // test in the catalog contract suite. No-op for the older suites, which
    // never register a game with the contract harness.
    setupFiles: ["tests/_contract/setup.ts"],
  },
});
