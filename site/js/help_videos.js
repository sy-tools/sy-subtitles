// The tutorial videos help.html lists, and how a listed video finds its file.
//
// The files live in the sy-tools/sy-help repository and are served by its
// GitHub Pages site, which answers range requests with video/mp4. A release
// download link would not do: it is served as application/octet-stream, and
// Safari refuses to play that. See that repository's README.
//
// A file is named by an opaque 12-character id, and the id is stored here as
// a ref: 'h1' + base64url(reverse(xor(id, KEY))). That is OBFUSCATION, NOT
// SECRECY (the decoder is right below, in a public page): it keeps the list of
// files from being read straight out of the source, as video_ref does for
// Vimeo links in vimeo_codec.js.
//
// To list a new video, upload it to sy-help (see its README), then add an entry
// with the ref printed by:
//   node -e "console.log(require('./site/js/help_videos.js').encodeHelpRef('<id>'))"

(function () {
  var KEY = 'sy-help-videos';
  var VERSION = 'h1';
  var BASE_URL = 'https://sy-tools.github.io/sy-help/v/';
  var ID_RE = /^[a-z0-9]{12}$/;

  function xorBytes(bytes) {
    return bytes.map(function (b, i) { return b ^ KEY.charCodeAt(i % KEY.length); });
  }

  function toB64url(bytes) {
    var bin = String.fromCharCode.apply(null, bytes);
    var b64 = typeof btoa !== 'undefined' ? btoa(bin) : Buffer.from(bin, 'binary').toString('base64');
    return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  function fromB64url(s) {
    var b64 = s.replace(/-/g, '+').replace(/_/g, '/');
    while (b64.length % 4) b64 += '=';
    var bin = typeof atob !== 'undefined' ? atob(b64) : Buffer.from(b64, 'base64').toString('binary');
    var bytes = [];
    for (var i = 0; i < bin.length; i++) bytes.push(bin.charCodeAt(i));
    return bytes;
  }

  function encodeHelpRef(id) {
    if (!ID_RE.test(id)) throw new Error('not a sy-help video id: ' + id);
    var bytes = [];
    for (var i = 0; i < id.length; i++) bytes.push(id.charCodeAt(i));
    return VERSION + toB64url(xorBytes(bytes).reverse());
  }

  function decodeHelpRef(ref) {
    var s = String(ref == null ? '' : ref);
    if (s.indexOf(VERSION) !== 0) throw new Error('not a ' + VERSION + ' help video ref: ' + s);
    var id = String.fromCharCode.apply(null, xorBytes(fromB64url(s.slice(VERSION.length)).reverse()));
    if (!ID_RE.test(id)) throw new Error('help video ref does not decode to an id: ' + s);
    return id;
  }

  function helpVideoUrl(ref) {
    return BASE_URL + decodeHelpRef(ref) + '.mp4';
  }

  function formatDuration(seconds) {
    var total = Math.round(seconds);
    var h = Math.floor(total / 3600);
    var m = Math.floor((total % 3600) / 60);
    var s = total % 60;
    var ss = (s < 10 ? '0' : '') + s;
    if (!h) return m + ':' + ss;
    return h + ':' + (m < 10 ? '0' : '') + m + ':' + ss;
  }

  // duration is in seconds and is shown before a video has loaded anything,
  // so the list can say how long each one is without fetching thirteen files.
  var HELP_SECTIONS = [
    {
      id: 'guide',
      title: 'Як працювати з порталом',
      videos: [
        { title: '1–2. Мотивація та обмеження', ref: 'h1XA8BAFgSXwsGS0FA', duration: 335.9 },
        { title: '3.1. Компоненти: GitHub, словник, автоматизація', ref: 'h1VB0QRUUYDQYZTExB', duration: 951.1 },
        { title: '3.2. Компоненти: портал перекладу', ref: 'h1XFECHVgYXBAKVAkC', duration: 682.1 },
        { title: '3.3. Безпека', ref: 'h1AQdRA1RDGVRbT0gZ', duration: 432.4 },
        { title: '4.1. Реєстрація на GitHub', ref: 'h1FAUNA0cFHg0CRwga', duration: 87.7 },
        { title: '4.2. Як взяти матеріал у роботу', ref: 'h1XAcNQllFFQoJHA9F', duration: 148.6 },
        { title: '4.3. Додавання нових матеріалів та автопереклад', ref: 'h1ABNcBkEdGlcORA5G', duration: 405.7 },
        { title: '4.4. Робота в режимі «Переглянути переклад»', ref: 'h1HFEDQkEDGB8PGAsJ', duration: 631.6 },
        { title: '4.5. Робота в режимі «Перевірити переклад»', ref: 'h1HxAND0sCGA1dGkhB', duration: 642.0 },
        { title: '4.6. Фіналізація, публікація на Амруту', ref: 'h1UA0ERhsYGgYHRRdL', duration: 329.9 },
        { title: '5. Login', ref: 'h1VA5aRB0ZHlcFVQAB', duration: 613.7 },
      ],
    },
    {
      id: 'updates',
      title: 'Оновлення',
      videos: [
        {
          title: 'Оновлення на 22.11.2026',
          date: '2026-11-22',
          ref: 'h1ARABHRkIHxBRSQMH',
          duration: 595.8,
          notes: [
            'Зміна розміру субтитрів у повноекранному режимі.',
            'Додавання міток редагування у повноекранному режимі.',
            'Збереження файлу субтитрів.',
            'Створення відео із вбудованими субтитрами, в т.ч. уривків, які можна використовувати офлайн.',
          ],
        },
        {
          title: 'Оновлення на 05.09.2026',
          date: '2026-09-05',
          ref: 'h1VlEZFxQSHQcNHRUS',
          duration: 361.1,
          notes: [
            'Меню налаштувань',
            'Автоматичні виправлення описок',
            'Підсвітка описок',
          ],
        },
      ],
    },
  ];

  var api = {
    encodeHelpRef: encodeHelpRef,
    decodeHelpRef: decodeHelpRef,
    helpVideoUrl: helpVideoUrl,
    formatDuration: formatDuration,
    HELP_SECTIONS: HELP_SECTIONS,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else window.HelpVideos = api;
})();
