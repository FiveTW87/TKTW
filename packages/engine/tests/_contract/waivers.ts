// Catalog cases where the engine deviates from the catalog text ON PURPOSE, with
// the divergence stated in a code comment at the cited line. Those tests are
// written against the behaviour that is actually implemented, and the catalog
// line is rendered "⚠️ waived" by scripts/syncTestCatalog.mjs rather than being
// silently ticked as if the catalog text held.
//
// This file is NOT a place to park failures. A case whose behaviour merely looks
// wrong belongs in the ❌ set (test written to the catalog, left red) — a waiver
// requires a deliberate, documented simplification in src/.
export const WAIVED: Record<string, string> = {};
