// assets/js/interview.js
// Режим «Интервью» — формулирование письменного ответа и сравнение с эталоном

let currentCard = null;
let availableCards = [];

// Счетчики для статистики интервью
let answeredQuestionsCount = 1; // Начинается с 1, увеличивается после каждого "Отправить"
let totalScore = 0; // Сумма всех оценок для расчета средней

// Состояние интервью
let isInterviewFinished = false; // Флаг завершения интервью
let actualAnsweredCount = 0; // Фактическое количество отвеченных вопросов (с полученной оценкой)

document.addEventListener("DOMContentLoaded", async () => {
  try {
    await loadData();
    initInterviewMode();
  } catch (err) {
    console.error(err);
  }
});

/**
 * Инициализация режима интервью
 */
function initInterviewMode() {
  initTopicFilter();
  loadRandomCard();
  setupButtons();
  updateFinishButtonVisibility(); // Скрываем кнопку по умолчанию
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
    : allCards.filter(card => {
        // Поддержка как массива тем, так и строки (для обратной совместимости)
        return Array.isArray(card.topic)
          ? card.topic.includes(selectedTopic)
          : card.topic === selectedTopic;
      });

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
  const resultSectionEl = document.getElementById("interviewModeResult");
  const textareaEl = document.getElementById("interviewModeTextarea");
  const submitButton = document.getElementById("interviewModeSubmit");
  const checkingEl = document.getElementById("interviewModeChecking");

  if (!questionLabelEl || !questionEl || !resultSectionEl || !textareaEl || !submitButton || !checkingEl) return;

  // Обновляем заголовок с номером вопроса
  questionLabelEl.textContent = `ВОПРОС ${answeredQuestionsCount}`;

  // Рендерим вопрос через marked
  questionEl.innerHTML = marked.parse(currentCard.question);

  // Сбрасываем состояние (но только если интервью не завершено)
  if (!isInterviewFinished) {
    textareaEl.value = "";
    textareaEl.disabled = false;
    submitButton.disabled = false;
    submitButton.textContent = "Отправить";
  }

  // Скрываем результат и состояние проверки
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
  const textareaEl = document.getElementById("interviewModeTextarea");
  const submitButton = document.getElementById("interviewModeSubmit");

  if (questionEl) questionEl.innerHTML = "<p>Нет карточек для выбранной темы</p>";
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
  const finishButton = document.getElementById("interviewModeFinish");

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

  // Кнопка "Завершить интервью" / "Новое интервью"
  if (finishButton) {
    finishButton.addEventListener("click", () => {
      handleFinishInterview();
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

  if (!textareaEl || !submitButton || !checkingEl || !resultSectionEl) return;

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
  actualAnsweredCount++; // Увеличиваем фактический счётчик отвеченных вопросов
  answeredQuestionsCount++; // Увеличиваем счетчик для следующего вопроса

  // Обновляем видимость кнопки "Завершить интервью"
  updateFinishButtonVisibility();

  console.log(`✅ displayResult: actualAnsweredCount = ${actualAnsweredCount} (увеличился), totalScore = ${totalScore}, средняя = ${(totalScore / actualAnsweredCount).toFixed(1)}`);
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
  actualAnsweredCount++; // Увеличиваем фактический счётчик (даже при ошибке, т.к. пользователь отправил ответ)
  answeredQuestionsCount++; // Увеличиваем счетчик отвеченных вопросов

  // Обновляем видимость кнопки "Завершить интервью"
  updateFinishButtonVisibility();

  console.log(`⚠️ displayError: actualAnsweredCount = ${actualAnsweredCount} (увеличился), totalScore = ${totalScore}, средняя = ${(totalScore / actualAnsweredCount).toFixed(1)}`);
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

/**
 * Обработка нажатия на кнопку "Завершить интервью" / "Новое интервью"
 */
function handleFinishInterview() {
  const finishButton = document.getElementById("interviewModeFinish");
  if (!finishButton) return;

  if (isInterviewFinished) {
    // Если интервью уже завершено, начинаем новое
    startNewInterview();
  } else {
    // Завершаем текущее интервью
    finishInterview();
  }
}

/**
 * Завершение интервью
 */
function finishInterview() {
  const submitButton = document.getElementById("interviewModeSubmit");
  const nextButton = document.getElementById("interviewModeNext");
  const finishButton = document.getElementById("interviewModeFinish");
  const scoreEl = document.getElementById("interviewModeScore");
  const feedbackEl = document.getElementById("interviewModeFeedback");
  const resultSectionEl = document.getElementById("interviewModeResult");

  if (!submitButton || !nextButton || !finishButton || !scoreEl || !feedbackEl || !resultSectionEl) return;

  // Вычисляем среднюю оценку
  const averageScore = actualAnsweredCount > 0 ? totalScore / actualAnsweredCount : 0;
  const roundedScore = averageScore.toFixed(1); // Для отображения в интерфейсе (с одним десятичным знаком)
  const floorScore = Math.floor(averageScore); // Для текста вердикта (округление вниз до целого)

  // Формируем вердикт
  let verdict = "";

  console.log(`DEBUG: actualAnsweredCount = ${actualAnsweredCount}, averageScore = ${averageScore}, roundedScore = ${roundedScore}, floorScore = ${floorScore}`);

  if (actualAnsweredCount < 5) {
    verdict = `Вы ответили на ${actualAnsweredCount} ${getQuestionWord(actualAnsweredCount)}. Вы не прошли интервью. Нужно ответить на минимум 5 вопросов.`;
  } else {
    if (averageScore >= 0 && averageScore < 5) {
      verdict = `Вы ответили на ${actualAnsweredCount} ${getQuestionWord(actualAnsweredCount)}. Спасибо за интервью! Ваша оценка ${floorScore}. Вы не прошли.`;
    } else if (averageScore >= 5 && averageScore < 7) {
      verdict = `Вы ответили на ${actualAnsweredCount} ${getQuestionWord(actualAnsweredCount)}. Спасибо за интервью! Ваша оценка ${floorScore}, не плохо. Мы вам перезвоним.`;
    } else if (averageScore >= 7 && averageScore < 9) {
      verdict = `Вы ответили на ${actualAnsweredCount} ${getQuestionWord(actualAnsweredCount)}. Спасибо за интервью. Ваша оценка ${floorScore}, это впечатляет. Очень хорошо!`;
    } else { // >= 9
      verdict = `Вы ответили на ${actualAnsweredCount} ${getQuestionWord(actualAnsweredCount)}. Спасибо за интервью. Ваша оценка ${floorScore}, это отличный результат. Поздравляем, вы прошли интервью!`;
    }
  }

  // Обновляем оценку на среднюю
  scoreEl.textContent = roundedScore;

  // Обновляем цвет оценки
  scoreEl.className = 'interview-mode__score-value';
  if (roundedScore === '0.0') {
    scoreEl.classList.add('interview-mode__score-value--zero'); // Белый цвет для 0.0
  } else if (averageScore >= 8) {
    scoreEl.classList.add('interview-mode__score-value--high');
  } else if (averageScore >= 5) {
    scoreEl.classList.add('interview-mode__score-value--medium');
  } else {
    scoreEl.classList.add('interview-mode__score-value--low');
  }

  // Обновляем фидбек
  feedbackEl.textContent = verdict;

  // Показываем блок результата (если скрыт)
  resultSectionEl.style.display = "flex";

  // Блокируем кнопки
  submitButton.disabled = true;
  nextButton.disabled = true;

  // Меняем кнопку "Завершить интервью" на "Новое интервью"
  finishButton.textContent = "Новое интервью";

  // Устанавливаем флаг завершения
  isInterviewFinished = true;

  console.log(`Интервью завершено. Отвечено ${actualAnsweredCount} вопросов. Средняя оценка: ${roundedScore}`);
}

/**
 * Начало нового интервью
 */
function startNewInterview() {
  const submitButton = document.getElementById("interviewModeSubmit");
  const nextButton = document.getElementById("interviewModeNext");
  const finishButton = document.getElementById("interviewModeFinish");
  const resultSectionEl = document.getElementById("interviewModeResult");
  const textareaEl = document.getElementById("interviewModeTextarea");

  if (!submitButton || !nextButton || !finishButton || !resultSectionEl || !textareaEl) return;

  // Сбрасываем счётчики и статистику
  answeredQuestionsCount = 1;
  totalScore = 0;
  actualAnsweredCount = 0;
  isInterviewFinished = false;

  // Разблокируем кнопки
  submitButton.disabled = false;
  nextButton.disabled = false;

  // Меняем кнопку обратно на "Завершить интервью"
  finishButton.textContent = "Завершить интервью";

  // Скрываем блок результата
  resultSectionEl.style.display = "none";

  // Очищаем textarea
  textareaEl.value = "";
  textareaEl.disabled = false;

  // Обновляем видимость кнопки "Завершить интервью" (скрываем, т.к. actualAnsweredCount = 0)
  updateFinishButtonVisibility();

  // Загружаем новый вопрос
  loadRandomCard();

  console.log("Начато новое интервью");
}

/**
 * Обновление видимости кнопки "Завершить интервью"
 * Кнопка показывается только если ответов >= 5 (или если интервью уже завершено)
 */
function updateFinishButtonVisibility() {
  const finishButton = document.getElementById("interviewModeFinish");
  if (!finishButton) return;

  // Если интервью завершено, кнопка всегда видима (она стала "Новое интервью")
  // Иначе показываем только если отвечено 5 или более вопросов
  if (isInterviewFinished || actualAnsweredCount >= 5) {
    finishButton.style.display = "";
  } else {
    finishButton.style.display = "none";
  }
}

/**
 * Вспомогательная функция для склонения слова "вопрос"
 */
function getQuestionWord(count) {
  const cases = [2, 0, 1, 1, 1, 2];
  const titles = ["вопрос", "вопроса", "вопросов"];
  return titles[
    count % 100 > 4 && count % 100 < 20
      ? 2
      : cases[count % 10 < 5 ? count % 10 : 5]
  ];
}
