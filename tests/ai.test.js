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

test("4목 원판은 선택한 세로줄의 가장 아래부터 쌓인다", () => {
  const board = Array.from({ length: 6 }, () => Array(7).fill(0));
  assert.equal(AI.dropConnect4Disc(board, 3, 1), 5);
  assert.equal(AI.dropConnect4Disc(board, 3, 2), 4);
  assert.equal(board[5][3], 1);
  assert.equal(board[4][3], 2);
});

test("4목의 가로 연결을 승리로 판정한다", () => {
  const board = Array.from({ length: 6 }, () => Array(7).fill(0));
  for (let col = 1; col <= 4; col += 1) board[5][col] = 1;
  const result = AI.checkConnect4Win(board, 5, 4, 1);
  assert.equal(result.won, true);
  assert.equal(result.cells.length, 4);
});

test("4목의 대각선 연결을 승리로 판정한다", () => {
  const board = Array.from({ length: 6 }, () => Array(7).fill(0));
  board[5][0] = 2;
  board[4][1] = 2;
  board[3][2] = 2;
  board[2][3] = 2;
  const result = AI.checkConnect4Win(board, 2, 3, 2);
  assert.equal(result.won, true);
  assert.equal(result.cells.length, 4);
});

test("4목 AI는 이길 수 있으면 즉시 네 번째 원판을 놓는다", () => {
  const board = Array.from({ length: 6 }, () => Array(7).fill(0));
  board[5][0] = 2;
  board[5][1] = 2;
  board[5][2] = 2;
  assert.equal(AI.chooseConnect4Move(board), 3);
});

test("4목 AI는 참가자의 즉시 승리를 반드시 막는다", () => {
  const board = Array.from({ length: 6 }, () => Array(7).fill(0));
  board[5][0] = 1;
  board[5][1] = 1;
  board[5][2] = 1;
  assert.equal(AI.chooseConnect4Move(board), 3);
});

test("4목 AI는 같은 판에서 합법적인 같은 수를 선택한다", () => {
  const board = Array.from({ length: 6 }, () => Array(7).fill(0));
  AI.dropConnect4Disc(board, 3, 1);
  AI.dropConnect4Disc(board, 2, 2);
  const first = AI.chooseConnect4Move(board, 2, 1, { maxDepth: 6 });
  const second = AI.chooseConnect4Move(board, 2, 1, { maxDepth: 6 });
  assert.ok(AI.getConnect4ValidColumns(board).includes(first));
  assert.equal(first, second);
});
