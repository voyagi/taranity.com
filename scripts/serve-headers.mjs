// Minimal static server that serves dist/ AND applies the response headers from
// dist/_headers - so the production CSP/security headers can be tested locally
// (astro preview ignores _headers). Not for production; CF Pages serves the real site.
//
// Header application mirrors Cloudflare Pages: EVERY rule whose pattern matches the path
// contributes its headers cumulatively, duplicate header names COMBINE (multiple values)
// rather than override, and a `! Header-Name` line DETACHES an inherited header. This makes
// the local harness faithful to production - e.g. a scoped CSP must `! Content-Security-Policy`
// to drop the inherited /* policy, otherwise the browser enforces both (the intersection).
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { join, normalize, extname, resolve } from 'node:path';

const DIST = resolve('dist'); // absolute, so the traversal guard is cwd-independent
const PORT = Number(process.env.PORT) || 4321;
const UNSET = Symbol('unset');

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
};

// Parse dist/_headers into [{ test(path), headers: [[name, value|UNSET], ...] }] rules.
// Header entries keep source order so a `! Name` detach is applied at the right point.
function parseHeaders() {
  const file = join(DIST, '_headers');
  if (!existsSync(file)) return [];
  const rules = [];
  let current = null;
  for (const raw of readFileSync(file, 'utf8').split(/\r?\n/)) {
    if (!raw.trim() || raw.trim().startsWith('#')) continue;
    if (!/^\s/.test(raw)) {
      current = { pattern: raw.trim(), headers: [] };
      rules.push(current);
    } else if (current) {
      const trimmed = raw.trim();
      if (trimmed.startsWith('! ')) {
        current.headers.push([trimmed.slice(2).trim(), UNSET]);
      } else {
        const idx = raw.indexOf(':');
        if (idx > 0) current.headers.push([raw.slice(0, idx).trim(), raw.slice(idx + 1).trim()]);
      }
    }
  }
  return rules.map((r) => ({
    headers: r.headers,
    test: (p) =>
      r.pattern === '/*'
        ? true
        : r.pattern.endsWith('/*')
          ? p.startsWith(r.pattern.slice(0, -1))
          : p === r.pattern,
  }));
}

const RULES = parseHeaders();
const applyHeaders = (res, path) => {
  for (const rule of RULES) {
    if (!rule.test(path)) continue;
    for (const [name, value] of rule.headers) {
      if (value === UNSET) {
        res.removeHeader(name);
        continue;
      }
      const existing = res.getHeader(name);
      if (existing === undefined) res.setHeader(name, value);
      // Combine (emit multiple headers), matching Cloudflare's cumulative behavior.
      else res.setHeader(name, [...(Array.isArray(existing) ? existing : [existing]), value]);
    }
  }
};

const send = (res, status, path, body, type) => {
  applyHeaders(res, path);
  res.setHeader('Content-Type', type || 'text/plain; charset=utf-8');
  res.writeHead(status);
  res.end(body);
};

createServer((req, res) => {
  try {
    // decodeURIComponent throws on malformed %-encoding - keep one bad request
    // from crashing the whole dev server.
    const reqPath = decodeURIComponent((req.url || '/').split('?')[0]);
    // Resolve to a file inside DIST (block traversal).
    const rel = normalize(reqPath).replace(/^(\.\.[/\\])+/, '');
    let file = join(DIST, rel);
    if (!file.startsWith(DIST)) return send(res, 403, reqPath, 'Forbidden');

    if (existsSync(file) && statSync(file).isDirectory()) file = join(file, 'index.html');
    else if (!existsSync(file) && existsSync(join(DIST, rel, 'index.html'))) file = join(DIST, rel, 'index.html');
    else if (!existsSync(file) && existsSync(file + '.html')) file += '.html';

    if (!existsSync(file) || statSync(file).isDirectory()) {
      const notFound = join(DIST, '404.html');
      const body = existsSync(notFound) ? readFileSync(notFound) : 'Not found';
      return send(res, 404, reqPath, body, 'text/html; charset=utf-8');
    }
    send(res, 200, reqPath, readFileSync(file), TYPES[extname(file)] || 'application/octet-stream');
  } catch {
    try {
      res.writeHead(400);
      res.end('Bad request');
    } catch {
      /* response already started */
    }
  }
}).listen(PORT, '127.0.0.1', () => console.log(`serve-headers: dist/ with _headers on http://localhost:${PORT}`));
