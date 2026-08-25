import { readFileSync, readdirSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("tutorial production isolation", () => {
  it("keeps tutorial conditions out of engine rule implementations", () => {
    const engineRoot = resolve(process.cwd(), "..", "engine", "src");
    const ruleRoots = ["cards", "generals", "equipment", "core"].map((name) => resolve(engineRoot, name));
    const offenders = ruleRoots.flatMap(sourceFiles).filter((file) => {
      const source = readFileSync(file, "utf8");
      return /tutorial(?:Scenario|Controller|Progress|Step|Action|Game|Bot)|from\s+["'][^"']*tutorial/i.test(source);
    });

    expect(offenders).toEqual([]);
  });

  it("limits server tutorial knowledge to lifecycle adapters rather than game rules", () => {
    const serverRoot = resolve(process.cwd(), "..", "server", "src");
    const allowed = new Set([
      resolve(serverRoot, "rooms", "RoomManager.ts"),
      resolve(serverRoot, "rooms", "gameFlow.ts"),
      resolve(serverRoot, "socketHandlers.ts"),
    ]);
    const offenders = sourceFiles(serverRoot).filter((file) => {
      if (allowed.has(file)) return false;
      return /tutorial/i.test(readFileSync(file, "utf8"));
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
