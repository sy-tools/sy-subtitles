// Reversible obfuscation codec for video links stored in meta.yaml (Vimeo,
// YouTube, Google Drive, Bunny Stream — the module keeps the name of its first
// provider).
//
// Twin of tools/vimeo_codec.py — the two MUST stay behaviorally identical
// (produce identical output for the same input), enforced by the shared vectors
// in tests/fixtures/vimeo_codec_vectors.json, asserted from both
// tests/test_vimeo_codec.js and tests/test_vimeo_codec.py.
//
// This is OBFUSCATION, NOT encryption: this file ships in the public SPA, so
// the algorithm and KEY are public. It only breaks plaintext harvesting and
// makes a naive base64 decode reveal garbage. See the .py twin for details.
//
// Format — the version prefix selects the payload:
//   r1<base64url( reverse( xor("<id>[/<hash>]", KEY) ) )>     Vimeo
//   r2<base64url( reverse( xor("<provider>:<id>", KEY) ) )>   yt | gd | bn
//
// Single source: loaded by the browser via <script src="js/vimeo_codec.js">
// in site/index.html (before add_talk_data.js) AND required by the Node tests.

(function () {
  // Fixed project constant. Not a secret (ships in the public client) — it only
  // diffuses the bytes so a naive base64 decode reveals nothing useful.
  var KEY = 'sahaja-yoga-subtitles';
  var V1 = 'r1'; // Vimeo path
  var V2 = 'r2'; // "<provider>:<id>"
  // Tolerant of protocol/www/trailing-slash; decode reconstructs the canonical
  // https://vimeo.com/... form.
  var PATH_RE = /^(?:https?:\/\/)?(?:www\.)?vimeo\.com\/(.+?)\/?$/i;

  // r2 URL shapes. They only ever see printable ASCII (PRINTABLE_ASCII_RE gates
  // them), which is what lets `.`, `[^#]` and the i flag mean the same thing
  // here and in the Python twin: outside ASCII the two regex engines disagree
  // on case folding and on what `.` excludes. The lazy quantifiers pick the
  // FIRST `v=` / `id=` of a query that repeats it, as the sites themselves do.
  var PRINTABLE_ASCII_RE = /^[!-~]+$/;
  var URL_SHAPES = [
    ['yt', /^(?:https?:\/\/)?(?:www\.|m\.)?youtube\.com\/watch\?(?:[^#]*?&)??v=([A-Za-z0-9_-]{11})(?:[&#].*)?$/i],
    ['yt', /^(?:https?:\/\/)?youtu\.be\/([A-Za-z0-9_-]{11})\/?(?:[?#].*)?$/i],
    ['yt', /^(?:https?:\/\/)?(?:www\.)?youtube(?:-nocookie)?\.com\/embed\/([A-Za-z0-9_-]{11})\/?(?:[?#].*)?$/i],
    ['gd', /^(?:https?:\/\/)?drive\.google\.com\/file\/d\/([A-Za-z0-9_-]{25,64})(?:[/?#].*)?$/i],
    ['gd', /^(?:https?:\/\/)?drive\.google\.com\/open\?(?:[^#]*?&)??id=([A-Za-z0-9_-]{25,64})(?:[&#].*)?$/i],
    // amruta's page carries both: the player iframe (embed) and the "Watch on
    // Bunny" link (play). iframe. is Bunny's older player host.
    ['bn', /^(?:https?:\/\/)?(?:player|iframe)\.mediadelivery\.net\/(?:embed|play)\/([0-9]{1,12}\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\/?(?:[?#].*)?$/i],
  ];
  // Providers whose id has no meaningful case: it is folded on encode so a
  // stored id has one spelling. Safe to fold here, the shapes only see ASCII.
  var CASE_FOLDED = { bn: true };

  // provider -> id pattern (twins of YOUTUBE_ID_RE / DRIVE_ID_RE /
  // BUNNY_ID_RE in tools/workflow_validation.py) and canonical watch URL.
  var PROVIDERS = {
    yt: {
      idRe: /^[A-Za-z0-9_-]{11}$/,
      watchUrl: function (id) { return 'https://www.youtube.com/watch?v=' + id; },
    },
    gd: {
      idRe: /^[A-Za-z0-9_-]{25,64}$/,
      watchUrl: function (id) { return 'https://drive.google.com/file/d/' + id + '/view'; },
    },
    // The "Watch on Bunny" link amruta publishes. A download source only: the
    // player refuses any referrer but amruta's own, so it is never embedded.
    bn: {
      idRe: /^[0-9]{1,12}\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
      watchUrl: function (id) { return 'https://player.mediadelivery.net/play/' + id; },
    },
  };

  function xorBytes(bytes) {
    var out = new Array(bytes.length);
    for (var i = 0; i < bytes.length; i++) {
      out[i] = bytes[i] ^ (KEY.charCodeAt(i % KEY.length) & 0xff);
    }
    return out;
  }

  function bytesToB64url(bytes) {
    var bin = '';
    for (var i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i] & 0xff);
    var b64 =
      typeof btoa !== 'undefined'
        ? btoa(bin)
        : Buffer.from(bin, 'binary').toString('base64');
    return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  function b64urlToBytes(s) {
    var b64 = s.replace(/-/g, '+').replace(/_/g, '/');
    while (b64.length % 4) b64 += '=';
    var bin =
      typeof atob !== 'undefined'
        ? atob(b64)
        : Buffer.from(b64, 'base64').toString('binary');
    var bytes = [];
    for (var i = 0; i < bin.length; i++) bytes.push(bin.charCodeAt(i) & 0xff);
    return bytes;
  }

  function encodePayload(version, text) {
    var bytes = [];
    for (var i = 0; i < text.length; i++) bytes.push(text.charCodeAt(i) & 0xff);
    return version + bytesToB64url(xorBytes(bytes).reverse());
  }

  function decodePayload(ref, version) {
    var raw = b64urlToBytes(ref.slice(version.length));
    raw.reverse();
    var bytes = xorBytes(raw);
    var text = '';
    for (var i = 0; i < bytes.length; i++) text += String.fromCharCode(bytes[i]);
    return text;
  }

  // Vimeo URL -> r1 ref; YouTube, Google Drive file or Bunny Stream player
  // URL -> r2 ref.
  function encodeVideoRef(url) {
    var text = String(url == null ? '' : url).trim();
    var match = text.match(PATH_RE);
    if (match) return encodePayload(V1, match[1]);
    if (PRINTABLE_ASCII_RE.test(text)) {
      for (var i = 0; i < URL_SHAPES.length; i++) {
        match = text.match(URL_SHAPES[i][1]);
        if (match) {
          var provider = URL_SHAPES[i][0];
          var id = CASE_FOLDED[provider] ? match[1].toLowerCase() : match[1];
          return encodePayload(V2, provider + ':' + id);
        }
      }
    }
    throw new Error('not a supported video url: ' + url);
  }

  // video_ref -> {provider, id, watchUrl}; provider is 'vimeo', 'yt', 'gd' or
  // 'bn'.
  // Throws on an unknown version or provider, or an id that does not fit it.
  function decodeVideoSource(ref) {
    ref = String(ref == null ? '' : ref).trim();
    if (ref.slice(0, V1.length) === V1) {
      var path = decodePayload(ref, V1);
      return { provider: 'vimeo', id: path, watchUrl: 'https://vimeo.com/' + path };
    }
    if (ref.slice(0, V2.length) === V2) {
      var text = decodePayload(ref, V2);
      var sep = text.indexOf(':');
      var provider = sep < 0 ? '' : text.slice(0, sep);
      var id = text.slice(sep + 1);
      if (!Object.prototype.hasOwnProperty.call(PROVIDERS, provider)) {
        throw new Error('unknown video_ref provider: ' + ref);
      }
      if (!PROVIDERS[provider].idRe.test(id)) {
        throw new Error('invalid ' + provider + ' id in video_ref: ' + ref);
      }
      return { provider: provider, id: id, watchUrl: PROVIDERS[provider].watchUrl(id) };
    }
    throw new Error('unknown video_ref version: ' + ref);
  }

  // video_ref -> canonical watch URL.
  function decodeVideoRef(ref) {
    return decodeVideoSource(ref).watchUrl;
  }

  var api = {
    encodeVideoRef: encodeVideoRef,
    decodeVideoRef: decodeVideoRef,
    decodeVideoSource: decodeVideoSource,
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api; // Node (tests)
  } else {
    // Browser: expose as globals so index.html and add_talk_data.js can call them.
    this.encodeVideoRef = encodeVideoRef;
    this.decodeVideoRef = decodeVideoRef;
    this.decodeVideoSource = decodeVideoSource;
  }
}).call(typeof globalThis !== 'undefined' ? globalThis : this);
