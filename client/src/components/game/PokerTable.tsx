import type { GameState } from '../../types/game'
import { PlayerSeat } from './PlayerSeat'
import { CommunityCards } from './CommunityCards'

interface PokerTableProps {
  gameState: GameState
  timeLeft: number
}

// Position players around an oval using polar coordinates
function getPlayerPosition(index: number, total: number): { top: string; left: string } {
  const angle = (index / total) * 2 * Math.PI - Math.PI / 2
  const rx = 42  // horizontal radius %
  const ry = 38  // vertical radius %
  const top = 50 + ry * Math.sin(angle)
  const left = 50 + rx * Math.cos(angle)
  return { top: `${top}%`, left: `${left}%` }
}

export function PokerTable({ gameState, timeLeft }: PokerTableProps) {
  const { players, communityCards, pot, currentPlayerId, myUserId } = gameState
  const total = players.length

  return (
    <div className="relative w-full h-full flex items-center justify-center">
      {/* Table felt */}
      <div
        className="relative rounded-[50%] shadow-2xl border-4 border-[#0f2a1a]"
        style={{
          width: '70vmin',
          height: '45vmin',
          backgroundColor: '#1a3a2a',
        }}
      >
        {/* Center: community cards + pot */}
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
          <CommunityCards cards={communityCards} />
          {pot > 0 && (
            <span className="text-yellow-400 font-semibold text-sm">
              Pot: {pot} 🪙
            </span>
          )}
        </div>
      </div>

      {/* Players positioned around the table */}
      {players.map((player, index) => {
        const pos = getPlayerPosition(index, total)
        return (
          <div
            key={player.userId}
            className="absolute transform -translate-x-1/2 -translate-y-1/2"
            style={{ top: pos.top, left: pos.left }}
          >
            <PlayerSeat
              player={player}
              isCurrentTurn={player.userId === currentPlayerId}
              isMe={player.userId === myUserId}
              timeLeft={player.userId === currentPlayerId ? timeLeft : 30}
            />
          </div>
        )
      })}
    </div>
  )
}
