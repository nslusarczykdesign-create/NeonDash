// Level is a simple horizontal sequence of columns (tile aligned).
// 0 = empty, 1 = block (solid), 2 = spike
export default class Level {
  constructor(opts = {}){
    this.tile = opts.tileSize || 64;
    this.canvasW = opts.canvasW || 1280;
    this.canvasH = opts.canvasH || 720;

    this.generate();
  }

  generate(){
    // For a ~30s level at player speed 300 px/s we need about 300*30 px width -> ~9000px.
    // Using tile width of 64 => ~140 columns. We'll create ~160 columns for breathing room.
    const columns = 160;
    this.cols = [];
    // base ground height
    this.groundTilesHigh = 2; // number of tile rows for ground thickness
    // Create a rhythm: some platforms, gaps, spikes
    for (let i = 0; i < columns; i++){
      // default empty
      this.cols[i] = 0;
    }

    // Add ground blocks (type 1) at most columns with some gaps
    let i = 0;
    while (i < columns){
      // random gap length
      const gap = Math.random() < 0.25 ? Math.floor(1 + Math.random()*3) : 0;
      i += gap;
      if (i >= columns) break;
      // platform length
      const len = 1 + Math.floor(Math.random()*4);
      for (let k = 0; k < len && i < columns; k++, i++){
        // sometimes put spike instead of full block
        if (Math.random() < 0.08){
          this.cols[i] = 2; // spike sits on ground
        } else {
          this.cols[i] = 1; // block
        }
      }
    }

    // ensure first few columns are safe
    for (let j = 0; j < 6; j++) this.cols[j] = 1;

    // save length
    this.columns = this.cols.length;
  }

  reset(){
    this.generate();
  }

  groundY(){
    // ground baseline closer to bottom
    return this.canvasH * 0.82;
  }

  totalWidth(){
    return this.columns * this.tile;
  }

  getActiveColliders(cameraX, viewW){
    // return array of rectangles in world coords for tiles in view
    const startCol = Math.floor(cameraX / this.tile) - 2;
    const endCol = Math.ceil((cameraX + viewW) / this.tile) + 2;
    const res = [];
    const groundY = this.groundY();
    for (let c = Math.max(0, startCol); c <= Math.min(this.columns-1, endCol); c++){
      const t = this.cols[c];
      if (t === 1){
        // block full tile height (from ground upwards)
        const x = c * this.tile;
        const h = this.tile * 1.0; // single tile tall block
        const y = groundY - h;
        res.push({ x, y, w: this.tile, h, type: 1 });
      } else if (t === 2){
        // spike: we model as small rectangle (but collision is death)
        const x = c * this.tile + this.tile*0.15;
        const w = this.tile * 0.7;
        const h = this.tile * 0.45;
        const y = groundY - h;
        res.push({ x, y, w, h, type: 2 });
      }
    }
    return res;
  }

  draw(ctx, viewW, viewH){
    const groundY = this.groundY();

    // draw distant grid/lines for neon feel
    ctx.save();
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(255,255,255,0.02)';
    for (let gx = -2000; gx < viewW + 2000; gx += 80){
      ctx.beginPath();
      ctx.moveTo(gx, 0);
      ctx.lineTo(gx, viewH);
      ctx.stroke();
    }
    ctx.restore();

    // draw ground
    ctx.save();
    ctx.fillStyle = '#0b0b0b';
    ctx.fillRect(-10000, groundY, 20000, viewH - groundY);
    ctx.restore();

    // draw tiles
    const colliders = this.getActiveColliders(0, viewW + 2000);
    for (let c of colliders){
      if (c.type === 1){
        ctx.save();
        ctx.fillStyle = '#00faff';
        ctx.shadowBlur = 18;
        ctx.shadowColor = '#00faff';
        ctx.fillRect(c.x, c.y, c.w, c.h);
        // top highlight
        ctx.fillStyle = 'rgba(255,255,255,0.06)';
        ctx.fillRect(c.x, c.y, c.w, 6);
        ctx.restore();
      } else if (c.type === 2){
        // spike
        ctx.save();
        ctx.fillStyle = '#ff4d6d';
        ctx.shadowBlur = 14;
        ctx.shadowColor = '#ff4d6d';
        // draw simple triangle spike
        ctx.beginPath();
        ctx.moveTo(c.x, c.y + c.h);
        ctx.lineTo(c.x + c.w/2, c.y);
        ctx.lineTo(c.x + c.w, c.y + c.h);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
    }

    // optionally draw horizon glow
    ctx.save();
    const g = ctx.createLinearGradient(0, groundY - 120, 0, groundY + 40);
    g.addColorStop(0, 'rgba(0,250,255,0.02)');
    g.addColorStop(1, 'rgba(0,250,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(-10000, groundY - 120, 20000, 120);
    ctx.restore();
  }
}