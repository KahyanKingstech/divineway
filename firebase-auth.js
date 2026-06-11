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
  } else {
    localStorage.removeItem('dw_auth_initials');
    localStorage.removeItem('dw_auth_avatar');
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