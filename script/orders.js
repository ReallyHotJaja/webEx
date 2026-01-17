// === Конфигурация API ===
const API_BASE = "https://edu.std-900.ist.mospolytech.ru/labs/api";
const API_KEY = "9734a12c-b83c-4964-8c12-4738587b1f9f";

// === Таблица ===
const tbody = document.getElementById("orders-body");

// === Notify ===
function showNotify(message) {
  const notify = document.getElementById("notify");
  const text = document.getElementById("notify-text");
  const ok = document.getElementById("notify-ok");

  text.textContent = message;
  notify.classList.remove("hidden");

  const close = () => {
    notify.classList.add("hidden");
    ok.removeEventListener("click", close);
  };

  ok.addEventListener("click", close);
}

// === Модалки (новые) ===
const viewModal = document.getElementById("view-modal");
const viewClose = document.getElementById("view-close");
const viewOk = document.getElementById("view-ok");
const viewContent = document.getElementById("view-content");

const editModal = document.getElementById("edit-modal");
const editClose = document.getElementById("edit-close");
const editCancel = document.getElementById("edit-cancel");
const editForm = document.getElementById("edit-form");

const deleteModal = document.getElementById("delete-modal");
const deleteClose = document.getElementById("delete-close");
const deleteCancel = document.getElementById("delete-cancel");
const deleteConfirm = document.getElementById("delete-confirm");

// === Состояния ===
let currentEditId = null;
let currentDeleteId = null;

// === Закрытие модалок ===
function closeViewModal() {
  viewModal.classList.add("hidden");
}
function closeEditModal() {
  editModal.classList.add("hidden");
  currentEditId = null;
}
function closeDeleteModal() {
  deleteModal.classList.add("hidden");
  currentDeleteId = null;
}

viewClose.addEventListener("click", closeViewModal);
viewOk.addEventListener("click", closeViewModal);

editClose.addEventListener("click", closeEditModal);
editCancel.addEventListener("click", closeEditModal);

deleteClose.addEventListener("click", closeDeleteModal);
deleteCancel.addEventListener("click", closeDeleteModal);

// Закрытие по клику на фон (как notify)
[viewModal, editModal, deleteModal].forEach((m) => {
  m.addEventListener("click", (e) => {
    if (e.target === m) m.classList.add("hidden");
  });
});

// === Кэш блюд (чтоб не долбить API много раз) ===
const dishCache = new Map();

async function getDishById(id) {
  if (!id) return null;

  if (dishCache.has(id)) return dishCache.get(id);

  try {
    const res = await fetch(`${API_BASE}/dishes/${id}?api_key=${API_KEY}`);
    if (!res.ok) return null;
    const dish = await res.json();
    dishCache.set(id, dish);
    return dish;
  } catch {
    return null;
  }
}

// === Вытаскиваем блюда из заказа (API комбо-формат) ===
function getDishIdsFromOrder(order) {
  return [
    order.soup_id,
    order.main_course_id,
    order.salad_id,
    order.dessert_id,
    order.drink_id,
  ].filter(Boolean);
}

// === Формат даты ===
function formatDate(dateStr) {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleString("ru-RU");
}

// === Формат доставки ===
function formatDelivery(order) {
  if (order.delivery_type === "now") {
    return "Как можно скорее (07:00–23:00)";
  }
  return order.delivery_time || "-";
}

// === Загрузка заказов ===
async function loadOrders() {
  try {
    const res = await fetch(`${API_BASE}/orders?api_key=${API_KEY}`);
    const orders = await res.json();

    if (!res.ok) throw new Error(orders?.error || "Ошибка загрузки заказов");

    orders.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    renderOrders(orders);
  } catch (err) {
    console.error(err);
    showNotify("❌ Ошибка загрузки заказов: " + err.message);
  }
}

// === Отрисовка таблицы ===
async function renderOrders(orders) {
  tbody.innerHTML = "";

  if (!orders.length) {
    tbody.innerHTML = `<tr><td colspan="6">Пока нет заказов</td></tr>`;
    return;
  }

  for (let i = 0; i < orders.length; i++) {
    const order = orders[i];

    const ids = getDishIdsFromOrder(order);

    const dishNames = [];
    let total = 0;

    for (let dishId of ids) {
      const dish = await getDishById(dishId);
      if (dish) {
        dishNames.push(dish.name);
        total += Number(dish.price) || 0;
      }
    }

    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${i + 1}</td>
      <td>${formatDate(order.created_at)}</td>
      <td>${dishNames.length ? dishNames.join(", ") : "—"}</td>
      <td>${total ? total + " ₽" : "—"}</td>
      <td>${formatDelivery(order)}</td>
      <td>
        <i class="bi bi-eye" title="Подробнее" data-id="${
          order.id
        }" data-action="view"></i>
        <i class="bi bi-pencil" title="Редактировать" data-id="${
          order.id
        }" data-action="edit"></i>
        <i class="bi bi-trash" title="Удалить" data-id="${
          order.id
        }" data-action="delete"></i>
      </td>
    `;

    tbody.appendChild(row);
  }
}

// === Клики по действиям ===
tbody.addEventListener("click", (e) => {
  const icon = e.target.closest("i");
  if (!icon) return;

  const id = icon.dataset.id;
  const action = icon.dataset.action;

  if (action === "view") viewOrder(id);
  if (action === "edit") openEditModal(id);
  if (action === "delete") openDeleteModal(id);
});

// === Просмотр заказа ===
async function viewOrder(id) {
  try {
    const res = await fetch(`${API_BASE}/orders/${id}?api_key=${API_KEY}`);
    const order = await res.json();

    if (!res.ok) throw new Error(order?.error || "Ошибка загрузки заказа");

    const ids = getDishIdsFromOrder(order);

    let total = 0;
    const items = [];

    for (let dishId of ids) {
      const dish = await getDishById(dishId);
      if (dish) {
        items.push(`<li>${dish.name} — ${dish.price} ₽</li>`);
        total += Number(dish.price) || 0;
      }
    }

    viewContent.innerHTML = `
      <p><b>Дата оформления:</b> ${formatDate(order.created_at)}</p>
      <p><b>Имя:</b> ${order.full_name || "-"}</p>
      <p><b>Email:</b> ${order.email || "-"}</p>
      <p><b>Телефон:</b> ${order.phone || "-"}</p>
      <p><b>Адрес:</b> ${order.delivery_address || "-"}</p>
      <p><b>Доставка:</b> ${formatDelivery(order)}</p>
      <p><b>Комментарий:</b> ${order.comment || "-"}</p>

      <hr>

      <p><b>Состав заказа:</b></p>
      <ul>
        ${items.length ? items.join("") : "<li>—</li>"}
      </ul>

      <p><b>Стоимость:</b> ${total} ₽</p>
    `;

    viewModal.classList.remove("hidden");
  } catch (err) {
    console.error(err);
    showNotify("❌ Ошибка просмотра: " + err.message);
  }
}

// === Открыть редактирование ===
async function openEditModal(id) {
  try {
    const res = await fetch(`${API_BASE}/orders/${id}?api_key=${API_KEY}`);
    const order = await res.json();

    if (!res.ok) throw new Error(order?.error || "Ошибка загрузки заказа");

    currentEditId = id;

    editForm.full_name.value = order.full_name || "";
    editForm.email.value = order.email || "";
    editForm.phone.value = order.phone || "";
    editForm.delivery_address.value = order.delivery_address || "";
    editForm.delivery_type.value = order.delivery_type || "now";
    editForm.delivery_time.value = order.delivery_time || "";
    editForm.comment.value = order.comment || "";

    editModal.classList.remove("hidden");
  } catch (err) {
    console.error(err);
    showNotify("❌ Ошибка открытия редактирования: " + err.message);
  }
}

// === Сохранить редактирование ===
editForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  if (!currentEditId) return;

  const data = {
    full_name: editForm.full_name.value.trim(),
    email: editForm.email.value.trim(),
    phone: editForm.phone.value.trim(),
    delivery_address: editForm.delivery_address.value.trim(),
    delivery_type: editForm.delivery_type.value,
    delivery_time: editForm.delivery_time.value.trim(),
    comment: editForm.comment.value.trim(),
  };

  // если now — убираем delivery_time
  if (data.delivery_type === "now") {
    delete data.delivery_time;
  }

  try {
    const res = await fetch(
      `${API_BASE}/orders/${currentEditId}?api_key=${API_KEY}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      },
    );

    const result = await res.json();

    if (!res.ok) throw new Error(result?.error || "Ошибка сохранения");

    showNotify("✅ Заказ успешно изменён!");
    closeEditModal();
    loadOrders();
  } catch (err) {
    console.error(err);
    showNotify("❌ Ошибка изменения: " + err.message);
  }
});

// === Открыть удаление ===
function openDeleteModal(id) {
  currentDeleteId = id;
  deleteModal.classList.remove("hidden");
}

// === Подтвердить удаление ===
deleteConfirm.addEventListener("click", async () => {
  if (!currentDeleteId) return;

  try {
    const res = await fetch(
      `${API_BASE}/orders/${currentDeleteId}?api_key=${API_KEY}`,
      {
        method: "DELETE",
      },
    );

    const result = await res.json();

    if (!res.ok) throw new Error(result?.error || "Ошибка удаления");

    showNotify("✅ Заказ удалён!");
    closeDeleteModal();
    loadOrders();
  } catch (err) {
    console.error(err);
    showNotify("❌ Ошибка удаления: " + err.message);
  }
});

// === Запуск ===
loadOrders();
