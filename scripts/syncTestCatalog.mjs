#!/usr/bin/env node
// Keeps TKTW_TEST_CASE_CATALOG.md honest: runs the engine suite, maps every
// `it()` back to the checkbox it implements, and rewrites each line's status
// from the actual run.
//
// Hand-ticking 256 boxes drifts within a day, which is exactly the failure mode
// the catalog itself warns about ("ห้ามถือว่า implementation ผ่านจาก catalog นี้
// เพียงอย่างเดียว"). So the marks are generated, never typed.
//
//   node scripts/syncTestCatalog.mjs --annotate   # once: stamp [ID] into each line
//   node scripts/syncTestCatalog.mjs              # run tests, rewrite statuses
//   node scripts/syncTestCatalog.mjs --no-run     # reuse the last report
//   node scripts/syncTestCatalog.mjs --check      # CI gate, exits non-zero on drift
//
// ID scheme: <SECTION_CODE>-<NN>, section code taken from the `####` heading
// (`G-CAOCAO`, `C-SHA`, `E-HORSE-MINUS`), NN the checkbox's ordinal in that
// section. Once stamped into the line, IDs are read back rather than
// recomputed, so inserting a checkbox later can't renumber its neighbours.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const CATALOG = join(ROOT, "TKTW_TEST_CASE_CATALOG.md");
const ENGINE = join(ROOT, "packages", "engine");
const REPORT = join(ENGINE, ".vitest-report.json");
const WAIVERS = join(ENGINE, "tests", "_contract", "waivers.ts");

const argv = new Set(process.argv.slice(2));
const MODE = {
  annotate: argv.has("--annotate"),
  check: argv.has("--check"),
  run: !argv.has("--no-run"),
};

const MARKS = { fail: "❌", waived: "⚠️", pending: "⏳" };
const BUGS_HEADING = "## บั๊กที่พบใน engine (auto-generated)";
const SYNC_PREFIX = "<!-- catalog-sync:";

// ── catalog parsing ──────────────────────────────────────────────────────────

const CHECKBOX = /^- \[([ xX])\] (.*)$/;
const SECTION = /^####\s+([A-Z][A-Z0-9-]*)\b/;
const ID_TAG = /^\[([A-Z][A-Z0-9-]*-\d+)\]\s+/;
const MARK_TAG = new RegExp(`^(${Object.values(MARKS).join("|")})\\s+`);
const TRAILING_COMMENT = /\s*<!--[\s\S]*?-->\s*$/;

/** Split a catalog checkbox line into its parts. */
function parseCheckbox(raw) {
  const m = CHECKBOX.exec(raw);
  if (!m) return null;
  let rest = m[2].replace(TRAILING_COMMENT, "");
  const mark = MARK_TAG.exec(rest);
  if (mark) rest = rest.slice(mark[0].length);
  const idm = ID_TAG.exec(rest);
  const id = idm ? idm[1] : null;
  if (idm) rest = rest.slice(idm[0].length);
  return { checked: m[1].toLowerCase() === "x", mark: mark ? mark[1] : null, id, body: rest };
}

function renderCheckbox({ checked, mark, id, body }, comment) {
  const parts = [`- [${checked ? "x" : " "}]`];
  if (mark) parts.push(mark);
  if (id) parts.push(`[${id}]`);
  parts.push(body);
  const line = parts.join(" ");
  return comment ? `${line} <!-- ${comment} -->` : line;
}

/** Walk the catalog, yielding {index, parsed, sectionCode, ordinal} per checkbox. */
function scanCatalog(lines) {
  const out = [];
  let section = null;
  const counters = new Map();
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith("## ")) {
      // The deck section has no `#### CODE` heading of its own.
      section = /^##\s+Physical deck/.test(line) ? "D-DECK" : null;
      continue;
    }
    const sec = SECTION.exec(line);
    if (sec) {
      section = sec[1];
      continue;
    }
    const parsed = parseCheckbox(line);
    if (!parsed) continue;
    if (!section) {
      throw new Error(`checkbox outside any known section at line ${i + 1}: ${line}`);
    }
    const n = (counters.get(section) ?? 0) + 1;
    counters.set(section, n);
    out.push({ index: i, parsed, section, ordinal: n });
  }
  return out;
}

const pad = (n) => String(n).padStart(2, "0");

// ── waivers ──────────────────────────────────────────────────────────────────

function readWaivers() {
  if (!existsSync(WAIVERS)) return {};
  const src = readFileSync(WAIVERS, "utf8");
  const out = {};
  // Deliberately a regex, not an import: this script is plain node and must not
  // need a TS loader just to read a string map.
  for (const m of src.matchAll(/^\s*"([A-Z][A-Z0-9-]*-\d+)":\s*"((?:[^"\\]|\\.)*)"/gm)) {
    out[m[1]] = m[2].replace(/\\"/g, '"');
  }
  return out;
}

// ── test results ─────────────────────────────────────────────────────────────

const TITLE_ID = /\[([A-Z][A-Z0-9-]*-\d+)([a-z])?\]/;

function runSuite() {
  console.log("running the engine suite (this takes ~40s)…");
  const res = spawnSync(
    "npx",
    ["vitest", "run", "--reporter=json", `--outputFile=${REPORT}`],
    { cwd: ENGINE, shell: true, stdio: ["ignore", "pipe", "inherit"], encoding: "utf8" },
  );
  // A non-zero exit just means some tests failed — expected here, and the
  // whole point of the run. Only a missing report is fatal.
  if (!existsSync(REPORT)) {
    throw new Error(`vitest produced no report (exit ${res.status}). Is vitest installed?`);
  }
}

function cleanFailure(msg) {
  return String(msg ?? "")
    // eslint-disable-next-line no-control-regex
    .replace(/\[[0-9;]*m/g, "")
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean)[0]
    ?.replace(/--+>/g, "-->".replace(">", "&gt;"))
    .slice(0, 200) ?? "assertion failed";
}

/** id -> { total, failed, firstFailure } */
function readResults() {
  const report = JSON.parse(readFileSync(REPORT, "utf8"));
  const byId = new Map();
  for (const file of report.testResults ?? []) {
    for (const a of file.assertionResults ?? []) {
      const m = TITLE_ID.exec(a.fullName ?? a.title ?? "");
      if (!m) continue;
      const id = m[1];
      const rec = byId.get(id) ?? { total: 0, failed: 0, firstFailure: null };
      rec.total++;
      if (a.status === "failed") {
        rec.failed++;
        rec.firstFailure ??= cleanFailure((a.failureMessages ?? [])[0]);
      }
      byId.set(id, rec);
    }
  }
  return byId;
}

// ── modes ────────────────────────────────────────────────────────────────────

function annotate() {
  const lines = readFileSync(CATALOG, "utf8").split(/\r?\n/);
  const boxes = scanCatalog(lines);
  const perSection = new Map();
  let stamped = 0;
  for (const { index, parsed, section, ordinal } of boxes) {
    perSection.set(section, ordinal);
    if (!parsed.id) {
      parsed.id = `${section}-${pad(ordinal)}`;
      stamped++;
    }
    lines[index] = renderCheckbox(parsed, null);
  }
  writeFileSync(CATALOG, lines.join("\n"), "utf8");
  console.log(`annotated ${stamped} new id(s); ${boxes.length} checkbox(es) total\n`);
  for (const [section, n] of perSection) console.log(`  ${section.padEnd(18)} ${n}`);
}

function sync() {
  if (MODE.run) runSuite();
  if (!existsSync(REPORT)) throw new Error(`no report at ${REPORT}; run without --no-run first`);

  const waived = readWaivers();
  const results = readResults();
  const lines = readFileSync(CATALOG, "utf8").split(/\r?\n/);
  const boxes = scanCatalog(lines);

  const tally = { pass: 0, fail: 0, waived: 0, pending: 0 };
  const bugs = [];
  const drift = [];

  for (const { index, parsed, section, ordinal } of boxes) {
    const id = parsed.id ?? `${section}-${pad(ordinal)}`;
    const before = renderCheckbox(parsed, null);
    const r = results.get(id);
    let next;
    let comment = null;

    if (waived[id]) {
      next = { ...parsed, id, checked: true, mark: MARKS.waived };
      comment = `WAIVED: ${waived[id]}`;
      tally.waived++;
    } else if (!r || r.total === 0) {
      next = { ...parsed, id, checked: false, mark: MARKS.pending };
      tally.pending++;
      drift.push(`${id}: no test implements this checkbox`);
    } else if (r.failed > 0) {
      next = { ...parsed, id, checked: false, mark: MARKS.fail };
      comment = `FAIL: ${r.firstFailure}`;
      tally.fail++;
      bugs.push({ id, section, body: parsed.body, failure: r.firstFailure });
    } else {
      next = { ...parsed, id, checked: true, mark: null };
      tally.pass++;
    }

    const rendered = renderCheckbox(next, comment);
    if (MODE.check && before !== renderCheckbox(next, null)) {
      drift.push(`${id}: catalog says "${before.slice(0, 60)}…" but the run says otherwise`);
    }
    lines[index] = rendered;
  }

  const total = boxes.length;
  const rev = spawnSync("git", ["rev-parse", "--short", "HEAD"], {
    cwd: ROOT,
    encoding: "utf8",
  }).stdout?.trim();
  const header = `${SYNC_PREFIX} ${tally.pass} pass / ${tally.fail} fail / ${tally.waived} waived / ${tally.pending} pending — ${total} checkboxes, vitest @ ${rev || "unknown"}, ${new Date().toISOString().slice(0, 10)} -->`;

  let out = lines.filter((l) => !l.startsWith(SYNC_PREFIX));
  const titleIdx = out.findIndex((l) => l.startsWith("# "));
  out.splice(titleIdx + 1, 0, "", header);

  // Regenerate the bug appendix from scratch each run.
  const bugsIdx = out.findIndex((l) => l.startsWith(BUGS_HEADING));
  if (bugsIdx >= 0) out = out.slice(0, bugsIdx);
  if (bugs.length > 0) {
    out.push("", BUGS_HEADING, "");
    out.push(
      `เคสที่เขียนเทสตามข้อความใน catalog แล้ว engine ทำงานไม่ตรง — ปล่อยแดงไว้ตามนโยบาย ไม่แก้ \`src/\``,
      "",
      "| Case | หัวข้อ | อาการ |",
      "| --- | --- | --- |",
    );
    for (const b of bugs) {
      const body = b.body.replace(/\|/g, "\\|").slice(0, 110);
      const fail = b.failure.replace(/\|/g, "\\|").slice(0, 110);
      out.push(`| \`${b.id}\` | ${body} | ${fail} |`);
    }
  }
  out.push("");

  // A check is a read-only gate. Keeping the candidate in memory prevents CI
  // and local verification from dirtying the worktree merely to report drift.
  if (!MODE.check) {
    writeFileSync(CATALOG, out.join("\n").replace(/\n{3,}$/, "\n"), "utf8");
  }
  console.log(
    `${tally.pass} pass / ${tally.fail} fail / ${tally.waived} waived / ${tally.pending} pending (${total} checkboxes)`,
  );

  if (MODE.check && drift.length > 0) {
    console.error(`\ncatalog:check failed — ${drift.length} problem(s):`);
    for (const d of drift.slice(0, 40)) console.error(`  ${d}`);
    process.exit(1);
  }
}

try {
  if (MODE.annotate) annotate();
  else sync();
} catch (err) {
  console.error(err.message);
  process.exit(2);
}
