// assets/js/blitz.js
// Режим «Блиц» — быстрая самопроверка с субъективной оценкой

let currentCard = null;
let availableCards = [];

// Статистика сессии
let sessionStats = {
  total: 0,           // Количество оцененных вопросов
  correct: 0,         // Количество "Знал"
  currentStreak: 0,   // Текущая серия
  maxStreak: 0        // Максимальная серия
};

// Состояние текущего вопроса
let currentQuestionRated = false; // Был ли оценен текущий вопрос

document.addEventListener("DOMContentLoaded", async () => {
  try {
    await loadData();
    initGlassToggle();
    initBlitzMode();
  } catch (err) {
    console.error(err);
  }
});

/**
 * Инициализация переключателя прозрачности
 */
function initGlassToggle() {
  const toggleButton = document.getElementById("glassToggle");
  if (!toggleButton) return;

  const savedState = localStorage.getItem("glassmorphismEnabled");
  const isEnabled = savedState === null ? true : savedState === "true";

  if (!isEnabled) {
    document.body.classList.add("no-glass");
  }

  toggleButton.addEventListener("click", () => {
    const isCurrentlyEnabled = !document.body.classList.contains("no-glass");
    const newState = !isCurrentlyEnabled;

    if (newState) {
      document.body.classList.remove("no-glass");
      localStorage.setItem("glassmorphismEnabled", "true");
    } else {
      document.body.classList.add("no-glass");
      localStorage.setItem("glassmorphismEnabled", "false");
    }
  });
}

/**
 * Инициализация режима блиц
 */
function initBlitzMode() {
  initTopicFilter();
  loadRandomCard();
  setupButtons();
  updateStatsDisplay();
}

/**
 * Инициализация фильтра "Тема"
 */
function initTopicFilter() {
  const topicSelect = document.getElementById("blitzTopicFilter");
  if (!topicSelect) return;

  // Заполняем список тем (используем функции из filters.js)
  if (typeof getTopics === "function" && typeof fillTopicOptions === "function") {
    const topics = getTopics();
    fillTopicOptions(topicSelect, topics);
  }

  // Инициализируем кастомный dropdown (используем функцию из filters.js)
  if (typeof initCustomDropdown === "function") {
    initCustomDropdown("blitzTopicFilter", topicSelect, () => {
      // При изменении темы загружаем новую карточку
      loadRandomCard();
    });
  }
}

/**
 * Загружает случайную карточку из доступных
 */
function loadRandomCard() {
  const topicSelect = document.getElementById("blitzTopicFilter");
  if (!topicSelect) return;

  const selectedTopic = topicSelect.value;

  // Фильтруем карточки по теме
  const allCards = getCards();
  availableCards = selectedTopic === "all"
    ? allCards
    : allCards.filter(card => card.topic === selectedTopic);

  if (availableCards.length === 0) {
    showEmptyState();
    return;
  }

  // Выбираем случайную карточку
  const randomIndex = Math.floor(Math.random() * availableCards.length);
  currentCard = availableCards[randomIndex];

  // Сбрасываем состояние текущего вопроса
  currentQuestionRated = false;

  renderCard();
}

/**
 * Отображает карточку
 */
function renderCard() {
  if (!currentCard) return;

  const questionEl = document.getElementById("blitzModeQuestion");
  const answerEl = document.getElementById("blitzModeAnswer");
  const showButton = document.getElementById("blitzModeShowAnswer");
  const knewButton = document.getElementById("blitzModeKnew");
  const didntKnowButton = document.getElementById("blitzModeDidntKnow");

  if (!questionEl || !answerEl || !showButton) return;

  // Рендерим вопрос и ответ через marked
  questionEl.innerHTML = marked.parse(currentCard.question);
  answerEl.innerHTML = marked.parse(currentCard.answer);

  // Скрываем ответ изначально
  answerEl.style.display = "none";
  showButton.textContent = "Показать ответ";
  showButton.disabled = false;

  // Сбрасываем состояние кнопок "Знал" / "Не знал"
  resetRatingButtons();

  // Рендерим формулы и markdown после небольшой задержки
  setTimeout(() => {
    renderMath();
    renderMarkdown();
  }, 0);
}

/**
 * Показывает пустое состояние (нет карточек)
 */
function showEmptyState() {
  const questionEl = document.getElementById("blitzModeQuestion");
  const answerEl = document.getElementById("blitzModeAnswer");
  const showButton = document.getElementById("blitzModeShowAnswer");

  if (questionEl) questionEl.innerHTML = "<p>Нет карточек для выбранной темы</p>";
  if (answerEl) answerEl.innerHTML = "";
  if (answerEl) answerEl.style.display = "none";
  if (showButton) showButton.disabled = true;
}

/**
 * Настройка кнопок управления
 */
function setupButtons() {
  const showButton = document.getElementById("blitzModeShowAnswer");
  const knewButton = document.getElementById("blitzModeKnew");
  const didntKnowButton = document.getElementById("blitzModeDidntKnow");
  const nextButton = document.getElementById("blitzModeNext");

  // Кнопка "Показать ответ / Скрыть ответ"
  if (showButton) {
    showButton.addEventListener("click", () => {
      const answerEl = document.getElementById("blitzModeAnswer");
      if (!answerEl) return;

      if (answerEl.style.display === "none") {
        // Показываем ответ
        answerEl.style.display = "block";
        showButton.textContent = "Скрыть ответ";

        // Рендерим формулы в ответе, если они еще не отрендерены
        setTimeout(() => {
          renderMath();
          renderMarkdown();
        }, 0);
      } else {
        // Скрываем ответ
        answerEl.style.display = "none";
        showButton.textContent = "Показать ответ";
      }
    });
  }

  // Кнопка "Знал"
  if (knewButton) {
    knewButton.addEventListener("click", () => {
      if (currentQuestionRated) return; // Повторные клики не учитываются

      currentQuestionRated = true;
      sessionStats.total++;
      sessionStats.correct++;
      sessionStats.currentStreak++;

      // Обновляем максимальную серию
      if (sessionStats.currentStreak > sessionStats.maxStreak) {
        sessionStats.maxStreak = sessionStats.currentStreak;
      }

      // Меняем визуальное состояние кнопки
      knewButton.classList.add("blitz-mode__button--active");
      knewButton.disabled = true;
      didntKnowButton.disabled = true;

      updateStatsDisplay();
    });
  }

  // Кнопка "Не знал"
  if (didntKnowButton) {
    didntKnowButton.addEventListener("click", () => {
      if (currentQuestionRated) return; // Повторные клики не учитываются

      currentQuestionRated = true;
      sessionStats.total++;
      sessionStats.currentStreak = 0; // Сбрасываем текущую серию

      // Меняем визуальное состояние кнопки
      didntKnowButton.classList.add("blitz-mode__button--active");
      knewButton.disabled = true;
      didntKnowButton.disabled = true;

      updateStatsDisplay();
    });
  }

  // Кнопка "Следующий вопрос"
  if (nextButton) {
    nextButton.addEventListener("click", () => {
      // Скрываем ответ перед загрузкой новой карточки
      const answerEl = document.getElementById("blitzModeAnswer");
      if (answerEl) {
        answerEl.style.display = "none";
      }
      loadRandomCard();
    });
  }
}

/**
 * Сбрасывает состояние кнопок "Знал" / "Не знал"
 */
function resetRatingButtons() {
  const knewButton = document.getElementById("blitzModeKnew");
  const didntKnowButton = document.getElementById("blitzModeDidntKnow");

  if (knewButton) {
    knewButton.classList.remove("blitz-mode__button--active");
    knewButton.disabled = false;
  }

  if (didntKnowButton) {
    didntKnowButton.classList.remove("blitz-mode__button--active");
    didntKnowButton.disabled = false;
  }
}

/**
 * Обновляет отображение статистики сессии
 */
function updateStatsDisplay() {
  const totalEl = document.getElementById("blitzStatsTotal");
  const accuracyEl = document.getElementById("blitzStatsAccuracy");
  const streakEl = document.getElementById("blitzStatsStreak");

  if (totalEl) {
    totalEl.textContent = sessionStats.total;
  }

  if (accuracyEl) {
    const accuracy = sessionStats.total > 0
      ? Math.round((sessionStats.correct / sessionStats.total) * 100)
      : 0;
    accuracyEl.textContent = accuracy;
  }

  if (streakEl) {
    streakEl.textContent = sessionStats.maxStreak;
  }
}

/**
 * Рендеринг математических формул
 */
function renderMath() {
  if (typeof renderMathInElement !== "function") return;

  const cardContainer = document.querySelector(".blitz-mode__card");
  if (!cardContainer) return;

  // Рендерим формулы только в элементах вопроса и ответа
  const questionEl = document.getElementById("blitzModeQuestion");
  const answerEl = document.getElementById("blitzModeAnswer");

  if (questionEl) {
    // Проверяем, есть ли уже отрендеренные формулы в вопросе
    const hasRenderedMath = questionEl.querySelector(".katex");
    if (!hasRenderedMath) {
      renderMathInElement(questionEl, {
        delimiters: [
          { left: "$$", right: "$$", display: true },
          { left: "$", right: "$", display: false }
        ],
        throwOnError: false
      });
    }
  }

  if (answerEl && answerEl.style.display !== "none") {
    // Проверяем, есть ли уже отрендеренные формулы в ответе
    const hasRenderedMath = answerEl.querySelector(".katex");
    if (!hasRenderedMath) {
      renderMathInElement(answerEl, {
        delimiters: [
          { left: "$$", right: "$$", display: true },
          { left: "$", right: "$", display: false }
        ],
        throwOnError: false
      });
    }
  }
}

/**
 * Рендеринг markdown (подсветка кода)
 */
function renderMarkdown() {
  if (typeof hljs !== "undefined") {
    const cardContainer = document.querySelector(".blitz-mode__card");
    if (cardContainer) {
      cardContainer.querySelectorAll("pre code").forEach(block => {
        hljs.highlightElement(block);
      });
    }
  }
}
