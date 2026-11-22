// help.html: the tutorial videos listed in help_videos.js, behind the same
// passphrase gate as the portal and in the theme the portal was left in.
//
// The page has no prompt of its own. It is opened from the portal's settings
// menu, so a reader who got here the normal way has already unlocked the
// portal in this browser; anyone else is sent to the portal to do it there.

(function () {
  function gateHash() {
    if (typeof window.__SY_GATE_HASH === 'string') return window.__SY_GATE_HASH;
    return typeof APP_GATE_HASH === 'string' ? APP_GATE_HASH : '';
  }

  function applyTheme(root, storage) {
    var theme = readPref(storage, 'theme');
    if (theme !== 'auto') root.setAttribute('data-theme', theme);
  }

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

  function renderLocked(root) {
    var box = el('div', 'help-locked');
    box.appendChild(el('p', null, 'Інструкції відкриваються після входу на портал.'));
    var link = el('a', 'btn btn--primary btn--sm', 'Відкрити портал');
    link.href = './';
    box.appendChild(link);
    root.appendChild(box);
  }

  function render(root, storage) {
    var hash = gateHash();
    if (PassphraseGate.isGateEnabled(hash) && !PassphraseGate.isUnlocked(hash, storage)) {
      renderLocked(root);
      return;
    }
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

  window.HelpPage = { applyTheme: applyTheme, render: render };
})();
