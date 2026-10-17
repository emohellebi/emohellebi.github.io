/* Guided highlights complement, rather than replace, the quantitative labs. */
(() => {
  'use strict';
  const figures = [...document.querySelectorAll('.mechanism')];
  if (!figures.length) return;
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const dialog = document.createElement('dialog');
  dialog.className = 'figure-dialog';
  dialog.setAttribute('aria-labelledby', 'figure-dialog-title');
  dialog.innerHTML = '<header><h2 id="figure-dialog-title"></h2><button type="button" data-zoom aria-pressed="false">Actual size</button><button type="button" data-close autofocus>Close figure</button></header><div class="figure-viewport" tabindex="0" aria-label="Enlarged figure; scroll to inspect when at actual size"><img alt=""></div><p></p>';
  document.body.append(dialog);
  let opener = null;
  dialog.querySelector('[data-close]').addEventListener('click', () => dialog.close());
  const zoom = dialog.querySelector('[data-zoom]');
  zoom.addEventListener('click', () => {
    const active = dialog.classList.toggle('is-zoomed');
    zoom.textContent = active ? 'Fit to screen' : 'Actual size';
    zoom.setAttribute('aria-pressed', String(active));
  });
  dialog.addEventListener('close', () => { opener?.focus(); });
  function button(label, action, parent) {
    const b = document.createElement('button');
    b.type = 'button'; b.textContent = label;
    b.addEventListener('click', action); parent.append(b); return b;
  }
  figures.forEach(figure => {
    const open = figure.querySelector('.figure-open');
    open?.addEventListener('click', event => {
      if (!dialog.showModal || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      opener = open;
      dialog.querySelector('h2').textContent = figure.querySelector('h4').textContent;
      const img = dialog.querySelector('img');
      img.src = open.href; img.alt = figure.querySelector('img').alt;
      dialog.classList.remove('is-zoomed'); zoom.textContent = 'Actual size'; zoom.setAttribute('aria-pressed', 'false');
      dialog.querySelector('.figure-viewport').scrollTo(0, 0);
      dialog.querySelector('p').innerHTML = figure.querySelector('figcaption').innerHTML;
      stop(); dialog.showModal();
    });
    const steps = [...figure.querySelectorAll('ol > li')];
    let timer = null, index = 0, play;
    function stop() { if (timer !== null) clearInterval(timer); timer = null; if (play) { play.textContent = 'Play walkthrough'; play.setAttribute('aria-pressed', 'false'); } }
    if (!steps.length) return;
    const toolbar = document.createElement('div'); toolbar.className = 'mechanism-toolbar';
    figure.querySelector('figcaption').after(toolbar);
    const marker = document.createElement('span'); marker.className = 'mechanism-focus'; marker.setAttribute('aria-hidden', 'true');
    figure.querySelector('.mechanism-stage').append(marker);
    const choices = document.createElement('div'); choices.className = 'mechanism-steps'; choices.setAttribute('role', 'group'); choices.setAttribute('aria-label', 'Walkthrough steps');
    toolbar.after(choices);
    const status = document.createElement('span'); status.className = 'visually-hidden'; status.setAttribute('aria-live', 'polite'); toolbar.append(status);
    const show = (n, announce = false) => {
      index = Math.max(0, Math.min(n, steps.length - 1));
      steps.forEach((step, i) => { step.hidden = i !== index; });
      stepButtons.forEach((b, i) => { if (i === index) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current'); });
      const [x, y, w, h] = steps[index].dataset.focus.split(',').map(Number);
      Object.assign(marker.style, { left: `${x}%`, top: `${y}%`, width: `${w}%`, height: `${h}%` });
      marker.dataset.number = String(index + 1);
      previous.disabled = index === 0; next.disabled = index === steps.length - 1;
      if (announce) status.textContent = `Step ${index + 1} of ${steps.length}. ${steps[index].textContent}`;
    };
    play = button('Play walkthrough', () => {
      if (timer !== null) { stop(); return; }
      if (motion.matches) return;
      if (index === steps.length - 1) show(0);
      play.textContent = 'Pause walkthrough'; play.setAttribute('aria-pressed', 'true');
      timer = setInterval(() => { show(index + 1); if (index === steps.length - 1) stop(); }, 5500);
    }, toolbar);
    play.setAttribute('aria-pressed', 'false');
    const previous = button('Previous', () => { stop(); show(index - 1, true); }, toolbar);
    const next = button('Next', () => { stop(); show(index + 1, true); }, toolbar);
    button('Reset', () => { stop(); show(0, true); }, toolbar);
    if (open) toolbar.append(open);
    const stepButtons = steps.map((step, i) => {
      const b = button(String(i + 1).padStart(2, '0'), () => { stop(); show(i, true); }, choices);
      b.setAttribute('aria-label', `Step ${i + 1}: ${step.querySelector('strong').textContent}`); return b;
    });
    const preference = () => { stop(); play.disabled = motion.matches; play.title = motion.matches ? 'Reduced motion is enabled. Use Next or a numbered step.' : 'Advance the highlights every 5.5 seconds'; };
    motion.addEventListener('change', preference); preference();
    document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); });
    if ('IntersectionObserver' in window) new IntersectionObserver(entries => { if (!entries[0].isIntersecting) stop(); }).observe(figure);
    figure.classList.add('is-enhanced'); show(0);
  });
})();
