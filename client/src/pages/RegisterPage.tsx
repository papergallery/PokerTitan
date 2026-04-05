import { useState, FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '../hooks/useAuth'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'

export default function RegisterPage() {
  const navigate = useNavigate()
  const { registerMutation } = useAuth()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    try {
      await registerMutation.mutateAsync({ email, password, name })
      navigate('/lobby')
    } catch {
      setError('Ошибка регистрации. Возможно, email уже занят.')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm bg-surface rounded-2xl p-8 border border-border"
      >
        <h2 className="text-2xl font-bold text-white mb-6">Регистрация</h2>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input
            label="Имя"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Иван Петров"
            required
          />
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
          />
          <Input
            label="Пароль"
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Минимум 8 символов"
            minLength={8}
            required
          />
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <Button type="submit" disabled={registerMutation.isPending}>
            {registerMutation.isPending ? 'Создаём...' : 'Зарегистрироваться'}
          </Button>
        </form>

        <div className="my-4 flex items-center gap-3">
          <div className="flex-1 h-px bg-border" />
          <span className="text-muted text-sm">или</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        <Button
          variant="secondary"
          className="w-full"
          onClick={() => window.location.href = '/auth/google'}
        >
          Войти через Google
        </Button>

        <p className="mt-4 text-center text-sm text-muted">
          Уже есть аккаунт?{' '}
          <Link to="/login" className="text-accent hover:underline">
            Войти
          </Link>
        </p>
      </motion.div>
    </div>
  )
}
