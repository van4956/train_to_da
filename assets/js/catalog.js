// assets/js/catalog.js

document.addEventListener("DOMContentLoaded", async () => {
    try {
      await loadData();
      initFilters({
        onChange: () => renderCatalog(),
      });
      // initGlassToggle(); // ОТКЛЮЧЕНО: режим стекла деактивирован
      document.body.classList.add("no-glass"); // Устанавливаем режим без стекла по умолчанию
      renderCatalog();
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

    // Загружаем сохранённое состояние из localStorage
    const savedState = localStorage.getItem("glassmorphismEnabled");
    const isEnabled = savedState === null ? true : savedState === "true";

    // Применяем начальное состояние
    if (!isEnabled) {
      document.body.classList.add("no-glass");
    }

    // Обработчик клика
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

  function renderMath() {
    if (typeof renderMathInElement !== "function") return;

    // Рендерим формулы только внутри контейнера каталога, чтобы избежать дублирования
    const catalogContainer = document.querySelector(".catalog");
    if (!catalogContainer) return;

    // Находим все элементы с формулами, которые еще не были обработаны KaTeX
    // KaTeX заменяет текст с разделителями на элементы с классом "katex"
    // Поэтому ищем только те элементы, которые содержат текст с разделителями, но еще не содержат .katex
    const cardsWithMath = catalogContainer.querySelectorAll(".card");

    cardsWithMath.forEach(card => {
      // Проверяем, есть ли уже отрендеренные формулы в этой карточке
      const hasRenderedMath = card.querySelector(".katex");
      if (hasRenderedMath) {
        // Если формулы уже отрендерены, пропускаем эту карточку
        return;
      }

      // Рендерим формулы только в этой карточке
      renderMathInElement(card, {
        delimiters: [
          { left: "$$", right: "$$", display: true },
          { left: "$", right: "$", display: false }
        ],
        throwOnError: false
      });
    });
  }

  function renderMarkdown() {
    if (typeof hljs !== "undefined") {
      // Ищем все блоки кода внутри каталога
      const container = document.querySelector(".catalog");
      if (container) {
        container.querySelectorAll("pre code").forEach(block => {
          // Проверяем, что блок еще не подсвечен
          if (!block.classList.contains("hljs")) {
            hljs.highlightElement(block);
          }
        });
      }
    }
  }

  function renderCatalog() {
    const container = document.querySelector(".catalog");
    const emptyResults = document.getElementById("emptyResults");
    if (!container) return;

    const cards = applyFilters(getCards());

    // Очищаем контейнер перед добавлением новых карточек
    // Это гарантирует, что старые отрендеренные формулы будут удалены
    container.innerHTML = "";

    // Показываем сообщение "Ничего не найдено", если результатов нет
    if (cards.length === 0) {
      if (emptyResults) {
        emptyResults.style.display = "block";
      }
    } else {
      if (emptyResults) {
        emptyResults.style.display = "none";
      }

      cards.forEach(card => {
        const cardEl = createCardElement(card);
        container.appendChild(cardEl);
      });
    }

    updateStats(cards);
    // Рендерим формулы только после того, как все карточки добавлены в DOM
    // Используем небольшую задержку, чтобы убедиться, что DOM обновлен
    setTimeout(() => {
      renderMath();
      renderMarkdown();
    }, 0);
  }

  /**
   * Преобразует технический уровень в человеко-читаемый формат
   * @param {string} level - технический уровень (lvl_1, lvl_2, lvl_3)
   * @returns {string} - человеко-читаемый уровень (Easy, Medium, Hard)
   */
  function formatLevel(level) {
    if (!level) return "—";

    const levelMap = {
      "lvl_1": "Easy",
      "lvl_2": "Medium",
      "lvl_3": "Hard"
    };

    return levelMap[level] || level;
  }

  function createCardElement(card) {
    const article = document.createElement("article");
    article.className = "card";

    article.innerHTML = `
      <div class="card__meta">
        <span class="card__topic">${card.topic ?? "—"}</span>
        <span class="card__level">${formatLevel(card.level)}</span>
        <span class="card__id">#${String(card.id).padStart(3, "0")}</span>
      </div>

      <div class="card__question">
        ${marked.parse(card.question)}
      </div>

      <div class="card__answer card__answer--hidden">
        ${marked.parse(card.answer)}
      </div>

      <button class="card__toggle">
        Показать ответ
      </button>
    `;

    const toggleBtn = article.querySelector(".card__toggle");
    const answerEl = article.querySelector(".card__answer");

    toggleBtn.addEventListener("click", () => {
      answerEl.classList.toggle("card__answer--hidden");

      toggleBtn.textContent = answerEl.classList.contains("card__answer--hidden")
        ? "Показать ответ"
        : "Скрыть ответ";
    });

    return article;
  }

  function updateStats(cards) {
    const statsCountActiveEl = document.getElementById("statsCountActive");
    const statsCountTotalEl = document.getElementById("statsCountTotal");
    const lvl1El = document.getElementById("lvl1Count");
    const lvl2El = document.getElementById("lvl2Count");
    const lvl3El = document.getElementById("lvl3Count");

    if (!statsCountActiveEl || !statsCountTotalEl) return;

    // Получаем общее количество карточек в базе
    const allCards = getCards();
    const totalInBase = allCards.length;
    const filteredCount = cards.length;

    // Обновляем "X" и "из Y карточек" раздельно
    statsCountActiveEl.textContent = filteredCount;
    statsCountTotalEl.textContent = `из ${totalInBase} карточек`;

    // Обновляем счётчики по уровням (только среди отфильтрованных)
    if (lvl1El) lvl1El.textContent = cards.filter(c => c.level === "lvl_1").length;
    if (lvl2El) lvl2El.textContent = cards.filter(c => c.level === "lvl_2").length;
    if (lvl3El) lvl3El.textContent = cards.filter(c => c.level === "lvl_3").length;
  }

  /**
   * Минимальная защита от HTML-инъекций
   */
  function escapeHTML(str) {
    return str
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;");
  }
