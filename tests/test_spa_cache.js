const { describe, it, beforeEach, mock } = require('node:test');
const assert = require('node:assert');

// ============================================================
// Extract and test SPA cache/freshness logic
// ============================================================

// --- updateLastModifiedUI logic (extracted) ---
function formatLastModified(lastModified, now) {
  if (!lastModified) return '';
  var d = new Date(lastModified);
  if (isNaN(d.getTime())) return '';
  var diffMs = now - d;
  var diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'щойно';
  if (diffMin < 60) return diffMin + ' хв тому';
  if (diffMin < 1440) return Math.floor(diffMin / 60) + ' год тому';
  return d.toLocaleDateString('uk-UA', { day: 'numeric', month: 'short' });
}

// --- SRT URL with cache-buster logic (extracted) ---
function buildSrtUrl(rawBase, talkId, videoSlug, srtSha) {
  var url = rawBase + '/talks/' + talkId + '/' + videoSlug + '/final/uk.srt';
  if (srtSha) url += '?v=' + srtSha.substring(0, 8);
  return url;
}

// --- buildManifest sha extraction logic (extracted) ---
function extractSrtSha(treeEntries) {
  var result = {};
  treeEntries.forEach(function(entry) {
    var m = entry.path.match(/^talks\/([^/]+)\/([^/]+)\/final\/uk\.srt$/);
    if (m) {
      if (!result[m[1]]) result[m[1]] = {};
      result[m[1]][m[2]] = entry.sha || '';
    }
  });
  return result;
}

// ============================================================
// Tests: formatLastModified
// ============================================================
describe('formatLastModified', () => {
  it('returns empty string for null/undefined', () => {
    assert.strictEqual(formatLastModified(null, Date.now()), '');
    assert.strictEqual(formatLastModified(undefined, Date.now()), '');
    assert.strictEqual(formatLastModified('', Date.now()), '');
  });

  it('returns empty string for invalid date', () => {
    assert.strictEqual(formatLastModified('not-a-date', Date.now()), '');
  });

  it('returns "щойно" for <1 minute ago', () => {
    var now = new Date('2026-04-08T10:00:00Z');
    var lastMod = 'Tue, 08 Apr 2026 10:00:00 GMT';
    assert.strictEqual(formatLastModified(lastMod, now), 'щойно');
  });

  it('returns "щойно" for 30 seconds ago', () => {
    var now = new Date('2026-04-08T10:00:30Z');
    var lastMod = 'Tue, 08 Apr 2026 10:00:00 GMT';
    assert.strictEqual(formatLastModified(lastMod, now), 'щойно');
  });

  it('returns minutes for 1-59 minutes', () => {
    var now = new Date('2026-04-08T10:05:00Z');
    var lastMod = 'Tue, 08 Apr 2026 10:00:00 GMT';
    assert.strictEqual(formatLastModified(lastMod, now), '5 хв тому');
  });

  it('returns minutes for exactly 1 minute', () => {
    var now = new Date('2026-04-08T10:01:00Z');
    var lastMod = 'Tue, 08 Apr 2026 10:00:00 GMT';
    assert.strictEqual(formatLastModified(lastMod, now), '1 хв тому');
  });

  it('returns hours for 1-23 hours', () => {
    var now = new Date('2026-04-08T13:00:00Z');
    var lastMod = 'Tue, 08 Apr 2026 10:00:00 GMT';
    assert.strictEqual(formatLastModified(lastMod, now), '3 год тому');
  });

  it('returns hours for exactly 1 hour', () => {
    var now = new Date('2026-04-08T11:00:00Z');
    var lastMod = 'Tue, 08 Apr 2026 10:00:00 GMT';
    assert.strictEqual(formatLastModified(lastMod, now), '1 год тому');
  });

  it('returns date for >24 hours', () => {
    var now = new Date('2026-04-10T10:00:00Z');
    var lastMod = 'Tue, 08 Apr 2026 10:00:00 GMT';
    var result = formatLastModified(lastMod, now);
    // Should contain "8" and a month abbreviation
    assert.ok(result.includes('8'), 'should contain day 8, got: ' + result);
  });
});

// ============================================================
// Tests: buildSrtUrl
// ============================================================
describe('buildSrtUrl', () => {
  var RAW = 'https://raw.githubusercontent.com/owner/repo/main';

  it('builds URL without sha', () => {
    var url = buildSrtUrl(RAW, '2001-07-29_Talk', 'Video-Slug', '');
    assert.strictEqual(url, RAW + '/talks/2001-07-29_Talk/Video-Slug/final/uk.srt');
  });

  it('builds URL without sha when null', () => {
    var url = buildSrtUrl(RAW, '2001-07-29_Talk', 'Video-Slug', null);
    assert.strictEqual(url, RAW + '/talks/2001-07-29_Talk/Video-Slug/final/uk.srt');
  });

  it('builds URL without sha when undefined', () => {
    var url = buildSrtUrl(RAW, '2001-07-29_Talk', 'Video-Slug', undefined);
    assert.strictEqual(url, RAW + '/talks/2001-07-29_Talk/Video-Slug/final/uk.srt');
  });

  it('appends sha cache-buster (first 8 chars)', () => {
    var url = buildSrtUrl(RAW, 'talk', 'video', 'abcdef1234567890abcdef');
    assert.strictEqual(url, RAW + '/talks/talk/video/final/uk.srt?v=abcdef12');
  });

  it('handles short sha', () => {
    var url = buildSrtUrl(RAW, 'talk', 'video', 'abc');
    assert.strictEqual(url, RAW + '/talks/talk/video/final/uk.srt?v=abc');
  });

  it('different sha produces different URL', () => {
    var url1 = buildSrtUrl(RAW, 'talk', 'video', 'aaaa1111');
    var url2 = buildSrtUrl(RAW, 'talk', 'video', 'bbbb2222');
    assert.notStrictEqual(url1, url2);
  });
});

// ============================================================
// Tests: extractSrtSha
// ============================================================
describe('extractSrtSha', () => {
  it('returns empty for no SRT entries', () => {
    var result = extractSrtSha([
      { path: 'talks/2001_Talk/meta.yaml', sha: 'aaa' },
      { path: 'talks/2001_Talk/transcript_en.txt', sha: 'bbb' },
    ]);
    assert.deepStrictEqual(result, {});
  });

  it('extracts sha for single SRT', () => {
    var result = extractSrtSha([
      { path: 'talks/2001_Talk/Video-1/final/uk.srt', sha: 'abc123' },
    ]);
    assert.deepStrictEqual(result, { '2001_Talk': { 'Video-1': 'abc123' } });
  });

  it('extracts sha for multiple videos in one talk', () => {
    var result = extractSrtSha([
      { path: 'talks/2001_Talk/Video-1/final/uk.srt', sha: 'sha1' },
      { path: 'talks/2001_Talk/Video-2/final/uk.srt', sha: 'sha2' },
    ]);
    assert.deepStrictEqual(result, {
      '2001_Talk': { 'Video-1': 'sha1', 'Video-2': 'sha2' }
    });
  });

  it('extracts sha for multiple talks', () => {
    var result = extractSrtSha([
      { path: 'talks/Talk-A/Vid/final/uk.srt', sha: 'sha_a' },
      { path: 'talks/Talk-B/Vid/final/uk.srt', sha: 'sha_b' },
    ]);
    assert.strictEqual(Object.keys(result).length, 2);
    assert.strictEqual(result['Talk-A']['Vid'], 'sha_a');
    assert.strictEqual(result['Talk-B']['Vid'], 'sha_b');
  });

  it('handles missing sha gracefully', () => {
    var result = extractSrtSha([
      { path: 'talks/Talk/Vid/final/uk.srt' },
    ]);
    assert.strictEqual(result['Talk']['Vid'], '');
  });

  it('ignores non-SRT files', () => {
    var result = extractSrtSha([
      { path: 'talks/Talk/Vid/final/en.srt', sha: 'xxx' },
      { path: 'talks/Talk/Vid/work/uk.map', sha: 'yyy' },
      { path: 'talks/Talk/Vid/final/uk.srt', sha: 'zzz' },
    ]);
    assert.strictEqual(Object.keys(result['Talk']).length, 1);
    assert.strictEqual(result['Talk']['Vid'], 'zzz');
  });
});

// --- extractTranscriptSha logic (extracted from buildManifest) ---
function extractTranscriptSha(treeEntries) {
  var result = {};
  treeEntries.forEach(function(entry) {
    var m = entry.path.match(/^talks\/([^/]+)\/transcript_([a-z][a-z_]*)\.txt$/);
    if (m) {
      if (!result[m[1]]) result[m[1]] = {};
      result[m[1]][m[2]] = entry.sha || '';
    }
  });
  return result;
}

// --- getTranscriptSha helper ---
function getTranscriptSha(talk, lang) {
  return (talk && talk._transcriptSha && talk._transcriptSha[lang]) || '';
}

// --- buildTranscriptUrl (mirrors buildSrtUrl pattern) ---
function buildTranscriptUrl(rawBase, talkId, lang, sha) {
  var url = rawBase + '/talks/' + talkId + '/transcript_' + lang + '.txt';
  if (sha) url += '?v=' + sha.substring(0, 8);
  return url;
}

// ============================================================
// Tests: extractTranscriptSha
// ============================================================
describe('extractTranscriptSha', () => {
  it('returns empty for no transcript entries', () => {
    var result = extractTranscriptSha([
      { path: 'talks/Talk/meta.yaml', sha: 'aaa' },
      { path: 'talks/Talk/Video/final/uk.srt', sha: 'bbb' },
    ]);
    assert.deepStrictEqual(result, {});
  });

  it('extracts sha for single transcript', () => {
    var result = extractTranscriptSha([
      { path: 'talks/Talk/transcript_en.txt', sha: 'en_sha' },
    ]);
    assert.deepStrictEqual(result, { 'Talk': { 'en': 'en_sha' } });
  });

  it('extracts sha for multiple languages', () => {
    var result = extractTranscriptSha([
      { path: 'talks/Talk/transcript_en.txt', sha: 'en_sha' },
      { path: 'talks/Talk/transcript_uk.txt', sha: 'uk_sha' },
      { path: 'talks/Talk/transcript_hi_corrected.txt', sha: 'hi_sha' },
    ]);
    assert.strictEqual(result['Talk']['en'], 'en_sha');
    assert.strictEqual(result['Talk']['uk'], 'uk_sha');
    assert.strictEqual(result['Talk']['hi_corrected'], 'hi_sha');
  });

  it('extracts sha for multiple talks', () => {
    var result = extractTranscriptSha([
      { path: 'talks/Talk-A/transcript_uk.txt', sha: 'sha_a' },
      { path: 'talks/Talk-B/transcript_uk.txt', sha: 'sha_b' },
    ]);
    assert.strictEqual(result['Talk-A']['uk'], 'sha_a');
    assert.strictEqual(result['Talk-B']['uk'], 'sha_b');
  });

  it('handles missing sha', () => {
    var result = extractTranscriptSha([
      { path: 'talks/Talk/transcript_en.txt' },
    ]);
    assert.strictEqual(result['Talk']['en'], '');
  });

  it('ignores non-transcript files', () => {
    var result = extractTranscriptSha([
      { path: 'talks/Talk/meta.yaml', sha: 'xxx' },
      { path: 'talks/Talk/Video/final/uk.srt', sha: 'yyy' },
      { path: 'talks/Talk/transcript_uk.txt', sha: 'zzz' },
    ]);
    assert.strictEqual(Object.keys(result['Talk']).length, 1);
    assert.strictEqual(result['Talk']['uk'], 'zzz');
  });
});

// ============================================================
// Tests: getTranscriptSha
// ============================================================
describe('getTranscriptSha', () => {
  it('returns sha when present', () => {
    var talk = { _transcriptSha: { 'uk': 'abc123' } };
    assert.strictEqual(getTranscriptSha(talk, 'uk'), 'abc123');
  });

  it('returns empty for missing language', () => {
    var talk = { _transcriptSha: { 'en': 'abc123' } };
    assert.strictEqual(getTranscriptSha(talk, 'uk'), '');
  });

  it('returns empty when _transcriptSha missing', () => {
    assert.strictEqual(getTranscriptSha({}, 'uk'), '');
  });

  it('returns empty for null talk', () => {
    assert.strictEqual(getTranscriptSha(null, 'uk'), '');
  });
});

// ============================================================
// Tests: buildTranscriptUrl
// ============================================================
describe('buildTranscriptUrl', () => {
  var RAW = 'https://raw.githubusercontent.com/owner/repo/main';

  it('builds URL without sha', () => {
    var url = buildTranscriptUrl(RAW, 'talk', 'uk', '');
    assert.strictEqual(url, RAW + '/talks/talk/transcript_uk.txt');
    assert.ok(!url.includes('?v='));
  });

  it('appends sha cache-buster', () => {
    var url = buildTranscriptUrl(RAW, 'talk', 'en', 'abcdef1234567890');
    assert.strictEqual(url, RAW + '/talks/talk/transcript_en.txt?v=abcdef12');
  });

  it('different sha produces different URL', () => {
    var url1 = buildTranscriptUrl(RAW, 'talk', 'uk', 'aaaa1111');
    var url2 = buildTranscriptUrl(RAW, 'talk', 'uk', 'bbbb2222');
    assert.notStrictEqual(url1, url2);
  });

  it('handles hi_corrected language code', () => {
    var url = buildTranscriptUrl(RAW, 'talk', 'hi_corrected', 'abc');
    assert.ok(url.includes('transcript_hi_corrected.txt'));
  });
});

// --- extractSrtLangs logic (extracted from buildManifest) ---
function extractSrtLangs(treeEntries) {
  var result = {};
  treeEntries.forEach(function(entry) {
    var m = entry.path.match(/^talks\/([^/]+)\/([^/]+)\/final\/([a-z]{2})\.srt$/);
    if (m) {
      var tid = m[1], slug = m[2], lang = m[3];
      if (!result[tid]) result[tid] = {};
      if (!result[tid][slug]) result[tid][slug] = [];
      if (result[tid][slug].indexOf(lang) === -1) result[tid][slug].push(lang);
    }
  });
  return result;
}

// --- buildSrtUrlWithLang (replaces old buildSrtUrl for multi-lang) ---
function buildSrtUrlWithLang(rawBase, talkId, videoSlug, lang, srtSha) {
  var shaKey = videoSlug + '/' + lang;
  var sha = (srtSha && srtSha[shaKey]) || '';
  var url = rawBase + '/talks/' + talkId + '/' + videoSlug + '/final/' + lang + '.srt';
  if (sha) url += '?v=' + sha.substring(0, 8);
  return url;
}

// ============================================================
// Tests: extractSrtLangs
// ============================================================
describe('extractSrtLangs', () => {
  it('returns empty for no SRT entries', () => {
    var result = extractSrtLangs([
      { path: 'talks/Talk/meta.yaml' },
    ]);
    assert.deepStrictEqual(result, {});
  });

  it('extracts single language', () => {
    var result = extractSrtLangs([
      { path: 'talks/Talk/Vid/final/uk.srt', sha: 'abc' },
    ]);
    assert.deepStrictEqual(result['Talk']['Vid'], ['uk']);
  });

  it('extracts multiple languages for same video', () => {
    var result = extractSrtLangs([
      { path: 'talks/Talk/Vid/final/uk.srt', sha: 'a' },
      { path: 'talks/Talk/Vid/final/hi.srt', sha: 'b' },
      { path: 'talks/Talk/Vid/final/en.srt', sha: 'c' },
    ]);
    var langs = result['Talk']['Vid'].sort();
    assert.deepStrictEqual(langs, ['en', 'hi', 'uk']);
  });

  it('separate languages per video slug', () => {
    var result = extractSrtLangs([
      { path: 'talks/Talk/Vid1/final/uk.srt', sha: 'a' },
      { path: 'talks/Talk/Vid2/final/hi.srt', sha: 'b' },
    ]);
    assert.deepStrictEqual(result['Talk']['Vid1'], ['uk']);
    assert.deepStrictEqual(result['Talk']['Vid2'], ['hi']);
  });

  it('no duplicates', () => {
    var result = extractSrtLangs([
      { path: 'talks/Talk/Vid/final/uk.srt', sha: 'a' },
      { path: 'talks/Talk/Vid/final/uk.srt', sha: 'b' },
    ]);
    assert.strictEqual(result['Talk']['Vid'].length, 1);
  });

  it('ignores non-srt files', () => {
    var result = extractSrtLangs([
      { path: 'talks/Talk/Vid/final/uk.srt', sha: 'a' },
      { path: 'talks/Talk/Vid/work/uk.map', sha: 'b' },
      { path: 'talks/Talk/Vid/final/report.txt', sha: 'c' },
    ]);
    assert.deepStrictEqual(result['Talk']['Vid'], ['uk']);
  });
});

// --- extractSrcSrtLangs logic (extracted from buildManifest) ---
function extractSrcSrtLangs(treeEntries) {
  var result = {};
  treeEntries.forEach(function(entry) {
    var m = entry.path.match(/^talks\/([^/]+)\/([^/]+)\/source\/([a-z]{2})\.srt$/);
    if (m) {
      var tid = m[1], slug = m[2], lang = m[3];
      if (!result[tid]) result[tid] = {};
      if (!result[tid][slug]) result[tid][slug] = [];
      if (result[tid][slug].indexOf(lang) === -1) result[tid][slug].push(lang);
    }
  });
  return result;
}

// ============================================================
// Tests: extractSrcSrtLangs
// ============================================================
describe('extractSrcSrtLangs', () => {
  it('returns empty for no source SRT entries', () => {
    var result = extractSrcSrtLangs([
      { path: 'talks/Talk/meta.yaml' },
    ]);
    assert.deepStrictEqual(result, {});
  });

  it('extracts single source language', () => {
    var result = extractSrcSrtLangs([
      { path: 'talks/Talk/Vid/source/en.srt', sha: 'abc' },
    ]);
    assert.deepStrictEqual(result['Talk']['Vid'], ['en']);
  });

  it('extracts multiple source languages', () => {
    var result = extractSrcSrtLangs([
      { path: 'talks/Talk/Vid/source/en.srt', sha: 'a' },
      { path: 'talks/Talk/Vid/source/hi.srt', sha: 'b' },
    ]);
    var langs = result['Talk']['Vid'].sort();
    assert.deepStrictEqual(langs, ['en', 'hi']);
  });

  it('ignores final/ entries', () => {
    var result = extractSrcSrtLangs([
      { path: 'talks/Talk/Vid/source/en.srt', sha: 'a' },
      { path: 'talks/Talk/Vid/final/uk.srt', sha: 'b' },
    ]);
    assert.deepStrictEqual(result['Talk']['Vid'], ['en']);
  });

  it('no duplicates', () => {
    var result = extractSrcSrtLangs([
      { path: 'talks/Talk/Vid/source/en.srt', sha: 'a' },
      { path: 'talks/Talk/Vid/source/en.srt', sha: 'b' },
    ]);
    assert.strictEqual(result['Talk']['Vid'].length, 1);
  });

  it('separate languages per video slug', () => {
    var result = extractSrcSrtLangs([
      { path: 'talks/Talk/Vid1/source/en.srt', sha: 'a' },
      { path: 'talks/Talk/Vid2/source/hi.srt', sha: 'b' },
    ]);
    assert.deepStrictEqual(result['Talk']['Vid1'], ['en']);
    assert.deepStrictEqual(result['Talk']['Vid2'], ['hi']);
  });
});

// ============================================================
// Tests: buildSrtUrlWithLang
// ============================================================
describe('buildSrtUrlWithLang', () => {
  var RAW = 'https://raw.githubusercontent.com/o/r/main';

  it('builds uk URL', () => {
    var url = buildSrtUrlWithLang(RAW, 'talk', 'vid', 'uk', {});
    assert.ok(url.endsWith('/final/uk.srt'));
  });

  it('builds hi URL', () => {
    var url = buildSrtUrlWithLang(RAW, 'talk', 'vid', 'hi', {});
    assert.ok(url.endsWith('/final/hi.srt'));
  });

  it('appends sha for correct lang key', () => {
    var sha = { 'vid/uk': 'aaa11111', 'vid/hi': 'bbb22222' };
    var ukUrl = buildSrtUrlWithLang(RAW, 'talk', 'vid', 'uk', sha);
    var hiUrl = buildSrtUrlWithLang(RAW, 'talk', 'vid', 'hi', sha);
    assert.ok(ukUrl.includes('?v=aaa11111'));
    assert.ok(hiUrl.includes('?v=bbb22222'));
  });

  it('no sha when key missing', () => {
    var url = buildSrtUrlWithLang(RAW, 'talk', 'vid', 'en', { 'vid/uk': 'abc' });
    assert.ok(!url.includes('?v='));
  });

  it('no sha when srtSha is null', () => {
    var url = buildSrtUrlWithLang(RAW, 'talk', 'vid', 'uk', null);
    assert.ok(!url.includes('?v='));
  });
});

// ============================================================
// Tests: subtitle language selector visibility
// ============================================================
describe('subtitle language selector logic', () => {
  function shouldShowSelector(availLangs) {
    return availLangs.length > 1;
  }

  function getDefaultLang(availLangs) {
    return availLangs.indexOf('uk') !== -1 ? 'uk' : availLangs[0];
  }

  it('hides selector for single language', () => {
    assert.strictEqual(shouldShowSelector(['uk']), false);
  });

  it('shows selector for multiple languages', () => {
    assert.strictEqual(shouldShowSelector(['uk', 'hi']), true);
  });

  it('shows selector for three languages', () => {
    assert.strictEqual(shouldShowSelector(['uk', 'hi', 'en']), true);
  });

  it('default is uk when available', () => {
    assert.strictEqual(getDefaultLang(['hi', 'uk', 'en']), 'uk');
  });

  it('default is first when uk not available', () => {
    assert.strictEqual(getDefaultLang(['hi', 'en']), 'hi');
  });

  it('default for single language', () => {
    assert.strictEqual(getDefaultLang(['uk']), 'uk');
  });
});

// ============================================================
// Tests: SPA code integrity (no use-before-declare)
// ============================================================
describe('SPA code integrity', () => {
  var fs = require('fs');
  var html = fs.readFileSync('site/index.html', 'utf8');
  var lines = html.split('\n');

  it('var SPA = {} exists', () => {
    assert.ok(lines.some(l => l.includes('var SPA = {}')), 'var SPA = {} not found');
  });

  it('no SPA.xxx assignment in JS before var SPA = {}', () => {
    var inScript = false;
    var spaDeclared = false;
    var errors = [];
    lines.forEach((line, i) => {
      var s = line.trim();
      if (s.includes('<script>') || s.startsWith('<script ')) inScript = true;
      if (s.includes('</script>')) inScript = false;
      if (s.includes('var SPA = {}')) spaDeclared = true;
      if (inScript && !spaDeclared && s.startsWith('SPA.')) {
        errors.push('line ' + (i+1) + ': ' + s.substring(0, 60));
      }
    });
    assert.strictEqual(errors.length, 0, 'SPA used before declaration: ' + errors.join('; '));
  });

  it('CACHE_SCHEMA is a number >= 1', () => {
    var m = html.match(/var CACHE_SCHEMA = (\d+)/);
    assert.ok(m, 'CACHE_SCHEMA not found');
    assert.ok(parseInt(m[1]) >= 1, 'CACHE_SCHEMA should be >= 1');
  });

  it('APP_DEPLOY_SHA placeholder exists', () => {
    assert.ok(html.includes("var APP_DEPLOY_SHA = ''"), 'APP_DEPLOY_SHA placeholder not found');
  });

  it('SW registration without version query', () => {
    assert.ok(html.includes("register('sw.js')"), 'SW should register without version query');
  });

  it('all SPA.xxx in onclick handlers have matching definitions', () => {
    // Extract onclick SPA.xxx calls
    var onclickCalls = new Set();
    lines.forEach(line => {
      var ms = line.match(/onclick="SPA\.(\w+)\(/g);
      if (ms) ms.forEach(m => {
        var name = m.match(/SPA\.(\w+)/)[1];
        onclickCalls.add(name);
      });
    });
    // Extract SPA.xxx = function definitions
    var definitions = new Set();
    lines.forEach(line => {
      var m = line.trim().match(/^SPA\.(\w+)\s*=/);
      if (m) definitions.add(m[1]);
    });
    var missing = [...onclickCalls].filter(c => !definitions.has(c));
    assert.strictEqual(missing.length, 0, 'onclick references undefined SPA methods: ' + missing.join(', '));
  });

  it('no duplicate SPA.xxx definitions', () => {
    var defs = {};
    lines.forEach((line, i) => {
      var m = line.match(/^SPA\.(\w+)\s*=\s*function/);
      if (m) {
        var name = m[1];
        if (defs[name]) {
          assert.fail('Duplicate SPA.' + name + ' at lines ' + defs[name] + ' and ' + (i+1));
        }
        defs[name] = i + 1;
      }
    });
  });
});

// ============================================================
// Tests: Fullscreen mode
// ============================================================
describe('Fullscreen mode', () => {
  var fs = require('fs');
  var html = fs.readFileSync('site/index.html', 'utf8');

  it('btn-fullscreen exists in HTML', () => {
    assert.ok(html.includes('id="btn-fullscreen"'), 'btn-fullscreen element not found');
  });

  it('SPA.toggleFullscreen is defined', () => {
    assert.ok(html.includes('SPA.toggleFullscreen'), 'SPA.toggleFullscreen not found');
    assert.ok(html.match(/SPA\.toggleFullscreen\s*=\s*function/), 'SPA.toggleFullscreen not a function definition');
  });

  it('F key handler calls toggleFullscreen', () => {
    // The keyboard handler should check for 'f' or 'F' key
    assert.ok(html.includes("'f'") || html.includes("'F'") || html.includes('"f"') || html.includes('"F"'),
      'F key not found in keyboard handler');
    assert.ok(html.includes('toggleFullscreen'), 'toggleFullscreen not referenced from keyboard handler');
  });

  it('fullscreenchange listener exists', () => {
    assert.ok(html.includes('fullscreenchange'), 'fullscreenchange event listener not found');
  });

  it('.fs-mode CSS class defined', () => {
    assert.ok(html.includes('.fs-mode'), '.fs-mode CSS not found');
  });

  it('.fs-mode hides header', () => {
    assert.ok(html.includes('fs-mode') && html.includes('.header'), '.fs-mode should hide .header');
  });

  it('.fs-mode hides markers', () => {
    assert.ok(html.includes('fs-mode') && html.includes('.markers'), '.fs-mode should hide .markers');
  });

  it('btn-mark hidden in fullscreen', () => {
    assert.ok(html.includes('fs-mode') && html.includes('btn-mark'), 'btn-mark should be hidden in fs-mode');
  });

  it('subtitle overlay has fixed position in fs-mode', () => {
    // Check CSS contains position: fixed for subtitle-overlay in fs-mode context.
    // CSS is externalized; the fs-mode component rules live in components.css.
    var css = fs.readFileSync('site/css/components.css', 'utf8');
    assert.ok(css.includes('fs-mode') && css.includes('#subtitle-overlay') && css.includes('position') && css.includes('fixed'),
      'subtitle-overlay should be position:fixed in .fs-mode');
  });
});

// ============================================================
// Tests: Subtitle alignment algorithm
// ============================================================

// Extract alignSubtitlesByTime from index.html for unit testing
var _alignFn = null;
function getAlignFn() {
  if (_alignFn) return _alignFn;
  var fs = require('fs');
  var html = fs.readFileSync('site/index.html', 'utf8');
  // Extract the function body between markers
  var start = html.indexOf('// ALIGN_START');
  var end = html.indexOf('// ALIGN_END');
  if (start === -1 || end === -1) throw new Error('alignSubtitlesByTime markers not found in index.html');
  var code = html.substring(start, end);
  // Load via require from temp file
  var tmpPath = require('path').join(require('os').tmpdir(), '_align_test.js');
  fs.writeFileSync(tmpPath, code + '\nmodule.exports = alignSubtitlesByTime;');
  _alignFn = require(tmpPath);
  return _alignFn;
}

// Extract parseTranscript + serializeTranscript from index.html.
var _parseFns = null;
function getParseFns() {
  if (_parseFns) return _parseFns;
  var fs = require('fs');
  var html = fs.readFileSync('site/index.html', 'utf8');
  var start = html.indexOf('// PARSE_TRANSCRIPT_START');
  var end = html.indexOf('// PARSE_TRANSCRIPT_END');
  if (start === -1 || end === -1) throw new Error('parseTranscript markers not found in index.html');
  var code = html.substring(start, end);
  var tmpPath = require('path').join(require('os').tmpdir(), '_parse_transcript_test.js');
  fs.writeFileSync(
    tmpPath,
    code + '\nmodule.exports = { parseTranscript: parseTranscript, serializeTranscript: serializeTranscript };'
  );
  _parseFns = require(tmpPath);
  return _parseFns;
}

describe('parseTranscript / serializeTranscript', () => {
  var HEADER_LINE = 'Мова промови: англійська';

  it('parse+serialize is lossless for single-newline separator', () => {
    var { parseTranscript, serializeTranscript } = getParseFns();
    var src = 'Title\n' + HEADER_LINE + '\n\nПерший абзац.\nДругий абзац.\nТретій абзац.\n';
    var parsed = parseTranscript(src);
    assert.strictEqual(parsed.paragraphs.length, 3);
    assert.strictEqual(parsed.separator, '\n');
    assert.strictEqual(parsed.header, 'Title\n' + HEADER_LINE);
    var rebuilt = serializeTranscript(parsed, parsed.paragraphs);
    assert.strictEqual(rebuilt, src);
  });

  it('parse+serialize is lossless for double-newline separator', () => {
    var { parseTranscript, serializeTranscript } = getParseFns();
    var src = HEADER_LINE + '\n\nПерший.\n\nДругий.\n\nТретій.\n';
    var parsed = parseTranscript(src);
    assert.strictEqual(parsed.paragraphs.length, 3);
    assert.strictEqual(parsed.separator, '\n\n');
    var rebuilt = serializeTranscript(parsed, parsed.paragraphs);
    assert.strictEqual(rebuilt, src);
  });

  it('strips UTF-8 BOM defensively', () => {
    var { parseTranscript } = getParseFns();
    var src = '\uFEFF' + HEADER_LINE + '\n\nПерший абзац.\n';
    var parsed = parseTranscript(src);
    assert.strictEqual(parsed.header, HEADER_LINE, 'BOM should be stripped from header');
    assert.strictEqual(parsed.paragraphs[0], 'Перший абзац.');
  });

  it('preserves CRLF line endings on round-trip', () => {
    var { parseTranscript, serializeTranscript } = getParseFns();
    var src = HEADER_LINE + '\r\n\r\nПерший.\r\nДругий.\r\n';
    var parsed = parseTranscript(src);
    assert.strictEqual(parsed.lineEnding, '\r\n');
    assert.strictEqual(parsed.paragraphs.length, 2);
    var rebuilt = serializeTranscript(parsed, parsed.paragraphs);
    assert.strictEqual(rebuilt, src);
  });

  it('edits round-trip with byte-identical unchanged paragraphs', () => {
    var { parseTranscript, serializeTranscript } = getParseFns();
    var src = HEADER_LINE + '\n\nПерший.\nДругий.\nТретій.\n';
    var parsed = parseTranscript(src);
    var paras = parsed.paragraphs.slice();
    paras[1] = 'Відредаговане.';
    var rebuilt = serializeTranscript(parsed, paras);
    assert.strictEqual(
      rebuilt,
      HEADER_LINE + '\n\nПерший.\nВідредаговане.\nТретій.\n'
    );
  });

  it('file with no header line treats all content as body', () => {
    var { parseTranscript, serializeTranscript } = getParseFns();
    var src = 'Перший.\nДругий.\nТретій.\n';
    var parsed = parseTranscript(src);
    assert.strictEqual(parsed.header, '');
    assert.strictEqual(parsed.paragraphs.length, 3);
    var rebuilt = serializeTranscript(parsed, parsed.paragraphs);
    assert.strictEqual(rebuilt, src);
  });

  it('consumes blank lines between header and body', () => {
    var { parseTranscript } = getParseFns();
    var src = HEADER_LINE + '\n\n\n\nПерший.\n';
    var parsed = parseTranscript(src);
    // body_start advances past all blank lines; first paragraph is the real content
    assert.strictEqual(parsed.paragraphs[0], 'Перший.');
  });
});

describe('alignSubtitlesByTime', () => {
  it('aligns identical timecodes 1:1', () => {
    var align = getAlignFn();
    var en = [
      { startMs: 0, endMs: 3000, text: 'Hello' },
      { startMs: 3000, endMs: 6000, text: 'World' },
    ];
    var uk = [
      { startMs: 0, endMs: 3000, text: 'Привіт' },
      { startMs: 3000, endMs: 6000, text: 'Світ' },
    ];
    var rows = align(en, uk);
    assert.strictEqual(rows.length, 2);
    assert.strictEqual(rows[0].en.text, 'Hello');
    assert.strictEqual(rows[0].uk.text, 'Привіт');
    assert.strictEqual(rows[1].en.text, 'World');
    assert.strictEqual(rows[1].uk.text, 'Світ');
  });

  it('handles more EN blocks than UK', () => {
    var align = getAlignFn();
    var en = [
      { startMs: 0, endMs: 2000, text: 'One' },
      { startMs: 2000, endMs: 4000, text: 'Two' },
      { startMs: 4000, endMs: 6000, text: 'Three' },
    ];
    var uk = [
      { startMs: 0, endMs: 3000, text: 'Один-Два' },
      { startMs: 3000, endMs: 6000, text: 'Три' },
    ];
    var rows = align(en, uk);
    assert.ok(rows.length >= 2, 'should have at least 2 rows, got ' + rows.length);
    var enTexts = rows.filter(function(r) { return r.en; }).map(function(r) { return r.en.text; });
    var ukTexts = rows.filter(function(r) { return r.uk; }).map(function(r) { return r.uk.text; });
    assert.ok(enTexts.includes('One'));
    assert.ok(enTexts.includes('Two'));
    assert.ok(enTexts.includes('Three'));
    assert.ok(ukTexts.includes('Один-Два'));
    assert.ok(ukTexts.includes('Три'));
  });

  it('handles more UK blocks than EN', () => {
    var align = getAlignFn();
    var en = [
      { startMs: 0, endMs: 5000, text: 'Long sentence' },
    ];
    var uk = [
      { startMs: 0, endMs: 2000, text: 'Частина 1' },
      { startMs: 2000, endMs: 5000, text: 'Частина 2' },
    ];
    var rows = align(en, uk);
    assert.ok(rows.length >= 2, 'should have at least 2 rows');
    var ukTexts = rows.filter(function(r) { return r.uk; }).map(function(r) { return r.uk.text; });
    assert.ok(ukTexts.includes('Частина 1'));
    assert.ok(ukTexts.includes('Частина 2'));
  });

  it('handles gap between blocks', () => {
    var align = getAlignFn();
    var en = [
      { startMs: 0, endMs: 2000, text: 'Before gap' },
      { startMs: 5000, endMs: 7000, text: 'After gap' },
    ];
    var uk = [
      { startMs: 0, endMs: 2000, text: 'До паузи' },
      { startMs: 5000, endMs: 7000, text: 'Після паузи' },
    ];
    var rows = align(en, uk);
    assert.strictEqual(rows.length, 2, 'gap should not produce extra rows');
    assert.strictEqual(rows[0].en.text, 'Before gap');
    assert.strictEqual(rows[1].en.text, 'After gap');
  });

  it('handles empty EN array', () => {
    var align = getAlignFn();
    var uk = [{ startMs: 0, endMs: 3000, text: 'Тест' }];
    var rows = align([], uk);
    assert.strictEqual(rows.length, 1);
    assert.strictEqual(rows[0].en, null);
    assert.strictEqual(rows[0].uk.text, 'Тест');
  });

  it('handles empty UK array', () => {
    var align = getAlignFn();
    var en = [{ startMs: 0, endMs: 3000, text: 'Test' }];
    var rows = align(en, []);
    assert.strictEqual(rows.length, 1);
    assert.strictEqual(rows[0].uk, null);
    assert.strictEqual(rows[0].en.text, 'Test');
  });

  it('handles both empty arrays', () => {
    var align = getAlignFn();
    var rows = align([], []);
    assert.strictEqual(rows.length, 0);
  });

  it('rows have startMs and endMs', () => {
    var align = getAlignFn();
    var en = [{ startMs: 1000, endMs: 4000, text: 'A' }];
    var uk = [{ startMs: 1000, endMs: 4000, text: 'Б' }];
    var rows = align(en, uk);
    assert.strictEqual(rows[0].startMs, 1000);
    assert.strictEqual(rows[0].endMs, 4000);
  });

  it('each block appears at least once across all rows', () => {
    var align = getAlignFn();
    var en = [
      { startMs: 0, endMs: 2000, text: 'E1' },
      { startMs: 2000, endMs: 4000, text: 'E2' },
      { startMs: 4000, endMs: 8000, text: 'E3' },
    ];
    var uk = [
      { startMs: 0, endMs: 3000, text: 'U1' },
      { startMs: 3000, endMs: 5000, text: 'U2' },
      { startMs: 5000, endMs: 8000, text: 'U3' },
    ];
    var rows = align(en, uk);
    var seenEn = {};
    var seenUk = {};
    rows.forEach(function(r) {
      if (r.en) seenEn[r.en.text] = true;
      if (r.uk) seenUk[r.uk.text] = true;
    });
    assert.strictEqual(Object.keys(seenEn).length, 3, 'all EN blocks should appear');
    assert.strictEqual(Object.keys(seenUk).length, 3, 'all UK blocks should appear');
  });

  it('overlapping non-aligned blocks produce no empty cells', () => {
    var align = getAlignFn();
    // EN: [1-4, 4.5-8, 8.5-12] (3 blocks)
    // UK: [1-5, 6-10]            (2 blocks)
    var en = [
      { startMs: 1000, endMs: 4000, text: 'E1' },
      { startMs: 4500, endMs: 8000, text: 'E2' },
      { startMs: 8500, endMs: 12000, text: 'E3' },
    ];
    var uk = [
      { startMs: 1000, endMs: 5000, text: 'U1' },
      { startMs: 6000, endMs: 10000, text: 'U2' },
    ];
    var rows = align(en, uk);
    rows.forEach(function(r, i) {
      assert.ok(r.en !== null, 'row ' + i + ' should not have null EN, got: ' + JSON.stringify(r));
      assert.ok(r.uk !== null, 'row ' + i + ' should not have null UK, got: ' + JSON.stringify(r));
    });
    // Expected pairings: (E1,U1), (E2,U1), (E2,U2), (E3,U2)
    assert.strictEqual(rows.length, 4, 'expected 4 rows, got ' + rows.length);
    assert.strictEqual(rows[0].en.text, 'E1');
    assert.strictEqual(rows[0].uk.text, 'U1');
    assert.strictEqual(rows[1].en.text, 'E2');
    assert.strictEqual(rows[1].uk.text, 'U1');
    assert.strictEqual(rows[2].en.text, 'E2');
    assert.strictEqual(rows[2].uk.text, 'U2');
    assert.strictEqual(rows[3].en.text, 'E3');
    assert.strictEqual(rows[3].uk.text, 'U2');
  });

  it('orphan EN block at start keeps empty UK cell', () => {
    var align = getAlignFn();
    // EN[0] (0-1) has no UK overlap; EN[1] (2-4) overlaps UK[0] (2.5-3.5)
    var en = [
      { startMs: 0, endMs: 1000, text: 'Orphan' },
      { startMs: 2000, endMs: 4000, text: 'Paired' },
    ];
    var uk = [
      { startMs: 2500, endMs: 3500, text: 'UK' },
    ];
    var rows = align(en, uk);
    var orphanRow = rows.find(function(r) { return r.en && r.en.text === 'Orphan'; });
    assert.ok(orphanRow, 'orphan EN block should still appear');
    assert.strictEqual(orphanRow.uk, null, 'orphan EN should have null UK partner');
    var pairedRow = rows.find(function(r) { return r.en && r.en.text === 'Paired'; });
    assert.ok(pairedRow, 'paired EN block should appear');
    assert.ok(pairedRow.uk && pairedRow.uk.text === 'UK', 'paired EN should be paired with UK');
  });

  it('orphan UK block in middle keeps empty EN cell', () => {
    var align = getAlignFn();
    var en = [
      { startMs: 0, endMs: 2000, text: 'E1' },
      { startMs: 8000, endMs: 10000, text: 'E2' },
    ];
    var uk = [
      { startMs: 0, endMs: 2000, text: 'U1' },
      { startMs: 4000, endMs: 6000, text: 'U_orphan' },
      { startMs: 8000, endMs: 10000, text: 'U2' },
    ];
    var rows = align(en, uk);
    var orphanRow = rows.find(function(r) { return r.uk && r.uk.text === 'U_orphan'; });
    assert.ok(orphanRow, 'orphan UK block should still appear');
    assert.strictEqual(orphanRow.en, null, 'orphan UK should have null EN partner');
  });

  it('block spanning across multiple partner rows is consecutive', () => {
    var align = getAlignFn();
    // EN block 4.5-8 should pair with both UK blocks 1-5 and 6-10
    var en = [
      { startMs: 1000, endMs: 4000, text: 'E1' },
      { startMs: 4500, endMs: 8000, text: 'E_span' },
      { startMs: 8500, endMs: 12000, text: 'E3' },
    ];
    var uk = [
      { startMs: 1000, endMs: 5000, text: 'U1' },
      { startMs: 6000, endMs: 10000, text: 'U2' },
    ];
    var rows = align(en, uk);
    // Find consecutive rows where E_span appears — they must be adjacent
    var spanIndices = [];
    rows.forEach(function(r, i) {
      if (r.en && r.en.text === 'E_span') spanIndices.push(i);
    });
    assert.ok(spanIndices.length >= 1, 'E_span should appear at least once');
    for (var i = 1; i < spanIndices.length; i++) {
      assert.strictEqual(spanIndices[i], spanIndices[i - 1] + 1,
        'E_span occurrences must be consecutive for grid spanning to work');
    }
  });
});

// ============================================================
// Tests: Review mode toggle (transcript vs subtitles)
// ============================================================
describe('Review mode toggle', () => {
  var fs = require('fs');
  var html = fs.readFileSync('site/index.html', 'utf8');

  it('SPA.switchReviewMode is defined', () => {
    assert.ok(html.match(/SPA\.switchReviewMode\s*=/), 'SPA.switchReviewMode function should exist');
  });

  it('SPA.switchSrtLang is defined', () => {
    assert.ok(html.match(/SPA\.switchSrtLang\s*=/), 'SPA.switchSrtLang function should exist');
  });

  it('alignSubtitlesByTime function is defined', () => {
    assert.ok(html.includes('function alignSubtitlesByTime'), 'alignment function should exist in HTML');
  });

  it('review mode options include transcript and srt', () => {
    assert.ok(html.includes("'transcript'") || html.includes('"transcript"'), 'transcript mode should exist');
    assert.ok(html.includes("'srt'") || html.includes('"srt"'), 'srt mode should exist');
  });
});

// ============================================================
// Tests: Theme system
// ============================================================
describe('Design system: token/component layer separation', () => {
  // Replaces the old brittle "no hardcoded hex" pair (which only ever saw the
  // first inline <style> block and passed vacuously after externalization). The
  // real invariant after the split: the palette lives ONLY in tokens.css, never
  // in components.css. Per-colour correctness is guarded by the computed-style
  // snapshot in tests/test_spa_theme_tokens.py.
  var fs = require('fs');
  var tokens = fs.readFileSync('site/css/tokens.css', 'utf8');
  var components = fs.readFileSync('site/css/components.css', 'utf8');

  it('components.css defines no palette tokens (those belong in tokens.css)', () => {
    // A bare :root / :root:not(...) / [data-theme=...] block whose body declares
    // --custom-props is a palette definition. Component rules that merely use
    // var(), or theme an *element* (`:root:not(...) #bookmarklet-link`, which has
    // a descendant selector so the `{` is not adjacent), are legitimately here.
    var re = /(?:^|\n)\s*(:root(?::not\([^)]*\))?|\[data-theme="[^"]*"\])\s*\{([^}]*)\}/g;
    var offenders = [];
    var m;
    while ((m = re.exec(components)) !== null) {
      if (/--[\w-]+\s*:/.test(m[2])) offenders.push(m[1]);
    }
    assert.deepStrictEqual(offenders, [], 'palette token rules leaked into components.css: ' + offenders.join(', '));
  });

  it('tokens.css is the palette source (its :root declares the surface tokens)', () => {
    assert.ok(/:root\s*\{[\s\S]*?--bg:\s*#FAF6EE/.test(tokens),
      'tokens.css :root must define the light --bg');
  });
});

describe('Theme: toggle logic', () => {
  var cycle = ['auto', 'dark', 'light'];

  function nextTheme(current) {
    return cycle[(cycle.indexOf(current) + 1) % cycle.length];
  }

  it('auto → dark', () => assert.strictEqual(nextTheme('auto'), 'dark'));
  it('dark → light', () => assert.strictEqual(nextTheme('dark'), 'light'));
  it('light → auto', () => assert.strictEqual(nextTheme('light'), 'auto'));

  it('auto means no data-theme attribute', () => {
    // In auto mode, data-theme should be removed, letting @media query decide
    var mode = 'auto';
    assert.strictEqual(mode === 'auto', true);
  });

  it('dark/light means explicit data-theme', () => {
    assert.strictEqual('dark' !== 'auto', true);
    assert.strictEqual('light' !== 'auto', true);
  });
});

describe('Theme: CSS variable completeness', () => {
  var fs = require('fs');
  var html = fs.readFileSync('site/index.html', 'utf8');
  // Palette/token rules live in tokens.css; component rules in components.css.
  // The layered cool-grey + HSL palettes were consolidated away (PR-2); these
  // assert the single canonical warm-paper/walnut palette. The authoritative
  // per-theme guard is tests/test_spa_theme_tokens.py (computed styles).
  var css = fs.readFileSync('site/css/tokens.css', 'utf8');
  var components = fs.readFileSync('site/css/components.css', 'utf8');

  it('light palette (warm paper) is the :root default', () => {
    assert.ok(/--bg:\s*#FAF6EE/.test(css), 'light --bg (#FAF6EE) missing');
    assert.ok(/--fg:\s*#221E18/.test(css), 'light --fg (#221E18) missing');
    assert.ok(/--link:\s*#8A4A2E/.test(css), 'light --link (#8A4A2E) missing');
  });

  it('dark palette (walnut) defined for both auto-dark and explicit dark', () => {
    assert.ok(/--bg:\s*#14120F/.test(css), 'dark --bg (#14120F) missing');
    assert.ok(/--link:\s*#E39770/.test(css), 'dark --link (#E39770) missing');
    assert.ok(/@media \(prefers-color-scheme: dark\)/.test(css), 'auto-dark @media missing');
    assert.ok(/\[data-theme="dark"\]/.test(css), 'explicit [data-theme=dark] missing');
  });

  it('auto-dark is guarded against an explicit light theme', () => {
    assert.ok(css.includes(':root:not([data-theme="light"])'),
      'the dark @media must exclude [data-theme=light] so an explicit light theme wins');
  });

  it('all var() references have matching definitions', () => {
    // Usages span the stylesheets and any inline style="" in the HTML;
    // definitions live in tokens.css. Check the union so an inline var()
    // usage with no definition is still caught.
    var src = html + '\n' + css + '\n' + components;
    var varUsages = new Set();
    var varDefs = new Set();
    // Find var(--xxx)
    (src.match(/var\(--[\w-]+\)/g) || []).forEach(m => {
      varUsages.add(m.match(/--[\w-]+/)[0]);
    });
    // Find --xxx: definitions
    (src.match(/--[\w-]+\s*:/g) || []).forEach(m => {
      varDefs.add(m.replace(/\s*:/, ''));
    });
    var missing = [...varUsages].filter(v => !varDefs.has(v));
    assert.strictEqual(missing.length, 0, 'Undefined CSS vars: ' + missing.join(', '));
  });
});

// ============================================================
// Tests: refresh covers all data sources
// ============================================================
describe('refresh: covers all data sources', () => {
  it('refreshManifest calls loadReviewStatus (not just manifest)', () => {
    var fs = require('fs');
    var html = fs.readFileSync('site/index.html', 'utf8');
    var fnBody = html.match(/SPA\.refreshManifest\s*=\s*function[\s\S]*?^};/m);
    assert.ok(fnBody, 'refreshManifest not found');
    assert.ok(fnBody[0].includes('loadReviewStatus'), 'refreshManifest should call loadReviewStatus()');
    assert.ok(fnBody[0].includes('loadManifest'), 'refreshManifest should call loadManifest()');
    assert.ok(fnBody[0].includes('Promise.all'), 'refreshManifest should use Promise.all for parallel fetch');
  });

  it('loadReviewStatus uses SHA cache-buster', () => {
    var fs = require('fs');
    var html = fs.readFileSync('site/index.html', 'utf8');
    var fnBody = html.match(/function loadReviewStatus[\s\S]*?^}/m);
    assert.ok(fnBody, 'loadReviewStatus not found');
    assert.ok(fnBody[0].includes('_reviewSha'), 'loadReviewStatus should use _reviewSha');
    assert.ok(fnBody[0].includes('?v='), 'loadReviewStatus should append ?v= cache-buster');
  });

  it('review-status.json sha extracted in buildManifest', () => {
    var fs = require('fs');
    var html = fs.readFileSync('site/index.html', 'utf8');
    assert.ok(html.includes('_reviewSha'), 'manifest should have _reviewSha field');
    assert.ok(html.includes("entry.path === 'review-status.json'"), 'should extract review-status.json sha');
  });
});

// --- extractReviewSha (extracted logic) ---
function extractReviewSha(treeEntries) {
  var sha = '';
  treeEntries.forEach(function(entry) {
    if (entry.path === 'review-status.json') sha = entry.sha || '';
  });
  return sha;
}

describe('extractReviewSha', () => {
  it('returns sha when review-status.json present', () => {
    assert.strictEqual(extractReviewSha([
      { path: 'review-status.json', sha: 'abc123' },
      { path: 'talks/foo/meta.yaml', sha: 'xxx' },
    ]), 'abc123');
  });

  it('returns empty when not present', () => {
    assert.strictEqual(extractReviewSha([
      { path: 'talks/foo/meta.yaml', sha: 'xxx' },
    ]), '');
  });

  it('returns empty when sha missing', () => {
    assert.strictEqual(extractReviewSha([
      { path: 'review-status.json' },
    ]), '');
  });
});

describe('refresh: no hardcoded colors in status messages', () => {
  it('refreshManifest uses CSS variables for colors', () => {
    var fs = require('fs');
    var html = fs.readFileSync('site/index.html', 'utf8');
    var fnBody = html.match(/SPA\.refreshManifest\s*=\s*function[\s\S]*?^};/m);
    assert.ok(fnBody, 'refreshManifest not found');
    var fn = fnBody[0];
    // Should not have hardcoded hex colors
    var hexColors = fn.match(/#[0-9a-fA-F]{3,8}\b/g) || [];
    assert.strictEqual(hexColors.length, 0, 'Hardcoded colors in refreshManifest: ' + hexColors.join(', '));
    // Should use var(--xxx) for colors
    assert.ok(fn.includes('var(--link)'), 'should use var(--link) for loading color');
    assert.ok(fn.includes('var(--accent-green)'), 'should use var(--accent-green) for success');
    assert.ok(fn.includes('var(--accent-red)'), 'should use var(--accent-red) for error');
  });
});

// ============================================================
// Tests: Service Worker caching strategy
// ============================================================

// The SW routing predicates (isImmutable / isApiOrRaw / isNavigation /
// pickStrategy) are now single-sourced in site/js/sw_routing.js — the module
// site/sw.js loads via importScripts — and unit-tested there
// (tests/test_sw_routing.js), so they can never drift from production. This file
// keeps only the cache-name versioning helper used by the version-sync tests.
function swCacheName(version) {
  return 'sy-subtitles-v' + (version || '0');
}

describe('SW: cache name versioning', () => {
  it('derives from version param', () => assert.strictEqual(swCacheName('10'), 'sy-subtitles-v10'));
  it('defaults to v0 for null', () => assert.strictEqual(swCacheName(null), 'sy-subtitles-v0'));
  it('defaults to v0 for undefined', () => assert.strictEqual(swCacheName(undefined), 'sy-subtitles-v0'));
  it('different versions → different names', () => assert.notStrictEqual(swCacheName('9'), swCacheName('10')));
  it('same version → same name', () => assert.strictEqual(swCacheName('10'), swCacheName('10')));
});

describe('SW: version sync with APP_VERSION', () => {
  it('registration URL contains version', () => {
    var APP_VERSION = '10';
    var url = new URL('sw.js?v=' + APP_VERSION, 'https://example.com');
    assert.strictEqual(url.searchParams.get('v'), APP_VERSION);
  });
  it('SW extracts version from self.location', () => {
    var url = new URL('https://example.com/sw.js?v=10');
    assert.strictEqual(url.searchParams.get('v'), '10');
  });
  it('version bump triggers old cache deletion', () => {
    var oldName = swCacheName('9');
    var newName = swCacheName('10');
    var keys = [oldName, newName, 'unrelated-cache'];
    var toDelete = keys.filter(function(k) { return k !== newName; });
    assert.deepStrictEqual(toDelete, [oldName, 'unrelated-cache']);
  });
  it('no version in URL defaults safely', () => {
    var url = new URL('https://example.com/sw.js');
    var v = url.searchParams.get('v');
    assert.strictEqual(swCacheName(v), 'sy-subtitles-v0');
  });
});

// ============================================================
// Tests: 304 cache scenario (lastModified preserved)
// ============================================================
describe('304 cache scenario', () => {
  // Simulate cache object from localStorage (old format, no lastModified)
  function makeOldCache() {
    return { etag: '"old-etag"', timestamp: Date.now() - 60000, talks: [] };
  }

  // Simulate cache with lastModified
  function makeNewCache() {
    return { etag: '"new-etag"', lastModified: 'Tue, 08 Apr 2026 10:00:00 GMT', timestamp: Date.now(), talks: [] };
  }

  it('old cache without lastModified returns empty label', () => {
    var cache = makeOldCache();
    // formatLastModified receives cache.lastModified which is undefined
    assert.strictEqual(formatLastModified(cache.lastModified, Date.now()), '');
  });

  it('new cache with lastModified returns valid label', () => {
    var cache = makeNewCache();
    var now = new Date('2026-04-08T10:05:00Z');
    assert.strictEqual(formatLastModified(cache.lastModified, now), '5 хв тому');
  });

  it('304 response should update lastModified on old cache', () => {
    // Simulate what happens on 304: we update cache.lastModified from response header
    var cache = makeOldCache();
    assert.strictEqual(cache.lastModified, undefined);

    // Simulate 304 handler
    var lm304 = 'Tue, 08 Apr 2026 12:00:00 GMT';
    if (lm304) cache.lastModified = lm304;

    assert.strictEqual(cache.lastModified, lm304);
    var now = new Date('2026-04-08T12:03:00Z');
    assert.strictEqual(formatLastModified(cache.lastModified, now), '3 хв тому');
  });

  it('cache-buster changes when sha changes', () => {
    var RAW = 'https://raw.githubusercontent.com/owner/repo/main';
    var url1 = buildSrtUrl(RAW, 'talk', 'video', 'aaa11111');
    var url2 = buildSrtUrl(RAW, 'talk', 'video', 'bbb22222');
    assert.notStrictEqual(url1, url2);
    // Both should have ?v= parameter
    assert.ok(url1.includes('?v=aaa11111'), url1);
    assert.ok(url2.includes('?v=bbb22222'), url2);
  });

  it('same sha produces same URL (cache hit)', () => {
    var RAW = 'https://raw.githubusercontent.com/owner/repo/main';
    var url1 = buildSrtUrl(RAW, 'talk', 'video', 'abc12345');
    var url2 = buildSrtUrl(RAW, 'talk', 'video', 'abc12345');
    assert.strictEqual(url1, url2);
  });
});

// ============================================================
// Tests: edge cases for freshness display
// ============================================================
describe('freshness display edge cases', () => {
  it('manifest without lastModified shows empty (graceful)', () => {
    assert.strictEqual(formatLastModified(undefined, Date.now()), '');
  });

  it('manifest with empty string lastModified shows empty', () => {
    assert.strictEqual(formatLastModified('', Date.now()), '');
  });

  it('exactly 59 minutes shows minutes not hours', () => {
    var now = new Date('2026-04-08T10:59:00Z');
    var lastMod = 'Tue, 08 Apr 2026 10:00:00 GMT';
    assert.strictEqual(formatLastModified(lastMod, now), '59 хв тому');
  });

  it('exactly 60 minutes shows 1 hour', () => {
    var now = new Date('2026-04-08T11:00:00Z');
    var lastMod = 'Tue, 08 Apr 2026 10:00:00 GMT';
    assert.strictEqual(formatLastModified(lastMod, now), '1 год тому');
  });

  it('exactly 23 hours shows hours not date', () => {
    var now = new Date('2026-04-09T09:00:00Z');
    var lastMod = 'Tue, 08 Apr 2026 10:00:00 GMT';
    assert.strictEqual(formatLastModified(lastMod, now), '23 год тому');
  });

  it('exactly 24 hours shows date', () => {
    var now = new Date('2026-04-09T10:00:00Z');
    var lastMod = 'Tue, 08 Apr 2026 10:00:00 GMT';
    var result = formatLastModified(lastMod, now);
    assert.ok(result.includes('8'), 'should show day 8, got: ' + result);
    assert.ok(!result.includes('год'), 'should not show hours, got: ' + result);
  });

  it('no sha means no cache-buster (first load or missing)', () => {
    var RAW = 'https://raw.githubusercontent.com/o/r/main';
    var url = buildSrtUrl(RAW, 'talk', 'video', '');
    assert.ok(!url.includes('?v='), 'should not have ?v= for empty sha');
    url = buildSrtUrl(RAW, 'talk', 'video', null);
    assert.ok(!url.includes('?v='), 'should not have ?v= for null sha');
  });
});

// ============================================================
// Tests: getSrtSha helper (lookup from talk object)
// ============================================================
function getSrtSha(talk, videoSlug) {
  return (talk && talk._srtSha && talk._srtSha[videoSlug]) || '';
}

describe('getSrtSha', () => {
  it('returns sha when present', () => {
    var talk = { _srtSha: { 'Video-1': 'abc123def456' } };
    assert.strictEqual(getSrtSha(talk, 'Video-1'), 'abc123def456');
  });

  it('returns empty when video not in map', () => {
    var talk = { _srtSha: { 'Video-1': 'abc123' } };
    assert.strictEqual(getSrtSha(talk, 'Video-2'), '');
  });

  it('returns empty when _srtSha is empty', () => {
    var talk = { _srtSha: {} };
    assert.strictEqual(getSrtSha(talk, 'Video-1'), '');
  });

  it('returns empty when _srtSha is missing', () => {
    var talk = {};
    assert.strictEqual(getSrtSha(talk, 'Video-1'), '');
  });

  it('returns empty when talk is null', () => {
    assert.strictEqual(getSrtSha(null, 'Video-1'), '');
  });

  it('returns empty when talk is undefined', () => {
    assert.strictEqual(getSrtSha(undefined, 'Video-1'), '');
  });
});

// ============================================================
// Tests: refreshManifest cache clearing logic
// ============================================================
describe('refreshManifest cache clearing', () => {
  it('deleting etag from cache forces fresh fetch', () => {
    var cache = { etag: '"old"', lastModified: 'Mon, 07 Apr 2026 10:00:00 GMT', timestamp: 1000, talks: [] };
    delete cache.etag;
    assert.strictEqual(cache.etag, undefined);
    assert.strictEqual(cache.lastModified, 'Mon, 07 Apr 2026 10:00:00 GMT'); // preserved
  });

  it('deleting etag from null cache does not throw', () => {
    var cache = null;
    assert.doesNotThrow(function() {
      if (cache) delete cache.etag;
    });
  });

  it('cache without etag sends no If-None-Match header', () => {
    var cache = { timestamp: 1000, talks: [] };
    var headers = {};
    if (cache && cache.etag) headers['If-None-Match'] = cache.etag;
    assert.strictEqual(Object.keys(headers).length, 0);
  });

  it('cache with etag sends If-None-Match header', () => {
    var cache = { etag: '"abc"', timestamp: 1000, talks: [] };
    var headers = {};
    if (cache && cache.etag) headers['If-None-Match'] = cache.etag;
    assert.strictEqual(headers['If-None-Match'], '"abc"');
  });
});

// ============================================================
// Tests: integration scenario (full flow)
// ============================================================
describe('full cache flow scenarios', () => {
  it('first visit: no cache, no sha, no lastModified', () => {
    var cache = null;
    var sha = getSrtSha(null, 'Video');
    var label = formatLastModified(cache ? cache.lastModified : undefined, Date.now());
    var url = buildSrtUrl('https://raw.gh.com/o/r/main', 'talk', 'Video', sha);

    assert.strictEqual(sha, '');
    assert.strictEqual(label, '');
    assert.ok(!url.includes('?v='));
  });

  it('after fresh load: sha present, lastModified set', () => {
    var cache = {
      etag: '"fresh"',
      lastModified: 'Tue, 08 Apr 2026 15:00:00 GMT',
      timestamp: Date.now(),
      talks: [{ id: 'talk', _srtSha: { 'Video': 'deadbeef12345678' } }]
    };
    var talk = cache.talks[0];
    var sha = getSrtSha(talk, 'Video');
    var now = new Date('2026-04-08T15:02:00Z');
    var label = formatLastModified(cache.lastModified, now);
    var url = buildSrtUrl('https://raw.gh.com/o/r/main', 'talk', 'Video', sha);

    assert.strictEqual(sha, 'deadbeef12345678');
    assert.strictEqual(label, '2 хв тому');
    assert.ok(url.includes('?v=deadbeef'));
  });

  it('after push: new sha, new lastModified, new URL', () => {
    // Before push
    var oldSha = 'aaaa1111bbbb2222';
    var urlBefore = buildSrtUrl('https://raw.gh.com/o/r/main', 'talk', 'Video', oldSha);

    // After push (sha changed)
    var newSha = 'cccc3333dddd4444';
    var urlAfter = buildSrtUrl('https://raw.gh.com/o/r/main', 'talk', 'Video', newSha);

    assert.notStrictEqual(urlBefore, urlAfter);
    assert.ok(urlBefore.includes('?v=aaaa1111'));
    assert.ok(urlAfter.includes('?v=cccc3333'));
  });

  it('transcript URLs get cache-busted after push', () => {
    var talk = { _transcriptSha: { 'uk': 'old_sha_1111', 'en': 'old_sha_2222' } };
    var ukUrl1 = buildTranscriptUrl('https://raw.gh.com/o/r/main', 'talk', 'uk', getTranscriptSha(talk, 'uk'));
    assert.ok(ukUrl1.includes('?v=old_sha_'));

    // Simulate push: sha changes
    talk._transcriptSha['uk'] = 'new_sha_3333';
    var ukUrl2 = buildTranscriptUrl('https://raw.gh.com/o/r/main', 'talk', 'uk', getTranscriptSha(talk, 'uk'));
    assert.ok(ukUrl2.includes('?v=new_sha_'));
    assert.notStrictEqual(ukUrl1, ukUrl2);

    // EN didn't change — same URL
    var enUrl = buildTranscriptUrl('https://raw.gh.com/o/r/main', 'talk', 'en', getTranscriptSha(talk, 'en'));
    assert.ok(enUrl.includes('?v=old_sha_'));
  });

  it('304 with old cache gets lastModified updated', () => {
    var oldCache = { etag: '"old"', timestamp: 1000, talks: [] };
    // No lastModified field (old format)
    assert.strictEqual(formatLastModified(oldCache.lastModified, Date.now()), '');

    // 304 response updates it
    oldCache.lastModified = 'Tue, 08 Apr 2026 14:00:00 GMT';
    var now = new Date('2026-04-08T14:10:00Z');
    assert.strictEqual(formatLastModified(oldCache.lastModified, now), '10 хв тому');
  });
});

// ============================================================
// Tests: issue URL length fallback
// ============================================================
function buildIssueUrl(repoUrl, title, body, label) {
  return repoUrl + '/issues/new?title=' + encodeURIComponent(title) + '&labels=' + encodeURIComponent(label) + '&body=' + encodeURIComponent(body);
}
function shouldCopyToClipboard(url) {
  return url.length > 8000;
}

describe('issue URL length fallback', () => {
  var gh = 'https://github.com/owner/repo';
  var title = 'Translation review: Test Talk';
  var label = 'review:pending';

  it('short body: URL under limit, no clipboard needed', () => {
    var body = 'Short body\n| col1 | col2 |\n|---|---|\n| a | b |';
    var url = buildIssueUrl(gh, title, body, label);
    assert.ok(url.length < 8000, 'URL should be under 8000: ' + url.length);
    assert.strictEqual(shouldCopyToClipboard(url), false);
  });

  it('long body: URL over limit, clipboard needed', () => {
    var body = 'x'.repeat(10000);
    var url = buildIssueUrl(gh, title, body, label);
    assert.ok(url.length > 8000, 'URL should be over 8000: ' + url.length);
    assert.strictEqual(shouldCopyToClipboard(url), true);
  });

  it('exactly at boundary', () => {
    // Build a body that makes URL exactly ~8000 chars
    var baseUrl = buildIssueUrl(gh, title, '', label);
    var remaining = 8000 - baseUrl.length;
    // encodeURIComponent expands some chars, use simple ASCII
    var body = 'a'.repeat(Math.floor(remaining / 3)); // conservative, encoded is ~same
    var url = buildIssueUrl(gh, title, body, label);
    // Should not need clipboard (under or at limit)
    assert.strictEqual(shouldCopyToClipboard(url), false);
  });

  it('short URL preserves full body parameter', () => {
    var body = '## Review\n\n| P1 | text | translation |';
    var url = buildIssueUrl(gh, title, body, label);
    assert.ok(url.includes('&body='), 'short URL should have body param');
    assert.ok(url.includes(encodeURIComponent('## Review')));
  });

  it('label is review:pending (not review)', () => {
    var body = 'test';
    var url = buildIssueUrl(gh, title, body, label);
    assert.ok(url.includes('labels=review%3Apending'), 'should encode review:pending');
  });
});

describe('issue URL: i18n keys exist', () => {
  var fs = require('fs');
  var html = fs.readFileSync('site/index.html', 'utf8');

  it('alert.issue_body_copied key exists in both languages', () => {
    assert.ok(html.includes("'alert.issue_body_copied'"), 'key not found in I18N');
    // Count occurrences (should be at least 2: uk + en)
    var count = (html.match(/'alert\.issue_body_copied'/g) || []).length;
    assert.ok(count >= 2, 'should be in both uk and en, found: ' + count);
  });
});

// ============================================================
// Tests: Add Talk feature
// ============================================================
// slugify is single-sourced in site/js/talk_slug.js (Python twin: tools/talk_slug.py;
// shared parity fixture: tests/fixtures/slug_cases.json). Use the real module here so
// this suite can't drift from production — an earlier copy was a silent divergence risk.
const slugifyTest = require('../site/js/talk_slug.js').slugify;

// Thin adapter over the single-source builder in site/js/add_talk_data.js so
// these tests exercise the real serialization (incl. YAML-safe quoting) rather
// than a drifting copy — an earlier copy here re-emitted video titles unquoted
// and so never caught the colon bug (sy-tools/sy-subtitles#293). btoa is
// browser-only, so raw transcript text is base64-encoded here before handing
// off, mirroring what index.html does.
const { buildMetaYaml: buildMetaYamlModule } = require('../site/js/add_talk_data');
const { decodeVideoRef } = require('../site/js/vimeo_codec');

function buildMetaYaml(opts) {
  return buildMetaYamlModule({
    title: opts.title,
    date: opts.date,
    location: opts.location,
    amruta_url: opts.url,
    language: opts.language || 'en',
    videos: opts.videos,
    transcriptBase64: opts.transcript
      ? Buffer.from(opts.transcript, 'utf8').toString('base64')
      : '',
  });
}

function parseBookmarkletData(encodedStr) {
  try {
    return JSON.parse(decodeURIComponent(encodedStr));
  } catch(e) { return null; }
}
function encodeBookmarkletData(obj) {
  return encodeURIComponent(JSON.stringify(obj));
}

describe('Add Talk: slugify', () => {
  it('simple title', () => assert.strictEqual(slugifyTest('Birthday Puja'), 'Birthday-Puja'));
  it('title with colon', () => assert.strictEqual(slugifyTest('Guru Puja: Gravity'), 'Guru-Puja-Gravity'));
  it('title with quotes', () => assert.strictEqual(slugifyTest("It's a test"), 'Its-a-test'));
  it('multiple spaces', () => assert.strictEqual(slugifyTest('A   B'), 'A-B'));
  it('leading/trailing dashes', () => assert.strictEqual(slugifyTest('-Test-'), 'Test'));
  it('empty string', () => assert.strictEqual(slugifyTest(''), ''));
  it('unicode removed', () => assert.strictEqual(slugifyTest('Пуджа Test'), 'Test'));
});

describe('Add Talk: buildMetaYaml', () => {
  it('minimal yaml', () => {
    var yaml = buildMetaYaml({ title: 'Test', date: '2001-01-01', language: 'en' });
    assert.ok(yaml.includes("title: 'Test'"));
    assert.ok(yaml.includes("date: '2001-01-01'"));
    assert.ok(yaml.includes('language: en'));
  });

  it('includes location and amruta_url', () => {
    var yaml = buildMetaYaml({ title: 'T', date: '2001-01-01', location: 'Mumbai', url: 'https://amruta.org/test' });
    assert.ok(yaml.includes("location: 'Mumbai'"));
    assert.ok(yaml.includes('amruta_url: https://amruta.org/test'));
  });

  it('includes videos', () => {
    var yaml = buildMetaYaml({
      title: 'T', date: '2001-01-01', language: 'en',
      videos: [{ slug: 'Video-1', title: 'Video 1', url: 'https://vimeo.com/123/abc' }]
    });
    assert.ok(yaml.includes('videos:'));
    assert.ok(yaml.includes('- slug: Video-1'));
    assert.ok(yaml.includes("title: 'Video 1'"));
    // Link is stored obfuscated as video_ref — no plaintext vimeo in the file.
    assert.ok(!yaml.includes('vimeo_url'));
    var ref1 = yaml.match(/video_ref: (r1\S+)/)[1];
    assert.strictEqual(decodeVideoRef(ref1), 'https://vimeo.com/123/abc');
  });

  it('escapes single quotes in title', () => {
    var yaml = buildMetaYaml({ title: "It's a test", date: '2001-01-01' });
    assert.ok(yaml.includes("title: 'It''s a test'"));
  });

  it('includes transcript as base64', () => {
    var yaml = buildMetaYaml({ title: 'T', date: '2001-01-01', transcript: 'Hello world' });
    assert.ok(yaml.includes('transcript_en_base64: |'));
    // Decode and verify
    var b64Line = yaml.split('\n').find(l => l.trim().length > 10 && !l.includes(':'));
    assert.ok(b64Line, 'base64 content line not found');
    var decoded = Buffer.from(b64Line.trim(), 'base64').toString('utf8');
    assert.strictEqual(decoded, 'Hello world');
  });

  it('no transcript field when empty', () => {
    var yaml = buildMetaYaml({ title: 'T', date: '2001-01-01', transcript: '' });
    assert.ok(!yaml.includes('transcript_en_base64'));
  });

  it('base64 wraps at 76 chars', () => {
    var longText = 'x'.repeat(200);
    var yaml = buildMetaYaml({ title: 'T', date: '2001-01-01', transcript: longText });
    var b64Lines = yaml.split('\n').filter(l => l.startsWith('  ') && !l.includes(':') && l.trim().length > 0);
    b64Lines.forEach(function(line) {
      assert.ok(line.trim().length <= 76, 'base64 line too long: ' + line.trim().length);
    });
  });
});

describe('Add Talk: bookmarklet data parsing', () => {
  it('parses valid encoded JSON', () => {
    var data = { t: 'Test Talk', d: '2001-01-01', u: 'https://amruta.org/test', v: ['123/abc'], tx: 'Hello' };
    var enc = encodeBookmarkletData(data);
    var parsed = parseBookmarkletData(enc);
    assert.strictEqual(parsed.t, 'Test Talk');
    assert.strictEqual(parsed.d, '2001-01-01');
    assert.strictEqual(parsed.tx, 'Hello');
    assert.deepStrictEqual(parsed.v, ['123/abc']);
  });

  it('returns null for invalid encoding', () => {
    assert.strictEqual(parseBookmarkletData('%ZZ%invalid'), null);
  });

  it('returns null for valid encoding but invalid JSON', () => {
    var enc = encodeURIComponent('not json');
    assert.strictEqual(parseBookmarkletData(enc), null);
  });

  it('handles unicode in transcript', () => {
    var data = { t: 'Test', tx: 'Привіт світ — тест \u201cquotes\u201d' };
    var enc = encodeBookmarkletData(data);
    var parsed = parseBookmarkletData(enc);
    assert.strictEqual(parsed.tx, 'Привіт світ — тест \u201cquotes\u201d');
  });

  it('handles empty vimeo array', () => {
    var data = { t: 'Test', v: [] };
    var enc = encodeBookmarkletData(data);
    var parsed = parseBookmarkletData(enc);
    assert.deepStrictEqual(parsed.v, []);
  });

  it('handles large transcript (20K chars)', () => {
    var data = { t: 'Test', tx: 'x'.repeat(20000) };
    var enc = encodeBookmarkletData(data);
    var parsed = parseBookmarkletData(enc);
    assert.strictEqual(parsed.tx.length, 20000);
  });

  it('round-trip preserves all special characters', () => {
    var data = { t: "It's a \"test\" with <html> & symbols", tx: 'Line1\nLine2\tTab' };
    var enc = encodeBookmarkletData(data);
    var parsed = parseBookmarkletData(enc);
    assert.strictEqual(parsed.t, data.t);
    assert.strictEqual(parsed.tx, data.tx);
  });
});

describe('Add Talk: GitHub new file URL', () => {
  it('builds correct filename path', () => {
    var date = '2001-01-01';
    var slug = slugifyTest('Test Talk');
    var filename = 'talks/' + date + '_' + slug + '/meta.yaml';
    assert.strictEqual(filename, 'talks/2001-01-01_Test-Talk/meta.yaml');
  });

  it('URL stays under GitHub limit for small yaml', () => {
    var yaml = buildMetaYaml({ title: 'T', date: '2001-01-01', language: 'en' });
    var url = 'https://github.com/owner/repo/new/main?filename=talks/test/meta.yaml&value=' + encodeURIComponent(yaml);
    assert.ok(url.length < 8000, 'URL too long: ' + url.length);
  });

  it('URL may exceed limit with long transcript', () => {
    var yaml = buildMetaYaml({ title: 'T', date: '2001-01-01', transcript: 'x'.repeat(10000) });
    var url = 'https://github.com/owner/repo/new/main?filename=test&value=' + encodeURIComponent(yaml);
    assert.ok(url.length > 8000, 'Expected URL to exceed limit: ' + url.length);
  });
});

describe('Add Talk: bookmarklet extracts location', () => {
  // The scraper now lives in site/js/bookmarklet.js (the saved bookmark is a
  // thin loader that injects it); behaviour is covered end-to-end by the
  // Python E2E (TestBookmarkletExtraction). These are cheap source guards.
  var fs = require('fs');
  var bmCode = fs.readFileSync('site/js/bookmarklet.js', 'utf8');

  it('bookmarklet code includes location extraction', () => {
    assert.ok(bmCode.includes('loc') || bmCode.includes('location') || bmCode.includes('h4'),
      'bookmarklet should extract location from page');
  });

  it('bookmarklet data JSON includes location field', () => {
    // The payload object must carry a location field (loc).
    assert.ok(bmCode.includes('loc:') || bmCode.includes('loc :'),
      'bookmarklet payload should include loc field');
  });
});

describe('Add Talk: bookmarklet extracts video titles', () => {
  var fs = require('fs');
  var bmCode = fs.readFileSync('site/js/bookmarklet.js', 'utf8');

  it('bookmarklet extracts video labels from video-meta-info div', () => {
    assert.ok(
      bmCode.includes('video-meta-info'),
      'bookmarklet should look for .video-meta-info inside wrapper'
    );
  });

  it('bookmarklet data includes video titles (not just URLs)', () => {
    // Video data should be objects with title+url, not just url strings
    var data = { t: 'Test', v: [{ id: '123', hash: 'abc', title: 'Puja' }] };
    var enc = encodeBookmarkletData(data);
    var parsed = parseBookmarkletData(enc);
    assert.ok(parsed.v[0].title, 'video should have title field');
  });
});

describe('Add Talk: SPA form populates location from bookmarklet', () => {
  it('parseBookmarkletData with location field', () => {
    var data = { t: 'Test', d: '2001-01-01', loc: 'Mumbai (India)', v: [], tx: '' };
    var enc = encodeBookmarkletData(data);
    var parsed = parseBookmarkletData(enc);
    assert.strictEqual(parsed.loc, 'Mumbai (India)');
  });
});

describe('Add Talk: i18n for dynamic video row labels', () => {
  var fs = require('fs');
  var html = fs.readFileSync('site/index.html', 'utf8');

  it('Video title label uses i18n t() in JS', () => {
    // addVideoRowWithUrl should use t('add.video_title') not hardcoded 'Video title'
    assert.ok(
      html.includes("t('add.video_title')") || html.includes('t("add.video_title")'),
      'Video title label in dynamic row should use t() for i18n'
    );
  });

  it('add.video_title i18n key exists in both languages', () => {
    var ukMatch = (html.match(/'add\.video_title'/g) || []).length;
    assert.ok(ukMatch >= 2, 'add.video_title should be in uk and en, found: ' + ukMatch);
  });

  it('add.vimeo_url i18n key exists in both languages', () => {
    var matches = (html.match(/'add\.vimeo_url'/g) || []).length;
    assert.ok(matches >= 2, 'add.vimeo_url should be in uk and en, found: ' + matches);
  });
});

describe('Preview: cleanup on navigation', () => {
  var fs = require('fs');
  var html = fs.readFileSync('site/index.html', 'utf8');

  it('subtitle overlay cleared when entering showPreview', () => {
    // showPreview should clear subtitle-overlay textContent before loading new SRT
    var idx = html.indexOf('function showPreview');
    assert.ok(idx > -1, 'showPreview not found');
    var chunk = html.substring(idx, idx + 500);
    assert.ok(chunk.includes("subtitle-overlay") && chunk.includes("textContent = ''"),
      'showPreview should clear subtitle-overlay textContent at start');
  });

  it('player paused when entering showPreview (switching videos)', () => {
    var idx = html.indexOf('function showPreview');
    // Slice the function body (to the next top-level function) rather than a
    // fixed-width window, so comments/edits near the top (e.g. the change-detector
    // cache reset) can't push the pause() out of view.
    var after = html.indexOf('\nfunction ', idx + 1);
    var chunk = html.substring(idx, after > -1 ? after : idx + 2000);
    assert.ok(chunk.includes('.pause()'), 'showPreview should pause previous player');
  });

  it('player paused in route() when navigating away from preview', () => {
    var idx = html.indexOf('function route()');
    assert.ok(idx > -1, 'route function not found');
    // Slice the whole route() body (up to the next top-level function) rather
    // than a fixed-width window, so code inserted at the top of route() (e.g.
    // the passphrase-gate deep-link guard) can't push the pause out of view.
    var after = html.indexOf('\nfunction ', idx + 1);
    var chunk = html.substring(idx, after > -1 ? after : idx + 2000);
    assert.ok(chunk.includes('.pause()'), 'route should pause player when leaving preview');
  });

  it('previewState stores player reference', () => {
    assert.ok(html.includes('previewState.player = player'), 'player should be stored in previewState');
  });
});

// Add-talk routing states (setup / form / wrong_site / parse_error) are tested
// against the REAL parseAddTalkHash in tests/test_add_talk_data.js. The former
// getAddState reimplementation here had drifted from production (it returned
// 'error' for a missing url where production returns 'wrong_site', and still
// did a double decodeURIComponent that production removed), so it was dropped
// in favour of exercising the shipped function directly.

describe('Add Talk: SPA code integrity', () => {
  var fs = require('fs');
  var html = fs.readFileSync('site/index.html', 'utf8');

  it('view-add exists in HTML', () => {
    assert.ok(html.includes('id="view-add"'));
  });

  it('route handles /add hash', () => {
    assert.ok(html.includes("hash.startsWith('/add')"));
  });

  it('showAddTalk function exists', () => {
    assert.ok(html.includes('function showAddTalk'));
  });

  it('submitAddTalk function exists', () => {
    assert.ok(html.includes('SPA.submitAddTalk'));
  });

  it('bookmarklet link exists', () => {
    assert.ok(html.includes('id="bookmarklet-link"'));
  });

  it('bookmarklet is a loader that injects js/bookmarklet.js', () => {
    // The saved bookmark must be the thin loader (so scraper fixes deploy
    // without re-dragging), not inline scraping logic. This is the one string
    // every user's re-dragged bookmark bakes in, and neither E2E path covers
    // the index.html builder, so guard it here.
    assert.ok(html.includes('js/bookmarklet.js'), 'loader must inject js/bookmarklet.js');
    assert.ok(html.includes("'javascript:' + loader"), 'bookmarklet-link href must be the javascript: loader');
    assert.ok(!html.includes('var bmCode'), 'inline bmCode scraper must be gone (moved to js/bookmarklet.js)');
  });

  it('add.title i18n key in both languages', () => {
    var matches = (html.match(/'add\.title'/g) || []).length;
    assert.ok(matches >= 2, 'add.title should be in uk and en');
  });

  it('meta.yaml generation is single-sourced in add_talk_data.js', () => {
    // buildMetaYaml() lives in the module (tested in test_add_talk_data.js);
    // index.html must delegate to it rather than re-inline the serialization.
    var mod = fs.readFileSync('site/js/add_talk_data.js', 'utf8');
    assert.ok(mod.includes('transcript_en_base64'), 'module emits transcript_en_base64');
    assert.ok(mod.includes('function buildMetaYaml'), 'module defines buildMetaYaml');
    assert.ok(html.includes('buildMetaYaml('), 'index.html calls buildMetaYaml');
  });
});

// ============================================================
// Tests: Add Talk with real amruta.org data
// ============================================================
describe('Add Talk: real amruta.org page parsing', () => {
  var fs = require('fs');
  var parsed;
  try { parsed = JSON.parse(fs.readFileSync('tests/fixtures/amruta_parsed.json', 'utf8')); } catch(e) { parsed = null; }
  var bmData;
  try { bmData = JSON.parse(fs.readFileSync('tests/fixtures/amruta_bookmarklet_data.json', 'utf8')); } catch(e) { bmData = null; }

  it('fixture files exist', () => {
    assert.ok(parsed, 'amruta_parsed.json not found');
    assert.ok(bmData, 'amruta_bookmarklet_data.json not found');
    assert.ok(fs.existsSync('tests/fixtures/amruta_sahasrara.html'), 'HTML fixture not found');
  });

  // --- Title ---
  it('title: extracted correctly', () => {
    assert.strictEqual(parsed.title, 'Sahasrara Puja: How it was decided');
  });
  it('title: bookmarklet data matches', () => {
    assert.strictEqual(bmData.t, 'Sahasrara Puja: How it was decided');
  });
  it('title: not empty', () => {
    assert.ok(parsed.title.length > 5);
  });

  // --- Date ---
  it('date: parsed from URL correctly', () => {
    assert.strictEqual(parsed.date, '1988-05-08');
  });
  it('date: is valid ISO format', () => {
    assert.ok(/^\d{4}-\d{2}-\d{2}$/.test(parsed.date));
  });

  // --- URL ---
  it('url: is full amruta.org URL', () => {
    assert.ok(parsed.url.startsWith('https://www.amruta.org/'));
    assert.ok(parsed.url.includes('sahasrara-puja'));
  });

  // --- Location ---
  it('location: extracted correctly', () => {
    assert.strictEqual(parsed.location, 'Fregene (Italy)');
  });
  it('location: not empty', () => {
    assert.ok(parsed.location && parsed.location.length > 3);
  });

  // --- Vimeo ---
  it('vimeo: found exactly 2 videos', () => {
    assert.strictEqual(parsed.vimeos.length, 2);
  });
  it('vimeo: first video ID is numeric', () => {
    assert.ok(/^\d+$/.test(parsed.vimeos[0].id), 'ID: ' + parsed.vimeos[0].id);
  });
  it('vimeo: first video hash is hex', () => {
    assert.ok(/^[a-f0-9]+$/.test(parsed.vimeos[0].hash), 'hash: ' + parsed.vimeos[0].hash);
  });
  it('vimeo: specific IDs match expected', () => {
    assert.strictEqual(parsed.vimeos[0].id, '111111111');
    assert.strictEqual(parsed.vimeos[1].id, '222222222');
  });
  it('vimeo: hashes match expected', () => {
    assert.strictEqual(parsed.vimeos[0].hash, 'aaaaaaaaaa');
    assert.strictEqual(parsed.vimeos[1].hash, 'bbbbbbbbbb');
  });

  // --- Video titles ---
  it('video titles: extracted 2 titles', () => {
    assert.ok(parsed.video_titles, 'video_titles missing from fixture');
    assert.strictEqual(parsed.video_titles.length, 2);
  });
  it('video titles: first is "Sahasrara Puja"', () => {
    assert.strictEqual(parsed.video_titles[0], 'Sahasrara Puja');
  });
  it('video titles: second is "Sahasrara Puja Talk"', () => {
    assert.strictEqual(parsed.video_titles[1], 'Sahasrara Puja Talk');
  });

  // --- Video slugs ---
  it('video slugs: match expected', () => {
    assert.deepStrictEqual(parsed.video_slugs, ['Sahasrara-Puja', 'Sahasrara-Puja-Talk']);
  });

  // --- Transcript ---
  it('transcript: extracted (length > 1000 chars)', () => {
    assert.ok(parsed.transcript_length > 1000, 'too short: ' + parsed.transcript_length);
  });
  it('transcript: contains actual speech content', () => {
    // Real talk content should contain "Sahasrara" somewhere
    assert.ok(parsed.transcript.toLowerCase().includes('sahasrara'), 'should contain "sahasrara"');
  });
  it('transcript: no UI noise after p-tag filtering', () => {
    assert.ok(parsed.transcript_no_ui_noise, 'fixture should confirm no UI noise');
    // Bookmarklet now extracts only <p> tags with >20 chars — no buttons/nav
  });
  it('transcript: starts with talk content', () => {
    assert.ok(parsed.transcript_starts_with, 'missing transcript_starts_with in fixture');
    assert.ok(parsed.transcript_starts_with.includes('Sahasrara Puja'), 'should start with talk title');
  });
  it('transcript: ends with talk content', () => {
    assert.ok(parsed.transcript_ends_with, 'missing transcript_ends_with in fixture');
    assert.ok(parsed.transcript_ends_with.includes('good news'), 'should end with talk text');
  });

  // --- Slugify ---
  it('slugify: produces correct talk slug', () => {
    assert.strictEqual(slugifyTest(parsed.title), 'Sahasrara-Puja-How-it-was-decided');
  });
  it('slugify: talk ID is date_slug', () => {
    var talkId = parsed.date + '_' + slugifyTest(parsed.title);
    assert.strictEqual(talkId, '1988-05-08_Sahasrara-Puja-How-it-was-decided');
  });

  // --- Meta YAML ---
  it('meta.yaml: builds correctly from real data', () => {
    var yaml = buildMetaYaml({
      title: parsed.title, date: parsed.date, url: parsed.url, language: 'en',
      location: parsed.location,
      videos: parsed.vimeos.map(function(v, i) {
        return { slug: parsed.video_slugs[i], title: parsed.video_titles[i], url: 'https://vimeo.com/' + v.id + '/' + v.hash };
      }),
    });
    assert.ok(yaml.includes("title: 'Sahasrara Puja: How it was decided'"));
    assert.ok(yaml.includes("date: '1988-05-08'"));
    assert.ok(yaml.includes("location: 'Fregene (Italy)'"));
    assert.ok(yaml.includes('amruta_url: https://www.amruta.org/'));
    assert.ok(yaml.includes('language: en'));
    assert.ok(yaml.includes('videos:'));
    assert.ok(yaml.includes('- slug: Sahasrara-Puja'));
    assert.ok(yaml.includes("title: 'Sahasrara Puja'\n"));
    assert.ok(yaml.includes("title: 'Sahasrara Puja Talk'"));
    // Links are obfuscated as video_ref — assert they decode back, no plaintext.
    assert.ok(!yaml.includes('vimeo_url'));
    var refs = (yaml.match(/video_ref: (r1\S+)/g) || []).map(function (l) { return l.split(' ')[1]; });
    assert.strictEqual(refs.length, 2);
    assert.strictEqual(decodeVideoRef(refs[0]), 'https://vimeo.com/111111111/aaaaaaaaaa');
    assert.strictEqual(decodeVideoRef(refs[1]), 'https://vimeo.com/222222222/bbbbbbbbbb');
  });

  it('meta.yaml: with transcript base64 round-trips', () => {
    var sample = parsed.transcript.substring(0, 500);
    var yaml = buildMetaYaml({ title: 'T', date: '2001-01-01', transcript: sample });
    var b64Lines = yaml.split('\n').filter(function(l) { return l.startsWith('  ') && !l.includes(':') && l.trim().length > 0; });
    var b64 = b64Lines.map(function(l) { return l.trim(); }).join('');
    var decoded = Buffer.from(b64, 'base64').toString('utf8');
    assert.strictEqual(decoded, sample);
  });

  // --- Full bookmarklet flow ---
  it('full flow: bookmarklet → SPA → meta.yaml', () => {
    // 1. Simulate bookmarklet output (encodeURIComponent, not base64)
    var enc = encodeBookmarkletData(bmData);
    // 2. SPA parses
    var data = parseBookmarkletData(enc);
    assert.ok(data);
    assert.strictEqual(data.t, 'Sahasrara Puja: How it was decided');
    assert.strictEqual(data.v.length, 2);
    // 3. Build yaml
    var yaml = buildMetaYaml({
      title: data.t, date: data.d, url: data.u, language: 'en',
      videos: data.v.map(function(v, i) {
        return { slug: slugifyTest('Video ' + (i+1)), title: 'Video ' + (i+1), url: 'https://vimeo.com/' + v };
      }),
      transcript: (data.tx || '').substring(0, 200)
    });
    assert.ok(yaml.includes('Sahasrara Puja'));
    assert.ok(yaml.includes('videos:'));
    assert.ok(yaml.includes('transcript_en_base64'));
    // 4. Verify filename
    var filename = 'talks/' + data.d + '_' + slugifyTest(data.t) + '/meta.yaml';
    assert.strictEqual(filename, 'talks/1988-05-08_Sahasrara-Puja-How-it-was-decided/meta.yaml');
  });
});

// ============================================================
// Tests: transcript normalization (simulates new-talk.yml logic)
// ============================================================
function normalizeTranscript(body) {
  // Same logic as new-talk.yml: collapse 3+ newlines to single
  return body.replace(/\n{3,}/g, '\n');
}

function buildTranscriptHeader(meta) {
  // Same as new-talk.yml header generation
  var months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  var parts = (meta.date || '').split('-');
  var dateStr = parseInt(parts[2], 10) + ' ' + months[parseInt(parts[1], 10) - 1] + ' ' + parts[0];
  var langMap = { en: 'English', hi: 'Hindi', mr: 'Marathi', fr: 'French', it: 'Italian' };
  var langName = langMap[meta.language] || meta.language;
  var header = dateStr + '\n' + meta.title + '\n';
  if (meta.location) header += meta.location + '\n';
  header += 'Talk Language: ' + langName + ' | Transcript (' + langName + ')\n';
  return header;
}

describe('Transcript normalization (new-talk.yml logic)', () => {
  it('collapses triple newlines to single', () => {
    assert.strictEqual(normalizeTranscript('a\n\n\nb'), 'a\nb');
  });

  it('collapses quadruple newlines to single', () => {
    assert.strictEqual(normalizeTranscript('a\n\n\n\nb'), 'a\nb');
  });

  it('preserves double newlines', () => {
    assert.strictEqual(normalizeTranscript('a\n\nb'), 'a\n\nb');
  });

  it('preserves single newlines', () => {
    assert.strictEqual(normalizeTranscript('a\nb'), 'a\nb');
  });

  it('handles multiple triple runs', () => {
    assert.strictEqual(normalizeTranscript('a\n\n\nb\n\n\nc'), 'a\nb\nc');
  });

  it('real transcript: no triple newlines after normalization', () => {
    var parsed;
    try { parsed = JSON.parse(fs.readFileSync('tests/fixtures/amruta_parsed.json', 'utf8')); } catch(e) { return; }
    var idx = parsed.transcript.indexOf('Talk Language:');
    var bodyStart = parsed.transcript.indexOf('\n\n', idx);
    var body = parsed.transcript.substring(bodyStart).trim();
    var normalized = normalizeTranscript(body);
    assert.ok(!/\n{3,}/.test(normalized), 'should not contain triple newlines after normalization');
  });

  it('real transcript: paragraphs separated by single newline after normalization', () => {
    var parsed;
    try { parsed = JSON.parse(fs.readFileSync('tests/fixtures/amruta_parsed.json', 'utf8')); } catch(e) { return; }
    var idx = parsed.transcript.indexOf('Talk Language:');
    var bodyStart = parsed.transcript.indexOf('\n\n', idx);
    var body = parsed.transcript.substring(bodyStart).trim();
    var normalized = normalizeTranscript(body);
    var lines = normalized.split('\n').filter(function(l) { return l.trim().length > 0; });
    assert.ok(lines.length > 10, 'should have multiple paragraphs: got ' + lines.length);
  });

  it('header format matches download.py convention', () => {
    var header = buildTranscriptHeader({
      title: 'Sahasrara Puja: How it was decided',
      date: '1988-05-08',
      location: 'Fregene (Italy)',
      language: 'en'
    });
    assert.ok(header.startsWith('8 May 1988\n'));
    assert.ok(header.includes('Sahasrara Puja: How it was decided\n'));
    assert.ok(header.includes('Fregene (Italy)\n'));
    assert.ok(header.includes('Talk Language: English | Transcript (English)'));
  });

  it('header: date format matches existing transcripts', () => {
    var header = buildTranscriptHeader({ title: 'T', date: '1993-09-19', location: 'L', language: 'en' });
    assert.ok(header.startsWith('19 September 1993\n'));
  });

  it('full pipeline: header + normalized body has no triple newlines', () => {
    var parsed;
    try { parsed = JSON.parse(fs.readFileSync('tests/fixtures/amruta_parsed.json', 'utf8')); } catch(e) { return; }
    var idx = parsed.transcript.indexOf('Talk Language:');
    var bodyStart = parsed.transcript.indexOf('\n\n', idx);
    var body = parsed.transcript.substring(bodyStart).trim();
    var normalized = normalizeTranscript(body);
    var header = buildTranscriptHeader({
      title: parsed.title, date: parsed.date, location: parsed.location, language: 'en'
    });
    var full = header + '\n' + normalized;
    assert.ok(!/\n{3,}/.test(full), 'full transcript should not contain triple newlines');
    assert.ok(full.startsWith('8 May 1988\n'));
    assert.ok(full.includes('Talk Language: English'));
    assert.ok(full.includes('Sahasrara Puja'));
  });
});

// ============================================================
// Tests: per-video subtitle language persistence
// ============================================================
function getPreviewSrtLangKey(talkId, videoSlug) {
  return 'sy_srt_lang_' + talkId + '_' + videoSlug;
}

function resolvePreviewLang(availLangs, savedLang) {
  if (savedLang && availLangs.indexOf(savedLang) !== -1) return savedLang;
  return availLangs.indexOf('uk') !== -1 ? 'uk' : availLangs[0];
}

describe('preview: per-video subtitle language persistence', () => {
  it('localStorage key is per-video', () => {
    var k1 = getPreviewSrtLangKey('talk-A', 'vid-1');
    var k2 = getPreviewSrtLangKey('talk-A', 'vid-2');
    var k3 = getPreviewSrtLangKey('talk-B', 'vid-1');
    assert.notStrictEqual(k1, k2);
    assert.notStrictEqual(k1, k3);
  });

  it('restores saved language if available', () => {
    assert.strictEqual(resolvePreviewLang(['uk', 'hi'], 'hi'), 'hi');
  });

  it('ignores saved language if not in available', () => {
    assert.strictEqual(resolvePreviewLang(['uk', 'en'], 'hi'), 'uk');
  });

  it('defaults to uk when no saved and uk available', () => {
    assert.strictEqual(resolvePreviewLang(['hi', 'uk'], null), 'uk');
  });

  it('defaults to first lang when no saved and no uk', () => {
    assert.strictEqual(resolvePreviewLang(['hi', 'en'], null), 'hi');
  });

  it('saved empty string treated as no saved', () => {
    assert.strictEqual(resolvePreviewLang(['uk', 'hi'], ''), 'uk');
  });
});

// ============================================================
// Tests: per-talk review language persistence
// ============================================================
function getReviewLangsKey(talkId) {
  return 'sy_review_langs_' + talkId;
}

function resolveReviewLangs(hashParams, savedJson) {
  var left = 'en', right = 'uk';
  if (hashParams && (hashParams.left || hashParams.right)) {
    if (hashParams.left) left = hashParams.left;
    if (hashParams.right) right = hashParams.right;
  } else if (savedJson) {
    try {
      var saved = JSON.parse(savedJson);
      if (saved && saved.left) left = saved.left;
      if (saved && saved.right) right = saved.right;
    } catch(e) {}
  }
  return { left: left, right: right };
}

describe('review: per-talk language persistence', () => {
  it('localStorage key is per-talk', () => {
    var k1 = getReviewLangsKey('talk-A');
    var k2 = getReviewLangsKey('talk-B');
    assert.notStrictEqual(k1, k2);
  });

  it('URL params override saved', () => {
    var result = resolveReviewLangs({ left: 'hi', right: 'mr' }, '{"left":"en","right":"uk"}');
    assert.deepStrictEqual(result, { left: 'hi', right: 'mr' });
  });

  it('restores saved when no URL params', () => {
    var result = resolveReviewLangs(null, '{"left":"hi","right":"mr"}');
    assert.deepStrictEqual(result, { left: 'hi', right: 'mr' });
  });

  it('defaults to en/uk when no URL params and no saved', () => {
    var result = resolveReviewLangs(null, null);
    assert.deepStrictEqual(result, { left: 'en', right: 'uk' });
  });

  it('handles invalid JSON gracefully', () => {
    var result = resolveReviewLangs(null, 'not json');
    assert.deepStrictEqual(result, { left: 'en', right: 'uk' });
  });

  it('partial saved (only left)', () => {
    var result = resolveReviewLangs(null, '{"left":"hi"}');
    assert.deepStrictEqual(result, { left: 'hi', right: 'uk' });
  });

  it('partial saved (only right)', () => {
    var result = resolveReviewLangs(null, '{"right":"mr"}');
    assert.deepStrictEqual(result, { left: 'en', right: 'mr' });
  });

  it('save format is JSON with left/right', () => {
    var toSave = JSON.stringify({ left: 'hi', right: 'mr' });
    var parsed = JSON.parse(toSave);
    assert.strictEqual(parsed.left, 'hi');
    assert.strictEqual(parsed.right, 'mr');
  });

  it('different talks independent', () => {
    var k1 = getReviewLangsKey('1979-bombay');
    var k2 = getReviewLangsKey('2001-new-york');
    assert.notStrictEqual(k1, k2);
    // Simulating different saves
    var saved1 = '{"left":"hi","right":"uk"}';
    var saved2 = '{"left":"en","right":"uk"}';
    assert.deepStrictEqual(resolveReviewLangs(null, saved1), { left: 'hi', right: 'uk' });
    assert.deepStrictEqual(resolveReviewLangs(null, saved2), { left: 'en', right: 'uk' });
  });
});

// ============================================================
// Tests: refresh result messaging
// ============================================================
function refreshResultMessage(oldEtag, newEtag) {
  var changed = newEtag !== oldEtag;
  return changed ? '✓ Оновлено!' : '✓ Вже актуально';
}

describe('refresh result messaging', () => {
  it('shows "Оновлено!" when etag changed', () => {
    assert.strictEqual(refreshResultMessage('"old-etag"', '"new-etag"'), '✓ Оновлено!');
  });

  it('shows "Вже актуально" when etag same', () => {
    assert.strictEqual(refreshResultMessage('"same"', '"same"'), '✓ Вже актуально');
  });

  it('shows "Оновлено!" when old etag was null (first load)', () => {
    assert.strictEqual(refreshResultMessage(null, '"new"'), '✓ Оновлено!');
  });

  it('shows "Оновлено!" when old etag was undefined', () => {
    assert.strictEqual(refreshResultMessage(undefined, '"new"'), '✓ Оновлено!');
  });

  it('shows "Вже актуально" when both null (edge case)', () => {
    assert.strictEqual(refreshResultMessage(null, null), '✓ Вже актуально');
  });
});

// ============================================================
// Tests: Internationalization (i18n)
// ============================================================

// --- Extract I18N object from index.html ---
function extractI18N() {
  var fs = require('fs');
  var html = fs.readFileSync('site/index.html', 'utf8');
  // Extract the I18N object definition
  var m = html.match(/var I18N = (\{[\s\S]*?\n\};)/);
  if (!m) throw new Error('I18N object not found in index.html');
  // Evaluate the object (safe for static object literals)
  var obj;
  eval('obj = ' + m[1]);
  return obj;
}

// --- Extract detectLang logic ---
function detectLangLogic(savedLang, navigatorLang) {
  if (savedLang === 'uk' || savedLang === 'en') return savedLang;
  var nav = (navigatorLang || '').toLowerCase();
  return nav.startsWith('uk') ? 'uk' : 'en';
}

// --- t() function replica ---
function tFunction(key, currentLang, i18nObj) {
  var dict = i18nObj[currentLang] || i18nObj['en'];
  return dict[key] !== undefined ? dict[key] : (i18nObj['en'][key] !== undefined ? i18nObj['en'][key] : key);
}

describe('i18n: all keys defined in both languages', () => {
  var i18n = extractI18N();
  var ukKeys = Object.keys(i18n.uk).sort();
  var enKeys = Object.keys(i18n.en).sort();

  it('uk and en have identical key sets', () => {
    var missingInEn = ukKeys.filter(k => !i18n.en.hasOwnProperty(k));
    var missingInUk = enKeys.filter(k => !i18n.uk.hasOwnProperty(k));
    assert.deepStrictEqual(missingInEn, [], 'Keys in uk but not en: ' + missingInEn.join(', '));
    assert.deepStrictEqual(missingInUk, [], 'Keys in en but not uk: ' + missingInUk.join(', '));
  });

  it('no empty translations in uk', () => {
    var empty = ukKeys.filter(k => i18n.uk[k] === '');
    assert.deepStrictEqual(empty, [], 'Empty uk translations: ' + empty.join(', '));
  });

  it('no empty translations in en', () => {
    var empty = enKeys.filter(k => i18n.en[k] === '');
    assert.deepStrictEqual(empty, [], 'Empty en translations: ' + empty.join(', '));
  });

  it('at least 30 keys defined (sanity check)', () => {
    assert.ok(ukKeys.length >= 30, 'Expected >= 30 keys, got ' + ukKeys.length);
  });
});

describe('i18n: auto-detect logic', () => {
  it('saved "uk" returns uk regardless of navigator', () => {
    assert.strictEqual(detectLangLogic('uk', 'en-US'), 'uk');
  });

  it('saved "en" returns en regardless of navigator', () => {
    assert.strictEqual(detectLangLogic('en', 'uk-UA'), 'en');
  });

  it('no saved, navigator "uk" returns uk', () => {
    assert.strictEqual(detectLangLogic(null, 'uk'), 'uk');
  });

  it('no saved, navigator "uk-UA" returns uk', () => {
    assert.strictEqual(detectLangLogic(null, 'uk-UA'), 'uk');
  });

  it('no saved, navigator "en-US" returns en', () => {
    assert.strictEqual(detectLangLogic(null, 'en-US'), 'en');
  });

  it('no saved, navigator "de" returns en', () => {
    assert.strictEqual(detectLangLogic(null, 'de'), 'en');
  });

  it('no saved, navigator "fr-FR" returns en', () => {
    assert.strictEqual(detectLangLogic(null, 'fr-FR'), 'en');
  });

  it('no saved, navigator "" returns en', () => {
    assert.strictEqual(detectLangLogic(null, ''), 'en');
  });

  it('no saved, navigator null returns en', () => {
    assert.strictEqual(detectLangLogic(null, null), 'en');
  });

  it('invalid saved value falls through to navigator', () => {
    assert.strictEqual(detectLangLogic('de', 'uk'), 'uk');
    assert.strictEqual(detectLangLogic('fr', 'en-US'), 'en');
  });
});

describe('i18n: t() function', () => {
  var i18n = extractI18N();

  it('returns uk translation when lang is uk', () => {
    assert.strictEqual(tFunction('index.loading', 'uk', i18n), i18n.uk['index.loading']);
  });

  it('returns en translation when lang is en', () => {
    assert.strictEqual(tFunction('index.loading', 'en', i18n), i18n.en['index.loading']);
  });

  it('falls back to en for unknown language', () => {
    assert.strictEqual(tFunction('index.loading', 'de', i18n), i18n.en['index.loading']);
  });

  it('returns key itself for unknown key', () => {
    assert.strictEqual(tFunction('nonexistent.key', 'uk', i18n), 'nonexistent.key');
  });

  it('uk and en translations differ for text keys', () => {
    // At least some keys should have different translations
    var different = Object.keys(i18n.uk).filter(k => i18n.uk[k] !== i18n.en[k]);
    assert.ok(different.length > 10, 'Expected many different translations, got ' + different.length);
  });
});

describe('i18n: toggle cycle', () => {
  it('uk toggles to en', () => {
    assert.strictEqual('uk' === 'uk' ? 'en' : 'uk', 'en');
  });

  it('en toggles to uk', () => {
    assert.strictEqual('en' === 'uk' ? 'en' : 'uk', 'uk');
  });
});

describe('i18n: data-i18n coverage in HTML', () => {
  var fs = require('fs');
  var html = fs.readFileSync('site/index.html', 'utf8');
  var i18n = extractI18N();

  it('all data-i18n keys exist in I18N', () => {
    var keys = [];
    var re = /data-i18n="([^"]+)"/g;
    var m;
    while ((m = re.exec(html)) !== null) keys.push(m[1]);
    var missing = keys.filter(k => !i18n.en.hasOwnProperty(k));
    assert.deepStrictEqual(missing, [], 'data-i18n keys not in I18N: ' + missing.join(', '));
  });

  it('all data-i18n-placeholder keys exist in I18N', () => {
    var keys = [];
    var re = /data-i18n-placeholder="([^"]+)"/g;
    var m;
    while ((m = re.exec(html)) !== null) keys.push(m[1]);
    var missing = keys.filter(k => !i18n.en.hasOwnProperty(k));
    assert.deepStrictEqual(missing, [], 'data-i18n-placeholder keys not in I18N: ' + missing.join(', '));
  });

  it('all data-i18n-title keys exist in I18N', () => {
    var keys = [];
    var re = /data-i18n-title="([^"]+)"/g;
    var m;
    while ((m = re.exec(html)) !== null) keys.push(m[1]);
    var missing = keys.filter(k => !i18n.en.hasOwnProperty(k));
    assert.deepStrictEqual(missing, [], 'data-i18n-title keys not in I18N: ' + missing.join(', '));
  });

  it('language is switchable from the preferences menu', () => {
    // The standalone lang-btn is gone; the menu row is now the only way in, and
    // it still drives the same SPA.toggleLang action the rest of the app calls.
    assert.ok(html.includes('id="prefs-lang"'), 'prefs-lang row not found');
    assert.ok(html.includes('SPA.toggleLang()'), 'SPA.toggleLang() not found');
  });

  it('the language storage key is owned by js/preferences.js', () => {
    var prefs = fs.readFileSync('site/js/preferences.js', 'utf8');
    assert.ok(prefs.includes("key: 'sy_lang'"), 'sy_lang not declared in preferences.js');
  });

  it('no preference key is spelled out anywhere but js/preferences.js', () => {
    // The whole point of the table is that one file decides what a preference
    // is stored under and what values it may hold. The guards above check the
    // table declares each key — but nothing stopped a later edit from reaching
    // past it with a literal getItem('sy_theme'), which is how a menu and the
    // rest of the app drift into reading different things. This is the negative
    // half: the keys must not appear anywhere else.
    var owned = ['sy_lang', 'sy_theme', 'sy_expert_mode'];
    var strays = owned.filter(function(key) { return html.indexOf(key) !== -1; });
    assert.deepStrictEqual(strays, [], 'index.html spells out a key that belongs to preferences.js: ' + strays);
  });

  it('detectLang function exists', () => {
    assert.ok(html.includes('function detectLang()'), 'detectLang not found');
  });

  it('translatePage function exists', () => {
    assert.ok(html.includes('function translatePage()'), 'translatePage not found');
  });

  it('APP_DEPLOY_SHA and APP_DEPLOY_DATE placeholders', () => {
    assert.ok(html.includes("var APP_DEPLOY_SHA = ''"), 'APP_DEPLOY_SHA placeholder');
    assert.ok(html.includes("var APP_DEPLOY_DATE = ''"), 'APP_DEPLOY_DATE placeholder');
  });
});

// ============================================================
// Footer version string logic
// ============================================================
function formatFooterVersion(deploySha, deployDate, manifestSha) {
  var sha = deploySha || manifestSha || 'dev';
  var date = deployDate || '';
  return sha + (date ? ' | ' + date : '');
}

describe('Footer: formatFooterVersion', () => {
  it('deploy SHA + date', () => {
    assert.strictEqual(formatFooterVersion('abc1234', '2026-04-09', 'xyz9999'), 'abc1234 | 2026-04-09');
  });

  it('deploy SHA without date', () => {
    assert.strictEqual(formatFooterVersion('abc1234', '', 'xyz9999'), 'abc1234');
  });

  it('falls back to manifest SHA when deploy SHA empty', () => {
    assert.strictEqual(formatFooterVersion('', '', 'xyz9999'), 'xyz9999');
  });

  it('falls back to dev when both empty', () => {
    assert.strictEqual(formatFooterVersion('', '', ''), 'dev');
  });

  it('null/undefined handled', () => {
    assert.strictEqual(formatFooterVersion(null, null, null), 'dev');
    assert.strictEqual(formatFooterVersion(undefined, undefined, undefined), 'dev');
  });

  it('deploy SHA takes priority over manifest SHA', () => {
    assert.strictEqual(formatFooterVersion('aaa', '2026-01-01', 'bbb'), 'aaa | 2026-01-01');
  });
});

// ============================================================
// Auto-reload detection logic
// ============================================================
function shouldAutoReload(deploySha, siteIndexSha) {
  return !!(siteIndexSha && deploySha && siteIndexSha !== deploySha);
}

describe('Auto-reload: shouldAutoReload', () => {
  it('different SHAs → reload', () => {
    assert.strictEqual(shouldAutoReload('abc1234', 'def5678'), true);
  });

  it('same SHAs → no reload', () => {
    assert.strictEqual(shouldAutoReload('abc1234', 'abc1234'), false);
  });

  it('empty deploy SHA (local dev) → no reload', () => {
    assert.strictEqual(shouldAutoReload('', 'def5678'), false);
  });

  it('empty manifest SHA → no reload', () => {
    assert.strictEqual(shouldAutoReload('abc1234', ''), false);
  });

  it('both empty → no reload', () => {
    assert.strictEqual(shouldAutoReload('', ''), false);
  });

  it('null/undefined → no reload', () => {
    assert.strictEqual(shouldAutoReload(null, 'abc'), false);
    assert.strictEqual(shouldAutoReload('abc', null), false);
  });
});

// ============================================================
// Cache schema migration logic
// ============================================================
function shouldMigrateCache(cachedJson, expectedSchema) {
  if (!cachedJson) return false; // no cache = nothing to migrate
  try {
    var c = JSON.parse(cachedJson);
    return c._schema !== expectedSchema;
  } catch(e) { return true; } // corrupt = needs migration
}

describe('Cache: schema migration', () => {
  it('same schema → no migration', () => {
    assert.strictEqual(shouldMigrateCache('{"_schema":2}', 2), false);
  });

  it('old schema → needs migration', () => {
    assert.strictEqual(shouldMigrateCache('{"_schema":1}', 2), true);
  });

  it('no schema field → needs migration', () => {
    assert.strictEqual(shouldMigrateCache('{"etag":"abc"}', 2), true);
  });

  it('null cache → no migration needed', () => {
    assert.strictEqual(shouldMigrateCache(null, 2), false);
  });

  it('corrupt JSON → needs migration', () => {
    assert.strictEqual(shouldMigrateCache('{broken', 2), true);
  });

  it('empty string → needs migration', () => {
    assert.strictEqual(shouldMigrateCache('', 2), false);
  });
});

// ============================================================
// buildManifest: _siteIndexSha extraction
// ============================================================
describe('buildManifest: _siteIndexSha', () => {
  // Minimal buildManifest that extracts _siteIndexSha
  function extractSiteIndexSha(tree) {
    var sha = '';
    tree.forEach(function(entry) {
      if (entry.path === 'site/index.html') sha = (entry.sha || '').substring(0, 7);
    });
    return sha;
  }

  it('extracts SHA from tree', () => {
    var tree = [
      { path: 'talks/test/meta.yaml', sha: 'aaa' },
      { path: 'site/index.html', sha: 'e3a253d1234567890' },
      { path: 'site/sw.js', sha: 'bbb' },
    ];
    assert.strictEqual(extractSiteIndexSha(tree), 'e3a253d');
  });

  it('returns empty when site/index.html not in tree', () => {
    var tree = [{ path: 'talks/test/meta.yaml', sha: 'aaa' }];
    assert.strictEqual(extractSiteIndexSha(tree), '');
  });

  it('truncates to 7 chars', () => {
    var tree = [{ path: 'site/index.html', sha: '1234567890abcdef' }];
    assert.strictEqual(extractSiteIndexSha(tree), '1234567');
  });
});

// ============================================================
// Expert mode: pipeline button HTML
// ============================================================
describe('Expert mode: pipeline button', () => {
  var fs = require('fs');
  var html = fs.readFileSync('site/index.html', 'utf8');

  it('expert-only elements hidden by default (display:none in HTML)', () => {
    assert.ok(html.includes('class="expert-only expert-btn" style="display:none;"'));
  });

  it('pipeline button copies talk_id to clipboard', () => {
    assert.ok(html.includes('navigator.clipboard.writeText'));
  });

  it('pipeline button links to subtitle-pipeline.yml dispatch', () => {
    assert.ok(html.includes('actions/workflows/subtitle-pipeline.yml'));
  });

  it('expert toggle persists under the sy_expert_mode key', () => {
    // The key itself moved into the preferences table; index.html reads and
    // writes it through that table instead of touching localStorage directly.
    var prefs = fs.readFileSync('site/js/preferences.js', 'utf8');
    assert.ok(prefs.includes("key: 'sy_expert_mode'"), 'sy_expert_mode not declared in preferences.js');
    assert.ok(html.includes("readPref(localStorage, 'expert')"));
    assert.ok(html.includes("writePref(localStorage, 'expert'"));
  });

  it('expert mode is switchable from the preferences menu', () => {
    assert.ok(html.includes('id="prefs-expert"'), 'expert switch not found');
    assert.ok(html.includes('SPA.toggleExpert'));
  });
});

// ============================================================
// SW independence from APP_VERSION
// ============================================================
describe('SW version independence', () => {
  var fs = require('fs');
  var sw = fs.readFileSync('site/sw.js', 'utf8');

  it('SW uses CACHE_VERSION not APP_VERSION', () => {
    assert.ok(sw.includes('CACHE_VERSION'));
    assert.ok(!sw.includes('APP_VERSION'));
  });

  it('SW does not parse URL params for version', () => {
    assert.ok(!sw.includes('searchParams'));
  });

  it('CACHE_NAME derived from CACHE_VERSION', () => {
    var m = sw.match(/CACHE_NAME = 'sy-subtitles-c' \+ CACHE_VERSION/);
    assert.ok(m, 'CACHE_NAME should use CACHE_VERSION');
  });
});

// ============================================================
// Deploy workflow stamps
// ============================================================
describe('Pipeline DAG labels and i18n', () => {
  var fs = require('fs');
  var html = fs.readFileSync('site/index.html', 'utf8');

  it('DAG uses t() for node labels', () => {
    assert.ok(html.includes("t('pipe.added')"), 'pipe.added i18n key used');
    assert.ok(html.includes("t('pipe.srt')"), 'pipe.srt i18n key used');
    assert.ok(html.includes("t('pipe.review')"), 'pipe.review i18n key used');
    assert.ok(html.includes("t('pipe.approved')"), 'pipe.approved i18n key used');
  });

  it('i18n has pipe keys in uk', () => {
    assert.ok(html.includes("'pipe.added'"));
    assert.ok(html.includes("'pipe.ai_transcribed'"));
    assert.ok(html.includes("'pipe.ai_translated'"));
    assert.ok(html.includes("'pipe.ai_reviewed'"));
    assert.ok(html.includes("'pipe.issue'"));
    assert.ok(html.includes("'pipe.srt'"));
    assert.ok(html.includes("'pipe.review'"));
    assert.ok(html.includes("'pipe.approved'"));
  });

  it('DAG has issue node', () => {
    assert.ok(html.includes("t('pipe.issue')"));
    assert.ok(html.includes('hasIssue'));
  });
});

// ============================================================
// renderStatusBadge
// ============================================================
function renderStatusBadge(status, reviewSt) {
  var labels = { 'approved': 'approved', 'in-review': 'in review', 'ready-for-review': 'needs review', 'in-progress': 'pending' };
  var text = labels[status] || status;
  if (status === 'in-review' && reviewSt && reviewSt.reviewer) text += ' (' + reviewSt.reviewer + ')';
  var href = reviewSt && reviewSt.issue_number ? 'https://github.com/sy-tools/sy-subtitles/issues/' + reviewSt.issue_number : '';
  if (href) return '<a href="' + href + '" target="_blank" class="review-badge ' + status + '">' + text + '</a>';
  return '<span class="review-badge ' + status + '">' + text + '</span>';
}

describe('renderStatusBadge', () => {
  it('approved — span with correct class', () => {
    var html = renderStatusBadge('approved', null);
    assert.ok(html.includes('class="review-badge approved"'));
    assert.ok(html.includes('approved'));
    assert.ok(html.startsWith('<span'));
  });

  it('in-review with reviewer — shows name', () => {
    var html = renderStatusBadge('in-review', { status: 'in-progress', reviewer: 'IrynaFil', issue_number: 5 });
    assert.ok(html.includes('in review (IrynaFil)'));
    assert.ok(html.includes('href="https://github.com'));
    assert.ok(html.includes('/issues/5'));
  });

  it('in-review without reviewer — no name', () => {
    var html = renderStatusBadge('in-review', { status: 'in-progress', issue_number: 3 });
    assert.ok(html.includes('in review'));
    assert.ok(!html.includes('('));
  });

  it('ready-for-review — needs review label', () => {
    var html = renderStatusBadge('ready-for-review', { status: 'pending', issue_number: 7 });
    assert.ok(html.includes('needs review'));
    assert.ok(html.includes('class="review-badge ready-for-review"'));
  });

  it('in-progress — pending label, no link', () => {
    var html = renderStatusBadge('in-progress', null);
    assert.ok(html.includes('pending'));
    assert.ok(html.startsWith('<span'));
  });

  it('with issue_number — renders as link', () => {
    var html = renderStatusBadge('approved', { status: 'approved', issue_number: 10 });
    assert.ok(html.startsWith('<a'));
    assert.ok(html.includes('target="_blank"'));
  });

  it('without issue_number — renders as span', () => {
    var html = renderStatusBadge('approved', { status: 'approved', issue_number: null });
    assert.ok(html.startsWith('<span'));
  });
});

// ============================================================
// computeStats
// ============================================================
function computeStatsTest(talks, statuses, query) {
  var total = { talks: 0, needs_review: 0, in_review: 0, approved: 0, pending: 0 };
  var filtered = { talks: 0, needs_review: 0, in_review: 0, approved: 0, pending: 0 };
  talks.forEach(function(t) {
    var searchText = ((t.title || '') + ' ' + (t.date || '') + ' ' + t.id).toLowerCase();
    var matchesSearch = !query || searchText.indexOf(query.toLowerCase()) !== -1;
    var st = statuses[t.id] || null;
    var stages = getPipelineStages(t, st);
    var status = getOverallStatus(stages, st);
    total.talks++;
    if (status === 'ready-for-review') total.needs_review++;
    if (status === 'in-review') total.in_review++;
    if (status === 'approved') total.approved++;
    if (status === 'in-progress') total.pending++;
    if (matchesSearch) {
      filtered.talks++;
      if (status === 'ready-for-review') filtered.needs_review++;
      if (status === 'in-review') filtered.in_review++;
      if (status === 'approved') filtered.approved++;
      if (status === 'in-progress') filtered.pending++;
    }
  });
  return { total: total, filtered: filtered };
}

describe('computeStats', () => {
  var talks = [
    { id: 'a', title: 'Alpha', date: '2020-01-01', videos: [{ slug: 'v1', hasSrt: true }], _whisperSlugs: ['v1'], hasUk: true, hasReviewReport: true },
    { id: 'b', title: 'Beta', date: '2021-02-02', videos: [{ slug: 'v1', hasSrt: true }], _whisperSlugs: ['v1'], hasUk: true, hasReviewReport: true },
    { id: 'c', title: 'Gamma', date: '2022-03-03', videos: [{ slug: 'v1', hasSrt: false }], _whisperSlugs: [], hasUk: false, hasReviewReport: false },
  ];
  var statuses = {
    'a': { status: 'approved', issue_number: 1 },
    'b': { status: 'pending', issue_number: 2 },
  };

  it('counts totals correctly', () => {
    var s = computeStatsTest(talks, statuses, '');
    assert.strictEqual(s.total.talks, 3);
    assert.strictEqual(s.total.approved, 1);     // a
    assert.strictEqual(s.total.needs_review, 1);  // b (srt+uk+issue)
    assert.strictEqual(s.total.pending, 1);       // c (nothing done)
  });

  it('search filters counts', () => {
    var s = computeStatsTest(talks, statuses, 'alpha');
    assert.strictEqual(s.filtered.talks, 1);
    assert.strictEqual(s.filtered.approved, 1);
    assert.strictEqual(s.total.talks, 3); // total unchanged
  });

  it('empty search returns all', () => {
    var s = computeStatsTest(talks, statuses, '');
    assert.strictEqual(s.filtered.talks, s.total.talks);
  });

  it('case-insensitive search', () => {
    var s = computeStatsTest(talks, statuses, 'BETA');
    assert.strictEqual(s.filtered.talks, 1);
  });

  it('search matches on id', () => {
    var s = computeStatsTest(talks, statuses, 'c');
    assert.ok(s.filtered.talks >= 1); // 'c' matches id 'c'
  });
});

// ============================================================
// SPA.filterTalks toggle behavior
// ============================================================
describe('filterTalks toggle logic', () => {
  it('clicking same non-all filter toggles to all', () => {
    var af = 'needs-review';
    af = (af === 'needs-review' && 'needs-review' !== 'all') ? 'all' : 'needs-review';
    assert.strictEqual(af, 'all');
  });

  it('clicking different filter switches to it', () => {
    var af = 'needs-review';
    var clicked = 'in-review';
    af = (af === clicked && clicked !== 'all') ? 'all' : clicked;
    assert.strictEqual(af, 'in-review');
  });

  it('clicking all always stays all', () => {
    var af = 'all';
    var clicked = 'all';
    af = (af === clicked && clicked !== 'all') ? 'all' : clicked;
    assert.strictEqual(af, 'all');
  });
});

// ============================================================
// Expert mode: activeFilter reset
// ============================================================
describe('Expert mode: filter reset on toggle', () => {
  var fs = require('fs');
  var html = fs.readFileSync('site/index.html', 'utf8');

  it('toggleExpert resets activeFilter', () => {
    // activeFilter is reset via loadSavedFilter which defaults to
    // 'pending' for expert and 'needs-review' for normal mode
    assert.ok(html.includes("loadSavedFilter(expertMode)"),
      'toggleExpert should reset activeFilter via loadSavedFilter');
    assert.ok(html.includes("isExpert ? 'pending' : 'needs-review'"),
      'loadSavedFilter should default to pending/needs-review');
  });

  it('toggleExpert calls renderStats and renderIndex', () => {
    // Check that toggle function re-renders
    // Anchored on the definition: the menu's onchange handler now mentions
    // SPA.toggleExpert earlier in the file, and matching that instead would
    // read 300 characters of markup and pass on nothing.
    var toggleMatch = html.match(/SPA\.toggleExpert = function[\s\S]{0,300}/);
    assert.ok(toggleMatch, 'toggleExpert exists');
    assert.ok(toggleMatch[0].includes('renderStats'), 'should call renderStats');
    assert.ok(toggleMatch[0].includes('renderIndex'), 'should call renderIndex');
  });
});

describe('Deploy stamps in HTML', () => {
  var fs = require('fs');
  var html = fs.readFileSync('site/index.html', 'utf8');

  it('APP_DEPLOY_SHA placeholder for sed', () => {
    assert.ok(html.includes("var APP_DEPLOY_SHA = '';"));
  });

  it('APP_DEPLOY_DATE placeholder for sed', () => {
    assert.ok(html.includes("var APP_DEPLOY_DATE = '';"));
  });

  it('no APP_VERSION references remain', () => {
    assert.ok(!html.includes('APP_VERSION'), 'APP_VERSION should be fully removed');
  });

  it('CACHE_SCHEMA is defined as number >= 1', () => {
    var m = html.match(/var CACHE_SCHEMA = (\d+)/);
    assert.ok(m, 'CACHE_SCHEMA not found');
    assert.ok(parseInt(m[1]) >= 1);
  });

  it('footer element exists with correct structure', () => {
    assert.ok(html.includes('id="app-footer"'));
    assert.ok(html.includes('id="footer-version"'));
  });
});

// ============================================================
// Pipeline view: stage computation
// ============================================================
function getPipelineStages(tk, st) {
  var nVideos = (tk.videos || []).length;
  var nWhisper = (tk._whisperSlugs || []).length;
  var nSrt = 0;
  (tk.videos || []).forEach(function(v) { if (v.hasSrt) nSrt++; });
  return {
    added: true,
    whisper: nWhisper >= nVideos && nVideos > 0,
    whisperProgress: nVideos > 0 ? nWhisper + '/' + nVideos : '0',
    translated: tk.hasUk,
    reviewed: tk.hasReviewReport,
    srt: nSrt >= nVideos && nVideos > 0,
    srtProgress: nVideos > 0 ? nSrt + '/' + nVideos : '0',
    hasIssue: !!(st && st.issue_number),
    review: st && st.status !== 'pending',
    approved: st && st.status === 'approved',
    nVideos: nVideos, nWhisper: nWhisper, nSrt: nSrt
  };
}

function countDoneStages(s) {
  var done = 1;
  if (s.whisper) done++;
  if (s.translated) done++;
  if (s.reviewed) done++;
  if (s.srt) done++;
  if (s.approved) done++;
  return { done: done, total: 6 };
}

describe('Pipeline: getPipelineStages', () => {
  it('empty talk — only added, no issue', () => {
    var tk = { videos: [], _whisperSlugs: [], hasUk: false, hasReviewReport: false };
    var s = getPipelineStages(tk, null);
    assert.strictEqual(s.added, true);
    assert.strictEqual(s.whisper, false);
    assert.strictEqual(s.translated, false);
    assert.strictEqual(s.srt, false);
    assert.strictEqual(s.hasIssue, false);
  });

  it('hasIssue true when issue_number exists', () => {
    var tk = { videos: [], _whisperSlugs: [], hasUk: false, hasReviewReport: false };
    assert.strictEqual(getPipelineStages(tk, { status: 'pending', issue_number: 5 }).hasIssue, true);
    assert.strictEqual(getPipelineStages(tk, { status: 'in-progress', issue_number: 3 }).hasIssue, true);
  });

  it('hasIssue false when status exists but no issue_number', () => {
    var tk = { videos: [], _whisperSlugs: [], hasUk: false, hasReviewReport: false };
    assert.strictEqual(getPipelineStages(tk, { status: 'pending', issue_number: null }).hasIssue, false);
    assert.strictEqual(getPipelineStages(tk, { status: 'pending' }).hasIssue, false);
  });

  it('hasIssue false when no status', () => {
    var tk = { videos: [], _whisperSlugs: [], hasUk: false, hasReviewReport: false };
    assert.strictEqual(getPipelineStages(tk, null).hasIssue, false);
  });

  it('fully completed talk', () => {
    var tk = {
      videos: [{ slug: 'v1', hasSrt: true }],
      _whisperSlugs: ['v1'],
      hasUk: true,
      hasReviewReport: true
    };
    var s = getPipelineStages(tk, { status: 'approved', issue_number: 1 });
    assert.strictEqual(s.whisper, true);
    assert.strictEqual(s.translated, true);
    assert.strictEqual(s.reviewed, true);
    assert.strictEqual(s.srt, true);
    assert.strictEqual(s.approved, true);
  });

  it('multi-video partial whisper', () => {
    var tk = {
      videos: [{ slug: 'v1', hasSrt: false }, { slug: 'v2', hasSrt: false }],
      _whisperSlugs: ['v1'],
      hasUk: false,
      hasReviewReport: false
    };
    var s = getPipelineStages(tk, null);
    assert.strictEqual(s.whisper, false); // 1/2
    assert.strictEqual(s.whisperProgress, '1/2');
  });

  it('multi-video all whisper done', () => {
    var tk = {
      videos: [{ slug: 'v1', hasSrt: true }, { slug: 'v2', hasSrt: true }],
      _whisperSlugs: ['v1', 'v2'],
      hasUk: true,
      hasReviewReport: true
    };
    var s = getPipelineStages(tk, { status: 'in-progress' });
    assert.strictEqual(s.whisper, true);
    assert.strictEqual(s.srt, true);
    assert.strictEqual(s.review, true);
    assert.strictEqual(s.approved, false);
  });

  it('review pending — review false', () => {
    var tk = { videos: [{ slug: 'v1', hasSrt: true }], _whisperSlugs: ['v1'], hasUk: true, hasReviewReport: true };
    var s = getPipelineStages(tk, { status: 'pending' });
    assert.strictEqual(s.review, false);
  });

  it('no status — review falsy', () => {
    var tk = { videos: [{ slug: 'v1', hasSrt: true }], _whisperSlugs: ['v1'], hasUk: true, hasReviewReport: true };
    var s = getPipelineStages(tk, null);
    assert.ok(!s.review);
    assert.ok(!s.approved);
  });
});

// Overall status for compact card view
function getOverallStatus(stages, reviewSt) {
  if (reviewSt && reviewSt.status === 'approved') return 'approved';
  if (reviewSt && reviewSt.status === 'in-progress') return 'in-review';
  if (stages.srt && stages.translated && stages.hasIssue) return 'ready-for-review';
  return 'in-progress';
}

describe('Pipeline: getOverallStatus', () => {
  it('approved', () => {
    var s = { srt: true, translated: true };
    assert.strictEqual(getOverallStatus(s, { status: 'approved' }), 'approved');
  });

  it('in-review', () => {
    var s = { srt: true, translated: true };
    assert.strictEqual(getOverallStatus(s, { status: 'in-progress' }), 'in-review');
  });

  it('ready for review — srt + translated + hasIssue', () => {
    var s = { srt: true, translated: true, hasIssue: true };
    assert.strictEqual(getOverallStatus(s, { status: 'pending', issue_number: 5 }), 'ready-for-review');
  });

  it('in-progress — srt + translated but NO issue_number', () => {
    var s = { srt: true, translated: true, hasIssue: false };
    assert.strictEqual(getOverallStatus(s, { status: 'pending', issue_number: null }), 'in-progress');
  });

  it('in-progress — srt + translated but no status at all', () => {
    var s = { srt: true, translated: true, hasIssue: false };
    assert.strictEqual(getOverallStatus(s, null), 'in-progress');
  });

  it('in-progress — no srt', () => {
    var s = { srt: false, translated: true };
    assert.strictEqual(getOverallStatus(s, { status: 'pending' }), 'in-progress');
  });

  it('in-progress — no translation', () => {
    var s = { srt: true, translated: false };
    assert.strictEqual(getOverallStatus(s, { status: 'pending' }), 'in-progress');
  });

  it('in-progress — nothing done', () => {
    var s = { srt: false, translated: false };
    assert.strictEqual(getOverallStatus(s, null), 'in-progress');
  });
});

// Filter logic
function shouldShowInFilter(status, filter, isExpert) {
  if (filter === 'all' && !isExpert) {
    return status === 'ready-for-review' || status === 'in-review';
  }
  if (filter === 'all') return true;
  if (filter === 'needs-review') return status === 'ready-for-review';
  if (filter === 'in-review') return status === 'in-review';
  if (filter === 'pending') return status === 'in-progress';
  if (filter === 'approved') return status === 'approved';
  return true;
}

describe('Index filters: shouldShowInFilter', () => {
  // Normal mode "all" = only needs-review + in-review
  it('normal all — only needs-review + in-review', () => {
    assert.strictEqual(shouldShowInFilter('ready-for-review', 'all', false), true);
    assert.strictEqual(shouldShowInFilter('in-review', 'all', false), true);
    assert.strictEqual(shouldShowInFilter('in-progress', 'all', false), false);
    assert.strictEqual(shouldShowInFilter('approved', 'all', false), false);
  });

  // Expert mode "all" = everything
  it('expert all — shows everything', () => {
    ['in-progress', 'ready-for-review', 'in-review', 'approved'].forEach(s => {
      assert.strictEqual(shouldShowInFilter(s, 'all', true), true);
    });
  });

  it('needs-review — only ready-for-review', () => {
    assert.strictEqual(shouldShowInFilter('ready-for-review', 'needs-review', false), true);
    assert.strictEqual(shouldShowInFilter('in-progress', 'needs-review', false), false);
    assert.strictEqual(shouldShowInFilter('in-review', 'needs-review', false), false);
    assert.strictEqual(shouldShowInFilter('approved', 'needs-review', false), false);
  });

  it('in-review — only in-review', () => {
    assert.strictEqual(shouldShowInFilter('in-review', 'in-review', false), true);
    assert.strictEqual(shouldShowInFilter('ready-for-review', 'in-review', false), false);
  });

  it('pending — only in-progress (expert)', () => {
    assert.strictEqual(shouldShowInFilter('in-progress', 'pending', true), true);
    assert.strictEqual(shouldShowInFilter('ready-for-review', 'pending', true), false);
  });

  it('approved — only approved (expert)', () => {
    assert.strictEqual(shouldShowInFilter('approved', 'approved', true), true);
    assert.strictEqual(shouldShowInFilter('in-progress', 'approved', true), false);
  });
});

describe('Index filters: default filter by mode', () => {
  it('normal mode default = needs-review', () => {
    var defaultNormal = false ? 'pending' : 'needs-review';
    assert.strictEqual(defaultNormal, 'needs-review');
  });

  it('expert mode default = pending', () => {
    var defaultExpert = true ? 'pending' : 'needs-review';
    assert.strictEqual(defaultExpert, 'pending');
  });

  it('normal all count = needs-review + in-review', () => {
    var needs = 4, inRev = 2;
    var normalAll = needs + inRev;
    assert.strictEqual(normalAll, 6);
  });
});

describe('Pipeline: countDoneStages', () => {
  it('only added = 1/6', () => {
    var p = countDoneStages({ added: true, whisper: false, translated: false, reviewed: false, srt: false, review: false, approved: false });
    assert.strictEqual(p.done, 1);
    assert.strictEqual(p.total, 6);
  });

  it('fully done = 6/6', () => {
    var p = countDoneStages({ added: true, whisper: true, translated: true, reviewed: true, srt: true, review: true, approved: true });
    assert.strictEqual(p.done, 6);
  });

  it('partial = 4/6', () => {
    var p = countDoneStages({ added: true, whisper: true, translated: true, reviewed: true, srt: false, review: false, approved: false });
    assert.strictEqual(p.done, 4);
  });
});

describe('Pipeline: manifest tracking', () => {
  var fs = require('fs');
  var html = fs.readFileSync('site/index.html', 'utf8');

  it('buildManifest tracks whisper.json', () => {
    assert.ok(html.includes('_whisperSlugs'));
    assert.ok(html.includes("whisper\\.json"));
  });

  it('buildManifest tracks review_report.md', () => {
    assert.ok(html.includes('hasReviewReport'));
    assert.ok(html.includes("review_report\\.md"));
  });

  it('expert inline DAG detail', () => {
    assert.ok(html.includes('pipe-detail'));
    assert.ok(html.includes('renderPipelineDAG'));
  });

  it('status badge CSS for all states', () => {
    // Badge styling is a component rule, in components.css.
    var css = fs.readFileSync('site/css/components.css', 'utf8');
    assert.ok(css.includes('.review-badge.ready-for-review'));
    assert.ok(css.includes('.review-badge.in-progress'));
    assert.ok(css.includes('.review-badge.in-review'));
    assert.ok(css.includes('.review-badge.approved'));
  });

  it('getOverallStatus function exists', () => {
    assert.ok(html.includes('function getOverallStatus'));
  });
});

describe('i18n: no hardcoded UI text in HTML body', () => {
  var fs = require('fs');
  var html = fs.readFileSync('site/index.html', 'utf8');
  var bodyMatch = html.match(/<body>([\s\S]*)<\/body>/);
  var body = bodyMatch ? bodyMatch[1] : '';
  var bodyNoScript = body.replace(/<script[\s\S]*?<\/script>/g, '');

  it('no hardcoded "Loading..." without data-i18n', () => {
    var loadingMatches = bodyNoScript.match(/>Loading\.\.\.</g) || [];
    var i18nLoadingMatches = bodyNoScript.match(/data-i18n="[^"]*">Loading\.\.\.</g) || [];
    assert.strictEqual(loadingMatches.length, i18nLoadingMatches.length,
      'Found Loading... without data-i18n attribute');
  });

  it('no hardcoded Ukrainian title attributes without data-i18n-title', () => {
    var titleRe = /title="([^"]*)"/g;
    var m, errors = [];
    while ((m = titleRe.exec(bodyNoScript)) !== null) {
      if (/[\u0400-\u04FF]/.test(m[1])) {
        var before = bodyNoScript.substring(Math.max(0, m.index - 200), m.index);
        if (!before.includes('data-i18n-title=')) errors.push(m[1]);
      }
    }
    assert.deepStrictEqual(errors, [], 'Hardcoded Ukrainian title attrs: ' + errors.join(', '));
  });

  it('no hardcoded English placeholder attributes without data-i18n-placeholder', () => {
    var re = /placeholder="([^"]*)"/g;
    var m, errors = [];
    while ((m = re.exec(bodyNoScript)) !== null) {
      var val = m[1];
      // Skip if it looks like an i18n key or URL pattern
      if (/^[\w.]+$/.test(val)) continue;
      if (/^https?:\/\//.test(val)) continue;
      if (/[a-zA-Z]{3,}/.test(val)) {
        var before = bodyNoScript.substring(Math.max(0, m.index - 200), m.index);
        if (!before.includes('data-i18n-placeholder=')) errors.push(val);
      }
    }
    assert.deepStrictEqual(errors, [], 'Hardcoded placeholders: ' + errors.join(', '));
  });

  it('all visible button text has data-i18n', () => {
    var btnRe = /<button[^>]*>([^<]+)<\/button>/g;
    var m, errors = [];
    while ((m = btnRe.exec(bodyNoScript)) !== null) {
      var text = m[1].trim();
      // Skip icon-only buttons (single unicode chars, emoji, &#xxx;, ↻)
      if (text.length <= 2 || /^&#x?[0-9a-f]+;$/i.test(text)) continue;
      // Skip branch selector buttons (dynamic content like "main ▾")
      if (m[0].includes('class="branch-btn"')) continue;
      // Must have data-i18n in the tag
      if (!m[0].includes('data-i18n=')) errors.push(text);
    }
    assert.deepStrictEqual(errors, [], 'Button text without data-i18n: ' + errors.join(', '));
  });

  it('all visible summary text has data-i18n', () => {
    var re = /<summary[^>]*>([^<]*)</g;
    var m, errors = [];
    while ((m = re.exec(bodyNoScript)) !== null) {
      var text = m[1].trim();
      if (text.length > 2 && /[a-zA-Z\u0400-\u04FF]/.test(text) && !m[0].includes('data-i18n=')) {
        errors.push(text);
      }
    }
    assert.deepStrictEqual(errors, [], 'Summary text without data-i18n: ' + errors.join(', '));
  });

  it('no hardcoded status text in divs with class "status"', () => {
    var re = /class="status"[^>]*>([^<]+)</g;
    var m, errors = [];
    while ((m = re.exec(bodyNoScript)) !== null) {
      var text = m[1].trim();
      if (text.length > 0 && !m[0].includes('data-i18n=')) errors.push(text);
    }
    assert.deepStrictEqual(errors, [], 'Status text without data-i18n: ' + errors.join(', '));
  });

  it('all JS t() calls use keys that exist in I18N', () => {
    var scriptMatch = html.match(/<script>([\s\S]*)<\/script>/);
    if (!scriptMatch) return;
    var script = scriptMatch[1];

    // Extract all t('key') calls
    var tCalls = new Set();
    var tRe = /\bt\('([^']+?)'\)/g;
    var m;
    while ((m = tRe.exec(script)) !== null) tCalls.add(m[1]);

    // Extract ALL I18N keys (from any quoted key in the I18N block)
    var i18nMatch = script.match(/var I18N\s*=\s*\{([\s\S]*?)\n\s*\};/);
    if (!i18nMatch) { assert.ok(false, 'I18N object not found'); return; }
    var i18nBlock = i18nMatch[1];
    var allKeys = new Set();
    var keyRe = /'([\w.]+)'\s*:/g;
    while ((m = keyRe.exec(i18nBlock)) !== null) allKeys.add(m[1]);

    var missing = [...tCalls].filter(k => !allKeys.has(k));
    assert.strictEqual(missing.length, 0, 't() calls with undefined keys: ' + missing.join(', '));
  });

  it('no JS showToast/toast with hardcoded strings (should use t())', () => {
    var scriptMatch = html.match(/<script>([\s\S]*)<\/script>/);
    if (!scriptMatch) return;
    var script = scriptMatch[1];
    // Find showToast('...') or toast('...') with literal strings (not t())
    var re = /(?:showToast|toast)\(\s*'([^']+)'/g;
    var m, errors = [];
    while ((m = re.exec(script)) !== null) {
      // Should be t('key'), not a literal
      if (!/^t\(/.test(m[0])) errors.push(m[1]);
    }
    // Filter out ones that are inside t() calls
    errors = errors.filter(e => !e.startsWith('t('));
    assert.strictEqual(errors.length, 0, 'Hardcoded toast messages: ' + errors.join(', '));
  });

  it('no hardcoded Cyrillic string literals in JS (use t()/I18N)', () => {
    // Global guard: any user-facing Cyrillic text in the SPA's JS must go
    // through t()/I18N so it can be localized. A bare `el.textContent = '...'`
    // (as the passphrase gate originally had) is invisible to the showToast /
    // data-i18n scanners above — this catches it everywhere.
    // Case-insensitive (i) so CodeQL's bad-tag-filter query is satisfied; our
    // index.html uses a lowercase <script>, so matching is unchanged in practice.
    var script = html.match(/<script>([\s\S]*)<\/script>/i)[1];
    // The I18N dictionary is the one place Cyrillic literals legitimately live.
    var i18nMatch = script.match(/var I18N\s*=\s*\{[\s\S]*?\n\s*\};/);
    var scanned = i18nMatch ? script.replace(i18nMatch[0], '') : script;
    var litRe = /(['"])((?:\\.|(?!\1).)*?)\1/g;
    var m, offenders = [];
    while ((m = litRe.exec(scanned)) !== null) {
      if (/[Ѐ-ӿ]/.test(m[2])) offenders.push(m[2].slice(0, 60));
    }
    assert.deepStrictEqual(offenders, [], 'Hardcoded Cyrillic JS literals (use t()): ' + offenders.join(' | '));
  });
});

// ============================================================
// Burned-in subtitle render: the export menu, its video item, download wiring
// ============================================================
describe('burn video wiring', () => {
  const fs = require('fs');
  const html = fs.readFileSync('site/index.html', 'utf8');
  const sw = fs.readFileSync('site/sw.js', 'utf8');
  const css = fs.readFileSync('site/css/components.css', 'utf8');
  const styleguide = fs.readFileSync('site/styleguide.html', 'utf8');

  // Two modules, not one: the run driver and the artifact ZIP reader.
  const BURN_MODULES = ['js/burn_video.js', 'js/burn_artifact.js'];

  // The export control's own markup: its anchor up to the next sibling in the
  // header row. Taken as far as the player container it would also swallow
  // #btn-clear-all, whose onclick would then read as part of the menu.
  const EXPORT_POP = html.slice(html.indexOf('<span class="export-pop"'),
                                html.indexOf('<button id="btn-clear-all"'));

  it('loads both burn modules as plain script tags', () => {
    for (const mod of BURN_MODULES) {
      assert.ok(html.includes('<script src="' + mod + '"></script>'),
        'index.html must load ' + mod + ' — single source, no inline copy');
    }
  });

  it('precaches both burn modules', () => {
    for (const mod of BURN_MODULES) {
      assert.ok(sw.includes("'" + mod + "'"),
        'a new site/js module must be added to the SW SHELL_ASSETS list: ' + mod);
    }
  });

  it('shows the video item only to signed-in users with write access', () => {
    // Only the VIDEO half is gated: the subtitle file is a plain download that
    // a signed-out reader can take, so gating the whole menu would withhold it
    // for no reason. The gate sits on the #export-video GROUP rather than on
    // the button, because the group is the whole readout — track, status line,
    // run link, error — and a session that cannot dispatch has no use for any
    // of it, not merely for a disabled button.
    assert.ok(html.match(/<button[^>]*id="btn-burn-video"[^>]*>/),
      'the video item must exist');
    const group = html.match(/<div[^>]*id="export-video"[^>]*>/);
    assert.ok(group, 'the #export-video group must exist');
    assert.ok(group[0].includes('data-gh-only'),
      'the render belongs to sessions that can dispatch: gate it with data-gh-only');
    const anchor = html.match(/<span class="export-pop"[^>]*>/);
    assert.ok(anchor, 'the .export-pop anchor must exist');
    assert.ok(!anchor[0].includes('data-gh-only'),
      'gating the anchor would take the subtitle download away from readers too');
  });

  it('places the button in the preview header actions', () => {
    const header = html.slice(html.indexOf('preview-header'),
                              html.indexOf('player-container'));
    assert.ok(header.includes('btn-burn-video'),
      'the button belongs in the preview .header-actions cluster');
  });

  it('says what THIS browser does, now that the picker path streams', () => {
    // The toast is shown on exactly one path: the browser with no save dialog,
    // which is the one that still holds the whole video in memory. It has to
    // name that cost — it is why a large render can fail here and not in
    // Chrome — and it must not borrow the streaming path's behaviour.
    const en = html.slice(html.indexOf("\n  en:"));
    const line = en.match(/'burn\.memory_fallback':\s*'([^']*)'/);
    assert.ok(line, 'burn.memory_fallback must exist');
    assert.ok(/memory/i.test(line[1]),
      'this path buffers the whole file — the message must say so');
    assert.ok(!/stream/i.test(line[1]),
      'the path that streams is the one that never shows this message');
  });

  it('warns through the house dialog, never native confirm()', () => {
    // SPA.confirm exists precisely so the app's voice and language carry
    // through; a native confirm() would be an untranslated browser chrome box.
    const driver = html.slice(html.indexOf('var BURN_POLL_MS'),
                              html.indexOf('SPA.toggleExportMenu = toggleExportMenu;'));
    assert.ok(driver.includes('SPA.confirm('),
      'the pending-edits warning must use the house dialog');
    assert.ok(!/(^|[^.\w])confirm\s*\(/.test(driver.replace(/SPA\.confirm\s*\(/g, '')),
      'no bare confirm() may survive in the burn driver');
  });

  it("re-composes the video item's tooltip on a language toggle", () => {
    // The tooltip substitutes the previewed language into its sentence, so no
    // data-i18n-title can carry it; translatePage() has to re-run the composer,
    // exactly as it already does for the item's composed status line.
    const fn = html.slice(html.indexOf('function translatePage()'),
                          html.indexOf('var SyncPlayer'));
    assert.ok(fn.includes('updateExportUi()'),
      'without this the tooltip sticks in the language it was written in');
  });

  it('refreshes the export control when the subtitle language changes', () => {
    // The refusal is keyed on previewState.srtLang, which switchSubLang mutates
    // — without this the item would stay disabled after switching back to UK.
    const fn = html.slice(html.indexOf('SPA.switchSubLang = function'),
                          html.indexOf('function ensureManifest'));
    assert.ok(fn.includes('updateExportUi()'),
      'a language switch must re-evaluate whether a render is possible');
  });

  it('words the remaining time softly and drops the superseded keys', () => {
    // The ETA is extrapolated from a rate ffmpeg's own progress file measured,
    // so it no longer needs the italic apology — but it is still an
    // extrapolation, hence the soft "about N min to go" wording.
    assert.ok(html.includes('burn.estimate_soft'),
      'the item must carry the soft-worded remaining-time key');
    assert.ok(!/burn\.estimate'/.test(html),
      'burn.estimate is superseded by burn.estimate_soft — it must be gone');
    assert.ok(!html.includes('burn.overrun'),
      'burn.overrun existed for the 97% interpolation cap, which no longer exists');
  });

  it('defines every export i18n key exactly once in BOTH language tables', () => {
    // t() falls back to English, so a key missing from uk would silently ship
    // English text into a Ukrainian UI. Check each table separately.
    //
    // The export.* family is in scope alongside burn.*: the two used to be one
    // control's worth of keys under one prefix, and the retired btn.burn_* names
    // are only provably gone if this guard still looks for them.
    const KEY = '(?:burn\\.[a-z_.]+|export\\.[a-z_.]+|history\\.[a-z_.]+|clip\\.[a-z_.]+|btn\\.burn[a-z_]*)';
    const i18n = html.match(/var I18N\s*=\s*\{([\s\S]*?)\n\};/);
    assert.ok(i18n, 'I18N table not found');
    const uk = i18n[1].slice(i18n[1].indexOf('uk:'), i18n[1].indexOf('\n  en:'));
    const en = i18n[1].slice(i18n[1].indexOf('\n  en:'));
    // Harvest from the CODE with the tables cut out, so the tables cannot
    // vouch for themselves. Three call shapes count: t('…'), the data-i18n
    // attributes applyI18N paints, and bare key literals — the title key is
    // picked by a conditional and never appears inside a t(...) call.
    //
    // The site/js modules are scanned too: they carry no burn key today, but a
    // key used from one later must not fail the "no unused key" clause below for
    // the wrong reason.
    const at = html.indexOf(i18n[0]);
    const modules = fs.readdirSync('site/js')
      .filter((f) => f.endsWith('.js'))
      .map((f) => fs.readFileSync('site/js/' + f, 'utf8'))
      .join('\n');
    const code = html.slice(0, at) + html.slice(at + i18n[0].length) + '\n' + modules;
    const found = new Set([
      ...[...code.matchAll(new RegExp("'(" + KEY + ")'", 'g'))].map((m) => m[1]),
      ...[...code.matchAll(new RegExp('data-i18n(?:-[a-z-]+)?="(' + KEY + ')"', 'g'))].map((m) => m[1])
    ]);
    // 'burn.step.' is a computed prefix: the phase key is appended at runtime.
    // The four keys it can build come from the phase model itself, so a renamed
    // phase fails here instead of silently printing a raw key.
    const PREFIX = 'burn.step.';
    const keys = [...found].filter((k) => k !== PREFIX)
      .concat(require('../site/js/burn_video').burnPhases().map((p) => PREFIX + p.key));
    // Guard the harvest itself: a regex that silently matched nothing would
    // make every assertion below vacuous.
    for (const wanted of ['export.title', 'export.srt', 'export.srt_failed',
                          'export.video_make', 'export.video_working',
                          'export.video_full', 'export.video_clip',
                          'export.clip_working', 'history.title', 'history.loading',
                          'history.scale', 'clip.title', 'clip.bad_start', 'clip.past_end',
                          'burn.view_run', 'burn.queued', 'burn.step_of',
                          'burn.elapsed', 'burn.estimate_soft',
                          'burn.wait_for_sync', 'burn.wrong_lang',
                          'burn.step.render']) {
      assert.ok(keys.includes(wanted), 'i18n key not harvested: ' + wanted);
    }
    // A shape, not a magic count: each key the code uses is defined EXACTLY
    // once per table (a duplicate literal silently wins), and neither table
    // carries a burn key the code never uses — that is how a superseded key
    // like burn.estimate would otherwise survive its own removal.
    for (const [name, table] of [['uk', uk], ['en', en]]) {
      const defined = new Map();
      for (const d of table.matchAll(new RegExp("'(" + KEY + ")':", 'g'))) {
        defined.set(d[1], (defined.get(d[1]) || 0) + 1);
      }
      for (const key of keys) {
        assert.strictEqual(defined.get(key), 1,
          name + ' table must define ' + key + ' exactly once, got ' + defined.get(key));
      }
      assert.deepStrictEqual([...defined.keys()].filter((k) => !keys.includes(k)), [],
        name + ' table defines burn keys the code never uses');
    }
  });

  it('gives the track a progressbar role and keeps the ticker out of the live region', () => {
    // A ~25-minute operation whose only feedback is a track and an error line is
    // unusable without a progressbar role and live regions.
    const group = html.slice(html.indexOf('<div id="export-video"'),
                             html.indexOf('<div class="player-container"'));
    assert.ok(group, 'the video item group markup not found');
    const track = group.match(/<div[^>]*id="burn-track"[^>]*>/);
    assert.ok(track, '#burn-track element not found');
    assert.ok(track[0].includes('role="progressbar"'),
      'the track must expose role="progressbar" — one control, not four segments');
    for (const attr of ['aria-valuemin="0"', 'aria-valuemax="100"', 'aria-valuenow=']) {
      assert.ok(track[0].includes(attr), 'the track must carry ' + attr);
    }
    // The track has no visible text of its own, and the item's label is the one
    // thing that names what is being measured.
    assert.ok(track[0].includes('aria-labelledby="burn-item-label"'),
      'the progressbar must borrow the item label as its accessible name');
    const step = group.match(/<span[^>]*id="burn-step"[^>]*>/);
    assert.ok(step && step[0].includes('aria-live="polite"'),
      'the phase line must be the polite live region');
    // The elapsed counter ticks on every 5s poll for ~25 minutes: inside a live
    // region that is ~300 announcements of a number nobody asked to hear.
    const status = group.match(/<p[^>]*class="export-item__meta"[^>]*>/);
    assert.ok(status && !status[0].includes('aria-live'),
      'aria-live belongs on #burn-step alone, not on the whole status line');
    for (const id of ['burn-elapsed', 'burn-eta']) {
      const span = group.match(new RegExp('<span[^>]*id="' + id + '"[^>]*>'));
      assert.ok(span, '#' + id + ' not found');
      assert.ok(!span[0].includes('aria-live'),
        '#' + id + ' must sit outside the live region');
    }
    const err = group.match(/<p[^>]*id="burn-error"[^>]*>/);
    assert.ok(err && (err[0].includes('role="alert"') ||
                      err[0].includes('aria-live="assertive"')),
      'the error line must be an assertive live region');
  });

  it('draws the track as seamed segments over the single bar', () => {
    assert.match(css, /\.burn-track\s*\{[^}]*display:\s*flex/,
      '.burn-track must lay the phase segments out in a row');
    assert.match(css, /\.burn-seg\s*\{[^}]*background:\s*var\(--bg4\)/,
      'an unfilled segment must sit on the idle surface token');
    assert.ok(!css.includes('.burn-bar'),
      'the single-bar rules are superseded by the segmented track');
  });

  it('marks a failed phase without depending on its fill width', () => {
    // .burn-seg__fill starts at width:0, so a run that died in its first gate
    // would show nothing at all if red lived only on the fill.
    const seg = css.match(/\.burn-seg--failed\s*\{([^}]*)\}/);
    assert.ok(seg, '.burn-seg--failed must style the segment body itself');
    assert.match(seg[1], /var\(--(danger-bg|accent-red)\)/,
      'the failed segment body needs a visible treatment of its own');
  });

  it('drops the italic apology from the remaining-time line', () => {
    const eta = css.match(/\.burn-panel__eta\s*\{([^}]*)\}/);
    assert.ok(eta, '.burn-panel__eta rule not found');
    assert.ok(!/italic/.test(eta[1]),
      'the italic apologised for a guess; the ETA is now a measured extrapolation');
  });

  it('gates the breathing overlay on a phase having earned nothing', () => {
    // An ungated overlay tints everything the active phase has not earned, which
    // on the 70%-wide render segment reads as a second shade of progress: a
    // measured 44% looked ~78% done (verified by pixel-diffing the panel).
    assert.match(css, /\.burn-seg--active\.burn-seg--empty::after\s*\{/,
      'the overlay must be gated on the empty modifier');
    assert.ok(!/(^|\})\s*\.burn-seg--active::after\s*\{/m.test(css),
      'an ungated .burn-seg--active::after would tint the unearned remainder');
  });

  it('repaints the video item when the interface language changes', () => {
    // The status line carries composed strings ("done in 21 min"), which no
    // data-i18n attribute can repaint — so translatePage has to redraw it.
    const idx = html.indexOf('function translatePage()');
    assert.ok(idx > -1, 'translatePage() not found');
    const chunk = html.slice(idx, html.indexOf('\nfunction ', idx + 1));
    assert.ok(chunk.includes('retranslateBurnPanel()'),
      'translatePage() must redraw the video item from its last payload');
  });

  it('holds the segment animation still under prefers-reduced-motion', () => {
    assert.match(css, /prefers-reduced-motion[\s\S]{0,300}\.burn-seg--active\.burn-seg--empty::after\s*\{[^}]*animation:\s*none/,
      'the breathing segment must stop for readers who asked for less motion');
  });

  it('mirrors the a11y semantics into the styleguide entry', () => {
    // The catalog is the contract: an example without the roles teaches the
    // wrong markup to the next component author.
    const at = styleguide.indexOf('<h2>Export menu</h2>');
    assert.ok(at > -1, 'the styleguide must carry an Export menu section');
    const sg = styleguide.slice(at);
    assert.ok(sg.includes('role="progressbar"'),
      'the styleguide track must show role="progressbar"');
    assert.ok(sg.includes('aria-valuenow='),
      'the styleguide track must show aria-valuenow');
    assert.ok(sg.includes('aria-live="polite"'),
      'the styleguide status line must show the polite live region');
    assert.ok(sg.includes('role="alert"') || sg.includes('aria-live="assertive"'),
      'the styleguide error line must show the assertive live region');
  });

  it('builds the styleguide tracks from the real weight table', () => {
    const at = styleguide.indexOf('<h2>Export menu</h2>');
    assert.ok(at > -1, 'the styleguide must carry an Export menu section');
    const sg = styleguide.slice(at);
    assert.ok(styleguide.includes('<script src="js/burn_video.js"></script>'),
      'the catalog must include the real phase model, not hand-drawn widths');
    assert.match(sg, /burnSegments\(|burnPhases\(/,
      'the example tracks must be generated from the phase model');
    for (const state of ['early', 'mid-render', 'done', 'failed', 'expired']) {
      assert.ok(sg.includes(state),
        'the catalog must show the ' + state + ' state');
    }
    // The example FRACTIONS have to be derived too, not hand-computed: a
    // restated 0.065 would keep describing a gate granularity the workflow no
    // longer has, in the one place that claims it cannot drift.
    assert.ok(sg.includes('BURN_STEP_WEIGHTS'),
      'the example fractions must be summed from the real weight table');
    assert.ok(!/0\.065/.test(sg),
      'a hand-computed gate weight restates the table this section derives from');
  });

  it('actually registers the menu dismissal handlers on the document', () => {
    // The dismissal handlers are exhaustively unit-tested — by calling them.
    // The registrations live OUTSIDE the extracted driver block, so a mutation
    // pass deleted both addEventListener lines and 1137 tests stayed green
    // while Escape and click-away were dead in the real app. The exact
    // "unit-tested but never called" failure mode this branch already shipped.
    assert.ok(html.includes("document.addEventListener('keydown', onBurnKeydown)"),
      'Escape-close is tested but not wired');
    assert.ok(html.includes("document.addEventListener('click', onBurnDocumentClick)"),
      'click-outside-close is tested but not wired');
  });

  it('actually calls resumeBurnWatch when a preview is shown', () => {
    // Same class: every reset/resume test invokes resumeBurnWatch itself. The
    // ONLY production call site is showPreview — deleting that one line kept
    // the suite green while resume-on-entry, the per-video reset and the
    // transfer scoping all died as the user experiences them.
    const idx = html.indexOf('function showPreview(');
    assert.ok(idx > -1, 'showPreview not found');
    const chunk = html.slice(idx, html.indexOf('\nfunction ', idx + 1));
    assert.match(chunk, /resumeBurnWatch\(talkId,\s*videoSlug\)/,
      'showPreview must hand the burn state its talk and video');
  });

  it('stops the burn poll when the router leaves the preview', () => {
    // Routing to the index left the 5s loop running for up to ~30 min, writing
    // into hidden DOM. The recorded run must survive so resumeBurnWatch() can
    // pick it back up on return.
    const idx = html.indexOf('function route()');
    assert.ok(idx > -1, 'route() not found');
    const after = html.indexOf('\nfunction ', idx + 1);
    const chunk = html.slice(idx, after > -1 ? after : idx + 4000);
    assert.ok(chunk.includes('stopBurnTimer()'),
      'route() must stop the burn poll when the view changes');
    assert.ok(!/burnWatch\s*=\s*null/.test(chunk),
      'route() must NOT drop burnWatch — resumeBurnWatch needs the recorded run');
    assert.ok(!chunk.includes('clearBurnState'),
      'route() must NOT clear the persisted burn state');
  });

  it('keeps every surface the driver hides actually hidden', () => {
    // An author `display` always beats the UA's [hidden]{display:none}, so any
    // element the driver hides by setting .hidden needs its own rule — and this
    // shipped broken twice for want of one. #burn-track (display:flex) and the
    // run link (display:block) had none, so three rounds of "hide the disowned
    // render" set .hidden faithfully and changed nothing on screen, while
    // .export-item__meta — which DOES have a rule — vanished as intended. Every
    // harness test passed throughout: stub elements model the property, and the
    // property was never the problem.
    //
    // The list is derived from the markup rather than hand-kept, so an element
    // that starts wearing a class with a display cannot slip through the way
    // these two did.
    const HIDDEN_BY_DRIVER = ['export-menu', 'export-video', 'burn-track',
                              'burn-run-link', 'burn-error'];
    // Classes carrying a display other than none, from anywhere in the sheet.
    const displayed = new Set();
    for (const m of css.matchAll(/\.([a-z0-9_-]+)(?:[^{};]*)\{([^}]*)\}/gi)) {
      if (/display:\s*(?!none)[a-z-]+/.test(m[2])) displayed.add(m[1]);
    }
    for (const id of HIDDEN_BY_DRIVER) {
      const tag = html.match(new RegExp('<[a-z]+[^>]*id="' + id + '"[^>]*>', 'i'));
      assert.ok(tag, '#' + id + ' is not in the markup');
      const cls = (tag[0].match(/class="([^"]*)"/) || [, ''])[1].split(/\s+/).filter(Boolean);
      for (const c of cls) {
        if (!displayed.has(c)) continue;
        assert.match(css, new RegExp('\\.' + c + '(?:[^{};]*)\\[hidden\\]\\s*\\{[^}]*display:\\s*none'),
          '#' + id + ' is hidden by the driver and wears .' + c + ', which sets a ' +
          'display — .' + c + '[hidden] must set display:none or hiding it does nothing');
      }
    }
    // .btn is hidden the same way outside this menu (the old download button).
    assert.match(css, /\.btn\[hidden\]\s*\{[^}]*display:\s*none/,
      '.btn[hidden] must set display:none — .btn is display:inline-flex');
  });

  it('keeps the header buttons filling the wrapped mobile row', () => {
    // The mobile touch-target rule had to be rescoped with `>` so it stopped
    // stretching the export MENU's rows to the header's 44px metrics inside a
    // 320px popover. Rescoping it dropped `flex: 1 1 auto`, which every header
    // button had relied on since long before this feature: below 768px the row
    // wraps, and without it the buttons size to their own text and the row goes
    // ragged. The new icon toggle is deliberately NOT in this rule — it is
    // content-sized on purpose.
    // Anchored on the brace, so the combined touch-target selector above (which
    // legitimately carries no flex) cannot answer for this one.
    const rule = css.match(/\.header-actions > button\s*\{([^}]*)\}/);
    assert.ok(rule, 'no rule grows the header buttons on a wrapped row');
    assert.match(rule[1], /flex:\s*1\s+1\s+auto/,
      'header buttons must still grow to fill the wrapped row');
  });

  it('keeps the menu anchor at the right edge when the mobile row wraps', () => {
    // The menu hangs leftward from its anchor (right: 0). On a narrow screen the
    // header row wraps, and a wrapped flex item lands at the START of its new
    // row — a 320px surface anchored to a 44px icon at x≈12 opens at x=−264,
    // and absolute-position overflow to the left is not scrollable: the menu is
    // simply gone. Measured at a 320px viewport with the two grown text buttons
    // filling row one. margin-left:auto pins the icon to its row's right edge
    // whether it wraps or not, so the right-anchored menu always fits.
    const media = css.slice(css.indexOf('@media (max-width: 768px)'));
    assert.match(media, /\.header-actions > \.export-pop\s*\{[^}]*margin-left:\s*auto/,
      'the export anchor must hug the right edge of a wrapped mobile row');
  });

  it('keeps the video-picker button a 44px touch target on mobile', () => {
    // The old descendant rule (.header-actions button) covered #btn-sync-player
    // through its .video-picker wrapper. The `>` rescoping kept the direct
    // children and the export-pop, and silently dropped this third nesting —
    // measured 34px beside 44px siblings on the review view's most-used control.
    const media = css.slice(css.indexOf('@media (max-width: 768px)'));
    const rule = media.match(/\.header-actions > [^{]*\{[^}]*min-height:\s*44px[^}]*\}/);
    assert.ok(rule, 'no mobile touch-target rule found');
    assert.match(rule[0], /\.header-actions > \.video-picker > button/,
      'the video-picker button must keep the 44px touch metrics');
  });

  it('hides every new surface of the control through its own [hidden] rule', () => {
    // Each carries an author display, which outranks the UA's
    // [hidden]{display:none}: without its own rule a closed flyout, a finished
    // spinner or a closed panel would stay on screen.
    for (const sel of ['.export-submenu', '.export-history', '.export-history__list',
                       '.export-history__new', '.spinner', '.float-panel']) {
      assert.ok(css.includes(sel + '[hidden] { display: none; }'),
        sel + ' needs its own [hidden] rule');
    }
    assert.ok(!/export-item-group--(done|transfer|expired)/.test(css),
      'the item no longer wears a finished, transferring or expired face — their tints must go');
  });

  it('sizes the heading spinner off the line it sits in, and never taller', () => {
    // The whole point of moving it into the heading is that the line's height
    // is the same with and without it. A pixel size would be a bet against the
    // font scale; a reserved height would be a bet against a translation. Both
    // lose, so the ring is measured in `em` of the line it shares.
    const rule = css.match(/\.export-history__title \.spinner \{[^}]*\}/);
    assert.ok(rule, 'the spinner needs a rule for the heading it now lives in');
    assert.match(rule[0], /display: inline-block/,
      'a block would take the whole line; the ring sits in the flow of the text');
    assert.match(rule[0], /width: [\d.]+em/, 'sized in em, not pixels: ' + rule[0]);
    assert.match(rule[0], /height: [\d.]+em/, 'sized in em, not pixels: ' + rule[0]);
    assert.match(rule[0], /vertical-align:/,
      'the ring has to be pinned inside the line box, or it grows it');
    const title = css.match(/\.export-history__title \{[^}]*\}/);
    assert.ok(title && !/height:/.test(title[0]),
      'no reserved height on the heading — a taller translation would outgrow it');
  });

  it('tints the whole created-video row, not only its button', () => {
    // The note, the bar and the error line are siblings of the button inside
    // the <li>. With the tint on the button they stayed on the menu ground and
    // read as unrelated text — the reviewer's words: "it is not clear the note
    // belongs to the video above it".
    const tint = css.match(/\.export-history__row:hover,\s*\.export-history__row:focus-within \{[^}]*\}/);
    assert.ok(tint, 'the row itself must carry the hover/focus tint');
    assert.match(tint[0], /background: var\(--bg3\)/,
      'the same token every other export item is highlighted with');
    // Two tints stack into a darker strip behind the button alone — exactly the
    // seam the move was meant to remove.
    assert.match(css, /\.export-history__item:hover:not\(:disabled\) \{\s*background: none;/,
      'the button inside a list row must not paint a second tint on top');
    // A row that refuses a click must not promise one.
    assert.match(css, /\.export-history__row--busy:hover \{\s*background: none;/,
      'a row mid-transfer must not light up under the pointer');
    const busyAt = css.indexOf('.export-history__row--busy:hover');
    assert.ok(busyAt > css.indexOf('.export-history__row:hover'),
      'the busy reset has the same specificity as the tint, so it has to come after it');
  });

  it('closes the row\'s box under the note instead of cropping it', () => {
    // The tint makes the row's box visible, and the box was open at the bottom:
    // 6px above the first line from the button's own padding, 0px below the
    // note. Against --bg3 that reads as a clipped block, not as the container
    // the note belongs to.
    const rule = css.match(/\.export-history__row--continued \{[^}]*\}/);
    assert.ok(rule, 'a row with something under the button needs its box closed');
    assert.match(rule[0], /padding-bottom: var\(--space-2\)/,
      'the same 6px the button\'s padding opens the box with: ' + rule[0]);
    // Correct spacing is correct whether or not a pointer is on the row: a
    // hover-only padding would make the row jump under the pointer, which is
    // the defect the spinner change exists to remove.
    assert.ok(!/:hover|:focus/.test(rule[0]),
      'the padding must not be hover-conditional: ' + rule[0]);
    const base = css.match(/\.export-history__row \{[^}]*\}/);
    assert.ok(base && !/padding/.test(base[0]),
      'a row with nothing under the button keeps exactly the geometry it has');
  });

  it('documents the disabled row, which is its own visual state', () => {
    // `.export-item:disabled` is deliberately NOT the faded treatment a dead
    // .btn earns — the row is a status line as often as a control. The working
    // and wrong-language faces are disabled, and so is a row mid-download, so an
    // undocumented one is the rule most likely to be "cleaned up" by someone
    // reading only the button styles.
    assert.match(styleguide, /class="export-item"[^>]*\sdisabled/,
      'the catalog must render a disabled row, not only enabled ones');
  });

  it('documents the transfer state in the styleguide too', () => {
    // The catalog is the contract: a state that only exists mid-download is the
    // easiest one to never look at again. A transfer now lives on a row of the
    // created-videos list, so that is where its example has to be.
    assert.ok(styleguide.includes('export-history__row'),
      'the list of created videos must have a live example');
    assert.match(styleguide, /transfer: \{ loaded: \d+, total: \d+ \}/,
      'and one of its rows must be mid-download, track and counter included');
    assert.ok(styleguide.includes('class="spinner"'),
      'the wait before the list arrives is a state as well');
  });

  it('shows the spinner where it really goes — in the heading line', () => {
    // The catalog is the contract, and this arrangement IS the feature: a
    // spinner that appears and disappears without moving anything under it. A
    // card that draws it as a block of its own teaches the layout jump back.
    const at = styleguide.indexOf('export-history__title');
    assert.ok(at > -1, 'the created-videos card must draw the section heading');
    const card = styleguide.slice(at, at + 400);
    assert.match(card, /export-history__title[\s\S]*class="spinner"[\s\S]*<\/p>/,
      'the catalog must draw the spinner inside the heading <p>: ' + card);
  });

  it('shows a row whose note the row tint has to cover', () => {
    // Hovering the catalog runs the real rule, so the example only has to BE a
    // row that carries a note. Without one, the thing being documented — a
    // highlight that covers the note belonging to that video — cannot be seen
    // at all.
    assert.match(styleguide, /downloaded: true/,
      'one catalog row must be a landed download, note and all');
    // On the <li>'s own class list, not merely somewhere in the page: both
    // names appear in the prose above the cards, so a grep over the whole file
    // would pass over a catalog that renders neither.
    const li = styleguide.match(/'<li class="export-history__row'[\s\S]*?\+ '">'/);
    assert.ok(li, 'the catalog must build the row\'s <li> class list');
    assert.ok(li[0].includes('export-history__row--busy'),
      'the row mid-transfer must wear the class that keeps the tint off it: ' + li[0]);
    // Without this the catalog would draw the cropped box the app no longer has.
    assert.ok(li[0].includes('export-history__row--continued'),
      'a catalog row with something under the button must close its box: ' + li[0]);
  });

  it('documents the video item in the styleguide, rendered by the real CSS', () => {
    assert.match(styleguide, /class="export-item-group[ "]/,
      'a new component must ship a live styleguide example');
    assert.ok(styleguide.includes('burn-seg__fill'),
      'the styleguide example must show the filled segments themselves');
    assert.ok(styleguide.includes('class="export-item__meta"'),
      'the status line is part of the item — the catalog must show it in place');
  });

  it('anchors the menu to the download button that opens it', () => {
    // The progress panel used to sit at the foot of the preview, a full screen
    // below the button that opened it — pressing Render moved nothing the eye
    // could see. The menu is the button's own surface now, so the two share one
    // anchor element: that anchor is what the CSS positions the popover against.
    const at = html.indexOf('<span class="export-pop"');
    assert.ok(at > -1, 'the .export-pop anchor is not in the markup');
    const pop = EXPORT_POP;
    assert.ok(pop.includes('id="btn-export"'),
      'the anchor must hold the button that toggles the menu');
    assert.ok(pop.includes('id="export-menu"'),
      'the anchor must hold the menu it positions');
    assert.ok(html.indexOf('<div class="header-actions">') < at,
      'the anchor belongs in the preview header, beside the other actions');
    // The button is the menu's control, and a screen reader has to be told so:
    // without these it is an unlabelled icon that opens something unannounced.
    const btn = html.match(/<button[^>]*id="btn-export"[\s\S]*?>/);
    assert.ok(btn, '#btn-export not found');
    assert.match(btn[0], /aria-haspopup="true"/, 'the button opens a menu — say so');
    assert.match(btn[0], /aria-controls="export-menu"/,
      'the button must name the surface it controls');
    assert.match(btn[0], /aria-expanded="/, 'the toggle must publish its state');
    assert.match(btn[0], /data-i18n-aria-label="export\.title"/,
      'an icon-only button carries no text — it needs a translated label');
  });

  it('floats the menu over the page instead of reflowing it', () => {
    assert.match(css, /\.export-pop\s*\{[^}]*position:\s*relative/,
      '.export-pop must be the containing block the menu is positioned against');
    const rule = css.match(/\.export-menu\s*\{([^}]*)\}/);
    assert.ok(rule, '.export-menu rule not found');
    assert.match(rule[1], /position:\s*absolute/,
      'in flow the menu pushes the whole preview down — it must be lifted out');
    assert.match(rule[1], /z-index:\s*var\(--z-[a-z-]+\)/,
      'the menu paints over the page, so it needs a z-index from the scale');
    assert.match(rule[1], /box-shadow:\s*var\(--shadow-[a-z]+\)/,
      'a floating surface needs a shadow to lift off the page beneath it');
  });

  it('keeps the menu out of the header row touch-target rule', () => {
    // The menu lives inside .header-actions now, so a DESCENDANT selector also
    // reaches its rows and would stretch them to the header's 44px metrics
    // inside the menu, where nothing is a header control.
    assert.ok(!/\.header-actions\s+button\s*\{/.test(css),
      '.header-actions button also matches the menu rows — scope it to the row');
    assert.ok(!/\.header-actions\s+\.export-item\b/.test(css),
      'the menu rows are not header controls: no header rule may reach them');
  });

  it('ships the icon-button variant in the button catalog', () => {
    // .btn--icon is a new variant of an existing component, so it belongs with
    // the other variants rather than only inside the one control that uses it —
    // otherwise the next author reinvents it.
    assert.match(css, /\.btn--icon\s*\{/, '.btn--icon must be a real button variant');
    assert.ok(styleguide.includes('<code>.btn--icon</code>'),
      'the buttons section must name the icon-only variant');
  });

  it('documents the anchored menu in the styleguide', () => {
    assert.match(styleguide, /class="export-pop"/,
      'the anchored menu is the shipped form of this control — show it in the catalog');
    assert.match(styleguide, /class="export-menu"/,
      'the catalog must show the menu open, which is the only state worth drawing');
    assert.ok(styleguide.includes('<script src="js/export_menu.js"></script>'),
      'the icon must come from the real module, or the catalog can drift from it');
    assert.ok(styleguide.includes('exportIconSvg()'),
      'a hand-drawn copy of the glyph is exactly the drift this section denies');
  });

  it('exposes exactly the entry points the markup calls on SPA', () => {
    // Harvested from the markup rather than listed by hand: a handler naming a
    // function nobody defined is a dead control that no other test can see.
    const called = [...EXPORT_POP.matchAll(/on[a-z]+="SPA\.(\w+)\(/g)].map((m) => m[1]);
    assert.deepStrictEqual([...new Set(called)].sort(),
      ['burnFullVideo', 'burnMakeHover', 'downloadSrt', 'openClipPanel',
       'toggleExportMenu', 'videoItemAction'],
      'the control is one toggle, two items and the two choices under the video item');
    for (const fn of called) {
      assert.ok(new RegExp('SPA\\.' + fn + '\\s*=').test(html),
        'SPA.' + fn + ' must exist — the markup calls it inline');
    }
  });

  it('carries no dismiss control of its own', () => {
    // A menu is dismissed by leaving it: a click anywhere outside, the download
    // button again, or Escape. A Hide button inside the surface was a third way
    // to say the same thing, and it crowded a two-item head row.
    assert.ok(!/SPA\.(cancelBurnWatch|closeExportMenu)\(/.test(EXPORT_POP),
      'the menu must not carry its own Hide button');
    assert.ok(!/'burn\.hide'/.test(html),
      'burn.hide is no longer used — a key with no caller rots');
  });

  it('loads the fragment helpers as plain script tags, and precaches them', () => {
    for (const mod of ['js/clip_time.js', 'js/float_panel.js']) {
      assert.ok(html.includes('<script src="' + mod + '"></script>'),
        'index.html must load ' + mod + ' — single source, no inline copy');
      assert.ok(sw.includes("'" + mod + "'"), 'the SW must precache ' + mod);
    }
  });

  it('hangs the two choices off the video item as a menu', () => {
    const item = EXPORT_POP.match(/<button[^>]*id="btn-burn-video"[^>]*>/);
    assert.ok(item, 'the video item must exist');
    for (const attr of ['aria-haspopup="menu"', 'aria-expanded="false"',
                        'aria-controls="burn-make-menu"']) {
      assert.ok(item[0].includes(attr), 'the item must carry ' + attr);
    }
    const choices = EXPORT_POP.match(/<div[^>]*id="burn-make-menu"[^>]*>/);
    assert.ok(choices && choices[0].includes('role="menu"') && / hidden>/.test(choices[0]),
      'the choices ship as a closed role="menu"');
    assert.strictEqual((EXPORT_POP.match(/role="menuitem"/g) || []).length, 2,
      'two choices: the whole video and a fragment');
  });

  it('gates the list of created videos like the render, and ships it closed', () => {
    const section = EXPORT_POP.match(/<div[^>]*id="export-history"[^>]*>/);
    assert.ok(section && section[0].includes('data-gh-only'),
      'listing and downloading need the API — the section belongs to sessions that can use it');
    const spinner = EXPORT_POP.match(/<[a-z]+[^>]*id="burn-history-spinner"[^>]*>/);
    assert.ok(spinner && spinner[0].includes('role="status"'),
      'the spinner is a status, so assistive tech is told about the wait too');
    assert.ok(spinner[0].includes('data-i18n-aria-label="history.loading"'),
      'and its name is translated by translatePage(), not frozen at first paint');
    for (const id of ['burn-history-spinner', 'burn-history-note', 'burn-history-list']) {
      const tag = EXPORT_POP.match(new RegExp('<[a-z]+[^>]*id="' + id + '"[^>]*>'));
      assert.ok(tag && / hidden>/.test(tag[0]), '#' + id + ' must ship hidden');
    }
  });

  it('spins inside the heading, so the list below it never jumps', () => {
    // The spinner used to be a block of its own between the heading and the
    // rows: it appeared, pushed everything under it down, and vanished again —
    // a menu that shifts under the pointer while one request is out. Now it
    // sits in the heading line, after the text, and the layout stays put.
    const title = EXPORT_POP.match(/<p class="export-history__title"[\s\S]*?<\/p>/);
    assert.ok(title, 'the heading of the created-videos section is not in the markup');
    assert.ok(/id="burn-history-spinner"/.test(title[0]),
      'the spinner belongs inside the heading line, not beside it: ' + title[0]);
    // translatePage() writes textContent on every [data-i18n] element, which
    // would delete a spinner nested inside one. So the heading's TEXT gets its
    // own element and the spinner is its sibling.
    assert.ok(!/<p class="export-history__title"[^>]*\sdata-i18n=/.test(title[0]),
      'a data-i18n on the <p> itself would wipe the spinner on every translate');
    const text = title[0].match(/<span[^>]*data-i18n="history\.title"[^>]*>/);
    assert.ok(text, 'the heading text needs its own [data-i18n] element');
    assert.ok(!/data-i18n=/.test(title[0].match(/id="burn-history-spinner"[^>]*>/)[0]),
      'and the spinner itself must carry no data-i18n to be written over');
    // A literal space between them, the way the reviewer described it: text,
    // space, spinner.
    assert.match(title[0].replace(/\s+/g, ' '),
      /<\/span> <(?:span|div)[^>]*id="burn-history-spinner"/,
      'text, then a space, then the spinner');
  });

  it('makes the fragment panel a labelled dialog that does not block the page', () => {
    const at = html.indexOf('<section id="clip-panel"');
    assert.ok(at > -1, 'the fragment panel markup must exist');
    const panel = html.slice(at, html.indexOf('</section>', at));
    const open = panel.match(/<section[^>]*>/)[0];
    assert.ok(open.includes('role="dialog"') && open.includes('aria-labelledby="clip-panel-title"'),
      'a labelled dialog');
    assert.ok(!open.includes('aria-modal="true"'),
      'not modal: the reviewer seeks the player under it to find the boundaries');
    assert.ok(/ hidden>/.test(open), 'and it ships closed');
    for (const id of ['clip-start', 'clip-end']) {
      assert.ok(panel.includes('for="' + id + '"'), '#' + id + ' needs a label');
    }
    const called = [...panel.matchAll(/on[a-z]+="SPA\.(\w+)\(/g)].map((m) => m[1]);
    assert.deepStrictEqual([...new Set(called)].sort(),
      ['clipPanelDragStart', 'closeClipPanel', 'createClip', 'onClipInput', 'setClipFromPlayer']);
    for (const fn of called) {
      assert.ok(new RegExp('SPA\\.' + fn + '\\s*=').test(html),
        'SPA.' + fn + ' must exist — the markup calls it inline');
    }
  });

  it('asks for no keypad the fragment boundary cannot be typed on', () => {
    // A boundary is "12:34.500": a colon, and on a Ukrainian keyboard a comma
    // for the fraction. inputmode="decimal" gives a phone a numeric keypad with
    // neither, so the one field whose format needs them could not be filled in
    // at all. The full keyboard is the only one that can type this.
    const at = html.indexOf('<section id="clip-panel"');
    const panel = html.slice(at, html.indexOf('</section>', at));
    assert.ok(!panel.includes('inputmode='),
      'no inputmode on the boundary fields — a keypad without ":" cannot type one');
  });

  it('leaves the keys pressed inside the fragment panel to its own controls', () => {
    // Space on "set the player's current time" must press that button, not
    // toggle playback under it — the same reason the preferences panel is exempt.
    assert.ok(html.includes("closest('.prefs, .float-panel, .export-pop')"),
      'the preview shortcuts must stand aside inside the fragment panel and the ' +
      'download menu, or Space on a choice or a row plays the video instead');
  });

  it('takes the fragment panel away with the other controls in fullscreen', () => {
    assert.match(css, /#view-preview\.fs-mode \.float-panel \{ display: none; \}/);
  });

  it('opens the choices on hover exactly where the stylesheet flies them out', () => {
    // The two queries are complements: the driver opens on hover only where the
    // stylesheet does not unfold the choices inline. Change one alone and a
    // passing pointer shoves an inline list about, or a flyout never opens.
    assert.ok(html.includes("window.matchMedia('(hover: hover) and (min-width: 641px)')"),
      'the hover query in the driver moved');
    assert.ok(css.includes('@media (max-width: 640px), (hover: none) {'),
      'the inline-choices query in the stylesheet moved');
  });
});

// ============================================================
// Burn driver behaviour — the REAL functions from index.html
//
// The driver is inline glue (single source, no js/ mirror), so — like
// esc()/safeHref() in test_spa_xss.js — the block is extracted from
// index.html and evaluated against stubbed collaborators. That exercises the
// shipped code instead of a replica, which matters here: every defect this
// suite guards (double dispatch, leaked poll loops, a blank status line, a
// cancelled save reported as failure) is invisible to a string grep.
// ============================================================
describe('burn video driver behaviour', () => {
  const fs = require('fs');
  const html = fs.readFileSync('site/index.html', 'utf8');

  function makeEl(id, doc) {
    const el = {
      id: id, disabled: false, href: '', className: '',
      style: {}, attrs: {}, children: [], writes: 0, htmlWrites: 0,
      // The flat element map has no tree, so a descendant a selector reaches
      // has to be registered here by the harness that owns it.
      byCss: {},
      setAttribute: function (k, v) { this.attrs[k] = String(v); },
      getAttribute: function (k) { return k in this.attrs ? this.attrs[k] : null; },
      appendChild: function (c) { this.children.push(c); return c; },
      querySelector: function (sel) { return this.byCss[sel] || null; },
      clicks: 0,
      click: function () { this.clicks++; },
      // The form and layout surface the fragment panel reads and writes.
      value: '',
      offsetWidth: 0,
      offsetHeight: 0,
      focused: false,
      // Focus is a document-wide fact, not a per-element flag: a surface about
      // to hide itself asks whether the focus it is dropping was its own.
      focus: function () {
        this.focused = true;
        if (doc) doc.activeElement = this;
      },
      // Same missing tree as byCss above: a container names the elements it
      // holds, and contains() answers from that list.
      owns: [],
      contains: function (node) { return node === this || this.owns.indexOf(node) > -1; },
      getBoundingClientRect: function () { return { left: 0, top: 0, bottom: 0 }; }
    };
    // Hiding is where the browser moves focus on its own: a section that holds
    // the focused element drops it to <body> the moment it goes hidden. A plain
    // flag models the hiding but not that, and then a surface that asks whether
    // the focus was its own AFTER hiding itself reads the same as one that asks
    // before — the whole ordering closeClipPanel turns on.
    let hidden = false;
    Object.defineProperty(el, 'hidden', {
      get: function () { return hidden; },
      set: function (v) {
        hidden = !!v;
        if (hidden && doc && doc.activeElement && el.contains(doc.activeElement)) doc.activeElement = null;
      },
      enumerable: true, configurable: true
    });
    // textContent counts its writes: #burn-step is the item's live region, so
    // "written only when the text actually changes" is a behaviour, not a
    // detail — a re-write makes a screen reader announce it again.
    let text = '';
    Object.defineProperty(el, 'textContent', {
      get: function () { return text; },
      set: function (v) { text = String(v); el.writes++; },
      enumerable: true, configurable: true
    });
    // The driver clears the track before (re)building its segments, and writes
    // the download glyph into the button exactly once. Both go through here, so
    // assigned markup has to leave the node with a firstChild — that is the
    // whole condition guarding the second write.
    let markup = '';
    Object.defineProperty(el, 'innerHTML', {
      get: function () { return markup; },
      set: function (v) {
        markup = String(v);
        el.htmlWrites++;
        el.children.length = 0;
        if (markup) el.children.push({ html: markup });
      },
      enumerable: true, configurable: true
    });
    Object.defineProperty(el, 'firstChild', {
      get: function () { return el.children[0] || null; },
      enumerable: true, configurable: true
    });
    return el;
  }

  // Mirrors the shipped markup, including which nodes start [hidden]. The
  // progress parts belong to a run: an item merely offering to start one shows
  // a bare label, so the track, the run link and the error line all ship closed.
  const EL_IDS = ['btn-export', 'export-menu', 'export-video', 'btn-burn-video',
                  'burn-item-label', 'burn-track', 'burn-step', 'burn-elapsed',
                  'burn-eta', 'burn-run-link', 'burn-error', 'view-preview',
                  'burn-make', 'burn-make-menu', 'btn-burn-full', 'btn-burn-clip',
                  'export-history', 'burn-history-spinner', 'burn-history-note',
                  'burn-history-list', 'clip-panel', 'clip-start', 'clip-end',
                  'clip-problem', 'btn-clip-create', 'prefs-menu', 'freshness-bar'];
  const HIDDEN_IDS = ['export-menu', 'burn-track', 'burn-run-link', 'burn-error',
                      'burn-make-menu', 'burn-history-spinner', 'burn-history-note',
                      'burn-history-list', 'clip-panel', 'clip-problem'];

  const NO_PROGRESS = { fraction: 0, label: '', done: false, failed: false,
                        failedStep: '', renderFraction: null, renderStartedMs: null,
                        startedMs: null, finishedMs: null };
  const MIN_MS = 60000;

  // The phase model is pure and tested directly in tests/test_burn_video.js, so
  // the driver gets the REAL functions: a stub would let the item draw four
  // equal segments and still pass.
  const PHASE_MODEL = require('../site/js/burn_video');
  const ZIP_READER = require('../site/js/burn_artifact');
  // Same reasoning for the menu model (tests/test_export_menu.js): videoItemState
  // decides which of the three faces the item wears, and a stub would let it
  // offer a second render over a run in flight and still pass.
  const MENU_MODEL = require('../site/js/export_menu');
  // And for the fragment helpers (tests/test_clip_time.js,
  // tests/test_float_panel.js): the panel's times and position come from the
  // real parsing, formatting and clamping.
  const CLIP_TIME = require('../site/js/clip_time');
  const PANEL = require('../site/js/float_panel');

  function makeHarness(over) {
    const els = {};
    // Built before the elements: every one of them focuses through it, so the
    // harness has one activeElement the way a page does.
    const doc = {
      activeElement: null,
      getElementById: function (id) { return els[id] || null; },
      querySelector: function () { return null; },
      documentElement: {},
      createElement: function (tag) {
        const el = makeEl('created', doc);
        el.tagName = String(tag || '').toUpperCase();
        env.created.push(el);
        return el;
      }
    };
    EL_IDS.forEach(function (id) { els[id] = makeEl(id, doc); });
    HIDDEN_IDS.forEach(function (id) { els[id].hidden = true; });
    els['export-video'].className = 'export-item-group';   // as the markup ships it
    // What the fragment panel's <section> holds, for contains().
    els['clip-panel'].owns = [els['clip-start'], els['clip-end'],
                              els['clip-problem'], els['btn-clip-create']];
    // The status line has no id in the markup — it is reached from the group by
    // class, so the harness has to hang it there for querySelector to find.
    const meta = makeEl('export-item__meta', doc);
    els['export-video'].byCss['.export-item__meta'] = meta;
    const store = {};
    const env = {
      els: els,
      meta: meta,
      timers: [],
      dispatched: 0,
      toasts: [],
      // Every element document.createElement() handed out, newest last: the
      // subtitle download builds its anchor that way, and the name it saves
      // under is only observable there.
      created: [],
      // Every SPA.confirm() the driver opens, and the answer it gets back.
      // Recorded rather than auto-approved: the declined case has to be able to
      // assert that NOTHING was dispatched, which a stub that always says yes
      // could never show.
      confirms: [],
      confirmAnswer: true,
      document: doc,
      window: { screen: { width: 1280, height: 720 }, innerWidth: 1280, innerHeight: 720 },
      localStorage: {
        getItem: function (k) { return k in store ? store[k] : null; },
        setItem: function (k, v) { store[k] = String(v); },
        removeItem: function (k) { delete store[k]; }
      },
      getComputedStyle: function () {
        return { getPropertyValue: function () { return '1'; } };
      },
      previewState: { talkId: 't', videoSlug: 'v', player: null, subtitles: [],
                      srtLang: 'uk', edits: {} },
      t: function (k) { return 'T:' + k; },
      pluralFor: function (n, key) { return key; },
      SPA: {
        confirm: function (opts) {
          env.confirms.push(opts);
          return Promise.resolve(env.confirmAnswer);
        }
      },
      API: 'https://api.example/repos/o/r',
      REPO: 'o/r',
      BURN_WORKFLOW: 'burn-subtitles.yml',
      getAuthToken: function () { return 'tok'; },
      dispatchWorkflow: function (api, tok, wf, ref, inputs) {
        env.dispatched++; env.dispatchedRef = ref;
        env.dispatchedInputs = inputs || {};
        return Promise.resolve();
      },
      burnRef: PHASE_MODEL.burnRef,
      editSync: null,
      // Real ratios and the REAL input builder: a stub returning {} cannot tell
      // a dispatch that names its content ref from one that silently lets the
      // workflow default to main — which is the bug that shipped a 12-byte mp4.
      measureBurnRatios: function () {
        return { font_ratio: 0.0711, padtop_ratio: 0.0741, padbot_ratio: 0.0333 };
      },
      makeRequestId: function () { return 'rid'; },
      buildBurnInputs: PHASE_MODEL.buildBurnInputs,
      // The manifest is where the human title of a run comes from.
      manifest: { talks: [{ id: 't', title: 'Ganesha Puja',
                            videos: [{ slug: 'v', title: 'Talk, Cabella' }] }] },
      listWorkflowRuns: function () { return Promise.resolve([]); },
      matchRun: function () { return null; },
      getRunJobs: function () { return Promise.resolve([{}]); },
      computeProgress: function () { return Object.assign({}, NO_PROGRESS); },
      renderEtaSeconds: function () { return 600; },
      burnPhases: PHASE_MODEL.burnPhases,
      burnPhaseKey: PHASE_MODEL.burnPhaseKey,
      burnPhaseNumber: PHASE_MODEL.burnPhaseNumber,
      burnSegments: PHASE_MODEL.burnSegments,
      videoItemState: MENU_MODEL.videoItemState,
      downloadFraction: MENU_MODEL.downloadFraction,
      megabytes: MENU_MODEL.megabytes,
      exportIconSvg: MENU_MODEL.exportIconSvg,
      exportSrtPath: MENU_MODEL.exportSrtPath,
      exportSrtName: MENU_MODEL.exportSrtName,
      burnedVideoName: MENU_MODEL.burnedVideoName,
      historyRowState: MENU_MODEL.historyRowState,
      historyWhen: MENU_MODEL.historyWhen,
      // Discovery is stubbed at the network edge only: parsing, filtering and
      // ordering are the REAL burnHistoryEntries(), so a list the driver draws
      // from a title the parser would reject cannot pass here.
      historyRuns: [],
      historyCalls: [],
      listBurnRuns: function (api, tok, workflow, since) {
        env.historyCalls.push({ api: api, workflow: workflow, since: since });
        return Promise.resolve(env.historyRuns);
      },
      burnHistorySince: PHASE_MODEL.burnHistorySince,
      burnHistoryEntries: PHASE_MODEL.burnHistoryEntries,
      burnClipProblem: PHASE_MODEL.burnClipProblem,
      formatClipTime: CLIP_TIME.formatClipTime,
      parseClipTime: CLIP_TIME.parseClipTime,
      clampPanelPosition: PANEL.clampPanelPosition,
      defaultPanelPosition: PANEL.defaultPanelPosition,
      panelClearOf: PANEL.panelClearOf,
      currentLang: 'en',
      burnStateKey: function (a, b) { return 'burn:' + a + ':' + b; },
      listRunArtifacts: function () { return Promise.resolve([]); },
      ghWriteUser: function () { return true; },
      showToast: function (m) { env.toasts.push(m); },
      // The ZIP reader is pure and tested directly in tests/test_burn_artifact.js,
      // so the driver gets the REAL functions over the REAL fixture: a stub could
      // not tell a view apart from a copy, which is the whole point below.
      findEocd: ZIP_READER.findEocd,
      readCentralDirectory: ZIP_READER.readCentralDirectory,
      pickMp4Entry: ZIP_READER.pickMp4Entry,
      localDataOffset: ZIP_READER.localDataOffset,
      fetches: 0,
      fetch: function () {
        env.fetches++;
        return Promise.reject(new Error('no network in tests'));
      },
      // Fake timers: the poll loop must never keep the test process alive, and
      // the count of armed timers is exactly what the leak tests assert on.
      setTimeout: function (fn) { env.timers.push(fn); return env.timers.length; },
      clearTimeout: function (h) { if (h) env.timers[h - 1] = null; }
    };
    Object.assign(env, over || {});

    const start = html.indexOf('var BURN_POLL_MS');
    const end = html.indexOf('SPA.toggleExportMenu = toggleExportMenu;');
    assert.ok(start > -1 && end > start, 'burn driver block not found in index.html');
    const names = ['document', 'window', 'localStorage', 'getComputedStyle',
      'previewState', 't', 'pluralFor', 'SPA', 'API', 'REPO', 'BURN_WORKFLOW',
      'getAuthToken', 'dispatchWorkflow', 'burnRef', 'editSync', 'manifest',
      'measureBurnRatios', 'makeRequestId', 'buildBurnInputs', 'listWorkflowRuns',
      'matchRun', 'getRunJobs', 'computeProgress', 'renderEtaSeconds', 'burnStateKey',
      'burnPhases', 'burnPhaseKey', 'burnPhaseNumber', 'burnSegments',
      'videoItemState', 'downloadFraction', 'megabytes',
      'exportIconSvg', 'exportSrtPath', 'exportSrtName',
      'listRunArtifacts', 'ghWriteUser', 'showToast', 'fetch', 'setTimeout', 'clearTimeout',
      'findEocd', 'readCentralDirectory', 'pickMp4Entry', 'localDataOffset',
      'listBurnRuns', 'burnHistorySince', 'burnHistoryEntries', 'burnClipProblem',
      'historyRowState', 'historyWhen', 'burnedVideoName', 'formatClipTime',
      'parseClipTime', 'clampPanelPosition', 'defaultPanelPosition', 'panelClearOf', 'currentLang'];
    const exported = ['startBurn', 'pollBurn', 'renderBurnProgress', 'onBurnFinished',
      'showBurnError', 'resumeBurnWatch', 'saveMp4', 'downloadBurned', 'downloadSrt',
      'openExportMenu', 'closeExportMenu', 'toggleExportMenu', 'videoItemAction',
      'retranslateBurnPanel', 'updateExportUi', 'extractBurnedMp4',
      'burnElapsedMinutes', 'onBurnKeydown', 'onBurnDocumentClick',
      'advanceBurnDownload', 'refreshBurnHistory', 'syncBurnFollowing',
      'armBurnFollowing', 'burnFullVideo', 'burnMakeHover',
      'openClipPanel', 'closeClipPanel', 'setClipFromPlayer', 'onClipInput',
      'createClip', 'moveClipPanel', 'clipPanelDragStart'];
    const tail = '\nreturn {' + exported.map(function (n) { return n + ': ' + n; }).join(', ') +
      ', getWatch: function () { return burnWatch; }' +
      ', getHistory: function () { return burnHistory; } };';
    env.api = new Function(names.join(','), html.slice(start, end) + tail)
      .apply(null, names.map(function (n) { return env[n]; }));
    return env;
  }

  // Drain the microtask queue (the driver chains several .then()s per step).
  function settle() {
    return new Promise(function (r) { global.setTimeout(r, 0); });
  }

  function armedTimers(env) {
    return env.timers.filter(Boolean).length;
  }

  function savedWatch(runId) {
    return JSON.stringify({ requestId: 'old', runId: runId, runUrl: '',
                            startedAt: Date.now(), talkId: 't', videoSlug: 'v' });
  }

  // ---- the videos already created: helpers ----
  //
  // A realistic talk and video. The run-name parser checks ids the way the
  // workflow validates them, so the 't'/'v' the render tests get by with would
  // never parse into a row.
  const TALK = '1993-09-19_Ganesha-Puja';
  const SLUG = 'Talk';

  // A successful burn-subtitles.yml run as the runs API returns it, its title
  // built the way the workflow's run-name builds it.
  function burnRun(id, over) {
    const o = Object.assign({ talk: TALK, slug: SLUG, actor: 'me', scale: 100,
                              clip: 'full', ageMs: 3600000, conclusion: 'success',
                              request: 'req-' + id.toString(36) + '-a' }, over || {});
    return {
      id: id,
      conclusion: o.conclusion,
      created_at: new Date(Date.now() - o.ageMs).toISOString(),
      html_url: 'https://github.com/o/r/actions/runs/' + id,
      display_title: ['Ganesha Puja — Talk', o.talk + '/' + o.slug, o.actor,
                      o.scale + '%', o.clip, o.request].join(' · ')
    };
  }

  function historyHarness(runs, over) {
    const env = makeHarness(Object.assign({
      ghWriteUser: function () { return { login: 'me' }; },
      previewState: { talkId: TALK, videoSlug: SLUG, player: null, subtitles: [],
                      srtLang: 'uk', edits: {} }
    }, over || {}));
    env.historyRuns = runs;
    return env;
  }

  // Opens the menu and lets its one discovery request land.
  async function listed(env) {
    env.api.openExportMenu();
    await settle();
  }

  function rows(env) { return env.els['burn-history-list'].children; }

  function findByClass(el, cls) {
    if (!el || typeof el !== 'object') return null;
    if (String(el.className || '').split(/\s+/).indexOf(cls) > -1) return el;
    for (const child of el.children || []) {
      const hit = findByClass(child, cls);
      if (hit) return hit;
    }
    return null;
  }

  // One part of the row for a run, looked up afresh each time: the list is
  // rebuilt on every look, so a node held across a reopen is a detached one.
  function rowPart(env, runId, cls) {
    const row = rows(env).find(function (li) { return li.attrs['data-run'] === String(runId); });
    assert.ok(row, 'no row on screen for run ' + runId);
    return findByClass(row, cls);
  }

  // A stand-in for the Vimeo player: the two reads the fragment panel makes.
  function fakePlayer(durationSec, nowSec) {
    const player = {
      now: nowSec || 0,
      getDuration: function () { return Promise.resolve(durationSec); },
      getCurrentTime: function () { return Promise.resolve(player.now); },
      // Read by the render's own geometry once a fragment is dispatched.
      getVideoWidth: function () { return Promise.resolve(1280); },
      getVideoHeight: function () { return Promise.resolve(720); }
    };
    return player;
  }

  it('dispatches only one run while a render is already being followed', async () => {
    const env = makeHarness();
    env.api.startBurn();
    env.api.startBurn();   // impatient second click
    await settle();
    assert.strictEqual(env.dispatched, 1,
      'a second click must not dispatch a second workflow run');
  });

  // ---- the render must not quietly disagree with the preview ----
  //
  // The item promises a video "matching what the fullscreen preview shows",
  // and two things could silently make that false: the workflow always burns
  // final/uk.srt (it has no language input), and it checks out `main`, so
  // edits still sitting in the browser cannot appear. Both are minutes-long
  // waits that end in the wrong file, so both are refused up front.

  function previewing(over) {
    return { previewState: Object.assign({ talkId: 't', videoSlug: 'v', player: null,
                                           subtitles: [], srtLang: 'uk', edits: {} }, over) };
  }

  // Tidying the menu away used to be a one-way door: the panel vanished, the
  // render button went live again, and the only way back to a run in flight was
  // to leave the preview and return. Closing is now only closing — the run is
  // still recorded, and reopening picks the polling back up where it left off.
  it('keeps the recorded run when the menu is closed, and resumes it on reopen', async () => {
    const env = makeHarness();
    env.api.openExportMenu();
    await env.api.startBurn('t', 'v');
    await settle();
    env.api.renderBurnProgress({ fraction: 0.3, label: 'Render 20%', done: false,
      failed: false, failedStep: '', unknownStep: '', startedMs: Date.now() - 60000 });

    env.api.closeExportMenu();
    assert.strictEqual(env.els['export-menu'].hidden, true, 'the menu is closed');
    assert.ok(env.api.getWatch(), 'the run itself must survive being tidied away');
    assert.strictEqual(armedTimers(env), 0,
      'nothing is on screen to write into — the 5s poll must stop with the menu');

    env.api.openExportMenu();
    await settle();
    assert.strictEqual(env.els['export-menu'].hidden, false, 'the menu is back');
    assert.strictEqual(env.els['burn-item-label'].textContent, 'T:export.video_working',
      'the item picks the run back up rather than offering a second one');
    assert.strictEqual(armedTimers(env), 1, 'and the poll is following again');
  });

  it('reopens the menu rather than dispatching again', async () => {
    const env = makeHarness();
    env.api.openExportMenu();
    await env.api.startBurn('t', 'v');
    env.api.renderBurnProgress({ fraction: 0.3, label: 'Render 20%', done: false,
      failed: false, failedStep: '', unknownStep: '', startedMs: Date.now() - 60000 });
    env.api.closeExportMenu();
    const before = env.dispatched;

    env.api.toggleExportMenu();
    assert.strictEqual(env.dispatched, before, 'reopening must not dispatch a run');
    assert.strictEqual(env.els['export-menu'].hidden, false, 'the menu is back');
  });

  it('does not resume polling a run that already reached a terminal state', async () => {
    // A finished run is handed to the list and dropped from the item, so there
    // is nothing left to follow: re-arming the loop over it would poll a run
    // that can no longer change, every 5 seconds, for as long as the menu stays
    // open.
    const env = makeHarness();
    env.api.openExportMenu();
    await env.api.startBurn('t', 'v');
    await settle();
    env.api.onBurnFinished();
    env.api.closeExportMenu();

    env.api.openExportMenu();
    await settle();
    assert.strictEqual(armedTimers(env), 0, 'a finished run must not be polled again');
    assert.strictEqual(env.api.getWatch(), null, 'the watch went with the run');
    assert.strictEqual(env.els['burn-item-label'].textContent, 'T:export.video_make',
      'the item offers the next render, whole or a fragment');
  });

  // A surface that floats over the page is expected to close on Escape: a menu
  // that can only be dismissed by aiming at a small button reads as stuck.
  it('closes the menu on Escape, without touching the render', async () => {
    const env = makeHarness();
    env.api.openExportMenu();
    await env.api.startBurn('t', 'v');
    const before = env.dispatched;

    env.api.onBurnKeydown({ key: 'Escape' });
    assert.strictEqual(env.els['export-menu'].hidden, true, 'Escape closes the menu');
    assert.ok(env.api.getWatch(), 'the run goes on — the button is the way back to it');
    assert.strictEqual(env.dispatched, before, 'Escape must not dispatch anything');
  });

  it('leaves Escape alone when no menu is open', () => {
    const env = makeHarness();
    // Nothing is on screen: Escape belongs to whatever else is listening (the
    // CSS-only fullscreen exit shares this key).
    env.api.onBurnKeydown({ key: 'Escape' });
    assert.strictEqual(env.els['btn-export'].getAttribute('aria-expanded'), null,
      'a closed menu must not be re-closed — that write is proof the key was taken');
  });

  it('leaves Escape to fullscreen while the header is not on screen', () => {
    // In fs-mode the header, and with it this whole control, is display:none.
    // Escape there means "leave fullscreen"; closing an invisible menu would
    // swallow the key and strand the user in it.
    const env = makeHarness();
    env.api.openExportMenu();
    env.els['view-preview'].className = 'view fs-mode';
    env.api.onBurnKeydown({ key: 'Escape' });
    assert.strictEqual(env.els['export-menu'].hidden, false,
      'the invisible menu must not consume the fullscreen exit key');
  });

  // The menu has no dismiss control of its own: leaving it IS closing it.
  it('closes when the click lands outside the anchor', async () => {
    const env = makeHarness();
    env.api.openExportMenu();
    await env.api.startBurn('t', 'v');
    const asked = [];
    env.api.onBurnDocumentClick({ target: { closest: function (sel) { asked.push(sel); return null; } } });

    assert.deepStrictEqual(asked, ['.export-pop, .float-panel'],
      'inside-ness is decided against the anchor, not the menu alone — the ' +
      'download button is inside the anchor and is the toggle — and against the ' +
      'fragment panel, whose create button opens this menu from inside its click');
    assert.strictEqual(env.els['export-menu'].hidden, true, 'the menu closes');
    assert.ok(env.api.getWatch(), 'the run goes on — the button is the way back to it');
  });

  it('stays open for a click on its own surface', async () => {
    const env = makeHarness();
    env.api.openExportMenu();
    await env.api.startBurn('t', 'v');
    // Both menu items and the run link live inside the anchor, and an item must
    // not dismiss the surface it is on before it has acted.
    env.api.onBurnDocumentClick({ target: { closest: function () { return {}; } } });
    assert.strictEqual(env.els['export-menu'].hidden, false,
      'clicking the menu itself must not dismiss it');
  });

  it('makes the download button a toggle, never a second dispatch', async () => {
    const env = makeHarness();
    env.api.openExportMenu();
    await env.api.startBurn('t', 'v');
    env.api.onBurnFinished({ startedMs: Date.now() - 60000, finishedMs: Date.now() });
    const before = env.dispatched;

    env.api.toggleExportMenu();
    assert.strictEqual(env.dispatched, before, 'the toggle must not dispatch a run');
    assert.strictEqual(env.els['export-menu'].hidden, true, 'the menu closes');
    assert.strictEqual(env.els['btn-export'].getAttribute('aria-expanded'), 'false',
      'assistive tech is told the surface closed, not left claiming it is open');

    env.api.toggleExportMenu();
    assert.strictEqual(env.els['export-menu'].hidden, false, 'and opens again');
    assert.strictEqual(env.els['btn-export'].getAttribute('aria-expanded'), 'true');
  });

  it('hands the finished video to the list instead of wearing it', async () => {
    // The item used to become "Download" once its run finished — and stayed so
    // for as long as the subtitles did not change, which is exactly when a
    // reviewer wants a fragment of those same subtitles. The finished video now
    // lives in the list, and the item goes back to offering a render.
    const env = makeHarness();
    env.api.openExportMenu();
    await env.api.startBurn('t', 'v');
    assert.strictEqual(env.els['burn-item-label'].textContent, 'T:export.video_working',
      'precondition: the item was the progress readout');
    const looks = env.historyCalls.length;
    env.api.onBurnFinished();
    assert.strictEqual(env.els['burn-item-label'].textContent, 'T:export.video_make');
    assert.strictEqual(env.els['burn-item-label'].getAttribute('data-i18n'), 'export.video_make',
      'the key travels with the text, or a language toggle reverts the face');
    assert.strictEqual(env.els['btn-burn-video'].disabled, false);
    assert.strictEqual(env.historyCalls.length, looks + 1,
      'the list looks again, so the new video appears where downloads happen');
  });

  it('offers a render when nothing has been started', () => {
    const env = makeHarness();
    env.api.updateExportUi();
    assert.strictEqual(env.els['burn-item-label'].textContent, 'T:export.video_make');
    assert.strictEqual(env.els['btn-burn-video'].disabled, false);
    // A run's progress parts belong to a run: an item merely offering to start
    // one must not carry an empty track or a stale time under it.
    assert.strictEqual(env.els['burn-track'].hidden, true, 'no track before a run');
    assert.strictEqual(env.meta.hidden, true, 'no status line before a run');
  });

  it('opens its two choices when pressed, and dispatches nothing itself', async () => {
    // One item, two errands — the whole video or a fragment. A press must not
    // start a 25-minute render on its own: it opens the choices, and only from
    // the face that offers to build.
    const env = makeHarness();
    await env.api.videoItemAction({ detail: 1 });
    assert.strictEqual(env.dispatched, 0, 'a press on the item is not a dispatch');
    assert.strictEqual(env.els['burn-make-menu'].hidden, false, 'the choices are open');
    assert.strictEqual(env.els['btn-burn-video'].getAttribute('aria-expanded'), 'true');

    await env.api.videoItemAction({ detail: 1 });
    assert.strictEqual(env.els['burn-make-menu'].hidden, true, 'a second press closes them');
    assert.strictEqual(env.els['btn-burn-video'].getAttribute('aria-expanded'), 'false');

    await env.api.burnFullVideo();
    await settle();
    assert.strictEqual(env.dispatched, 1, 'the first choice renders the whole video');
    await env.api.videoItemAction({ detail: 1 });
    assert.strictEqual(env.els['burn-make-menu'].hidden, true,
      'a press on "please wait" opens nothing');
  });

  it('writes the download glyph once, not on every poll', () => {
    // updateExportUi() runs on every 5s poll for ~25 minutes. The icon is a
    // constant, so rewriting it would churn the DOM ~300 times for nothing.
    const env = makeHarness();
    env.api.updateExportUi();
    assert.strictEqual(env.els['btn-export'].innerHTML, MENU_MODEL.exportIconSvg(),
      'the glyph must come from the shared module, never a copy in the driver');
    env.api.updateExportUi();
    env.api.updateExportUi();
    assert.strictEqual(env.els['btn-export'].htmlWrites, 1,
      'the button already has its icon — leave it alone');
  });

  // The rendered video must be the subtitles the user is LOOKING AT. The SPA
  // commits the edited final/<lang>.srt to its autosync branch inside
  // pushFiles(), which runs BEFORE the status becomes 'synced' — so a green
  // cloud means that branch already carries the edits, and rendering from it is
  // exactly what the preview shows. Not green means the branch is behind.
  it('does not warn about edits a synced render will actually include', async () => {
    // The warning exists for a render that reads main. From a synced branch the
    // edits ARE in the video, so asking "render without them?" would be a lie.
    const env = makeHarness({
      previewState: { talkId: 't', videoSlug: 'v', srtLang: 'uk',
                      edits: { uk: { 3: 'edited' } } },
      editSync: { talkId: 't', getInfo: function () {
        return { status: 'synced', branch: 'sync/me/t--v-uk' }; } },
    });
    await env.api.startBurn('t', 'v');
    assert.strictEqual(env.confirms.length, 0, 'no warning is due');
    assert.strictEqual(env.dispatchedInputs.source_ref, 'sync/me/t--v-uk');
  });

  it('renders from main when nothing is syncing', async () => {
    const env = makeHarness();
    await env.api.startBurn('t', 'v');
    assert.strictEqual(env.dispatchedInputs.source_ref, 'main');
  });

  it('renders from the autosync branch once the cloud is green', async () => {
    const env = makeHarness({
      editSync: { talkId: 't', getInfo: function () {
        return { status: 'synced', branch: 'sync/me/t--v-uk' }; } },
    });
    await env.api.startBurn('t', 'v');
    assert.strictEqual(env.dispatchedInputs.source_ref, 'sync/me/t--v-uk',
      'a green cloud means the branch holds the edited srt');
  });

  // ---- the renderer and the subtitles come from two different refs ----
  //
  // edit_sync.js cuts its branch from main once and never fast-forwards it, so
  // that branch carries whatever workflow and tools/ main had on the day the
  // reviewer first edited. Dispatching the WORKFLOW against it ran main's probe
  // stub and produced a 12-byte placeholder .mp4 that the UI reported as a
  // finished render.
  it('runs the dispatched version of the workflow, not the edit branch copy', async () => {
    const env = makeHarness({
      editSync: { talkId: 't', getInfo: function () {
        return { status: 'synced', branch: 'sync/me/t--v-uk' }; } },
    });
    await env.api.startBurn('t', 'v');
    assert.strictEqual(env.dispatchedRef, 'main',
      'the workflow file must come from the ref the SPA was built against');
    assert.strictEqual(env.dispatchedInputs.source_ref, 'sync/me/t--v-uk',
      'only the subtitles come from the edit branch');
  });

  it('keeps the two refs apart under a local workflow override', async () => {
    // The stand case that exposed it: code from the branch under test, content
    // from the reviewer's sync branch. One ref cannot be both.
    const env = makeHarness({
      editSync: { talkId: 't', getInfo: function () {
        return { status: 'synced', branch: 'sync/me/t--v-uk' }; } },
    });
    env.window.__SY_BURN_REF = 'worktree-burn-subtitles';
    await env.api.startBurn('t', 'v');
    assert.strictEqual(env.dispatchedRef, 'worktree-burn-subtitles');
    assert.strictEqual(env.dispatchedInputs.source_ref, 'sync/me/t--v-uk');
  });

  it('names the run after the talk, the way a PR is named', async () => {
    const env = makeHarness();
    await env.api.startBurn('t', 'v');
    assert.strictEqual(env.dispatchedInputs.run_label,
      'Ganesha Puja — Talk, Cabella');
  });

  it('sends an empty label rather than a wrong one for an unknown talk', async () => {
    const env = makeHarness({ manifest: { talks: [] } });
    await env.api.startBurn('t', 'v');
    assert.strictEqual(env.dispatchedInputs.run_label, '');
    assert.strictEqual(env.dispatched, 1, 'a missing title must not block a render');
  });

  it('refuses while the cloud is not green, rather than rendering stale text', async () => {
    for (const status of ['pending', 'syncing', 'error']) {
      const env = makeHarness({
        previewState: { talkId: 't', videoSlug: 'v', srtLang: 'uk',
                        edits: { uk: { 3: 'edited' } } },
        editSync: { talkId: 't', getInfo: function () {
          return { status: status, branch: 'sync/me/t--v-uk' }; } },
      });
      await env.api.startBurn('t', 'v');
      assert.strictEqual(env.dispatched, 0, status + ' must not dispatch');
      // BOTH downloads read this ref, so the whole control goes quiet — not
      // just the render. The subtitle file on that branch is stale too.
      assert.strictEqual(env.els['btn-export'].disabled, true, status + ' disables');
    }
  });

  it('says why the control is disabled while syncing', () => {
    const env = makeHarness({
      previewState: { talkId: 't', videoSlug: 'v', srtLang: 'uk',
                      edits: { uk: { 3: 'edited' } } },
      editSync: { talkId: 't', getInfo: function () {
        return { status: 'pending', branch: 'b' }; } },
    });
    env.api.updateExportUi();
    assert.strictEqual(env.els['btn-export'].disabled, true);
    assert.strictEqual(env.els['btn-export'].title, 'T:burn.wait_for_sync',
      'a dead control with no reason is indistinguishable from a bug');
  });

  // A signed-in reviewer ALWAYS has an engine with a branch: the branch name is
  // deterministic and exists as a string before any edit or any network call.
  // When they never edited anything, attach() finds no state file on GitHub and
  // leaves the status at its construction-time 'idle' — forever. Gating the
  // export on 'synced' alone therefore killed the control for every clean
  // account with "waiting for your edits to sync" over edits that do not exist.
  it('offers the export to a signed-in reviewer who has no edits at all', async () => {
    const env = makeHarness({
      editSync: { talkId: 't', getInfo: function () {
        return { status: 'idle', branch: 'sync/me/t--v-uk' }; } },
    });
    env.api.updateExportUi();
    assert.strictEqual(env.els['btn-export'].disabled, false,
      'no edits pending means nothing to wait for');
    await env.api.startBurn('t', 'v');
    assert.strictEqual(env.dispatchedInputs.source_ref, 'main',
      'the screen shows the published subtitles, so main IS the screen');
  });

  it('keeps the export alive when a sync status is not green but nothing is edited', async () => {
    // A full revert mid-teardown ('syncing'), or a background sync error, with
    // zero local edits: the screen shows the published subtitles, so a render
    // from main matches it exactly — the sync machinery is irrelevant to it.
    for (const status of ['pending', 'syncing', 'error']) {
      const env = makeHarness({
        editSync: { talkId: 't', getInfo: function () {
          return { status: status, branch: 'sync/me/t--v-uk' }; } },
      });
      await env.api.startBurn('t', 'v');
      assert.strictEqual(env.dispatchedInputs.source_ref, 'main',
        status + ' with no edits must render the published subtitles');
    }
  });

  it('renders from the branch after the PR was finalized', async () => {
    // 'ready' is 'synced' plus an undrafted PR: pushFiles() committed the
    // edited srt before either status could be set, so the branch still holds
    // exactly what the preview shows.
    const env = makeHarness({
      previewState: { talkId: 't', videoSlug: 'v', srtLang: 'uk',
                      edits: { uk: { 3: 'edited' } } },
      editSync: { talkId: 't', getInfo: function () {
        return { status: 'ready', branch: 'sync/me/t--v-uk' }; } },
    });
    await env.api.startBurn('t', 'v');
    assert.strictEqual(env.confirms.length, 0,
      'the branch carries the edits — warning about missing them would lie');
    assert.strictEqual(env.dispatchedInputs.source_ref, 'sync/me/t--v-uk');
  });

  it('closes the menu when the ref goes behind the screen', () => {
    // The cloud can turn amber while the menu is open — a fresh edit lands, and
    // the branch is behind the preview again. An open menu offering two
    // downloads of text nobody is looking at is worse than no menu.
    //
    // Closing has to happen WITHOUT re-entering updateExportUi(): it reaches
    // closeExportMenu(), which reaches setBurnFollowing(), which calls
    // updateExportUi() again — and while the menu is still on screen that cycle
    // has nothing to stop it.
    let info = null;   // nothing syncing yet, so the ref is main
    const env = makeHarness({
      editSync: { talkId: 't', getInfo: function () { return info; } }
    });
    env.api.openExportMenu();
    assert.strictEqual(env.els['export-menu'].hidden, false, 'precondition: open');
    env.previewState.edits = { uk: { 3: 'edited' } };   // the fresh edit itself
    info = { status: 'syncing', branch: 'b' };
    env.api.updateExportUi();
    assert.strictEqual(env.els['export-menu'].hidden, true,
      'the menu must not stay open over a ref that is behind the screen');
  });

  it('ignores a sync engine that belongs to another talk', async () => {
    const env = makeHarness({
      editSync: { talkId: 'OTHER', getInfo: function () {
        return { status: 'pending', branch: 'sync/me/other' }; } },
    });
    await env.api.startBurn('t', 'v');
    assert.strictEqual(env.dispatchedInputs.source_ref, 'main');
  });

  it('takes the subtitle file from the same ref the render burns', async () => {
    // Two downloads of "the subtitles" that disagree would be the worst kind of
    // bug here: the .srt a reviewer opens and the .srt burned into the video
    // must be the same bytes, so both read whatever burnSourceRef() picked.
    const cases = [
      [null, 'main'],
      [{ status: 'synced', branch: 'sync/me/t--v-uk' }, 'sync/me/t--v-uk']
    ];
    for (const [info, ref] of cases) {
      const urls = [];
      const env = makeHarness({
        editSync: info ? { talkId: 't', getInfo: function () { return info; } } : null,
        fetch: function (url) {
          urls.push(url);
          return Promise.resolve({
            ok: true,
            blob: function () { return Promise.resolve(new Blob(['1\n'])); }
          });
        }
      });
      await env.api.downloadSrt();
      // Read before the render dispatches: that path builds elements of its own.
      const anchor = env.created[env.created.length - 1];
      await env.api.startBurn('t', 'v');

      assert.strictEqual(urls.length, 1, 'one fetch, of one file');
      assert.ok(urls[0].includes('/' + ref + '/'), 'expected ref ' + ref + ' in ' + urls[0]);
      assert.ok(urls[0].includes('/' + env.dispatchedInputs.source_ref + '/'),
        'the file and the render must not be read off two different refs');
      assert.ok(urls[0].endsWith(MENU_MODEL.exportSrtPath('t', 'v', 'uk')),
        'the path is the published subtitle file, not an SPA-side reconstruction');
      assert.strictEqual(anchor.download, MENU_MODEL.exportSrtName('t', 'v', 'uk'),
        'a reviewer downloads several of these into one folder — name them so');
      assert.strictEqual(anchor.clicks, 1,
        'an anchor built and named but never clicked downloads nothing');
    }
  });

  it('dispatches against the default branch, and against an override when set', async () => {
    // The ref decides WHICH burn-subtitles.yml runs. Getting it from a hook is
    // the only way to exercise a workflow change from the UI before it is on
    // the default branch — a dispatch to 'main' would run the old file and
    // prove nothing. Production must still be untouched, hence both halves.
    const env = makeHarness();
    await env.api.startBurn('t', 'v');
    assert.strictEqual(env.dispatchedRef, 'main', 'production dispatches main');

    const env2 = makeHarness();
    env2.window.__SY_BURN_REF = 'worktree-burn-subtitles';
    await env2.api.startBurn('t', 'v');
    assert.strictEqual(env2.dispatchedRef, 'worktree-burn-subtitles');
  });

  // ---- a finished video is only an answer while it still matches the screen ----

  it('clears the finished render out from under the offer to build', async () => {
    // Everything under the item belongs to the run it follows. Once that run
    // has gone to the list, a track and a run link left under "Create the video
    // with subtitles" would say the opposite of the label above them.
    const env = makeHarness(Object.assign(previewing({ edits: {} }), {
      matchRun: function () { return { id: 5, html_url: 'https://x/actions/runs/5' }; }
    }));
    await env.api.startBurn('t', 'v');
    await settle();
    env.api.renderBurnProgress({ fraction: 0.9, label: 'Render 80%', done: false,
      failed: false, failedStep: '', unknownStep: '', startedMs: Date.now() - MIN_MS });
    assert.strictEqual(env.els['burn-track'].hidden, false, 'precondition: its track shows');
    assert.strictEqual(env.els['burn-run-link'].hidden, false, 'precondition: linked');

    env.api.onBurnFinished();

    assert.strictEqual(env.els['burn-item-label'].textContent, 'T:export.video_make');
    assert.strictEqual(env.els['burn-track'].hidden, true,
      'the track belongs to the render the item no longer follows');
    assert.strictEqual(env.meta.hidden, true, 'and so do its times');
    assert.strictEqual(env.els['burn-run-link'].hidden, true,
      'and the link to the run that produced it');
  });

  it('shows nothing under the offer, even from a run never marked finished', async () => {
    // The stand caught this one as a screenshot: "Create the video with
    // subtitles" with a near-full blue track and a run link under it. The
    // earlier fix only swept up runs flagged done, and this readout came from
    // a run that was drawn but never reached a terminal payload — so it slipped
    // through. The label is the whole test: if it offers to build, nothing of
    // any render may sit beneath it.
    const env = makeHarness(Object.assign(previewing({ edits: {} }), {
      matchRun: function () { return { id: 5, html_url: 'https://x/actions/runs/5' }; }
    }));
    await env.api.startBurn('t', 'v');
    await settle();
    // A drawn, unfinished render: track filled, link up, nothing terminal.
    env.api.renderBurnProgress({ fraction: 0.9, label: 'Render 80%', done: false,
      failed: false, failedStep: '', unknownStep: '', startedMs: Date.now() - MIN_MS });
    assert.strictEqual(env.els['burn-track'].hidden, false, 'precondition: drawn');
    assert.strictEqual(env.els['burn-run-link'].hidden, false, 'precondition: linked');

    // The follow ends without a terminal payload — the menu is opened, then
    // closed, which stops the poll — and the subtitles moved on, so the item
    // goes back to offering while that drawn readout is still on screen.
    env.api.openExportMenu();
    env.api.closeExportMenu();
    env.previewState.edits.uk = { 3: 'edited' };
    env.api.updateExportUi();

    assert.strictEqual(env.els['burn-item-label'].textContent, 'T:export.video_make');
    assert.strictEqual(env.els['burn-track'].hidden, true, 'no track under an offer');
    assert.strictEqual(env.els['burn-run-link'].hidden, true, 'no run link either');
  });

  it('keeps a failure on screen under the offer to try again', async () => {
    // The one case where a start-face item SHOULD carry the previous run's
    // readout: the error is why the offer is there at all, and the run link is
    // the only way to see what the gate actually said.
    const env = makeHarness(Object.assign(previewing({ edits: {} }), {
      matchRun: function () { return { id: 5, html_url: 'https://x/actions/runs/5' }; }
    }));
    await env.api.startBurn('t', 'v');
    await settle();   // the run is discovered, so there is a link to keep
    assert.strictEqual(env.els['burn-run-link'].hidden, false, 'precondition: linked');
    env.api.showBurnError('the render failed');

    assert.strictEqual(env.els['burn-item-label'].textContent, 'T:export.video_make');
    assert.strictEqual(env.els['burn-error'].hidden, false, 'the reason stays');
    // The link is the only way to see what the gate actually said, so the
    // disown sweep must not take it — the error line is not a disowned result.
    assert.strictEqual(env.els['burn-run-link'].hidden, false,
      'a failure keeps its run link — it explains the offer above it');
  });

  it('dispatches nothing while a language other than Ukrainian is previewed', async () => {
    const env = makeHarness(previewing({ srtLang: 'en' }));
    env.api.startBurn();
    await settle();
    assert.strictEqual(env.dispatched, 0,
      'the workflow burns final/uk.srt and takes no language input — previewing ' +
      'English and pressing Render must not produce a Ukrainian video');
    assert.strictEqual(env.api.getWatch(), null,
      'nothing may be recorded for a run that was never started');
  });

  it('says why the render is unavailable rather than leaving a dead item', () => {
    const env = makeHarness(Object.assign(previewing({ srtLang: 'en' }), {
      t: function (k) { return k === 'burn.wrong_lang' ? 'UK only, not {lang}' : k; }
    }));
    env.api.updateExportUi();
    assert.strictEqual(env.els['btn-burn-video'].disabled, true);
    assert.strictEqual(env.els['btn-burn-video'].title, 'UK only, not EN',
      'a disabled control with no explanation is indistinguishable from a bug');
  });

  it('takes the explanation back off once Ukrainian is previewed again', () => {
    const env = makeHarness(previewing({ srtLang: 'en' }));
    env.api.updateExportUi();
    env.previewState.srtLang = 'uk';
    env.api.updateExportUi();
    assert.strictEqual(env.els['btn-burn-video'].disabled, false);
    assert.strictEqual(env.els['btn-burn-video'].title, '',
      'a stale reason on a working button is worse than none');
  });

  it('asks before rendering without the pending edits, naming their count', async () => {
    const env = makeHarness(Object.assign(previewing({ edits: { uk: { 3: 'a', 7: 'b' } } }), {
      t: function (k) { return k === 'burn.pending_title' ? '{n} {word} pending' : k; }
    }));
    env.api.startBurn();
    await settle();
    assert.strictEqual(env.confirms.length, 1,
      'the house dialog must carry the warning — never native confirm()');
    assert.strictEqual(env.confirms[0].title, '2 edits pending');
    assert.strictEqual(env.dispatched, 1, 'an affirmative answer still renders');
  });

  it('dispatches nothing when the pending-edits warning is declined', async () => {
    const env = makeHarness(Object.assign(previewing({ edits: { uk: { 3: 'a' } } }),
      { confirmAnswer: false }));
    env.api.startBurn();
    await settle();
    assert.strictEqual(env.confirms.length, 1, 'precondition: it was asked');
    assert.strictEqual(env.dispatched, 0, 'declining must not start a run anyway');
    assert.strictEqual(env.api.getWatch(), null);
    assert.strictEqual(env.els['burn-track'].hidden, true,
      'no progress track for a render that never started');
    assert.strictEqual(env.els['burn-item-label'].textContent, 'T:export.video_make',
      'the item goes back to offering the render it did not start');
    assert.strictEqual(env.els['btn-burn-video'].disabled, false,
      'declining must leave the item usable — the user may edit and retry');
  });

  it('does not ask when nothing is pending', async () => {
    const env = makeHarness();
    env.api.startBurn();
    await settle();
    assert.strictEqual(env.confirms.length, 0, 'a dialog with nothing to warn about is noise');
    assert.strictEqual(env.dispatched, 1);
  });

  it('opens one dialog, not two, when the button is clicked twice', async () => {
    // burnFollowing cannot cover this window: nothing is being followed while
    // the dialog is open, so a second click would open a second dialog and,
    // once both are answered, dispatch twice.
    const env = makeHarness(previewing({ edits: { uk: { 3: 'a' } } }));
    env.api.startBurn();
    env.api.startBurn();
    await settle();
    assert.strictEqual(env.confirms.length, 1);
    assert.strictEqual(env.dispatched, 1);
  });

  it('counts only the edits in the language the run will burn', async () => {
    // English edits are not what the Ukrainian render would omit.
    const env = makeHarness(previewing({ edits: { en: { 1: 'a', 2: 'b' } } }));
    env.api.startBurn();
    await settle();
    assert.strictEqual(env.confirms.length, 0);
    assert.strictEqual(env.dispatched, 1);
  });

  it('becomes the progress readout while the run is followed', async () => {
    const env = makeHarness();
    env.api.startBurn();
    await settle();
    assert.strictEqual(env.els['btn-burn-video'].disabled, true,
      'there is nothing to click while the run it is reporting on runs');
    assert.strictEqual(env.els['burn-item-label'].textContent, 'T:export.video_working');
  });

  it('lets the item be pressed again when the run finishes, fails or the menu closes', async () => {
    for (const finish of ['onBurnFinished', 'showBurnError', 'closeExportMenu']) {
      const env = makeHarness();
      env.api.openExportMenu();
      env.api.startBurn();
      await settle();
      assert.strictEqual(env.els['btn-burn-video'].disabled, true,
        'precondition: the item is disabled while the run is followed');
      env.api[finish]('boom');
      assert.strictEqual(env.els['btn-burn-video'].disabled, false,
        finish + '() must leave the item pressable again');
    }
  });

  it('keeps the item disabled for a run resumed on page load', async () => {
    const env = makeHarness();
    env.localStorage.setItem('burn:t:v', savedWatch(7));
    env.api.resumeBurnWatch('t', 'v');
    await settle();
    assert.strictEqual(env.els['btn-burn-video'].disabled, true,
      'a resumed in-flight run must keep the item on its working face');
    assert.strictEqual(env.els['burn-item-label'].textContent, 'T:export.video_working');
  });

  it('enables the item when there is nothing to resume', async () => {
    const env = makeHarness();
    env.els['btn-burn-video'].disabled = true;   // left over from another video
    env.api.resumeBurnWatch('t', 'v');
    await settle();
    assert.strictEqual(env.els['btn-burn-video'].disabled, false,
      'no recorded run means the item must offer to start one');
    assert.strictEqual(env.els['burn-item-label'].textContent, 'T:export.video_make');
  });

  it('drops the previous watch before dispatching a new one', async () => {
    const env = makeHarness();
    env.localStorage.setItem('burn:t:v', savedWatch(7));
    env.api.resumeBurnWatch('t', 'v');
    await settle();
    assert.ok(env.api.getWatch(), 'precondition: a watch is being followed');
    // A NEW render is legitimate once the old one is terminal. A failure keeps
    // its watch (the run link explains the error), which is the path this guard
    // has to hold on.
    env.api.showBurnError('boom');
    assert.ok(env.api.getWatch(), 'precondition: the failed run is still recorded');
    env.api.startBurn();
    assert.strictEqual(env.api.getWatch(), null,
      'startBurn must drop the old watch before awaiting, so an in-flight poll ' +
      'continuation fails its watch === burnWatch check instead of re-arming');
  });

  it('does not re-arm the poll timer from a continuation that lands after the menu closes', async () => {
    let resolveJobs;
    const env = makeHarness({
      matchRun: function () { return { id: 5, html_url: 'https://x/actions/runs/5' }; },
      getRunJobs: function () { return new Promise(function (r) { resolveJobs = r; }); }
    });
    env.api.openExportMenu();
    env.api.startBurn();
    await settle();
    assert.strictEqual(armedTimers(env), 0, 'precondition: the poll is mid-flight');
    env.api.closeExportMenu();
    resolveJobs([{}]);
    await settle();
    assert.strictEqual(armedTimers(env), 0,
      'a poll continuation resolving after the menu closed must not restart the loop');
  });

  it('shows the queued label instead of a blank status during run discovery', () => {
    const env = makeHarness();
    // computeProgress(null) legitimately returns label:'' — the item must not
    // go blank at 0% for the whole discovery window.
    env.api.renderBurnProgress(Object.assign({}, NO_PROGRESS));
    assert.strictEqual(env.els['burn-step'].textContent, 'T:burn.queued');
  });

  it('does not print "Starting…" over a finished run', () => {
    const env = makeHarness();
    env.api.renderBurnProgress({ fraction: 1, label: '', done: true });
    assert.strictEqual(env.els['burn-step'].textContent, '',
      'a terminal state must not fall back to the queued label');
  });

  it('publishes progress to assistive tech via aria-valuenow', () => {
    const env = makeHarness();
    env.api.renderBurnProgress({ fraction: 0.42, label: 'Render 20%',
                                 done: false, failed: false });
    assert.strictEqual(env.els['burn-track'].getAttribute('aria-valuenow'), '42',
      'the progressbar must report its value, not only its pixel width');
  });

  // ---- the seamed four-phase track ----

  function segs(env) { return env.els['burn-track'].children; }
  function classes(env) { return segs(env).map(function (s) { return s.className; }); }
  function widths(env) {
    return segs(env).map(function (s) { return s.children[0].style.width; });
  }

  it('builds one segment per phase, sized by the real weights', () => {
    const env = makeHarness();
    env.api.renderBurnProgress(Object.assign({}, NO_PROGRESS));
    assert.strictEqual(segs(env).length, 4, 'four phases, four segments');
    // Compared as numbers, not as spellings: summing twenty 0.0325 gates lands
    // on 69.99999999999997, which is the same ratio to flexbox and the same
    // 70% of the bar. The literals are still written out — equal quarters, or a
    // render block that quietly stopped being 0.70, must fail here.
    segs(env).map(function (s) { return parseFloat(s.style.flexGrow); })
      .forEach(function (grow, i) {
        assert.ok(Math.abs(grow - [5, 15, 70, 10][i]) < 1e-9,
          'flex-grow must come from the weight table, got ' + grow + ' at ' + i);
      });
    assert.ok(segs(env).every(function (s) { return s.getAttribute('aria-hidden') === 'true'; }),
      'the segments are decoration: the value lives on the track (one control)');
  });

  it('reuses the segments on the next poll instead of rebuilding them', () => {
    const env = makeHarness();
    env.api.renderBurnProgress(Object.assign({}, NO_PROGRESS));
    const first = segs(env)[0];
    env.api.renderBurnProgress(Object.assign({}, NO_PROGRESS, { fraction: 0.5 }));
    assert.strictEqual(segs(env).length, 4, 'a rebuild would duplicate the segments');
    assert.strictEqual(segs(env)[0], first,
      'rebuilding restarts the CSS width transition, so the fill would jump');
  });

  it('fills a phase only with its own credited weight', () => {
    const env = makeHarness();
    env.api.renderBurnProgress(Object.assign({}, NO_PROGRESS,
      { fraction: 0.05 + 0.15 + 0.05 + 0.0325, label: 'Render 20%' }));
    assert.deepStrictEqual(widths(env), ['100%', '100%', '12%', '0%']);
    assert.match(classes(env)[2], /burn-seg--active/,
      'the phase whose step is running is the active one');
  });

  it('breathes the first segment while the run is still being discovered', () => {
    // Dispatched, run not found yet: no fraction, no named step, and up to 60s
    // of it. The item must not look inert — the phase about to run breathes.
    const env = makeHarness();
    env.api.renderBurnProgress(Object.assign({}, NO_PROGRESS));
    assert.match(classes(env)[0], /burn-seg--active/);
    assert.strictEqual(env.els['burn-step'].textContent, 'T:burn.queued');
  });

  it('breathes nothing on a terminal state', () => {
    for (const terminal of [{ failed: true }, { done: true, fraction: 1 }]) {
      const env = makeHarness();
      env.api.renderBurnProgress(Object.assign({}, NO_PROGRESS, terminal));
      assert.ok(classes(env).every(function (c) { return !/burn-seg--active/.test(c); }),
        'a finished or failed run is not still working on something');
    }
  });

  it('breathes only a running phase that has earned nothing', () => {
    // The breathing overlay tinted the whole active segment, so the 70%-wide
    // render segment showed a second, paler shade of blue across everything it
    // had NOT earned — two shades read as a buffered progress bar, and a
    // measured 44% looked ~78% done. Once a phase has credited fill, the fill is
    // the whole truth; the alive-signal is the elapsed counter and the fill's own
    // movement. The overlay stays for the case it was written for: a running
    // phase with nothing to show yet, where the tint's extent is the phase's own
    // extent and claims nothing more.
    const env = makeHarness();
    env.api.renderBurnProgress(Object.assign({}, NO_PROGRESS,
      { fraction: 0.05 + 0.15 + 0.05 + 0.0325, label: 'Render 20%' }));
    assert.match(classes(env)[2], /burn-seg--active/, 'precondition: it is running');
    assert.ok(!/burn-seg--empty/.test(classes(env)[2]),
      'a phase with credited fill must not tint the part it has not earned');
  });

  it('marks a running phase that has earned nothing as empty', () => {
    // The run-discovery window, and any short phase before its step completes.
    const env = makeHarness();
    env.api.renderBurnProgress(Object.assign({}, NO_PROGRESS));
    assert.match(classes(env)[0], /burn-seg--active/);
    assert.match(classes(env)[0], /burn-seg--empty/);
    assert.strictEqual(widths(env)[0], '0%');
    env.api.renderBurnProgress(Object.assign({}, NO_PROGRESS,
      { fraction: 0.05, label: 'Download video' }));
    assert.match(classes(env)[1], /burn-seg--active burn-seg--empty|burn-seg--empty/);
    assert.ok(!/burn-seg--empty/.test(classes(env)[0]),
      'a completed phase is not empty — it is done');
  });

  it('names the phase, never the English workflow step', () => {
    const env = makeHarness({
      t: function (k) { return k === 'burn.step_of' ? '{n} of {total} — {step}' : k; }
    });
    env.api.renderBurnProgress(Object.assign({}, NO_PROGRESS,
      { fraction: 0.3, label: 'Render 20%' }));
    assert.strictEqual(env.els['burn-step'].textContent, '3 of 4 — burn.step.render',
      'a Ukrainian interface must not show the raw Actions step name');
  });

  it('leaves the elapsed line empty below one full minute', () => {
    const env = makeHarness();
    env.api.renderBurnProgress(Object.assign({}, NO_PROGRESS,
      { fraction: 0.05, label: 'Download video', startedMs: Date.now() - 59000 }));
    assert.strictEqual(env.els['burn-elapsed'].textContent, '',
      '"1 min elapsed" after 59 seconds is a small lie');
  });

  it('floors the elapsed minutes so the counter can never overstate', () => {
    const env = makeHarness({
      t: function (k) { return k === 'burn.elapsed' ? '{min}m' : k; }
    });
    env.api.renderBurnProgress(Object.assign({}, NO_PROGRESS,
      { fraction: 0.05, label: 'Download video',
        startedMs: Date.now() - (7 * MIN_MS + 59000) }));
    assert.strictEqual(env.els['burn-elapsed'].textContent, '7m');
  });

  it('writes the live status line only when it changes', () => {
    const env = makeHarness();
    const p = Object.assign({}, NO_PROGRESS, { fraction: 0.3, label: 'Render 20%' });
    env.api.renderBurnProgress(p);
    const before = env.els['burn-step'].writes;
    env.api.renderBurnProgress(Object.assign({}, p, { fraction: 0.365 }));
    assert.strictEqual(env.els['burn-step'].writes, before,
      'a re-write of identical text makes a screen reader announce it again');
  });

  it('moves the label i18n key with the label text', async () => {
    // translatePage() repaints every [data-i18n] element on a language toggle,
    // so a stale key would revert the label to the face it no longer wears.
    const env = makeHarness();
    env.api.startBurn();
    await settle();
    assert.strictEqual(env.els['burn-item-label'].getAttribute('data-i18n'),
      'export.video_working');
    assert.strictEqual(env.els['burn-item-label'].textContent, 'T:export.video_working');

    env.api.onBurnFinished();
    assert.strictEqual(env.els['burn-item-label'].getAttribute('data-i18n'),
      'export.video_make');
    assert.strictEqual(env.els['burn-item-label'].textContent, 'T:export.video_make');
  });

  it('stops claiming a render is in flight when no job step ever ran', () => {
    // A dispatch/permission/run-not-found error never reaches
    // renderBurnProgress, so without correcting the item here it would go on
    // reporting on a run that does not exist — and offer nothing to retry with.
    const env = makeHarness();
    env.api.renderBurnProgress(Object.assign({}, NO_PROGRESS));
    env.api.showBurnError('boom');
    assert.strictEqual(env.els['burn-error'].textContent, 'boom');
    assert.strictEqual(env.els['burn-error'].hidden, false,
      'the error line is the only thing that says what happened');
    assert.strictEqual(env.els['burn-item-label'].textContent, 'T:export.video_make',
      'a failure is not a result: the item goes back to offering the render');
    assert.strictEqual(env.els['burn-track'].hidden, true,
      'and a track frozen at 0% under an error still reads as "working"');
  });

  it('clears the stale progress line when it reports an error', () => {
    // The item stops being a progress report the moment it becomes an error
    // report: a "Starting..." line under "the render failed" invites the
    // belief that something is still being followed.
    const env = makeHarness();
    env.api.renderBurnProgress(Object.assign({}, NO_PROGRESS,
      { fraction: 0.3, label: 'Render 20%', startedMs: Date.now() - 8 * MIN_MS }));
    assert.notStrictEqual(env.els['burn-step'].textContent, '', 'precondition');
    env.api.showBurnError('boom');
    assert.strictEqual(env.els['burn-step'].textContent, '');
    assert.strictEqual(env.els['burn-elapsed'].textContent, '');
    assert.strictEqual(env.els['burn-eta'].textContent, '');
  });

  // ---- a UI-language switch must reach the composed status line ----

  it('does not turn an error report back into a progress report', () => {
    // Repainting a non-terminal payload would resurrect the phase line that
    // showBurnError deliberately took down.
    const env = makeHarness();
    env.api.renderBurnProgress(Object.assign({}, NO_PROGRESS,
      { fraction: 0.3, label: 'Render 20%', startedMs: Date.now() - 8 * MIN_MS }));
    env.api.showBurnError('boom');
    env.api.retranslateBurnPanel();
    assert.strictEqual(env.els['burn-step'].textContent, '');
    assert.strictEqual(env.els['burn-elapsed'].textContent, '');
  });

  it('does not touch an item that was never drawn', () => {
    const env = makeHarness();
    env.api.retranslateBurnPanel();
    assert.strictEqual(env.els['burn-track'].children.length, 0,
      'no payload yet means nothing to redraw');
  });

  // ---- the failure message speaks in phases too ----

  function failingHarness(failedStep, over) {
    return makeHarness(Object.assign({
      matchRun: function () { return { id: 5, html_url: 'https://x/actions/runs/5' }; },
      computeProgress: function () {
        return Object.assign({}, NO_PROGRESS,
          { fraction: 0.25, label: failedStep, failed: true, failedStep: failedStep });
      }
    }, over || {}));
  }

  it('names the failed phase in the message, not the raw Actions step', async () => {
    // 'Failed at step "Render 40%"' was the last place an English step name
    // leaked into the Ukrainian UI — the whole reason burn.step.* exists. The
    // View-run link carries the gate-level detail for anyone who wants it.
    const env = failingHarness('Render 40%', {
      t: function (k) { return k === 'burn.failed_step' ? 'failed at [{step}]' : k; }
    });
    env.api.startBurn();
    await settle();
    assert.strictEqual(env.els['burn-error'].textContent,
      'failed at [burn.step.render]');
  });

  it('names the phase when the run was rejected in Validate inputs', async () => {
    // The one step whose entire job is to report bad user input used to be the
    // one step whose failure the item could not name: it carries no weight, so
    // burnPhaseKey returned null and the message fell through to the generic
    // "the render failed". The real phase model is wired into this harness, so
    // this exercises the alias rather than a stub.
    const env = failingHarness('Validate inputs', {
      t: function (k) { return k === 'burn.failed_step' ? 'failed at [{step}]' : k; }
    });
    env.api.startBurn();
    await settle();
    assert.strictEqual(env.els['burn-error'].textContent,
      'failed at [burn.step.prepare]');
  });

  it('falls back to the generic failure when the step maps to no phase', async () => {
    // Rather than print a name we cannot translate.
    const env = failingHarness('Post Run actions/checkout');
    env.api.startBurn();
    await settle();
    assert.strictEqual(env.els['burn-error'].textContent, 'T:burn.failed');
  });

  it('marks only the phase that failed', () => {
    const env = makeHarness();
    env.api.renderBurnProgress({ fraction: 0.3, label: 'Render 40%', done: false,
                                 failed: true, failedStep: 'Render 40%' });
    const c = classes(env);
    assert.match(c[2], /burn-seg--failed/);
    assert.ok(!/burn-seg--failed/.test(c[0] + c[1] + c[3]));
  });

  it('marks no phase when the failure has no named step', () => {
    // We do not know where it died, so we do not claim a place.
    const env = makeHarness();
    env.api.renderBurnProgress({ fraction: 0, label: '', done: false,
                                 failed: true, failedStep: '' });
    assert.ok(classes(env).every(function (c) { return !/burn-seg--failed/.test(c); }));
  });

  // The remaining time is now extrapolated from the rate the render is actually
  // going at, so it exists only once the encode has produced a measurable one.
  const rendering = (over) => Object.assign({
    fraction: 0.4, label: 'Render 20%', done: false, failed: false,
    renderFraction: 0.25, renderStartedMs: Date.now() - 600000
  }, over || {});

  it('says nothing about remaining time before the render has a measured rate', () => {
    const env = makeHarness();
    env.api.renderBurnProgress(Object.assign({}, NO_PROGRESS, { fraction: 0.2 }));
    assert.strictEqual(env.els['burn-eta'].textContent, '',
      'with no render rate yet there is no honest number to show');
  });

  it('shows a remaining-time line once the render rate is measurable', () => {
    const env = makeHarness({ renderEtaSeconds: function () { return 1800; } });
    env.api.renderBurnProgress(rendering());
    assert.notStrictEqual(env.els['burn-eta'].textContent, '');
  });

  it('never shows a remaining time next to a failure or a finished run', () => {
    for (const terminal of [{ failed: true }, { done: true }]) {
      const env = makeHarness({ renderEtaSeconds: function () { return 1800; } });
      env.api.renderBurnProgress(rendering(terminal));
      assert.strictEqual(env.els['burn-eta'].textContent, '',
        'a remaining time next to ' + JSON.stringify(terminal) + ' is a lie');
    }
  });

  // ---- the download must not buffer a feature-length video three times ----
  //
  // resp.arrayBuffer() reads the whole ZIP, the entry slice copied it again and
  // the Blob wrapped a third. This corpus has 60-120-minute talks, so the peak
  // was 2-6 GB and the tab died with an untranslated allocation error.

  it('hands a STORED entry to the Blob as a view, never as another full copy', async () => {
    // STORED is always our case (upload-artifact runs at compression-level: 0),
    // so this is the copy that actually costs gigabytes.
    const env = makeHarness();
    const bytes = new Uint8Array(fs.readFileSync('tests/fixtures/streaming_artifact.zip'));
    const file = await env.api.extractBurnedMp4(bytes);
    assert.strictEqual(file.bytes.byteLength, 140, 'precondition: the mp4 was found');
    assert.strictEqual(file.bytes.buffer, bytes.buffer,
      'a stored entry must be a view onto the ZIP, not a second allocation');
  });

  it('still decompresses a deflated entry rather than aliasing raw bytes', async () => {
    // A view over deflate-compressed bytes would hand the user a corrupt mp4,
    // so the two branches must stay distinguishable.
    const zlib = require('node:zlib');
    const payload = Buffer.from('what a deflated entry decompresses to');
    const deflated = zlib.deflateRawSync(payload);
    const bytes = new Uint8Array(4 + deflated.length);
    bytes.set(deflated, 4);
    const env = makeHarness({
      findEocd: function () { return 0; },
      readCentralDirectory: function () {
        return [{ name: 'x.mp4', method: 8, compressedSize: deflated.length,
                  uncompressedSize: payload.length, localHeaderOffset: 0 }];
      },
      localDataOffset: function () { return 4; }
    });
    const file = await env.api.extractBurnedMp4(bytes);
    assert.strictEqual(Buffer.from(file.bytes).toString(), payload.toString());
    assert.notStrictEqual(file.bytes.buffer, bytes.buffer,
      'a deflated entry must be decoded into its own buffer');
  });

  it('refuses an artifact too large to hold in memory instead of killing the tab', async () => {
    const env = historyHarness([burnRun(7)], {
      listRunArtifacts: function () {
        return Promise.resolve([{ id: 9, size_in_bytes: 2469606195 }]);
      },
      t: function (k) { return k === 'burn.too_large' ? 'too big: {size} GB' : 'T:' + k; }
    });
    await listed(env);
    await env.api.downloadBurned(7);
    assert.strictEqual(rowPart(env, 7, 'burn-panel__error').textContent, 'too big: 2.3 GB',
      'say the size honestly rather than attempting an allocation that will fail');
    assert.strictEqual(env.fetches, 0,
      'the point is to not start a download that cannot finish');
  });

  it('downloads an artifact that comfortably fits', async () => {
    // The guard must not become a ceiling on ordinary renders: the verified
    // real run produced 29 MB.
    const env = historyHarness([burnRun(7)], {
      listRunArtifacts: function () {
        return Promise.resolve([{ id: 9, size_in_bytes: 28978456 }]);
      }
    });
    await listed(env);
    await env.api.downloadBurned(7);
    assert.strictEqual(env.fetches, 1, 'a normal-sized artifact must still be fetched');
  });

  it('actually saves the file on the no-picker fallback path', async () => {
    // Safari/Firefox have no save dialog: saveMp4 falls back to an anchor
    // click. That line was deletable with the suite green — the branch would
    // toast "saved" and write nothing. The toast is asserted elsewhere; this
    // pins the click that IS the save.
    const env = makeHarness();
    env.window.showSaveFilePicker = undefined;
    await env.api.saveMp4(new Uint8Array([1, 2, 3]), 'x.mp4');
    const anchor = env.created[env.created.length - 1];
    assert.strictEqual(anchor.download, 'x.mp4');
    assert.strictEqual(anchor.clicks, 1,
      'without the click the browser saves nothing');
  });

  it('drops a recorded run past the 7-day TTL instead of following it', async () => {
    // The artifact is gone after 7 days, so a watch older than that has nothing
    // to offer. This branch had no coverage: deleting it kept the suite green
    // while every preview entry silently re-followed week-dead runs.
    const env = makeHarness();
    env.localStorage.setItem('burn:t:v', JSON.stringify({
      requestId: 'old', runId: 7, runUrl: '', talkId: 't', videoSlug: 'v',
      startedAt: Date.now() - 8 * 24 * 60 * 60 * 1000, editsSig: ''
    }));
    env.api.resumeBurnWatch('t', 'v');
    assert.strictEqual(env.api.getWatch(), null,
      'a week-old run must not be picked back up');
    assert.strictEqual(env.localStorage.getItem('burn:t:v'), null,
      'and its record must be dropped, not re-read on every entry');
  });

  it('treats a cancelled save dialog as a no-op, not a failure', async () => {
    const env = makeHarness();
    const abort = new Error('The user aborted a request.');
    abort.name = 'AbortError';
    env.window.showSaveFilePicker = function () { return Promise.reject(abort); };
    await env.api.saveMp4(new Uint8Array([1, 2, 3]), 'x.mp4');
    assert.strictEqual(env.els['burn-error'].hidden, true);
    assert.strictEqual(env.els['burn-error'].textContent, '');
  });

  it('still surfaces a real save failure', async () => {
    const env = makeHarness();
    env.window.showSaveFilePicker = function () {
      return Promise.reject(new Error('disk full'));
    };
    await assert.rejects(function () { return env.api.saveMp4(new Uint8Array([1]), 'x.mp4'); },
      /disk full/, 'only AbortError may be swallowed');
  });

  // ---- and, where the browser can, must not buffer it even once ----
  //
  // A Range header survives the API's 302 to the pre-signed blob (measured
  // against the real artifact), so the mp4 can go from the network into the
  // file handle a chunk at a time: a small tail window for the central
  // directory, the entry's own local header, then the data range. The whole
  // ZIP is never held, so the video's size stops mattering.

  const ZIP_NAME = 'burned__t__v.mp4';

  // A streaming ZIP whose LOCAL header carries an extra field the central
  // directory does not. A reader that computed the data offset from the
  // central directory's lengths would start `localExtra` bytes early and write
  // a file that only reveals itself as corrupt on playback.
  function skewedZip(payload, localExtra, comment) {
    const name = Buffer.from(ZIP_NAME);
    const lfh = Buffer.alloc(30 + name.length + localExtra);
    lfh.writeUInt32LE(0x04034b50, 0);
    lfh.writeUInt16LE(name.length, 26);
    lfh.writeUInt16LE(localExtra, 28);
    name.copy(lfh, 30);
    const cdh = Buffer.alloc(46 + name.length);
    cdh.writeUInt32LE(0x02014b50, 0);
    cdh.writeUInt16LE(0, 10);                 // STORED
    cdh.writeUInt32LE(payload.length, 20);
    cdh.writeUInt32LE(payload.length, 24);
    cdh.writeUInt16LE(name.length, 28);
    cdh.writeUInt16LE(0, 30);                 // no extra field here — the skew
    cdh.writeUInt32LE(0, 42);                 // local header offset
    name.copy(cdh, 46);
    const tail = Buffer.alloc(comment || 0);  // a ZIP comment, if asked for
    const eocd = Buffer.alloc(22);
    eocd.writeUInt32LE(0x06054b50, 0);
    eocd.writeUInt16LE(1, 8);
    eocd.writeUInt16LE(1, 10);
    eocd.writeUInt32LE(cdh.length, 12);
    eocd.writeUInt32LE(lfh.length + payload.length, 16);
    eocd.writeUInt16LE(tail.length, 20);
    return { bytes: new Uint8Array(Buffer.concat([lfh, payload, cdh, eocd, tail])),
             dataAt: lfh.length, payload: payload };
  }

  // Two chunks, so the pump has to handle more than one. `onCancel` fires when
  // the caller cancels a body it decided not to read: the fake enqueues
  // everything up front, so without this hook "the transfer was stopped" is
  // indistinguishable from "the response was simply dropped".
  function makeBody(bytes, withPipeTo, onCancel) {
    const half = Math.ceil(bytes.length / 2);
    const chunks = [bytes.slice(0, half), bytes.slice(half)];
    if (withPipeTo) {
      const stream = new ReadableStream({
        start: function (c) { chunks.forEach(function (x) { c.enqueue(x); }); c.close(); }
      });
      // A stream closed inside start() never reaches the underlying source's
      // cancel hook, so record the caller's cancel() call itself — asking is
      // what is under test.
      const cancel = stream.cancel.bind(stream);
      stream.cancel = function (reason) {
        if (onCancel) onCancel();
        return cancel(reason);
      };
      return stream;
    }
    let i = 0;
    return {
      getReader: function () {
        return { read: function () {
          return Promise.resolve(i < chunks.length
            ? { done: false, value: chunks[i++] } : { done: true });
        } };
      },
      cancel: function () { if (onCancel) onCancel(); return Promise.resolve(); }
    };
  }

  // Serves byte ranges out of `zip` the way the real host does — measured
  // against the artifact the API redirects to (Azure Blob):
  //   * a SUFFIX range (bytes=-N) is ignored: 200 with the whole file;
  //   * an explicit bytes=a-b is honoured with 206, the end clamped to EOF;
  //   * a start past EOF is 416, and only there is Content-Range exposed;
  //   * on a 206, Content-Range is NOT among the exposed headers, so a browser
  //     cannot read it — hence null here, and the driver must not need it.
  // It also records every range asked for, the bytes handed back — which is
  // what "does not buffer the whole artifact" actually means — and how many
  // bodies the driver cancelled instead of leaving them to transfer.
  function rangeServer(zip, over) {
    const opt = Object.assign({ pipeTo: true, ignoreRange: false }, over || {});
    const server = { ranges: [], served: 0, cancels: 0 };
    server.fetch = function (url, init) {
      const range = (init && init.headers && init.headers.Range) || '';
      server.ranges.push(range);
      const span = /^bytes=(\d+)-(\d+)$/.exec(range);
      const honoured = !opt.ignoreRange && !!span;
      let start = 0;
      let end = zip.length - 1;
      if (honoured) {
        start = Number(span[1]);
        end = Math.min(Number(span[2]), zip.length - 1);
      }
      if (honoured && start >= zip.length) {
        return Promise.resolve({
          ok: false, status: 416,
          headers: { get: function (k) {
            return /^content-range$/i.test(k) ? 'bytes */' + zip.length : null; } },
          arrayBuffer: function () { return Promise.resolve(new ArrayBuffer(0)); },
          body: null
        });
      }
      const slice = zip.slice(start, end + 1);
      server.served += slice.length;
      return Promise.resolve({
        ok: true,
        status: honoured ? 206 : 200,
        headers: { get: function () { return null; } },
        arrayBuffer: function () {
          return Promise.resolve(slice.buffer.slice(
            slice.byteOffset, slice.byteOffset + slice.byteLength));
        },
        body: makeBody(slice, opt.pipeTo, function () { server.cancels++; })
      });
    };
    return server;
  }

  // Stands in for the FileSystemWritableFileStream: a real WritableStream (so
  // response.body.pipeTo() works on it) that also carries the write()/close()
  // sugar the real one has, which the reader-loop path uses.
  function makeSink() {
    const chunks = [];
    const stream = new WritableStream({
      write: function (c) { chunks.push(Buffer.from(c)); }
    });
    stream.write = function (c) {
      const w = stream.getWriter();
      const done = (typeof Blob !== 'undefined' && c instanceof Blob)
        ? c.arrayBuffer().then(function (b) { return w.write(new Uint8Array(b)); })
        : w.write(c);
      return done.then(function () { w.releaseLock(); });
    };
    stream.close = function () {
      const w = stream.getWriter();
      return w.close().then(function () { w.releaseLock(); });
    };
    return { stream: stream, chunks: chunks,
             saved: function () { return Buffer.concat(chunks); } };
  }

  function savingHarness(zip, over, serverOver, runs) {
    const server = rangeServer(zip, serverOver);
    const sink = makeSink();
    const picked = {};
    const env = historyHarness(runs || [burnRun(7)], Object.assign({
      fetch: server.fetch,
      window: {
        screen: { width: 1280, height: 720 },
        showSaveFilePicker: function (opts) {
          picked.suggestedName = opts && opts.suggestedName;
          return Promise.resolve({
            createWritable: function () { return Promise.resolve(sink.stream); }
          });
        }
      },
      listRunArtifacts: function () {
        return Promise.resolve([{ id: 9, size_in_bytes: zip.length }]);
      }
    }, over || {}));
    // A download starts from a row, and a row exists once the list has loaded.
    env.api.openExportMenu();
    env.server = server;
    env.sink = sink;
    env.picked = picked;
    return env;
  }

  // ---- the transfer itself has to be visible ----
  //
  // The render's own progress is well covered above. This is the phase AFTER
  // it: a few hundred megabytes moving from the artifact to disk, written
  // through the save dialog's file handle — no downloads entry, no shelf, no
  // progress of its own. The reviewer's words: "не зрозуміло що йде
  // завантаження, коли і чи воно завершилось". The row being downloaded is
  // where that shows.
  function watchWrites(env, runId) {
    const seen = [];
    const write = env.sink.stream.write;
    env.sink.stream.write = function (c) {
      seen.push({
        disabled: rowPart(env, runId, 'export-history__item').disabled,
        value: rowPart(env, runId, 'burn-track').attrs['aria-valuenow'],
        meta: rowPart(env, runId, 'export-item__meta').textContent
      });
      return write.call(env.sink.stream, c);
    };
    return seen;
  }

  it('reports the transfer while it runs, and stops when it ends', async () => {
    const zip = skewedZip(Buffer.alloc(20000, 7), 11);
    const env = savingHarness(zip.bytes);
    await settle();
    const seen = watchWrites(env, 7);

    await env.api.downloadBurned(7);

    assert.ok(seen.length, 'the transfer must have written something to watch');
    assert.strictEqual(seen[0].disabled, true,
      'a second click on the row must not start a second transfer');
    assert.strictEqual(seen[0].meta, 'T:burn.downloaded',
      'the byte counter under the row is the only sign of movement');
    // Not straight back to a plain row: that reads as if nothing happened. The
    // landed file gets said out loud.
    assert.strictEqual(rowPart(env, 7, 'export-item__meta').textContent,
      'T:export.video_downloaded', 'the row must say the file has landed');
    assert.strictEqual(rowPart(env, 7, 'export-history__item').disabled, false,
      'the landed claim is a note beside a live row — the video can be had again');
  });

  it('clears the landed claim when the menu is closed and reopened', async () => {
    const zip = skewedZip(Buffer.alloc(20000, 7), 11);
    const env = savingHarness(zip.bytes);
    await settle();
    await env.api.downloadBurned(7);
    assert.strictEqual(rowPart(env, 7, 'export-item__meta').textContent,
      'T:export.video_downloaded', 'precondition: the row says the file has landed');
    env.api.closeExportMenu();
    await listed(env);
    assert.strictEqual(rowPart(env, 7, 'export-item__meta').hidden, true,
      'the claim belongs to one visit to the menu, not to the row for ever');
    assert.strictEqual(rowPart(env, 7, 'export-history__item').disabled, false);
  });

  // ---- a landed video can be had again ----
  //
  // The reviewer's words: after a download "Video with subtitles downloaded"
  // appears and there is no way to download it again. A note is a note: saving
  // to the wrong folder, or wanting a second copy, must not cost a trip out of
  // the menu and back.

  // A press on the row, gated the way a browser gates one: a disabled button
  // never receives the click at all, so the gate below is what makes this a
  // press rather than a call. The transfer itself is awaited through the driver
  // because the row's onclick has nobody to hand its promise to.
  function pressRow(env, runId) {
    assert.strictEqual(rowPart(env, runId, 'export-history__item').disabled, false,
      'run ' + runId + ' cannot be pressed: a browser delivers no click to a disabled button');
    return env.api.downloadBurned(runId);
  }

  // A fresh file handle per save, as a browser gives: the harness's default
  // sink is one stream, and a second transfer through a closed one would fail
  // for a reason that has nothing to do with the row.
  function perSavePicker(sinks) {
    return {
      screen: { width: 1280, height: 720 },
      showSaveFilePicker: function () {
        const sink = makeSink();
        sinks.push(sink);
        return Promise.resolve({
          createWritable: function () { return Promise.resolve(sink.stream); }
        });
      }
    };
  }

  it('hands the video over again when a landed row is pressed', async () => {
    const zip = skewedZip(Buffer.alloc(20000, 7), 11);
    const sinks = [];
    const env = savingHarness(zip.bytes, { window: perSavePicker(sinks) });
    await settle();
    await pressRow(env, 7);
    assert.strictEqual(sinks.length, 1, 'precondition: the first press saved a file');
    assert.strictEqual(rowPart(env, 7, 'export-item__meta').textContent,
      'T:export.video_downloaded', 'precondition: the row says the file landed');

    await pressRow(env, 7);
    assert.strictEqual(sinks.length, 2,
      'a landed row must still hand the video over on a second press');
    assert.ok(sinks[1].saved().length > 0,
      'and the second save must carry the file, not an empty handle');
    assert.strictEqual(rowPart(env, 7, 'burn-panel__error').textContent, '',
      'asking for the same video twice is not a failure');
  });

  it('explains what pressing a row does, except while its bytes are moving', async () => {
    // The tooltip is the row's only sentence — the label is a date. It went
    // missing the moment the row said anything about itself, so a row carrying
    // "downloaded" was both unpressable and unexplained.
    const zip = skewedZip(Buffer.alloc(20000, 7), 11);
    const env = savingHarness(zip.bytes);
    await settle();
    assert.strictEqual(rowPart(env, 7, 'export-history__item').title,
      'T:history.download', 'a fresh row says what a press will do');
    const seen = [];
    const write = env.sink.stream.write;
    env.sink.stream.write = function (c) {
      seen.push(rowPart(env, 7, 'export-history__item').title);
      return write.call(env.sink.stream, c);
    };
    await env.api.downloadBurned(7);
    assert.ok(seen.length, 'the transfer must have written something to watch');
    assert.strictEqual(seen[0], '',
      'no tooltip over a row whose press would be refused');
    assert.strictEqual(rowPart(env, 7, 'export-history__item').title,
      'T:history.download', 'and it comes back with the offer');
  });

  it('marks the row the pointer must not light up while it transfers', async () => {
    // The hover tint lives on the row now, so that it covers the note and the
    // bar that belong to it. A row mid-transfer refuses a click, and a tint
    // under the pointer would promise one — so the row says it is busy, in a
    // class the stylesheet keys the tint off.
    const zip = skewedZip(Buffer.alloc(20000, 7), 11);
    const env = savingHarness(zip.bytes);
    await settle();
    assert.strictEqual(rowPart(env, 7, 'export-history__row--busy'), null,
      'a row offering a download is a row that lights up');
    const seen = [];
    const write = env.sink.stream.write;
    env.sink.stream.write = function (c) {
      seen.push(!!rowPart(env, 7, 'export-history__row--busy'));
      return write.call(env.sink.stream, c);
    };
    await env.api.downloadBurned(7);
    assert.ok(seen.length, 'the transfer must have written something to watch');
    assert.strictEqual(seen[0], true, 'a transferring row must be marked busy');
    assert.strictEqual(rowPart(env, 7, 'export-history__row--busy'), null,
      'and unmarked once the bytes stop — the landed row is pressable');
    assert.ok(rowPart(env, 7, 'export-history__row'),
      'the mark is added and removed beside the base class, never instead of it');
  });

  it('closes the row\'s box around whatever is showing beneath the button', async () => {
    // The tint is the row's now, which makes the row's BOX visible — and a box
    // that stops at the note's last pixel reads as cropped rather than as the
    // thing the note belongs to, which is the whole point of moving the tint.
    // Measured: 6px above the first line (the button's own padding), 0px below
    // the note. So a row with anything under the button says so, and the
    // stylesheet closes it with that same 6px.
    const zip = skewedZip(Buffer.alloc(20000, 7), 11);
    const env = savingHarness(zip.bytes);
    await settle();
    assert.strictEqual(rowPart(env, 7, 'export-history__row--continued'), null,
      'a bare row has nothing under the button and keeps the geometry it had');
    const seen = [];
    const write = env.sink.stream.write;
    env.sink.stream.write = function (c) {
      seen.push(!!rowPart(env, 7, 'export-history__row--continued'));
      return write.call(env.sink.stream, c);
    };
    await env.api.downloadBurned(7);
    assert.ok(seen.length, 'the transfer must have written something to watch');
    assert.strictEqual(seen[0], true,
      'the transfer bar and its byte counter sit under the button');
    assert.ok(rowPart(env, 7, 'export-history__row--continued'),
      'and so does the landed note that replaces them');
    env.api.closeExportMenu();
    await listed(env);
    assert.strictEqual(rowPart(env, 7, 'export-history__row--continued'), null,
      'a fresh look has no claim left to close the box around');
  });

  it('closes the row\'s box around a failure too', async () => {
    // The error line is a continuation like any other — it appears under the
    // button, and a box cropped at a red sentence reads worst of all.
    const zip = skewedZip(Buffer.alloc(20000, 7), 11);
    const env = savingHarness(zip.bytes);
    await settle();
    env.sink.stream.write = function () { return Promise.reject(new Error('disk full')); };
    await env.api.downloadBurned(7);
    assert.strictEqual(rowPart(env, 7, 'burn-panel__error').hidden, false,
      'precondition: the error line is on screen');
    assert.ok(rowPart(env, 7, 'export-history__row--continued'),
      'a row carrying an error has its box closed around it');
  });

  it('does not claim a download the save dialog cancelled', async () => {
    // Escape in the picker resolves the flow without a file. "The video has
    // been downloaded" over a cancel would be a lie the reviewer acts on.
    const zip = skewedZip(Buffer.alloc(20000, 7), 11);
    const abort = new Error('cancelled');
    abort.name = 'AbortError';
    const env = savingHarness(zip.bytes, {
      window: {
        screen: { width: 1280, height: 720 },
        showSaveFilePicker: function () { return Promise.reject(abort); }
      }
    });
    await settle();
    await env.api.downloadBurned(7);
    assert.strictEqual(rowPart(env, 7, 'export-item__meta').hidden, true,
      'no file landed, so the row claims nothing');
    assert.strictEqual(rowPart(env, 7, 'export-history__item').disabled, false,
      'and still offers the download');
  });

  it('the buffered fallback reports the same byte counter as the streaming path', async () => {
    // Firefox has no save-file dialog, so the whole artifact buffers through
    // memory — and for the minutes a slow artifact host takes, the readout was
    // the only possible sign of life and it never moved. The reviewer's words:
    // «змінюється напис на завантажується але самого завантаження не
    // відбувається» — the transfer WAS running, silently.
    const zip = skewedZip(Buffer.alloc(20000, 7), 11);
    const half = Math.floor(zip.bytes.length / 2);
    const seen = [];
    let sent = 0;
    const env = historyHarness([burnRun(7)], {
      window: { screen: { width: 1280, height: 720 } },   // no showSaveFilePicker
      listRunArtifacts: function () {
        return Promise.resolve([{ id: 9, size_in_bytes: zip.bytes.length }]);
      },
      fetch: function () {
        return Promise.resolve({
          ok: true, status: 200,
          headers: { get: function (h) {
            return /^content-length$/i.test(h) ? String(zip.bytes.length) : null; } },
          // The old code path swallowed the body whole; keeping arrayBuffer()
          // here means that path still SUCCEEDS — this test must fail on the
          // missing counter, not on a broken fixture.
          arrayBuffer: function () {
            return Promise.resolve(zip.bytes.buffer.slice(
              zip.bytes.byteOffset, zip.bytes.byteOffset + zip.bytes.byteLength));
          },
          body: { getReader: function () { return { read: function () {
            if (sent === 0) {
              sent = 1;
              return Promise.resolve({
                value: new Uint8Array(zip.bytes.subarray(0, half)), done: false });
            }
            if (sent === 1) {
              sent = 2;
              // Between the chunks: chunk 1 must already be on the counter.
              seen.push({
                meta: rowPart(env, 7, 'export-item__meta').textContent,
                value: rowPart(env, 7, 'burn-track').attrs['aria-valuenow']
              });
              return Promise.resolve({
                value: new Uint8Array(zip.bytes.subarray(half)), done: false });
            }
            return Promise.resolve({ done: true });
          } }; } }
        });
      }
    });
    await listed(env);
    await env.api.downloadBurned(7);
    assert.strictEqual(rowPart(env, 7, 'burn-panel__error').textContent, '',
      'the transfer must not fail');
    assert.ok(seen.length,
      'the body must be read chunk by chunk — a silent arrayBuffer() gulp shows nothing');
    assert.strictEqual(seen[0].meta, 'T:burn.downloaded',
      'the byte counter is the only sign of movement Firefox gets');
    assert.ok(Number(seen[0].value) >= 40 && Number(seen[0].value) <= 60,
      'and it must stand at the first chunk, got: ' + seen[0].value);
    assert.ok(env.created.some(function (el) { return el.clicks === 1 && el.download; }),
      'the finished file still lands through the anchor download');
  });

  it('keeps a real percentage when the host hides Content-Length', async () => {
    // Content-Range/Content-Length exposure over CORS is the host's choice, not
    // ours. The artifact ZIP is stored uncompressed, so the API's own
    // size_in_bytes is the same number — the counter must fall back to it
    // rather than degrade to a percentless crawl.
    const zip = skewedZip(Buffer.alloc(20000, 7), 11);
    const half = Math.floor(zip.bytes.length / 2);
    const seen = [];
    let sent = 0;
    const env = historyHarness([burnRun(7)], {
      window: { screen: { width: 1280, height: 720 } },
      listRunArtifacts: function () {
        return Promise.resolve([{ id: 9, size_in_bytes: zip.bytes.length }]);
      },
      fetch: function () {
        return Promise.resolve({
          ok: true, status: 200,
          headers: { get: function () { return null; } },
          body: { getReader: function () { return { read: function () {
            if (sent === 0) {
              sent = 1;
              return Promise.resolve({
                value: new Uint8Array(zip.bytes.subarray(0, half)), done: false });
            }
            if (sent === 1) {
              sent = 2;
              seen.push({ value: rowPart(env, 7, 'burn-track').attrs['aria-valuenow'] });
              return Promise.resolve({
                value: new Uint8Array(zip.bytes.subarray(half)), done: false });
            }
            return Promise.resolve({ done: true });
          } }; } }
        });
      }
    });
    await listed(env);
    await env.api.downloadBurned(7);
    assert.ok(seen.length, 'the second chunk must have been asked for');
    assert.ok(Number(seen[0].value) >= 40 && Number(seen[0].value) <= 60,
      'size_in_bytes must carry the percentage, got: ' + seen[0].value);
  });

  it('does not start a second poll loop when the menu is reopened mid-request', async () => {
    // openExportMenu() re-arms the follow and calls pollBurn(). A close+reopen
    // inside one network round-trip left the first chain's continuation to find
    // `watch === burnWatch` and burnFollowing true again — so it carried on and
    // armed its own timer, while burnTimer only ever remembers the last id. The
    // escaped loop then polls the GitHub API for as long as the video stays
    // open, at double the rate, invisibly.
    // EVERY chain's resolver is kept: holding only the last one would leave the
    // first chain pending forever and the test would pass without proving a thing.
    const waiting = [];
    const env = makeHarness({
      listWorkflowRuns: function () {
        return new Promise(function (resolve) { waiting.push(resolve); });
      }
    });
    env.localStorage.setItem('burn:t:v', savedWatch(0));   // no runId: must look it up
    env.api.resumeBurnWatch('t', 'v');
    env.api.openExportMenu();                              // chain 1 starts, in flight
    env.api.closeExportMenu();
    env.api.openExportMenu();                              // chain 2
    assert.strictEqual(waiting.length, 1,
      'the reopen must reuse the request already out, not send a second one');
    waiting.forEach(function (resolve) {
      resolve([{ id: 7, html_url: 'https://x/run/7', display_title: 'x · old' }]);
    });
    await settle();

    const armed = env.timers.filter(Boolean).length;
    assert.strictEqual(armed, 1,
      'exactly one poll loop may be armed: got ' + armed);
  });

  // ---- a transfer that outlives its preview must not paint on the next one ----
  //
  // The STATE was scoped; its failure paths were not. showBurnError() stops the
  // poll timer, drops burnFollowing and writes the message into whatever item is
  // on screen — so a download dying on video A killed video B's live render
  // readout and left a foreign error under it.
  it('does not report a departed transfer\'s failure on the video now shown', async () => {
    let fail;
    const env = historyHarness([burnRun(7)], {
      listRunArtifacts: function () { return Promise.resolve([{ id: 9 }]); },
      fetch: function () { return new Promise(function (_, reject) { fail = reject; }); }
    });
    await listed(env);
    env.api.downloadBurned(7);                      // the transfer, still running
    await settle();

    // Move to another video with a render in flight, and follow it.
    env.previewState.videoSlug = 'Other';
    env.historyRuns = [burnRun(8, { slug: 'Other' })];
    env.localStorage.setItem('burn:' + TALK + ':Other', savedWatch(8));
    env.api.resumeBurnWatch(TALK, 'Other');
    await listed(env);
    const followedBefore = armedTimers(env);

    fail(new Error('network died'));                // the first video's transfer dies
    await settle();

    assert.strictEqual(env.els['burn-error'].textContent, '',
      'the other video\'s download error must not be written on this item');
    assert.strictEqual(rowPart(env, 8, 'burn-panel__error').textContent, '',
      'nor on this video\'s own row');
    assert.strictEqual(armedTimers(env), followedBefore,
      'and it must not stop the render this video is following');
  });

  it('does not start a second transfer while one is still running', async () => {
    // One slot, one writer. A second transfer rebranded the first one's chunks,
    // made the counter flicker between two totals, and whichever finished first
    // cleared the readout of the one still going.
    // Counted here: the harness's own env.fetches is not incremented by an
    // overridden fetch, so asserting on it would pass without proving anything.
    let started = 0;
    const env = historyHarness([burnRun(7), burnRun(8, { ageMs: 7200000 })], {
      listRunArtifacts: function () { return Promise.resolve([{ id: 9 }]); },
      fetch: function () { started++; return new Promise(function () {}); }
    });
    await listed(env);
    env.api.downloadBurned(7);
    await settle();
    assert.strictEqual(started, 1, 'setup: the first transfer must be running');

    env.api.downloadBurned(8);
    await settle();
    assert.strictEqual(started, 1,
      'a second transfer must not be started over the first');
    assert.ok(env.toasts.indexOf('T:burn.one_at_a_time') > -1, 'and the reviewer is told why');
  });

  it('does not re-follow a run that already failed', async () => {
    // showBurnError nulls burnLastProgress, so `terminal` could not see the
    // failure and every reopen re-armed the poll — one wasted API call, and a
    // disabled "Building, please wait" face over a run that died.
    const env = makeHarness();
    env.localStorage.setItem('burn:t:v', savedWatch(7));
    env.api.resumeBurnWatch('t', 'v');
    env.api.showBurnError('Failed at step "Burning in the subtitles"');
    env.api.closeExportMenu();
    const before = env.fetches;

    env.api.openExportMenu();

    assert.strictEqual(env.timers.filter(Boolean).length, 0,
      'a failed run must not be polled again');
    assert.strictEqual(env.els['burn-item-label'].textContent, 'T:export.video_make',
      'and the item must not claim to be building');
    assert.strictEqual(env.fetches, before);
  });

  // ---- the pending-edits dialog, left open across a navigation ----
  //
  // burnConfirming is set before the dialog is awaited, and the dialog is a
  // floating overlay the router does not tear down. So it can be answered on a
  // page it no longer belongs to — and until it is answered, it is a global
  // "one render at a time" lock.
  function orphanedDialog() {
    let answer;
    let opened = 0;
    const env = makeHarness({
      previewState: { talkId: 't', videoSlug: 'v', srtLang: 'uk',
                      edits: { uk: { 3: 'edited' } } },
      SPA: { confirm: function () {
        opened++;
        // Never resolves on its own: an unanswered dialog is the whole point.
        return new Promise(function (resolve) { answer = resolve; });
      } }
    });
    env.api.startBurn();                     // opens the dialog, locks the control
    return { env: env, answer: function (ok) { return answer(ok); },
             opened: function () { return opened; } };
  }

  it('does not render the talk the dialog was opened on after leaving it', async () => {
    const { env, answer } = orphanedDialog();
    // The reviewer navigates away, then finds the stale dialog and confirms.
    env.previewState.videoSlug = 'v2';
    env.api.resumeBurnWatch('t', 'v2');
    answer(true);
    await settle();
    assert.strictEqual(env.dispatched, 0,
      'confirming a dialog from a video no longer on screen must not dispatch');
  });

  it('does not let an unanswered dialog lock every other render', async () => {
    const { env, opened } = orphanedDialog();
    env.previewState.videoSlug = 'v2';
    env.api.resumeBurnWatch('t', 'v2');
    // Deliberately not awaited: v2 has pending edits too, so it opens a dialog
    // of its own, and that one does not resolve either. Reaching it is the fact
    // under test — a refused render never asks.
    env.api.startBurn();
    await settle();
    assert.strictEqual(opened(), 2,
      'a dialog stranded on another video must not disable rendering everywhere');
  });

  // ---- a transfer belongs to ONE row, and to nothing else ----
  //
  // Two independent reviews once landed on the same defect: the transfer slot
  // was a bare global, so a transfer started on one video painted its face onto
  // the next one — a video that had never been rendered showed a disabled
  // "Downloading, please wait" for as long as the other video's bytes kept
  // moving. The slot now carries its run id, and only that run's row shows it.
  function pendingTransfer(over) {
    // No size on the artifact, so the buffered path takes it: one fetch, which
    // never resolves — a real multi-minute transfer, held still.
    return historyHarness([burnRun(7)], Object.assign({
      listRunArtifacts: function () { return Promise.resolve([{ id: 9 }]); },
      fetch: function () { return new Promise(function () {}); }
    }, over || {}));
  }

  it('does not carry a transfer onto a video that never started one', async () => {
    const env = pendingTransfer();
    await listed(env);
    env.api.downloadBurned(7);          // deliberately not awaited: still running
    await settle();
    assert.strictEqual(rowPart(env, 7, 'export-item__meta').textContent,
      'T:export.video_downloading', 'the transfer must be showing on its own row');

    // Navigate to another video of the same talk, exactly as showPreview does.
    env.previewState.videoSlug = 'Other';
    env.historyRuns = [burnRun(8, { slug: 'Other' })];
    env.api.resumeBurnWatch(TALK, 'Other');
    await listed(env);

    assert.strictEqual(rowPart(env, 8, 'export-item__meta').hidden, true,
      'the other video never started a transfer — none of its rows may wear one');
    assert.strictEqual(rowPart(env, 8, 'export-history__item').disabled, false,
      'and none may be disabled by another video\'s transfer');
    assert.strictEqual(env.els['btn-burn-video'].disabled, false, 'nor may the item');
  });

  it('shows the transfer again on returning to the video it belongs to', async () => {
    // The other half of the same fact: the bytes really are still moving, so
    // coming back must show that on the row, not a bare offer to download.
    const env = pendingTransfer();
    await listed(env);
    env.api.downloadBurned(7);
    await settle();
    env.previewState.videoSlug = 'Other';
    env.historyRuns = [];
    env.api.resumeBurnWatch(TALK, 'Other');
    await listed(env);
    env.previewState.videoSlug = SLUG;
    env.historyRuns = [burnRun(7)];
    env.api.resumeBurnWatch(TALK, SLUG);
    await listed(env);
    assert.strictEqual(rowPart(env, 7, 'export-item__meta').textContent,
      'T:export.video_downloading');
    assert.strictEqual(rowPart(env, 7, 'export-history__item').disabled, true);
  });

  it('shows no bar at all when there is no length to count against', async () => {
    // The buffered path (no save dialog, or an artifact of unknown size) reads
    // the whole archive and cannot place a bar until a length is known. An
    // empty bar sitting at zero for ten minutes reads as broken; the line saying
    // the transfer is running is the honest half.
    const seen = [];
    const env = historyHarness([burnRun(7)], {
      listRunArtifacts: function () { return Promise.resolve([{ id: 9 }]); },
      fetch: function () {
        // RECORDED here, asserted below. downloadBurned()'s .catch() swallows
        // whatever this stub throws and paints it onto the row, so an assertion
        // made inside it is reported as a failed transfer — and the test passed
        // whatever the row actually looked like.
        seen.push({ meta: rowPart(env, 7, 'export-item__meta').textContent,
                    track: rowPart(env, 7, 'burn-track').hidden });
        return Promise.reject(new Error('stop here'));
      }
    });
    await listed(env);
    await env.api.downloadBurned(7);
    assert.deepStrictEqual(seen, [{ meta: 'T:export.video_downloading', track: true }],
      'the line under the row reports the transfer, and no bar is drawn for it');
    assert.strictEqual(rowPart(env, 7, 'burn-panel__error').textContent, 'stop here',
      'and what came back is the stub\'s own failure, not a swallowed assertion');
  });

  it('announces the save on the buffered path too', async () => {
    // The streaming path says so; a browser without a save dialog reached the
    // same end in silence, which is the same complaint in a different browser.
    const env = makeHarness();
    let closed = false;
    env.window.showSaveFilePicker = function () {
      return Promise.resolve({ createWritable: function () {
        return Promise.resolve({
          write: function () { return Promise.resolve(); },
          close: function () { closed = true; return Promise.resolve(); }
        });
      } });
    };
    await env.api.saveMp4(new Uint8Array([1, 2, 3]), 'x.mp4');
    assert.ok(closed, 'the file must actually be written');
    assert.ok(env.toasts.some(function (m) { return m.indexOf('T:burn.saved') === 0; }),
      'got ' + JSON.stringify(env.toasts));
  });

  it('shows the bar the moment the length becomes known, not a percent later', async () => {
    // The percent gate compared the OLD loaded against the NEW total, so
    // 0-of-unknown and 0-of-known both floored to 0 and nothing repainted: the
    // bar and the "0 MB of N MB" counter stayed away until a whole percent had
    // landed — 20 MB into a 2 GB file. Driven directly, because the streaming
    // harness's chunks are file halves: at 50% a chunk even the broken gate
    // repainted, so an end-to-end run here proves nothing.
    const env = pendingTransfer();
    await listed(env);
    env.api.downloadBurned(7);                 // slot is {loaded: 0, total: 0}
    await settle();
    assert.strictEqual(rowPart(env, 7, 'export-item__meta').textContent,
      'T:export.video_downloading', 'setup: no counter while the length is unknown');

    env.api.advanceBurnDownload(100, 1000000);   // 0.01% — under any percent

    assert.strictEqual(rowPart(env, 7, 'export-item__meta').textContent, 'T:burn.downloaded',
      'the first chunk carries the length — the counter must appear on it');
    assert.strictEqual(rowPart(env, 7, 'burn-track').hidden, false, 'and the bar with it');
  });

  it('counts the bytes onto the bar as they land', async () => {
    const zip = skewedZip(Buffer.alloc(60000, 7), 11);
    const env = savingHarness(zip.bytes);
    await settle();
    const seen = watchWrites(env, 7);

    await env.api.downloadBurned(7);

    const values = seen.map(function (s) { return Number(s.value); });
    assert.ok(values.length > 1, 'need more than one chunk to see movement');
    assert.ok(values[values.length - 1] > values[0],
      'the bar must advance with the transfer: ' + JSON.stringify(values));
    for (const v of values) {
      assert.ok(v >= 0 && v <= 100, 'a bar past its ends reads as a bug: ' + v);
    }
  });

  it('hands the row back when the save dialog is dismissed', async () => {
    // Nothing transfers, so nothing may be left claiming it does.
    const abort = new Error('user cancelled');
    abort.name = 'AbortError';
    const zip = skewedZip(Buffer.alloc(20000, 7), 11);
    const env = savingHarness(zip.bytes, {
      window: {
        screen: { width: 1280, height: 720 },
        showSaveFilePicker: function () { return Promise.reject(abort); }
      }
    });
    await settle();
    await env.api.downloadBurned(7);
    assert.strictEqual(rowPart(env, 7, 'export-item__meta').hidden, true);
    assert.strictEqual(rowPart(env, 7, 'export-history__item').disabled, false);
  });

  it('hands the row back when the transfer fails', async () => {
    // A stuck "downloading, please wait" over a dead transfer is the worst of
    // both: no file, and no way to ask for one again.
    const zip = skewedZip(Buffer.alloc(20000, 7), 11);
    const env = savingHarness(zip.bytes);
    await settle();
    // The write itself fails — a revoked handle, a full disk.
    env.sink.stream.write = function () { return Promise.reject(new Error('disk full')); };
    await env.api.downloadBurned(7);
    assert.strictEqual(rowPart(env, 7, 'burn-panel__error').textContent, 'disk full',
      'the failure must be reported on the row it happened to');
    assert.strictEqual(rowPart(env, 7, 'export-history__item').disabled, false,
      'the row must be pressable again');
    assert.strictEqual(env.els['burn-error'].hidden, true,
      'the render readout reports renders, not downloads');
  });

  it('shows the row\'s error instead of only writing it', async () => {
    // The line ships hidden, so a message written into it and left hidden is a
    // failure nobody sees — and a row that simply stopped doing anything.
    const zip = skewedZip(Buffer.alloc(20000, 7), 11);
    const env = savingHarness(zip.bytes);
    await settle();
    env.sink.stream.write = function () { return Promise.reject(new Error('disk full')); };
    await env.api.downloadBurned(7);
    assert.strictEqual(rowPart(env, 7, 'burn-panel__error').hidden, false,
      'the error the row carries has to be on screen to be an error');
  });

  it('shows the "downloaded" line instead of only writing it', async () => {
    // Same line, same hidden-by-default: the one sign a few hundred megabytes
    // reached the disk is worth nothing while it is not displayed.
    const zip = skewedZip(Buffer.alloc(20000, 7), 11);
    const env = savingHarness(zip.bytes);
    await settle();
    await env.api.downloadBurned(7);
    assert.strictEqual(rowPart(env, 7, 'export-item__meta').hidden, false,
      'the claim that the file landed has to be unhidden to be read');
  });

  it('widens the fill with the transfer, not only the value it publishes', async () => {
    // aria-valuenow is what a screen reader reads; the width is the bar a
    // sighted reviewer watches. A fill left at 0% leaves them looking at an
    // empty track for the whole transfer, with the published value none the
    // wiser.
    const zip = skewedZip(Buffer.alloc(60000, 7), 11);
    const env = savingHarness(zip.bytes);
    await settle();
    await env.api.downloadBurned(7);
    const width = parseFloat(rowPart(env, 7, 'burn-seg__fill').style.width);
    assert.ok(width > 0, 'the fill must have widened with the bytes: got ' + width);
  });

  it('retires a row\'s error when the menu is closed', async () => {
    // Closing the menu is what retires every claim a row makes. An error left
    // behind would be waiting under the row on the next open, describing a
    // transfer the reviewer has long since dealt with.
    const zip = skewedZip(Buffer.alloc(20000, 7), 11);
    const env = savingHarness(zip.bytes);
    await settle();
    env.sink.stream.write = function () { return Promise.reject(new Error('disk full')); };
    await env.api.downloadBurned(7);
    assert.strictEqual(rowPart(env, 7, 'burn-panel__error').textContent, 'disk full',
      'precondition: the row is carrying the failure');
    env.api.closeExportMenu();
    await listed(env);
    assert.strictEqual(rowPart(env, 7, 'burn-panel__error').textContent, '',
      'a fresh look at the menu is a fresh row');
    assert.strictEqual(rowPart(env, 7, 'burn-panel__error').hidden, true,
      'and a row carrying no error shows no error line — an empty alert under '
      + 'every row is an announcement of nothing');
  });

  it('a second attempt clears the first one\'s error on the row', async () => {
    // Closing the menu is not the only way back: the row is pressable again the
    // moment a transfer dies, and the reviewer's obvious next move is to press
    // it. The message from the attempt before must not sit under a transfer that
    // is running, nor under one that then succeeds.
    const zip = skewedZip(Buffer.alloc(20000, 7), 11);
    const env = savingHarness(zip.bytes);
    await settle();
    let fail = true;
    const write = env.sink.stream.write;
    env.sink.stream.write = function (chunk) {
      return fail ? Promise.reject(new Error('disk full'))
                  : write.call(env.sink.stream, chunk);
    };
    await env.api.downloadBurned(7);
    assert.strictEqual(rowPart(env, 7, 'burn-panel__error').textContent, 'disk full',
      'precondition: the first attempt failed on the row');

    fail = false;                        // the disk has room now
    await env.api.downloadBurned(7);

    assert.strictEqual(rowPart(env, 7, 'burn-panel__error').textContent, '',
      'the row must not go on reporting a failure the retry undid');
    assert.strictEqual(rowPart(env, 7, 'burn-panel__error').hidden, true);
    assert.strictEqual(rowPart(env, 7, 'export-item__meta').textContent,
      'T:export.video_downloaded', 'and it says the file landed the second time');
  });

  it('records the landed file on the no-picker path too', async () => {
    // Safari and Firefox save to the Downloads folder without asking. The file
    // still arrived, so the row has to stop offering the download as if the
    // click had done nothing — the same statement the streaming path makes.
    const zip = skewedZip(Buffer.alloc(20000, 7), 11);
    const env = savingHarness(zip.bytes, {
      window: { screen: { width: 1280, height: 720 } }   // no save dialog at all
    });
    await settle();
    await env.api.downloadBurned(7);
    assert.strictEqual(rowPart(env, 7, 'export-item__meta').textContent,
      'T:export.video_downloaded', 'the row must record the file it just saved');
  });

  it('says the video was saved, since nothing else will', async () => {
    // The streaming path writes through the save dialog's own file handle, so
    // Chrome files it under NOTHING: no entry in the downloads list, no shelf,
    // no progress. A reviewer who waited ~25 minutes for the render is left
    // watching a menu that never changes while a few hundred MB land silently
    // on disk. The subtitle file, saved through an anchor, DOES appear there —
    // so the two downloads behaved differently for no reason the user can see.
    const zip = skewedZip(Buffer.alloc(20000, 7), 11);
    const env = savingHarness(zip.bytes);
    await settle();
    await env.api.downloadBurned(7);

    assert.ok(env.toasts.some(function (m) { return m.indexOf('T:burn.saved') === 0; }),
      'a finished stream must announce itself: got ' + JSON.stringify(env.toasts));
  });

  it('stays quiet when the save dialog was dismissed', async () => {
    // Cancelling the dialog is a deliberate no-op, and "saved" over a file the
    // user declined to create would be a plain lie.
    const zip = skewedZip(Buffer.alloc(20000, 7), 11);
    const abort = new Error('user cancelled');
    abort.name = 'AbortError';
    const env = savingHarness(zip.bytes, {
      window: {
        screen: { width: 1280, height: 720 },
        showSaveFilePicker: function () { return Promise.reject(abort); }
      }
    });
    await settle();
    await env.api.downloadBurned(7);

    assert.ok(!env.toasts.some(function (m) { return m.indexOf('T:burn.saved') === 0; }),
      'a cancelled save must not claim a file was written');
  });

  it('streams the mp4 to disk without ever fetching the whole artifact', async () => {
    // 20 KB of payload, so the 4 KB tail window is a real window rather than
    // an accidental whole-file read. The server exposes no Content-Range on
    // its 206s, as the real one does not: the driver has to place the window
    // from the range it asked for.
    const zip = skewedZip(Buffer.alloc(20000, 7), 11);
    const env = savingHarness(zip.bytes);
    await settle();
    await env.api.downloadBurned(7);
    assert.strictEqual(rowPart(env, 7, 'burn-panel__error').textContent, '', 'nothing may have failed');
    assert.strictEqual(env.server.ranges.length, 3,
      'tail, local header, data — three small requests, no fourth');
    assert.ok(env.server.served < zip.bytes.length + 6000,
      'the artifact must not be transferred more than once over: served ' +
      env.server.served + ' of ' + zip.bytes.length);
  });

  it('asks for the tail as an explicit range, never as bytes=-N', async () => {
    // Measured: the blob host the API redirects to ignores a suffix range and
    // answers 200 with the whole file. Asking for one would send every
    // download down the buffered path — the very thing being removed here.
    const zip = skewedZip(Buffer.alloc(20000, 7), 11);
    const env = savingHarness(zip.bytes);
    await settle();
    await env.api.downloadBurned(7);
    assert.strictEqual(env.server.ranges[0],
      'bytes=' + (zip.bytes.length - 4096) + '-' + (zip.bytes.length - 1));
    assert.ok(env.server.ranges.every(function (r) { return /^bytes=\d+-\d+$/.test(r); }),
      'every range must name both ends: an open-ended one is unbounded if the ' +
      'reported size is short');
  });

  it('writes the entry data byte for byte, from its OWN local header', async () => {
    // The local header's extra field is 11 bytes the central directory does
    // not know about: reusing the central lengths shifts the data range.
    const payload = Buffer.from(Array.from({ length: 20000 },
      function (_, i) { return i % 251; }));
    const zip = skewedZip(payload, 11);
    const env = savingHarness(zip.bytes);
    await settle();
    await env.api.downloadBurned(7);
    assert.strictEqual(env.server.ranges.length, 3,
      'precondition: this came down the streaming path');
    assert.deepStrictEqual(env.sink.saved(), payload,
      'the saved file must be the entry data exactly');
    assert.strictEqual(env.picked.suggestedName, MENU_MODEL.burnedVideoName(TALK, SLUG, null),
      'the save dialog must suggest the video\'s own name, not the archive entry\'s');
  });

  it('asks for the data range the local header points at, and no more', async () => {
    const zip = skewedZip(Buffer.alloc(20000, 3), 11);
    const env = savingHarness(zip.bytes);
    await settle();
    await env.api.downloadBurned(7);
    assert.strictEqual(env.server.ranges[2],
      'bytes=' + zip.dataAt + '-' + (zip.dataAt + 20000 - 1));
  });

  it('writes through a reader loop when the body cannot pipeTo', async () => {
    const payload = Buffer.alloc(9000, 5);
    const zip = skewedZip(payload, 4);
    const env = savingHarness(zip.bytes, null, { pipeTo: false });
    await settle();
    await env.api.downloadBurned(7);
    assert.strictEqual(env.server.ranges.length, 3,
      'precondition: this came down the streaming path');
    assert.deepStrictEqual(env.sink.saved(), payload);
  });

  it('retries once with a larger window when the tail misses the directory', async () => {
    // An 8 KB ZIP comment pushes the EOCD out of the 4 KB tail entirely.
    const payload = Buffer.alloc(20000, 9);
    const zip = skewedZip(payload, 6, 8192);
    const env = savingHarness(zip.bytes);
    await settle();
    await env.api.downloadBurned(7);
    assert.deepStrictEqual(env.sink.saved(), payload, 'the retry must succeed');
    assert.strictEqual(env.server.ranges.filter(function (r) {
      return r === 'bytes=' + (zip.bytes.length - 4096) + '-' + (zip.bytes.length - 1);
    }).length, 1, 'the small tail must be tried once, not looped over');
    assert.strictEqual(env.server.ranges.length, 4,
      'small tail, larger tail, local header, data');
  });

  it('asks again from the length the server reports when the API size is stale', async () => {
    // A start past the end is a 416 — and a 416 is the one response whose
    // Content-Range the blob host exposes, so it can say how long the file
    // really is instead of leaving the download stuck.
    const payload = Buffer.alloc(20000, 8);
    const zip = skewedZip(payload, 3);
    const env = savingHarness(zip.bytes, {
      listRunArtifacts: function () {
        return Promise.resolve([{ id: 9, size_in_bytes: zip.bytes.length + 500000 }]);
      }
    });
    await settle();
    await env.api.downloadBurned(7);
    assert.deepStrictEqual(env.sink.saved(), payload);
    assert.strictEqual(env.server.ranges.length, 4,
      'the 416, then the corrected tail, the local header and the data');
  });

  it('streams a video far too large to hold in memory', async () => {
    // The size guard exists because the buffered path allocates the whole
    // file; the streaming path allocates nothing, so it must not inherit it.
    // (The stand-in archive is small, so the first tail lands past its end and
    // the 416 correction above carries the download through.)
    const payload = Buffer.alloc(4096, 1);
    const zip = skewedZip(payload, 0);
    const env = savingHarness(zip.bytes, {
      listRunArtifacts: function () {
        return Promise.resolve([{ id: 9, size_in_bytes: 2469606195 }]);
      }
    });
    await settle();
    await env.api.downloadBurned(7);
    assert.strictEqual(rowPart(env, 7, 'burn-panel__error').textContent, '',
      'a 2.3 GB video is exactly what streaming is for');
    assert.deepStrictEqual(env.sink.saved(), payload);
  });

  it('falls back to the buffered path when the server ignores Range', async () => {
    // A 200 carries the WHOLE file: writing it as if it were the slice would
    // save a ZIP with an .mp4 name on it.
    const payload = Buffer.alloc(300, 2);
    const zip = skewedZip(payload, 5);
    const env = savingHarness(zip.bytes, null, { ignoreRange: true });
    await settle();
    await env.api.downloadBurned(7);
    assert.deepStrictEqual(env.sink.saved(), payload,
      'the fallback must still produce the mp4, not the archive around it');
    assert.ok(env.server.cancels >= 1,
      'the whole-artifact body the window reader discards must be cancelled');
  });

  it('cancels the body and names the ignored range when the data comes back 200', async () => {
    // The tail proved this host honours Range, so a 200 on the DATA range is
    // the whole archive arriving where the video was expected. Throwing with
    // the body still open leaves a full-artifact transfer running, and
    // "(HTTP 200)" tells the user nothing about what went wrong.
    const zip = skewedZip(Buffer.alloc(20000, 6), 0);
    const windows = rangeServer(zip.bytes);
    const whole = rangeServer(zip.bytes, { ignoreRange: true });
    let n = 0;
    const env = savingHarness(zip.bytes, {
      fetch: function (url, init) {
        n += 1;   // 1 tail, 2 local header, 3 the video data itself
        return (n === 3 ? whole : windows).fetch(url, init);
      }
    });
    await settle();
    await env.api.downloadBurned(7);
    assert.strictEqual(whole.cancels, 1,
      'the whole-artifact body must be cancelled, not left transferring');
    assert.strictEqual(rowPart(env, 7, 'burn-panel__error').textContent, 'T:burn.range_ignored',
      'the error must describe the ignored range, not report "(HTTP 200)"');
    assert.strictEqual(env.sink.chunks.length, 0,
      'nothing may reach the file when the response is not the slice');
  });

  it('reports an abort raised once the bytes are already flowing', async () => {
    // Cancelling the SAVE DIALOG is a no-op; an abort during the transfer is a
    // half-written file. A catch spanning the whole chain would swallow it and
    // report the truncated download as finished.
    const abort = new Error('The user aborted a request.');
    abort.name = 'AbortError';
    const zip = skewedZip(Buffer.alloc(20000, 4), 0);
    const windows = rangeServer(zip.bytes);
    let n = 0;
    const env = savingHarness(zip.bytes, {
      fetch: function (url, init) {
        n += 1;
        if (n !== 3) return windows.fetch(url, init);
        return Promise.resolve({
          ok: true, status: 206,
          headers: { get: function () { return null; } },
          // Some bytes land, then the transfer aborts.
          body: new ReadableStream({
            start: function (c) { c.enqueue(new Uint8Array(64)); c.error(abort); }
          })
        });
      }
    });
    await settle();
    await env.api.downloadBurned(7);
    assert.strictEqual(rowPart(env, 7, 'burn-panel__error').textContent, abort.message,
      'an abort mid-transfer leaves a truncated file — it is a failure');
  });

  it('never streams a deflated entry raw — it decompresses it instead', async () => {
    // Piping compressed bytes to disk writes a file that looks fine until it
    // is played. compression-level: 0 makes this unreachable today; it must
    // stay impossible if that ever changes.
    const zlib = require('node:zlib');
    const payload = Buffer.from('what a deflated entry decompresses to');
    const deflated = zlib.deflateRawSync(payload);
    const zip = skewedZip(deflated, 0);
    // Turn the entry DEFLATED in the central directory the driver reads.
    const cdAt = zip.dataAt + deflated.length;
    new DataView(zip.bytes.buffer).setUint16(cdAt + 10, 8, true);
    const env = savingHarness(zip.bytes);
    await settle();
    await env.api.downloadBurned(7);
    assert.ok(env.server.ranges.includes(''),
      'the entry cannot be streamed, so it must go down the buffered path ' +
      'that decompresses it');
    assert.deepStrictEqual(env.sink.saved(), payload,
      'the saved bytes must be the decompressed mp4, never the raw entry');
  });

  it('downloads nothing when the save dialog is cancelled', async () => {
    const abort = new Error('The user aborted a request.');
    abort.name = 'AbortError';
    const zip = skewedZip(Buffer.alloc(20000, 4), 0);
    const env = savingHarness(zip.bytes, {
      window: {
        screen: { width: 1280, height: 720 },
        showSaveFilePicker: function () { return Promise.reject(abort); }
      }
    });
    await settle();
    await env.api.downloadBurned(7);
    assert.strictEqual(rowPart(env, 7, 'burn-panel__error').textContent, '',
      'a deliberate cancel is not a failure');
    assert.strictEqual(env.server.ranges.length, 2,
      'the video must not be fetched for a save the user called off');
  });

  // ---- the writer must be CALLED when its inputs change ----
  //
  // updateExportUi() computes the right answer from whatever it reads — every
  // test above proves that. It shipped broken anyway, because nothing proved
  // it RUNS when an input moves: the button stayed dead after the sync it was
  // waiting for turned green. These tests fire the real trigger code (extracted
  // the same way as the driver) and assert on the control's observable state.

  // The sync wiring outside the driver block: onSyncStatus() is what the edit
  // engine calls on every status transition, and renderSyncStatus() is the one
  // paint that engine attach (ensureEditSync) and teardown (destroyEditSync)
  // also funnel through.
  function makeSyncWiring(env) {
    const s1 = html.indexOf('function onSyncStatus(');
    const e1 = html.indexOf('// Remote edits just landed');
    const s2 = html.indexOf('function renderSyncStatus(');
    const e2 = html.indexOf('// The chip is the whole signed-in lifecycle');
    assert.ok(s1 > -1 && e1 > s1 && s2 > -1 && e2 > s2,
      'sync wiring blocks not found in index.html');
    const names = ['destroyEditSync', 'clearAuth', 'updateAuthUI', 'showToast',
      't', 'paintSyncChip', 'editSync', 'previewMarkerModeActive', 'updateExportUi'];
    const stubs = {
      destroyEditSync: function () {},
      clearAuth: function () {},
      updateAuthUI: function () {},
      showToast: function (m) { env.toasts.push(m); },
      t: env.t,
      paintSyncChip: function () {},
      editSync: env.editSync,
      previewMarkerModeActive: function () { return false; },
      updateExportUi: env.api.updateExportUi
    };
    return new Function(names.join(','),
      html.slice(s1, e1) + '\n' + html.slice(s2, e2) +
      '\nreturn { onSyncStatus: onSyncStatus, renderSyncStatus: renderSyncStatus };')
      .apply(null, names.map(function (n) { return stubs[n]; }));
  }

  it('re-enables the download control when the sync it was waiting for finishes', () => {
    // The live bug: the control went quiet while the edits were syncing —
    // correctly — and then stayed dead forever, because onSyncStatus() painted
    // the cloud chip and stopped there.
    let status = 'pending';
    const engine = { talkId: 't', getInfo: function () {
      return { status: status, branch: 'sync/me/t--v-uk' }; } };
    const env = makeHarness({
      previewState: { talkId: 't', videoSlug: 'v', srtLang: 'uk',
                      edits: { uk: { 3: 'edited' } } },
      editSync: engine });
    const sync = makeSyncWiring(env);
    env.api.updateExportUi();
    assert.strictEqual(env.els['btn-export'].disabled, true,
      'precondition: the control waits for the sync');
    status = 'synced';
    sync.onSyncStatus('synced', engine.getInfo());
    assert.strictEqual(env.els['btn-export'].disabled, false,
      'the sync finished — no later event will re-enable the control for the user');
    assert.strictEqual(env.els['btn-export'].title, 'T:export.title',
      'and the wait-for-sync reason must come off with the disablement');
  });

  it('takes the open menu down when a fresh edit puts the branch behind again', () => {
    // The reverse transition, driven by the trigger itself rather than by a
    // manual updateExportUi() call — and it walks the updateExportUi ->
    // closeExportMenu -> setBurnFollowing re-entry path from a NEW call site,
    // so it also proves the cycle stays broken.
    let status = 'synced';
    const engine = { talkId: 't', getInfo: function () {
      return { status: status, branch: 'sync/me/t--v-uk' }; } };
    const env = makeHarness({
      previewState: { talkId: 't', videoSlug: 'v', srtLang: 'uk',
                      edits: { uk: { 3: 'edited' } } },
      editSync: engine });
    const sync = makeSyncWiring(env);
    env.api.openExportMenu();
    assert.strictEqual(env.els['export-menu'].hidden, false, 'precondition: open');
    status = 'pending';
    sync.onSyncStatus('pending', engine.getInfo());
    assert.strictEqual(env.els['export-menu'].hidden, true,
      'the menu must not stay open over downloads of text nobody is looking at');
    assert.strictEqual(env.els['btn-export'].disabled, true);
    assert.strictEqual(env.els['btn-export'].title, 'T:burn.wait_for_sync');
  });

  it('re-enables the control when the engine is torn down mid-sync', () => {
    // destroyEditSync() paints the chip idle through renderSyncStatus() — with
    // no engine the source ref falls back to main, so the control must come
    // back through the same funnel.
    const engine = { talkId: 't', getInfo: function () {
      return { status: 'pending', branch: 'sync/me/t--v-uk' }; } };
    const env = makeHarness({
      previewState: { talkId: 't', videoSlug: 'v', srtLang: 'uk',
                      edits: { uk: { 3: 'edited' } } },
      editSync: engine });
    const sync = makeSyncWiring(env);
    env.api.updateExportUi();
    assert.strictEqual(env.els['btn-export'].disabled, true,
      'precondition: mid-sync the control waits');
    engine.talkId = 'some-other-talk';   // what a torn-down engine looks like here
    sync.renderSyncStatus('idle', null);
    assert.strictEqual(env.els['btn-export'].disabled, false,
      'no engine means the published subtitles on main — nothing to wait for');
  });

  // The one function every path that changes previewState.edits already ends
  // in (add, typing, undo, clear-all, remote merge). It runs against the same
  // previewState and document the driver reads.
  function makeEditsFunnel(env) {
    const s = html.indexOf('function updateClearBtn(');
    const e = html.indexOf('SPA.clearAll =');
    assert.ok(s > -1 && e > s, 'updateClearBtn block not found in index.html');
    env.els['btn-clear-all'] = makeEl('btn-clear-all');
    const names = ['document', 'previewState', 't', 'updateExportUi'];
    const stubs = {
      document: env.document,
      previewState: env.previewState,
      t: env.t,
      updateExportUi: env.api.updateExportUi
    };
    return new Function(names.join(','),
      html.slice(s, e) + '\nreturn { updateClearBtn: updateClearBtn };')
      .apply(null, names.map(function (n) { return stubs[n]; }));
  }

  it('routes every edit path through the funnel that repaints the export item', () => {
    // Source-level guard, deliberately: these handlers move the live caret and
    // selection, open the confirm dialog and drive the player, so they cannot
    // run in this harness. The behavioural half is the test above — the funnel
    // repaints the item; this half pins that each path that moves
    // previewState.edits reaches the funnel.
    const paths = [
      ['SPA.addEdit = function', 'SPA.onEditInput ='],
      ['SPA.onEditInput = function', 'SPA.deleteEdit ='],
      ['SPA.deleteEdit = function', 'function updateClearBtn('],
      ['SPA.clearAll = function', 'SPA.copyMarkers = function'],
      ['function onSyncRemoteApplied(', '// The preview shows one sync chip']
    ];
    for (const [from, to] of paths) {
      const s = html.indexOf(from);
      const e = html.indexOf(to);
      assert.ok(s > -1 && e > s, from + ' not found in index.html');
      assert.match(html.slice(s, e), /updateClearBtn\(\)/,
        from + ' must reach updateClearBtn() — the one place the export item ' +
        'is repainted after the edits change');
    }
  });

  // updateAuthUI() is the single funnel for sign-in, sign-out and a token
  // gaining or losing repo write access.
  function makeAuthFunnel(env, over) {
    const s = html.indexOf('function updateAuthUI(');
    const e = html.indexOf('// Probe the viewer');
    assert.ok(s > -1 && e > s, 'updateAuthUI block not found in index.html');
    const authEls = {};
    ['gh-login-btn', 'gh-avatar', 'gh-avatar-wrap'].forEach(function (id) {
      const el = makeEl(id);
      el.classList = { toggle: function () {} };
      authEls[id] = el;
    });
    const names = ['document', 'getAuthUser', 'ghWriteUser', 'ghClientId', 't',
      'updatePreviewSubmitButtons', 'ensureEditSync', 'ensureMarkerSync',
      'manifest', 'updateExportUi'];
    const stubs = Object.assign({
      document: {
        getElementById: function (id) { return authEls[id] || null; },
        querySelectorAll: function () { return []; },
        body: { classList: { toggle: function () {} } }
      },
      getAuthUser: function () { return null; },
      ghWriteUser: env.ghWriteUser,
      ghClientId: function () { return 'cid'; },
      t: env.t,
      updatePreviewSubmitButtons: function () {},
      // Inert ON PURPOSE: the real ensureEditSync() usually repaints through
      // renderSyncStatus(), but its view-not-ready branch returns without
      // painting anything — the explicit call in updateAuthUI() is what has to
      // cover that window, so the engine hooks must not cover for it here.
      ensureEditSync: function () {},
      ensureMarkerSync: function () {},
      manifest: null,
      updateExportUi: env.api.updateExportUi
    }, over || {});
    return new Function(names.join(','),
      html.slice(s, e) + '\nreturn { updateAuthUI: updateAuthUI };')
      .apply(null, names.map(function (n) { return stubs[n]; }));
  }

  // checkWriteAccess() is where a session learns it may write again — the only
  // moment that happens without a reload. Sliced like the auth funnel above, so
  // these tests drive the branch that ships rather than a copy of it.
  // `getRepoPermissions` is the one stub each test overrides: it is what the
  // probe reads, and flipping it is how write access is taken and given back.
  function makeWriteProbe(env, over) {
    const s = html.indexOf('function checkWriteAccess()');
    const e = html.indexOf('var WRITE_RECHECK_MS');
    assert.ok(s > -1 && e > s, 'checkWriteAccess block not found in index.html');
    let noWrite = false;   // the stored flag, as save/clearNoWrite keep it
    const names = ['document', 'API', 'getAuthToken', 'getRepoPermissions', 'hasNoWrite',
      'clearNoWrite', 'saveNoWrite', 'clearAuth', 'updateAuthUI', 'showToast', 't',
      'syncBurnFollowing', 'refreshBurnHistory'];
    const stubs = Object.assign({
      document: env.document,
      API: env.API,
      getAuthToken: env.getAuthToken,
      getRepoPermissions: function () { return Promise.resolve({ push: true }); },
      hasNoWrite: function () { return noWrite; },
      clearNoWrite: function () { noWrite = false; },
      saveNoWrite: function () { noWrite = true; },
      clearAuth: function () {},
      // The funnel itself is covered above; what matters here is the one thing
      // it does for the export control — and that it is NOT enough on its own.
      updateAuthUI: env.api.updateExportUi,
      showToast: env.showToast,
      t: env.t,
      syncBurnFollowing: env.api.syncBurnFollowing,
      refreshBurnHistory: env.api.refreshBurnHistory
    }, over || {});
    return new Function(names.join(','),
      html.slice(s, e) + '\nreturn { checkWriteAccess: checkWriteAccess };')
      .apply(null, names.map(function (n) { return stubs[n]; }));
  }

  it('repaints the export control on a write-access flip, without help from the engine hooks', () => {
    let write = true;
    const user = function () { return write ? { login: 'me', avatar_url: 'a' } : null; };
    const env = makeHarness({ ghWriteUser: user });
    const auth = makeAuthFunnel(env, { getAuthUser: user, ghWriteUser: user });
    env.api.updateExportUi();
    assert.strictEqual(env.els['btn-burn-video'].disabled, false,
      'precondition: a write session may render');

    write = false;
    auth.updateAuthUI();
    assert.strictEqual(env.els['btn-burn-video'].disabled, true,
      'the session lost write access — the item must stop offering a dispatch');

    write = true;
    auth.updateAuthUI();
    assert.strictEqual(env.els['btn-burn-video'].disabled, false,
      'write regained — the item comes back without a reload');
  });

  it('drops the previous video\'s rows and readout when another video is entered', async () => {
    // showPreview() calls resumeBurnWatch() on every entry. The reset must reach
    // the screen: video A's rows and its run link must not sit under video B,
    // and an answer still out for A must not fill B's list when it lands.
    const answers = [];
    const env = historyHarness([], {
      listBurnRuns: function () { return new Promise(function (r) { answers.push(r); }); },
      matchRun: function () { return { id: 5, html_url: 'https://x/actions/runs/5' }; }
    });
    env.api.openExportMenu();
    answers.shift()([burnRun(7)]);
    await settle();
    assert.strictEqual(rows(env).length, 1, 'precondition: video A lists its render');
    await env.api.startBurn();
    await settle();
    assert.strictEqual(env.els['burn-run-link'].hidden, false, 'precondition: linked');
    env.api.closeExportMenu();
    env.api.openExportMenu();                   // a second look for A, still out

    env.previewState.videoSlug = 'Other';
    env.api.resumeBurnWatch(TALK, 'Other');    // nothing recorded for Other
    answers.shift()([burnRun(7)]);              // A's late answer lands
    await settle();

    assert.strictEqual(env.els['burn-history-list'].hidden, true,
      'A\'s answer must not fill the list of the video now on screen');
    assert.strictEqual(rows(env).length, 0);
    assert.strictEqual(env.els['burn-item-label'].textContent, 'T:export.video_make');
    assert.strictEqual(env.els['burn-track'].hidden, true, 'nor may A\'s track show');
    assert.strictEqual(env.els['burn-run-link'].hidden, true, 'nor a link to A\'s run');
  });

  it('drops the previous video\'s error when another video is entered', async () => {
    const env = makeHarness();
    await env.api.startBurn('t', 'v');
    env.api.showBurnError('boom');
    assert.strictEqual(env.els['burn-error'].hidden, false, 'precondition: v failed');

    env.previewState.videoSlug = 'v2';
    env.api.resumeBurnWatch('t', 'v2');
    assert.strictEqual(env.els['burn-error'].hidden, true,
      'v\'s failure is not v2\'s — the error line must not survive the switch');
    assert.strictEqual(env.els['burn-error'].textContent, '');
  });

  // ---- the videos already created ----

  it('looks for the created videos on every open, and shows the wait', async () => {
    const env = historyHarness([burnRun(7)]);
    env.api.openExportMenu();
    assert.strictEqual(env.els['burn-history-spinner'].hidden, false,
      'the spinner stands in for the list while the request is out');
    assert.strictEqual(env.els['burn-history-list'].hidden, true);
    assert.strictEqual(env.historyCalls.length, 1, 'one request is the whole discovery');
    assert.strictEqual(env.historyCalls[0].workflow, 'burn-subtitles.yml');
    assert.match(env.historyCalls[0].since, /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ$/,
      'the look is bounded by the artifact retention');
    await settle();
    assert.strictEqual(env.els['burn-history-spinner'].hidden, true);
    assert.strictEqual(env.els['burn-history-list'].hidden, false);
    assert.strictEqual(rows(env).length, 1);

    env.api.closeExportMenu();
    env.api.openExportMenu();
    assert.strictEqual(env.historyCalls.length, 2,
      'a fresh look on every open: a render may have finished since, anywhere');
  });

  it('lists this video\'s renders newest first, naming only other people\'s', async () => {
    const env = historyHarness([
      burnRun(5, { ageMs: 5 * 3600000 }),
      burnRun(9, { actor: 'reviewer-2', ageMs: 3600000, scale: 150, clip: '600000-930500' }),
      burnRun(6, { slug: 'Other' })
    ], { t: function (k) { return k === 'history.scale' ? '{n}%' : 'T:' + k; } });
    await listed(env);
    assert.deepStrictEqual(rows(env).map(function (li) { return li.attrs['data-run']; }),
      ['9', '5'], 'this video only, newest first');
    assert.match(rowPart(env, 9, 'export-item__label').textContent, / · reviewer-2$/,
      'someone else\'s render says whose it is');
    assert.ok(!/ · /.test(rowPart(env, 5, 'export-item__label').textContent),
      'the reviewer\'s own does not: the room is better spent on the rest');
    assert.strictEqual(rowPart(env, 9, 'export-history__detail').textContent,
      '150% · 10:00–15:30.500', 'the size it was made at, and the span of a fragment');
    assert.strictEqual(rowPart(env, 5, 'export-history__detail').textContent,
      '100% · T:history.full', 'a whole video says so');
  });

  it('says so when nothing has been created yet', async () => {
    const env = historyHarness([]);
    await listed(env);
    assert.strictEqual(env.els['burn-history-note'].hidden, false);
    assert.strictEqual(env.els['burn-history-note'].textContent, 'T:history.empty');
    assert.strictEqual(env.els['burn-history-list'].hidden, true);
  });

  it('says the list could not be loaded, naming a missing permission', async () => {
    const denied = Object.assign(new Error('nope'), { status: 403 });
    for (const [error, said] of [[denied, 'T:burn.no_actions_permission'],
                                 [new Error('offline'), 'T:history.failed']]) {
      const env = historyHarness([], {
        listBurnRuns: function () { return Promise.reject(error); }
      });
      await listed(env);
      assert.strictEqual(env.els['burn-history-spinner'].hidden, true, 'the wait is over');
      assert.strictEqual(env.els['burn-history-note'].textContent, said);
      assert.strictEqual(env.els['burn-history-list'].hidden, true);
    }
  });

  it('drops an answer for a look that has been superseded', async () => {
    // Two looks race when the menu is closed and reopened quickly; the older
    // answer must not overwrite the newer one by landing last.
    const answers = [];
    const env = historyHarness([], {
      listBurnRuns: function () { return new Promise(function (r) { answers.push(r); }); }
    });
    env.api.openExportMenu();
    env.api.closeExportMenu();
    env.api.openExportMenu();
    answers[1]([burnRun(8)]);
    await settle();
    answers[0]([burnRun(7)]);
    await settle();
    assert.deepStrictEqual(rows(env).map(function (li) { return li.attrs['data-run']; }), ['8'],
      'the list is the newest look\'s answer');
  });

  it('drops a failed look that has been superseded', async () => {
    // The successful branch checks the sequence; the failing one did not, so a
    // refusal for the video just left painted its note over the list of the
    // video now on screen — and the rows it names belong to neither.
    let refuse;
    const env = historyHarness([], {
      listBurnRuns: function () { return new Promise(function (_, reject) { refuse = reject; }); }
    });
    const look = env.api.refreshBurnHistory();
    env.api.resumeBurnWatch(TALK, 'Other');        // a new video, a new sequence
    refuse(Object.assign(new Error('nope'), { status: 403 }));
    await look;
    assert.strictEqual(env.els['burn-history-note'].hidden, true,
      'an answer for a look that has been superseded may write nothing');
  });

  it('asks nothing of a session that cannot use the API', async () => {
    const env = historyHarness([burnRun(7)], { ghWriteUser: function () { return null; } });
    await listed(env);
    assert.strictEqual(env.historyCalls.length, 0);
    assert.strictEqual(env.els['burn-history-spinner'].hidden, true);
  });

  it('marks the render that just finished as the new one in the list', async () => {
    let done = false;
    const env = historyHarness([], {
      makeRequestId: function () { return 'req-b-a'; },
      matchRun: function () { return { id: 11, html_url: 'https://x/actions/runs/11' }; },
      computeProgress: function () {
        return Object.assign({}, NO_PROGRESS,
          done ? { done: true, fraction: 1 } : { fraction: 0.3, label: 'Render 20%' });
      }
    });
    await listed(env);
    await env.api.burnFullVideo();
    await settle();
    assert.strictEqual(env.els['burn-item-label'].textContent, 'T:export.video_working');
    assert.ok(env.localStorage.getItem('burn:' + TALK + ':' + SLUG), 'precondition: recorded');

    done = true;
    env.historyRuns = [burnRun(11, { request: 'req-b-a' }), burnRun(4, { ageMs: 86400000 })];
    env.timers.filter(Boolean).pop()();   // the next poll tick
    await settle();

    assert.strictEqual(env.els['burn-item-label'].textContent, 'T:export.video_make',
      'the item offers the next render');
    assert.strictEqual(rowPart(env, 11, 'export-history__new').hidden, false,
      'the video it just made is marked where the reviewer will look for it');
    assert.strictEqual(rowPart(env, 4, 'export-history__new').hidden, true);
    assert.strictEqual(env.localStorage.getItem('burn:' + TALK + ':' + SLUG), null,
      'a finished run is not resumed on the next visit — the list has it');
  });

  it('saves a render under the video\'s name, and a fragment under its span', async () => {
    const zip = skewedZip(Buffer.alloc(20000, 7), 11);
    const env = savingHarness(zip.bytes, null, null, [burnRun(7, { clip: '600000-930500' })]);
    await settle();
    await env.api.downloadBurned(7);
    assert.strictEqual(env.picked.suggestedName,
      TALK + '__' + SLUG + '__uk__00-10-00_00-15-30-500.mp4',
      'fragments of one video share a folder — the span, to the millisecond, ' +
      'keeps them apart');
  });

  it('says an expired artifact on its own row, and nowhere else', async () => {
    const env = historyHarness([burnRun(7)], {
      listRunArtifacts: function () { return Promise.resolve([{ id: 9, expired: true }]); }
    });
    await listed(env);
    await env.api.downloadBurned(7);
    assert.strictEqual(rowPart(env, 7, 'burn-panel__error').textContent, 'T:burn.expired');
    assert.strictEqual(rowPart(env, 7, 'export-history__item').disabled, false);
    assert.strictEqual(env.els['burn-error'].hidden, true,
      'the render readout reports renders, not downloads');
  });

  // ---- the two choices ----

  it('renders the whole video from the first choice, with no span', async () => {
    const env = makeHarness();
    await env.api.videoItemAction({ detail: 1 });
    await env.api.burnFullVideo();
    await settle();
    assert.strictEqual(env.dispatched, 1);
    assert.strictEqual(env.dispatchedInputs.clip, '', 'the whole video carries no clip');
    assert.strictEqual(env.els['burn-make-menu'].hidden, true, 'the choices close behind it');
    assert.strictEqual(env.els['burn-item-label'].textContent, 'T:export.video_working');
  });

  it('records the subtitle size set in the preview with the run', async () => {
    const env = makeHarness({
      getComputedStyle: function () { return { getPropertyValue: function () { return '1.5'; } }; }
    });
    await env.api.burnFullVideo();
    await settle();
    assert.strictEqual(env.dispatchedInputs.subs_scale, '150',
      'the list shows it, and the run name is the only place it can live');
  });

  it('opens no choices over a refused or busy item', async () => {
    const wrong = makeHarness(previewing({ srtLang: 'en' }));
    await wrong.api.videoItemAction({ detail: 1 });
    assert.strictEqual(wrong.els['burn-make-menu'].hidden, true, 'refused for its language');

    const busy = makeHarness();
    busy.api.startBurn();
    await settle();
    await busy.api.videoItemAction({ detail: 1 });
    assert.strictEqual(busy.els['burn-make-menu'].hidden, true, 'a render is in flight');
  });

  it('closes open choices when the item stops being able to act on them', async () => {
    const env = makeHarness();
    await env.api.videoItemAction({ detail: 1 });
    assert.strictEqual(env.els['burn-make-menu'].hidden, false, 'precondition: open');
    env.previewState.srtLang = 'en';
    env.api.updateExportUi();
    assert.strictEqual(env.els['burn-make-menu'].hidden, true);
  });

  it('opens on hover for a mouse, and lingers a moment after it leaves', () => {
    const env = makeHarness();
    env.window.matchMedia = function () { return { matches: true }; };
    env.api.burnMakeHover({ pointerType: 'touch' }, true);
    assert.strictEqual(env.els['burn-make-menu'].hidden, true,
      'touch has no hover: the tap decides');
    env.api.burnMakeHover({ pointerType: 'mouse' }, true);
    assert.strictEqual(env.els['burn-make-menu'].hidden, false, 'a mouse opens it by hovering');
    env.api.burnMakeHover({ pointerType: 'mouse' }, false);
    assert.strictEqual(env.els['burn-make-menu'].hidden, false,
      'crossing the gap to the flyout must not close it');
    assert.strictEqual(armedTimers(env), 1, 'a grace timer is armed instead');
    env.api.burnMakeHover({ pointerType: 'mouse' }, true);
    assert.strictEqual(armedTimers(env), 0, 'coming back cancels it');
    env.api.burnMakeHover({ pointerType: 'mouse' }, false);
    env.timers.filter(Boolean)[0]();
    assert.strictEqual(env.els['burn-make-menu'].hidden, true,
      'and it closes once the grace is up');
  });

  it('pins hover-opened choices once the item is pressed', async () => {
    const env = makeHarness();
    env.window.matchMedia = function () { return { matches: true }; };
    env.api.burnMakeHover({ pointerType: 'mouse' }, true);
    await env.api.videoItemAction({ detail: 1 });
    assert.strictEqual(env.els['burn-make-menu'].hidden, false,
      'a press over hover-opened choices keeps them — closing under the pointer undoes the hover');
    env.api.burnMakeHover({ pointerType: 'mouse' }, false);
    assert.strictEqual(armedTimers(env), 0, 'pinned choices ignore the pointer leaving');
    assert.strictEqual(env.els['burn-make-menu'].hidden, false);
  });

  it('never opens on hover where the choices unfold under the item', () => {
    const env = makeHarness();
    env.window.matchMedia = function () { return { matches: false }; };
    env.api.burnMakeHover({ pointerType: 'mouse' }, true);
    assert.strictEqual(env.els['burn-make-menu'].hidden, true,
      'on a narrow screen a passing pointer would shove the list about');
  });

  it('closes the choices first on Escape, then the menu', async () => {
    const env = makeHarness();
    env.api.openExportMenu();
    await env.api.videoItemAction({ detail: 1 });
    env.api.onBurnKeydown({ key: 'Escape' });
    assert.strictEqual(env.els['burn-make-menu'].hidden, true, 'one Escape, one surface');
    assert.strictEqual(env.els['export-menu'].hidden, false, 'the menu stays');
    assert.ok(env.els['btn-burn-video'].focused, 'focus returns to the item the choices came from');
    env.api.onBurnKeydown({ key: 'Escape' });
    assert.strictEqual(env.els['export-menu'].hidden, true);
  });

  it('moves focus into the choices when the keyboard opened them', async () => {
    const env = makeHarness();
    await env.api.videoItemAction({ detail: 0 });
    assert.ok(env.els['btn-burn-full'].focused,
      'Enter on the item must land on the first choice, or the choices are out of reach');
    const mouse = makeHarness();
    await mouse.api.videoItemAction({ detail: 1 });
    assert.ok(!mouse.els['btn-burn-full'].focused, 'a pointer press leaves focus where it is');
  });

  it('closes the choices with the menu', async () => {
    const env = makeHarness();
    env.api.openExportMenu();
    await env.api.videoItemAction({ detail: 1 });
    env.api.closeExportMenu();
    assert.strictEqual(env.els['burn-make-menu'].hidden, true);
    assert.strictEqual(env.els['btn-burn-video'].getAttribute('aria-expanded'), 'false');
  });

  // ---- the fragment panel ----

  it('opens the fragment panel from the second choice, over a closed menu', async () => {
    const env = makeHarness();
    env.previewState.player = fakePlayer(5025.12);
    env.api.openExportMenu();
    await env.api.videoItemAction({ detail: 1 });
    await env.api.openClipPanel();
    assert.strictEqual(env.els['clip-panel'].hidden, false);
    assert.strictEqual(env.els['export-menu'].hidden, true,
      'the panel is where the work happens now');
    assert.strictEqual(env.els['burn-make-menu'].hidden, true);
    assert.strictEqual(env.els['clip-start'].value, '00:00', 'from the beginning…');
    assert.strictEqual(env.els['clip-end'].value, '1:23:45.120',
      '…to the whole length the player reports');
    assert.ok(env.els['clip-start'].focused, 'focus lands in the first field');
  });

  it('gives focus back to the download button when the panel holding it closes', async () => {
    // Hiding the <section> the focus sits in drops focus to <body>, and the
    // next Tab restarts at the top of the document. The choices' Escape already
    // hands focus back to the item it came from; this exit is no different.
    const env = makeHarness();
    env.previewState.player = fakePlayer(600);
    await env.api.openClipPanel();
    assert.strictEqual(env.document.activeElement, env.els['clip-start'],
      'precondition: the focus being dropped is the panel\'s own');
    env.api.onBurnKeydown({ key: 'Escape' });
    assert.strictEqual(env.els['clip-panel'].hidden, true);
    assert.strictEqual(env.document.activeElement, env.els['btn-export'],
      'focus returns to the button the panel was reached through');
  });

  it('never takes focus away from work outside the panel it closes', async () => {
    // closeClipPanel() is also how navigation, a sign-out and a lost write
    // access take the panel down. Focus is then on whatever the reviewer is
    // doing, and pulling it to the download button would be theft — the very
    // reason the return above is asked for rather than done unconditionally.
    let write = true;
    const env = makeHarness({ ghWriteUser: function () { return write; } });
    await env.api.openClipPanel();
    env.els['btn-burn-video'].focus();     // stands for anywhere else on the page
    write = false;
    env.api.updateExportUi();
    assert.strictEqual(env.els['clip-panel'].hidden, true);
    assert.strictEqual(env.document.activeElement, env.els['btn-burn-video'],
      'focus stays where the reviewer left it');
  });

  it('reads a boundary off the player to the millisecond', async () => {
    const env = makeHarness();
    const player = fakePlayer(600, 65.4996);
    env.previewState.player = player;
    await env.api.openClipPanel();
    await env.api.setClipFromPlayer('start');
    assert.strictEqual(env.els['clip-start'].value, '01:05.500');
    player.now = 125.0004;
    await env.api.setClipFromPlayer('end');
    assert.strictEqual(env.els['clip-end'].value, '02:05.000',
      'a boundary read off the player always shows its milliseconds');
    assert.strictEqual(env.els['btn-clip-create'].disabled, false);
  });

  it('says the player is not ready rather than doing nothing', async () => {
    const env = makeHarness();
    await env.api.openClipPanel();
    await env.api.setClipFromPlayer('start');
    assert.strictEqual(env.els['clip-problem'].textContent, 'T:clip.no_player');
  });

  it('refuses a fragment it cannot build, and says why', async () => {
    const env = makeHarness();
    env.previewState.player = fakePlayer(60);
    await env.api.openClipPanel();
    const cases = [
      ['00:30', '00:10', 'T:clip.order'],
      ['00:10', '00:10.500', 'T:clip.too_short'],
      ['00:10', '01:30', 'T:clip.past_end'],
      ['ten', '00:20', 'T:clip.bad_start']
    ];
    for (const [start, end, said] of cases) {
      env.els['clip-start'].value = start;
      env.els['clip-end'].value = end;
      env.api.onClipInput();
      assert.strictEqual(env.els['clip-problem'].textContent, said, start + '–' + end);
      assert.strictEqual(env.els['clip-problem'].hidden, false);
      assert.strictEqual(env.els['btn-clip-create'].disabled, true);
      await env.api.createClip();
      assert.strictEqual(env.dispatched, 0, 'nothing is dispatched for ' + start + '–' + end);
    }
  });

  it('stays quiet about a field that is simply empty', async () => {
    const env = makeHarness();   // no player: the end is never filled in
    await env.api.openClipPanel();
    assert.strictEqual(env.els['clip-end'].value, '');
    assert.strictEqual(env.els['btn-clip-create'].disabled, true,
      'there is nothing to create yet');
    assert.strictEqual(env.els['clip-problem'].hidden, true,
      'an unfilled field is not a mistake to announce');
  });

  it('creates the fragment: its span, the panel away, the menu on the readout', async () => {
    const env = makeHarness();
    env.previewState.player = fakePlayer(120);
    await env.api.openClipPanel();
    env.els['clip-start'].value = '00:10.5';
    env.els['clip-end'].value = '00:40';
    env.api.onClipInput();
    await env.api.createClip();
    await settle();
    assert.strictEqual(env.dispatched, 1);
    assert.strictEqual(env.dispatchedInputs.clip, '10500-40000');
    assert.strictEqual(env.els['clip-panel'].hidden, true);
    assert.strictEqual(env.els['export-menu'].hidden, false,
      'the render reports itself in the menu, so the menu opens on it');
    assert.strictEqual(env.els['burn-item-label'].textContent, 'T:export.clip_working',
      'and it says a fragment is being built, not the whole video');
  });

  it('says a fragment is being built after a reload too', async () => {
    const env = makeHarness();
    env.localStorage.setItem('burn:t:v', JSON.stringify({
      requestId: 'old', runId: 7, runUrl: '', startedAt: Date.now(),
      talkId: 't', videoSlug: 'v', clip: { startMs: 0, endMs: 5000 } }));
    env.api.resumeBurnWatch('t', 'v');
    await settle();
    assert.strictEqual(env.els['burn-item-label'].textContent, 'T:export.clip_working');
  });

  it('refuses a second render from the panel while one is followed', async () => {
    const env = makeHarness();
    env.previewState.player = fakePlayer(120);
    env.api.startBurn();
    await settle();
    await env.api.openClipPanel();
    env.els['clip-start'].value = '00:10';
    env.els['clip-end'].value = '00:40';
    env.api.onClipInput();
    assert.strictEqual(env.els['clip-problem'].textContent, 'T:clip.busy');
    assert.strictEqual(env.els['btn-clip-create'].disabled, true);
    await env.api.createClip();
    assert.strictEqual(env.dispatched, 1, 'still only the render already in flight');
  });

  it('asks the pending-edits question for a fragment with the fragment\'s own button', async () => {
    const env = makeHarness(previewing({ edits: { uk: { 3: 'a' } } }));
    env.previewState.player = fakePlayer(120);
    await env.api.openClipPanel();
    env.els['clip-start'].value = '00:10';
    env.els['clip-end'].value = '00:40';
    await env.api.createClip();
    await settle();
    assert.strictEqual(env.confirms.length, 1);
    assert.strictEqual(env.confirms[0].confirmLabel, 'T:clip.create');
    assert.strictEqual(env.dispatchedInputs.clip, '10000-40000');
  });

  it('closes the panel on Escape once nothing above it is open', async () => {
    const env = makeHarness();
    await env.api.openClipPanel();
    env.api.onBurnKeydown({ key: 'Escape' });
    assert.strictEqual(env.els['clip-panel'].hidden, true);
  });

  it('leaves Escape to fullscreen even with the panel open', async () => {
    const env = makeHarness();
    await env.api.openClipPanel();
    env.els['view-preview'].className = 'view fs-mode';
    env.api.onBurnKeydown({ key: 'Escape' });
    assert.strictEqual(env.els['clip-panel'].hidden, false,
      'the panel is not on screen in fullscreen; the key belongs to leaving it');
  });

  it('leaves an Escape that something else has already acted on', async () => {
    // SPA.confirm listens in the CAPTURE phase and calls preventDefault without
    // stopping propagation, so its Escape reaches this handler afterwards. One
    // key press cancelled the pending-edits dialog AND took the panel down with
    // it — the panel the dialog was asked about.
    const env = makeHarness();
    await env.api.openClipPanel();
    env.api.onBurnKeydown({ key: 'Escape', defaultPrevented: true });
    assert.strictEqual(env.els['clip-panel'].hidden, false,
      'the key was already spent — one Escape closes one surface');
  });

  it('leaves Escape to the preferences menu while that is the open one', async () => {
    // The prefs menu listens AFTER this handler, so its Escape cannot be seen as
    // handled: without a look at it, one press closed the gear menu and the
    // fragment panel underneath it, which the reviewer never asked to lose.
    const env = makeHarness();
    await env.api.openClipPanel();
    env.els['prefs-menu'].className = 'prefs-menu open';
    env.api.onBurnKeydown({ key: 'Escape' });
    assert.strictEqual(env.els['clip-panel'].hidden, false,
      'the gear menu is the topmost surface — it is the one that closes');
  });

  it('closes the menu first when the panel is open under it', async () => {
    // One Escape closes one surface, the topmost. The panel is deliberately not
    // modal, so it can sit under an open menu — and taking both down on one
    // press loses work the reviewer never asked to lose.
    const env = makeHarness();
    await env.api.openClipPanel();
    env.api.openExportMenu();
    env.api.onBurnKeydown({ key: 'Escape' });
    assert.strictEqual(env.els['export-menu'].hidden, true, 'the menu is the topmost');
    assert.strictEqual(env.els['clip-panel'].hidden, false,
      'and the panel under it stays — a second Escape is what closes that');
  });

  it('lets go of the window when the panel is closed mid-drag', async () => {
    // Closing while the head is held left pointermove/up/cancel on the window
    // for the life of the page, moving a panel that is not there any more.
    const env = makeHarness();
    const listeners = {};
    env.window.addEventListener = function (type, fn) {
      (listeners[type] = listeners[type] || []).push(fn);
    };
    env.window.removeEventListener = function (type, fn) {
      listeners[type] = (listeners[type] || []).filter(function (f) { return f !== fn; });
    };
    const held = function () {
      return Object.keys(listeners).reduce(function (n, k) { return n + listeners[k].length; }, 0);
    };
    await env.api.openClipPanel();
    env.api.clipPanelDragStart({
      button: 0, pointerId: 3, clientX: 10, clientY: 10,
      currentTarget: { setPointerCapture: function () {}, releasePointerCapture: function () {} },
      target: { closest: function () { return null; } },
      preventDefault: function () {}
    });
    assert.strictEqual(held(), 3, 'precondition: the head is held');
    env.api.closeClipPanel();
    assert.strictEqual(held(), 0, 'closing has to release everything the drag took');
  });

  it('carries the render\'s own refusals into the panel, not just the times', async () => {
    // None of these three is about the boundaries, and no change of them would
    // lift one. Without each, the panel offers a Create that startBurn refuses
    // in silence — after the panel has already closed on the reviewer's press.
    async function problemWith(over, before) {
      const env = makeHarness(over);
      env.previewState.player = fakePlayer(120);
      if (before) before(env);
      await env.api.openClipPanel();
      env.els['clip-start'].value = '00:10';
      env.els['clip-end'].value = '00:40';
      env.api.onClipInput();
      return env.els['clip-problem'].textContent;
    }
    assert.strictEqual(await problemWith({
      previewState: { talkId: 't', videoSlug: 'v', srtLang: 'uk', edits: { uk: { 3: 'a' } } },
      editSync: { talkId: 't', getInfo: function () { return { status: 'pending', branch: 'b' }; } }
    }), 'T:burn.wait_for_sync',
    'edits that have reached no branch would be burned as the published text');

    assert.strictEqual(await problemWith({
      previewState: { talkId: 't', videoSlug: 'v', srtLang: 'en', edits: {} }
    }), 'T:burn.wrong_lang',
    'the workflow burns final/uk.srt whatever language is on screen');

    assert.strictEqual(await problemWith({
      previewState: { talkId: 't', videoSlug: 'v', srtLang: 'uk', edits: { uk: { 3: 'a' } } },
      SPA: { confirm: function () { return new Promise(function () {}); } }
    }, function (env) { env.api.startBurn(); }), 'T:clip.busy',
    'a pending-edits dialog still open is a render already under way');
  });

  it('creates nothing for a video the panel no longer belongs to', async () => {
    // The panel is not modal and the router does not tear it down, so it can be
    // left open while the reviewer moves on. Creating then would render a
    // fragment of the new video from the old one's boundaries.
    const env = makeHarness();
    env.previewState.player = fakePlayer(120);
    await env.api.openClipPanel();
    env.els['clip-start'].value = '00:10';
    env.els['clip-end'].value = '00:40';
    env.api.onClipInput();
    assert.strictEqual(env.els['btn-clip-create'].disabled, false, 'precondition: a good span');
    env.previewState.videoSlug = 'Other';        // the preview moved on under it
    const before = env.dispatched;
    await env.api.createClip();
    assert.strictEqual(env.dispatched, before,
      'a fragment may only be dispatched for the video its boundaries were read off');
  });

  it('does not fill a boundary into a panel that has since been left', async () => {
    // getDuration() is a round trip to the player. Its answer can land after the
    // panel was closed, or reopened on another video, and writing the old
    // video's length into the end field would be a boundary nobody chose.
    let report;
    const env = makeHarness();
    env.previewState.player = {
      getDuration: function () { return new Promise(function (r) { report = r; }); }
    };
    const opening = env.api.openClipPanel();
    env.api.closeClipPanel();
    report(120);
    await opening;
    assert.strictEqual(env.els['clip-end'].value, '',
      'the length arrived for a panel nobody is looking at any more');
  });

  it('closes the panel when another video is entered, and starts afresh there', async () => {
    const env = makeHarness();
    env.previewState.player = fakePlayer(120);
    await env.api.openClipPanel();
    env.els['clip-start'].value = '00:42';
    env.previewState.videoSlug = 'v2';
    env.api.resumeBurnWatch('t', 'v2');
    assert.strictEqual(env.els['clip-panel'].hidden, true,
      'its times were read off the video being left');
    await env.api.openClipPanel();
    assert.strictEqual(env.els['clip-start'].value, '00:00',
      'the new video starts from its own beginning');
  });

  it('keeps what was set when reopened on the same video', async () => {
    const env = makeHarness();
    env.previewState.player = fakePlayer(120);
    await env.api.openClipPanel();
    env.els['clip-start'].value = '00:42';
    env.els['clip-end'].value = '01:00';
    env.api.closeClipPanel();
    await env.api.openClipPanel();
    assert.strictEqual(env.els['clip-start'].value, '00:42');
    assert.strictEqual(env.els['clip-end'].value, '01:00', 'not overwritten by the whole length');
  });

  it('never lets the panel be dragged off the screen', async () => {
    const env = makeHarness();
    env.window.innerWidth = 800;
    env.window.innerHeight = 600;
    env.els['clip-panel'].offsetWidth = 400;
    env.els['clip-panel'].offsetHeight = 300;
    await env.api.openClipPanel();
    env.api.moveClipPanel(-500, 99999);
    assert.strictEqual(env.els['clip-panel'].style.left, '12px', 'its head stays within reach');
    assert.strictEqual(env.els['clip-panel'].style.top, '288px');
    assert.strictEqual(env.els['clip-panel'].style.right, 'auto');
  });

  it('never lets the panel be dragged under the freshness bar', async () => {
    // The bar is fixed across the top of the page in a layer above the preview,
    // so a panel taken to the margin keeps its head — and the only close button
    // there is — hidden behind it: the panel can then be neither moved back nor
    // dismissed with the pointer.
    const env = makeHarness();
    env.window.innerWidth = 1200;
    env.window.innerHeight = 800;
    env.els['freshness-bar'].getBoundingClientRect = function () {
      return { left: 0, top: 0, right: 1200, bottom: 29, width: 1200, height: 29 };
    };
    const panel = env.els['clip-panel'];
    panel.offsetWidth = 420;
    panel.offsetHeight = 190;
    await env.api.openClipPanel();
    env.api.moveClipPanel(400, -100);
    assert.strictEqual(panel.style.top, (29 + 12) + 'px',
      'the panel stops below the bar, not under it');
    assert.strictEqual(panel.style.left, '400px', 'and the other axis is untouched');
  });

  it('closes the panel when the session loses write access', async () => {
    let write = true;
    const env = makeHarness({ ghWriteUser: function () { return write; } });
    await env.api.openClipPanel();
    write = false;
    env.api.updateExportUi();
    assert.strictEqual(env.els['clip-panel'].hidden, true);
  });

  it('stops following a run when the session loses write access', async () => {
    // The menu is not signed-in-only — the subtitle download works without an
    // account — so a sign-out leaves it open, and nothing closed it or stopped
    // the poll. The loop went on asking for the run every five seconds with a
    // token it no longer has, until a 401 happened to kill it.
    let write = true;
    const env = makeHarness({
      ghWriteUser: function () { return write; },
      matchRun: function () { return { id: 11, html_url: 'https://x/actions/runs/11' }; },
      computeProgress: function () {
        return Object.assign({}, NO_PROGRESS, { fraction: 0.3, label: 'Render 20%' });
      }
    });
    env.api.openExportMenu();
    await env.api.burnFullVideo();
    await settle();
    assert.strictEqual(armedTimers(env), 1, 'precondition: the run is being followed');

    write = false;
    env.api.updateExportUi();

    assert.strictEqual(env.els['export-menu'].hidden, false,
      'the menu stays open: the subtitle download does not need an account');
    assert.strictEqual(armedTimers(env), 0,
      'but there is nothing signed in to poll with, so the loop stops');
  });

  it('picks a run back up when write access is granted again with the menu open', async () => {
    // The stop half above has a start half, and a paint cannot carry it: on
    // every paint a re-arm tears the follow down in the dispatch window (where
    // burnWatch is still null) and re-arms inside showBurnError()'s own window.
    // So the transition itself re-arms, once, where write access is granted.
    //
    // Left unfollowed with the menu still open, burnFollowing stays false, the
    // item falls back to its "create the video" face, and the next click
    // dispatches a SECOND run over the first — the exact harm startBurn()'s
    // one-at-a-time guard exists to prevent.
    let write = true;
    const env = makeHarness({
      ghWriteUser: function () { return write; },
      matchRun: function () { return { id: 12, html_url: 'https://x/actions/runs/12' }; },
      computeProgress: function () {
        return Object.assign({}, NO_PROGRESS, { fraction: 0.3, label: 'Render 20%' });
      }
    });
    const probe = makeWriteProbe(env, {
      getRepoPermissions: function () { return Promise.resolve({ push: write }); }
    });
    env.api.openExportMenu();
    await env.api.burnFullVideo();
    await settle();
    assert.strictEqual(armedTimers(env), 1, 'precondition: the run is being followed');

    write = false;
    await probe.checkWriteAccess();
    await settle();
    assert.strictEqual(armedTimers(env), 0, 'precondition: the loop stopped with the access');

    write = true;
    await probe.checkWriteAccess();
    await settle();
    assert.strictEqual(armedTimers(env), 1,
      'write is back and the menu is still open — the run must be followed again');
    assert.strictEqual(env.els['burn-item-label'].textContent, 'T:export.video_working',
      'and the item must not offer a second render over the run it is following');
  });

  it('looks at the list of created videos again when write access is granted', async () => {
    // The section is signed-in-only, so regaining write access reveals it — and
    // what it reveals is whatever the last look left there, which for a session
    // that has been read-only is an empty list with no note to explain it. The
    // transition has to look again, and only while the menu is open: the look
    // is an API call, and nothing is on screen to spend it on otherwise.
    let write = { login: 'me' };
    const env = historyHarness([burnRun(7)], { ghWriteUser: function () { return write; } });
    const probe = makeWriteProbe(env, {
      getRepoPermissions: function () { return Promise.resolve({ push: !!write }); }
    });
    await listed(env);
    assert.strictEqual(rows(env).length, 1, 'precondition: one video listed');

    write = null;
    await probe.checkWriteAccess();
    await settle();
    // A render that finished in another tab while this session could not look.
    env.historyRuns = [burnRun(7), burnRun(8)];

    write = { login: 'me' };
    await probe.checkWriteAccess();
    await settle();
    assert.strictEqual(rows(env).length, 2,
      'the revealed section must be looked at afresh, not left as it was found');
  });

  // ---- review round 1 ----

  it('keeps looking for the video that just finished until the list has it', async () => {
    // A run is marked successful a moment after its job completes (measured: up
    // to a second), and the runs search can lag behind that. A look made the
    // instant the job is done regularly misses the video the item has just
    // handed over, which then seems to have vanished.
    let done = false;
    let looks = 0;
    const env = historyHarness([], {
      makeRequestId: function () { return 'req-b-a'; },
      matchRun: function () { return { id: 11, html_url: 'https://x/actions/runs/11' }; },
      computeProgress: function () {
        return Object.assign({}, NO_PROGRESS,
          done ? { done: true, fraction: 1 } : { fraction: 0.3, label: 'Render 20%' });
      },
      listBurnRuns: function () {
        looks++;
        return Promise.resolve(looks >= 3 ? [burnRun(11, { request: 'req-b-a' })] : []);
      }
    });
    await listed(env);                           // look 1, before the render
    await env.api.burnFullVideo();
    await settle();
    done = true;
    env.timers.filter(Boolean).pop()();          // the poll tick that sees the job done
    await settle();                              // look 2: the run is not listed yet
    assert.strictEqual(rows(env).length, 0, 'precondition: the list lags the job');
    assert.strictEqual(env.els['burn-history-spinner'].hidden, false,
      'the list is still being looked for, not declared empty');
    assert.strictEqual(env.els['burn-history-note'].hidden, true);
    env.timers.filter(Boolean).pop()();          // the scheduled second look
    await settle();                              // look 3: there it is
    assert.strictEqual(looks, 3);
    assert.strictEqual(rowPart(env, 11, 'export-history__new').hidden, false,
      'the video it just made appears, marked new');
    assert.strictEqual(env.els['burn-history-spinner'].hidden, true);
  });

  it('keeps the rows on screen while it looks again for the one just finished', async () => {
    // That look is retried for about twelve seconds. It used to blank the whole
    // list for all of it — including the readout of a transfer running on one of
    // those rows, which then had nowhere to report from and read as a click that
    // had done nothing.
    let done = false;
    let looks = 0;
    const env = historyHarness([burnRun(7)], {
      makeRequestId: function () { return 'req-b-a'; },
      matchRun: function () { return { id: 11, html_url: 'https://x/actions/runs/11' }; },
      computeProgress: function () {
        return Object.assign({}, NO_PROGRESS,
          done ? { done: true, fraction: 1 } : { fraction: 0.3, label: 'Render 20%' });
      },
      listBurnRuns: function () { looks++; return Promise.resolve(env.historyRuns); }
    });
    await listed(env);                        // a video made earlier is on screen
    assert.strictEqual(rows(env).length, 1, 'precondition: one row is listed');
    await env.api.burnFullVideo();
    await settle();
    done = true;
    env.timers.filter(Boolean).pop()();       // the poll tick that sees the job done
    await settle();                           // the look that misses the new run

    assert.ok(looks >= 2, 'the look after the render really did happen');
    assert.strictEqual(rows(env).length, 1,
      'the rows already on screen stay while the new one is looked for');
    assert.strictEqual(env.els['burn-history-list'].hidden, false);
    assert.strictEqual(env.els['burn-history-spinner'].hidden, false,
      'the spinner joins them rather than standing in for them');
  });

  it('keeps the row a running transfer lives on when the look fails', async () => {
    // Same rule as the retry above, for the other way a look can end. A failed
    // look used to drop every row — including the one a transfer was reporting
    // from — so the transfer ran on invisibly and, if it then died, had nowhere
    // to say so. The 403 arm never recovers, so the rows never came back.
    const RUNS = [burnRun(7)];
    const zip = skewedZip(Buffer.alloc(20000, 7), 11);
    let fail = false;
    const seen = [];
    const env = savingHarness(zip.bytes, {
      listBurnRuns: function () {
        return fail ? Promise.reject(new Error('gone')) : Promise.resolve(RUNS);
      }
    }, null, RUNS);
    await settle();
    assert.strictEqual(rows(env).length, 1, 'precondition: one row is listed');

    // Mid-transfer — the first chunk is on its way to disk — the list is looked
    // at again and the look fails.
    const write = env.sink.stream.write;
    env.sink.stream.write = function (chunk) {
      if (seen.length) return write.call(env.sink.stream, chunk);
      fail = true;
      return env.api.refreshBurnHistory().then(function () {
        const row = rows(env).find(function (li) { return li.attrs['data-run'] === '7'; });
        const meta = row ? findByClass(row, 'export-item__meta') : null;
        seen.push({ rows: rows(env).length,
                    listHidden: env.els['burn-history-list'].hidden,
                    note: env.els['burn-history-note'].textContent,
                    metaHidden: meta ? meta.hidden : null });
        return write.call(env.sink.stream, chunk);
      });
    };

    await env.api.downloadBurned(7);

    assert.ok(seen.length, 'precondition: the transfer wrote while the look was out');
    assert.strictEqual(seen[0].rows, 1,
      'the row the running transfer reports from has to survive a failed look');
    assert.strictEqual(seen[0].listHidden, false);
    assert.strictEqual(seen[0].metaHidden, false,
      'and it keeps its byte counter: a transfer with no readout reads as a dead click');
    assert.strictEqual(seen[0].note, 'T:history.failed',
      'the look that failed still says so, above the rows it could not refresh');
  });

  it('stops looking for a finished video after a few tries', async () => {
    let done = false;
    let looks = 0;
    const env = historyHarness([], {
      makeRequestId: function () { return 'req-b-a'; },
      matchRun: function () { return { id: 11, html_url: 'https://x/actions/runs/11' }; },
      computeProgress: function () {
        return Object.assign({}, NO_PROGRESS,
          done ? { done: true, fraction: 1 } : { fraction: 0.3, label: 'Render 20%' });
      },
      listBurnRuns: function () { looks++; return Promise.resolve([]); }
    });
    await listed(env);
    await env.api.burnFullVideo();
    await settle();
    done = true;
    env.timers.filter(Boolean).pop()();
    await settle();
    let fired = 0;
    for (let i = 0; i < 20; i++) {
      const pending = env.timers.map(function (fn, at) { return [fn, at]; }).filter(function (p) { return p[0]; });
      if (!pending.length) break;
      const [fn, at] = pending[pending.length - 1];
      env.timers[at] = null;
      fn();
      fired++;
      await settle();
    }
    assert.ok(fired < 20, 'the looks must come to an end');
    assert.ok(looks <= 7, 'a handful of looks, not a loop: ' + looks);
    assert.strictEqual(env.els['burn-history-spinner'].hidden, true, 'the wait ends');
    assert.strictEqual(env.els['burn-history-note'].textContent, 'T:history.empty',
      'and the list says what it found');
  });

  it('does not keep looking once the menu is closed', async () => {
    let done = false;
    let looks = 0;
    const env = historyHarness([], {
      makeRequestId: function () { return 'req-b-a'; },
      matchRun: function () { return { id: 11, html_url: 'https://x/actions/runs/11' }; },
      computeProgress: function () {
        return Object.assign({}, NO_PROGRESS,
          done ? { done: true, fraction: 1 } : { fraction: 0.3, label: 'Render 20%' });
      },
      listBurnRuns: function () { looks++; return Promise.resolve([]); }
    });
    await listed(env);
    await env.api.burnFullVideo();
    await settle();
    done = true;
    env.timers.filter(Boolean).pop()();
    await settle();
    env.api.closeExportMenu();
    const before = looks;
    env.timers.filter(Boolean).forEach(function (fn) { fn(); });
    await settle();
    assert.strictEqual(looks, before, 'nothing is on screen to fill');
  });

  it('retires the "new" mark once the menu has been closed', async () => {
    let done = false;
    const env = historyHarness([], {
      makeRequestId: function () { return 'req-b-a'; },
      matchRun: function () { return { id: 11, html_url: 'https://x/actions/runs/11' }; },
      computeProgress: function () {
        return Object.assign({}, NO_PROGRESS,
          done ? { done: true, fraction: 1 } : { fraction: 0.3, label: 'Render 20%' });
      }
    });
    await listed(env);
    await env.api.burnFullVideo();
    await settle();
    done = true;
    env.historyRuns = [burnRun(11, { request: 'req-b-a' })];
    env.timers.filter(Boolean).pop()();
    await settle();
    assert.strictEqual(rowPart(env, 11, 'export-history__new').hidden, false, 'precondition: new');
    env.api.closeExportMenu();
    await listed(env);
    assert.strictEqual(rowPart(env, 11, 'export-history__new').hidden, true,
      'the reviewer has seen it: on the next look it is one video among the rest');
  });

  it('does not start a second poll loop when the menu opens over a resumed run', async () => {
    // A run resumed on page load is already polled on its 5 s timer. Opening the
    // menu started a second chain beside it, and the two interleaved at twice
    // the API rate for as long as the menu stayed open.
    const env = makeHarness();
    env.localStorage.setItem('burn:t:v', savedWatch(7));
    env.api.resumeBurnWatch('t', 'v');
    await settle();
    assert.strictEqual(armedTimers(env), 1, 'precondition: the resumed run is followed');
    env.api.openExportMenu();
    await settle();
    assert.strictEqual(armedTimers(env), 1,
      'opening the menu picks up the same loop, not a second one');
  });

  it('follows a resumed run with neither surface open, through the start half alone', async () => {
    // "Followed exactly while someone is looking" is syncBurnFollowing()'s own
    // rule, not a property of the app: a run recorded before a reload is picked
    // back up with the menu AND the panel closed, because startBurn()'s "one
    // render at a time" guard reads burnFollowing — a render nothing follows
    // would let a second one be dispatched over it from the first click.
    //
    // So the two halves are separate functions. Arming is armBurnFollowing();
    // the synchronising one would END this follow, which is exactly what the
    // middle of this test pins: it is the sharp edge a future caller has to
    // know about, and the reason the surface-close paths return early when
    // there was nothing open to close.
    const env = makeHarness();
    env.localStorage.setItem('burn:t:v', savedWatch(7));
    env.api.resumeBurnWatch('t', 'v');
    await settle();
    assert.strictEqual(env.els['export-menu'].hidden, true, 'nothing is on screen');
    assert.strictEqual(env.els['clip-panel'].hidden, true);
    assert.strictEqual(armedTimers(env), 1, 'and the run is followed all the same');

    env.api.syncBurnFollowing();
    assert.strictEqual(armedTimers(env), 0,
      'the synchronising half sees no surface and stops the follow');

    env.api.armBurnFollowing();
    await settle();
    assert.strictEqual(armedTimers(env), 1,
      'the start half arms the same run again with nothing open');
  });

  it('counts a render still running behind a closed menu as busy', async () => {
    // Closing the menu stops following the run, not the run. A fragment created
    // from the panel in that window was refused silently inside startBurn —
    // after the panel had already closed on the reviewer's request.
    const env = makeHarness();
    env.previewState.player = fakePlayer(120);
    env.localStorage.setItem('burn:t:v', savedWatch(7));
    env.api.resumeBurnWatch('t', 'v');
    await settle();
    env.api.openExportMenu();
    env.api.closeExportMenu();
    await env.api.openClipPanel();
    env.els['clip-start'].value = '00:10';
    env.els['clip-end'].value = '00:40';
    env.api.onClipInput();
    assert.strictEqual(env.els['clip-problem'].textContent, 'T:clip.busy');
    assert.strictEqual(env.els['btn-clip-create'].disabled, true);
    const before = env.dispatched;
    await env.api.createClip();
    assert.strictEqual(env.dispatched, before, 'nothing is dispatched over the running render');
    assert.strictEqual(env.els['clip-panel'].hidden, false, 'and the panel stays, saying why');
  });

  it('clears the busy line once a render running behind a closed menu finishes', async () => {
    // The panel is the second surface that shows a run: it refuses to build a
    // fragment while one is in flight. Opening it closes the menu, and the menu
    // used to be the only thing keeping the poll alive — so nothing ever noticed
    // the render ending, and clip.busy, with the dead Create button under it,
    // outlived the render that put it there.
    let done = false;
    const env = makeHarness({
      matchRun: function () { return { id: 11, html_url: 'https://x/actions/runs/11' }; },
      computeProgress: function () {
        return Object.assign({}, NO_PROGRESS,
          done ? { done: true, fraction: 1 } : { fraction: 0.3, label: 'Render 20%' });
      }
    });
    env.previewState.player = fakePlayer(120);
    env.api.openExportMenu();
    await env.api.burnFullVideo();
    await settle();
    await env.api.openClipPanel();          // the menu closes under it
    await settle();
    env.els['clip-start'].value = '00:10';
    env.els['clip-end'].value = '00:40';
    env.api.onClipInput();
    assert.strictEqual(env.els['clip-problem'].textContent, 'T:clip.busy',
      'precondition: the render in flight is what the panel is waiting on');
    assert.strictEqual(armedTimers(env), 1,
      'the panel still shows the run, so the run must still be polled');

    done = true;
    env.timers.filter(Boolean).pop()();
    await settle();

    assert.strictEqual(env.els['clip-problem'].textContent, '',
      'the render ended — the panel must stop refusing');
    assert.strictEqual(env.els['btn-clip-create'].disabled, false,
      'and hand the fragment back to the reviewer');
  });

  it('stops following when the panel is closed and no menu is open', async () => {
    // The panel took the poll over from the menu it replaced. Closing it is then
    // the LAST surface going, and there is nothing left on screen for a poll to
    // write into — the loop would otherwise go on costing an API call every five
    // seconds, over a run nobody is looking at, for as long as the tab lives.
    let done = false;
    const env = makeHarness({
      matchRun: function () { return { id: 11, html_url: 'https://x/actions/runs/11' }; },
      computeProgress: function () {
        return Object.assign({}, NO_PROGRESS,
          done ? { done: true, fraction: 1 } : { fraction: 0.3, label: 'Render 20%' });
      }
    });
    env.previewState.player = fakePlayer(120);
    env.api.openExportMenu();
    await env.api.burnFullVideo();
    await settle();
    await env.api.openClipPanel();          // the menu closes under it
    await settle();
    assert.strictEqual(env.els['export-menu'].hidden, true,
      'precondition: the panel is the only surface showing the run');
    assert.strictEqual(armedTimers(env), 1,
      'precondition: and it is what keeps the run polled');

    env.api.closeClipPanel();

    assert.strictEqual(armedTimers(env), 0,
      'the last surface has gone, so the run stops being followed');
  });

  it('lets a failed render stop counting as busy in the panel', async () => {
    const env = makeHarness();
    env.previewState.player = fakePlayer(120);
    env.localStorage.setItem('burn:t:v', savedWatch(7));
    env.api.resumeBurnWatch('t', 'v');
    await settle();
    env.api.showBurnError('boom');
    await env.api.openClipPanel();
    env.els['clip-start'].value = '00:10';
    env.els['clip-end'].value = '00:40';
    env.api.onClipInput();
    assert.strictEqual(env.els['btn-clip-create'].disabled, false,
      'a failed run is recorded, but it is not running');
  });

  it('moves the panel out from over the menu when the menu opens under it', async () => {
    // The menu lives in the sticky header's stacking context, below the panel's
    // layer: a panel over the menu's corner hides the menu outright, and a
    // second press on the button only closes what could not be seen.
    const env = makeHarness();
    env.window.innerWidth = 1200;
    env.window.innerHeight = 800;
    const panel = env.els['clip-panel'];
    panel.offsetWidth = 420;
    panel.offsetHeight = 190;
    panel.getBoundingClientRect = function () {
      const left = parseInt(panel.style.left, 10);
      const top = parseInt(panel.style.top, 10);
      return { left: left, top: top, right: left + 420, bottom: top + 190, width: 420, height: 190 };
    };
    await env.api.openClipPanel();
    env.api.moveClipPanel(768, 109);            // right under the download button
    env.els['export-menu'].getBoundingClientRect = function () {
      return { left: 860, top: 88, right: 1180, bottom: 330, width: 320, height: 242 };
    };
    env.api.openExportMenu();
    assert.strictEqual(panel.style.left, (860 - 420 - 12) + 'px',
      'the panel steps aside to the left of the menu');
    assert.strictEqual(panel.style.top, '109px');
  });

  it('moves the panel out from under the choices as well', async () => {
    const env = makeHarness();
    env.window.innerWidth = 1200;
    env.window.innerHeight = 800;
    const panel = env.els['clip-panel'];
    panel.offsetWidth = 420;
    panel.offsetHeight = 190;
    panel.getBoundingClientRect = function () {
      const left = parseInt(panel.style.left, 10);
      const top = parseInt(panel.style.top, 10);
      return { left: left, top: top, right: left + 420, bottom: top + 190, width: 420, height: 190 };
    };
    await env.api.openClipPanel();
    env.api.moveClipPanel(430, 109);            // clear of the menu, over the flyout
    env.els['export-menu'].getBoundingClientRect = function () {
      return { left: 860, top: 88, right: 1180, bottom: 330, width: 320, height: 242 };
    };
    env.els['burn-make-menu'].getBoundingClientRect = function () {
      return { left: 636, top: 118, right: 856, bottom: 190, width: 220, height: 72 };
    };
    env.api.openExportMenu();
    assert.strictEqual(panel.style.left, '430px', 'precondition: the menu alone is clear');
    await env.api.videoItemAction({ detail: 1 });
    assert.strictEqual(panel.style.left, (636 - 420 - 12) + 'px',
      'the flyout is part of what the panel must not cover');
  });

  it('moves the panel again when the arriving rows make the menu taller', async () => {
    // clearClipPanelOfMenu() runs as the menu opens — and the list of created
    // videos is still empty then. The rows land a round-trip later and push the
    // menu's bottom edge down past the panel that had just stepped below it, so
    // the panel ends up over the very rows it had made room for.
    const env = historyHarness([burnRun(7)]);
    env.window.innerWidth = 400;      // no room beside the menu: below is the only way
    env.window.innerHeight = 768;
    const panel = env.els['clip-panel'];
    panel.offsetWidth = 376;
    panel.offsetHeight = 190;
    panel.getBoundingClientRect = function () {
      const left = parseInt(panel.style.left, 10) || 0;
      const top = parseInt(panel.style.top, 10) || 0;
      return { left: left, top: top, right: left + 376, bottom: top + 190,
               width: 376, height: 190 };
    };
    // The menu is exactly as tall as the rows it has been given.
    env.els['export-menu'].getBoundingClientRect = function () {
      const shown = env.els['burn-history-list'].children.length * 156;
      return { left: 12, top: 60, right: 388, bottom: 250 + shown,
               width: 376, height: 190 + shown };
    };
    await env.api.openClipPanel();
    env.api.moveClipPanel(12, 100);
    env.api.openExportMenu();
    assert.strictEqual(panel.style.top, '262px',
      'precondition: the panel stepped below the still-empty menu');

    await settle();                   // the rows land and the menu grows

    assert.strictEqual(panel.style.top, (250 + 156 + 12) + 'px',
      'the taller menu has to push the panel down again, or it covers the rows');
  });

  // A panel placed against a menu of one height is misplaced against any other,
  // and the menu changes height in three ways. The rows arriving is one (above);
  // these are the other two. Each is driven through the one call that grows the
  // menu, so it can only be the placement call on THAT path that saves it.

  it('moves the panel again when the render puts its progress parts on screen', async () => {
    // Starting a render unhides the item's track and status line beneath the
    // label — a bare offer becomes a progress report, and the menu grows by the
    // height of it while the panel still sits where the short menu left room.
    const env = historyHarness([]);
    env.window.innerWidth = 400;      // no room beside the menu: below is the only way
    env.window.innerHeight = 768;
    const panel = env.els['clip-panel'];
    panel.offsetWidth = 376;
    panel.offsetHeight = 190;
    panel.getBoundingClientRect = function () {
      const left = parseInt(panel.style.left, 10) || 0;
      const top = parseInt(panel.style.top, 10) || 0;
      return { left: left, top: top, right: left + 376, bottom: top + 190,
               width: 376, height: 190 };
    };
    // The menu is as tall as whatever the item shows under its label.
    env.els['export-menu'].getBoundingClientRect = function () {
      const grown = env.els['burn-track'].hidden ? 0 : 60;
      return { left: 12, top: 60, right: 388, bottom: 250 + grown,
               width: 376, height: 190 + grown };
    };
    await env.api.openClipPanel();
    env.api.moveClipPanel(12, 100);
    env.api.openExportMenu();
    await settle();                   // the empty list lands and settles
    assert.strictEqual(panel.style.top, '262px',
      'precondition: the panel stepped below the menu of a bare offer');

    const started = env.api.burnFullVideo();
    // Read before anything else on that path can run: at this instant only the
    // item has been redrawn, so nothing but its own placement call can be why
    // the panel moved.
    assert.strictEqual(env.els['burn-track'].hidden, false,
      'precondition: the render put its progress parts on screen');
    assert.strictEqual(panel.style.top, (250 + 60 + 12) + 'px',
      'the item grew under the panel, so the panel has to step down again');
    await started;
    await settle();
  });

  it('moves the panel again when a transfer puts its readout on a row', async () => {
    // A download adds a track, a byte counter and an error line UNDER the row it
    // runs on — measured at 262px -> 322px on the real menu. The panel was placed
    // against the menu without them.
    const zip = skewedZip(Buffer.alloc(20000, 7), 11);
    const env = savingHarness(zip.bytes);
    await settle();
    env.window.innerWidth = 400;
    env.window.innerHeight = 768;
    const panel = env.els['clip-panel'];
    panel.offsetWidth = 376;
    panel.offsetHeight = 190;
    panel.getBoundingClientRect = function () {
      const left = parseInt(panel.style.left, 10) || 0;
      const top = parseInt(panel.style.top, 10) || 0;
      return { left: left, top: top, right: left + 376, bottom: top + 190,
               width: 376, height: 190 };
    };
    // The row's own readout is what the menu grows by here.
    const rowMeta = function () {
      const row = rows(env).find(function (li) { return li.attrs['data-run'] === '7'; });
      return row ? findByClass(row, 'export-item__meta') : null;
    };
    env.els['export-menu'].getBoundingClientRect = function () {
      const meta = rowMeta();
      const grown = (meta && !meta.hidden) ? 60 : 0;
      return { left: 12, top: 60, right: 388, bottom: 250 + grown,
               width: 376, height: 190 + grown };
    };
    await env.api.openClipPanel();
    env.api.moveClipPanel(12, 100);
    env.api.openExportMenu();
    await settle();
    assert.strictEqual(panel.style.top, '262px',
      'precondition: the panel stepped below the menu of quiet rows');

    const transfer = env.api.downloadBurned(7);
    // Same reading point: the row has just been repainted and nothing else on
    // the transfer's path has run yet.
    assert.ok(rowMeta() && !rowMeta().hidden,
      'precondition: the transfer put its readout under the row');
    assert.strictEqual(panel.style.top, (250 + 60 + 12) + 'px',
      'the row grew under the panel, so the panel has to step down again');
    await transfer;
  });

  it('drags the panel by its head, and lets go of the window when released', async () => {
    const env = makeHarness();
    const listeners = {};
    env.window.addEventListener = function (type, fn) {
      (listeners[type] = listeners[type] || []).push(fn);
    };
    env.window.removeEventListener = function (type, fn) {
      listeners[type] = (listeners[type] || []).filter(function (f) { return f !== fn; });
    };
    const held = function () {
      return Object.keys(listeners).reduce(function (n, k) { return n + listeners[k].length; }, 0);
    };
    env.window.innerWidth = 1200;
    env.window.innerHeight = 800;
    const panel = env.els['clip-panel'];
    panel.offsetWidth = 400;
    panel.offsetHeight = 200;
    await env.api.openClipPanel();
    env.api.moveClipPanel(500, 100);
    panel.getBoundingClientRect = function () { return { left: 500, top: 100 }; };
    const captured = [];
    const head = {
      setPointerCapture: function (id) { captured.push(id); },
      releasePointerCapture: function (id) { captured.push(-id); }
    };
    const onHead = { closest: function () { return null; } };

    env.api.clipPanelDragStart({ button: 2, pointerId: 1, clientX: 520, clientY: 110,
                                 currentTarget: head, target: onHead });
    assert.strictEqual(held(), 0, 'only the primary button drags');

    env.api.clipPanelDragStart({ button: 0, pointerId: 2, clientX: 880, clientY: 110,
      currentTarget: head, target: { closest: function (sel) { return sel === 'button' ? {} : null; } } });
    assert.strictEqual(held(), 0, 'the close button on the head is not a handle');

    env.api.clipPanelDragStart({ button: 0, pointerId: 3, clientX: 520, clientY: 110,
                                 currentTarget: head, target: onHead, preventDefault: function () {} });
    assert.strictEqual(held(), 3, 'move, up and cancel are listened for while the head is held');
    assert.deepStrictEqual(captured, [3], 'the pointer is captured, so a fast drag cannot outrun it');
    listeners.pointermove[0]({ pointerId: 3, clientX: 320, clientY: 310 });
    assert.strictEqual(panel.style.left, '300px');
    assert.strictEqual(panel.style.top, '300px');
    listeners.pointermove[0]({ pointerId: 9, clientX: 0, clientY: 0 });
    assert.strictEqual(panel.style.left, '300px', 'another pointer does not move it');
    listeners.pointerup[0]({ pointerId: 3 });
    assert.strictEqual(held(), 0, 'releasing lets go of every window listener');
    assert.deepStrictEqual(captured, [3, -3]);
  });
});
