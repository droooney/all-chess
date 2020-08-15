import * as fs from 'fs';
import * as path from 'path';
import * as pug from 'pug';

import { CustomContext } from 'server/types';

import { getSortedFilesSync } from 'server/helpers';

const html = pug.compile(fs.readFileSync(path.resolve('./index.pug'), 'utf8'));
const JS_BUNDLE_NAME = path.basename(
  getSortedFilesSync(path.resolve('./public'))
    .filter((file) => path.extname(file) === '.js')[0] || 'all.js',
);
const CSS_BUNDLE_NAME = path.basename(
  getSortedFilesSync(path.resolve('./public'))
    .filter((file) => path.extname(file) === '.css')[0] || 'all.css',
);

export async function render(
  ctx: CustomContext,
  next: () => Promise<void>,
): Promise<void> {
  if (ctx.accepts('text/html')) {
    ctx.body = html({
      jsBundlePath: `/public/${JS_BUNDLE_NAME}`,
      cssBundlePath: `/public/${CSS_BUNDLE_NAME}`,
      user: JSON.stringify(ctx.state.session?.user || null).replace(/</g, '\\u003c'),
    });
  } else {
    await next();
  }
}
