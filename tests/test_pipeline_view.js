// The talk card's status badge and the pipeline diagram under it
// (site/js/pipeline_view.js).
const { describe, it } = require('node:test');
const assert = require('node:assert');

const { esc, safeHref } = require('../site/js/html_escape');
const { renderStatusBadge, renderPipelineDAG } = require('../site/js/pipeline_view');

const REPO = 'sy-tools/sy-subtitles';

describe('renderStatusBadge', () => {
  const EN = {
    'badge.approved': 'approved',
    'badge.in_review': 'in review',
    'badge.needs_review': 'needs review',
    'badge.pending': 'pending',
  };
  const t = (key) => EN[key];
  const badge = (status, reviewSt) => renderStatusBadge(status, reviewSt, t, esc, safeHref, REPO);

  it('approved — span with correct class', () => {
    var html = badge('approved', null);
    assert.ok(html.includes('class="review-badge approved"'));
    assert.ok(html.includes('approved'));
    assert.ok(html.startsWith('<span'));
  });

  it('in-review with reviewer — shows name', () => {
    var html = badge('in-review', { status: 'in-progress', reviewer: 'IrynaFil', issue_number: 5 });
    assert.ok(html.includes('in review (IrynaFil)'));
    assert.ok(html.includes('href="https://github.com'));
    assert.ok(html.includes('/issues/5'));
  });

  it('in-review without reviewer — no name', () => {
    var html = badge('in-review', { status: 'in-progress', issue_number: 3 });
    assert.ok(html.includes('in review'));
    assert.ok(!html.includes('('));
  });

  it('ready-for-review — needs review label', () => {
    var html = badge('ready-for-review', { status: 'pending', issue_number: 7 });
    assert.ok(html.includes('needs review'));
    assert.ok(html.includes('class="review-badge ready-for-review"'));
  });

  it('in-progress — pending label, no link', () => {
    var html = badge('in-progress', null);
    assert.ok(html.includes('pending'));
    assert.ok(html.startsWith('<span'));
  });

  it('with issue_number — renders as link', () => {
    var html = badge('approved', { status: 'approved', issue_number: 10 });
    assert.ok(html.startsWith('<a'));
    assert.ok(html.includes('target="_blank"'));
  });

  it('without issue_number — renders as span', () => {
    var html = badge('approved', { status: 'approved', issue_number: null });
    assert.ok(html.startsWith('<span'));
  });

  it('links to the issue in the repository it was given', () => {
    var html = badge('approved', { issue_number: 10 });
    assert.ok(html.includes('href="https://github.com/sy-tools/sy-subtitles/issues/10"'));
  });

  it('escapes the reviewer name', () => {
    var html = badge('in-review', { reviewer: '<img src=x onerror=alert(1)>' });
    assert.ok(html.includes('in review (&lt;img src=x onerror=alert(1)&gt;)'));
    assert.ok(!html.includes('<img'));
  });

  it('escapes an issue number that tries to leave the href', () => {
    var html = badge('approved', { issue_number: '1"><b>' });
    assert.ok(html.includes('/issues/1&quot;&gt;&lt;b&gt;" target="_blank"'));
  });
});

describe('renderPipelineDAG', () => {
  const key = (k) => k;
  const stagesOf = (over) => Object.assign({ nVideos: 1 }, over);
  const dag = (stages, st) => renderPipelineDAG({ id: '2001-01-01_Talk' }, stages, st, key, esc, safeHref, REPO);

  it('labels every node through t()', () => {
    var html = dag(stagesOf(), null);
    ['pipe.added', 'pipe.ai_transcribed', 'pipe.ai_translated', 'pipe.ai_reviewed',
      'pipe.srt', 'pipe.issue', 'pipe.review', 'pipe.approved'].forEach((k) => {
      assert.ok(html.includes('>' + k + '<'), k + ' node missing');
    });
  });

  it('links the issue node to the review issue', () => {
    var html = dag(stagesOf({ hasIssue: true }), { issue_number: 12 });
    assert.ok(html.includes(
      '<a href="https://github.com/sy-tools/sy-subtitles/issues/12" class="pipe-node done">pipe.issue</a>'));
  });

  it('draws the issue node as plain text while the talk has no issue', () => {
    var html = dag(stagesOf(), null);
    assert.ok(html.includes('<span class="pipe-node">pipe.issue</span>'));
  });

  it('escapes an issue number that tries to leave the href', () => {
    var html = dag(stagesOf({ hasIssue: true }), { issue_number: '1"><b>' });
    assert.ok(html.includes('/issues/1&quot;&gt;&lt;b&gt;" class="pipe-node done"'));
  });

  it('adds per-video progress once the talk has several videos', () => {
    var html = dag(stagesOf({ nVideos: 2, whisperProgress: '1/2', srtProgress: '0/2' }), null);
    assert.ok(html.includes('>pipe.ai_transcribed 1/2<'));
    assert.ok(html.includes('>pipe.srt 0/2<'));
  });

  it('marks the review node by how far the review has got', () => {
    assert.ok(dag(stagesOf(), null).includes('<span class="pipe-node">pipe.review</span>'));
    assert.ok(dag(stagesOf({ review: true }), null)
      .includes('<span class="pipe-node done in-review">pipe.review</span>'));
    assert.ok(dag(stagesOf({ approved: true }), null)
      .includes('<span class="pipe-node done approved">pipe.review</span>'));
  });

  it('leaves transcription and subtitles out for a text-only talk', () => {
    var html = dag(stagesOf({ textOnly: true, translated: true }), null);
    assert.ok(!html.includes('pipe.ai_transcribed'));
    assert.ok(!html.includes('pipe.srt'));
    assert.ok(html.includes('<span class="pipe-node done">pipe.ai_translated</span>'));
  });
});
