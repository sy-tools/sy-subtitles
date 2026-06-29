const { describe, it } = require('node:test');
const assert = require('node:assert');
const {
  INDEX_FILTERS,
  readIndexQuery,
  readIndexFilter,
  buildIndexSearch,
} = require('../site/js/index_url_state');

describe('readIndexQuery', () => {
  it('returns the q param when present', () => {
    assert.strictEqual(readIndexQuery('?q=ganesha'), 'ganesha');
  });
  it('decodes spaces (URLSearchParams + decoding)', () => {
    assert.strictEqual(readIndexQuery('?q=adi+shakti'), 'adi shakti');
    assert.strictEqual(readIndexQuery('?q=adi%20shakti'), 'adi shakti');
  });
  it('returns empty string when q is absent', () => {
    assert.strictEqual(readIndexQuery('?branch=dev'), '');
  });
  it('returns empty string for empty / undefined search', () => {
    assert.strictEqual(readIndexQuery(''), '');
    assert.strictEqual(readIndexQuery(undefined), '');
  });
});

describe('readIndexFilter', () => {
  it('returns a valid filter value', () => {
    assert.strictEqual(readIndexFilter('?f=approved'), 'approved');
    assert.strictEqual(readIndexFilter('?f=needs-review'), 'needs-review');
  });
  it('returns null for an unknown filter value', () => {
    assert.strictEqual(readIndexFilter('?f=bogus'), null);
  });
  it('returns null when f is absent', () => {
    assert.strictEqual(readIndexFilter('?q=x'), null);
    assert.strictEqual(readIndexFilter(''), null);
  });
  it('only accepts the known filter set', () => {
    INDEX_FILTERS.forEach(function (f) {
      assert.strictEqual(readIndexFilter('?f=' + f), f);
    });
  });
  it('is case-sensitive — only exact lowercase values match', () => {
    assert.strictEqual(readIndexFilter('?f=Approved'), null);
    assert.strictEqual(readIndexFilter('?f=ALL'), null);
  });
});

describe('buildIndexSearch', () => {
  it('sets q when a query is present', () => {
    const qs = buildIndexSearch('', { query: 'jesus', filter: 'all', defaultFilter: 'all' });
    assert.strictEqual(qs, 'q=jesus');
  });
  it('omits q when the query is empty', () => {
    const qs = buildIndexSearch('?q=old', { query: '', filter: 'all', defaultFilter: 'all' });
    assert.strictEqual(qs, '');
  });
  it('sets f only when it differs from the mode default', () => {
    assert.strictEqual(
      buildIndexSearch('', { query: '', filter: 'approved', defaultFilter: 'needs-review' }),
      'f=approved',
    );
    assert.strictEqual(
      buildIndexSearch('', { query: '', filter: 'needs-review', defaultFilter: 'needs-review' }),
      '',
    );
  });
  it('omits f for an unknown filter value', () => {
    assert.strictEqual(
      buildIndexSearch('', { query: '', filter: 'bogus', defaultFilter: 'needs-review' }),
      '',
    );
  });
  it('preserves an unrelated param such as branch', () => {
    const qs = buildIndexSearch('?branch=dev', { query: 'x', filter: 'approved', defaultFilter: 'all' });
    const p = new URLSearchParams(qs);
    assert.strictEqual(p.get('branch'), 'dev');
    assert.strictEqual(p.get('q'), 'x');
    assert.strictEqual(p.get('f'), 'approved');
  });
  it('drops a stale f when the filter returns to default, keeping branch', () => {
    const qs = buildIndexSearch('?branch=dev&f=approved', { query: '', filter: 'all', defaultFilter: 'all' });
    const p = new URLSearchParams(qs);
    assert.strictEqual(p.get('branch'), 'dev');
    assert.strictEqual(p.get('f'), null);
  });
  it('round-trips through readIndexQuery / readIndexFilter', () => {
    const qs = buildIndexSearch('', { query: 'shri mataji', filter: 'in-review', defaultFilter: 'all' });
    assert.strictEqual(readIndexQuery('?' + qs), 'shri mataji');
    assert.strictEqual(readIndexFilter('?' + qs), 'in-review');
  });
  it('tolerates a null/undefined state (drops q/f, keeps other params)', () => {
    assert.strictEqual(buildIndexSearch('?branch=dev', undefined), 'branch=dev');
    assert.strictEqual(buildIndexSearch('', null), '');
  });
  it('safely round-trips a query that needs URL-encoding', () => {
    const qs = buildIndexSearch('', { query: 'a b&c=d', filter: 'all', defaultFilter: 'all' });
    assert.strictEqual(readIndexQuery('?' + qs), 'a b&c=d');
  });
});
