export const escapeHtml = (value = '') =>
  String(value).replace(/[&<>'"]/g, character => ({
    '&':'&amp;',
    '<':'&lt;',
    '>':'&gt;',
    "'":'&#39;',
    '"':'&quot;',
  }[character]));

export function syncNavigationState(document, view) {
  document.querySelectorAll('.nav-button').forEach(button => {
    const active = button.dataset.view === view;
    button.classList.toggle('active', active);
    if (active) button.setAttribute('aria-current', 'page');
    else button.removeAttribute('aria-current');
  });
}

export function setMenuState(document, open, { focus = true } = {}) {
  const menu = document.querySelector('#side-menu');
  const wasOpen = menu.classList.contains('open');
  menu.classList.toggle('open', open);
  document.querySelector('#menu-backdrop').classList.toggle('open', open);
  menu.setAttribute('aria-hidden', String(!open));
  menu.toggleAttribute('inert', !open);
  document.querySelector('#open-menu').setAttribute('aria-expanded', String(open));
  document.body.style.overflow = open ? 'hidden' : '';
  if (!focus) return;
  if (open) document.defaultView.requestAnimationFrame(() => document.querySelector('#close-menu').focus());
  else if (wasOpen) document.querySelector('#open-menu').focus();
}
