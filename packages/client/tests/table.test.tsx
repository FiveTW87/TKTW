import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const { fakeSocket, sentEvents, respondTo, clearSent } = vi.hoisted(() => {
  type Handler = (...args: unknown[]) => void;
  const handlers: Record<string, Handler[]> = {};
  const sentEvents: Array<{ event: string; payload: unknown; ack?: (res: unknown) => void }> = [];
  const fakeSocket = {
    connected: false,
    on(event: string, handler: Handler) {
      (handlers[event] ??= []).push(handler);
    },
    emit(event: string, payload: unknown, ack?: (res: unknown) => void) {
      sentEvents.push({ event, payload, ack });
    },
    fire(event: string, ...args: unknown[]) {
      (handlers[event] ?? []).forEach((h) => h(...args));
    },
  };
  function respondTo(event: string, response: unknown) {
    const entry = [...sentEvents].reverse().find((e) => e.event === event && e.ack);
    entry?.ack?.(response);
  }
  function clearSent() {
    sentEvents.length = 0;
  }
  return { fakeSocket, sentEvents, respondTo, clearSent };
});

vi.mock("socket.io-client", () => ({ io: () => fakeSocket }));

import App from "../src/App";
import { useGameStore } from "../src/store/gameStore";

beforeEach(() => {
  clearSent();
  useGameStore.setState({
    connected: false,
    initialized: false,
    roomCode: null,
    sessionToken: null,
    seatIndex: null,
    roomState: null,
    gameView: null,
    error: null,
    answeringId: null,
  });
});

function player(id: string, overrides: Record<string, unknown> = {}) {
  return {
    id,
    seat: Number(id.slice(1)),
    name: id,
    role: undefined,
    roleRevealed: false,
    generalId: "caocao",
    faction: "wei",
    gender: "male",
    hp: 4,
    maxHp: 4,
    alive: true,
    hand: [],
    equipment: {},
    judgmentZone: [],
    shaUsedThisTurn: 0,
    skillUsedThisTurn: {},
    ...overrides,
  };
}

async function enterRoom(roomCode: string) {
  const user = userEvent.setup();
  render(<App />);
  fakeSocket.fire("connect");
  await waitFor(() => expect(screen.getByPlaceholderText("ใส่ชื่อของคุณ")).toBeInTheDocument());
  await user.type(screen.getByPlaceholderText("ใส่ชื่อของคุณ"), "Alice");
  await user.click(screen.getByRole("button", { name: "สร้างห้องใหม่" }));
  await waitFor(() => expect(sentEvents.some((e) => e.event === "room:create")).toBe(true));
  respondTo("room:create", { ok: true, roomCode, sessionToken: "d".repeat(20), seatIndex: 0 });
  await waitFor(() => expect(screen.getByText(roomCode)).toBeInTheDocument());
  return user;
}

describe("Table: main action card play", () => {
  it("opponents aren't targetable until a card is selected, then selecting one and playing sends both ids", async () => {
    const user = await enterRoom("PLAYME");

    fakeSocket.fire("game:view", {
      viewerId: "p0",
      players: [
        player("p0", { hand: [{ id: "spade_1_1", typeKey: "sha", suit: "spade", rank: 1 }] }),
        player("p1", { hand: { count: 3 } }),
        player("p2", { hand: { count: 3 } }),
      ],
      currentSeat: 0,
      turnNumber: 1,
      phase: "play",
      drawPile: { count: 80 },
      discardPile: [],
      eventStack: [],
      pendingDecision: { id: "dec_main", kind: "mainAction", playerId: "p0", data: {} },
      finished: false,
      log: [{ id: "log_0", turn: 1, eventType: "roleReveal", actorId: "p0", visibility: "public", data: { role: "lord" } }],
    });

    await waitFor(() => expect(screen.getByText("สังหาร")).toBeInTheDocument());

    // no confirm bar and no targetable badge until a card is chosen
    expect(screen.queryByRole("button", { name: "ยืนยัน" })).not.toBeInTheDocument();
    expect(screen.queryByText("เลือก")).not.toBeInTheDocument();

    await user.click(screen.getByText("สังหาร"));

    // selecting a card raises the confirm bar and lights up targets
    const confirmBtn = await screen.findByRole("button", { name: "ยืนยัน" });
    await waitFor(() => expect(screen.getAllByText("เลือก").length).toBeGreaterThan(0));
    await user.click(screen.getAllByText("เลือก")[0]!);

    await user.click(confirmBtn);

    await waitFor(() => expect(sentEvents.some((e) => e.event === "game:answer")).toBe(true));
    const call = sentEvents.find((e) => e.event === "game:answer")!;
    const payload = call.payload as { cardIds: string[]; targetIds: string[]; choice: string };
    expect(payload.choice).toBe("playCard");
    expect(payload.cardIds).toEqual(["spade_1_1"]);
    expect(payload.targetIds).toEqual(["p1"]);
  });

  it("ท้อ opens a target picker when others are hurt, and heals the chosen player", async () => {
    const user = await enterRoom("TAOHELP");

    fakeSocket.fire("game:view", {
      viewerId: "p0",
      players: [
        player("p0", { hp: 4, maxHp: 4, hand: [{ id: "heart_3_1", typeKey: "tao", suit: "heart", rank: 3 }] }),
        player("p1", { name: "Bob", hp: 2, maxHp: 4, hand: { count: 3 } }), // injured
        player("p2", { hp: 3, maxHp: 4, hand: { count: 3 } }), // injured
      ],
      currentSeat: 0,
      turnNumber: 1,
      phase: "play",
      drawPile: { count: 80 },
      discardPile: [],
      eventStack: [],
      pendingDecision: { id: "dec_tao", kind: "mainAction", playerId: "p0", data: {} },
      finished: false,
      log: [],
    });

    await waitFor(() => expect(screen.getByText("ท้อ")).toBeInTheDocument());
    await user.click(screen.getByText("ท้อ"));

    // must NOT auto-play — there's a choice of who to help
    expect(sentEvents.some((e) => e.event === "game:answer")).toBe(false);

    const confirmBtn = await screen.findByRole("button", { name: "ยืนยัน" });
    await waitFor(() => expect(screen.getAllByText("เลือก").length).toBeGreaterThan(0));
    await user.click(screen.getAllByText("เลือก")[0]!);
    await user.click(confirmBtn);

    await waitFor(() => expect(sentEvents.some((e) => e.event === "game:answer")).toBe(true));
    const payload = sentEvents.find((e) => e.event === "game:answer")!.payload as { cardIds: string[]; targetIds: string[]; choice: string };
    expect(payload.choice).toBe("playCard");
    expect(payload.cardIds).toEqual(["heart_3_1"]);
    expect(payload.targetIds).toEqual(["p1"]);
  });

  it("ท้อ heals you immediately (one tap) when you're the only one hurt", async () => {
    const user = await enterRoom("TAOSELF");

    fakeSocket.fire("game:view", {
      viewerId: "p0",
      players: [
        player("p0", { hp: 3, maxHp: 4, hand: [{ id: "heart_3_1", typeKey: "tao", suit: "heart", rank: 3 }] }),
        player("p1", { hp: 4, maxHp: 4 }),
        player("p2", { hp: 4, maxHp: 4 }),
      ],
      currentSeat: 0,
      turnNumber: 1,
      phase: "play",
      drawPile: { count: 80 },
      discardPile: [],
      eventStack: [],
      pendingDecision: { id: "dec_taoself", kind: "mainAction", playerId: "p0", data: {} },
      finished: false,
      log: [],
    });

    await waitFor(() => expect(screen.getByText("ท้อ")).toBeInTheDocument());
    await user.click(screen.getByText("ท้อ"));

    await waitFor(() => expect(sentEvents.some((e) => e.event === "game:answer")).toBe(true));
    const payload = sentEvents.find((e) => e.event === "game:answer")!.payload as { cardIds: string[]; targetIds: string[]; choice: string };
    expect(payload.choice).toBe("playCard");
    expect(payload.cardIds).toEqual(["heart_3_1"]);
    expect(payload.targetIds).toEqual([]);
  });

  it("end phase sends choice: endPhase with no cards selected", async () => {
    const user = await enterRoom("ENDPH1");

    fakeSocket.fire("game:view", {
      viewerId: "p0",
      players: [player("p0"), player("p1"), player("p2")],
      currentSeat: 0,
      turnNumber: 1,
      phase: "play",
      drawPile: { count: 80 },
      discardPile: [],
      eventStack: [],
      pendingDecision: { id: "dec_end", kind: "mainAction", playerId: "p0", data: {} },
      finished: false,
      log: [],
    });

    const endBtn = await screen.findByRole("button", { name: "จบเทิร์น" });
    await user.click(endBtn);

    await waitFor(() => expect(sentEvents.some((e) => e.event === "game:answer")).toBe(true));
    const call = sentEvents.find((e) => e.event === "game:answer")!;
    expect(call.payload).toEqual({ roomCode: "ENDPH1", decisionId: "dec_end", choice: "endPhase" });
  });

  it("a reactive decision that isn't mine shows a waiting banner, not a confirm bar", async () => {
    await enterRoom("WAITTURN");

    fakeSocket.fire("game:view", {
      viewerId: "p0",
      players: [player("p0"), player("p1", { name: "Bob" }), player("p2")],
      currentSeat: 1,
      turnNumber: 2,
      phase: "play",
      drawPile: { count: 70 },
      discardPile: [],
      eventStack: [],
      pendingDecision: { id: "dec_shan", kind: "respondShan", playerId: "p1", data: { sourceId: "p0" } },
      finished: false,
      log: [],
    });

    await waitFor(() => expect(screen.getByText(/^Bob:/)).toBeInTheDocument());
    expect(screen.getByText(/^Bob:/).textContent).toContain("หลบ");
    expect(screen.queryByRole("button", { name: "ยืนยัน" })).not.toBeInTheDocument();
  });
});

describe("Table: reactive decision dialog", () => {
  it("a respondShan decision addressed to me shows a dodge dialog with a matching card and a decline button", async () => {
    const user = await enterRoom("DODGE01");

    fakeSocket.fire("game:view", {
      viewerId: "p0",
      players: [
        player("p0", {
          hand: [
            { id: "heart_1_1", typeKey: "shan", suit: "heart", rank: 1 },
            { id: "spade_2_1", typeKey: "sha", suit: "spade", rank: 2 },
          ],
        }),
        player("p1", { name: "Bob" }),
        player("p2"),
      ],
      currentSeat: 1,
      turnNumber: 2,
      phase: "play",
      drawPile: { count: 70 },
      discardPile: [],
      eventStack: [],
      pendingDecision: { id: "dec_shan_mine", kind: "respondShan", playerId: "p0", data: { sourceId: "p1" } },
      finished: false,
      log: [],
    });

    await waitFor(() => expect(screen.getByText(/จะลง "หลบ" ไหม/)).toBeInTheDocument());
    const dialog = within(screen.getByRole("dialog"));
    // only the shan card should be offered — sha shouldn't show up as an option
    expect(dialog.getByText("หลบ")).toBeInTheDocument();
    expect(dialog.queryByText("สังหาร")).not.toBeInTheDocument();

    await user.click(dialog.getByText("หลบ"));

    await waitFor(() => expect(sentEvents.some((e) => e.event === "game:answer")).toBe(true));
    const call = sentEvents.find((e) => e.event === "game:answer")!;
    expect(call.payload).toEqual({ roomCode: "DODGE01", decisionId: "dec_shan_mine", cardIds: ["heart_1_1"] });
  });

  it("declining a respondShan dialog sends pass: true", async () => {
    const user = await enterRoom("DODGE02");

    fakeSocket.fire("game:view", {
      viewerId: "p0",
      players: [player("p0", { hand: [] }), player("p1", { name: "Bob" }), player("p2")],
      currentSeat: 1,
      turnNumber: 2,
      phase: "play",
      drawPile: { count: 70 },
      discardPile: [],
      eventStack: [],
      pendingDecision: { id: "dec_shan_decline", kind: "respondShan", playerId: "p0", data: { sourceId: "p1" } },
      finished: false,
      log: [],
    });

    const declineBtn = await screen.findByRole("button", { name: "ยอมโดน" });
    await user.click(declineBtn);

    await waitFor(() => expect(sentEvents.some((e) => e.event === "game:answer")).toBe(true));
    const call = sentEvents.find((e) => e.event === "game:answer")!;
    expect(call.payload).toEqual({ roomCode: "DODGE02", decisionId: "dec_shan_decline", pass: true });
  });

  it("double-tapping the หลบ card sends the answer only once (no duplicate → no freeze)", async () => {
    const user = await enterRoom("DODGE03");

    fakeSocket.fire("game:view", {
      viewerId: "p0",
      players: [
        player("p0", { hand: [{ id: "heart_1_1", typeKey: "shan", suit: "heart", rank: 1 }] }),
        player("p1", { name: "Bob" }),
        player("p2"),
      ],
      currentSeat: 1,
      turnNumber: 2,
      phase: "play",
      drawPile: { count: 70 },
      discardPile: [],
      eventStack: [],
      pendingDecision: { id: "dec_shan_dbl", kind: "respondShan", playerId: "p0", data: { sourceId: "p1" } },
      finished: false,
      log: [],
    });

    const dialog = within(await screen.findByRole("dialog"));
    const card = dialog.getByText("หลบ");
    // deliberately click twice — the store must drop the 2nd (ack for the 1st
    // is intentionally left unresolved here, so the guard is what's tested)
    await user.click(card);
    await user.click(card);

    const answers = sentEvents.filter((e) => e.event === "game:answer");
    expect(answers).toHaveLength(1);
    expect(answers[0]!.payload).toMatchObject({ decisionId: "dec_shan_dbl", cardIds: ["heart_1_1"] });
  });
});

describe("Table: role reveal", () => {
  it("shows the role-reveal dialog once a general is assigned, and closing it reveals the board", async () => {
    const user = await enterRoom("ROLE001");

    fakeSocket.fire("game:view", {
      viewerId: "p0",
      players: [
        player("p0", { role: "lord", roleRevealed: true, generalId: "caocao" }),
        player("p1", { name: "Bob" }),
        player("p2"),
      ],
      currentSeat: 0,
      turnNumber: 1,
      phase: "play",
      drawPile: { count: 80 },
      discardPile: [],
      eventStack: [],
      pendingDecision: { id: "dec_main_role", kind: "mainAction", playerId: "p0", data: {} },
      finished: false,
      log: [],
    });

    await waitFor(() => expect(screen.getByText("บทบาทของคุณ")).toBeInTheDocument());
    // role name shows in the reveal modal (and now also on the character card)
    expect(screen.getAllByText("เจ้าเมือง").length).toBeGreaterThan(0);

    await user.click(screen.getByRole("button", { name: /เริ่มศึก/ }));
    expect(screen.queryByText("บทบาทของคุณ")).not.toBeInTheDocument();
  });
});

describe("Table: character skills + use-skill", () => {
  it("shows the general's skills, and using an active skill sends choice:useSkill with the right skillId", async () => {
    const user = await enterRoom("SKILL01");

    // sunquan has an active skill (zhiheng / ถ่วงดุลอำนาจ)
    fakeSocket.fire("game:view", {
      viewerId: "p0",
      players: [
        player("p0", {
          generalId: "sunquan",
          faction: "wu",
          role: "lord",
          roleRevealed: true,
          hand: [{ id: "spade_5_1", typeKey: "sha", suit: "spade", rank: 5 }],
        }),
        player("p1", { name: "Bob" }),
        player("p2"),
      ],
      currentSeat: 0,
      turnNumber: 1,
      phase: "play",
      drawPile: { count: 80 },
      discardPile: [],
      eventStack: [],
      pendingDecision: { id: "dec_skill", kind: "mainAction", playerId: "p0", data: {} },
      finished: false,
      log: [],
    });

    // dismiss the role-reveal dialog first
    await user.click(await screen.findByRole("button", { name: /เริ่มศึก/ }));

    // both sunquan skills are narrated
    expect(screen.getByText("ถ่วงดุลอำนาจ")).toBeInTheDocument();
    expect(screen.getByText("ผนึกกำลัง")).toBeInTheDocument();

    // click the active skill's "ใช้สกิล" button
    await user.click(screen.getByRole("button", { name: /ใช้สกิล/ }));
    // pick a card to discard, then confirm
    await user.click(screen.getByText("สังหาร"));
    await user.click(await screen.findByRole("button", { name: "ยืนยัน" }));

    await waitFor(() => expect(sentEvents.some((e) => e.event === "game:answer")).toBe(true));
    const call = sentEvents.find((e) => e.event === "game:answer")!;
    const payload = call.payload as { choice: string; skillId: string; cardIds: string[] };
    expect(payload.choice).toBe("useSkill");
    expect(payload.skillId).toBe("sunquan_zhiheng");
    expect(payload.cardIds).toEqual(["spade_5_1"]);
  });

  it("a target-less skill (ถ่วงดุลอำนาจ) never lights up opponents; card-count gates confirm", async () => {
    const user = await enterRoom("NOTGT");
    fakeSocket.fire("game:view", {
      viewerId: "p0",
      players: [
        {
          ...player("p0", { generalId: "sunquan", faction: "wu", role: "lord", roleRevealed: true }),
          hand: [{ id: "spade_5_1", typeKey: "sha", suit: "spade", rank: 5 }],
        },
        player("p1", { name: "Bob" }),
        player("p2", { name: "Carol" }),
      ],
      currentSeat: 0,
      turnNumber: 1,
      phase: "play",
      drawPile: { count: 80 },
      discardPile: [],
      eventStack: [],
      pendingDecision: { id: "dec_notgt", kind: "mainAction", playerId: "p0", data: {} },
      finished: false,
      log: [],
    });
    await user.click(await screen.findByRole("button", { name: /เริ่มศึก/ }));

    await user.click(screen.getByRole("button", { name: /ใช้สกิล/ }));
    // no opponents become targetable (ถ่วงดุลอำนาจ takes no target)
    expect(screen.queryByText("เลือก")).not.toBeInTheDocument();
    // confirm disabled until a card is chosen (needs ≥1 card)
    const confirm = await screen.findByRole("button", { name: "ยืนยัน" });
    expect(confirm).toBeDisabled();
    await user.click(screen.getByText("สังหาร"));
    expect(confirm).toBeEnabled();
  });

  it("greys out an active skill once its per-turn use is spent", async () => {
    const me = {
      ...player("p0", { generalId: "sunquan", faction: "wu", role: "lord", roleRevealed: true }),
      hand: [{ id: "spade_5_1", typeKey: "sha", suit: "spade", rank: 5 }],
      skillUsedThisTurn: { sunquan_zhiheng: 1 }, // already used its 1/turn
    };
    const user = await enterRoom("SPENT");
    fakeSocket.fire("game:view", {
      viewerId: "p0",
      players: [me, player("p1", { name: "Bob" }), player("p2")],
      currentSeat: 0,
      turnNumber: 1,
      phase: "play",
      drawPile: { count: 80 },
      discardPile: [],
      eventStack: [],
      pendingDecision: { id: "dec_spent", kind: "mainAction", playerId: "p0", data: {} },
      finished: false,
      log: [],
    });
    await user.click(await screen.findByRole("button", { name: /เริ่มศึก/ }));

    const btn = screen.getByRole("button", { name: /ใช้ครบแล้วเทิร์นนี้/ });
    expect(btn).toBeDisabled();
    await user.click(btn); // clicking does nothing
    expect(sentEvents.some((e) => e.event === "game:answer")).toBe(false);
  });
});

// Fire an initial mainAction view for the given self-player, dismiss the
// one-time role-reveal dialog, and clear the recorded events — leaving a
// clean slate to fire the test-specific view.
async function enterGame(roomCode: string, self: ReturnType<typeof player>, rest: ReturnType<typeof player>[]) {
  const user = await enterRoom(roomCode);
  fakeSocket.fire("game:view", {
    viewerId: self.id,
    players: [self, ...rest],
    currentSeat: 0,
    turnNumber: 1,
    phase: "play",
    drawPile: { count: 80 },
    discardPile: [],
    eventStack: [],
    pendingDecision: { id: "dec_init", kind: "mainAction", playerId: self.id, data: {} },
    finished: false,
    log: [],
  });
  await user.click(await screen.findByRole("button", { name: /เริ่มศึก/ }));
  clearSent();
  return user;
}

function fireView(self: ReturnType<typeof player>, rest: ReturnType<typeof player>[], pendingDecision: unknown, overrides: Record<string, unknown> = {}) {
  fakeSocket.fire("game:view", {
    viewerId: self.id,
    players: [self, ...rest],
    currentSeat: 0,
    turnNumber: 2,
    phase: "play",
    drawPile: { count: 70 },
    discardPile: [],
    eventStack: [],
    pendingDecision,
    finished: false,
    log: [],
    ...overrides,
  });
}

describe("Table: stuck-state safety net", () => {
  it("shows a recovery panel when a view arrives with no pending decision and the game isn't finished", async () => {
    const me = player("p0", { generalId: "caocao", faction: "wei", role: "lord", roleRevealed: true });
    const rest = [player("p1", { name: "Bob" }), player("p2")];
    await enterGame("STUCK1", me, rest);

    // the broken state: no pendingDecision, finished false
    fireView(me, rest, undefined);

    expect(await screen.findByText(/เกมค้าง/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "ออกจากห้อง" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "รีเฟรช" })).toBeInTheDocument();
  });
});

describe("Table: P6 features (wugu faces / judgment reveal / discard browser)", () => {
  it("wugu pick renders the revealed cards with their real names", async () => {
    const me = player("p0", { generalId: "caocao", faction: "wei", role: "lord", roleRevealed: true });
    const rest = [player("p1"), player("p2")];
    await enterGame("WUGU1", me, rest);

    fireView(me, rest, {
      id: "dec_w",
      kind: "wuguPick",
      playerId: "p0",
      data: {
        options: [
          { id: "c1", typeKey: "sha", suit: "spade", rank: 7 },
          { id: "c2", typeKey: "tao", suit: "heart", rank: 3 },
        ],
      },
    });

    expect(await screen.findByText("สังหาร")).toBeInTheDocument();
    expect(screen.getByText("ท้อ")).toBeInTheDocument();
  });

  it("judgmentReveal is answered by tapping the draw pile (no modal)", async () => {
    const me = player("p0", { generalId: "caocao", faction: "wei", role: "lord", roleRevealed: true });
    const rest = [player("p1"), player("p2")];
    const user = await enterGame("JUDGE1", me, rest);

    fireView(me, rest, { id: "dec_j", kind: "judgmentReveal", playerId: "p0", data: { reason: "lebusishu" } });

    // no dialog — the pile itself becomes the clickable "flip" affordance
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    const pile = await screen.findByRole("button", { name: "เปิดการ์ดตัดสิน" });
    await user.click(pile);
    expect(
      sentEvents.some((e) => e.event === "game:answer" && (e.payload as { choice?: string }).choice === "reveal"),
    ).toBe(true);
  });

  it("playing สายฟ้า (shandian) needs no target picker — placed on self", async () => {
    const me = player("p0", { generalId: "caocao", faction: "wei", role: "lord", roleRevealed: true, hand: [{ id: "sd1", typeKey: "shandian", suit: "spade", rank: 9 }] });
    const rest = [player("p1", { name: "Bob" }), player("p2")];
    const user = await enterGame("SHANDIAN1", me, rest);

    fireView(me, rest, { id: "dec_m", kind: "mainAction", playerId: "p0", data: {} }, { currentSeat: 0 });

    await user.click(screen.getByText("สายฟ้า"));
    // no target step — it plays immediately with no targetIds
    await waitFor(() => expect(sentEvents.some((e) => e.event === "game:answer")).toBe(true));
    const payload = sentEvents.find((e) => e.event === "game:answer")!.payload as { choice: string; cardIds: string[]; targetIds: string[] };
    expect(payload.choice).toBe("playCard");
    expect(payload.cardIds).toEqual(["sd1"]);
    expect(payload.targetIds).toEqual([]);
  });

  it("tuxiTargets lets you pick up to 2 players and sends their ids", async () => {
    const me = player("p0", { generalId: "zhangliao", faction: "wei", role: "lord", roleRevealed: true });
    const rest = [player("p1", { name: "Bob" }), player("p2", { name: "Cid" })];
    const user = await enterGame("TUXI1", me, rest);

    fireView(me, rest, {
      id: "dec_tuxi",
      kind: "tuxiTargets",
      playerId: "p0",
      data: { eligible: [{ id: "p1", count: 3 }, { id: "p2", count: 2 }] },
    });

    // choose Bob, then confirm
    await user.click(await screen.findByRole("button", { name: /Bob/ }));
    await user.click(await screen.findByRole("button", { name: /ยืนยัน/ }));

    await waitFor(() => expect(sentEvents.some((e) => e.event === "game:answer")).toBe(true));
    const payload = sentEvents.find((e) => e.event === "game:answer")!.payload as { targetIds: string[] };
    expect(payload.targetIds).toEqual(["p1"]);
  });

  it("respondTao auto-passes when you hold nothing that counts as ท้อ", async () => {
    const me = player("p0", { generalId: "caocao", faction: "wei", role: "lord", roleRevealed: true, hand: [{ id: "x1", typeKey: "sha", suit: "spade", rank: 5 }] });
    const rest = [player("p1", { name: "Bob" }), player("p2")];
    await enterGame("TAOPASS", me, rest);

    fireView(me, rest, { id: "dec_rt", kind: "respondTao", playerId: "p0", data: { dyingId: "p1", hp: 0 } }, { currentSeat: 1 });

    await waitFor(() =>
      expect(sentEvents.some((e) => e.event === "game:answer" && (e.payload as { pass?: boolean }).pass === true)).toBe(true),
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument(); // no prompt shown
  });

  it("clicking the discard pile opens a browser of the discarded cards", async () => {
    const me = player("p0", { generalId: "caocao", faction: "wei", role: "lord", roleRevealed: true });
    const rest = [player("p1"), player("p2")];
    const user = await enterGame("DISC1", me, rest);

    fireView(me, rest, { id: "dec_m", kind: "mainAction", playerId: "p0", data: {} }, {
      discardPile: [
        { id: "d1", typeKey: "sha", suit: "spade", rank: 7 },
        { id: "d2", typeKey: "juedou", suit: "club", rank: 2 },
      ],
    });

    await user.click(await screen.findByTitle("ดูกองทิ้งทั้งหมด"));
    expect(await screen.findByText(/ใหม่สุดอยู่บนซ้าย/)).toBeInTheDocument();
  });
});

describe("Table: card conversion + distance", () => {
  it("Guan Yu can answer a respondSha (duel) with a red card that isn't literally สังหาร", async () => {
    const me = player("p0", { generalId: "guanyu", faction: "shu", hand: [{ id: "heart_5_1", typeKey: "guohe", suit: "heart", rank: 5 }] });
    const rest = [player("p1", { name: "Bob" }), player("p2")];
    const user = await enterGame("WUSHENG1", me, rest);

    fireView(me, rest, { id: "dec_rs", kind: "respondSha", playerId: "p0", data: { opponentId: "p1", reason: "juedou" } }, { currentSeat: 1 });

    const dialog = within(await screen.findByRole("dialog"));
    await user.click(dialog.getByText("ข้ามสะพานรื้อ")); // the red guohe, offered via wusheng
    await waitFor(() => expect(sentEvents.some((e) => e.event === "game:answer")).toBe(true));
    const payload = sentEvents.find((e) => e.event === "game:answer")!.payload as { cardIds: string[] };
    expect(payload.cardIds).toEqual(["heart_5_1"]);
  });

  it("Guan Yu plays a red หลบ as a main-action สังหาร (sends asType:sha)", async () => {
    const me = player("p0", { generalId: "guanyu", faction: "shu", role: "lord", roleRevealed: true, hand: [{ id: "heart_1_2", typeKey: "shan", suit: "heart", rank: 1 }] });
    const rest = [player("p1", { name: "Bob" }), player("p2")];
    const user = await enterGame("WUSHENG2", me, rest);

    fireView(me, rest, { id: "dec_m", kind: "mainAction", playerId: "p0", data: {} }, { currentSeat: 0 });

    await user.click(screen.getByText("หลบ")); // not dimmed — playable as สังหาร
    await waitFor(() => expect(screen.getAllByText("เลือก").length).toBeGreaterThan(0));
    await user.click(screen.getAllByText("เลือก")[0]!);
    await user.click(await screen.findByRole("button", { name: "ยืนยัน" }));

    await waitFor(() => expect(sentEvents.some((e) => e.event === "game:answer")).toBe(true));
    const payload = sentEvents.find((e) => e.event === "game:answer")!.payload as { cardIds: string[]; targetIds: string[]; asType?: string };
    expect(payload.cardIds).toEqual(["heart_1_2"]);
    expect(payload.asType).toBe("sha");
    expect(payload.targetIds).toEqual(["p1"]);
  });

  it("tapping a card playable multiple ways opens a play-as chooser", async () => {
    const me = player("p0", { generalId: "guanyu", faction: "shu", role: "lord", roleRevealed: true, hp: 3, maxHp: 4, hand: [{ id: "heart_3_1", typeKey: "tao", suit: "heart", rank: 3 }] });
    const rest = [player("p1", { name: "Bob" }), player("p2")];
    const user = await enterGame("WUSHENG3", me, rest);

    fireView(me, rest, { id: "dec_m", kind: "mainAction", playerId: "p0", data: {} }, { currentSeat: 0 });

    await user.click(screen.getByText("ท้อ")); // red ท้อ → heal OR attack
    expect(await screen.findByText(/เล่น .*เป็น/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /สังหาร/ })).toBeInTheDocument();
  });

  it("jiedao picks targets one at a time: armed player first, then someone they can reach", async () => {
    const me = player("p0", { generalId: "caocao", role: "lord", roleRevealed: true, hand: [{ id: "jd1", typeKey: "jiedao", suit: "spade", rank: 5 }] });
    const rest = [
      player("p1", { name: "Bob", equipment: { weapon: { id: "w1", typeKey: "crossbow", suit: "club", rank: 1 } } }),
      player("p2", { name: "Cid" }), // unarmed
    ];
    const user = await enterGame("JIEDAO1", me, rest);

    fireView(me, rest, { id: "dec_m", kind: "mainAction", playerId: "p0", data: {} }, { currentSeat: 0 });

    await user.click(screen.getByText("ยืมดาบฆ่าคน"));
    // step 1: only the armed player (Bob) is selectable
    await waitFor(() => expect(screen.getAllByText("เลือก").length).toBe(1));
    await user.click(screen.getAllByText("เลือก")[0]!);
    // step 2: the reachable victim (Cid) is now selectable
    await waitFor(() => expect(screen.getAllByText("เลือก").length).toBe(1));
    await user.click(screen.getAllByText("เลือก")[0]!);
    await user.click(await screen.findByRole("button", { name: "ยืนยัน" }));

    const payload = sentEvents.find((e) => e.event === "game:answer")!.payload as { targetIds: string[] };
    expect(payload.targetIds).toEqual(["p1", "p2"]);
  });

  it("renders the game history log on the right", async () => {
    const me = player("p0", { generalId: "caocao", role: "lord", roleRevealed: true });
    const rest = [player("p1", { name: "Bob" }), player("p2")];
    await enterGame("LOG1", me, rest);

    fireView(me, rest, { id: "dec_m", kind: "mainAction", playerId: "p0", data: {} }, {
      log: [
        { id: "log_0", turn: 1, eventType: "roleReveal", actorId: "p0", visibility: "public", data: { role: "lord" } },
        { id: "log_1", turn: 1, eventType: "draw", actorId: "p0", amount: 2, visibility: "public" },
      ],
    });

    expect(await screen.findByText("ประวัติการเล่น")).toBeInTheDocument();
    // the structured entries are resolved to Thai by logResolver
    expect(screen.getByText(/จั่ว 2 ใบ/)).toBeInTheDocument();
  });

  it("lijian: discard first, then only male opponents light up, sent in tap order", async () => {
    const me = player("p0", { generalId: "diaochan", faction: "qun", role: "lord", roleRevealed: true, gender: "female", hand: [{ id: "d1", typeKey: "shan", suit: "heart", rank: 1 }] });
    const rest = [
      player("p1", { name: "Male1", gender: "male" }),
      player("p2", { name: "Male2", gender: "male" }),
      player("p3", { name: "Fem", gender: "female" }),
    ];
    const user = await enterGame("LIJIAN1", me, rest);
    fireView(me, rest, { id: "dec_m", kind: "mainAction", playerId: "p0", data: {} }, { currentSeat: 0 });

    await user.click(await screen.findByRole("button", { name: /ใช้สกิล/ }));
    // card-first: no targets until the discard card is chosen
    expect(screen.queryAllByText(/^เลือก$/).length).toBe(0);
    await user.click(screen.getByText("หลบ"));
    // only the 2 males become targetable (female excluded)
    await waitFor(() => expect(screen.getAllByText("เลือก").length).toBe(2));

    await user.click(screen.getAllByText("เลือก")[0]!); // Male1
    await user.click(screen.getAllByText("เลือก")[0]!); // now Male2 (Male1 shows เลือกแล้ว)
    await user.click(await screen.findByRole("button", { name: "ยืนยัน" }));

    const payload = sentEvents.find((e) => e.event === "game:answer")!.payload as { choice: string; skillId: string; cardIds: string[]; targetIds: string[] };
    expect(payload.choice).toBe("useSkill");
    expect(payload.skillId).toBe("diaochan_lijian");
    expect(payload.cardIds).toEqual(["d1"]);
    expect(payload.targetIds).toEqual(["p1", "p2"]);
  });

  it("zhangba button plays 2 cards as a สังหาร", async () => {
    const me = player("p0", {
      generalId: "caocao", faction: "wei", role: "lord", roleRevealed: true,
      equipment: { weapon: { id: "z1", typeKey: "zhangba", suit: "spade", rank: 12 } },
      hand: [{ id: "c1", typeKey: "tao", suit: "heart", rank: 3 }, { id: "c2", typeKey: "shan", suit: "heart", rank: 2 }],
    });
    const rest = [player("p1", { name: "Bob" }), player("p2")];
    const user = await enterGame("ZHANGBA1", me, rest);
    fireView(me, rest, { id: "dec_m", kind: "mainAction", playerId: "p0", data: {} }, { currentSeat: 0 });

    await user.click(await screen.findByRole("button", { name: /ใช้ทวน/ }));
    await user.click(screen.getByText("ท้อ"));
    await user.click(screen.getByText("หลบ")); // 2 cards
    await waitFor(() => expect(screen.getAllByText("เลือก").length).toBeGreaterThan(0));
    await user.click(screen.getAllByText("เลือก")[0]!);
    await user.click(await screen.findByRole("button", { name: "ยืนยัน" }));

    const payload = sentEvents.find((e) => e.event === "game:answer")!.payload as { choice: string; cardIds: string[]; targetIds: string[] };
    expect(payload.choice).toBe("playCard");
    expect(payload.cardIds.sort()).toEqual(["c1", "c2"]);
    expect(payload.targetIds).toEqual(["p1"]);
  });

  it("the ดูกฎ button opens the rules modal", async () => {
    const me = player("p0", { generalId: "caocao", role: "lord", roleRevealed: true });
    const rest = [player("p1", { name: "Bob" }), player("p2")];
    const user = await enterGame("RULES1", me, rest);

    await user.click(screen.getByRole("button", { name: /วิธีเล่น & กติกา/ }));
    expect(await screen.findByText("บทบาท & เงื่อนไขชนะ")).toBeInTheDocument();
    expect(screen.getByText("เข้าใจแล้ว")).toBeInTheDocument();
  });

  it("opponent tiles show the attack-distance badge", async () => {
    const me = player("p0", { generalId: "caocao", role: "lord", roleRevealed: true });
    const rest = [player("p1", { name: "Bob" }), player("p2")];
    await enterGame("DIST1", me, rest);
    expect((await screen.findAllByText(/⟷/)).length).toBeGreaterThan(0);
  });
});

describe("Table: skill routing", () => {
  it("an AUTO skill (jianxiong) auto-accepts with no modal and flashes a toast", async () => {
    const me = player("p0", { generalId: "caocao", faction: "wei", role: "lord", roleRevealed: true });
    await enterGame("AUTO01", me, [player("p1", { name: "Bob" }), player("p2")]);

    fireView(me, [player("p1", { name: "Bob" }), player("p2")], {
      id: "dec_ax",
      kind: "activateSkill",
      playerId: "p0",
      data: { skillId: "caocao_jianxiong", point: "OnDamaged" },
    });

    // client answers on its own (accept = no pass, no choice)
    await waitFor(() => expect(sentEvents.some((e) => e.event === "game:answer")).toBe(true));
    const call = sentEvents.find((e) => e.event === "game:answer")!;
    const payload = call.payload as { decisionId: string; pass?: boolean; choice?: string };
    expect(payload.decisionId).toBe("dec_ax");
    expect(payload.pass).toBeUndefined();
    expect(payload.choice).toBeUndefined();
    // toast names the skill (a 2nd instance beyond the character-card list); no modal
    await waitFor(() => expect(screen.getAllByText("วีรบุรุษเจ้าเล่ห์").length).toBe(2));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("a lord's hujia auto-passes when no same-faction teammate is alive", async () => {
    const me = player("p0", { generalId: "caocao", faction: "wei", role: "lord", roleRevealed: true });
    const rest = [player("p1", { name: "Bob", faction: "qun" }), player("p2", { faction: "shu" })];
    await enterGame("HUJIA01", me, rest);

    fireView(me, rest, { id: "dec_hj", kind: "activateSkill", playerId: "p0", data: { skillId: "caocao_hujia", point: "OnNeedDodge" } });

    await waitFor(() => expect(sentEvents.some((e) => e.event === "game:answer")).toBe(true));
    const call = sentEvents.find((e) => e.event === "game:answer")!;
    expect((call.payload as { pass?: boolean }).pass).toBe(true);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("a lord's hujia shows a dialog (with the skill name) when a teammate is alive", async () => {
    const me = player("p0", { generalId: "caocao", faction: "wei", role: "lord", roleRevealed: true });
    const rest = [player("p1", { name: "Wei friend", faction: "wei" }), player("p2", { faction: "shu" })];
    await enterGame("HUJIA02", me, rest);

    fireView(me, rest, { id: "dec_hj2", kind: "activateSkill", playerId: "p0", data: { skillId: "caocao_hujia", point: "OnNeedDodge" } });

    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText(/คุ้มกันราชา/)).toBeInTheDocument();
    // did NOT auto-answer
    expect(sentEvents.some((e) => e.event === "game:answer")).toBe(false);
  });

  it("an inline trade-off skill (tuoyi) renders accept/decline in the character card, not a modal", async () => {
    const me = player("p0", { generalId: "caoren", faction: "wei", role: "lord", roleRevealed: true });
    const rest = [player("p1", { name: "Bob" }), player("p2")];
    const user = await enterGame("INLINE01", me, rest);

    fireView(me, rest, { id: "dec_tuoyi", kind: "activateSkill", playerId: "p0", data: { skillId: "caoren_tuoyi", point: "DrawPhaseStart" } }, { phase: "draw" });

    // inline buttons appear; no modal; no auto-answer
    const useBtn = await screen.findByRole("button", { name: "ใช้เลย" });
    expect(screen.getByRole("button", { name: "ไม่ใช้" })).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(sentEvents.some((e) => e.event === "game:answer")).toBe(false);

    await user.click(useBtn);
    await waitFor(() => expect(sentEvents.some((e) => e.event === "game:answer")).toBe(true));
    const payload = sentEvents.find((e) => e.event === "game:answer")!.payload as { decisionId: string; pass?: boolean };
    expect(payload.decisionId).toBe("dec_tuoyi");
    expect(payload.pass).toBeUndefined();
  });
});

describe("Table: response-only cards can't be played on your turn", () => {
  it("tapping a หลบ during mainAction does nothing (no answer sent)", async () => {
    const me = player("p0", {
      generalId: "caocao",
      faction: "wei",
      role: "lord",
      roleRevealed: true,
      hand: [
        { id: "heart_1_1", typeKey: "shan", suit: "heart", rank: 1 },
        { id: "spade_7_1", typeKey: "sha", suit: "spade", rank: 7 },
      ],
    });
    const rest = [player("p1", { name: "Bob" }), player("p2", { name: "Carol" })];
    const user = await enterGame("RESPONLY", me, rest);

    fireView(me, rest, { id: "dec_ro", kind: "mainAction", playerId: "p0", data: {} });

    // the หลบ card is visible but un-tappable — clicking it sends nothing
    await user.click(await screen.findByText("หลบ"));
    expect(sentEvents.some((e) => e.event === "game:answer")).toBe(false);
    expect(screen.queryByRole("button", { name: "ยืนยัน" })).not.toBeInTheDocument();

    // สังหาร still works normally
    await user.click(screen.getByText("สังหาร"));
    expect(await screen.findByRole("button", { name: "ยืนยัน" })).toBeInTheDocument();
  });
});

describe("Table: smart card play", () => {
  it("tapping equipment into an empty slot plays immediately (no target, no confirm)", async () => {
    const me = player("p0", {
      generalId: "caocao",
      faction: "wei",
      role: "lord",
      roleRevealed: true,
      hand: [{ id: "heart_5_1", typeKey: "horse_chitu", suit: "heart", rank: 5 }],
    });
    const rest = [player("p1", { name: "Bob" }), player("p2")];
    const user = await enterGame("EQUIP01", me, rest);

    fireView(me, rest, { id: "dec_eq", kind: "mainAction", playerId: "p0", data: {} });

    await user.click(await screen.findByText("ม้าเซ็กเทา"));

    await waitFor(() => expect(sentEvents.some((e) => e.event === "game:answer")).toBe(true));
    const payload = sentEvents.find((e) => e.event === "game:answer")!.payload as { choice: string; cardIds: string[]; targetIds: string[] };
    expect(payload.choice).toBe("playCard");
    expect(payload.cardIds).toEqual(["heart_5_1"]);
    expect(payload.targetIds).toEqual([]);
    // no confirm bar was needed
    expect(screen.queryByRole("button", { name: "ยืนยัน" })).not.toBeInTheDocument();
  });

  it("tapping equipment that would replace an occupied slot raises a confirm bar instead of playing", async () => {
    const me = player("p0", {
      generalId: "caocao",
      faction: "wei",
      role: "lord",
      roleRevealed: true,
      hand: [{ id: "heart_6_1", typeKey: "horse_dilu", suit: "heart", rank: 6 }],
      equipment: { horseMinus: { id: "spade_1_1", typeKey: "horse_chitu", suit: "spade", rank: 1 } },
    });
    const rest = [player("p1", { name: "Bob" }), player("p2")];
    const user = await enterGame("EQUIP02", me, rest);

    fireView(me, rest, { id: "dec_eq2", kind: "mainAction", playerId: "p0", data: {} });

    await user.click(await screen.findByText("ม้าเตกเลา"));

    // confirm bar appears; nothing auto-played; opponents NOT targetable
    expect(await screen.findByRole("button", { name: "ยืนยัน" })).toBeInTheDocument();
    expect(screen.queryByText("เลือก")).not.toBeInTheDocument();
    expect(sentEvents.some((e) => e.event === "game:answer")).toBe(false);
  });
});

describe("Table: askWuxie auto-pass", () => {
  it("auto-passes an askWuxie prompt when the player holds no ไร้ช่องโหว่", async () => {
    const me = player("p0", { generalId: "zhaoyun", faction: "shu", hand: [{ id: "spade_3_1", typeKey: "sha", suit: "spade", rank: 3 }] });
    const rest = [player("p1", { name: "Bob" }), player("p2")];
    await enterGame("WUXIE01", me, rest);

    fireView(me, rest, { id: "dec_wx", kind: "askWuxie", playerId: "p0", data: { targetEventId: "e1", cancelledType: "guohe" } });

    await waitFor(() => expect(sentEvents.some((e) => e.event === "game:answer")).toBe(true));
    expect((sentEvents.find((e) => e.event === "game:answer")!.payload as { pass?: boolean }).pass).toBe(true);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("still shows the askWuxie dialog when the player holds a ไร้ช่องโหว่", async () => {
    const me = player("p0", { generalId: "zhaoyun", faction: "shu", hand: [{ id: "spade_9_1", typeKey: "wuxie", suit: "spade", rank: 9 }] });
    const rest = [player("p1", { name: "Bob" }), player("p2")];
    await enterGame("WUXIE02", me, rest);

    fireView(me, rest, { id: "dec_wx2", kind: "askWuxie", playerId: "p0", data: { targetEventId: "e1", cancelledType: "guohe" } });

    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    expect(sentEvents.some((e) => e.event === "game:answer")).toBe(false);
  });
});

describe("Table: สังหาร usage limit (the second-สังหาร freeze)", () => {
  it("tapping a 2nd สังหาร when the once-a-turn limit is spent shows a notice and sends nothing", async () => {
    const me = player("p0", {
      generalId: "caocao",
      faction: "wei",
      role: "lord",
      roleRevealed: true,
      shaUsedThisTurn: 1, // already attacked this turn, no crossbow
      hand: [{ id: "spade_2_2", typeKey: "sha", suit: "spade", rank: 2 }],
    });
    const rest = [player("p1", { name: "Bob" }), player("p2", { name: "Carol" })];
    const user = await enterGame("SHALIM", me, rest);

    fireView(me, rest, { id: "dec_shalim", kind: "mainAction", playerId: "p0", data: {} });

    await user.click(await screen.findByText("สังหาร"));

    // a notice appears, no confirm bar, and NOTHING is sent to the server
    expect(await screen.findByText(/ได้ครั้งเดียวต่อเทิร์น/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "ยืนยัน" })).not.toBeInTheDocument();
    expect(sentEvents.some((e) => e.event === "game:answer")).toBe(false);
  });

  it("allows a 2nd สังหาร when a crossbow is equipped", async () => {
    const me = player("p0", {
      generalId: "caocao",
      faction: "wei",
      role: "lord",
      roleRevealed: true,
      shaUsedThisTurn: 1,
      equipment: { weapon: { id: "spade_1_1", typeKey: "crossbow", suit: "spade", rank: 1 } },
      hand: [{ id: "spade_2_2", typeKey: "sha", suit: "spade", rank: 2 }],
    });
    const rest = [player("p1", { name: "Bob" }), player("p2", { name: "Carol" })];
    const user = await enterGame("SHACB", me, rest);

    fireView(me, rest, { id: "dec_shacb", kind: "mainAction", playerId: "p0", data: {} });

    await user.click(await screen.findByText("สังหาร"));
    // no block — the confirm flow starts (targets light up)
    expect(screen.queryByText(/ได้ครั้งเดียวต่อเทิร์น/)).not.toBeInTheDocument();
    await waitFor(() => expect(screen.getAllByText("เลือก").length).toBe(2));
  });
});

describe("Table: single-target cap (the reported freeze)", () => {
  it("tapping a 2nd opponent for a single-target สังหาร replaces the 1st, and confirm sends exactly one target", async () => {
    const me = player("p0", {
      generalId: "caocao",
      faction: "wei",
      role: "lord",
      roleRevealed: true,
      hand: [{ id: "spade_7_1", typeKey: "sha", suit: "spade", rank: 7 }],
    });
    const rest = [player("p1", { name: "Bob" }), player("p2", { name: "Carol" })];
    const user = await enterGame("CAP001", me, rest);

    fireView(me, rest, { id: "dec_cap", kind: "mainAction", playerId: "p0", data: {} });

    await user.click(await screen.findByText("สังหาร"));
    // both opponents become targetable
    await waitFor(() => expect(screen.getAllByText("เลือก").length).toBe(2));

    // tap first opponent → exactly one selected
    await user.click(screen.getAllByText("เลือก")[0]!);
    expect(screen.getAllByText("เลือกแล้ว")).toHaveLength(1);

    // tap the other → still exactly one selected (the first was replaced, not stacked)
    await user.click(screen.getByText("เลือก"));
    expect(screen.getAllByText("เลือกแล้ว")).toHaveLength(1);

    await user.click(screen.getByRole("button", { name: "ยืนยัน" }));
    await waitFor(() => expect(sentEvents.some((e) => e.event === "game:answer")).toBe(true));
    const payload = sentEvents.find((e) => e.event === "game:answer")!.payload as { cardIds: string[]; targetIds: string[] };
    expect(payload.cardIds).toEqual(["spade_7_1"]);
    expect(payload.targetIds).toHaveLength(1); // never 2 — the freeze is impossible now
  });

  it("confirm stays disabled for a single-target สังหาร until exactly one target is chosen", async () => {
    const me = player("p0", {
      generalId: "caocao",
      faction: "wei",
      role: "lord",
      roleRevealed: true,
      hand: [{ id: "spade_8_1", typeKey: "sha", suit: "spade", rank: 8 }],
    });
    const rest = [player("p1", { name: "Bob" }), player("p2", { name: "Carol" })];
    const user = await enterGame("CAP002", me, rest);

    fireView(me, rest, { id: "dec_cap2", kind: "mainAction", playerId: "p0", data: {} });

    await user.click(await screen.findByText("สังหาร"));
    // confirm bar shows but is disabled with no target picked
    const confirm = await screen.findByRole("button", { name: "ยืนยัน" });
    expect(confirm).toBeDisabled();

    await user.click(screen.getAllByText("เลือก")[0]!);
    expect(confirm).toBeEnabled();
  });
});

describe("Table: Lu Bu needed-count", () => {
  it("respondShan with needed=2 tells the target to play both หลบ at once", async () => {
    const me = player("p0", { generalId: "zhaoyun", faction: "shu", hand: [{ id: "heart_2_1", typeKey: "shan", suit: "heart", rank: 2 }] });
    const rest = [player("p1", { name: "Lu Bu", generalId: "lubu", faction: "qun" }), player("p2")];
    await enterGame("LUBU01", me, rest);

    fireView(me, rest, { id: "dec_shan2", kind: "respondShan", playerId: "p0", data: { sourceId: "p1", needed: 2 } });

    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText(/2 ใบถึงจะรอด/)).toBeInTheDocument();
    expect(within(dialog).getByText(/เลือก 2 ใบพร้อมกัน/)).toBeInTheDocument();
  });
});
