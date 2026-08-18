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

  global.CodeInAI = Object.freeze({
    TTT_WINS,
    getTicTacToeResult,
    chooseTicTacToeMove,
    checkOmokWin,
    chooseOmokMove,
    candidateOmokMoves,
  });
})(typeof window !== "undefined" ? window : globalThis);
