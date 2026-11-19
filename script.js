// Общий каталог загружается из catalog-data.js на каждой странице.
// Это сохраняет корзину при переходах между разделами и товарами.
const products = window.TECHSTORE_PRODUCTS;
const byId = new Map(products.map(product => [product.id, product]));
const rootPath = document.body.dataset.root || '';
const view = document.body.dataset.view;
const cards = [...document.querySelectorAll('.product-card')];
const categoryButtons = [...document.querySelectorAll('.category-list button')];
const requestedCategory = new URLSearchParams(location.search).get('category');
let category = categoryButtons.some(button => button.dataset.category === requestedCategory) ? requestedCategory : 'all';
const search = document.getElementById('search');
const sort = document.getElementById('sort');
const dialog = document.getElementById('cart-dialog');
const toast = document.getElementById('toast');
const money = value => new Intl.NumberFormat('ru-RU', {
  style: 'currency', currency: 'RUB', maximumFractionDigits: 0,
}).format(value);
const pluralProducts = count => {
  if (count % 100 >= 11 && count % 100 <= 14) return 'товаров';
  if (count % 10 === 1) return 'товар';
  return count % 10 >= 2 && count % 10 <= 4 ? 'товара' : 'товаров';
};
let saved = {};
try { saved = JSON.parse(localStorage.getItem('techstore-v1')) || {}; } catch { /* Пустое или повреждённое хранилище. */ }
const favorites = new Set(Array.isArray(saved.favorites)
  ? saved.favorites.filter(id => byId.has(id)) : []);
const cart = new Map();
if (Array.isArray(saved.cart)) {
  for (const item of saved.cart) {
    if (Array.isArray(item) && byId.has(item[0]) && Number.isInteger(item[1]) && item[1] > 0) cart.set(item[0], Math.min(item[1], 99));
  }
}
function save() {
  try { localStorage.setItem('techstore-v1', JSON.stringify({ favorites: [...favorites], cart: [...cart] })); }
  catch { /* Без localStorage состояние доступно до закрытия страницы. */ }
}
let toastTimer;
function notify(message) {
  clearTimeout(toastTimer);
  toast.textContent = message;
  toast.classList.add('visible');
  toastTimer = setTimeout(() => toast.classList.remove('visible'), 2500);
}
function renderFavorites() {
  document.getElementById('favorite-count').textContent = favorites.size;
  for (const button of document.querySelectorAll('[data-favorite]')) {
    const product = byId.get(button.dataset.favorite);
    const selected = favorites.has(product.id);
    button.setAttribute('aria-pressed', String(selected));
    button.setAttribute('aria-label', `${selected ? 'Убрать из избранного' : 'В избранное'}: ${product.name}`);
    button.firstElementChild.textContent = selected ? '♥' : '♡';
    if (button.classList.contains('detail-favorite')) button.lastElementChild.textContent = selected ? 'В избранном' : 'В избранное';
  }
}
function renderCatalog() {
  if (!search) return;
  const query = search.value.trim().toLocaleLowerCase('ru');
  const budget = document.getElementById('price-limit');
  const maxPrice = budget && budget.value !== 'all' ? Number(budget.value) : Infinity;
  const ordered = [...cards];
  if (sort.value === 'price-asc') ordered.sort((a, b) => Number(a.dataset.price) - Number(b.dataset.price));
  if (sort.value === 'price-desc') ordered.sort((a, b) => Number(b.dataset.price) - Number(a.dataset.price));
  if (sort.value === 'name') ordered.sort((a, b) => byId.get(a.dataset.id).name.localeCompare(byId.get(b.dataset.id).name, 'ru'));
  let visible = 0;
  const grid = document.querySelector('.product-grid');
  for (const card of ordered) {
    const product = byId.get(card.dataset.id);
    card.hidden = (category !== 'all' && product.category !== category)
      || (view === 'favorites' && !favorites.has(product.id))
      || product.price > maxPrice
      || !`${product.name} ${product.description}`.toLocaleLowerCase('ru').includes(query);
    if (!card.hidden) visible += 1;
    grid.append(card);
  }
  categoryButtons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.category === category)));
  document.getElementById('product-count').textContent = `${visible} ${pluralProducts(visible)}`;
  const empty = document.getElementById('empty-state');
  empty.hidden = visible > 0;
  if (view === 'favorites' && !query && favorites.size === 0) {
    empty.querySelector('h2').textContent = 'Здесь будет твоя любимая техника';
    empty.querySelector('p').textContent = 'Нажми на сердечко у товара, чтобы сохранить его здесь.';
    document.getElementById('reset-filters').hidden = true;
  } else {
    empty.querySelector('h2').textContent = 'Пока ничего не нашлось';
    empty.querySelector('p').textContent = 'Попробуй другое название, увеличь бюджет или сбрось фильтры.';
    document.getElementById('reset-filters').hidden = false;
  }
}
// Создание DOM через textContent: названия никогда не исполняются как HTML.
function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}
function renderCart() {
  const container = document.getElementById('cart-items');
  container.replaceChildren();
  let total = 0;
  let quantity = 0;
  for (const [id, amount] of cart) {
    const product = byId.get(id);
    total += product.price * amount;
    quantity += amount;
    const row = element('article', 'cart-item');
    const img = element('img');
    img.src = rootPath + product.image; img.alt = product.name; img.width = 80; img.height = 90;
    const info = element('div');
    const title = element('h3');
    const link = element('a', '', product.name); link.href = rootPath + product.url;
    title.append(link);
    const controls = element('div', 'cart-item-controls');
    const stepper = element('div', 'quantity');
    for (const [action, label, symbol, disabled] of [
      ['decrease', 'Уменьшить количество', '−', amount === 1],
      ['increase', 'Увеличить количество', '+', amount === 99],
    ]) {
      if (action === 'increase') stepper.append(element('span', '', String(amount)));
      const button = element('button', '', symbol);
      button.type = 'button'; button.dataset[action] = id; button.disabled = disabled;
      button.setAttribute('aria-label', `${label}: ${product.name}`); stepper.append(button);
    }
    const remove = element('button', 'remove-item', 'Удалить');
    remove.type = 'button'; remove.dataset.remove = id;
    remove.setAttribute('aria-label', `Удалить ${product.name} из корзины`);
    controls.append(stepper, remove);
    info.append(title, element('p', '', money(product.price * amount)), controls);
    row.append(img, info); container.append(row);
  }
  document.getElementById('cart-count').textContent = quantity;
  document.getElementById('cart-total').textContent = money(total);
  document.getElementById('cart-empty').hidden = cart.size > 0;
  document.getElementById('cart-summary').hidden = cart.size === 0;
}
if (search) {
  const params = new URLSearchParams(location.search);
  search.value = params.get('q') || '';
  const budget = document.getElementById('price-limit');
  if (budget && [...budget.options].some(option => option.value === params.get('budget'))) budget.value = params.get('budget');
  if ([...sort.options].some(option => option.value === params.get('sort'))) sort.value = params.get('sort');
  const update = () => {
    renderCatalog();
    const url = new URL(location.href);
    category === 'all' ? url.searchParams.delete('category') : url.searchParams.set('category', category);
    search.value ? url.searchParams.set('q', search.value) : url.searchParams.delete('q');
    sort.value === 'default' ? url.searchParams.delete('sort') : url.searchParams.set('sort', sort.value);
    if (budget && budget.value !== 'all') url.searchParams.set('budget', budget.value);
    else url.searchParams.delete('budget');
    history.replaceState(null, '', url);
  };
  categoryButtons.forEach(button => button.addEventListener('click', () => { category = button.dataset.category; update(); }));
  search.addEventListener('input', update);
  sort.addEventListener('change', update);
  if (budget) budget.addEventListener('change', update);
  document.querySelectorAll('[data-reset-catalog]').forEach(button => button.addEventListener('click', () => {
    search.value = ''; sort.value = 'default'; category = 'all';
    if (budget) budget.value = 'all';
    update();
  }));
  document.getElementById('reset-filters').addEventListener('click', () => {
    search.value = ''; sort.value = 'default'; category = 'all';
    if (budget) budget.value = 'all';
    update(); search.focus();
  });
}
document.addEventListener('click', event => {
  const favorite = event.target.closest('[data-favorite]');
  const add = event.target.closest('[data-add]');
  if (favorite) {
    const id = favorite.dataset.favorite;
    favorites.has(id) ? favorites.delete(id) : favorites.add(id);
    save(); renderFavorites(); renderCatalog();
    if (favorite.closest('[hidden]')) document.getElementById('favorites-toggle').focus();
    else favorite.focus({ preventScroll: true });
  }
  if (add) {
    const id = add.dataset.add;
    const amount = cart.get(id) || 0;
    if (amount === 99) { notify('В корзине уже 99 экземпляров этого товара.'); return; }
    cart.set(id, amount + 1); save(); renderCart();
    notify(`${byId.get(id).name} — добавлен в корзину`);
  }
});
document.querySelectorAll('[data-open-cart]').forEach(button => button.addEventListener('click', () => dialog.showModal()));
document.getElementById('cart-open').addEventListener('click', () => dialog.showModal());
document.getElementById('cart-close').addEventListener('click', () => dialog.close());
document.getElementById('continue-shopping').addEventListener('click', () => {
  dialog.close(); location.href = rootPath + 'index.html#catalog';
});
dialog.addEventListener('click', event => {
  if (event.target === dialog && event.clientX < dialog.getBoundingClientRect().left) dialog.close();
});
document.getElementById('cart-items').addEventListener('click', event => {
  const button = event.target.closest('button');
  if (!button) return;
  const id = button.dataset.increase || button.dataset.decrease || button.dataset.remove;
  if (!cart.has(id)) return;
  if (button.dataset.increase) cart.set(id, Math.min(99, cart.get(id) + 1));
  else if (button.dataset.decrease) cart.set(id, Math.max(1, cart.get(id) - 1));
  else cart.delete(id);
  const action = button.dataset.increase ? 'increase' : button.dataset.decrease ? 'decrease' : 'remove';
  save(); renderCart();
  const next = document.querySelector(`[data-${action}="${id}"]:not(:disabled)`)
    || document.querySelector(`[data-remove="${id}"]`)
    || document.querySelector('#cart-items button:not(:disabled)')
    || document.getElementById('continue-shopping');
  next.focus();
});
// При возврате кнопкой «Назад» синхронизируем восстановленную страницу.
window.addEventListener('pageshow', event => { if (event.persisted) location.reload(); });
renderFavorites(); renderCatalog(); renderCart();
