const test = require("node:test");
const assert = require("node:assert/strict");

require("../chess.js");

const Chess = globalThis.CodeInChess;

function findMove(state, from, to) {
  const move = Chess.getLegalMoves(state).find((candidate) => candidate.from === from && candidate.to === to);
  assert.ok(move, `합법 수 ${from}-${to}를 찾지 못했습니다.`);
  return move;
}

function play(state, from, to) {
  return Chess.makeMove(state, findMove(state, from, to));
}

test("체스 초기 배치에서 백의 합법 수는 20개다", () => {
  const state = Chess.createInitialState();
  assert.equal(Chess.getLegalMoves(state).length, 20);
});

test("폰의 두 칸 전진과 앙파상을 처리한다", () => {
  let state = Chess.createInitialState();
  state = play(state, 52, 36); // e2-e4
  state = play(state, 8, 16);  // a7-a6
  state = play(state, 36, 28); // e4-e5
  state = play(state, 11, 27); // d7-d5
  const enPassant = Chess.getLegalMoves(state).find((move) => move.from === 28 && move.to === 19);
  assert.ok(enPassant?.enPassant);
  state = Chess.makeMove(state, enPassant);
  assert.equal(state.board[19], "wP");
  assert.equal(state.board[27], null);
});

test("조건이 충족되면 양쪽 캐슬링을 허용한다", () => {
  const state = Chess.createInitialState();
  state.board = Array(64).fill(null);
  state.board[4] = "bK";
  state.board[60] = "wK";
  state.board[56] = "wR";
  state.board[63] = "wR";
  state.turn = "w";
  const kingMoves = Chess.getLegalMoves(state).filter((move) => move.from === 60);
  assert.ok(kingMoves.some((move) => move.to === 62 && move.castle === "K"));
  assert.ok(kingMoves.some((move) => move.to === 58 && move.castle === "Q"));
});

test("Fool's Mate를 체크메이트로 판정한다", () => {
  let state = Chess.createInitialState();
  state = play(state, 53, 45); // f2-f3
  state = play(state, 12, 28); // e7-e5
  state = play(state, 54, 38); // g2-g4
  state = play(state, 3, 39);  // Qd8-h4#
  const status = Chess.getGameStatus(state);
  assert.equal(status.over, true);
  assert.equal(status.winner, "b");
  assert.equal(status.reason, "checkmate");
});

test("마지막 행에 도착한 폰을 퀸으로 자동 승격한다", () => {
  const state = Chess.createInitialState();
  state.board = Array(64).fill(null);
  state.board[4] = "bK";
  state.board[60] = "wK";
  state.board[8] = "wP";
  state.turn = "w";
  const promotion = findMove(state, 8, 0);
  assert.equal(promotion.promotion, "Q");
  const next = Chess.makeMove(state, promotion);
  assert.equal(next.board[0], "wQ");
});

test("체스 AI는 항상 합법 수를 선택하고 같은 위치에서 같은 수를 둔다", () => {
  let state = Chess.createInitialState();
  state = play(state, 52, 36); // e2-e4
  const first = Chess.chooseChessMove(state, "b", { maxDepth: 2, timeLimitMs: 1_000 });
  const second = Chess.chooseChessMove(state, "b", { maxDepth: 2, timeLimitMs: 1_000 });
  const legal = Chess.getLegalMoves(state);
  assert.ok(legal.some((move) => move.from === first.from && move.to === first.to));
  assert.deepEqual(first, second);
});
