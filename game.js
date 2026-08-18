(function runGame() {
  "use strict";

  const AI = window.CodeInAI;
  const Chess = window.CodeInChess;
  const OMOK_SIZE = 11;
  const STORAGE_KEY = "codein-ai-booth-stats-v1";
  const SOUND_KEY = "codein-ai-booth-sound-v1";

  const elements = {
    homeScreen: document.getElementById("homeScreen"),
    gameScreen: document.getElementById("gameScreen"),
    chooseTtt: document.getElementById("chooseTtt"),
    chooseOmok: document.getElementById("chooseOmok"),
    chooseChess: document.getElementById("chooseChess"),
    brandButton: document.getElementById("brandButton"),
    backButton: document.getElementById("backButton"),
    restartButton: document.getElementById("restartButton"),
    fullscreenButton: document.getElementById("fullscreenButton"),
    soundButton: document.getElementById("soundButton"),
    soundIcon: document.getElementById("soundIcon"),
    resetStatsButton: document.getElementById("resetStatsButton"),
    humanWins: document.getElementById("humanWins"),
    aiWins: document.getElementById("aiWins"),
    draws: document.getElementById("draws"),
    totalGames: document.getElementById("totalGames"),
    gameKicker: document.getElementById("gameKicker"),
    gameTitle: document.getElementById("gameTitle"),
    timerBox: document.getElementById("timerBox"),
    timerValue: document.getElementById("timerValue"),
    turnBanner: document.getElementById("turnBanner"),
    turnText: document.getElementById("turnText"),
    turnHint: document.getElementById("turnHint"),
    tttBoard: document.getElementById("tttBoard"),
    omokBoard: document.getElementById("omokBoard"),
    chessBoard: document.getElementById("chessBoard"),
    humanStone: document.getElementById("humanStone"),
    aiStone: document.getElementById("aiStone"),
    ruleTitle: document.getElementById("ruleTitle"),
    ruleText: document.getElementById("ruleText"),
    resultOverlay: document.getElementById("resultOverlay"),
    resultModal: document.querySelector(".result-modal"),
    resultSymbol: document.getElementById("resultSymbol"),
    resultKicker: document.getElementById("resultKicker"),
    resultTitle: document.getElementById("resultTitle"),
    resultMessage: document.getElementById("resultMessage"),
    resultGame: document.getElementById("resultGame"),
    resultTime: document.getElementById("resultTime"),
    resultMoves: document.getElementById("resultMoves"),
    nextPlayerButton: document.getElementById("nextPlayerButton"),
    changeGameButton: document.getElementById("changeGameButton"),
    confettiCanvas: document.getElementById("confettiCanvas"),
  };

  const state = {
    currentGame: null,
    board: [],
    active: false,
    aiThinking: false,
    moves: 0,
    startedAt: 0,
    deadline: 0,
    timerId: null,
    aiTimerId: null,
    resultTimerId: null,
    lastMove: null,
    winningCells: [],
    chess: null,
    chessSelected: null,
    chessLegalMoves: [],
    soundEnabled: safeStorageGet(SOUND_KEY) !== "off",
    stats: loadStats(),
  };

  let audioContext = null;

  function safeStorageGet(key) {
    try {
      return window.localStorage.getItem(key);
    } catch (_error) {
      return null;
    }
  }

  function safeStorageSet(key, value) {
    try {
      window.localStorage.setItem(key, value);
    } catch (_error) {
      // 일부 브라우저가 로컬 파일 저장을 제한해도 게임 진행은 유지한다.
    }
  }

  function loadStats() {
    try {
      const stored = JSON.parse(safeStorageGet(STORAGE_KEY));
      if (stored && ["human", "ai", "draw"].every((key) => Number.isFinite(stored[key]))) {
        return stored;
      }
    } catch (_error) {
      // 손상된 로컬 기록은 새 기록으로 안전하게 대체한다.
    }
    return { human: 0, ai: 0, draw: 0 };
  }

  function saveStats() {
    safeStorageSet(STORAGE_KEY, JSON.stringify(state.stats));
    renderStats();
  }

  function renderStats() {
    elements.humanWins.textContent = state.stats.human;
    elements.aiWins.textContent = state.stats.ai;
    elements.draws.textContent = state.stats.draw;
    elements.totalGames.textContent = state.stats.human + state.stats.ai + state.stats.draw;
  }

  function initializeBoards() {
    for (let index = 0; index < 9; index += 1) {
      const cell = document.createElement("button");
      cell.type = "button";
      cell.className = "ttt-cell";
      cell.dataset.index = String(index);
      cell.setAttribute("role", "gridcell");
      cell.dataset.baseLabel = `틱택토 ${Math.floor(index / 3) + 1}행 ${(index % 3) + 1}열`;
      cell.setAttribute("aria-label", cell.dataset.baseLabel);
      cell.addEventListener("click", () => handleTicTacToeClick(index));
      elements.tttBoard.appendChild(cell);
    }

    for (let row = 0; row < OMOK_SIZE; row += 1) {
      for (let col = 0; col < OMOK_SIZE; col += 1) {
        const cell = document.createElement("button");
        cell.type = "button";
        cell.className = "omok-cell";
        if (row === 0) cell.classList.add("edge-top");
        if (row === OMOK_SIZE - 1) cell.classList.add("edge-bottom");
        if (col === 0) cell.classList.add("edge-left");
        if (col === OMOK_SIZE - 1) cell.classList.add("edge-right");
        cell.dataset.row = String(row);
        cell.dataset.col = String(col);
        cell.setAttribute("role", "gridcell");
        cell.dataset.baseLabel = `오목 ${row + 1}행 ${col + 1}열`;
        cell.setAttribute("aria-label", cell.dataset.baseLabel);

        const preview = document.createElement("span");
        preview.className = "stone-preview";
        preview.setAttribute("aria-hidden", "true");
        cell.appendChild(preview);
        cell.addEventListener("click", () => handleOmokClick(row, col));
        elements.omokBoard.appendChild(cell);
      }
    }

    for (let index = 0; index < 64; index += 1) {
      const row = Math.floor(index / 8);
      const col = index % 8;
      const cell = document.createElement("button");
      cell.type = "button";
      cell.className = `chess-cell ${(row + col) % 2 ? "dark" : "light"}`;
      cell.dataset.index = String(index);
      cell.setAttribute("role", "gridcell");
      cell.dataset.baseLabel = `체스 ${Chess.squareName(index)}`;
      cell.setAttribute("aria-label", cell.dataset.baseLabel);
      cell.addEventListener("click", () => handleChessClick(index));
      elements.chessBoard.appendChild(cell);
    }
  }

  function showHome() {
    clearActiveTimers();
    state.active = false;
    state.aiThinking = false;
    state.currentGame = null;
    hideResult();
    elements.gameScreen.classList.remove("active");
    elements.homeScreen.classList.add("active");
    renderStats();
    elements.chooseTtt.focus({ preventScroll: true });
  }

  function startGame(game) {
    clearActiveTimers();
    hideResult();
    state.currentGame = game;
    state.active = true;
    state.aiThinking = false;
    state.moves = 0;
    state.startedAt = Date.now();
    state.lastMove = null;
    state.winningCells = [];
    state.chessSelected = null;
    state.chessLegalMoves = [];

    elements.homeScreen.classList.remove("active");
    elements.gameScreen.classList.add("active");
    elements.tttBoard.classList.toggle("active", game === "ttt");
    elements.omokBoard.classList.toggle("active", game === "omok");
    elements.chessBoard.classList.toggle("active", game === "chess");

    if (game === "ttt") {
      state.board = Array(9).fill(null);
      elements.gameKicker.textContent = "3 × 3 GRID CHALLENGE";
      elements.gameTitle.textContent = "AI 틱택토";
      elements.humanStone.textContent = "×";
      elements.aiStone.textContent = "○";
      elements.ruleTitle.innerHTML = "가로·세로·대각선으로<br>3칸을 먼저 연결하세요.";
      elements.ruleText.textContent = "당신이 선공입니다. 파란색 X로 플레이합니다.";
      renderTicTacToe();
      startCountdown(45);
    } else if (game === "omok") {
      state.board = Array.from({ length: OMOK_SIZE }, () => Array(OMOK_SIZE).fill(0));
      elements.gameKicker.textContent = "11 × 11 GOMOK CHALLENGE";
      elements.gameTitle.textContent = "AI 오목";
      elements.humanStone.textContent = "●";
      elements.aiStone.textContent = "○";
      elements.ruleTitle.innerHTML = "가로·세로·대각선으로<br>5개의 돌을 연결하세요.";
      elements.ruleText.textContent = "당신이 흑돌로 선공합니다. 제한 시간은 90초입니다.";
      renderOmok();
      startCountdown(90);
    } else {
      state.chess = Chess.createInitialState();
      elements.gameKicker.textContent = "8 × 8 CHESS CHALLENGE";
      elements.gameTitle.textContent = "AI 체스";
      elements.humanStone.textContent = "♙";
      elements.aiStone.textContent = "♟";
      elements.ruleTitle.innerHTML = "AI의 킹을<br>체크메이트하세요.";
      elements.ruleText.textContent = "당신이 백으로 선공합니다. 제한 시간은 3분입니다.";
      renderChess();
      startCountdown(180);
    }

    setTurn("human");
    playSound("start");
  }

  function clearActiveTimers() {
    if (state.timerId) window.clearInterval(state.timerId);
    if (state.aiTimerId) window.clearTimeout(state.aiTimerId);
    if (state.resultTimerId) window.clearTimeout(state.resultTimerId);
    state.timerId = null;
    state.aiTimerId = null;
    state.resultTimerId = null;
  }

  function startCountdown(seconds) {
    state.deadline = Date.now() + seconds * 1000;
    updateTimer();
    state.timerId = window.setInterval(updateTimer, 200);
  }

  function updateTimer() {
    if (!state.active) return;
    const remaining = Math.max(0, Math.ceil((state.deadline - Date.now()) / 1000));
    const minutes = Math.floor(remaining / 60);
    const seconds = remaining % 60;
    elements.timerValue.textContent = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
    elements.timerBox.classList.toggle("urgent", remaining <= 10);

    if (remaining <= 0) {
      finishGame("ai", "timeout", []);
    }
  }

  function setTurn(turn) {
    const isAI = turn === "ai";
    state.aiThinking = isAI;
    elements.turnBanner.classList.toggle("ai-turn", isAI);
    elements.turnText.textContent = isAI ? "AI가 다음 수를 계산 중입니다" : "당신의 차례입니다";
    elements.turnHint.textContent = isAI
      ? "잠시만 기다려주세요"
      : state.currentGame === "ttt"
        ? "빈칸을 선택하세요"
        : state.currentGame === "omok"
          ? "교차점에 흑돌을 놓으세요"
          : "백 기물을 선택하세요";
    updateBoardAvailability();
  }

  function updateBoardAvailability() {
    if (state.currentGame === "ttt") {
      [...elements.tttBoard.children].forEach((cell, index) => {
        cell.disabled = !state.active || state.aiThinking || Boolean(state.board[index]);
      });
    } else if (state.currentGame === "omok") {
      [...elements.omokBoard.children].forEach((cell) => {
        const row = Number(cell.dataset.row);
        const col = Number(cell.dataset.col);
        cell.disabled = !state.active || state.aiThinking || Boolean(state.board[row][col]);
      });
    } else if (state.currentGame === "chess") {
      const targetSquares = new Set(state.chessLegalMoves.map((move) => move.to));
      [...elements.chessBoard.children].forEach((cell, index) => {
        const piece = state.chess?.board[index];
        const selectablePiece = piece?.[0] === Chess.COLORS.WHITE;
        const selectableTarget = state.chessSelected !== null && targetSquares.has(index);
        cell.disabled = !state.active || state.aiThinking || (!selectablePiece && !selectableTarget);
      });
    }
  }

  function handleTicTacToeClick(index) {
    if (!state.active || state.aiThinking || state.currentGame !== "ttt" || state.board[index]) return;

    state.board[index] = "X";
    state.lastMove = { index, player: "X" };
    state.moves += 1;
    playSound("move");
    renderTicTacToe();

    const result = AI.getTicTacToeResult(state.board);
    if (result.winner === "X") {
      finishGame("human", "win", result.line);
      return;
    }
    if (result.draw) {
      finishGame("draw", "draw", []);
      return;
    }

    setTurn("ai");
    state.aiTimerId = window.setTimeout(makeTicTacToeAiMove, 470);
  }

  function makeTicTacToeAiMove() {
    if (!state.active || state.currentGame !== "ttt") return;
    const move = AI.chooseTicTacToeMove(state.board);
    if (move === null) {
      finishGame("draw", "draw", []);
      return;
    }

    state.board[move] = "O";
    state.lastMove = { index: move, player: "O" };
    state.moves += 1;
    playSound("ai");
    renderTicTacToe();

    const result = AI.getTicTacToeResult(state.board);
    if (result.winner === "O") {
      finishGame("ai", "win", result.line);
      return;
    }
    if (result.draw) {
      finishGame("draw", "draw", []);
      return;
    }
    setTurn("human");
  }

  function renderTicTacToe() {
    [...elements.tttBoard.children].forEach((cell, index) => {
      const value = state.board[index];
      cell.textContent = value === "X" ? "×" : value === "O" ? "○" : "";
      cell.classList.toggle("x", value === "X");
      cell.classList.toggle("o", value === "O");
      cell.classList.toggle("win", state.winningCells.includes(index));
      cell.classList.toggle("pop", state.lastMove?.index === index);
      cell.setAttribute("aria-label", value ? `${value} 돌이 놓인 칸` : cell.dataset.baseLabel);
    });
    updateBoardAvailability();
  }

  function handleOmokClick(row, col) {
    if (!state.active || state.aiThinking || state.currentGame !== "omok" || state.board[row][col]) return;

    state.board[row][col] = 1;
    state.lastMove = { row, col, player: 1 };
    state.moves += 1;
    playSound("move");
    renderOmok();

    const result = AI.checkOmokWin(state.board, row, col, 1);
    if (result.won) {
      finishGame("human", "win", result.cells);
      return;
    }
    if (isOmokBoardFull()) {
      finishGame("draw", "draw", []);
      return;
    }

    setTurn("ai");
    state.aiTimerId = window.setTimeout(makeOmokAiMove, 430);
  }

  function makeOmokAiMove() {
    if (!state.active || state.currentGame !== "omok") return;
    const move = AI.chooseOmokMove(state.board);
    if (!move) {
      finishGame("draw", "draw", []);
      return;
    }

    const [row, col] = move;
    state.board[row][col] = 2;
    state.lastMove = { row, col, player: 2 };
    state.moves += 1;
    playSound("ai");
    renderOmok();

    const result = AI.checkOmokWin(state.board, row, col, 2);
    if (result.won) {
      finishGame("ai", "win", result.cells);
      return;
    }
    if (isOmokBoardFull()) {
      finishGame("draw", "draw", []);
      return;
    }
    setTurn("human");
  }

  function isOmokBoardFull() {
    return state.board.every((row) => row.every(Boolean));
  }

  function renderOmok() {
    [...elements.omokBoard.children].forEach((cell) => {
      const row = Number(cell.dataset.row);
      const col = Number(cell.dataset.col);
      const value = state.board[row][col];
      const isLast = state.lastMove?.row === row && state.lastMove?.col === col;
      const isWinner = state.winningCells.some(([r, c]) => r === row && c === col);
      const previousStone = cell.querySelector(".stone");
      if (previousStone) previousStone.remove();
      cell.setAttribute("aria-label", cell.dataset.baseLabel);

      if (value) {
        const stone = document.createElement("span");
        stone.className = `stone ${value === 1 ? "black" : "white"}`;
        if (isLast) stone.classList.add("last", "pop");
        if (isWinner) stone.classList.add("win");
        stone.setAttribute("aria-hidden", "true");
        cell.appendChild(stone);
        cell.setAttribute("aria-label", `${row + 1}행 ${col + 1}열 ${value === 1 ? "흑돌" : "백돌"}`);
      }
    });
    updateBoardAvailability();
  }

  function handleChessClick(index) {
    if (
      !state.active
      || state.aiThinking
      || state.currentGame !== "chess"
      || state.chess.turn !== Chess.COLORS.WHITE
    ) return;

    const piece = state.chess.board[index];
    if (piece?.[0] === Chess.COLORS.WHITE) {
      state.chessSelected = index;
      state.chessLegalMoves = Chess.getLegalMoves(state.chess).filter((move) => move.from === index);
      playSound("move");
      renderChess();
      return;
    }

    const move = state.chessLegalMoves.find((candidate) => candidate.to === index);
    if (!move) return;

    state.chess = Chess.makeMove(state.chess, move);
    state.chessSelected = null;
    state.chessLegalMoves = [];
    state.moves += 1;
    playSound("move");
    renderChess();

    if (finishChessIfEnded()) return;
    setTurn("ai");
    state.aiTimerId = window.setTimeout(makeChessAiMove, 300);
  }

  function makeChessAiMove() {
    if (!state.active || state.currentGame !== "chess" || state.chess.turn !== Chess.COLORS.BLACK) return;
    const move = Chess.chooseChessMove(state.chess, Chess.COLORS.BLACK, {
      maxDepth: 5,
      timeLimitMs: 1200,
    });
    if (!move) {
      finishChessIfEnded();
      return;
    }

    state.chess = Chess.makeMove(state.chess, move);
    state.moves += 1;
    playSound("ai");
    renderChess();

    if (finishChessIfEnded()) return;
    setTurn("human");
  }

  function finishChessIfEnded() {
    const status = Chess.getGameStatus(state.chess);
    if (!status.over) return false;
    const winner = status.winner === Chess.COLORS.WHITE
      ? "human"
      : status.winner === Chess.COLORS.BLACK
        ? "ai"
        : "draw";
    finishGame(winner, status.reason, []);
    return true;
  }

  function renderChess() {
    if (!state.chess) return;
    const legalTargets = new Map(state.chessLegalMoves.map((move) => [move.to, move]));
    const lastMove = state.chess.lastMove;

    [...elements.chessBoard.children].forEach((cell, index) => {
      const row = Math.floor(index / 8);
      const col = index % 8;
      const piece = state.chess.board[index];
      const targetMove = legalTargets.get(index);
      const isLastMove = lastMove && (lastMove.from === index || lastMove.to === index);
      const isCheckedKing = piece?.[1] === "K" && Chess.isInCheck(state.chess, piece[0]);

      cell.className = `chess-cell ${(row + col) % 2 ? "dark" : "light"}`;
      if (piece?.[0] === Chess.COLORS.WHITE) cell.classList.add("white-piece");
      if (piece?.[0] === Chess.COLORS.BLACK) cell.classList.add("black-piece");
      if (state.chessSelected === index) cell.classList.add("selected");
      if (targetMove) cell.classList.add("legal-target");
      if (targetMove && (state.chess.board[index] || targetMove.enPassant)) cell.classList.add("capture-target");
      if (isLastMove) cell.classList.add("last-move");
      if (isCheckedKing) cell.classList.add("check");

      cell.textContent = piece ? Chess.PIECE_SYMBOLS[piece] : "";
      cell.setAttribute(
        "aria-label",
        piece
          ? `${Chess.squareName(index)} ${chessPieceName(piece)}`
          : cell.dataset.baseLabel,
      );
    });
    updateBoardAvailability();
  }

  function chessPieceName(piece) {
    const color = piece[0] === Chess.COLORS.WHITE ? "백" : "흑";
    const names = { K: "킹", Q: "퀸", R: "룩", B: "비숍", N: "나이트", P: "폰" };
    return `${color} ${names[piece[1]]}`;
  }

  function finishGame(winner, reason, winningCells) {
    if (!state.active) return;
    state.active = false;
    state.aiThinking = false;
    state.winningCells = winningCells;
    if (state.timerId) window.clearInterval(state.timerId);
    if (state.aiTimerId) window.clearTimeout(state.aiTimerId);
    state.timerId = null;
    state.aiTimerId = null;
    elements.timerBox.classList.remove("urgent");

    if (state.currentGame === "ttt") renderTicTacToe();
    else if (state.currentGame === "omok") renderOmok();
    else renderChess();

    if (winner === "human") state.stats.human += 1;
    else if (winner === "ai") state.stats.ai += 1;
    else state.stats.draw += 1;
    saveStats();

    if (winner === "human") {
      playSound("win");
      launchConfetti();
    } else {
      playSound(winner === "draw" ? "draw" : "lose");
    }

    state.resultTimerId = window.setTimeout(() => showResult(winner, reason), 520);
  }

  function showResult(winner, reason) {
    const isHuman = winner === "human";
    const isDraw = winner === "draw";
    const gameName = state.currentGame === "ttt"
      ? "틱택토"
      : state.currentGame === "omok"
        ? "오목"
        : "체스";

    elements.resultModal.className = `result-modal ${isHuman ? "win" : isDraw ? "draw" : "lose"}`;
    elements.resultSymbol.textContent = isHuman ? "★" : isDraw ? "=" : "×";
    elements.resultKicker.textContent = isHuman ? "HUMAN WIN" : isDraw ? "DRAW GAME" : "AI WIN";
    elements.resultTitle.textContent = isHuman
      ? "AI를 이겼습니다!"
      : isDraw
        ? "팽팽한 무승부입니다"
        : reason === "timeout"
          ? "시간이 종료되었습니다"
          : "아쉽게도 AI의 승리!";
    elements.resultMessage.textContent = isHuman
      ? "축하합니다. 운영진에게 이 승리 화면을 보여주세요!"
      : isDraw
        ? "승리에 아주 가까웠습니다. 다음 도전을 기다릴게요."
        : "좋은 승부였습니다. 다음 인간 대표가 이어서 도전합니다.";
    elements.resultGame.textContent = gameName;
    elements.resultTime.textContent = formatElapsed(Date.now() - state.startedAt);
    elements.resultMoves.textContent = `${state.moves}수`;
    elements.resultOverlay.hidden = false;
    elements.nextPlayerButton.focus({ preventScroll: true });
  }

  function hideResult() {
    elements.resultOverlay.hidden = true;
  }

  function formatElapsed(milliseconds) {
    const total = Math.max(0, Math.round(milliseconds / 1000));
    const minutes = Math.floor(total / 60);
    const seconds = total % 60;
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  function toggleSound() {
    state.soundEnabled = !state.soundEnabled;
    safeStorageSet(SOUND_KEY, state.soundEnabled ? "on" : "off");
    renderSoundButton();
    if (state.soundEnabled) playSound("move");
  }

  function renderSoundButton() {
    elements.soundButton.classList.toggle("active", state.soundEnabled);
    elements.soundButton.setAttribute("aria-label", state.soundEnabled ? "소리 끄기" : "소리 켜기");
    elements.soundIcon.textContent = state.soundEnabled ? "♪" : "×";
  }

  function playSound(type) {
    if (!state.soundEnabled) return;
    try {
      audioContext ||= new (window.AudioContext || window.webkitAudioContext)();
      const now = audioContext.currentTime;
      const tones = {
        start: [[440, 0], [660, 0.08]],
        move: [[330, 0]],
        ai: [[220, 0], [280, 0.06]],
        win: [[523, 0], [659, 0.09], [784, 0.18], [1046, 0.28]],
        lose: [[300, 0], [230, 0.12], [175, 0.24]],
        draw: [[350, 0], [350, 0.12]],
      };

      (tones[type] || tones.move).forEach(([frequency, delay], index) => {
        const oscillator = audioContext.createOscillator();
        const gain = audioContext.createGain();
        oscillator.type = type === "move" ? "sine" : "triangle";
        oscillator.frequency.value = frequency;
        gain.gain.setValueAtTime(0.0001, now + delay);
        gain.gain.exponentialRampToValueAtTime(index === 0 ? 0.07 : 0.055, now + delay + 0.012);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + delay + 0.14);
        oscillator.connect(gain);
        gain.connect(audioContext.destination);
        oscillator.start(now + delay);
        oscillator.stop(now + delay + 0.16);
      });
    } catch (_error) {
      // 소리를 지원하지 않는 브라우저에서도 게임은 정상 진행된다.
    }
  }

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  }

  function launchConfetti() {
    const canvas = elements.confettiCanvas;
    const context = canvas.getContext("2d");
    const ratio = window.devicePixelRatio || 1;
    canvas.width = window.innerWidth * ratio;
    canvas.height = window.innerHeight * ratio;
    context.scale(ratio, ratio);

    const colors = ["#2563eb", "#60a5fa", "#34d399", "#fbbf24", "#f8fafc"];
    const particles = Array.from({ length: 120 }, () => ({
      x: window.innerWidth / 2 + (Math.random() - 0.5) * 160,
      y: window.innerHeight * 0.34,
      vx: (Math.random() - 0.5) * 12,
      vy: -Math.random() * 9 - 3,
      gravity: 0.18 + Math.random() * 0.08,
      size: 5 + Math.random() * 7,
      rotation: Math.random() * Math.PI,
      spin: (Math.random() - 0.5) * 0.28,
      color: colors[Math.floor(Math.random() * colors.length)],
      alpha: 1,
    }));

    const started = performance.now();
    function animate(now) {
      context.clearRect(0, 0, window.innerWidth, window.innerHeight);
      const elapsed = now - started;
      for (const particle of particles) {
        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.vy += particle.gravity;
        particle.rotation += particle.spin;
        if (elapsed > 1200) particle.alpha = Math.max(0, 1 - (elapsed - 1200) / 700);

        context.save();
        context.globalAlpha = particle.alpha;
        context.translate(particle.x, particle.y);
        context.rotate(particle.rotation);
        context.fillStyle = particle.color;
        context.fillRect(-particle.size / 2, -particle.size / 3, particle.size, particle.size * 0.66);
        context.restore();
      }

      if (elapsed < 1950) requestAnimationFrame(animate);
      else context.clearRect(0, 0, window.innerWidth, window.innerHeight);
    }
    requestAnimationFrame(animate);
  }

  function resetStats() {
    if (!window.confirm("이 노트북에 저장된 오늘의 대결 기록을 모두 초기화할까요?")) return;
    state.stats = { human: 0, ai: 0, draw: 0 };
    saveStats();
  }

  function handleKeyboard(event) {
    const key = event.key.toLowerCase();
    if (!elements.resultOverlay.hidden) {
      if (key === "enter") startGame(state.currentGame);
      if (key === "escape") showHome();
      return;
    }

    if (elements.homeScreen.classList.contains("active")) {
      if (key === "t") startGame("ttt");
      if (key === "o") startGame("omok");
      if (key === "c") startGame("chess");
      if (key === "f") toggleFullscreen();
      return;
    }

    if (key === "r") startGame(state.currentGame);
    if (key === "escape") showHome();
  }

  function bindEvents() {
    elements.chooseTtt.addEventListener("click", () => startGame("ttt"));
    elements.chooseOmok.addEventListener("click", () => startGame("omok"));
    elements.chooseChess.addEventListener("click", () => startGame("chess"));
    elements.brandButton.addEventListener("click", showHome);
    elements.backButton.addEventListener("click", showHome);
    elements.restartButton.addEventListener("click", () => startGame(state.currentGame));
    elements.nextPlayerButton.addEventListener("click", () => startGame(state.currentGame));
    elements.changeGameButton.addEventListener("click", showHome);
    elements.fullscreenButton.addEventListener("click", toggleFullscreen);
    elements.soundButton.addEventListener("click", toggleSound);
    elements.resetStatsButton.addEventListener("click", resetStats);
    document.addEventListener("keydown", handleKeyboard);
    document.addEventListener("fullscreenchange", () => {
      elements.fullscreenButton.classList.toggle("active", Boolean(document.fullscreenElement));
    });
  }

  initializeBoards();
  bindEvents();
  renderStats();
  renderSoundButton();
})();
