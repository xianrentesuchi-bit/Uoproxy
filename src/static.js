'use strict';

const fs = require('fs');
const path = require('path');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
};

const PUBLIC_DIR = path.join(__dirname, '../public');

function serveStatic(req, res) {
  let urlPath = req.url.split('?')[0];

  if (urlPath === '/uoproxy-client.js') {
    const clientPath = path.join(PUBLIC_DIR, 'js/interceptor.js');
    try {
      const content = fs.readFileSync(clientPath);
      res.writeHead(200, { 'content-type': 'application/javascript', 'cache-control': 'public, max-age=3600' });
      res.end(content);
      return true;
    } catch {
      return false;
    }
  }

  if (urlPath === '/' || urlPath === '') urlPath = '/index.html';

  const filePath = path.join(PUBLIC_DIR, urlPath);

  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    res.end('Forbidden');
    return true;
  }

  try {
    const stat = fs.statSync(filePath);
    if (!stat.isFile()) return false;

    const ext = path.extname(filePath);
    const mime = MIME_TYPES[ext] || 'application/octet-stream';
    const content = fs.readFileSync(filePath);

    res.writeHead(200, { 'content-type': mime, 'cache-control': 'public, max-age=3600' });
    res.end(content);
    return true;
  } catch {
    return false;
  }
}

module.exports = { serveStatic };
