// 配色（グローバル変数）
let fgColor = "#ebebd3";         // 線や文字の色
let bgColor = "#083d77";         // 背景色
let polyFillColor = "#083d77";   // 多角形の塗り色（背景色と同じ色）

let inputField, button, saveButton, gifButton;
let sequence = "aiwertunoaapmoa"; // 初期入力文字列（固定長推奨）
let chain = [];                  // ノード情報の配列
let zigzagSign = 1;              // ジグザグ用符号
let cnv;                         // キャンバス

function setup() {
  // キャンバス作成
  cnv = createCanvas(windowWidth, windowHeight);
  angleMode(RADIANS);
  background(bgColor);
  
  // コントロール用コンテナ（index.html の #controls）に親子関係を設定
  let controlsDiv = select('#controls');
  
  // UI 部品の生成と配置（親を controlsDiv に設定）
  inputField = createInput(sequence);
  inputField.parent(controlsDiv);
  
  button = createButton("Generate");
  button.parent(controlsDiv);
  button.mousePressed(generateStructure);
  
  saveButton = createButton("Save Image");
  saveButton.parent(controlsDiv);
  saveButton.mousePressed(saveImage);
  
  generateStructure();
}

function generateStructure() {
  // 入力文字列を小文字に統一して取得
  sequence = inputField.value().toLowerCase();
  
  // アルファベット以外が混ざっている場合はエラー表示
  if (!/^[a-z]+$/.test(sequence)) {
    alert("エラー: アルファベットのみを入力してください。");
    return;
  }
  
  // 文字列から乱数シードを生成（同じ文字列なら同じ構造）
  let seed = 0;
  for (let i = 0; i < sequence.length; i++) {
    seed += sequence.charCodeAt(i);
  }
  randomSeed(seed);
  
  // チェーン配列の初期化
  chain = [];
  
  // 起点をキャンバス中心に設定
  let start = createVector(width / 2, height / 2);
  let current = start.copy();
  let angle = 0;
  chain.push({ pos: current.copy(), angle: angle, char: null, value: 0 });
  
  // ジグザグ用の符号初期化
  zigzagSign = 1;
  
  // ノード間の基本ステップ長
  let baseStep = 50;
  
  // 文字列の各文字から次のノードを計算
  for (let i = 0; i < sequence.length; i++) {
    let ch = sequence.charAt(i);
    let value = ch.charCodeAt(0) - 97;
    let angleOffset = 0;
    
    if (value < 13) {
      angleOffset = map(value, 0, 12, 0.5, 1.5);
    } else {
      angleOffset = zigzagSign * map(value, 13, 25, 0.4, PI * 2 / 3);
      zigzagSign = -zigzagSign;
    }
    
    angle += angleOffset;
    let stepLength = baseStep + map(value, 0, 25, -30, 30);
    let dx = cos(angle) * stepLength;
    let dy = sin(angle) * stepLength;
    current = p5.Vector.add(current, createVector(dx, dy));
    chain.push({ pos: current.copy(), angle: angle, char: ch, value: value });
  }
  
  // バウンディングボックスを計算し、キャンバス中心に再配置
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (let node of chain) {
    if (node.pos.x < minX) minX = node.pos.x;
    if (node.pos.x > maxX) maxX = node.pos.x;
    if (node.pos.y < minY) minY = node.pos.y;
    if (node.pos.y > maxY) maxY = node.pos.y;
  }
  let structureCenterX = (minX + maxX) / 2;
  let structureCenterY = (minY + maxY) / 2;
  let offsetX = width / 2 - structureCenterX;
  let offsetY = height / 2 - structureCenterY;
  for (let node of chain) {
    node.pos.x += offsetX;
    node.pos.y += offsetY;
  }
  
  redraw();
}

function draw() {
  background(bgColor);
  
  // 一次構造（ノードを連結する直線）
  stroke(fgColor);
  strokeWeight(2);
  noFill();
  beginShape();
  for (let node of chain) {
    vertex(node.pos.x, node.pos.y);
  }
  endShape();
  
  // 3文字後に同じ文字があれば線で結ぶ
  for (let i = 0; i < sequence.length - 3; i++) {
    if (sequence.charAt(i) === sequence.charAt(i + 3)) {
      let indexA = i + 1;
      let indexB = i + 4;
      let a = chain[indexA].pos;
      let b = chain[indexB].pos;
      strokeWeight(0.8);
      line(a.x, a.y, b.x, b.y);
    }
  }
  
  // ノード上に多角形を描画（60% の確率）
  for (let i = 1; i < chain.length; i++) {
    if (random(1) < 0.6) {
      let node = chain[i];
      push();
      translate(node.pos.x, node.pos.y);
      rotate(node.angle);
      let sides = int(map(node.value, 0, 25, 3, 8));
      let radius = 10;
      fill(polyFillColor);
      strokeWeight(2);
      stroke(fgColor);
      polygon(0, 0, radius, sides);
      pop();
    }
  }
  
  // 入力文字列を左上に表示
  noStroke();
  fill(fgColor);
  textSize(15);
  drawingContext.font = '1000 15px sans-serif';
  text(sequence.toUpperCase(), 20, 30);
  
  noLoop();
}

// ヘルパー関数：中心 (x, y) から半径 radius の正多角形を描く
function polygon(x, y, radius, npoints) {
  let angleStep = TWO_PI / npoints;
  beginShape();
  for (let a = 0; a < TWO_PI; a += angleStep) {
    let sx = x + cos(a) * radius;
    let sy = y + sin(a) * radius;
    vertex(sx, sy);
  }
  endShape(CLOSE);
}

// 画像保存用の関数
function saveImage() {
  saveCanvas(cnv, "generative_art", "png");
}

// ランダムな英字列（小文字）を生成する関数
function generateRandomString(length) {
  let chars = 'abcdefghijklmnopqrstuvwxyz';
  let str = '';
  for (let i = 0; i < length; i++) {
    str += chars.charAt(floor(random(chars.length)));
  }
  return str;
}

}
