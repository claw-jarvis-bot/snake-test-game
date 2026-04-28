const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const messageEl = document.getElementById('message');
const restartBtn = document.getElementById('restart');

const gridSize = 20;
const tileCount = canvas.width / gridSize;
const speed = 120;

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
      x: Math.floor(Math.random() * tileCount),
      y: Math.floor(Math.random() * tileCount),
    };

    if (!snake.some(segment => segment.x === candidate.x && segment.y === candidate.y)) {
      return candidate;
    }
  }
}

function resetGame() {
  snake = [
    { x: 10, y: 10 },
    { x: 9, y: 10 },
    { x: 8, y: 10 },
  ];
  direction = { x: 1, y: 0 };
  nextDirection = { ...direction };
  food = randomFoodPosition();
  score = 0;
  gameOver = false;
  scoreEl.textContent = score;
  messageEl.textContent = 'Eat the food to grow. Avoid the walls and yourself.';
  clearInterval(loopId);
  loopId = setInterval(tick, speed);
  draw();
}

function drawTile(x, y, color, radius = 4) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.roundRect(x * gridSize + 1, y * gridSize + 1, gridSize - 2, gridSize - 2, radius);
  ctx.fill();
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  for (let i = 0; i < tileCount; i++) {
    for (let j = 0; j < tileCount; j++) {
      drawTile(i, j, (i + j) % 2 === 0 ? '#0f172a' : '#111827', 2);
    }
  }

  drawTile(food.x, food.y, '#f43f5e', 999);

  snake.forEach((segment, index) => {
    drawTile(segment.x, segment.y, index === 0 ? '#22c55e' : '#86efac');
  });
}

function endGame() {
  gameOver = true;
  clearInterval(loopId);
  messageEl.textContent = `Game over. Final score: ${score}. Press restart to play again.`;
}

function tick() {
  if (gameOver) return;

  direction = nextDirection;
  const head = {
    x: snake[0].x + direction.x,
    y: snake[0].y + direction.y,
  };

  const hitWall = head.x < 0 || head.x >= tileCount || head.y < 0 || head.y >= tileCount;
  const hitSelf = snake.some(segment => segment.x === head.x && segment.y === head.y);

  if (hitWall || hitSelf) {
    endGame();
    return;
  }

  snake.unshift(head);

  if (head.x === food.x && head.y === food.y) {
    score += 1;
    scoreEl.textContent = score;
    food = randomFoodPosition();
    messageEl.textContent = 'Nice. Keep going.';
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

  if (move.x === -direction.x && move.y === -direction.y) return;
  nextDirection = move;
});

restartBtn.addEventListener('click', resetGame);
resetGame();
