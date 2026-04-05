import type { GamePlayer, Card } from '../../types/game'
import { Avatar } from '../ui/Avatar'
import { Timer } from './Timer'

const suitSymbols: Record<string, string> = { s: '♠', h: '♥', d: '♦', c: '♣' }
const redSuits = new Set(['h', 'd'])

function CardFace({ card }: { card: Card | null }) {
  if (!card) {
    return <div className="w-8 h-11 bg-[#1a3a2a] rounded border border-accent/30" />
  }
  const isRed = redSuits.has(card.suit)
  return (
    <div className="w-8 h-11 bg-white rounded flex flex-col items-center justify-center">
      <span className={`text-xs font-bold leading-none ${isRed ? 'text-red-600' : 'text-gray-900'}`}>
        {card.rank}
      </span>
      <span className={`text-xs leading-none ${isRed ? 'text-red-600' : 'text-gray-900'}`}>
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
}

export function PlayerSeat({ player, isCurrentTurn, isMe, timeLeft = 30 }: PlayerSeatProps) {
  const isFolded = player.status === 'folded'
  const isEliminated = player.status === 'eliminated'

  return (
    <div className={`
      flex flex-col items-center gap-1 p-2 rounded-xl transition-all
      ${isCurrentTurn ? 'ring-2 ring-accent bg-accent/10' : ''}
      ${isFolded || isEliminated ? 'opacity-40' : ''}
    `}>
      <div className="flex gap-1">
        {player.cards.map((card, i) => (
          <CardFace key={i} card={card} />
        ))}
      </div>
      <div className="flex items-center gap-1">
        <Avatar name={player.name} avatarUrl={player.avatarUrl} size="sm" />
        {isCurrentTurn && <Timer timeLeft={timeLeft} />}
      </div>
      <span className="text-xs text-muted max-w-[80px] truncate">{isMe ? 'You' : player.name}</span>
      <span className="text-xs text-accent font-semibold">{player.chips} 🪙</span>
      {player.bet > 0 && (
        <span className="text-xs text-yellow-400">Bet: {player.bet}</span>
      )}
    </div>
  )
}
