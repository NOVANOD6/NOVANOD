import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const prefix = '/NOVANOD/';
const types = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.mp4': 'video/mp4',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
};

http.createServer((req, res) => {
  let pathname;
  try { pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname); }
  catch { res.writeHead(400).end('Bad request'); return; }

  if (!pathname.startsWith(prefix)) {
    res.writeHead(404).end('Not found'); return;
  }
  let relative = pathname.slice(prefix.length);
  if (!relative || relative.endsWith('/')) relative += 'index.html';
  const target = path.resolve(root, relative);
  if (target !== root && !target.startsWith(root + path.sep)) {
    res.writeHead(403).end('Forbidden'); return;
  }
  fs.stat(target, (statError, stat) => {
    if (statError || !stat.isFile()) { res.writeHead(404).end('Not found'); return; }
    res.writeHead(200, {
      'Content-Type': types[path.extname(target).toLowerCase()] || 'application/octet-stream',
      'Content-Length': stat.size,
      'X-Content-Type-Options': 'nosniff',
    });
    fs.createReadStream(target).pipe(res);
  });
}).listen(4173, '127.0.0.1', () => {
  console.log('NOVANOD preview: http://127.0.0.1:4173/NOVANOD/');
});
