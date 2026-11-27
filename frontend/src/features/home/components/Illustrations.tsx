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

export function AdminArt() {
  return (
    <svg
      viewBox="0 0 800 240"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden={true}
      focusable={false}
      className="tile__art"
    >
      <defs>
        <linearGradient id="admin-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#2a6ee8" />
          <stop offset="1" stopColor="#0a2250" />
        </linearGradient>
      </defs>
      <rect width="800" height="240" fill="url(#admin-bg)" />
      <circle cx="140" cy="54" r="56" fill="#fff" opacity="0.08" />
      <circle cx="670" cy="190" r="72" fill="#fff" opacity="0.07" />
      <path
        d="M80 180 Q210 120 330 155 T690 70"
        fill="none"
        stroke="#cfdff8"
        strokeWidth="2"
        strokeDasharray="6 6"
        opacity="0.35"
      />

      {/* Dashboard control panel card */}
      <g transform="translate(320 42)">
        <rect width="290" height="148" rx="14" fill="#0a2250" opacity="0.6" />
        <rect
          x="10"
          y="10"
          width="270"
          height="128"
          rx="10"
          fill="#0f2f6b"
          stroke="#a9c6f5"
          strokeWidth="1.5"
          opacity="0.9"
        />
        {/* Header bar */}
        <rect x="24" y="24" width="96" height="8" rx="4" fill="#e8f0fd" />
        <circle cx="242" cy="28" r="4" fill="#a9c6f5" />
        <circle cx="256" cy="28" r="4" fill="#fff" />

        {/* Toggle rows */}
        <rect x="24" y="48" width="118" height="28" rx="6" fill="#1f5fd1" opacity="0.55" />
        <rect x="34" y="59" width="54" height="6" rx="3" fill="#cfdff8" />
        <rect x="108" y="55" width="24" height="14" rx="7" fill="#fff" />
        <circle cx="125" cy="62" r="5" fill="#1f5fd1" />

        <rect x="24" y="86" width="118" height="28" rx="6" fill="#1f5fd1" opacity="0.4" />
        <rect x="34" y="97" width="46" height="6" rx="3" fill="#a9c6f5" />
        <rect x="108" y="93" width="24" height="14" rx="7" fill="#a9c6f5" />
        <circle cx="115" cy="100" r="5" fill="#0f2f6b" />

        {/* Bar metrics */}
        <rect x="156" y="48" width="110" height="66" rx="6" fill="#0a2250" opacity="0.65" />
        <rect x="172" y="86" width="14" height="18" rx="3" fill="#a9c6f5" />
        <rect x="194" y="72" width="14" height="32" rx="3" fill="#cfdff8" />
        <rect x="216" y="60" width="14" height="44" rx="3" fill="#fff" />
        <rect x="238" y="78" width="14" height="26" rx="3" fill="#a9c6f5" />
      </g>

      {/* Shield with check emblem */}
      <g transform="translate(196 50)">
        <circle cx="52" cy="62" r="54" fill="#1f5fd1" opacity="0.45" />
        <path
          d="M52 12 L94 28 V62 C94 90 74 110 52 120 C30 110 10 90 10 62 V28 Z"
          fill="#fff"
        />
        <path
          d="M36 62 L47 73 L70 50"
          fill="none"
          stroke="#1f5fd1"
          strokeWidth="8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
    </svg>
  );
}
