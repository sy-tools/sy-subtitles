'use strict';
// Tests for site/js/load_token.js — stale-fetch guard tokens + URL param helper.
const { test } = require('node:test');
const assert = require('node:assert');

const { bumpLoadToken, isCurrentLoad, withQueryParam } = require('../site/js/load_token.js');

test('bump marks the newest load as current, older callbacks as stale', () => {
  const state = {};
  const t1 = bumpLoadToken(state);
  assert.equal(isCurrentLoad(state, t1), true);
  const t2 = bumpLoadToken(state);
  assert.equal(isCurrentLoad(state, t1), false, 'first load is stale after a second bump');
  assert.equal(isCurrentLoad(state, t2), true);
});

test('token from a replaced state object never matches the new state', () => {
  // showReview replaces the global state object; a stale callback holding a
  // token minted on the OLD object must not pass against the NEW one.
  const oldState = {};
  const tOld = bumpLoadToken(oldState);
  const newState = {};
  bumpLoadToken(newState);
  assert.equal(isCurrentLoad(newState, tOld), false);
});

test('isCurrentLoad is false for missing state', () => {
  assert.equal(isCurrentLoad(null, 1), false);
  assert.equal(isCurrentLoad(undefined, 1), false);
});

test('withQueryParam uses ? for bare URLs and & when a query exists', () => {
  assert.equal(
    withQueryParam('https://player.vimeo.com/video/123', 'texttrack=false'),
    'https://player.vimeo.com/video/123?texttrack=false'
  );
  assert.equal(
    withQueryParam('https://player.vimeo.com/video/123?h=abc', 'texttrack=false'),
    'https://player.vimeo.com/video/123?h=abc&texttrack=false'
  );
});
