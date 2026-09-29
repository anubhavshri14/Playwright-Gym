#!/usr/bin/env node
/**
 * Locator Gym — static file server + tiny API + second origin.
 * No dependencies. Node 18 or newer.
 *
 *   node server.js            → http://localhost:4173  (app)
 *                             → http://127.0.0.1:4174  (payment widget origin)
 *   node server.js 8080       → app on 8080, widget on 8081
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const PORT = Number(process.argv[2]) || Number(process.env.PORT) || 4173;
const ORIGIN_PORT = Number(process.env.ORIGIN_PORT) || PORT + 1;
const ROOT = __dirname;

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.csv': 'text/csv; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.zip': 'application/zip',
  '.ico': 'image/x-icon'
};

const USERS = {
  maker:  { password: 'maker-pass',  role: 'maker',  name: 'Priya Shah' },
  viewer: { password: 'viewer-pass', role: 'viewer', name: 'Asha Rao' },
  asha:   { password: 'asha-pass',   role: 'maker',  name: 'Asha Rao' }
};

const SHIPS = [
  ['SHP-4100', 'Rotterdam', 'Maersk', 'In transit'],
  ['SHP-4101', 'Busan', 'ONE', 'Customs'],
  ['SHP-4102', 'Santos', 'Hapag', 'Delivered'],
  ['SHP-4103', 'Nhava Sheva', 'CMA CGM', 'Delayed'],
  ['SHP-4104', 'Valencia', 'Evergreen', 'In transit'],
  ['SHP-4105', 'Jebel Ali', 'Maersk', 'In transit'],
  ['SHP-4106', 'Durban', 'ONE', 'Customs'],
  ['SHP-4107', 'Callao', 'Hapag', 'Delivered'],
  ['SHP-4108', 'Hamburg', 'Maersk', 'In transit'],
  ['SHP-4109', 'Piraeus', 'MSC', 'Hold'],
  ['SHP-4110', 'Colombo', 'ONE', 'In transit'],
  ['SHP-4111', 'Felixstowe', 'Hapag', 'Customs']
];

const sessions = new Map();
let heartbeat = 0;

function json(res, status, body, extraHeaders) {
  const raw = JSON.stringify(body);
  const headers = Object.assign({
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Gym-Mode',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
  }, extraHeaders || {});
  res.writeHead(status, headers);
  res.end(raw);
}

function readBody(req) {
  return new Promise((resolve) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8');
      if (!raw) return resolve({});
      try { resolve(JSON.parse(raw)); } catch (_) { resolve({ raw }); }
    });
  });
}

function parseCookie(req) {
  const out = {};
  const raw = req.headers.cookie || '';
  raw.split(';').forEach((part) => {
    const i = part.indexOf('=');
    if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  });
  return out;
}

function sessionUser(req) {
  const sid = parseCookie(req)['gym.sid'];
  if (!sid) return null;
  const row = sessions.get(sid);
  if (!row) return null;
  if (Date.now() > row.exp) {
    sessions.delete(sid);
    return null;
  }
  return row;
}

function serveStatic(req, res, pathname) {
  if (pathname === '/') pathname = '/index.html';
  const filePath = path.join(ROOT, path.normalize(pathname));
  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    return res.end('Forbidden');
  }
  fs.stat(filePath, (err, stat) => {
    if (err || !stat.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
      return res.end(
        '<body style="font:15px system-ui;padding:40px;color:#0E2038;background:#EDF1F5">' +
        '<h1 style="font-family:ui-monospace,monospace">404</h1>' +
        '<p>No file at <code>' + pathname + '</code>.</p>' +
        '<p><a href="/">Back to the bench</a></p></body>'
      );
    }
    const ext = path.extname(filePath).toLowerCase();
    const headers = {
      'Content-Type': TYPES[ext] || 'application/octet-stream',
      'Content-Length': stat.size,
      'Cache-Control': 'no-store',
      'Access-Control-Allow-Origin': '*'
    };
    if (ext === '.zip') {
      headers['Content-Disposition'] = 'attachment; filename="' + path.basename(filePath) + '"';
    }
    res.writeHead(200, headers);
    fs.createReadStream(filePath).pipe(res);
  });
}

async function handleApi(req, res, url) {
  if (req.method === 'OPTIONS') {
    return json(res, 204, {});
  }

  const mode = url.searchParams.get('mode') || req.headers['x-gym-mode'] || 'ok';

  if (url.pathname === '/api/heartbeat' && req.method === 'GET') {
    heartbeat += 1;
    return json(res, 200, { tick: heartbeat, ts: Date.now() });
  }

  if (url.pathname === '/api/search' && req.method === 'GET') {
    if (mode === 'error') return json(res, 500, { error: 'search backend unavailable' });
    if (mode === 'slow') await new Promise((r) => setTimeout(r, 1800));
    const q = (url.searchParams.get('q') || '').trim().toLowerCase();
    let items = SHIPS.map(([ref, dest, carrier, status]) => ({ ref, dest, carrier, status }));
    if (q) items = items.filter((r) => (r.ref + r.dest + r.carrier + r.status).toLowerCase().includes(q));
    if (mode === 'empty') items = [];
    return json(res, 200, { items, query: q, count: items.length });
  }

  if (url.pathname === '/api/login' && req.method === 'POST') {
    const body = await readBody(req);
    const username = String(body.username || '').trim().toLowerCase();
    const password = String(body.password || '');
    const rec = USERS[username];
    if (!rec || rec.password !== password) {
      return json(res, 401, { error: 'invalid credentials' });
    }
    const sid = 'sid-' + Math.random().toString(36).slice(2, 12);
    const exp = Date.now() + 30 * 60 * 1000;
    sessions.set(sid, { username, role: rec.role, name: rec.name, exp });
    return json(res, 200, { ok: true, user: { username, role: rec.role, name: rec.name } }, {
      'Set-Cookie': 'gym.sid=' + sid + '; Path=/; SameSite=Lax'
    });
  }

  if (url.pathname === '/api/logout' && req.method === 'POST') {
    const sid = parseCookie(req)['gym.sid'];
    if (sid) sessions.delete(sid);
    return json(res, 200, { ok: true }, { 'Set-Cookie': 'gym.sid=; Path=/; Max-Age=0' });
  }

  if (url.pathname === '/api/me' && req.method === 'GET') {
    const user = sessionUser(req);
    if (!user) return json(res, 401, { error: 'unauthenticated' });
    return json(res, 200, { user: { username: user.username, role: user.role, name: user.name } });
  }

  if (url.pathname === '/api/invoices' && req.method === 'GET') {
    const user = sessionUser(req);
    if (!user) return json(res, 401, { error: 'unauthenticated' });
    return json(res, 200, {
      invoices: [
        { id: 'INV-2201', customer: 'Hearthline', total: 18400, status: 'open' },
        { id: 'INV-2202', customer: 'Kestrel', total: 9200, status: 'paid' },
        { id: 'INV-2203', customer: 'Heron Health', total: 4410, status: 'hold' }
      ]
    });
  }

  if (url.pathname === '/api/token' && req.method === 'POST') {
    const body = await readBody(req);
    const last4 = String(body.number || '').replace(/\D/g, '').slice(-4);
    if (last4.length !== 4) return json(res, 400, { error: 'card required' });
    return json(res, 200, { token: 'tok_' + last4 + '_' + Math.random().toString(36).slice(2, 8), last4 });
  }

  return json(res, 404, { error: 'no such route', path: url.pathname });
}

function onRequest(req, res) {
  const host = req.headers.host || 'localhost:' + PORT;
  const url = new URL(req.url, 'http://' + host);
  if (url.pathname.startsWith('/api/')) return handleApi(req, res, url).catch((err) => {
    json(res, 500, { error: String(err && err.message || err) });
  });
  serveStatic(req, res, decodeURIComponent(url.pathname));
}

const app = http.createServer(onRequest);
const origin = http.createServer(onRequest);

app.listen(PORT, '0.0.0.0', () => {
  origin.listen(ORIGIN_PORT, '0.0.0.0', () => {
    console.log('');
    console.log('  Locator Gym is up');
    console.log('  → http://localhost:' + PORT + '          app');
    console.log('  → http://127.0.0.1:' + ORIGIN_PORT + '        payment origin (use 127.0.0.1, not localhost)');
    console.log('');
    console.log('  Ctrl-C to stop.');
    console.log('');
  });
});
