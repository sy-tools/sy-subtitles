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

    // Videos: vimeo id+hash and a label (from .video-meta-info, else the
    // preceding heading).
    var v = [];
    doc.querySelectorAll(".embedded-video-wrapper").forEach(function (w) {
      var f = w.querySelector('iframe[src*="vimeo"]');
      if (!f) return;
      var m = f.src.match(/player\.vimeo\.com\/video\/(\d+)\?h=(\w+)/);
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
      v.push({ id: m ? m[1] : "", h: m ? m[2] : "", l: lb });
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
    };
  }
})();
