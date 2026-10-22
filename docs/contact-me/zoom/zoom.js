(() => {
  const form = document.getElementById('zoom-join-form');
  const input = document.getElementById('zoom-meeting-link');
  const error = document.getElementById('zoom-link-error');
  if (!form || !input || !error) return;

  // Keep invitations in memory only. No query-string intake, storage, logging,
  // analytics, or network validation: the only request is the deliberate visit
  // to the user's own invitation when they press Continue.
  const clear = () => {
    input.value = '';
    input.removeAttribute('aria-invalid');
    error.textContent = '';
  };
  const fail = message => {
    error.textContent = message;
    input.setAttribute('aria-invalid', 'true');
    input.focus();
  };
  form.addEventListener('submit', event => {
    event.preventDefault();
    const value = input.value.trim();
    if (!value) return fail('Please paste the Zoom meeting link Elias shared with you.');
    let url;
    try { url = new URL(value); } catch {
      return fail('Please paste the complete Zoom link, starting with https://.');
    }
    const zoomHost = /^(?:[a-z0-9-]+\.)*zoom\.(?:us|com)$/.test(url.hostname);
    const meetingPath = /^\/(?:j\/\d{9,11}|my\/[a-z0-9._-]+|wc\/join\/\d{9,11})\/?$/i.test(url.pathname);
    if (url.protocol !== 'https:' || !zoomHost || url.username || url.password || url.port || /[\s\\]/.test(value)) {
      return fail('Use a secure Zoom link on zoom.us or zoom.com, including university Zoom subdomains.');
    }
    if (!meetingPath) {
      return fail('Please paste a Zoom meeting invitation, not the Zoom homepage. If you only have a meeting ID, use the link below.');
    }
    clear();
    window.location.assign(url.href);
  });
  input.addEventListener('input', () => {
    input.removeAttribute('aria-invalid');
    error.textContent = '';
  });
  window.addEventListener('pagehide', clear);
  window.addEventListener('pageshow', clear);
  clear();
  // Never expose a working native GET form if this script fails to initialize.
  form.hidden = false;
})();
