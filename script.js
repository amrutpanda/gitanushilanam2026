(() => {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  const menuToggle = document.querySelector('.menu-toggle');
  const menu = document.querySelector('.nav-links');
  menuToggle?.addEventListener('click', () => {
    const open = menu.classList.toggle('is-open');
    menuToggle.setAttribute('aria-expanded', String(open));
  });
  menu?.querySelectorAll('a').forEach((link) => link.addEventListener('click', () => {
    menu.classList.remove('is-open');
    menuToggle?.setAttribute('aria-expanded', 'false');
  }));

  const timedSlider = ({ root, slideSelector, dotSelector, prevSelector, nextSelector, currentSelector, delay = 5000, render }) => {
    const scope = document.querySelector(root);
    if (!scope) return;
    const slides = [...scope.querySelectorAll(slideSelector)];
    const dots = dotSelector ? [...scope.querySelectorAll(dotSelector)] : [];
    const prev = prevSelector ? scope.querySelector(prevSelector) : null;
    const next = nextSelector ? scope.querySelector(nextSelector) : null;
    const current = currentSelector ? scope.querySelector(currentSelector) : null;
    let index = 0;
    let timer = null;
    let paused = false;

    const paint = (nextIndex, direction = 1) => {
      const old = index;
      index = (nextIndex + slides.length) % slides.length;
      if (typeof render === 'function') render({ slides, old, index, direction, scope });
      else slides.forEach((slide, i) => slide.classList.toggle('is-active', i === index));
      dots.forEach((dot, i) => {
        dot.classList.toggle('is-active', i === index);
        dot.setAttribute('aria-selected', String(i === index));
      });
      if (current) current.textContent = String(index + 1).padStart(2, '0');
    };

    const cancel = () => {
      if (timer) window.clearTimeout(timer);
      timer = null;
    };
    const schedule = () => {
      cancel();
      if (paused || reduceMotion.matches) return;
      timer = window.setTimeout(() => {
        paint(index + 1, 1);
        schedule();
      }, delay);
    };
    const go = (nextIndex, direction) => {
      paint(nextIndex, direction);
      schedule();
    };
    const pause = () => { paused = true; cancel(); };
    const resume = () => { paused = false; schedule(); };

    prev?.addEventListener('click', () => go(index - 1, -1));
    next?.addEventListener('click', () => go(index + 1, 1));
    dots.forEach((dot, i) => dot.addEventListener('click', () => go(i, i < index ? -1 : 1)));
    scope.addEventListener('pointerenter', pause);
    scope.addEventListener('pointerleave', resume);
    scope.addEventListener('focusin', pause);
    scope.addEventListener('focusout', (event) => {
      if (!scope.contains(event.relatedTarget)) resume();
    });

    paint(0, 1);
    schedule();
    return { paint, schedule, pause, resume };
  };

  timedSlider({
    root: '[data-hero-gallery]',
    slideSelector: '[data-hero-slide]',
    dotSelector: '[data-hero-dot]',
    currentSelector: '[data-hero-current]',
    delay: 6500,
    render: ({ slides, old, index }) => {
      slides.forEach((slide, i) => {
        slide.classList.remove('is-active', 'is-exiting');
        if (i === index) slide.classList.add('is-active');
        else if (i === old && old !== index) slide.classList.add('is-exiting');
      });
    }
  });

  timedSlider({
    root: '[data-announcement-slider]',
    slideSelector: '[data-announcement-slide]',
    dotSelector: '[data-announcement-dot]',
    prevSelector: '[data-announcement-prev]',
    nextSelector: '[data-announcement-next]',
    delay: 5200
  });

  const setupCinemaTeam = () => {
    const section = document.querySelector('#team');
    const stage = document.querySelector('[data-team-stage]');
    if (!section || !stage) return;
    const cards = [...stage.querySelectorAll('[data-team-card]')];
    const current = stage.querySelector('[data-team-current]');
    const prev = stage.querySelector('[data-team-prev]');
    const next = stage.querySelector('[data-team-next]');
    let index = 0;
    let timer = null;
    let paused = false;

    const deltaFor = (i) => {
      let d = i - index;
      const half = cards.length / 2;
      if (d > half) d -= cards.length;
      if (d < -half) d += cards.length;
      return d;
    };

    const render = () => {
      const mobile = window.innerWidth <= 560;
      cards.forEach((card, i) => {
        const d = deltaFor(i);
        const a = Math.abs(d);
        const side = Math.sign(d || 1);
        const visible = a <= (mobile ? 2 : 3);
        let x, y, z, rotate, scale, opacity, blur;

        if (d === 0) {
          x = 0; y = 0; z = 80; rotate = 0; scale = 1; opacity = 1; blur = 0;
        } else if (a === 1) {
          x = side * (mobile ? 185 : 325); y = 20; z = -130; rotate = side * -18; scale = .88; opacity = .58; blur = .6;
        } else if (a === 2) {
          x = side * (mobile ? 245 : 500); y = 34; z = -300; rotate = side * -27; scale = .73; opacity = .22; blur = 2.2;
        } else {
          x = side * (mobile ? 310 : 610); y = 46; z = -460; rotate = side * -34; scale = .63; opacity = visible ? .08 : 0; blur = 5;
        }

        card.style.transform = `translate(-50%, -50%) translate3d(${x}px, ${y}px, ${z}px) rotateY(${rotate}deg) scale(${scale})`;
        card.style.opacity = String(opacity);
        card.style.filter = `blur(${blur}px) saturate(${d === 0 ? 1 : .78})`;
        card.style.zIndex = String(20 - a);
        card.style.pointerEvents = a <= 1 ? 'auto' : 'none';
        card.classList.toggle('is-current', d === 0);
        card.setAttribute('aria-current', d === 0 ? 'true' : 'false');
      });
      if (current) current.textContent = String(index + 1).padStart(2, '0');
    };

    const cancel = () => { if (timer) clearTimeout(timer); timer = null; };
    const schedule = () => {
      cancel();
      if (paused || reduceMotion.matches) return;
      timer = setTimeout(() => { index = (index + 1) % cards.length; render(); schedule(); }, 4300);
    };
    const move = (step) => { index = (index + step + cards.length) % cards.length; render(); schedule(); };
    const pause = () => { paused = true; cancel(); };
    const resume = () => { paused = false; schedule(); };

    prev?.addEventListener('click', () => move(-1));
    next?.addEventListener('click', () => move(1));
    cards.forEach((card, i) => card.addEventListener('click', () => { if (i !== index) { index = i; render(); schedule(); } }));
    section.addEventListener('pointerenter', pause);
    section.addEventListener('pointerleave', resume);
    section.addEventListener('focusin', pause);
    section.addEventListener('focusout', (event) => { if (!section.contains(event.relatedTarget)) resume(); });
    window.addEventListener('resize', () => requestAnimationFrame(render));
    render();
    schedule();
  };

  const setupVoices = () => {
    const section = document.querySelector('#voices');
    const stage = document.querySelector('[data-voice-stage]');
    if (!section || !stage) return;
    const cards = [...stage.querySelectorAll('[data-voice-card]')];
    const current = stage.querySelector('[data-voice-current]');
    const prev = stage.querySelector('[data-voice-prev]');
    const next = stage.querySelector('[data-voice-next]');
    let index = 0;
    let timer = null;
    let paused = false;

    const render = (old = index) => {
      cards.forEach((card, i) => {
        card.classList.remove('is-current', 'is-exiting');
        if (i === index) card.classList.add('is-current');
        else if (i === old && old !== index) card.classList.add('is-exiting');
      });
      if (current) current.textContent = String(index + 1).padStart(2, '0');
    };
    const cancel = () => { if (timer) clearTimeout(timer); timer = null; };
    const schedule = () => {
      cancel();
      if (paused || reduceMotion.matches) return;
      timer = setTimeout(() => {
        const old = index;
        index = (index + 1) % cards.length;
        render(old);
        schedule();
      }, 7600);
    };
    const move = (step) => { const old = index; index = (index + step + cards.length) % cards.length; render(old); schedule(); };
    const pause = () => { paused = true; cancel(); };
    const resume = () => { paused = false; schedule(); };

    prev?.addEventListener('click', () => move(-1));
    next?.addEventListener('click', () => move(1));
    section.addEventListener('pointerenter', pause);
    section.addEventListener('pointerleave', resume);
    section.addEventListener('focusin', pause);
    section.addEventListener('focusout', (event) => { if (!section.contains(event.relatedTarget)) resume(); });
    render();
    schedule();
  };

  setupCinemaTeam();
  setupVoices();

  document.querySelectorAll('[data-dialog-open]').forEach((button) => {
    button.addEventListener('click', () => document.getElementById(button.dataset.dialogOpen)?.showModal?.());
  });
  document.querySelectorAll('.detail-dialog').forEach((dialog) => {
    dialog.querySelector('[data-dialog-close]')?.addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', (event) => {
      const box = dialog.getBoundingClientRect();
      const outside = event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom;
      if (outside) dialog.close();
    });
  });

  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: .12 });
  document.querySelectorAll('.reveal').forEach((el) => revealObserver.observe(el));
  document.getElementById('year').textContent = String(new Date().getFullYear());
})();
