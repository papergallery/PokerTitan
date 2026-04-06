import { useState, FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '../hooks/useAuth'

const noiseSVG = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E")`

export default function LoginPage() {
  const navigate = useNavigate()
  const { loginMutation } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [focusedField, setFocusedField] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    try {
      await loginMutation.mutateAsync({ email, password })
      navigate('/lobby')
    } catch {
      setError('Неверный email или пароль')
    }
  }

  const inputStyle = (fieldName: string) => ({
    width: '100%',
    padding: '12px 16px',
    background: '#0f0f0f',
    border: `1px solid ${focusedField === fieldName ? '#c41e3a' : '#2a2a2a'}`,
    color: '#f5f0e8',
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: '13px',
    outline: 'none',
    transition: 'border-color 0.2s',
    boxSizing: 'border-box' as const,
  })

  const labelStyle = {
    display: 'block' as const,
    color: '#999',
    fontSize: '10px',
    letterSpacing: '0.2em',
    marginBottom: '6px',
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#0a0a0a',
        fontFamily: "'JetBrains Mono', monospace",
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
    >
      {/* Noise texture */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          backgroundImage: noiseSVG,
          backgroundRepeat: 'repeat',
          backgroundSize: '200px 200px',
          pointerEvents: 'none',
          zIndex: 1,
          opacity: 0.6,
        }}
      />
      {/* Accent lines */}
      <div style={{ position: 'fixed', top: 0, right: 0, width: '40vw', height: '2px', background: 'linear-gradient(90deg, transparent, #c41e3a)', zIndex: 2 }} />
      <div style={{ position: 'fixed', bottom: 0, left: 0, width: '40vw', height: '1px', background: 'linear-gradient(90deg, #c41e3a33, transparent)', zIndex: 2 }} />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        style={{
          position: 'relative',
          zIndex: 10,
          width: '100%',
          maxWidth: '400px',
          background: '#111',
          border: '1px solid #2a2a2a',
          padding: '40px 32px',
        }}
      >
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <span style={{ color: '#c41e3a', fontSize: '20px' }}>♠</span>
          <div
            style={{
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: '28px',
              letterSpacing: '0.12em',
              color: '#f5f0e8',
              lineHeight: 1,
              marginTop: '4px',
            }}
          >
            ВХОД
          </div>
          <div style={{ color: '#555', fontSize: '10px', letterSpacing: '0.2em', marginTop: '4px' }}>
            POKERTITAN
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <label style={labelStyle}>EMAIL</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              style={inputStyle('email')}
              onFocus={() => setFocusedField('email')}
              onBlur={() => setFocusedField(null)}
            />
          </div>
          <div>
            <label style={labelStyle}>ПАРОЛЬ</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              style={inputStyle('password')}
              onFocus={() => setFocusedField('password')}
              onBlur={() => setFocusedField(null)}
            />
          </div>

          {error && (
            <p style={{ color: '#c41e3a', fontSize: '12px', margin: 0, letterSpacing: '0.05em' }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loginMutation.isPending}
            style={{
              width: '100%',
              padding: '16px 0',
              background: loginMutation.isPending ? '#333' : '#c41e3a',
              border: '1px solid transparent',
              color: '#f5f0e8',
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: '20px',
              letterSpacing: '0.2em',
              cursor: loginMutation.isPending ? 'not-allowed' : 'pointer',
              transition: 'background 0.2s',
            }}
            onMouseEnter={e => {
              if (!loginMutation.isPending) e.currentTarget.style.background = '#a01830'
            }}
            onMouseLeave={e => {
              if (!loginMutation.isPending) e.currentTarget.style.background = '#c41e3a'
            }}
          >
            {loginMutation.isPending ? 'ВХОДИМ...' : 'ВОЙТИ'}
          </button>
        </form>

        {/* Divider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '24px 0' }}>
          <div style={{ flex: 1, height: '1px', background: '#2a2a2a' }} />
          <span style={{ color: '#555', fontSize: '11px', letterSpacing: '0.15em' }}>ИЛИ</span>
          <div style={{ flex: 1, height: '1px', background: '#2a2a2a' }} />
        </div>

        <button
          onClick={() => { window.location.href = '/auth/google' }}
          style={{
            width: '100%',
            padding: '14px 0',
            background: 'transparent',
            border: '1px solid #2a2a2a',
            color: '#999',
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '12px',
            letterSpacing: '0.1em',
            cursor: 'pointer',
            transition: 'border-color 0.2s, color 0.2s',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.borderColor = '#555'
            e.currentTarget.style.color = '#f5f0e8'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.borderColor = '#2a2a2a'
            e.currentTarget.style.color = '#999'
          }}
        >
          Войти через Google
        </button>

        <p style={{ marginTop: '24px', textAlign: 'center', fontSize: '12px', color: '#555' }}>
          Нет аккаунта?{' '}
          <Link
            to="/register"
            style={{ color: '#c41e3a', textDecoration: 'none', letterSpacing: '0.05em' }}
          >
            Зарегистрироваться
          </Link>
        </p>
      </motion.div>
    </div>
  )
}
