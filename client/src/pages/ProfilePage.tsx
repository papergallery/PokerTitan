import { useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { usersApi } from '../api/users'
import { useAuth } from '../hooks/useAuth'
import { Avatar } from '../components/ui/Avatar'
import { MMRBadge } from '../components/ui/MMRBadge'

export default function ProfilePage() {
  const { id } = useParams<{ id: string }>()
  const userId = parseInt(id ?? '0', 10)
  const { user: me } = useAuth()
  const qc = useQueryClient()
  const isOwner = me?.id === userId

  const [editingName, setEditingName] = useState(false)
  const [nameValue, setNameValue] = useState('')
  const [savingName, setSavingName] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { data: user, refetch } = useQuery({
    queryKey: ['user', userId],
    queryFn: () => usersApi.getProfile(userId).then(r => r.data),
  })

  const { data: history } = useQuery({
    queryKey: ['history', userId],
    queryFn: () => usersApi.getHistory(userId).then(r => r.data),
    enabled: !!userId,
  })

  if (!user) return <div className="min-h-screen flex items-center justify-center text-muted">Загрузка...</div>

  const handleAvatarClick = () => {
    if (isOwner) fileInputRef.current?.click()
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      await usersApi.uploadAvatar(file)
      await qc.invalidateQueries({ queryKey: ['me'] })
      await qc.invalidateQueries({ queryKey: ['user', userId] })
      refetch()
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  const startEditName = () => {
    setNameValue(user.name ?? '')
    setEditingName(true)
  }

  const saveName = async () => {
    if (!nameValue.trim()) return
    setSavingName(true)
    try {
      await usersApi.updateName(nameValue.trim())
      await qc.invalidateQueries({ queryKey: ['me'] })
      await qc.invalidateQueries({ queryKey: ['user', userId] })
      refetch()
      setEditingName(false)
    } finally {
      setSavingName(false)
    }
  }

  return (
    <div className="min-h-screen max-w-xl mx-auto px-4 py-10">
      {/* Profile header */}
      <div className="flex items-center gap-4 mb-8">
        {/* Avatar with overlay for owner */}
        <div className="relative inline-block">
          {isOwner && (
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
          )}
          <div
            className={isOwner ? 'cursor-pointer' : ''}
            onClick={isOwner ? handleAvatarClick : undefined}
          >
            <Avatar name={user.name} avatarUrl={user.avatarUrl} size="lg" />
            {isOwner && (
              <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                {uploading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                    <circle cx="12" cy="13" r="4" />
                  </svg>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Name with edit */}
        <div>
          {editingName ? (
            <div className="flex items-center gap-2">
              <input
                className="bg-[#242424] text-white text-2xl font-bold rounded-lg px-3 py-1 border border-border outline-none focus:border-accent w-48"
                value={nameValue}
                onChange={e => setNameValue(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') saveName()
                  if (e.key === 'Escape') setEditingName(false)
                }}
                autoFocus
                maxLength={32}
              />
              <button
                onClick={saveName}
                disabled={savingName}
                className="text-sm text-accent hover:text-green-400 disabled:opacity-50"
              >
                {savingName ? '...' : 'Сохранить'}
              </button>
              <button
                onClick={() => setEditingName(false)}
                className="text-sm text-muted hover:text-white"
              >
                Отмена
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-white">{user.name}</h1>
              {isOwner && (
                <button
                  onClick={startEditName}
                  className="text-muted hover:text-white transition-colors"
                  title="Изменить имя"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                </button>
              )}
            </div>
          )}
          <MMRBadge mmr={user.mmr} />
        </div>
      </div>

      {/* History */}
      <h2 className="text-lg font-semibold text-white mb-3">История турниров</h2>
      {history && history.length > 0 ? (
        <div className="flex flex-col gap-2">
          {history.map(h => (
            <div
              key={h.tournamentId}
              className="flex items-center justify-between bg-surface rounded-xl px-4 py-3 border border-border"
            >
              <div>
                <span className="text-white text-sm font-medium">
                  {h.format === '1v1' ? '1 на 1' : 'Турнир 5×5'}
                </span>
                <span className="text-muted text-xs ml-2">#{h.place} место</span>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-sm font-semibold ${h.mmrChange >= 0 ? 'text-accent' : 'text-red-400'}`}>
                  {h.mmrChange >= 0 ? '+' : ''}{h.mmrChange} MMR
                </span>
                <span className="text-muted text-xs">
                  {new Date(h.finishedAt).toLocaleDateString('ru-RU')}
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-muted">Нет сыгранных турниров</p>
      )}
    </div>
  )
}
