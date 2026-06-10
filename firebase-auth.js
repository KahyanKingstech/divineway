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

// ── Fetch orders for current user ─────────────────────────────────
export async function fetchMyOrders() {
  if (!currentUser) return [];
  const q = query(
    collection(db, 'orders'),
    where('uid', '==', currentUser.uid),
    orderBy('createdAt', 'desc')
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

// ── Update nav UI based on auth state ────────────────────────────
function updateAuthUI(user) {
  const btn      = document.getElementById('auth-btn');
  const avatar   = document.getElementById('auth-avatar');
  const nameEl   = document.getElementById('auth-name');
  const dropdown = document.getElementById('auth-dropdown');
  if (!btn) return;

  if (user) {
    btn.style.display    = 'flex';
    avatar.src           = user.photoURL || '';
    avatar.style.display = user.photoURL ? 'block' : 'none';
    nameEl.textContent   = user.displayName?.split(' ')[0] || 'Account';
    dropdown.innerHTML   = `
      <div class="auth-user-info">
        <div class="auth-user-email">${user.email}</div>
      </div>
      <button class="auth-menu-item" onclick="openOrdersModal()">📦 My Orders</button>
      <button class="auth-menu-item auth-menu-signout" onclick="window.__signOut()">Sign Out</button>
    `;
  } else {
    btn.style.display  = 'flex';
    avatar.style.display = 'none';
    nameEl.textContent = 'Login';
    dropdown.innerHTML = `
      <div class="auth-signin-prompt">Sign in to track your orders</div>
      <button class="auth-menu-item auth-menu-google" onclick="window.__signIn()">
        <svg width="16" height="16" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
        Sign in with Google
      </button>
    `;
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
          <span class="order-date">${new Date(o.createdAt).toLocaleDateString()}</span>
          <span class="order-total">SGD $${o.total}</span>
        </div>
        <div class="order-items">${o.items.map(i => `${i.name} × ${i.qty}`).join('<br>')}</div>
        <span class="order-status">${o.status}</span>
      </div>`).join('');
  } catch {
    document.getElementById('orders-list').innerHTML = '<p class="orders-empty">Could not load orders.</p>';
  }
};

window.closeOrdersModal = function () {
  document.getElementById('orders-modal')?.classList.remove('open');
};