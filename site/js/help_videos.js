// Where the tutorial videos come from, and how the help sheet orders them.
//
// Everything about the tutorials lives in a help repository (sy-tools/sy-help)
// and is published by its GitHub Pages site: catalog.json (sections, order,
// titles, descriptions, notes, durations, subtitle languages), v/<file>.mp4
// and subs/<file>.<lang>.vtt. This module only reads it. The portal and that
// site share the origin sy-tools.github.io, so the subtitle tracks need no
// CORS; a local portal (localhost) still gets them, because Pages answers
// with access-control-allow-origin: *.
//
// Numbers are never typed into a title: a section is numbered by its
// position, a video by its position in the section, and an update (a
// chronological section) is titled by its date. Reordering can therefore
// never leave a number stale.

(function () {
  var DEFAULT_HELP_REPO = 'sy-tools/sy-help';
  var REPO_RE = /^[A-Za-z0-9-]+\/[A-Za-z0-9._-]+$/;

  // The repository the page was pointed at (window.__SY_HELP_REPO, which
  // `python -m tools.serve_auth_local --help-repo` injects), or the real one.
  function helpRepo(win) {
    var override = win && win.__SY_HELP_REPO;
    return typeof override === 'string' && REPO_RE.test(override) ? override : DEFAULT_HELP_REPO;
  }

  function pagesBase(repo) {
    var parts = repo.split('/');
    return 'https://' + parts[0].toLowerCase() + '.github.io/' + parts[1] + '/';
  }

  function catalogUrl(repo) { return pagesBase(repo) + 'catalog.json'; }
  function videoUrl(repo, file) { return pagesBase(repo) + 'v/' + file + '.mp4'; }
  function subtitleUrl(repo, file, lang) { return pagesBase(repo) + 'subs/' + file + '.' + lang + '.vtt'; }

  // A {uk, en} field in the interface language; Ukrainian when that is empty.
  function localized(field, lang) {
    if (!field) return '';
    var value = field[lang];
    var empty = value == null || value === '' || (Array.isArray(value) && !value.length);
    return empty ? (field.uk != null ? field.uk : '') : value;
  }

  function updateTitle(date) {
    var p = date.split('-');
    var d = p[2] + '.' + p[1] + '.' + p[0];
    return { uk: 'Оновлення на ' + d, en: 'Update of ' + d };
  }

  // The sections as the sheet shows them: copies, with videos in display
  // order and each given `number` ('2.1') and `displayTitle` ({uk, en}).
  function orderedSections(catalog) {
    return (catalog.sections || []).map(function (section, s) {
      var videos = section.videos.slice();
      if (section.order === 'chronological') {
        videos.sort(function (a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : 0; });
      }
      var number = String(s + 1);
      return Object.assign({}, section, {
        number: number,
        videos: videos.map(function (v, i) {
          var hasTitle = v.title && (v.title.uk || v.title.en);
          return Object.assign({}, v, {
            number: number + '.' + (i + 1),
            displayTitle: hasTitle ? v.title : (v.date ? updateTitle(v.date) : { uk: v.file }),
          });
        }),
      });
    });
  }

  function formatDuration(seconds) {
    if (typeof seconds !== 'number' || !isFinite(seconds)) return '';
    var total = Math.round(seconds);
    var h = Math.floor(total / 3600);
    var m = Math.floor((total % 3600) / 60);
    var s = total % 60;
    var ss = (s < 10 ? '0' : '') + s;
    if (!h) return m + ':' + ss;
    return h + ':' + (m < 10 ? '0' : '') + m + ':' + ss;
  }

  // A link to one video: '#/help/<file>' on the portal itself, so it opens
  // behind the same passphrase gate as everything else, over the index the
  // sharer had on screen (its search ?q= and filter ?f=). Off GitHub Pages
  // the portal needs ?repo= (and may carry ?branch=) to boot; nothing else of
  // the sharer's address (an OAuth code, say) travels with the link.
  var FILE_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
  var LINK_PREFIX = '#/help/';
  var KEPT_PARAMS = ['repo', 'branch', 'q', 'f'];

  function linkHash(file) { return LINK_PREFIX + file; }

  function linkedFile(hash) {
    if (typeof hash !== 'string' || hash.indexOf(LINK_PREFIX) !== 0) return null;
    var file = hash.slice(LINK_PREFIX.length);
    return FILE_RE.test(file) ? file : null;
  }

  function shareUrl(origin, pathname, search, file) {
    var from = new URLSearchParams(search || '');
    var kept = new URLSearchParams();
    KEPT_PARAMS.forEach(function (k) { if (from.get(k)) kept.set(k, from.get(k)); });
    var qs = kept.toString();
    return origin + pathname + (qs ? '?' + qs : '') + linkHash(file);
  }

  // A replacement is published under the next version of the name (intro,
  // intro-v2, ...), so a link shared before it still leads to the video's
  // newest version.
  function stem(file) { return file.replace(/-v\d+$/, ''); }
  function version(file) { var m = /-v(\d+)$/.exec(file); return m ? +m[1] : 1; }

  function findLinked(sections, file) {
    var best = null;
    sections.forEach(function (section) {
      section.videos.forEach(function (v) {
        if (best && best.file === file) return;
        if (v.file === file) { best = v; return; }
        if (stem(v.file) === stem(file) && (!best || version(v.file) > version(best.file))) best = v;
      });
    });
    return best;
  }

  var api = {
    linkHash: linkHash,
    linkedFile: linkedFile,
    shareUrl: shareUrl,
    findLinked: findLinked,
    DEFAULT_HELP_REPO: DEFAULT_HELP_REPO,
    helpRepo: helpRepo,
    pagesBase: pagesBase,
    catalogUrl: catalogUrl,
    videoUrl: videoUrl,
    subtitleUrl: subtitleUrl,
    localized: localized,
    orderedSections: orderedSections,
    formatDuration: formatDuration,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else window.HelpVideos = api;
})();
