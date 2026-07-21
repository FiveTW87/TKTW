// pnpm sim --players 8 [--seed 12345] [--games 1] [--identity] [--quiet]
import { createGame } from "../index";
import { createIdentityGame } from "../modes/identity";
import { simpleBotAnswer } from "../bots/simplePolicy";
import { runUntilEnd } from "../bots/runner";

function parseArgs(argv: string[]) {
  const get = (flag: string, fallback: string) => {
    const i = argv.indexOf(flag);
    return i >= 0 && argv[i + 1] ? argv[i + 1]! : fallback;
  };
  return {
    players: Number(get("--players", "8")),
    seed: Number(get("--seed", String(Date.now() % 1_000_000))),
    games: Number(get("--games", "1")),
    quiet: argv.includes("--quiet"),
    identity: argv.includes("--identity"),
  };
}

function runOne(players: number, seed: number, quiet: boolean, identity: boolean): void {
  const session = identity
    ? createIdentityGame({ playerCount: players, seed })
    : createGame({ playerCount: players, seed });
  runUntilEnd(session, simpleBotAnswer);

  if (!quiet) {
    for (const entry of session.state.log) {
      const parts = [entry.eventType, entry.actorId, entry.skillId, entry.cardType, entry.amount]
        .filter((v) => v !== undefined)
        .join(" ");
      console.log(`[T${entry.turn}] ${parts}${entry.targetIds ? " -> " + entry.targetIds.join(",") : ""}`);
    }
  }
  if (identity) {
    for (const p of session.state.players) {
      console.log(`  ${p.id} role=${p.role} general=${p.generalId} alive=${p.alive} hp=${p.hp}/${p.maxHp}`);
    }
  }
  const alive = session.state.players.filter((p) => p.alive).map((p) => p.id);
  console.log(
    `seed=${seed} players=${players} identity=${identity} turns=${session.state.turnNumber} ` +
      `finished=${session.state.finished} winners=${JSON.stringify(session.state.winners ?? [])} alive=${JSON.stringify(alive)}`,
  );
}

function main(): void {
  const { players, seed, games, quiet, identity } = parseArgs(process.argv.slice(2));
  for (let i = 0; i < games; i++) {
    runOne(players, seed + i, quiet && games > 1 ? true : quiet, identity);
  }
}

main();
