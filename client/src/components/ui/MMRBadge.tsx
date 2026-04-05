interface MMRBadgeProps {
  mmr: number
  size?: 'sm' | 'md'
}

export function MMRBadge({ mmr, size = 'md' }: MMRBadgeProps) {
  const color =
    mmr > 1500 ? 'text-yellow-400' : mmr >= 1000 ? 'text-accent' : 'text-muted'
  const textSize = size === 'sm' ? 'text-sm' : 'text-base'

  return (
    <span className={`font-semibold ${color} ${textSize} flex items-center gap-1`}>
      <span>⚡</span>
      <span>{mmr}</span>
    </span>
  )
}
