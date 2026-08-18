const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const htmlPath = path.join(root, "index.html");
const outputPath = path.join(root, "CODEIN_VS_AI.html");

let html = fs.readFileSync(htmlPath, "utf8");
const css = fs.readFileSync(path.join(root, "styles.css"), "utf8");
const ai = fs.readFileSync(path.join(root, "ai.js"), "utf8");
const chess = fs.readFileSync(path.join(root, "chess.js"), "utf8");
const game = fs.readFileSync(path.join(root, "game.js"), "utf8");

html = html
  .replace('<link rel="stylesheet" href="styles.css" />', `<style>\n${css}\n</style>`)
  .replace('<script src="ai.js"></script>', `<script>\n${ai}\n</script>`)
  .replace('<script src="chess.js"></script>', `<script>\n${chess}\n</script>`)
  .replace('<script src="game.js"></script>', `<script>\n${game}\n</script>`);

fs.writeFileSync(outputPath, html, "utf8");
console.log(`Built ${path.basename(outputPath)}`);
