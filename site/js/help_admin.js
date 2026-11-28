// The help sheet's admin: edits to the tutorial catalog, and uploads of new
// recordings, written to the help repository with the signed-in user's token.
//
// Who may use it is GitHub's answer, not the portal's: the sheet shows the
// admin to a user with push access to the help repository, and a user
// without it could not write there whatever the page showed.
//
// A browser cannot upload a release asset (uploads.github.com answers no
// CORS preflight, nor does Git LFS), but api.github.com takes a git blob of
// up to about 40 MiB. So a recording goes up as 30 MiB parts committed to a
// branch inbox/<file>, with inbox/entry.json saying what it is, and the help
// repository's ingest workflow does the rest. The branch is created last, so
// a half-finished upload never starts an ingest.
//
// Every edit returns a new catalog and leaves the one it was given as it was.

(function () {
  var GH = typeof module !== 'undefined' && module.exports ? require('./github_api') : window;

  var PART_SIZE = 30 * 1024 * 1024;
  var MAX_UPLOAD_BYTES = 1024 * 1024 * 1024;
  var MAX_SLUG = 48;

  function clone(x) { return JSON.parse(JSON.stringify(x)); }

  function findVideo(cat, file) {
    for (var s = 0; s < cat.sections.length; s++) {
      var i = cat.sections[s].videos.findIndex(function (v) { return v.file === file; });
      if (i !== -1) return { s: s, i: i };
    }
    throw new Error('no video ' + file);
  }

  function findSection(cat, id) {
    var s = cat.sections.findIndex(function (x) { return x.id === id; });
    if (s === -1) throw new Error('no section ' + id);
    return s;
  }

  function moveVideo(cat, file, delta) {
    var out = clone(cat);
    var at = findVideo(out, file);
    var list = out.sections[at.s].videos;
    var to = Math.max(0, Math.min(list.length - 1, at.i + delta));
    list.splice(to, 0, list.splice(at.i, 1)[0]);
    return out;
  }

  function moveToSection(cat, file, sectionId) {
    var out = clone(cat);
    var at = findVideo(out, file);
    var target = findSection(out, sectionId);
    var video = out.sections[at.s].videos.splice(at.i, 1)[0];
    out.sections[target].videos.push(video);
    return out;
  }

  // path: [sectionId, file or null for the section itself, field, lang or
  // null for a field that is not per language (date)].
  function setText(cat, path, value) {
    var out = clone(cat);
    var owner = path[1] == null ? out.sections[findSection(out, path[0])] : (function () {
      var at = findVideo(out, path[1]);
      return out.sections[at.s].videos[at.i];
    })();
    if (path[3] == null) owner[path[2]] = value;
    else {
      owner[path[2]] = owner[path[2]] || {};
      owner[path[2]][path[3]] = value;
    }
    return out;
  }

  function addSection(cat, section) {
    if (cat.sections.some(function (s) { return s.id === section.id; })) throw new Error('section ' + section.id + ' exists');
    var out = clone(cat);
    out.sections.push({ id: section.id, title: section.title, order: section.order, videos: [] });
    return out;
  }

  function removeSection(cat, id) {
    var out = clone(cat);
    var s = findSection(out, id);
    if (out.sections[s].videos.length) throw new Error('section ' + id + ' is not empty');
    out.sections.splice(s, 1);
    return out;
  }

  function removeVideo(cat, file) {
    var out = clone(cat);
    var at = findVideo(out, file);
    out.sections[at.s].videos.splice(at.i, 1);
    return out;
  }

  // Ukrainian national transliteration (2010): є ї й ю я have their own form
  // at the start of a word, and зг is zgh so it is not read as жх.
  var TRANSLIT = {
    'а': 'a', 'б': 'b', 'в': 'v', 'г': 'h', 'ґ': 'g', 'д': 'd', 'е': 'e', 'є': 'ie', 'ж': 'zh',
    'з': 'z', 'и': 'y', 'і': 'i', 'ї': 'i', 'й': 'i', 'к': 'k', 'л': 'l', 'м': 'm', 'н': 'n',
    'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u', 'ф': 'f', 'х': 'kh', 'ц': 'ts',
    'ч': 'ch', 'ш': 'sh', 'щ': 'shch', 'ь': '', 'ю': 'iu', 'я': 'ia',
  };
  var WORD_START = { 'є': 'ye', 'ї': 'yi', 'й': 'y', 'ю': 'yu', 'я': 'ya' };

  function slugify(title) {
    var text = String(title || '').toLowerCase().replace(/['’ʼ`]/g, '').replace(/зг/g, 'zgh');
    var latin = '';
    for (var i = 0; i < text.length; i++) {
      var ch = text[i];
      var atStart = i === 0 || !/[a-zа-яґєії0-9]/.test(text[i - 1]);
      latin += atStart && WORD_START[ch] ? WORD_START[ch] : (TRANSLIT[ch] != null ? TRANSLIT[ch] : ch);
    }
    var slug = latin.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    if (slug.length > MAX_SLUG) {
      slug = slug.slice(0, MAX_SLUG + 1);
      var cut = slug.lastIndexOf('-');
      slug = (cut > 0 ? slug.slice(0, cut) : slug.slice(0, MAX_SLUG)).replace(/-+$/, '');
    }
    return slug || 'video';
  }

  // A file name never changes content (browsers and the Pages CDN cache by
  // URL), so a replacement takes the next version of the name it replaces,
  // and a name still held by a recording in the release (`released`, the
  // asset names without .bin) is never handed out again.
  //
  // The name apart from its -vN suffix is the video's identity: its share
  // link (the help repository's s/<stem>/) and its old #/help/ links follow
  // it to the newest version. So a NEW video never takes a stem already in
  // use, even by a recording only in the release; it is numbered -2, -3, ...
  function stemOf(file) { return String(file).replace(/-v\d+$/, ''); }

  function nextFile(cat, base, replaces, released) {
    var taken = {};
    var stems = {};
    function take(name) { taken[name] = true; stems[stemOf(name)] = true; }
    cat.sections.forEach(function (s) { s.videos.forEach(function (v) { take(v.file); }); });
    (released || []).forEach(take);
    if (replaces) {
      var version = /-v(\d+)$/.exec(replaces);
      var v = version ? +version[1] + 1 : 2;
      while (taken[stemOf(replaces) + '-v' + v]) v++;
      return stemOf(replaces) + '-v' + v;
    }
    var name = base;
    for (var n = 2; stems[stemOf(name)]; n++) name = base + '-' + n;
    return name;
  }

  // The rules tools/catalog.py validate holds in the help repository, whose
  // deploy refuses a catalog that breaks them: refused here, before saving.
  var FILE_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
  var DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

  function validateCatalog(cat) {
    var errors = [];
    var seen = {};
    var stems = {};
    var ids = {};
    if (cat.version !== 1) errors.push('version must be 1');
    (cat.sections || []).forEach(function (section) {
      if (!FILE_RE.test(String(section.id))) errors.push("section id '" + section.id + "' is not a slug");
      if (ids[section.id]) errors.push("duplicate section '" + section.id + "'");
      ids[section.id] = true;
      if (section.order !== 'manual' && section.order !== 'chronological') {
        errors.push("section '" + section.id + "' has order '" + section.order + "'");
      }
      if (!Array.isArray(section.videos)) { errors.push("section '" + section.id + "' has no videos list"); return; }
      section.videos.forEach(function (v) {
        if (!FILE_RE.test(String(v.file))) errors.push("file '" + v.file + "' is not a lowercase slug");
        else if (seen[v.file]) errors.push("duplicate file '" + v.file + "'");
        else if (stems[stemOf(v.file)]) {
          errors.push("'" + v.file + "' shares the name '" + stemOf(v.file) + "' with '" + stems[stemOf(v.file)] +
            "'; a -vN suffix marks a replacement");
        }
        seen[v.file] = true;
        if (!stems[stemOf(v.file)]) stems[stemOf(v.file)] = v.file;
        if (section.order === 'chronological' && !v.date) errors.push("'" + v.file + "' has no date, which its section sorts by");
        if (v.date && !DATE_RE.test(v.date)) errors.push("'" + v.file + "' has date '" + v.date + "', not YYYY-MM-DD");
      });
    });
    return errors;
  }

  // Unsaved edits made while an upload was being published: the published
  // entry (new, or in place of the file it replaced) joins them, so saving
  // them does not undo the ingest, and the edits are not lost to a reload.
  function rebaseOnIngest(local, remote, file) {
    var out = clone(local);
    var at = findVideo(remote, file);
    var sectionId = remote.sections[at.s].id;
    var published = clone(remote.sections[at.s].videos[at.i]);
    var inRemote = {};
    remote.sections.forEach(function (s) { s.videos.forEach(function (v) { inRemote[v.file] = true; }); });
    var target = out.sections.findIndex(function (s) { return s.id === sectionId; });
    if (target === -1) target = 0;
    var list = out.sections[target].videos;
    if (list.some(function (v) { return v.file === file; })) return out;
    // What it replaced: a video of that section the ingest took out of main.
    var old = list.findIndex(function (v) { return !inRemote[v.file]; });
    if (old === -1) {
      list.push(published);
      return out;
    }
    ['title', 'description', 'notes', 'date'].forEach(function (k) {
      if (list[old][k] !== undefined) published[k] = list[old][k];
    });
    delete published.subtitles;
    list[old] = published;
    return out;
  }

  function staleOr(e) {
    if (e && (e.status === 409 || e.status === 422)) {
      var stale = new Error('the catalog changed since it was loaded');
      stale.code = 'stale';
      return stale;
    }
    return e;
  }

  function loadCatalog(api, token, f) {
    return GH.getFileContent(api, token, 'catalog.json', 'main', f).then(function (file) {
      if (!file) throw new Error('the help repository has no catalog.json');
      return { catalog: JSON.parse(file.content), sha: file.sha };
    });
  }

  function saveCatalog(api, token, catalog, sha, message, f) {
    var errors = validateCatalog(catalog);
    if (errors.length) {
      var invalid = new Error(errors.join('; '));
      invalid.code = 'invalid';
      return Promise.reject(invalid);
    }
    return GH.putFile(api, token, {
      path: 'catalog.json',
      branch: 'main',
      message: message,
      sha: sha,
      content: JSON.stringify(catalog, null, 2) + '\n',
    }, f).then(function (r) { return r.content.sha; }, function (e) { throw staleOr(e); });
  }

  var BROWSER_DEPS = {
    sha256Hex: function (buf) {
      return crypto.subtle.digest('SHA-256', buf).then(function (d) {
        return Array.prototype.map.call(new Uint8Array(d), function (b) { return (b + 256).toString(16).slice(1); }).join('');
      });
    },
    // FileReader encodes natively; a JS loop over 30 MiB would stall the page.
    toBase64: function (buf) {
      return new Promise(function (resolve, reject) {
        var r = new FileReader();
        r.onload = function () { resolve(String(r.result).slice(String(r.result).indexOf(',') + 1)); };
        r.onerror = function () { reject(r.error); };
        r.readAsDataURL(new Blob([buf]));
      });
    },
  };

  function withRetries(run, tries, delayMs) {
    return run().catch(function (e) {
      if (tries <= 1) throw e;
      return new Promise(function (r) { setTimeout(r, delayMs); }).then(function () {
        return withRetries(run, tries - 1, delayMs * 2);
      });
    });
  }

  function json(api, token, path, method, body, f) {
    return GH.ghJson(api + path, token, { method: method, body: body }, f);
  }

  // file: a Blob (File); entry: {section, file, replaces, title, description,
  // date, notes}. Resolves the inbox branch name.
  function uploadVideo(api, token, file, entry, onProgress, f, deps) {
    var d = Object.assign({ partSize: PART_SIZE, retryDelayMs: 2000 }, BROWSER_DEPS, deps || {});
    if (file.size > MAX_UPLOAD_BYTES) {
      var big = new Error('the file is over 1 GiB');
      big.code = 'too-large';
      return Promise.reject(big);
    }
    var branch = 'inbox/' + entry.file;
    var parts = [];
    var tree = [];
    var head;
    var baseTree;
    var count = Math.max(1, Math.ceil(file.size / d.partSize));

    function uploadPart(n) {
      if (n >= count) return Promise.resolve();
      var start = n * d.partSize;
      var end = Math.min(file.size, start + d.partSize);
      return file.slice(start, end).arrayBuffer().then(function (buf) {
        return d.sha256Hex(buf).then(function (sha256) {
          return d.toBase64(buf).then(function (b64) {
            return withRetries(function () {
              return json(api, token, '/git/blobs', 'POST', { content: b64, encoding: 'base64' }, f);
            }, 3, d.retryDelayMs).then(function (blob) {
              parts.push({ size: end - start, sha256: sha256 });
              tree.push({ path: 'inbox/parts/' + String(n).padStart(3, '0'), mode: '100644', type: 'blob', sha: blob.sha });
              onProgress(end, file.size);
            });
          });
        });
      }).then(function () { return uploadPart(n + 1); });
    }

    return GH.getBranchHeadSha(api, token, 'main', f).then(function (sha) {
      head = sha;
      return json(api, token, '/git/commits/' + sha, 'GET', undefined, f);
    }).then(function (commit) {
      baseTree = commit.tree.sha;
      return uploadPart(0);
    }).then(function () {
      var written = Object.assign({}, entry, { size: file.size, parts: parts });
      return json(api, token, '/git/blobs', 'POST',
        { content: GH.utf8ToBase64(JSON.stringify(written, null, 2) + '\n'), encoding: 'base64' }, f);
    }).then(function (blob) {
      tree.push({ path: 'inbox/entry.json', mode: '100644', type: 'blob', sha: blob.sha });
      return json(api, token, '/git/trees', 'POST', { base_tree: baseTree, tree: tree }, f);
    }).then(function (t) {
      return json(api, token, '/git/commits', 'POST',
        { message: 'Upload ' + entry.file + ' for ingest', tree: t.sha, parents: [head] }, f);
    }).then(function (commit) {
      return json(api, token, '/git/refs', 'POST', { ref: 'refs/heads/' + branch, sha: commit.sha }, f)
        .catch(function (e) {
          // An earlier try got this far: point its branch at this upload.
          if (e.status !== 422) throw e;
          return json(api, token, '/git/refs/heads/' + branch, 'PATCH', { sha: commit.sha, force: true }, f);
        })
        .then(function () { return { branch: branch, sha: commit.sha }; });
    });
  }

  // The run of this upload's commit: a branch name is reused by a re-upload,
  // and an earlier run on it says nothing about this one.
  function ingestStatus(api, token, branch, sha, f) {
    var url = '/actions/runs?event=push&per_page=10&branch=' + encodeURIComponent(branch);
    return GH.ghJson(api + url, token, { cache: 'no-store' }, f).then(function (r) {
      var run = (r.workflow_runs || []).filter(function (x) { return x.head_sha === sha; })[0];
      if (!run) return { state: 'queued', url: null };
      if (run.status !== 'completed') return { state: 'running', url: run.html_url };
      return { state: run.conclusion === 'success' ? 'done' : 'failed', url: run.html_url };
    });
  }

  var api = {
    PART_SIZE: PART_SIZE,
    MAX_UPLOAD_BYTES: MAX_UPLOAD_BYTES,
    moveVideo: moveVideo,
    moveToSection: moveToSection,
    setText: setText,
    addSection: addSection,
    removeSection: removeSection,
    removeVideo: removeVideo,
    slugify: slugify,
    nextFile: nextFile,
    validateCatalog: validateCatalog,
    rebaseOnIngest: rebaseOnIngest,
    loadCatalog: loadCatalog,
    saveCatalog: saveCatalog,
    uploadVideo: uploadVideo,
    ingestStatus: ingestStatus,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else window.HelpAdmin = api;
})();
