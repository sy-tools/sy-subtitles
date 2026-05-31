// Reversible obfuscation codec for Vimeo links stored in meta.yaml.
//
// Twin of tools/vimeo_codec.py — the two MUST stay byte-identical (enforced by
// the shared vectors in tests/fixtures/vimeo_codec_vectors.json, asserted by
// both tests/test_vimeo_codec.js and tests/test_vimeo_codec.py).
//
// This is OBFUSCATION, NOT encryption: this file ships in the public SPA, so
// the algorithm and KEY are public. It only breaks plaintext harvesting and
// makes a naive base64 decode reveal garbage. See the .py twin for details.
//
// Format:  video_ref: r1<base64url( reverse( xor(<id>/<hash>, KEY) ) )>
//
// Single source: loaded by the browser via <script src="js/vimeo_codec.js">
// in site/index.html (before add_talk_data.js) AND required by the Node tests.

(function () {
  // Fixed project constant. Not a secret (ships in the public client) — it only
  // diffuses the bytes so a naive base64 decode reveals nothing useful.
  var KEY = 'sahaja-yoga-subtitles';
  var VERSION = 'r1';
  // Tolerant of protocol/www/trailing-slash; decode reconstructs the canonical
  // https://vimeo.com/... form.
  var PATH_RE = /^(?:https?:\/\/)?(?:www\.)?vimeo\.com\/(.+?)\/?$/i;

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

  function encodeVideoRef(url) {
    var match = String(url == null ? '' : url).trim().match(PATH_RE);
    if (!match) throw new Error('not a vimeo url: ' + url);
    var path = match[1];
    var bytes = [];
    for (var i = 0; i < path.length; i++) bytes.push(path.charCodeAt(i) & 0xff);
    var transformed = xorBytes(bytes).reverse();
    return VERSION + bytesToB64url(transformed);
  }

  function decodeVideoRef(ref) {
    ref = String(ref == null ? '' : ref).trim();
    if (ref.slice(0, VERSION.length) !== VERSION) {
      throw new Error('unknown video_ref version: ' + ref);
    }
    var raw = b64urlToBytes(ref.slice(VERSION.length));
    raw.reverse();
    var bytes = xorBytes(raw);
    var path = '';
    for (var i = 0; i < bytes.length; i++) path += String.fromCharCode(bytes[i]);
    return 'https://vimeo.com/' + path;
  }

  var api = { encodeVideoRef: encodeVideoRef, decodeVideoRef: decodeVideoRef };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api; // Node (tests)
  } else {
    // Browser: expose as globals so index.html and add_talk_data.js can call them.
    this.encodeVideoRef = encodeVideoRef;
    this.decodeVideoRef = decodeVideoRef;
  }
}).call(typeof globalThis !== 'undefined' ? globalThis : this);
