const test = require("node:test");
const assert = require("node:assert/strict");

require("../ai.js");

const AI = globalThis.CodeInAI;

test("틱택토 승리 줄을 판정한다", () => {
  const result = AI.getTicTacToeResult(["X", "X", "X", null, "O", null, "O", null, null]);
  assert.equal(result.winner, "X");
  assert.deepEqual(result.line, [0, 1, 2]);
});

test("틱택토 AI는 이길 수 있으면 즉시 승리한다", () => {
  const board = ["O", "O", null, "X", "X", null, null, null, null];
  assert.equal(AI.chooseTicTacToeMove(board), 2);
});

test("틱택토 AI는 참가자의 즉시 승리를 반드시 막는다", () => {
  const board = ["X", "X", null, "O", null, null, null, null, null];
  assert.equal(AI.chooseTicTacToeMove(board), 2);
});

test("오목의 가로 5목을 판정한다", () => {
  const board = Array.from({ length: 11 }, () => Array(11).fill(0));
  for (let col = 2; col <= 6; col += 1) board[4][col] = 1;
  const result = AI.checkOmokWin(board, 4, 6, 1);
  assert.equal(result.won, true);
  assert.equal(result.cells.length, 5);
});

test("오목 AI는 이길 수 있으면 즉시 5목을 완성한다", () => {
  const board = Array.from({ length: 11 }, () => Array(11).fill(0));
  for (let col = 3; col <= 6; col += 1) board[5][col] = 2;
  const [row, col] = AI.chooseOmokMove(board, 2, 1);
  board[row][col] = 2;
  assert.equal(AI.checkOmokWin(board, row, col, 2).won, true);
});

test("오목 AI는 참가자의 즉시 5목을 반드시 막는다", () => {
  const board = Array.from({ length: 11 }, () => Array(11).fill(0));
  for (let col = 3; col <= 6; col += 1) board[5][col] = 1;
  const [row, col] = AI.chooseOmokMove(board, 2, 1);
  assert.equal(row, 5);
  assert.ok(col === 2 || col === 7);
});

test("오목 AI는 열린 3목을 미리 차단한다", () => {
  const board = Array.from({ length: 11 }, () => Array(11).fill(0));
  board[5][4] = 1;
  board[5][5] = 1;
  board[5][6] = 1;
  const [row, col] = AI.chooseOmokMove(board, 2, 1);
  assert.equal(row, 5);
  assert.ok(col === 3 || col === 7);
});

test("오목 AI가 비어 있지 않은 칸을 선택하지 않는다", () => {
  const board = Array.from({ length: 11 }, () => Array(11).fill(0));
  board[5][5] = 1;
  board[5][6] = 2;
  const [row, col] = AI.chooseOmokMove(board, 2, 1);
  assert.equal(board[row][col], 0);
});

test("오목 AI는 같은 판에서 항상 같은 최선 수를 고른다", () => {
  const board = Array.from({ length: 11 }, () => Array(11).fill(0));
  board[5][5] = 1;
  board[5][6] = 2;
  assert.deepEqual(AI.chooseOmokMove(board), AI.chooseOmokMove(board));
});
