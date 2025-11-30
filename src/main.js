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
  const colliders = level.getActiveColliders(cameraX, W);
  let landingThisFrame = false;

  const pb = player.deathBox();
  
  for (let c of colliders){
    // compute overlap (penetration amounts)
    const overlapX = Math.min(pb.x + pb.w, c.x + c.w) - Math.max(pb.x, c.x);
    const overlapY = Math.min(pb.y + pb.h, c.y + c.h) - Math.max(pb.y, c.y);

    if (overlapX > 0 && overlapY > 0){
      // Spike tiles are always death
      if (c.type === 2){
        die();
        break;
      }

      // --- THE FIX ---
      // Check if we were above the block in the previous frame.
      // If we were above, it is a landing. Period.
      // This ignores "corner hits" where the side overlap might be smaller than the vertical overlap.
      const prevBottom = player.prevY + player.h;
      const blockTop = c.y;
      const tolerance = 10; // Allow sloppy sub-pixel movements

      // Logic: Was I strictly above the block previously? And am I falling/flat (not jumping up through it)?
      const wasAbove = prevBottom <= blockTop + tolerance;
      const notJumpingUp = player.vy >= -50; 

      if (wasAbove && notJumpingUp) {
        // Safe landing
        player.landOn(blockTop);
        landingThisFrame = true;
        // Collision handled, skip death checks for this block
        continue;
      }

      // If we weren't above, we check if it's a side hit or a ceiling hit
      if (overlapY <= overlapX){
        // Vertical hit, but not from above -> Ceiling hit -> Death
        die();
        break;
      } else {
        // Horizontal hit -> Faceplant -> Death
        die();
        break;
      }
    }
  }

  // If we landed and the input is held, trigger jump immediately
  if (landingThisFrame && input.isHeld){
    player.jump();
  }

  player.updateParticles(dt);
  distance = player.x;
}

function die(){
  dead = true;
  running = false;
  player.die();
  spawnDeathParticles(player.cx(), player.cy());
  restartBtn.hidden = false;
  statusEl.textContent = 'You Died — Click / Tap to Restart';
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

function render(){
  // background
  ctx.fillStyle = '#1a1a1a';
  ctx.fillRect(0,0,W,H);

  ctx.save();
  ctx.translate(-cameraX, 0);

  level.draw(ctx, W, H);
  player.draw(ctx);
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

function loop(now){
  const dt = Math.min(0.03, (now - last) / 1000);
  last = now;
  update(dt);
  render();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

resetGame();