// eslint-disable-next-line spaced-comment
/// <reference path="../helpers/koa.ts" />

import * as fs from 'fs';
import * as path from 'path';
import { Context } from 'koa';
import * as pug from 'pug';

const html = pug.compile(fs.readFileSync(path.resolve('./index.pug'), 'utf8'));

export async function render(
  ctx: Context,
  next: () => Promise<void>
): Promise<void> {
  if (ctx.accepts('text/html')) {
    ctx.body = html({
      user: JSON.stringify(ctx.session!.user || null)
    });
  } else {
    await next();
  }
}
