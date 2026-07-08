(function () {
  const page = location.pathname.split('/').pop() || 'index.html';
  const links = [
    ['index.html',   'Home'],
    ['shop.html',     'Shop'],
    ['services.html', 'Services'],
    ['about.html',    'About'],
    ['academy.html',  'Academy'],
    ['blog.html',     'Blog'],
    ['contact.html',  'Contact'],
  ];

  const linksHtml = links.map(([href, label]) =>
    `      <a href="${href}"${href === page ? ' class="nav-active"' : ''}>${label}</a>`
  ).join('\n');

  const authLabel   = localStorage.getItem('dw_auth_initials') || 'Login';
  const avatarSrc   = localStorage.getItem('dw_auth_avatar') || '';
  const avatarDisplay = avatarSrc ? 'block' : 'none';

  const html = `
  <nav class="nav" id="main-nav">
    <a href="index.html" class="nav-logo">
      <div class="nav-icon">
        <img src="images/divineway_logo.png" onerror="this.style.display='none';this.parentNode.innerHTML='<span style=&quot;font-family:var(--chinese);color:var(--gold);font-size:18px&quot;>道</span>'">
      </div>
      <div class="nav-wordmark">
        <strong>DivinewayFengshui</strong>
        <span>风水 · 道家法术 · 符咒</span>
      </div>
    </a>
    <div class="nav-links" id="nav-links">
${linksHtml}
    </div>
    <div class="nav-buttons">
      <button class="btn-wa" onclick="window.open('https://wa.me/6589490437?text=Hello%20Master%20Louis%2C%20I%20would%20like%20to%20make%20an%20enquiry.','_blank')"><i class="ti ti-brand-whatsapp"></i><span class="btn-wa-text"> WhatsApp Now</span></button>
      <button class="btn-cart" id="cart-btn" onclick="openCart()">
        🛒 <span class="btn-cart-text">Cart</span>
        <span id="cart-badge" style="display:none;position:absolute;top:-6px;right:-6px;background:#c0392b;color:#fff;border-radius:50%;width:18px;height:18px;font-size:10px;font-family:sans-serif;font-weight:700;align-items:center;justify-content:center;line-height:18px">0</span>
      </button>
      <button class="auth-btn" id="auth-btn" onclick="window.__currentUser ? (location.href='account.html') : (location.href='login.html?returnUrl='+encodeURIComponent(location.pathname.split('/').pop()||'index.html'))">
        <img class="auth-avatar" id="auth-avatar" src="${avatarSrc}" alt="" style="display:${avatarDisplay}">
        <span id="auth-name">${authLabel}</span>
      </button>
    </div>
    <button class="nav-hamburger" id="nav-hamburger" aria-label="Toggle menu">
      <span></span><span></span><span></span>
    </button>
  </nav>`;

  document.currentScript.insertAdjacentHTML('afterend', html);

  const hamburger = document.getElementById('nav-hamburger');
  const nav = document.getElementById('main-nav');
  if (hamburger && nav) {
    hamburger.addEventListener('click', function (e) {
      e.stopPropagation();
      nav.classList.toggle('nav-open');
    });
    document.getElementById('nav-links').querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function () { nav.classList.remove('nav-open'); });
    });
    document.addEventListener('click', function (e) {
      if (!nav.contains(e.target)) nav.classList.remove('nav-open');
    });
  }
})();
