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

  focus() {}

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
  ];
  const elements = Object.fromEntries(ids.map((id) => [id, new FakeElement()]));
  const resultModal = new FakeElement();
  elements.homeScreen.classList.add("active");
  elements.resultOverlay.hidden = true;

  const document = {
    fullscreenElement: null,
    documentElement: new FakeElement("html"),
    getElementById: (id) => elements[id],
    querySelector: (selector) => (selector === ".result-modal" ? resultModal : null),
    createElement: (tagName) => new FakeElement(tagName),
    addEventListener() {},
    exitFullscreen() {},
  };

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
