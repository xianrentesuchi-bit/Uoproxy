(function () {
  'use strict';

  const PREFIX = '/uop/';

  function encode(url) {
    try {
      return PREFIX + btoa(url).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
    } catch {
      return url;
    }
  }

  function resolveUrl(url, base) {
    try {
      return new URL(url, base).href;
    } catch {
      return url;
    }
  }

  function shouldProxy(url) {
    return url && !url.startsWith(PREFIX) && !url.startsWith('data:') &&
      !url.startsWith('blob:') && !url.startsWith('#') &&
      !url.startsWith('javascript:') && !url.startsWith('mailto:');
  }

  const _open = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function (method, url, ...rest) {
    if (shouldProxy(url)) {
      const resolved = resolveUrl(url, window.__uop_base__ || location.href);
      url = encode(resolved);
    }
    return _open.call(this, method, url, ...rest);
  };

  const _fetch = window.fetch;
  window.fetch = function (input, init) {
    if (typeof input === 'string' && shouldProxy(input)) {
      const resolved = resolveUrl(input, window.__uop_base__ || location.href);
      input = encode(resolved);
    } else if (input instanceof Request && shouldProxy(input.url)) {
      const resolved = resolveUrl(input.url, window.__uop_base__ || location.href);
      input = new Request(encode(resolved), input);
    }
    return _fetch.call(window, input, init);
  };

  const locationHandler = {
    get(target, prop) {
      if (prop === 'href' || prop === 'pathname') return target[prop];
      if (prop === 'assign' || prop === 'replace') {
        return function (url) {
          if (shouldProxy(url)) {
            const resolved = resolveUrl(url, window.__uop_base__ || location.href);
            return target[prop](encode(resolved));
          }
          return target[prop](url);
        };
      }
      return typeof target[prop] === 'function' ? target[prop].bind(target) : target[prop];
    },
    set(target, prop, value) {
      if (prop === 'href' && shouldProxy(value)) {
        const resolved = resolveUrl(value, window.__uop_base__ || location.href);
        target.href = encode(resolved);
        return true;
      }
      target[prop] = value;
      return true;
    }
  };

  try {
    Object.defineProperty(window, 'location', {
      get() { return new Proxy(window.location, locationHandler); },
      configurable: true,
    });
  } catch { /* some browsers restrict this */ }

  const _pushState = history.pushState;
  history.pushState = function (state, title, url) {
    if (url && shouldProxy(url)) {
      const resolved = resolveUrl(url, window.__uop_base__ || location.href);
      return _pushState.call(history, state, title, encode(resolved));
    }
    return _pushState.call(history, state, title, url);
  };

  const _replaceState = history.replaceState;
  history.replaceState = function (state, title, url) {
    if (url && shouldProxy(url)) {
      const resolved = resolveUrl(url, window.__uop_base__ || location.href);
      return _replaceState.call(history, state, title, encode(resolved));
    }
    return _replaceState.call(history, state, title, url);
  };

  const _createElement = document.createElement.bind(document);
  document.createElement = function (tag, ...args) {
    const el = _createElement(tag, ...args);
    if (tag.toLowerCase() === 'a') {
      const _setAttr = el.setAttribute.bind(el);
      el.setAttribute = function (name, value) {
        if (name === 'href' && shouldProxy(value)) {
          const resolved = resolveUrl(value, window.__uop_base__ || location.href);
          return _setAttr(name, encode(resolved));
        }
        return _setAttr(name, value);
      };
    }
    return el;
  };

  const _open2 = window.open;
  window.open = function (url, ...rest) {
    if (url && shouldProxy(url)) {
      const resolved = resolveUrl(url, window.__uop_base__ || location.href);
      return _open2.call(window, encode(resolved), ...rest);
    }
    return _open2.call(window, url, ...rest);
  };

  const metaBase = document.querySelector('base');
  if (metaBase) {
    window.__uop_base__ = metaBase.href;
  }

})();
