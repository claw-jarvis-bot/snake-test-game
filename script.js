const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const shieldEl = document.getElementById('shield');
const progressEl = document.getElementById('progress');
const messageEl = document.getElementById('message');
const restartBtn = document.getElementById('restart');
const controlButtons = document.querySelectorAll('[data-action]');

const keys = { left: false, right: false, up: false, down: false };

let animationId = null;
let stars = [];
let score = 0;
let shield = 3;
let progress = 0;
let lastShotAt = 0;
let lastFrame = 0;
let gameState = 'running';
let flashTimer = 0;

const missionLength = 100;
const player = {
  x: 120,
  y: canvas.height / 2,
  width: 48,
  height: 22,
  speed: 5.2,
  cooldown: 210,
};

const bolts = [];
const enemies = [];
const pickups = [];
const explosions = [];

function rand(min, max) {
  return Math.random() * (max - min) + min;
}

function resetStars() {
  stars = Array.from({ length: 90 }, () => ({
    x: rand(0, canvas.width),
    y: rand(0, canvas.height),
    speed: rand(0.4, 2.6),
    size: rand(1, 2.8),
  }));
}

function resetGame() {
  score = 0;
  shield = 3;
  progress = 0;
  lastShotAt = 0;
  gameState = 'running';
  flashTimer = 0;
  player.x = 120;
  player.y = canvas.height / 2;
  bolts.length = 0;
  enemies.length = 0;
  pickups.length = 0;
  explosions.length = 0;
  resetStars();
  updateHud();
  setMessage('Flyg genom skyttegraven, skjut TIE-jägare och nå protonmålet.');
}

function updateHud() {
  scoreEl.textContent = score;
  shieldEl.textContent = shield;
  progressEl.textContent = `${Math.floor(progress)}%`;
}

function setMessage(text) {
  messageEl.textContent = text;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function rectsOverlap(a, b) {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

function spawnEnemy() {
  const type = Math.random() < 0.72 ? 'tie' : 'turret';
  if (type === 'tie') {
    enemies.push({
      type,
      x: canvas.width + 70,
      y: rand(90, canvas.height - 110),
      width: 38,
      height: 34,
      vx: rand(4.6, 6.8),
      wobble: rand(0, Math.PI * 2),
      hp: 1,
    });
    return;
  }

  const lane = Math.random() < 0.5 ? 62 : canvas.height - 98;
  enemies.push({
    type,
    x: canvas.width + 50,
    y: lane,
    width: 28,
    height: 58,
    vx: 5.2,
    hp: 2,
  });
}

function spawnPickup() {
  pickups.push({
    x: canvas.width + 40,
    y: rand(110, canvas.height - 120),
    width: 18,
    height: 18,
    vx: 4.2,
    spin: 0,
  });
}

function shoot(now = performance.now()) {
  if (gameState !== 'running') return;
  if (now - lastShotAt < player.cooldown) return;

  const canFinishMission = progress >= missionLength;
  bolts.push({
    x: player.x + player.width - 4,
    y: player.y + player.height / 2 - 2,
    width: canFinishMission ? 22 : 18,
    height: canFinishMission ? 6 : 4,
    vx: canFinishMission ? 11 : 9,
    finisher: canFinishMission,
  });
  lastShotAt = now;

  if (canFinishMission) {
    setMessage('Protonskott avfyrat — håll kursen!');
  }
}

function explode(x, y, color = '#fb7185') {
  explosions.push({ x, y, life: 24, color, radius: 10 });
}

function takeHit() {
  if (flashTimer > 0 || gameState !== 'running') return;
  shield -= 1;
  flashTimer = 42;
  updateHud();
  explode(player.x + 18, player.y + 10, '#fca5a5');

  if (shield <= 0) {
    gameState = 'lost';
    setMessage('Du blev nedskjuten. Starta om och ge Imperiet en ny chans.');
    return;
  }

  setMessage('Träff! Sköldarna håller — än så länge.');
}

function updatePlayer() {
  if (keys.left) player.x -= player.speed;
  if (keys.right) player.x += player.speed;
  if (keys.up) player.y -= player.speed;
  if (keys.down) player.y += player.speed;

  player.x = clamp(player.x, 26, canvas.width - player.width - 26);
  player.y = clamp(player.y, 72, canvas.height - player.height - 78);
}

function updateStars(delta) {
  stars.forEach(star => {
    star.x -= star.speed * (delta * 0.06);
    if (star.x < -4) {
      star.x = canvas.width + 4;
      star.y = rand(0, canvas.height);
      star.speed = rand(0.4, 2.6);
    }
  });
}

function updateBolts() {
  for (let i = bolts.length - 1; i >= 0; i -= 1) {
    const bolt = bolts[i];
    bolt.x += bolt.vx;
    if (bolt.x > canvas.width + 30) {
      bolts.splice(i, 1);
      continue;
    }

    for (let j = enemies.length - 1; j >= 0; j -= 1) {
      const enemy = enemies[j];
      if (!rectsOverlap(bolt, enemy)) continue;
      enemy.hp -= bolt.finisher ? 2 : 1;
      bolts.splice(i, 1);

      if (enemy.hp <= 0) {
        const bonus = enemy.type === 'turret' ? 30 : 20;
        score += bonus;
        updateHud();
        explode(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, '#f59e0b');
        enemies.splice(j, 1);
        if (progress >= missionLength && bolt.finisher) {
          gameState = 'won';
          setMessage('Direktträff! Death Star-smällen ekar över galaxen.');
        }
      }
      break;
    }
  }
}

function updateEnemies(delta) {
  if (Math.random() < 0.024 + progress * 0.00012) spawnEnemy();

  for (let i = enemies.length - 1; i >= 0; i -= 1) {
    const enemy = enemies[i];
    enemy.x -= enemy.vx * (delta * 0.06);
    if (enemy.type === 'tie') {
      enemy.wobble += 0.08;
      enemy.y += Math.sin(enemy.wobble) * 1.3;
    }

    if (enemy.x + enemy.width < -40) {
      enemies.splice(i, 1);
      continue;
    }

    if (rectsOverlap(player, enemy)) {
      enemies.splice(i, 1);
      explode(enemy.x, enemy.y, '#f97316');
      takeHit();
    }
  }
}

function updatePickups(delta) {
  if (Math.random() < 0.011) spawnPickup();

  for (let i = pickups.length - 1; i >= 0; i -= 1) {
    const pickup = pickups[i];
    pickup.x -= pickup.vx * (delta * 0.06);
    pickup.spin += 0.12;

    if (pickup.x + pickup.width < -30) {
      pickups.splice(i, 1);
      continue;
    }

    if (rectsOverlap(player, pickup)) {
      pickups.splice(i, 1);
      score += 15;
      if (shield < 3 && Math.random() < 0.35) shield += 1;
      updateHud();
      explode(player.x + 20, player.y + 8, '#67e8f9');
      setMessage('Energicell säkrad. Rebellerna gillar det där.');
    }
  }
}

function updateExplosions() {
  for (let i = explosions.length - 1; i >= 0; i -= 1) {
    const boom = explosions[i];
    boom.life -= 1;
    boom.radius += 0.9;
    if (boom.life <= 0) explosions.splice(i, 1);
  }
}

function updateMission(delta) {
  if (gameState !== 'running') return;
  progress = clamp(progress + delta * 0.0036, 0, missionLength);
  if (progress >= missionLength) {
    setMessage('Målet låst. Skjut ett sista skott i öppningen!');
  }
  updateHud();
}

function drawBackground() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const sky = ctx.createLinearGradient(0, 0, 0, canvas.height);
  sky.addColorStop(0, '#020617');
  sky.addColorStop(1, '#081426');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  stars.forEach(star => {
    ctx.fillStyle = `rgba(255,255,255,${0.45 + star.speed / 4})`;
    ctx.fillRect(star.x, star.y, star.size, star.size);
  });

  drawTrench();
}

function drawTrench() {
  const scroll = progress * 7;
  ctx.fillStyle = '#111827';
  ctx.fillRect(0, 58, canvas.width, 28);
  ctx.fillRect(0, canvas.height - 88, canvas.width, 34);

  ctx.fillStyle = '#334155';
  for (let x = -40; x < canvas.width + 80; x += 74) {
    const offset = (x - scroll) % 74;
    ctx.fillRect(offset, 82, 30, 16);
    ctx.fillRect(offset + 8, canvas.height - 106, 34, 16);
  }

  ctx.strokeStyle = '#64748b';
  ctx.lineWidth = 2;
  for (let x = -80; x < canvas.width + 80; x += 80) {
    const offset = (x - scroll * 1.8) % 80;
    ctx.beginPath();
    ctx.moveTo(offset, 86);
    ctx.lineTo(offset + 12, canvas.height - 88);
    ctx.stroke();
  }

  ctx.fillStyle = 'rgba(248, 250, 252, 0.08)';
  ctx.fillRect(0, canvas.height / 2 - 2, canvas.width, 4);
}

function drawPlayer() {
  const blink = flashTimer > 0 && Math.floor(flashTimer / 4) % 2 === 0;
  if (blink) return;

  ctx.save();
  ctx.translate(player.x, player.y);

  ctx.fillStyle = '#e5e7eb';
  ctx.beginPath();
  ctx.moveTo(0, player.height / 2);
  ctx.lineTo(22, 0);
  ctx.lineTo(42, 6);
  ctx.lineTo(48, player.height / 2);
  ctx.lineTo(42, player.height - 6);
  ctx.lineTo(22, player.height);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#ef4444';
  ctx.fillRect(14, 8, 10, 6);
  ctx.fillRect(14, player.height - 14, 10, 6);

  ctx.fillStyle = '#93c5fd';
  ctx.beginPath();
  ctx.moveTo(24, 6);
  ctx.lineTo(34, player.height / 2);
  ctx.lineTo(24, player.height - 6);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(8, player.height / 2 - 2, 10, 4);
  ctx.restore();
}

function drawBolts() {
  bolts.forEach(bolt => {
    ctx.fillStyle = bolt.finisher ? '#fbbf24' : '#ef4444';
    ctx.fillRect(bolt.x, bolt.y, bolt.width, bolt.height);
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.fillRect(bolt.x - 6, bolt.y + 1, 6, Math.max(2, bolt.height - 2));
  });
}

function drawEnemies() {
  enemies.forEach(enemy => {
    if (enemy.type === 'tie') {
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(enemy.x + 12, enemy.y + 6, 14, 22);
      ctx.fillStyle = '#475569';
      ctx.fillRect(enemy.x, enemy.y, 12, 34);
      ctx.fillRect(enemy.x + 26, enemy.y, 12, 34);
      ctx.fillStyle = '#111827';
      ctx.fillRect(enemy.x + 14, enemy.y + 10, 10, 14);
      return;
    }

    ctx.fillStyle = '#64748b';
    ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height);
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(enemy.x + 18, enemy.y + 18, 40, 6);
    ctx.fillRect(enemy.x + 18, enemy.y + 34, 40, 6);
  });
}

function drawPickups() {
  pickups.forEach(pickup => {
    ctx.save();
    ctx.translate(pickup.x + pickup.width / 2, pickup.y + pickup.height / 2);
    ctx.rotate(pickup.spin);
    ctx.fillStyle = '#22d3ee';
    ctx.fillRect(-8, -8, 16, 16);
    ctx.fillStyle = '#ecfeff';
    ctx.fillRect(-2, -10, 4, 20);
    ctx.fillRect(-10, -2, 20, 4);
    ctx.restore();
  });
}

function drawExplosions() {
  explosions.forEach(boom => {
    ctx.beginPath();
    ctx.fillStyle = boom.color;
    ctx.globalAlpha = Math.max(0, boom.life / 24);
    ctx.arc(boom.x, boom.y, boom.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  });
}

function drawProgressBar() {
  ctx.fillStyle = 'rgba(15, 23, 42, 0.72)';
  ctx.fillRect(24, 18, 220, 16);
  ctx.fillStyle = progress >= missionLength ? '#fbbf24' : '#60a5fa';
  ctx.fillRect(24, 18, 220 * (progress / missionLength), 16);
  ctx.strokeStyle = 'rgba(255,255,255,0.24)';
  ctx.strokeRect(24, 18, 220, 16);
}

function drawOverlay() {
  if (gameState === 'running') return;
  ctx.fillStyle = 'rgba(2, 6, 23, 0.6)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#f8fafc';
  ctx.textAlign = 'center';
  ctx.font = 'bold 54px Inter, sans-serif';
  ctx.fillText(gameState === 'won' ? 'Mål träffat!' : 'Uppdrag misslyckades', canvas.width / 2, canvas.height / 2 - 10);
  ctx.font = '24px Inter, sans-serif';
  ctx.fillText('Tryck på Starta om för ett nytt försök', canvas.width / 2, canvas.height / 2 + 36);
}

function draw() {
  drawBackground();
  drawProgressBar();
  drawPickups();
  drawEnemies();
  drawBolts();
  drawPlayer();
  drawExplosions();
  drawOverlay();
}

function loop(now) {
  const delta = Math.min(32, now - (lastFrame || now));
  lastFrame = now;

  if (gameState === 'running') {
    updateStars(delta);
    updatePlayer();
    updateBolts();
    updateEnemies(delta);
    updatePickups(delta);
    updateExplosions();
    updateMission(delta);
  } else {
    updateStars(delta);
    updateExplosions();
  }

  if (flashTimer > 0) flashTimer -= 1;
  draw();
  animationId = requestAnimationFrame(loop);
}

function restartGame() {
  cancelAnimationFrame(animationId);
  lastFrame = 0;
  resetGame();
  draw();
  animationId = requestAnimationFrame(loop);
}

window.addEventListener('keydown', event => {
  const key = event.key.toLowerCase();
  if (key === 'arrowleft' || key === 'a') keys.left = true;
  if (key === 'arrowright' || key === 'd') keys.right = true;
  if (key === 'arrowup' || key === 'w') keys.up = true;
  if (key === 'arrowdown' || key === 's') keys.down = true;
  if (key === ' ') {
    event.preventDefault();
    shoot();
  }
});

window.addEventListener('keyup', event => {
  const key = event.key.toLowerCase();
  if (key === 'arrowleft' || key === 'a') keys.left = false;
  if (key === 'arrowright' || key === 'd') keys.right = false;
  if (key === 'arrowup' || key === 'w') keys.up = false;
  if (key === 'arrowdown' || key === 's') keys.down = false;
});

restartBtn.addEventListener('click', restartGame);
controlButtons.forEach(button => {
  const action = button.dataset.action;

  const press = event => {
    event.preventDefault();
    if (action === 'left') keys.left = true;
    if (action === 'right') keys.right = true;
    if (action === 'up') keys.up = true;
    if (action === 'down') keys.down = true;
    if (action === 'shoot') shoot();
    if (action === 'restart') restartGame();
  };

  const release = event => {
    event.preventDefault();
    if (action === 'left') keys.left = false;
    if (action === 'right') keys.right = false;
    if (action === 'up') keys.up = false;
    if (action === 'down') keys.down = false;
  };

  button.addEventListener('mousedown', press);
  button.addEventListener('mouseup', release);
  button.addEventListener('mouseleave', release);
  button.addEventListener('touchstart', press, { passive: false });
  button.addEventListener('touchend', release, { passive: false });
});

restartGame();
