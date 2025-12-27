// assets/js/interview.js
// Режим «Интервью» — формулирование письменного ответа и сравнение с эталоном

let currentCard = null;
let availableCards = [];

// Счетчики для статистики интервью
let answeredQuestionsCount = 1; // Начинается с 1, увеличивается после каждого "Отправить"
let totalScore = 0; // Сумма всех оценок для расчета средней

document.addEventListener("DOMContentLoaded", async () => {
  try {
    await loadData();
    // initGlassToggle(); // ОТКЛЮЧЕНО: режим стекла деактивирован
    document.body.classList.add("no-glass"); // Устанавливаем режим без стекла по умолчанию
    initInterviewMode();
  } catch (err) {
    console.error(err);
  }
});

/**
 * Инициализация переключателя прозрачности
 * ОТКЛЮЧЕНО: функционал glassmorphism закомментирован
 */
/* function initGlassToggle() {
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
} */

/**
 * Инициализация режима интервью
 */
function initInterviewMode() {
  initTopicFilter();
  loadRandomCard();
  setupButtons();
}

/**
 * Инициализация фильтра "Тема"
 */
function initTopicFilter() {
  const topicSelect = document.getElementById("interviewTopicFilter");
  if (!topicSelect) return;

  // Заполняем список тем (используем функции из filters.js)
  if (typeof getTopics === "function" && typeof fillTopicOptions === "function") {
    const topics = getTopics();
    fillTopicOptions(topicSelect, topics);
  }

  // Инициализируем кастомный dropdown (используем функцию из filters.js)
  if (typeof initCustomDropdown === "function") {
    initCustomDropdown("interviewTopicFilter", topicSelect, () => {
      // При изменении темы загружаем новую карточку
      loadRandomCard();
    });
  }
}

/**
 * Загружает случайную карточку из доступных
 */
function loadRandomCard() {
  const topicSelect = document.getElementById("interviewTopicFilter");
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

  const questionLabelEl = document.getElementById("interviewModeQuestionLabel");
  const questionEl = document.getElementById("interviewModeQuestion");
  const referenceContentEl = document.getElementById("interviewModeReferenceContent");
  const referenceSectionEl = document.getElementById("interviewModeReference");
  const resultSectionEl = document.getElementById("interviewModeResult");
  const textareaEl = document.getElementById("interviewModeTextarea");
  const submitButton = document.getElementById("interviewModeSubmit");
  const checkingEl = document.getElementById("interviewModeChecking");

  if (!questionLabelEl || !questionEl || !referenceContentEl || !referenceSectionEl || !resultSectionEl || !textareaEl || !submitButton || !checkingEl) return;

  // Обновляем заголовок с номером вопроса
  questionLabelEl.textContent = `ВОПРОС ${answeredQuestionsCount}`;

  // Рендерим вопрос и эталонный ответ через marked
  questionEl.innerHTML = marked.parse(currentCard.question);
  referenceContentEl.innerHTML = marked.parse(currentCard.answer);

  // Сбрасываем состояние
  textareaEl.value = "";
  textareaEl.disabled = false;
  submitButton.disabled = false;
  submitButton.textContent = "Отправить";

  // Скрываем эталонный ответ, результат и состояние проверки
  referenceSectionEl.style.display = "none";
  resultSectionEl.style.display = "none";
  checkingEl.style.display = "none";

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
  const questionEl = document.getElementById("interviewModeQuestion");
  const referenceContentEl = document.getElementById("interviewModeReferenceContent");
  const referenceSectionEl = document.getElementById("interviewModeReference");
  const textareaEl = document.getElementById("interviewModeTextarea");
  const submitButton = document.getElementById("interviewModeSubmit");

  if (questionEl) questionEl.innerHTML = "<p>Нет карточек для выбранной темы</p>";
  if (referenceContentEl) referenceContentEl.innerHTML = "";
  if (referenceSectionEl) referenceSectionEl.style.display = "none";
  if (textareaEl) {
    textareaEl.value = "";
    textareaEl.disabled = true;
  }
  if (submitButton) submitButton.disabled = true;
}

/**
 * Настройка кнопок управления
 */
function setupButtons() {
  const submitButton = document.getElementById("interviewModeSubmit");
  const nextButton = document.getElementById("interviewModeNext");

  // Кнопка "Отправить"
  if (submitButton) {
    submitButton.addEventListener("click", () => {
      handleSubmit();
    });
  }

  // Кнопка "Следующий вопрос"
  if (nextButton) {
    nextButton.addEventListener("click", () => {
      loadRandomCard();
    });
  }
}

/**
 * Обработка отправки ответа
 * Отправляет запрос к API для проверки ответа через GPT
 */
async function handleSubmit() {
  const textareaEl = document.getElementById("interviewModeTextarea");
  const submitButton = document.getElementById("interviewModeSubmit");
  const checkingEl = document.getElementById("interviewModeChecking");
  const resultSectionEl = document.getElementById("interviewModeResult");
  const referenceSectionEl = document.getElementById("interviewModeReference");

  if (!textareaEl || !submitButton || !checkingEl || !resultSectionEl || !referenceSectionEl) return;

  // Проверяем, что textarea не пустая
  const userAnswer = textareaEl.value.trim();
  if (!userAnswer) {
    return; // Ничего не делаем, если ответ пустой
  }

  if (!currentCard) return;

  // Блокируем textarea и кнопку
  textareaEl.disabled = true;
  submitButton.disabled = true;

  // Показываем состояние "Проверка..."
  checkingEl.style.display = "block";
  resultSectionEl.style.display = "none";

  try {
    // Отправляем запрос к API
    console.log('Отправка запроса к /api/interview...');
    const response = await fetch('/api/interview', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        question: currentCard.question,
        expected_answer: currentCard.answer,
        user_answer: userAnswer
      })
    });

    console.log('Response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('API Error:', errorText);
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log('API Response:', data);

    // Скрываем "Проверка..."
    checkingEl.style.display = "none";

    // Отображаем результат
    displayResult(data.score, data.feedback);

    // Показываем эталонный ответ
    referenceSectionEl.style.display = "block";

    // Рендерим формулы и markdown
    setTimeout(() => {
      renderMath();
      renderMarkdown();
    }, 0);

  } catch (error) {
    console.error('Ошибка при проверке ответа:', error);

    // Скрываем "Проверка..."
    checkingEl.style.display = "none";

    // Показываем сообщение об ошибке
    displayError('Не удалось проверить ответ. Попробуйте позже.');

    // Показываем эталонный ответ даже при ошибке
    referenceSectionEl.style.display = "block";

    setTimeout(() => {
      renderMath();
      renderMarkdown();
    }, 0);
  }
}

/**
 * Отображение результата проверки (оценка + фидбек)
 */
function displayResult(score, feedback) {
  const resultSectionEl = document.getElementById("interviewModeResult");
  const scoreEl = document.getElementById("interviewModeScore");
  const feedbackEl = document.getElementById("interviewModeFeedback");

  if (!resultSectionEl || !scoreEl || !feedbackEl) return;

  // Устанавливаем оценку
  scoreEl.textContent = score;

  // Устанавливаем класс цвета в зависимости от оценки
  scoreEl.className = 'interview-mode__score-value';
  if (score >= 8) {
    scoreEl.classList.add('interview-mode__score-value--high');
  } else if (score >= 5) {
    scoreEl.classList.add('interview-mode__score-value--medium');
  } else {
    scoreEl.classList.add('interview-mode__score-value--low');
  }

  // Устанавливаем фидбек
  feedbackEl.textContent = feedback;

  // Показываем блок результата
  resultSectionEl.style.display = "flex"; // Важно: flex, чтобы gap работал!

  // Обновляем статистику
  totalScore += score; // Суммируем оценки
  answeredQuestionsCount++; // Увеличиваем счетчик отвеченных вопросов

  console.log(`Статистика: отвечено вопросов = ${answeredQuestionsCount - 1}, сумма оценок = ${totalScore}, средняя оценка = ${(totalScore / (answeredQuestionsCount - 1)).toFixed(2)}`);
}

/**
 * Отображение ошибки
 */
function displayError(message) {
  const resultSectionEl = document.getElementById("interviewModeResult");
  const scoreEl = document.getElementById("interviewModeScore");
  const feedbackEl = document.getElementById("interviewModeFeedback");

  if (!resultSectionEl || !scoreEl || !feedbackEl) return;

  // Устанавливаем оценку 0 при ошибке
  scoreEl.textContent = '0';
  scoreEl.className = 'interview-mode__score-value interview-mode__score-value--zero'; // Белый цвет для 0

  // Показываем сообщение об ошибке
  feedbackEl.textContent = message;

  // Показываем блок результата
  resultSectionEl.style.display = "flex"; // Важно: flex, чтобы gap работал!

  // Обновляем статистику (даже при ошибке)
  totalScore += 0; // Добавляем 0 к сумме оценок
  answeredQuestionsCount++; // Увеличиваем счетчик отвеченных вопросов

  console.log(`Статистика (ошибка): отвечено вопросов = ${answeredQuestionsCount - 1}, сумма оценок = ${totalScore}, средняя оценка = ${(totalScore / (answeredQuestionsCount - 1)).toFixed(2)}`);
}

/**
 * Рендеринг математических формул
 */
function renderMath() {
  if (typeof renderMathInElement !== "function") return;

  const cardContainer = document.querySelector(".interview-mode__card");
  if (!cardContainer) return;

  // Рендерим формулы в вопросе
  const questionEl = document.getElementById("interviewModeQuestion");
  if (questionEl) {
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

  // Рендерим формулы в эталонном ответе (если он отображается)
  const referenceSectionEl = document.getElementById("interviewModeReference");
  const referenceContentEl = document.getElementById("interviewModeReferenceContent");
  if (referenceSectionEl && referenceSectionEl.style.display !== "none" && referenceContentEl) {
    const hasRenderedMath = referenceContentEl.querySelector(".katex");
    if (!hasRenderedMath) {
      renderMathInElement(referenceContentEl, {
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
    const cardContainer = document.querySelector(".interview-mode__card");
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
