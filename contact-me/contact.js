(() => {
  const button = document.getElementById('contact-copy-email');
  const address = document.getElementById('contact-email');
  const status = document.getElementById('contact-copy-status');
  if (!button || !address || !status) return;

  button.hidden = false;
  button.addEventListener('click', async () => {
    const email = address.textContent.trim();
    button.disabled = true;
    status.textContent = '';
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(email);
      status.textContent = 'Email address copied.';
    } catch {
      address.focus({preventScroll: true});
      const selection = window.getSelection();
      if (selection) {
        const range = document.createRange();
        range.selectNodeContents(address);
        selection.removeAllRanges();
        selection.addRange(range);
        status.textContent = 'Automatic copying is unavailable. The email address is selected; use your device’s copy command.';
      } else {
        status.textContent = 'Automatic copying is unavailable. Please select and copy the email address above.';
      }
    } finally {
      button.disabled = false;
    }
  });
})();
