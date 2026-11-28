// A transcript file as the review page reads it and writes it back, and the
// compact timecode its paragraphs and rows are labelled with. Single source:
// loaded by the browser via <script src="js/transcript_text.js"> in
// site/index.html AND required by the Node test suite — no inline mirror.

function parseTranscript(text) {
  // Strip UTF-8 BOM if present. We never re-emit it — fetch().text() strips
  // BOM transparently for network loads anyway, so round-tripping it isn't
  // achievable from the SPA. This is purely defensive for pasted input.
  if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);
  // Normalize CRLF → LF for parsing; track the original line ending so
  // serializeTranscript can write the file back the same way.
  var lineEnding = /\r\n/.test(text) ? '\r\n' : '\n';
  if (lineEnding === '\r\n') text = text.replace(/\r\n/g, '\n');
  var lines = text.split('\n');
  var bodyStart = 0;
  var header = '';
  for (var i = 0; i < Math.min(lines.length, 10); i++) {
    if (/^(Talk Language:|Language:|Мова промови:|Мова:|भाषण भाषा:)/i.test(lines[i].trim())) {
      header = lines.slice(0, i + 1).join('\n');
      bodyStart = i + 1;
      // Consume any blank separator lines between header and body so the
      // body's leading newlines don't confuse separator detection.
      while (bodyStart < lines.length && lines[bodyStart].trim() === '') bodyStart++;
      break;
    }
  }
  var body = lines.slice(bodyStart).join('\n');
  var useDouble = /\n\s*\n/.test(body);
  var paras = useDouble ? body.split(/\n\s*\n/) : body.split('\n');
  paras = paras.map(function(p) { return p.trim(); }).filter(Boolean);
  return {
    header: header, separator: useDouble ? '\n\n' : '\n', paragraphs: paras,
    lineEnding: lineEnding
  };
}

// Serialize a parsed transcript back to a file-identical string.
// Accepts the same shape parseTranscript returns, plus the edited paragraphs.
function serializeTranscript(parsed, paragraphs) {
  var body = paragraphs.join(parsed.separator);
  var text = parsed.header ? parsed.header + '\n\n' + body + '\n' : body + '\n';
  if (parsed.lineEnding === '\r\n') text = text.replace(/\n/g, '\r\n');
  return text;
}

function msToTC(ms) {
  var s = Math.floor(ms / 1000);
  var m = Math.floor(s / 60); s = s % 60;
  var h = Math.floor(m / 60); m = m % 60;
  return (h ? h + ':' : '') + String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    parseTranscript: parseTranscript,
    serializeTranscript: serializeTranscript,
    msToTC: msToTC,
  };
}
