/* ========================= MAIN JS ========================= */

// 1) CONTACT MODAL (popup form) + Telegram submit + localized redirect
(function(){
  const modal = document.getElementById('contact-modal');
  if(!modal) return; // safety if markup is missing

  const html = document.documentElement;
  const body = document.body;
  const closeSelectors = '[data-close-modal], .modal__overlay, .modal__close';

  const open = () => {
    modal.classList.add('is-open');
    html.classList.add('has-modal');
    body.classList.add('has-modal');
    modal.setAttribute('aria-hidden','false');
    modal.setAttribute('aria-modal','true');
    // focus first interactive element for a11y
    const first = modal.querySelector('input, textarea, button');
    if(first) try{ first.focus({preventScroll:true}); }catch(_){}
  };

  const close = () => {
    modal.classList.remove('is-open');
    html.classList.remove('has-modal');
    body.classList.remove('has-modal');
    modal.setAttribute('aria-hidden','true');
    modal.setAttribute('aria-modal','false');
  };

  // --- Telegram config (fill these before deploy if empty) ---
  const TG_TOKEN   = '6793718495:AAHTN5TuxmYEjXOT9XlyWFQtaxfrRIxBhMM';
  const TG_CHAT_ID = '-1002014034919';

  // i18n helper
  const LANG = (document.documentElement.getAttribute('lang')||'uk').toLowerCase();
  const T = (key) => ({
    uk: {
      fill: 'Будь ласка, заповніть усі поля.',
      sending: 'Відправляю…',
      sent: '✅ Заявку відправлено! Я відповім протягом дня.',
      fail: '❌ Помилка надсилання. Спробуйте ще раз.'
    },
    en: {
      fill: 'Please fill in all fields.',
      sending: 'Sending…',
      sent: '✅ Request sent! I will reply within a day.',
      fail: '❌ Sending failed. Please try again.'
    },
    de: {
      fill: 'Bitte füllen Sie alle Felder aus.',
      sending: 'Senden…',
      sent: '✅ Anfrage gesendet! Ich antworte innerhalb eines Tages.',
      fail: '❌ Senden fehlgeschlagen. Bitte versuchen Sie es erneut.'
    }
  }[LANG]||{} )[key] || key;

  // --- Minimal toast helper (custom confirmation window) ---
  function toast(message, variant = 'success', timeout = 2600){
    let root = document.getElementById('toast-root');
    if(!root){
      root = document.createElement('div');
      root.id = 'toast-root';
      root.setAttribute('aria-live','polite');
      root.setAttribute('aria-atomic','true');
      document.body.appendChild(root);
    }
    const el = document.createElement('div');
    el.className = `toast toast--${variant}`;
    el.setAttribute('role','status');
    el.innerHTML = message;
    root.appendChild(el);
    // show
    requestAnimationFrame(() => el.classList.add('toast--show'));
    // hide
    setTimeout(() => {
      el.classList.remove('toast--show');
      setTimeout(() => el.remove(), 260);
    }, timeout);
  }

  // Open on any CTA that links to #contacts (your current buttons) or has .open-contact
  document.querySelectorAll('a[href="#contacts"], .open-contact').forEach(el => {
    el.addEventListener('click', (e) => {
      // If link is inside a case card and should open external site — ignore
      const external = el.hasAttribute('target') || /^https?:/i.test(el.getAttribute('href')||'');
      if(external) return;
      e.preventDefault();
      open();
    });
  });

  // Close via overlay / close buttons
  modal.addEventListener('click', (e) => {
    if(e.target.matches(closeSelectors)) close();
  });
  window.addEventListener('keydown', (e) => {
    if(e.key === 'Escape' && modal.classList.contains('is-open')) close();
  });

  // Simple client-side validation + Telegram submit
  const form = document.getElementById('contact-form');
  if(form){
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const data = new FormData(form);
      const name = (data.get('name')||'').trim();
      const tg   = (data.get('telegram')||data.get('email')||'').trim();
      const msg  = (data.get('message')||'').trim();

      if(!name || !tg || !msg){
        toast(T('fill'), 'error', 2600);
        return;
      }

      // Disable submit UX
      const submitBtn = form.querySelector('.modal__actions .btn-gold');
      const submitOld = submitBtn ? submitBtn.textContent : '';
      if(submitBtn){ submitBtn.disabled = true; submitBtn.textContent = T('sending'); }

      const text = [
        '📩 Нове звернення з сайту',
        `🌐 Мова: ${LANG.toUpperCase()}`,
        `👤 Ім’я/Name: ${name}`,
        `💬 Telegram/Email: ${tg}`,
        '',
        `📝 Повідомлення/Message:`,
        msg
      ].join('\n');

      try{
        if(!TG_TOKEN || !TG_CHAT_ID) throw new Error('Telegram credentials are empty');
        const res = await fetch(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`,{
          method:'POST',
          headers:{ 'Content-Type':'application/json' },
          body: JSON.stringify({ chat_id: TG_CHAT_ID, text, parse_mode:'HTML' })
        });
        const json = await res.json();
        if(!json.ok) throw new Error(json.description||'Telegram API error');
        form.reset();
        // Redirect to localized thank-you page
        const thanks = LANG === 'en' ? 'en-thanks.html' : (LANG === 'de' ? 'de-thanks.html' : 'thanks.html');
        window.location.href = thanks;
      }catch(err){
        console.error('[Telegram send error]', err);
        toast(T('fail'), 'error', 3000);
      }finally{
        if(submitBtn){ submitBtn.disabled = false; submitBtn.textContent = submitOld || 'Send'; }
      }
    });
  }
})();

// 2) SMOOTH SCROLL for in-page anchors (excluding #contacts because we open modal)
(function(){
  const anchors = document.querySelectorAll('a[href^="#"]:not([href="#"]):not([href="#contacts"])');
  const header = document.querySelector('.site-header');
  const offset = header ? header.offsetHeight : 0;
  anchors.forEach(a => {
    a.addEventListener('click', (e) => {
      const id = a.getAttribute('href');
      const target = document.querySelector(id);
      if(!target) return;
      e.preventDefault();
      const top = target.getBoundingClientRect().top + window.scrollY - offset - 8; // small breathing room
      window.scrollTo({ top, behavior: 'smooth' });
    });
  });
})();

// 3) LANG DROPDOWN (robust open/close + a11y)
(function () {
  const lang = document.querySelector('.lang-switch');
  if (!lang) return;

  const btn  = lang.querySelector('button');
  const list = lang.querySelector('ul');
  if (!btn || !list) return;

  const open  = () => { lang.classList.add('open');  btn.setAttribute('aria-expanded','true');  };
  const close = () => { lang.classList.remove('open'); btn.setAttribute('aria-expanded','false'); };

  // toggle
  btn.type = 'button';
  const onBtnActivate = (e) => {
    if(e){ e.preventDefault(); }
    if (lang.classList.contains('open')) { close(); } else { open(); }
  };
  btn.addEventListener('click', onBtnActivate);
  btn.addEventListener('pointerdown', (e) => { /* mobile reliability */ onBtnActivate(e); });

  // close on outside click
  document.addEventListener('click', (e) => {
    if (!lang.contains(e.target)) close();
  });

  // close on Esc
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') close();
  });

  // close after choosing a language
  list.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', () => close());
  });
})();
/* ======================= END MAIN JS ======================= */

// 4) Responsive relocate of footer CTA (place after email on phones)
(function(){
  const MOBILE = window.matchMedia('(max-width:680px)');
  const contacts = document.querySelector('#contacts');
  if (!contacts) return;

  const imprint = contacts.querySelector('.imprint');           // right column
  const cta     = contacts.querySelector('.footer-cta');        // the button
  const emailEl = contacts.querySelector(
    '.contacts-grid .contact-a[href^="mailto"], ' +
    '.contacts-grid .contact-a[href*="@"] , ' +
    '.contacts-grid a[href^="mailto"], ' +
    '.contacts-grid a[href*="@"]'
  );

  if (!imprint || !cta || !emailEl) return;

  // Remember original place to restore on desktop
  const original = { parent: imprint, next: cta.nextElementSibling };

  function toMobile(){
    emailEl.insertAdjacentElement('afterend', cta);
    cta.classList.add('cta--mobile-in-left');
  }
  function toDesktop(){
    if (original.next && original.next.parentNode === original.parent){
      original.parent.insertBefore(cta, original.next);
    } else {
      original.parent.appendChild(cta);
    }
    cta.classList.remove('cta--mobile-in-left');
  }
  function apply(){ MOBILE.matches ? toMobile() : toDesktop(); }

  apply();
  MOBILE.addEventListener('change', apply);
})();
