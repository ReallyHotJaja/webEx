// ====== API ======
const API_BASE = "https://edu.std-900.ist.mospolytech.ru/labs/api";
const API_KEY = "9734a12c-b83c-4964-8c12-4738587b1f9f";

// ====== DOM ======
const menuEl = document.getElementById("menu");
const priceEl = document.getElementById("price");
const checkoutPanel = document.getElementById("checkout-panel");

// фильтры
const catChecks = document.querySelectorAll(".cat-check");
const priceFromEl = document.getElementById("price-from");
const priceToEl = document.getElementById("price-to");
const applyFiltersBtn = document.getElementById("apply-filters");

// данные блюд
let dishes = [];

// ====== notify (если есть на странице) ======
function showNotify(message) {
  const notify = document.getElementById("notify");
  const text = document.getElementById("notify-text");
  const ok = document.getElementById("notify-ok");

  // если notify блока нет — просто в консоль
  if (!notify || !text || !ok) {
    console.log("NOTIFY:", message);
    return;
  }

  text.textContent = message;
  notify.classList.remove("hidden");

  const close = () => {
    notify.classList.add("hidden");
    ok.removeEventListener("click", close);
  };

  ok.addEventListener("click", close);
}

// ====== CART (localStorage) ======
// храним так: { "12": 2, "25": 1 }
function getCart() {
  return JSON.parse(localStorage.getItem("cart") || "{}");
}

function saveCart(cartObj) {
  localStorage.setItem("cart", JSON.stringify(cartObj));
}

function addToCart(dishId) {
  const cart = getCart();
  const key = String(dishId);

  cart[key] = (cart[key] || 0) + 1;

  saveCart(cart);
  updateTotalPrice();
  showNotify("✅ Добавлено в заказ");
}

function calcTotalPrice() {
  const cart = getCart();
  let total = 0;

  for (const [id, count] of Object.entries(cart)) {
    const dish = dishes.find((d) => String(d.id) === String(id));
    if (dish) total += dish.price * count;
  }

  return total;
}

function updateTotalPrice() {
  const total = calcTotalPrice();
  if (priceEl) priceEl.textContent = total;

  if (checkoutPanel) {
    checkoutPanel.style.display = total > 0 ? "block" : "none";
  }
}

// ====== FILTERS ======
function getSelectedCategories() {
  // если выбраны все галочки — показываем всё
  const selected = [];
  catChecks.forEach((cb) => {
    if (cb.checked) selected.push(cb.value);
  });
  return selected;
}

function getPriceRange() {
  const from =
    priceFromEl && priceFromEl.value !== "" ? Number(priceFromEl.value) : null;
  const to =
    priceToEl && priceToEl.value !== "" ? Number(priceToEl.value) : null;
  return { from, to };
}

function applyFilters() {
  const selectedCats = getSelectedCategories();
  const { from, to } = getPriceRange();

  const filtered = dishes.filter((dish) => {
    // категория
    const okCat =
      selectedCats.length === 0 ? true : selectedCats.includes(dish.category);

    // цена
    let okPrice = true;
    if (from !== null && dish.price < from) okPrice = false;
    if (to !== null && dish.price > to) okPrice = false;

    return okCat && okPrice;
  });

  renderMenu(filtered);
}

// ====== MENU RENDER ======
function createDishCard(dish) {
  const card = document.createElement("div");
  card.className = "card";

  card.innerHTML = `
    <img src="${dish.image}" alt="${dish.name}">
    <h3>${dish.name}</h3>
    <p>${dish.price} ₽</p>
    <button type="button">Добавить</button>
  `;

  const btn = card.querySelector("button");
  btn.addEventListener("click", () => addToCart(dish.id));

  return card;
}

function renderMenu(list) {
  menuEl.innerHTML = "";

  // чтобы твой CSS "cards-row" продолжал работать
  const row = document.createElement("div");
  row.className = "cards-row";

  if (!list.length) {
    row.innerHTML = `<p style="opacity:.7;font-size:16px;margin:10px 0;">Ничего не найдено по фильтрам</p>`;
  } else {
    list.forEach((dish) => row.append(createDishCard(dish)));
  }

  menuEl.append(row);
}

// ====== LOAD DISHES ======
async function loadDishes() {
  try {
    const res = await fetch(`${API_BASE}/dishes?api_key=${API_KEY}`);
    if (!res.ok) throw new Error("Ошибка загрузки блюд");

    dishes = await res.json();
    dishes.sort((a, b) => a.name.localeCompare(b.name, "ru"));

    // рисуем всё
    renderMenu(dishes);

    // считаем цену из localStorage
    updateTotalPrice();
  } catch (err) {
    console.error(err);
    showNotify("❌ Не удалось загрузить блюда с сервера");
  }
}

// ====== EVENTS ======
if (applyFiltersBtn) {
  applyFiltersBtn.addEventListener("click", () => {
    applyFilters();
  });
}

// по желанию можно сразу фильтровать при клике на чекбокс
catChecks.forEach((cb) => {
  cb.addEventListener("change", () => {
    applyFilters();
  });
});

// ====== START ======
loadDishes();
