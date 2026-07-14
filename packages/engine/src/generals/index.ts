// Side-effect imports: each module calls registerGeneral() on load.
// SPEC 11 tiers: A (basic triggers) -> B (interactions) -> C (edge cases).
import "./caocao";
import "./zhangfei";
import "./guanyu";
import "./machao";
import "./zhouyu";
import "./zhenji";
import "./huanggai";
import "./sunshangxiang";
import "./luxun";
import "./simayi";
import "./xiahoudun";
import "./caoren";

export { GENERALS, registerGeneral } from "./registry";
