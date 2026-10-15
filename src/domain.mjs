export class ShapeUpError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'ShapeUpError';
    this.code = code;
  }
}

export const hillStart = '<!-- hill:start -->';
export const hillEnd = '<!-- hill:end -->';

export function validPosition(value) {
  return Number.isInteger(value) && value >= 0 && value <= 100;
}

export function requirePosition(value) {
  if (!validPosition(value)) {
    throw new ShapeUpError('position', 'Hill Position must be an integer from 0 to 100.');
  }
  return value;
}

// A position given as text, on the command line or as an Action input.
export function parsePosition(text) {
  if (!/^[0-9]{1,3}$/.test(text)) throw new ShapeUpError('position', 'Hill Position must be an integer from 0 to 100.');
  return requirePosition(Number(text));
}

// An empty Hill Position counts as 0, both when drawing and when comparing.
export const positionOf = value => requirePosition(value ?? 0);

// Markers count only on their own line, so a sentence that quotes them is left alone.
const blockPattern = /^<!-- hill:start -->\n([\s\S]*?)^<!-- hill:end -->$/m;
const valuesPattern = /^<!-- hill:values((?: [1-9][0-9]*=[0-9]{1,3})*) -->$/m;

export function drawnValues(body) {
  const block = blockPattern.exec(String(body ?? '').replace(/\r\n/g, '\n'));
  const values = block && valuesPattern.exec(block[1]);
  if (!values) return null;
  return new Map(values[1].trim().split(' ').filter(Boolean).map(pair => pair.split('=').map(Number)));
}

export function sameValues(drawn, scopes) {
  return drawn !== null && drawn.size === scopes.length &&
    scopes.every(scope => drawn.get(scope.number) === scope.position);
}

export function hillBlock(url, scopes, alt = 'Hill chart') {
  const values = [...scopes].sort((a, b) => a.number - b.number)
    .map(scope => ` ${scope.number}=${scope.position}`).join('');
  return `![${alt}](${url})\n<!-- hill:values${values} -->`;
}

export function withHill(body, block) {
  const text = String(body ?? '').replace(/\r\n/g, '\n');
  const section = `${hillStart}\n${block}\n${hillEnd}`;
  if (blockPattern.test(text)) return text.replace(blockPattern, () => section);
  return `${section}\n\n${text}`;
}
