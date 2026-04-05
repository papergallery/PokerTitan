export function FrameGold({ size }: { size: number }) {
  const total = size + 24
  const cx = total / 2
  const r1 = size / 2 + 9  // внешнее кольцо
  const r2 = size / 2 + 5  // внутреннее пунктирное
  const dot = 3             // радиус ромбов

  // 4 ромба на 12/3/6/9 часов
  const diamonds = [
    { x: cx, y: cx - r1 },
    { x: cx + r1, y: cx },
    { x: cx, y: cx + r1 },
    { x: cx - r1, y: cx },
  ]

  return (
    <svg width={total} height={total} className="absolute -inset-3 pointer-events-none" style={{ top: -12, left: -12 }}>
      <defs>
        <linearGradient id="gold" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#F59E0B" />
          <stop offset="50%" stopColor="#FCD34D" />
          <stop offset="100%" stopColor="#D97706" />
        </linearGradient>
      </defs>
      <circle cx={cx} cy={cx} r={r1} stroke="url(#gold)" strokeWidth="2" fill="none" />
      <circle cx={cx} cy={cx} r={r2} stroke="url(#gold)" strokeWidth="1" fill="none" strokeDasharray="3 5" />
      {diamonds.map((d, i) => (
        <rect key={i} x={d.x - dot} y={d.y - dot} width={dot * 2} height={dot * 2}
          fill="url(#gold)" transform={`rotate(45 ${d.x} ${d.y})`} />
      ))}
    </svg>
  )
}

export function FrameNeon({ size }: { size: number }) {
  const total = size + 24
  const cx = total / 2
  const r = size / 2 + 8

  return (
    <svg width={total} height={total} className="absolute pointer-events-none" style={{ top: -12, left: -12 }}>
      <defs>
        <filter id="neonGlow">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      <circle cx={cx} cy={cx} r={r} stroke="#22c55e" strokeWidth="2.5" fill="none" filter="url(#neonGlow)" opacity="0.5" />
      <circle cx={cx} cy={cx} r={r} stroke="#22c55e" strokeWidth="1.5" fill="none" />
    </svg>
  )
}

export function FramePlatinum({ size }: { size: number }) {
  const total = size + 24
  const cx = total / 2
  const r = size / 2 + 8
  // 8 сегментов с промежутками
  const segments = 8
  const gap = 8  // градусов
  const segAngle = 360 / segments - gap

  const arc = (startDeg: number, sweepDeg: number) => {
    const toRad = (d: number) => (d * Math.PI) / 180
    const x1 = cx + r * Math.cos(toRad(startDeg - 90))
    const y1 = cx + r * Math.sin(toRad(startDeg - 90))
    const x2 = cx + r * Math.cos(toRad(startDeg + sweepDeg - 90))
    const y2 = cx + r * Math.sin(toRad(startDeg + sweepDeg - 90))
    return `M ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2}`
  }

  return (
    <svg width={total} height={total} className="absolute pointer-events-none" style={{ top: -12, left: -12 }}>
      <defs>
        <linearGradient id="plat" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#E2E8F0" />
          <stop offset="100%" stopColor="#94A3B8" />
        </linearGradient>
      </defs>
      {Array.from({ length: segments }).map((_, i) => (
        <path key={i} d={arc(i * (360 / segments), segAngle)}
          stroke="url(#plat)" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      ))}
    </svg>
  )
}
