// assets/js/data.js

let DATA = null;

/**
 * Загружает data.json и сохраняет в памяти
 */
async function loadData() {
  if (DATA !== null) {
    return DATA;
  }

  const response = await fetch("data.json");
  if (!response.ok) {
    throw new Error("Не удалось загрузить data.json");
  }

  DATA = await response.json();
  return DATA;
}

/**
 * Удобный доступ к карточкам
 */
function getCards() {
  if (!DATA) return [];
  return DATA.cards || [];
}

/**
 * Удобный доступ к мета-информации
 */
function getMeta() {
  if (!DATA) return {};
  return DATA.meta || {};
}
