(function attachCodeInChess(global) {
  "use strict";

  const FILES = "abcdefgh";
  const COLORS = { WHITE: "w", BLACK: "b" };
  const PIECE_VALUES = { P: 100, N: 320, B: 335, R: 500, Q: 900, K: 20_000 };
  const PIECE_SYMBOLS = {
    wK: "♔", wQ: "♕", wR: "♖", wB: "♗", wN: "♘", wP: "♙",
    bK: "♚", bQ: "♛", bR: "♜", bB: "♝", bN: "♞", bP: "♟",
  };
  const KNIGHT_OFFSETS = [
    [-2, -1], [-2, 1], [-1, -2], [-1, 2],
    [1, -2], [1, 2], [2, -1], [2, 1],
  ];
  const KING_OFFSETS = [
    [-1, -1], [-1, 0], [-1, 1], [0, -1],
    [0, 1], [1, -1], [1, 0], [1, 1],
  ];
  const BISHOP_DIRECTIONS = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
  const ROOK_DIRECTIONS = [[-1, 0], [1, 0], [0, -1], [0, 1]];
  const MATE_SCORE = 1_000_000;

  function indexOf(row, col) {
    return row * 8 + col;
  }

  function rowOf(index) {
    return Math.floor(index / 8);
  }

  function colOf(index) {
    return index % 8;
  }

  function inside(row, col) {
    return row >= 0 && row < 8 && col >= 0 && col < 8;
  }

  function opposite(color) {
    return color === COLORS.WHITE ? COLORS.BLACK : COLORS.WHITE;
  }

  function pieceColor(piece) {
    return piece ? piece[0] : null;
  }

  function pieceType(piece) {
    return piece ? piece[1] : null;
  }

  function createInitialState() {
    return {
      board: [
        "bR", "bN", "bB", "bQ", "bK", "bB", "bN", "bR",
        "bP", "bP", "bP", "bP", "bP", "bP", "bP", "bP",
        null, null, null, null, null, null, null, null,
        null, null, null, null, null, null, null, null,
        null, null, null, null, null, null, null, null,
        null, null, null, null, null, null, null, null,
        "wP", "wP", "wP", "wP", "wP", "wP", "wP", "wP",
        "wR", "wN", "wB", "wQ", "wK", "wB", "wN", "wR",
      ],
      turn: COLORS.WHITE,
      castling: { wK: true, wQ: true, bK: true, bQ: true },
      enPassant: null,
      halfmove: 0,
      fullmove: 1,
      lastMove: null,
    };
  }

  function cloneState(state) {
    return {
      board: [...state.board],
      turn: state.turn,
      castling: { ...state.castling },
      enPassant: state.enPassant,
      halfmove: state.halfmove,
      fullmove: state.fullmove,
      lastMove: state.lastMove ? { ...state.lastMove } : null,
    };
  }

  function createMove(from, to, extra = {}) {
    return { from, to, ...extra };
  }

  function isSquareAttacked(state, square, byColor) {
    const board = state.board;
    const row = rowOf(square);
    const col = colOf(square);
    const pawnSourceRow = byColor === COLORS.WHITE ? row + 1 : row - 1;

    for (const deltaCol of [-1, 1]) {
      const sourceCol = col + deltaCol;
      if (inside(pawnSourceRow, sourceCol) && board[indexOf(pawnSourceRow, sourceCol)] === `${byColor}P`) {
        return true;
      }
    }

    for (const [dr, dc] of KNIGHT_OFFSETS) {
      const r = row + dr;
      const c = col + dc;
      if (inside(r, c) && board[indexOf(r, c)] === `${byColor}N`) return true;
    }

    for (const [dr, dc] of KING_OFFSETS) {
      const r = row + dr;
      const c = col + dc;
      if (inside(r, c) && board[indexOf(r, c)] === `${byColor}K`) return true;
    }

    for (const [dr, dc] of BISHOP_DIRECTIONS) {
      let r = row + dr;
      let c = col + dc;
      while (inside(r, c)) {
        const piece = board[indexOf(r, c)];
        if (piece) {
          if (pieceColor(piece) === byColor && ["B", "Q"].includes(pieceType(piece))) return true;
          break;
        }
        r += dr;
        c += dc;
      }
    }

    for (const [dr, dc] of ROOK_DIRECTIONS) {
      let r = row + dr;
      let c = col + dc;
      while (inside(r, c)) {
        const piece = board[indexOf(r, c)];
        if (piece) {
          if (pieceColor(piece) === byColor && ["R", "Q"].includes(pieceType(piece))) return true;
          break;
        }
        r += dr;
        c += dc;
      }
    }

    return false;
  }

  function findKing(state, color) {
    return state.board.indexOf(`${color}K`);
  }

  function isInCheck(state, color) {
    const kingSquare = findKing(state, color);
    return kingSquare === -1 || isSquareAttacked(state, kingSquare, opposite(color));
  }

  function pushPawnMove(moves, from, to, color, extra = {}) {
    const targetRow = rowOf(to);
    if ((color === COLORS.WHITE && targetRow === 0) || (color === COLORS.BLACK && targetRow === 7)) {
      moves.push(createMove(from, to, { ...extra, promotion: "Q" }));
    } else {
      moves.push(createMove(from, to, extra));
    }
  }

  function generatePawnMoves(state, from, color, moves) {
    const board = state.board;
    const row = rowOf(from);
    const col = colOf(from);
    const direction = color === COLORS.WHITE ? -1 : 1;
    const startRow = color === COLORS.WHITE ? 6 : 1;
    const oneRow = row + direction;

    if (inside(oneRow, col)) {
      const one = indexOf(oneRow, col);
      if (!board[one]) {
        pushPawnMove(moves, from, one, color);
        const twoRow = row + direction * 2;
        const two = indexOf(twoRow, col);
        if (row === startRow && !board[two]) {
          moves.push(createMove(from, two, { doublePawn: true }));
        }
      }
    }

    for (const deltaCol of [-1, 1]) {
      const targetRow = row + direction;
      const targetCol = col + deltaCol;
      if (!inside(targetRow, targetCol)) continue;
      const to = indexOf(targetRow, targetCol);
      const target = board[to];
      if (target && pieceColor(target) !== color && pieceType(target) !== "K") {
        pushPawnMove(moves, from, to, color, { captured: target });
      } else if (state.enPassant === to) {
        const capturedIndex = indexOf(row, targetCol);
        if (board[capturedIndex] === `${opposite(color)}P`) {
          moves.push(createMove(from, to, { enPassant: true, captured: board[capturedIndex] }));
        }
      }
    }
  }

  function generateKnightMoves(state, from, color, moves) {
    const row = rowOf(from);
    const col = colOf(from);
    for (const [dr, dc] of KNIGHT_OFFSETS) {
      const r = row + dr;
      const c = col + dc;
      if (!inside(r, c)) continue;
      const to = indexOf(r, c);
      const target = state.board[to];
      if (!target || (pieceColor(target) !== color && pieceType(target) !== "K")) {
        moves.push(createMove(from, to, target ? { captured: target } : {}));
      }
    }
  }

  function generateSlidingMoves(state, from, color, directions, moves) {
    const row = rowOf(from);
    const col = colOf(from);
    for (const [dr, dc] of directions) {
      let r = row + dr;
      let c = col + dc;
      while (inside(r, c)) {
        const to = indexOf(r, c);
        const target = state.board[to];
        if (!target) {
          moves.push(createMove(from, to));
        } else {
          if (pieceColor(target) !== color && pieceType(target) !== "K") {
            moves.push(createMove(from, to, { captured: target }));
          }
          break;
        }
        r += dr;
        c += dc;
      }
    }
  }

  function generateKingMoves(state, from, color, moves) {
    const row = rowOf(from);
    const col = colOf(from);
    for (const [dr, dc] of KING_OFFSETS) {
      const r = row + dr;
      const c = col + dc;
      if (!inside(r, c)) continue;
      const to = indexOf(r, c);
      const target = state.board[to];
      if (!target || (pieceColor(target) !== color && pieceType(target) !== "K")) {
        moves.push(createMove(from, to, target ? { captured: target } : {}));
      }
    }

    const homeRow = color === COLORS.WHITE ? 7 : 0;
    const kingHome = indexOf(homeRow, 4);
    const enemy = opposite(color);
    if (from !== kingHome || isSquareAttacked(state, kingHome, enemy)) return;

    if (
      state.castling[`${color}K`]
      && state.board[indexOf(homeRow, 7)] === `${color}R`
      && !state.board[indexOf(homeRow, 5)]
      && !state.board[indexOf(homeRow, 6)]
      && !isSquareAttacked(state, indexOf(homeRow, 5), enemy)
      && !isSquareAttacked(state, indexOf(homeRow, 6), enemy)
    ) {
      moves.push(createMove(from, indexOf(homeRow, 6), { castle: "K" }));
    }

    if (
      state.castling[`${color}Q`]
      && state.board[indexOf(homeRow, 0)] === `${color}R`
      && !state.board[indexOf(homeRow, 1)]
      && !state.board[indexOf(homeRow, 2)]
      && !state.board[indexOf(homeRow, 3)]
      && !isSquareAttacked(state, indexOf(homeRow, 3), enemy)
      && !isSquareAttacked(state, indexOf(homeRow, 2), enemy)
    ) {
      moves.push(createMove(from, indexOf(homeRow, 2), { castle: "Q" }));
    }
  }

  function generatePseudoMoves(state, color = state.turn) {
    const moves = [];
    for (let from = 0; from < 64; from += 1) {
      const piece = state.board[from];
      if (!piece || pieceColor(piece) !== color) continue;
      const type = pieceType(piece);
      if (type === "P") generatePawnMoves(state, from, color, moves);
      else if (type === "N") generateKnightMoves(state, from, color, moves);
      else if (type === "B") generateSlidingMoves(state, from, color, BISHOP_DIRECTIONS, moves);
      else if (type === "R") generateSlidingMoves(state, from, color, ROOK_DIRECTIONS, moves);
      else if (type === "Q") generateSlidingMoves(state, from, color, [...BISHOP_DIRECTIONS, ...ROOK_DIRECTIONS], moves);
      else if (type === "K") generateKingMoves(state, from, color, moves);
    }
    return moves;
  }

  function updateCastlingRights(state, move, movingPiece, capturedPiece) {
    const rights = { ...state.castling };
    const color = pieceColor(movingPiece);
    if (pieceType(movingPiece) === "K") {
      rights[`${color}K`] = false;
      rights[`${color}Q`] = false;
    }
    if (move.from === 63 || (move.to === 63 && capturedPiece === "wR")) rights.wK = false;
    if (move.from === 56 || (move.to === 56 && capturedPiece === "wR")) rights.wQ = false;
    if (move.from === 7 || (move.to === 7 && capturedPiece === "bR")) rights.bK = false;
    if (move.from === 0 || (move.to === 0 && capturedPiece === "bR")) rights.bQ = false;
    return rights;
  }

  function makeMove(state, move) {
    const next = cloneState(state);
    const piece = next.board[move.from];
    const capturedPiece = move.enPassant
      ? next.board[indexOf(rowOf(move.from), colOf(move.to))]
      : next.board[move.to];
    next.board[move.from] = null;

    if (move.enPassant) {
      next.board[indexOf(rowOf(move.from), colOf(move.to))] = null;
    }

    next.board[move.to] = move.promotion ? `${pieceColor(piece)}${move.promotion}` : piece;

    if (move.castle) {
      const row = pieceColor(piece) === COLORS.WHITE ? 7 : 0;
      if (move.castle === "K") {
        next.board[indexOf(row, 5)] = next.board[indexOf(row, 7)];
        next.board[indexOf(row, 7)] = null;
      } else {
        next.board[indexOf(row, 3)] = next.board[indexOf(row, 0)];
        next.board[indexOf(row, 0)] = null;
      }
    }

    next.castling = updateCastlingRights(state, move, piece, capturedPiece);
    next.enPassant = pieceType(piece) === "P" && Math.abs(move.to - move.from) === 16
      ? (move.from + move.to) / 2
      : null;
    next.halfmove = pieceType(piece) === "P" || capturedPiece ? 0 : state.halfmove + 1;
    next.fullmove = state.turn === COLORS.BLACK ? state.fullmove + 1 : state.fullmove;
    next.turn = opposite(state.turn);
    next.lastMove = { ...move, piece, captured: capturedPiece || null };
    return next;
  }

  function getLegalMoves(state, color = state.turn) {
    return generatePseudoMoves(state, color).filter((move) => !isInCheck(makeMove(state, move), color));
  }

  function hasInsufficientMaterial(state) {
    const pieces = state.board
      .map((piece, square) => ({ piece, square }))
      .filter(({ piece }) => piece && pieceType(piece) !== "K");
    if (pieces.length === 0) return true;
    if (pieces.length === 1 && ["B", "N"].includes(pieceType(pieces[0].piece))) return true;
    return false;
  }

  function getGameStatus(state) {
    if (state.halfmove >= 100) {
      return { over: true, winner: null, reason: "50-move", check: isInCheck(state, state.turn) };
    }
    if (hasInsufficientMaterial(state)) {
      return { over: true, winner: null, reason: "insufficient", check: false };
    }

    const check = isInCheck(state, state.turn);
    const legalMoves = getLegalMoves(state);
    if (legalMoves.length) return { over: false, winner: null, reason: null, check };
    if (check) {
      return { over: true, winner: opposite(state.turn), reason: "checkmate", check: true };
    }
    return { over: true, winner: null, reason: "stalemate", check: false };
  }

  function positionalValue(piece, square, totalMaterial) {
    const type = pieceType(piece);
    const color = pieceColor(piece);
    const row = rowOf(square);
    const col = colOf(square);
    const centerDistance = Math.abs(3.5 - row) + Math.abs(3.5 - col);
    if (type === "P") {
      const advancement = color === COLORS.WHITE ? 6 - row : row - 1;
      return advancement * 11 - Math.abs(3.5 - col) * 2;
    }
    if (type === "N") return Math.round(42 - centerDistance * 11);
    if (type === "B") return Math.round(28 - centerDistance * 5);
    if (type === "R") return Math.round(8 - Math.abs(3.5 - col) * 2);
    if (type === "Q") return Math.round(12 - centerDistance * 3);
    if (type === "K") {
      if (totalMaterial > 3_000) {
        const homeRow = color === COLORS.WHITE ? 7 : 0;
        return row === homeRow && [1, 2, 6].includes(col) ? 35 : -Math.round((7 - centerDistance) * 7);
      }
      return Math.round(45 - centerDistance * 10);
    }
    return 0;
  }

  function evaluate(state, aiColor) {
    let score = 0;
    let totalMaterial = 0;
    for (const piece of state.board) {
      if (piece && pieceType(piece) !== "K") totalMaterial += PIECE_VALUES[pieceType(piece)];
    }

    for (let square = 0; square < 64; square += 1) {
      const piece = state.board[square];
      if (!piece) continue;
      const value = PIECE_VALUES[pieceType(piece)] + positionalValue(piece, square, totalMaterial);
      score += pieceColor(piece) === aiColor ? value : -value;
    }

    const aiMobility = generatePseudoMoves(state, aiColor).length;
    const humanMobility = generatePseudoMoves(state, opposite(aiColor)).length;
    score += (aiMobility - humanMobility) * 2;
    if (isInCheck(state, aiColor)) score -= 28;
    if (isInCheck(state, opposite(aiColor))) score += 28;
    return score;
  }

  function positionKey(state) {
    return `${state.board.map((piece) => piece || "--").join("")}|${state.turn}|${Number(state.castling.wK)}${Number(state.castling.wQ)}${Number(state.castling.bK)}${Number(state.castling.bQ)}|${state.enPassant ?? "-"}`;
  }

  function moveOrderingScore(state, move) {
    const movingPiece = state.board[move.from];
    const captured = move.captured || state.board[move.to];
    let score = 0;
    if (captured) score += PIECE_VALUES[pieceType(captured)] * 12 - PIECE_VALUES[pieceType(movingPiece)];
    if (move.promotion) score += 9_000;
    if (move.castle) score += 900;
    const destinationCenter = Math.abs(3.5 - rowOf(move.to)) + Math.abs(3.5 - colOf(move.to));
    score += Math.round(20 - destinationCenter * 3);
    return score;
  }

  function orderedMoves(state, moves, preferredMove = null) {
    return [...moves].sort((a, b) => {
      if (preferredMove && a.from === preferredMove.from && a.to === preferredMove.to) return -1;
      if (preferredMove && b.from === preferredMove.from && b.to === preferredMove.to) return 1;
      return moveOrderingScore(state, b) - moveOrderingScore(state, a);
    });
  }

  function search(state, depth, alpha, beta, aiColor, deadline, table, ply) {
    if (Date.now() >= deadline) throw new Error("CHESS_SEARCH_TIMEOUT");
    const key = positionKey(state);
    const cached = table.get(key);
    if (cached && cached.depth >= depth) return cached.score;

    const legalMoves = getLegalMoves(state);
    if (!legalMoves.length) {
      if (isInCheck(state, state.turn)) {
        return state.turn === aiColor ? -MATE_SCORE + ply : MATE_SCORE - ply;
      }
      return 0;
    }
    if (depth === 0 || state.halfmove >= 100 || hasInsufficientMaterial(state)) {
      return evaluate(state, aiColor);
    }

    const maximizing = state.turn === aiColor;
    let bestScore = maximizing ? -Infinity : Infinity;
    let cutoff = false;
    const moves = orderedMoves(state, legalMoves, cached?.bestMove);
    let bestMove = moves[0];

    for (const move of moves) {
      const score = search(makeMove(state, move), depth - 1, alpha, beta, aiColor, deadline, table, ply + 1);
      if (maximizing) {
        if (score > bestScore) {
          bestScore = score;
          bestMove = move;
        }
        alpha = Math.max(alpha, bestScore);
      } else {
        if (score < bestScore) {
          bestScore = score;
          bestMove = move;
        }
        beta = Math.min(beta, bestScore);
      }
      if (beta <= alpha) {
        cutoff = true;
        break;
      }
    }

    if (!cutoff) table.set(key, { depth, score: bestScore, bestMove });
    return bestScore;
  }

  function searchRoot(state, depth, aiColor, deadline, table, preferredMove) {
    const legalMoves = orderedMoves(state, getLegalMoves(state), preferredMove);
    if (!legalMoves.length) return null;
    const maximizing = state.turn === aiColor;
    let bestScore = maximizing ? -Infinity : Infinity;
    let bestMove = legalMoves[0];
    let alpha = -Infinity;
    let beta = Infinity;

    for (const move of legalMoves) {
      if (Date.now() >= deadline) throw new Error("CHESS_SEARCH_TIMEOUT");
      const score = search(makeMove(state, move), depth - 1, alpha, beta, aiColor, deadline, table, 1);
      if ((maximizing && score > bestScore) || (!maximizing && score < bestScore)) {
        bestScore = score;
        bestMove = move;
      }
      if (maximizing) alpha = Math.max(alpha, bestScore);
      else beta = Math.min(beta, bestScore);
    }
    return { move: bestMove, score: bestScore };
  }

  function chooseChessMove(state, aiColor = COLORS.BLACK, options = {}) {
    const legalMoves = getLegalMoves(state);
    if (!legalMoves.length) return null;
    const maxDepth = options.maxDepth || 4;
    const timeLimitMs = options.timeLimitMs || 950;
    const deadline = Date.now() + timeLimitMs;
    const table = new Map();
    let bestMove = orderedMoves(state, legalMoves)[0];

    for (let depth = 1; depth <= maxDepth; depth += 1) {
      try {
        const result = searchRoot(state, depth, aiColor, deadline, table, bestMove);
        if (result) bestMove = result.move;
        if (Math.abs(result?.score || 0) > MATE_SCORE - 100) break;
      } catch (error) {
        if (error.message !== "CHESS_SEARCH_TIMEOUT") throw error;
        break;
      }
    }
    return bestMove;
  }

  function squareName(square) {
    return `${FILES[colOf(square)]}${8 - rowOf(square)}`;
  }

  function moveName(move) {
    if (move.castle === "K") return "O-O";
    if (move.castle === "Q") return "O-O-O";
    return `${squareName(move.from)}-${squareName(move.to)}${move.promotion ? `=${move.promotion}` : ""}`;
  }

  global.CodeInChess = Object.freeze({
    COLORS,
    PIECE_SYMBOLS,
    createInitialState,
    cloneState,
    getLegalMoves,
    makeMove,
    isInCheck,
    getGameStatus,
    chooseChessMove,
    squareName,
    moveName,
  });
})(typeof window !== "undefined" ? window : globalThis);
