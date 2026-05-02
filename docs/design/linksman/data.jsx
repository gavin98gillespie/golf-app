// data.jsx — fixture data for the prototype (golf rounds, courses, friends)

const COURSES = {
  pebble:    { name: 'Pebble Beach',        loc: 'Pebble Beach, CA',    par: 72, slope: 144, rating: 75.5, seed: 'pebble-beach-ca' },
  cypress:   { name: 'Cypress Point',       loc: 'Pebble Beach, CA',    par: 72, slope: 139, rating: 73.9, seed: 'cypress-point' },
  bandon:    { name: 'Bandon Dunes',        loc: 'Bandon, OR',          par: 72, slope: 142, rating: 74.6, seed: 'bandon-dunes-or' },
  pinehurst: { name: 'Pinehurst No. 2',     loc: 'Pinehurst, NC',       par: 72, slope: 137, rating: 75.3, seed: 'pinehurst-2' },
  shinnecock:{ name: 'Shinnecock Hills',    loc: 'Southampton, NY',     par: 70, slope: 145, rating: 76.5, seed: 'shinnecock-hills' },
  presidio:  { name: 'Presidio',            loc: 'San Francisco, CA',   par: 72, slope: 132, rating: 71.8, seed: 'presidio-sf' },
  harding:   { name: 'Harding Park',        loc: 'San Francisco, CA',   par: 72, slope: 133, rating: 72.4, seed: 'harding-park-sf' },
};

// 18-hole pars for a sample course (sums to 72)
const STANDARD_PARS = [4, 4, 5, 3, 4, 4, 5, 3, 4, 4, 4, 3, 5, 4, 4, 4, 3, 5];

// Generate scorecard: scores aligned to par; intensity = scoring quality
// strokes = par + delta. Negative = under par.
function makeRound({ pars = STANDARD_PARS, pattern = 'good' } = {}) {
  // pattern: 'good' | 'best' | 'rough' | 'mixed' — deterministic-ish
  const seq = {
    good:  [0,-1, 0, 0, 1, 0, 0,-1, 0, 0,-1, 0, 0, 1, 0, 0, 0,-1],
    best:  [0,-1,-1, 0,-1,-2, 0,-1, 0, 0, 0,-1, 0,-1, 0,-1,-1, 0],
    rough: [1, 0, 1, 1, 2, 0, 1, 0, 2, 1, 0, 1, 1, 0, 2, 1, 0, 1],
    mixed: [0, 1,-1, 0, 0,-1, 1, 0, 2,-2, 0, 1, 0,-1, 0, 1, 0,-1],
  }[pattern];
  return pars.map((p, i) => ({ par: p, score: p + seq[i], delta: seq[i] }));
}

const ROUNDS = [
  {
    id: 'r1', user: 'mara.chen', display: 'Mara Chen',
    course: 'cypress', date: 'today, 4:12 pm',
    holes: makeRound({ pattern: 'best' }),
    likes: 14, comments: 6,
    note: 'pin high on 16. finally.',
    weather: '62°F · light wind',
    tee: 'Blue · 6,524 yds',
  },
  {
    id: 'r2', user: 'devon.k', display: 'Devon Kaur',
    course: 'pebble', date: 'today, 11:40 am',
    holes: makeRound({ pattern: 'good' }),
    likes: 22, comments: 9,
    note: 'fog burned off by 7. magic.',
    weather: '58°F · fog → sun',
    tee: 'White · 6,116 yds',
  },
  {
    id: 'r3', user: 'tomo.s', display: 'Tomo Saito',
    course: 'harding', date: 'yesterday',
    holes: makeRound({ pattern: 'rough' }),
    likes: 4, comments: 2,
    note: 'rough day. shanked the 7.',
    weather: '64°F · breezy',
    tee: 'White · 6,322 yds',
  },
  {
    id: 'r4', user: 'jules.r', display: 'Jules Rivera',
    course: 'bandon', date: '2 days ago',
    holes: makeRound({ pattern: 'mixed' }),
    likes: 31, comments: 11,
    note: 'eagle on 10. one for the journal.',
    weather: '54°F · 18 mph SW',
    tee: 'Black · 6,732 yds',
  },
];

// Aggregate stats helper
function roundTotals(round) {
  const strokes = round.holes.reduce((s, h) => s + h.score, 0);
  const par = round.holes.reduce((s, h) => s + h.par, 0);
  const delta = strokes - par;
  const front = round.holes.slice(0, 9).reduce((s, h) => s + h.score, 0);
  const back = round.holes.slice(9).reduce((s, h) => s + h.score, 0);
  const eagles = round.holes.filter((h) => h.delta <= -2).length;
  const birdies = round.holes.filter((h) => h.delta === -1).length;
  const pars = round.holes.filter((h) => h.delta === 0).length;
  const bogeys = round.holes.filter((h) => h.delta === 1).length;
  const doubles = round.holes.filter((h) => h.delta >= 2).length;
  return { strokes, par, delta, front, back, eagles, birdies, pars, bogeys, doubles };
}

// Profile fixture
const ME = {
  display: 'Mara Chen',
  handle: 'mara.chen',
  joined: 'Member since Mar 2025',
  homeCourse: 'Presidio',
  index: 8.2,
  trend: -0.4,
  rounds: 47,
  best: 71,
  avg: 82.4,
  weeks: [
    { w: 'Mon', r: 0 }, { w: 'Tue', r: 0 }, { w: 'Wed', r: 1 },
    { w: 'Thu', r: 0 }, { w: 'Fri', r: 0 }, { w: 'Sat', r: 1 }, { w: 'Sun', r: 1 },
  ],
};

// 12-week handicap trend (small drift downwards = improvement)
const TREND_12W = [11.4, 11.1, 10.9, 10.6, 10.4, 10.0, 9.8, 9.5, 9.1, 8.8, 8.6, 8.2];

Object.assign(window, { COURSES, STANDARD_PARS, ROUNDS, ME, TREND_12W, makeRound, roundTotals });
