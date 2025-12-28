// assets/js/mobile-warning.js
// Логика показа предупреждения для мобильных устройств

/**
 * Константы для определения мобильного устройства и работы с localStorage
 */
const MOBILE_BREAKPOINT = 768; // Ширина экрана для определения мобилы
const STORAGE_KEY = 'mobile_warning_accepted'; // Ключ в localStorage

/**
 * Проверяет, является ли устройство мобильным
 * @returns {boolean}
 */
function isMobileDevice() {
  return window.innerWidth <= MOBILE_BREAKPOINT;
}

/**
 * Проверяет, подтвердил ли пользователь использование на мобиле ранее
 * @returns {boolean}
 */
function isWarningAccepted() {
  return localStorage.getItem(STORAGE_KEY) === 'true';
}

/**
 * Сохраняет подтверждение пользователя в localStorage
 */
function acceptWarning() {
  localStorage.setItem(STORAGE_KEY, 'true');
}

/**
 * Показывает модальное окно с предупреждением
 */
function showMobileWarning() {
  const modal = document.getElementById('mobileModal');
  if (modal) {
    modal.classList.add('mobile-modal--visible');
  }
}

/**
 * Скрывает модальное окно с предупреждением
 */
function hideMobileWarning() {
  const modal = document.getElementById('mobileModal');
  if (modal) {
    modal.classList.remove('mobile-modal--visible');
  }
}

/**
 * Обработчик кнопки "Продолжить всё равно"
 */
function handleContinue() {
  acceptWarning();
  hideMobileWarning();
}

/**
 * Обработчик кнопки "Покинуть страницу"
 */
function handleLeave() {
  // Пытаемся вернуться назад, если возможно
  if (window.history.length > 1) {
    window.history.back();
  } else {
    // Если истории нет, закрываем вкладку (работает не во всех браузерах)
    window.close();
    // Если закрытие не сработало (защита браузера), показываем заглушку
    setTimeout(() => {
      document.body.innerHTML = `
        <div style="
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100vh;
          background: #0e1117;
          color: #e6e6e6;
          font-family: system-ui;
          text-align: center;
          padding: 20px;
        ">
          <div>
            <h1 style="font-size: 24px; margin-bottom: 12px;">Спасибо за понимание</h1>
            <p style="color: #9ca3af;">Вы можете закрыть эту вкладку</p>
          </div>
        </div>
      `;
    }, 100);
  }
}

/**
 * Инициализация модального окна и обработчиков
 */
function initMobileWarning() {
  // Проверяем условия показа предупреждения
  if (!isMobileDevice() || isWarningAccepted()) {
    return; // Не показываем предупреждение
  }

  // Показываем предупреждение
  showMobileWarning();

  // Навешиваем обработчики на кнопки
  const continueBtn = document.getElementById('mobileModalContinue');
  const leaveBtn = document.getElementById('mobileModalLeave');

  if (continueBtn) {
    continueBtn.addEventListener('click', handleContinue);
  }

  if (leaveBtn) {
    leaveBtn.addEventListener('click', handleLeave);
  }
}

// Запускаем инициализацию после полной загрузки DOM
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initMobileWarning);
} else {
  initMobileWarning();
}
