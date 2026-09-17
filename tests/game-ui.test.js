const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

require("../ai.js");
require("../chess.js");

const CoreAI = globalThis.CodeInAI;
const CoreChess = globalThis.CodeInChess;

class FakeElement {
  constructor(tagName = "div") {
    this.tagName = tagName;
    this.dataset = {};
    this.children = [];
    this.parent = null;
    this.listeners = new Map();
    this.attributes = new Map();
    this.disabled = false;
    this.hidden = false;
    this.textContent = "";
    this.innerHTML = "";
    this._classes = new Set();
    this.classList = {
      add: (...names) => names.forEach((name) => this._classes.add(name)),
      remove: (...names) => names.forEach((name) => this._classes.delete(name)),
      contains: (name) => this._classes.has(name),
      toggle: (name, force) => {
        const enabled = force === undefined ? !this._classes.has(name) : Boolean(force);
        if (enabled) this._classes.add(name);
        else this._classes.delete(name);
        return enabled;
      },
    };
  }

  set className(value) {
    this._classes = new Set(String(value).split(/\s+/).filter(Boolean));
  }

  get className() {
    return [...this._classes].join(" ");
  }

  appendChild(child) {
    child.parent = this;
    this.children.push(child);
    return child;
  }

  remove() {
    if (!this.parent) return;
    this.parent.children = this.parent.children.filter((child) => child !== this);
    this.parent = null;
  }

  addEventListener(type, listener) {
    if (!this.listeners.has(type)) this.listeners.set(type, []);
    this.listeners.get(type).push(listener);
  }

  click() {
    if (this.disabled) return;
    for (const listener of this.listeners.get("click") || []) listener({ target: this });
  }

  setAttribute(name, value) {
    this.attributes.set(name, String(value));
  }

  querySelector(selector) {
    if (!selector.startsWith(".")) return null;
    const className = selector.slice(1);
    return this.children.find((child) => child.classList.contains(className)) || null;
  }

  focus() {
    if (this.ownerDocument) this.ownerDocument.activeElement = this;
  }

  getContext() {
    return {
      clearRect() {}, fillRect() {}, save() {}, restore() {},
      scale() {}, translate() {}, rotate() {},
      set globalAlpha(_value) {}, set fillStyle(_value) {},
    };
  }
}

function createHarness() {
  let now = 1_000_000;
  let nextTimerId = 1;
  const intervals = new Map();
  const timeouts = new Map();
  const ids = [
    "homeScreen", "gameScreen", "chooseTtt", "chooseOmok", "chooseChess",
    "chooseConnect4", "brandButton", "backButton", "restartButton",
    "fullscreenButton", "soundButton", "soundIcon", "resetStatsButton",
    "humanWins", "aiWins", "draws", "totalGames", "gameKicker", "gameTitle",
    "timerBox", "timerValue", "turnBanner", "turnText", "turnHint", "tttBoard",
    "omokBoard", "chessBoard", "connect4Board", "humanStone", "aiStone",
    "ruleTitle", "ruleText", "resultOverlay", "resultSymbol", "resultKicker",
    "resultTitle", "resultMessage", "resultGame", "resultTime", "resultMoves",
    "nextPlayerButton", "changeGameButton", "confettiCanvas",
    "timeSelectOverlay", "timeSelectGame", "chooseTime2", "chooseTime5",
    "chooseTime10", "cancelTimeSelection",
  ];
  const elements = Object.fromEntries(ids.map((id) => [id, new FakeElement()]));
  const resultModal = new FakeElement();
  elements.homeScreen.classList.add("active");
  elements.resultOverlay.hidden = true;
  elements.timeSelectOverlay.hidden = true;
  const documentListeners = new Map();

  const document = {
    activeElement: null,
    fullscreenElement: null,
    documentElement: new FakeElement("html"),
    getElementById: (id) => elements[id],
    querySelector: (selector) => (selector === ".result-modal" ? resultModal : null),
    createElement(tagName) {
      const element = new FakeElement(tagName);
      element.ownerDocument = document;
      return element;
    },
    addEventListener(type, listener) {
      if (!documentListeners.has(type)) documentListeners.set(type, []);
      documentListeners.get(type).push(listener);
    },
    exitFullscreen() {},
  };
  for (const element of Object.values(elements)) element.ownerDocument = document;

  class FakeDate extends Date {
    static now() { return now; }
  }

  const storage = new Map([["codein-ai-booth-sound-v1", "off"]]);
  const window = {
    CodeInAI: {
      ...CoreAI,
      chooseOmokMove(board) {
        for (let row = 0; row < board.length; row += 1) {
          for (let col = 0; col < board.length; col += 1) {
            if (!board[row][col]) return [row, col];
          }
        }
        return null;
      },
      chooseConnect4Move(board) {
        return CoreAI.getConnect4ValidColumns(board)[0] ?? null;
      },
    },
    CodeInChess: {
      ...CoreChess,
      chooseChessMove(state) {
        return CoreChess.getLegalMoves(state)[0] || null;
      },
    },
    localStorage: {
      getItem: (key) => storage.get(key) ?? null,
      setItem: (key, value) => storage.set(key, value),
    },
    setInterval(callback) {
      const id = nextTimerId++;
      intervals.set(id, callback);
      return id;
    },
    clearInterval: (id) => intervals.delete(id),
    setTimeout(callback, delay = 0) {
      const id = nextTimerId++;
      timeouts.set(id, { callback, due: now + delay });
      return id;
    },
    clearTimeout: (id) => timeouts.delete(id),
    innerWidth: 1440,
    innerHeight: 900,
    devicePixelRatio: 1,
    confirm: () => true,
  };
  window.window = window;

  const context = vm.createContext({
    window,
    document,
    Date: FakeDate,
    Math,
    console,
    performance: { now: () => now },
    requestAnimationFrame: () => 0,
  });
  const source = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
  vm.runInContext(source, context);

  return {
    elements,
    document,
    intervalCount: () => intervals.size,
    pressKey(key, options = {}) {
      const event = { key, shiftKey: false, preventDefault() {}, ...options };
      for (const listener of documentListeners.get("keydown") || []) listener(event);
    },
    advance(milliseconds) {
      now += milliseconds;
      for (const callback of intervals.values()) callback();
    },
    runNextTimeout() {
      const next = [...timeouts.entries()].sort((a, b) => a[1].due - b[1].due)[0];
      assert.ok(next, "실행할 AI 타이머가 있어야 한다");
      timeouts.delete(next[0]);
      next[1].callback();
    },
  };
}

test("4목에서 플레이어 원판은 AI가 둔 뒤에도 사라지지 않는다", () => {
  const app = createHarness();
  app.elements.chooseConnect4.click();
  app.elements.chooseTime2.click();
  app.elements.connect4Board.children[3].click();

  const humanDisc = app.elements.connect4Board.children[5 * 7 + 3];
  assert.equal(humanDisc.classList.contains("human"), true);
  app.advance(1_000);
  assert.equal(humanDisc.classList.contains("human"), true);

  app.runNextTimeout();
  assert.equal(humanDisc.classList.contains("human"), true);
  assert.equal(
    app.elements.connect4Board.children.filter((cell) => cell.classList.contains("ai")).length,
    1,
  );
});

test("4목 원판 강조 효과는 원판을 숨기거나 이동시키지 않는다", () => {
  const css = fs.readFileSync(path.join(__dirname, "..", "styles.css"), "utf8");
  const animation = css.match(/@keyframes disc-settle\s*\{([\s\S]*?)\n\}/)?.[1] || "";
  assert.ok(animation);
  assert.doesNotMatch(animation, /opacity|translate/);
});

test("오목은 AI가 생각하는 동안 플레이어 시간이 멈춘다", () => {
  const app = createHarness();
  app.elements.chooseOmok.click();
  app.elements.chooseTime2.click();
  app.advance(1_050);
  assert.equal(app.elements.timerValue.textContent, "01:59");

  app.elements.omokBoard.children[5 * 11 + 5].click();
  const pausedTime = app.elements.timerValue.textContent;
  app.advance(5_000);
  assert.equal(app.elements.timerValue.textContent, pausedTime);

  app.runNextTimeout();
  app.advance(1_050);
  assert.equal(app.elements.timerValue.textContent, "01:58");
});

test("체스는 AI가 생각하는 동안 플레이어 시간이 멈춘다", () => {
  const app = createHarness();
  app.elements.chooseChess.click();
  app.elements.chooseTime5.click();
  app.advance(1_050);
  assert.equal(app.elements.timerValue.textContent, "04:59");

  app.elements.chessBoard.children[52].click();
  app.elements.chessBoard.children[36].click();
  const pausedTime = app.elements.timerValue.textContent;
  app.advance(5_000);
  assert.equal(app.elements.timerValue.textContent, pausedTime);

  app.runNextTimeout();
  app.advance(1_050);
  assert.equal(app.elements.timerValue.textContent, "04:58");
});

const GAME_CHOICES = [
  { button: "chooseTtt", name: "AI 틱택토" },
  { button: "chooseOmok", name: "AI 오목" },
  { button: "chooseChess", name: "AI 체스" },
  { button: "chooseConnect4", name: "AI 4목" },
];
const TIME_CHOICES = [
  { button: "chooseTime2", minutes: 2, display: "02:00" },
  { button: "chooseTime5", minutes: 5, display: "05:00" },
  { button: "chooseTime10", minutes: 10, display: "10:00" },
];

for (const game of GAME_CHOICES) {
  for (const time of TIME_CHOICES) {
    test(`${game.name} 진입 후 ${time.minutes}분을 선택하면 해당 시간으로 시작한다`, () => {
      const app = createHarness();
      app.elements[game.button].click();
      assert.equal(app.elements.timeSelectOverlay.hidden, false);
      assert.equal(app.elements.timeSelectGame.textContent, game.name);
      assert.equal(app.elements.gameScreen.classList.contains("active"), false);
      assert.equal(app.intervalCount(), 0);
      app.advance(20_000);
      assert.equal(app.elements.timerValue.textContent, "");

      app.elements[time.button].click();
      assert.equal(app.elements.timeSelectOverlay.hidden, true);
      assert.equal(app.elements.gameScreen.classList.contains("active"), true);
      assert.equal(app.elements.gameTitle.textContent, game.name);
      assert.equal(app.elements.timerValue.textContent, time.display);
      assert.ok(app.elements.ruleText.textContent.includes(`${time.minutes}분`));
      assert.equal(app.intervalCount(), 1);
    });
  }
}

test("시간 선택을 취소하면 게임과 타이머가 시작되지 않는다", () => {
  const app = createHarness();
  app.elements.chooseChess.click();
  app.elements.cancelTimeSelection.click();
  app.elements.chooseTime10.click();
  app.advance(20_000);
  assert.equal(app.elements.timeSelectOverlay.hidden, true);
  assert.equal(app.elements.homeScreen.classList.contains("active"), true);
  assert.equal(app.elements.gameScreen.classList.contains("active"), false);
  assert.equal(app.intervalCount(), 0);
  assert.equal(app.document.activeElement, app.elements.chooseChess);
});

test("시간 선택 창에서는 Tab 초점이 창 안에 머물고 Escape로 취소한다", () => {
  const app = createHarness();
  app.elements.chooseOmok.click();
  assert.equal(app.document.activeElement, app.elements.chooseTime2);
  app.pressKey("Tab", { shiftKey: true });
  assert.equal(app.document.activeElement, app.elements.cancelTimeSelection);
  app.pressKey("Tab");
  assert.equal(app.document.activeElement, app.elements.chooseTime2);
  app.pressKey("t");
  assert.equal(app.elements.timeSelectGame.textContent, "AI 오목");
  app.pressKey("Escape");
  assert.equal(app.elements.timeSelectOverlay.hidden, true);
  assert.equal(app.document.activeElement, app.elements.chooseOmok);
  assert.equal(app.intervalCount(), 0);
});

test("현재 게임 재시작은 선택한 시간을 유지하고 보드를 초기화한다", () => {
  const app = createHarness();
  app.elements.chooseConnect4.click();
  app.elements.chooseTime10.click();
  app.elements.connect4Board.children[3].click();
  app.advance(10_000);
  app.elements.restartButton.click();
  assert.equal(app.elements.timerValue.textContent, "10:00");
  assert.equal(app.elements.timeSelectOverlay.hidden, true);
  assert.equal(app.intervalCount(), 1);
  assert.equal(
    app.elements.connect4Board.children.filter((cell) => (
      cell.classList.contains("human") || cell.classList.contains("ai")
    )).length,
    0,
  );
});

test("다음 참가자는 시간을 다시 선택하고 선택 창 취소 시 결과를 유지한다", () => {
  const app = createHarness();
  app.elements.chooseTtt.click();
  app.elements.chooseTime2.click();
  app.advance(120_001);
  app.runNextTimeout();
  assert.equal(app.elements.resultOverlay.hidden, false);
  app.elements.nextPlayerButton.click();
  assert.equal(app.elements.timeSelectOverlay.hidden, false);
  app.elements.cancelTimeSelection.click();
  assert.equal(app.elements.resultOverlay.hidden, false);
  assert.equal(app.document.activeElement, app.elements.nextPlayerButton);

  app.pressKey("Enter");
  assert.equal(app.elements.timeSelectOverlay.hidden, false);
  app.elements.chooseTime5.click();
  assert.equal(app.elements.timerValue.textContent, "05:00");
  assert.equal(app.elements.resultOverlay.hidden, true);
  assert.equal(app.elements.gameTitle.textContent, "AI 틱택토");
});

test("게임 선택과 재시작 단축키도 시간 선택을 동일하게 적용한다", () => {
  const app = createHarness();
  app.pressKey("c");
  assert.equal(app.elements.timeSelectGame.textContent, "AI 체스");
  app.elements.chooseTime10.click();
  app.advance(20_000);
  app.pressKey("r");
  assert.equal(app.elements.timerValue.textContent, "10:00");
  app.pressKey("Escape");
  assert.equal(app.elements.homeScreen.classList.contains("active"), true);
  assert.equal(app.intervalCount(), 0);
  app.pressKey("4");
  assert.equal(app.elements.timeSelectGame.textContent, "AI 4목");
});

for (const game of ["omok", "chess"]) {
  for (const time of TIME_CHOICES) {
    test(`${game}의 ${time.minutes}분 선택에서도 AI 차례 시간 정지와 재개를 유지한다`, () => {
      const app = createHarness();
      app.elements[game === "omok" ? "chooseOmok" : "chooseChess"].click();
      app.elements[time.button].click();
      app.advance(1_050);
      if (game === "omok") {
        app.elements.omokBoard.children[5 * 11 + 5].click();
      } else {
        app.elements.chessBoard.children[52].click();
        app.elements.chessBoard.children[36].click();
      }
      const pausedTime = app.elements.timerValue.textContent;
      app.advance(30_000);
      assert.equal(app.elements.timerValue.textContent, pausedTime);
      app.runNextTimeout();
      app.advance(1_050);
      const remainingSeconds = time.minutes * 60 - 2;
      const expected = `${String(Math.floor(remainingSeconds / 60)).padStart(2, "0")}:${String(remainingSeconds % 60).padStart(2, "0")}`;
      assert.equal(app.elements.timerValue.textContent, expected);
    });
  }
}

test("틱택토와 4목의 기존 전체 시간 카운트 방식은 바뀌지 않는다", () => {
  for (const game of ["ttt", "connect4"]) {
    const app = createHarness();
    app.elements[game === "ttt" ? "chooseTtt" : "chooseConnect4"].click();
    app.elements.chooseTime2.click();
    app.elements[game === "ttt" ? "tttBoard" : "connect4Board"].children[0].click();
    app.advance(2_050);
    assert.equal(app.elements.timerValue.textContent, "01:58");
  }
});

for (const time of TIME_CHOICES) {
  test(`${time.minutes}분 선택은 실제 제한 시간 경계에서 종료한다`, () => {
    const app = createHarness();
    app.elements.chooseTtt.click();
    app.elements[time.button].click();
    app.advance(time.minutes * 60 * 1_000 - 1);
    assert.equal(app.elements.timerValue.textContent, "00:01");
    assert.equal(app.intervalCount(), 1);
    app.advance(2);
    assert.equal(app.elements.timerValue.textContent, "00:00");
    assert.equal(app.intervalCount(), 0);
    app.runNextTimeout();
    assert.equal(app.elements.resultTitle.textContent, "시간이 종료되었습니다");
  });
}

test("오목 AI 차례에 재시작해도 선택한 시간과 플레이어 타이머를 초기화한다", () => {
  const app = createHarness();
  app.elements.chooseOmok.click();
  app.elements.chooseTime5.click();
  app.elements.omokBoard.children[5 * 11 + 5].click();
  app.advance(30_000);
  app.elements.restartButton.click();
  assert.equal(app.elements.timerValue.textContent, "05:00");
  app.advance(1_050);
  assert.equal(app.elements.timerValue.textContent, "04:59");
});
