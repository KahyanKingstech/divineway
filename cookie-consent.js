(function () {
  if (localStorage.getItem('dw_cookie_consent')) return;

  const banner = document.createElement('div');
  banner.id = 'dw-cookie-banner';
  banner.innerHTML = `
    <div class="dw-cc-inner">
      <p class="dw-cc-text">
        We use essential cookies to keep you logged in and save your cart.
        No tracking or advertising cookies are used.
        <a href="cookie-policy.html">Learn more</a>
      </p>
      <div class="dw-cc-actions">
        <a href="cookie-policy.html" class="dw-cc-link">Cookie Policy</a>
        <button class="dw-cc-btn" id="dw-cc-accept">Accept</button>
      </div>
    </div>`;

  const style = document.createElement('style');
  style.textContent = `
    #dw-cookie-banner {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      z-index: 99999;
      background: rgba(8, 6, 4, 0.97);
      border-top: 1px solid rgba(201, 168, 76, 0.2);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      padding: 14px 20px;
      animation: dw-cc-slide 0.35s ease;
    }
    @keyframes dw-cc-slide {
      from { transform: translateY(100%); opacity: 0; }
      to   { transform: translateY(0);    opacity: 1; }
    }
    .dw-cc-inner {
      max-width: 1100px;
      margin: 0 auto;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 20px;
      flex-wrap: wrap;
    }
    .dw-cc-text {
      margin: 0;
      font-family: 'Inter', sans-serif;
      font-size: 12.5px;
      font-weight: 300;
      color: rgba(247, 240, 227, 0.55);
      line-height: 1.6;
      flex: 1;
      min-width: 220px;
    }
    .dw-cc-text a {
      color: rgba(201, 168, 76, 0.7);
      text-decoration: underline;
      text-underline-offset: 2px;
    }
    .dw-cc-text a:hover { color: #c9a84c; }
    .dw-cc-actions {
      display: flex;
      align-items: center;
      gap: 16px;
      flex-shrink: 0;
    }
    .dw-cc-link {
      font-family: 'Inter', sans-serif;
      font-size: 11.5px;
      font-weight: 300;
      color: rgba(201, 168, 76, 0.5);
      text-decoration: none;
      letter-spacing: 0.06em;
    }
    .dw-cc-link:hover { color: #c9a84c; }
    .dw-cc-btn {
      font-family: 'Inter', sans-serif;
      font-size: 11.5px;
      font-weight: 400;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: #080604;
      background: #c9a84c;
      border: none;
      border-radius: 3px;
      padding: 8px 20px;
      cursor: pointer;
      transition: background 0.2s;
    }
    .dw-cc-btn:hover { background: #dbbe6a; }
    @media (max-width: 480px) {
      .dw-cc-inner { flex-direction: column; align-items: flex-start; gap: 12px; }
    }`;

  document.head.appendChild(style);
  document.body.appendChild(banner);

  document.getElementById('dw-cc-accept').addEventListener('click', function () {
    localStorage.setItem('dw_cookie_consent', '1');
    banner.style.transition = 'opacity 0.3s, transform 0.3s';
    banner.style.opacity = '0';
    banner.style.transform = 'translateY(100%)';
    setTimeout(() => banner.remove(), 320);
  });
})();
