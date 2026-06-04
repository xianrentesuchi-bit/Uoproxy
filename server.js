'use strict';

const http = require('http');
const { handleProxy } = require('./src/proxy');
const { serveStatic } = require('./src/static');
const { isEncoded } = require('./src/codec');

const PORT = process.env.PORT || 8080;

const server = http.createServer(async (req, res) => {
  const urlPath = req.url;

  if (isEncoded(urlPath)) {
    const handled = await handleProxy(req, res);
    if (handled) return;
  }

  const staticHandled = serveStatic(req, res);
  if (staticHandled) return;

  res.writeHead(404, { 'content-type': 'text/plain' });
  res.end('Not Found');
});

server.listen(PORT, () => {
  console.log(`UoProxy running at http://localhost:${PORT}`);
});

server.on('error', (err) => {
  console.error('Server error:', err);
});
