(function () {
  const page = location.pathname.split('/').pop() || 'index.html';
  const links = [
    ['services.html', 'Services'],
    ['shop.html',     'Shop'],
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
  <nav class="nav">
    <a href="index.html" class="nav-logo">
      <div class="nav-icon">
        <img src="divineway_logo/divineway_logo.png" onerror="this.style.display='none';this.parentNode.innerHTML='<span style=&quot;font-family:var(--chinese);color:var(--gold);font-size:18px&quot;>道</span>'">
      </div>
      <div class="nav-wordmark">
        <strong>DivinewayFengshui</strong>
        <span>风水 · 道家法术 · 符咒</span>
      </div>
    </a>
    <div class="nav-links">
${linksHtml}
    </div>
    <div class="nav-buttons">
      <button class="btn-wa"><i class="ti ti-brand-whatsapp"></i> WhatsApp Now</button>
      <button class="btn-cart" id="cart-btn" onclick="openCart()">
        🛒 Cart
        <span id="cart-badge" style="display:none;position:absolute;top:-6px;right:-6px;background:#c0392b;color:#fff;border-radius:50%;width:18px;height:18px;font-size:10px;font-family:sans-serif;font-weight:700;align-items:center;justify-content:center;line-height:18px">0</span>
      </button>
      <button class="auth-btn" id="auth-btn" onclick="window.__currentUser ? (location.href='account.html') : (location.href='login.html?returnUrl='+encodeURIComponent(location.pathname.split('/').pop()||'index.html'))">
        <img class="auth-avatar" id="auth-avatar" src="${avatarSrc}" alt="" style="display:${avatarDisplay}">
        <span id="auth-name">${authLabel}</span>
      </button>
      </div>
  </nav>`;

  document.currentScript.insertAdjacentHTML('afterend', html);
})();
