// Review in subtitle mode: EN and UK blocks paired into grid rows by the time
// they share (site/js/srt_align.js).
const { describe, it } = require('node:test');
const assert = require('node:assert');

const align = require('../site/js/srt_align').alignSubtitlesByTime;

describe('alignSubtitlesByTime', () => {
  it('aligns identical timecodes 1:1', () => {
    var en = [
      { startMs: 0, endMs: 3000, text: 'Hello' },
      { startMs: 3000, endMs: 6000, text: 'World' },
    ];
    var uk = [
      { startMs: 0, endMs: 3000, text: 'Привіт' },
      { startMs: 3000, endMs: 6000, text: 'Світ' },
    ];
    var rows = align(en, uk);
    assert.strictEqual(rows.length, 2);
    assert.strictEqual(rows[0].en.text, 'Hello');
    assert.strictEqual(rows[0].uk.text, 'Привіт');
    assert.strictEqual(rows[1].en.text, 'World');
    assert.strictEqual(rows[1].uk.text, 'Світ');
  });

  it('handles more EN blocks than UK', () => {
    var en = [
      { startMs: 0, endMs: 2000, text: 'One' },
      { startMs: 2000, endMs: 4000, text: 'Two' },
      { startMs: 4000, endMs: 6000, text: 'Three' },
    ];
    var uk = [
      { startMs: 0, endMs: 3000, text: 'Один-Два' },
      { startMs: 3000, endMs: 6000, text: 'Три' },
    ];
    var rows = align(en, uk);
    assert.ok(rows.length >= 2, 'should have at least 2 rows, got ' + rows.length);
    var enTexts = rows.filter(function(r) { return r.en; }).map(function(r) { return r.en.text; });
    var ukTexts = rows.filter(function(r) { return r.uk; }).map(function(r) { return r.uk.text; });
    assert.ok(enTexts.includes('One'));
    assert.ok(enTexts.includes('Two'));
    assert.ok(enTexts.includes('Three'));
    assert.ok(ukTexts.includes('Один-Два'));
    assert.ok(ukTexts.includes('Три'));
  });

  it('handles more UK blocks than EN', () => {
    var en = [
      { startMs: 0, endMs: 5000, text: 'Long sentence' },
    ];
    var uk = [
      { startMs: 0, endMs: 2000, text: 'Частина 1' },
      { startMs: 2000, endMs: 5000, text: 'Частина 2' },
    ];
    var rows = align(en, uk);
    assert.ok(rows.length >= 2, 'should have at least 2 rows');
    var ukTexts = rows.filter(function(r) { return r.uk; }).map(function(r) { return r.uk.text; });
    assert.ok(ukTexts.includes('Частина 1'));
    assert.ok(ukTexts.includes('Частина 2'));
  });

  it('handles gap between blocks', () => {
    var en = [
      { startMs: 0, endMs: 2000, text: 'Before gap' },
      { startMs: 5000, endMs: 7000, text: 'After gap' },
    ];
    var uk = [
      { startMs: 0, endMs: 2000, text: 'До паузи' },
      { startMs: 5000, endMs: 7000, text: 'Після паузи' },
    ];
    var rows = align(en, uk);
    assert.strictEqual(rows.length, 2, 'gap should not produce extra rows');
    assert.strictEqual(rows[0].en.text, 'Before gap');
    assert.strictEqual(rows[1].en.text, 'After gap');
  });

  it('handles empty EN array', () => {
    var uk = [{ startMs: 0, endMs: 3000, text: 'Тест' }];
    var rows = align([], uk);
    assert.strictEqual(rows.length, 1);
    assert.strictEqual(rows[0].en, null);
    assert.strictEqual(rows[0].uk.text, 'Тест');
  });

  it('handles empty UK array', () => {
    var en = [{ startMs: 0, endMs: 3000, text: 'Test' }];
    var rows = align(en, []);
    assert.strictEqual(rows.length, 1);
    assert.strictEqual(rows[0].uk, null);
    assert.strictEqual(rows[0].en.text, 'Test');
  });

  it('handles both empty arrays', () => {
    var rows = align([], []);
    assert.strictEqual(rows.length, 0);
  });

  it('rows have startMs and endMs', () => {
    var en = [{ startMs: 1000, endMs: 4000, text: 'A' }];
    var uk = [{ startMs: 1000, endMs: 4000, text: 'Б' }];
    var rows = align(en, uk);
    assert.strictEqual(rows[0].startMs, 1000);
    assert.strictEqual(rows[0].endMs, 4000);
  });

  it('each block appears at least once across all rows', () => {
    var en = [
      { startMs: 0, endMs: 2000, text: 'E1' },
      { startMs: 2000, endMs: 4000, text: 'E2' },
      { startMs: 4000, endMs: 8000, text: 'E3' },
    ];
    var uk = [
      { startMs: 0, endMs: 3000, text: 'U1' },
      { startMs: 3000, endMs: 5000, text: 'U2' },
      { startMs: 5000, endMs: 8000, text: 'U3' },
    ];
    var rows = align(en, uk);
    var seenEn = {};
    var seenUk = {};
    rows.forEach(function(r) {
      if (r.en) seenEn[r.en.text] = true;
      if (r.uk) seenUk[r.uk.text] = true;
    });
    assert.strictEqual(Object.keys(seenEn).length, 3, 'all EN blocks should appear');
    assert.strictEqual(Object.keys(seenUk).length, 3, 'all UK blocks should appear');
  });

  it('overlapping non-aligned blocks produce no empty cells', () => {
    // EN: [1-4, 4.5-8, 8.5-12] (3 blocks)
    // UK: [1-5, 6-10]            (2 blocks)
    var en = [
      { startMs: 1000, endMs: 4000, text: 'E1' },
      { startMs: 4500, endMs: 8000, text: 'E2' },
      { startMs: 8500, endMs: 12000, text: 'E3' },
    ];
    var uk = [
      { startMs: 1000, endMs: 5000, text: 'U1' },
      { startMs: 6000, endMs: 10000, text: 'U2' },
    ];
    var rows = align(en, uk);
    rows.forEach(function(r, i) {
      assert.ok(r.en !== null, 'row ' + i + ' should not have null EN, got: ' + JSON.stringify(r));
      assert.ok(r.uk !== null, 'row ' + i + ' should not have null UK, got: ' + JSON.stringify(r));
    });
    // Expected pairings: (E1,U1), (E2,U1), (E2,U2), (E3,U2)
    assert.strictEqual(rows.length, 4, 'expected 4 rows, got ' + rows.length);
    assert.strictEqual(rows[0].en.text, 'E1');
    assert.strictEqual(rows[0].uk.text, 'U1');
    assert.strictEqual(rows[1].en.text, 'E2');
    assert.strictEqual(rows[1].uk.text, 'U1');
    assert.strictEqual(rows[2].en.text, 'E2');
    assert.strictEqual(rows[2].uk.text, 'U2');
    assert.strictEqual(rows[3].en.text, 'E3');
    assert.strictEqual(rows[3].uk.text, 'U2');
  });

  it('orphan EN block at start keeps empty UK cell', () => {
    // EN[0] (0-1) has no UK overlap; EN[1] (2-4) overlaps UK[0] (2.5-3.5)
    var en = [
      { startMs: 0, endMs: 1000, text: 'Orphan' },
      { startMs: 2000, endMs: 4000, text: 'Paired' },
    ];
    var uk = [
      { startMs: 2500, endMs: 3500, text: 'UK' },
    ];
    var rows = align(en, uk);
    var orphanRow = rows.find(function(r) { return r.en && r.en.text === 'Orphan'; });
    assert.ok(orphanRow, 'orphan EN block should still appear');
    assert.strictEqual(orphanRow.uk, null, 'orphan EN should have null UK partner');
    var pairedRow = rows.find(function(r) { return r.en && r.en.text === 'Paired'; });
    assert.ok(pairedRow, 'paired EN block should appear');
    assert.ok(pairedRow.uk && pairedRow.uk.text === 'UK', 'paired EN should be paired with UK');
  });

  it('orphan UK block in middle keeps empty EN cell', () => {
    var en = [
      { startMs: 0, endMs: 2000, text: 'E1' },
      { startMs: 8000, endMs: 10000, text: 'E2' },
    ];
    var uk = [
      { startMs: 0, endMs: 2000, text: 'U1' },
      { startMs: 4000, endMs: 6000, text: 'U_orphan' },
      { startMs: 8000, endMs: 10000, text: 'U2' },
    ];
    var rows = align(en, uk);
    var orphanRow = rows.find(function(r) { return r.uk && r.uk.text === 'U_orphan'; });
    assert.ok(orphanRow, 'orphan UK block should still appear');
    assert.strictEqual(orphanRow.en, null, 'orphan UK should have null EN partner');
  });

  it('block spanning across multiple partner rows is consecutive', () => {
    // EN block 4.5-8 should pair with both UK blocks 1-5 and 6-10
    var en = [
      { startMs: 1000, endMs: 4000, text: 'E1' },
      { startMs: 4500, endMs: 8000, text: 'E_span' },
      { startMs: 8500, endMs: 12000, text: 'E3' },
    ];
    var uk = [
      { startMs: 1000, endMs: 5000, text: 'U1' },
      { startMs: 6000, endMs: 10000, text: 'U2' },
    ];
    var rows = align(en, uk);
    // Find consecutive rows where E_span appears — they must be adjacent
    var spanIndices = [];
    rows.forEach(function(r, i) {
      if (r.en && r.en.text === 'E_span') spanIndices.push(i);
    });
    assert.ok(spanIndices.length >= 1, 'E_span should appear at least once');
    for (var i = 1; i < spanIndices.length; i++) {
      assert.strictEqual(spanIndices[i], spanIndices[i - 1] + 1,
        'E_span occurrences must be consecutive for grid spanning to work');
    }
  });
});
