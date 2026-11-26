const CROWD_X = [160, 190, 220, 250, 280, 310, 340, 370];
const BULBS: [number, number][] = [
  [44, 46],
  [97, 53],
  [149, 48],
  [200, 30],
  [251, 12],
  [302, 6],
  [356, 12],
];
const COLUMNS = [0, 1, 2, 3, 4];

const svgProps = {
  viewBox: '0 0 400 240',
  preserveAspectRatio: 'xMidYMid slice',
  'aria-hidden': true,
  focusable: false,
  className: 'tile__art',
} as const;

export function EventsArt() {
  return (
    <svg {...svgProps}>
      <defs>
        <linearGradient id="events-bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3b7bf0" />
          <stop offset="1" stopColor="#0f2f6b" />
        </linearGradient>
      </defs>
      <rect width="400" height="240" fill="url(#events-bg)" />
      <polygon points="255,0 285,0 340,150 200,150" fill="#fff" opacity="0.16" />
      <polygon points="335,0 355,0 385,150 305,150" fill="#fff" opacity="0.1" />
      <path d="M-10 26 Q100 78 200 30 T410 30" fill="none" stroke="#cfdff8" strokeWidth="2" opacity="0.7" />
      {BULBS.map(([x, y]) => (
        <circle key={x} cx={x} cy={y} r="4.5" fill="#fff" />
      ))}
      <rect x="190" y="96" width="170" height="54" rx="6" fill="#0a2250" opacity="0.55" />
      <rect x="150" y="150" width="250" height="12" fill="#cfdff8" />
      <g transform="translate(34 62) rotate(-10)">
        <path
          d="M0 8 a8 8 0 0 1 8 -8 h74 a8 8 0 0 1 8 8 v12 a6 6 0 0 0 0 12 v12 a8 8 0 0 1 -8 8 h-74 a8 8 0 0 1 -8 -8 v-12 a6 6 0 0 0 0 -12z"
          fill="#fff"
        />
        <polygon
          points="36,17 38.6,22.6 44.8,23.3 40.2,27.5 41.5,33.6 36,30.5 30.5,33.6 31.8,27.5 27.2,23.3 33.4,22.6"
          fill="#1f5fd1"
        />
        <line x1="62" y1="8" x2="62" y2="44" stroke="#9fbcf0" strokeWidth="2" strokeDasharray="3 3" />
        <rect x="68" y="16" width="14" height="3" rx="1.5" fill="#cfdff8" />
        <rect x="68" y="24" width="14" height="3" rx="1.5" fill="#cfdff8" />
        <rect x="68" y="32" width="14" height="3" rx="1.5" fill="#cfdff8" />
      </g>
      {CROWD_X.map((x, i) => (
        <g key={x} fill="#0a2250">
          <circle cx={x} cy={206 + (i % 2) * 6} r="10" />
          <rect x={x - 13} y={218 + (i % 2) * 6} width="26" height="40" rx="13" />
        </g>
      ))}
    </svg>
  );
}

export function VenuesArt() {
  return (
    <svg {...svgProps}>
      <defs>
        <linearGradient id="venues-bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#4a86f0" />
          <stop offset="1" stopColor="#123a85" />
        </linearGradient>
      </defs>
      <rect width="400" height="240" fill="url(#venues-bg)" />
      <circle cx="70" cy="48" r="30" fill="#fff" opacity="0.12" />
      <path d="M20 120 C60 80 110 120 160 76" fill="none" stroke="#cfdff8" strokeWidth="2.5" strokeDasharray="6 6" opacity="0.6" />
      <circle cx="20" cy="120" r="5" fill="#fff" opacity="0.8" />
      <circle cx="160" cy="76" r="5" fill="#fff" opacity="0.8" />
      <rect x="190" y="118" width="200" height="84" fill="#0a2250" opacity="0.55" />
      <polygon points="186,116 290,60 394,116" fill="#e8f0fd" />
      <rect x="186" y="116" width="208" height="8" fill="#cfdff8" />
      {COLUMNS.map((i) => (
        <rect key={i} x={200 + i * 44} y="124" width="14" height="78" fill="#fff" />
      ))}
      <rect x="180" y="202" width="220" height="6" fill="#cfdff8" />
      <rect x="172" y="208" width="236" height="6" fill="#a9c6f5" />
      <rect x="0" y="214" width="400" height="26" fill="#0a2250" />
      <g transform="translate(330 30)">
        <path d="M0 -22 a22 22 0 0 1 22 22 c0 16 -22 38 -22 38 s-22 -22 -22 -38 a22 22 0 0 1 22 -22z" fill="#fff" />
        <circle cx="0" cy="0" r="8" fill="#1f5fd1" />
      </g>
    </svg>
  );
}
