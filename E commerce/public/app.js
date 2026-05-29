// AuraStore - Client Side JavaScript
// Handles Cart, Auth, Catalog, Checkout, Dashboards, and UI transitions

const API_BASE = '/api';

// Global state
let cart = JSON.parse(localStorage.getItem('aura_cart')) || [];
let user = JSON.parse(localStorage.getItem('aura_user')) || null;

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', () => {
  setupAuthNavigation();
  setupCartDrawer();
  
  // Router based on DOM elements presence
  if (document.getElementById('product-grid-container')) {
    initCatalogPage();
  }
  if (document.getElementById('login-form') || document.getElementById('register-form')) {
    initAuthPage();
  }
  if (document.getElementById('order-list-container')) {
    initDashboardPage();
  }
  if (document.getElementById('admin-products-table-body') || document.getElementById('admin-orders-table-body')) {
    initAdminPage();
  }
  
  updateCartUI();
});

// ==========================================
// 1. JWT AUTHENTICATION & NAVIGATION HANDLERS
// ==========================================

function getAuthHeaders() {
  const headers = { 'Content-Type': 'application/json' };
  if (user && user.token) {
    headers['Authorization'] = `Bearer ${user.token}`;
  }
  return headers;
}

function setupAuthNavigation() {
  const greeting = document.getElementById('nav-user-greeting');
  const loginBtn = document.getElementById('nav-login-btn');
  const logoutBtn = document.getElementById('nav-logout-btn');
  const dashboardLink = document.getElementById('nav-dashboard-link');
  const adminLink = document.getElementById('nav-admin-link');

  if (user) {
    if (greeting) {
      greeting.textContent = `Hello, ${user.name.split(' ')[0]}`;
      greeting.classList.remove('hidden');
    }
    if (loginBtn) loginBtn.classList.add('hidden');
    if (logoutBtn) logoutBtn.classList.remove('hidden');
    if (dashboardLink) dashboardLink.classList.remove('hidden');
    
    if (user.role === 'admin' && adminLink) {
      adminLink.classList.remove('hidden');
    }
  } else {
    if (greeting) greeting.classList.add('hidden');
    if (loginBtn) loginBtn.classList.remove('hidden');
    if (logoutBtn) logoutBtn.classList.add('hidden');
    if (dashboardLink) dashboardLink.classList.add('hidden');
    if (adminLink) adminLink.classList.add('hidden');
  }

  if (logoutBtn) {
    logoutBtn.onclick = () => {
      localStorage.removeItem('aura_user');
      user = null;
      window.location.href = 'index.html';
    };
  }
}

function initAuthPage() {
  const loginTab = document.getElementById('tab-login-btn');
  const registerTab = document.getElementById('tab-register-btn');
  const loginPanel = document.getElementById('login-panel');
  const registerPanel = document.getElementById('register-panel');
  
  const loginForm = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');
  const loginError = document.getElementById('login-error-msg');
  const registerError = document.getElementById('register-error-msg');

  // Tab switching
  if (loginTab && registerTab) {
    loginTab.onclick = () => {
      loginTab.classList.add('active');
      registerTab.classList.remove('active');
      loginPanel.classList.remove('hidden');
      registerPanel.classList.add('hidden');
    };

    registerTab.onclick = () => {
      registerTab.classList.add('active');
      loginTab.classList.remove('active');
      registerPanel.classList.remove('hidden');
      loginPanel.classList.add('hidden');
    };
  }

  // Login handler
  if (loginForm) {
    loginForm.onsubmit = async (e) => {
      e.preventDefault();
      loginError.classList.add('hidden');
      
      const email = document.getElementById('login-email').value;
      const password = document.getElementById('login-password').value;

      try {
        const res = await fetch(`${API_BASE}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });
        
        const data = await res.json();
        
        if (res.ok) {
          localStorage.setItem('aura_user', JSON.stringify(data));
          user = data;
          if (user.role === 'admin') {
            window.location.href = 'admin.html';
          } else {
            window.location.href = 'index.html';
          }
        } else {
          loginError.textContent = data.message || 'Login failed';
          loginError.classList.remove('hidden');
        }
      } catch (err) {
        loginError.textContent = 'Server connection error';
        loginError.classList.remove('hidden');
      }
    };
  }

  // Register handler
  if (registerForm) {
    registerForm.onsubmit = async (e) => {
      e.preventDefault();
      registerError.classList.add('hidden');

      const name = document.getElementById('register-name').value;
      const email = document.getElementById('register-email').value;
      const password = document.getElementById('register-password').value;
      const role = document.getElementById('register-role').value;

      try {
        const res = await fetch(`${API_BASE}/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, email, password, role })
        });

        const data = await res.json();

        if (res.ok) {
          localStorage.setItem('aura_user', JSON.stringify(data));
          user = data;
          if (user.role === 'admin') {
            window.location.href = 'admin.html';
          } else {
            window.location.href = 'index.html';
          }
        } else {
          registerError.textContent = data.message || 'Registration failed';
          registerError.classList.remove('hidden');
        }
      } catch (err) {
        registerError.textContent = 'Server connection error';
        registerError.classList.remove('hidden');
      }
    };
  }
}

// ==========================================
// 2. SHOPPING CART ENGINE & ACTIONS
// ==========================================

function setupCartDrawer() {
  const overlay = document.getElementById('cart-overlay');
  const toggleBtn = document.getElementById('cart-toggle-btn');
  const closeBtn = document.getElementById('cart-close-btn');
  const checkoutBtn = document.getElementById('cart-checkout-btn');

  if (toggleBtn && overlay) {
    toggleBtn.onclick = () => overlay.classList.add('open');
  }

  if (closeBtn && overlay) {
    closeBtn.onclick = () => overlay.classList.remove('open');
  }

  // Close when clicking outside the drawer
  if (overlay) {
    overlay.onclick = (e) => {
      if (e.target === overlay) overlay.classList.remove('open');
    };
  }

  if (checkoutBtn) {
    checkoutBtn.onclick = () => {
      if (cart.length === 0) {
        alert('Your cart is empty.');
        return;
      }
      if (!user) {
        alert('Please register or sign in to complete checkout.');
        window.location.href = 'login.html';
        return;
      }
      
      overlay.classList.remove('open');
      openCheckoutModal();
    };
  }
}

function addToCart(product, qty = 1) {
  const existingItemIndex = cart.findIndex(item => item.product === product._id);
  
  if (existingItemIndex > -1) {
    const newQty = cart[existingItemIndex].qty + qty;
    if (newQty > product.countInStock) {
      alert(`Cannot add more items. Only ${product.countInStock} items available in stock.`);
      return;
    }
    cart[existingItemIndex].qty = newQty;
  } else {
    if (qty > product.countInStock) {
      alert(`Only ${product.countInStock} items available in stock.`);
      return;
    }
    cart.push({
      product: product._id,
      name: product.name,
      price: product.price,
      image: product.image,
      qty: qty,
      countInStock: product.countInStock
    });
  }
  
  saveCart();
  updateCartUI();
  
  // Slide cart open to confirm add
  const overlay = document.getElementById('cart-overlay');
  if (overlay) overlay.classList.add('open');
}

function updateQty(productId, delta) {
  const idx = cart.findIndex(item => item.product === productId);
  if (idx > -1) {
    const item = cart[idx];
    const newQty = item.qty + delta;
    if (newQty <= 0) {
      cart.splice(idx, 1);
    } else if (newQty > item.countInStock) {
      alert(`Cannot exceed stock limit. Only ${item.countInStock} in stock.`);
    } else {
      item.qty = newQty;
    }
    saveCart();
    updateCartUI();
  }
}

function removeFromCart(productId) {
  cart = cart.filter(item => item.product !== productId);
  saveCart();
  updateCartUI();
}

function saveCart() {
  localStorage.setItem('aura_cart', JSON.stringify(cart));
}

function updateCartUI() {
  const badge = document.getElementById('cart-badge-count');
  const container = document.getElementById('cart-items-container');
  const subtotalText = document.getElementById('cart-summary-subtotal');
  const totalText = document.getElementById('cart-summary-total');

  const totalItems = cart.reduce((sum, item) => sum + item.qty, 0);
  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);

  if (badge) badge.textContent = totalItems;
  if (subtotalText) subtotalText.textContent = `$${subtotal.toFixed(2)}`;
  if (totalText) totalText.textContent = `$${subtotal.toFixed(2)}`;

  if (!container) return;

  if (cart.length === 0) {
    container.innerHTML = `
      <div class="cart-empty">
        <i class="fa-solid fa-shopping-basket"></i>
        <p>Your bag is empty.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = cart.map(item => `
    <div class="cart-item">
      <div class="cart-item-image">
        <img src="${item.image}" alt="${item.name}">
      </div>
      <div class="cart-item-details">
        <div class="cart-item-name">${item.name}</div>
        <div class="cart-item-price">$${item.price.toFixed(2)}</div>
        <div class="cart-item-qty">
          <button class="qty-btn" onclick="updateQty('${item.product}', -1)"><i class="fa-solid fa-minus"></i></button>
          <span class="qty-val">${item.qty}</span>
          <button class="qty-btn" onclick="updateQty('${item.product}', 1)"><i class="fa-solid fa-plus"></i></button>
        </div>
      </div>
      <button class="cart-item-remove" onclick="removeFromCart('${item.product}')">
        <i class="fa-solid fa-trash-can"></i>
      </button>
    </div>
  `).join('');
}

// ==========================================
// 3. PRODUCT CATALOG ACTIONS
// ==========================================

let catalogProducts = [];

async function initCatalogPage() {
  const searchInput = document.getElementById('search-input');
  const categoryFilter = document.getElementById('category-filter');

  await fetchCatalog();

  // Search logic
  let debounceTimeout;
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      clearTimeout(debounceTimeout);
      debounceTimeout = setTimeout(() => {
        fetchCatalog(e.target.value, categoryFilter ? categoryFilter.value : '');
      }, 350);
    });
  }

  // Category filter logic
  if (categoryFilter) {
    categoryFilter.addEventListener('change', (e) => {
      fetchCatalog(searchInput ? searchInput.value : '', e.target.value);
    });
  }

  // Modals closing setup
  const prodModal = document.getElementById('product-modal');
  const prodClose = document.getElementById('product-modal-close');
  if (prodClose && prodModal) {
    prodClose.onclick = () => prodModal.classList.remove('open');
  }

  // Checkout closing setup
  const chModal = document.getElementById('checkout-modal');
  const chClose = document.getElementById('checkout-modal-close');
  if (chClose && chModal) {
    chClose.onclick = () => chModal.classList.remove('open');
  }

  // Checkout submit handler
  const chForm = document.getElementById('checkout-form');
  if (chForm) {
    chForm.onsubmit = handleCheckoutSubmit;
  }
}

async function fetchCatalog(keyword = '', category = '') {
  const grid = document.getElementById('product-grid-container');
  if (!grid) return;

  try {
    let url = `${API_BASE}/products?`;
    if (keyword) url += `keyword=${encodeURIComponent(keyword)}&`;
    if (category) url += `category=${encodeURIComponent(category)}`;

    const res = await fetch(url);
    const data = await res.json();

    if (res.ok) {
      catalogProducts = data;
      renderCatalogGrid(data);
    } else {
      grid.innerHTML = `<p class="text-center" style="grid-column: 1/-1; color: var(--danger);">${data.message || 'Error loading catalog'}</p>`;
    }
  } catch (err) {
    grid.innerHTML = `<p class="text-center" style="grid-column: 1/-1; color: var(--danger);">Unable to connect to Server API</p>`;
  }
}

function renderCatalogGrid(products) {
  const grid = document.getElementById('product-grid-container');
  if (!grid) return;

  if (products.length === 0) {
    grid.innerHTML = `
      <div class="text-center" style="grid-column: 1 / -1; padding: 60px 0; color: var(--text-secondary);">
        <i class="fa-solid fa-box-open" style="font-size: 40px; margin-bottom: 12px; color: var(--text-muted);"></i>
        <p>No products match your search filters.</p>
      </div>
    `;
    return;
  }

  grid.innerHTML = products.map(product => {
    const hasStock = product.countInStock > 0;
    return `
      <div class="product-card">
        <div class="product-card-image" onclick="showProductDetails('${product._id}')" style="cursor: pointer;">
          <img src="${product.image}" alt="${product.name}">
        </div>
        <div class="product-card-body">
          <div class="product-category">${product.category}</div>
          <div class="product-name" onclick="showProductDetails('${product._id}')" style="cursor: pointer;">${product.name}</div>
          <div class="product-description">${product.description}</div>
          <div class="product-footer">
            <div>
              <div class="product-price">$${product.price.toFixed(2)}</div>
              <span class="stock-tag ${hasStock ? 'in-stock' : 'out-of-stock'}">
                ${hasStock ? `${product.countInStock} available` : 'Out of Stock'}
              </span>
            </div>
            <button class="btn btn-primary btn-sm" onclick="handleAddToCartClick('${product._id}')" ${!hasStock ? 'disabled' : ''}>
              <i class="fa-solid fa-cart-plus"></i> Add
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function handleAddToCartClick(productId) {
  const product = catalogProducts.find(p => p._id === productId);
  if (product) {
    addToCart(product);
  }
}

function showProductDetails(productId) {
  const product = catalogProducts.find(p => p._id === productId);
  if (!product) return;

  const modalBody = document.getElementById('product-detail-modal-body');
  const modal = document.getElementById('product-modal');
  const hasStock = product.countInStock > 0;

  modalBody.innerHTML = `
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 32px;">
      <div style="border-radius: var(--border-radius-md); overflow:hidden; background:#1e293b; max-height: 380px;">
        <img src="${product.image}" alt="${product.name}" style="width:100%; height:100%; object-fit:cover;">
      </div>
      <div style="display:flex; flex-direction:column; justify-content:center;">
        <span style="color:var(--accent-primary); font-weight:700; text-transform:uppercase; letter-spacing:1px; font-size:13px; margin-bottom:8px;">${product.category}</span>
        <h2 style="font-family:var(--font-display); font-size:28px; line-height:1.3; margin-bottom:16px;">${product.name}</h2>
        <span style="color:var(--text-muted); font-size:14px; margin-bottom:16px;">Brand: <strong>${product.brand}</strong></span>
        <p style="color:var(--text-secondary); margin-bottom:24px;">${product.description}</p>
        
        <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:24px; border-top:1px solid var(--border-color); padding-top:20px;">
          <div>
            <span style="font-size:14px; color:var(--text-muted);">Unit Price</span>
            <div style="font-family:var(--font-display); font-size:32px; font-weight:800; color:var(--text-primary);">$${product.price.toFixed(2)}</div>
          </div>
          <div>
            <span class="stock-tag ${hasStock ? 'in-stock' : 'out-of-stock'}" style="font-size:13px; padding:6px 12px;">
              ${hasStock ? `${product.countInStock} items in stock` : 'Out of Stock'}
            </span>
          </div>
        </div>

        <button class="btn btn-primary btn-block" onclick="handleAddToCartClick('${product._id}'); document.getElementById('product-modal').classList.remove('open');" ${!hasStock ? 'disabled' : ''}>
          <i class="fa-solid fa-shopping-cart"></i> Add Item to Shopping Bag
        </button>
      </div>
    </div>
  `;

  modal.classList.add('open');
}

// ==========================================
// 4. CHECKOUT MODAL LOGIC
// ==========================================

function openCheckoutModal() {
  const modal = document.getElementById('checkout-modal');
  const priceText = document.getElementById('checkout-total-price');
  
  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
  
  if (priceText) priceText.textContent = `$${subtotal.toFixed(2)}`;
  if (modal) modal.classList.add('open');
}

async function handleCheckoutSubmit(e) {
  e.preventDefault();
  
  const address = document.getElementById('checkout-address').value;
  const city = document.getElementById('checkout-city').value;
  const postalCode = document.getElementById('checkout-postal').value;
  const country = document.getElementById('checkout-country').value;
  const paymentMethod = document.getElementById('checkout-payment').value;

  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);

  const orderPayload = {
    orderItems: cart.map(item => ({
      product: item.product,
      name: item.name,
      qty: item.qty,
      image: item.image,
      price: item.price
    })),
    shippingAddress: { address, city, postalCode, country },
    paymentMethod,
    totalPrice: subtotal,
  };

  try {
    const res = await fetch(`${API_BASE}/orders`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(orderPayload)
    });

    const data = await res.json();

    if (res.ok) {
      alert('Order Placed Successfully! Simulating payment capture...');
      cart = [];
      saveCart();
      updateCartUI();
      document.getElementById('checkout-modal').classList.remove('open');
      window.location.href = 'dashboard.html';
    } else {
      alert(`Checkout failed: ${data.message}`);
    }
  } catch (err) {
    alert('Network error connecting to payment gateway APIs');
  }
}

// ==========================================
// 5. CUSTOMER DASHBOARD - ORDER TIMELINES
// ==========================================

async function initDashboardPage() {
  if (!user) {
    window.location.href = 'login.html';
    return;
  }

  document.getElementById('dashboard-user-name').textContent = user.name;
  document.getElementById('dashboard-user-email').textContent = user.email;

  await fetchUserOrders();
}

async function fetchUserOrders() {
  const container = document.getElementById('order-list-container');
  if (!container) return;

  try {
    const res = await fetch(`${API_BASE}/orders/myorders`, {
      headers: getAuthHeaders()
    });
    
    const data = await res.json();

    if (res.ok) {
      renderDashboardOrders(data);
    } else {
      container.innerHTML = `<div class="glass-card text-center text-danger">${data.message || 'Error retrieving order history'}</div>`;
    }
  } catch (err) {
    container.innerHTML = '<div class="glass-card text-center text-danger">Server connection error</div>';
  }
}

function renderDashboardOrders(orders) {
  const container = document.getElementById('order-list-container');
  if (!container) return;

  if (orders.length === 0) {
    container.innerHTML = `
      <div class="glass-card text-center" style="padding: 48px; color: var(--text-secondary);">
        <i class="fa-solid fa-receipt" style="font-size: 48px; color: var(--text-muted); margin-bottom:16px;"></i>
        <p>You haven't placed any orders yet.</p>
        <a href="index.html" class="btn btn-primary btn-sm mt-4">Start Shopping</a>
      </div>
    `;
    return;
  }

  container.innerHTML = orders.map(order => {
    const formattedDate = new Date(order.createdAt).toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric'
    });
    
    // Timeline steps layout
    // Steps: Placed, Processed, Shipped, Delivered
    let progressWidth = '0%';
    let step1Class = 'completed'; // Placed is always completed
    let step2Class = '';
    let step3Class = '';
    let step4Class = '';

    if (order.status === 'Pending') {
      progressWidth = '33%';
      step2Class = 'active';
    } else if (order.status === 'Shipped') {
      progressWidth = '66%';
      step2Class = 'completed';
      step3Class = 'active';
    } else if (order.status === 'Delivered') {
      progressWidth = '100%';
      step2Class = 'completed';
      step3Class = 'completed';
      step4Class = 'completed';
    } else if (order.status === 'Cancelled') {
      step1Class = 'cancelled';
    }

    const itemsHTML = order.orderItems.map(item => `
      <div class="order-card-item">
        <div class="order-card-item-info">
          <img src="${item.image}" alt="${item.name}" class="order-card-item-img">
          <div>
            <div style="font-weight:600;">${item.name}</div>
            <div style="font-size:12px; color:var(--text-secondary);">$${item.price.toFixed(2)} each</div>
          </div>
        </div>
        <div class="order-card-item-qty">Qty: ${item.qty}</div>
      </div>
    `).join('');

    return `
      <div class="order-card">
        <div class="order-card-header">
          <div class="order-meta-item">
            <div class="order-meta-label">Order ID</div>
            <div class="order-meta-value" style="font-family:monospace; color:var(--accent-secondary); font-size:14px;">#${order._id}</div>
          </div>
          <div class="order-meta-item">
            <div class="order-meta-label">Date Placed</div>
            <div class="order-meta-value">${formattedDate}</div>
          </div>
          <div class="order-meta-item">
            <div class="order-meta-label">Total Cost</div>
            <div class="order-meta-value" style="color:var(--text-primary);">$${order.totalPrice.toFixed(2)}</div>
          </div>
          <div class="order-meta-item">
            <div class="order-meta-label">Status</div>
            <span class="status-badge status-${order.status.toLowerCase()}">${order.status}</span>
          </div>
        </div>
        
        <div class="order-card-body">
          <div class="order-card-items">
            ${itemsHTML}
          </div>
          
          <div style="border-top: 1px solid var(--border-color); padding-top:20px; margin-top:20px;">
            <div style="font-size:13px; font-weight:600; color:var(--text-secondary); margin-bottom:8px;"><i class="fa-solid fa-truck-ramp-box"></i> Shipping Destination:</div>
            <p style="font-size:14px; color:var(--text-secondary);">${order.shippingAddress.address}, ${order.shippingAddress.city}, ${order.shippingAddress.postalCode}, ${order.shippingAddress.country}</p>
          </div>

          <!-- Fulfillment Timeline Graphic -->
          ${order.status !== 'Cancelled' ? `
            <div class="tracking-timeline">
              <div class="timeline-progress" style="width: ${progressWidth};"></div>
              
              <div class="timeline-step ${step1Class}">
                <div class="timeline-dot"><i class="fa-solid fa-receipt"></i></div>
                <div class="timeline-label">Placed</div>
              </div>
              <div class="timeline-step ${step2Class}">
                <div class="timeline-dot"><i class="fa-solid fa-gears"></i></div>
                <div class="timeline-label">Processed</div>
              </div>
              <div class="timeline-step ${step3Class}">
                <div class="timeline-dot"><i class="fa-solid fa-truck-fast"></i></div>
                <div class="timeline-label">Shipped</div>
              </div>
              <div class="timeline-step ${step4Class}">
                <div class="timeline-dot"><i class="fa-solid fa-house-chimney-check"></i></div>
                <div class="timeline-label">Delivered</div>
              </div>
            </div>
          ` : `
            <div style="background: rgba(239,68,68,0.05); border: 1px dashed rgba(239,68,68,0.2); padding: 16px; border-radius: var(--border-radius-md); text-align: center; margin-top: 24px; color: var(--danger);">
              <i class="fa-solid fa-ban"></i> This order was cancelled. Inventory stocks have been adjusted back.
            </div>
          `}
        </div>
      </div>
    `;
  }).join('');
}

// ==========================================
// 6. ADMIN DASHBOARD & INVENTORY CONTROL
// ==========================================

let adminProducts = [];
let adminOrders = [];

function initAdminPage() {
  if (!user || user.role !== 'admin') {
    alert('Access Denied. Administrator credentials required.');
    window.location.href = 'index.html';
    return;
  }

  const productsTab = document.getElementById('tab-products-btn');
  const ordersTab = document.getElementById('tab-orders-btn');
  const productsSec = document.getElementById('admin-products-section');
  const ordersSec = document.getElementById('admin-orders-section');

  // Tab controllers
  if (productsTab && ordersTab) {
    productsTab.onclick = () => {
      productsTab.classList.add('active');
      ordersTab.classList.remove('active');
      productsSec.classList.remove('hidden');
      ordersSec.classList.add('hidden');
      fetchAdminProducts();
    };

    ordersTab.onclick = () => {
      ordersTab.classList.add('active');
      productsTab.classList.remove('active');
      ordersSec.classList.remove('hidden');
      productsSec.classList.add('hidden');
      fetchAdminOrders();
    };
  }

  // Add Product modal setup
  const addBtn = document.getElementById('admin-add-product-btn');
  const formModal = document.getElementById('product-form-modal');
  const closeFormBtn = document.getElementById('product-form-modal-close');
  const productForm = document.getElementById('product-form');

  if (addBtn) {
    addBtn.onclick = () => {
      document.getElementById('product-form-title').textContent = 'Register Product';
      productForm.reset();
      document.getElementById('form-product-id').value = '';
      formModal.classList.add('open');
    };
  }

  if (closeFormBtn) {
    closeFormBtn.onclick = () => formModal.classList.remove('open');
  }

  if (productForm) {
    productForm.onsubmit = handleProductFormSubmit;
  }

  // Load products initially
  fetchAdminProducts();
}

async function fetchAdminProducts() {
  const tbody = document.getElementById('admin-products-table-body');
  if (!tbody) return;

  try {
    const res = await fetch(`${API_BASE}/products`);
    const data = await res.json();

    if (res.ok) {
      adminProducts = data;
      renderAdminProductsTable(data);
    } else {
      tbody.innerHTML = `<tr><td colspan="6" class="text-center text-danger">${data.message || 'Error loading products'}</td></tr>`;
    }
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="6" class="text-center text-danger">Server API connection error</td></tr>`;
  }
}

function renderAdminProductsTable(products) {
  const tbody = document.getElementById('admin-products-table-body');
  if (!tbody) return;

  if (products.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="text-center">No products found. Add one above!</td></tr>`;
    return;
  }

  tbody.innerHTML = products.map(product => `
    <tr>
      <td>
        <img src="${product.image}" alt="${product.name}" style="width: 50px; height: 50px; object-fit: cover; border-radius:4px; border:1px solid var(--border-color);">
      </td>
      <td style="font-weight:600;">${product.name}</td>
      <td>${product.category}</td>
      <td style="font-family:monospace; font-weight:700;">$${product.price.toFixed(2)}</td>
      <td style="font-weight:600; color: ${product.countInStock > 0 ? 'var(--success)' : 'var(--danger)'};">${product.countInStock}</td>
      <td>
        <div class="table-actions" style="justify-content: flex-end;">
          <button class="btn btn-secondary btn-sm" onclick="editProduct('${product._id}')"><i class="fa-solid fa-pen-to-square"></i></button>
          <button class="btn btn-danger btn-sm" onclick="deleteProduct('${product._id}')"><i class="fa-solid fa-trash"></i></button>
        </div>
      </td>
    </tr>
  `).join('');
}

async function handleProductFormSubmit(e) {
  e.preventDefault();
  
  const id = document.getElementById('form-product-id').value;
  const name = document.getElementById('form-product-name').value;
  const price = parseFloat(document.getElementById('form-product-price').value);
  const countInStock = parseInt(document.getElementById('form-product-stock').value);
  const image = document.getElementById('form-product-image').value;
  const category = document.getElementById('form-product-category').value;
  const brand = document.getElementById('form-product-brand').value;
  const description = document.getElementById('form-product-description').value;

  const payload = { name, price, countInStock, image, category, brand, description };

  const isEdit = id !== '';
  const url = isEdit ? `${API_BASE}/products/${id}` : `${API_BASE}/products`;
  const method = isEdit ? 'PUT' : 'POST';

  try {
    const res = await fetch(url, {
      method: method,
      headers: getAuthHeaders(),
      body: JSON.stringify(payload)
    });

    const data = await res.json();

    if (res.ok) {
      document.getElementById('product-form-modal').classList.remove('open');
      fetchAdminProducts();
    } else {
      alert(`Save failed: ${data.message}`);
    }
  } catch (err) {
    alert('Server connection error during update');
  }
}

function editProduct(productId) {
  const product = adminProducts.find(p => p._id === productId);
  if (!product) return;

  document.getElementById('product-form-title').textContent = 'Modify Product';
  document.getElementById('form-product-id').value = product._id;
  document.getElementById('form-product-name').value = product.name;
  document.getElementById('form-product-price').value = product.price;
  document.getElementById('form-product-stock').value = product.countInStock;
  document.getElementById('form-product-image').value = product.image;
  document.getElementById('form-product-category').value = product.category;
  document.getElementById('form-product-brand').value = product.brand;
  document.getElementById('form-product-description').value = product.description;

  document.getElementById('product-form-modal').classList.add('open');
}

async function deleteProduct(productId) {
  if (!confirm('Are you sure you want to delete this product catalog entry?')) return;

  try {
    const res = await fetch(`${API_BASE}/products/${productId}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });

    if (res.ok) {
      fetchAdminProducts();
    } else {
      const data = await res.json();
      alert(`Delete failed: ${data.message}`);
    }
  } catch (err) {
    alert('Server connection error during deletion');
  }
}

async function fetchAdminOrders() {
  const tbody = document.getElementById('admin-orders-table-body');
  if (!tbody) return;

  try {
    const res = await fetch(`${API_BASE}/orders`, {
      headers: getAuthHeaders()
    });
    const data = await res.json();

    if (res.ok) {
      adminOrders = data;
      renderAdminOrdersTable(data);
    } else {
      tbody.innerHTML = `<tr><td colspan="6" class="text-center text-danger">${data.message || 'Error loading orders'}</td></tr>`;
    }
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="6" class="text-center text-danger">Server API connection error</td></tr>`;
  }
}

function renderAdminOrdersTable(orders) {
  const tbody = document.getElementById('admin-orders-table-body');
  if (!tbody) return;

  if (orders.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="text-center">No purchases recorded yet.</td></tr>`;
    return;
  }

  tbody.innerHTML = orders.map(order => {
    const formattedDate = new Date(order.createdAt).toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric'
    });

    return `
      <tr>
        <td style="font-family:monospace; color:var(--accent-secondary); font-size:13px;">#${order._id}</td>
        <td>
          <div style="font-weight:600;">${order.user ? order.user.name : 'Unknown User'}</div>
        </td>
        <td>${formattedDate}</td>
        <td style="font-family:monospace; font-weight:700;">$${order.totalPrice.toFixed(2)}</td>
        <td>
          <div class="select-wrapper" style="display:inline-block;">
            <select style="padding: 6px 32px 6px 12px; font-size: 13px; border-radius: 4px;" onchange="updateOrderStatus('${order._id}', this.value)">
              <option value="Pending" ${order.status === 'Pending' ? 'selected' : ''}>Pending</option>
              <option value="Shipped" ${order.status === 'Shipped' ? 'selected' : ''}>Shipped</option>
              <option value="Delivered" ${order.status === 'Delivered' ? 'selected' : ''}>Delivered</option>
              <option value="Cancelled" ${order.status === 'Cancelled' ? 'selected' : ''}>Cancelled</option>
            </select>
          </div>
        </td>
        <td>
          <div class="table-actions" style="justify-content: flex-end;">
            <button class="btn btn-secondary btn-sm" onclick="showAdminOrderDetail('${order._id}')"><i class="fa-solid fa-circle-info"></i> Details</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

async function updateOrderStatus(orderId, newStatus) {
  try {
    const res = await fetch(`${API_BASE}/orders/${orderId}/status`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ status: newStatus })
    });

    if (!res.ok) {
      const data = await res.json();
      alert(`Failed to update status: ${data.message}`);
      fetchAdminOrders();
    }
  } catch (err) {
    alert('Server connection error during status update');
  }
}

function showAdminOrderDetail(orderId) {
  const order = adminOrders.find(o => o._id === orderId);
  if (!order) return;

  alert(`
  --- ORDER DETAILS (#${order._id}) ---
  Customer: ${order.user ? order.user.name : 'N/A'}
  Payment Method: ${order.paymentMethod}
  Status: ${order.status}
  
  Delivery Address:
  ${order.shippingAddress.address}, ${order.shippingAddress.city}, ${order.shippingAddress.postalCode}, ${order.shippingAddress.country}
  
  Items Ordered:
  ${order.orderItems.map(item => `- ${item.name} (Qty: ${item.qty}) - $${item.price.toFixed(2)}`).join('\n')}
  
  Order Total: $${order.totalPrice.toFixed(2)}
  `);
}
