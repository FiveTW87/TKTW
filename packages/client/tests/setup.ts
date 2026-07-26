import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

afterEach(() => {
  cleanup();
  window.localStorage.clear();
  // Phase 8 tests resize the jsdom window to simulate mobile-landscape gate
  // sizes — reset back to the default desktop-ish size so it doesn't leak
  // into unrelated tests in the same file.
  window.innerWidth = 1024;
  window.innerHeight = 768;
});
