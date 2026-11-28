// The app's JavaScript as the browser gets it: site/index.html and every
// script the page loads. A guard that says "nowhere in the app" has to read
// all of it — one that reads index.html alone stops seeing a line the day it
// moves into a module, and stays green.
//
// Python twin: tests/spa_sources.py.
const fs = require('node:fs');
const path = require('node:path');

const SITE = path.join(__dirname, '..', 'site');
const INDEX = 'index.html';
// Third-party code answers to none of the app's conventions.
const VENDOR = 'js/vendor/';

function indexHtml() {
  return fs.readFileSync(path.join(SITE, INDEX), 'utf8');
}

// The local scripts a page loads, in tag order. Read from the tags, never
// listed by hand, so a module added to the page is covered the same day.
// Tolerant of other attributes (`defer`, `type="module"`), as the precache
// lockstep in test_sw_precache.js is.
function scriptTags(html) {
  return [...html.matchAll(/<script\b[^>]*\bsrc="(js\/[^"]+\.js)"[^>]*>/g)]
    .filter((m) => !m[1].startsWith(VENDOR))
    .map((m) => ({ name: m[1], at: m.index, afterParsing: /\s(defer|async|type="module")[\s>]/.test(m[0]) }));
}

function loadedScriptPaths(html) {
  return scriptTags(html).map((tag) => tag.name);
}

function readScript(name) {
  return fs.readFileSync(path.join(SITE, name), 'utf8');
}

function loadedScripts() {
  return loadedScriptPaths(indexHtml()).map((name) => ({ name, text: readScript(name) }));
}

// [{ name, text }]: index.html first, then the scripts in load order.
function spaSources() {
  return [{ name: INDEX, text: indexHtml() }, ...loadedScripts()];
}

// The names of the sources `needle` (a string or a RegExp) occurs in. `except`
// names the one module that owns the thing and so may spell it out.
function sourcesMentioning(needle, except = []) {
  const found = (text) => (typeof needle === 'string' ? text.includes(needle) : text.search(needle) !== -1);
  return spaSources().filter((s) => !except.includes(s.name) && found(s.text)).map((s) => s.name);
}

// Every line in the order the browser runs it: index.html top to bottom, with
// each loaded script's lines right after the line that carries its tag. A
// `defer`, `async` or module script waits for the page to be parsed, so its
// lines come after the last line of index.html.
// [{ source, n, line }], `n` being the line number inside `source`.
function linesInLoadOrder(html = indexHtml(), read = readScript) {
  const tags = scriptTags(html);
  const tagsByLine = new Map();
  for (const tag of tags.filter((t) => !t.afterParsing)) {
    const lineNo = html.slice(0, tag.at).split('\n').length;
    tagsByLine.set(lineNo, (tagsByLine.get(lineNo) || []).concat(tag.name));
  }
  const out = [];
  const run = (name) => read(name).split('\n').forEach((line, j) => out.push({ source: name, n: j + 1, line }));
  html.split('\n').forEach((line, i) => {
    out.push({ source: INDEX, n: i + 1, line });
    (tagsByLine.get(i + 1) || []).forEach(run);
  });
  tags.filter((t) => t.afterParsing).forEach((t) => run(t.name));
  return out;
}

module.exports = {
  indexHtml,
  loadedScriptPaths,
  loadedScripts,
  spaSources,
  sourcesMentioning,
  linesInLoadOrder,
};
