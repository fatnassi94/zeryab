/**
 * Instrument drawings for the homepage cards: the darbuka (shows), the oud
 * (academy) and the nay (library & archive). Each is drawn twice: a faint
 * outline at rest, and a gold copy that draws itself on hover (see
 * `.pillar-art` in globals.css). Every stroke uses pathLength=1 so the draw
 * animation needs no measured lengths.
 */
import type { ReactElement } from "react";

export type PillarInstrument = "darbuka" | "oud" | "nay";

const S = { pathLength: 1, vectorEffect: "non-scaling-stroke" as const };

function Darbuka() {
  return (
    <>
      <ellipse {...S} cx="100" cy="42" rx="50" ry="13" />
      <path {...S} d="M50 42C50 96 82 108 87 126L80 178M150 42C150 96 118 108 113 126L120 178" />
      <ellipse {...S} cx="100" cy="179" rx="21" ry="6" />
      <path {...S} d="M58 70Q100 84 142 70M66 92Q100 104 134 92" />
      <path {...S} d="M64 81l7-6 7 6 7-6 7 6 7-6 7 6 7-6 7 6 7-6 7 6" />
      {/* skin ripples, shown on hover */}
      <g className="pa-ripples">
        <ellipse {...S} cx="100" cy="42" rx="18" ry="4.5" />
        <ellipse {...S} cx="100" cy="42" rx="32" ry="8" />
      </g>
    </>
  );
}

function Oud() {
  return (
    <g transform="rotate(-28 100 110)">
      <path {...S} d="M100 192C52 192 32 154 39 114C46 76 73 60 100 60C127 60 154 76 161 114C168 154 148 192 100 192Z" />
      <path {...S} d="M91 62L93 18H107L109 62" />
      <path {...S} d="M93 18L82 5L90 1L107 18" />
      <circle {...S} cx="100" cy="108" r="11" />
      <circle {...S} cx="78" cy="128" r="5" />
      <circle {...S} cx="122" cy="128" r="5" />
      <path {...S} d="M84 168H116" />
      <g className="pa-strings">
        <path {...S} d="M96 18L94 168" />
        <path {...S} d="M100 18V168" />
        <path {...S} d="M104 18L106 168" />
      </g>
    </g>
  );
}

function Nay() {
  return (
    <g transform="rotate(-38 100 100)">
      <path {...S} d="M92 8H108V192H92Z" />
      <path {...S} d="M90 14H110M90 58H110M90 102H110M90 146H110" />
      <g className="pa-holes">
        {[112, 124, 136, 160, 172, 184].map((y, i) => (
          <circle key={y} {...S} cx="100" cy={y - 8} r="3.2" style={{ ["--h" as string]: i }} />
        ))}
      </g>
      {/* breath, shown on hover */}
      <path className="pa-breath" {...S} d="M100 2C94 -8 108 -14 102 -24M108 0C104 -10 116 -14 110 -26" />
    </g>
  );
}

const DRAW: Record<PillarInstrument, () => ReactElement> = { darbuka: Darbuka, oud: Oud, nay: Nay };

export function PillarArt({ instrument }: { instrument: PillarInstrument }) {
  const Draw = DRAW[instrument];
  return (
    <svg viewBox="0 -30 200 230" aria-hidden="true" className={`pillar-art pa-${instrument}`} fill="none" strokeLinecap="round" strokeLinejoin="round">
      <g className="pa-rest"><Draw /></g>
      <g className="pa-gold"><Draw /></g>
    </svg>
  );
}
