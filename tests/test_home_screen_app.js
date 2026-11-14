// Every iOS browser is WebKit, which grants the Fullscreen API to a <video>
// only, and the preview's video sits in a cross-origin Vimeo iframe whose own
// fullscreen drops our subtitle overlay. So on an iPhone the browser's address
// bar cannot be removed from a tab; launching from the home screen is the only
// chrome-free fullscreen a page gets.

const { describe, it } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');

const html = () => fs.readFileSync('site/index.html', 'utf8');
const css = () => fs.readFileSync('site/css/components.css', 'utf8');
const manifest = () => JSON.parse(fs.readFileSync('site/manifest.webmanifest', 'utf8'));

function metaContent(name) {
  const re = new RegExp('<meta\\s+name="' + name + '"\\s+content="([^"]*)"');
  const m = html().match(re);
  return m ? m[1] : null;
}

function ruleBody(selector) {
  const esc = selector.replace(/[.*+?^${}()|[\]\\#]/g, '\\$&');
  const m = css().match(new RegExp('(?:^|\\n)' + esc + '\\s*\\{([^}]*)\\}'));
  return m ? m[1] : null;
}

describe('home-screen app: manifest', () => {
  it('opens without browser chrome', () => {
    assert.strictEqual(manifest().display, 'standalone');
  });

  it('starts and stays inside the site directory (relative, works under /sy-subtitles/)', () => {
    const m = manifest();
    assert.strictEqual(m.start_url, './');
    assert.strictEqual(m.scope, './');
  });

  it('names the app and points at an icon that exists', () => {
    const m = manifest();
    assert.ok(m.name && m.short_name, 'manifest needs name and short_name');
    assert.ok(Array.isArray(m.icons) && m.icons.length > 0, 'manifest needs icons');
    for (const icon of m.icons) {
      assert.ok(fs.existsSync('site/' + icon.src), `manifest icon ${icon.src} must exist under site/`);
    }
  });

  it('is linked from index.html', () => {
    assert.match(html(), /<link\s+rel="manifest"\s+href="manifest\.webmanifest">/);
  });

  it('is precached with the shell so the installed app boots offline', () => {
    assert.match(fs.readFileSync('site/sw.js', 'utf8'), /'manifest\.webmanifest'/);
  });
});

describe('home-screen app: iOS meta', () => {
  it('declares itself a web app to iOS', () => {
    assert.strictEqual(metaContent('apple-mobile-web-app-capable'), 'yes');
    assert.strictEqual(metaContent('mobile-web-app-capable'), 'yes');
    assert.ok(metaContent('apple-mobile-web-app-title'), 'home-screen label');
  });

  it('draws edge to edge so fullscreen landscape has no letterbox strips', () => {
    assert.match(metaContent('viewport') || '', /viewport-fit=cover/);
  });
});

describe('home-screen app: safe areas', () => {
  it('fullscreen keeps video and subtitles clear of notch and home indicator', () => {
    const body = ruleBody('#view-preview.fs-mode');
    assert.ok(body, '#view-preview.fs-mode rule not found');
    for (const side of ['top', 'right', 'bottom', 'left']) {
      assert.match(body, new RegExp('env\\(safe-area-inset-' + side + '\\)'),
        `fs-mode must pad safe-area-inset-${side}`);
    }
  });

  it('fullscreen safe-area bands match the player surfaces around the video', () => {
    assert.match(ruleBody('#view-preview.fs-mode'), /background:\s*var\(--bg3\)/);
  });

  it('the normal page keeps its content out from under the notch in landscape', () => {
    const body = ruleBody('body');
    assert.ok(body, 'body rule not found');
    assert.match(body, /env\(safe-area-inset-left\)/);
    assert.match(body, /env\(safe-area-inset-right\)/);
  });
});
