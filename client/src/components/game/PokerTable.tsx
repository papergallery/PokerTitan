import type { GameState } from '../../types/game'
import { PlayerSeat } from './PlayerSeat'
import { CommunityCards } from './CommunityCards'

interface PokerTableProps {
  gameState: GameState
  timeLeft: number
}

export function PokerTable({ gameState, timeLeft }: PokerTableProps) {
  const { players, communityCards, pot, currentPlayerId, myUserId } = gameState

  const me = players.find(p => p.userId === myUserId)
  const opponents = players.filter(p => p.userId !== myUserId)

  return (
    <div className="w-full h-full flex flex-col items-center justify-between gap-3 px-2 py-2">
      {/* Opponents (everyone except me) */}
      <div className="flex gap-4 justify-center w-full flex-wrap">
        {opponents.map(player => (
          <PlayerSeat
            key={player.userId}
            player={player}
            isCurrentTurn={player.userId === currentPlayerId}
            isMe={false}
            timeLeft={player.userId === currentPlayerId ? timeLeft : 30}
            size="sm"
          />
        ))}
      </div>

      {/* Table center: community cards + pot */}
      <div className="flex flex-col items-center gap-2 bg-[#1a3a2a] rounded-2xl px-4 py-3 w-full max-w-sm border border-[#0f2a1a]">
        <CommunityCards cards={communityCards} />
        {pot > 0 && (
          <span className="text-yellow-400 font-semibold text-sm">
            Пот: {pot} 🪙
          </span>
        )}
      </div>

      {/* Me */}
      <div className="flex justify-center w-full">
        {me && (
          <PlayerSeat
            player={me}
            isCurrentTurn={me.userId === currentPlayerId}
            isMe={true}
            timeLeft={me.userId === currentPlayerId ? timeLeft : 30}
            size="lg"
          />
        )}
      </div>
    </div>
  )
}
