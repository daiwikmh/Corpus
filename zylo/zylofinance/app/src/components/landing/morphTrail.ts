export const TRAIL_MAX_POINTS = 60;
export const TRAIL_HEAD_R = 140;
export const TRAIL_NOISE_AMP = 44;
export const TRAIL_BLOB_PTS = 24;
export const TRAIL_FADE_SPEED = 0.92;
export const TRAIL_SAMPLE_DIST = 8;

export interface TrailPoint {
  x: number;
  y: number;
  r: number;
  alpha: number;
  seed: number;
}

/**
 * Organic blob rather than a circle: three sine bands beat against each other so
 * the outline keeps churning while the point sits in the trail.
 */
export function drawMorphBlob(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  t: number,
  seed: number,
) {
  if (r < 2) return;

  const pts: { x: number; y: number }[] = [];

  for (let i = 0; i < TRAIL_BLOB_PTS; i++) {
    const angle = (i / TRAIL_BLOB_PTS) * Math.PI * 2;
    const n1 = Math.sin(angle * 3 + t * 1.4 + seed) * 0.45;
    const n2 = Math.sin(angle * 5 - t * 0.9 + seed * 2.3) * 0.3;
    const n3 = Math.cos(angle * 2 + t * 1.8 + seed * 0.7) * 0.25;
    const noise = (n1 + n2 + n3) * TRAIL_NOISE_AMP * (r / TRAIL_HEAD_R);
    const rr = r + noise;
    pts.push({ x: cx + Math.cos(angle) * rr, y: cy + Math.sin(angle) * rr });
  }

  const first = pts[0];
  const last = pts[pts.length - 1];

  ctx.beginPath();
  ctx.moveTo((last.x + first.x) / 2, (last.y + first.y) / 2);

  for (let j = 0; j < pts.length; j++) {
    const cur = pts[j];
    const next = pts[(j + 1) % pts.length];
    ctx.quadraticCurveTo(cur.x, cur.y, (cur.x + next.x) / 2, (cur.y + next.y) / 2);
  }

  ctx.closePath();
  ctx.fill();
}

/**
 * Paints the trail into an offscreen canvas and hands it to a layer as a CSS
 * mask. `invert: false` punches holes in the front lily; `invert: true` shows
 * the reveal lily only where the trail has passed.
 */
export class MorphTrailLayer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D | null;
  private resting = true;

  constructor(
    private layer: HTMLElement,
    private invert: boolean,
  ) {
    this.canvas = document.createElement('canvas');
    this.canvas.style.display = 'none';
    document.body.appendChild(this.canvas);
    this.ctx = this.canvas.getContext('2d');
  }

  get width() {
    return this.canvas.width;
  }

  get height() {
    return this.canvas.height;
  }

  resize(w: number, h: number) {
    this.canvas.width = Math.max(1, Math.round(w));
    this.canvas.height = Math.max(1, Math.round(h));
  }

  render(points: TrailPoint[], time: number) {
    const ctx = this.ctx;
    if (!ctx) return;

    const { width: w, height: h } = this.canvas;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#ffffff';

    if (this.invert) {
      ctx.globalCompositeOperation = 'source-over';
      for (const p of points) {
        ctx.globalAlpha = p.alpha;
        drawMorphBlob(ctx, p.x, p.y, p.r, time, p.seed);
      }
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;
      ctx.fillRect(0, 0, w, h);
      ctx.globalCompositeOperation = 'destination-out';
      for (const p of points) {
        ctx.globalAlpha = p.alpha;
        drawMorphBlob(ctx, p.x, p.y, p.r, time, p.seed);
      }
    }

    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';

    const url = `url(${this.canvas.toDataURL()})`;
    this.layer.style.webkitMaskImage = url;
    this.layer.style.maskImage = url;
    this.layer.style.webkitMaskSize = '100% 100%';
    this.layer.style.maskSize = '100% 100%';
    this.layer.style.webkitMaskRepeat = 'no-repeat';
    this.layer.style.maskRepeat = 'no-repeat';
    this.resting = false;
  }

  rest() {
    if (this.resting) return;
    const blank = 'linear-gradient(#0000, #0000)';
    this.layer.style.webkitMaskImage = this.invert ? blank : 'none';
    this.layer.style.maskImage = this.invert ? blank : 'none';
    this.resting = true;
  }

  destroy() {
    this.canvas.remove();
    this.ctx = null;
  }
}
