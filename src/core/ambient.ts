/**
 * Slow drifting motes behind everything, tinted with the accent color.
 * Static (drawn once) when the visitor prefers reduced motion.
 */
export function startAmbient(density = 1): void {
  const canvas = document.createElement('canvas');
  canvas.className = 'ambient';
  canvas.setAttribute('aria-hidden', 'true');
  document.body.prepend(canvas);
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let w = 0;
  let h = 0;
  let motes: { x: number; y: number; r: number; vy: number; vx: number; a: number; t: number }[] = [];

  const color = () => getComputedStyle(document.documentElement).getPropertyValue('--kg-accent').trim() || '#d9b98c';

  function resize(): void {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = window.innerWidth;
    h = window.innerHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    const count = Math.round(((w * h) / 18000) * density);
    motes = Array.from({ length: count }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      r: Math.random() * 1.4 + 0.3,
      vy: -(Math.random() * 0.15 + 0.03),
      vx: (Math.random() - 0.5) * 0.06,
      a: Math.random() * 0.5 + 0.15,
      t: Math.random() * Math.PI * 2,
    }));
  }

  function draw(): void {
    ctx!.clearRect(0, 0, w, h);
    ctx!.fillStyle = color();
    for (const m of motes) {
      if (!still) {
        m.y += m.vy;
        m.x += m.vx;
        m.t += 0.01;
        if (m.y < -5) { m.y = h + 5; m.x = Math.random() * w; }
      }
      ctx!.globalAlpha = m.a * (0.6 + 0.4 * Math.sin(m.t));
      ctx!.beginPath();
      ctx!.arc(m.x, m.y, m.r, 0, Math.PI * 2);
      ctx!.fill();
    }
    if (!still) requestAnimationFrame(draw);
  }

  resize();
  window.addEventListener('resize', () => { resize(); if (still) draw(); });
  draw();
}
