// Progressive enhancement: статические карточки и страницы работают без этого файла.
(() => {
  const panel = document.createElement('dialog');
  panel.className = 'quick-dialog';
  panel.setAttribute('aria-labelledby', 'quick-title');
  document.body.append(panel);
  let opener;
  function openQuickView(id, button) {
    const product = byId.get(id);
    if (!product) return;
    opener = button;
    panel.replaceChildren();
    const close = element('button', 'close-button quick-close', '×');
    close.type = 'button'; close.setAttribute('aria-label', 'Закрыть быстрый просмотр');
    close.addEventListener('click', () => panel.close());
    const layout = element('div', 'quick-layout');
    const stage = element('div', 'quick-stage');
    const image = element('img');
    image.src = rootPath + `assets/large/product-${id}.webp`; image.alt = product.name;
    image.width = 500; image.height = 500;
    stage.append(element('span', 'eyebrow', product.label), image);
    const info = element('div', 'quick-info');
    const title = element('h2', '', product.name); title.id = 'quick-title';
    const list = element('dl', 'card-specs');
    for (const [name, value] of product.specs) {
      const row = element('div'); row.append(element('dt', '', name), element('dd', '', value)); list.append(row);
    }
    const actions = element('div', 'detail-actions');
    const add = element('button', 'primary-button', 'Добавить в корзину +');
    add.type = 'button'; add.dataset.add = id; add.dataset.action = 'add-to-cart';
    const favorite = element('button', 'detail-favorite');
    favorite.type = 'button'; favorite.dataset.favorite = id;
    favorite.append(element('span', '', '♡'), element('span', '', 'В избранное'));
    actions.append(add, favorite);
    const link = element('a', 'text-link', 'Полная страница товара ↗'); link.href = rootPath + product.url;
    const feedback = element('p', 'quick-feedback'); feedback.setAttribute('role', 'status');
    add.addEventListener('click', () => { feedback.textContent = (cart.get(id) || 0) >= 99 ? 'В корзине уже 99 экземпляров этого товара.' : 'Корзина обновлена. Товар доступен в общей корзине магазина.'; });
    info.append(element('p', 'eyebrow', 'TECHSTORE / БЫСТРЫЙ ПРОСМОТР'), title,
      element('p', 'quick-description', product.details), list,
      element('p', 'detail-price', money(product.price)), actions, feedback, link);
    layout.append(stage, info); panel.append(close, layout);
    renderFavorites(); panel.showModal(); close.focus();
  }
  document.addEventListener('click', event => {
    const button = event.target.closest('[data-quick-view]');
    if (button) openQuickView(button.dataset.quickView, button);
  });
  panel.addEventListener('click', event => {
    const rect = panel.getBoundingClientRect();
    if (event.target === panel && (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom)) panel.close();
  });
  panel.addEventListener('close', () => {
    if (opener?.isConnected && !opener.closest('[hidden]')) opener.focus({ preventScroll: true });
    else document.getElementById('favorites-toggle').focus();
  });

  // Только крупные витрины, только точный указатель. Никаких постоянных animation loops.
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const pointer = matchMedia('(hover: hover) and (pointer: fine)');
  document.querySelectorAll('[data-depth]').forEach(stage => {
    let rect, frame = 0, point;
    const reset = () => {
      cancelAnimationFrame(frame); frame = 0;
      stage.style.removeProperty('--tilt-x'); stage.style.removeProperty('--tilt-y');
    };
    stage.addEventListener('pointerenter', () => { rect = stage.getBoundingClientRect(); });
    stage.addEventListener('pointermove', event => {
      if (motion.matches || !pointer.matches || event.pointerType !== 'mouse') return;
      point = { x: event.clientX, y: event.clientY };
      if (frame || !rect) return;
      frame = requestAnimationFrame(() => {
        stage.style.setProperty('--tilt-x', `${Math.max(-3, Math.min(3, (0.5 - (point.y - rect.top) / rect.height) * 6))}deg`);
        stage.style.setProperty('--tilt-y', `${Math.max(-3, Math.min(3, ((point.x - rect.left) / rect.width - 0.5) * 6))}deg`);
        frame = 0;
      });
    });
    stage.addEventListener('pointerleave', reset);
    motion.addEventListener('change', reset);
    pointer.addEventListener('change', reset);
    window.addEventListener('blur', reset);
  });
  // Однократное появление только витрины. Контент никогда не скрывается в ожидании JS.
  if ('IntersectionObserver' in window && !motion.matches) {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) { entry.target.classList.add('showcase-entered'); observer.unobserve(entry.target); }
      });
    }, { threshold: 0.12 });
    document.querySelectorAll('.showcase').forEach(section => observer.observe(section));
  }
})();
