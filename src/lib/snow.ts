/**
 * Falling snow for the home hero's Christmas season, drawn on one canvas.
 *
 * Tuned against iOS Weather's snow: five depths, most flakes faint distant specks, nearer ones
 * bigger and faster; crisp, irregular clumps that tumble; each flake on its own slight slant with
 * a small, quick flutter; calm air with a rare gentle gust. Some flakes land on `.perch` edges
 * and melt; moving the pointer through the snow stirs it.
 *
 * It costs battery, so it runs only while the hero is on screen and the tab is visible. With
 * reduced motion it draws one still frame.
 */

interface Layer {
  kind: 'dot' | 'clump';
  /** Flakes per 390 × 844 px, before the density factor. */
  n: number;
  rMin: number;
  rMax: number;
  vMin: number;
  vMax: number;
  aMin: number;
  aMax: number;
  slant: number;
  fMin: number;
  fMax: number;
  wind: number;
  tumble?: boolean;
  settle?: boolean;
}

const LAYERS: Layer[] = [
  { kind: 'dot', n: 160, rMin: 0.45, rMax: 0.85, vMin: 32, vMax: 48, aMin: 0.12, aMax: 0.26, slant: 6, fMin: 0.3, fMax: 0.8, wind: 0.3 },
  { kind: 'dot', n: 150, rMin: 0.8, rMax: 1.3, vMin: 52, vMax: 78, aMin: 0.28, aMax: 0.5, slant: 9, fMin: 0.5, fMax: 1.2, wind: 0.5 },
  { kind: 'clump', n: 85, rMin: 1.5, rMax: 2.4, vMin: 78, vMax: 112, aMin: 0.5, aMax: 0.78, slant: 12, fMin: 0.8, fMax: 1.8, wind: 0.8, tumble: true, settle: true },
  { kind: 'clump', n: 22, rMin: 2.6, rMax: 4, vMin: 108, vMax: 148, aMin: 0.55, aMax: 0.85, slant: 16, fMin: 1, fMax: 2.4, wind: 1, tumble: true, settle: true },
  // No blurred near-flakes (Weather has a few): on the green-black band they read as smudges.
];
/** The mockup's "medium": 70% of Weather's density, to spare battery. */
const DENSITY = 0.7;
const BASE_AREA = 390 * 844;
const VARIANTS = 10;
const SPRITE = 64;
const MAX_SETTLED = 140;
const STIR_RADIUS = 80;
const TAU = Math.PI * 2;

interface Flake {
  layer: Layer;
  sprite: HTMLCanvasElement;
  x: number;
  y: number;
  r: number;
  vy: number;
  sx: number;
  fa: number;
  ff: number;
  fp: number;
  a: number;
  rot: number;
  spin: number;
  ts: number;
  tp: number;
  pvx: number;
  pvy: number;
  glint: number;
}

interface Settled {
  sprite: HTMLCanvasElement;
  x: number;
  y: number;
  r: number;
  rot: number;
  a: number;
  born: number;
  life: number;
}

interface Edge {
  left: number;
  right: number;
  top: number;
}

const rand = (a: number, b: number) => a + Math.random() * (b - a);
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/** One irregular polygon: real flakes are jagged clumps, not round dots. */
function blob(g: CanvasRenderingContext2D, cx: number, cy: number, radius: number) {
  const n = 6 + Math.floor(Math.random() * 4);
  g.beginPath();
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU + rand(-0.25, 0.25);
    const rr = radius * rand(0.62, 1);
    g.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
  }
  g.closePath();
  g.fill();
}

function makeSprite(kind: Layer['kind']) {
  const c = document.createElement('canvas');
  c.width = c.height = SPRITE;
  const g = c.getContext('2d');
  if (!g) return c;
  const m = SPRITE / 2;
  g.shadowColor = 'rgba(240,244,250,0.6)';
  g.shadowBlur = 2;
  g.fillStyle = 'rgb(236,240,247)';
  if (kind === 'dot') {
    g.beginPath();
    g.arc(m, m, 13, 0, TAU);
    g.fill();
    return c;
  }
  blob(g, m, m, rand(11, 14));
  const extra = Math.floor(Math.random() * 3);
  for (let i = 0; i < extra; i++) blob(g, m + rand(-6, 6), m + rand(-6, 6), rand(7, 10));
  return c;
}

export function startSnow(canvas: HTMLCanvasElement) {
  const context = canvas.getContext('2d');
  const parent = canvas.parentElement;
  if (!context || !parent) return;
  // Typed again so the narrowing holds inside the hoisted functions below.
  const ctx: CanvasRenderingContext2D = context;
  const scene: HTMLElement = parent;
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const sprites = new Map(LAYERS.map((L) => [L, Array.from({ length: VARIANTS }, () => makeSprite(L.kind))]));

  let width = 0;
  let height = 0;
  let scale = 1;
  let flakes: Flake[] = [];
  let settled: Settled[] = [];
  let edges: Edge[] = [];
  let rampStart = performance.now() / 1000;
  let last = performance.now();
  let raf = 0;
  let onScreen = true;
  let pointer: { x: number; y: number; vx: number; vy: number; at: number } | undefined;
  const gust = { start: -99, dur: 1, peak: 0, next: last / 1000 + 8 };

  function populate() {
    const area = (width * height) / BASE_AREA;
    flakes = LAYERS.flatMap((layer) => {
      const variants = sprites.get(layer) ?? [];
      return Array.from({ length: Math.round(layer.n * DENSITY * area) }, () => ({
        layer,
        sprite: variants[Math.floor(Math.random() * variants.length)]!,
        x: rand(0, width),
        y: rand(-20, height),
        r: rand(layer.rMin, layer.rMax),
        vy: rand(layer.vMin, layer.vMax),
        sx: rand(-layer.slant, layer.slant),
        fa: rand(layer.fMin, layer.fMax),
        ff: rand(1.4, 3.2),
        fp: rand(0, TAU),
        a: rand(layer.aMin, layer.aMax),
        rot: rand(0, TAU),
        spin: rand(-1.5, 1.5),
        ts: rand(0.8, 2.2),
        tp: rand(0, TAU),
        pvx: 0,
        pvy: 0,
        glint: 0,
      }));
    });
  }

  /** Top edges the snow can land on, in canvas px. */
  function measure() {
    const box = canvas.getBoundingClientRect();
    edges = [...scene.querySelectorAll('.perch')]
      .map((el) => {
        const r = el.getBoundingClientRect();
        return { left: r.left - box.left, right: r.right - box.left, top: r.top - box.top };
      })
      .filter((e) => e.right - e.left > 60);
  }

  function resize() {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (!w || !h) return;
    scale = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(w * scale);
    canvas.height = Math.round(h * scale);
    // Repopulate only when the area changes noticeably (not on a phone's toolbar resize).
    const changed = Math.abs(w * h - width * height) / Math.max(1, width * height) > 0.15;
    width = w;
    height = h;
    if (changed || !flakes.length) populate();
    measure();
    if (still) draw(performance.now());
  }

  function windAt(t: number) {
    if (t > gust.next) {
      gust.start = t;
      gust.dur = rand(3, 5);
      gust.peak = (Math.random() < 0.5 ? -1 : 1) * rand(20, 45);
      gust.next = t + gust.dur + rand(10, 20);
    }
    const u = (t - gust.start) / gust.dur;
    const g = u >= 0 && u <= 1 ? gust.peak * Math.sin(Math.PI * u) ** 2 : 0;
    return 3 * Math.sin(t * 0.11) + 2 * Math.sin(t * 0.37 + 1) + g;
  }

  function step(now: number, t: number, dt: number) {
    const wind = windAt(t);
    const p = pointer;
    const stirring = p && now - p.at < 120;
    for (const f of flakes) {
      const L = f.layer;
      if (stirring) {
        const dx = f.x - p.x;
        const dy = f.y - p.y;
        const dist = Math.hypot(dx, dy);
        if (dist < STIR_RADIUS) {
          const w = 1 - dist / STIR_RADIUS;
          f.pvx += (p.vx * w * 4 + dx * w * 20) * dt;
          f.pvy += (p.vy * w * 4 + dy * w * 20) * dt;
        }
      }
      const damp = Math.exp(-dt * 2.2);
      f.pvx = clamp(f.pvx * damp, -350, 350);
      f.pvy = clamp(f.pvy * damp, -350, 350);
      const prevY = f.y;
      f.x += (wind * L.wind + f.sx + f.pvx) * dt;
      f.y += (f.vy + f.pvy) * dt;
      f.rot += f.spin * dt;
      if (L.settle) {
        const edge = edges.find((e) => prevY < e.top && f.y >= e.top && f.x > e.left + 10 && f.x < e.right - 10);
        if (edge && Math.random() < 0.35) {
          settled.push({ sprite: f.sprite, x: f.x, y: edge.top - f.r * 0.5, r: f.r * 0.9, rot: rand(-0.3, 0.3), a: Math.min(1, f.a + 0.15), born: t, life: rand(4, 9) });
          if (settled.length > MAX_SETTLED) settled.shift();
          f.y = -30;
          f.x = rand(0, width);
        }
      }
      if (f.y > height + 30) {
        f.y = -30;
        f.x = rand(0, width);
        f.pvx = f.pvy = 0;
      }
      if (f.x < -30) f.x += width + 60;
      if (f.x > width + 30) f.x -= width + 60;
      if (L.settle && Math.random() < dt * 0.02) f.glint = 1;
      f.glint = Math.max(0, f.glint - dt * 2.5);
    }
  }

  function draw(now: number) {
    const t = now / 1000;
    const ramp = still ? 1 : clamp((t - rampStart) / 2.5, 0, 1);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Settled flakes lie flat on their edge, then shrink and fade as they melt.
    settled = settled.filter((s) => t - s.born < s.life);
    for (const s of settled) {
      const age = (t - s.born) / s.life;
      const fade = age < 0.65 ? 1 : 1 - (age - 0.65) / 0.35;
      const d = s.r * 4 * (0.55 + 0.45 * fade);
      const c = Math.cos(s.rot) * scale;
      const n = Math.sin(s.rot) * scale;
      ctx.setTransform(c, n, -n * 0.55, c * 0.55, s.x * scale, s.y * scale);
      ctx.globalAlpha = s.a * fade;
      ctx.drawImage(s.sprite, -d / 2, -d / 2, d, d);
    }

    for (const f of flakes) {
      const x = f.x + f.fa * Math.sin(TAU * f.ff * t + f.fp);
      const d = f.r * 4;
      if (f.layer.tumble) {
        // Tumbling clumps foreshorten as they turn.
        const sy = 0.5 + 0.5 * Math.abs(Math.cos(t * f.ts + f.tp));
        const c = Math.cos(f.rot) * scale;
        const n = Math.sin(f.rot) * scale;
        ctx.setTransform(c, n, -n * sy, c * sy, x * scale, f.y * scale);
      } else {
        ctx.setTransform(scale, 0, 0, scale, x * scale, f.y * scale);
      }
      ctx.globalAlpha = Math.min(1, f.a * ramp + f.glint * 0.4);
      ctx.drawImage(f.sprite, -d / 2, -d / 2, d, d);
    }
    ctx.globalAlpha = 1;
  }

  let frames = 0;
  function tick(now: number) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (frames++ % 30 === 0) measure();
    step(now, now / 1000, dt);
    draw(now);
    raf = requestAnimationFrame(tick);
  }

  function run() {
    cancelAnimationFrame(raf);
    if (still || !onScreen || document.hidden) return;
    last = performance.now();
    raf = requestAnimationFrame(tick);
  }

  scene.addEventListener('pointermove', (e) => {
    const box = canvas.getBoundingClientRect();
    const x = e.clientX - box.left;
    const y = e.clientY - box.top;
    const now = performance.now();
    const p = pointer;
    if (p && now - p.at < 100) {
      const dt = Math.max(0.008, (now - p.at) / 1000);
      pointer = { x, y, vx: (x - p.x) / dt, vy: (y - p.y) / dt, at: now };
    } else {
      pointer = { x, y, vx: 0, vy: 0, at: now };
    }
  });
  new ResizeObserver(resize).observe(canvas);
  new IntersectionObserver(([entry]) => {
    onScreen = entry?.isIntersecting ?? true;
    run();
  }).observe(scene);
  document.addEventListener('visibilitychange', run);
  rampStart = performance.now() / 1000;
  resize();
  run();
}
