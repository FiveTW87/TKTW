// pnpm sim --players 8 [--seed 12345] [--games 1]
import { createGame } from "../index";
import { simpleBotAnswer } from "../bots/simplePolicy";
import { runUntilEnd } from "../bots/runner";

function parseArgs(argv: string[]): { players: number; seed: number; games: number; quiet: boolean } {
  const get = (flag: string, fallback: string) => {
    const i = argv.indexOf(flag);
    return i >= 0 && argv[i + 1] ? argv[i + 1]! : fallback;
  };
  return {
    players: Number(get("--players", "8")),
    seed: Number(get("--seed", String(Date.now() % 1_000_000))),
    games: Number(get("--games", "1")),
    quiet: argv.includes("--quiet"),
  };
}

function runOne(players: number, seed: number, quiet: boolean): void {
  const session = createGame({ playerCount: players, seed });
  runUntilEnd(session, simpleBotAnswer);

  if (!quiet) {
    for (const entry of session.state.log) {
      console.log(`[T${entry.turn}] ${entry.text}`);
    }
  }
  const alive = session.state.players.filter((p) => p.alive).map((p) => p.id);
  console.log(
    `seed=${seed} players=${players} turns=${session.state.turnNumber} finished=${session.state.finished} alive=${JSON.stringify(alive)}`,
  );
}

function main(): void {
  const { players, seed, games, quiet } = parseArgs(process.argv.slice(2));
  for (let i = 0; i < games; i++) {
    runOne(players, seed + i, quiet && games > 1 ? true : quiet);
  }
}

main();
