import type { CSSProperties } from 'react'
import type { ArrivalDestination } from '@/components/studio/arrival/destinations'

function draw(delay: number, span: number): CSSProperties {
  return { '--draw-delay': String(delay), '--draw-span': String(span) } as CSSProperties
}

function leaf(delay: number): CSSProperties {
  return { '--leaf-delay': String(delay) } as CSSProperties
}

export function ArrivalArtwork({ destination }: { destination: ArrivalDestination }) {
  if (destination === 'garden') return <GardenShoot />
  if (destination === 'visualise') return <VisualiseResolve />
  if (destination === 'compare') return <CompareMeet />
  if (destination === 'experience') return <ExperienceSettle />
  return null
}

function GardenShoot() {
  return (
    <svg viewBox="0 0 220 180" className="h-auto w-full overflow-visible" aria-hidden="true">
      <ellipse cx="110" cy="158" rx="58" ry="14" fill="#c4a484" />
      <ellipse cx="110" cy="154" rx="40" ry="8" fill="#b08968" />
      <path className="arrival-draw" pathLength="1" stroke="#47715c" strokeWidth="3.4" d="M110 152 C110 126 109 108 110 86" style={draw(0.02, 0.4)} />
      <path className="arrival-draw" pathLength="1" stroke="#375848" strokeWidth="2.4" d="M110 118 C96 108 78 102 60 86" style={draw(0.3, 0.32)} />
      <path className="arrival-draw" pathLength="1" stroke="#375848" strokeWidth="2.4" d="M110 104 C128 94 150 88 170 70" style={draw(0.38, 0.32)} />
      <g className="arrival-leaf" style={leaf(0.46)}>
        <ellipse cx="110" cy="78" rx="11" ry="6.5" fill="#7dba96" transform="rotate(-18 110 78)" />
      </g>
      <g className="arrival-leaf" style={leaf(0.58)}>
        <ellipse cx="54" cy="80" rx="16" ry="8" fill="#a8d6c1" transform="rotate(-36 54 80)" />
      </g>
      <g className="arrival-leaf" style={leaf(0.66)}>
        <ellipse cx="176" cy="64" rx="17" ry="8" fill="#8fc9a4" transform="rotate(28 176 64)" />
      </g>
    </svg>
  )
}

function VisualiseResolve() {
  return (
    <div className="relative h-40 w-full" aria-hidden="true">
      <div className="arrival-thought arrival-thought-left" />
      <div className="arrival-thought arrival-thought-right" />
      <div className="arrival-thought arrival-thought-focus" />
    </div>
  )
}

function CompareMeet() {
  return (
    <svg viewBox="0 0 360 150" className="h-auto w-full overflow-visible" aria-hidden="true">
      <g className="arrival-approach-left">
        <ellipse cx="78" cy="86" rx="36" ry="24" fill="#47715c" />
        <ellipse cx="78" cy="78" rx="16" ry="22" fill="#a8d6c1" />
      </g>
      <g className="arrival-approach-right">
        <path d="M286 118 C286 86 268 78 274 52 C280 78 304 86 304 118 Z" fill="#b8472a" />
        <circle cx="288" cy="112" r="16" fill="#ff7f50" />
      </g>
      <path className="arrival-draw" pathLength="1" stroke="#ff7f50" strokeWidth="1.7" d="M118 84 C156 46 214 122 252 82" style={draw(0.28, 0.48)} />
    </svg>
  )
}

const contours = [
  'M240 168 C420 128 640 210 880 160 S1160 120 1220 156',
  'M260 206 C460 168 680 250 920 198 S1160 160 1220 196',
  'M220 248 C460 190 700 320 960 240 S1160 180 1220 230',
  'M240 292 C500 236 740 360 990 286 S1160 230 1220 274',
  'M200 470 C470 400 740 560 1020 460 S1180 400 1220 450',
  'M220 518 C500 452 760 600 1040 512 S1180 456 1220 500',
]

function ExperienceSettle() {
  return (
    <svg viewBox="80 120 1080 430" className="h-auto w-full overflow-visible" aria-hidden="true">
      {contours.map((d, index) => (
        <path key={d} className="arrival-draw" pathLength="1" stroke="#47715c" strokeWidth="3" d={d} style={draw(0.04 + index * 0.07, 0.36)} />
      ))}
      <path className="arrival-star" fill="#ff7f50" d="M600 150 L608 172 L632 180 L608 188 L600 210 L592 188 L568 180 L592 172 Z" />
    </svg>
  )
}
