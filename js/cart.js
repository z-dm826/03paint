/* ===== Cart ===== */
(function () {
  const CART_KEY = 'copia_cart_v1';

  class Cart {
    constructor() {
      this.items = this.load();
      this.drawerEl = null;
      this.overlayEl = null;
      this.initDrawer();
      this.bindToggle();
      this.render();
    }

    load() {
      try { return JSON.parse(localStorage.getItem(CART_KEY)) || []; } catch { return []; }
    }
    save() { localStorage.setItem(CART_KEY, JSON.stringify(this.items)); }

    initDrawer() {
      if (document.getElementById('cart-drawer')) return;
      const overlay = document.createElement('div');
      overlay.id = 'cart-overlay';
      overlay.className = 'cart-overlay';
      overlay.innerHTML = '<span class="sr-only">Close cart</span>';
      overlay.addEventListener('click', () => this.close());

      const drawer = document.createElement('div');
      drawer.id = 'cart-drawer';
      drawer.className = 'cart-drawer';
      drawer.innerHTML = `
        <div class="cart-header">
          <h2>Your Cart</h2>
          <button class="cart-close" aria-label="Close cart">&times;</button>
        </div>
        <div class="cart-items" id="cart-items"></div>
        <div class="cart-footer" id="cart-footer">
          <div class="cart-subtotal"><span>Subtotal</span><span id="cart-subtotal">$0</span></div>
          <p class="cart-note">Shipping & taxes calculated at checkout. Orders are made to order and ship within 10–14 days.</p>
          <button class="btn btn-primary btn-block" id="cart-checkout">Check out</button>
        </div>
      `;
      drawer.querySelector('.cart-close').addEventListener('click', () => this.close());
      drawer.querySelector('#cart-checkout').addEventListener('click', () => this.checkout());

      document.body.appendChild(overlay);
      document.body.appendChild(drawer);
      this.drawerEl = drawer;
      this.overlayEl = overlay;
    }

    bindToggle() {
      document.querySelectorAll('[data-cart-toggle]').forEach(btn =>
        btn.addEventListener('click', () => this.open())
      );
    }

    open() {
      this.drawerEl.classList.add('open');
      this.overlayEl.classList.add('open');
      document.body.style.overflow = 'hidden';
      this.render();
    }
    close() {
      this.drawerEl.classList.remove('open');
      this.overlayEl.classList.remove('open');
      document.body.style.overflow = '';
    }

    add(product, sizeIdx = 0, formatIdx = 0, qty = 1) {
      const size = window.SITE.SIZES[sizeIdx];
      const format = window.SITE.FORMATS[formatIdx];
      const unitPrice = product.price + size.add + format.add;
      const existing = this.items.find(i =>
        i.id === product.id && i.size === sizeIdx && i.format === formatIdx
      );
      if (existing) {
        existing.qty += qty;
      } else {
        this.items.push({
          id: product.id,
          name: product.name,
          sku: product.sku,
          img: product.imgCard,
          size: sizeIdx,
          format: formatIdx,
          price: unitPrice,
          qty
        });
      }
      this.save();
      this.render();
      this.open();
      showToast(`${product.name} added to cart`);
    }

    updateQty(index, delta) {
      this.items[index].qty += delta;
      if (this.items[index].qty <= 0) this.items.splice(index, 1);
      this.save();
      this.render();
    }

    remove(index) {
      this.items.splice(index, 1);
      this.save();
      this.render();
    }

    subtotal() {
      return this.items.reduce((sum, i) => sum + i.price * i.qty, 0);
    }

    render() {
      const container = document.getElementById('cart-items');
      const footer = document.getElementById('cart-footer');
      const badge = document.querySelector('.cart-count');
      const count = this.items.reduce((n, i) => n + i.qty, 0);
      if (badge) badge.textContent = count || '';

      if (!this.items.length) {
        container.innerHTML = '<div class="cart-empty"><p>Your cart is empty.</p><a href="shop.html" class="btn btn-outline btn-sm" style="margin-top:1rem">Start shopping</a></div>';
        if (footer) footer.style.display = 'none';
        return;
      }
      if (footer) footer.style.display = 'block';

      container.innerHTML = this.items.map((item, idx) => {
        const size = window.SITE.SIZES[item.size].label.split('·')[0].trim();
        const format = window.SITE.FORMATS[item.format].label;
        return `
          <div class="cart-item">
            <img src="${item.img}" alt="${item.name}">
            <div class="cart-item-info">
              <div class="cart-item-name">${item.name}</div>
              <div class="cart-item-meta">${item.sku} · ${size} · ${format}</div>
              <div class="cart-item-qty">
                <button data-delta="-1" data-idx="${idx}">−</button>
                <span>${item.qty}</span>
                <button data-delta="1" data-idx="${idx}">+</button>
              </div>
              <button class="cart-item-remove" data-remove="${idx}">Remove</button>
            </div>
            <div class="cart-item-price">$${(item.price * item.qty).toLocaleString()}</div>
          </div>
        `;
      }).join('');

      container.querySelectorAll('[data-delta]').forEach(btn =>
        btn.addEventListener('click', e => this.updateQty(+e.target.dataset.idx, +e.target.dataset.delta))
      );
      container.querySelectorAll('[data-remove]').forEach(btn =>
        btn.addEventListener('click', e => this.remove(+e.target.dataset.remove))
      );

      const st = document.getElementById('cart-subtotal');
      if (st) st.textContent = '$' + this.subtotal().toLocaleString();
    }

    checkout() {
      if (!this.items.length) return;
      const lines = this.items.map(i => `${i.name} ×${i.qty} — $${(i.price * i.qty).toLocaleString()}`).join('\n');
      const total = this.subtotal().toLocaleString();
      alert(`Thank you for your interest.\n\nOrder summary:\n${lines}\n\nSubtotal: $${total}\n\nThis is a demo storefront. In production, this would redirect to a secure checkout.`);
    }
  }

  window.Cart = new Cart();

  // ===== Toast =====
  let toastEl = null;
  function showToast(msg) {
    if (!toastEl) {
      toastEl = document.createElement('div');
      toastEl.className = 'toast';
      document.body.appendChild(toastEl);
    }
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(showToast.t);
    showToast.t = setTimeout(() => toastEl.classList.remove('show'), 2600);
  }
  window.showToast = showToast;
})();
