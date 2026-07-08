(function () {
  const WA_CONSULT = 'https://wa.me/6589490437?text=Hello%20Master%20Louis%2C%20I%20would%20like%20a%20free%20consultation%20to%20find%20out%20which%20talisman%20suits%20me.';
  const html = `
  <div class="cta-sec" id="cta-area">
    <div class="sec-label" style="justify-content:center;margin-bottom:16px">Free Consultation</div>
    <h2>Not sure which talisman you need?</h2>
    <span class="cta-chin" style="display:block;font-family:'Noto Serif SC',serif;font-size:14px;color:rgba(201,168,76,0.6);letter-spacing:0.15em;margin-top:6px;margin-bottom:4px">不知选何符 · 请问师傅</span>
    <p>Let Master Louis Cheung personally recommend the right talisman based on your BaZi birth chart and current life situation.</p>
    <br><button class="hcta" onclick="window.open('${WA_CONSULT}','_blank')">Get a Free Consultation</button>
  </div>

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
              <img src="images/divineway_logo.png" onerror="this.style.display='none';this.parentNode.innerHTML='<span style=\\'color:var(--gold);font-size:22px;font-family:var(--chinese)\\'>道</span>'">
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
            <li><a href="services.html#bazi-analysis">BaZi Analysis</a></li>
            <li><a href="services.html#fengshui-audit">Feng Shui Audit</a></li>
            <li><a href="services.html#talisman-consecration">Talisman Consecration</a></li>
            <li><a href="services.html#auspicious-date">Auspicious Date Selection</a></li>
            <li><a href="services.html#name-analysis-selection">Name Analysis & Selection</a></li>
            <li><a href="services.html#taoist-rituals-ceremonies">Taoist Ritual Ceremonies</a></li>
          </ul>
        </div>

        <div class="footer-col">
          <div class="footer-col-title">Shop</div>
          <ul class="footer-links">
            <li><a href="shop.html?cat=Wealth">Wealth Talismans</a></li>
            <li><a href="shop.html?cat=Health">Health Talismans</a></li>
            <li><a href="shop.html?cat=Relationship">Relationship Talismans</a></li>
            <li><a href="shop.html?cat=General%20Protection">Protection Talismans</a></li>
            <li><a href="shop.html?cat=Pregnancy">Pregnancy Talismans</a></li>
            <li><a href="shop.html?cat=Divine%20Item">Divine Items</a></li>
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
              <a href="https://maps.app.goo.gl/AThpfabsJ6rMEJFY8" target="_blank">
                374 Joo Chiat Rd, Singapore 427619
              </a>
            </li>
            <li>
              <i class="ti ti-clock" aria-hidden="true"></i>
              <span>Mon – Sat, 11am – 8pm</span>
            </li>
          </ul>
        </div>
      </div>

      <div class="footer-legal">
        <a href="privacy-policy.html">Privacy Policy</a>
        <span class="footer-legal-sep">·</span>
        <a href="return-policy.html">Return &amp; Refund Policy</a>
        <span class="footer-legal-sep">·</span>
        <a href="cookie-policy.html">Cookie Policy</a>
      </div>

      <div class="footer-divider"></div>

      <div class="footer-bottom">
        <div class="footer-bottom-left">
          <span class="footer-seal">✦</span>
          <span>© 2026 DivinewayFengshui. All rights reserved.</span>
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

  // Load cookie consent banner on every page that uses this footer
  const cc = document.createElement('script');
  cc.src = 'cookie-consent.js';
  document.body.appendChild(cc);
})();
