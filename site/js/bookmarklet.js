// Add-talk bookmarklet — page scraper for amruta.org talk pages.
//
// The saved bookmark in the user's bookmarks bar is a thin LOADER that injects
// this file from the deployed site (see updateBookmarklet in site/index.html).
// Because the logic lives here and not in the saved bookmark, fixing the
// scraping and redeploying updates every user's bookmarklet — no re-drag.
//
// This script is injected into the amruta.org page, so it must be
// SELF-CONTAINED: no other site modules are available in that page. It is also
// required by the Node test suite (tests reach extractAmrutaTalk via the
// browser global it exports) — single source, no inline mirror.
(function () {
  // A collapsed (whitespace-normalized, trimmed) <p> belongs in the transcript
  // body if it carries any content and is not the metadata header line (which
  // the pipeline synthesizes from meta, so it must not leak into the body).
  // NB: keep every non-empty paragraph — a length threshold here silently drops
  // legitimately short lines like "Welcome to you all." / "May God bless you.".
  function isTranscriptBodyParagraph(pt) {
    return !!pt && pt.indexOf("Talk Language:") < 0;
  }

  // --- YouTube-era pages -----------------------------------------------------
  // amruta.org moved its talks from Vimeo to YouTube, each with a Bunny Stream
  // copy (the player on the page) and Google Drive copies of the file.
  //
  // The link shapes below are a COPY of URL_SHAPES / PRINTABLE_ASCII_RE in
  // js/vimeo_codec.js, which is what the add form stores a link with. A copy
  // because this file runs inside the amruta.org page (see the header): the
  // codec is not there, and fetching it would put a second network round trip
  // between the click and window.open, and the codec's globals into a page
  // that is not ours. A copy drifts, so tests/test_bookmarklet.js reads one
  // list of links with both and fails on any disagreement — change the codec's
  // shapes and that test says to change these.
  var YT_ID_RE = /^[A-Za-z0-9_-]{11}$/;
  var PRINTABLE_ASCII_RE = /^[!-~]+$/;
  var URL_SHAPES = [
    ["yt", /^(?:https?:\/\/)?(?:www\.|m\.)?youtube\.com\/watch\?(?:[^#]*?&)??v=([A-Za-z0-9_-]{11})(?:[&#].*)?$/i],
    ["yt", /^(?:https?:\/\/)?youtu\.be\/([A-Za-z0-9_-]{11})\/?(?:[?#].*)?$/i],
    ["yt", /^(?:https?:\/\/)?(?:www\.)?youtube(?:-nocookie)?\.com\/embed\/([A-Za-z0-9_-]{11})\/?(?:[?#].*)?$/i],
    ["gd", /^(?:https?:\/\/)?drive\.google\.com\/file\/d\/([A-Za-z0-9_-]{25,64})(?:[/?#].*)?$/i],
    ["gd", /^(?:https?:\/\/)?drive\.google\.com\/open\?(?:[^#]*?&)??id=([A-Za-z0-9_-]{25,64})(?:[&#].*)?$/i],
    ["bn", /^(?:https?:\/\/)?(?:player|iframe)\.mediadelivery\.net\/(?:embed|play)\/([0-9]{1,12}\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\/?(?:[?#].*)?$/i],
  ];
  // Copy of CASE_FOLDED in js/vimeo_codec.js.
  var CASE_FOLDED = { bn: true };

  // The id in a link of the given provider ('yt' | 'gd' | 'bn'), else "".
  function idFromHref(href, provider) {
    var text = String(href == null ? "" : href).trim();
    if (!PRINTABLE_ASCII_RE.test(text)) return "";
    for (var i = 0; i < URL_SHAPES.length; i++) {
      var m = text.match(URL_SHAPES[i][1]);
      // The first shape that matches decides, whatever its provider — as in
      // the codec.
      if (!m) continue;
      if (URL_SHAPES[i][0] !== provider) return "";
      return CASE_FOLDED[provider] ? m[1].toLowerCase() : m[1];
    }
    return "";
  }

  // The video id of a YouTube link (youtu.be/<id>, youtube.com/watch?v=<id>,
  // …/embed/<id>), else "".
  function youtubeIdFromHref(href) {
    return idFromHref(href, "yt");
  }

  // The file id of a Google Drive file link, else "".
  function driveFileIdFromHref(href) {
    return idFromHref(href, "gd");
  }

  // "<library>/<guid>" of a Bunny Stream player link, else "".
  function bunnyIdFromHref(href) {
    return idFromHref(href, "bn");
  }

  // A wrapper's YouTube id, from the first place that has one: the player
  // element, the "Watch on YouTube" link, the details block's collapse-<id>.
  // The page plays its videos through a Bunny iframe instead of the YouTube
  // player — the last two are how such a video is still found.
  function youtubeIdOfWrapper(w) {
    var player = w.querySelector(".youtube-player[data-id]");
    var id = player ? String(player.getAttribute("data-id") || "").trim() : "";
    if (YT_ID_RE.test(id)) return id;
    var link = w.querySelector('a[title="Watch on YouTube"]');
    id = link ? youtubeIdFromHref(link.getAttribute("href")) : "";
    if (id) return id;
    var collapse = w.querySelector('[id^="collapse-"]');
    id = collapse ? collapse.id.slice("collapse-".length) : "";
    return YT_ID_RE.test(id) ? id : "";
  }

  // The Bunny id of a wrapper's player iframe, else of its "Watch on Bunny"
  // link: the iframe is what plays on the page, so it decides if the two ever
  // disagree. "" when it has neither.
  function bunnyIdOfWrapper(w) {
    var iframe = w.querySelector('iframe[src*="mediadelivery.net/"]');
    var id = iframe ? bunnyIdFromHref(iframe.getAttribute("src")) : "";
    if (id) return id;
    var link = w.querySelector('a[title="Watch on Bunny"]');
    return link ? bunnyIdFromHref(link.getAttribute("href")) : "";
  }

  // Drive file ids of a wrapper's "Download MP4 …" links, in page order. The
  // "Download MPG (full quality)" links beside them are far larger files that
  // nothing downstream wants.
  function driveMp4IdsOfWrapper(w) {
    var ids = [];
    w.querySelectorAll('a[href*="drive.google.com/file/d/"]').forEach(function (a) {
      if (String(a.getAttribute("title") || "").indexOf("Download MP4") !== 0) return;
      var id = driveFileIdFromHref(a.getAttribute("href"));
      if (id && ids.indexOf(id) < 0) ids.push(id);
    });
    return ids;
  }

  // Scrape a talk page's DOM into the bookmarklet payload {t,d,u,loc,v,tx}.
  function extractAmrutaTalk(doc) {
    var titleEl = doc.querySelector("h1.entry-title,h1,.entry-title");
    var t = titleEl ? titleEl.textContent.trim() : doc.title;

    var u = doc.location ? doc.location.origin + doc.location.pathname : "";
    var dm = u.match(/(\d{4})\/(\d{2})\/(\d{2})/);
    var d = dm ? dm[1] + "-" + dm[2] + "-" + dm[3] : "";

    // Location: the text-node line right before "Talk Language:" inside the
    // .entry-content h4 (its date/title/location/language fields are separated
    // by <br>, i.e. distinct text nodes).
    var loc = "";
    var h4 = doc.querySelector(".entry-content h4");
    if (h4) {
      var ln = [];
      h4.childNodes.forEach(function (n) {
        if (n.nodeType === 3) {
          var s = n.textContent.trim();
          if (s) ln.push(s);
        }
      });
      for (var i = 0; i < ln.length; i++) {
        if (ln[i].indexOf("Talk Language:") === 0 && i > 0) {
          loc = ln[i - 1];
          break;
        }
      }
    }

    // Videos, one per .embedded-video-wrapper, each with a label (from
    // .video-meta-info, else the preceding heading):
    //   Vimeo    {id, h, l}             — the wrapper holds a Vimeo iframe
    //   YouTube  {p:'yt', id, gd, bn?, l} — anything else an id can be found
    //                                      for; bn only when it has a Bunny copy
    //   no link  {id:'', h:'', l}       — the form shows a row to fill in
    var v = [];
    doc.querySelectorAll(".embedded-video-wrapper").forEach(function (w) {
      var lb = "";
      var mi = w.querySelector(".video-meta-info");
      if (mi) {
        var mt = mi.textContent.trim().replace(/^\d{4}-\d{2}-\d{2}\s+/, "");
        var ps = mt.split(",");
        if (ps.length) lb = ps[0].trim();
      }
      if (!lb) {
        var prev = w.previousElementSibling;
        if (prev && /^H[2-4]$/.test(prev.tagName)) lb = prev.textContent.trim();
      }
      var f = w.querySelector('iframe[src*="vimeo"]');
      if (f) {
        var m = f.src.match(/player\.vimeo\.com\/video\/(\d+)\?h=(\w+)/);
        v.push({ id: m ? m[1] : "", h: m ? m[2] : "", l: lb });
        return;
      }
      var yt = youtubeIdOfWrapper(w);
      if (!yt) {
        v.push({ id: "", h: "", l: lb });
        return;
      }
      var entry = { p: "yt", id: yt, gd: driveMp4IdsOfWrapper(w), l: lb };
      var bn = bunnyIdOfWrapper(w);
      if (bn) entry.bn = bn;
      v.push(entry);
    });
    if (!v.length) {
      doc.querySelectorAll('iframe[src*="vimeo"]').forEach(function (f) {
        var m = f.src.match(/player\.vimeo\.com\/video\/(\d+)\?h=(\w+)/);
        if (m) v.push({ id: m[1], h: m[2], l: "" });
      });
    }

    // Transcript: one line per <p>. Replace <br> with a space first
    // (textContent drops <br>, merging "end.Start"), collapse all whitespace
    // (incl. hard-wrap newlines and NBSP), and skip a header-like <p> that
    // duplicates the metadata, so the pipeline synthesizes a clean header.
    var c = doc.querySelector(".entry-content,.post-content,article");
    var tx = "";
    if (c) {
      var pp = c.querySelectorAll("p");
      for (var k = 0; k < pp.length; k++) {
        var pc = pp[k].cloneNode(true);
        pc.querySelectorAll("br").forEach(function (b) {
          b.replaceWith(" ");
        });
        var pt = pc.textContent.replace(/\s+/g, " ").trim();
        if (isTranscriptBodyParagraph(pt)) {
          tx += (tx ? "\n" : "") + pt;
        }
      }
    }

    return { t: t, d: d, u: u, loc: loc, v: v, tx: tx };
  }

  // Expose for tests / debugging.
  if (typeof window !== "undefined") {
    window.extractAmrutaTalk = extractAmrutaTalk;
    window.isTranscriptBodyParagraph = isTranscriptBodyParagraph;
  }

  // When injected as a real <script> by the loader bookmarklet, scrape the
  // page and open the SPA's add view. The SPA base is derived from THIS
  // script's own URL (it is served from the same site as the SPA), so the
  // loader never hardcodes it. (Skipped when the file is merely eval'd in a
  // test — document.currentScript is null then.)
  if (typeof document !== "undefined" && document.currentScript) {
    var src = document.currentScript.src || "";
    var base = src.replace(/js\/bookmarklet\.js.*$/, "");
    var data = extractAmrutaTalk(document);
    var url = base + "index.html#/add?data=" + encodeURIComponent(JSON.stringify(data));
    window.open(url);
  }

  if (typeof module !== "undefined" && module.exports) {
    module.exports = {
      extractAmrutaTalk: extractAmrutaTalk,
      isTranscriptBodyParagraph: isTranscriptBodyParagraph,
      youtubeIdFromHref: youtubeIdFromHref,
      driveFileIdFromHref: driveFileIdFromHref,
      bunnyIdFromHref: bunnyIdFromHref,
    };
  }
})();
