'use strict';

const { decode, encode, isEncoded } = require('./codec');
const { fetch, buildRequestHeaders } = require('./fetcher');
const { rewriteHtml, rewriteJs, rewriteCss, rewriteHeaders } = require('./rewriter');
const zlib = require('zlib');
const { promisify } = require('util');

const gunzip = promisify(zlib.gunzip);
const inflate = promisify(zlib.inflate);
const brotliDecompress = promisify(zlib.brotliDecompress);

async function decompressBody(buffer, encoding) {
  if (!encoding) return buffer;
  const enc = encoding.toLowerCase();
  try {
    if (enc.includes('br')) return await brotliDecompress(buffer);
    if (enc.includes('gzip')) return await gunzip(buffer);
    if (enc.includes('deflate')) return await inflate(buffer);
  } catch {
    return buffer;
  }
  return buffer;
}

function collectBody(stream) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    stream.on('data', chunk => chunks.push(chunk));
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    stream.on('error', reject);
  });
}

async function handleProxy(req, res) {
  const urlPath = req.url.split('?')[0];

  if (!isEncoded(urlPath)) {
    return false;
  }

  const targetUrl = decode(urlPath);

  if (!targetUrl) {
    res.writeHead(400, { 'content-type': 'text/plain' });
    res.end('Invalid proxy URL');
    return true;
  }

  let parsedTarget;
  try {
    parsedTarget = new URL(targetUrl);
  } catch {
    res.writeHead(400, { 'content-type': 'text/plain' });
    res.end('Malformed target URL');
    return true;
  }

  try {
    const reqHeaders = buildRequestHeaders(req.headers, targetUrl);
    delete reqHeaders['accept-encoding'];
    reqHeaders['accept-encoding'] = 'gzip, deflate, br';

    let body = null;
    if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
      body = await collectBody(req);
    }

    const upstream = await fetch(targetUrl, {
      method: req.method,
      headers: reqHeaders,
      body,
    });

    const rawBuffer = await collectBody(upstream);
    const encoding = upstream.headers['content-encoding'];
    const decompressed = await decompressBody(rawBuffer, encoding);

    const contentType = (upstream.headers['content-type'] || '').toLowerCase();
    const rewrittenHeaders = rewriteHeaders(upstream.headers, targetUrl);
    delete rewrittenHeaders['content-encoding'];
    delete rewrittenHeaders['content-length'];

    let responseBody;

    if (contentType.includes('text/html')) {
      const text = decompressed.toString('utf8');
      responseBody = Buffer.from(rewriteHtml(text, targetUrl), 'utf8');
      rewrittenHeaders['content-type'] = 'text/html; charset=utf-8';
    } else if (contentType.includes('javascript') || contentType.includes('ecmascript')) {
      const text = decompressed.toString('utf8');
      responseBody = Buffer.from(rewriteJs(text, targetUrl), 'utf8');
    } else if (contentType.includes('text/css')) {
      const text = decompressed.toString('utf8');
      responseBody = Buffer.from(rewriteCss(text, targetUrl), 'utf8');
    } else {
      responseBody = decompressed;
    }

    rewrittenHeaders['content-length'] = Buffer.byteLength(responseBody);
    rewrittenHeaders['x-uoproxy-url'] = targetUrl;

    const statusCode = upstream.statusCode;
    if (statusCode >= 300 && statusCode < 400 && rewrittenHeaders['location']) {
      res.writeHead(statusCode, rewrittenHeaders);
      res.end();
      return true;
    }

    res.writeHead(statusCode, rewrittenHeaders);
    res.end(responseBody);

  } catch (err) {
    res.writeHead(502, { 'content-type': 'text/html; charset=utf-8' });
    res.end(`<!DOCTYPE html><html><body><h2>Proxy Error</h2><p>${err.message}</p></body></html>`);
  }

  return true;
}

module.exports = { handleProxy };
