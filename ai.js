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

  const OMOK_WIN_SCORE = 1_000_000_000;
  const OMOK_LINE_RADIUS = 5;
  const OMOK_OPEN_THREE_PATTERNS = ["01110", "010110", "011010"];

  function omokBoardKey(board) {
    return board.map((row) => row.join("")).join("");
  }

  function lineThroughMove(board, row, col, dr, dc, player) {
    let line = "";
    for (let offset = -OMOK_LINE_RADIUS; offset <= OMOK_LINE_RADIUS; offset += 1) {
      const r = row + dr * offset;
      const c = col + dc * offset;
      if (!isInside(board, r, c) || board[r][c] === (player === 1 ? 2 : 1)) {
        line += "2";
      } else if (board[r][c] === player) {
        line += "1";
      } else {
        line += "0";
      }
    }
    return line;
  }

  function patternPassesCenter(line, pattern) {
    const center = OMOK_LINE_RADIUS;
    let index = line.indexOf(pattern);
    while (index !== -1) {
      if (index <= center && center < index + pattern.length) return true;
      index = line.indexOf(pattern, index + 1);
    }
    return false;
  }

  function createdOmokPatternStats(board, row, col, player) {
    const stats = {
      openFours: 0,
      fourPoints: 0,
      openThrees: 0,
      softThrees: 0,
      openTwos: 0,
    };

    for (const [dr, dc] of DIRECTIONS) {
      const line = lineThroughMove(board, row, col, dr, dc, player);
      const center = OMOK_LINE_RADIUS;
      const winningOffsets = new Set();
      let hasSoftThree = false;
      let hasOpenTwo = false;

      if (patternPassesCenter(line, "011110")) stats.openFours += 1;
      if (OMOK_OPEN_THREE_PATTERNS.some((pattern) => patternPassesCenter(line, pattern))) {
        stats.openThrees += 1;
      }

      for (let start = 0; start <= line.length - 5; start += 1) {
        const end = start + 5;
        if (!(start <= center && center < end)) continue;
        const window = line.slice(start, end);
        if (window.includes("2")) continue;
        const stones = [...window].filter((cell) => cell === "1").length;
        if (stones === 4) {
          winningOffsets.add(start + window.indexOf("0"));
        } else if (stones === 3) {
          hasSoftThree = true;
        } else if (stones === 2) {
          hasOpenTwo = true;
        }
      }

      stats.fourPoints += winningOffsets.size;
      if (hasSoftThree) stats.softThrees += 1;
      if (hasOpenTwo) stats.openTwos += 1;
    }

    return stats;
  }

  function quickPlacedOmokScore(board, row, col, player) {
    if (checkOmokWin(board, row, col, player).won) return OMOK_WIN_SCORE;
    const stats = createdOmokPatternStats(board, row, col, player);
    const contiguous = getPatternProfile(board, row, col, player);
    return (
      stats.openFours * 85_000_000
      + stats.fourPoints * 13_000_000
      + stats.openThrees * 2_600_000
      + stats.softThrees * 170_000
      + stats.openTwos * 14_000
      + contiguous.score
      + getCompoundPatternBonus(contiguous)
    );
  }

  function analyzePlacedOmokMove(board, row, col, player) {
    const won = checkOmokWin(board, row, col, player).won;
    if (won) {
      return {
        won: true,
        winningReplies: [],
        stats: createdOmokPatternStats(board, row, col, player),
        forcingRank: 6,
        score: OMOK_WIN_SCORE,
      };
    }

    const replies = immediateOmokMoves(board, player, candidateOmokMoves(board));
    const stats = createdOmokPatternStats(board, row, col, player);
    let forcingRank = 0;
    if (replies.length >= 2) forcingRank = 5;
    else if (replies.length === 1 && stats.openThrees >= 1) forcingRank = 4;
    else if (replies.length === 1) forcingRank = 3;
    else if (stats.openThrees >= 2) forcingRank = 4;
    else if (stats.openThrees === 1) forcingRank = 2;
    else if (stats.softThrees >= 1) forcingRank = 1;

    return {
      won: false,
      winningReplies: replies,
      stats,
      forcingRank,
      score:
        replies.length * 35_000_000
        + stats.openFours * 60_000_000
        + stats.openThrees * 4_000_000
        + stats.softThrees * 220_000
        + stats.openTwos * 18_000
        + quickPlacedOmokScore(board, row, col, player),
    };
  }

  function rankStrongOmokMoves(board, candidates, player, opponent, limit = candidates.length) {
    const center = (board.length - 1) / 2;
    return candidates
      .map(([row, col]) => {
        board[row][col] = player;
        const attack = analyzePlacedOmokMove(board, row, col, player);
        board[row][col] = opponent;
        const defense = analyzePlacedOmokMove(board, row, col, opponent);
        board[row][col] = 0;
        return {
          row,
          col,
          attack,
          defense,
          centerDistance: Math.abs(row - center) + Math.abs(col - center),
          score:
            attack.score
            + defense.score * 1.42
            + scoreOmokCell(board, row, col, player, opponent) * 0.18,
        };
      })
      .sort((a, b) => (
        b.score - a.score
        || b.defense.forcingRank - a.defense.forcingRank
        || b.attack.forcingRank - a.attack.forcingRank
        || a.centerDistance - b.centerDistance
        || a.row - b.row
        || a.col - b.col
      ))
      .slice(0, limit);
  }

  function listFourThreatMoves(board, attacker, defender) {
    const candidates = candidateOmokMoves(board);
    const moves = [];

    for (const [row, col] of candidates) {
      board[row][col] = attacker;
      const won = checkOmokWin(board, row, col, attacker).won;
      const nextCandidates = candidateOmokMoves(board);
      const attackerWins = won ? [] : immediateOmokMoves(board, attacker, nextCandidates);
      const defenderWins = won ? [] : immediateOmokMoves(board, defender, nextCandidates);
      const score = quickPlacedOmokScore(board, row, col, attacker);
      board[row][col] = 0;

      if (won || (attackerWins.length && !defenderWins.length)) {
        moves.push({ row, col, won, attackerWins, score });
      }
    }

    return moves.sort((a, b) => (
      Number(b.won) - Number(a.won)
      || b.attackerWins.length - a.attackerWins.length
      || b.score - a.score
      || a.row - b.row
      || a.col - b.col
    ));
  }

  function canForceFourWin(board, attacker, defender, turnsLeft, context) {
    context.nodes += 1;
    if (context.nodes > context.maxNodes || turnsLeft <= 0) return false;

    const candidates = candidateOmokMoves(board);
    if (!candidates.length) return false;
    if (immediateOmokMoves(board, attacker, candidates).length) return true;
    if (immediateOmokMoves(board, defender, candidates).length) return false;

    const key = `${turnsLeft}:${attacker}:${omokBoardKey(board)}`;
    if (context.memo.has(key)) return context.memo.get(key);

    const moves = listFourThreatMoves(board, attacker, defender);
    for (const move of moves) {
      board[move.row][move.col] = attacker;
      if (move.won) {
        board[move.row][move.col] = 0;
        context.memo.set(key, true);
        return true;
      }

      const nextCandidates = candidateOmokMoves(board);
      const defenderWins = immediateOmokMoves(board, defender, nextCandidates);
      const attackerWins = immediateOmokMoves(board, attacker, nextCandidates);
      let forced = false;

      if (!defenderWins.length && attackerWins.length >= 2) {
        forced = true;
      } else if (!defenderWins.length && attackerWins.length === 1) {
        const [blockRow, blockCol] = attackerWins[0];
        board[blockRow][blockCol] = defender;
        const defenderWon = checkOmokWin(board, blockRow, blockCol, defender).won;
        if (!defenderWon) {
          forced = canForceFourWin(
            board,
            attacker,
            defender,
            turnsLeft - 1,
            context,
          );
        }
        board[blockRow][blockCol] = 0;
      }

      board[move.row][move.col] = 0;
      if (forced) {
        context.memo.set(key, true);
        return true;
      }
    }

    context.memo.set(key, false);
    return false;
  }

  function findForcingFourWins(board, attacker, defender, maxTurns, maxNodes = 24_000) {
    const context = { nodes: 0, maxNodes, memo: new Map() };
    const winningMoves = [];
    for (const move of listFourThreatMoves(board, attacker, defender)) {
      board[move.row][move.col] = attacker;
      let forced = move.won;
      if (!forced) {
        const candidates = candidateOmokMoves(board);
        const defenderWins = immediateOmokMoves(board, defender, candidates);
        const attackerWins = immediateOmokMoves(board, attacker, candidates);
        if (!defenderWins.length && attackerWins.length >= 2) {
          forced = true;
        } else if (!defenderWins.length && attackerWins.length === 1) {
          const [blockRow, blockCol] = attackerWins[0];
          board[blockRow][blockCol] = defender;
          if (!checkOmokWin(board, blockRow, blockCol, defender).won) {
            forced = canForceFourWin(
              board,
              attacker,
              defender,
              maxTurns - 1,
              context,
            );
          }
          board[blockRow][blockCol] = 0;
        }
      }
      board[move.row][move.col] = 0;
      if (forced) winningMoves.push(move);
      if (context.nodes > context.maxNodes) break;
    }
    return winningMoves;
  }

  function rankOmokTreeMoves(board, player, opponent, limit) {
    const candidates = candidateOmokMoves(board);
    if (!candidates.length) return [];
    const wins = immediateOmokMoves(board, player, candidates);
    if (wins.length) return wins.map(([row, col]) => ({ row, col, score: OMOK_WIN_SCORE }));
    const blocks = immediateOmokMoves(board, opponent, candidates);
    const pool = blocks.length ? blocks : candidates;
    const center = (board.length - 1) / 2;

    return pool
      .map(([row, col]) => {
        board[row][col] = player;
        const attack = quickPlacedOmokScore(board, row, col, player);
        board[row][col] = opponent;
        const defense = quickPlacedOmokScore(board, row, col, opponent);
        board[row][col] = 0;
        return {
          row,
          col,
          score:
            attack
            + defense * 1.32
            + scoreOmokCell(board, row, col, player, opponent) * 0.12,
          centerDistance: Math.abs(row - center) + Math.abs(col - center),
        };
      })
      .sort((a, b) => (
        b.score - a.score
        || a.centerDistance - b.centerDistance
        || a.row - b.row
        || a.col - b.col
      ))
      .slice(0, blocks.length ? pool.length : limit);
  }

  function evaluateStrongOmokPosition(board, ai, human) {
    const candidates = candidateOmokMoves(board);
    if (!candidates.length) return 0;
    const aiScores = [];
    const humanScores = [];

    for (const [row, col] of candidates) {
      board[row][col] = ai;
      aiScores.push(quickPlacedOmokScore(board, row, col, ai));
      board[row][col] = human;
      humanScores.push(quickPlacedOmokScore(board, row, col, human));
      board[row][col] = 0;
    }

    aiScores.sort((a, b) => b - a);
    humanScores.sort((a, b) => b - a);
    return (
      (aiScores[0] || 0)
      + (aiScores[1] || 0) * 0.52
      + (aiScores[2] || 0) * 0.22
      - (humanScores[0] || 0) * 1.3
      - (humanScores[1] || 0) * 0.68
      - (humanScores[2] || 0) * 0.3
    );
  }

  function searchStrongOmok(
    board,
    depth,
    maximizing,
    ai,
    human,
    alpha,
    beta,
    lastMove,
    extensionLeft,
    context,
  ) {
    context.nodes += 1;
    if (lastMove && checkOmokWin(
      board,
      lastMove.row,
      lastMove.col,
      lastMove.player,
    ).won) {
      return lastMove.player === ai
        ? OMOK_WIN_SCORE + depth * 10_000
        : -OMOK_WIN_SCORE - depth * 10_000;
    }
    if (context.nodes > context.maxNodes) {
      return evaluateStrongOmokPosition(board, ai, human);
    }

    const player = maximizing ? ai : human;
    const opponent = maximizing ? human : ai;
    const candidates = candidateOmokMoves(board);
    if (!candidates.length) return 0;

    const ownWins = immediateOmokMoves(board, player, candidates);
    if (ownWins.length) {
      return player === ai ? OMOK_WIN_SCORE + depth : -OMOK_WIN_SCORE - depth;
    }

    const opponentWins = immediateOmokMoves(board, opponent, candidates);
    if (opponentWins.length >= 2) {
      return opponent === ai ? OMOK_WIN_SCORE / 2 + depth : -OMOK_WIN_SCORE / 2 - depth;
    }

    let nextDepth = depth;
    let nextExtension = extensionLeft;
    if (depth <= 0) {
      if (opponentWins.length === 1 && extensionLeft > 0) {
        nextExtension -= 1;
      } else {
        return evaluateStrongOmokPosition(board, ai, human);
      }
    } else {
      nextDepth -= 1;
    }

    const key = `${depth}:${extensionLeft}:${maximizing ? 1 : 0}:${omokBoardKey(board)}`;
    if (context.cache.has(key)) return context.cache.get(key);

    const limit = depth >= 3 ? 6 : depth >= 1 ? 5 : 4;
    const moves = opponentWins.length === 1
      ? opponentWins.map(([row, col]) => ({ row, col, score: 0 }))
      : rankOmokTreeMoves(board, player, opponent, limit);
    let best = maximizing ? -Infinity : Infinity;
    let pruned = false;

    for (const move of moves) {
      board[move.row][move.col] = player;
      const score = searchStrongOmok(
        board,
        nextDepth,
        !maximizing,
        ai,
        human,
        alpha,
        beta,
        { row: move.row, col: move.col, player },
        nextExtension,
        context,
      );
      board[move.row][move.col] = 0;

      if (maximizing) {
        best = Math.max(best, score);
        alpha = Math.max(alpha, best);
      } else {
        best = Math.min(best, score);
        beta = Math.min(beta, best);
      }
      if (beta <= alpha) {
        pruned = true;
        break;
      }
    }

    if (!pruned) context.cache.set(key, best);
    return best;
  }

  /**
   * 11x11 오목 AI.
   * 끊어진 3·4목까지 판정하고, 연속 4목 강제승리 수순과 기본 5수 탐색을 결합한다.
   */
  function chooseOmokMove(inputBoard, ai = 2, human = 1) {
    const board = inputBoard.map((row) => [...row]);
    const candidates = candidateOmokMoves(board);
    if (!candidates.length) return null;
    const stoneCount = board.reduce(
      (total, row) => total + row.filter(Boolean).length,
      0,
    );

    const wins = immediateOmokMoves(board, ai, candidates);
    if (wins.length) {
      const winningChoices = rankStrongOmokMoves(board, wins, ai, human);
      return [winningChoices[0].row, winningChoices[0].col];
    }

    const blocks = immediateOmokMoves(board, human, candidates);
    if (blocks.length) {
      const blockingChoices = rankStrongOmokMoves(board, blocks, ai, human);
      return [blockingChoices[0].row, blockingChoices[0].col];
    }

    const aiForcingWins = stoneCount >= 5
      ? findForcingFourWins(board, ai, human, 7)
      : [];
    if (aiForcingWins.length) {
      return [aiForcingWins[0].row, aiForcingWins[0].col];
    }

    const humanForcingStarts = stoneCount >= 5
      ? findForcingFourWins(board, human, ai, 6)
      : [];
    const rootLimit = stoneCount < 5 ? 10 : 14;
    const searchDepth = stoneCount < 5 ? 3 : 4;
    const ranked = rankStrongOmokMoves(board, candidates, ai, human, rootLimit);
    const rootMoves = [];
    const seen = new Set();
    for (const move of [...humanForcingStarts, ...ranked]) {
      const key = `${move.row},${move.col}`;
      if (seen.has(key)) continue;
      seen.add(key);
      rootMoves.push(move);
    }

    const context = { nodes: 0, maxNodes: 120_000, cache: new Map() };
    let selected = rootMoves[0] || ranked[0];
    let bestScore = -Infinity;

    for (const move of rootMoves) {
      board[move.row][move.col] = ai;
      const humanVcf = canForceFourWin(
        board,
        human,
        ai,
        6,
        { nodes: 0, maxNodes: 12_000, memo: new Map() },
      );
      let score = humanVcf
        ? -OMOK_WIN_SCORE * 0.75
        : searchStrongOmok(
          board,
          searchDepth,
          false,
          ai,
          human,
          -Infinity,
          Infinity,
          { row: move.row, col: move.col, player: ai },
          2,
          context,
        );
      board[move.row][move.col] = 0;

      const rankedMove = ranked.find((candidate) => (
        candidate.row === move.row && candidate.col === move.col
      ));
      score += (rankedMove?.score || move.score || 0) * 0.015;
      if (score > bestScore) {
        bestScore = score;
        selected = move;
      }
    }

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
