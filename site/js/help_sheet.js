// The tutorial videos listed in help_videos.js, drawn into the sheet the
// settings menu opens over the app.
//
// A sheet, not a page of its own: a portal installed on an iPhone's home screen
// opens a link in Safari, which shares none of its storage, so a separate page
// would find the passphrase gate locked and the chosen theme gone.

(function () {
  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  function renderVideo(video) {
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
    card.appendChild(player);

    if (video.notes && video.notes.length) {
      var notes = el('ul', 'help-video__notes');
      video.notes.forEach(function (note) { notes.appendChild(el('li', null, note)); });
      card.appendChild(notes);
    }
    return card;
  }

  function render(root) {
    HelpVideos.HELP_SECTIONS.forEach(function (section) {
      var block = el('section', 'help-section');
      block.setAttribute('data-section', section.id);
      block.appendChild(el('h2', 'help-section__title', section.title));
      var list = el('div', 'help-section__list');
      section.videos.forEach(function (video) { list.appendChild(renderVideo(video)); });
      block.appendChild(list);
      root.appendChild(block);
    });
  }

  var api = { render: render };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else window.HelpSheet = api;
})();
