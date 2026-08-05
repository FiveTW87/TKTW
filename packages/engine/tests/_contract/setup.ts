// Global vitest setup. Runs the deck's core invariant against every game the
// contract suite built, after every test — so a rigging mistake or an engine
// path that clones a physical card fails at the test that caused it rather than
// as a confusing assertion three cases later.
//
// Only the always-true half is enforced automatically (no id in two zones at
// once). Full conservation is opt-in via rig.assertCardConservation, because a
// card legitimately belongs to no zone while it is in flight — a judgment card
// held in its mutable box, or a wugu pool awaiting picks.
import { afterEach } from "vitest";
import { takeLiveStates } from "./harness";
import { assertNoCardDuplication } from "./rig";

afterEach(() => {
  for (const state of takeLiveStates()) assertNoCardDuplication(state);
});
