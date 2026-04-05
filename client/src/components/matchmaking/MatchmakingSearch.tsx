import { motion } from 'framer-motion'

interface MatchmakingSearchProps {
  format: '1v1' | '5-player'
  elapsed: number
}

export function MatchmakingSearch({ format, elapsed }: MatchmakingSearchProps) {
  const mins = Math.floor(elapsed / 60).toString().padStart(2, '0')
  const secs = (elapsed % 60).toString().padStart(2, '0')

  return (
    <div className="flex flex-col items-center gap-8">
      <div className="relative w-40 h-40">
        <motion.div
          className="w-40 h-40 rounded-full border-4 border-accent"
          animate={{ scale: [1, 1.15, 1], opacity: [1, 0.6, 1] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute inset-0 w-40 h-40 rounded-full border-2 border-accent/30"
          animate={{ scale: [1, 1.4, 1], opacity: [0.5, 0, 0.5] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut', delay: 0.3 }}
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-accent text-5xl">♠</span>
        </div>
      </div>

      <div className="text-center">
        <p className="text-white text-2xl font-semibold">Поиск игры...</p>
        <p className="text-muted text-base mt-2">
          {format === '1v1' ? '1 на 1' : 'Турнир 5 игроков'} · {mins}:{secs}
        </p>
      </div>
    </div>
  )
}
