// assets/js/catalog.js

document.addEventListener("DOMContentLoaded", async () => {
    try {
      await loadData();
      renderCatalog();
    } catch (err) {
      console.error(err);
    }
  });

  function renderMath() {
    if (typeof renderMathInElement !== "function") return;

    renderMathInElement(document.body, {
      delimiters: [
        { left: "$$", right: "$$", display: true },
        { left: "$", right: "$", display: false }
      ],
      throwOnError: false
    });
  }

  function renderMarkdown() {
    if (typeof hljs !== "undefined") {
      document.querySelectorAll("pre code").forEach(block => {
        hljs.highlightElement(block);
      });
    }
  }

  function renderCatalog() {
    const container = document.querySelector(".catalog");
    if (!container) return;

    const cards = getCards();

    container.innerHTML = "";

    cards.forEach(card => {
      const cardEl = createCardElement(card);
      container.appendChild(cardEl);
    });

    updateStats(cards);
    renderMath();
    renderMarkdown();
  }

  function createCardElement(card) {
    const article = document.createElement("article");
    article.className = "card";

    article.innerHTML = `
      <div class="card__meta">
        <span class="card__topic">${card.topic ?? "—"}</span>
        <span class="card__level">${card.level ?? "—"}</span>
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
    const totalEl = document.getElementById("totalCards");
    const lvl1El = document.getElementById("lvl1Count");
    const lvl2El = document.getElementById("lvl2Count");
    const lvl3El = document.getElementById("lvl3Count");

    if (!totalEl) return;

    totalEl.textContent = cards.length;
    lvl1El.textContent = cards.filter(c => c.level === "lvl_1").length;
    lvl2El.textContent = cards.filter(c => c.level === "lvl_2").length;
    lvl3El.textContent = cards.filter(c => c.level === "lvl_3").length;
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
