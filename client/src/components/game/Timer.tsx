interface TimerProps {
  timeLeft: number
  total?: number
}

export function Timer({ timeLeft, total = 30 }: TimerProps) {
  const radius = 18
  const circumference = 2 * Math.PI * radius
  const progress = (timeLeft / total) * circumference
  const color =
    timeLeft > 15 ? '#22c55e' : timeLeft > 8 ? '#eab308' : '#ef4444'

  return (
    <div className="relative w-12 h-12 flex items-center justify-center">
      <svg width="48" height="48" className="-rotate-90">
        <circle cx="24" cy="24" r={radius} fill="none" stroke="#2a2a2a" strokeWidth="3" />
        <circle
          cx="24" cy="24" r={radius}
          fill="none"
          stroke={color}
          strokeWidth="3"
          strokeDasharray={circumference}
          strokeDashoffset={circumference - progress}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.3s' }}
        />
      </svg>
      <span className="absolute text-xs font-bold" style={{ color }}>{timeLeft}</span>
    </div>
  )
}
