import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as config from '../src/config.mjs';
import * as domain from '../src/domain.mjs';
import * as github from '../src/github.mjs';

// The vulpes-shapeup App imports these by the package's name; changing what they hold is a breaking change.
test('the package exports config, domain and github, and nothing else', async () => {
  const { exports } = JSON.parse(readFileSync('package.json', 'utf8'));
  assert.deepEqual(exports, { './config': './src/config.mjs', './domain': './src/domain.mjs', './github': './src/github.mjs' });
  assert.equal(await import('gh-vulpes-shapeup/config'), config);
  assert.equal(await import('gh-vulpes-shapeup/domain'), domain);
  assert.equal(await import('gh-vulpes-shapeup/github'), github);
});

test('the shared modules hold what the App draws with', () => {
  assert.equal(typeof config.parseConfig, 'function');
  assert.equal(typeof github.GitHub, 'function');
  assert.deepEqual(Object.keys(domain).sort(), ['ShapeUpError', 'drawnValues', 'hillBlock', 'hillEnd', 'hillStart',
    'parsePosition', 'positionOf', 'requirePosition', 'sameValues', 'validPosition', 'withHill']);
});
