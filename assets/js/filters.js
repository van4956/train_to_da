// assets/js/filters.js
// Фильтры каталога: тема + уровень
// Ожидает, что в index.html есть:
// <select id="topicFilter"> ... </select>
// <select id="levelFilter"> ... </select>

const FILTERS = {
    topic: "all",
    level: "all",
    search: "",
  };

  /**
   * Инициализация фильтров:
   * - заполняет список тем
   * - инициализирует кастомные dropdown
   * - вешает обработчики change
   * - вызывает callback при изменении
   *
   * @param {Object} opts
   * @param {(filters: {topic: string, level: string, search: string}) => void} opts.onChange
   */
  function initFilters({ onChange }) {
    const topicSelect = document.getElementById("topicFilter");
    const levelSelect = document.getElementById("levelFilter");
    const searchInput = document.getElementById("searchInput");

    if (!topicSelect || !levelSelect) {
      console.warn("Не найдены элементы topicFilter/levelFilter");
      return;
    }

    // заполняем темы из meta.topics (если есть) или из cards
    const topics = getTopics();
    fillTopicOptions(topicSelect, topics);

    // выставляем дефолты
    topicSelect.value = FILTERS.topic;
    levelSelect.value = FILTERS.level;
    if (searchInput) {
      searchInput.value = FILTERS.search;
    }

    // инициализируем кастомные dropdown
    initCustomDropdown("topicFilter", topicSelect, onChange);
    initCustomDropdown("levelFilter", levelSelect, onChange);

    // handlers для поиска
    if (searchInput) {
      searchInput.addEventListener("input", () => {
        FILTERS.search = searchInput.value;
        onChange?.(getCurrentFilters());
      });
    }
  }

  /**
   * Инициализация кастомного dropdown
   * @param {string} selectId - ID оригинального select
   * @param {HTMLSelectElement} selectEl - элемент select
   * @param {Function} onChange - callback при изменении
   */
  function initCustomDropdown(selectId, selectEl, onChange) {
    const dropdownWrapper = document.querySelector(`.custom-dropdown[data-select-id="${selectId}"]`);
    if (!dropdownWrapper) return;

    const button = dropdownWrapper.querySelector(".custom-dropdown__button");
    const selectedText = dropdownWrapper.querySelector(".custom-dropdown__selected");
    const list = dropdownWrapper.querySelector(".custom-dropdown__list");

    // Если это dropdown тем, заполняем список из select
    if (selectId === "topicFilter" || selectId === "cardsTopicFilter" || selectId === "blitzTopicFilter" || selectId === "interviewTopicFilter") {
      const options = Array.from(selectEl.options);
      list.innerHTML = "";
      options.forEach(option => {
        const li = document.createElement("li");
        li.className = "custom-dropdown__item";
        li.setAttribute("role", "option");
        li.setAttribute("data-value", option.value);
        li.textContent = option.textContent;
        list.appendChild(li);
      });
    }

    // Обновляем отображаемый текст
    function updateSelectedText() {
      const selectedOption = selectEl.options[selectEl.selectedIndex];
      if (selectedText) {
        selectedText.textContent = selectedOption ? selectedOption.textContent : "";
      }

      // Обновляем классы selected (получаем элементы динамически)
      const allItems = list.querySelectorAll(".custom-dropdown__item");
      allItems.forEach(item => {
        const value = item.getAttribute("data-value");
        if (value === selectEl.value) {
          item.classList.add("custom-dropdown__item--selected");
        } else {
          item.classList.remove("custom-dropdown__item--selected");
        }
      });
    }

    // Обработчик клика по кнопке
    button.addEventListener("click", (e) => {
      e.stopPropagation();
      const isOpen = dropdownWrapper.classList.contains("custom-dropdown--open");

      // Закрываем все другие dropdown
      document.querySelectorAll(".custom-dropdown").forEach(dd => {
        if (dd !== dropdownWrapper) {
          dd.classList.remove("custom-dropdown--open");
        }
      });

      dropdownWrapper.classList.toggle("custom-dropdown--open", !isOpen);
    });

    // Обработчики клика по элементам списка (делегирование событий)
    list.addEventListener("click", (e) => {
      const item = e.target.closest(".custom-dropdown__item");
      if (!item) return;

      e.stopPropagation();
      const value = item.getAttribute("data-value");

      // Обновляем select
      selectEl.value = value;

      // Обновляем фильтр
      if (selectId === "topicFilter") {
        FILTERS.topic = value;
      } else if (selectId === "levelFilter") {
        FILTERS.level = value;
      }
      // cardsTopicFilter не обновляет FILTERS, так как это отдельный режим

      // Обновляем UI
      updateSelectedText();

      // Закрываем dropdown
      dropdownWrapper.classList.remove("custom-dropdown--open");

      // Вызываем callback
      onChange?.(getCurrentFilters());
    });

    // Закрытие при клике вне dropdown
    document.addEventListener("click", (e) => {
      if (!dropdownWrapper.contains(e.target)) {
        dropdownWrapper.classList.remove("custom-dropdown--open");
      }
    });

    // Закрытие при нажатии Escape
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && dropdownWrapper.classList.contains("custom-dropdown--open")) {
        dropdownWrapper.classList.remove("custom-dropdown--open");
      }
    });

    // Инициализация начального состояния
    updateSelectedText();
  }

  function getCurrentFilters() {
    return { ...FILTERS };
  }

  /**
   * Возвращает массив тем.
   * Приоритет: meta.topics (из data.json) → уникальные темы из cards
   */
  function getTopics() {
    const meta = (typeof getMeta === "function") ? getMeta() : {};
    const topicsFromMeta = Array.isArray(meta.topics) ? meta.topics : [];

    if (topicsFromMeta.length > 0) return topicsFromMeta;

    const cards = (typeof getCards === "function") ? getCards() : [];
    const uniq = new Set();
    for (const c of cards) {
      if (c.topic) uniq.add(c.topic);
    }
    return Array.from(uniq).sort((a, b) => a.localeCompare(b, "ru"));
  }

  function fillTopicOptions(selectEl, topics) {
    // оставляем первый option ("Все темы"), остальные пересоздаём
    const first = selectEl.querySelector('option[value="all"]');
    selectEl.innerHTML = "";
    if (first) selectEl.appendChild(first);
    else {
      const optAll = document.createElement("option");
      optAll.value = "all";
      optAll.textContent = "Все темы";
      selectEl.appendChild(optAll);
    }

    for (const t of topics) {
      const opt = document.createElement("option");
      opt.value = t;
      opt.textContent = t;
      selectEl.appendChild(opt);
    }
  }

  /**
   * Применяет фильтры к списку карточек.
   * @param {Array} cards
   * @param {{topic?: string, level?: string, search?: string}} filters
   */
  function applyFilters(cards, filters = FILTERS) {
    let filtered = cards.filter((c) => {
      const okTopic = filters.topic === "all" || c.topic === filters.topic;
      const okLevel = filters.level === "all" || c.level === filters.level;
      return okTopic && okLevel;
    });

    // Применяем поиск к уже отфильтрованным карточкам
    if (filters.search && filters.search.trim()) {
      const searchLower = filters.search.trim().toLowerCase();
      filtered = filtered.filter((c) => {
        const questionMatch = c.question && c.question.toLowerCase().includes(searchLower);
        const answerMatch = c.answer && c.answer.toLowerCase().includes(searchLower);
        return questionMatch || answerMatch;
      });
    }

    return filtered;
  }
