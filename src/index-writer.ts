import { mkdir, rename, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import type { SiteIndex } from './model.js';

export async function writeSiteIndex(path: string, index: SiteIndex): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  const temporaryPath = `${path}.tmp`;
  await writeFile(temporaryPath, `${JSON.stringify(index, null, 2)}\n`, 'utf8');
  await rename(temporaryPath, path);
}
