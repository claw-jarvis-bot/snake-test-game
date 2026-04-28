const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const messageEl = document.getElementById('message');
const restartBtn = document.getElementById('restart');
const controlButtons = document.querySelectorAll('.control');

const gridSize = 4;
const cols = canvas.width / gridSize;
const rows = canvas.height / gridSize;
const speed = 165;

let snake;
let direction;
let nextDirection;
let food;
let score;
let loopId;
let gameOver;

function randomFoodPosition() {
  while (true) {
    const candidate = {
      x: Math.floor(Math.random() * cols),
      y: Math.floor(Math.random() * rows),
    };

    if (!snake.some(segment => segment.x === candidate.x && segment.y === candidate.y)) {
      return candidate;
    }
  }
}

function resetGame() {
  snake = [
    { x: 9, y: 5 },
    { x: 8, y: 5 },
    { x: 7, y: 5 },
    { x: 6, y: 5 },
  ];
  direction = { x: 1, y: 0 };
  nextDirection = { ...direction };
  food = randomFoodPosition();
  score = 0;
  gameOver = false;
  scoreEl.textContent = score;
  messageEl.textContent = 'READY';
  clearInterval(loopId);
  loopId = setInterval(tick, speed);
  draw();
}

function drawTile(x, y, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x * gridSize, y * gridSize, gridSize, gridSize);
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = '#a9b88f';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  drawTile(food.x, food.y, '#1e2a15');

  snake.forEach(segment => {
    drawTile(segment.x, segment.y, '#1e2a15');
  });
}

function endGame() {
  gameOver = true;
  clearInterval(loopId);
  messageEl.textContent = `GAME OVER ${score}`;
}

function setDirection(move) {
  if (move.x === -direction.x && move.y === -direction.y) return;
  nextDirection = move;
}

function tick() {
  if (gameOver) return;

  direction = nextDirection;
  const head = {
    x: (snake[0].x + direction.x + cols) % cols,
    y: (snake[0].y + direction.y + rows) % rows,
  };

  const hitSelf = snake.some(segment => segment.x === head.x && segment.y === head.y);
  if (hitSelf) {
    endGame();
    return;
  }

  snake.unshift(head);

  if (head.x === food.x && head.y === food.y) {
    score += 1;
    scoreEl.textContent = score;
    food = randomFoodPosition();
    messageEl.textContent = 'SCORE';
  } else {
    snake.pop();
  }

  draw();
}

window.addEventListener('keydown', event => {
  const key = event.key.toLowerCase();
  const moves = {
    arrowup: { x: 0, y: -1 },
    w: { x: 0, y: -1 },
    arrowdown: { x: 0, y: 1 },
    s: { x: 0, y: 1 },
    arrowleft: { x: -1, y: 0 },
    a: { x: -1, y: 0 },
    arrowright: { x: 1, y: 0 },
    d: { x: 1, y: 0 },
  };

  const move = moves[key];
  if (!move) return;
  setDirection(move);
});

controlButtons.forEach(button => {
  button.addEventListener('click', () => {
    const dir = button.dataset.dir;
    const moves = {
      up: { x: 0, y: -1 },
      down: { x: 0, y: 1 },
      left: { x: -1, y: 0 },
      right: { x: 1, y: 0 },
    };
    setDirection(moves[dir]);
  });
});

let touchStartX = 0;
let touchStartY = 0;

canvas.addEventListener('touchstart', event => {
  const touch = event.touches[0];
  touchStartX = touch.clientX;
  touchStartY = touch.clientY;
}, { passive: true });

canvas.addEventListener('touchend', event => {
  const touch = event.changedTouches[0];
  const dx = touch.clientX - touchStartX;
  const dy = touch.clientY - touchStartY;

  if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;

  if (Math.abs(dx) > Math.abs(dy)) {
    setDirection(dx > 0 ? { x: 1, y: 0 } : { x: -1, y: 0 });
  } else {
    setDirection(dy > 0 ? { x: 0, y: 1 } : { x: 0, y: -1 });
  }
}, { passive: true });

restartBtn.addEventListener('click', resetGame);
resetGame();
