// assets/js/cards.js

let currentCard = null;
let availableCards = [];

document.addEventListener("DOMContentLoaded", async () => {
  try {
    await loadData();
    initCardsMode();
  } catch (err) {
    console.error(err);
  }
});

/**
 * Инициализация режима карточек
 */
function initCardsMode() {
  initTopicFilter();
  loadRandomCard();
  setupButtons();
}

/**
 * Инициализация фильтра "Фокус карточек"
 */
function initTopicFilter() {
  const topicSelect = document.getElementById("cardsTopicFilter");
  if (!topicSelect) return;

  // Заполняем список тем (используем функции из filters.js)
  if (typeof getTopics === "function" && typeof fillTopicOptions === "function") {
    const topics = getTopics();
    fillTopicOptions(topicSelect, topics);
  }

  // Инициализируем кастомный dropdown (используем функцию из filters.js)
  if (typeof initCustomDropdown === "function") {
    initCustomDropdown("cardsTopicFilter", topicSelect, () => {
      // При изменении темы загружаем новую карточку
      loadRandomCard();
    });
  }
}

/**
 * Загружает случайную карточку из доступных
 */
function loadRandomCard() {
  const topicSelect = document.getElementById("cardsTopicFilter");
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

  renderCard();
}

/**
 * Отображает карточку
 */
function renderCard() {
  if (!currentCard) return;

  const questionEl = document.getElementById("cardsModeQuestion");
  const answerContentEl = document.getElementById("cardsModeAnswerContent");
  const answerSectionEl = document.getElementById("cardsModeAnswer");
  const showButton = document.getElementById("cardsModeShowAnswer");

  if (!questionEl || !answerContentEl || !answerSectionEl || !showButton) return;

  // Рендерим вопрос и ответ через marked
  // Это очистит старые отрендеренные формулы
  questionEl.innerHTML = marked.parse(currentCard.question);
  answerContentEl.innerHTML = marked.parse(currentCard.answer);

  // Скрываем всю секцию ответа (включая заголовок "ОТВЕТ") изначально
  answerSectionEl.style.display = "none";
  showButton.textContent = "Показать ответ";
  showButton.disabled = false;

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
  const questionEl = document.getElementById("cardsModeQuestion");
  const answerContentEl = document.getElementById("cardsModeAnswerContent");
  const answerSectionEl = document.getElementById("cardsModeAnswer");
  const showButton = document.getElementById("cardsModeShowAnswer");

  if (questionEl) questionEl.innerHTML = "<p>Нет карточек для выбранной темы</p>";
  if (answerContentEl) answerContentEl.innerHTML = "";
  if (answerSectionEl) answerSectionEl.style.display = "none";
  if (showButton) showButton.disabled = true;
}

/**
 * Настройка кнопок управления
 */
function setupButtons() {
  const showButton = document.getElementById("cardsModeShowAnswer");
  const nextButton = document.getElementById("cardsModeNext");

  if (showButton) {
    showButton.addEventListener("click", () => {
      const answerSectionEl = document.getElementById("cardsModeAnswer");
      if (!answerSectionEl) return;

      if (answerSectionEl.style.display === "none") {
        // Показываем ответ (вместе с заголовком "ОТВЕТ")
        answerSectionEl.style.display = "block";
        showButton.textContent = "Скрыть ответ";

        // Рендерим формулы в ответе, если они еще не отрендерены
        setTimeout(() => {
          renderMath();
          renderMarkdown();
        }, 0);
      } else {
        // Скрываем ответ (вместе с заголовком "ОТВЕТ")
        answerSectionEl.style.display = "none";
        showButton.textContent = "Показать ответ";
      }
    });
  }

  if (nextButton) {
    nextButton.addEventListener("click", () => {
      // Скрываем ответ перед загрузкой новой карточки
      const answerSectionEl = document.getElementById("cardsModeAnswer");
      if (answerSectionEl) {
        answerSectionEl.style.display = "none";
      }
      loadRandomCard();
    });
  }
}

/**
 * Рендеринг математических формул
 */
function renderMath() {
  if (typeof renderMathInElement !== "function") return;

  const cardContainer = document.querySelector(".cards-mode__card");
  if (!cardContainer) return;

  // Рендерим формулы только в элементах вопроса и ответа
  const questionEl = document.getElementById("cardsModeQuestion");
  const answerSectionEl = document.getElementById("cardsModeAnswer");
  const answerContentEl = document.getElementById("cardsModeAnswerContent");

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

  if (answerSectionEl && answerSectionEl.style.display !== "none" && answerContentEl) {
    // Проверяем, есть ли уже отрендеренные формулы в ответе
    const hasRenderedMath = answerContentEl.querySelector(".katex");
    if (!hasRenderedMath) {
      renderMathInElement(answerContentEl, {
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
    const cardContainer = document.querySelector(".cards-mode__card");
    if (cardContainer) {
      cardContainer.querySelectorAll("pre code").forEach(block => {
        // Проверяем, что блок еще не подсвечен
        if (!block.classList.contains("hljs")) {
          hljs.highlightElement(block);
        }
      });
    }
  }
}
