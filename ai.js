(function attachCodeInAI(global) {
  "use strict";

  const TTT_WINS = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8],
    [0, 3, 6], [1, 4, 7], [2, 5, 8],
    [0, 4, 8], [2, 4, 6],
  ];

  const DIRECTIONS = [
    [0, 1],
    [1, 0],
    [1, 1],
    [1, -1],
  ];

  const CONNECT4_ROWS = 6;
  const CONNECT4_COLS = 7;
  const CONNECT4_MOVE_ORDER = [3, 2, 4, 1, 5, 0, 6];

  function getTicTacToeResult(board) {
    for (const line of TTT_WINS) {
      const [a, b, c] = line;
      if (board[a] && board[a] === board[b] && board[a] === board[c]) {
        return { winner: board[a], line: [...line], draw: false };
      }
    }

    return {
      winner: null,
      line: [],
      draw: board.every(Boolean),
    };
  }

  function emptyTicTacToeCells(board) {
    return board
      .map((value, index) => (value ? -1 : index))
      .filter((index) => index !== -1);
  }

  function minimax(board, maximizing, depth) {
    const result = getTicTacToeResult(board);
    if (result.winner === "O") return 10 - depth;
    if (result.winner === "X") return depth - 10;
    if (result.draw) return 0;

    const moves = emptyTicTacToeCells(board);

    if (maximizing) {
      let best = -Infinity;
      for (const move of moves) {
        board[move] = "O";
        best = Math.max(best, minimax(board, false, depth + 1));
        board[move] = null;
      }
      return best;
    }

    let best = Infinity;
    for (const move of moves) {
      board[move] = "X";
      best = Math.min(best, minimax(board, true, depth + 1));
      board[move] = null;
    }
    return best;
  }

  function findImmediateTicTacToeMove(board, player) {
    for (const move of emptyTicTacToeCells(board)) {
      board[move] = player;
      const wins = getTicTacToeResult(board).winner === player;
      board[move] = null;
      if (wins) return move;
    }
    return null;
  }

  /**
   * 축제용 틱택토 AI.
   * 미니맥스로 모든 경우를 탐색하고 항상 최적 수를 선택한다.
   */
  function chooseTicTacToeMove(inputBoard) {
    const board = [...inputBoard];
    const moves = emptyTicTacToeCells(board);
    if (!moves.length) return null;

    const winningMove = findImmediateTicTacToeMove(board, "O");
    if (winningMove !== null) return winningMove;

    const blockingMove = findImmediateTicTacToeMove(board, "X");
    if (blockingMove !== null) return blockingMove;

    const ranked = moves
      .map((move) => {
        board[move] = "O";
        const score = minimax(board, false, 0);
        board[move] = null;
        const positionBonus = move === 4 ? 0.3 : [0, 2, 6, 8].includes(move) ? 0.12 : 0;
        return { move, score: score + positionBonus };
      })
      .sort((a, b) => b.score - a.score);

    return ranked[0].move;
  }

  function isInside(board, row, col) {
    return row >= 0 && col >= 0 && row < board.length && col < board.length;
  }

  function getLineInfo(board, row, col, dr, dc, player) {
    let count = 1;
    let openEnds = 0;
    const cells = [[row, col]];

    for (const sign of [-1, 1]) {
      let r = row + dr * sign;
      let c = col + dc * sign;
      while (isInside(board, r, c) && board[r][c] === player) {
        count += 1;
        cells.push([r, c]);
        r += dr * sign;
        c += dc * sign;
      }
      if (isInside(board, r, c) && board[r][c] === 0) openEnds += 1;
    }

    return { count, openEnds, cells };
  }

  function shapeScore(count, openEnds) {
    if (count >= 5) return 100_000_000;
    if (count === 4 && openEnds === 2) return 2_000_000;
    if (count === 4 && openEnds === 1) return 360_000;
    if (count === 3 && openEnds === 2) return 85_000;
    if (count === 3 && openEnds === 1) return 10_000;
    if (count === 2 && openEnds === 2) return 3_000;
    if (count === 2 && openEnds === 1) return 500;
    if (count === 1 && openEnds === 2) return 110;
    return 12;
  }

  function checkOmokWin(board, row, col, player) {
    if (!isInside(board, row, col) || board[row][col] !== player) {
      return { won: false, cells: [] };
    }

    for (const [dr, dc] of DIRECTIONS) {
      const info = getLineInfo(board, row, col, dr, dc, player);
      if (info.count >= 5) {
        const ordered = [...info.cells].sort((a, b) => {
          if (dr === 0) return a[1] - b[1];
          if (dc === 0) return a[0] - b[0];
          return a[0] - b[0];
        });
        return { won: true, cells: ordered };
      }
    }

    return { won: false, cells: [] };
  }

  function candidateOmokMoves(board) {
    const size = board.length;
    const found = new Set();
    let stoneCount = 0;

    for (let row = 0; row < size; row += 1) {
      for (let col = 0; col < size; col += 1) {
        if (!board[row][col]) continue;
        stoneCount += 1;
        for (let dr = -2; dr <= 2; dr += 1) {
          for (let dc = -2; dc <= 2; dc += 1) {
            const r = row + dr;
            const c = col + dc;
            if (isInside(board, r, c) && board[r][c] === 0) {
              found.add(`${r},${c}`);
            }
          }
        }
      }
    }

    if (!stoneCount) {
      const center = Math.floor(size / 2);
      return [[center, center]];
    }

    return [...found].map((key) => key.split(",").map(Number));
  }

  function immediateOmokMoves(board, player, candidates) {
    const wins = [];
    for (const [row, col] of candidates) {
      board[row][col] = player;
      const won = checkOmokWin(board, row, col, player).won;
      board[row][col] = 0;
      if (won) wins.push([row, col]);
    }
    return wins;
  }

  function scoreOmokCell(board, row, col, ai, human) {
    const center = (board.length - 1) / 2;
    const centerDistance = Math.abs(row - center) + Math.abs(col - center);
    let neighbors = 0;
    const attack = getPatternProfile(board, row, col, ai);
    const defense = getPatternProfile(board, row, col, human);

    for (let dr = -1; dr <= 1; dr += 1) {
      for (let dc = -1; dc <= 1; dc += 1) {
        if (dr === 0 && dc === 0) continue;
        const r = row + dr;
        const c = col + dc;
        if (isInside(board, r, c) && board[r][c]) neighbors += 1;
      }
    }

    return (
      attack.score
      + getCompoundPatternBonus(attack)
      + defense.score * 1.28
      + getCompoundPatternBonus(defense) * 1.35
      + neighbors * 110
      - centerDistance * 13
    );
  }

  function getPatternProfile(board, row, col, player) {
    const profile = {
      score: 0,
      openFours: 0,
      closedFours: 0,
      openThrees: 0,
      closedThrees: 0,
      openTwos: 0,
    };

    for (const [dr, dc] of DIRECTIONS) {
      const line = getLineInfo(board, row, col, dr, dc, player);
      profile.score += shapeScore(line.count, line.openEnds);
      if (line.count === 4 && line.openEnds === 2) profile.openFours += 1;
      else if (line.count === 4 && line.openEnds === 1) profile.closedFours += 1;
      else if (line.count === 3 && line.openEnds === 2) profile.openThrees += 1;
      else if (line.count === 3 && line.openEnds === 1) profile.closedThrees += 1;
      else if (line.count === 2 && line.openEnds === 2) profile.openTwos += 1;
    }

    return profile;
  }

  function getCompoundPatternBonus(profile) {
    let bonus = 0;
    if (profile.openFours >= 1) bonus += 4_000_000;
    if (profile.closedFours >= 2) bonus += 2_400_000;
    if (profile.openThrees >= 1 && profile.closedFours >= 1) bonus += 1_800_000;
    if (profile.openThrees >= 2) bonus += 900_000;
    if (profile.openThrees >= 1 && profile.openTwos >= 1) bonus += 140_000;
    if (profile.openTwos >= 2) bonus += 45_000;
    return bonus;
  }

  function getOmokLookAheadScore(board, row, col, ai, human) {
    board[row][col] = ai;
    const nextCandidates = candidateOmokMoves(board);
    const aiWinningReplies = immediateOmokMoves(board, ai, nextCandidates).length;
    const humanWinningReplies = immediateOmokMoves(board, human, nextCandidates).length;
    let ownBestNext = 0;
    let humanBestNext = 0;
    for (const [nextRow, nextCol] of nextCandidates) {
      ownBestNext = Math.max(
        ownBestNext,
        scoreOmokCell(board, nextRow, nextCol, ai, human),
      );
      humanBestNext = Math.max(
        humanBestNext,
        scoreOmokCell(board, nextRow, nextCol, human, ai),
      );
    }

    board[row][col] = 0;
    return (
      aiWinningReplies * 20_000_000
      - humanWinningReplies * 45_000_000
      + ownBestNext * 0.2
      - humanBestNext * 0.52
    );
  }

  function rankOmokCandidates(board, candidates, ai, human) {
    return candidates
      .map(([row, col]) => ({
        row,
        col,
        score:
          scoreOmokCell(board, row, col, ai, human)
          + getOmokLookAheadScore(board, row, col, ai, human),
      }))
      .sort((a, b) => b.score - a.score);
  }

  /**
   * 11x11 축제용 오목 AI.
   * 즉시 승리와 방어를 우선하고 복합 패턴과 다음 수의 위협을 계산해 최고점 수만 선택한다.
   */
  function chooseOmokMove(inputBoard, ai = 2, human = 1) {
    const board = inputBoard.map((row) => [...row]);
    const candidates = candidateOmokMoves(board);
    if (!candidates.length) return null;

    const wins = immediateOmokMoves(board, ai, candidates);
    if (wins.length) {
      const winningChoices = rankOmokCandidates(board, wins, ai, human);
      return [winningChoices[0].row, winningChoices[0].col];
    }

    const blocks = immediateOmokMoves(board, human, candidates);
    if (blocks.length) {
      const blockingChoices = rankOmokCandidates(board, blocks, ai, human);
      return [blockingChoices[0].row, blockingChoices[0].col];
    }

    const ranked = rankOmokCandidates(board, candidates, ai, human);
    const selected = ranked[0];

    return [selected.row, selected.col];
  }

  function isConnect4Inside(board, row, col) {
    return row >= 0 && col >= 0 && row < board.length && col < board[0].length;
  }

  function getConnect4ValidColumns(board) {
    return CONNECT4_MOVE_ORDER.filter((col) => board[0][col] === 0);
  }

  function dropConnect4Disc(board, col, player) {
    if (col < 0 || col >= board[0].length || board[0][col] !== 0) return null;
    for (let row = board.length - 1; row >= 0; row -= 1) {
      if (board[row][col] === 0) {
        board[row][col] = player;
        return row;
      }
    }
    return null;
  }

  function checkConnect4Win(board, row, col, player) {
    if (!isConnect4Inside(board, row, col) || board[row][col] !== player) {
      return { won: false, cells: [] };
    }

    for (const [dr, dc] of DIRECTIONS) {
      const cells = [[row, col]];
      for (const sign of [-1, 1]) {
        let nextRow = row + dr * sign;
        let nextCol = col + dc * sign;
        while (isConnect4Inside(board, nextRow, nextCol) && board[nextRow][nextCol] === player) {
          cells.push([nextRow, nextCol]);
          nextRow += dr * sign;
          nextCol += dc * sign;
        }
      }
      if (cells.length >= 4) {
        cells.sort((a, b) => (a[0] - b[0]) || (a[1] - b[1]));
        return { won: true, cells };
      }
    }

    return { won: false, cells: [] };
  }

  function scoreConnect4Window(values, ai, human) {
    const aiCount = values.filter((value) => value === ai).length;
    const humanCount = values.filter((value) => value === human).length;
    const emptyCount = 4 - aiCount - humanCount;
    if (aiCount && humanCount) return 0;
    if (aiCount === 4) return 1_000_000;
    if (humanCount === 4) return -1_000_000;
    if (aiCount === 3 && emptyCount === 1) return 850;
    if (aiCount === 2 && emptyCount === 2) return 70;
    if (aiCount === 1 && emptyCount === 3) return 8;
    if (humanCount === 3 && emptyCount === 1) return -1_050;
    if (humanCount === 2 && emptyCount === 2) return -90;
    if (humanCount === 1 && emptyCount === 3) return -10;
    return 0;
  }

  function evaluateConnect4Board(board, ai, human) {
    const rows = board.length;
    const cols = board[0].length;
    let score = 0;

    for (let row = 0; row < rows; row += 1) {
      if (board[row][3] === ai) score += 24;
      if (board[row][3] === human) score -= 24;
    }

    const scoreWindow = (coordinates) => {
      score += scoreConnect4Window(
        coordinates.map(([row, col]) => board[row][col]),
        ai,
        human,
      );
    };

    for (let row = 0; row < rows; row += 1) {
      for (let col = 0; col <= cols - 4; col += 1) {
        scoreWindow([[row, col], [row, col + 1], [row, col + 2], [row, col + 3]]);
      }
    }
    for (let row = 0; row <= rows - 4; row += 1) {
      for (let col = 0; col < cols; col += 1) {
        scoreWindow([[row, col], [row + 1, col], [row + 2, col], [row + 3, col]]);
      }
    }
    for (let row = 0; row <= rows - 4; row += 1) {
      for (let col = 0; col <= cols - 4; col += 1) {
        scoreWindow([[row, col], [row + 1, col + 1], [row + 2, col + 2], [row + 3, col + 3]]);
        scoreWindow([[row + 3, col], [row + 2, col + 1], [row + 1, col + 2], [row, col + 3]]);
      }
    }

    return score;
  }

  /**
   * 7x6 4목 AI.
   * 중앙 우선 수 정렬과 알파–베타 탐색으로 고정 깊이까지 계산하며 무작위 수를 두지 않는다.
   */
  function chooseConnect4Move(inputBoard, ai = 2, human = 1, options = {}) {
    const board = inputBoard.map((row) => [...row]);
    const validColumns = getConnect4ValidColumns(board);
    if (!validColumns.length) return null;

    for (const col of validColumns) {
      const row = dropConnect4Disc(board, col, ai);
      const won = checkConnect4Win(board, row, col, ai).won;
      board[row][col] = 0;
      if (won) return col;
    }

    for (const col of validColumns) {
      const row = dropConnect4Disc(board, col, human);
      const won = checkConnect4Win(board, row, col, human).won;
      board[row][col] = 0;
      if (won) return col;
    }

    const maxDepth = Number.isInteger(options.maxDepth) ? options.maxDepth : 7;
    const cache = new Map();

    function search(depth, maximizing, alpha, beta, lastMove) {
      if (lastMove) {
        const result = checkConnect4Win(
          board,
          lastMove.row,
          lastMove.col,
          lastMove.player,
        );
        if (result.won) {
          return lastMove.player === ai ? 10_000_000 + depth : -10_000_000 - depth;
        }
      }

      const columns = getConnect4ValidColumns(board);
      if (!columns.length) return 0;
      if (depth === 0) return evaluateConnect4Board(board, ai, human);

      const key = `${depth}:${maximizing ? 1 : 0}:${board.map((row) => row.join("")).join("")}`;
      if (cache.has(key)) return cache.get(key);

      let best = maximizing ? -Infinity : Infinity;
      let pruned = false;
      const player = maximizing ? ai : human;

      for (const col of columns) {
        const row = dropConnect4Disc(board, col, player);
        const value = search(
          depth - 1,
          !maximizing,
          alpha,
          beta,
          { row, col, player },
        );
        board[row][col] = 0;

        if (maximizing) {
          best = Math.max(best, value);
          alpha = Math.max(alpha, best);
        } else {
          best = Math.min(best, value);
          beta = Math.min(beta, best);
        }
        if (beta <= alpha) {
          pruned = true;
          break;
        }
      }

      if (!pruned) cache.set(key, best);
      return best;
    }

    let selectedColumn = validColumns[0];
    let bestScore = -Infinity;
    for (const col of validColumns) {
      const row = dropConnect4Disc(board, col, ai);
      const score = search(
        maxDepth - 1,
        false,
        -Infinity,
        Infinity,
        { row, col, player: ai },
      );
      board[row][col] = 0;
      if (score > bestScore) {
        bestScore = score;
        selectedColumn = col;
      }
    }

    return selectedColumn;
  }

  global.CodeInAI = Object.freeze({
    TTT_WINS,
    getTicTacToeResult,
    chooseTicTacToeMove,
    checkOmokWin,
    chooseOmokMove,
    candidateOmokMoves,
    CONNECT4_ROWS,
    CONNECT4_COLS,
    getConnect4ValidColumns,
    dropConnect4Disc,
    checkConnect4Win,
    chooseConnect4Move,
  });
})(typeof window !== "undefined" ? window : globalThis);
