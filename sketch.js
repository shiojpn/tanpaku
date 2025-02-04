// 配色を一括変更できるようにグローバル変数で指定
let fgColor = "#ebebd3";         // 出力する文字列、線、（多角形の線も）に使う色
let bgColor = "#083d77";         // 背景色
let polyFillColor = "#083d77";   // 多角形の塗り色（背景色と同じ色に管理）

let inputField, button, saveButton;
let sequence = "aiwertunoaapmoa"; // 初期入力文字列（固定長推奨）
let chain = [];                  // ノード（位置、角度、文字情報）の配列
let zigzagSign = 1;              // ジグザグ時の角度オフセットの符号を交互にするためのグローバル変数
let cnv;                         // キャンバス用グローバル変数（画像保存に利用）

function setup() {
  // キャンバス作成（グローバル変数 cnv に格納）
  cnv = createCanvas(windowWidth, windowHeight);
  angleMode(RADIANS);
  background(bgColor);
  
  // 画面下端から 60px 上げた位置に input とボタンを配置
  let inputY = height - 40;
  inputField = createInput(sequence);
  inputField.position(20, inputY - 30);
  
  button = createButton("Generate");
  button.position(inputField.x + inputField.width + 10, inputY - 30);
  button.mousePressed(generateStructure);
  
  // 生成した画像を保存するボタンを追加
  saveButton = createButton("Save Image");
  saveButton.position(20, inputY);
  saveButton.mousePressed(saveImage);
  
  generateStructure();
}

function generateStructure() {
  // 入力文字列を小文字に統一して取得
  sequence = inputField.value().toLowerCase();
  
  // アルファベット以外の文字が含まれている場合はエラー表示
  if (!/^[a-z]+$/.test(sequence)) {
    alert("エラー: アルファベットのみを入力してください。");
    return;
  }
  
  // 入力文字列から乱数シードを生成（同じ文字列なら同じ構造に）
  let seed = 0;
  for (let i = 0; i < sequence.length; i++) {
    seed += sequence.charCodeAt(i);
  }
  randomSeed(seed);
  
  // チェーン配列の初期化
  chain = [];
  
  // チェーンの起点をキャンバス中心に設定
  let start = createVector(width / 2, height / 2);
  let current = start.copy();
  let angle = 0; // 初期角度（0ラジアン）
  chain.push({ pos: current.copy(), angle: angle, char: null, value: 0 });
  
  // ジグザグ用の符号を初期化
  zigzagSign = 1;
  
  // 各ノード間の基本ステップ長
  let baseStep = 50;
  
  // 入力文字列の各文字に対して次のノードを計算
  for (let i = 0; i < sequence.length; i++) {
    let ch = sequence.charAt(i);
    // 'a'→0, 'b'→1, ... 'z'→25 とする
    let value = ch.charCodeAt(0) - 97;
    let angleOffset = 0;
    
    // 文字の値によって、コイル状かジグザグかを決定
    if (value < 13) {
      // コイル状：小刻みな正の角度変化（0.5～1.5ラジアン程度）
      angleOffset = map(value, 0, 12, 0.5, 1.5);
    } else {
      // ジグザグ：より大きな角度変化（0.4～PI*2/3）で、符号を交互に反転
      angleOffset = zigzagSign * map(value, 13, 25, 0.4, PI * 2 / 3);
      zigzagSign = -zigzagSign;
    }
    
    // 角度を累積
    angle += angleOffset;
    
    // ステップ長も文字の値で変化（-30～+30）
    let stepLength = baseStep + map(value, 0, 25, -30, 30);
    
    // 新しい位置を計算（極座標→ベクトル変換）
    let dx = cos(angle) * stepLength;
    let dy = sin(angle) * stepLength;
    current = p5.Vector.add(current, createVector(dx, dy));
    
    // ノード情報を配列に追加
    chain.push({ pos: current.copy(), angle: angle, char: ch, value: value });
  }
  
  // チェーン全体のバウンディングボックスを計算し、全体をキャンバス中心に再配置
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
  background(bgColor); // 背景色はグローバル変数から
  
  // 一次構造：ノードを連結する直線を fgColor で描画
  stroke(fgColor);
  strokeWeight(2);
  noFill();
  beginShape();
  for (let node of chain) {
    vertex(node.pos.x, node.pos.y);
  }
  endShape();
  
  // 文字列の位置関係から新たな模様を生成
  // 「ある文字が３文字後に再登場したら」そのときのノード同士を線で結ぶ
  // chain[1] が sequence[0] に対応するため、i 番目の文字は chain[i+1] に対応
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
  
  // ノード上に、多角形（残基のような形状）を稀に描画
  for (let i = 1; i < chain.length; i++) {
    // 60% の確率で多角形を描く
    if (random(1) < 0.6) {
      let node = chain[i];
      push();
      translate(node.pos.x, node.pos.y);
      // ノードの角度に合わせて回転（任意）
      rotate(node.angle);
      // 文字の値をもとに、3～8 辺の多角形を描く
      let sides = int(map(node.value, 0, 25, 3, 8));
      let radius = 10; // 多角形の大きさは固定
      // 多角形の塗り色は polyFillColor で管理
      fill(polyFillColor);
      strokeWeight(2);
      stroke(fgColor);
      polygon(0, 0, radius, sides);
      pop();
    }
  }
  
  // 左上に入力文字列を大文字で表示（フォントは細い指定）
  noStroke();
  fill(fgColor);
  textSize(15);
  drawingContext.font = '1000 15px sans-serif';
  text(sequence.toUpperCase(), 20, 30);
  
  noLoop();
}

// ヘルパー関数：中心 (x, y) から半径 radius で npoints 辺の正多角形を描く
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

// 生成した画像を保存する関数
function saveImage() {
  // キャンバスの内容を "generative_art.png" として保存
  saveCanvas(cnv, "generative_art", "png");
}
