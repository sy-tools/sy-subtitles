// Parses the bookmarklet payload carried in the SPA hash route `#/add?data=...`
// into a routing decision. Single source: loaded by the browser via
// <script src="js/add_talk_data.js"> in site/index.html AND required by the
// Node test suite (tests/test_add_talk_data.js) — no inline mirror.
//
// Returns one of:
//   { state: 'setup',       data: null }  — no payload present
//   { state: 'parse_error', data: null }  — data param present but not valid JSON
//   { state: 'wrong_site',  data: null }  — valid payload but not an amruta.org URL
//   { state: 'form',        data: obj  }  — valid payload ready to populate the form

// vimeo_codec provides encodeVideoRef. In Node it is require()d; in the browser
// it is a global set by <script src="js/vimeo_codec.js"> (loaded before this
// file). Both resolve to the same { encodeVideoRef, decodeVideoRef } API.
var _vimeoCodec =
  typeof require !== 'undefined' && typeof module !== 'undefined'
    ? require('./vimeo_codec')
    : typeof globalThis !== 'undefined'
      ? globalThis
      : this;

function parseAddTalkHash(hash) {
  var qm = hash.indexOf('?');
  if (qm === -1 || hash.indexOf('data=') === -1) {
    return { state: 'setup', data: null };
  }

  var params = new URLSearchParams(hash.slice(qm));
  var dataStr = params.get('data');
  var data;
  try {
    // URLSearchParams.get() already percent-decodes. A second decodeURIComponent
    // here threw "URI malformed" on any literal '%' in the title/transcript
    // (e.g. "100%"), which surfaced as the misleading "Wrong site" error.
    data = JSON.parse(dataStr);
  } catch (e) {
    return { state: 'parse_error', data: null };
  }

  if (!isAmrutaUrl(data.u)) {
    return { state: 'wrong_site', data: null };
  }

  return { state: 'form', data: data };
}

// True only when the url's HOST is amruta.org (or a subdomain like www.).
// A substring test (indexOf('amruta.org')) wrongly accepted look-alikes such
// as http://evil.com/#amruta.org and amruta.org.attacker.com.
function isAmrutaUrl(u) {
  try {
    var h = new URL(u).hostname;
    return h === 'amruta.org' || h.endsWith('.amruta.org');
  } catch (e) {
    return false;
  }
}

// How each of a talk's videos takes part in subtitle sync. The Python twin is
// tools/video_roles.py, the ONE interpreter of meta.yaml's `sync:` key.
var SYNC_ROLES = ['primary', 'derived', 'independent', 'ignored'];

// A slug that names a `Talk` cut of a puja — «Guru-Puja-Talk-Gravity» — as
// opposed to one that merely contains the letters (« Talking-To-Yogis »).
var TALK_CUT = /(^|[-_])talk([-_]|$)/i;

// The form's starting point, from the video NAMES alone. At add-talk time the
// talk has no subtitles and no en.srt to inspect — only what amruta listed,
// where the full recording comes first and the Talk cut is a shortened version
// of it. A multi-video talk that declares nothing cannot be synced or built at
// all, so the form must offer something; the editor changes it when the
// default is wrong (1998-05-10 is the one talk whose Talk cut is primary).
//
// A single video needs no declaration: tools/video_roles.py resolves it.
function defaultSyncRoles(videos) {
  var list = videos || [];
  if (list.length < 2) return [];
  var primary = list.findIndex(function (v) { return !TALK_CUT.test(String((v && v.slug) || '')); });
  if (primary === -1) primary = 0;
  return list.map(function (_v, i) { return i === primary ? 'primary' : 'derived'; });
}

// Render a scalar as a single-quoted YAML string, escaping embedded quotes by
// doubling them (the YAML single-quote escape). Quoting makes the value safe
// regardless of content — a colon, leading symbol, etc. can no longer be
// misread as YAML structure.
function yamlStr(s) {
  return "'" + String(s == null ? '' : s).replace(/'/g, "''") + "'";
}

// Build meta.yaml text from add-talk form fields. Every free-text scalar
// (title, location, per-video title) is single-quoted via yamlStr so a colon
// in user input cannot corrupt the file (regression: sy-tools/sy-subtitles#293,
// "Guru Puja Talk: Gurus Who Belong To The Collective" → ScannerError). Slugs
// are generated ([A-Za-z0-9-]) and URLs/date/language are constrained formats,
// so they stay unquoted to match existing meta.yaml files.
//
// fields: { title, date, location?, amruta_url?, language,
//           videos?: [{ slug, title, url }], transcriptBase64? }
function buildMetaYaml(fields) {
  var f = fields || {};
  var yaml = "title: " + yamlStr(f.title) + "\n";
  yaml += "date: '" + (f.date || '') + "'\n";
  if (f.location) yaml += "location: " + yamlStr(f.location) + "\n";
  if (f.amruta_url) yaml += "amruta_url: " + f.amruta_url + "\n";
  yaml += "language: " + (f.language || '') + "\n";
  var videos = f.videos || [];
  if (videos.length) {
    yaml += "videos:\n";
    videos.forEach(function (v) {
      yaml += "- slug: " + v.slug + "\n";
      yaml += "  title: " + yamlStr(v.title) + "\n";
      // Store the link obfuscated as video_ref (see js/vimeo_codec.js) so the
      // committed meta.yaml never carries a plaintext Vimeo URL. base64url is
      // YAML-safe, so it stays unquoted.
      if (v.url) yaml += "  video_ref: " + _vimeoCodec.encodeVideoRef(v.url) + "\n";
      // How this video takes part in subtitle sync — read by
      // tools/video_roles.py. Omitted for a single-video talk, which needs
      // no declaration.
      if (v.sync) yaml += "  sync: " + v.sync + "\n";
    });
  }
  if (f.transcriptBase64) {
    yaml += "transcript_en_base64: |\n";
    var b64 = f.transcriptBase64;
    // Split base64 into 76-char lines for readability.
    for (var i = 0; i < b64.length; i += 76) {
      yaml += "  " + b64.substring(i, i + 76) + "\n";
    }
  }
  return yaml;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    parseAddTalkHash: parseAddTalkHash,
    isAmrutaUrl: isAmrutaUrl,
    buildMetaYaml: buildMetaYaml,
    defaultSyncRoles: defaultSyncRoles,
    SYNC_ROLES: SYNC_ROLES,
  };
}
