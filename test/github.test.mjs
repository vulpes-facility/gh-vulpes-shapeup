import test from 'node:test';
import assert from 'node:assert/strict';
import { GitHub } from '../src/github.mjs';

function client(handler) {
  const requests = [];
  const api = new GitHub({ repository: 'owner/repo', repositoryToken: 'repo-secret', projectToken: 'project-secret',
    fetchImpl: async (url, options) => {
      requests.push({ url, ...options, body: options.body ? JSON.parse(options.body) : undefined });
      return handler(requests.at(-1), requests.length);
    },
  });
  return { api, requests };
}
const response = (body, status = 200) => new Response(JSON.stringify(body), { status });
const config = { projectOwnerType: 'user', projectOwner: 'Owner', projectNumber: 1, hillField: 'Hill Position', pitchLabel: 'pitch' };

test('GraphQL uses the project token and REST the repository token; the body update is a PATCH', async () => {
  const { api, requests } = client(() => response({ data: { user: { projectV2: { field: { dataType: 'NUMBER' } } } } }));
  await api.requireField(config);
  assert.equal(requests[0].headers.Authorization, 'Bearer project-secret');
  await api.updateBody(10, 'body');
  assert.equal(requests[1].headers.Authorization, 'Bearer repo-secret');
  assert.equal(requests[1].method, 'PATCH');
  assert.match(requests[1].url, /\/repos\/owner\/repo\/issues\/10$/);
  assert.deepEqual(requests[1].body, { body: 'body' });
});
test('a missing or non-number Hill Position field is explicit', async () => {
  for (const field of [null, { dataType: 'TEXT' }]) {
    const { api } = client(() => response({ data: { user: { projectV2: { field } } } }));
    await assert.rejects(api.requireField(config), { code: 'field' });
  }
  const { api } = client(() => response({ data: { user: { projectV2: null } } }));
  await assert.rejects(api.requireField(config), { code: 'project' });
});
test('GraphQL error and missing token do not leak response or secrets', async () => {
  const { api } = client(() => response({ errors: [{ message: 'project-secret' }] }));
  await assert.rejects(api.graphql('query {}'), error => error.code === 'graphql' && !error.message.includes('project-secret'));
  api.projectToken = '';
  await assert.rejects(api.graphql('query {}'), { code: 'credential' });
  const denied = client(() => response({ message: 'repo-secret' }, 403));
  await assert.rejects(denied.api.issue(1), error => error.status === 403 && !error.message.includes('repo-secret'));
});
test('REST paginates beyond 100 children; open pitches exclude pull requests', async () => {
  const { api, requests } = client((request, n) => response(n === 1 ? Array.from({ length: 100 }, (_, i) => ({ number: i })) : [{ number: 100 }]));
  assert.equal((await api.children(10)).length, 101);
  assert.match(requests[1].url, /page=2/);
  const pitches = client(() => response([{ number: 1 }, { number: 2, pull_request: {} }]));
  assert.deepEqual((await pitches.api.openPitches(config)).map(issue => issue.number), [1]);
  assert.match(pitches.requests[0].url, /issues\?state=open&labels=pitch&per_page=100&page=1$/);
});
test('positions are read per issue and only from the configured board', async () => {
  const item = (number, login, hill) => ({ project: { number, owner: { login } }, hill });
  const { api, requests } = client(() => response({ data: { repository: {
    i11: { projectItems: { nodes: [item(9, 'owner', { number: 99 }), item(1, 'owner', { number: 30 })] } },
    i12: { projectItems: { nodes: [item(1, 'owner', {})] } },
    i13: { projectItems: { nodes: [] } },
  } } }));
  const values = await api.positions([11, 12, 13], config);
  assert.deepEqual([...values], [[11, 30], [12, null], [13, null]]);
  assert.match(requests[0].body.query, /i11: issue\(number:11\)/);
  assert.deepEqual(requests[0].body.variables, { owner: 'owner', name: 'repo', field: 'Hill Position' });
  await assert.rejects(api.positions([0], config), { code: 'input' });
});
test('positions are fetched in chunks of 50', async () => {
  const { api, requests } = client(request => response({ data: { repository: Object.fromEntries(
    [...request.body.query.matchAll(/(i[0-9]+): issue/g)].map(([, alias]) => [alias, { projectItems: { nodes: [] } }])) } }));
  const numbers = Array.from({ length: 120 }, (_, i) => i + 1);
  assert.equal((await api.positions(numbers, config)).size, 120);
  assert.equal(requests.length, 3);
});
