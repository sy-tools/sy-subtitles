// The tutorials of the help catalog (help_videos.js), drawn into the sheet the
// settings menu opens over the app.
//
// A sheet, not a page of its own: a portal installed on an iPhone's home screen
// opens a link in Safari, which shares none of its storage, so a separate page
// would find the passphrase gate locked and the chosen theme gone.

(function () {
  var SUBTITLE_LABELS = { uk: 'Українська', en: 'English' };

  // The speakers are Ukrainian, so a Ukrainian reader starts with subtitles
  // off and an English one with English on; either can switch in the player.
  function subtitleTracks(repo, file, langs, uiLang) {
    return Object.keys(SUBTITLE_LABELS)
      .filter(function (lang) { return (langs || []).indexOf(lang) !== -1; })
      .map(function (lang) {
        return {
          lang: lang,
          label: SUBTITLE_LABELS[lang],
          src: HelpVideos.subtitleUrl(repo, file, lang),
          default: lang === 'en' && uiLang === 'en',
        };
      });
  }

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  function renderVideo(repo, video, uiLang) {
    var card = el('article', 'help-video');
    card.setAttribute('data-file', video.file);
    var head = el('header', 'help-video__head');
    var title = el('h3', 'help-video__title');
    title.appendChild(el('span', 'help-video__number', video.number));
    title.appendChild(document.createTextNode(' ' + HelpVideos.localized(video.displayTitle, uiLang)));
    head.appendChild(title);
    head.appendChild(el('span', 'help-video__duration', HelpVideos.formatDuration(video.duration)));
    card.appendChild(head);

    var description = HelpVideos.localized(video.description, uiLang);
    if (description) card.appendChild(el('p', 'help-video__description', description));

    var player = el('video', 'help-video__player');
    player.controls = true;
    player.preload = 'metadata';
    player.setAttribute('playsinline', '');
    // Tracks from another origin load only into a CORS-mode video (a local
    // portal on localhost); on Pages it is the same origin and costs nothing.
    player.setAttribute('crossorigin', 'anonymous');
    player.src = HelpVideos.videoUrl(repo, video.file);
    subtitleTracks(repo, video.file, video.subtitles, uiLang).forEach(function (t) {
      var track = document.createElement('track');
      track.kind = 'subtitles';
      track.srclang = t.lang;
      track.label = t.label;
      track.src = t.src;
      track.default = t.default;
      player.appendChild(track);
    });
    card.appendChild(player);

    var notes = HelpVideos.localized(video.notes, uiLang);
    if (notes && notes.length) {
      var list = el('ul', 'help-video__notes');
      notes.forEach(function (note) { list.appendChild(el('li', null, note)); });
      card.appendChild(list);
    }
    return card;
  }

  function render(root, repo, catalog, uiLang) {
    root.textContent = '';
    HelpVideos.orderedSections(catalog).forEach(function (section) {
      var block = el('section', 'help-section');
      block.setAttribute('data-section', section.id);
      block.appendChild(el('h2', 'help-section__title', section.number + '. ' + HelpVideos.localized(section.title, uiLang)));
      var list = el('div', 'help-section__list');
      section.videos.forEach(function (video) { list.appendChild(renderVideo(repo, video, uiLang)); });
      block.appendChild(list);
      root.appendChild(block);
    });
  }

  var api = { render: render, subtitleTracks: subtitleTracks };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else window.HelpSheet = api;
})();
