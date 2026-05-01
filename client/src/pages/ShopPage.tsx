
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { FrameGold, FrameNeon, FramePlatinum } from '../components/ui/AvatarFrames'

const noiseSVG = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E")`

function AvatarPreview({ Frame }: { Frame: React.ComponentType<{ size: number }> }) {
  return (
    <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '64px', height: '64px', margin: '0 auto' }}>
      <div
        style={{
          width: '64px',
          height: '64px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #c41e3a, #0a0a0a)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#f5f0e8',
          fontFamily: "'Bebas Neue', sans-serif",
          fontSize: '24px',
        }}
      >
        К
      </div>
      <Frame size={64} />
    </div>
  )
}

export default function ShopPage() {
  const navigate = useNavigate()




  const frames = [
    { id: 'gold', name: 'ЗОЛОТО', Frame: FrameGold, desc: 'Классическая золотая рамка с акцентными ромбами' },
    { id: 'neon', name: 'НЕОН', Frame: FrameNeon, desc: 'Яркое зелёное свечение вокруг аватара' },
    { id: 'platinum', name: 'ПЛАТИНА', Frame: FramePlatinum, desc: 'Сегментированное платиновое кольцо' },
  ]

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#0a0a0a',
        fontFamily: "'JetBrains Mono', monospace",
        position: 'relative',
        overflow: 'hidden',
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

      {/* Page entrance — cinematic fade with subtle vignette reveal */}
      <motion.div
        initial={{ opacity: 1 }}
        animate={{ opacity: 0 }}
        transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'radial-gradient(ellipse at center, #0a0a0a 0%, #000 100%)',
          zIndex: 50,
          pointerEvents: 'none',
        }}
      />
      <motion.div
        initial={{ opacity: 0.5 }}
        animate={{ opacity: 0 }}
        transition={{ duration: 0.8, delay: 0.15, ease: 'easeOut' }}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'radial-gradient(ellipse at center, transparent 40%, #c41e3a08 70%, transparent 100%)',
          zIndex: 49,
          pointerEvents: 'none',
        }}
      />
      {/* Accent lines */}
      <div style={{ position: 'fixed', top: 0, right: 0, width: '40vw', height: '2px', background: 'linear-gradient(90deg, transparent, #c41e3a)', zIndex: 2 }} />
      <div style={{ position: 'fixed', bottom: 0, left: 0, width: '40vw', height: '1px', background: 'linear-gradient(90deg, #c41e3a33, transparent)', zIndex: 2 }} />

      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.3 }}
        style={{
          position: 'relative',
          zIndex: 10,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '20px 32px',
          borderBottom: '1px solid #1e1e1e',
          maxWidth: '960px',
          margin: '0 auto',
        }}
      >
        <button
          onClick={() => navigate(-1)}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: '#555',
            padding: 0,
            display: 'flex',
            transition: 'color 0.2s',
          }}
          onMouseEnter={e => (e.currentTarget.style.color = '#f5f0e8')}
          onMouseLeave={e => (e.currentTarget.style.color = '#555')}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 5l-7 7 7 7"/>
          </svg>
        </button>
        <div
          style={{
            fontFamily: "'Bebas Neue', sans-serif",
            fontSize: '24px',
            letterSpacing: '0.12em',
            color: '#f5f0e8',
          }}
        >
          МАГАЗИН
        </div>
        <div style={{ width: '20px' }} />
      </motion.header>

      <motion.main
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25, duration: 0.4 }}
        style={{
          position: 'relative',
          zIndex: 10,
          maxWidth: '960px',
          margin: '0 auto',
          padding: '40px 24px 80px',
        }}
      >

        {/* Premium Account */}
        <section style={{ marginBottom: '48px' }}>
          <div
            style={{
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: '28px',
              letterSpacing: '0.1em',
              color: '#f5f0e8',
              marginBottom: '20px',
            }}
          >
            ПРЕМИУМ-АККАУНТ
          </div>
          <div
            style={{
              background: '#111',
              border: '1px solid #d4af3744',
              padding: '32px',
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'flex-start', gap: '32px', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: '220px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                  <span
                    style={{
                      fontFamily: "'Bebas Neue', sans-serif",
                      fontSize: '22px',
                      letterSpacing: '0.08em',
                      color: '#f5f0e8',
                    }}
                  >
                    НАВСЕГДА
                  </span>
                  <span
                    style={{
                      background: '#d4af37',
                      color: '#0a0a0a',
                      fontSize: '10px',
                      fontWeight: 700,
                      padding: '3px 8px',
                      letterSpacing: '0.15em',
                    }}
                  >
                    PREMIUM
                  </span>
                </div>
                <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 24px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {[
                    'Доступ к закрытым форматам игры',
                    'Расширенная статистика: график MMR, винрейт, история рук',
                    'Онлайн статистика: игроки на сайте, в поиске и в играх',
                    'Золотой никнейм за столом и в лобби',
                    'Эксклюзивная рамка для аватара',
                  ].map((item, i) => (
                    <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', color: '#999', fontSize: '12px', letterSpacing: '0.03em', lineHeight: 1.5 }}>
                      <span style={{ color: '#c41e3a', flexShrink: 0 }}>✓</span>
                      {item}
                    </li>
                  ))}
                </ul>
                <p style={{ color: '#555', fontSize: '11px', lineHeight: 1.6, margin: 0 }}>
                  После оплаты Premium-статус активируется мгновенно. Рамка, золотой никнейм и расширенная статистика становятся доступны сразу в профиле.
                </p>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div
                  style={{
                    fontFamily: "'Bebas Neue', sans-serif",
                    fontSize: '40px',
                    letterSpacing: '0.05em',
                    color: '#f5f0e8',
                    lineHeight: 1,
                  }}
                >
                  199 ₽
                </div>
                <div style={{ color: '#555', fontSize: '11px', letterSpacing: '0.1em', marginBottom: '16px', marginTop: '4px' }}>
                  РАЗОВЫЙ ПЛАТЁЖ
                </div>
                <button
                  disabled
                  style={{
                    padding: '12px 28px',
                    background: '#d4af3766',
                    border: '1px solid #d4af37',
                    color: '#0a0a0a',
                    fontFamily: "'Bebas Neue', sans-serif",
                    fontSize: '16px',
                    letterSpacing: '0.15em',
                    cursor: 'not-allowed',
                    opacity: 0.6,
                  }}
                >
                  СКОРО
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Avatar Frames */}
        <section style={{ marginBottom: '48px' }}>
          <div
            style={{
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: '28px',
              letterSpacing: '0.1em',
              color: '#f5f0e8',
              marginBottom: '6px',
            }}
          >
            РАМКИ ДЛЯ АВАТАРА
          </div>
          <p style={{ color: '#555', fontSize: '11px', letterSpacing: '0.1em', marginBottom: '20px', margin: '0 0 20px' }}>
            ОТОБРАЖАЮТСЯ РЯДОМ С ВАШИМ АВАТАРОМ ВО ВРЕМЯ ИГРЫ И В ПРОФИЛЕ
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '2px' }}>
            {frames.map(({ id, name, Frame, desc }) => (
              <div
                key={id}
                style={{
                  background: '#111',
                  border: '1px solid #2a2a2a',
                  padding: '28px 20px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  textAlign: 'center',
                  gap: '16px',
                }}
              >
                <AvatarPreview Frame={Frame} />
                <div>
                  <div
                    style={{
                      fontFamily: "'Bebas Neue', sans-serif",
                      fontSize: '18px',
                      letterSpacing: '0.1em',
                      color: '#f5f0e8',
                    }}
                  >
                    {name}
                  </div>
                  <div style={{ color: '#555', fontSize: '11px', marginTop: '4px', lineHeight: 1.5 }}>{desc}</div>
                </div>
                <div style={{ marginTop: 'auto', width: '100%' }}>
                  <div
                    style={{
                      fontFamily: "'Bebas Neue', sans-serif",
                      fontSize: '24px',
                      letterSpacing: '0.05em',
                      color: '#f5f0e8',
                      marginBottom: '12px',
                    }}
                  >
                    19 ₽
                  </div>
                  <button
                    disabled
                    style={{
                      width: '100%',
                      padding: '10px 0',
                      background: 'transparent',
                      border: '1px solid #2a2a2a',
                      color: '#555',
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: '11px',
                      letterSpacing: '0.1em',
                      cursor: 'not-allowed',
                      opacity: 0.6,
                    }}
                  >
                    СКОРО
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Delivery */}
        <section
          style={{
            marginBottom: '16px',
            background: '#111',
            border: '1px solid #2a2a2a',
            padding: '24px',
          }}
        >
          <div
            style={{
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: '18px',
              letterSpacing: '0.1em',
              color: '#f5f0e8',
              marginBottom: '12px',
            }}
          >
            ПОЛУЧЕНИЕ ТОВАРА
          </div>
          <p style={{ color: '#999', fontSize: '12px', lineHeight: 1.7, margin: 0 }}>
            Все товары являются цифровыми. После успешной оплаты товар активируется автоматически и мгновенно отображается в вашем аккаунте на сайте pokertitan.pro. Никакой доставки не требуется — просто войдите в профиль и воспользуйтесь покупкой.
          </p>
        </section>

        {/* Contacts */}
        <section
          style={{
            marginBottom: '16px',
            background: '#111',
            border: '1px solid #2a2a2a',
            padding: '24px',
          }}
        >
          <div
            style={{
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: '18px',
              letterSpacing: '0.1em',
              color: '#f5f0e8',
              marginBottom: '12px',
            }}
          >
            КОНТАКТЫ И РЕКВИЗИТЫ
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px' }}>
            {[
              ['Продавец', 'Труфанов Кирилл Анатольевич'],
              ['ИНН', '510803201025'],
              ['Статус', 'Самозанятый'],
            ].map(([key, val]) => (
              <div key={key}>
                <span style={{ color: '#555', letterSpacing: '0.1em' }}>{key.toUpperCase()}: </span>
                <span style={{ color: '#999' }}>{val}</span>
              </div>
            ))}
            <div>
              <span style={{ color: '#555', letterSpacing: '0.1em' }}>EMAIL: </span>
              <a href="mailto:help@pokertitan.pro" style={{ color: '#c41e3a', textDecoration: 'none' }}>
                help@pokertitan.pro
              </a>
            </div>
          </div>
        </section>

        {/* Offer link */}
        <section style={{ textAlign: 'center', paddingTop: '8px' }}>
          <p style={{ color: '#555', fontSize: '11px', letterSpacing: '0.05em', margin: 0 }}>
            Совершая покупку, вы принимаете условия{' '}
            <a href="/offer" style={{ color: '#c41e3a', textDecoration: 'none' }}>публичной оферты</a>
          </p>
        </section>

      </motion.main>
    </div>
  )
}
