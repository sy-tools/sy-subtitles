const { describe, it } = require('node:test');
const assert = require('node:assert');
const {
  markerIssueTitle, markerMetaKey, renderMarkersTable,
  buildIssueBody, parseMarkersBlock, mergeMarkers, MARKER_LABEL,
} = require('../site/js/marker_sync');

const M = (time, text, comment) => ({ time, text, tc: '00:00:0' + time, comment: comment || '' });

describe('marker_sync helpers', () => {
  it('deterministic title + meta key + label', () => {
    assert.strictEqual(markerIssueTitle('1977_T', 'V1'), 'Markers: 1977_T / V1');
    assert.strictEqual(markerMetaKey('1977_T', 'V1'), 'sy_marker_issue_1977_T_V1');
    assert.strictEqual(MARKER_LABEL, 'markers');
  });
  it('body round-trips markers through the hidden block', () => {
    const markers = [M(1, 'alpha', 'c1'), M(2, 'beta')];
    const body = buildIssueBody(markers, 'Video X');
    assert.ok(body.includes('| Time | Subtitle | Comment |'));
    assert.ok(body.includes('alpha'));
    assert.ok(body.includes('<!-- sy-markers:'));
    assert.deepStrictEqual(parseMarkersBlock(body), markers);
  });
  it('renders a human table with the heading', () => {
    const t = renderMarkersTable([M(1, 'alpha', 'c1')], 'Video X');
    assert.ok(t.startsWith('## Markers — Video X'));
    assert.ok(t.includes('| 00:00:01 | alpha | c1 |'));
  });
  it('parseMarkersBlock returns [] when absent or corrupt', () => {
    assert.deepStrictEqual(parseMarkersBlock('no block here'), []);
    assert.deepStrictEqual(parseMarkersBlock('<!-- sy-markers: @@@ -->'), []);
  });
  it('mergeMarkers unions concurrent additions by identity', () => {
    const base = [M(1, 'a')];
    const local = [M(1, 'a'), M(2, 'local')];       // this device added 2
    const remote = [M(1, 'a'), M(3, 'remote')];     // other device added 3
    const texts = mergeMarkers(base, local, remote).map((m) => m.text).sort();
    assert.deepStrictEqual(texts, ['a', 'local', 'remote']);
  });
  it('mergeMarkers deletes by absence (local removed, remote unchanged)', () => {
    const base = [M(1, 'a'), M(2, 'b')];
    const local = [M(1, 'a')];                       // this device deleted b
    const remote = [M(1, 'a'), M(2, 'b')];           // other unchanged
    assert.deepStrictEqual(mergeMarkers(base, local, remote).map((m) => m.text), ['a']);
  });
  it('mergeMarkers on an empty everything is empty', () => {
    assert.deepStrictEqual(mergeMarkers([], [], []), []);
  });
});
