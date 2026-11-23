// The help sheet in edit mode: the catalog as a form. It holds no state of its
// own: index.html keeps the catalog being edited and passes `actions`, and
// this draws it again after every change that moves things around. A typed
// text goes straight to actions.edit without a redraw, so the caret stays.
//
// model: { catalog, dirty, status: {kind, text, url?} | null, upload:
//          {file, state, done, total, url} | null }
// actions: { t(key), edit(path, value), move(file, delta), moveTo(file, id),
//            remove(file), addSection(title), removeSection(id),
//            upload(form), save(), discard() }

(function () {
  var LANGS = ['uk', 'en'];

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  function button(label, className, onClick, disabled) {
    var b = el('button', 'btn btn--sm ' + (className || 'btn--ghost'), label);
    b.type = 'button';
    b.disabled = !!disabled;
    b.addEventListener('click', onClick);
    return b;
  }

  function fieldPerLanguage(label, field, path, actions, multiline) {
    var row = el('div', 'help-admin__field');
    row.appendChild(el('span', 'help-admin__label', label));
    var pair = el('div', 'help-admin__pair');
    LANGS.forEach(function (lang) {
      var value = (field || {})[lang];
      var input = el(multiline ? 'textarea' : 'input', 'input');
      if (!multiline) input.type = 'text';
      else input.rows = 2;
      input.value = Array.isArray(value) ? value.join('\n') : (value || '');
      input.setAttribute('lang', lang);
      input.setAttribute('aria-label', label + ' (' + lang + ')');
      input.placeholder = lang.toUpperCase();
      input.setAttribute('data-path', path.concat([lang]).join('/'));
      input.addEventListener('input', function () {
        var v = input.value;
        actions.edit(path.concat([lang]), Array.isArray(value) || path[2] === 'notes'
          ? v.split('\n').map(function (s) { return s.trim(); }).filter(Boolean) : v);
      });
      pair.appendChild(input);
    });
    row.appendChild(pair);
    return row;
  }

  function videoCard(section, video, index, count, catalog, model, actions) {
    var t = actions.t;
    var card = el('article', 'help-video help-admin__video');
    card.setAttribute('data-file', video.file);
    var head = el('header', 'help-video__head');
    head.appendChild(el('code', 'help-admin__file', video.file));
    var tools = el('div', 'help-admin__tools');
    if (section.order !== 'chronological') {
      tools.appendChild(button('↑', 'btn--ghost help-admin__up', function () { actions.move(video.file, -1); }, index === 0));
      tools.appendChild(button('↓', 'btn--ghost help-admin__down', function () { actions.move(video.file, 1); }, index === count - 1));
    }
    var where = el('select', 'select-chip help-admin__section');
    where.setAttribute('aria-label', t('help.admin.section'));
    catalog.sections.forEach(function (s) {
      var o = el('option', null, HelpVideos.localized(s.title, 'uk'));
      o.value = s.id;
      o.selected = s.id === section.id;
      where.appendChild(o);
    });
    where.addEventListener('change', function () { actions.moveTo(video.file, where.value); });
    tools.appendChild(where);
    tools.appendChild(button(t('help.admin.remove'), 'btn--danger help-admin__remove', function () { actions.remove(video.file); }));
    head.appendChild(tools);
    card.appendChild(head);

    if (section.order === 'chronological') {
      var row = el('div', 'help-admin__field');
      row.appendChild(el('span', 'help-admin__label', t('help.admin.date')));
      var date = el('input', 'input compact');
      date.type = 'date';
      date.value = video.date || '';
      date.addEventListener('change', function () { actions.edit([section.id, video.file, 'date', null], date.value); });
      row.appendChild(date);
      card.appendChild(row);
    }
    card.appendChild(fieldPerLanguage(t('help.admin.title'), video.title, [section.id, video.file, 'title'], actions));
    card.appendChild(fieldPerLanguage(t('help.admin.description'), video.description, [section.id, video.file, 'description'], actions, true));
    if (section.order === 'chronological' || (video.notes && (video.notes.uk || []).length)) {
      card.appendChild(fieldPerLanguage(t('help.admin.notes'), video.notes || { uk: [], en: [] }, [section.id, video.file, 'notes'], actions, true));
    }
    card.appendChild(uploadForm(section, video, catalog, model, actions));
    return card;
  }

  // With a `video`, the file is a new recording of that tutorial, which keeps
  // its texts and its place.
  function uploadForm(section, video, catalog, model, actions) {
    var t = actions.t;
    var form = el('div', 'help-admin__upload');
    var input = el('input', 'help-admin__file-input');
    input.type = 'file';
    input.accept = 'video/*';
    input.setAttribute('aria-label', t(video ? 'help.admin.replace' : 'help.admin.file'));
    var go = button(t(video ? 'help.admin.replace' : 'help.admin.upload'), 'btn--primary help-admin__send', function () {
      if (!input.files || !input.files[0]) { input.click(); return; }
      actions.upload({ section: section ? section.id : null, video: video, file: input.files[0], fields: form._fields });
    }, model.dirty || !!(model.upload && model.upload.state !== 'done' && model.upload.state !== 'failed'));
    if (model.dirty) go.title = t('help.admin.saveFirst');
    form.appendChild(input);
    form.appendChild(go);
    return form;
  }

  function newVideoBlock(catalog, model, actions) {
    var t = actions.t;
    var block = el('section', 'help-admin__new');
    block.appendChild(el('h3', 'help-admin__new-title', t('help.admin.addVideo')));
    var fields = { section: catalog.sections[0] && catalog.sections[0].id, title: { uk: '', en: '' }, description: { uk: '', en: '' }, date: '' };
    var where = el('select', 'select-chip');
    where.setAttribute('aria-label', t('help.admin.section'));
    catalog.sections.forEach(function (s) {
      var o = el('option', null, HelpVideos.localized(s.title, 'uk'));
      o.value = s.id;
      where.appendChild(o);
    });
    where.addEventListener('change', function () { fields.section = where.value; });
    block.appendChild(where);
    var collect = { edit: function (path, value) { fields[path[2]][path[3]] = value; }, t: t };
    block.appendChild(fieldPerLanguage(t('help.admin.title'), fields.title, [null, null, 'title'], collect));
    block.appendChild(fieldPerLanguage(t('help.admin.description'), fields.description, [null, null, 'description'], collect, true));
    var row = el('div', 'help-admin__field');
    row.appendChild(el('span', 'help-admin__label', t('help.admin.dateIfUpdate')));
    var date = el('input', 'input compact');
    date.type = 'date';
    date.addEventListener('change', function () { fields.date = date.value; });
    row.appendChild(date);
    block.appendChild(row);
    var form = uploadForm(null, null, catalog, model, actions);
    form._fields = fields;
    block.appendChild(form);
    return block;
  }

  function statusLine(model, t) {
    var line = el('p', 'help-admin__status');
    var u = model.upload;
    if (u) {
      var text = u.state === 'sending' ? t('help.admin.uploading').replace('{p}', String(Math.floor(100 * u.done / Math.max(1, u.total))))
        : u.state === 'failed' ? t('help.admin.failed')
          : u.state === 'done' ? t('help.admin.published')
            : t('help.admin.processing');
      line.appendChild(el('span', u.state === 'failed' ? 'help-sheet__error' : null, u.file + ': ' + text));
      if (u.state === 'sending') {
        var bar = el('progress', 'help-admin__progress');
        bar.max = u.total;
        bar.value = u.done;
        line.appendChild(bar);
      }
      if (u.url) {
        var a = el('a', null, t('help.admin.run'));
        a.href = u.url;
        a.target = '_blank';
        a.rel = 'noopener';
        line.appendChild(document.createTextNode(' '));
        line.appendChild(a);
      }
    }
    if (model.status) {
      if (u) line.appendChild(el('br'));
      line.appendChild(el('span', model.status.kind === 'error' ? 'help-sheet__error' : null, model.status.text));
    }
    return line;
  }

  function render(root, model, actions) {
    var t = actions.t;
    var catalog = model.catalog;
    root.textContent = '';
    var bar = el('div', 'help-admin__bar');
    bar.appendChild(button(t('help.admin.save'), 'btn--primary help-admin__save', actions.save, !model.dirty || model.saving));
    bar.appendChild(button(t('help.admin.discard'), 'btn--ghost help-admin__discard', actions.discard, !model.dirty || model.saving));
    bar.appendChild(statusLine(model, t));
    root.appendChild(bar);

    catalog.sections.forEach(function (section) {
      var block = el('section', 'help-section help-admin__sec');
      block.setAttribute('data-section', section.id);
      var head = el('div', 'help-admin__sec-head');
      head.appendChild(el('code', 'help-admin__file', section.id + ' · ' + t(section.order === 'chronological' ? 'help.admin.byDate' : 'help.admin.byHand')));
      if (!section.videos.length) {
        head.appendChild(button(t('help.admin.removeSection'), 'btn--danger', function () { actions.removeSection(section.id); }));
      }
      block.appendChild(head);
      block.appendChild(fieldPerLanguage(t('help.admin.sectionTitle'), section.title, [section.id, null, 'title'], actions));
      var list = el('div', 'help-section__list');
      section.videos.forEach(function (video, i) {
        list.appendChild(videoCard(section, video, i, section.videos.length, catalog, model, actions));
      });
      block.appendChild(list);
      root.appendChild(block);
    });

    root.appendChild(newVideoBlock(catalog, model, actions));

    var add = el('section', 'help-admin__new');
    add.appendChild(el('h3', 'help-admin__new-title', t('help.admin.addSection')));
    var name = { uk: '', en: '' };
    add.appendChild(fieldPerLanguage(t('help.admin.sectionTitle'), name, [null, null, 'title'],
      { edit: function (p, v) { name[p[3]] = v; }, t: t }));
    var order = el('select', 'select-chip');
    [['manual', 'help.admin.byHand'], ['chronological', 'help.admin.byDate']].forEach(function (o) {
      var opt = el('option', null, t(o[1]));
      opt.value = o[0];
      order.appendChild(opt);
    });
    add.appendChild(order);
    add.appendChild(button(t('help.admin.addSection'), 'btn--primary', function () {
      if (name.uk.trim()) actions.addSection({ title: name, order: order.value });
    }));
    root.appendChild(add);
  }

  var api = { render: render };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else window.HelpAdminView = api;
})();
