'use strict';

const { encode, rewriteUrl } = require('./codec');

const HTML_ATTR_PATTERNS = [
  { tag: /(<(?:a|area)\s[^>]*\s*href\s*=\s*)(["'])([^"']+)\2/gi, group: 3 },
  { tag: /(<(?:script|img|source|track|embed|input)\s[^>]*\s*src\s*=\s*)(["'])([^"']+)\2/gi, group: 3 },
  { tag: /(<link\s[^>]*\s*href\s*=\s*)(["'])([^"']+)\2/gi, group: 3 },
  { tag: /(<form\s[^>]*\s*action\s*=\s*)(["'])([^"']+)\2/gi, group: 3 },
  { tag: /(<(?:video|audio|iframe|frame)\s[^>]*\s*src\s*=\s*)(["'])([^"']+)\2/gi, group: 3 },
  { tag: /(<meta\s[^>]*\s*content\s*=\s*)(["'])([^"']+)\2/gi, group: 3 },
];

function rewriteHtml(html, baseUrl) {
  let result = html;

  for (const { tag } of HTML_ATTR_PATTERNS) {
    result = result.replace(tag, (match, prefix, quote, url) => {
      if (url.startsWith('data:') || url.startsWith('blob:') || url.startsWith('#') || url.startsWith('javascript:') || url.startsWith('mailto:') || url.startsWith('tel:')) {
        return match;
      }
      const rewritten = rewriteUrl(url, baseUrl);
      return `${prefix}${quote}${rewritten}${quote}`;
    });
  }

  result = result.replace(/url\(\s*(["']?)([^"')]+)\1\s*\)/gi, (match, quote, url) => {
    if (url.startsWith('data:') || url.startsWith('blob:')) return match;
    const rewritten = rewriteUrl(url, baseUrl);
    return `url(${quote}${rewritten}${quote})`;
  });

  result = rewriteInlineScripts(result, baseUrl);
  result = rewriteMetaRefresh(result, baseUrl);
  result = injectInterceptor(result);

  return result;
}

function rewriteInlineScripts(html, baseUrl) {
  return html.replace(/<script([^>]*)>([\s\S]*?)<\/script>/gi, (match, attrs, code) => {
    if (attrs.includes('src=')) return match;
    const rewritten = rewriteJs(code, baseUrl);
    return `<script${attrs}>${rewritten}</script>`;
  });
}

function rewriteMetaRefresh(html, baseUrl) {
  return html.replace(/<meta\s[^>]*http-equiv\s*=\s*(["'])refresh\1[^>]*>/gi, (match) => {
    return match.replace(/content\s*=\s*(["'])(\d+;\s*url=)([^"']+)\1/i, (m, q, prefix, url) => {
      const rewritten = rewriteUrl(url, baseUrl);
      return `content=${q}${prefix}${rewritten}${q}`;
    });
  });
}

function injectInterceptor() {
  const interceptorTag = `<script src="/uoproxy-client.js" data-uop="interceptor"></script>`;
  return arguments[0].replace(/<\/head>/i, `${interceptorTag}</head>`);
}

function rewriteJs(js, baseUrl) {
  let result = js;

  result = result.replace(/\b(fetch\s*\(\s*)(["'`])([^"'`]+)\2/g, (match, fn, q, url) => {
    if (url.startsWith('http') || url.startsWith('/')) {
      const rewritten = rewriteUrl(url, baseUrl);
      return `${fn}${q}${rewritten}${q}`;
    }
    return match;
  });

  result = result.replace(/\blocation\s*=\s*(["'`])([^"'`]+)\1/g, (match, q, url) => {
    const rewritten = rewriteUrl(url, baseUrl);
    return `location = ${q}${rewritten}${q}`;
  });

  result = result.replace(/\blocation\.href\s*=\s*(["'`])([^"'`]+)\1/g, (match, q, url) => {
    const rewritten = rewriteUrl(url, baseUrl);
    return `location.href = ${q}${rewritten}${q}`;
  });

  return result;
}

function rewriteCss(css, baseUrl) {
  return css.replace(/url\(\s*(["']?)([^"')]+)\1\s*\)/gi, (match, quote, url) => {
    if (url.startsWith('data:') || url.startsWith('blob:')) return match;
    const rewritten = rewriteUrl(url, baseUrl);
    return `url(${quote}${rewritten}${quote})`;
  });
}

function rewriteHeaders(headers, baseUrl) {
  const out = {};
  const skip = new Set(['content-security-policy', 'content-security-policy-report-only', 'x-frame-options', 'strict-transport-security', 'x-xss-protection']);

  for (const [k, v] of Object.entries(headers)) {
    const lower = k.toLowerCase();
    if (skip.has(lower)) continue;
    if (lower === 'location') {
      out[k] = rewriteUrl(v, baseUrl);
    } else if (lower === 'set-cookie') {
      out[k] = rewriteCookies(Array.isArray(v) ? v : [v]);
    } else {
      out[k] = v;
    }
  }
  return out;
}

function rewriteCookies(cookies) {
  return cookies.map(cookie => {
    return cookie
      .replace(/;\s*domain=[^;]*/gi, '')
      .replace(/;\s*samesite=[^;]*/gi, '')
      .replace(/;\s*secure/gi, '');
  });
}

module.exports = { rewriteHtml, rewriteJs, rewriteCss, rewriteHeaders };
