// Reading the talks' meta.yaml files for the index: which ones need reading at
// all, one GraphQL request for many of them, and the mapping from YAML text to
// the manifest's talk fields. Single source: loaded by the browser via
// <script src="js/meta_batch.js"> in site/index.html AND required by the Node
// test suite — no inline mirror.

// GitHub documents no alias limit, only a node budget and a ~10 s execution
// timeout per query. A hundred meta.yaml blobs measured ~16 KB of request and
// ~50 KB of reply, well inside both, and it keeps the whole corpus to a couple
// of requests; a failed chunk also costs at most a hundred raw fetches.
var META_BATCH_SIZE = 100;

function chunkList(list, size) {
  var out = [];
  for (var i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
  return out;
}

// Every expression is a query VARIABLE, so a talk id never becomes query text
// and there is no string escaping to get wrong. Aliases are positional because
// a talk id (dashes, leading digit) is not a valid GraphQL name.
function metaBatchQuery(owner, name, ref, talkIds) {
  var variables = { owner: owner, name: name };
  var aliases = {};
  var declarations = ['$owner: String!', '$name: String!'];
  var fields = [];
  talkIds.forEach(function (id, i) {
    var alias = 'm' + i;
    aliases[alias] = id;
    variables[alias] = ref + ':talks/' + id + '/meta.yaml';
    declarations.push('$' + alias + ': String!');
    fields.push(alias + ': object(expression: $' + alias + ') { ... on Blob { text isTruncated } }');
  });
  var query = 'query(' + declarations.join(', ') + ') { '
    + 'repository(owner: $owner, name: $name) { ' + fields.join(' ') + ' } }';
  return { query: query, variables: variables, aliases: aliases };
}

// { talkId: yamlText | null }. null is GitHub's definite "no such text blob at
// that ref"; a truncated blob gets NO key, because its text is not the file.
// Throws on a reply that answers nothing, including one that carries errors
// beside partial data: a half-answered chunk is re-read whole.
function parseMetaBatch(body, aliases) {
  if (body && body.errors && body.errors.length) {
    throw new Error(body.errors[0].message || 'GraphQL error');
  }
  var repo = body && body.data && body.data.repository;
  if (!repo) throw new Error('GraphQL reply has no repository');
  var out = {};
  Object.keys(aliases).forEach(function (alias) {
    var blob = repo[alias];
    if (blob && blob.isTruncated) return;
    out[aliases[alias]] = blob && typeof blob.text === 'string' ? blob.text : null;
  });
  return out;
}

// { talkId: blob sha of talks/<id>/meta.yaml } from a Trees API listing.
function metaShaIndex(tree) {
  var index = {};
  (tree || []).forEach(function (entry) {
    var m = entry.path.match(/^talks\/([^/]+)\/meta\.yaml$/);
    if (m) index[m[1]] = entry.sha || '';
  });
  return index;
}

// A new tree rebuilds every talk empty. A talk whose meta.yaml blob is the one
// the cached manifest was hydrated from needs no fetch: same sha, same file.
// A cached title is what marks a talk as hydrated — the cache is persisted
// with the new sha BEFORE its meta arrives, so the sha alone proves nothing.
// Returns how many talks were reused.
function reuseHydratedMeta(talks, cachedTalks, shaIndex) {
  var cachedById = {};
  (cachedTalks || []).forEach(function (c) { cachedById[c.id] = c; });
  var reused = 0;
  talks.forEach(function (t) {
    t._metaSha = shaIndex[t.id] || '';
    var c = cachedById[t.id];
    if (!c || !c.title || !t._metaSha || c._metaSha !== t._metaSha) return;
    t.title = c.title;
    t.date = c.date;
    t.amrutaUrl = c.amrutaUrl;
    t.videos = (c.videos || []).map(function (v) { return Object.assign({}, v); });
    reused++;
  });
  return reused;
}

// deps: { parseYaml, decodeVideoRef, warn }. Returns whether the talk was filled.
function applyMetaText(talk, text, deps) {
  if (!text) return false;
  try {
    var meta = deps.parseYaml(text);
    talk.title = meta.title || talk.id;
    talk.date = String(meta.date || talk.id.substring(0, 10));
    talk.amrutaUrl = meta.amruta_url || '';
    talk.videos = (meta.videos || []).map(function (v) {
      // Links are stored obfuscated as video_ref (js/vimeo_codec.js). Decode
      // here at the read edge so the rest of the SPA keeps working with a
      // plaintext vimeo_url in memory.
      var vimeoUrl = '';
      if (v.video_ref) {
        try { vimeoUrl = deps.decodeVideoRef(v.video_ref); }
        catch (e) { deps.warn('bad video_ref for ' + talk.id, e); }
      }
      // `sync` is kept so the pipeline view can leave a declared-ignored
      // video out of its counts (js/pipeline_stages.js).
      return { slug: v.slug, title: v.title || v.slug, vimeo_url: vimeoUrl, sync: v.sync || '' };
    });
    var srtSet = Array.isArray(talk._srtSlugs) ? talk._srtSlugs : [];
    talk.videos.forEach(function (v) { v.hasSrt = srtSet.indexOf(v.slug) !== -1; });
    return true;
  } catch (e) {
    deps.warn('YAML parse error for ' + talk.id, e);
    return false;
  }
}

// Fill every untitled talk. Signed in (opts.token): chunked GraphQL, and any
// chunk that fails is re-read talk by talk over opts.fetchRaw. Anonymous: raw
// only. Never rejects — a talk that cannot be read stays untitled, the rest
// of the index still renders.
//
// opts: { token, owner, name, ref, graphql(token, query, variables),
//         fetchRaw(talk) -> Promise<text>, apply(talk, text),
//         onUnauthorized(), warn(message, error), batchSize }
function hydrateTalkMeta(talks, opts) {
  var pending = talks.filter(function (t) { return !t.title; });
  if (!pending.length) return Promise.resolve();
  var warn = opts.warn || function () {};

  function viaRaw(list) {
    return Promise.all(list.map(function (t) {
      return Promise.resolve()
        .then(function () { return opts.fetchRaw(t); })
        .then(function (text) { opts.apply(t, text); })
        .catch(function (e) { warn('meta.yaml load failed for ' + t.id, e); });
    }));
  }

  if (!opts.token) return viaRaw(pending);

  var unauthorizedReported = false;
  function viaGraphql(chunk) {
    var q = metaBatchQuery(opts.owner, opts.name, opts.ref, chunk.map(function (t) { return t.id; }));
    return Promise.resolve()
      .then(function () { return opts.graphql(opts.token, q.query, q.variables); })
      .then(function (body) { return parseMetaBatch(body, q.aliases); })
      .then(function (texts) {
        var unanswered = [];
        chunk.forEach(function (t) {
          if (!Object.prototype.hasOwnProperty.call(texts, t.id)) unanswered.push(t);
          else opts.apply(t, texts[t.id]);
        });
        return unanswered;
      }, function (e) {
        if (e && e.status === 401 && !unauthorizedReported) {
          unauthorizedReported = true;
          if (opts.onUnauthorized) opts.onUnauthorized();
        }
        warn('meta.yaml batch failed, reading per talk', e);
        return chunk;
      })
      .then(viaRaw);
  }

  return Promise.all(chunkList(pending, opts.batchSize || META_BATCH_SIZE).map(viaGraphql))
    .then(function () {});
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    META_BATCH_SIZE: META_BATCH_SIZE,
    chunkList: chunkList,
    metaBatchQuery: metaBatchQuery,
    parseMetaBatch: parseMetaBatch,
    metaShaIndex: metaShaIndex,
    reuseHydratedMeta: reuseHydratedMeta,
    applyMetaText: applyMetaText,
    hydrateTalkMeta: hydrateTalkMeta,
  };
}
