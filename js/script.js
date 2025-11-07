// Smooth scroll for nav links
document.querySelectorAll('a.nav-link[href^="#"]').forEach(function (link) {
  link.addEventListener('click', function (e) {
    var targetId = this.getAttribute('href');
    var targetEl = document.querySelector(targetId);
    if (!targetEl) return;
    e.preventDefault();
    var yOffset = -72; // account for fixed navbar
    var y = targetEl.getBoundingClientRect().top + window.pageYOffset + yOffset;
    window.scrollTo({ top: y, behavior: 'smooth' });
  });
});

// Current year in footer
var yearEl = document.getElementById('year');
if (yearEl) {
  yearEl.textContent = new Date().getFullYear();
}

// Cart System
(function() {
  var cart = new Map(); // itemId -> { item, qty }
  var menuItems = [];
  var paymentBaseUrl = '';
  var DEFAULT_PAYMENT_BASE_URL = 'upi://pay?pa=spicegarden@upi&pn=Spice%20Garden&cu=INR';

  // DOM elements
  var menuGrid = document.getElementById('menuGrid');
  var cartSidebar = document.getElementById('cartSidebar');
  var cartToggle = document.getElementById('cartToggle');
  var closeCart = document.getElementById('closeCart');
  var cartItems = document.getElementById('cartItems');
  var cartCount = document.getElementById('cartCount');
  var cartBadge = document.getElementById('cartBadge');
  var cartSubtotal = document.getElementById('cartSubtotal');
  var cartTotal = document.getElementById('cartTotal');
  var checkoutBtn = document.getElementById('checkoutBtn');
  var clearCartBtn = document.getElementById('clearCartBtn');
  var qrModal = new bootstrap.Modal(document.getElementById('qrModal'));
  var invoiceModal = new bootstrap.Modal(document.getElementById('invoiceModal'));
  var qrDiv = document.getElementById('qrcode');
  var paymentNote = document.getElementById('paymentNote');
  var orderIdDisplay = document.getElementById('orderIdDisplay');
  var invoiceContent = document.getElementById('invoiceContent');
  var printInvoiceBtn = document.getElementById('printInvoiceBtn');

  // Load payment config
  async function loadConfig() {
    try {
      const res = await fetch('/api/config');
      if (res.ok) {
        const cfg = await res.json();
        paymentBaseUrl = (cfg.paymentBaseUrl || '').trim();
      }
    } catch (e) {
      console.error('Failed to load config:', e);
    }
  }

  // Load menu items from API
  async function loadMenu() {
    try {
      const res = await fetch('/api/menu');
      menuItems = await res.json();
      renderMenu();
    } catch (e) {
      console.error('Failed to load menu:', e);
      // Fallback to static menu if API fails
      menuItems = [
        { id: 1, name: 'Butter Cheese Chicken', price_cents: 1650, image_url: 'https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg?auto=compress&cs=tinysrgb&w=1600', description: 'Creamy tomato gravy, tender chicken, finished with butter and fenugreek.' },
        { id: 2, name: 'Paneer Tikka', price_cents: 1200, image_url: 'https://images.unsplash.com/photo-1544025162-d76694265947?q=80&w=1600&auto=format&fit=crop', description: 'Char-grilled cottage cheese, spiced yogurt marinade, pickled onions.' },
        { id: 3, name: 'Dum Biryani', price_cents: 1500, image_url: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?q=80&w=1600&auto=format&fit=crop', description: 'Aromatic basmati rice layered with spiced meat or vegetables.' }
      ];
      renderMenu();
    }
  }

  // Render menu items
  function renderMenu() {
    if (!menuGrid) return;
    menuGrid.innerHTML = '';
    
    menuItems.forEach(function(item) {
      var col = document.createElement('div');
      col.className = 'col-md-6 col-lg-4';
      
      var price = (item.price_cents / 100).toFixed(2);
      
      col.innerHTML = `
        <div class="card h-100 menu-card" data-item-id="${item.id}">
          <img src="${item.image_url || ''}" class="card-img-top" alt="${item.name}" referrerpolicy="no-referrer" onerror="this.onerror=null;this.src='https://placehold.co/800x600?text=${encodeURIComponent(item.name)}';">
          <div class="card-body">
            <h5 class="card-title">${item.name}</h5>
            <p class="card-text text-muted">${item.description || ''}</p>
          </div>
          <div class="card-footer d-flex justify-content-between align-items-center">
            <span class="price">$${price}</span>
            <span class="badge bg-warm-2">Add to Cart</span>
          </div>
        </div>
      `;
      
      var card = col.querySelector('.menu-card');
      card.addEventListener('click', function() {
        addToCart(item);
      });
      
      menuGrid.appendChild(col);
    });
  }

  // Format price
  function formatPrice(cents) {
    return (cents / 100).toFixed(2);
  }

  // Add item to cart
  function addToCart(item) {
    var existing = cart.get(item.id);
    if (existing) {
      existing.qty += 1;
    } else {
      cart.set(item.id, { item: item, qty: 1 });
    }
    updateCart();
    // Open cart sidebar
    cartSidebar.classList.add('open');
  }

  // Remove item from cart
  function removeFromCart(itemId) {
    cart.delete(itemId);
    updateCart();
  }

  // Update quantity
  function updateQuantity(itemId, delta) {
    var entry = cart.get(itemId);
    if (!entry) return;
    entry.qty += delta;
    if (entry.qty <= 0) {
      cart.delete(itemId);
    }
    updateCart();
  }

  // Update cart display
  function updateCart() {
    var totalItems = 0;
    var totalCents = 0;
    
    cartItems.innerHTML = '';
    
    if (cart.size === 0) {
      cartItems.innerHTML = '<p class="text-muted text-center">Your cart is empty</p>';
      checkoutBtn.disabled = true;
    } else {
      checkoutBtn.disabled = false;
      
      cart.forEach(function(entry, itemId) {
        var item = entry.item;
        var qty = entry.qty;
        var itemTotal = item.price_cents * qty;
        
        totalItems += qty;
        totalCents += itemTotal;
        
        var cartItem = document.createElement('div');
        cartItem.className = 'cart-item';
        cartItem.innerHTML = `
          <div class="cart-item-info">
            <div class="cart-item-name">${item.name}</div>
            <div class="cart-item-price">$${formatPrice(item.price_cents)} each</div>
            <div class="cart-item-qty">
              <button onclick="window.cartUpdateQty(${itemId}, -1)">-</button>
              <span>${qty}</span>
              <button onclick="window.cartUpdateQty(${itemId}, 1)">+</button>
            </div>
          </div>
          <div class="text-end">
            <div class="fw-bold">$${formatPrice(itemTotal)}</div>
            <button class="btn btn-sm btn-link text-danger mt-1" onclick="window.cartRemove(${itemId})">Remove</button>
          </div>
        `;
        cartItems.appendChild(cartItem);
      });
    }
    
    cartCount.textContent = totalItems;
    cartBadge.textContent = totalItems;
    cartBadge.style.display = totalItems > 0 ? 'flex' : 'none';
    cartSubtotal.textContent = '$' + formatPrice(totalCents);
    cartTotal.textContent = '$' + formatPrice(totalCents);
  }

  // Expose cart functions globally
  window.cartUpdateQty = function(itemId, delta) {
    updateQuantity(itemId, delta);
  };
  
  window.cartRemove = function(itemId) {
    removeFromCart(itemId);
  };

  // Clear cart
  function clearCart() {
    if (confirm('Are you sure you want to clear your cart?')) {
      cart.clear();
      updateCart();
    }
  }

  // Build payment URL
  function buildPaymentUrl(orderId, totalCents) {
    var amount = formatPrice(totalCents);
    var note = 'ORDER_' + orderId;
    var base = (paymentBaseUrl && paymentBaseUrl.trim()) || DEFAULT_PAYMENT_BASE_URL;

    var parts = base.split('?');
    var prefix = parts[0];
    var params = new URLSearchParams(parts[1] || '');

    if (prefix.startsWith('upi://')) {
      params.set('am', amount);
      params.set('tn', note);
      if (!params.has('cu')) {
        params.set('cu', 'INR');
      }
    } else {
      params.set('amount', amount);
      params.set('note', note);
    }

    return prefix + '?' + params.toString();
  }

  // Show QR code
  function showQR(orderId, totalCents) {
    var url = buildPaymentUrl(orderId, totalCents);
    // Use QR code image service
    var img = document.createElement('img');
    img.src = 'https://api.qrserver.com/v1/create-qr-code/?size=256x256&data=' + encodeURIComponent(url);
    img.alt = 'QR Code';
    img.className = 'img-fluid';
    qrDiv.innerHTML = '';
    qrDiv.appendChild(img);
    paymentNote.textContent = 'Order #' + orderId + ' — $' + formatPrice(totalCents);
    orderIdDisplay.textContent = orderId;
    qrModal.show();
  }

  // Generate invoice
  function generateInvoice(orderId, orderData) {
    var date = new Date().toLocaleString();
    var html = `
      <div class="invoice-header">
        <h3>SPICE GARDEN</h3>
        <p>123 Spice Lane, Flavor Town, FT 45678</p>
        <p>Phone: (555) 987-6543 | Email: hello@spicegarden.com</p>
      </div>
      <div class="mb-3">
        <p><strong>Invoice #:</strong> ${orderId}</p>
        <p><strong>Date:</strong> ${date}</p>
      </div>
      <table class="table table-bordered">
        <thead>
          <tr>
            <th>Item</th>
            <th>Qty</th>
            <th>Price</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
    `;
    
    orderData.items.forEach(function(item) {
      var itemTotal = item.price_cents * item.qty;
      html += `
        <tr>
          <td>${item.name}</td>
          <td>${item.qty}</td>
          <td>$${formatPrice(item.price_cents)}</td>
          <td>$${formatPrice(itemTotal)}</td>
        </tr>
      `;
    });
    
    html += `
        </tbody>
      </table>
      <div class="invoice-total">
        <div class="d-flex justify-content-between">
          <span>Grand Total:</span>
          <span>$${formatPrice(orderData.total_cents)}</span>
        </div>
      </div>
      <div class="text-center mt-4">
        <p class="text-muted">Thank you for your order!</p>
      </div>
    `;
    
    invoiceContent.innerHTML = html;
    invoiceModal.show();
  }

  // Checkout
  async function checkout() {
    if (cart.size === 0) return;
    
    var items = Array.from(cart.values()).map(function(entry) {
      return { id: entry.item.id, qty: entry.qty };
    });
    
    checkoutBtn.disabled = true;
    checkoutBtn.textContent = 'Processing...';
    
    try {
      var res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: items })
      });
      
      var order = await res.json();
      
      if (!res.ok) {
        alert(order.error || 'Order failed');
        checkoutBtn.disabled = false;
        checkoutBtn.textContent = 'Proceed to Payment';
        return;
      }
      
      // Get full order details
      var orderRes = await fetch('/api/orders/' + order.id);
      var orderData = await orderRes.json();
      
      // Show QR code
      showQR(order.id, order.total_cents);
      
      // Generate invoice
      generateInvoice(order.id, orderData);
      
      // Clear cart
      cart.clear();
      updateCart();
      
    } catch (error) {
      console.error('Checkout error:', error);
      alert('Failed to process order. Please try again.');
    } finally {
      checkoutBtn.disabled = false;
      checkoutBtn.textContent = 'Proceed to Payment';
    }
  }

  // Print invoice
  printInvoiceBtn.addEventListener('click', function() {
    var printContent = invoiceContent.innerHTML;
    var originalContent = document.body.innerHTML;
    document.body.innerHTML = printContent;
    window.print();
    document.body.innerHTML = originalContent;
    location.reload();
  });

  // Cart toggle
  cartToggle.addEventListener('click', function() {
    cartSidebar.classList.add('open');
  });
  
  closeCart.addEventListener('click', function() {
    cartSidebar.classList.remove('open');
  });
  
  checkoutBtn.addEventListener('click', checkout);
  clearCartBtn.addEventListener('click', clearCart);

  // Initialize
  loadConfig();
  loadMenu();
  updateCart();
})();

// Reservation form validation and submit
(function () {
  var form = document.getElementById('reservationForm');
  if (!form) return;
  var alertEl = document.getElementById('formAlert');

  form.addEventListener('submit', function (e) {
    e.preventDefault();

    // Bootstrap validation styling
    if (!form.checkValidity()) {
      e.stopPropagation();
      form.classList.add('was-validated');
      return;
    }

    // Get form data
    var formData = {
      name: document.getElementById('name').value.trim(),
      email: document.getElementById('email').value.trim(),
      phone: document.getElementById('phone').value.trim(),
      date: document.getElementById('date').value,
      time: document.getElementById('time').value,
      guests: document.getElementById('guests').value,
      requests: document.getElementById('requests').value.trim() || null
    };

    // Disable submit button during submission
    var submitBtn = form.querySelector('button[type="submit"]');
    var originalBtnText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = 'Booking...';

    // Send to backend
    fetch('/api/reservations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(formData)
    })
    .then(function(response) {
      return response.json();
    })
    .then(function(data) {
      form.classList.remove('was-validated');
      
      if (data.error) {
        // Show error message
        if (alertEl) {
          alertEl.className = 'alert alert-danger py-2 px-3 mb-0';
          alertEl.textContent = data.error || 'Failed to submit reservation. Please try again.';
          alertEl.classList.remove('d-none');
        }
      } else {
        // Success
        if (alertEl) {
          alertEl.className = 'alert alert-success py-2 px-3 mb-0';
          alertEl.textContent = 'Reservation request sent! We\'ll be in touch soon.';
          alertEl.classList.remove('d-none');
        }
        form.reset();
      }

      // Hide alert after a delay
      if (alertEl) {
        setTimeout(function () { 
          alertEl.classList.add('d-none'); 
        }, 5000);
      }
    })
    .catch(function(error) {
      console.error('Error:', error);
      if (alertEl) {
        alertEl.className = 'alert alert-danger py-2 px-3 mb-0';
        alertEl.textContent = 'Failed to submit reservation. Please try again.';
        alertEl.classList.remove('d-none');
        setTimeout(function () { 
          alertEl.classList.add('d-none'); 
        }, 5000);
      }
    })
    .finally(function() {
      // Re-enable submit button
      submitBtn.disabled = false;
      submitBtn.textContent = originalBtnText;
    });
  });
})();
