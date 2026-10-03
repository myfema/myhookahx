const C = window.CATALOG;
const CART_KEY = 'mirror.cart';
const BRAND = window.SITE?.brand ?? 'Hookah X Catalog';
const CITY = window.SITE?.city ?? '';
const CUR = window.SITE?.currency ?? { code: 'THB', symbol: '฿' };
const TG = window.SITE?.telegram ?? { user: '@namethere', link: 'https://t.me/namethere' };
const PARTNER_NOTE = window.SITE?.partnerNote ?? '';

const byId = new Map(C.products.map((p) => [p.id, p]));
const catBySlug = new Map(C.categories.map((c) => [c.slug, c]));
const productsByBrand = new Map();
for (const p of C.products) {
  if (p.manufacturer) {
    const arr = productsByBrand.get(p.manufacturer) || [];
    arr.push(p);
    productsByBrand.set(p.manufacturer, arr);
  }
}
const tobaccoBrands = new Set(
  C.products.filter((p) => p.category?.slug === 'tobacco' && p.manufacturer).map((p) => p.manufacturer),
);

const money = (n) =>
  `${new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(n)} ${CUR.symbol}`;

const cart = {
  read() {
    try { return JSON.parse(localStorage.getItem(CART_KEY)) ?? {}; }
    catch { return {}; }
  },
  write(v) { localStorage.setItem(CART_KEY, JSON.stringify(v)); },
  get() {
    const raw = this.read();
    const items = Object.entries(raw)
      .map(([id, qty]) => ({ p: byId.get(+id), qty }))
      .filter((x) => x.p && x.qty > 0);
    const count = items.reduce((s, x) => s + x.qty, 0);
    const sum = items.reduce((s, x) => s + x.p.price * x.qty, 0);
    return { items, count, sum };
  },
  add(id, qty = 1) { const r = this.read(); r[id] = (r[id] ?? 0) + qty; this.write(r); },
  set(id, qty) { const r = this.read(); if (qty <= 0) delete r[id]; else r[id] = qty; this.write(r); },
  clear() { this.write({}); },
};

const esc = (s) => String(s ?? '').replace(/[&<>\"]/g, c => ({ '&': '&', '<': '<', '>': '>', '"': '"' })[c]).replace(/'/g, '&apos;');
const toast = (msg) => {
  let el = document.querySelector('.toast');
  if (!el) {
    el = document.createElement('div');
    el.className = 'toast';
    Object.assign(el.style, { position: 'fixed', left: '50%', bottom: '28px', transform: 'translateX(-50%)', background: '#4ade80', color: '#06210f', padding: '12px 22px', borderRadius: '10px', fontWeight: '700', fontSize: '14px', zIndex: '999', boxShadow: '0 8px 28px rgba(0,0,0,.45)' });
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.style.opacity = '1';
  clearTimeout(el._t);
  el._t = setTimeout(() => { el.style.transition = 'opacity .3s'; el.style.opacity = '0'; }, 1600);
};

function headerHTML() {
  const { count } = cart.get();
  const page = document.body.dataset.page;
  return `
  <header class="header">
    <div class="wrap header__in">
      <a class="logo" href="index.html">
        <img class="logo__img" src="assets/logo1.png" alt="${esc(BRAND)}" onload="this.nextElementSibling.style.display='none'" onerror="this.style.display='none'">
        <span class="logo__mark">H</span>
        <span>${esc(BRAND)}<small>${esc(CITY)}</small></span>
      </a>
      <nav class="nav">
        <a class="nav__link ${page === 'catalog' ? 'is-active' : ''}" href="index.html">Каталог</a>
        <a class="nav__link ${page === 'brands' ? 'is-active' : ''}" href="brands.html">Бренды</a>
      </nav>
      <div class="search">
        <svg class="search__icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"></circle><path d="m21 21-4.3-4.3"></path></svg>
        <input id="q" type="search" placeholder="Поиск по названию, бренду, линейке…" autocomplete="off">
      </div>
      <div class="header__right">
        <a class="telegram-link" href="${esc(TG.link)}" target="_blank" rel="noopener" aria-label="Telegram ${esc(TG.user)}">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M2.7 21.3 23 12 2.7 2.7l-.01 7.53L17 12 2.69 13.77z"/></svg>
          <span>${esc(TG.user)}</span>
        </a>
        <button class="cart-btn" data-nav="cart.html">
          <span>Корзина</span>
          <span class="cart-btn__count">${count}</span>
        </button>
      </div>
    </div>
  </header>`;
}

function footerHTML() {
  return `
  <footer class="footer">
    <div class="wrap footer__in">
      <div>${esc(BRAND)} ${CITY ? '— ' + esc(CITY) : ''} · каталог ${C.products.length} позиций · обновлено ${new Date(C.exportedAt).toLocaleDateString('ru-RU')}</div>
      ${PARTNER_NOTE ? `<div>${esc(PARTNER_NOTE)}</div>` : ''}
    </div>
  </footer>`;
}

function cardHTML(p, i = 0) {
  const out = p.availability !== 'in_stock';
  const hit = C.featured.includes(p.id);
  return `
  <article class="card" data-id="${p.id}" style="animation-delay:${Math.min(i, 12) * 35}ms">
    ${hit ? '<span class="badge-hit">Хит</span>' : ''}
    <img class="card__img" src="${esc(p.image)}" alt="${esc(p.name)}" loading="lazy">
    <div class="card__body">
      ${p.manufacturer ? `<div class="card__brand">${esc(p.manufacturer)}</div>` : ''}
      <h3 class="card__name">${esc(p.name)}</h3>
      <div class="card__meta">
        ${out ? '<span class="badge-out">нет в наличии</span>' : [p.line, p.strength ? `креп. ${p.strength}` : null, p.weight ? `${p.weight} г` : null].filter(Boolean).join(' · ')}
      </div>
      <div class="card__price"><b>${money(p.price)}</b></div>
      <div class="card__actions">
        <div class="qty qty--sm">
          <button data-dec aria-label="Меньше">&minus;</button><span>1</span><button data-inc aria-label="Больше">+</button>
        </div>
        <button class="btn btn--sm" data-add ${out ? 'disabled' : ''}>В корзину</button>
      </div>
    </div>
  </article>`;
}

function wireGlobal() {
  for (const b of document.querySelectorAll('[data-nav]')) {
    b.addEventListener('click', () => { location.href = b.dataset.nav; });
  }
  const q = document.getElementById('q');
  if (q) {
    let debounceTimer = null;
    q.addEventListener('input', () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => { window.__setQuery?.(q.value); }, 250);
    });
  }
}

/* ============================== CATALOG / BRAND PAGE ============================== */
const PER_PAGE = 24;

function getUrlState() {
  const params = new URLSearchParams(location.search);
  return {
    cat: params.get('cat') || null,
    brand: params.get('brand') || null,
    q: params.get('q') || '',
    sort: params.get('sort') || 'popular',
    page: Math.max(1, parseInt(params.get('page') || '1', 10)),
    gram: (() => { const g = Number(params.get('g')); return Number.isFinite(g) && g > 0 ? g : null; })(),
  };
}

function setUrlState(state, replace = false) {
  const params = new URLSearchParams();
  if (state.cat) params.set('cat', state.cat);
  if (state.brand) params.set('brand', state.brand);
  if (state.q) params.set('q', state.q);
  if (state.sort && state.sort !== 'popular') params.set('sort', state.sort);
  if (state.gram) params.set('g', String(state.gram));
  if (state.page > 1) params.set('page', String(state.page));
  const url = `${location.pathname}${params.toString() ? '?' + params.toString() : ''}`;
  if (replace) history.replaceState(null, '', url);
  else history.pushState(null, '', url);
}

function initListPage() {
  const isBrandPage = document.body.dataset.page === 'brand';
  const urlState = getUrlState();
  const brandFromUrl = isBrandPage ? urlState.brand : null;
  if (isBrandPage && !brandFromUrl) {
    location.replace('brands.html');
    return;
  }

  const catCounts = new Map();
  const brandCounts = new Map();
  for (const p of C.products) {
    const cs = p.category?.slug;
    if (cs) catCounts.set(cs, (catCounts.get(cs) ?? 0) + 1);
    if (p.manufacturer) brandCounts.set(p.manufacturer, (brandCounts.get(p.manufacturer) ?? 0) + 1);
  }
  const tobaccoBrandList = [...brandCounts.entries()].filter(([b]) => tobaccoBrands.has(b));

  const state = {
    cat: isBrandPage ? null : urlState.cat,
    brand: isBrandPage ? brandFromUrl : urlState.brand,
    q: urlState.q,
    sort: urlState.sort,
    page: urlState.page,
    gram: urlState.gram,
  };
  const brandProducts = isBrandPage && state.brand ? (productsByBrand.get(state.brand) || []) : [];

  if (isBrandPage && state.brand) {
    document.title = `${state.brand} — ${BRAND}`;
  }

  const topHeroEl = document.getElementById('hero');
  if (topHeroEl && !isBrandPage) {
    topHeroEl.innerHTML = `
      <section class="hero">
        <div class="hero__glow"></div>
        <h1 class="hero__title">${esc(BRAND)}</h1>
        <p class="hero__sub">Табак, чашки, уголь и аксессуары для кальяна — широкий выбор, честные цены, быстрая доставка</p>
        <div class="hero__stats">
          <div class="hero__stat"><b>${C.products.length}</b><span>позиций</span></div>
          <div class="hero__stat"><b>${tobaccoBrandList.length}</b><span>брендов</span></div>
          <div class="hero__stat"><b>${C.categories.length}</b><span>категорий</span></div>
        </div>
      </section>`;
  }

  const qInput = document.getElementById('q');
  if (qInput) qInput.value = state.q;

  const sidebar = document.getElementById('sidebar');
  if (sidebar && !isBrandPage) {
    sidebar.innerHTML = `
      <div class="side__group">
        <h4 class="side__title">Категории</h4>
        <button class="side__link ${!state.cat ? 'is-active' : ''}" data-cat="">
          <span>Все товары</span><span>${C.products.length}</span>
        </button>
        ${C.categories.map(c => `<button class="side__link" data-cat="${esc(c.slug)}"><span>${esc(c.name)}</span><span>${catCounts.get(c.slug) ?? 0}</span></button>`).join('')}
      </div>
      <div class="side__group">
        <h4 class="side__title">Бренды (${tobaccoBrandList.length})</h4>
        <div class="side__scroll">
          ${tobaccoBrandList.slice().sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([b, n]) => `<button class="side__link ${state.brand === b ? 'is-active' : ''}" data-brand="${esc(b)}"><span>${esc(b)}</span><span>${n}</span></button>`).join('')}
        </div>
        <button class="side__reset" id="reset">Сбросить фильтры</button>
      </div>`;
  } else if (sidebar && isBrandPage) {
    sidebar.innerHTML = `
      <div class="side__group">
        <h4 class="side__title">${esc(state.brand)}</h4>
        <button class="side__link is-active" disabled><span>Товары бренда</span><span>${brandProducts.length}</span></button>
        <a class="side__link" href="brands.html"><span>← Все бренды</span></a>
      </div>
      <div class="side__group">
        <h4 class="side__title">Категории в бренде</h4>
        <div class="side__scroll" id="brand-cats"></div>
      </div>`;
    const brandCatCounts = new Map();
    for (const p of brandProducts) {
      const cs = p.category?.slug;
      if (cs) brandCatCounts.set(cs, (brandCatCounts.get(cs) ?? 0) + 1);
    }
    const brandCatsEl = document.getElementById('brand-cats');
    if (brandCatsEl) {
      brandCatsEl.innerHTML = `<button class="side__link ${!state.cat ? 'is-active' : ''}" data-cat=""><span>Все</span><span>${brandProducts.length}</span></button>` +
        [...brandCatCounts.entries()].map(([slug, n]) => {
          const cat = C.categories.find(c => c.slug === slug);
          return `<button class="side__link ${state.cat === slug ? 'is-active' : ''}" data-cat="${esc(slug)}"><span>${esc(cat?.name || slug)}</span><span>${n}</span></button>`;
        }).join('');
    }
  }

  const toolbar = document.querySelector('.toolbar');
  if (sidebar && toolbar && !sidebar.querySelector('.side__close')) {
    const toggle = document.createElement('button');
    toggle.className = 'filters-toggle';
    toggle.type = 'button';
    toggle.innerHTML = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 6h16M7 12h10M10 18h4"></path></svg><span>Фильтры</span>';
    toggle.addEventListener('click', () => sidebar.classList.toggle('side--open'));
    toolbar.prepend(toggle);
    const closeBtn = document.createElement('button');
    closeBtn.className = 'side__close';
    closeBtn.type = 'button';
    closeBtn.setAttribute('aria-label', 'Закрыть фильтры');
    closeBtn.innerHTML = '&times;';
    closeBtn.addEventListener('click', () => sidebar.classList.remove('side--open'));
    sidebar.prepend(closeBtn);
  }

  const heroEl = document.getElementById('brand-hero');
  if (heroEl && isBrandPage && state.brand) {
    const bimg = brandProducts.find((p) => p.manufacturerImage) || null;
    const lines = [...new Set(brandProducts.map((p) => p.line).filter(Boolean))];
    heroEl.innerHTML = `
      <div class="brand-hero">
        ${bimg
          ? `<img class="brand-hero__img" src="${esc(bimg.manufacturerImage)}" alt="${esc(state.brand)}">`
          : `<div class="brand-hero__logo">${esc(state.brand.charAt(0))}</div>`}
        <div>
          <h1 class="brand-hero__name">${esc(state.brand)}</h1>
          <div class="brand-hero__meta">${brandProducts.length} позиций${lines.length ? ` · линейки: ${lines.map(esc).join(', ')}` : ''}</div>
        </div>
      </div>`;
  }

  const gramsEl = document.getElementById('grams');
  if (gramsEl && isBrandPage) {
    const gramCounts = new Map();
    for (const p of brandProducts) {
      if (p.weight > 0) gramCounts.set(p.weight, (gramCounts.get(p.weight) ?? 0) + 1);
    }
    gramsEl.innerHTML = gramCounts.size >= 2 ? `
      <div class="grams">
        <span class="grams__label">Граммовка</span>
        <button class="gram-chip ${state.gram ? '' : 'is-active'}" data-gram="">Все</button>
        ${[...gramCounts.keys()].sort((a, b) => a - b).map((g) => `
          <button class="gram-chip ${state.gram === g ? 'is-active' : ''}" data-gram="${g}">${g} г<span>${gramCounts.get(g)}</span></button>
        `).join('')}
      </div>` : '';
    gramsEl.addEventListener('click', (e) => {
      const chip = e.target.closest('.gram-chip');
      if (!chip) return;
      state.gram = chip.dataset.gram ? Number(chip.dataset.gram) : null;
      state.page = 1;
      syncGrams();
      render();
    });
  }

  const sortSel = document.getElementById('sort');
  if (sortSel) {
    sortSel.value = state.sort;
    sortSel.addEventListener('change', () => {
      state.sort = sortSel.value;
      state.page = 1;
      syncSidebar();
      render();
    });
  }

  function syncSidebar() {
    if (!isBrandPage) {
      for (const el of document.querySelectorAll('[data-cat]')) {
        el.classList.toggle('is-active', (el.dataset.cat || '') === (state.cat || ''));
      }
      for (const el of document.querySelectorAll('[data-brand]')) {
        el.classList.toggle('is-active', el.dataset.brand === state.brand);
      }
    } else {
      for (const el of document.querySelectorAll('[data-cat]')) {
        el.classList.toggle('is-active', (el.dataset.cat || '') === (state.cat || ''));
      }
    }
  }

  function syncGrams() {
    for (const el of document.querySelectorAll('.gram-chip')) {
      const g = el.dataset.gram ? Number(el.dataset.gram) : null;
      el.classList.toggle('is-active', g === state.gram);
    }
  }

  window.__setQuery = (v) => {
    state.q = v;
    state.page = 1;
    render();
  };

  function filtered() {
    const needle = state.q.trim().toLowerCase();
    let base = isBrandPage && state.brand ? brandProducts : C.products;

    return base.filter((p) => {
      if (!isBrandPage && state.cat && p.category?.slug !== state.cat) return false;
      if (!isBrandPage && state.brand && p.manufacturer !== state.brand) return false;
      if (isBrandPage && state.cat && p.category?.slug !== state.cat) return false;
      if (isBrandPage && state.gram && p.weight !== state.gram) return false;
      if (needle) {
        const hay = `${p.name} ${p.nameOriginal ?? ''} ${p.manufacturer ?? ''} ${p.line ?? ''}`.toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      return true;
    }).sort(sortFn(state.sort));
  }

  function sortFn(sort) {
    const by = {
      cheap: (a, b) => a.price - b.price,
      expensive: (a, b) => b.price - a.price,
      name: (a, b) => a.name.localeCompare(b.name, 'ru'),
      popular: (a, b) => C.featured.indexOf(a.id) - C.featured.indexOf(b.id) || a.name.localeCompare(b.name, 'ru'),
    };
    return by[sort] ?? by.popular;
  }

  function renderPagination(total, page) {
    const totalPages = Math.ceil(total / PER_PAGE);
    if (totalPages <= 1) return '';
    let html = '<nav class="pagination" aria-label="Пагинация"><ul>';
    const maxVisible = 5;
    let start = Math.max(1, page - Math.floor(maxVisible / 2));
    let end = Math.min(totalPages, start + maxVisible - 1);
    if (end - start + 1 < maxVisible) start = Math.max(1, end - maxVisible + 1);
    if (page > 1) html += `<li><button data-page="${page - 1}" aria-label="Назад">&laquo;</button></li>`;
    for (let i = start; i <= end; i++) {
      html += `<li><button data-page="${i}" class="${i === page ? 'is-active' : ''}">${i}</button></li>`;
    }
    if (page < totalPages) html += `<li><button data-page="${page + 1}" aria-label="Вперёд">&raquo;</button></li>`;
    html += '</ul></nav>';
    return html;
  }

  function render() {
    const list = filtered();
    const total = list.length;
    const totalPages = Math.ceil(total / PER_PAGE);
    if (state.page > totalPages) { state.page = totalPages || 1; }
    const start = (state.page - 1) * PER_PAGE;
    const pageItems = list.slice(start, start + PER_PAGE);

    document.getElementById('count').innerHTML = `Найдено <b>${total}</b> из ${isBrandPage && state.brand ? (productsByBrand.get(state.brand)?.length ?? 0) : C.products.length}`;

    const grid = document.getElementById('grid');
    grid.innerHTML = pageItems.length
      ? pageItems.map((p, i) => cardHTML(p, i)).join('')
      : `<div class="empty" style="grid-column:1/-1"><h2>Ничего не найдено</h2><p>Попробуйте изменить запрос или сбросить фильтры</p></div>`;

    for (const c of grid.querySelectorAll('.card')) {
      c.addEventListener('click', () => { location.href = `product.html?id=${c.dataset.id}`; });
      const actions = c.querySelector('.card__actions');
      if (!actions) continue;
      actions.addEventListener('click', (e) => e.stopPropagation());
      const qtySpan = actions.querySelector('.qty span');
      let qty = 1;
      actions.querySelector('[data-dec]')?.addEventListener('click', () => {
        qty = Math.max(1, qty - 1);
        qtySpan.textContent = qty;
      });
      actions.querySelector('[data-inc]')?.addEventListener('click', () => {
        qty += 1;
        qtySpan.textContent = qty;
      });
      actions.querySelector('[data-add]')?.addEventListener('click', () => {
        cart.add(+c.dataset.id, qty);
        toast('Добавлено в корзину');
        updateCartCount();
      });
    }

    const pagEl = document.getElementById('pagination');
    if (pagEl) {
      pagEl.innerHTML = renderPagination(total, state.page);
      for (const btn of pagEl.querySelectorAll('[data-page]')) {
        btn.addEventListener('click', () => {
          state.page = +btn.dataset.page;
          setUrlState(state);
          render();
          window.scrollTo({ top: 0, behavior: 'smooth' });
        });
      }
    }

    setUrlState(state, true);
  }

  if (sidebar && !isBrandPage) {
    sidebar.addEventListener('click', (e) => {
      const b = e.target.closest('[data-cat],[data-brand],#reset');
      if (!b) return;
      if (b.id === 'reset') {
        state.cat = state.brand = state.q = '';
        qInput.value = '';
      } else if (b.dataset.cat !== undefined) {
        state.cat = b.dataset.cat || null;
        state.brand = null;
      } else if (b.dataset.brand !== undefined) {
        location.href = `brand.html?brand=${encodeURIComponent(b.dataset.brand)}`;
        return;
      }
      state.page = 1;
      syncSidebar();
      render();
      if (window.innerWidth <= 860) sidebar.classList.remove('side--open');
    });
  } else if (sidebar && isBrandPage) {
    sidebar.addEventListener('click', (e) => {
      const b = e.target.closest('[data-cat]');
      if (!b) return;
      state.cat = b.dataset.cat || null;
      state.page = 1;
      syncSidebar();
      render();
      if (window.innerWidth <= 860) sidebar.classList.remove('side--open');
    });
  }

  render();
}

/* ============================== PRODUCT ============================== */
function initProduct() {
  const id = +new URLSearchParams(location.search).get('id');
  const p = byId.get(id);
  if (!p) {
    document.getElementById('app').innerHTML = `<div class="wrap"><div class="empty"><h2>Товар не найден</h2><p><a href="index.html">Вернуться в каталог</a></p></div></div>`;
    return;
  }
  const inStock = p.availability === 'in_stock';
  let qty = 1;
  const gal = p.images?.length ? p.images : [p.image];

  document.title = `${p.name} — ${BRAND}`;
  document.getElementById('app').innerHTML = `
  <div class="wrap">
    <div class="pdp">
      <div class="pdp__gallery">
        <img class="pdp__main" id="main" src="${esc(gal[0])}" alt="${esc(p.name)}">
        ${gal.length > 1 ? `<div class="pdp__thumbs">${gal.map((s, i) => `<img class="pdp__thumb ${i === 0 ? 'is-active' : ''}" src="${esc(s)}" data-src="${esc(s)}">`).join('')}</div>` : ''}
      </div>
      <div>
        <div class="crumbs" data-back>&larr; Каталог${p.category ? ` / <a class="crumbs__link" href="index.html?cat=${encodeURIComponent(p.category.slug)}">${esc(p.category.name)}</a>` : ''}${p.manufacturer ? ` / <a class="crumbs__link" href="brand.html?brand=${encodeURIComponent(p.manufacturer)}">${esc(p.manufacturer)}</a>` : ''}</div>
        ${p.manufacturer ? `<div class="pdp__brand">${esc(p.manufacturer)}${p.line ? ` · ${esc(p.line)}` : ''}</div>` : ''}
        <h1 class="pdp__name">${esc(p.name)}</h1>
        ${p.nameOriginal ? `<p class="pdp__orig">${esc(p.nameOriginal)}</p>` : ''}
        <div class="pdp__price">${money(p.price)}<i>${esc(CUR.code)}</i></div>

        <div class="specs">
          ${p.category ? `<div class="spec"><div class="spec__k">Категория</div><div class="spec__v">${esc(p.category.name)}</div></div>` : ''}
          ${p.manufacturer ? `<div class="spec"><div class="spec__k">Бренд</div><div class="spec__v">${esc(p.manufacturer)}</div></div>` : ''}
          ${p.line ? `<div class="spec"><div class="spec__k">Линейка</div><div class="spec__v">${esc(p.line)}</div></div>` : ''}
          ${p.strength ? `<div class="spec"><div class="spec__k">Крепость</div><div class="spec__v">${esc(p.strength)}/10</div></div>` : ''}
          ${p.weight ? `<div class="spec"><div class="spec__k">Вес</div><div class="spec__v">${esc(p.weight)} г</div></div>` : ''}
          ${p.quantity ? `<div class="spec"><div class="spec__k">Остаток</div><div class="spec__v">${esc(p.quantity)} шт</div></div>` : ''}
        </div>

        ${p.description ? `<p class="desc">${esc(p.description)}</p>` : ''}

        <div class="actions">
          <div class="qty"><button data-q="-1">&minus;</button><span id="pq">1</span><button data-q="1">+</button></div>
          <button class="btn" id="add" ${inStock ? '' : 'disabled'}>${inStock ? 'В корзину' : 'Нет в наличии'}</button>
        </div>
        <div class="stock ${inStock ? 'stock--in' : 'stock--out'}">${inStock ? '● В наличии' : '● Нет в наличии'}</div>
      </div>
    </div>
  </div>`;

  for (const t of document.querySelectorAll('.pdp__thumb')) {
    t.addEventListener('click', () => {
      document.getElementById('main').src = t.dataset.src;
      for (const o of document.querySelectorAll('.pdp__thumb')) o.classList.remove('is-active');
      t.classList.add('is-active');
    });
  }
  for (const b of document.querySelectorAll('[data-q]')) {
    b.addEventListener('click', () => {
      qty = Math.max(1, qty + Number(b.dataset.q));
      document.getElementById('pq').textContent = qty;
    });
  }
  document.getElementById('add')?.addEventListener('click', () => {
    cart.add(p.id, qty);
    toast('Добавлено в корзину');
    updateCartCount();
  });
  document.querySelector('[data-back]')?.addEventListener('click', (e) => {
    if (e.target.closest('a')) return;
    history.length > 1 ? history.back() : (location.href = 'index.html');
  });
}

/* ============================== CART ============================== */
function initCart() {
  function render() {
    const { items, count, sum } = cart.get();
    const el = document.getElementById('cart-body');
    if (!items.length) {
      el.innerHTML = `<div class="empty"><h2>Корзина пуста</h2><p><a href="index.html">Перейти в каталог</a></p></div>`;
      return;
    }
    el.innerHTML =
      items.map(({ p, qty }) => `
        <div class="cart__row">
          <img class="cart__img" src="${esc(p.image)}" alt="${esc(p.name)}">
          <div>
            <div class="cart__name">${esc(p.name)}</div>
            <div class="cart__brand">${[p.manufacturer, p.line].filter(Boolean).map(esc).join(' · ')}</div>
            <div class="qty" style="margin-top:10px;height:36px"><button data-dec="${p.id}">&minus;</button><span>${qty}</span><button data-inc="${p.id}">+</button></div>
          </div>
          <div class="cart__price">${money(p.price * qty)}</div>
          <button class="cart__del" data-del="${p.id}" title="Убрать">&times;</button>
        </div>`).join('') +
      `<div class="cart__total"><span>Итого ${esc(CUR.code)}</span><span>${money(sum)}</span></div>
       <div class="actions"><button class="btn" id="order">Оформить заказ</button><button class="btn btn--ghost" id="clear">Очистить</button></div>`;

    for (const b of el.querySelectorAll('[data-inc]')) b.addEventListener('click', () => { cart.add(+b.dataset.inc, 1); render(); updateCartCount(); });
    for (const b of el.querySelectorAll('[data-dec]')) b.addEventListener('click', () => { cart.set(+b.dataset.dec, cart.read()[b.dataset.dec] - 1); render(); updateCartCount(); });
    for (const b of el.querySelectorAll('[data-del]')) b.addEventListener('click', () => { cart.set(+b.dataset.del, 0); render(); updateCartCount(); });
    el.querySelector('#clear')?.addEventListener('click', () => { cart.clear(); render(); updateCartCount(); });
    el.querySelector('#order')?.addEventListener('click', () => {
      const { items, sum } = cart.get();
      let msg = `🛍 *Новый заказ из ${BRAND}*\n\n`;
      items.forEach(({ p, qty }, i) => {
        msg += `${i + 1}. *${p.name}*\n   ${p.manufacturer} · ${qty} шт · ${money(p.price * qty)}\n`;
      });
      msg += `\n💰 *Итого: ${money(sum)}*`;
      
      const url = `https://t.me/${TG.user.replace('@', '')}?text=${encodeURIComponent(msg)}`;
      window.open(url, '_blank');
      cart.clear();
      render();
      updateCartCount();
    });
  }
  render();
}

function updateCartCount() {
  const el = document.querySelector('.cart-btn__count');
  if (el) el.textContent = cart.get().count;
  const m = document.querySelector('.mnav__count');
  if (m) {
    const c = cart.get().count;
    m.textContent = c;
    m.style.display = c ? 'grid' : 'none';
  }
}

/* ============================== MOBILE NAV ============================== */
function initMobileNav() {
  const page = document.body.dataset.page;
  const mnav = document.createElement('nav');
  mnav.className = 'mnav';
  mnav.innerHTML = `
    <a class="mnav__link ${page === 'catalog' ? 'is-active' : ''}" href="index.html">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1.5"></rect><rect x="14" y="3" width="7" height="7" rx="1.5"></rect><rect x="3" y="14" width="7" height="7" rx="1.5"></rect><rect x="14" y="14" width="7" height="7" rx="1.5"></rect></svg>
      <span>Каталог</span>
    </a>
    <a class="mnav__link ${page === 'brand' || page === 'brands' ? 'is-active' : ''}" href="brands.html">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.59 13.41 11 3.83A2 2 0 0 0 9.59 3.24H4a1 1 0 0 0-1 1v5.59c0 .53.21 1.04.59 1.41l9.58 9.59a2 2 0 0 0 2.83 0l4.59-4.59a2 2 0 0 0 0-2.83z"></path><circle cx="7.5" cy="7.5" r="1.5"></circle></svg>
      <span>Бренды</span>
    </a>
    <a class="mnav__link ${page === 'cart' ? 'is-active' : ''}" href="cart.html">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path><path d="M3 6h18"></path><path d="M16 10a4 4 0 0 1-8 0"></path></svg>
      <span>Корзина</span>
      <span class="mnav__count"></span>
    </a>`;
  document.body.appendChild(mnav);
}

/* ============================== BRANDS ============================== */
function initBrands() {
  const brands = [...productsByBrand.entries()]
    .filter(([name]) => tobaccoBrands.has(name))
    .map(([name, items]) => ({
      name,
      count: items.length,
      image: items.find((p) => p.manufacturerImage)?.manufacturerImage || null,
      grams: [...new Set(items.map((p) => p.weight).filter((w) => w > 0))].sort((a, b) => a - b),
    }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'ru'));

  const countEl = document.getElementById('count');
  if (countEl) countEl.innerHTML = `Брендов: <b>${brands.length}</b> · всего ${C.products.length} позиций`;

  const grid = document.getElementById('brands-grid');
  if (!grid) return;
  grid.innerHTML = brands.map((b) => `
    <a class="brand-card" href="brand.html?brand=${encodeURIComponent(b.name)}">
      ${b.image
        ? `<img class="brand-card__img" src="${esc(b.image)}" alt="${esc(b.name)}" loading="lazy">`
        : `<div class="brand-card__logo">${esc(b.name.charAt(0))}</div>`}
      <div class="brand-card__body">
        <div class="brand-card__name">${esc(b.name)}</div>
        <div class="brand-card__meta">${b.count} позиций${b.grams.length ? ` · граммовки: ${b.grams.join('/')} г` : ''}</div>
      </div>
    </a>`).join('');
}

/* ============================== BOOT ============================== */
document.body.insertAdjacentHTML('afterbegin', headerHTML());
document.body.insertAdjacentHTML('beforeend', footerHTML());
wireGlobal();
({ catalog: initListPage, brand: initListPage, brands: initBrands, product: initProduct, cart: initCart }[document.body.dataset.page] ?? function () {})();
initMobileNav();
updateCartCount();