import { useNavigate } from 'react-router-dom'
import { FrameGold, FrameNeon, FramePlatinum } from '../components/ui/AvatarFrames'

// Компонент превью аватара с рамкой
function AvatarPreview({ Frame }: { Frame: React.ComponentType<{ size: number }> }) {
  return (
    <div className="relative inline-flex items-center justify-center w-16 h-16 mx-auto">
      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center text-white font-bold text-xl">
        К
      </div>
      <Frame size={64} />
    </div>
  )
}

export default function ShopPage() {
  const navigate = useNavigate()

  const frames = [
    { id: 'gold', name: 'Золото', Frame: FrameGold, desc: 'Классическая золотая рамка с акцентными ромбами' },
    { id: 'neon', name: 'Неон', Frame: FrameNeon, desc: 'Яркое зелёное свечение вокруг аватара' },
    { id: 'platinum', name: 'Платина', Frame: FramePlatinum, desc: 'Сегментированное платиновое кольцо' },
  ]

  return (
    <div className="min-h-screen bg-[#0f0f0f]">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-border max-w-4xl mx-auto">
        <button onClick={() => navigate(-1)} className="text-muted hover:text-white transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 5l-7 7 7 7"/>
          </svg>
        </button>
        <span className="text-white font-bold text-lg">Магазин</span>
        <div className="w-5" />
      </header>

      <main className="max-w-4xl mx-auto px-4 py-10">

        {/* Premium Account */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-white mb-6">Премиум-аккаунт</h2>
          <div className="bg-[#1a1a1a] border border-amber-500/50 rounded-2xl p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row sm:items-start gap-6">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <h3 className="text-xl font-bold text-white">Навсегда</h3>
                  <span className="bg-amber-500 text-black text-xs font-bold px-2 py-1 rounded-full">PREMIUM</span>
                </div>
                <ul className="space-y-2 text-sm text-muted mb-6">
                  <li className="flex items-center gap-2"><span className="text-accent">✓</span> Золотой никнейм за столом и в лобби</li>
                  <li className="flex items-center gap-2"><span className="text-accent">✓</span> Расширенная статистика: график MMR, винрейт, история рук</li>
                  <li className="flex items-center gap-2"><span className="text-accent">✓</span> Эксклюзивная рамка для аватара</li>
                  <li className="flex items-center gap-2"><span className="text-accent">✓</span> Доступ к закрытым форматам игры</li>
                </ul>
                <p className="text-xs text-muted">
                  После оплаты Premium-статус активируется мгновенно. Рамка, золотой никнейм и расширенная статистика становятся доступны сразу в профиле.
                </p>
              </div>
              <div className="sm:text-right">
                <div className="text-3xl font-bold text-white">99 ₽</div>
                <div className="text-muted text-sm mb-4">разовый платёж</div>
                <button disabled className="w-full sm:w-auto px-6 py-2.5 bg-amber-500 text-black font-semibold rounded-xl opacity-50 cursor-not-allowed text-sm">
                  Скоро
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Avatar Frames */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-white mb-2">Рамки для аватара</h2>
          <p className="text-muted text-sm mb-6">Отображаются рядом с вашим аватаром во время игры и в профиле</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {frames.map(({ id, name, Frame, desc }) => (
              <div key={id} className="bg-[#1a1a1a] border border-border rounded-2xl p-6 flex flex-col items-center text-center gap-4">
                <AvatarPreview Frame={Frame} />
                <div>
                  <div className="text-white font-semibold">{name}</div>
                  <div className="text-muted text-xs mt-1">{desc}</div>
                </div>
                <div className="mt-auto w-full">
                  <div className="text-xl font-bold text-white mb-3">19 ₽</div>
                  <button disabled className="w-full px-4 py-2 bg-[#242424] border border-border text-muted rounded-xl text-sm cursor-not-allowed opacity-50">
                    Скоро
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Delivery */}
        <section className="mb-12 bg-[#1a1a1a] rounded-2xl p-6 border border-border">
          <h2 className="text-lg font-bold text-white mb-3">Получение товара</h2>
          <p className="text-muted text-sm leading-relaxed">
            Все товары являются цифровыми. После успешной оплаты товар активируется автоматически и мгновенно отображается в вашем аккаунте на сайте pokertitan.pro. Никакой доставки не требуется — просто войдите в профиль и воспользуйтесь покупкой.
          </p>
        </section>

        {/* Contacts */}
        <section className="mb-12 bg-[#1a1a1a] rounded-2xl p-6 border border-border">
          <h2 className="text-lg font-bold text-white mb-3">Контакты и реквизиты</h2>
          <div className="space-y-2 text-sm text-muted">
            <div><span className="text-white">Продавец:</span> Труфанов Кирилл Анатольевич</div>
            <div><span className="text-white">ИНН:</span> 510803201025</div>
            <div><span className="text-white">Статус:</span> Самозанятый</div>
            <div><span className="text-white">Email:</span> <a href="mailto:help@pokertitan.pro" className="text-accent hover:underline">help@pokertitan.pro</a></div>
          </div>
        </section>

        {/* Offer link */}
        <section className="text-center">
          <p className="text-muted text-sm">
            Совершая покупку, вы принимаете условия{' '}
            <a href="/offer" className="text-accent hover:underline">публичной оферты</a>
          </p>
        </section>

      </main>
    </div>
  )
}
