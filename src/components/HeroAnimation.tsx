import { useEffect, useRef } from 'react';

const COLS = 25, ROWS = 16;
const X0 = 76, X1 = 524, Y0 = 76, Y1 = 404;
const DX = (X1 - X0) / (COLS - 1);
const DY = (Y1 - Y0) / (ROWS - 1);
const ROW_YS = Array.from({ length: ROWS }, (_, r) => Y0 + r * DY);
const X_MIN = X0, X_MAX = X1;
const SPEED = 30 / 1000; // px per ms
const BASE_DOT_RADIUS = 2.9;
const BASE_DOT_FILL = 'rgba(26,23,20,.36)';
const RAINBOW = ['#ffbf18', '#f5323f', '#8a2387', '#56a7e8', '#43b983'];
const MID_ACTION_MIN_INTERVAL_MS = 2000;
const MID_ACTION_MAX_INTERVAL_MS = 3000;
const MID_ACTION_PAUSE_MS = 600;

type Plant = { cx: number; cy: number; el: SVGCircleElement; retained?: string };

export function HeroAnimation() {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    const NS = 'http://www.w3.org/2000/svg';
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Build plant grid
    const plantsGroup = svg.querySelector<SVGGElement>('#plants')!;
    const plants: Plant[] = [];
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const cx = X0 + c * DX;
        const cy = Y0 + r * DY;
        const dot = document.createElementNS(NS, 'circle') as SVGCircleElement;
        dot.setAttribute('cx', String(cx));
        dot.setAttribute('cy', String(cy));
        dot.setAttribute('r', String(BASE_DOT_RADIUS));
        dot.setAttribute('fill', BASE_DOT_FILL);
        plantsGroup.appendChild(dot);
        plants.push({ cx, cy, el: dot });
      }
    }

    const carriage = svg.querySelector<SVGGElement>('#carriage')!;
    const halo = svg.querySelector<SVGCircleElement>('#halo')!;
    const statusText = svg.querySelector<SVGTextElement>('#operation-status')!;
    const cables = {
      tl: svg.querySelector<SVGLineElement>('#cable-tl')!,
      tr: svg.querySelector<SVGLineElement>('#cable-tr')!,
      bl: svg.querySelector<SVGLineElement>('#cable-bl')!,
      br: svg.querySelector<SVGLineElement>('#cable-br')!,
    };

    function setCarriage(x: number, y: number) {
      carriage.setAttribute('transform', `translate(${x.toFixed(1)},${y.toFixed(1)})`);
      for (const c of Object.values(cables)) {
        c.setAttribute('x2', String(x));
        c.setAttribute('y2', String(y));
      }
    }

    // Lanes between rows
    const lanes = ROW_YS.slice(0, -1).map((y, i) => (y + ROW_YS[i + 1]) / 2);

    let laneIdx = 0, dir = 1;
    let x = X_MIN, y = lanes[0];
    let targetX = X_MAX, targetY = y, axis: 'x' | 'y' = 'x', nextLane = 0;
    let waiting = false;
    let treatmentIndex = 0;
    const nextActionDelay = () => MID_ACTION_MIN_INTERVAL_MS + Math.random() * (MID_ACTION_MAX_INTERVAL_MS - MID_ACTION_MIN_INTERVAL_MS);
    let nextActionAt = performance.now() + nextActionDelay();

    if (reduce) { setCarriage(300, 240); return; }

    function nextSegment() {
      if (axis === 'x') {
        nextLane = (laneIdx + 1) % lanes.length;
        targetX = x; targetY = lanes[nextLane]; axis = 'y';
        nextActionAt = Number.POSITIVE_INFINITY;
      } else {
        laneIdx = nextLane;
        dir = -dir;
        targetX = dir === 1 ? X_MAX : X_MIN; targetY = lanes[laneIdx]; axis = 'x';
        nextActionAt = performance.now() + nextActionDelay();
      }
    }

    function treatmentPlant() {
      let nearest = plants[0];
      let secondNearest = plants[1] ?? plants[0];
      let nearestDistance = Number.POSITIVE_INFINITY;
      let secondNearestDistance = Number.POSITIVE_INFINITY;
      for (const p of plants) {
        const d = Math.hypot(p.cx - x, p.cy - y);
        if (d < nearestDistance) {
          secondNearest = nearest;
          secondNearestDistance = nearestDistance;
          nearest = p;
          nearestDistance = d;
        } else if (d < secondNearestDistance) {
          secondNearest = p;
          secondNearestDistance = d;
        }
      }
      return Math.random() < 0.5 ? nearest : secondNearest;
    }

    function markNearestPlant() {
      const p = treatmentPlant();
      p.retained = RAINBOW[treatmentIndex % RAINBOW.length];
      treatmentIndex += 1;
      p.el.setAttribute('fill', p.retained);
      p.el.setAttribute('r', String(BASE_DOT_RADIUS + 1.9));
    }

    function highlightNearest() {
      const RADIUS = 34;
      const colorStep = Math.floor(performance.now() / 180);
      for (const p of plants) {
        const d = Math.hypot(p.cx - x, p.cy - y);
        if (d < RADIUS) {
          const k = 1 - d / RADIUS;
          const colorIndex = (Math.floor((p.cx + p.cy) / 17) + colorStep) % RAINBOW.length;
          p.el.setAttribute('fill', RAINBOW[colorIndex]);
          p.el.setAttribute('r', (BASE_DOT_RADIUS + k * 1.8).toFixed(2));
        } else if (p.el.getAttribute('r') !== String(BASE_DOT_RADIUS)) {
          p.el.setAttribute('fill', p.retained ?? BASE_DOT_FILL);
          p.el.setAttribute('r', String(p.retained ? BASE_DOT_RADIUS + 0.85 : BASE_DOT_RADIUS));
        }
      }
    }

    let last = performance.now();
    let rafId: number;

    function pulse() {
      const start = performance.now();
      markNearestPlant();
      statusText.textContent = 'SPRAYING...';
      halo.setAttribute('opacity', '0.9');
      halo.setAttribute('r', '8');
      window.setTimeout(() => {
        statusText.textContent = 'MONITORING...';
      }, MID_ACTION_PAUSE_MS);
      function tick(now: number) {
        const k = (now - start) / 1100;
        if (k >= 1) { halo.setAttribute('opacity', '0'); return; }
        halo.setAttribute('opacity', (0.9 * (1 - k)).toFixed(2));
        halo.setAttribute('r', (8 + k * 22).toFixed(1));
        requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
    }

    function loop(now: number) {
      const dt = Math.min(64, now - last); last = now;
      if (!waiting) {
        const ddx = targetX - x, ddy = targetY - y;
        const dist = Math.hypot(ddx, ddy);
        if (axis === 'x' && now >= nextActionAt && dist > 42) {
          waiting = true;
          pulse();
          setTimeout(() => {
            waiting = false;
            nextActionAt = performance.now() + nextActionDelay();
          }, MID_ACTION_PAUSE_MS);
          setCarriage(x, y);
          highlightNearest();
          rafId = requestAnimationFrame(loop);
          return;
        }
        const step = SPEED * dt;
        if (dist <= step) {
          x = targetX; y = targetY;
          nextSegment();
        } else {
          x += (ddx / dist) * step;
          y += (ddy / dist) * step;
        }
      }
      setCarriage(x, y);
      highlightNearest();
      rafId = requestAnimationFrame(loop);
    }

    setCarriage(x, y);
    rafId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(rafId);
      plantsGroup.innerHTML = '';
    };
  }, []);

  return (
    <div className="hero-anim" aria-label="Top-down schematic of the gantry tending a field">
      <svg ref={svgRef} viewBox="0 0 600 480" preserveAspectRatio="xMidYMid meet">
        {/* field frame */}
        <rect x="40" y="40" width="520" height="400" fill="none" stroke="rgba(26,23,20,.55)" strokeWidth="1" />
        {/* corner ticks */}
        <g stroke="rgba(26,23,20,.55)" strokeWidth="1">
          <line x1="40" y1="40" x2="40" y2="22" /><line x1="40" y1="40" x2="22" y2="40" />
          <line x1="560" y1="40" x2="560" y2="22" /><line x1="560" y1="40" x2="578" y2="40" />
          <line x1="40" y1="440" x2="40" y2="458" /><line x1="40" y1="440" x2="22" y2="440" />
          <line x1="560" y1="440" x2="560" y2="458" /><line x1="560" y1="440" x2="578" y2="440" />
        </g>
        {/* plant grid (populated by JS) */}
        <g id="plants" />
        <g className="hero-map-labels">
          <text id="operation-status" x="48" y="470" textAnchor="start">MONITORING...</text>
          <text x="552" y="470" textAnchor="end">FIELD 13</text>
        </g>
        {/* cables */}
        <line id="cable-tl" x1="40" y1="40" x2="0" y2="0" stroke="rgba(26,23,20,.55)" strokeWidth="1" />
        <line id="cable-tr" x1="560" y1="40" x2="0" y2="0" stroke="rgba(26,23,20,.55)" strokeWidth="1" />
        <line id="cable-bl" x1="40" y1="440" x2="0" y2="0" stroke="rgba(26,23,20,.55)" strokeWidth="1" />
        <line id="cable-br" x1="560" y1="440" x2="0" y2="0" stroke="rgba(26,23,20,.55)" strokeWidth="1" />
        {/* corner pylons */}
        <g fill="var(--ink)">
          <rect x="34" y="34" width="12" height="12" />
          <rect x="554" y="34" width="12" height="12" />
          <rect x="34" y="434" width="12" height="12" />
          <rect x="554" y="434" width="12" height="12" />
        </g>
        {/* carriage */}
        <g id="carriage">
          <circle id="halo" cx="0" cy="0" r="22" fill="none" stroke="var(--ink)" strokeWidth="1" opacity="0" />
          <circle cx="0" cy="0" r="5.5" fill="var(--ink)" />
        </g>
      </svg>
    </div>
  );
}
