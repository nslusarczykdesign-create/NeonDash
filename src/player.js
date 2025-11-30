export default class Player {
  constructor(opts = {}){
    this.tile = opts.tile || 64;
    this.w = this.tile * 0.9;
    this.h = this.tile * 0.9;
    this.x = opts.x || 100;
    this.y = opts.y || 0;
    this.vx = 300; 
    this.vy = 0;
    this.g = 1800; 
    this.jumpSpeed = -700;
    this.onGround = false;

    this.angle = 0; 
    this.angVel = Math.PI / 2;
    this.rotationWhileAirborne = this.angVel;

    this.trailParticles = [];
    this.deathParticles = [];

    this.prevY = this.y;
    this.reset();
  }

  reset(){
    this.x = 100;
    this.y = 200; // Start in air
    this.vy = 0;
    this.onGround = false;
    this.angle = 0;
    this.trailParticles = [];
    this.deathParticles = [];
    this.prevY = this.y;
  }

  cx(){ return this.x + this.w/2; }
  cy(){ return this.y + this.h/2; }

  deathBox(){
    const shrink = 0.20;
    const sx = this.w * shrink;
    const sy = this.h * shrink;
    return {
      x: this.x + sx/2,
      y: this.y + sy/2,
      w: this.w - sx,
      h: this.h - sy
    };
  }

  update(dt, input, level){
    this.prevY = this.y;

    this.x += this.vx * dt;

    if (input.isPressed){
      if (this.onGround){
        this.jump();
      }
      input.consumePress();
    }

    this.vy += this.g * dt;
    this.y += this.vy * dt;

    if (!this.onGround){
      this.angle += this.rotationWhileAirborne * dt;
    }

    // --- THE FIX ---
    // Do NOT check level.groundY() here. 
    // We let main.js handle all collisions.
    this.onGround = false; 

    this.angle = normalizeAngle(this.angle);
    this.makeTrail(dt);

    // particles update
    for (let p of this.trailParticles){
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.size *= (1 - dt * 3);
    }
    this.trailParticles = this.trailParticles.filter(p => p.life > 0 && p.size > 0.5);

    for (let d of this.deathParticles){
      d.life -= dt;
      d.vy += this.g * dt * 0.5;
      d.x += d.vx * dt;
      d.y += d.vy * dt;
      d.size *= (1 - dt * 1.5);
    }
    this.deathParticles = this.deathParticles.filter(p => p.life > 0);
  }

  makeTrail(dt){
    const p = {
      x: this.cx(),
      y: this.cy(),
      vx: -this.vx * 0.05,
      vy: (Math.random()-0.5)*20,
      life: 0.33,
      size: Math.max(4, Math.min(this.w, this.h) * 0.6),
      angle: this.angle,
      color: Math.random() > 0.5 ? '#00faff' : '#7cff00',
    };
    this.trailParticles.push(p);
    if (this.trailParticles.length > 30) this.trailParticles.shift();
  }

  updateParticles(dt){ /* handled in update */ }

  drawParticles(ctx){
    for (let p of this.trailParticles){
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.angle);
      ctx.globalAlpha = Math.max(0, p.life / 0.33) * 0.6;
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.size/2, -p.size/2, p.size, p.size);
      ctx.restore();
    }
    for (let p of this.deathParticles){
      ctx.save();
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - p.size/2, p.y - p.size/2, p.size, p.size);
      ctx.restore();
    }
  }

  draw(ctx){
    ctx.save();
    ctx.translate(this.x + this.w/2, this.y + this.h/2);
    ctx.rotate(this.angle);
    ctx.fillStyle = '#00faff';
    ctx.shadowBlur = 18;
    ctx.shadowColor = '#00faff';
    ctx.fillRect(-this.w/2, -this.h/2, this.w, this.h);
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.strokeRect(-this.w/2, -this.h/2, this.w, this.h);
    ctx.restore();
  }

  landOn(blockTop){
    this.onGround = true;
    this.vy = 0;
    this.y = blockTop - this.h;
    const snap = Math.PI / 2;
    this.angle = Math.round(this.angle / snap) * snap;
  }

  jump(){
    this.vy = this.jumpSpeed;
    this.onGround = false;
  }

  die(){
    this.vx = 0;
  }
}

function normalizeAngle(a){
  while (a > Math.PI) a -= Math.PI*2;
  while (a <= -Math.PI) a += Math.PI*2;
  return a;
}