import { useNavigate } from 'react-router-dom'

export default function OfferPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-[#0f0f0f]">
      <header className="flex items-center gap-4 px-6 py-4 border-b border-border max-w-3xl mx-auto">
        <button onClick={() => navigate(-1)} className="text-muted hover:text-white transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 5l-7 7 7 7"/>
          </svg>
        </button>
        <span className="text-white font-bold">Публичная оферта</span>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-10">
        <div className="space-y-6 text-muted text-sm leading-relaxed">

          <div>
            <h3 className="text-white font-semibold text-base mb-2">1. Общие положения</h3>
            <p>
              Настоящий документ является публичной офертой Труфанова Кирилла Анатольевича (ИНН 510803201025), именуемого далее «Продавец», и содержит все существенные условия договора купли-продажи цифровых товаров. Оферта адресована любому физическому лицу (далее «Покупатель»), намеренному приобрести цифровые товары на сайте pokertitan.pro.
            </p>
          </div>

          <div>
            <h3 className="text-white font-semibold text-base mb-2">2. Предмет договора</h3>
            <p>
              Продавец обязуется передать Покупателю права на использование цифрового контента (декоративные элементы профиля, статус Премиум-аккаунта) на сайте pokertitan.pro. Перечень и стоимость доступных товаров определяются на странице магазина pokertitan.pro/shop.
            </p>
          </div>

          <div>
            <h3 className="text-white font-semibold text-base mb-2">3. Порядок акцепта</h3>
            <p>
              Акцептом настоящей оферты является факт оплаты товара. Совершая оплату, Покупатель подтверждает своё согласие со всеми условиями настоящей оферты. Оплата производится через сервис ЮКасса (yookassa.ru). Договор считается заключённым с момента поступления денежных средств.
            </p>
          </div>

          <div>
            <h3 className="text-white font-semibold text-base mb-2">4. Стоимость и порядок оплаты</h3>
            <p>
              Стоимость товаров указана на странице магазина pokertitan.pro/shop. Цены указаны в рублях Российской Федерации, включая все применимые налоги. Продавец вправе изменять цены в одностороннем порядке; при этом уже оплаченные товары перерасчёту не подлежат.
            </p>
          </div>

          <div>
            <h3 className="text-white font-semibold text-base mb-2">5. Порядок получения товара</h3>
            <p>
              После успешной оплаты цифровой товар активируется автоматически в аккаунте Покупателя в течение нескольких секунд. Доставка физических товаров не предусмотрена. Для получения товара необходимо быть авторизованным на сайте pokertitan.pro.
            </p>
          </div>

          <div>
            <h3 className="text-white font-semibold text-base mb-2">6. Возврат</h3>
            <p>
              В соответствии со ст. 26.1 Закона Российской Федерации «О защите прав потребителей» возврат цифрового контента надлежащего качества не предусмотрен с момента начала использования товара. Если товар не был активирован по вине Продавца — Покупатель вправе потребовать возврата средств, обратившись по адресу help@pokertitan.pro с указанием данных об оплате.
            </p>
          </div>

          <div>
            <h3 className="text-white font-semibold text-base mb-2">7. Ответственность сторон</h3>
            <p>
              Продавец не несёт ответственности за сбои в работе платёжных систем третьих лиц. Продавец гарантирует сохранность приобретённого цифрового контента в аккаунте Покупателя на весь срок существования платформы pokertitan.pro. Покупатель несёт ответственность за сохранность своих учётных данных.
            </p>
          </div>

          <div>
            <h3 className="text-white font-semibold text-base mb-2">8. Персональные данные</h3>
            <p>
              Персональные данные Покупателя обрабатываются в соответствии с Федеральным законом №152-ФЗ «О персональных данных». Продавец использует только адрес электронной почты для идентификации Покупателя и обработки платежей. Данные не передаются третьим лицам, за исключением платёжного сервиса ЮКасса в объёме, необходимом для проведения платежей.
            </p>
          </div>

          <div>
            <h3 className="text-white font-semibold text-base mb-2">9. Контакты</h3>
            <div className="space-y-1">
              <p><span className="text-white">Продавец:</span> Труфанов Кирилл Анатольевич</p>
              <p><span className="text-white">ИНН:</span> 510803201025</p>
              <p><span className="text-white">Статус:</span> Самозанятый</p>
              <p>
                <span className="text-white">Email:</span>{' '}
                <a href="mailto:help@pokertitan.pro" className="text-accent hover:underline">help@pokertitan.pro</a>
              </p>
            </div>
          </div>

          <div className="pt-4 border-t border-border">
            <p className="text-xs">Дата публикации оферты: 06 апреля 2026 г.</p>
          </div>

        </div>
      </main>
    </div>
  )
}
