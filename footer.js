(function () {
  const html = `
  <footer class="site-footer">
    <div class="footer-animated-bg">
      <svg viewBox="0 0 1200 320" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice">
        <defs>
          <radialGradient id="fg1" cx="20%" cy="50%" r="40%"><stop offset="0%" stop-color="#c9a84c" stop-opacity="0.1"/><stop offset="100%" stop-color="#c9a84c" stop-opacity="0"/></radialGradient>
          <radialGradient id="fg2" cx="80%" cy="50%" r="40%"><stop offset="0%" stop-color="#7a1a00" stop-opacity="0.14"/><stop offset="100%" stop-color="#7a1a00" stop-opacity="0"/></radialGradient>
          <filter id="fblur"><feGaussianBlur stdDeviation="28"/></filter>
        </defs>
        <rect width="1200" height="320" fill="transparent"/>
        <ellipse cx="200" cy="160" rx="260" ry="180" fill="url(#fg1)" filter="url(#fblur)"/>
        <ellipse cx="1000" cy="160" rx="260" ry="180" fill="url(#fg2)" filter="url(#fblur)"/>
        <line x1="0" y1="0" x2="1200" y2="0" stroke="#c9a84c" stroke-width="0.5" stroke-opacity="0.3"/>
        <g class="footer-trigrams" opacity="0.07">
          <text x="60"  y="180" font-family="Noto Serif SC,serif" font-size="120" fill="#c9a84c">道</text>
          <text x="980" y="200" font-family="Noto Serif SC,serif" font-size="100" fill="#c9a84c">德</text>
          <text x="530" y="260" font-family="Noto Serif SC,serif" font-size="80"  fill="#c9a84c">天</text>
        </g>
        <g opacity="0.12">
          <line x1="0" y1="160" x2="1200" y2="160" stroke="#c9a84c" stroke-width="0.3" stroke-dasharray="3 18"/>
        </g>
      </svg>
    </div>

    <div class="footer-inner">
      <div class="footer-top">
        <div class="footer-brand">
          <div class="footer-logo">
            <div class="footer-logo-icon">
              <img src="divineway_logo/divineway_logo.png" onerror="this.style.display='none';this.parentNode.innerHTML='<span style=\\'color:var(--gold);font-size:22px;font-family:var(--chinese)\\'>道</span>'">
            </div>
            <div>
              <div class="footer-wordmark">DivinewayFengshui</div>
              <div class="footer-tagline">风水 · 道家法术 · 符咒</div>
            </div>
          </div>
          <p class="footer-brand-desc">Authentic Taoist Feng Shui, BaZi consultations, and hand-consecrated talismans by Award-Winning Master Louis Cheung. Serving Singapore and clients worldwide since 2007.</p>
          <div class="footer-socials">
            <a class="fsocial" href="https://www.tiktok.com/@divinewayfengshui" target="_blank"><i class="ti ti-brand-tiktok" aria-hidden="true"></i></a>
            <a class="fsocial" href="https://www.instagram.com/divinewayinc/" target="_blank"><i class="ti ti-brand-instagram" aria-hidden="true"></i></a>
            <a class="fsocial" href="https://www.facebook.com/divinewaymagic" target="_blank"><i class="ti ti-brand-facebook" aria-hidden="true"></i></a>
            <a class="fsocial" href="https://www.youtube.com/@masterlouischeung" target="_blank"><i class="ti ti-brand-youtube" aria-hidden="true"></i></a>
          </div>
        </div>

        <div class="footer-col">
          <div class="footer-col-title">Services</div>
          <ul class="footer-links">
            <li><a href="services.html">BaZi Analysis</a></li>
            <li><a href="services.html">Feng Shui Audit</a></li>
            <li><a href="services.html">Talisman Consecration</a></li>
            <li><a href="services.html">Auspicious Date Selection</a></li>
            <li><a href="services.html">Name Analysis</a></li>
            <li><a href="services.html">Taoist Rituals</a></li>
          </ul>
        </div>

        <div class="footer-col">
          <div class="footer-col-title">Shop</div>
          <ul class="footer-links">
            <li><a href="shop.html">Wealth Talismans</a></li>
            <li><a href="shop.html">Health Talismans</a></li>
            <li><a href="shop.html">Relationship Talismans</a></li>
            <li><a href="shop.html">Protection Talismans</a></li>
            <li><a href="shop.html">Pregnancy Talismans</a></li>
            <li><a href="shop.html">Divine Items &amp; Books</a></li>
          </ul>
        </div>

        <div class="footer-col">
          <div class="footer-col-title">Contact</div>
          <ul class="footer-contact-list">
            <li>
              <i class="ti ti-brand-whatsapp" aria-hidden="true"></i>
              <a href="https://wa.me/6589490437" target="_blank">+65 8949 0437</a>
            </li>
            <li>
              <i class="ti ti-map-pin" aria-hidden="true"></i>
              <span>Singapore</span>
            </li>
            <li>
              <i class="ti ti-clock" aria-hidden="true"></i>
              <span>Mon – Sat, 10am – 7pm</span>
            </li>
            <li>
              <i class="ti ti-globe" aria-hidden="true"></i>
              <span>International consultations available</span>
            </li>
          </ul>
        </div>
      </div>

      <div class="footer-divider"></div>

      <div class="footer-bottom">
        <div class="footer-bottom-left">
          <span class="footer-seal">✦</span>
          <span>© 6 DivinewayFengshui. All rights reserved.</span>
          <span class="footer-seal">✦</span>
        </div>
        <div class="footer-bottom-right">
          <span>Crafted with reverence for the ancient arts</span>
          <span class="footer-chin">天地人和 · 道法自然</span>
        </div>
      </div>
    </div>
  </footer>`;

  document.currentScript.insertAdjacentHTML('afterend', html);
})();
