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

  var api = {
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
