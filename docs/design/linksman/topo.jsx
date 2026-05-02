// topo.jsx — Procedural topographic course renderer.
// Generates seeded contour-line + green-shape SVG as a "course portrait".
// One per (course name, hole). Stable: same input -> same output.

// Tiny seedable PRNG (mulberry32)
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function hash(str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// Build a noisy closed loop centered at (cx,cy)
function loop(rand, cx, cy, baseR, jitter, points = 64) {
  const pts = [];
  // octave noise via random phases
  const phases = Array.from({ length: 5 }, () => rand() * Math.PI * 2);
  const amps = [1.0, 0.55, 0.32, 0.18, 0.1];
  const freqs = [1, 2, 3, 5, 8];
  for (let i = 0; i < points; i++) {
    const t = (i / points) * Math.PI * 2;
    let n = 0;
    for (let k = 0; k < phases.length; k++) {
      n += Math.sin(t * freqs[k] + phases[k]) * amps[k];
    }
    n /= 2.15; // normalize to ~[-1,1]
    const r = baseR * (1 + n * jitter);
    pts.push([cx + Math.cos(t) * r, cy + Math.sin(t) * r]);
  }
  return pts;
}
function pathFromLoop(pts) {
  let d = `M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`;
  for (let i = 1; i < pts.length; i++) d += `L${pts[i][0].toFixed(1)},${pts[i][1].toFixed(1)}`;
  return d + 'Z';
}

// Topo — concentric noisy loops (contour lines) anchored to a center.
// Use as background imagery for a course/hole.
function Topo({
  seed = 'augusta-1',
  width = 400,
  height = 240,
  rings = 8,
  stroke = 'rgba(244,240,230,0.18)',
  strokeBold = 'rgba(244,240,230,0.32)',
  fill = 'none',
  greenColor = null,        // optional fill for the innermost ring (the green)
  fairwayColor = null,      // optional band
  jitter = 0.18,
  pinX = null,              // optional explicit pin position fraction
  pinY = null,
  showPin = false,
  pinColor = '#B8924A',
  style = {},
}) {
  const s = typeof seed === 'string' ? hash(seed) : seed >>> 0;
  const rand = React.useMemo(() => rng(s), [s]);
  const data = React.useMemo(() => {
    const r = rng(s);
    const cx = width * (0.35 + r() * 0.3);
    const cy = height * (0.4 + r() * 0.3);
    const baseR = Math.min(width, height) * (0.18 + r() * 0.06);
    const loops = [];
    for (let i = 0; i < rings; i++) {
      const ringR = baseR + i * (Math.min(width, height) * 0.07);
      loops.push(loop(r, cx, cy, ringR, jitter * (1 + i * 0.05), 96));
    }
    // pin anchored to innermost ring center, slight offset
    const px = pinX != null ? pinX * width : cx + (r() - 0.5) * baseR * 0.3;
    const py = pinY != null ? pinY * height : cy + (r() - 0.5) * baseR * 0.3;
    return { loops, cx, cy, baseR, px, py };
  }, [s, width, height, rings, jitter, pinX, pinY]);

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={style} preserveAspectRatio="xMidYMid slice">
      {/* fairway band (broad outermost) */}
      {fairwayColor && (
        <path d={pathFromLoop(data.loops[data.loops.length - 2])} fill={fairwayColor} opacity="0.25" />
      )}
      {/* contour lines */}
      {data.loops.map((pts, i) => (
        <path
          key={i}
          d={pathFromLoop(pts)}
          fill={i === 0 && greenColor ? greenColor : 'none'}
          stroke={i === 0 ? strokeBold : stroke}
          strokeWidth={i === 0 ? 1.2 : 0.7}
          opacity={i === 0 ? 0.95 : 0.6 + (i / data.loops.length) * 0.3}
        />
      ))}
      {/* pin */}
      {showPin && (
        <g>
          <line x1={data.px} y1={data.py} x2={data.px} y2={data.py - 22} stroke={pinColor} strokeWidth="1" />
          <path d={`M${data.px},${data.py - 22} L${data.px + 8},${data.py - 19} L${data.px},${data.py - 16} Z`} fill={pinColor} />
          <circle cx={data.px} cy={data.py} r="1.6" fill={pinColor} />
        </g>
      )}
    </svg>
  );
}

// MiniTopo — tiny version for inline use (chips, list rows)
function MiniTopo({ seed, size = 36, color = 'currentColor' }) {
  const s = typeof seed === 'string' ? hash(seed) : seed >>> 0;
  const data = React.useMemo(() => {
    const r = rng(s);
    const cx = size * 0.5;
    const cy = size * 0.5;
    const loops = [];
    for (let i = 0; i < 4; i++) {
      const ringR = size * 0.1 + i * size * 0.09;
      loops.push(loop(r, cx, cy, ringR, 0.18, 48));
    }
    return loops;
  }, [s, size]);
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {data.map((pts, i) => (
        <path key={i} d={pathFromLoop(pts)} fill="none" stroke={color}
          strokeWidth="0.6" opacity={0.4 + i * 0.15} />
      ))}
    </svg>
  );
}

Object.assign(window, { Topo, MiniTopo });
