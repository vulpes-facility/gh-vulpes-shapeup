import test from 'node:test';
import assert from 'node:assert/strict';
import { drawnValues, hillBlock, parsePosition, positionOf, sameValues, withHill } from '../src/domain.mjs';

const template = '<!-- guidance -->\n\n<!-- hill:start -->\n<!-- ![Hill chart](https://github.com/owner/repo/blob/generated/shapeup/hills/pitch-<number>.svg?raw=true&v=<commit>) -->\n<!-- hill:end -->\n\n## Problem\n\nBody';

test('empty Hill Position counts as 0; out of range fails', () => {
  assert.equal(positionOf(null), 0);
  assert.equal(positionOf(undefined), 0);
  assert.equal(positionOf(35), 35);
  for (const value of [-1, 101, 20.5]) assert.throws(() => positionOf(value), { code: 'position' });
});
test('a position given as text is an integer from 0 to 100', () => {
  for (const [text, value] of [['0', 0], ['45', 45], ['100', 100], ['007', 7]]) assert.equal(parsePosition(text), value);
  for (const text of ['', '-1', '101', '1000', '4.5', '1e2', ' 5', 'abc']) assert.throws(() => parsePosition(text), { code: 'position' }, text);
});
test('the template block has no drawn values yet', () => {
  assert.equal(drawnValues(template), null);
  assert.equal(drawnValues('Only a body'), null);
});
test('drawing replaces only the marked block and records values in number order', () => {
  const scopes = [{ number: 12, position: 60 }, { number: 11, position: 30 }];
  const body = withHill(template, hillBlock('url', scopes));
  assert.match(body, /^<!-- guidance -->\n\n<!-- hill:start -->\n!\[Hill chart\]\(url\)\n<!-- hill:values 11=30 12=60 -->\n<!-- hill:end -->\n\n## Problem\n\nBody$/);
  assert.deepEqual([...drawnValues(body)], [[11, 30], [12, 60]]);
  assert.ok(sameValues(drawnValues(body), scopes));
  assert.ok(!sameValues(drawnValues(body), [{ number: 11, position: 30 }]));
  assert.ok(!sameValues(drawnValues(body), [{ number: 11, position: 31 }, { number: 12, position: 60 }]));
  assert.equal(withHill(body, hillBlock('url', scopes)), body);
});
test('the alt text of the chart image is configurable', () => {
  assert.match(hillBlock('url', [], 'Progress'), /^!\[Progress\]\(url\)\n<!-- hill:values -->$/);
});
test('missing markers are added at the top; quoted markers in a sentence are ignored', () => {
  const body = 'A sentence that quotes `<!-- hill:start -->` and `<!-- hill:end -->` is not a marker.';
  const drawn = withHill(body, hillBlock('url', []));
  assert.equal(drawn, `<!-- hill:start -->\n![Hill chart](url)\n<!-- hill:values -->\n<!-- hill:end -->\n\n${body}`);
  assert.deepEqual([...drawnValues(drawn)], []);
});
test('a replacement containing $ patterns is inserted literally', () => {
  assert.match(withHill(template, 'a $& b $1'), /a \$& b \$1/);
});
test('CRLF bodies are normalized before matching', () => {
  const body = template.replace(/\n/g, '\r\n');
  assert.match(withHill(body, hillBlock('url', [{ number: 1, position: 5 }])), /<!-- hill:values 1=5 -->/);
});
