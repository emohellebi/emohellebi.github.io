(() => {
  const root = document.querySelector('.profile-overview');
  const hero = document.querySelector('#profile-hero');
  const canvas = document.querySelector('#profile-field');
  const stage = document.querySelector('#convergence-stage');
  if (!root || !hero || !canvas || !stage) return;

  root.classList.add('profile-enhanced');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const ctx = canvas.getContext('2d');
  const colors = ['#66f2d0', '#82aaff', '#d48cff', '#ffad66'];
  let width = 1;
  let height = 1;
  let dpr = 1;
  let frame = 0;
  let points = [];
  let activeDimension = 'all';
  const pointer = { x: 0, y: 0, active: false };

  class Signal {
    constructor(index) {
      this.index = index;
      this.reset(true);
    }

    reset(initial = false) {
      const edge = this.index % 4;
      if (edge === 0) { this.x = 0; this.y = Math.random() * height; }
      if (edge === 1) { this.x = width; this.y = Math.random() * height; }
      if (edge === 2) { this.x = Math.random() * width; this.y = 0; }
      if (edge === 3) { this.x = Math.random() * width; this.y = height; }
      if (initial) { this.x = Math.random() * width; this.y = Math.random() * height; }
      this.speed = 0.0012 + Math.random() * 0.0018;
      this.radius = 1 + Math.random() * 2.1;
      this.colorIndex = this.index % colors.length;
      this.phase = Math.random() * Math.PI * 2;
    }

    update(time) {
      const centerX = width * 0.72;
      const centerY = height * 0.47;
      const attraction = activeDimension === 'all' || this.colorIndex === ['science', 'data', 'engineering', 'enterprise'].indexOf(activeDimension) ? 1 : 0.2;
      this.x += (centerX - this.x) * this.speed * attraction + Math.sin(time * 0.0007 + this.phase) * 0.05;
      this.y += (centerY - this.y) * this.speed * attraction + Math.cos(time * 0.0006 + this.phase) * 0.05;
      if (Math.hypot(centerX - this.x, centerY - this.y) < 24) this.reset();
    }

    draw() {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
      ctx.fillStyle = colors[this.colorIndex];
      ctx.globalAlpha = activeDimension === 'all' || this.colorIndex === ['science', 'data', 'engineering', 'enterprise'].indexOf(activeDimension) ? 0.72 : 0.1;
      ctx.fill();
    }
  }

  function resize() {
    const rect = hero.getBoundingClientRect();
    width = Math.max(1, rect.width);
    height = Math.max(1, rect.height);
    dpr = Math.min(window.devicePixelRatio || 1, 1.75);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    points = Array.from({ length: Math.min(150, Math.max(70, Math.round(width / 10))) }, (_, index) => new Signal(index));
    draw(0, false);
  }

  function draw(time, advance = true) {
    ctx.clearRect(0, 0, width, height);
    ctx.globalCompositeOperation = 'lighter';
    if (advance) points.forEach((point) => point.update(time));
    points.forEach((point, index) => {
      point.draw();
      const next = points[(index + 4) % points.length];
      const distance = Math.hypot(point.x - next.x, point.y - next.y);
      if (distance < 115) {
        ctx.beginPath();
        ctx.moveTo(point.x, point.y);
        ctx.lineTo(next.x, next.y);
        ctx.strokeStyle = colors[point.colorIndex];
        ctx.globalAlpha = (1 - distance / 115) * 0.12;
        ctx.lineWidth = 0.65;
        ctx.stroke();
      }
    });
    if (pointer.active) {
      const gradient = ctx.createRadialGradient(pointer.x, pointer.y, 0, pointer.x, pointer.y, 150);
      gradient.addColorStop(0, 'rgba(102,242,208,.11)');
      gradient.addColorStop(1, 'rgba(102,242,208,0)');
      ctx.fillStyle = gradient;
      ctx.globalAlpha = 1;
      ctx.fillRect(pointer.x - 150, pointer.y - 150, 300, 300);
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }

  function animate(time) {
    draw(time, true);
    frame = window.requestAnimationFrame(animate);
  }

  function setAnimation() {
    window.cancelAnimationFrame(frame);
    if (reducedMotion.matches) draw(0, false);
    else frame = window.requestAnimationFrame(animate);
  }

  function activate(dimension) {
    activeDimension = dimension || 'all';
    stage.dataset.active = activeDimension;
    document.querySelector('.dimension-map')?.setAttribute('data-active', activeDimension);
  }

  document.querySelectorAll('[data-dimension]').forEach((element) => {
    element.addEventListener('pointerenter', () => activate(element.dataset.dimension));
    element.addEventListener('focus', () => activate(element.dataset.dimension));
    element.addEventListener('pointerleave', () => activate('all'));
    element.addEventListener('blur', () => activate('all'));
  });

  hero.addEventListener('pointermove', (event) => {
    const rect = hero.getBoundingClientRect();
    pointer.x = event.clientX - rect.left;
    pointer.y = event.clientY - rect.top;
    pointer.active = true;
    hero.style.setProperty('--profile-x', `${(pointer.x / width) * 100}%`);
    hero.style.setProperty('--profile-y', `${(pointer.y / height) * 100}%`);
    if (!reducedMotion.matches) {
      stage.style.setProperty('--stage-rx', `${-((pointer.y / height) - 0.5) * 5}deg`);
      stage.style.setProperty('--stage-ry', `${((pointer.x / width) - 0.5) * 6}deg`);
    }
  }, { passive: true });

  hero.addEventListener('pointerleave', () => {
    pointer.active = false;
    stage.style.setProperty('--stage-rx', '0deg');
    stage.style.setProperty('--stage-ry', '0deg');
  });

  document.querySelectorAll('.dimension-card, .profile-portal').forEach((card) => {
    card.addEventListener('pointermove', (event) => {
      if (reducedMotion.matches || event.pointerType === 'touch') return;
      const rect = card.getBoundingClientRect();
      card.style.setProperty('--card-x', `${event.clientX - rect.left}px`);
      card.style.setProperty('--card-y', `${event.clientY - rect.top}px`);
    }, { passive: true });
  });

  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -5% 0px' });

  document.querySelectorAll('.profile-reveal').forEach((element, index) => {
    element.style.setProperty('--reveal-delay', `${Math.min(index % 4, 3) * 65}ms`);
    revealObserver.observe(element);
  });

  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(hero);
  reducedMotion.addEventListener('change', setAnimation);
  resize();
  setAnimation();
})();
