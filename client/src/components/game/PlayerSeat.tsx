import type { GamePlayer, Card } from '../../types/game'
import { Avatar } from '../ui/Avatar'
import { Timer } from './Timer'

const suitSymbols: Record<string, string> = { s: '♠', h: '♥', d: '♦', c: '♣' }
const redSuits = new Set(['h', 'd'])

interface CardFaceProps {
  card: Card | null
  size: 'sm' | 'lg'
}

function CardFace({ card, size }: CardFaceProps) {
  const cardClass = size === 'lg' ? 'w-12 h-16' : 'w-9 h-12'
  const textClass = size === 'lg' ? 'text-base' : 'text-xs'

  if (!card) {
    return <div className={`${cardClass} bg-[#1a3a2a] rounded border border-accent/30`} />
  }
  const isRed = redSuits.has(card.suit)
  return (
    <div className={`${cardClass} bg-white rounded flex flex-col items-center justify-center`}>
      <span className={`${textClass} font-bold leading-none ${isRed ? 'text-red-600' : 'text-gray-900'}`}>
        {card.rank}
      </span>
      <span className={`${textClass} leading-none ${isRed ? 'text-red-600' : 'text-gray-900'}`}>
        {suitSymbols[card.suit] ?? '?'}
      </span>
    </div>
  )
}

interface PlayerSeatProps {
  player: GamePlayer
  isCurrentTurn: boolean
  isMe: boolean
  timeLeft?: number
  size?: 'sm' | 'lg'
}

export function PlayerSeat({ player, isCurrentTurn, isMe, timeLeft = 30, size = 'sm' }: PlayerSeatProps) {
  const isFolded = player.status === 'folded'
  const isEliminated = player.status === 'eliminated'
  const nameClass = size === 'lg' ? 'text-sm' : 'text-xs'
  const chipsClass = size === 'lg' ? 'text-sm' : 'text-xs'
  const avatarSize = size === 'lg' ? 'md' : 'sm'

  return (
    <div className={`
      flex flex-col items-center gap-1 p-2 rounded-xl transition-all
      ${isCurrentTurn ? 'ring-2 ring-accent bg-accent/10' : ''}
      ${isFolded || isEliminated ? 'opacity-40' : ''}
    `}>
      {/* Cards */}
      <div className="flex gap-1">
        {player.cards.map((card, i) => (
          <CardFace key={i} card={card} size={size} />
        ))}
      </div>

      {/* Avatar + name + timer */}
      <div className="flex items-center gap-1">
        <Avatar name={player.name} avatarUrl={player.avatarUrl} size={avatarSize} />
        <span className={`${nameClass} text-muted max-w-[80px] truncate`}>
          {isMe ? 'You' : player.name}
        </span>
        {isCurrentTurn && <Timer timeLeft={timeLeft} />}
      </div>

      {/* Chips */}
      <span className={`${chipsClass} text-accent font-semibold`}>{player.chips} 🪙</span>

      {/* Bet this round */}
      {player.bet > 0 && (
        <div className="flex items-center gap-1 bg-yellow-500/20 border border-yellow-500/40 rounded-lg px-2 py-0.5">
          <span className={`${size === 'lg' ? 'text-base' : 'text-sm'} text-yellow-400 font-bold`}>
            🪙 {player.bet}
          </span>
        </div>
      )}
    </div>
  )
}
