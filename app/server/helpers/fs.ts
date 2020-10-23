import * as fs from 'fs';
import * as path from 'path';

export function getSortedFilesSync(dir: string): string[] {
  const files = fs.readdirSync(dir);

  return files
    .map((file, ix) => ({
      stat: fs.statSync(path.join(dir, file)),
      ix,
    }))
    .sort(({ stat: { birthtimeMs: b1 } }, { stat: { birthtimeMs: b2 } }) => b2 - b1)
    .map(({ ix }) => path.join(dir, files[ix]));
}
