(() => {
  const menuGrid = document.getElementById('menuGrid');
  const cartItemsEl = document.getElementById('cartItems');
  const subtotalEl = document.getElementById('subtotal');
  const totalEl = document.getElementById('total');
  const payNowBtn = document.getElementById('payNowBtn');
  const clearBtn = document.getElementById('clearBtn');
  const printBtn = document.getElementById('printBtn');
  const qrModal = document.getElementById('qrModal');
  const qrDiv = document.getElementById('qrcode');
  const closeQr = document.getElementById('closeQr');
  const paymentNote = document.getElementById('paymentNote');
  const receipt = document.getElementById('receipt');
  const receiptItems = document.getElementById('receiptItems');
  const receiptTotal = document.getElementById('receiptTotal');

  let menu = [];
  const cart = new Map(); // itemId -> { item, qty }

  function formatINR(cents) {
    return (cents / 100).toFixed(2);
  }

  async function loadMenu() {
    // load config
    try {
      const cfgRes = await fetch('/api/config');
      if (cfgRes.ok) {
        const cfg = await cfgRes.json();
        window.PAYMENT_BASE_URL = cfg.paymentBaseUrl || '';
      }
    } catch {}
    const res = await fetch('/api/menu');
    menu = await res.json();
    renderMenu();
  }

  function renderMenu() {
    menuGrid.innerHTML = '';
    for (const item of menu) {
      const card = document.createElement('div');
      card.className = 'card';
      card.innerHTML = `
        <img src="${item.image_url || ''}" alt="${item.name}"/>
        <div class="info"><span>${item.name}</span><strong>₹ ${formatINR(item.price_cents)}</strong></div>
      `;
      card.addEventListener('click', () => addToCart(item));
      menuGrid.appendChild(card);
    }
  }

  function addToCart(item) {
    const row = cart.get(item.id) || { item, qty: 0 };
    row.qty += 1;
    cart.set(item.id, row);
    renderCart();
  }

  function changeQty(itemId, delta) {
    const row = cart.get(itemId);
    if (!row) return;
    row.qty += delta;
    if (row.qty <= 0) cart.delete(itemId);
    else cart.set(itemId, row);
    renderCart();
  }

  function clearCart() {
    cart.clear();
    renderCart();
  }

  function calcSubtotal() {
    let sum = 0;
    for (const { item, qty } of cart.values()) sum += item.price_cents * qty;
    return sum;
  }

  function renderCart() {
    cartItemsEl.innerHTML = '';
    for (const { item, qty } of cart.values()) {
      const line = document.createElement('div');
      line.className = 'line';
      line.innerHTML = `
        <span>${item.name}</span>
        <span class="qty">
          <button class="secondary">-</button>
          <strong>${qty}</strong>
          <button class="secondary">+</button>
        </span>
        <span>₹ ${formatINR(item.price_cents * qty)}</span>
      `;
      const [minus, , plus] = line.querySelectorAll('button');
      minus.addEventListener('click', () => changeQty(item.id, -1));
      plus.addEventListener('click', () => changeQty(item.id, +1));
      cartItemsEl.appendChild(line);
    }
    const subtotal = calcSubtotal();
    subtotalEl.textContent = formatINR(subtotal);
    totalEl.textContent = formatINR(subtotal);
  }

  function showQr(url, note) {
    qrDiv.innerHTML = '';
    const img = document.createElement('img');
    img.alt = 'QR code';
    img.width = 220;
    img.height = 220;
    img.src = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(url)}`;
    qrDiv.appendChild(img);
    paymentNote.textContent = note || '';
    qrModal.style.display = 'flex';
  }

  function hideQr() { qrModal.style.display = 'none'; }

  function buildPaymentUrl(orderId, totalCents) {
    const base = (window.PAYMENT_BASE_URL || '').trim();
    const amount = (totalCents / 100).toFixed(2);
    const note = `ORDER_${orderId}`;
    if (!base) return `https://example.com/pay?amount=${encodeURIComponent(amount)}&note=${encodeURIComponent(note)}`;
    const sep = base.includes('?') ? '&' : '?';
    return `${base}${sep}amount=${encodeURIComponent(amount)}&note=${encodeURIComponent(note)}`;
  }

  async function payNow() {
    if (cart.size === 0) return;
    const items = Array.from(cart.values()).map(({ item, qty }) => ({ id: item.id, qty }));
    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items })
    });
    const order = await res.json();
    if (!res.ok) {
      alert(order.error || 'Order failed');
      return;
    }
    // Prepare receipt
    receiptItems.innerHTML = '';
    for (const { item, qty } of cart.values()) {
      const row = document.createElement('div');
      row.textContent = `${item.name} x ${qty} - ₹ ${formatINR(item.price_cents * qty)}`;
      receiptItems.appendChild(row);
    }
    receiptTotal.textContent = formatINR(order.total_cents);
    receipt.style.display = 'block';

    const url = buildPaymentUrl(order.id, order.total_cents);
    showQr(url, `Order #${order.id} — ₹ ${formatINR(order.total_cents)}`);
  }

  // Wire events
  clearBtn.addEventListener('click', clearCart);
  payNowBtn.addEventListener('click', payNow);
  printBtn.addEventListener('click', () => window.print());
  closeQr.addEventListener('click', hideQr);

  // Expose PAYMENT_BASE_URL from server env via meta tag or inline config
  // Fallback to using global (can be injected later if needed)
  loadMenu();
})();


