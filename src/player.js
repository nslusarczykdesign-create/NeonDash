export default class Player {
  constructor(opts = {}){
    this.tile = opts.tile || 64;
    this.w = this.tile * 0.9;
    this.h = this.tile * 0.9;
    this.x = opts.x || 100;
    this.y = opts.y || 0;
    this.vx = 300; // constant forward speed px/s
    this.vy = 0;
    this.g = 1800; // gravity
    this.jumpSpeed = -700;
    this.onGround = false;

    this.angle = 0; // radians
    this.angVel = Math.PI / 2; // rotate 90 degrees per second while airborne
    this.rotationWhileAirborne = this.angVel;

    this.trailParticles = [];
    this.deathParticles = [];

    this.prevY = this.y;
    this.holdJump = false;

    this.reset();
  }

  reset(){
    this.x = 100;
    this.y = 200;
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
    // 20% smaller than visual sprite
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

    // horizontal progression (constant)
    this.x += this.vx * dt;

    // input jump pressed
    if (input.isPressed){
      if (this.onGround){
        this.jump();
      }
      input.consumePress();
    }

    // physics
    this.vy += this.g * dt;
    this.y += this.vy * dt;

    // rotation while airborne
    if (!this.onGround){
      this.angle += this.rotationWhileAirborne * dt;
    }

    // We rely on main.js collision detection to set onGround.
    // If we are not colliding with a block this frame (handled in main),
    // we assume we are in the air until the next collision check.
    // Resetting onGround here allows falling off ledges.
    this.onGround = false;

    // keep angle normalized
    this.angle = normalizeAngle(this.angle);

    // create trail
    this.makeTrail(dt);

    // update particles
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
    // leave faint, shrinking copies behind
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

  updateParticles(dt){
    // handled inside update
  }

  drawParticles(ctx){
    // trail
    for (let p of this.trailParticles){
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.angle);
      ctx.globalAlpha = Math.max(0, p.life / 0.33) * 0.6;
      ctx.fillStyle = p.color;
      ctx.shadowBlur = 12;
      ctx.shadowColor = p.color;
      ctx.fillRect(-p.size/2, -p.size/2, p.size, p.size);
      ctx.restore();
    }
    // death particles
    for (let p of this.deathParticles){
      ctx.save();
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.fillStyle = p.color;
      ctx.shadowBlur = 8;
      ctx.shadowColor = p.color;
      ctx.fillRect(p.x - p.size/2, p.y - p.size/2, p.size, p.size);
      ctx.restore();
    }
  }

  draw(ctx){
    ctx.save();
    ctx.translate(this.x + this.w/2, this.y + this.h/2);
    ctx.rotate(this.angle);
    // neon fill
    ctx.fillStyle = '#00faff';
    ctx.shadowBlur = 18;
    ctx.shadowColor = '#00faff';
    ctx.fillRect(-this.w/2, -this.h/2, this.w, this.h);

    // visual outline
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.strokeRect(-this.w/2, -this.h/2, this.w, this.h);

    ctx.restore();

    // For debugging: draw death hitbox
    // const db = this.deathBox();
    // ctx.save();
    // ctx.strokeStyle = 'yellow';
    // ctx.strokeRect(db.x, db.y, db.w, db.h);
    // ctx.restore();
  }

  landOn(blockTop){
    this.onGround = true;
    this.vy = 0;
    this.y = blockTop - this.h;
    // snap rotation to nearest 90 degrees (π/2)
    const snap = Math.PI / 2;
    const snapped = Math.round(this.angle / snap) * snap;
    this.angle = snapped;
  }

  jump(){
    this.vy = this.jumpSpeed;
    this.onGround = false;
    // start rotation if not rotating
    // keep angle as is, angular velocity applies in update
  }

  die(){
    // stop forward speed
    this.vx = 0;
  }
}

// helpers
function normalizeAngle(a){
  // keep between -PI..PI for numerical stability
  while (a > Math.PI) a -= Math.PI*2;
  while (a <= -Math.PI) a += Math.PI*2;
  return a;
}
