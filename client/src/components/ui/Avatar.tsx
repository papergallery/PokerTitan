interface AvatarProps {
  name?: string
  avatarUrl?: string
  size?: 'sm' | 'md' | 'lg'
}

const sizes = { sm: 'w-8 h-8 text-xs', md: 'w-10 h-10 text-sm', lg: 'w-16 h-16 text-xl' }

const colors = [
  'bg-purple-600', 'bg-blue-600', 'bg-green-700',
  'bg-orange-600', 'bg-pink-600', 'bg-teal-600',
]

export function Avatar({ name, avatarUrl, size = 'md' }: AvatarProps) {
  const safeName = name || '?'
  const initials = safeName.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2)
  const colorIdx = safeName.charCodeAt(0) % colors.length

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={safeName}
        className={`${sizes[size]} rounded-full object-cover`}
      />
    )
  }

  return (
    <div className={`${sizes[size]} ${colors[colorIdx]} rounded-full flex items-center justify-center font-semibold text-white`}>
      {initials}
    </div>
  )
}
