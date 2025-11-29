import Player from './player.js';
import Level from './level.js';
import Input from './input.js';

// Canvas setup
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d', { alpha: false });

let W = 1280, H = 720;
function resize(){
  W = Math.max(640, innerWidth);
  H = Math.max(480, innerHeight);
  canvas.width = W;
  canvas.height = H;
}
addEventListener('resize', resize);
resize();

// Game variables
const neon = '#00faff';
const neon2 = '#7cff00';

const TILE = 64;

const input = new Input();
const level = new Level({ tileSize: TILE, canvasW: W, canvasH: H });
const player = new Player({ x: 100, y: 0, tile: TILE });

let cameraX = 0;
let last = performance.now();
let acc = 0;
let running = true;
let dead = false;
let distance = 0;

const statusEl = document.getElementById('status');
const restartBtn = document.getElementById('restart');
restartBtn.addEventListener('click', () => resetGame());
canvas.addEventListener('click', () => {
  if (dead) resetGame();
});

function resetGame(){
  player.reset();
  level.reset();
  cameraX = 0;
  last = performance.now();
  dead = false;
  running = true;
  distance = 0;
  restartBtn.hidden = true;
  statusEl.textContent = '';
}

function update(dt){
  if (!running) return;

  // player auto-forward speed is in player.vx
  player.update(dt, input, level);

  // camera: keep player at 25% screen width
  const targetCameraX = Math.max(0, player.x - W * 0.25);
  cameraX = targetCameraX;

  // collisions and death detection
  // Get blocks in near camera window
  const colliders = level.getActiveColliders(cameraX, W);
  let landingThisFrame = false;

  for (let c of colliders){
    // c: {x,y,w,h,type}
    // compute death hitbox (20% smaller than visual)
    const pb = player.deathBox();
    const overlap = aabbIntersect(pb, c);
    if (overlap){
      // determine if this is a landing on the top
      const prevBottom = player.prevY + player.h;
      const curBottom = player.y + player.h;
      const blockTop = c.y;
      const horizontallyOverlapping = (player.x + player.w > c.x + 2) && (player.x < c.x + c.w - 2);
      const movedFromAbove = prevBottom <= blockTop && curBottom >= blockTop;
      if (c.type === 1 && movedFromAbove && horizontallyOverlapping && Math.abs((curBottom) - blockTop) < 40 && player.vy >= 0){
        // safe landing: snap player to top
        player.landOn(blockTop);
        landingThisFrame = true;
      } else {
        // touching side or spike is death
        dead = true;
        running = false;
        player.die();
        spawnDeathParticles(player.cx(), player.cy());
        restartBtn.hidden = false;
        statusEl.textContent = 'You Died — Click / Tap to Restart';
      }
    }
  }

  // If we landed and the input is held, trigger jump immediately
  if (landingThisFrame && input.isHeld){
    player.jump();
  }

  // Update particles
  player.updateParticles(dt);

  // distance for level progress
  distance = player.x;
}

function aabbIntersect(a, b){
  return !(a.x + a.w <= b.x || a.x >= b.x + b.w || a.y + a.h <= b.y || a.y >= b.y + b.h);
}

function spawnDeathParticles(x, y){
  const count = 20;
  for (let i = 0; i < count; i++){
    const angle = Math.random() * Math.PI * 2;
    const speed = 100 + Math.random() * 200;
    const vx = Math.cos(angle) * speed;
    const vy = Math.sin(angle) * speed * 0.5 - 80;
    player.deathParticles.push({
      x, y, vx, vy,
      life: 1,
      size: 6 + Math.random()*6,
      color: Math.random() > 0.5 ? neon : neon2
    });
  }
}

// render
function render(){
  // background
  ctx.fillStyle = '#1a1a1a';
  ctx.fillRect(0,0,W,H);

  ctx.save();
  // translate camera
  ctx.translate(-cameraX, 0);

  // draw level
  level.draw(ctx, W, H);

  // draw player (with glow)
  player.draw(ctx);

  // draw player's particles (trail)
  player.drawParticles(ctx);

  ctx.restore();

  // UI overlay: progress
  ctx.save();
  ctx.fillStyle = 'rgba(255,255,255,0.02)';
  ctx.fillRect(10, H - 36, W - 20, 20);
  const totalLen = level.totalWidth();
  const prog = Math.min(1, distance / Math.max(1,totalLen - W*0.25));
  ctx.fillStyle = 'rgba(0,250,255,0.16)';
  ctx.fillRect(10, H - 36, (W - 20) * prog, 20);
  ctx.restore();
}

// main loop
function loop(now){
  const dt = Math.min(0.03, (now - last) / 1000);
  last = now;

  update(dt);
  render();

  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

// Helper: simple AABB to be used by player/level (already inlined above)

// initial reset to layout player properly
resetGame();
