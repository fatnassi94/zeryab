/** The ark on a stormy night sea, from the approved homepage design. Decorative. */
export function HeroScene() {
  return (
    <svg viewBox="0 0 1440 900" preserveAspectRatio="xMidYMax slice" aria-hidden="true" className="absolute inset-0 h-full w-full">
      <defs>
        <linearGradient id="zr-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#04060D" />
          <stop offset="0.55" stopColor="#0E1830" />
          <stop offset="1" stopColor="#1C2C4D" />
        </linearGradient>
        <radialGradient id="zr-moon" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#F6E3B4" stopOpacity="0.9" />
          <stop offset="0.25" stopColor="#E4BE74" stopOpacity="0.35" />
          <stop offset="1" stopColor="#E4BE74" stopOpacity="0" />
        </radialGradient>
        <filter id="zr-blur" x="-20%" y="-50%" width="140%" height="200%"><feGaussianBlur stdDeviation="22" /></filter>
        <filter id="zr-soft" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="7" /></filter>
        <pattern id="zr-rain-a" width="40" height="80" patternUnits="userSpaceOnUse">
          <path d="M10 4 l-5 14 M30 44 l-5 14 M22 70 l-3 9" stroke="#B8C9E6" strokeOpacity="0.28" strokeWidth="1" strokeLinecap="round" />
        </pattern>
        <pattern id="zr-rain-b" width="90" height="180" patternUnits="userSpaceOnUse">
          <path d="M20 10 l-9 30 M70 80 l-9 30 M45 140 l-7 24" stroke="#D3E0F5" strokeOpacity="0.45" strokeWidth="1.4" strokeLinecap="round" />
        </pattern>
      </defs>

      <rect width="1440" height="900" fill="url(#zr-sky)" />
      <circle cx="330" cy="190" r="230" fill="url(#zr-moon)" />
      <circle cx="330" cy="190" r="46" fill="#F3DFAE" opacity="0.85" />

      <g filter="url(#zr-blur)" fill="#0A1020">
        <ellipse cx="220" cy="170" rx="300" ry="60" opacity="0.85" />
        <ellipse cx="520" cy="230" rx="260" ry="50" opacity="0.75" />
        <ellipse cx="900" cy="120" rx="420" ry="80" opacity="0.9" />
        <ellipse cx="1280" cy="210" rx="320" ry="70" opacity="0.85" />
        <ellipse cx="700" cy="330" rx="520" ry="50" opacity="0.5" />
      </g>

      <g className="zr-flash">
        <rect width="1440" height="900" fill="#C9D8F2" opacity="0.25" />
        <path d="M1080 60 L1050 170 L1078 170 L1040 300 L1110 150 L1082 150 L1112 60 Z" fill="#F4F0E2" />
      </g>

      {/* Dove with an olive branch */}
      <g transform="translate(560 250)">
        <path d="M0 0 Q18 -14 40 -8 Q50 -30 78 -40 Q68 -16 54 -2 Q70 2 80 14 Q60 14 46 8 Q24 24 0 0 Z" fill="#EEF1F7" opacity="0.92" />
        <path d="M-2 2 Q-14 6 -26 2" fill="none" stroke="#7FA36B" strokeWidth="2" strokeLinecap="round" />
        <ellipse cx="-14" cy="-2" rx="6" ry="2.6" transform="rotate(-30 -14 -2)" fill="#8DB574" />
        <ellipse cx="-22" cy="7" rx="6" ry="2.6" transform="rotate(25 -22 7)" fill="#8DB574" />
        <ellipse cx="-28" cy="-1" rx="5" ry="2.2" transform="rotate(-15 -28 -1)" fill="#8DB574" />
      </g>

      <g className="zr-w3">
        <path d="M-140 650 Q-50 625 40 650 T220 650 T400 650 T580 650 T760 650 T940 650 T1120 650 T1300 650 T1480 650 T1660 650 L1660 900 L-140 900 Z" fill="#14223F" />
      </g>
      <g className="zr-w2">
        <path d="M-140 705 Q-30 670 80 705 T300 705 T520 705 T740 705 T960 705 T1180 705 T1400 705 T1620 705 L1620 900 L-140 900 Z" fill="#0F1A33" />
      </g>

      <ellipse cx="390" cy="750" rx="340" ry="24" fill="#E4BE74" opacity="0.2" filter="url(#zr-soft)" />

      {/* The ark */}
      <g transform="translate(110 600)">
        <g className="zr-ark">
          <path d="M392 -60 L405 -168 Q407 -182 420 -184 L446 -180 Q454 -173 444 -168 L424 -166 L414 -60 Z" fill="#3A2A1C" stroke="#E4BE74" strokeOpacity="0.55" strokeWidth="1.2" />
          <path d="M414 -184 L412 -196 M424 -185 L424 -197" stroke="#E4BE74" strokeOpacity="0.6" strokeWidth="2" strokeLinecap="round" />
          <circle cx="409" cy="-140" r="3" fill="#E4BE74" opacity="0.35" />
          <circle cx="413" cy="-112" r="3.5" fill="#E4BE74" opacity="0.35" />
          <circle cx="410" cy="-88" r="3" fill="#E4BE74" opacity="0.35" />
          <path d="M88 -46 L280 -138 L472 -46 Z" fill="#2A1E15" stroke="#E4BE74" strokeOpacity="0.7" strokeWidth="1.6" />
          <path d="M130 -66 L430 -66 M175 -88 L385 -88 M222 -110 L338 -110" stroke="#E4BE74" strokeOpacity="0.18" strokeWidth="1" />
          <rect x="112" y="-46" width="336" height="88" fill="#3A2A1C" stroke="#E4BE74" strokeOpacity="0.45" strokeWidth="1.2" />
          <path d="M112 -24 H448 M112 -2 H448 M112 20 H448" stroke="#1B140F" strokeOpacity="0.7" strokeWidth="1" />
          <g className="zr-win">
            {[134, 194, 332, 392].map((x) => (
              <rect key={`g${x}`} x={x} y="-30" width="34" height="26" rx="13" fill="#F2C46D" filter="url(#zr-soft)" opacity="0.75" />
            ))}
            {[138, 198, 336, 396].map((x) => (
              <rect key={`w${x}`} x={x} y="-27" width="26" height="20" rx="10" fill="#FBDB92" />
            ))}
            <path d="M254 42 L254 -14 Q280 -36 306 -14 L306 42 Z" fill="#F2C46D" opacity="0.85" />
          </g>
          <path d="M140 -4 q8 -16 18 -8 q4 10 -4 14" fill="none" stroke="#1B140F" strokeWidth="2.2" strokeLinecap="round" />
          <path d="M-40 -60 Q-20 30 30 112 Q56 150 104 154 L456 154 Q504 150 530 112 Q580 30 600 -60 Q586 -50 572 -40 Q548 36 492 42 L68 42 Q12 36 -12 -40 Q-26 -50 -40 -60 Z" fill="#24190F" stroke="#E4BE74" strokeOpacity="0.75" strokeWidth="1.8" />
          <path d="M2 66 Q280 82 558 66 M20 94 Q280 110 540 94 M48 122 Q280 138 512 122" fill="none" stroke="#E4BE74" strokeOpacity="0.22" strokeWidth="1.1" />
          <path d="M-40 -60 L-50 -74 M600 -60 L610 -74" stroke="#E4BE74" strokeOpacity="0.7" strokeWidth="2" strokeLinecap="round" />
        </g>
      </g>

      <g className="zr-w1">
        <path d="M-140 770 Q-20 735 100 770 T340 770 T580 770 T820 770 T1060 770 T1300 770 T1540 770 T1780 770 L1780 900 L-140 900 Z" fill="#0A1225" />
        <path d="M-140 770 Q-20 735 100 770 T340 770 T580 770 T820 770 T1060 770 T1300 770 T1540 770 T1780 770" fill="none" stroke="#E4BE74" strokeOpacity="0.22" strokeWidth="1.5" />
      </g>

      <g className="zr-rain-far"><rect x="-200" y="-200" width="1840" height="1200" fill="url(#zr-rain-a)" /></g>
      <g className="zr-rain-near"><rect x="-200" y="-300" width="1840" height="1300" fill="url(#zr-rain-b)" /></g>
    </svg>
  );
}
