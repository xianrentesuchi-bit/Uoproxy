'use strict';

const https = require('https');
const http = require('http');
const { URL } = require('url');

const BLOCKED_HEADERS = new Set([
  'host', 'connection', 'transfer-encoding', 'te',
  'trailer', 'upgrade', 'proxy-authorization', 'proxy-authenticate',
  'x-forwarded-for', 'x-real-ip', 'cf-connecting-ip',
]);

function buildRequestHeaders(incomingHeaders, targetUrl) {
  const out = {};
  for (const [k, v] of Object.entries(incomingHeaders)) {
    const lower = k.toLowerCase();
    if (!BLOCKED_HEADERS.has(lower)) {
      if (lower === 'referer') {
        try {
          const ref = new URL(v);
          out['referer'] = ref.href;
        } catch { /* skip */ }
      } else if (lower === 'origin') {
        out['origin'] = new URL(targetUrl).origin;
      } else {
        out[k] = v;
      }
    }
  }
  const parsed = new URL(targetUrl);
  out['host'] = parsed.host;
  out['user-agent'] = incomingHeaders['user-agent'] || 'Mozilla/5.0 (compatible; UoProxy/1.0)';
  return out;
}

function fetch(targetUrl, options = {}) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(targetUrl);
    const driver = parsed.protocol === 'https:' ? https : http;

    const reqOptions = {
      hostname: parsed.hostname,
      port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
      path: parsed.pathname + parsed.search,
      method: options.method || 'GET',
      headers: options.headers || {},
      timeout: 15000,
    };

    const req = driver.request(reqOptions, (res) => {
      resolve(res);
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timed out'));
    });

    req.on('error', reject);

    if (options.body) {
      req.write(options.body);
    }

    req.end();
  });
}

module.exports = { fetch, buildRequestHeaders };
