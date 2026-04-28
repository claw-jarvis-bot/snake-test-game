const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;
const scoreEl = document.getElementById('score');
const messageEl = document.getElementById('message');
const restartBtn = document.getElementById('restart');
const controlButtons = document.querySelectorAll('.control');

const cell = 4;
const boardCols = 10;
const boardRows = 12;
const boardWidth = boardCols * cell;
const dropInterval = 550;
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
  messageEl.textContent = 'READY';
  nextPiece = randomPiece();
  spawnPiece();
  clearInterval(loopId);
  loopId = setInterval(tick, dropInterval);
  draw();
}

function drawBlock(x, y, color = '#1e2a15') {
  ctx.fillStyle = color;
  ctx.fillRect(x * cell, y * cell, cell, cell);
}

function drawPiece(piece, offsetX = 0, offsetY = 0, color = '#1e2a15') {
  piece.shape.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value) drawBlock(offsetX + piece.x + x, offsetY + piece.y + y, color);
    });
  });
}

function drawBoard() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  board.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value) drawBlock(x, y);
    });
  });

  if (!gameOver && current) {
    drawPiece(current);
  }

  drawSidebar();
}

function drawSidebar() {
  const sidebarX = boardWidth + 4;
  ctx.fillStyle = '#1e2a15';
  ctx.font = '4px Arial';
  ctx.fillText('NEXT', sidebarX, 8);

  if (nextPiece) {
    nextPiece.shape.forEach((row, y) => {
      row.forEach((value, x) => {
        if (value) {
          ctx.fillRect(sidebarX + x * cell, 12 + y * cell, cell, cell);
        }
      });
    });
  }

  ctx.fillText('PTS', sidebarX, 32);
  ctx.fillText(String(score), sidebarX, 38);
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
      if (value) {
        const boardY = current.y + y;
        const boardX = current.x + x;
        if (boardY >= 0) board[boardY][boardX] = 1;
      }
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

  while (board.length < boardRows) {
    board.unshift(Array(boardCols).fill(0));
  }

  if (cleared) {
    score += cleared * 10;
    scoreEl.textContent = score;
    messageEl.textContent = cleared > 1 ? 'LINES' : 'LINE';
  }
}

function endGame() {
  gameOver = true;
  clearInterval(loopId);
  messageEl.textContent = 'GAME OVER';
  drawBoard();
}

function move(dx, dy) {
  if (gameOver) return;
  const nextX = current.x + dx;
  const nextY = current.y + dy;
  if (!collides(nextX, nextY, current.shape)) {
    current.x = nextX;
    current.y = nextY;
    drawBoard();
    return true;
  }
  return false;
}

function rotateCurrent() {
  if (gameOver) return;
  const rotated = rotate(current.shape);
  if (!collides(current.x, current.y, rotated)) {
    current.shape = rotated;
    drawBoard();
    return;
  }
  if (!collides(current.x - 1, current.y, rotated)) {
    current.x -= 1;
    current.shape = rotated;
    drawBoard();
    return;
  }
  if (!collides(current.x + 1, current.y, rotated)) {
    current.x += 1;
    current.shape = rotated;
    drawBoard();
  }
}

function lockAndContinue() {
  mergePiece();
  clearLines();
  spawnPiece();
  drawBoard();
}

function tick() {
  if (gameOver) return;
  const moved = move(0, 1);
  if (!moved) {
    lockAndContinue();
  }
}

function handleInput(dir) {
  if (dir === 'left') move(-1, 0);
  if (dir === 'right') move(1, 0);
  if (dir === 'down') {
    if (!move(0, 1)) lockAndContinue();
  }
  if (dir === 'up') rotateCurrent();
}

window.addEventListener('keydown', event => {
  const key = event.key.toLowerCase();
  const moves = {
    arrowup: 'up',
    w: 'up',
    arrowdown: 'down',
    s: 'down',
    arrowleft: 'left',
    a: 'left',
    arrowright: 'right',
    d: 'right',
    ' ': 'up',
  };
  const dir = moves[key];
  if (!dir) return;
  event.preventDefault();
  handleInput(dir);
});

controlButtons.forEach(button => {
  button.addEventListener('click', () => handleInput(button.dataset.dir));
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

  if (Math.abs(dx) < 8 && Math.abs(dy) < 8) {
    rotateCurrent();
    return;
  }

  if (Math.abs(dx) > Math.abs(dy)) {
    handleInput(dx > 0 ? 'right' : 'left');
  } else {
    handleInput(dy > 0 ? 'down' : 'up');
  }
}, { passive: true });

restartBtn.addEventListener('click', resetGame);
resetGame();
