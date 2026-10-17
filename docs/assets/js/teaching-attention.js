// Native disclosure works without JS; this also reveals linked content inside it.
(() => {
  if (!document.querySelector('.attention-disclosure')) return;
  function reveal(hash) {
    let id;
    try { id = decodeURIComponent(hash.replace(/^#/, '')); } catch { return; }
    const target = document.getElementById(id);
    if (!target || !target.closest('.attention-disclosure')) return;
    for (let parent = target; parent; parent = parent.parentElement) {
      if (parent.tagName === 'DETAILS') parent.open = true;
    }
    requestAnimationFrame(() => target.scrollIntoView({block: 'start'}));
  }
  document.addEventListener('click', (event) => {
    const link = event.target.closest('a[href]');
    if (!link || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const url = new URL(link.href, location.href);
    if (url.origin === location.origin && url.pathname === location.pathname && url.hash) reveal(url.hash);
  });
  window.addEventListener('hashchange', () => reveal(location.hash));
  if (location.hash) reveal(location.hash);
})();
