// The tutorial videos listed in help_videos.js, drawn into the sheet the
// settings menu opens over the app.
//
// A sheet, not a page of its own: a portal installed on an iPhone's home screen
// opens a link in Safari, which shares none of its storage, so a separate page
// would find the passphrase gate locked and the chosen theme gone.

(function () {
  var SUBTITLE_DIR = 'help/subs/';
  var SUBTITLE_LABELS = { uk: 'Українська', en: 'English' };

  // The speakers are Ukrainian, so a Ukrainian reader starts with subtitles
  // off and an English one with English on; either can switch in the player.
  function subtitleTracks(ref, langs, uiLang) {
    return Object.keys(SUBTITLE_LABELS)
      .filter(function (lang) { return (langs || []).indexOf(lang) !== -1; })
      .map(function (lang) {
        return {
          lang: lang,
          label: SUBTITLE_LABELS[lang],
          src: SUBTITLE_DIR + ref + '.' + lang + '.vtt',
          default: lang === 'en' && uiLang === 'en',
        };
      });
  }

  function applySubtitleLanguage(root, uiLang) {
    root.querySelectorAll('video').forEach(function (video) {
      Array.prototype.forEach.call(video.textTracks, function (track) {
        track.mode = track.language === 'en' && uiLang === 'en' ? 'showing' : 'disabled';
      });
    });
  }

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  function renderVideo(video, subtitles, uiLang) {
    var card = el('article', 'help-video');
    var head = el('header', 'help-video__head');
    head.appendChild(el('h3', 'help-video__title', video.title));
    head.appendChild(el('span', 'help-video__duration', HelpVideos.formatDuration(video.duration)));
    card.appendChild(head);

    var player = el('video', 'help-video__player');
    player.controls = true;
    player.preload = 'metadata';
    player.setAttribute('playsinline', '');
    player.src = HelpVideos.helpVideoUrl(video.ref);
    subtitleTracks(video.ref, subtitles[video.ref], uiLang).forEach(function (t) {
      var track = document.createElement('track');
      track.kind = 'subtitles';
      track.srclang = t.lang;
      track.label = t.label;
      track.src = t.src;
      track.default = t.default;
      player.appendChild(track);
    });
    card.appendChild(player);

    if (video.notes && video.notes.length) {
      var notes = el('ul', 'help-video__notes');
      video.notes.forEach(function (note) { notes.appendChild(el('li', null, note)); });
      card.appendChild(notes);
    }
    return card;
  }

  // subtitles: ref -> languages with a .vtt (help/subs/index.json).
  function render(root, subtitles, uiLang) {
    HelpVideos.HELP_SECTIONS.forEach(function (section) {
      var block = el('section', 'help-section');
      block.setAttribute('data-section', section.id);
      block.appendChild(el('h2', 'help-section__title', section.title));
      var list = el('div', 'help-section__list');
      section.videos.forEach(function (video) { list.appendChild(renderVideo(video, subtitles || {}, uiLang)); });
      block.appendChild(list);
      root.appendChild(block);
    });
  }

  var api = { render: render, subtitleTracks: subtitleTracks, applySubtitleLanguage: applySubtitleLanguage };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else window.HelpSheet = api;
})();
