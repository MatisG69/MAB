/* ============================================
   MOVE AND BREATHE PILATES STUDIO
   Interactions + Premium animations
   © 2026 Mapa Développement
   ============================================ */

(function () {
  'use strict';

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isTouch = window.matchMedia('(hover: none), (pointer: coarse)').matches;

  /* ============================================
     NAV — scrolled state + scroll progress
     ============================================ */
  const nav = document.querySelector('.nav');
  const progress = document.createElement('div');
  progress.className = 'scroll-progress';
  document.body.appendChild(progress);

  if (nav) {
    const onScroll = () => {
      // Nav background state
      if (window.scrollY > 24) nav.classList.add('scrolled');
      else nav.classList.remove('scrolled');
      // Scroll progress bar
      const docH = document.documentElement.scrollHeight - window.innerHeight;
      const ratio = docH > 0 ? window.scrollY / docH : 0;
      progress.style.transform = `scaleX(${ratio})`;
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  /* ============================================
     NAV — burger menu (mobile)
     ============================================ */
  const burger = document.querySelector('.nav-burger');
  const navLinks = document.querySelector('.nav-links');
  if (burger && navLinks) {
    burger.addEventListener('click', () => {
      const isOpen = navLinks.classList.toggle('open');
      burger.classList.toggle('open');
      burger.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      document.body.style.overflow = isOpen ? 'hidden' : '';
    });
    navLinks.querySelectorAll('a').forEach((a) => {
      a.addEventListener('click', () => {
        navLinks.classList.remove('open');
        burger.classList.remove('open');
        burger.setAttribute('aria-expanded', 'false');
        document.body.style.overflow = '';
      });
    });
  }

  /* ============================================
     SPLIT TEXT — split into words/chars
     ============================================ */
  function splitText(el) {
    if (el.dataset.split) return; // already processed
    const text = el.textContent.trim();
    const words = text.split(/\s+/);
    el.innerHTML = words
      .map((w) => `<span class="word">${w}</span>`)
      .join(' ');
    el.dataset.split = '1';
  }

  // Process all .split-text elements
  document.querySelectorAll('.split-text').forEach(splitText);
  document.querySelectorAll('.scroll-reveal-text').forEach((el) => {
    // For scroll-reveal text, preserve <em> tags
    if (el.dataset.split) return;
    const parts = [];
    el.childNodes.forEach((node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent;
        const words = text.split(/(\s+)/);
        words.forEach((w) => {
          if (/^\s+$/.test(w)) parts.push(w);
          else if (w.length) parts.push(`<span class="word">${w}</span>`);
        });
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        const tag = node.tagName.toLowerCase();
        const text = node.textContent;
        const words = text.split(/(\s+)/);
        const inner = words
          .map((w) => {
            if (/^\s+$/.test(w)) return w;
            if (!w.length) return '';
            return `<span class="word">${w}</span>`;
          })
          .join('');
        parts.push(`<${tag}>${inner}</${tag}>`);
      }
    });
    el.innerHTML = parts.join('');
    el.dataset.split = '1';
  });

  /* ============================================
     REVEAL ON SCROLL — IntersectionObserver
     handles .reveal, .reveal-blur, .stagger-fade,
     .split-text, .counter
     ============================================ */
  if ('IntersectionObserver' in window) {
    const revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            if (entry.target.classList.contains('split-text')) {
              entry.target.classList.add('lit');
            }
            revealObserver.unobserve(entry.target);
          }
        });
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.05 }
    );

    document
      .querySelectorAll('.reveal, .reveal-blur, .stagger-fade, .split-text')
      .forEach((el) => revealObserver.observe(el));
  } else {
    document
      .querySelectorAll('.reveal, .reveal-blur, .stagger-fade, .split-text')
      .forEach((el) => {
        el.classList.add('visible');
        if (el.classList.contains('split-text')) el.classList.add('lit');
      });
  }

  /* ============================================
     SCROLL-DRIVEN TEXT REVEAL
     Light each word as it crosses the trigger line
     ============================================ */
  function setupScrollRevealText() {
    if (prefersReducedMotion) {
      document
        .querySelectorAll('.scroll-reveal-text .word')
        .forEach((w) => w.classList.add('lit'));
      return;
    }

    const containers = document.querySelectorAll('.scroll-reveal-text');
    if (!containers.length) return;

    let ticking = false;
    const update = () => {
      ticking = false;
      const winH = window.innerHeight;
      containers.forEach((container) => {
        const rect = container.getBoundingClientRect();
        // Only animate when container is in viewport range
        if (rect.bottom < 0 || rect.top > winH) return;
        const words = container.querySelectorAll('.word');
        const total = words.length;
        if (!total) return;

        // Animation range : container top reaches 70% of viewport → 25% of viewport
        const triggerStart = winH * 0.75;
        const triggerEnd = winH * 0.25;
        const range = triggerStart - triggerEnd;
        const containerProgress =
          (triggerStart - rect.top) / (range + rect.height);
        const clamped = Math.max(0, Math.min(1, containerProgress));
        const litCount = Math.floor(clamped * total * 1.1);

        words.forEach((w, i) => {
          if (i < litCount) w.classList.add('lit');
          else w.classList.remove('lit');
        });
      });
    };

    const onScroll = () => {
      if (!ticking) {
        requestAnimationFrame(update);
        ticking = true;
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    update();
  }
  setupScrollRevealText();

  /* ============================================
     STAT COUNTERS — animate numbers on visible
     ============================================ */
  function setupCounters() {
    const counters = document.querySelectorAll('[data-counter]');
    if (!counters.length) return;

    const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

    const animate = (el) => {
      if (el.dataset.counted === '1') return;
      el.dataset.counted = '1';
      const target = parseInt(el.dataset.counter, 10);
      if (isNaN(target)) return;
      if (prefersReducedMotion) {
        el.textContent = target;
        return;
      }
      const duration = 1800;
      const start = performance.now();
      const tick = (now) => {
        const t = Math.min((now - start) / duration, 1);
        const eased = easeOutCubic(t);
        el.textContent = Math.round(target * eased);
        if (t < 1) requestAnimationFrame(tick);
        else el.textContent = target;
      };
      requestAnimationFrame(tick);
    };

    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              animate(entry.target);
              io.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.4 }
      );
      counters.forEach((c) => io.observe(c));
    } else {
      counters.forEach(animate);
    }
  }
  setupCounters();

  /* ============================================
     MAGNETIC BUTTONS
     CTAs slightly follow the cursor when hovered
     ============================================ */
  function setupMagneticButtons() {
    if (isTouch || prefersReducedMotion) return;

    document.querySelectorAll('.btn-magnetic, [data-magnetic]').forEach((el) => {
      const strength = parseFloat(el.dataset.magneticStrength || '0.25');
      el.addEventListener('mousemove', (e) => {
        const rect = el.getBoundingClientRect();
        const x = e.clientX - rect.left - rect.width / 2;
        const y = e.clientY - rect.top - rect.height / 2;
        el.style.transform = `translate(${x * strength}px, ${y * strength}px)`;
      });
      el.addEventListener('mouseleave', () => {
        el.style.transform = '';
      });
    });
  }
  setupMagneticButtons();

  /* ============================================
     CUSTOM CURSOR — dot + ring (multiply blend)
     ============================================ */
  function setupCustomCursor() {
    if (isTouch || prefersReducedMotion) return;

    const dot = document.createElement('div');
    dot.className = 'custom-cursor-dot';
    const ring = document.createElement('div');
    ring.className = 'custom-cursor-ring';
    document.body.appendChild(dot);
    document.body.appendChild(ring);

    let mouseX = -100,
      mouseY = -100;
    let ringX = -100,
      ringY = -100;
    let visible = false;

    document.addEventListener('mousemove', (e) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      dot.style.left = mouseX + 'px';
      dot.style.top = mouseY + 'px';
      if (!visible) {
        dot.classList.add('visible');
        ring.classList.add('visible');
        visible = true;
      }
    });

    document.addEventListener('mouseleave', () => {
      dot.classList.remove('visible');
      ring.classList.remove('visible');
      visible = false;
    });

    // Lerp ring toward cursor for smooth follow
    function animateRing() {
      ringX += (mouseX - ringX) * 0.18;
      ringY += (mouseY - ringY) * 0.18;
      ring.style.left = ringX + 'px';
      ring.style.top = ringY + 'px';
      requestAnimationFrame(animateRing);
    }
    requestAnimationFrame(animateRing);

    // Hover detection
    const hoverables = 'a, button, [data-hover], .practice-card, .pillar, .testimonial, .specific-card, .approach-card, .format-card, .contact-info-card, .accomp-tag, .bilan-point';
    const textHover = 'p, h1, h2, h3, h4, .lede, .body-text, .portrait-paragraph, .testimonial-text';

    document.addEventListener('mouseover', (e) => {
      const t = e.target;
      if (t.closest(hoverables)) {
        ring.classList.add('hovering');
        ring.classList.remove('text-hovering');
        dot.classList.remove('text-hovering');
      } else if (t.matches(textHover) || t.closest(textHover)) {
        ring.classList.add('text-hovering');
        dot.classList.add('text-hovering');
        ring.classList.remove('hovering');
      } else {
        ring.classList.remove('hovering', 'text-hovering');
        dot.classList.remove('text-hovering');
      }
    });
  }
  setupCustomCursor();

  /* ============================================
     PARALLAX — subtle vertical movement
     ============================================ */
  function setupParallax() {
    if (prefersReducedMotion) return;
    const els = document.querySelectorAll('[data-parallax]');
    if (!els.length) return;

    let ticking = false;
    const update = () => {
      ticking = false;
      const winH = window.innerHeight;
      els.forEach((el) => {
        const rect = el.getBoundingClientRect();
        if (rect.bottom < 0 || rect.top > winH) return;
        const speed = parseFloat(el.dataset.parallax || '0.2');
        const center = rect.top + rect.height / 2;
        const offset = (center - winH / 2) * -speed;
        el.style.transform = `translate3d(0, ${offset}px, 0)`;
      });
    };
    const onScroll = () => {
      if (!ticking) {
        requestAnimationFrame(update);
        ticking = true;
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    update();
  }
  setupParallax();

  /* ============================================
     CONTACT FORM — mailto fallback
     ============================================ */
  const contactForm = document.querySelector('#contact-form');
  if (contactForm) {
    contactForm.addEventListener('submit', function (e) {
      e.preventDefault();
      const data = new FormData(contactForm);
      const name = (data.get('name') || '').toString().trim();
      const email = (data.get('email') || '').toString().trim();
      const phone = (data.get('phone') || '').toString().trim();
      const subject = (data.get('subject') || 'Demande de contact').toString().trim();
      const message = (data.get('message') || '').toString().trim();

      const body =
        `Nom : ${name}%0D%0A` +
        `Email : ${email}%0D%0A` +
        `Téléphone : ${phone}%0D%0A%0D%0A` +
        `${encodeURIComponent(message)}`;

      const mailto = `mailto:contact@moveandbreathelille.fr?subject=${encodeURIComponent(
        subject
      )}&body=${body}`;

      window.location.href = mailto;

      const status = document.querySelector('#form-status');
      if (status) {
        status.textContent =
          'Votre client mail va s’ouvrir. Si ce n’est pas le cas, écrivez directement à contact@moveandbreathelille.fr';
        status.style.display = 'block';
      }
    });
  }

  /* ============================================
     ACTIVE NAV LINK
     ============================================ */
  const currentPath = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-links a').forEach((link) => {
    const href = (link.getAttribute('href') || '').split('/').pop();
    if (
      href === currentPath ||
      (currentPath === '' && href === 'index.html') ||
      (currentPath === 'index.html' && href === 'index.html')
    ) {
      link.classList.add('active');
    }
  });

  /* ============================================
     AVIS — CAROUSEL
     ============================================ */
  const reviewsCarousel = document.querySelector('.reviews-carousel');
  if (reviewsCarousel) {
    const track = reviewsCarousel.querySelector('.reviews-track');
    const cards = Array.from(track.querySelectorAll('.review-card'));
    const prevBtn = reviewsCarousel.querySelector('.reviews-prev');
    const nextBtn = reviewsCarousel.querySelector('.reviews-next');
    const dotsWrap = document.querySelector('.reviews-dots');
    let index = 0;

    const perView = () => {
      const w = window.innerWidth;
      if (w <= 640) return 1;
      if (w <= 980) return 2;
      return 3;
    };

    const maxIndex = () => Math.max(0, cards.length - perView());

    const buildDots = () => {
      if (!dotsWrap) return;
      dotsWrap.innerHTML = '';
      const pages = maxIndex() + 1;
      for (let i = 0; i < pages; i++) {
        const dot = document.createElement('button');
        dot.className = 'reviews-dot' + (i === index ? ' active' : '');
        dot.setAttribute('role', 'tab');
        dot.setAttribute('aria-label', 'Avis ' + (i + 1));
        dot.addEventListener('click', () => { index = i; update(); });
        dotsWrap.appendChild(dot);
      }
    };

    const update = () => {
      const mi = maxIndex();
      if (index > mi) index = mi;
      if (index < 0) index = 0;
      const card = cards[0];
      const style = getComputedStyle(card);
      const cardW = card.offsetWidth + parseFloat(style.marginRight);
      track.style.transform = `translateX(-${index * cardW}px)`;
      if (prevBtn) prevBtn.disabled = index === 0;
      if (nextBtn) nextBtn.disabled = index === mi;
      if (dotsWrap) {
        dotsWrap.querySelectorAll('.reviews-dot').forEach((d, i) => {
          d.classList.toggle('active', i === index);
        });
      }
    };

    if (prevBtn) prevBtn.addEventListener('click', () => { index--; update(); });
    if (nextBtn) nextBtn.addEventListener('click', () => { index++; update(); });

    // Touch / swipe support
    let startX = 0, isDragging = false;
    reviewsCarousel.querySelector('.reviews-viewport').addEventListener('touchstart', (e) => {
      startX = e.touches[0].clientX; isDragging = true;
    }, { passive: true });
    reviewsCarousel.querySelector('.reviews-viewport').addEventListener('touchend', (e) => {
      if (!isDragging) return;
      const diff = startX - e.changedTouches[0].clientX;
      if (Math.abs(diff) > 50) { diff > 0 ? index++ : index--; update(); }
      isDragging = false;
    }, { passive: true });

    let resizeTimer;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => { buildDots(); update(); }, 200);
    });

    buildDots();
    update();
  }

  /* ============================================
     FAQ — Accordéon
     ============================================ */
  const faqItems = document.querySelectorAll('.faq-item');
  faqItems.forEach((item) => {
    const q = item.querySelector('.faq-q');
    if (!q) return;
    q.setAttribute('aria-expanded', 'false');
    q.addEventListener('click', () => {
      const isOpen = item.classList.contains('open');
      // Close siblings in the same list
      const list = item.closest('.faq-list');
      if (list) {
        list.querySelectorAll('.faq-item.open').forEach((other) => {
          if (other !== item) {
            other.classList.remove('open');
            const oq = other.querySelector('.faq-q');
            if (oq) oq.setAttribute('aria-expanded', 'false');
          }
        });
      }
      item.classList.toggle('open', !isOpen);
      q.setAttribute('aria-expanded', !isOpen ? 'true' : 'false');
    });
  });

  /* ============================================
     YEAR IN FOOTER
     ============================================ */
  const yearEl = document.querySelector('[data-year]');
  if (yearEl) yearEl.textContent = new Date().getFullYear();
})();
