import type { MetaphorId } from '@/lib/providers/types'

const scenes: Record<MetaphorId, { shapes: string; caption: string }> = {
  tension: {
    caption: 'Two forces, neither winning',
    shapes: '<rect x="90" y="220" width="300" height="580" fill="#ff765d"/><rect x="634" y="220" width="300" height="580" fill="#47715c"/>',
  },
  trace: {
    caption: 'A mark after the event',
    shapes: '<circle cx="512" cy="500" r="280" fill="none" stroke="#9b8de8" stroke-width="28" stroke-dasharray="40 26"/><circle cx="512" cy="500" r="70" fill="#182326"/>',
  },
  scale: {
    caption: 'One object, wrong size',
    shapes: '<rect x="160" y="640" width="700" height="28" fill="#d8d0c2"/><circle cx="512" cy="390" r="230" fill="#a8d6c1"/><rect x="470" y="250" width="84" height="280" fill="#182326"/>',
  },
  relation: {
    caption: 'Near, and still unreached',
    shapes: '<circle cx="330" cy="512" r="170" fill="#ff765d"/><circle cx="760" cy="512" r="120" fill="#47715c"/><path d="M500 512 H620" stroke="#182326" stroke-width="8" stroke-dasharray="16 18"/>',
  },
}

export function demoFixtureSrc(id: MetaphorId) {
  const scene = scenes[id]
  const markup = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" role="img">
    <rect width="1024" height="1024" fill="#fffaf3"/>
    ${scene.shapes}
    <text x="72" y="120" fill="#182326" font-family="Georgia, serif" font-size="54">Demo fixture</text>
    <text x="72" y="900" fill="#45524f" font-family="Georgia, serif" font-size="36">${scene.caption}</text>
  </svg>`
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(markup)}`
}
