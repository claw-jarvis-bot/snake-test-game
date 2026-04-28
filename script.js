const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const nextCanvas = document.getElementById('next');
const nextCtx = nextCanvas.getContext('2d');
const scoreEl = document.getElementById('score');
const messageEl = document.getElementById('message');
const restartBtn = document.getElementById('restart');

ctx.imageSmoothingEnabled = false;
nextCtx.imageSmoothingEnabled = false;

const cell = 20;
const boardCols = 10;
const boardRows = 20;
const dropInterval = 550;
const colors = {
  I: '#38bdf8',
  O: '#facc15',
  T: '#c084fc',
  L: '#fb923c',
  J: '#60a5fa',
  S: '#4ade80',
  Z: '#f87171',
};
const pieces = {
  I: [[1, 1, 1, 1]],
  O: [[1, 1], [1, 1]],
  T: [[0, 1, 0], [1, 1, 1]],
  L: [[1, 0], [1, 0], [1, 1]],
  J: [[0, 1], [0, 1], [1, 1]],
  S: [[0, 1, 1], [1, 1, 0]],
  Z: [[1, 1, 0], [0, 1, 1]],
};

let board;
let current;
let nextPiece;
let score;
let gameOver;
let loopId;

function randomPiece() {
  const types = Object.keys(pieces);
  const type = types[Math.floor(Math.random() * types.length)];
  return {
    type,
    shape: pieces[type].map(row => [...row]),
    x: 0,
    y: 0,
  };
}

function createBoard() {
  return Array.from({ length: boardRows }, () => Array(boardCols).fill(0));
}

function cloneShape(shape) {
  return shape.map(row => [...row]);
}

function spawnPiece() {
  current = nextPiece || randomPiece();
  current.shape = cloneShape(current.shape);
  current.x = Math.floor((boardCols - current.shape[0].length) / 2);
  current.y = 0;
  nextPiece = randomPiece();

  if (collides(current.x, current.y, current.shape)) {
    endGame();
  }
}

function resetGame() {
  board = createBoard();
  score = 0;
  gameOver = false;
  scoreEl.textContent = score;
  messageEl.textContent = 'Ready';
  nextPiece = randomPiece();
  spawnPiece();
  clearInterval(loopId);
  loopId = setInterval(tick, dropInterval);
  draw();
}

function drawCell(targetCtx, x, y, color, size = cell) {
  targetCtx.fillStyle = color;
  targetCtx.fillRect(x * size, y * size, size, size);
  targetCtx.strokeStyle = 'rgba(255,255,255,0.08)';
  targetCtx.strokeRect(x * size + 0.5, y * size + 0.5, size - 1, size - 1);
}

function drawPiece(targetCtx, piece, offsetX = 0, offsetY = 0, size = cell) {
  piece.shape.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value) drawCell(targetCtx, offsetX + piece.x + x, offsetY + piece.y + y, colors[piece.type], size);
    });
  });
}

function drawBoard() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  board.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value) drawCell(ctx, x, y, value);
    });
  });
  if (!gameOver && current) drawPiece(ctx, current);
}

function drawNext() {
  nextCtx.clearRect(0, 0, nextCanvas.width, nextCanvas.height);
  if (!nextPiece) return;
  const size = 16;
  const width = nextPiece.shape[0].length * size;
  const height = nextPiece.shape.length * size;
  const offsetX = Math.floor((nextCanvas.width - width) / (2 * size));
  const offsetY = Math.floor((nextCanvas.height - height) / (2 * size));
  nextPiece.shape.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value) drawCell(nextCtx, offsetX + x, offsetY + y, colors[nextPiece.type], size);
    });
  });
}

function draw() {
  drawBoard();
  drawNext();
}

function rotate(shape) {
  return shape[0].map((_, x) => shape.map(row => row[x]).reverse());
}

function collides(testX, testY, shape) {
  for (let y = 0; y < shape.length; y++) {
    for (let x = 0; x < shape[y].length; x++) {
      if (!shape[y][x]) continue;
      const boardX = testX + x;
      const boardY = testY + y;
      if (boardX < 0 || boardX >= boardCols || boardY >= boardRows) return true;
      if (boardY >= 0 && board[boardY][boardX]) return true;
    }
  }
  return false;
}

function mergePiece() {
  current.shape.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value) board[current.y + y][current.x + x] = colors[current.type];
    });
  });
}

function clearLines() {
  let cleared = 0;
  board = board.filter(row => {
    if (row.every(Boolean)) {
      cleared += 1;
      return false;
    }
    return true;
  });
  while (board.length < boardRows) board.unshift(Array(boardCols).fill(0));
  if (cleared) {
    score += cleared * 100;
    scoreEl.textContent = score;
    messageEl.textContent = cleared > 1 ? `${cleared} lines` : 'Line clear';
  }
}

function endGame() {
  gameOver = true;
  clearInterval(loopId);
  messageEl.textContent = 'Game over';
  draw();
}

function move(dx, dy) {
  if (gameOver) return false;
  const nextX = current.x + dx;
  const nextY = current.y + dy;
  if (!collides(nextX, nextY, current.shape)) {
    current.x = nextX;
    current.y = nextY;
    draw();
    return true;
  }
  return false;
}

function rotateCurrent() {
  if (gameOver) return;
  const rotated = rotate(current.shape);
  if (!collides(current.x, current.y, rotated)) {
    current.shape = rotated;
  } else if (!collides(current.x - 1, current.y, rotated)) {
    current.x -= 1;
    current.shape = rotated;
  } else if (!collides(current.x + 1, current.y, rotated)) {
    current.x += 1;
    current.shape = rotated;
  }
  draw();
}

function lockAndContinue() {
  mergePiece();
  clearLines();
  spawnPiece();
  draw();
}

function hardDrop() {
  if (gameOver) return;
  while (move(0, 1)) {}
  lockAndContinue();
}

function tick() {
  if (gameOver) return;
  if (!move(0, 1)) lockAndContinue();
}

window.addEventListener('keydown', event => {
  if (gameOver && event.key !== 'Enter') return;
  const key = event.key;
  if (key === 'ArrowLeft' || key === 'a' || key === 'A') move(-1, 0);
  else if (key === 'ArrowRight' || key === 'd' || key === 'D') move(1, 0);
  else if (key === 'ArrowDown' || key === 's' || key === 'S') {
    if (!move(0, 1)) lockAndContinue();
  } else if (key === 'ArrowUp' || key === 'w' || key === 'W') rotateCurrent();
  else if (key === ' ') {
    event.preventDefault();
    hardDrop();
  } else if (key === 'Enter') {
    resetGame();
  }
});

restartBtn.addEventListener('click', resetGame);
resetGame();
