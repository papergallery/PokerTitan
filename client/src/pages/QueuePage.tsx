import { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { socket } from '../lib/socket'
import { matchmakingApi } from '../api/matchmaking'
import { useAuth } from '../hooks/useAuth'
import { Button } from '../components/ui/Button'
import { MatchmakingSearch } from '../components/matchmaking/MatchmakingSearch'

export default function QueuePage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuth()
  const format = (location.state as { format?: '1v1' | '5-player' | '1v1-turbo' | '5-player-bounty' })?.format ?? '1v1'
  const [elapsed, setElapsed] = useState(0)
  const [queueCount, setQueueCount] = useState(1)

  useEffect(() => {
    socket.connect()
    if (user) {
      socket.emit('join-queue', { format, mmr: user.mmr })
    }

    socket.on('matchmaking:found', (data: { tournamentId: number }) => {
      navigate(`/game/${data.tournamentId}`)
    })

    socket.on('queue:count', (data: { format: string; count: number }) => {
      if (data.format === format) setQueueCount(data.count)
    })

    const timer = setInterval(() => setElapsed(e => e + 1), 1000)

    return () => {
      socket.off('matchmaking:found')
      socket.off('queue:count')
      clearInterval(timer)
    }
  }, [format, navigate, user])

  async function handleCancel() {
    await matchmakingApi.leaveQueue()
    socket.emit('leave-queue', { format })
    navigate('/lobby')
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-8">
      <MatchmakingSearch format={format} elapsed={elapsed} queueCount={queueCount} />
      <Button variant="secondary" onClick={handleCancel}>
        Отмена
      </Button>
    </div>
  )
}
