let gameState = 'menu'; // 遊戲狀態：'menu', 'game', 或 'gameOverScreen'
let startButton; // 開始遊戲按鈕
let homeButton;  // 回首頁按鈕
let cowImg;      // 牛的圖片
let chickenImg;  // 炸雞圖片

// 貪食蛇變數
let snakeHead;   // 蛇頭位置 (Vector)
let history = []; // 紀錄蛇頭走過的所有座標
let totalSegments = 5; // 蛇的總長度節數
let speed = 5;    // 每一幀移動的像素距離
let food;
let direction;
let resolution = 20;
let score = 0;
let highScore = 0; // 新增：歷史最高分變數
let particles = []; // 儲存擴散特效的陣列

function preload() {
  // 載入一隻超大牛的圖片
  cowImg = loadImage('https://images.pexels.com/photos/458991/pexels-photo-458991.jpeg');
  // 載入炸雞圖片
  chickenImg = loadImage('https://cdn-icons-png.flaticon.com/512/3143/3143640.png');
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  // 設定色彩模式為 HSB (色相 0-360, 飽和度 0-100, 亮度 0-100)
  colorMode(HSB, 360, 100, 100, 1);
  noStroke();

  startButton = createButton('開始遊戲');
  startButton.size(120, 50);
  startButton.position(width / 2 - 60, height / 2 - 25);
  startButton.style('font-size', '20px');
  startButton.style('cursor', 'pointer');
  startButton.mousePressed(startGame);

  // 初始化回首頁按鈕 (預設隱藏)
  homeButton = createButton('回首頁');
  homeButton.size(120, 50);
  homeButton.style('font-size', '20px');
  homeButton.style('cursor', 'pointer');
  homeButton.mousePressed(goHome);
  homeButton.hide();

  highScore = int(localStorage.getItem('snakeHighScore') || 0);
}

function draw() {
  if (gameState === 'menu') {
    drawMenu();
  } else if (gameState === 'game') {
    drawSnakeGame();
  } else if (gameState === 'gameOverScreen') {
    drawGameOver();
  }
}

function drawMenu() {
  background(0, 0, 90); // 淺灰色背景
  let step = 50;
  for (let x = 0; x <= width; x += step) {
    for (let y = 0; y <= height; y += step) {
      let hue = (map(x, 0, width, 0, 360) + frameCount) % 360;
      let s = map(mouseY, 0, height, 0, 100);
      let b = map(mouseX, 0, width, 0, 100);
      fill(hue, s, b);
      ellipse(x, y, step * 0.8);
    }
  }
}

function startGame() {
  gameState = 'game';
  startButton.hide();
  homeButton.hide();
  frameRate(60); // 這裡要改回 60 幀，否則移動會卡頓
  
  // 初始化連續移動的蛇
  snakeHead = createVector(width / 2, height / 2);
  direction = createVector(speed, 0);
  history = [];
  totalSegments = 5;
  score = 0;
  pickLocation();
  particles = [];
}

function goHome() {
  gameState = 'menu';
  homeButton.hide();
  startButton.html('開始遊戲');
  startButton.position(width / 2 - 60, height / 2 - 25);
  startButton.show();
}

function pickLocation() {
  // 改用螢幕範圍隨機生成食物位置
  food = createVector(random(50, width - 50), random(50, height - 50));
}

function drawSnakeGame() {
  // 遊戲背景同樣使用大牛
  if (cowImg) {
    image(cowImg, 0, 0, width, height);
  }

  // 加上深色遮罩 (50% 亮度) 以突出遊戲中的蛇和食物
  fill(0, 0, 0, 0.5);
  rect(0, 0, width, height);

  // 1. 計算平滑方向：蛇頭平滑地轉向滑鼠
  let targetDir = p5.Vector.sub(createVector(mouseX, mouseY), snakeHead);
  if (targetDir.mag() > 5) {
    targetDir.setMag(speed);
    // 使用 lerp 讓轉向不要太生硬
    direction.lerp(targetDir, 0.2);
    direction.setMag(speed);
  }

  // 2. 更新位置
  snakeHead.add(direction);
  history.push(snakeHead.copy());

  // 限制歷史紀錄長度 (每一節身體需要約 resolution/speed 幀的間隔)
  let spacing = floor(resolution / speed);
  if (history.length > totalSegments * spacing) {
    history.shift();
  }

  // 繪製食物 (炸雞)
  push();
  imageMode(CENTER);
  translate(food.x, food.y);
  rotate(sin(frameCount * 0.1) * 0.2);
  image(chickenImg, 0, 0, resolution * 1.5, resolution * 1.5);
  pop();

  // 3. 檢查吃到食物 (距離偵測)
  if (p5.Vector.dist(snakeHead, food) < resolution) {
    score++;
    totalSegments += 2; // 增加長度
    particles.push({
      x: food.x,
      y: food.y,
      size: resolution,
      alpha: 1,
      hue: (frameCount * 5) % 360
    });
    pickLocation();
  }

  // 4. 檢查碰撞邊界
  if (snakeHead.x < 0 || snakeHead.x > width || snakeHead.y < 0 || snakeHead.y > height || isSelfCollision()) {
    gameOver();
    return;
  }

  // 5. 繪製蛇身 (從路徑歷史中取樣)
  for (let i = 0; i < totalSegments; i++) {
    let index = history.length - 1 - (i * spacing);
    if (index < 0) index = 0;
    let pos = history[index];

    let segmentHue = (map(i, 0, totalSegments, 100, 200) + frameCount) % 360;
    fill(segmentHue, 80, 100);
    
    let s = resolution * (1 - i / (totalSegments * 2)); // 越往尾巴越細
    ellipse(pos.x, pos.y, s * 1.3);

    if (i === 0) { // 畫蛇頭的眼睛
      fill(0, 0, 100); // 白色眼白
      ellipse(pos.x - 5, pos.y - 5, 6);
      ellipse(pos.x + 5, pos.y - 5, 6);
      fill(0, 0, 0); // 黑色瞳孔
      ellipse(pos.x - 5, pos.y - 5, 3);
      ellipse(pos.x + 5, pos.y - 5, 3);
    }
  }

  for (let i = particles.length - 1; i >= 0; i--) {
    // ... (保持原本的粒子繪製邏輯)
  }

  fill(0, 0, 100);
  textSize(24);
  textAlign(LEFT);
  text('分數: ' + score, 20, 40);
}

function isSelfCollision() {
  // 檢查蛇頭是否撞到較遠處的身體 (忽略脖子附近的歷史紀錄)
  let spacing = floor(resolution / speed);
  for (let i = 0; i < history.length - (spacing * 3); i++) {
    if (p5.Vector.dist(snakeHead, history[i]) < resolution * 0.6) {
      return true;
    }
  }
  return false;
}

function keyPressed() {
  // 連續移動模式不需要鍵盤控制轉向，已改由滑鼠控制
}

function gameOver() {
  gameState = 'gameOverScreen'; // 切換到遊戲結束畫面
  
  // 設定重新開始按鈕
  startButton.html('重新開始');
  startButton.position(width / 2 - 130, height / 2 + 50);
  startButton.show();

  // 設定回首頁按鈕
  homeButton.position(width / 2 + 10, height / 2 + 50);
  homeButton.show();

  // 更新歷史最高分
  if (score > highScore) {
    highScore = score;
    localStorage.setItem('snakeHighScore', highScore);
  }

  frameRate(60); // 恢復選單時的平滑幀率
}

function drawGameOver() {
  // 1. 先繪製原本的色彩網格背景
  drawMenu();

  // 2. 加上一層半透明黑色，讓文字更易讀
  fill(0, 0, 0, 0.6);
  rect(0, 0, width, height);

  // 3. 顯示分數資訊
  fill(0, 0, 100);
  textSize(48);
  textAlign(CENTER, CENTER);
  text('遊戲結束！', width / 2, height / 2 - 80);

  textSize(32);
  text('最終得分: ' + score, width / 2, height / 2 - 20);

  // 在遊戲結束畫面顯示歷史最高分
  textSize(24);
  text('歷史最高分: ' + highScore, width / 2, height / 2 + 10);
}
