(() => {
  const menuToggle = document.querySelector('.menu-toggle');
  const navLinks = document.querySelector('.nav-links');

  if (menuToggle && navLinks) {
    menuToggle.addEventListener('click', () => {
      const open = navLinks.classList.toggle('is-open');
      menuToggle.setAttribute('aria-expanded', String(open));
    });
    navLinks.querySelectorAll('a').forEach((link) => link.addEventListener('click', () => {
      navLinks.classList.remove('is-open');
      menuToggle.setAttribute('aria-expanded', 'false');
    }));
  }

  const progress = document.querySelector('[data-page-progress]');
  const updateProgress = () => {
    if (!progress) return;
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const pct = max > 0 ? Math.min(100, Math.max(0, (window.scrollY / max) * 100)) : 0;
    progress.style.width = `${pct}%`;
  };
  updateProgress();
  window.addEventListener('scroll', updateProgress, { passive: true });
  window.addEventListener('resize', updateProgress);

  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px' });
  document.querySelectorAll('.reveal').forEach((el) => revealObserver.observe(el));

  const heroSlides = [...document.querySelectorAll('[data-hero-slide]')];
  const heroDots = [...document.querySelectorAll('[data-hero-dot]')];
  const heroCurrent = document.querySelector('[data-hero-current]');
  let heroIndex = 0;
  let heroTimer;

  const showHero = (index) => {
    if (!heroSlides.length) return;
    heroIndex = (index + heroSlides.length) % heroSlides.length;
    heroSlides.forEach((slide, i) => slide.classList.toggle('is-active', i === heroIndex));
    heroDots.forEach((dot, i) => dot.classList.toggle('is-active', i === heroIndex));
    if (heroCurrent) heroCurrent.textContent = String(heroIndex + 1).padStart(2, '0');
  };
  const scheduleHero = () => {
    window.clearInterval(heroTimer);
    heroTimer = window.setInterval(() => showHero(heroIndex + 1), 6200);
  };
  heroDots.forEach((dot, i) => dot.addEventListener('click', () => { showHero(i); scheduleHero(); }));
  showHero(0);
  scheduleHero();

  const announcementSlides = [...document.querySelectorAll('[data-announcement-slide]')];
  const announcementDots = [...document.querySelectorAll('[data-announcement-dot]')];
  const announcementPrev = document.querySelector('[data-announcement-prev]');
  const announcementNext = document.querySelector('[data-announcement-next]');
  let announcementIndex = 0;
  let announcementTimer;

  const showAnnouncement = (index) => {
    if (!announcementSlides.length) return;
    announcementIndex = (index + announcementSlides.length) % announcementSlides.length;
    announcementSlides.forEach((slide, i) => slide.classList.toggle('is-active', i === announcementIndex));
    announcementDots.forEach((dot, i) => dot.classList.toggle('is-active', i === announcementIndex));
  };
  const scheduleAnnouncement = () => {
    window.clearInterval(announcementTimer);
    announcementTimer = window.setInterval(() => showAnnouncement(announcementIndex + 1), 5200);
  };
  announcementPrev?.addEventListener('click', () => { showAnnouncement(announcementIndex - 1); scheduleAnnouncement(); });
  announcementNext?.addEventListener('click', () => { showAnnouncement(announcementIndex + 1); scheduleAnnouncement(); });
  announcementDots.forEach((dot, i) => dot.addEventListener('click', () => { showAnnouncement(i); scheduleAnnouncement(); }));
  showAnnouncement(0);
  scheduleAnnouncement();

  const detailTabs = [...document.querySelectorAll('[data-detail-tab]')];
  const detailPanels = [...document.querySelectorAll('[data-detail-panel]')];
  const detailsOverlay = document.querySelector('#details');
  let detailReturnFocus = null;

  const activateDetail = (name) => {
    const panel = detailPanels.find((item) => item.dataset.detailPanel === name);
    if (!panel) return;
    detailTabs.forEach((tab) => {
      const active = tab.dataset.detailTab === name;
      tab.classList.toggle('is-active', active);
      tab.setAttribute('aria-selected', String(active));
    });
    detailPanels.forEach((item) => {
      const active = item.dataset.detailPanel === name;
      item.classList.toggle('is-active', active);
      item.hidden = !active;
    });
  };

  const openDetails = (name = 'quiz', trigger = null) => {
    if (!detailsOverlay) return;
    activateDetail(name);
    detailReturnFocus = trigger || document.activeElement;
    detailsOverlay.classList.add('is-open');
    detailsOverlay.setAttribute('aria-hidden', 'false');
    document.body.classList.add('detail-open');
    detailsOverlay.scrollTop = 0;
    window.setTimeout(() => detailsOverlay.querySelector('[data-close-details]')?.focus(), 360);
  };

  const closeDetails = () => {
    if (!detailsOverlay?.classList.contains('is-open')) return;
    detailsOverlay.classList.remove('is-open');
    detailsOverlay.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('detail-open');
    window.setTimeout(() => {
      if (detailReturnFocus && typeof detailReturnFocus.focus === 'function') detailReturnFocus.focus();
      detailReturnFocus = null;
    }, 420);
  };

  detailTabs.forEach((tab) => tab.addEventListener('click', () => activateDetail(tab.dataset.detailTab)));

  document.querySelectorAll('[data-select-detail]').forEach((link) => link.addEventListener('click', (event) => {
    event.preventDefault();
    openDetails(link.dataset.selectDetail || 'quiz', link);
  }));

  document.querySelectorAll('[data-open-details]').forEach((trigger) => trigger.addEventListener('click', (event) => {
    event.preventDefault();
    openDetails(trigger.dataset.openDetails || 'quiz', trigger);
  }));

  document.querySelectorAll('[data-close-details]').forEach((button) => button.addEventListener('click', closeDetails));
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && detailsOverlay?.classList.contains('is-open')) closeDetails();
  });

  activateDetail('quiz');

  const createTimedCarousel = ({ cardSelector, currentSelector, prevSelector, nextSelector, stageSelector, interval = 5000, render }) => {
    const cards = [...document.querySelectorAll(cardSelector)];
    const currentLabel = document.querySelector(currentSelector);
    const prev = document.querySelector(prevSelector);
    const next = document.querySelector(nextSelector);
    const stage = document.querySelector(stageSelector);
    if (!cards.length) return;

    let index = 0;
    let timer;
    let paused = false;

    const draw = () => {
      cards.forEach((card, i) => render(card, i, index, cards.length));
      if (currentLabel) currentLabel.textContent = String(index + 1).padStart(2, '0');
    };
    const move = (delta) => {
      index = (index + delta + cards.length) % cards.length;
      draw();
      schedule();
    };
    const schedule = () => {
      window.clearTimeout(timer);
      if (!paused) timer = window.setTimeout(() => move(1), interval);
    };

    prev?.addEventListener('click', () => move(-1));
    next?.addEventListener('click', () => move(1));
    stage?.addEventListener('mouseenter', () => { paused = true; window.clearTimeout(timer); });
    stage?.addEventListener('mouseleave', () => { paused = false; schedule(); });
    stage?.addEventListener('focusin', () => { paused = true; window.clearTimeout(timer); });
    stage?.addEventListener('focusout', () => { paused = false; schedule(); });

    draw();
    schedule();
  };

  createTimedCarousel({
    cardSelector: '[data-team-card]',
    currentSelector: '[data-team-current]',
    prevSelector: '[data-team-prev]',
    nextSelector: '[data-team-next]',
    stageSelector: '[data-team-stage]',
    interval: 4400,
    render: (card, i, index, total) => {
      let delta = i - index;
      if (delta > total / 2) delta -= total;
      if (delta < -total / 2) delta += total;
      const abs = Math.abs(delta);
      const x = delta * 215;
      const y = abs * 15;
      const z = -abs * 110;
      const rotate = delta * -8;
      const scale = Math.max(.72, 1 - abs * .12);
      card.style.transform = `translate(-50%, -50%) translate3d(${x}px, ${y}px, ${z}px) rotateY(${rotate}deg) scale(${scale})`;
      card.style.opacity = abs > 2 ? '0' : String(Math.max(.16, 1 - abs * .34));
      card.style.filter = abs === 0 ? 'none' : `blur(${Math.min(2.5, abs * .8)}px)`;
      card.style.zIndex = String(20 - abs);
      card.classList.toggle('is-current', delta === 0);
      card.setAttribute('aria-hidden', String(delta !== 0));
    }
  });

  createTimedCarousel({
    cardSelector: '[data-voice-card]',
    currentSelector: '[data-voice-current]',
    prevSelector: '[data-voice-prev]',
    nextSelector: '[data-voice-next]',
    stageSelector: '[data-voice-stage]',
    interval: 7600,
    render: (card, i, index) => {
      const current = i === index;
      card.classList.toggle('is-current', current);
      card.setAttribute('aria-hidden', String(!current));
    }
  });


  // Resilient portrait fallback for externally hosted academic photos.
  document.querySelectorAll('img[data-initials]').forEach((img) => {
    img.addEventListener('error', () => {
      if (img.dataset.fallbackApplied) return;
      img.dataset.fallbackApplied = '1';
      const initials = (img.dataset.initials || 'GA').replace(/[^A-Za-z0-9]/g, '').slice(0, 4);
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#2a315e"/><stop offset="1" stop-color="#6b58a5"/></linearGradient></defs><rect width="600" height="600" fill="url(#g)"/><circle cx="300" cy="270" r="125" fill="rgba(255,255,255,.10)"/><text x="300" y="330" text-anchor="middle" fill="#f1c778" font-family="Georgia,serif" font-size="126">${initials}</text></svg>`;
      img.src = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
    }, { once: true });
  });

  const teamTotal = document.querySelector('[data-team-total]');
  if (teamTotal) teamTotal.textContent = String(document.querySelectorAll('[data-team-card]').length).padStart(2, '0');

  const year = document.querySelector('#year');
  if (year) year.textContent = '2026';
})();
