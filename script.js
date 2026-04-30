const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const livesEl = document.getElementById('lives');
const messageEl = document.getElementById('message');
const restartBtn = document.getElementById('restart');
const controlButtons = document.querySelectorAll('[data-action]');

ctx.imageSmoothingEnabled = false;

const gravity = 0.65;
const moveSpeed = 4.2;
const jumpPower = 13.5;
const groundY = 460;
const worldWidth = 2400;

const keys = {
  left: false,
  right: false,
};

let animationId = null;
let score = 0;
let lives = 3;
let cameraX = 0;
let gameState = 'running';

const player = {
  x: 110,
  y: 0,
  width: 34,
  height: 48,
  vx: 0,
  vy: 0,
  onGround: false,
  facing: 1,
  invulnerable: 0,
};

const level = {
  platforms: [
    { x: 0, y: 500, width: worldWidth, height: 80, type: 'ground' },
    { x: 260, y: 410, width: 130, height: 18, type: 'brick' },
    { x: 470, y: 350, width: 110, height: 18, type: 'brick' },
    { x: 660, y: 295, width: 120, height: 18, type: 'brick' },
    { x: 950, y: 390, width: 170, height: 18, type: 'brick' },
    { x: 1220, y: 340, width: 140, height: 18, type: 'brick' },
    { x: 1460, y: 280, width: 150, height: 18, type: 'brick' },
    { x: 1710, y: 350, width: 200, height: 18, type: 'brick' },
  ],
  coins: [
    { x: 310, y: 365, r: 10, taken: false },
    { x: 520, y: 305, r: 10, taken: false },
    { x: 720, y: 250, r: 10, taken: false },
    { x: 1010, y: 345, r: 10, taken: false },
    { x: 1080, y: 345, r: 10, taken: false },
    { x: 1285, y: 295, r: 10, taken: false },
    { x: 1540, y: 235, r: 10, taken: false },
    { x: 1780, y: 305, r: 10, taken: false },
    { x: 1860, y: 305, r: 10, taken: false },
  ],
  enemies: [
    { x: 760, y: 468, width: 34, height: 28, minX: 690, maxX: 890, vx: -1.1, alive: true },
    { x: 1340, y: 308, width: 34, height: 28, minX: 1240, maxX: 1490, vx: 1.2, alive: true },
    { x: 1960, y: 468, width: 34, height: 28, minX: 1900, maxX: 2120, vx: -1.35, alive: true },
  ],
  flag: { x: 2250, y: 180, width: 18, height: 320 },
};

function resetLevel() {
  score = 0;
  lives = 3;
  gameState = 'running';
  cameraX = 0;
  player.x = 110;
  player.y = 340;
  player.vx = 0;
  player.vy = 0;
  player.onGround = false;
  player.invulnerable = 0;
  level.coins.forEach(coin => { coin.taken = false; });
  level.enemies.forEach((enemy, index) => {
    enemy.alive = true;
    if (index === 0) enemy.x = 760;
    if (index === 1) enemy.x = 1340;
    if (index === 2) enemy.x = 1960;
    enemy.vx = Math.sign(enemy.vx || 1) * (index === 2 ? -1.35 : index === 1 ? 1.2 : -1.1);
  });
  updateHud();
  setMessage('Spring till flaggan och samla mynt.');
}

function updateHud() {
  scoreEl.textContent = score;
  livesEl.textContent = lives;
}

function setMessage(text) {
  messageEl.textContent = text;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function intersects(a, b) {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

function jump() {
  if (gameState !== 'running' || !player.onGround) return;
  player.vy = -jumpPower;
  player.onGround = false;
}

function applyInput() {
  player.vx = 0;
  if (keys.left) {
    player.vx = -moveSpeed;
    player.facing = -1;
  }
  if (keys.right) {
    player.vx = moveSpeed;
    player.facing = 1;
  }
}

function collidePlatform(platform, prevX, prevY) {
  const next = { x: player.x, y: player.y, width: player.width, height: player.height };
  if (!intersects(next, platform)) return;

  const prevBottom = prevY + player.height;
  const prevTop = prevY;
  const prevRight = prevX + player.width;
  const prevLeft = prevX;

  if (prevBottom <= platform.y && player.vy >= 0) {
    player.y = platform.y - player.height;
    player.vy = 0;
    player.onGround = true;
    return;
  }

  if (prevTop >= platform.y + platform.height && player.vy < 0) {
    player.y = platform.y + platform.height;
    player.vy = 0;
    return;
  }

  if (prevRight <= platform.x && player.vx > 0) {
    player.x = platform.x - player.width;
    player.vx = 0;
    return;
  }

  if (prevLeft >= platform.x + platform.width && player.vx < 0) {
    player.x = platform.x + platform.width;
    player.vx = 0;
  }
}

function updatePlayer() {
  applyInput();
  const prevX = player.x;
  const prevY = player.y;

  player.x += player.vx;
  player.x = clamp(player.x, 0, worldWidth - player.width);
  player.vy += gravity;
  player.vy = Math.min(player.vy, 16);
  player.y += player.vy;
  player.onGround = false;

  for (const platform of level.platforms) {
    collidePlatform(platform, prevX, prevY);
  }

  if (player.y + player.height >= groundY + 40) {
    loseLife();
  }

  cameraX = clamp(player.x - canvas.width * 0.35, 0, worldWidth - canvas.width);
  if (player.invulnerable > 0) player.invulnerable -= 1;
}

function collectCoins() {
  level.coins.forEach(coin => {
    if (coin.taken) return;
    const dx = player.x + player.width / 2 - coin.x;
    const dy = player.y + player.height / 2 - coin.y;
    if (Math.hypot(dx, dy) < 26) {
      coin.taken = true;
      score += 1;
      updateHud();
      setMessage(score === level.coins.length ? 'Alla mynt tagna — mot flaggan!' : 'Pling!');
    }
  });
}

function updateEnemies() {
  level.enemies.forEach(enemy => {
    if (!enemy.alive) return;
    enemy.x += enemy.vx;
    if (enemy.x <= enemy.minX || enemy.x + enemy.width >= enemy.maxX) {
      enemy.vx *= -1;
    }

    const touching = intersects(player, enemy);
    if (!touching || gameState !== 'running') return;

    const playerBottom = player.y + player.height;
    if (player.vy > 0 && playerBottom - enemy.y < 22) {
      enemy.alive = false;
      player.vy = -9;
      score += 2;
      updateHud();
      setMessage('Snyggt hopp.');
    } else if (player.invulnerable === 0) {
      loseLife();
    }
  });
}

function checkWin() {
  const flagZone = { x: level.flag.x - 18, y: level.flag.y, width: 54, height: level.flag.height };
  if (gameState === 'running' && intersects(player, flagZone)) {
    gameState = 'won';
    setMessage('Bana klar! 🎉');
    cancelAnimationFrame(animationId);
  }
}

function loseLife() {
  lives -= 1;
  updateHud();
  if (lives <= 0) {
    gameState = 'lost';
    setMessage('Game over. Starta om och kör igen.');
    cancelAnimationFrame(animationId);
    return;
  }

  player.x = Math.max(80, player.x - 120);
  player.y = 240;
  player.vx = 0;
  player.vy = 0;
  player.invulnerable = 90;
  setMessage('Aj. Försök igen.');
}

function drawBackground() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const hillOffset = cameraX * 0.25;
  ctx.fillStyle = '#dff7ff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  drawCloud(140 - hillOffset * 0.15, 90, 1);
  drawCloud(420 - hillOffset * 0.12, 140, 1.2);
  drawCloud(760 - hillOffset * 0.2, 85, 0.95);

  ctx.fillStyle = '#7cc66b';
  for (let i = -1; i < 6; i += 1) {
    const x = i * 280 - (hillOffset % 280);
    drawHill(x, 465, 190, 120);
  }
}

function drawHill(x, y, width, height) {
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.quadraticCurveTo(x + width / 2, y - height, x + width, y);
  ctx.closePath();
  ctx.fill();
}

function drawCloud(x, y, scale) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.fillStyle = 'rgba(255,255,255,0.95)';
  [[0, 0, 26], [26, -14, 24], [54, -4, 22], [18, 12, 22], [46, 14, 18]].forEach(([cx, cy, r]) => {
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.restore();
}

function drawPlatforms() {
  level.platforms.forEach(platform => {
    const x = platform.x - cameraX;
    if (x + platform.width < 0 || x > canvas.width) return;
    if (platform.type === 'ground') {
      ctx.fillStyle = '#7c4a1f';
      ctx.fillRect(x, platform.y, platform.width, platform.height);
      ctx.fillStyle = '#2db44f';
      ctx.fillRect(x, platform.y, platform.width, 18);
      return;
    }
    ctx.fillStyle = '#b96a30';
    ctx.fillRect(x, platform.y, platform.width, platform.height);
    ctx.strokeStyle = '#80431e';
    ctx.lineWidth = 3;
    for (let brickX = 0; brickX < platform.width; brickX += 32) {
      ctx.strokeRect(x + brickX, platform.y, 32, platform.height);
    }
  });
}

function drawCoins() {
  level.coins.forEach(coin => {
    if (coin.taken) return;
    const x = coin.x - cameraX;
    if (x < -20 || x > canvas.width + 20) return;
    ctx.fillStyle = '#ffd43b';
    ctx.beginPath();
    ctx.arc(x, coin.y, coin.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.fillRect(x - 2, coin.y - 8, 4, 16);
  });
}

function drawEnemies() {
  level.enemies.forEach(enemy => {
    if (!enemy.alive) return;
    const x = enemy.x - cameraX;
    if (x + enemy.width < 0 || x > canvas.width) return;
    ctx.fillStyle = '#7a3e16';
    ctx.fillRect(x, enemy.y, enemy.width, enemy.height);
    ctx.fillStyle = '#f5d3a4';
    ctx.fillRect(x + 4, enemy.y + 16, enemy.width - 8, 10);
    ctx.fillStyle = '#111827';
    ctx.fillRect(x + 7, enemy.y + 8, 4, 4);
    ctx.fillRect(x + 23, enemy.y + 8, 4, 4);
  });
}

function drawFlag() {
  const x = level.flag.x - cameraX;
  ctx.fillStyle = '#f3f4f6';
  ctx.fillRect(x, level.flag.y, level.flag.width, level.flag.height);
  ctx.fillStyle = '#22c55e';
  ctx.beginPath();
  ctx.moveTo(x + level.flag.width, level.flag.y + 12);
  ctx.lineTo(x + 80, level.flag.y + 34);
  ctx.lineTo(x + level.flag.width, level.flag.y + 56);
  ctx.closePath();
  ctx.fill();
}

function drawPlayer() {
  const x = player.x - cameraX;
  if (player.invulnerable > 0 && Math.floor(player.invulnerable / 6) % 2 === 0) return;

  ctx.fillStyle = '#ef4444';
  ctx.fillRect(x + 8, player.y, 18, 12);
  ctx.fillRect(x + 3, player.y + 10, 28, 10);
  ctx.fillStyle = '#f3d4b2';
  ctx.fillRect(x + 7, player.y + 16, 20, 16);
  ctx.fillStyle = '#2563eb';
  ctx.fillRect(x + 5, player.y + 30, 24, 12);
  ctx.fillRect(x + 8, player.y + 42, 7, 6);
  ctx.fillRect(x + 19, player.y + 42, 7, 6);
  ctx.fillStyle = '#111827';
  const eyeX = player.facing === 1 ? x + 20 : x + 12;
  ctx.fillRect(eyeX, player.y + 20, 3, 4);
}

function drawOverlay() {
  if (gameState === 'running') return;
  ctx.fillStyle = 'rgba(15, 23, 42, 0.4)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.font = 'bold 54px Inter, sans-serif';
  ctx.fillText(gameState === 'won' ? 'Bana klar!' : 'Game over', canvas.width / 2, canvas.height / 2 - 10);
  ctx.font = '24px Inter, sans-serif';
  ctx.fillText('Tryck på Starta om för att spela igen', canvas.width / 2, canvas.height / 2 + 36);
}

function draw() {
  drawBackground();
  drawPlatforms();
  drawCoins();
  drawEnemies();
  drawFlag();
  drawPlayer();
  drawOverlay();
}

function update() {
  if (gameState !== 'running') {
    draw();
    return;
  }
  updatePlayer();
  collectCoins();
  updateEnemies();
  checkWin();
  draw();
  animationId = requestAnimationFrame(update);
}

function restartGame() {
  cancelAnimationFrame(animationId);
  resetLevel();
  draw();
  animationId = requestAnimationFrame(update);
}

window.addEventListener('keydown', event => {
  const key = event.key.toLowerCase();
  if (key === 'arrowleft' || key === 'a') keys.left = true;
  if (key === 'arrowright' || key === 'd') keys.right = true;
  if (key === 'arrowup' || key === 'w' || key === ' ') {
    event.preventDefault();
    jump();
  }
});

window.addEventListener('keyup', event => {
  const key = event.key.toLowerCase();
  if (key === 'arrowleft' || key === 'a') keys.left = false;
  if (key === 'arrowright' || key === 'd') keys.right = false;
});

restartBtn.addEventListener('click', restartGame);
controlButtons.forEach(button => {
  const action = button.dataset.action;
  const press = event => {
    event.preventDefault();
    if (action === 'left') keys.left = true;
    if (action === 'right') keys.right = true;
    if (action === 'jump') jump();
  };
  const release = event => {
    event.preventDefault();
    if (action === 'left') keys.left = false;
    if (action === 'right') keys.right = false;
  };
  button.addEventListener('mousedown', press);
  button.addEventListener('mouseup', release);
  button.addEventListener('mouseleave', release);
  button.addEventListener('touchstart', press, { passive: false });
  button.addEventListener('touchend', release, { passive: false });
});

restartGame();
