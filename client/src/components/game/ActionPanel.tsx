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
      className="flex items-center gap-3 bg-surface rounded-2xl p-4 border border-border"
    >
      <Button variant="danger" onClick={() => onAction('fold')}>
        Fold
      </Button>

      {canCheck ? (
        <Button variant="secondary" onClick={() => onAction('check')}>
          Check
        </Button>
      ) : (
        <Button variant="secondary" onClick={() => onAction('call')}>
          Call {toCall} 🪙
        </Button>
      )}

      <div className="flex items-center gap-2">
        <input
          type="range"
          min={minRaise}
          max={maxRaise}
          step={10}
          value={Math.min(raiseAmount, maxRaise)}
          onChange={e => setRaiseAmount(Number(e.target.value))}
          className="w-24 accent-accent"
        />
        <Button variant="primary" onClick={() => onAction('raise', raiseAmount)}>
          Raise {raiseAmount} 🪙
        </Button>
      </div>
    </motion.div>
  )
}
