// WatchTwin landing — interactions & animations
(() => {
  'use strict';

  // ----- Year in footer -----
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // ----- Sticky nav background on scroll -----
  const nav = document.getElementById('nav');
  const onScroll = () => {
    if (window.scrollY > 20) nav.classList.add('scrolled');
    else nav.classList.remove('scrolled');
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // ----- Mobile menu toggle -----
  const toggle = document.querySelector('.nav-toggle');
  if (toggle) {
    toggle.addEventListener('click', () => {
      const open = nav.classList.toggle('menu-open');
      toggle.setAttribute('aria-expanded', String(open));
    });
    // Close on link click
    document.querySelectorAll('.nav-links a').forEach(a =>
      a.addEventListener('click', () => {
        nav.classList.remove('menu-open');
        toggle.setAttribute('aria-expanded', 'false');
      })
    );
  }

  // ----- Scroll reveal -----
  const revealEls = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -60px 0px' });
    revealEls.forEach(el => io.observe(el));
  } else {
    revealEls.forEach(el => el.classList.add('is-visible'));
  }

  // ----- Animated stat counters -----
  const easeOutCubic = t => 1 - Math.pow(1 - t, 3);
  const formatNum = (n) => {
    if (n >= 1000) return Math.round(n).toLocaleString('de-DE');
    return String(Math.round(n));
  };
  const animateCount = (el) => {
    const target = parseInt(el.dataset.count, 10);
    const suffix = el.dataset.suffix || '';
    const duration = 1600;
    const start = performance.now();
    const step = (now) => {
      const p = Math.min((now - start) / duration, 1);
      const val = target * easeOutCubic(p);
      el.textContent = formatNum(val) + suffix;
      if (p < 1) requestAnimationFrame(step);
      else el.textContent = formatNum(target) + suffix;
    };
    requestAnimationFrame(step);
  };
  const statEls = document.querySelectorAll('.stat-number');
  if ('IntersectionObserver' in window) {
    const statIO = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          animateCount(entry.target);
          statIO.unobserve(entry.target);
        }
      });
    }, { threshold: 0.5 });
    statEls.forEach(el => statIO.observe(el));
  } else {
    statEls.forEach(animateCount);
  }

  // ----- Feature card mouse-follow glow -----
  document.querySelectorAll('.feature-card').forEach(card => {
    card.addEventListener('mousemove', e => {
      const rect = card.getBoundingClientRect();
      card.style.setProperty('--mx', `${e.clientX - rect.left}px`);
      card.style.setProperty('--my', `${e.clientY - rect.top}px`);
    });
  });

  // ----- Swipe deck auto-cycle -----
  const deckEl = document.querySelector('.swipe-deck');
  if (deckEl && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const cards = Array.from(deckEl.querySelectorAll('.swipe-card'));
    const updatePositions = () => {
      cards.forEach((card, idx) => card.style.setProperty('--i', idx));
    };
    updatePositions();
    let paused = false;
    deckEl.addEventListener('mouseenter', () => paused = true);
    deckEl.addEventListener('mouseleave', () => paused = false);

    const cycle = () => {
      if (paused) return;
      const top = cards.shift();
      if (!top) return;
      const dir = Math.random() > 0.35 ? 'right' : 'left';
      top.classList.add(`swipe-out-${dir}`);
      // After the swipe animation, move to back and reset
      setTimeout(() => {
        top.classList.add('no-transition');
        top.classList.remove('swipe-out-right', 'swipe-out-left');
        cards.push(top);
        updatePositions();
        // Force reflow, then allow transitions again
        void top.offsetWidth;
        top.classList.remove('no-transition');
      }, 700);
    };
    setInterval(cycle, 2400);
  }

  // ----- Subtle parallax on hero swipe deck -----
  const deck = document.querySelector('.swipe-deck');
  if (deck && window.matchMedia('(pointer: fine)').matches) {
    const heroVisual = document.querySelector('.hero-visual');
    heroVisual.addEventListener('mousemove', e => {
      const rect = heroVisual.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      deck.style.transform = `translate(${x * 12}px, ${y * 12}px)`;
    });
    heroVisual.addEventListener('mouseleave', () => {
      deck.style.transform = '';
    });
  }
})();
