import { mkdir, readdir, copyFile, cp, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const output = path.join(root, 'dist');
await rm(output, { recursive: true, force: true });
await mkdir(path.join(output, 'assets', 'audio'), { recursive: true });
await cp(path.join(root, 'web'), output, { recursive: true });
const resources = path.join(root, 'ZARVIVAL_FINAL', 'ZAR Studio(Final)', 'res');
for (const file of await readdir(resources)) {
  if (file.endsWith('.png') || file.endsWith('.jpg')) {
    await copyFile(path.join(resources, file), path.join(output, 'assets', file));
  }
}
await cp(path.join(resources, 'lvls'), path.join(output, 'assets', 'lvls'), { recursive: true });
for (const file of ['jump.wav', 'attack1.wav', 'die.wav', 'lvlcompleted.wav', 'level1.wav', 'level2.wav']) {
  await copyFile(path.join(resources, 'audio', file), path.join(output, 'assets', 'audio', file));
}
console.log('Built browser game in dist/');
