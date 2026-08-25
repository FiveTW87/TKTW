import { readFileSync, readdirSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("tutorial production isolation", () => {
  it("keeps tutorial rules out of engine, shared, and server production sources", () => {
    const packageRoots = ["engine", "shared", "server"].map((name) => resolve(process.cwd(), "..", name, "src"));
    const offenders = packageRoots.flatMap(sourceFiles).filter((file) => {
      const source = readFileSync(file, "utf8");
      return /(?:from|import)\s*[('"].*tutorial|tutorial(?:Scenario|Controller|Progress|Step|Action)/i.test(source);
    });

    expect(offenders).toEqual([]);
  });

  it("lets the client tutorial boundary depend only on shared public protocol types", () => {
    const tutorialRoot = resolve(process.cwd(), "src", "tutorial");
    const forbiddenImports = sourceFiles(tutorialRoot).filter((file) => {
      const source = readFileSync(file, "utf8");
      return source.includes("@tktw/engine") || source.includes("gameStore") || source.includes("GameState");
    });

    expect(forbiddenImports).toEqual([]);
  });
});

function sourceFiles(root: string): string[] {
  return readdirSync(root).flatMap((entry) => {
    const path = resolve(root, entry);
    return statSync(path).isDirectory() ? sourceFiles(path) : /\.[cm]?[jt]sx?$/.test(entry) ? [path] : [];
  });
}
