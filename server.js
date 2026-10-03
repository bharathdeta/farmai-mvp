const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const handler = require('./api/chat');
// Minimal local-only .env loader. Never expose these values to the browser.
try { fs.readFileSync('.env', 'utf8').split(/\r?\n/).forEach(line => { const i = line.indexOf('='); if (i > 0 && !line.startsWith('#')) process.env[line.slice(0, i).trim()] ||= line.slice(i + 1).trim(); }); } catch {}
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json' };
http.createServer((req, res) => {
  const pathname = new URL(req.url, 'http://localhost').pathname;
  if (pathname === '/api/chat') return handler(req, res);
  const clean = pathname === '/' ? '/index.html' : pathname;
  const file = path.join(__dirname, 'public', clean);
  if (!file.startsWith(path.join(__dirname, 'public')) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.statusCode = 404; return res.end('Not found'); }
  res.setHeader('Content-Type', types[path.extname(file)] || 'application/octet-stream'); fs.createReadStream(file).pipe(res);
}).listen(process.env.PORT || 3000, () => console.log('FarmAI running at http://localhost:3000'));
