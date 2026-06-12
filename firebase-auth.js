import { initializeApp }        from "https://www.gstatic.com/firebasejs/11.0.0/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged }
                                from "https://www.gstatic.com/firebasejs/11.0.0/firebase-auth.js";
import { getFirestore, collection, addDoc, query, where, getDocs, orderBy }
                                from "https://www.gstatic.com/firebasejs/11.0.0/firebase-firestore.js";

// ── Config ────────────────────────────────────────────────────────
const firebaseConfig = {
  apiKey:            "AIzaSyDHNFlm85dKmhIQ6QpBJWWzWRY3IKC5Lfk",
  authDomain:        "divineway-fengshui.firebaseapp.com",
  projectId:         "divineway-fengshui",
  storageBucket:     "divineway-fengshui.firebasestorage.app",
  messagingSenderId: "381968054901",
  appId:             "1:381968054901:web:44952e05aad9c21df7163c",
};

const app  = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db   = getFirestore(app);

// ── Current user (reactive) ───────────────────────────────────────
export let currentUser = null;

onAuthStateChanged(auth, user => {
  currentUser = user;
  window.__currentUser = user;
  window.__authReady = true;
  if (user) {
    const initials = user.displayName
      ? user.displayName.split(' ').filter(Boolean).map(w => w[0]).join('').toUpperCase()
      : 'Me';
    localStorage.setItem('dw_auth_initials', initials);
    localStorage.setItem('dw_auth_avatar', user.photoURL || '');
    syncErpCustomer(user).then(() => processPendingInvoice());
  } else {
    localStorage.removeItem('dw_auth_initials');
    localStorage.removeItem('dw_auth_avatar');
    localStorage.removeItem('dw_erp_customer');
  }
  updateAuthUI(user);
});

// ── Sign in / out ─────────────────────────────────────────────────
export async function signInWithGoogle() {
  const provider = new GoogleAuthProvider();
  try {
    await signInWithPopup(auth, provider);
  } catch (err) {
    console.error('Google sign-in failed:', err);
    throw err;
  }
}

export async function signOutUser() {
  await signOut(auth);
}

// ── Save order to Firestore ───────────────────────────────────────
export async function saveOrder({ items, total, sessionId }) {
  if (!currentUser) throw new Error('Not logged in');
  await addDoc(collection(db, 'orders'), {
    uid:       currentUser.uid,
    email:     currentUser.email,
    name:      currentUser.displayName,
    items,
    total,
    sessionId: sessionId || '',
    status:    'paid',
    createdAt: new Date().toISOString(),
  });
}

// ── Fetch orders for current user (from ERPNext Sales Invoice) ────
export async function fetchMyOrders() {
  if (!currentUser) return [];
  const customer = localStorage.getItem('dw_erp_customer');
  if (!customer) return [];
  const workerUrl = (window.ERPNEXT_CONFIG || {}).stripe_worker_url
    || 'https://divineway.kah-yan.workers.dev';
  const res = await fetch(
    `${workerUrl}/orders?customer=${encodeURIComponent(customer)}&uid=${encodeURIComponent(currentUser.uid)}`,
  );
  if (!res.ok) throw new Error(`Orders fetch failed (${res.status})`);
  const { orders = [] } = await res.json();
  return orders;
}

// ── Sync ERPNext customer on login ───────────────────────────────
async function syncErpCustomer(user) {
  try {
    const workerUrl = (window.ERPNEXT_CONFIG || {}).stripe_worker_url
      || 'https://divineway.kah-yan.workers.dev';
    const res = await fetch(`${workerUrl}/customer`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        uid:   user.uid,
        name:  user.displayName || '',
        email: user.email,
      }),
    });
    if (res.ok) {
      const { customer } = await res.json();
      if (customer) localStorage.setItem('dw_erp_customer', customer);
    }
  } catch (e) {
    console.warn('ERP customer sync failed:', e);
  }
}

// ── Process pending invoice after auth + customer sync ───────────
async function processPendingInvoice() {
  // order-success.html handles invoice creation itself
  if (window.location.pathname.includes('order-success')) return;
  const raw = localStorage.getItem('dw_pending_invoice');
  if (!raw) return;
  localStorage.removeItem('dw_pending_invoice');

  let items, total, sessionId;
  try { ({ items, total, sessionId } = JSON.parse(raw)); } catch { return; }

  try { await saveOrder({ items, total, sessionId }); }
  catch (e) { console.error('[DW] Firestore save failed:', e); }

  const customer = localStorage.getItem('dw_erp_customer');
  console.log('[DW] invoice: customer=', customer, 'items=', items, 'sessionId=', sessionId);
  if (!customer) { console.warn('[DW] invoice skipped — no dw_erp_customer'); return; }

  const workerUrl = (window.ERPNEXT_CONFIG || {}).stripe_worker_url
    || 'https://divineway.kah-yan.workers.dev';
  try {
    const res  = await fetch(`${workerUrl}/invoice`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ customer, items, sessionId }),
    });
    const data = await res.json();
    console.log('[DW] invoice response:', data);
    if (data.submitted && typeof window.loadProducts === 'function') {
      window.loadProducts(true); // bust=true: bypasses browser + Cloudflare cache cross-PoP
    }
  } catch (e) {
    console.error('[DW] invoice fetch error:', e);
  }
}

// ── Update nav UI based on auth state ────────────────────────────
function updateAuthUI(user) {
  const btn    = document.getElementById('auth-btn');
  const avatar = document.getElementById('auth-avatar');
  const nameEl = document.getElementById('auth-name');
  if (!btn) return;

  if (!user && localStorage.getItem('dw_auth_initials')) return;

  if (user) {
    avatar.src           = user.photoURL || '';
    avatar.style.display = user.photoURL ? 'block' : 'none';
    const initials = user.displayName
      ? user.displayName.split(' ').map(w => w[0]).join('').toUpperCase()
      : 'Account';
    nameEl.textContent = initials;
  } else {
    avatar.style.display = 'none';
    nameEl.textContent   = 'Login';
  }
}

// Expose to window for inline onclick handlers and non-module scripts
window.__signIn       = signInWithGoogle;
window.__signOut      = signOutUser;
window.__currentUser  = null;
window.saveOrder      = saveOrder;
window.fetchMyOrders  = fetchMyOrders;

// ── Orders modal (injected dynamically) ───────────────────────────
window.openOrdersModal = async function () {
  if (!document.getElementById('orders-modal')) {
    const el = document.createElement('div');
    el.className = 'orders-modal';
    el.id = 'orders-modal';
    el.onclick = e => { if (e.target === el) window.closeOrdersModal(); };
    el.innerHTML = `
      <div class="orders-panel">
        <h2>My Orders <button class="orders-close" onclick="window.closeOrdersModal()">×</button></h2>
        <div id="orders-list"><p class="orders-empty">Loading…</p></div>
      </div>`;
    document.body.appendChild(el);
  }
  document.getElementById('orders-modal').classList.add('open');
  try {
    const orders = await fetchMyOrders();
    const list = document.getElementById('orders-list');
    if (!orders.length) {
      list.innerHTML = '<p class="orders-empty">No orders yet.</p>';
      return;
    }
    list.innerHTML = orders.map(o => `
      <div class="order-card">
        <div class="order-card-header">
          <span class="order-date">${o.date || ''}</span>
          <span class="order-total">SGD $${Number(o.total || 0).toFixed(2)}</span>
        </div>
        <div class="order-ref">${o.name}</div>
        <div class="order-items">${(o.items || []).map(i => `${i.item_name} × ${i.qty}`).join('<br>')}</div>
        <span class="order-status order-status-${(o.status || '').toLowerCase().replace(/\s+/g,'-')}">${o.status || ''}</span>
      </div>`).join('');
  } catch {
    document.getElementById('orders-list').innerHTML = '<p class="orders-empty">Could not load orders.</p>';
  }
};

window.closeOrdersModal = function () {
  document.getElementById('orders-modal')?.classList.remove('open');
};