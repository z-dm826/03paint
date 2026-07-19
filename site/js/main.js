/* ===== Shared site logic ===== */
(function () {
  const PRODUCTS = window.SITE?.PRODUCTS || [];
  const FAMILIES = window.SITE?.FAMILIES || [];
  const SIZES = window.SITE?.SIZES || [];
  const FORMATS = window.SITE?.FORMATS || [];

  const formatPrice = n => '$' + n.toLocaleString();
  const getParam = name => new URLSearchParams(location.search).get(name);
  const byId = id => PRODUCTS.find(p => p.id === id);
  const path = window.location.pathname;

  // ===== Header =====
  function initHeader() {
    const header = document.querySelector('.header');
    if (!header) return;
    window.addEventListener('scroll', () => {
      header.classList.toggle('scrolled', window.scrollY > 10);
    }, { passive: true });

    const toggle = document.querySelector('.menu-toggle');
    const nav = document.querySelector('.nav-links');
    if (toggle && nav) {
      toggle.addEventListener('click', () => nav.classList.toggle('open'));
      nav.querySelectorAll('a').forEach(a => a.addEventListener('click', () => nav.classList.remove('open')));
    }
  }

  // ===== Product Card Component =====
  function productCardHTML(p) {
    return `
      <article class="product-card" data-id="${p.id}">
        <a href="product.html?id=${p.id}" class="card-image">
          <img src="${p.imgCard}" alt="${p.name}" loading="lazy">
        </a>
        <button class="btn btn-primary btn-sm quick-add" data-quick="${p.id}">+ Quick add</button>
        <div class="card-body">
          <a href="product.html?id=${p.id}">
            <h3 class="card-title">${p.name}</h3>
          </a>
          <div class="card-sku">${p.sku}</div>
          <div class="card-price"><span>From</span> ${formatPrice(p.price)}</div>
        </div>
      </article>
    `;
  }

  function bindQuickAdd(container) {
    container.querySelectorAll('[data-quick]').forEach(btn => {
      btn.addEventListener('click', e => {
        e.preventDefault();
        const p = byId(btn.dataset.quick);
        if (p && window.Cart) window.Cart.add(p, 0, 0, 1);
      });
    });
  }

  function renderGrid(list, selector) {
    const el = typeof selector === 'string' ? document.querySelector(selector) : selector;
    if (!el) return;
    el.innerHTML = list.map(productCardHTML).join('');
    bindQuickAdd(el);
  }

  // ===== Home Page =====
  function initHome() {
    const page = document.body.dataset.page;
    if (page !== 'home') return;

    // Collections
    renderGrid(PRODUCTS.filter(p => p.collections?.includes('bestseller')), '#best-sellers-grid');
    renderGrid(PRODUCTS.filter(p => p.collections?.includes('editors')), '#editors-grid');
    renderGrid(PRODUCTS.filter(p => p.collections?.includes('new')), '#new-grid');

    // Subject categories
    const catContainer = document.getElementById('subject-grid');
    if (catContainer) {
      // only show families with products, keep order
      const used = FAMILIES.filter(f => f.id === 'all' || PRODUCTS.some(p => p.familyId === f.id));
      const display = used.filter(f => f.id !== 'all');
      catContainer.innerHTML = display.map(f => {
        const representative = PRODUCTS.find(p => p.familyId === f.id);
        return `
          <a href="shop.html?family=${f.id}" class="category-card">
            <img src="${representative.imgCard}" alt="${f.name}">
            <span class="category-label">${f.name}</span>
          </a>
        `;
      }).join('');
    }
  }

  // ===== Shop Page =====
  function initShop() {
    const page = document.body.dataset.page;
    if (page !== 'shop') return;

    const grid = document.getElementById('shop-grid');
    const countEl = document.getElementById('result-count');
    const sortEl = document.getElementById('sort-select');
    const filters = document.querySelectorAll('.filter-group input');
    const currentFamily = getParam('family') || 'all';

    function familyLabel(id) {
      const f = FAMILIES.find(x => x.id === id);
      return f ? f.name : 'All Artworks';
    }

    function getFilteredSorted() {
      let list = PRODUCTS.slice();
      const active = Array.from(filters).filter(i => i.checked).map(i => i.value);
      if (active.length && !active.includes('all')) {
        list = list.filter(p => active.includes(p.familyId));
      }
      const sort = sortEl ? sortEl.value : 'featured';
      switch (sort) {
        case 'price-asc': list.sort((a, b) => a.price - b.price); break;
        case 'price-desc': list.sort((a, b) => b.price - a.price); break;
        case 'new': list.sort((a, b) => (b.id > a.id ? 1 : -1)); break;
        default: break; // order from data
      }
      return list;
    }

    function render() {
      const list = getFilteredSorted();
      renderGrid(list, grid);
      if (countEl) countEl.textContent = `${list.length} artwork${list.length !== 1 ? 's' : ''}`;
      // update checkboxes from URL only once
    }

    if (currentFamily && currentFamily !== 'all') {
      filters.forEach(i => i.checked = i.value === currentFamily);
    }
    render();

    filters.forEach(i => i.addEventListener('change', () => {
      // if "all" clicked, uncheck others; if any other clicked, uncheck all
      if (i.value === 'all' && i.checked) filters.forEach(f => { if (f !== i) f.checked = false; });
      if (i.value !== 'all' && i.checked) {
        const allBox = Array.from(filters).find(f => f.value === 'all');
        if (allBox) allBox.checked = false;
      }
      render();
    }));
    if (sortEl) sortEl.addEventListener('change', render);
  }

  // ===== Product Detail Page =====
  function initProduct() {
    const page = document.body.dataset.page;
    if (page !== 'product') return;

    const id = getParam('id') || (PRODUCTS[0] && PRODUCTS[0].id);
    const p = byId(id) || PRODUCTS[0];
    if (!p) return;

    document.getElementById('pd-image').src = p.imgDetail;
    document.getElementById('pd-image').alt = p.name;
    document.getElementById('pd-family').textContent = p.family;
    document.getElementById('pd-family').href = `shop.html?family=${p.familyId}`;
    document.getElementById('pd-title').textContent = p.name;
    document.getElementById('pd-sku').textContent = p.sku;
    document.getElementById('pd-desc').textContent = p.desc;

    let sizeIdx = 0, formatIdx = 0, qty = 1;
    const sizeList = document.getElementById('pd-sizes');
    const formatList = document.getElementById('pd-formats');
    const priceEl = document.getElementById('pd-price');
    const qtyInput = document.getElementById('pd-qty');

    function updatePrice() {
      const total = (p.price + SIZES[sizeIdx].add + FORMATS[formatIdx].add) * qty;
      priceEl.textContent = formatPrice(total);
    }

    function renderOptions() {
      sizeList.innerHTML = SIZES.map((s, i) => `
        <div class="option ${i === sizeIdx ? 'selected' : ''}" data-size="${i}">
          <strong>${s.label.split('·')[0].trim()}</strong>
          <span class="option-note">${s.label.split('·')[1].trim()} · ${s.add ? '+' + formatPrice(s.add) : 'base'}</span>
        </div>
      `).join('');
      sizeList.querySelectorAll('[data-size]').forEach(el => {
        el.addEventListener('click', () => { sizeIdx = +el.dataset.size; renderOptions(); });
      });

      formatList.innerHTML = FORMATS.map((f, i) => `
        <div class="option ${i === formatIdx ? 'selected' : ''}" data-format="${i}">
          <strong>${f.label}</strong>
          <span class="option-note">${f.note}</span>
        </div>
      `).join('');
      formatList.querySelectorAll('[data-format]').forEach(el => {
        el.addEventListener('click', () => { formatIdx = +el.dataset.format; renderOptions(); });
      });
      updatePrice();
    }
    renderOptions();

    qtyInput.value = qty;
    document.querySelectorAll('[data-qty]').forEach(btn => {
      btn.addEventListener('click', () => {
        qty = Math.max(1, qty + parseInt(btn.dataset.qty, 10));
        qtyInput.value = qty;
        updatePrice();
      });
    });

    document.getElementById('pd-add').addEventListener('click', () => {
      if (window.Cart) window.Cart.add(p, sizeIdx, formatIdx, qty);
    });

    // Related products
    const related = PRODUCTS.filter(x => x.familyId === p.familyId && x.id !== p.id).slice(0, 4);
    if (!related.length) {
      // fallback: same collection
      const coll = p.collections?.[0] || 'bestseller';
      PRODUCTS.filter(x => x.collections?.includes(coll) && x.id !== p.id).slice(0, 4).forEach(x => related.push(x));
    }
    renderGrid(related, '#related-grid');
  }

  // ===== FAQ Accordion =====
  function initFAQ() {
    const page = document.body.dataset.page;
    if (page !== 'faq') return;
    document.querySelectorAll('.accordion-trigger').forEach(btn => {
      btn.addEventListener('click', () => {
        const item = btn.closest('.accordion-item');
        const content = item.querySelector('.accordion-content');
        const isOpen = item.classList.contains('open');
        document.querySelectorAll('.accordion-item').forEach(i => {
          i.classList.remove('open');
          i.querySelector('.accordion-content').style.maxHeight = null;
        });
        if (!isOpen) {
          item.classList.add('open');
          content.style.maxHeight = content.scrollHeight + 'px';
        }
      });
    });
  }

  // ===== Init =====
  document.addEventListener('DOMContentLoaded', () => {
    initHeader();
    initHome();
    initShop();
    initProduct();
    initFAQ();
  });
})();
