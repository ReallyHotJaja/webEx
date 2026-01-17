// ====== API ======
const API_BASE = "https://edu.std-900.ist.mospolytech.ru/labs/api";
const API_KEY = "9734a12c-b83c-4964-8c12-4738587b1f9f";

let dishes = [];

// ====== notify ======
function showNotify(message) {
  const notify = document.getElementById("notify");
  const text = document.getElementById("notify-text");
  const ok = document.getElementById("notify-ok");

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

// ====== CART ======
// cart = { "12": 1, "55": 1 }
function getCart() {
  return JSON.parse(localStorage.getItem("cart") || "{}");
}

function saveCart(cartObj) {
  localStorage.setItem("cart", JSON.stringify(cartObj));
}

function isCartEmpty(cartObj) {
  return Object.keys(cartObj).length === 0;
}

// ====== LOAD DISHES ======
async function loadDishes() {
  try {
    const res = await fetch(`${API_BASE}/dishes?api_key=${API_KEY}`);
    if (!res.ok) throw new Error("Ошибка загрузки блюд");

    dishes = await res.json();
    dishes.sort((a, b) => a.name.localeCompare(b.name, "ru"));

    renderOrder();
  } catch (err) {
    console.error(err);
    showNotify("❌ Ошибка загрузки блюд: " + err.message);
  }
}

// ====== TOTAL PRICE ======
function calcTotal(cartObj) {
  let total = 0;

  for (const id of Object.keys(cartObj)) {
    const dish = dishes.find((d) => String(d.id) === String(id));
    if (!dish) continue;
    total += dish.price;
  }

  return total;
}

function updateTotalUI(total) {
  const priceEl = document.getElementById("price");
  if (priceEl) priceEl.textContent = total;
}

// ====== RENDER ORDER LIST ======
function renderOrder() {
  const orderList = document.getElementById("order-list");
  const cart = getCart();

  orderList.innerHTML = "";

  if (isCartEmpty(cart)) {
    orderList.innerHTML = `Ничего не выбрано. <a href="index.html">Собрать ланч</a>`;
    updateTotalUI(0);
    return;
  }

  for (const id of Object.keys(cart)) {
    const dish = dishes.find((d) => String(d.id) === String(id));
    if (!dish) continue;

    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `
      <img src="${dish.image}" alt="${dish.name}">
      <h3>${dish.name}</h3>
      <p>${dish.price} ₽</p>
      <button type="button" class="remove-btn" data-id="${dish.id}">Удалить</button>
    `;

    orderList.append(card);
  }

  updateTotalUI(calcTotal(cart));

  // удалить из корзины
  orderList.querySelectorAll(".remove-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = String(btn.dataset.id);
      const cartNow = getCart();

      delete cartNow[id];
      saveCart(cartNow);

      renderOrder();
    });
  });
}

// ====== Сбор комбо id по категориям (для API) ======
function buildComboIdsFromCart(cartObj) {
  const combo = {
    soup_id: null,
    main_course_id: null,
    salad_id: null,
    drink_id: null,
    dessert_id: null,
  };

  for (const id of Object.keys(cartObj)) {
    const dish = dishes.find((d) => String(d.id) === String(id));
    if (!dish) continue;

    if (dish.category === "soup" && !combo.soup_id) combo.soup_id = dish.id;
    if (dish.category === "main-course" && !combo.main_course_id)
      combo.main_course_id = dish.id;
    if (dish.category === "salad" && !combo.salad_id) combo.salad_id = dish.id;
    if (dish.category === "drink" && !combo.drink_id) combo.drink_id = dish.id;
    if (dish.category === "dessert" && !combo.dessert_id)
      combo.dessert_id = dish.id;
  }

  return combo;
}

// ====== SEND ORDER ======
document.getElementById("order-form").addEventListener("submit", async (e) => {
  e.preventDefault();

  const cart = getCart();
  if (isCartEmpty(cart)) {
    showNotify("❌ Корзина пуста. Добавьте блюда перед оформлением заказа.");
    return;
  }

  const comboIds = buildComboIdsFromCart(cart);

  // API требует напиток + комбо проверку
  if (!comboIds.drink_id) {
    showNotify("❌ Для оформления заказа обязательно добавьте НАПИТОК.");
    return;
  }

  const total = calcTotal(cart);

  const itemsText = Object.keys(cart)
    .map((id) => {
      const dish = dishes.find((d) => String(d.id) === String(id));
      return dish ? dish.name : null;
    })
    .filter(Boolean)
    .join(", ");

  const subscribeEl = document.getElementById("subscribe");

  const data = {
    full_name: e.target.username.value,
    phone: e.target.phone.value,
    email: e.target.email.value,
    delivery_address: e.target.address.value,
    delivery_type: "now",
    subscribe: subscribeEl ? Number(subscribeEl.checked) : 0,
    comment: `${e.target.comment?.value || ""}\nСостав: ${itemsText}\nИтого: ${total} ₽`,
    ...comboIds,
  };

  try {
    const res = await fetch(`${API_BASE}/orders?api_key=${API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    const result = await res.json();

    if (!res.ok) {
      throw new Error(result.error || "Ошибка оформления заказа");
    }

    showNotify("✅ Заказ успешно оформлен!");
    localStorage.removeItem("cart");

    setTimeout(() => {
      window.location.href = "orders.html";
    }, 1500);
  } catch (err) {
    console.error(err);
    showNotify("❌ Не удалось оформить заказ: " + err.message);
  }
});

// ====== START ======
loadDishes();
