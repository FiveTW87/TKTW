#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

const stages = [
  ["typecheck", ["pnpm", "typecheck"]],
  ["engine tests", ["pnpm", "--filter", "@tktw/engine", "test"]],
  ["server tests", ["pnpm", "--filter", "@tktw/server", "test"]],
  ["client tests", ["pnpm", "--filter", "@tktw/client", "test"]],
  ["client production build", ["pnpm", "build:client"]],
  ["catalog drift check", ["pnpm", "catalog:check"]],
];

const startedAt = Date.now();

for (const [name, command] of stages) {
  const stageStartedAt = Date.now();
  console.log(`\n[verify:milestone] ${name}`);
  const result = spawnSync(command[0], command.slice(1), {
    cwd: ROOT,
    shell: process.platform === "win32",
    stdio: "inherit",
  });
  if (result.error) {
    console.error(`[verify:milestone] ${name} could not start: ${result.error.message}`);
    process.exit(1);
  }
  if (result.status !== 0) {
    console.error(`[verify:milestone] ${name} failed with exit code ${result.status ?? "unknown"}`);
    process.exit(result.status ?? 1);
  }
  console.log(`[verify:milestone] ${name} passed in ${Math.round((Date.now() - stageStartedAt) / 1000)}s`);
}

console.log(`\n[verify:milestone] all gates passed in ${Math.round((Date.now() - startedAt) / 1000)}s`);
