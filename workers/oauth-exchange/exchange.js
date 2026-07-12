// OAuth code→token exchange for the review SPA (Cloudflare Worker handler).
// The GitHub App's client_secret must never ship in the static SPA, so this
// Worker performs the one privileged step of the login flow:
//   POST /exchange {code} -> {token}
// Env (wrangler vars/secrets): GH_CLIENT_ID, GH_CLIENT_SECRET, ALLOWED_ORIGINS
// (comma-separated origins). Single source: index.mjs adapts this handler to
// the Workers runtime; the Node test suite requires it directly. Tokens and
// codes are never logged.

function corsHeaders(origin) {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Vary': 'Origin',
  };
}

function allowedOrigin(request, env) {
  var origin = request.headers.get('Origin') || '';
  var allowed = (env.ALLOWED_ORIGINS || '').split(',')
    .map(function (s) { return s.trim(); })
    .filter(Boolean);
  return allowed.indexOf(origin) !== -1 ? origin : null;
}

function json(obj, status, origin) {
  var headers = { 'Content-Type': 'application/json' };
  if (origin) Object.assign(headers, corsHeaders(origin));
  return new Response(JSON.stringify(obj), { status: status, headers: headers });
}

async function handleExchange(request, env, fetchImpl) {
  var origin = allowedOrigin(request, env);
  if (!origin) return json({ error: 'origin not allowed' }, 403, null);
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders(origin) });
  }
  if (request.method !== 'POST') return json({ error: 'method not allowed' }, 405, origin);

  var body = null;
  try { body = await request.json(); } catch (e) { /* not JSON */ }
  if (!body || typeof body.code !== 'string' || !body.code) {
    return json({ error: 'missing code' }, 400, origin);
  }

  var ghResp = await fetchImpl('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify({
      client_id: env.GH_CLIENT_ID,
      client_secret: env.GH_CLIENT_SECRET,
      code: body.code,
    }),
  });
  var gh = null;
  try { gh = await ghResp.json(); } catch (e) { gh = {}; }
  if (!ghResp.ok || gh.error || !gh.access_token) {
    return json({ error: gh.error || ('github http ' + ghResp.status) }, 502, origin);
  }
  return json({ token: gh.access_token }, 200, origin);
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { handleExchange: handleExchange };
}
