'use strict';

const PREFIX = '/uop/';

function encode(url) {
  return PREFIX + Buffer.from(url, 'utf8').toString('base64url');
}

function decode(encoded) {
  try {
    const raw = encoded.startsWith(PREFIX) ? encoded.slice(PREFIX.length) : encoded;
    return Buffer.from(raw, 'base64url').toString('utf8');
  } catch {
    return null;
  }
}

function isEncoded(path) {
  return path.startsWith(PREFIX);
}

function rewriteUrl(url, base) {
  try {
    const resolved = new URL(url, base);
    return encode(resolved.href);
  } catch {
    return url;
  }
}

module.exports = { encode, decode, isEncoded, rewriteUrl, PREFIX };
