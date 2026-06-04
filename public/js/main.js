'use strict';

const PREFIX = '/uop/';

function encode(url) {
  return PREFIX + btoa(url).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function normalizeUrl(input) {
  const trimmed = input.trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (/^[a-z0-9-]+\.[a-z]{2,}/i.test(trimmed)) return 'https://' + trimmed;
  return 'https://www.google.com/search?q=' + encodeURIComponent(trimmed);
}

function navigate(rawUrl) {
  const url = normalizeUrl(rawUrl);
  if (!url) return;
  window.location.href = encode(url);
}

document.addEventListener('DOMContentLoaded', () => {
  const input = document.getElementById('url-input');
  const btn = document.getElementById('go-btn');
  const error = document.getElementById('error-msg');
  const shortcuts = document.querySelectorAll('.shortcut-btn');

  function go() {
    const val = input.value.trim();
    if (!val) {
      error.textContent = 'URLまたはキーワードを入力してください';
      error.classList.add('show');
      return;
    }
    error.classList.remove('show');
    navigate(val);
  }

  btn.addEventListener('click', go);

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') go();
  });

  shortcuts.forEach(btn => {
    btn.addEventListener('click', () => {
      navigate(btn.dataset.url);
    });
  });

  input.focus();
});
