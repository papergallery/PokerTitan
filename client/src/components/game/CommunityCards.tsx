import { motion } from 'framer-motion'
import type { Card } from '../../types/game'

const suitSymbols: Record<string, string> = { s: '♠', h: '♥', d: '♦', c: '♣' }
const redSuits = new Set(['h', 'd'])

interface CardViewProps { card: Card }

function CardView({ card }: CardViewProps) {
  const isRed = redSuits.has(card.suit)
  return (
    <div className="w-10 h-14 bg-white rounded-lg flex flex-col items-center justify-center shadow-md">
      <span className={`text-lg font-bold leading-none ${isRed ? 'text-red-600' : 'text-gray-900'}`}>
        {card.rank}
      </span>
      <span className={`text-sm leading-none ${isRed ? 'text-red-600' : 'text-gray-900'}`}>
        {suitSymbols[card.suit]}
      </span>
    </div>
  )
}

interface CommunityCardsProps { cards: Card[] }

export function CommunityCards({ cards }: CommunityCardsProps) {
  return (
    <div className="flex gap-2 justify-center">
      {cards.map((card, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.1 }}
        >
          <CardView card={card} />
        </motion.div>
      ))}
      {Array.from({ length: 5 - cards.length }).map((_, i) => (
        <div key={`empty-${i}`} className="w-10 h-14 rounded-lg border border-dashed border-white/20" />
      ))}
    </div>
  )
}
