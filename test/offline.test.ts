import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';

test('application source does not call the network or ship a web runtime', () => {
  const files = walk('src').filter((file) => /\.(ts|tsx)$/.test(file));
  const banned = [/fetch\s*\(/, /XMLHttpRequest/, /axios/, /firebase/, /supabase/, /react-native-web/, /analytics/];
  const offenders: string[] = [];
  for (const file of files) {
    const text = readFileSync(file, 'utf8');
    for (const pattern of banned) {
      if (pattern.test(text)) offenders.push(`${file} matches ${pattern}`);
    }
  }
  assert.deepEqual(offenders, []);
});

function walk(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry);
    if (statSync(path).isDirectory()) return walk(path);
    return [path];
  });
}
