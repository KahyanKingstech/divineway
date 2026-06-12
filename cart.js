// Shared cart — persists in localStorage across all pages
const WA_NUMBER = '6589490437';
const WA_BASE   = `https://wa.me/${WA_NUMBER}`;

const cart = JSON.parse(localStorage.getItem('dw_cart') || '{}');

function saveCart()  { localStorage.setItem('dw_cart', JSON.stringify(cart)); }
function cartCount() { return Object.values(cart).reduce((s, i) => s + i.qty, 0); }
function cartTotal() { return Object.values(cart).reduce((s, i) => s + i.price * i.qty, 0); }

function stripeWorkerUrl() {
  return (window.ERPNEXT_CONFIG || {}).stripe_worker_url
    || 'https://divineway.kah-yan.workers.dev';
}

function updateCartBadge() {
  const badge = document.getElementById('cart-badge');
  if (!badge) return;
  const n = cartCount();
  badge.textContent = n;
  badge.style.display = n > 0 ? 'flex' : 'none';
}

function addToCart(sku, name, price, stripePriceId, btn, stock) {
  const currentQty = cart[sku] ? cart[sku].qty : 0;
  if (stock !== null && stock !== undefined && currentQty >= stock) {
    showToast(`Only ${stock} in stock — can't add more.`, 'error');
    return;
  }
  if (cart[sku]) {
    cart[sku].qty++;
  } else {
    cart[sku] = { name, price, stripePriceId: stripePriceId || null, qty: 1, stock: stock ?? null };
  }
  saveCart();
  updateCartBadge();
  if (btn) {
    btn.textContent = '✓ Added!';
    btn.style.background  = '#2a7a2a';
    btn.style.color       = '#fff';
    btn.style.borderColor = '#2a7a2a';
    setTimeout(() => {
      btn.textContent = 'Add to Cart';
      btn.style.background  = '';
      btn.style.color       = '';
      btn.style.borderColor = '';
    }, 1200);
  }
}

function openCart()  { document.getElementById('cart-drawer').style.display = 'flex'; renderCart(); }
function closeCart() { document.getElementById('cart-drawer').style.display = 'none'; }

function renderCart() {
  const body   = document.getElementById('cart-body');
  const footer = document.getElementById('cart-footer');
  if (!body || !footer) return;

  const items = Object.entries(cart);
  if (!items.length) {
    body.innerHTML   = '<p style="color:rgba(247,240,227,0.35);font-size:13px;font-family:sans-serif;text-align:center;padding:40px 0">Your cart is empty.</p>';
    footer.innerHTML = '';
    return;
  }

  body.innerHTML = items.map(([sku, i]) => `
    <div style="display:flex;justify-content:space-between;align-items:center;padding:12px 0;border-bottom:1px solid rgba(201,168,76,0.12);gap:10px">
      <div style="flex:1">
        <div style="font-size:12px;color:#f7f0e3;font-weight:500;font-family:sans-serif">${i.name}</div>
        <div style="font-size:11px;color:rgba(247,240,227,0.4);font-family:sans-serif;margin-top:2px">SGD $${i.price} × ${i.qty}</div>
      </div>
      <div style="display:flex;align-items:center;gap:8px">
        <button onclick="changeQty('${sku}',-1)" style="width:24px;height:24px;border:1px solid rgba(201,168,76,0.25);background:transparent;border-radius:3px;cursor:pointer;font-size:14px;color:rgba(201,168,76,0.8)">−</button>
        <span style="font-size:13px;font-family:sans-serif;min-width:16px;text-align:center;color:#f7f0e3">${i.qty}</span>
        <button onclick="changeQty('${sku}',1)" style="width:24px;height:24px;border:1px solid rgba(201,168,76,0.25);background:transparent;border-radius:3px;cursor:pointer;font-size:14px;color:rgba(201,168,76,0.8)">+</button>
        <button onclick="removeItem('${sku}')" style="width:24px;height:24px;border:none;background:none;cursor:pointer;font-size:16px;color:#c44">×</button>
      </div>
    </div>`).join('');

  footer.innerHTML = `
    <div style="display:flex;justify-content:space-between;padding:16px 0 10px;font-family:sans-serif">
      <span style="font-size:13px;color:#f7f0e3;font-weight:500;letter-spacing:.06em;text-transform:uppercase">Total</span>
      <span style="font-size:16px;color:#e2c26a;font-weight:700">SGD $${cartTotal()}</span>
    </div>
    <button id="stripe-checkout-btn" onclick="checkoutStripe(this)" style="width:100%;background:#635bff;color:#fff;border:none;padding:13px;border-radius:4px;font-size:12px;font-weight:700;font-family:sans-serif;cursor:pointer;letter-spacing:.06em;text-transform:uppercase">
      💳 Pay with Stripe
    </button>
    <p style="font-size:10px;color:rgba(247,240,227,0.3);font-family:sans-serif;text-align:center;margin-top:10px">Secure checkout — all major cards accepted</p>`;
}

function changeQty(sku, delta) {
  if (!cart[sku]) return;
  if (delta > 0) {
    const stock = cart[sku].stock;
    if (stock !== null && stock !== undefined && cart[sku].qty >= stock) {
      showToast(`Only ${stock} in stock.`, 'error');
      return;
    }
  }
  cart[sku].qty += delta;
  if (cart[sku].qty <= 0) delete cart[sku];
  saveCart();
  updateCartBadge();
  renderCart();
}

function removeItem(sku) {
  delete cart[sku];
  saveCart();
  updateCartBadge();
  renderCart();
}

async function checkoutStripe(btn) {
  if (!window.__authReady) {
    showToast('Still loading, please try again.', 'error');
    return;
  }
  if (!window.__currentUser) {
    showToast('Please log in to checkout.', 'error');
    const page = window.location.pathname.split('/').pop() || 'index.html';
    setTimeout(() => {
      if (typeof showLoginGate === 'function') showLoginGate();
      else window.location.href = 'login.html?returnUrl=' + encodeURIComponent(page);
    }, 1200);
    return;
  }

  const items = Object.entries(cart).map(([sku, i]) => ({ sku, ...i }));
  if (!items.length) return;

  btn.disabled    = true;
  btn.textContent = '⏳ Redirecting…';

  const dir        = window.location.href.replace(/[^/]*(\?.*)?$/, '');
  const successUrl = dir + 'order-success.html?session_id={CHECKOUT_SESSION_ID}';
  const cancelUrl  = dir + 'shop.html?checkout=cancel';

  try {
    const res = await fetch(`${stripeWorkerUrl()}/checkout`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        items: items.map(i => ({ name: i.name, price: i.price, qty: i.qty })),
        successUrl,
        cancelUrl,
      }),
    });
    const data = await res.json();
    if (data.url) {
      localStorage.setItem('pending_order', JSON.stringify({
        items,
        total: cartTotal(),
      }));
      window.location.href = data.url;
    } else {
      throw new Error(data.error || 'No checkout URL returned');
    }
  } catch (err) {
    btn.disabled    = false;
    btn.textContent = '💳 Pay with Stripe';
    showToast('Checkout failed: ' + err.message, 'error');
  }
}

function showToast(msg, type = 'success') {
  const toast = document.createElement('div');
  toast.textContent = msg;
  toast.style.cssText = [
    'position:fixed', 'bottom:32px', 'left:50%', 'transform:translateX(-50%)',
    'z-index:99999', 'padding:14px 28px', 'border-radius:6px',
    'font-size:13px', 'font-family:sans-serif', 'font-weight:500',
    'box-shadow:0 4px 24px rgba(0,0,0,0.4)', 'max-width:90vw', 'text-align:center',
    type === 'error'
      ? 'background:#7a1a00;color:#f7f0e3'
      : 'background:#1a4a1a;color:#d4f5d4',
  ].join(';');
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 4500);
}

document.addEventListener('DOMContentLoaded', updateCartBadge);
