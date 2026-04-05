import { useState } from 'react'
import { motion } from 'framer-motion'
import { Button } from '../ui/Button'
import type { GameAction } from '../../types/game'

interface ActionPanelProps {
  currentBet: number
  myChips: number
  myBet: number
  onAction: (action: GameAction, amount?: number) => void
}

export function ActionPanel({ currentBet, myChips, myBet, onAction }: ActionPanelProps) {
  const maxRaise = myChips
  const minRaise = Math.min(currentBet * 2 || 40, maxRaise)
  const [raiseAmount, setRaiseAmount] = useState(minRaise)
  const toCall = Math.max(0, currentBet - myBet)
  const canCheck = toCall === 0

  return (
    <motion.div
      initial={{ y: 80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="w-full flex flex-col gap-3 bg-surface rounded-2xl p-4 border border-border"
    >
      {/* Top row: Fold + Check/Call */}
      <div className="flex gap-3">
        <Button variant="danger" className="flex-1 h-12 text-base" onClick={() => onAction('fold')}>
          Fold
        </Button>
        {canCheck ? (
          <Button variant="secondary" className="flex-1 h-12 text-base" onClick={() => onAction('check')}>
            Check
          </Button>
        ) : (
          <Button variant="secondary" className="flex-1 h-12 text-base" onClick={() => onAction('call')}>
            Call {toCall} 🪙
          </Button>
        )}
      </div>

      {/* Bottom row: slider + raise */}
      <div className="flex flex-col gap-2">
        <div className="flex justify-between text-xs text-muted px-1">
          <span>Рейз: {raiseAmount} 🪙</span>
          <span>Макс: {maxRaise} 🪙</span>
        </div>
        <input
          type="range"
          min={minRaise}
          max={maxRaise}
          step={10}
          value={Math.min(raiseAmount, maxRaise)}
          onChange={e => setRaiseAmount(Number(e.target.value))}
          className="w-full accent-accent h-2"
        />
        <Button variant="primary" className="w-full h-12 text-base" onClick={() => onAction('raise', raiseAmount)}>
          Raise {raiseAmount} 🪙
        </Button>
      </div>
    </motion.div>
  )
}
