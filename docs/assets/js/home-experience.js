(() => {
  const root = document.querySelector('.home-experience');
  const canvas = document.querySelector('#identity-field');
  const hero = document.querySelector('#identity-hero');
  if (!root || !canvas || !hero) return;

  root.classList.add('home-enhanced');

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const ctx = canvas.getContext('2d');
  let width = 0;
  let height = 0;
  let dpr = 1;
  let animationFrame = 0;
  let particles = [];
  const pointer = { x: 0, y: 0, active: false };
  const palette = ['#65f4d3', '#8db6ff', '#d597ff', '#ffaf72'];

  class Particle {
    constructor(index) {
      this.index = index;
      this.reset(true);
    }

    reset(initial = false) {
      this.x = Math.random() * width;
      this.y = initial ? Math.random() * height : height + 20;
      this.vx = (Math.random() - 0.5) * 0.16;
      this.vy = -(0.06 + Math.random() * 0.16);
      this.radius = 1.15 + Math.random() * 2.25;
      if (this.index % 14 === 0) this.radius += 1.8;
      this.alpha = 0.3 + Math.random() * 0.58;
      this.color = palette[this.index % palette.length];
    }

    update() {
      if (pointer.active) {
        const dx = pointer.x - this.x;
        const dy = pointer.y - this.y;
        const distance = Math.hypot(dx, dy) || 1;
        if (distance < 180) {
          const force = (180 - distance) / 18000;
          this.vx += dx * force * 0.012;
          this.vy += dy * force * 0.012;
        }
      }
      this.vx *= 0.995;
      this.vy *= 0.998;
      this.x += this.vx;
      this.y += this.vy;
      if (this.y < -25 || this.x < -30 || this.x > width + 30) this.reset();
    }

    draw() {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
      ctx.fillStyle = this.color;
      ctx.globalAlpha = this.alpha;
      ctx.fill();
    }
  }

  function resizeCanvas() {
    const rect = hero.getBoundingClientRect();
    width = Math.max(1, rect.width);
    height = Math.max(1, rect.height);
    dpr = Math.min(window.devicePixelRatio || 1, 1.75);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const targetCount = Math.min(220, Math.max(100, Math.round(width / 7.5)));
    particles = Array.from({ length: targetCount }, (_, index) => new Particle(index));
    drawFrame(false);
  }

  function connectParticles() {
    const maxDistance = width < 700 ? 118 : 165;
    for (let i = 0; i < particles.length; i += 1) {
      for (let j = i + 1; j < particles.length; j += 1) {
        const a = particles[i];
        const b = particles[j];
        const distance = Math.hypot(a.x - b.x, a.y - b.y);
        if (distance < maxDistance) {
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.strokeStyle = '#8db6ff';
          ctx.globalAlpha = (1 - distance / maxDistance) * 0.21;
          ctx.lineWidth = 0.75;
          ctx.stroke();
        }
      }
    }
  }

  function drawFrame(advance = true) {
    ctx.clearRect(0, 0, width, height);
    ctx.globalCompositeOperation = 'lighter';
    if (advance) particles.forEach((particle) => particle.update());
    connectParticles();
    particles.forEach((particle) => particle.draw());
    if (pointer.active) {
      particles.forEach((particle) => {
        const distance = Math.hypot(pointer.x - particle.x, pointer.y - particle.y);
        if (distance < 220) {
          ctx.beginPath();
          ctx.moveTo(pointer.x, pointer.y);
          ctx.lineTo(particle.x, particle.y);
          ctx.strokeStyle = particle.color;
          ctx.globalAlpha = (1 - distance / 220) * 0.18;
          ctx.lineWidth = 0.8;
          ctx.stroke();
        }
      });
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }

  function animate() {
    drawFrame(true);
    animationFrame = window.requestAnimationFrame(animate);
  }

  function setAnimation() {
    window.cancelAnimationFrame(animationFrame);
    if (reducedMotion.matches) drawFrame(false);
    else animate();
  }

  hero.addEventListener('pointermove', (event) => {
    const rect = hero.getBoundingClientRect();
    pointer.x = event.clientX - rect.left;
    pointer.y = event.clientY - rect.top;
    pointer.active = true;
    hero.style.setProperty('--pointer-x', `${(pointer.x / width) * 100}%`);
    hero.style.setProperty('--pointer-y', `${(pointer.y / height) * 100}%`);

    if (!reducedMotion.matches) {
      const rotateY = ((event.clientX - rect.left) / rect.width - 0.5) * 7;
      const rotateX = -((event.clientY - rect.top) / rect.height - 0.5) * 7;
      hero.style.setProperty('--orbit-rx', `${rotateX}deg`);
      hero.style.setProperty('--orbit-ry', `${rotateY}deg`);
    }
  }, { passive: true });

  hero.addEventListener('pointerleave', () => {
    pointer.active = false;
    hero.style.setProperty('--orbit-rx', '0deg');
    hero.style.setProperty('--orbit-ry', '0deg');
  });

  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });

  document.querySelectorAll('.home-reveal').forEach((element, index) => {
    element.style.setProperty('--reveal-delay', `${Math.min(index % 5, 4) * 70}ms`);
    revealObserver.observe(element);
  });

  document.querySelectorAll('.coordinate-card, .portal-card').forEach((card) => {
    card.addEventListener('pointermove', (event) => {
      if (reducedMotion.matches || event.pointerType === 'touch') return;
      const rect = card.getBoundingClientRect();
      card.style.setProperty('--card-x', `${event.clientX - rect.left}px`);
      card.style.setProperty('--card-y', `${event.clientY - rect.top}px`);
      card.style.setProperty('--card-rx', `${-((event.clientY - rect.top) / rect.height - 0.5) * 3}deg`);
      card.style.setProperty('--card-ry', `${((event.clientX - rect.left) / rect.width - 0.5) * 4}deg`);
    }, { passive: true });
    card.addEventListener('pointerleave', () => {
      card.style.setProperty('--card-rx', '0deg');
      card.style.setProperty('--card-ry', '0deg');
    });
  });

  const resizeObserver = new ResizeObserver(resizeCanvas);
  resizeObserver.observe(hero);
  reducedMotion.addEventListener('change', setAnimation);
  resizeCanvas();
  setAnimation();
})();
